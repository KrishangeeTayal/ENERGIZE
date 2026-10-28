import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_TICK, CHART, formatTick, pickTimeFormat } from './chartTheme'
import styles from './ConsumptionChart.module.css'

export type ChartPoint = {
  timestamp: string
  value: number
  secondary?: number
}

type ConsumptionChartProps = {
  points: ChartPoint[]
  height?: number
  /** Draws a dashed reference line at this value. */
  reference?: { value: number; label: string }
  valueLabel?: string
  seriesLabel?: string
  emptyMessage?: string
}

function TooltipContent({
  active,
  payload,
  label,
  valueLabel = 'kWh',
  seriesLabel = 'Consumption',
}: Partial<TooltipContentProps<number, string>> & {
  valueLabel?: string
  seriesLabel?: string
}) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const point = payload[0]?.payload as ChartPoint | undefined
  if (!point) return null

  const date = new Date(
    point.timestamp.includes('T') ? point.timestamp : point.timestamp.replace(' ', 'T'),
  )
  const timeLabel = Number.isNaN(date.getTime())
    ? String(label ?? point.timestamp)
    : date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

  return (
    <ChartTooltip
      title={timeLabel}
      rows={[
        {
          label: seriesLabel,
          value: `${point.value.toFixed(3)} ${valueLabel}`,
          tone: 'emerald',
        },
      ]}
    />
  )
}

export function ConsumptionChart({
  points,
  height = 330,
  reference,
  valueLabel = 'kWh',
  seriesLabel = 'Consumption',
  emptyMessage = 'No readings in this window.',
}: ConsumptionChartProps) {
  const gradientId = useId()

  if (points.length === 0) {
    return (
      <div className={styles.empty} style={{ height }}>
        {emptyMessage}
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
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.emerald} stopOpacity={0.26} />
              <stop offset="55%" stopColor={CHART.emerald} stopOpacity={0.09} />
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
            minTickGap={28}
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

          {reference && (
            <ReferenceLine
              y={reference.value}
              stroke={CHART.amber}
              strokeDasharray="4 4"
              strokeWidth={1.25}
            />
          )}

          <Tooltip
            cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
            content={
              <TooltipContent valueLabel={valueLabel} seriesLabel={seriesLabel} />
            }
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART.emerald}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: CHART.emerald, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {reference && (
        <p className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.swatch} aria-hidden="true" />
            {reference.label} · {reference.value.toFixed(3)} {valueLabel}
          </span>
        </p>
      )}
    </div>
  )
}
