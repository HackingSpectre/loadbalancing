'use strict';

const express = require('express');
const os = require('os');

const PORT = parseInt(process.env.PORT || '3000', 10);
const SERVER_ID = process.env.SERVER_ID || `server-${PORT}`;
const BASE_DELAY_MS = parseInt(process.env.BASE_DELAY_MS || '20', 10);
const WORK_ITERS = parseInt(process.env.WORK_ITERS || '0', 10);
const CAPACITY_FACTOR = parseFloat(process.env.CAPACITY_FACTOR || '1');

const app = express();
app.use(express.json({ limit: '1mb' }));

let activeRequests = 0;
let totalRequests = 0;
let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

/**
 * Optional CPU burn to simulate heterogeneous processing cost.
 * Higher WORK_ITERS or lower CAPACITY_FACTOR increases service time.
 */
function doWork() {
  const iters = Math.max(0, Math.floor(WORK_ITERS / Math.max(0.1, CAPACITY_FACTOR)));
  let acc = 0;
  for (let i = 0; i < iters; i += 1) {
    acc += Math.sqrt(i % 97);
  }
  return acc;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sampleCpuPercent() {
  const now = Date.now();
  const cpu = process.cpuUsage(lastCpuUsage);
  const elapsedMs = Math.max(1, now - lastCpuTime);
  const percent = ((cpu.user + cpu.system) / 1000 / elapsedMs) * 100;
  lastCpuUsage = process.cpuUsage();
  lastCpuTime = now;
  return Math.round(percent * 100) / 100;
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    serverId: SERVER_ID,
    uptimeSec: process.uptime(),
  });
});

app.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    serverId: SERVER_ID,
    activeRequests,
    totalRequests,
    cpuPercent: sampleCpuPercent(),
    memory: {
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
    },
    loadavg: os.loadavg(),
    capacityFactor: CAPACITY_FACTOR,
    baseDelayMs: BASE_DELAY_MS,
    workIters: WORK_ITERS,
  });
});

/**
 * Primary workload endpoint used by k6 and dashboard smoke tests.
 * Query params:
 *   delayMs  - override base delay
 *   work     - override work iterations
 */
app.all('/api/*', async (req, res) => {
  activeRequests += 1;
  totalRequests += 1;
  const started = Date.now();

  try {
    const delayOverride = req.query.delayMs != null ? parseInt(String(req.query.delayMs), 10) : null;
    const workOverride = req.query.work != null ? parseInt(String(req.query.work), 10) : null;

    const delay = Number.isFinite(delayOverride)
      ? delayOverride
      : Math.max(0, Math.floor(BASE_DELAY_MS / Math.max(0.1, CAPACITY_FACTOR)));

    if (workOverride != null && Number.isFinite(workOverride)) {
      let acc = 0;
      for (let i = 0; i < workOverride; i += 1) {
        acc += Math.sqrt(i % 97);
      }
      void acc;
    } else {
      doWork();
    }

    if (delay > 0) {
      await sleep(delay);
    }

    res.status(200).json({
      serverId: SERVER_ID,
      path: req.path,
      method: req.method,
      timestamp: Date.now(),
      processingMs: Date.now() - started,
      activeRequests,
      capacityFactor: CAPACITY_FACTOR,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Internal error',
      serverId: SERVER_ID,
      message: err.message,
    });
  } finally {
    activeRequests = Math.max(0, activeRequests - 1);
  }
});

app.get('/', (req, res) => {
  res.json({
    service: 'eben-backend',
    serverId: SERVER_ID,
    endpoints: ['/health', '/metrics', '/api/*'],
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', serverId: SERVER_ID });
});

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(
    `[${new Date().toISOString()}] Backend ${SERVER_ID} listening on :${PORT} ` +
      `(capacity=${CAPACITY_FACTOR}, delay=${BASE_DELAY_MS}ms, work=${WORK_ITERS})`
  );
});
