'use strict';

const http = require('http');
const { URL } = require('url');
const logger = require('../utils/logger');

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

/**
 * Reverse proxy using Node.js built-in http module.
 * Selects a backend via the active scheduler, then streams the request/response.
 * Scheduling is the only algorithm-specific step; forwarding is shared.
 */
class ReverseProxy {
  /**
   * @param {object} options
   * @param {import('../serverPool')} options.serverPool
   * @param {ReturnType<import('../schedulers').createSchedulerManager>} options.schedulerManager
   * @param {import('../metrics/collector')} options.metrics
   * @param {number} options.timeoutMs
   * @param {(event: object) => void} [options.onRouting]
   */
  constructor(options) {
    this.serverPool = options.serverPool;
    this.schedulerManager = options.schedulerManager;
    this.metrics = options.metrics;
    this.timeoutMs = options.timeoutMs;
    this.onRouting = options.onRouting || (() => {});
    this.server = null;
  }

  /**
   * @param {string} host
   * @param {number} port
   * @returns {Promise<http.Server>}
   */
  listen(host, port) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this._handle(req, res));
      this.server.on('error', reject);
      this.server.listen(port, host, () => {
        logger.info('Reverse proxy listening', { host, port });
        resolve(this.server);
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
    });
  }

  /**
   * @param {http.IncomingMessage} clientReq
   * @param {http.ServerResponse} clientRes
   */
  _handle(clientReq, clientRes) {
    const startedAt = Date.now();
    const scheduler = this.schedulerManager.getActive();
    const servers = this.serverPool.forScheduler();
    const target = scheduler.select({ servers, requestMeta: { method: clientReq.method, url: clientReq.url } });

    if (!target) {
      this._sendError(clientRes, 503, 'No healthy backend servers available');
      this.metrics.recordRequest({
        timestamp: startedAt,
        algorithm: scheduler.name,
        serverId: null,
        method: clientReq.method,
        path: clientReq.url,
        statusCode: 503,
        responseTimeMs: Date.now() - startedAt,
        error: 'no_healthy_backend',
        activeConnections: 0,
      });
      return;
    }

    this.serverPool.beginRequest(target);
    if (typeof scheduler.onRequestStart === 'function') {
      scheduler.onRequestStart(target);
    }

    const targetUrl = new URL(clientReq.url || '/', target.url);
    const headers = this._filterHeaders(clientReq.headers);
    headers.host = `${target.host}:${target.port}`;
    headers['x-forwarded-for'] = appendForwarded(
      clientReq.headers['x-forwarded-for'],
      clientReq.socket.remoteAddress
    );
    headers['x-forwarded-proto'] = 'http';
    headers['x-eben-algorithm'] = scheduler.name;
    headers['x-eben-backend'] = target.id;

    const proxyReq = http.request(
      {
        protocol: 'http:',
        hostname: target.host,
        port: target.port,
        method: clientReq.method,
        path: targetUrl.pathname + targetUrl.search,
        headers,
        timeout: this.timeoutMs,
      },
      (proxyRes) => {
        const outHeaders = this._filterHeaders(proxyRes.headers);
        outHeaders['x-eben-backend'] = target.id;
        outHeaders['x-eben-algorithm'] = scheduler.name;
        clientRes.writeHead(proxyRes.statusCode || 502, outHeaders);
        proxyRes.pipe(clientRes);

        proxyRes.on('end', () => {
          this._complete(target, scheduler, {
            startedAt,
            method: clientReq.method,
            path: clientReq.url,
            statusCode: proxyRes.statusCode || 502,
            error: null,
          });
        });
      }
    );

    proxyReq.on('timeout', () => {
      proxyReq.destroy(new Error('proxy_timeout'));
    });

    proxyReq.on('error', (err) => {
      if (!clientRes.headersSent) {
        this._sendError(clientRes, 502, 'Bad gateway');
      } else {
        clientRes.destroy();
      }
      this._complete(target, scheduler, {
        startedAt,
        method: clientReq.method,
        path: clientReq.url,
        statusCode: 502,
        error: err.message || 'proxy_error',
      });
    });

    clientReq.on('aborted', () => {
      proxyReq.destroy();
    });

    clientReq.pipe(proxyReq);
  }

  /**
   * @param {import('../serverPool').BackendState} target
   * @param {import('../schedulers/interface').Scheduler} scheduler
   * @param {object} info
   */
  _complete(target, scheduler, info) {
    const isError = Boolean(info.error) || (info.statusCode && info.statusCode >= 500);
    this.serverPool.endRequest(target, isError);
    if (typeof scheduler.onRequestEnd === 'function') {
      scheduler.onRequestEnd(target);
    }

    const responseTimeMs = Date.now() - info.startedAt;
    const record = {
      timestamp: info.startedAt,
      algorithm: scheduler.name,
      serverId: target.id,
      method: info.method,
      path: info.path,
      statusCode: info.statusCode,
      responseTimeMs,
      error: info.error,
      activeConnections: target.activeConnections,
    };

    this.metrics.recordRequest(record);
    this.onRouting({
      type: 'routing',
      ...record,
      healthy: target.healthy,
    });
  }

  /**
   * @param {http.IncomingHttpHeaders} headers
   */
  _filterHeaders(headers) {
    const out = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value == null) continue;
      if (HOP_BY_HOP.has(key.toLowerCase())) continue;
      out[key] = value;
    }
    return out;
  }

  /**
   * @param {http.ServerResponse} res
   * @param {number} status
   * @param {string} message
   */
  _sendError(res, status, message) {
    if (res.headersSent) return;
    const body = JSON.stringify({ error: message, status });
    res.writeHead(status, {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    });
    res.end(body);
  }
}

function appendForwarded(existing, addr) {
  if (!addr) return existing || '';
  return existing ? `${existing}, ${addr}` : addr;
}

module.exports = ReverseProxy;
