#!/usr/bin/env node
/**
 * Full evaluation orchestrator using node-load-runner.
 * Switches algorithm, starts/ends metrics runs, loads custom LB + Nginx, writes k6-compatible summaries.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API = process.env.API_URL || 'http://127.0.0.1:8090';
const CUSTOM = process.env.CUSTOM_URL || 'http://127.0.0.1:8080';
const NGINX_RR = process.env.NGINX_RR_URL || 'http://127.0.0.1:8081';
const NGINX_LC = process.env.NGINX_LC_URL || 'http://127.0.0.1:8082';
const OUT_DIR = process.env.OUT_DIR || path.join(ROOT, 'metrics', 'k6');
const WORK = '/api/work';

const SCENARIOS = [
  { name: 'steady', vus: 20, duration: 45 },
  { name: 'ramp-up', vus: 30, duration: 50 },
  { name: 'burst', vus: 40, duration: 40 },
];

const ALGOS = ['round-robin', 'least-connections'];

function requestJson(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : {},
        timeout: 10000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            resolve({ status: res.statusCode, data: text ? JSON.parse(text) : null });
          } catch {
            resolve({ status: res.statusCode, data: text });
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function runLoad(args) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, 'node-load-runner.mjs');
    const child = spawn(process.execPath, [script, ...args], {
      stdio: 'inherit',
      cwd: ROOT,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`load runner exit ${code}`));
    });
  });
}

async function setAlgo(name) {
  await requestJson('PUT', `${API}/api/algorithm`, { name });
}

async function startRun(meta) {
  return requestJson('POST', `${API}/api/metrics/run/start`, meta);
}

async function endRun() {
  return requestJson('POST', `${API}/api/metrics/run/end`, {});
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('=== Evaluation matrix (node load runner) ===');
  console.log({ CUSTOM, API, NGINX_RR, NGINX_LC, OUT_DIR });

  // Custom engine
  for (const algo of ALGOS) {
    for (const sc of SCENARIOS) {
      console.log(`\n==> custom | ${algo} | ${sc.name}`);
      await setAlgo(algo);
      const runId = `custom_${algo}_${sc.name}_${Date.now()}`;
      await startRun({
        algorithm: algo,
        scenario: sc.name,
        engine: 'custom',
        runId,
        notes: 'automated evaluation',
      });
      const out = path.join(
        OUT_DIR,
        `custom_${algo}_${sc.name}_trial1.json`
      );
      await runLoad([
        '--url',
        `${CUSTOM}${WORK}`,
        '--vus',
        String(sc.vus),
        '--duration',
        String(sc.duration),
        '--scenario',
        sc.name,
        '--algorithm',
        algo,
        '--engine',
        'custom',
        '--out',
        out,
      ]);
      const ended = await endRun();
      console.log('Metrics run ended:', ended.data?.runId || ended.status);
      await sleep(1500);
    }
  }

  // Failure scenario: traffic + stop backend-2 mid-run
  for (const algo of ALGOS) {
    console.log(`\n==> custom | ${algo} | failure`);
    await setAlgo(algo);
    const runId = `custom_${algo}_failure_${Date.now()}`;
    await startRun({
      algorithm: algo,
      scenario: 'failure',
      engine: 'custom',
      runId,
      notes: 'stop backend-2 mid run',
    });
    const out = path.join(OUT_DIR, `custom_${algo}_failure_trial1.json`);
    const loadPromise = runLoad([
      '--url',
      `${CUSTOM}${WORK}`,
      '--vus',
      '20',
      '--duration',
      '70',
      '--scenario',
      'failure',
      '--algorithm',
      algo,
      '--engine',
      'custom',
      '--out',
      out,
    ]);
    // inject failure after ~20s
    setTimeout(() => {
      console.log('Injecting failure: docker stop eben-backend-2');
      spawn('docker', ['stop', 'eben-backend-2'], { stdio: 'inherit' });
    }, 20000);
    setTimeout(() => {
      console.log('Restoring: docker start eben-backend-2');
      spawn('docker', ['start', 'eben-backend-2'], { stdio: 'inherit' });
    }, 45000);
    await loadPromise;
    await endRun();
    await sleep(3000);
  }

  // Nginx baselines (client-side only)
  for (const sc of SCENARIOS) {
    console.log(`\n==> nginx | round-robin | ${sc.name}`);
    await runLoad([
      '--url',
      `${NGINX_RR}${WORK}`,
      '--vus',
      String(sc.vus),
      '--duration',
      String(sc.duration),
      '--scenario',
      sc.name,
      '--algorithm',
      'round-robin',
      '--engine',
      'nginx',
      '--out',
      path.join(OUT_DIR, `nginx_round-robin_${sc.name}_trial1.json`),
    ]);
    await sleep(1000);

    console.log(`\n==> nginx | least-connections | ${sc.name}`);
    await runLoad([
      '--url',
      `${NGINX_LC}${WORK}`,
      '--vus',
      String(sc.vus),
      '--duration',
      String(sc.duration),
      '--scenario',
      sc.name,
      '--algorithm',
      'least-connections',
      '--engine',
      'nginx',
      '--out',
      path.join(OUT_DIR, `nginx_least-connections_${sc.name}_trial1.json`),
    ]);
    await sleep(1000);
  }

  console.log('\n=== Evaluation matrix complete ===');
  console.log('Custom metrics under metrics/runs/');
  console.log('Client summaries under', OUT_DIR);
}

main().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
