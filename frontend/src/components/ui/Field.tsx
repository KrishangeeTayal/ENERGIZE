import type { ReactNode } from 'react'
import { useId } from 'react'
import styles from './Field.module.css'

type FieldProps = {
  label: string
  hint?: ReactNode
  children: (props: { id: string; describedBy?: string }) => ReactNode
}

export function Field({ label, hint, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children({ id, describedBy: hintId })}
      {hint && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
    </div>
  )
}
