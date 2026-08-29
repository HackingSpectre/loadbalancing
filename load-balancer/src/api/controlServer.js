'use strict';

const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Control plane: REST API + WebSocket on a dedicated port.
 * Separated from the data-plane reverse proxy so API traffic does not
 * compete with measured client load through the same listener.
 */
class ControlServer {
  /**
   * @param {object} options
   * @param {import('../serverPool')} options.serverPool
   * @param {ReturnType<import('../schedulers').createSchedulerManager>} options.schedulerManager
   * @param {import('../metrics/collector')} options.metrics
   * @param {string[]} [options.corsOrigins]
   */
  constructor(options) {
    this.serverPool = options.serverPool;
    this.schedulerManager = options.schedulerManager;
    this.metrics = options.metrics;
    this.scenarioRunner = options.scenarioRunner || null;
    this.corsOrigins = options.corsOrigins || ['*'];
    this.server = null;
    /** @type {Map<string, import('net').Socket>} */
    this.clients = new Map();
  }

  /**
   * Broadcast a JSON event to all connected WebSocket clients.
   * @param {object} event
   */
  broadcast(event) {
    const payload = JSON.stringify(event);
    for (const [id, socket] of this.clients) {
      try {
        sendWsText(socket, payload);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  /**
   * @param {string} host
   * @param {number} port
   */
  listen(host, port) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this._handleHttp(req, res));
      this.server.on('upgrade', (req, socket, head) => this._handleUpgrade(req, socket, head));
      this.server.on('error', reject);
      this.server.listen(port, host, () => {
        logger.info('Control API listening', { host, port });
        resolve(this.server);
      });
    });
  }

  close() {
    for (const socket of this.clients.values()) {
      try {
        socket.destroy();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
    });
  }

  /**
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   */
  async _handleHttp(req, res) {
    this._setCors(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (req.method === 'GET' && path === '/api/health') {
        return this._json(res, 200, { status: 'ok', service: 'eben-load-balancer' });
      }

      if (req.method === 'GET' && path === '/api/algorithms') {
        return this._json(res, 200, {
          active: this.schedulerManager.getActiveName(),
          algorithms: this.schedulerManager.list(),
        });
      }

      if (req.method === 'GET' && path === '/api/algorithm') {
        const active = this.schedulerManager.getActive();
        return this._json(res, 200, { name: active.name, label: active.label });
      }

      if (req.method === 'PUT' && path === '/api/algorithm') {
        const body = await readJson(req);
        if (!body || !body.name) {
          return this._json(res, 400, { error: 'Missing algorithm name' });
        }
        const active = this.schedulerManager.setActive(body.name);
        const event = {
          type: 'algorithm',
          name: active.name,
          label: active.label,
          timestamp: Date.now(),
        };
        this.broadcast(event);
        logger.info('Algorithm switched', { name: active.name });
        return this._json(res, 200, { name: active.name, label: active.label });
      }

      if (req.method === 'GET' && path === '/api/servers') {
        return this._json(res, 200, { servers: this.serverPool.getStatus() });
      }

      if (req.method === 'GET' && path === '/api/metrics/live') {
        return this._json(res, 200, this.metrics.getLive());
      }

      if (req.method === 'GET' && path === '/api/metrics/run') {
        return this._json(res, 200, this.metrics.getRunInfo());
      }

      if (req.method === 'POST' && path === '/api/metrics/run/start') {
        const body = (await readJson(req)) || {};
        const info = this.metrics.startRun({
          algorithm: body.algorithm || this.schedulerManager.getActiveName(),
          scenario: body.scenario || null,
          engine: body.engine || 'custom',
          notes: body.notes || '',
          runId: body.runId,
        });
        this.broadcast({ type: 'run', action: 'start', ...info });
        return this._json(res, 201, info);
      }

      if (req.method === 'POST' && path === '/api/metrics/run/end') {
        const result = this.metrics.endRun();
        this.broadcast({ type: 'run', action: 'end', runId: result.runId, summary: result.summary });
        return this._json(res, 200, result);
      }

      if (req.method === 'GET' && path === '/api/metrics/runs') {
        return this._json(res, 200, { runs: this.metrics.listHistoricalRuns() });
      }

      if (req.method === 'GET' && path.startsWith('/api/metrics/runs/')) {
        const runId = decodeURIComponent(path.slice('/api/metrics/runs/'.length));
        const run = this.metrics.getRun(runId);
        if (!run) {
          return this._json(res, 404, { error: 'Run not found' });
        }
        return this._json(res, 200, run);
      }

      if (req.method === 'GET' && path === '/api/scenario/status') {
        const status = this.scenarioRunner ? this.scenarioRunner.getStatus() : { running: false };
        return this._json(res, 200, status);
      }

      if (req.method === 'POST' && path === '/api/scenario/start') {
        if (!this.scenarioRunner) {
          return this._json(res, 503, { error: 'Scenario runner not configured' });
        }
        const body = (await readJson(req)) || {};
        const result = await this.scenarioRunner.startScenario(body);
        return this._json(res, 200, result);
      }

      if (req.method === 'POST' && path === '/api/scenario/stop') {
        if (!this.scenarioRunner) {
          return this._json(res, 503, { error: 'Scenario runner not configured' });
        }
        const result = await this.scenarioRunner.stopScenario();
        return this._json(res, 200, result);
      }

      if (req.method === 'GET' && path === '/api/status') {
        const active = this.schedulerManager.getActive();
        return this._json(res, 200, {
          algorithm: { name: active.name, label: active.label },
          servers: this.serverPool.getStatus(),
          run: this.metrics.getRunInfo(),
          scenario: this.scenarioRunner ? this.scenarioRunner.getStatus() : { running: false },
          live: {
            recentRequestCount: this.metrics.liveRequests.length,
            recentResourceCount: this.metrics.liveResources.length,
          },
        });
      }

      return this._json(res, 404, { error: 'Not found' });
    } catch (err) {
      if (err.code === 'UNKNOWN_ALGORITHM') {
        return this._json(res, 400, { error: err.message });
      }
      if (err.code === 'NO_ACTIVE_RUN') {
        return this._json(res, 400, { error: err.message });
      }
      logger.error('API error', { error: err.message });
      return this._json(res, 500, { error: 'Internal server error' });
    }
  }

  /**
   * Minimal RFC6455 WebSocket upgrade for live dashboard events.
   * @param {http.IncomingMessage} req
   * @param {import('net').Socket} socket
   * @param {Buffer} head
   */
  _handleUpgrade(req, socket, head) {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== '/ws') {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const accept = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n` +
        '\r\n'
    );

    if (head && head.length) {
      // discard any initial payload; clients send after open
    }

    const id = crypto.randomBytes(8).toString('hex');
    this.clients.set(id, socket);

    // Send initial snapshot
    try {
      sendWsText(
        socket,
        JSON.stringify({
          type: 'snapshot',
          timestamp: Date.now(),
          algorithm: this.schedulerManager.getActiveName(),
          servers: this.serverPool.getStatus(),
          scenario: this.scenarioRunner ? this.scenarioRunner.getStatus() : { running: false },
          live: this.metrics.getLive(),
        })
      );
    } catch {
      // ignore
    }

    socket.on('data', (buf) => {
      // Respond to ping; ignore other client frames for simplicity
      try {
        const opcode = buf[0] & 0x0f;
        if (opcode === 0x8) {
          this.clients.delete(id);
          socket.end();
        } else if (opcode === 0x9) {
          // pong
          const pong = Buffer.from(buf);
          pong[0] = (pong[0] & 0xf0) | 0x0a;
          socket.write(pong);
        }
      } catch {
        this.clients.delete(id);
        socket.destroy();
      }
    });

    socket.on('close', () => this.clients.delete(id));
    socket.on('error', () => this.clients.delete(id));

    logger.debug('WebSocket client connected', { id });
  }

  _setCors(req, res) {
    const origin = req.headers.origin;
    const allow =
      this.corsOrigins.includes('*') || (origin && this.corsOrigins.includes(origin))
        ? origin || '*'
        : this.corsOrigins[0] || '*';
    res.setHeader('Access-Control-Allow-Origin', allow);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  _json(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(payload),
    });
    res.end(payload);
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (!chunks.length) return resolve(null);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send an unmasked text WebSocket frame (server-to-client).
 * @param {import('net').Socket} socket
 * @param {string} text
 */
function sendWsText(socket, text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;

  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }

  socket.write(Buffer.concat([header, payload]));
}

module.exports = ControlServer;
