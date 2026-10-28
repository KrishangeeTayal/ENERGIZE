import { useState, type ReactNode } from 'react'
import type { PageId } from '../../lib/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import styles from './AppShell.module.css'

type AppShellProps = {
  page: PageId
  onNavigate: (page: PageId) => void
  apiReachable: boolean | null
  period?: { start: string; end: string } | null
  children: ReactNode
}

export function AppShell({
  page,
  onNavigate,
  apiReachable,
  period,
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Sidebar
        active={page}
        onNavigate={onNavigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        apiReachable={apiReachable}
      />

      <div className={styles.main}>
        <Topbar
          page={page}
          onOpenMenu={() => setMenuOpen(true)}
          period={period ?? null}
        />

        <main className={styles.content} id="main-content">
          {children}
        </main>

        <footer className={styles.footer}>
          <span>
            ENERGIZE <i aria-hidden="true">·</i> Predict intelligently. Optimize
            responsibly.
          </span>
          <span className={styles.footerMeta}>
            Household electricity dataset · local development build
          </span>
        </footer>
      </div>
    </div>
  )
}
