import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Panel } from '../components/ui/Panel'
import { StateBlock } from '../components/ui/StateBlock'
import { ForecastChart } from '../components/charts/ForecastChart'
import { api } from '../lib/api'
import {
  formatCount,
  formatDateTime,
  formatKwh,
  nextHourIso,
  parseTimestamp,
} from '../lib/format'
import { useAsync } from '../lib/hooks'
import { PAGES } from '../lib/navigation'
import type { ForecastResponse, PredictResponse } from '../lib/types'
import layout from './layout.module.css'
import styles from './PredictionPage.module.css'
import control from '../components/ui/Control.module.css'

const MODELS = ['XGBoost', 'Random Forest']
const HORIZONS = [24, 48, 72]

type FormState = {
  timestamp: string
  lag1: string
  lag24: string
  lag168: string
  model: string
}

export function PredictionPage() {
  const meta = PAGES.prediction

  const [form, setForm] = useState<FormState>({
    timestamp: '',
    lag1: '',
    lag24: '',
    lag168: '',
    model: 'XGBoost',
  })
  const [prefilled, setPrefilled] = useState(false)

  const [result, setResult] = useState<PredictResponse | null>(null)
  const [predicting, setPredicting] = useState(false)
  const [predictError, setPredictError] = useState<string | null>(null)

  const [horizon, setHorizon] = useState(24)
  const [forecastModel, setForecastModel] = useState('XGBoost')
  const [forecast, setForecast] = useState<ForecastResponse | null>(null)
  const [forecastError, setForecastError] = useState<string | null>(null)

  // 200 hours is enough to source the 1-hour, 24-hour and 168-hour lags that
  // sit before the final observation.
  const history = useAsync(() => api.history({ limit: 200 }), [])
  const overview = useAsync(() => api.overview(), [])
  const comparison = useAsync(() => api.modelComparison(), [])

  /** The verified test-set RMSE for the model currently selected. */
  const selectedRmse = useMemo(() => {
    const models = comparison.data?.models ?? []
    const match = models.find((entry) => entry.model === form.model)
    return match?.rmse ?? null
  }, [comparison.data, form.model])

  /*
   * Populate the lag inputs from the measured record. The model was trained
   * on exactly these three lags, so feeding it the household's real recent
   * values is far more meaningful than arbitrary numbers.
   */
  useEffect(() => {
    if (prefilled || !history.data || history.data.length < 169) return

    const points = history.data
    const last = points[points.length - 1]
    const target = new Date(parseTimestamp(last.timestamp))
    target.setHours(target.getHours() + 1)

    setForm((current) => ({
      ...current,
      timestamp: nextHourIso(last.timestamp),
      lag1: last.energy_kwh.toFixed(3),
      lag24: points[points.length - 1 - 24].energy_kwh.toFixed(3),
      lag168: points[points.length - 1 - 168].energy_kwh.toFixed(3),
    }))
    setPrefilled(true)
  }, [history.data, prefilled])

  const chartHistory = useMemo(
    () =>
      (history.data ?? []).map((point) => ({
        timestamp: point.timestamp,
        value: point.energy_kwh,
      })),
    [history.data],
  )

  const runPrediction = async () => {
    setPredicting(true)
    setPredictError(null)
    setResult(null)

    try {
      const response = await api.predict({
        timestamp: form.timestamp,
        lag_1: Number(form.lag1),
        lag_24: Number(form.lag24),
        lag_168: Number(form.lag168),
        model: form.model,
      })
      setResult(response)
    } catch (cause) {
      setPredictError(
        cause instanceof Error ? cause.message : 'The prediction request failed.',
      )
    } finally {
      setPredicting(false)
    }
  }

  const runForecast = async () => {
    if (!overview.data) return

    setForecastError(null)
    setForecast(null)

    try {
      const response = await api.forecast({
        start_timestamp: nextHourIso(overview.data.end_date),
        horizon,
        model: forecastModel,
      })
      setForecast(response)
    } catch (cause) {
      setForecastError(
        cause instanceof Error ? cause.message : 'The forecast request failed.',
      )
    }
  }

  const ready = form.timestamp !== '' && form.lag1 !== '' && form.lag24 !== '' && form.lag168 !== ''

  return (
    <>
      <PageHeader
        folio={meta.folio}
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        meta={
          history.data ? (
            <Badge tone="outline">
              Lags pre-filled from the final {formatCount(history.data.length)} recorded hours
            </Badge>
          ) : undefined
        }
      />

      <div className={layout.split}>
        <Panel
          eyebrow="Single-step inference"
          title="Predict one hour ahead"
          description="The model consumes three historical lags. They are filled from the household's own measurements and can be edited."
        >
          {history.status === 'error' && (
            <StateBlock
              variant="error"
              title="Could not load the historical record"
              description={history.error ?? undefined}
            />
          )}

          {history.status === 'loading' && (
            <StateBlock variant="loading" title="Reading the final recorded hours…" />
          )}

          {history.status === 'success' && !prefilled && (
            <StateBlock
              variant="empty"
              title="Not enough history to pre-fill the lags"
              description="At least 169 recorded hours are needed to source a 168-hour lag."
            />
          )}

          <div className={styles.form}>
            <Field
              label="Target timestamp"
              hint="The hour you want to predict. Defaults to the hour after the last recorded reading."
            >
              {({ id }) => (
                <input
                  id={id}
                  className={control.input}
                  type="datetime-local"
                  value={form.timestamp.replace(' ', 'T').slice(0, 16)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      timestamp: `${event.target.value}:00`,
                    }))
                  }
                  required
                />
              )}
            </Field>

            <Field label="Model">
              {({ id }) => (
                <select
                  id={id}
                  className={control.select}
                  value={form.model}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, model: event.target.value }))
                  }
                >
                  {MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <div className={styles.divider}>
              <span>Historical consumption, in kWh</span>
            </div>

            <div className={styles.lagGrid}>
              <Field
                label="Previous hour"
                hint="The reading one hour before the target."
              >
                {({ id }) => (
                  <input
                    id={id}
                    className={control.input}
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.lag1}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, lag1: event.target.value }))
                    }
                    required
                  />
                )}
              </Field>

              <Field
                label="24 hours earlier"
                hint="The reading at the same hour, one day back."
              >
                {({ id }) => (
                  <input
                    id={id}
                    className={control.input}
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.lag24}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, lag24: event.target.value }))
                    }
                    required
                  />
                )}
              </Field>

              <Field
                label="168 hours earlier"
                hint="The reading at the same hour, one week back."
              >
                {({ id }) => (
                  <input
                    id={id}
                    className={control.input}
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.lag168}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, lag168: event.target.value }))
                    }
                    required
                  />
                )}
              </Field>
            </div>

            <Button
              onClick={() => void runPrediction()}
              disabled={!ready || predicting}
              icon="↗"
            >
              {predicting ? 'Calculating…' : 'Generate prediction'}
            </Button>

            {predictError && (
              <StateBlock
                variant="error"
                title="The prediction could not be produced"
                description={predictError}
              />
            )}
          </div>
        </Panel>

        <section className={styles.resultPanel}>
          <p className={styles.resultEyebrow}>Model output</p>
          <h2 className={styles.resultTitle}>Predicted consumption</h2>

          {result ? (
            <>
              <p className={styles.resultValue}>
                {result.predicted_kwh.toFixed(3)}
                <span className={styles.resultUnit}>kWh</span>
              </p>

              <dl className={styles.resultFacts}>
                <div>
                  <dt>Model</dt>
                  <dd>{result.model}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{formatDateTime(result.timestamp)}</dd>
                </div>
              </dl>

              <p className={styles.resultNote}>{result.note}</p>
            </>
          ) : (
            <div className={styles.resultEmpty}>
              <p>
                {predicting
                  ? 'Running the model against the supplied lags…'
                  : 'The prediction will appear here once the model has run.'}
              </p>
            </div>
          )}

          <div className={styles.limits}>
            <p className={styles.limitsTitle}>What this does not tell you</p>
            <ul>
              <li>
                One prediction, not a forecast. A multi-day view comes from the
                recursive run below.
              </li>
              <li>
                The model saw three lags and nothing else. It has no view of
                weather, occupancy or tariffs.
              </li>
              <li>
                Accuracy is measured on the household&apos;s own history, at
                roughly{' '}
                {selectedRmse === null
                  ? 'the verified test-set error for this model'
                  : `${formatKwh(selectedRmse, 4)} kWh RMSE`}
                .
              </li>
            </ul>
          </div>
        </section>
      </div>

      <Panel
        eyebrow="Recursive forecast"
        title="Extending forward from the last observation"
        description="Each step consumes the previous step's prediction, so the forecast starts from measurement and becomes model-generated from the first hour onward."
        action={
          <div className={styles.forecastControls}>
            <div className={styles.segmented} role="group" aria-label="Forecast horizon">
              {HORIZONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={[
                    styles.segment,
                    option === horizon ? styles.segmentActive : '',
                  ].join(' ')}
                  aria-pressed={option === horizon}
                  onClick={() => setHorizon(option)}
                >
                  {option}h
                </button>
              ))}
            </div>

            <select
              className={control.select}
              value={forecastModel}
              onChange={(event) => setForecastModel(event.target.value)}
              aria-label="Forecast model"
            >
              {MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runForecast()}
              disabled={!overview.data}
              icon="↗"
            >
              Run forecast
            </Button>
          </div>
        }
      >
        {forecastError && (
          <StateBlock
            variant="error"
            title="The forecast could not be produced"
            description={forecastError}
          />
        )}

        {forecast && (
          <>
            <ForecastChart
              observed={chartHistory.slice(-72)}
              forecast={forecast.forecast.map((point) => ({
                timestamp: point.timestamp,
                value: point.predicted_kwh,
              }))}
              height={375}
            />

            <div className={styles.forecastFooter}>
              <ul className={styles.legend}>
                <li>
                  <span className={[styles.legendSwatch, styles.legendObserved].join(' ')} />
                  Observed readings
                </li>
                <li>
                  <span className={[styles.legendSwatch, styles.legendForecast].join(' ')} />
                  Model forecast
                </li>
              </ul>

              <dl className={styles.forecastStats}>
                <div>
                  <dt>Horizon</dt>
                  <dd>{forecast.horizon_hours} hours</dd>
                </div>
                <div>
                  <dt>Mean forecast</dt>
                  <dd>
                    {formatKwh(
                      forecast.forecast.reduce((sum, point) => sum + point.predicted_kwh, 0) /
                        Math.max(forecast.forecast.length, 1),
                      3,
                    )}{' '}
                    kWh
                  </dd>
                </div>
                <div>
                  <dt>Total forecast</dt>
                  <dd>
                    {formatKwh(
                      forecast.forecast.reduce((sum, point) => sum + point.predicted_kwh, 0),
                      2,
                    )}{' '}
                    kWh
                  </dd>
                </div>
              </dl>
            </div>

            <p className={styles.forecastNote}>{forecast.note}</p>
          </>
        )}

        {!forecast && !forecastError && (
          <StateBlock
            variant="empty"
            title="No forecast has been run yet"
            description="Choose a horizon and run the forecast to see it plotted against the measured record."
          />
        )}
      </Panel>
    </>
  )
}
