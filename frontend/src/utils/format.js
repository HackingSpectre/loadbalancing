export function formatMs(value) {
  if (value == null || Number.isNaN(value)) return 'N/A';
  if (value < 1) return `${value.toFixed(2)} ms`;
  if (value < 100) return `${value.toFixed(1)} ms`;
  return `${Math.round(value)} ms`;
}

export function formatNumber(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

export function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return 'N/A';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${mb.toFixed(1)} MB`;
}

export function formatAlgorithm(name) {
  if (!name) return 'Unknown';
  if (name === 'round-robin') return 'Round Robin';
  if (name === 'least-connections') return 'Least Connections';
  return name;
}

export function formatTime(ts) {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleString();
}
