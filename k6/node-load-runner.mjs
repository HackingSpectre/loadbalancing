#!/usr/bin/env node
/**
 * Node-based load runner (k6 alternative when k6 is unavailable).
 *
 * Example:
 *   node k6/node-load-runner.mjs --url http://127.0.0.1:8080/api/work --vus 15 --duration 30
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

function parseArgs(argv) {
  const opts = {
    url: 'http://127.0.0.1:8080/api/work',
    vus: 15,
    duration: 30,
    scenario: 'steady',
    algorithm: 'unknown',
    engine: 'custom',
    out: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--url' && next) {
      opts.url = next;
      i += 1;
    } else if (a === '--vus' && next) {
      opts.vus = parseInt(next, 10);
      i += 1;
    } else if (a === '--duration' && next) {
      opts.duration = parseInt(next, 10);
      i += 1;
    } else if (a === '--scenario' && next) {
      opts.scenario = next;
      i += 1;
    } else if (a === '--algorithm' && next) {
      opts.algorithm = next;
      i += 1;
    } else if (a === '--engine' && next) {
      opts.engine = next;
      i += 1;
    } else if (a === '--out' && next) {
      opts.out = next;
      i += 1;
    }
  }
  return opts;
}

function requestOnce(targetUrl) {
  return new Promise((resolve) => {
    const started = Date.now();
    const u = new URL(targetUrl);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'GET',
        timeout: 15000,
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode || 0,
            ms: Date.now() - started,
          });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0, ms: Date.now() - started, error: 'timeout' });
    });
    req.on('error', (err) => {
      resolve({
        ok: false,
        status: 0,
        ms: Date.now() - started,
        error: err.message,
      });
    });
    req.end();
  });
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function worker(stopAt, url, stats) {
  while (Date.now() < stopAt) {
    const r = await requestOnce(url);
    stats.total += 1;
    if (r.ok) stats.success += 1;
    else stats.failed += 1;
    stats.latencies.push(r.ms);
  }
}

const opts = parseArgs(process.argv);
const stopAt = Date.now() + opts.duration * 1000;
const stats = { total: 0, success: 0, failed: 0, latencies: [] };
const started = Date.now();

console.log(
  `Load start: ${opts.engine}/${opts.algorithm}/${opts.scenario} ` +
    `vus=${opts.vus} duration=${opts.duration}s url=${opts.url}`
);

const workers = [];
for (let i = 0; i < opts.vus; i += 1) {
  workers.push(worker(stopAt, opts.url, stats));
}
await Promise.all(workers);

const wallSec = Math.max(0.001, (Date.now() - started) / 1000);
const lat = stats.latencies.slice().sort((a, b) => a - b);
const mean = lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null;
const summary = {
  metrics: {
    http_req_duration: {
      type: 'trend',
      contains: 'time',
      values: {
        avg: mean,
        min: lat.length ? lat[0] : null,
        max: lat.length ? lat[lat.length - 1] : null,
        med: percentile(lat, 50),
        'p(90)': percentile(lat, 90),
        'p(95)': percentile(lat, 95),
        'p(99)': percentile(lat, 99),
      },
    },
    http_req_failed: {
      type: 'rate',
      contains: 'default',
      values: {
        rate: stats.total ? stats.failed / stats.total : 0,
        passes: stats.success,
        fails: stats.failed,
      },
    },
    http_reqs: {
      type: 'counter',
      contains: 'default',
      values: {
        count: stats.total,
        rate: stats.total / wallSec,
      },
    },
  },
  meta: {
    engine: opts.engine,
    algorithm: opts.algorithm,
    scenario: opts.scenario,
    vus: opts.vus,
    durationSec: opts.duration,
    tool: 'node-load-runner',
  },
};

console.log(
  `Done: reqs=${stats.total} rps=${(stats.total / wallSec).toFixed(1)} ` +
    `fail=${stats.failed} mean=${mean != null ? mean.toFixed(1) : 'n/a'}ms ` +
    `p95=${percentile(lat, 95) ?? 'n/a'}ms`
);

if (opts.out) {
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, JSON.stringify(summary, null, 2));
  console.log(`Wrote ${opts.out}`);
}
