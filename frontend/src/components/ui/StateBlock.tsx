import type { ReactNode } from 'react'
import styles from './StateBlock.module.css'

type StateBlockProps = {
  variant: 'loading' | 'empty' | 'error'
  title: string
  description?: string
  action?: ReactNode
}

export function StateBlock({ variant, title, description, action }: StateBlockProps) {
  return (
    <div
      className={[styles.block, styles[variant]].join(' ')}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span className={styles.mark} aria-hidden="true">
        {variant === 'loading' ? '⋯' : variant === 'error' ? '!' : '—'}
      </span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
