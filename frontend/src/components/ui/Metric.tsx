import type { ReactNode } from 'react'
import styles from './Metric.module.css'

type MetricProps = {
  label: string
  value: string
  unit?: string
  note?: ReactNode
  /** Rendered to the right of the label, e.g. a period marker. */
  marker?: ReactNode
  tone?: 'default' | 'dark'
}

export function Metric({
  label,
  value,
  unit,
  note,
  marker,
  tone = 'default',
}: MetricProps) {
  const classes = [styles.metric, styles[tone]].join(' ')

  return (
    <div className={classes}>
      <div className={styles.labelRow}>
        <p className={styles.label}>{label}</p>
        {marker}
      </div>
      <p className={styles.value}>
        <span className={styles.number}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </p>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  )
}
