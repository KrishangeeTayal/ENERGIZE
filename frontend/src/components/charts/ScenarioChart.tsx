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
import { AXIS_TICK, CHART, formatTick } from './chartTheme'
import styles from './ScenarioChart.module.css'

export type ScenarioDatum = {
  timestamp: string
  baseline: number
  simulated: number
}

type ScenarioChartProps = {
  points: ScenarioDatum[]
  height?: number
}

function TooltipContent({
  active,
  payload,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload || payload.length === 0) return null

  const datum = payload[0]?.payload as ScenarioDatum | undefined
  if (!datum) return null

  const date = new Date(
    datum.timestamp.includes('T') ? datum.timestamp : datum.timestamp.replace(' ', 'T'),
  )
  const label = Number.isNaN(date.getTime())
    ? datum.timestamp
    : date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })

  return (
    <ChartTooltip
      title={label}
      rows={[
        {
          label: 'Baseline forecast',
          value: `${datum.baseline.toFixed(3)} kWh`,
          tone: 'emerald',
        },
        {
          label: 'Simulated',
          value: `${datum.simulated.toFixed(3)} kWh`,
          tone: 'amber',
        },
        {
          label: 'Difference',
          value: `${(datum.baseline - datum.simulated).toFixed(3)} kWh`,
        },
      ]}
    />
  )
}

export function ScenarioChart({ points, height = 330 }: ScenarioChartProps) {
  if (points.length === 0) {
    return (
      <div className={styles.empty} style={{ height }}>
        No scenario results to plot yet.
      </div>
    )
  }

  return (
    <div className={styles.wrapper} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke={CHART.grid}
            strokeDasharray="2 5"
            strokeWidth={1}
          />

          <XAxis
            dataKey="timestamp"
            tickFormatter={(value: string) => formatTick(value, 'time')}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            minTickGap={26}
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

          {/* The shaded band is the estimated saving at each hour. */}
          <Area
            dataKey={(entry: ScenarioDatum) => [entry.simulated, entry.baseline]}
            fill="rgba(217, 154, 53, 0.20)"
            stroke="none"
            isAnimationActive={false}
            activeDot={false}
          />

          <Line
            type="monotone"
            dataKey="baseline"
            name="Baseline"
            stroke={CHART.emerald}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5, fill: CHART.emerald, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="simulated"
            name="Simulated"
            stroke={CHART.amber}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 3.5, fill: CHART.amber, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={[styles.swatch, styles.baseline].join(' ')} />
          Baseline forecast
        </span>
        <span className={styles.legendItem}>
          <span className={[styles.swatch, styles.simulated].join(' ')} />
          Simulated consumption
        </span>
        <span className={styles.legendItem}>
          <span className={[styles.swatch, styles.band].join(' ')} />
          Estimated saving
        </span>
      </p>
    </div>
  )
}
