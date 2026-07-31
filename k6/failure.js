/**
 * Single server failure scenario.
 *
 * Traffic is generated while an operator (or companion script) stops one
 * backend container mid-run to observe health checking and redistribution.
 *
 * Suggested procedure:
 * 1. Start metrics run on the control API
 * 2. Start this k6 script
 * 3. After ~20s: docker stop eben-backend-2
 * 4. After ~40s more: docker start eben-backend-2
 * 5. End metrics run when k6 finishes
 *
 * Example:
 *   k6 run -e TARGET_URL=http://localhost:8080 k6/failure.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { baseUrl, defaultThresholds, workloadPath } from './lib/helpers.js';

export const options = {
  scenarios: {
    failure: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 25),
      duration: __ENV.DURATION || '90s',
    },
  },
  thresholds: {
    // Allow elevated errors during the outage window
    http_req_failed: ['rate<0.25'],
    http_req_duration: ['p(95)<3000'],
  },
  tags: {
    scenario: 'failure',
    algorithm: __ENV.ALGORITHM || 'unknown',
    engine: __ENV.ENGINE || 'custom',
  },
};

export default function () {
  const url = `${baseUrl()}${workloadPath()}`;
  const res = http.get(url, {
    tags: { name: 'failure_get' },
    timeout: '10s',
  });
  check(res, {
    'status is 2xx or 5xx': (r) => r.status >= 200 && r.status < 600,
  });
  sleep(Number(__ENV.SLEEP || 0.08));
}
