import { useMemo, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Panel } from '../components/ui/Panel'
import { StateBlock } from '../components/ui/StateBlock'
import { BaselineChart } from '../components/charts/BaselineChart'
import { api } from '../lib/api'
import { formatCount, formatDateTime, formatKwh } from '../lib/format'
import { useAsync } from '../lib/hooks'
import { PAGES } from '../lib/navigation'
import layout from './layout.module.css'
import styles from './WastePage.module.css'
import control from '../components/ui/Control.module.css'

const THRESHOLDS = [2.5, 3, 3.5, 4, 5]
const WINDOWS = [24, 48, 72, 168]

export function WastePage() {
  const meta = PAGES.waste

  const [threshold, setThreshold] = useState(3.5)
  const [hours, setHours] = useState(720)
  const [window, setWindow] = useState(45)

  const anomalies = useAsync(
    () => api.anomalies({ hours, window, threshold, limit: 120 }),
    [hours, window, threshold],
  )

  const chartPoints = useMemo(() => {
    const series = anomalies.data?.series ?? []
    const flagged = new Set(
      (anomalies.data?.anomalies ?? []).map((entry) => entry.timestamp),
    )

    return series.map((point) => ({
      timestamp: point.timestamp,
      measured: point.value_kwh,
      baseline: point.baseline_kwh,
      anomaly: flagged.has(point.timestamp) ? point.value_kwh : null,
    }))
  }, [anomalies.data])

  const summary = anomalies.data?.summary

  return (
    <>
      <PageHeader
        folio={meta.folio}
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        meta={
          anomalies.data ? (
            <>
              <Badge tone="amber" icon="▲">
                {formatCount(summary?.anomaly_count ?? 0)} flagged
              </Badge>
              <Badge tone="outline">
                {anomalies.data.parameters.evaluation_hours} hours evaluated
              </Badge>
            </>
          ) : undefined
        }
      />

      {anomalies.status === 'error' && (
        <StateBlock
          variant="error"
          title="Could not run the anomaly scan"
          description={anomalies.error ?? undefined}
        />
      )}

      {anomalies.status === 'loading' && (
        <StateBlock variant="loading" title="Scoring the recorded hours…" />
      )}

      {anomalies.status === 'success' && anomalies.data && (
        <>
          <section className={styles.statBand}>
            <div className={styles.statLead}>
              <p className={styles.statLabel}>Readings above the threshold</p>
              <p className={styles.statValue}>
                {summary?.anomaly_rate_percent ?? 0}
                <span className={styles.statUnit}>% of hours</span>
              </p>
              <p className={styles.statNote}>
                {formatCount(summary?.anomaly_count ?? 0)} of{' '}
                {formatCount(summary?.evaluated ?? 0)} evaluated hours scored
                beyond {threshold} on the modified z-score.
              </p>
            </div>

            <dl className={styles.statGrid}>
              <div className={styles.stat}>
                <dt>Strongest deviation</dt>
                <dd>{formatKwh(summary?.peak_score ?? 0, 2)} σ</dd>
              </div>
              <div className={styles.stat}>
                <dt>Highest flagged reading</dt>
                <dd>{formatKwh(summary?.peak_value_kwh ?? 0, 3)} kWh</dd>
              </div>
              <div className={styles.stat}>
                <dt>Evaluation window</dt>
                <dd>{anomalies.data.parameters.evaluation_hours} h</dd>
              </div>
              <div className={styles.stat}>
                <dt>Seasonal baseline</dt>
                <dd>{anomalies.data.parameters.seasonal_window_days} days</dd>
              </div>
            </dl>
          </section>

          <Panel
            eyebrow="Measured against expectation"
            title="Consumption and its expected baseline"
            description="The dashed line is the household's typical consumption for that hour of day. Flagged readings are marked."
            action={
              <div className={styles.controls}>
                <label className={styles.control}>
                  <span>Threshold</span>
                  <select
                    className={control.select}
                    value={threshold}
                    onChange={(event) => setThreshold(Number(event.target.value))}
                  >
                    {THRESHOLDS.map((option) => (
                      <option key={option} value={option}>
                        {option} σ
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.control}>
                  <span>Evaluate</span>
                  <select
                    className={control.select}
                    value={hours}
                    onChange={(event) => setHours(Number(event.target.value))}
                  >
                    {WINDOWS.map((option) => (
                      <option key={option} value={option}>
                        Last {option} h
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.control}>
                  <span>Baseline</span>
                  <select
                    className={control.select}
                    value={window}
                    onChange={(event) => setWindow(Number(event.target.value))}
                  >
                    {[30, 45, 60, 90].map((option) => (
                      <option key={option} value={option}>
                        {option} days
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            }
          >
            <BaselineChart
              points={chartPoints}
              threshold={threshold}
              height={375}
            />
          </Panel>

          <div className={layout.splitRail}>
            <Panel
              eyebrow="Ranked by deviation"
              title="Flagged readings"
              description="The strongest departures from the expected baseline for that hour."
            >
              {anomalies.data.anomalies.length === 0 ? (
                <StateBlock
                  variant="empty"
                  title="Nothing crossed the threshold"
                  description="Lower the threshold to inspect milder departures."
                />
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <caption className="visually-hidden">
                      Flagged readings ranked by anomaly score
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Timestamp</th>
                        <th scope="col">Measured</th>
                        <th scope="col">Expected</th>
                        <th scope="col">Difference</th>
                        <th scope="col">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.data.anomalies.slice(0, 25).map((entry) => (
                        <tr key={entry.timestamp}>
                          <th scope="row" className={styles.timeCell}>
                            {formatDateTime(entry.timestamp)}
                          </th>
                          <td className={styles.numeric}>
                            {formatKwh(entry.value_kwh, 3)}
                          </td>
                          <td className={styles.numeric}>
                            {formatKwh(entry.baseline_kwh, 3)}
                          </td>
                          <td
                            className={[
                              styles.numeric,
                              entry.direction === 'above'
                                ? styles.above
                                : styles.below,
                            ].join(' ')}
                          >
                            {entry.direction === 'above' ? '+' : ''}
                            {formatKwh(entry.deviation_kwh, 3)}
                          </td>
                          <td className={styles.scoreCell}>
                            <span
                              className={[
                                styles.score,
                                entry.severity === 'high'
                                  ? styles.scoreHigh
                                  : styles.scoreElevated,
                              ].join(' ')}
                            >
                              {entry.score.toFixed(1)} σ
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <div className={layout.stackTight}>
              <Panel eyebrow="How this is scored" title="The method">
                <p className={styles.methodText}>{anomalies.data.method}</p>
                <dl className={styles.methodFacts}>
                  <div>
                    <dt>Location</dt>
                    <dd>Median for the same hour of day</dd>
                  </div>
                  <div>
                    <dt>Scale</dt>
                    <dd>Median absolute deviation</dd>
                  </div>
                  <div>
                    <dt>Score</dt>
                    <dd>0.6745 × (value − median) ÷ MAD</dd>
                  </div>
                  <div>
                    <dt>Flagging</dt>
                    <dd>|score| ≥ {threshold}</dd>
                  </div>
                </dl>
              </Panel>

              <Panel eyebrow="Read this carefully" title="What a flag means">
                <p className={styles.caveatText}>{anomalies.data.caveat}</p>
                <ul className={styles.caveatList}>
                  <li>
                    The prepared dataset carries total household consumption
                    only. Individual appliance submetering is not carried
                    through, so no reading can be attributed to a device.
                  </li>
                  <li>
                    A household that is simply awake and active at 03:00 will
                    look unusual against a 03:00 baseline.
                  </li>
                </ul>
              </Panel>
            </div>
          </div>
        </>
      )}
    </>
  )
}
