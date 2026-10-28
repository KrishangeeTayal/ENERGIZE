import { Suspense, lazy, useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { StateBlock } from './components/ui/StateBlock'
import { api } from './lib/api'
import { PAGES } from './lib/navigation'
import type { PageId } from './lib/navigation'

/*
 * Each area is loaded on demand. The charting library is only pulled in by
 * the pages that actually draw, which keeps the first paint small.
 */
const OverviewPage = lazy(() =>
  import('./pages/OverviewPage').then((module) => ({
    default: module.OverviewPage,
  })),
)
const PredictionPage = lazy(() =>
  import('./pages/PredictionPage').then((module) => ({
    default: module.PredictionPage,
  })),
)
const WastePage = lazy(() =>
  import('./pages/WastePage').then((module) => ({
    default: module.WastePage,
  })),
)
const TwinPage = lazy(() =>
  import('./pages/TwinPage').then((module) => ({ default: module.TwinPage })),
)
const OptimizationPage = lazy(() =>
  import('./pages/OptimizationPage').then((module) => ({
    default: module.OptimizationPage,
  })),
)
const ModelLabPage = lazy(() =>
  import('./pages/ModelLabPage').then((module) => ({
    default: module.ModelLabPage,
  })),
)

function readHash(): PageId {
  const candidate = window.location.hash.replace(/^#\/?/, '')
  return candidate in PAGES ? (candidate as PageId) : 'overview'
}

export default function App() {
  const [page, setPage] = useState<PageId>(readHash)
  const [apiReachable, setApiReachable] = useState<boolean | null>(null)
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null)

  useEffect(() => {
    const onHashChange = () => {
      setPage(readHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    let active = true

    api
      .health()
      .then(() => {
        if (!active) return
        setApiReachable(true)
        return api.overview()
      })
      .then((overview) => {
        if (!active || !overview) return
        setPeriod({ start: overview.start_date, end: overview.end_date })
      })
      .catch(() => {
        if (active) setApiReachable(false)
      })

    return () => {
      active = false
    }
  }, [])

  const navigate = (next: PageId) => {
    setPage(next)
    window.location.hash = `/${next}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AppShell
      page={page}
      onNavigate={navigate}
      apiReachable={apiReachable}
      period={period}
    >
      <Suspense
        fallback={
          <StateBlock variant="loading" title="Opening workspace…" />
        }
      >
        {page === 'overview' && <OverviewPage />}
        {page === 'prediction' && <PredictionPage />}
        {page === 'waste' && <WastePage />}
        {page === 'twin' && <TwinPage />}
        {page === 'optimization' && <OptimizationPage />}
        {page === 'model-lab' && <ModelLabPage />}
      </Suspense>
    </AppShell>
  )
}
