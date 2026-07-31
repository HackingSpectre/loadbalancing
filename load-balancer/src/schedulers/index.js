'use strict';

const RoundRobinScheduler = require('./roundRobin');
const LeastConnectionsScheduler = require('./leastConnections');

/**
 * Registry of pluggable scheduling algorithms.
 * New algorithms can be registered without changing proxy logic.
 */
const registry = new Map();

function register(scheduler) {
  registry.set(scheduler.name, scheduler);
}

register(new RoundRobinScheduler());
register(new LeastConnectionsScheduler());

function getScheduler(name) {
  return registry.get(name) || null;
}

function listSchedulers() {
  return Array.from(registry.values()).map((s) => ({
    name: s.name,
    label: s.label,
  }));
}

function createSchedulerManager(initialName) {
  let active = getScheduler(initialName) || getScheduler('round-robin');

  return {
    getActive() {
      return active;
    },
    getActiveName() {
      return active.name;
    },
    setActive(name) {
      const next = getScheduler(name);
      if (!next) {
        const err = new Error(`Unknown algorithm: ${name}`);
        err.code = 'UNKNOWN_ALGORITHM';
        throw err;
      }
      active = next;
      return active;
    },
    list: listSchedulers,
  };
}

module.exports = {
  register,
  getScheduler,
  listSchedulers,
  createSchedulerManager,
  RoundRobinScheduler,
  LeastConnectionsScheduler,
};
