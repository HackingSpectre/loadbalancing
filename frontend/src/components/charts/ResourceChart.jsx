import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { axisTick, chartColors, gridStroke, tooltipStyle } from './chartTheme';

export default function ResourceChart({ data }) {
  return (
    <div className="card card-pad">
      <div className="mb-5">
        <h3 className="section-title">Load balancer resources</h3>
        <p className="section-desc">
          Process CPU percent (one core) and RSS memory
        </p>
      </div>
      <div className="h-64 w-full">
        {!data?.length ? (
          <div className="empty-state h-full py-0">Collecting resource samples...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="time" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="cpu"
                tick={axisTick}
                unit="%"
                width={40}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="mem"
                orientation="right"
                tick={axisTick}
                unit="MB"
                width={48}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: chartColors.mid }} />
              <Line
                yAxisId="cpu"
                type="monotone"
                dataKey="cpu"
                name="CPU %"
                stroke={chartColors.ink}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="mem"
                type="monotone"
                dataKey="rssMb"
                name="RSS MB"
                stroke={chartColors.mid}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
