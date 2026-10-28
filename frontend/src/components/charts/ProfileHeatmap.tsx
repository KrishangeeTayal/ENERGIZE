import { useMemo, useState } from 'react'
import { CHART, HEAT_HIGH, HEAT_LOW, HEAT_MID, mixColor } from './chartTheme'
import styles from './ProfileHeatmap.module.css'

type ProfileHeatmapProps = {
  matrix: number[][]
  counts: number[][]
  dayLabels: string[]
  hourLabels: string[]
  min: number
  max: number
}

const CELL_WIDTH = 37
const CELL_HEIGHT = 33
const GUTTER_LEFT = 81
const GUTTER_TOP = 26
const GUTTER_BOTTOM = 31

type Readout = {
  day: string
  hour: string
  value: number
  observations: number
}

export function ProfileHeatmap({
  matrix,
  counts,
  dayLabels,
  hourLabels,
  min,
  max,
}: ProfileHeatmapProps) {
  const [readout, setReadout] = useState<Readout | null>(null)

  const width = GUTTER_LEFT + 24 * CELL_WIDTH
  const height = GUTTER_TOP + matrix.length * CELL_HEIGHT + GUTTER_BOTTOM

  const cells = useMemo(() => {
    const range = max - min || 1
    const list: {
      key: string
      x: number
      y: number
      fill: string
      value: number
      observations: number
      day: string
      hour: string
      label: string
    }[] = []

    matrix.forEach((row, dayIndex) => {
      row.forEach((value, hourIndex) => {
        const ratio = (value - min) / range
        // Two-stop ramp with a mint midpoint.
        const fill =
          ratio < 0.5
            ? mixColor(HEAT_LOW, HEAT_MID, ratio * 2)
            : mixColor(HEAT_MID, HEAT_HIGH, (ratio - 0.5) * 2)

        list.push({
          key: `${dayIndex}-${hourIndex}`,
          x: GUTTER_LEFT + hourIndex * CELL_WIDTH,
          y: GUTTER_TOP + dayIndex * CELL_HEIGHT,
          fill,
          value,
          observations: counts[dayIndex]?.[hourIndex] ?? 0,
          day: dayLabels[dayIndex] ?? '',
          hour: hourLabels[hourIndex] ?? '',
          label: `${dayLabels[dayIndex]} ${hourLabels[hourIndex]}: ${value.toFixed(
            3,
          )} kWh average across ${counts[dayIndex]?.[hourIndex] ?? 0} readings`,
        })
      })
    })

    return list
  }, [matrix, counts, dayLabels, hourLabels, min, max])

  if (matrix.length === 0) {
    return <p className={styles.empty}>No profile data available.</p>
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.canvas}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={styles.svg}
          role="img"
          aria-label="Average hourly energy consumption for each weekday and hour"
        >
          {dayLabels.map((day, index) => (
            <text
              key={day}
              x={GUTTER_LEFT - 13}
              y={GUTTER_TOP + index * CELL_HEIGHT + CELL_HEIGHT / 2}
              textAnchor="end"
              dominantBaseline="central"
              className={styles.dayLabel}
            >
              {day.slice(0, 3)}
            </text>
          ))}

          {hourLabels.map((hour, index) =>
            index % 3 === 0 ? (
              <text
                key={hour}
                x={GUTTER_LEFT + index * CELL_WIDTH + CELL_WIDTH / 2}
                y={GUTTER_TOP - 11}
                textAnchor="middle"
                className={styles.hourLabel}
              >
                {hour}
              </text>
            ) : null,
          )}

          {cells.map((cell) => (
            <rect
              key={cell.key}
              x={cell.x + 1.5}
              y={cell.y + 1.5}
              width={CELL_WIDTH - 3}
              height={CELL_HEIGHT - 3}
              rx={3}
              fill={cell.fill}
              tabIndex={0}
              role="img"
              aria-label={cell.label}
              className={styles.cell}
              onMouseEnter={() =>
                setReadout({
                  day: cell.day,
                  hour: cell.hour,
                  value: cell.value,
                  observations: cell.observations,
                })
              }
              onFocus={() =>
                setReadout({
                  day: cell.day,
                  hour: cell.hour,
                  value: cell.value,
                  observations: cell.observations,
                })
              }
            />
          ))}
        </svg>
      </div>

      <div className={styles.readout} aria-live="polite">
        {readout ? (
          <>
            <span className={styles.readoutKey}>
              {readout.day} · {readout.hour}:00
            </span>
            <span className={styles.readoutValue}>{readout.value.toFixed(3)} kWh</span>
            <span className={styles.readoutMeta}>
              average of {readout.observations.toLocaleString('en-US')} readings
            </span>
          </>
        ) : (
          <span className={styles.readoutHint}>
            Hover or focus a cell to read its average
          </span>
        )}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendLabel}>{min.toFixed(2)} kWh</span>
        <span className={styles.legendRamp} aria-hidden="true" />
        <span className={styles.legendLabel}>{max.toFixed(2)} kWh</span>
        <span className={styles.legendNote}>
          Average consumption per hour, from {CHART.emerald} observed readings
        </span>
      </div>
    </div>
  )
}
