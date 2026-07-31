import { formatAlgorithm, formatMs } from '../../utils/format';

export default function RoutingFeed({ events }) {
  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="section-title">Live request routing</h3>
        <p className="section-desc">
          Most recent proxied requests and chosen backend
        </p>
      </div>

      {!events?.length ? (
        <div className="empty-state">
          Waiting for traffic. Send requests through the load balancer data plane
          to populate this feed.
        </div>
      ) : (
        <div className="max-h-[28rem] overflow-auto">
          <table className="min-w-full">
            <thead className="sticky top-0 table-head">
              <tr>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Backend</th>
                <th className="px-5 py-3">Algorithm</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Latency</th>
                <th className="px-5 py-3">Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {events.map((event, index) => (
                <tr
                  key={`${event.timestamp}-${index}`}
                  className="transition hover:bg-surface-alt/80"
                >
                  <td className="whitespace-nowrap px-5 py-2.5 text-caption text-mute">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-2.5 text-body font-medium text-ink">
                    {event.serverId || 'N/A'}
                  </td>
                  <td className="px-5 py-2.5 text-body text-mute">
                    {formatAlgorithm(event.algorithm)}
                  </td>
                  <td className="px-5 py-2.5">
                    <StatusBadge code={event.statusCode} error={event.error} />
                  </td>
                  <td className="px-5 py-2.5 tabular-nums text-body text-ink-soft">
                    {formatMs(event.responseTimeMs)}
                  </td>
                  <td className="max-w-[12rem] truncate px-5 py-2.5 font-mono text-caption text-mute">
                    {event.method} {event.path}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ code, error }) {
  const failed = Boolean(error) || (code && code >= 500);
  if (failed) {
    return <span className="badge-danger">{error ? 'ERR' : code}</span>;
  }
  if (code && code >= 400) {
    return <span className="badge-outline">{code}</span>;
  }
  return <span className="badge-soft">{code ?? 'N/A'}</span>;
}
