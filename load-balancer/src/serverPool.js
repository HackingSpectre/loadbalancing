'use strict';

/**
 * In-memory pool of backend servers with connection and health state.
 * Shared by proxy, health checker, schedulers, and metrics.
 */

/**
 * @typedef {Object} BackendState
 * @property {string} id
 * @property {string} url
 * @property {string} host
 * @property {number} port
 * @property {string} protocol
 * @property {boolean} healthy
 * @property {number} activeConnections
 * @property {number} totalRequests
 * @property {number} totalErrors
 * @property {number} successCount
 * @property {number} failureCount
 * @property {number|null} lastHealthCheckAt
 * @property {boolean|null} lastHealthOk
 */

class ServerPool {
  /**
   * @param {{ id: string, url: string, host: number, port: number, protocol?: string }[]} backends
   */
  constructor(backends) {
    /** @type {Map<string, BackendState>} */
    this._servers = new Map();
    for (const b of backends) {
      this._servers.set(b.id, {
        id: b.id,
        url: b.url,
        host: b.host,
        port: b.port,
        protocol: b.protocol || 'http',
        healthy: true,
        activeConnections: 0,
        totalRequests: 0,
        totalErrors: 0,
        successCount: 0,
        failureCount: 0,
        lastHealthCheckAt: null,
        lastHealthOk: null,
      });
    }
  }

  /**
   * @returns {BackendState[]}
   */
  list() {
    return Array.from(this._servers.values());
  }

  /**
   * Snapshot suitable for schedulers (includes healthy + activeConnections).
   * @returns {BackendState[]}
   */
  forScheduler() {
    return this.list();
  }

  /**
   * @param {string} id
   * @returns {BackendState|undefined}
   */
  get(id) {
    return this._servers.get(id);
  }

  /**
   * @param {BackendState} server
   */
  beginRequest(server) {
    server.activeConnections += 1;
    server.totalRequests += 1;
  }

  /**
   * @param {BackendState} server
   * @param {boolean} isError
   */
  endRequest(server, isError) {
    server.activeConnections = Math.max(0, server.activeConnections - 1);
    if (isError) {
      server.totalErrors += 1;
    }
  }

  /**
   * Public status for API and dashboard.
   */
  getStatus() {
    return this.list().map((s) => ({
      id: s.id,
      url: s.url,
      host: s.host,
      port: s.port,
      healthy: s.healthy,
      activeConnections: s.activeConnections,
      totalRequests: s.totalRequests,
      totalErrors: s.totalErrors,
      lastHealthCheckAt: s.lastHealthCheckAt,
      lastHealthOk: s.lastHealthOk,
    }));
  }
}

module.exports = ServerPool;
