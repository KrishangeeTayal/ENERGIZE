import { useId } from 'react'
import styles from './Sparkline.module.css'

type SparklineProps = {
  values: number[]
  width?: number
  height?: number
  tone?: 'emerald' | 'sage' | 'amber'
  label?: string
}

/**
 * A compact inline trend line. It plots the real values it is given and
 * nothing else — there is no generated or placeholder series.
 */
export function Sparkline({
  values,
  width = 132,
  height = 35,
  tone = 'emerald',
  label,
}: SparklineProps) {
  const gradientId = useId()

  if (values.length < 2) {
    return (
      <span className={styles.empty} role="img" aria-label={label ?? 'No trend available'}>
        —
      </span>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const padding = 2

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return [x, y] as const
  })

  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg
      className={[styles.sparkline, styles[tone]].join(' ')}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={label ?? 'Trend'}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
