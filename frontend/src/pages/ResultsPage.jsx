import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Alert from '../components/ui/Alert';
import CompareChart from '../components/charts/CompareChart';
import {
  formatAlgorithm,
  formatMs,
  formatNumber,
  formatPercent,
  formatTime,
} from '../utils/format';
import { useResults } from '../hooks/useResults';

export default function ResultsPage() {
  const {
    runs,
    selectedId,
    selectedRun,
    compareIds,
    compareData,
    loading,
    detailLoading,
    error,
    loadRuns,
    selectRun,
    toggleCompare,
  } = useResults();

  const summary = selectedRun?.summary;

  return (
    <div>
      <PageHeader
        title="Results"
        description="Review completed experimental runs. Compare response time, throughput, and error rate across algorithms and scenarios."
        actions={
          <button type="button" className="btn-secondary" onClick={loadRuns}>
            Refresh
          </button>
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="card overflow-hidden lg:col-span-2">
          <div className="card-header">
            <h3 className="section-title">Saved runs</h3>
            <p className="section-desc">
              Select a run for detail. Tick up to four runs to compare.
            </p>
          </div>

          {loading ? (
            <div className="empty-state">Loading runs...</div>
          ) : !runs.length ? (
            <div className="empty-state">
              No completed runs yet. Start a metrics run from Control, generate
              traffic with k6, then end the run.
            </div>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-hairline overflow-auto">
              {runs.map((run) => {
                const s = run.summary || {};
                const selected = selectedId === run.runId;
                const checked = compareIds.includes(run.runId);
                return (
                  <li key={run.runId}>
                    <div
                      className={`flex items-start gap-3 px-4 py-3.5 transition ${
                        selected ? 'bg-canvas' : 'hover:bg-surface-alt'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded-micro border-hairline text-ink focus:ring-ink/20"
                        checked={checked}
                        onChange={() => toggleCompare(run.runId)}
                        aria-label={`Compare ${run.runId}`}
                      />
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => selectRun(run.runId)}
                      >
                        <p className="truncate text-body font-medium text-ink">
                          {formatAlgorithm(s.algorithm)} · {s.scenario || 'unlabeled'}
                        </p>
                        <p className="mt-0.5 font-mono text-caption text-mute">
                          {run.runId}
                        </p>
                        <p className="mt-1 text-caption text-mute">
                          {formatTime(s.endedAt || s.startedAt)} ·{' '}
                          {formatNumber(s.totalRequests, 0)} req ·{' '}
                          {formatMs(s.responseTime?.mean)} mean
                        </p>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-4 lg:col-span-3">
          {!selectedRun && !detailLoading ? (
            <div className="card empty-state">
              Select a completed run to inspect summary metrics and per-server
              distribution.
            </div>
          ) : null}

          {detailLoading ? (
            <div className="card empty-state">Loading run detail...</div>
          ) : null}

          {summary ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard
                  label="Mean latency"
                  value={formatMs(summary.responseTime?.mean)}
                />
                <StatCard
                  label="p95 / p99"
                  value={`${formatMs(summary.responseTime?.p95)} / ${formatMs(summary.responseTime?.p99)}`}
                />
                <StatCard
                  label="Throughput"
                  value={`${formatNumber(summary.throughputRps)} RPS`}
                />
                <StatCard
                  label="Error rate"
                  value={formatPercent(summary.errorRate)}
                  tone={summary.errorRate > 0.01 ? 'bad' : 'good'}
                />
                <StatCard
                  label="Total requests"
                  value={formatNumber(summary.totalRequests, 0)}
                />
                <StatCard
                  label="Avg LB CPU"
                  value={
                    summary.avgLbCpuPercent != null
                      ? `${formatNumber(summary.avgLbCpuPercent)}%`
                      : 'N/A'
                  }
                />
              </div>

              <div className="card card-pad">
                <h3 className="section-title">Run metadata</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Meta label="Run ID" value={summary.runId} mono />
                  <Meta label="Algorithm" value={formatAlgorithm(summary.algorithm)} />
                  <Meta label="Scenario" value={summary.scenario || 'N/A'} />
                  <Meta label="Engine" value={summary.engine || 'custom'} />
                  <Meta label="Started" value={formatTime(summary.startedAt)} />
                  <Meta label="Ended" value={formatTime(summary.endedAt)} />
                  <Meta
                    label="Duration"
                    value={
                      summary.durationMs != null
                        ? `${formatNumber(summary.durationMs / 1000, 1)} s`
                        : 'N/A'
                    }
                  />
                  <Meta label="Notes" value={summary.notes || 'None'} />
                </dl>
              </div>

              {summary.byServer ? (
                <div className="card overflow-hidden">
                  <div className="card-header">
                    <h3 className="section-title">Per-server distribution</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="table-head">
                        <tr>
                          <th className="px-5 py-3">Server</th>
                          <th className="px-5 py-3">Requests</th>
                          <th className="px-5 py-3">Share</th>
                          <th className="px-5 py-3">Errors</th>
                          <th className="px-5 py-3">Avg latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {Object.entries(summary.byServer).map(([id, row]) => {
                          const share =
                            summary.totalRequests > 0
                              ? row.count / summary.totalRequests
                              : 0;
                          const avg =
                            row.count > 0 ? row.totalTimeMs / row.count : null;
                          return (
                            <tr key={id} className="hover:bg-surface-alt/80">
                              <td className="table-cell font-medium">{id}</td>
                              <td className="table-cell tabular-nums">
                                {formatNumber(row.count, 0)}
                              </td>
                              <td className="table-cell tabular-nums">
                                {formatPercent(share)}
                              </td>
                              <td className="table-cell tabular-nums">
                                {formatNumber(row.errors, 0)}
                              </td>
                              <td className="table-cell tabular-nums">
                                {formatMs(avg)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      {compareData.length > 0 ? (
        <div className="mt-10">
          <h2 className="mb-5 text-subheading font-semibold tracking-tight text-ink">
            Side-by-side comparison
          </h2>
          <CompareChart runs={compareData} />
        </div>
      ) : null}
    </div>
  );
}

function Meta({ label, value, mono }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-[0.05em] text-mute">{label}</dt>
      <dd
        className={`mt-1 text-body text-ink ${mono ? 'break-all font-mono text-caption' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
