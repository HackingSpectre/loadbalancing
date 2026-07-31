'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');
const logger = require('../utils/logger');

/**
 * Active health checker.
 * Periodically probes each backend and updates healthy flags.
 * Isolated from scheduling and proxy request path.
 */
class HealthChecker {
  /**
   * @param {object} options
   * @param {import('../serverPool').ServerPool} options.serverPool
   * @param {string} options.path
   * @param {number} options.intervalMs
   * @param {number} options.timeoutMs
   * @param {number} options.unhealthyThreshold
   * @param {number} options.healthyThreshold
   * @param {(event: object) => void} [options.onChange]
   */
  constructor(options) {
    this.serverPool = options.serverPool;
    this.path = options.path;
    this.intervalMs = options.intervalMs;
    this.timeoutMs = options.timeoutMs;
    this.unhealthyThreshold = options.unhealthyThreshold;
    this.healthyThreshold = options.healthyThreshold;
    this.onChange = options.onChange || (() => {});
    this._timer = null;
    this._running = false;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._probeAll();
    this._timer = setInterval(() => this._probeAll(), this.intervalMs);
    if (this._timer.unref) this._timer.unref();
    logger.info('Health checker started', {
      intervalMs: this.intervalMs,
      path: this.path,
    });
  }

  stop() {
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _probeAll() {
    for (const server of this.serverPool.list()) {
      this._probe(server).catch((err) => {
        logger.debug('Health probe error', { server: server.id, error: err.message });
      });
    }
  }

  /**
   * @param {import('../serverPool').BackendState} server
   */
  _probe(server) {
    return new Promise((resolve) => {
      const target = new URL(this.path, server.url);
      const lib = target.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port,
          path: target.pathname + target.search,
          method: 'GET',
          timeout: this.timeoutMs,
        },
        (res) => {
          res.resume();
          const ok = res.statusCode >= 200 && res.statusCode < 400;
          this._applyResult(server, ok);
          resolve();
        }
      );

      req.on('timeout', () => {
        req.destroy();
        this._applyResult(server, false);
        resolve();
      });

      req.on('error', () => {
        this._applyResult(server, false);
        resolve();
      });

      req.end();
    });
  }

  /**
   * @param {import('../serverPool').BackendState} server
   * @param {boolean} success
   */
  _applyResult(server, success) {
    const previous = server.healthy;

    if (success) {
      server.successCount += 1;
      server.failureCount = 0;
      if (!server.healthy && server.successCount >= this.healthyThreshold) {
        server.healthy = true;
      }
    } else {
      server.failureCount += 1;
      server.successCount = 0;
      if (server.healthy && server.failureCount >= this.unhealthyThreshold) {
        server.healthy = false;
      }
    }

    server.lastHealthCheckAt = Date.now();
    server.lastHealthOk = success;

    if (previous !== server.healthy) {
      logger.info('Server health changed', {
        server: server.id,
        healthy: server.healthy,
      });
      this.onChange({
        type: 'health',
        serverId: server.id,
        healthy: server.healthy,
        timestamp: Date.now(),
      });
    }
  }
}

module.exports = HealthChecker;
