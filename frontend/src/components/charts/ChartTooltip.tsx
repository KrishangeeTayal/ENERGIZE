import styles from './ChartTooltip.module.css'

export type TooltipRow = {
  label: string
  value: string
  tone?: 'default' | 'emerald' | 'amber'
}

type ChartTooltipProps = {
  title: string
  subtitle?: string
  rows: TooltipRow[]
  footer?: string
}

export function ChartTooltip({ title, subtitle, rows, footer }: ChartTooltipProps) {
  return (
    <div className={styles.tooltip}>
      <p className={styles.title}>{title}</p>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <dl className={styles.rows}>
        {rows.map((row) => (
          <div className={styles.row} key={row.label}>
            <dt className={styles.label}>
              {row.tone && <span className={[styles.swatch, styles[row.tone]].join(' ')} />}
              {row.label}
            </dt>
            <dd className={styles.value}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <p className={styles.footer}>{footer}</p>}
    </div>
  )
}
