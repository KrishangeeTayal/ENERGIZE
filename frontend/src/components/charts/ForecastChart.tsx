import { useId } from 'react'
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_TICK, CHART, formatTick, pickTimeFormat } from './chartTheme'
import styles from './ForecastChart.module.css'

type ForecastDatum = {
  timestamp: string
  observed: number | null
  forecast: number | null
}

type ForecastChartProps = {
  observed: { timestamp: string; value: number }[]
  forecast: { timestamp: string; value: number }[]
  height?: number
  boundaryLabel?: string
}

function TooltipContent({
  active,
  payload,
  valueLabel = 'kWh',
}: Partial<TooltipContentProps<number, string>> & { valueLabel?: string }) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const datum = payload[0]?.payload as ForecastDatum | undefined
  if (!datum) return null

  const date = new Date(
    datum.timestamp.includes('T') ? datum.timestamp : datum.timestamp.replace(' ', 'T'),
  )
  const timeLabel = Number.isNaN(date.getTime())
    ? datum.timestamp
    : date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })

  const rows = []
  if (typeof datum.observed === 'number') {
    rows.push({
      label: 'Observed',
      value: `${datum.observed.toFixed(3)} ${valueLabel}`,
      tone: 'emerald' as const,
    })
  }
  if (typeof datum.forecast === 'number') {
    rows.push({
      label: 'Model forecast',
      value: `${datum.forecast.toFixed(3)} ${valueLabel}`,
      tone: 'amber' as const,
    })
  }

  return <ChartTooltip title={timeLabel} rows={rows} />
}

export function ForecastChart({
  observed,
  forecast,
  height = 350,
  boundaryLabel = 'Forecast begins',
}: ForecastChartProps) {
  const gradientId = useId()

  const data: ForecastDatum[] = [
    ...observed.map((point) => ({
      timestamp: point.timestamp,
      observed: point.value,
      forecast: null,
    })),
    ...forecast.map((point) => ({
      timestamp: point.timestamp,
      observed: null,
      forecast: point.value,
    })),
  ]

  if (data.length === 0) {
    return (
      <div className={styles.empty} style={{ height }}>
        No observations available to chart.
      </div>
    )
  }

  const span =
    new Date(data[data.length - 1].timestamp).getTime() -
    new Date(data[0].timestamp).getTime()
  const timeFormat = pickTimeFormat(span)
  const boundary = observed.length > 0 ? observed.length - 1 : undefined

  return (
    <div className={styles.wrapper} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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

          {boundary !== undefined && (
            <ReferenceLine
              x={data[boundary]?.timestamp}
              stroke={CHART.amber}
              strokeDasharray="4 4"
              strokeWidth={1.25}
              label={{
                value: boundaryLabel,
                position: 'insideTopLeft',
                fill: CHART.amberInk,
                fontSize: 12,
                fontWeight: 600,
              }}
            />
          )}

          <Tooltip
            cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
            content={<TooltipContent />}
          />

          <Area
            type="monotone"
            dataKey="observed"
            stroke={CHART.emerald}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 4, fill: CHART.emerald, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="forecast"
            stroke={CHART.amber}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4, fill: CHART.amber, stroke: '#fff', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
