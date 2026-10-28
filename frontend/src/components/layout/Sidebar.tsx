import { NAV_GROUPS } from '../../lib/navigation'
import type { PageId } from '../../lib/navigation'
import { LeafIcon } from './icons'
import styles from './Sidebar.module.css'

type SidebarProps = {
  active: PageId
  onNavigate: (page: PageId) => void
  open: boolean
  onClose: () => void
  apiReachable: boolean | null
}

export function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
  apiReachable,
}: SidebarProps) {
  const statusLabel =
    apiReachable === null
      ? 'Connecting'
      : apiReachable
        ? 'API online'
        : 'API offline'

  return (
    <>
      <div
        className={[styles.scrim, open ? styles.scrimVisible : ''].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={[styles.sidebar, open ? styles.open : ''].join(' ')}
        aria-label="Primary navigation"
      >
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <LeafIcon />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>ENERGIZE</span>
            <span className={styles.brandTagline}>
              Predict intelligently.
              <br />
              Optimize responsibly.
            </span>
          </span>
        </div>

        <nav className={styles.nav}>
          {NAV_GROUPS.map((group) => (
            <div className={styles.group} key={group.label}>
              <p className={styles.groupLabel}>{group.label}</p>
              <ul className={styles.groupItems}>
                {group.items.map((item) => {
                  const isActive = item.id === active
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={[styles.item, isActive ? styles.active : ''].join(' ')}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          onNavigate(item.id)
                          onClose()
                        }}
                      >
                        <span className={styles.itemIcon}>{item.icon}</span>
                        <span className={styles.itemLabel}>{item.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.status}>
          <span
            className={[
              styles.statusDot,
              apiReachable === false ? styles.statusDotOffline : '',
              apiReachable === null ? styles.statusDotPending : '',
            ].join(' ')}
            aria-hidden="true"
          />
          <span className={styles.statusText}>
            <strong>{statusLabel}</strong>
            <small>Historical dataset · local build</small>
          </span>
        </div>
      </aside>
    </>
  )
}
