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
import { axisTick, chartColors, gridStroke, tooltipStyle } from './chartTheme';

export default function DistributionChart({ servers }) {
  const data = (servers || []).map((s) => ({
    name: s.id,
    requests: s.totalRequests || 0,
    active: s.activeConnections || 0,
    errors: s.totalErrors || 0,
  }));

  return (
    <div className="card card-pad">
      <div className="mb-5">
        <h3 className="section-title">Request distribution</h3>
        <p className="section-desc">
          Cumulative requests and current active connections
        </p>
      </div>
      <div className="h-64 w-full">
        {!data.length ? (
          <div className="empty-state h-full py-0">No server metrics yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} width={40} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: chartColors.mid }} />
              <Bar
                dataKey="requests"
                name="Total requests"
                fill={chartColors.ink}
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="active"
                name="Active"
                fill={chartColors.mid}
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="errors"
                name="Errors"
                fill={chartColors.ember}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
