import { PAGES } from '../../lib/navigation'
import type { PageId } from '../../lib/navigation'
import { formatRange } from '../../lib/format'
import styles from './Topbar.module.css'

type TopbarProps = {
  page: PageId
  onOpenMenu: () => void
  period?: { start: string; end: string } | null
}

export function Topbar({ page, onOpenMenu, period }: TopbarProps) {
  const meta = PAGES[page]

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={onOpenMenu}
        aria-label="Open navigation"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span className={styles.crumbRoot}>ENERGIZE</span>
        <span className={styles.separator} aria-hidden="true">
          /
        </span>
        <span className={styles.crumbCurrent}>{meta.label}</span>
      </nav>

      <div className={styles.right}>
        {period && (
          <span className={styles.period}>
            <span className={styles.periodLabel}>Dataset</span>
            <span className={styles.periodValue}>
              {formatRange(period.start, period.end)}
            </span>
          </span>
        )}
      </div>
    </header>
  )
}
