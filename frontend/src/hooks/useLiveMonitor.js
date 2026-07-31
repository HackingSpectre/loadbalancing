import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { createLiveSocket } from '../services/websocket';

const MAX_ROUTING_EVENTS = 100;
const MAX_RESOURCE_POINTS = 60;

/**
 * Live monitoring state: servers, algorithm, routing feed, resource series.
 * Logic lives here; pages only render.
 */
export function useLiveMonitor() {
  const [connected, setConnected] = useState(false);
  const [algorithm, setAlgorithm] = useState(null);
  const [algorithms, setAlgorithms] = useState([]);
  const [servers, setServers] = useState([]);
  const [routingEvents, setRoutingEvents] = useState([]);
  const [resourceSeries, setResourceSeries] = useState([]);
  const [runInfo, setRunInfo] = useState({ active: false });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const refreshStatus = useCallback(async () => {
    try {
      const [status, algos] = await Promise.all([
        api.getStatus(),
        api.getAlgorithms(),
      ]);
      setAlgorithm(status.algorithm);
      setServers(status.servers || []);
      setRunInfo(status.run || { active: false });
      setAlgorithms(algos.algorithms || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to reach control API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();

    socketRef.current = createLiveSocket({
      onOpen: () => {
        setConnected(true);
        setError(null);
      },
      onClose: () => setConnected(false),
      onError: () => setConnected(false),
      onMessage: (event) => {
        if (event.type === 'snapshot') {
          setAlgorithm({ name: event.algorithm });
          setServers(event.servers || []);
          if (event.live?.run) setRunInfo(event.live.run);
          if (event.live?.requests) {
            setRoutingEvents(event.live.requests.slice(-MAX_ROUTING_EVENTS).reverse());
          }
          return;
        }

        if (event.type === 'routing') {
          setRoutingEvents((prev) => {
            const next = [event, ...prev];
            return next.slice(0, MAX_ROUTING_EVENTS);
          });
          setServers((prev) =>
            prev.map((s) =>
              s.id === event.serverId
                ? {
                    ...s,
                    activeConnections: event.activeConnections ?? s.activeConnections,
                    totalRequests: (s.totalRequests || 0) + 1,
                  }
                : s
            )
          );
          return;
        }

        if (event.type === 'health') {
          setServers((prev) =>
            prev.map((s) =>
              s.id === event.serverId ? { ...s, healthy: event.healthy } : s
            )
          );
          return;
        }

        if (event.type === 'algorithm') {
          setAlgorithm({ name: event.name, label: event.label });
          return;
        }

        if (event.type === 'resources') {
          setResourceSeries((prev) => {
            const point = {
              time: new Date(event.timestamp).toLocaleTimeString(),
              cpu: event.lbCpuPercent,
              rssMb: event.lbRssBytes ? event.lbRssBytes / (1024 * 1024) : 0,
            };
            const next = [...prev, point];
            return next.slice(-MAX_RESOURCE_POINTS);
          });
          if (event.servers) {
            setServers((prev) => {
              const map = new Map(event.servers.map((s) => [s.id, s]));
              return prev.map((s) => {
                const snap = map.get(s.id);
                return snap
                  ? {
                      ...s,
                      healthy: snap.healthy,
                      activeConnections: snap.activeConnections,
                    }
                  : s;
              });
            });
          }
          return;
        }

        if (event.type === 'run') {
          if (event.action === 'start') {
            setRunInfo({
              active: true,
              runId: event.runId,
              startedAt: event.startedAt,
              meta: event.meta,
            });
          } else if (event.action === 'end') {
            setRunInfo({ active: false });
          }
        }
      },
    });

    const poll = setInterval(refreshStatus, 10000);
    return () => {
      clearInterval(poll);
      socketRef.current?.close();
    };
  }, [refreshStatus]);

  const switchAlgorithm = useCallback(async (name) => {
    const result = await api.setAlgorithm(name);
    setAlgorithm(result);
    return result;
  }, []);

  const startRun = useCallback(async (payload) => {
    const info = await api.startRun(payload);
    setRunInfo(info);
    return info;
  }, []);

  const endRun = useCallback(async () => {
    const result = await api.endRun();
    setRunInfo({ active: false });
    return result;
  }, []);

  return {
    connected,
    algorithm,
    algorithms,
    servers,
    routingEvents,
    resourceSeries,
    runInfo,
    error,
    loading,
    refreshStatus,
    switchAlgorithm,
    startRun,
    endRun,
  };
}
