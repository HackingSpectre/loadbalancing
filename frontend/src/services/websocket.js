import { WS_URL } from './config';

/**
 * Lightweight WebSocket client with reconnect.
 * UI components subscribe via callbacks; no React coupling here.
 */
export function createLiveSocket(handlers = {}) {
  let socket = null;
  let closedByUser = false;
  let retryMs = 1000;
  let retryTimer = null;

  function connect() {
    closedByUser = false;
    socket = new WebSocket(WS_URL);

    socket.addEventListener('open', () => {
      retryMs = 1000;
      handlers.onOpen?.();
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        handlers.onMessage?.(data);
      } catch {
        // ignore malformed frames
      }
    });

    socket.addEventListener('close', () => {
      handlers.onClose?.();
      if (!closedByUser) {
        retryTimer = setTimeout(() => {
          retryMs = Math.min(retryMs * 1.5, 10000);
          connect();
        }, retryMs);
      }
    });

    socket.addEventListener('error', () => {
      handlers.onError?.();
      socket?.close();
    });
  }

  function close() {
    closedByUser = true;
    if (retryTimer) clearTimeout(retryTimer);
    socket?.close();
  }

  connect();

  return { close };
}
