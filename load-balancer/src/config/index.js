'use strict';

const path = require('path');

/**
 * Central configuration for the load balancing engine.
 * All values can be overridden via environment variables.
 */
const config = {
  proxy: {
    host: process.env.LB_HOST || '0.0.0.0',
    port: parseInt(process.env.LB_PORT || '8080', 10),
  },
  api: {
    host: process.env.API_HOST || '0.0.0.0',
    port: parseInt(process.env.API_PORT || '8090', 10),
  },
  algorithm: process.env.LB_ALGORITHM || 'round-robin',
  backends: parseBackends(
    process.env.LB_BACKENDS ||
      'server-1:http://127.0.0.1:3001,server-2:http://127.0.0.1:3002,server-3:http://127.0.0.1:3003'
  ),
  health: {
    path: process.env.LB_HEALTH_PATH || '/health',
    intervalMs: parseInt(process.env.LB_HEALTH_INTERVAL_MS || '2000', 10),
    timeoutMs: parseInt(process.env.LB_HEALTH_TIMEOUT_MS || '1000', 10),
    unhealthyThreshold: parseInt(process.env.LB_UNHEALTHY_THRESHOLD || '3', 10),
    healthyThreshold: parseInt(process.env.LB_HEALTHY_THRESHOLD || '2', 10),
  },
  metrics: {
    dir: process.env.LB_METRICS_DIR || path.resolve(__dirname, '../../../metrics'),
    resourceIntervalMs: parseInt(process.env.LB_RESOURCE_INTERVAL_MS || '2000', 10),
    liveBufferSize: parseInt(process.env.LB_LIVE_BUFFER_SIZE || '200', 10),
  },
  proxyTimeoutMs: parseInt(process.env.LB_PROXY_TIMEOUT_MS || '30000', 10),
};

/**
 * @param {string} raw
 * @returns {{ id: string, url: string, host: string, port: number }[]}
 */
function parseBackends(raw) {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, url] = entry.includes(':http')
        ? [entry.slice(0, entry.indexOf(':http')), entry.slice(entry.indexOf('http'))]
        : [null, entry];
      const parsed = new URL(url);
      const host = parsed.hostname;
      const port = parseInt(parsed.port || (parsed.protocol === 'https:' ? '443' : '80'), 10);
      const serverId = id || `${host}:${port}`;
      return {
        id: serverId,
        url: `${parsed.protocol}//${host}:${port}`,
        host,
        port,
        protocol: parsed.protocol.replace(':', ''),
      };
    });
}

module.exports = config;
