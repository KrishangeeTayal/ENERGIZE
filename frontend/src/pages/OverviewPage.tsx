import { useMemo, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Panel } from '../components/ui/Panel'
import { Sparkline } from '../components/ui/Sparkline'
import { StateBlock } from '../components/ui/StateBlock'
import { ConsumptionChart } from '../components/charts/ConsumptionChart'
import { api } from '../lib/api'
import { formatCount, formatDate, formatKwh, formatRange } from '../lib/format'
import { useAsync } from '../lib/hooks'
import { PAGES } from '../lib/navigation'
import type { HistoryBucket } from '../lib/types'
import layout from './layout.module.css'
import styles from './OverviewPage.module.css'

const BUCKETS: { id: HistoryBucket; label: string }[] = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
]

export function OverviewPage() {
  const meta = PAGES.overview
  const [bucket, setBucket] = useState<HistoryBucket>('day')

  const overview = useAsync(() => api.overview(), [])
  const history = useAsync(() => api.history({ bucket, limit: 1000 }), [bucket])
  const comparison = useAsync(() => api.modelComparison(), [])
  const profile = useAsync(() => api.profile(), [])
  const anomalies = useAsync(() => api.anomalies({ hours: 720, limit: 1 }), [])

  const chartPoints = useMemo(
    () =>
      (history.data ?? []).map((point) => ({
        timestamp: point.timestamp,
        value: point.mean_kwh ?? point.energy_kwh,
      })),
    [history.data],
  )

  const quietest = useMemo(() => {
    if (!profile.data) return null
    const means = profile.data.hour_means
    let index = 0
    for (let i = 1; i < means.length; i += 1) {
      if (means[i] < means[index]) index = i
    }
    return { hour: index, value: means[index] }
  }, [profile.data])

  const xgboost = useMemo(
    () =>
      comparison.data?.models.find((entry) => entry.model === 'XGBoost') ?? null,
    [comparison.data],
  )

  const baseline = useMemo(
    () =>
      comparison.data?.models.find((entry) =>
        entry.model.toLowerCase().includes('baseline'),
      ) ?? null,
    [comparison.data],
  )

  const chartRange =
    history.data && history.data.length > 0
      ? {
          start: history.data[0].timestamp,
          end: history.data[history.data.length - 1].timestamp,
        }
      : null

  return (
    <>
      <PageHeader
        folio={meta.folio}
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        meta={
          overview.data ? (
            <>
              <Badge tone="emerald" icon="●">
                {formatCount(overview.data.records)} hourly readings
              </Badge>
              <Badge tone="outline">
                {formatRange(overview.data.start_date, overview.data.end_date)}
              </Badge>
            </>
          ) : undefined
        }
      />

      {overview.error && (
        <StateBlock
          variant="error"
          title="Could not reach the ENERGIZE API"
          description={overview.error}
        />
      )}

      <section className={styles.portrait}>
        <div className={styles.portraitLead}>
          <p className={styles.eyebrowOnDark}>Mean hourly consumption</p>
          {overview.data ? (
            <>
              <p className={styles.heroValue}>
                {formatKwh(overview.data.average_consumption, 3)}
                <span className={styles.heroUnit}>kWh / hour</span>
              </p>
              <p className={styles.heroNote}>
                Averaged across every valid hourly measurement in the prepared
                dataset.
              </p>
            </>
          ) : (
            <p className={styles.heroNote}>Loading the dataset summary…</p>
          )}

          {profile.data && (
            <div className={styles.heroSpark}>
              <Sparkline
                values={profile.data.hour_means}
                width={308}
                height={53}
                tone="emerald"
                label="Average consumption for each hour of the day"
              />
              <p className={styles.sparkCaption}>
                Average consumption across the 24 hours of a day
              </p>
            </div>
          )}
        </div>

        <dl className={styles.statGrid}>
          <div className={styles.stat}>
            <dt>Lowest hour</dt>
            <dd>{formatKwh(overview.data?.minimum_consumption ?? 0, 3)} kWh</dd>
          </div>
          <div className={styles.stat}>
            <dt>Highest hour</dt>
            <dd>{formatKwh(overview.data?.maximum_consumption ?? 0, 3)} kWh</dd>
          </div>
          <div className={styles.stat}>
            <dt>Readings</dt>
            <dd>{overview.data ? formatCount(overview.data.records) : '—'}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Period covered</dt>
            <dd>
              {overview.data
                ? `${formatDate(overview.data.start_date)} — ${formatDate(overview.data.end_date)}`
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      <div className={layout.split}>
        <Panel
          eyebrow="Historical signal"
          title="Consumption over time"
          description="Mean hourly consumption, averaged within each period. Measured values, not forecasts."
          action={
            <div className={styles.segmented} role="group" aria-label="Chart period">
              {BUCKETS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={[
                    styles.segment,
                    option.id === bucket ? styles.segmentActive : '',
                  ].join(' ')}
                  aria-pressed={option.id === bucket}
                  onClick={() => setBucket(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        >
          {history.status === 'error' && (
            <StateBlock
              variant="error"
              title="Could not load the history"
              description={history.error ?? undefined}
            />
          )}

          {history.status === 'loading' && (
            <StateBlock variant="loading" title="Loading recorded consumption…" />
          )}

          {history.status === 'success' && chartPoints.length > 0 && (
            <>
              <ConsumptionChart
                points={chartPoints}
                height={350}
                seriesLabel="Mean hourly consumption"
                reference={
                  overview.data
                    ? {
                        value: overview.data.average_consumption,
                        label: 'Overall average',
                      }
                    : undefined
                }
              />
              <p className={styles.chartNote}>
                {chartRange
                  ? `${formatRange(chartRange.start, chartRange.end)} · ${formatCount(
                      chartPoints.length,
                    )} periods`
                  : ''}
              </p>
            </>
          )}
        </Panel>

        <div className={layout.stackTight}>
          <Panel
            eyebrow="Observed signal"
            title="What the data shows"
            description="Derived directly from the recorded measurements."
          >
            <ul className={styles.signalList}>
              <li>
                <span className={styles.signalLabel}>Busiest hour of the week</span>
                <span className={styles.signalValue}>
                  {profile.data
                    ? `${profile.data.peak.day}, ${String(profile.data.peak.hour).padStart(2, '0')}:00`
                    : '—'}
                </span>
                {profile.data && (
                  <span className={styles.signalMeta}>
                    {formatKwh(profile.data.peak.value_kwh, 3)} kWh average
                  </span>
                )}
              </li>
              <li>
                <span className={styles.signalLabel}>Quietest hour of the day</span>
                <span className={styles.signalValue}>
                  {quietest
                    ? `${String(quietest.hour).padStart(2, '0')}:00`
                    : '—'}
                </span>
                {quietest && (
                  <span className={styles.signalMeta}>
                    {formatKwh(quietest.value, 3)} kWh average
                  </span>
                )}
              </li>
              <li>
                <span className={styles.signalLabel}>Unusual readings, last 30 days</span>
                <span className={styles.signalValue}>
                  {anomalies.data
                    ? `${anomalies.data.summary.anomaly_rate_percent}%`
                    : '—'}
                </span>
                {anomalies.data && (
                  <span className={styles.signalMeta}>
                    {formatCount(anomalies.data.summary.anomaly_count)} of{' '}
                    {formatCount(anomalies.data.summary.evaluated)} hours scored
                    above the threshold
                  </span>
                )}
              </li>
              <li>
                <span className={styles.signalLabel}>Most accurate model</span>
                <span className={styles.signalValue}>
                  {comparison.data?.best_model ?? '—'}
                </span>
                {xgboost && (
                  <span className={styles.signalMeta}>
                    {formatKwh(xgboost.rmse ?? 0, 4)} kWh RMSE on held-out data
                  </span>
                )}
              </li>
            </ul>
          </Panel>

          <Panel
            eyebrow="Model evaluation"
            title="Error against the baseline"
            description="Measured on the chronological 20% test split, never on training data."
          >
            {comparison.status === 'loading' && (
              <StateBlock variant="loading" title="Loading evaluation metrics…" />
            )}

            {comparison.status === 'error' && (
              <StateBlock
                variant="error"
                title="Could not load the model comparison"
                description={comparison.error ?? undefined}
              />
            )}

            {comparison.status === 'success' && baseline && xgboost && (
              <>
                <div className={styles.gain}>
                  <p className={styles.gainValue}>
                    {comparison.data?.improvement_over_baseline
                      ? `${comparison.data.improvement_over_baseline.rmse_reduction_percent}%`
                      : '—'}
                  </p>
                  <p className={styles.gainLabel}>
                    lower RMSE than the previous-hour baseline
                  </p>
                </div>

                <dl className={styles.compareList}>
                  <div className={styles.compareRow}>
                    <dt>Previous-hour baseline</dt>
                    <dd>{formatKwh(baseline.rmse ?? 0, 4)} kWh RMSE</dd>
                  </div>
                  <div className={styles.compareRow}>
                    <dt>XGBoost</dt>
                    <dd>{formatKwh(xgboost.rmse ?? 0, 4)} kWh RMSE</dd>
                  </div>
                </dl>

                <p className={styles.compareNote}>
                  Tested {formatCount(comparison.data?.evaluation.testing_records ?? 0)}{' '}
                  hourly records from{' '}
                  {comparison.data
                    ? formatDate(comparison.data.evaluation.testing_period.start)
                    : '—'}
                </p>
              </>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
