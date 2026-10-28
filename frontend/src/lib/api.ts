/*
 * ENERGIZE — API client
 *
 * One typed entry point per backend route. Every failure surfaces as an
 * ApiError carrying the server's own message; nothing is ever silently
 * replaced with placeholder data.
 */

import type {
  AnomaliesResponse,
  ForecastResponse,
  HealthResponse,
  HistoryBucket,
  HistoryPoint,
  ModelComparisonResponse,
  OptimizationResponse,
  OverviewResponse,
  PredictResponse,
  ProfileResponse,
} from './types'

export const API_BASE = 'http://127.0.0.1:8000'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ValidationIssue = { loc?: unknown; msg?: unknown }

function readDetail(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object' || !('detail' in payload)) {
    return null
  }

  const detail = (payload as { detail: unknown }).detail

  if (typeof detail === 'string') {
    return detail
  }

  // FastAPI request-validation failures return a list of issue objects.
  if (Array.isArray(detail)) {
    const messages = detail
      .map((issue: ValidationIssue) => {
        const field = Array.isArray(issue.loc) ? issue.loc.slice(1).join('.') : ''
        const message = typeof issue.msg === 'string' ? issue.msg : 'Invalid value'
        return field ? `${field}: ${message}` : message
      })
      .filter(Boolean)
    if (messages.length) {
      return messages.join('; ')
    }
  }

  return null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(
      'Cannot reach the ENERGIZE API. Start the backend with "uvicorn api:app --port 8000".',
      0,
    )
  }

  const body = await response.text()
  let payload: unknown = null

  if (body) {
    try {
      payload = JSON.parse(body)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new ApiError(
      readDetail(payload) ?? `Request failed with status ${response.status}.`,
      response.status,
    )
  }

  return payload as T
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value))
    }
  }
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ''
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),

  overview: () => request<OverviewResponse>('/api/overview'),

  history: (options?: {
    limit?: number
    bucket?: HistoryBucket
    start?: string
    end?: string
  }) => {
    const params = {
      limit: options?.limit,
      bucket: options?.bucket,
      start: options?.start,
      end: options?.end,
    }
    return request<HistoryPoint[]>(`/api/history${query(params)}`)
  },

  modelComparison: () => request<ModelComparisonResponse>('/api/model-comparison'),

  profile: () => request<ProfileResponse>('/api/profile'),

  anomalies: (options?: {
    hours?: number
    window?: number
    threshold?: number
    limit?: number
  }) => {
    const params = {
      hours: options?.hours,
      window: options?.window,
      threshold: options?.threshold,
      limit: options?.limit,
    }
    return request<AnomaliesResponse>(`/api/anomalies${query(params)}`)
  },

  predict: (body: {
    timestamp: string
    lag_1: number
    lag_24: number
    lag_168: number
    model: string
  }) =>
    request<PredictResponse>('/api/predict', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  forecast: (body: { start_timestamp: string; horizon: number; model: string }) =>
    request<ForecastResponse>('/api/forecast', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  optimize: (body: {
    start_timestamp: string
    horizon: number
    model: string
    reduction_percentages: number[]
    max_reduction_percent?: number
    min_consumption_kwh?: number
  }) =>
    request<OptimizationResponse>('/api/optimize', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
