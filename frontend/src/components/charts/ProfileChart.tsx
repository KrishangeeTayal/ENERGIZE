import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_TICK, CHART } from './chartTheme'
import styles from './ProfileChart.module.css'

export type ProfileDatum = {
  hour: number
  observed: number | null
  forecast: number | null
}

type ProfileChartProps = {
  points: ProfileDatum[]
  height?: number
  showForecast?: boolean
}

function TooltipContent({
  active,
  payload,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload || payload.length === 0) return null

  const datum = payload[0]?.payload as ProfileDatum | undefined
  if (!datum) return null

  const rows = []
  if (typeof datum.observed === 'number') {
    rows.push({
      label: 'Observed average',
      value: `${datum.observed.toFixed(3)} kWh`,
      tone: 'emerald' as const,
    })
  }
  if (typeof datum.forecast === 'number') {
    rows.push({
      label: 'Model forecast',
      value: `${datum.forecast.toFixed(3)} kWh`,
      tone: 'amber' as const,
    })
  }

  return (
    <ChartTooltip
      title={`${String(datum.hour).padStart(2, '0')}:00`}
      rows={rows}
      footer="Observed averages span the whole dataset; the forecast covers the next 24 hours only."
    />
  )
}

export function ProfileChart({
  points,
  height = 285,
  showForecast = true,
}: ProfileChartProps) {
  if (points.length === 0) {
    return (
      <div className={styles.empty} style={{ height }}>
        No profile available.
      </div>
    )
  }

  return (
    <div className={styles.wrapper} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="profile-observed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.emerald} stopOpacity={0.24} />
              <stop offset="100%" stopColor={CHART.emerald} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke={CHART.grid}
            strokeDasharray="2 5"
            strokeWidth={1}
          />

          <XAxis
            dataKey="hour"
            tickFormatter={(value: number) => `${String(value).padStart(2, '0')}`}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval={2}
            tickMargin={10}
          />

          <YAxis
            width={53}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => value.toFixed(2)}
            tickMargin={6}
            domain={[0, 'auto']}
          />

          <Tooltip
            cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
            content={<TooltipContent />}
          />

          <Area
            type="monotone"
            dataKey="observed"
            stroke={CHART.emerald}
            strokeWidth={2}
            fill="url(#profile-observed)"
            dot={false}
            activeDot={{ r: 4, fill: CHART.emerald, stroke: '#fff', strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />

          {showForecast && (
            <Line
              type="monotone"
              dataKey="forecast"
              stroke={CHART.amber}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4, fill: CHART.amber, stroke: '#fff', strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
