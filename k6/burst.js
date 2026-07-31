/**
 * Burst scenario.
 * Short high-intensity arrival spikes separated by quiet periods.
 *
 * Example:
 *   k6 run -e TARGET_URL=http://localhost:8080 k6/burst.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { baseUrl, defaultThresholds, workloadPath } from './lib/helpers.js';

export const options = {
  scenarios: {
    burst: {
      executor: 'ramping-arrival-rate',
      startRate: Number(__ENV.START_RATE || 5),
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.PRE_VUS || 50),
      maxVUs: Number(__ENV.MAX_VUS || 200),
      stages: [
        { duration: '10s', target: Number(__ENV.START_RATE || 5) },
        { duration: '5s', target: Number(__ENV.BURST_RATE || 80) },
        { duration: '15s', target: Number(__ENV.BURST_RATE || 80) },
        { duration: '10s', target: Number(__ENV.START_RATE || 5) },
        { duration: '5s', target: Number(__ENV.BURST_RATE || 100) },
        { duration: '15s', target: Number(__ENV.BURST_RATE || 100) },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: defaultThresholds,
  tags: {
    scenario: 'burst',
    algorithm: __ENV.ALGORITHM || 'unknown',
    engine: __ENV.ENGINE || 'custom',
  },
};

export default function () {
  const url = `${baseUrl()}${workloadPath()}`;
  const res = http.get(url, {
    tags: { name: 'burst_get' },
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
