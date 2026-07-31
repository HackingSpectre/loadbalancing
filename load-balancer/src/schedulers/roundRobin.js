'use strict';

const { Scheduler, getHealthyServers } = require('./interface');

/**
 * Round Robin scheduler.
 * Fixed cyclic rotation through the healthy server pool.
 * Connection counts are not considered; selection is purely rotational.
 */
class RoundRobinScheduler extends Scheduler {
  constructor() {
    super();
    this._index = 0;
  }

  get name() {
    return 'round-robin';
  }

  get label() {
    return 'Round Robin';
  }

  /**
   * @param {{ servers: import('./interface').BackendServer[] }} context
   */
  select(context) {
    const healthy = getHealthyServers(context.servers);
    if (healthy.length === 0) {
      return null;
    }

    // Keep index stable across health changes by modulo pool size.
    const selected = healthy[this._index % healthy.length];
    this._index = (this._index + 1) % healthy.length;
    return selected;
  }

  reset() {
    this._index = 0;
  }
}

module.exports = RoundRobinScheduler;
