'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Metrics collector for per-request timing, routing, connection counts,
 * and process resource utilization. Exports CSV and JSON for analysis.
 */
class MetricsCollector {
  /**
   * @param {object} options
   * @param {string} options.dir
   * @param {number} options.liveBufferSize
   * @param {number} options.resourceIntervalMs
   * @param {() => object} options.getSnapshotExtras
   * @param {(event: object) => void} [options.onEvent]
   */
  constructor(options) {
    this.dir = options.dir;
    this.liveBufferSize = options.liveBufferSize;
    this.resourceIntervalMs = options.resourceIntervalMs;
    this.getSnapshotExtras = options.getSnapshotExtras;
    this.onEvent = options.onEvent || (() => {});

    /** @type {object[]} */
    this.liveRequests = [];
    /** @type {object[]} */
    this.liveResources = [];
    /** @type {object[]} */
    this.requestLog = [];
    /** @type {object[]} */
    this.resourceLog = [];

    this.runId = null;
    this.runStartedAt = null;
    this.runMeta = {};
    this._resourceTimer = null;
    this._lastCpuUsage = process.cpuUsage();
    this._lastCpuTime = Date.now();

    this._ensureDirs();
  }

  _ensureDirs() {
    const runsDir = path.join(this.dir, 'runs');
    fs.mkdirSync(runsDir, { recursive: true });
  }

  startResourceSampling() {
    if (this._resourceTimer) return;
    this._sampleResources();
    this._resourceTimer = setInterval(
      () => this._sampleResources(),
      this.resourceIntervalMs
    );
    if (this._resourceTimer.unref) this._resourceTimer.unref();
  }

  stopResourceSampling() {
    if (this._resourceTimer) {
      clearInterval(this._resourceTimer);
      this._resourceTimer = null;
    }
  }

  /**
   * Begin a named experimental run. Subsequent requests are tagged with runId.
   * @param {object} meta
   */
  startRun(meta = {}) {
    this.runId = meta.runId || `run-${Date.now()}`;
    this.runStartedAt = Date.now();
    this.runMeta = {
      algorithm: meta.algorithm || null,
      scenario: meta.scenario || null,
      engine: meta.engine || 'custom',
      notes: meta.notes || '',
      startedAt: this.runStartedAt,
    };
    this.requestLog = [];
    this.resourceLog = [];
    logger.info('Metrics run started', { runId: this.runId, ...this.runMeta });
    return this.getRunInfo();
  }

  /**
   * Finalize run and write CSV/JSON artifacts.
   */
  endRun() {
    if (!this.runId) {
      const err = new Error('No active metrics run');
      err.code = 'NO_ACTIVE_RUN';
      throw err;
    }

    const endedAt = Date.now();
    const summary = this._buildSummary(endedAt);
    const runDir = path.join(this.dir, 'runs', this.runId);
    fs.mkdirSync(runDir, { recursive: true });

    const requestsPath = path.join(runDir, 'requests.json');
    const resourcesPath = path.join(runDir, 'resources.json');
    const summaryPath = path.join(runDir, 'summary.json');
    const requestsCsvPath = path.join(runDir, 'requests.csv');
    const resourcesCsvPath = path.join(runDir, 'resources.csv');

    fs.writeFileSync(requestsPath, JSON.stringify(this.requestLog, null, 2));
    fs.writeFileSync(resourcesPath, JSON.stringify(this.resourceLog, null, 2));
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    fs.writeFileSync(requestsCsvPath, this._requestsToCsv(this.requestLog));
    fs.writeFileSync(resourcesCsvPath, this._resourcesToCsv(this.resourceLog));

    const result = {
      runId: this.runId,
      dir: runDir,
      summary,
    };

    logger.info('Metrics run ended', {
      runId: this.runId,
      requests: this.requestLog.length,
      dir: runDir,
    });

    this.runId = null;
    this.runStartedAt = null;
    this.runMeta = {};
    this.requestLog = [];
    this.resourceLog = [];

    return result;
  }

  getRunInfo() {
    return {
      active: Boolean(this.runId),
      runId: this.runId,
      startedAt: this.runStartedAt,
      meta: this.runMeta,
      requestCount: this.requestLog.length,
    };
  }

  /**
   * Record a completed proxied request.
   * @param {object} record
   */
  recordRequest(record) {
    const entry = {
      timestamp: record.timestamp || Date.now(),
      runId: this.runId,
      algorithm: record.algorithm,
      serverId: record.serverId,
      method: record.method,
      path: record.path,
      statusCode: record.statusCode,
      responseTimeMs: record.responseTimeMs,
      error: record.error || null,
      activeConnections: record.activeConnections,
    };

    this.requestLog.push(entry);
    this.liveRequests.push(entry);
    if (this.liveRequests.length > this.liveBufferSize) {
      this.liveRequests.shift();
    }

    this.onEvent({ type: 'routing', ...entry });
  }

  _sampleResources() {
    const now = Date.now();
    const cpu = process.cpuUsage(this._lastCpuUsage);
    const elapsedMs = Math.max(1, now - this._lastCpuTime);
    // user+system micros over elapsed wall time, scaled to percent of one core
    const cpuPercent = ((cpu.user + cpu.system) / 1000 / elapsedMs) * 100;
    this._lastCpuUsage = process.cpuUsage();
    this._lastCpuTime = now;

    const mem = process.memoryUsage();
    const extras = this.getSnapshotExtras ? this.getSnapshotExtras() : {};

    const sample = {
      timestamp: now,
      runId: this.runId,
      lbCpuPercent: round(cpuPercent, 2),
      lbRssBytes: mem.rss,
      lbHeapUsedBytes: mem.heapUsed,
      systemLoad1: os.loadavg()[0],
      freeMemBytes: os.freemem(),
      totalMemBytes: os.totalmem(),
      ...extras,
    };

    this.resourceLog.push(sample);
    this.liveResources.push(sample);
    if (this.liveResources.length > this.liveBufferSize) {
      this.liveResources.shift();
    }

    this.onEvent({ type: 'resources', ...sample });
  }

  getLive() {
    return {
      requests: this.liveRequests.slice(),
      resources: this.liveResources.slice(),
      run: this.getRunInfo(),
    };
  }

  listHistoricalRuns() {
    const runsDir = path.join(this.dir, 'runs');
    if (!fs.existsSync(runsDir)) return [];

    return fs
      .readdirSync(runsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => {
        const summaryPath = path.join(runsDir, d.name, 'summary.json');
        let summary = null;
        if (fs.existsSync(summaryPath)) {
          try {
            summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
          } catch {
            summary = null;
          }
        }
        return {
          runId: d.name,
          summary,
        };
      })
      .sort((a, b) => {
        const at = a.summary?.endedAt || 0;
        const bt = b.summary?.endedAt || 0;
        return bt - at;
      });
  }

  getRun(runId) {
    const runDir = path.join(this.dir, 'runs', runId);
    if (!fs.existsSync(runDir)) return null;

    const readJson = (name) => {
      const p = path.join(runDir, name);
      if (!fs.existsSync(p)) return null;
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    };

    return {
      runId,
      summary: readJson('summary.json'),
      requests: readJson('requests.json') || [],
      resources: readJson('resources.json') || [],
    };
  }

  _buildSummary(endedAt) {
    const times = this.requestLog
      .filter((r) => r.responseTimeMs != null && !r.error)
      .map((r) => r.responseTimeMs)
      .sort((a, b) => a - b);

    const errors = this.requestLog.filter(
      (r) => r.error || (r.statusCode && r.statusCode >= 500)
    ).length;
    const total = this.requestLog.length;
    const durationSec = Math.max(0.001, (endedAt - this.runStartedAt) / 1000);

    const byServer = {};
    for (const r of this.requestLog) {
      if (!r.serverId) continue;
      if (!byServer[r.serverId]) {
        byServer[r.serverId] = { count: 0, errors: 0, totalTimeMs: 0 };
      }
      byServer[r.serverId].count += 1;
      if (r.error || (r.statusCode && r.statusCode >= 500)) {
        byServer[r.serverId].errors += 1;
      }
      if (r.responseTimeMs != null) {
        byServer[r.serverId].totalTimeMs += r.responseTimeMs;
      }
    }

    return {
      runId: this.runId,
      ...this.runMeta,
      endedAt,
      durationMs: endedAt - this.runStartedAt,
      totalRequests: total,
      errorCount: errors,
      errorRate: total ? errors / total : 0,
      throughputRps: total / durationSec,
      responseTime: {
        mean: mean(times),
        p50: percentile(times, 50),
        p95: percentile(times, 95),
        p99: percentile(times, 99),
        min: times.length ? times[0] : null,
        max: times.length ? times[times.length - 1] : null,
      },
      byServer,
      resourceSamples: this.resourceLog.length,
      avgLbCpuPercent: mean(this.resourceLog.map((r) => r.lbCpuPercent)),
      avgLbRssBytes: mean(this.resourceLog.map((r) => r.lbRssBytes)),
    };
  }

  _requestsToCsv(rows) {
    const headers = [
      'timestamp',
      'runId',
      'algorithm',
      'serverId',
      'method',
      'path',
      'statusCode',
      'responseTimeMs',
      'error',
      'activeConnections',
    ];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.timestamp,
          csvEscape(r.runId),
          csvEscape(r.algorithm),
          csvEscape(r.serverId),
          csvEscape(r.method),
          csvEscape(r.path),
          r.statusCode ?? '',
          r.responseTimeMs ?? '',
          csvEscape(r.error),
          r.activeConnections ?? '',
        ].join(',')
      );
    }
    return lines.join('\n') + '\n';
  }

  _resourcesToCsv(rows) {
    const headers = [
      'timestamp',
      'runId',
      'lbCpuPercent',
      'lbRssBytes',
      'lbHeapUsedBytes',
      'systemLoad1',
      'freeMemBytes',
      'totalMemBytes',
    ];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.timestamp,
          csvEscape(r.runId),
          r.lbCpuPercent,
          r.lbRssBytes,
          r.lbHeapUsedBytes,
          r.systemLoad1,
          r.freeMemBytes,
          r.totalMemBytes,
        ].join(',')
      );
    }
    return lines.join('\n') + '\n';
  }
}

function mean(arr) {
  if (!arr.length) return null;
  return round(arr.reduce((a, b) => a + b, 0) / arr.length, 3);
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function round(n, d) {
  if (n == null || Number.isNaN(n)) return n;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

module.exports = MetricsCollector;
