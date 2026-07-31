'use strict';

const { Scheduler, getHealthyServers } = require('./interface');

/**
 * Least Connections scheduler.
 * Routes each request to the healthy server with the fewest active connections.
 * Active connections are tracked externally on each server object and updated
 * by the proxy at request start and completion.
 *
 * Tie-break: stable order by server id (lexicographic) for deterministic tests.
 */
class LeastConnectionsScheduler extends Scheduler {
  get name() {
    return 'least-connections';
  }

  get label() {
    return 'Least Connections';
  }

  /**
   * @param {{ servers: import('./interface').BackendServer[] }} context
   */
  select(context) {
    const healthy = getHealthyServers(context.servers);
    if (healthy.length === 0) {
      return null;
    }

    let best = healthy[0];
    for (let i = 1; i < healthy.length; i += 1) {
      const candidate = healthy[i];
      if (candidate.activeConnections < best.activeConnections) {
        best = candidate;
      } else if (
        candidate.activeConnections === best.activeConnections &&
        candidate.id < best.id
      ) {
        best = candidate;
      }
    }
    return best;
  }
}

module.exports = LeastConnectionsScheduler;
