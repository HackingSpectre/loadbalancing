import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatAlgorithm } from '../../utils/format';
import { axisTick, chartColors, gridStroke, tooltipStyle } from './chartTheme';

export default function CompareChart({ runs }) {
  const data = (runs || []).map((run) => {
    const s = run.summary || {};
    return {
      name: shortLabel(run),
      mean: s.responseTime?.mean ?? 0,
      p95: s.responseTime?.p95 ?? 0,
      p99: s.responseTime?.p99 ?? 0,
      throughput: s.throughputRps ?? 0,
      errorRate: (s.errorRate ?? 0) * 100,
    };
  });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard title="Response time (ms)" subtitle="Mean, p95, and p99 by run">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} width={40} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: chartColors.mid }} />
          <Bar dataKey="mean" name="Mean" fill={chartColors.ink} radius={[6, 6, 0, 0]} />
          <Bar dataKey="p95" name="p95" fill={chartColors.soft} radius={[6, 6, 0, 0]} />
          <Bar dataKey="p99" name="p99" fill={chartColors.mid} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Throughput and errors" subtitle="Requests per second and error rate">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" tick={axisTick} width={40} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={axisTick}
            width={40}
            unit="%"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: chartColors.mid }} />
          <Bar
            yAxisId="left"
            dataKey="throughput"
            name="Throughput RPS"
            fill={chartColors.ink}
            radius={[6, 6, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="errorRate"
            name="Error %"
            fill={chartColors.ember}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card card-pad">
      <div className="mb-5">
        <h3 className="section-title">{title}</h3>
        <p className="section-desc">{subtitle}</p>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function shortLabel(run) {
  const s = run.summary || {};
  const algo = formatAlgorithm(s.algorithm || s.meta?.algorithm);
  const scenario = s.scenario || 'run';
  const id = (run.runId || '').slice(-6);
  return `${algo} / ${scenario} (${id})`;
}
