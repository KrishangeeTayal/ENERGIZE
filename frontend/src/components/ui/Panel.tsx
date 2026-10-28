import type { ReactNode } from 'react'
import styles from './Panel.module.css'

type PanelProps = {
  eyebrow?: string
  title?: string
  description?: string
  action?: ReactNode
  tone?: 'default' | 'dark' | 'flush'
  className?: string
  children: ReactNode
}

export function Panel({
  eyebrow,
  title,
  description,
  action,
  tone = 'default',
  className,
  children,
}: PanelProps) {
  const classes = [styles.panel, styles[tone], className].filter(Boolean).join(' ')
  const hasHeader = Boolean(eyebrow || title || description || action)

  return (
    <section className={classes}>
      {hasHeader && (
        <header className={styles.header}>
          <div className={styles.heading}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            {title && <h2 className={styles.title}>{title}</h2>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
