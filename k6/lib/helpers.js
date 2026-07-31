/**
 * Shared k6 helpers for Eben load tests.
 */

export function baseUrl() {
  return __ENV.TARGET_URL || 'http://localhost:8080';
}

export function apiUrl() {
  return __ENV.API_URL || 'http://localhost:8090';
}

export function workloadPath() {
  return __ENV.WORKLOAD_PATH || '/api/work';
}

/**
 * Standard HTTP thresholds used across scenarios.
 */
export const defaultThresholds = {
  http_req_failed: ['rate<0.05'],
  http_req_duration: ['p(95)<2000', 'p(99)<5000'],
};
