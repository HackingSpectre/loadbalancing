/**
 * Ramp-up scenario.
 * Gradually increases load, holds peak, then ramps down.
 *
 * Example:
 *   k6 run -e TARGET_URL=http://localhost:8080 k6/ramp-up.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { baseUrl, defaultThresholds, workloadPath } from './lib/helpers.js';

export const options = {
  stages: [
    { duration: __ENV.RAMP_UP || '30s', target: Number(__ENV.PEAK_VUS || 40) },
    { duration: __ENV.HOLD || '60s', target: Number(__ENV.PEAK_VUS || 40) },
    { duration: __ENV.RAMP_DOWN || '20s', target: 0 },
  ],
  thresholds: defaultThresholds,
  tags: {
    scenario: 'ramp-up',
    algorithm: __ENV.ALGORITHM || 'unknown',
    engine: __ENV.ENGINE || 'custom',
  },
};

export default function () {
  const url = `${baseUrl()}${workloadPath()}`;
  const res = http.get(url, {
    tags: { name: 'ramp_get' },
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(Number(__ENV.SLEEP || 0.05));
}
