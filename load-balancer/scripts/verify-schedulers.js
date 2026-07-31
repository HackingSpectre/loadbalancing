'use strict';

/**
 * Deterministic checks for Round Robin and Least Connections.
 * Run: node load-balancer/scripts/verify-schedulers.js
 */

const assert = require('assert');
const path = require('path');

const RoundRobinScheduler = require(path.join(__dirname, '../src/schedulers/roundRobin'));
const LeastConnectionsScheduler = require(path.join(
  __dirname,
  '../src/schedulers/leastConnections'
));

function servers(states) {
  return states.map((s) => ({
    id: s.id,
    healthy: s.healthy !== false,
    activeConnections: s.activeConnections || 0,
  }));
}

// Round Robin cycles and skips unhealthy
{
  const rr = new RoundRobinScheduler();
  const pool = servers([
    { id: 'a' },
    { id: 'b' },
    { id: 'c', healthy: false },
  ]);
  assert.strictEqual(rr.select({ servers: pool }).id, 'a');
  assert.strictEqual(rr.select({ servers: pool }).id, 'b');
  assert.strictEqual(rr.select({ servers: pool }).id, 'a');
}

// Least Connections picks lowest active count
{
  const lc = new LeastConnectionsScheduler();
  const pool = servers([
    { id: 'a', activeConnections: 3 },
    { id: 'b', activeConnections: 1 },
    { id: 'c', activeConnections: 2 },
  ]);
  assert.strictEqual(lc.select({ servers: pool }).id, 'b');
}

// Least Connections tie-break by id
{
  const lc = new LeastConnectionsScheduler();
  const pool = servers([
    { id: 'server-2', activeConnections: 1 },
    { id: 'server-1', activeConnections: 1 },
  ]);
  assert.strictEqual(lc.select({ servers: pool }).id, 'server-1');
}

// No healthy servers
{
  const rr = new RoundRobinScheduler();
  const pool = servers([
    { id: 'a', healthy: false },
    { id: 'b', healthy: false },
  ]);
  assert.strictEqual(rr.select({ servers: pool }), null);
}

console.log('Scheduler verification passed.');
