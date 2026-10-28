/*
 * ENERGIZE — formatting helpers
 *
 * Every number that reaches the screen passes through here, so units and
 * precision stay consistent across the product.
 */

/**
 * The backend emits timestamps in two shapes: "2020-01-01 00:00:00" from
 * str() and "2020-01-01T00:00:00" from isoformat(). Normalise before
 * handing the value to Date, which does not accept a space separator
 * consistently across engines.
 */
export function parseTimestamp(value: string): Date {
  const normalised = value.includes('T') ? value : value.replace(' ', 'T')
  return new Date(normalised)
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Format a timestamp as a local ISO string the backend accepts, for example
 * "2010-11-26T21:00:00".
 */
export function toLocalIso(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/**
 * The forecast and optimisation endpoints require a start timestamp exactly
 * one hour after the last historical reading. Given the end of the dataset,
 * this produces that exact value.
 */
export function nextHourIso(datasetEnd: string): string {
  const next = parseTimestamp(datasetEnd)
  next.setHours(next.getHours() + 1)
  return toLocalIso(next)
}

export function formatKwh(value: number, digits = 3): string {
  return value.toFixed(digits)
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

/** "14 Nov 2010" */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? parseTimestamp(value) : value
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "14 Nov 2010, 21:00" */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? parseTimestamp(value) : value
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "21:00" */
export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? parseTimestamp(value) : value
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** "14 Nov, 21:00" */
export function formatDateTimeShort(value: string | Date): string {
  const date = typeof value === 'string' ? parseTimestamp(value) : value
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "Nov 2010" */
export function formatMonth(value: string | Date): string {
  const date = typeof value === 'string' ? parseTimestamp(value) : value
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/** "01 — 07 Nov 2010" */
export function formatRange(start: string, end: string): string {
  const from = parseTimestamp(start)
  const to = parseTimestamp(end)

  if (from.getFullYear() === to.getFullYear()) {
    if (from.getMonth() === to.getMonth()) {
      return `${from.getDate()} — ${to.getDate()} ${to.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
    }
    return `${from.getDate()} ${from.toLocaleDateString('en-GB', { month: 'short' })} — ${to.getDate()} ${to.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
  }

  return `${formatDate(start)} — ${formatDate(end)}`
}

/** "1,234" with a thin separator, for record counts. */
export function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}
