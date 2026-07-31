import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Alert from '../components/ui/Alert';
import ServerHealthTable from '../components/servers/ServerHealthTable';
import RoutingFeed from '../components/routing/RoutingFeed';
import ResourceChart from '../components/charts/ResourceChart';
import DistributionChart from '../components/charts/DistributionChart';
import { formatAlgorithm, formatNumber } from '../utils/format';

export default function LiveMonitorPage({ monitor }) {
  const {
    algorithm,
    servers,
    routingEvents,
    resourceSeries,
    runInfo,
    error,
    loading,
  } = monitor;

  const healthyCount = servers.filter((s) => s.healthy).length;
  const activeConnections = servers.reduce(
    (sum, s) => sum + (s.activeConnections || 0),
    0
  );
  const totalRequests = servers.reduce((sum, s) => sum + (s.totalRequests || 0), 0);
  const allHealthy = servers.length > 0 && healthyCount === servers.length;

  return (
    <div>
      <PageHeader
        title="Live monitor"
        description="Watch request routing, backend health, and load balancer resource usage in real time while experiments run."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading ? (
        <div className="card empty-state">Loading control plane status...</div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active algorithm"
              value={formatAlgorithm(algorithm?.name || algorithm?.label)}
              hint="Switch from Control"
            />
            <StatCard
              label="Healthy backends"
              value={`${healthyCount} / ${servers.length}`}
              hint={allHealthy ? 'All servers healthy' : 'One or more unhealthy'}
              tone={allHealthy ? 'good' : 'bad'}
            />
            <StatCard
              label="Active connections"
              value={formatNumber(activeConnections, 0)}
              hint="In-flight requests across the pool"
            />
            <StatCard
              label="Metrics run"
              value={runInfo?.active ? 'Recording' : 'Idle'}
              hint={runInfo?.runId || 'Start a run before k6 traffic'}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <DistributionChart servers={servers} />
            <ResourceChart data={resourceSeries} />
          </div>

          <ServerHealthTable servers={servers} />

          <RoutingFeed events={routingEvents} />

          <p className="text-caption text-mute">
            Lifetime request total observed on backends:{' '}
            <span className="font-medium text-ink">
              {formatNumber(totalRequests, 0)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
