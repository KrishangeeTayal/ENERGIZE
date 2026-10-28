import type { ReactNode } from 'react'
import styles from './Badge.module.css'

type BadgeProps = {
  tone?: 'neutral' | 'emerald' | 'amber' | 'danger' | 'dark' | 'outline'
  children: ReactNode
  icon?: ReactNode
}

export function Badge({ tone = 'neutral', children, icon }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[tone]].join(' ')}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}
