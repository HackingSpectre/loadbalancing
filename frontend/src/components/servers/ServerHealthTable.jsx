import { formatNumber } from '../../utils/format';

export default function ServerHealthTable({ servers }) {
  if (!servers?.length) {
    return (
      <div className="card empty-state">
        No backend servers reported by the control API.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="section-title">Server health</h3>
        <p className="section-desc">
          Active connections and cumulative request counts per backend
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="table-head">
            <tr>
              <th className="px-5 py-3">Server</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Active</th>
              <th className="px-5 py-3">Total req</th>
              <th className="px-5 py-3">Errors</th>
              <th className="px-5 py-3">Endpoint</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {servers.map((server) => (
              <tr key={server.id} className="transition hover:bg-surface-alt/80">
                <td className="table-cell font-medium">{server.id}</td>
                <td className="table-cell">
                  {server.healthy ? (
                    <span className="badge-solid">Healthy</span>
                  ) : (
                    <span className="badge-danger">Unhealthy</span>
                  )}
                </td>
                <td className="table-cell tabular-nums text-ink-soft">
                  {formatNumber(server.activeConnections, 0)}
                </td>
                <td className="table-cell tabular-nums text-ink-soft">
                  {formatNumber(server.totalRequests, 0)}
                </td>
                <td className="table-cell tabular-nums text-ink-soft">
                  {formatNumber(server.totalErrors, 0)}
                </td>
                <td className="table-cell font-mono text-caption text-mute">
                  {server.url || `${server.host}:${server.port}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
