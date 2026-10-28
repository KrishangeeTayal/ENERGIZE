/*
 * ENERGIZE — API response types
 *
 * These mirror the FastAPI contracts in api.py exactly. Field names are the
 * snake_case names the server sends; no renaming happens in the client.
 */

export type OverviewResponse = {
  records: number
  average_consumption: number
  minimum_consumption: number
  maximum_consumption: number
  start_date: string
  end_date: string
}

export type HistoryPoint = {
  timestamp: string
  energy_kwh: number
  /** Present only for aggregated buckets (day, week, month). */
  mean_kwh?: number
  /** Present only for aggregated buckets. */
  hours?: number
}

export type HistoryBucket = 'hour' | 'day' | 'week' | 'month'

export type ModelMetric = {
  model: string
  mae: number | null
  rmse: number | null
}

export type FeatureImportance = {
  feature: string
  importance: number
}

export type EvaluationWindow = {
  feature_rows: number
  training_records: number
  testing_records: number
  split_ratio: string
  training_period: { start: string; end: string }
  testing_period: { start: string; end: string }
}

export type ModelComparisonResponse = {
  models: ModelMetric[]
  best_model: string | null
  baseline_model: string | null
  improvement_over_baseline: {
    mae_reduction_percent: number
    rmse_reduction_percent: number
  } | null
  feature_importances: Record<string, FeatureImportance[]>
  feature_columns: string[]
  evaluation: EvaluationWindow
  metric_definitions: Record<string, string>
}

export type ProfileResponse = {
  matrix: number[][]
  counts: number[][]
  day_labels: string[]
  hour_labels: string[]
  hour_means: number[]
  weekday_means: number[]
  minimum: number
  maximum: number
  overall_mean: number
  peak: { day: string; hour: number; value_kwh: number }
  records: number
  period: { start: string; end: string }
}

export type AnomalySeriesPoint = {
  timestamp: string
  value_kwh: number
  baseline_kwh: number
  score: number
}

export type AnomalyPoint = {
  timestamp: string
  value_kwh: number
  baseline_kwh: number
  deviation_kwh: number
  score: number
  direction: 'above' | 'below'
  severity: 'high' | 'elevated'
}

export type AnomaliesResponse = {
  method: string
  parameters: {
    evaluation_hours: number
    seasonal_window_days: number
    threshold: number
    returned: number
  }
  series: AnomalySeriesPoint[]
  anomalies: AnomalyPoint[]
  summary: {
    evaluated: number
    anomaly_count: number
    anomaly_rate_percent: number
    peak_score: number
    peak_value_kwh: number
  }
  caveat: string
}

export type PredictResponse = {
  predicted_kwh: number
  model: string
  timestamp: string
  unit: string
  note: string
}

export type ForecastPoint = {
  timestamp: string
  predicted_kwh: number
}

export type ForecastResponse = {
  model: string
  start_timestamp: string
  horizon_hours: number
  forecast: ForecastPoint[]
  unit: string
  note: string
}

export type OptimizationHour = {
  timestamp: string
  baseline_kwh: number
  simulated_kwh: number
  estimated_savings_kwh: number
}

export type OptimizationScenario = {
  reduction_percent: number
  baseline_total_kwh: number
  simulated_total_kwh: number
  estimated_savings_kwh: number
  score: number
  hourly_results: OptimizationHour[]
}

export type OptimizationResponse = {
  model: string
  start_timestamp: string
  horizon_hours: number
  baseline_total_kwh: number
  recommended_scenario: number
  recommendation_reason: string
  scoring_weights: {
    estimated_savings: number
    conservativeness: number
  }
  scenarios: OptimizationScenario[]
  note: string
}

export type HealthResponse = {
  status: string
  service: string
}
