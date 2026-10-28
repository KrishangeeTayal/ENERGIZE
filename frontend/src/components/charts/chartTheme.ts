/*
 * ENERGIZE — chart theme
 *
 * Shared visual constants for every chart in the product, so axes, gridlines
 * and tooltips stay identical from page to page.
 */

export const CHART = {
  ink: '#16241c',
  ink2: '#33473b',
  ink3: '#55655b',
  ink4: '#627167',
  grid: '#e9eee9',
  axis: '#cdd9cf',
  emerald: '#21865a',
  emeraldInk: '#1a724b',
  mint: '#e5f4ea',
  amber: '#d99a35',
  amberInk: '#8a5e14',
  forest: '#213f32',
  surface: '#ffffff',
  onDark: '#f7f9f6',
} as const

export const AXIS_TICK = {
  fill: CHART.ink4,
  fontSize: 12,
  fontFamily: "'DM Sans', system-ui, sans-serif",
} as const

/**
 * Choose a readable axis format for the span the chart covers.
 */
export function pickTimeFormat(spanMs: number): 'time' | 'day' | 'month' {
  const day = 24 * 60 * 60 * 1000
  if (spanMs <= 2 * day) return 'time'
  if (spanMs <= 90 * day) return 'day'
  return 'month'
}

export function formatTick(value: string, format: 'time' | 'day' | 'month'): string {
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value

  if (format === 'time') {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  if (format === 'day') {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

/**
 * Interpolate a value between two colours in RGB space.
 * Used by the profile heatmap, which maps observed kWh onto a mint-to-forest
 * ramp.
 */
export function mixColor(
  from: [number, number, number],
  to: [number, number, number],
  ratio: number,
): string {
  const t = Math.max(0, Math.min(1, ratio))
  const channel = (a: number, b: number) => Math.round(a + (b - a) * t)
  const [r, g, b] = [
    channel(from[0], to[0]),
    channel(from[1], to[1]),
    channel(from[2], to[2]),
  ]
  return `rgb(${r}, ${g}, ${b})`
}

export const HEAT_LOW: [number, number, number] = [240, 247, 240]
export const HEAT_MID: [number, number, number] = [154, 216, 181]
export const HEAT_HIGH: [number, number, number] = [27, 94, 65]
