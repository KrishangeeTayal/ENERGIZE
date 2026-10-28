import { useMemo, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Panel } from '../components/ui/Panel'
import { StateBlock } from '../components/ui/StateBlock'
import { ScenarioChart } from '../components/charts/ScenarioChart'
import { api } from '../lib/api'
import { formatCount, formatKwh, nextHourIso } from '../lib/format'
import { useAsync } from '../lib/hooks'
import { PAGES } from '../lib/navigation'
import type { OptimizationResponse } from '../lib/types'
import layout from './layout.module.css'
import styles from './OptimizationPage.module.css'
import control from '../components/ui/Control.module.css'

const MODELS = ['XGBoost', 'Random Forest']
const HORIZONS = [24, 48, 72]
const REDUCTIONS = [5, 10, 15, 20, 25]

export function OptimizationPage() {
  const meta = PAGES.optimization

  const [horizon, setHorizon] = useState(24)
  const [model, setModel] = useState('XGBoost')
  const [reductions, setReductions] = useState<number[]>([5, 10, 15, 20])
  const [maxReduction, setMaxReduction] = useState(20)
  const [floor, setFloor] = useState(0.1)

  const [result, setResult] = useState<OptimizationResponse | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overview = useAsync(() => api.overview(), [])

  const recommended = useMemo(() => {
    if (!result) return null
    return (
      result.scenarios.find(
        (scenario) => scenario.reduction_percent === result.recommended_scenario,
      ) ?? result.scenarios[0] ?? null
    )
  }, [result])

  const scenarioPoints = useMemo(
    () =>
      (recommended?.hourly_results ?? []).map((hour) => ({
        timestamp: hour.timestamp,
        baseline: hour.baseline_kwh,
        simulated: hour.simulated_kwh,
      })),
    [recommended],
  )

  const maxSavings = useMemo(
    () =>
      Math.max(
        ...(result?.scenarios ?? []).map((scenario) => scenario.estimated_savings_kwh),
        0,
      ),
    [result],
  )

  const toggleReduction = (value: number) => {
    setReductions((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value].sort((a, b) => a - b),
    )
  }

  const run = async () => {
    if (!overview.data) return

    setRunning(true)
    setError(null)
    setResult(null)

    try {
      const response = await api.optimize({
        start_timestamp: nextHourIso(overview.data.end_date),
        horizon,
        model,
        reduction_percentages: reductions,
        max_reduction_percent: maxReduction,
        min_consumption_kwh: floor,
      })
      setResult(response)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The optimisation request failed.',
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <PageHeader
        folio={meta.folio}
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        meta={
          result ? (
            <>
              <Badge tone="emerald" icon="●">
                Recommended: {result.recommended_scenario}% reduction
              </Badge>
              <Badge tone="outline">{result.horizon_hours}-hour horizon</Badge>
            </>
          ) : undefined
        }
      />

      <div className={layout.split}>
        <Panel
          eyebrow="Scenario inputs"
          title="What to test"
          description="The server forecasts the horizon, applies each reduction and checks it against the consumption floor before scoring it."
        >
          <div className={styles.form}>
            <div className={styles.pair}>
              <Field label="Model">
                {({ id }) => (
                  <select
                    id={id}
                    className={control.select}
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                  >
                    {MODELS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field label="Horizon">
                {({ id }) => (
                  <select
                    id={id}
                    className={control.select}
                    value={horizon}
                    onChange={(event) => setHorizon(Number(event.target.value))}
                  >
                    {HORIZONS.map((option) => (
                      <option key={option} value={option}>
                        {option} hours
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>

            <Field
              label="Reduction targets"
              hint="Targets above the maximum are discarded before scoring."
            >
              {() => (
                <div className={styles.chips}>
                  {REDUCTIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={[
                        styles.chip,
                        reductions.includes(value) ? styles.chipActive : '',
                      ].join(' ')}
                      aria-pressed={reductions.includes(value)}
                      onClick={() => toggleReduction(value)}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <div className={styles.pair}>
              <Field label="Maximum reduction" hint="Upper bound, in per cent.">
                {({ id }) => (
                  <input
                    id={id}
                    className={control.input}
                    type="number"
                    min="1"
                    max="30"
                    step="1"
                    value={maxReduction}
                    onChange={(event) =>
                      setMaxReduction(Number(event.target.value))
                    }
                  />
                )}
              </Field>

              <Field
                label="Consumption floor"
                hint="A scenario is rejected if any hour falls below this, in kWh."
              >
                {({ id }) => (
                  <input
                    id={id}
                    className={control.input}
                    type="number"
                    min="0"
                    step="0.05"
                    value={floor}
                    onChange={(event) => setFloor(Number(event.target.value))}
                  />
                )}
              </Field>
            </div>

            <Button
              onClick={() => void run()}
              disabled={running || reductions.length === 0 || !overview.data}
              icon="↗"
            >
              {running ? 'Scoring scenarios…' : 'Run scenarios'}
            </Button>

            {error && (
              <StateBlock
                variant="error"
                title="The scenarios could not be produced"
                description={error}
              />
            )}
          </div>
        </Panel>

        {result && recommended ? (
          <section className={styles.recommendation}>
            <p className={styles.recEyebrow}>Recommended scenario</p>
            <p className={styles.recValue}>
              {recommended.reduction_percent}
              <span className={styles.recUnit}>% reduction</span>
            </p>

            <dl className={styles.recFacts}>
              <div>
                <dt>Estimated saving</dt>
                <dd>{formatKwh(recommended.estimated_savings_kwh, 2)} kWh</dd>
              </div>
              <div>
                <dt>Baseline total</dt>
                <dd>{formatKwh(recommended.baseline_total_kwh, 2)} kWh</dd>
              </div>
              <div>
                <dt>Simulated total</dt>
                <dd>{formatKwh(recommended.simulated_total_kwh, 2)} kWh</dd>
              </div>
              <div>
                <dt>Scenario score</dt>
                <dd>{recommended.score.toFixed(4)}</dd>
              </div>
            </dl>

            <div className={styles.recReason}>
              <p className={styles.recReasonTitle}>Why this one</p>
              <p>{result.recommendation_reason}</p>
            </div>

            <div className={styles.recWeights}>
              <span>
                Savings weight {result.scoring_weights.estimated_savings}
              </span>
              <span>
                Conservativeness weight {result.scoring_weights.conservativeness}
              </span>
            </div>
          </section>
        ) : (
          <section className={styles.recommendation}>
            <p className={styles.recEyebrow}>Recommended scenario</p>
            <p className={styles.recEmpty}>
              {running
                ? 'Forecasting the horizon and scoring each reduction target…'
                : 'Run the scenarios to see which reduction the model recommends.'}
            </p>
          </section>
        )}
      </div>

      {result && (
        <>
          <Panel
            eyebrow="Hour by hour"
            title="Baseline against the recommended scenario"
            description="The baseline is the model's forecast for the horizon. The simulated line applies the recommended reduction at every hour."
          >
            <ScenarioChart points={scenarioPoints} height={330} />
          </Panel>

          <div className={layout.splitRail}>
            <Panel
              eyebrow="All feasible scenarios"
              title="Scenario comparison"
              description="Only scenarios that clear the consumption floor at every hour are scored."
            >
              <div className={styles.scenarioList}>
                {result.scenarios.map((scenario) => {
                  const isRecommended =
                    scenario.reduction_percent === result.recommended_scenario
                  const width =
                    maxSavings > 0
                      ? (scenario.estimated_savings_kwh / maxSavings) * 100
                      : 0

                  return (
                    <div
                      className={[
                        styles.scenario,
                        isRecommended ? styles.scenarioBest : '',
                      ].join(' ')}
                      key={scenario.reduction_percent}
                    >
                      <div className={styles.scenarioHead}>
                        <span className={styles.scenarioName}>
                          {scenario.reduction_percent}% reduction
                        </span>
                        {isRecommended && (
                          <span className={styles.scenarioTag}>Recommended</span>
                        )}
                        <span className={styles.scenarioScore}>
                          {formatKwh(scenario.estimated_savings_kwh, 2)} kWh saved
                        </span>
                      </div>

                      <span className={styles.scenarioTrack}>
                        <span
                          className={[
                            styles.scenarioFill,
                            isRecommended ? styles.scenarioFillBest : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{ width: `${Math.max(width, 2)}%` }}
                        />
                      </span>

                      <p className={styles.scenarioMeta}>
                        Baseline {formatKwh(scenario.baseline_total_kwh, 2)} kWh ·
                        simulated {formatKwh(scenario.simulated_total_kwh, 2)} kWh ·
                        score {scenario.score.toFixed(4)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Panel>

            <div className={layout.stackTight}>
              <Panel eyebrow="Feasibility" title="What limits a scenario">
                <dl className={styles.constraints}>
                  <div>
                    <dt>Consumption floor</dt>
                    <dd>{floor} kWh per hour</dd>
                  </div>
                  <div>
                    <dt>Maximum reduction</dt>
                    <dd>{maxReduction}%</dd>
                  </div>
                  <div>
                    <dt>Scored</dt>
                    <dd>
                      {formatCount(result.scenarios.length)} of{' '}
                      {formatCount(reductions.length)} requested
                    </dd>
                  </div>
                  <div>
                    <dt>Forecast horizon</dt>
                    <dd>{result.horizon_hours} hours</dd>
                  </div>
                </dl>
              </Panel>

              <Panel eyebrow="Read this carefully" title="What a saving is not">
                <p className={styles.disclaimer}>{result.note}</p>
                <ul className={styles.disclaimerList}>
                  <li>
                    The baseline is a model forecast, not a meter reading. A
                    saving estimated against a forecast inherits the
                    forecast&apos;s error.
                  </li>
                  <li>
                    A reduction applied uniformly to every hour is a
                    simplification. Real interventions affect specific
                    appliances at specific times.
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
