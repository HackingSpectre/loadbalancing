'use strict';

/**
 * Shared scheduler contract.
 *
 * Scheduling logic is intentionally isolated from proxying, health checks,
 * and metrics so algorithm comparison remains valid.
 *
 * Implementations must:
 * 1. Accept only healthy servers when selecting a target
 * 2. Not mutate request handling outside of selection
 * 3. Expose a stable name for runtime switching and metrics tags
 */

/**
 * @typedef {Object} BackendServer
 * @property {string} id
 * @property {string} url
 * @property {string} host
 * @property {number} port
 * @property {boolean} healthy
 * @property {number} activeConnections
 */

/**
 * @typedef {Object} SchedulerContext
 * @property {BackendServer[]} servers
 * @property {object} [requestMeta]
 */

/**
 * @interface Scheduler
 */
class Scheduler {
  /**
   * Stable algorithm identifier (e.g. "round-robin").
   * @returns {string}
   */
  get name() {
    throw new Error('Scheduler.name must be implemented');
  }

  /**
   * Human readable label for UI and reports.
   * @returns {string}
   */
  get label() {
    throw new Error('Scheduler.label must be implemented');
  }

  /**
   * Select a backend for the next request.
   * @param {SchedulerContext} context
   * @returns {BackendServer|null}
   */
  select(context) {
    throw new Error('Scheduler.select must be implemented');
  }

  /**
   * Optional hook when a request starts on a server.
   * @param {BackendServer} server
   */
  onRequestStart(server) {
    // no-op by default
  }

  /**
   * Optional hook when a request completes on a server.
   * @param {BackendServer} server
   */
  onRequestEnd(server) {
    // no-op by default
  }

  /**
   * Reset any internal rotation state (e.g. after pool changes).
   */
  reset() {
    // no-op by default
  }
}

/**
 * Filter to healthy servers only.
 * @param {BackendServer[]} servers
 * @returns {BackendServer[]}
 */
function getHealthyServers(servers) {
  return servers.filter((s) => s.healthy);
}

module.exports = {
  Scheduler,
  getHealthyServers,
};
