import styles from './FeatureBars.module.css'

export type FeatureSeries = {
  name: string
  tone: 'emerald' | 'amber' | 'sage'
  values: Record<string, number>
}

type FeatureBarsProps = {
  features: string[]
  series: FeatureSeries[]
  max?: number
}

function humanise(feature: string): string {
  return feature
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

/**
 * Feature importances read straight from the trained model artifacts. Each
 * bar is scaled against the largest importance in the set so the values
 * remain comparable across models.
 */
export function FeatureBars({ features, series, max }: FeatureBarsProps) {
  const highest =
    max ??
    series.reduce(
      (accumulator, entry) =>
        Math.max(
          accumulator,
          ...features.map((feature) => entry.values[feature] ?? 0),
        ),
      0,
    )

  const scale = highest || 1

  return (
    <div className={styles.wrap}>
      {features.map((feature) => (
        <div className={styles.row} key={feature}>
          <span className={styles.name} title={feature}>
            {humanise(feature)}
          </span>

          <div className={styles.bars}>
            {series.map((entry) => {
              const value = entry.values[feature] ?? 0
              const percent = (value / scale) * 100
              return (
                <div className={styles.barRow} key={entry.name}>
                  <div className={styles.track}>
                    <div
                      className={[styles.bar, styles[entry.tone]].join(' ')}
                      style={{ width: `${Math.max(percent, 0.8)}%` }}
                    />
                  </div>
                  <span className={styles.value}>{(value * 100).toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className={styles.legend}>
        {series.map((entry) => (
          <span className={styles.legendItem} key={entry.name}>
            <span className={[styles.legendSwatch, styles[entry.tone]].join(' ')} />
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  )
}
