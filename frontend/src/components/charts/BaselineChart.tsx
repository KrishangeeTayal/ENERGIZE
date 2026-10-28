import { useId } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_TICK, CHART, formatTick, pickTimeFormat } from './chartTheme'
import styles from './BaselineChart.module.css'

export type BaselineDatum = {
  timestamp: string
  measured: number | null
  baseline: number | null
  anomaly: number | null
}

type BaselineChartProps = {
  points: BaselineDatum[]
  height?: number
  threshold: number
}

function TooltipContent({
  active,
  payload,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload || payload.length === 0) return null

  const datum = payload[0]?.payload as BaselineDatum | undefined
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

  const rows = []
  if (typeof datum.measured === 'number') {
    rows.push({
      label: 'Measured',
      value: `${datum.measured.toFixed(3)} kWh`,
      tone: 'emerald' as const,
    })
  }
  if (typeof datum.baseline === 'number') {
    rows.push({
      label: 'Expected for this hour',
      value: `${datum.baseline.toFixed(3)} kWh`,
    })
  }
  if (typeof datum.anomaly === 'number') {
    rows.push({
      label: 'Anomaly score',
      value: datum.anomaly.toFixed(2),
      tone: 'amber' as const,
    })
  }

  return <ChartTooltip title={label} rows={rows} />
}

export function BaselineChart({ points, height = 350, threshold }: BaselineChartProps) {
  const gradientId = useId()

  if (points.length === 0) {
    return (
      <div className={styles.empty} style={{ height }}>
        No readings in this window.
      </div>
    )
  }

  const span =
    new Date(points[points.length - 1].timestamp).getTime() -
    new Date(points[0].timestamp).getTime()
  const timeFormat = pickTimeFormat(span)

  return (
    <div className={styles.wrapper} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.emerald} stopOpacity={0.2} />
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
            dataKey="timestamp"
            tickFormatter={(value: string) => formatTick(value, timeFormat)}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
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

          <Line
            type="monotone"
            dataKey="baseline"
            name="Expected"
            stroke={CHART.ink4}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            connectNulls
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="measured"
            name="Measured"
            stroke={CHART.emerald}
            strokeWidth={1.8}
            dot={false}
            activeDot={{ r: 3.5, fill: CHART.emerald, stroke: '#fff', strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />

          <Scatter
            dataKey="anomaly"
            name="Flagged"
            fill={CHART.amber}
            shape="circle"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={[styles.swatch, styles.measured].join(' ')} />
          Measured consumption
        </span>
        <span className={styles.legendItem}>
          <span className={[styles.swatch, styles.baseline].join(' ')} />
          Expected for that hour
        </span>
        <span className={styles.legendItem}>
          <span className={[styles.swatch, styles.anomaly].join(' ')} />
          Flagged above {threshold}
        </span>
      </p>
    </div>
  )
}
