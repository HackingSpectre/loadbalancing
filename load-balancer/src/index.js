'use strict';

const config = require('./config');
const logger = require('./utils/logger');
const ServerPool = require('./serverPool');
const { createSchedulerManager } = require('./schedulers');
const HealthChecker = require('./health/healthChecker');
const MetricsCollector = require('./metrics/collector');
const ReverseProxy = require('./proxy/reverseProxy');
const ControlServer = require('./api/controlServer');

async function main() {
  const serverPool = new ServerPool(config.backends);
  const schedulerManager = createSchedulerManager(config.algorithm);

  const controlServer = new ControlServer({
    serverPool,
    schedulerManager,
    metrics: null, // set below after metrics created
    corsOrigins: (process.env.LB_CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
  });

  const metrics = new MetricsCollector({
    dir: config.metrics.dir,
    liveBufferSize: config.metrics.liveBufferSize,
    resourceIntervalMs: config.metrics.resourceIntervalMs,
    getSnapshotExtras: () => ({
      algorithm: schedulerManager.getActiveName(),
      servers: serverPool.getStatus().map((s) => ({
        id: s.id,
        healthy: s.healthy,
        activeConnections: s.activeConnections,
      })),
    }),
    onEvent: (event) => controlServer.broadcast(event),
  });

  controlServer.metrics = metrics;

  const healthChecker = new HealthChecker({
    serverPool,
    path: config.health.path,
    intervalMs: config.health.intervalMs,
    timeoutMs: config.health.timeoutMs,
    unhealthyThreshold: config.health.unhealthyThreshold,
    healthyThreshold: config.health.healthyThreshold,
    onChange: (event) => controlServer.broadcast(event),
  });

  const proxy = new ReverseProxy({
    serverPool,
    schedulerManager,
    metrics,
    timeoutMs: config.proxyTimeoutMs,
    onRouting: (event) => controlServer.broadcast(event),
  });

  metrics.startResourceSampling();
  healthChecker.start();

  await proxy.listen(config.proxy.host, config.proxy.port);
  await controlServer.listen(config.api.host, config.api.port);

  logger.info('Eben load balancer ready', {
    proxy: `${config.proxy.host}:${config.proxy.port}`,
    api: `${config.api.host}:${config.api.port}`,
    algorithm: schedulerManager.getActiveName(),
    backends: config.backends.map((b) => b.id),
  });

  const shutdown = async (signal) => {
    logger.info('Shutting down', { signal });
    healthChecker.stop();
    metrics.stopResourceSampling();
    await proxy.close();
    await controlServer.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err.message, stack: err.stack });
  process.exit(1);
});
