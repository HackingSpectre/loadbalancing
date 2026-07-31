'use strict';

function timestamp() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  const base = `[${timestamp()}] [${level}] ${message}`;
  if (meta !== undefined) {
    console.log(base, typeof meta === 'string' ? meta : JSON.stringify(meta));
  } else {
    console.log(base);
  }
}

module.exports = {
  info: (message, meta) => log('INFO', message, meta),
  warn: (message, meta) => log('WARN', message, meta),
  error: (message, meta) => log('ERROR', message, meta),
  debug: (message, meta) => {
    if (process.env.LB_DEBUG === '1') {
      log('DEBUG', message, meta);
    }
  },
};
