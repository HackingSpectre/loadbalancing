import { API_BASE_URL } from './config';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  getStatus: () => request('/api/status'),
  getAlgorithms: () => request('/api/algorithms'),
  setAlgorithm: (name) =>
    request('/api/algorithm', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  getServers: () => request('/api/servers'),
  getLiveMetrics: () => request('/api/metrics/live'),
  getRunInfo: () => request('/api/metrics/run'),
  startRun: (payload) =>
    request('/api/metrics/run/start', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  endRun: () =>
    request('/api/metrics/run/end', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  listRuns: () => request('/api/metrics/runs'),
  getRun: (runId) => request(`/api/metrics/runs/${encodeURIComponent(runId)}`),
  startScenario: (payload) =>
    request('/api/scenario/start', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  stopScenario: () =>
    request('/api/scenario/stop', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};
