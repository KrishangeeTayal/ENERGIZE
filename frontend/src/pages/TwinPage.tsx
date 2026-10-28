import { useMemo } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Panel } from '../components/ui/Panel'
import { StateBlock } from '../components/ui/StateBlock'
import { ProfileHeatmap } from '../components/charts/ProfileHeatmap'
import { ProfileChart } from '../components/charts/ProfileChart'
import { api } from '../lib/api'
import { formatCount, formatKwh, nextHourIso, parseTimestamp } from '../lib/format'
import { useAsync } from '../lib/hooks'
import { PAGES } from '../lib/navigation'
import styles from './TwinPage.module.css'

export function TwinPage() {
  const meta = PAGES.twin

  const profile = useAsync(() => api.profile(), [])
  const forecast = useAsync(async () => {
    const summary = await api.overview()
    return api.forecast({
      start_timestamp: nextHourIso(summary.end_date),
      horizon: 24,
      model: 'XGBoost',
    })
  }, [])

  const profilePoints = useMemo(() => {
    const observed = profile.data?.hour_means ?? []
    const forecastByHour: (number | null)[] = Array.from({ length: 24 }, () => null)

    for (const point of forecast.data?.forecast ?? []) {
      const hour = parseTimestamp(point.timestamp).getHours()
      forecastByHour[hour] = point.predicted_kwh
    }

    return observed.map((value, hour) => ({
      hour,
      observed: value,
      forecast: forecastByHour[hour],
    }))
  }, [profile.data, forecast.data])

  const quietestHour = useMemo(() => {
    const means = profile.data?.hour_means ?? []
    if (means.length === 0) return null
    let index = 0
    for (let i = 1; i < means.length; i += 1) {
      if (means[i] < means[index]) index = i
    }
    return { hour: index, value: means[index] }
  }, [profile.data])

  return (
    <>
      <PageHeader
        folio={meta.folio}
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        meta={
          profile.data ? (
            <>
              <Badge tone="emerald" icon="●">
                {formatCount(profile.data.records)} observations aggregated
              </Badge>
              <Badge tone="outline">Observed profile · not a live simulation</Badge>
            </>
          ) : undefined
        }
      />

      {profile.status === 'error' && (
        <StateBlock
          variant="error"
          title="Could not load the household profile"
          description={profile.error ?? undefined}
        />
      )}

      {profile.status === 'loading' && (
        <StateBlock variant="loading" title="Aggregating the household profile…" />
      )}

      {profile.status === 'success' && profile.data && (
        <>
          <>
            <Panel
              eyebrow="Observed · every hour of every weekday"
              title="The household shape"
              description="Each cell is the average consumption for that hour across every matching day in the record. These are measurements, not a model."
            >
              <ProfileHeatmap
                matrix={profile.data.matrix}
                counts={profile.data.counts}
                dayLabels={profile.data.day_labels}
                hourLabels={profile.data.hour_labels}
                min={profile.data.minimum}
                max={profile.data.maximum}
              />
            </Panel>

            <div className={styles.belowGrid}>
              <section className={styles.peakCard}>
                <p className={styles.peakEyebrow}>Busiest moment in the record</p>
                <p className={styles.peakValue}>
                  {profile.data.peak.day}
                  <span className={styles.peakHour}>
                    {String(profile.data.peak.hour).padStart(2, '0')}:00
                  </span>
                </p>
                <p className={styles.peakNote}>
                  {formatKwh(profile.data.peak.value_kwh, 3)} kWh average consumption
                  at that hour.
                </p>
              </section>

              <Panel eyebrow="Read from the profile" title="Shape of the day">
                <dl className={styles.facts}>
                  <div>
                    <dt>Quietest hour</dt>
                    <dd>
                      {quietestHour
                        ? `${String(quietestHour.hour).padStart(2, '0')}:00`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Quietest average</dt>
                    <dd>
                      {quietestHour ? `${formatKwh(quietestHour.value, 3)} kWh` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Overall mean</dt>
                    <dd>{formatKwh(profile.data.overall_mean, 3)} kWh</dd>
                  </div>
                  <div>
                    <dt>Highest cell</dt>
                    <dd>{formatKwh(profile.data.maximum, 3)} kWh</dd>
                  </div>
                </dl>
              </Panel>
            </div>
          </>

          <Panel
            eyebrow="Observed profile with the model forecast"
            title="The shape, and where it is heading"
            description="The filled curve is the recorded average for each hour of the day. The dashed line is the model's forecast for the next 24 hours, aligned by hour."
          >
            {forecast.status === 'error' && (
              <StateBlock
                variant="error"
                title="Could not load the forecast"
                description={forecast.error ?? undefined}
              />
            )}

            <ProfileChart points={profilePoints} height={310} />

            <div className={styles.relationship}>
              <article>
                <span className={styles.relTag}>Observed</span>
                <p>
                  Every cell and curve above is a measurement from the prepared
                  record, aggregated across{' '}
                  {formatCount(profile.data.records)} hours.
                </p>
              </article>
              <article>
                <span className={[styles.relTag, styles.relForecast].join(' ')}>
                  Forecast
                </span>
                <p>
                  {forecast.data
                    ? `A ${forecast.data.horizon_hours}-hour recursive forecast from the XGBoost model, starting one hour after the last recorded reading.`
                    : 'The forecast is still loading.'}
                </p>
              </article>
              <article>
                <span className={[styles.relTag, styles.relSimulated].join(' ')}>
                  Simulated
                </span>
                <p>
                  Reduction scenarios are computed on top of the forecast, not
                  on this profile. The Optimization Lab holds the full
                  scenario comparison.
                </p>
              </article>
            </div>
          </Panel>
        </>
      )}
    </>
  )
}
