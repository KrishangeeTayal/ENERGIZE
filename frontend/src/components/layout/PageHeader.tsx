import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

type PageHeaderProps = {
  /** Two-digit folio, e.g. "01". */
  folio: string
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
}

export function PageHeader({
  folio,
  eyebrow,
  title,
  description,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.folio} aria-hidden="true">
        {folio}
      </div>

      <div className={styles.body}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
        {meta && <div className={styles.meta}>{meta}</div>}
      </div>

      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
