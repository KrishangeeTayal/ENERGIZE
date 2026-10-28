import { useMemo } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Panel } from '../components/ui/Panel'
import { StateBlock } from '../components/ui/StateBlock'
import { FeatureBars } from '../components/charts/FeatureBars'
import { api } from '../lib/api'
import { formatCount, formatDate, formatKwh } from '../lib/format'
import { useAsync } from '../lib/hooks'
import { PAGES } from '../lib/navigation'
import layout from './layout.module.css'
import styles from './ModelLabPage.module.css'

export function ModelLabPage() {
  const meta = PAGES['model-lab']
  const comparison = useAsync(() => api.modelComparison(), [])
  const data = comparison.data

  const features = data?.feature_columns ?? []

  const series = useMemo(() => {
    const importances = data?.feature_importances
    if (!importances) return []

    const tones: Record<string, 'emerald' | 'amber' | 'sage'> = {
      'XGBoost': 'emerald',
      'Random Forest': 'amber',
    }

    return Object.entries(importances).map(([name, entries]) => ({
      name,
      tone: tones[name] ?? ('sage' as const),
      values: Object.fromEntries(
        entries.map((entry) => [entry.feature, entry.importance]),
      ),
    }))
  }, [data])

  const maxRmse = useMemo(
    () => Math.max(...((data?.models ?? []).map((entry) => entry.rmse ?? 0)), 0),
    [data],
  )

  const header = (
    <PageHeader
      folio={meta.folio}
      eyebrow={meta.eyebrow}
      title={meta.title}
      description={meta.description}
      meta={
        data ? (
          <>
            <Badge tone="emerald" icon="●">
              Best: {data.best_model}
            </Badge>
            <Badge tone="outline">
              {formatCount(data.evaluation.testing_records)} test records
            </Badge>
          </>
        ) : undefined
      }
    />
  )

  if (comparison.status === 'error') {
    return (
      <>
        {header}
        <StateBlock
          variant="error"
          title="Could not load the model comparison"
          description={comparison.error ?? undefined}
        />
      </>
    )
  }

  if (!data) {
    return (
      <>
        {header}
        <StateBlock variant="loading" title="Loading the saved evaluation…" />
      </>
    )
  }

  const best = data.models.find((entry) => entry.model === data.best_model)

  return (
    <>
      {header}

      <section className={styles.headline}>
        <div className={styles.headlineLead}>
          <p className={styles.eyebrowOnDark}>Best test-set error</p>
          <p className={styles.headlineValue}>
            {formatKwh(best?.rmse ?? 0, 4)}
            <span className={styles.headlineUnit}>kWh RMSE</span>
          </p>
          <p className={styles.headlineNote}>
            {data.best_model} on {formatCount(data.evaluation.testing_records)}{' '}
            held-out hourly records.
          </p>
        </div>

        <dl className={styles.headlineStats}>
          <div className={styles.headlineStat}>
            <dt>Mean absolute error</dt>
            <dd>{formatKwh(best?.mae ?? 0, 4)} kWh</dd>
          </div>
          <div className={styles.headlineStat}>
            <dt>RMSE improvement</dt>
            <dd>
              {data.improvement_over_baseline
                ? `${data.improvement_over_baseline.rmse_reduction_percent}%`
                : '—'}
            </dd>
          </div>
          <div className={styles.headlineStat}>
            <dt>MAE improvement</dt>
            <dd>
              {data.improvement_over_baseline
                ? `${data.improvement_over_baseline.mae_reduction_percent}%`
                : '—'}
            </dd>
          </div>
          <div className={styles.headlineStat}>
            <dt>Split</dt>
            <dd>80 / 20 chronological</dd>
          </div>
        </dl>
      </section>

      <div className={layout.splitRail}>
        <Panel
          eyebrow="Head to head"
          title="Error by model"
          description="Lower is better. The baseline simply repeats the previous hour and involves no learning at all."
        >
          <table className={styles.table}>
            <caption className="visually-hidden">
              Mean absolute error and root mean squared error for each model
            </caption>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">MAE (kWh)</th>
                <th scope="col">RMSE (kWh)</th>
                <th scope="col" className={styles.barColumn}>
                  <span className="visually-hidden">Relative error</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.models.map((entry) => {
                const isBest = entry.model === data.best_model
                const isBaseline = entry.model.toLowerCase().includes('baseline')
                const width = maxRmse > 0 ? ((entry.rmse ?? 0) / maxRmse) * 100 : 0

                return (
                  <tr key={entry.model} className={isBest ? styles.bestRow : ''}>
                    <th scope="row" className={styles.modelCell}>
                      <span className={styles.modelName}>{entry.model}</span>
                      {isBest && <span className={styles.bestTag}>Best</span>}
                      {isBaseline && (
                        <span className={styles.baselineTag}>Reference</span>
                      )}
                    </th>
                    <td className={styles.numeric}>
                      {entry.mae === null ? '—' : formatKwh(entry.mae, 4)}
                    </td>
                    <td className={styles.numeric}>
                      {entry.rmse === null ? '—' : formatKwh(entry.rmse, 4)}
                    </td>
                    <td className={styles.barColumn}>
                      <span className={styles.barTrack}>
                        <span
                          className={[
                            styles.barFill,
                            isBest ? styles.barBest : '',
                            isBaseline ? styles.barBaseline : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{ width: `${Math.max(width, 2)}%` }}
                        />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <p className={styles.tableNote}>
            Both learned models beat the persistence baseline on the same
            held-out window, so the gain is a property of the model rather
            than of the split.
          </p>
        </Panel>

        <div className={layout.stackTight}>
          <Panel
            eyebrow="Evaluation window"
            title="Where the numbers come from"
            description="A chronological split, so no future reading ever informs a past prediction."
          >
            <dl className={styles.facts}>
              <div>
                <dt>Training records</dt>
                <dd>{formatCount(data.evaluation.training_records)}</dd>
              </div>
              <div>
                <dt>Testing records</dt>
                <dd>{formatCount(data.evaluation.testing_records)}</dd>
              </div>
              <div>
                <dt>Training period</dt>
                <dd>
                  {formatDate(data.evaluation.training_period.start)} —{' '}
                  {formatDate(data.evaluation.training_period.end)}
                </dd>
              </div>
              <div>
                <dt>Testing period</dt>
                <dd>
                  {formatDate(data.evaluation.testing_period.start)} —{' '}
                  {formatDate(data.evaluation.testing_period.end)}
                </dd>
              </div>
              <div>
                <dt>Features used</dt>
                <dd>{features.length}</dd>
              </div>
              <div>
                <dt>Split</dt>
                <dd>{data.evaluation.split_ratio}</dd>
              </div>
            </dl>
          </Panel>

          <Panel eyebrow="Definitions" title="Reading the metrics">
            <dl className={styles.definitions}>
              {Object.entries(data.metric_definitions).map(([term, definition]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{definition}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      <Panel
        eyebrow="What the models use"
        title="Feature importance"
        description="Read directly from the trained artifacts. The previous hour dominates in both models, which is what a persistence-friendly household signal looks like."
      >
        {series.length > 0 ? (
          <FeatureBars features={features} series={series} />
        ) : (
          <StateBlock
            variant="empty"
            title="No feature importances available"
            description="The saved artifacts did not expose importances."
          />
        )}
      </Panel>
    </>
  )
}
