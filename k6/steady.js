/**
 * Steady load scenario.
 * Constant virtual users for a fixed duration.
 *
 * Example:
 *   k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=round-robin k6/steady.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { baseUrl, defaultThresholds, workloadPath } from './lib/helpers.js';

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 20),
      duration: __ENV.DURATION || '60s',
    },
  },
  thresholds: defaultThresholds,
  tags: {
    scenario: 'steady',
    algorithm: __ENV.ALGORITHM || 'unknown',
    engine: __ENV.ENGINE || 'custom',
  },
};

export default function () {
  const url = `${baseUrl()}${workloadPath()}`;
  const res = http.get(url, {
    tags: { name: 'steady_get' },
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(Number(__ENV.SLEEP || 0.1));
}
