
from pathlib import Path
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from functools import lru_cache
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


PROJECT_ROOT = Path(__file__).resolve().parent
DATA_PATH = PROJECT_ROOT / "data" / "hourly_energy.csv"
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"
COMPARISON_PATH = ARTIFACTS_DIR / "model_comparison.csv"

# Feature order used by both trained models.
FEATURE_COLUMNS = [
    "hour",
    "day_of_week",
    "month",
    "lag_1",
    "lag_24",
    "lag_168",
]

# Supported aggregation windows for the history endpoint.
HISTORY_BUCKETS = ("hour", "day", "week", "month")
_BUCKET_RULES = {"hour": "h", "day": "D", "week": "W-MON", "month": "ME"}

DAY_LABELS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]

app = FastAPI(
    title="ENERGIZE API",
    description="Energy consumption forecasting service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    # The dev server runs on 5173 and `vite preview` serves the production
    # build on 4173. Both are local development origins for the same app, so
    # both are allowed. No existing client is affected.
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def _load_energy_data_cached():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

    data = pd.read_csv(DATA_PATH, parse_dates=["timestamp"])
    return data.sort_values("timestamp").reset_index(drop=True)


def load_energy_data():
    """Return the prepared hourly dataset.

    The CSV is parsed once and cached in memory. Callers receive a copy so the
    cached frame can never be mutated. The returned content is identical to a
    fresh read of the file.
    """
    return _load_energy_data_cached().copy()


def load_model(filename):
    path = ARTIFACTS_DIR / filename

    if not path.exists():
        raise FileNotFoundError(f"Model not found: {path}")

    artifact = joblib.load(path)

    if isinstance(artifact, dict):
        return artifact["model"], artifact.get("feature_columns", [])
    return artifact, []


class PredictionRequest(BaseModel):
    timestamp: datetime
    lag_1: float = Field(ge=0)
    lag_24: float = Field(ge=0)
    lag_168: float = Field(ge=0)
    model: str = "XGBoost"

class ForecastRequest(BaseModel):
    start_timestamp: datetime
    horizon: int = Field(default=24, ge=1, le=168)
    model: str = "XGBoost"


class OptimizationRequest(BaseModel):
    start_timestamp: datetime
    horizon: int = Field(default=24, ge=1, le=168)
    model: str = "XGBoost"

    reduction_percentages: list[float] = Field(
        default=[5.0, 10.0, 15.0],
        min_length=1,
        max_length=10,
    )

    max_reduction_percent: float = Field(
        default=15.0,
        gt=0,
        le=30,
    )

    min_consumption_kwh: float = Field(
        default=0.1,
        ge=0,
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ENERGIZE API"}


@app.get("/api/overview")
def overview():
    try:
        data = load_energy_data()
        return {
            "records": int(len(data)),
            "average_consumption": round(float(data["energy_kwh"].mean()), 3),
            "minimum_consumption": round(float(data["energy_kwh"].min()), 3),
            "maximum_consumption": round(float(data["energy_kwh"].max()), 3),
            "start_date": str(data["timestamp"].min()),
            "end_date": str(data["timestamp"].max()),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/history")
def history(
    limit: int = 168,
    bucket: str = "hour",
    start: str | None = None,
    end: str | None = None,
):
    """Return historical hourly consumption.

    The default call (no optional arguments) is unchanged: the most recent
    `limit` hourly readings, one object per reading. The optional arguments
    add time-range selection and coarser aggregation on top of that.
    """
    if not 1 <= limit <= 1000:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000.")

    if bucket not in HISTORY_BUCKETS:
        raise HTTPException(
            status_code=400,
            detail=f"Bucket must be one of: {', '.join(HISTORY_BUCKETS)}.",
        )

    try:
        data = load_energy_data()

        # Optional explicit range, applied before the limit is taken.
        if start is not None or end is not None:
            try:
                lower = pd.Timestamp(start) if start is not None else None
                upper = pd.Timestamp(end) if end is not None else None
            except Exception as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid start or end timestamp: {exc}",
                ) from exc

            if lower is not None:
                data = data[data["timestamp"] >= lower]
            if upper is not None:
                data = data[data["timestamp"] <= upper]

        if bucket == "hour":
            # Unbucketed readings: the most recent `limit` of them.
            sample = data.tail(limit)
            return [
                {
                    "timestamp": row["timestamp"].isoformat(),
                    "energy_kwh": round(float(row["energy_kwh"]), 4),
                }
                for _, row in sample.iterrows()
            ]

        # Coarser buckets: total energy, mean hourly rate and observation count.
        grouped = (
            data.set_index("timestamp")["energy_kwh"]
            .resample(_BUCKET_RULES[bucket])
            .agg(["sum", "count", "mean"])
            .dropna()
            .tail(limit)
        )
        return [
            {
                "timestamp": index.isoformat(),
                "energy_kwh": round(float(row["sum"]), 4),
                "mean_kwh": round(float(row["mean"]), 4),
                "hours": int(row["count"]),
            }
            for index, row in grouped.iterrows()
        ]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/predict")
def predict(request: PredictionRequest):
    try:
        data = load_energy_data()
        available_models = {
            "XGBoost": "xgboost_model.joblib",
            "Random Forest": "random_forest.joblib",
        }

        if request.model not in available_models:
            raise HTTPException(
                status_code=400,
                detail="Choose XGBoost or Random Forest.",
            )

        model, saved_features = load_model(available_models[request.model])

        features = {
            "hour": request.timestamp.hour,
            "day_of_week": request.timestamp.weekday(),
            "month": request.timestamp.month,
            "lag_1": request.lag_1,
            "lag_24": request.lag_24,
            "lag_168": request.lag_168,
        }

        feature_columns = saved_features or [
            "hour", "day_of_week", "month",
            "lag_1", "lag_24", "lag_168",
        ]
        feature_frame = pd.DataFrame(
            [[features[column] for column in feature_columns]],
            columns=feature_columns,
        )

        prediction = float(model.predict(feature_frame)[0])

        return {
            "predicted_kwh": round(max(0.0, prediction), 4),
            "model": request.model,
            "timestamp": request.timestamp.isoformat(),
            "unit": "kWh",
            "note": (
                "Single-timestamp prediction using supplied historical lags. "
                "This is not a recursively generated multi-day forecast."
            ),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
  
@app.post("/api/forecast")
def forecast(request: ForecastRequest):
    try:
        available_models = {
            "XGBoost": "xgboost_model.joblib",
            "Random Forest": "random_forest.joblib",
        }

        if request.model not in available_models:
            raise HTTPException(
                status_code=400,
                detail="Choose XGBoost or Random Forest.",
            )

        data = load_energy_data()
        model, saved_features = load_model(
            available_models[request.model]
        )

        feature_columns = saved_features or [
            "hour",
            "day_of_week",
            "month",
            "lag_1",
            "lag_24",
            "lag_168",
        ]

        # Store observed and predicted hourly consumption.
        history = {
            row["timestamp"]: float(row["energy_kwh"])
            for _, row in data.iterrows()
        }

        latest_timestamp = data["timestamp"].max()
        start = pd.Timestamp(request.start_timestamp)

                # Forecasting must begin on the next hourly timestamp.
        if start.tzinfo is not None:
            start = start.tz_localize(None)

        expected_start = latest_timestamp + pd.Timedelta(hours=1)

        if start != expected_start:
            raise HTTPException(
                status_code=400,
                detail=(
                    "start_timestamp must be exactly one hour after "
                    f"the latest historical timestamp. "
                    f"Expected: {expected_start}"
                ),
            )

        # Seed the model with the latest observed energy values.
        last_value = float(data.iloc[-1]["energy_kwh"])
        last_24 = data["energy_kwh"].tail(24).tolist()
        last_168 = data["energy_kwh"].tail(168).tolist()

        if len(last_24) < 24 or len(last_168) < 168:
            raise HTTPException(
                status_code=500,
                detail="Not enough historical data to create a forecast.",
            )

        results = []
        current = start

        for _ in range(request.horizon):
            lag_1_timestamp = current - pd.Timedelta(hours=1)
            lag_24_timestamp = current - pd.Timedelta(hours=24)
            lag_168_timestamp = current - pd.Timedelta(hours=168)

            missing_lags = [
                timestamp.isoformat()
                for timestamp in (
                    lag_1_timestamp,
                    lag_24_timestamp,
                    lag_168_timestamp,
                )
                if timestamp not in history
            ]

            if missing_lags:
                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Missing historical or predicted values for "
                        f"required lag timestamps: {missing_lags}"
                    ),
                )

            lag_1 = history[lag_1_timestamp]
            lag_24 = history[lag_24_timestamp]
            lag_168 = history[lag_168_timestamp]

            features = {
                "hour": current.hour,
                "day_of_week": current.dayofweek,
                "month": current.month,
                "lag_1": lag_1,
                "lag_24": lag_24,
                "lag_168": lag_168,
            }

            feature_frame = pd.DataFrame(
                [[features[column] for column in feature_columns]],
                columns=feature_columns,
            )

            predicted = max(
                0.0, float(model.predict(feature_frame)[0])
            )

            history[current] = predicted
            last_value = predicted
            last_24.append(predicted)
            last_168.append(predicted)

            results.append({
                "timestamp": current.isoformat(),
                "predicted_kwh": round(predicted, 4),
            })

            current += pd.Timedelta(hours=1)

        return {
            "model": request.model,
            "start_timestamp": start.isoformat(),
            "horizon_hours": request.horizon,
            "forecast": results,
            "unit": "kWh",
            "note": (
                "Recursive hourly forecast. Predictions after the first "
                "step use earlier predictions as lag inputs, so uncertainty "
                "may accumulate over the forecast horizon."
            ),
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@app.post("/api/optimize")
def optimize(request: OptimizationRequest):
    try:
        # Validate the requested reduction scenarios.
        for percentage in request.reduction_percentages:
            if not 0 <= percentage <= 100:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Each reduction percentage must be "
                        "between 0 and 100."
                    ),
                )

        # Reuse the existing forecast endpoint logic.
        forecast_request = ForecastRequest(
            start_timestamp=request.start_timestamp,
            horizon=request.horizon,
            model=request.model,
        )
        forecast_result = forecast(forecast_request)
        baseline = forecast_result["forecast"]

        baseline_total = sum(
            point["predicted_kwh"] for point in baseline
        )

        
        scenarios = []

        for percentage in request.reduction_percentages:
            if percentage < 0 or percentage > 100:
                raise HTTPException(
                    status_code=400,
                    detail="Reduction percentages must be between 0 and 100.",
                )

            if percentage > request.max_reduction_percent:
                continue

            hourly_results = []
            feasible = True

            for point in baseline:
                baseline_kwh = float(point["predicted_kwh"])
                simulated_kwh = baseline_kwh * (1 - percentage / 100)

                if simulated_kwh < request.min_consumption_kwh:
                    feasible = False
                    break

                hourly_results.append({
                    "timestamp": point["timestamp"],
                    "baseline_kwh": round(baseline_kwh, 4),
                    "simulated_kwh": round(simulated_kwh, 4),
                    "estimated_savings_kwh": round(
                        baseline_kwh - simulated_kwh, 4
                    ),
                })

            if not feasible:
                continue

            simulated_total = sum(
                item["simulated_kwh"] for item in hourly_results
            )
            savings = baseline_total - simulated_total

            # Prefer meaningful savings while penalizing aggressive targets.
            conservativeness_score = 1 - (
                percentage / request.max_reduction_percent
            )
            savings_score = (
                savings / baseline_total if baseline_total > 0 else 0
            )
            score = 0.7 * savings_score + 0.3 * conservativeness_score

            scenarios.append({
                "reduction_percent": percentage,
                "baseline_total_kwh": round(baseline_total, 4),
                "simulated_total_kwh": round(simulated_total, 4),
                "estimated_savings_kwh": round(savings, 4),
                "score": round(score, 4),
                "hourly_results": hourly_results,
            })

        if not scenarios:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No feasible scenarios. Try a lower reduction target "
                    "or a lower minimum consumption floor."
                ),
            )

        scenarios.sort(key=lambda item: item["score"], reverse=True)
        recommended = scenarios[0]

        return {
            "model": request.model,
            "start_timestamp": forecast_result["start_timestamp"],
            "horizon_hours": request.horizon,
            "baseline_total_kwh": round(baseline_total, 4),
            "recommended_scenario": recommended["reduction_percent"],
            "recommendation_reason": (
                "Selected by balancing estimated energy savings "
                "against the conservativeness of the reduction target, "
                "subject to the configured limits."
            ),
            "scoring_weights": {
                "estimated_savings": 0.7,
                "conservativeness": 0.3,
            },
            "scenarios": scenarios,
            "note": (
                "Scenario scores are a user-defined decision heuristic, "
                "not a learned or empirically validated optimization model. "
                "Savings are hypothetical and are not guaranteed."
            ),
        }


    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ---------------------------------------------------------------------------
# Derived views over the prepared hourly dataset and the trained artifacts
# ---------------------------------------------------------------------------


def _read_comparison_table():
    """Read artifacts/model_comparison.csv into normalised records."""
    if not COMPARISON_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Model comparison file not found: {COMPARISON_PATH}",
        )

    frame = pd.read_csv(COMPARISON_PATH)

    def find_column(target):
        for column in frame.columns:
            normalised = str(column).strip().lower()
            if normalised == target or normalised.startswith(target + " "):
                return column
        return None

    model_column = find_column("model")
    mae_column = find_column("mae")
    rmse_column = find_column("rmse")

    if model_column is None or mae_column is None or rmse_column is None:
        raise HTTPException(
            status_code=500,
            detail="Model comparison file is missing Model, MAE or RMSE columns.",
        )

    records = []
    for _, row in frame.iterrows():
        try:
            mae = float(row[mae_column])
        except (TypeError, ValueError):
            mae = None
        try:
            rmse = float(row[rmse_column])
        except (TypeError, ValueError):
            rmse = None

        records.append(
            {
                "model": str(row[model_column]).strip(),
                "mae": mae,
                "rmse": rmse,
            }
        )

    return records


def _evaluation_window():
    """Reproduce the chronological 80/20 split used to train the models."""
    frame = load_energy_data().copy()
    frame["hour"] = frame["timestamp"].dt.hour
    frame["day_of_week"] = frame["timestamp"].dt.dayofweek
    frame["month"] = frame["timestamp"].dt.month
    frame["lag_1"] = frame["energy_kwh"].shift(1)
    frame["lag_24"] = frame["energy_kwh"].shift(24)
    frame["lag_168"] = frame["energy_kwh"].shift(168)
    frame = frame.dropna()

    split_index = int(len(frame) * 0.8)
    train = frame.iloc[:split_index]
    test = frame.iloc[split_index:]

    return {
        "feature_rows": int(len(frame)),
        "training_records": int(len(train)),
        "testing_records": int(len(test)),
        "split_ratio": "80% train / 20% test, chronological (no shuffling)",
        "training_period": {
            "start": train["timestamp"].min().isoformat(),
            "end": train["timestamp"].max().isoformat(),
        },
        "testing_period": {
            "start": test["timestamp"].min().isoformat(),
            "end": test["timestamp"].max().isoformat(),
        },
    }


def _feature_importances(filename):
    """Read the trained model's feature importances from its artifact."""
    artifact = joblib.load(ARTIFACTS_DIR / filename)
    model = artifact["model"]
    columns = artifact.get("feature_columns", FEATURE_COLUMNS)
    values = getattr(model, "feature_importances_", None)

    if values is None:
        return []

    return [
        {
            "feature": column,
            "importance": round(float(value), 6),
        }
        for column, value in zip(columns, values)
    ]


@app.get("/api/model-comparison")
def model_comparison():
    """Verified evaluation metrics and feature importances for the trained models."""
    try:
        records = _read_comparison_table()

        importances = {}
        for label, filename in (
            ("XGBoost", "xgboost_model.joblib"),
            ("Random Forest", "random_forest.joblib"),
        ):
            if (ARTIFACTS_DIR / filename).exists():
                importances[label] = _feature_importances(filename)

        ranked = [
            record
            for record in records
            if record["rmse"] is not None
        ]
        best = min(ranked, key=lambda item: item["rmse"]) if ranked else None

        baseline = next(
            (
                record
                for record in records
                if "baseline" in record["model"].lower()
            ),
            None,
        )
        best_model = next(
            (record for record in records if record["model"].strip() == "XGBoost"),
            None,
        )

        improvement = None
        if (
            baseline
            and baseline["mae"] is not None
            and best_model
            and best_model["mae"] is not None
            and baseline["mae"] > 0
        ):
            improvement = {
                "mae_reduction_percent": round(
                    (baseline["mae"] - best_model["mae"]) / baseline["mae"] * 100,
                    2,
                ),
                "rmse_reduction_percent": round(
                    (baseline["rmse"] - best_model["rmse"]) / baseline["rmse"] * 100,
                    2,
                ),
            }

        return {
            "models": records,
            "best_model": best["model"] if best else None,
            "baseline_model": baseline["model"] if baseline else None,
            "improvement_over_baseline": improvement,
            "feature_importances": importances,
            "feature_columns": FEATURE_COLUMNS,
            "evaluation": _evaluation_window(),
            "metric_definitions": {
                "MAE": (
                    "Mean Absolute Error. The average size of the prediction "
                    "error in kWh, with every mistake counted equally."
                ),
                "RMSE": (
                    "Root Mean Squared Error. The square root of the mean of "
                    "squared errors, so unusually large misses are penalised "
                    "more heavily than MAE."
                ),
                "baseline": (
                    "The previous-hour persistence forecast: next hour is "
                    "predicted to equal the hour that came before."
                ),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/profile")
def profile():
    """Average consumption for every hour of every weekday.

    This is the observed household shape: what a typical Monday at 07:00
    looks like, averaged across every Monday in the dataset.
    """
    try:
        data = load_energy_data().copy()
        data["dow"] = data["timestamp"].dt.dayofweek
        data["hour"] = data["timestamp"].dt.hour

        matrix = [[0.0] * 24 for _ in range(7)]
        counts = [[0] * 24 for _ in range(7)]
        for day in range(7):
            for hour in range(24):
                selection = data[
                    (data["dow"] == day) & (data["hour"] == hour)
                ]["energy_kwh"]
                matrix[day][hour] = (
                    round(float(selection.mean()), 6) if len(selection) else 0.0
                )
                counts[day][hour] = int(len(selection))

        hour_means = [
            round(
                float(
                    data[data["hour"] == hour]["energy_kwh"].mean()
                ),
                6,
            )
            for hour in range(24)
        ]
        weekday_means = [
            round(
                float(
                    data[data["dow"] == day]["energy_kwh"].mean()
                ),
                6,
            )
            for day in range(7)
        ]

        flat = [value for row in matrix for value in row]
        peak_index = int(np.argmax(flat))
        peak_day, peak_hour = divmod(peak_index, 24)

        return {
            "matrix": matrix,
            "counts": counts,
            "day_labels": DAY_LABELS,
            "hour_labels": [f"{hour:02d}" for hour in range(24)],
            "hour_means": hour_means,
            "weekday_means": weekday_means,
            "minimum": round(float(min(flat)), 6),
            "maximum": round(float(max(flat)), 6),
            "overall_mean": round(float(data["energy_kwh"].mean()), 6),
            "peak": {
                "day": DAY_LABELS[peak_day],
                "hour": peak_hour,
                "value_kwh": round(float(flat[peak_index]), 6),
            },
            "records": int(len(data)),
            "period": {
                "start": data["timestamp"].min().isoformat(),
                "end": data["timestamp"].max().isoformat(),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _seasonal_baseline(frame, window_days):
    """Centered rolling median and MAD for each hour of day.

    Comparing a reading with the household's typical consumption for the same
    hour of day removes the strong daily seasonality in the measurements. A
    centered window is used so the baseline reflects the local regime instead
    of a trailing average that lags a change in routine.
    """
    location = np.full(len(frame), np.nan)
    scale = np.full(len(frame), np.nan)

    hours = frame["timestamp"].dt.hour.to_numpy()
    values = frame["energy_kwh"].to_numpy()

    minimum_periods = max(6, window_days // 3)

    for hour in range(24):
        mask = hours == hour
        series = pd.Series(values[mask])
        if len(series) < minimum_periods:
            continue

        median = series.rolling(
            window_days,
            min_periods=minimum_periods,
            center=True,
        ).median()
        deviation = (series - median).abs()
        mad = deviation.rolling(
            window_days,
            min_periods=minimum_periods,
            center=True,
        ).median()

        location[mask] = median.to_numpy()
        scale[mask] = mad.to_numpy()

    return location, scale


@app.get("/api/anomalies")
def anomalies(
    hours: int = 1440,
    window: int = 45,
    threshold: float = 3.5,
    limit: int = 60,
):
    """Detect readings that are unusual for their hour of day.

    Every reading is scored against a seasonal baseline using a modified
    z-score built from the median absolute deviation, which resists the
    influence of the extreme values it is meant to detect.
    """
    if not 6 <= hours <= 8760:
        raise HTTPException(
            status_code=400,
            detail="Hours must be between 6 and 8760.",
        )
    if not 7 <= window <= 365:
        raise HTTPException(
            status_code=400,
            detail="Window must be between 7 and 365 days.",
        )
    if threshold <= 0:
        raise HTTPException(
            status_code=400,
            detail="Threshold must be greater than zero.",
        )
    if not 1 <= limit <= 500:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 500.",
        )

    try:
        data = load_energy_data().copy()
        location, scale = _seasonal_baseline(data, window)

        values = data["energy_kwh"].to_numpy()
        timestamps = data["timestamp"].to_numpy()

        # Guard the scale against collapsing in very stable windows.
        floor = np.maximum(0.10 * np.abs(np.nan_to_num(location)), 0.05)
        usable_scale = np.maximum(np.nan_to_num(scale), floor)

        with np.errstate(invalid="ignore", divide="ignore"):
            scores = 0.6745 * (values - location) / usable_scale
        scores = np.where(np.isfinite(scores), scores, 0.0)

        evaluation = np.arange(len(data))[-hours:]

        series = []
        detected = []
        for index in evaluation:
            baseline = location[index]
            score = float(scores[index])
            value = float(values[index])

            if not np.isfinite(baseline):
                continue

            series.append(
                {
                    "timestamp": pd.Timestamp(timestamps[index]).isoformat(),
                    "value_kwh": round(value, 4),
                    "baseline_kwh": round(float(baseline), 4),
                    "score": round(score, 4),
                }
            )

            if abs(score) >= threshold:
                rounded_value = round(value, 4)
                rounded_baseline = round(float(baseline), 4)
                detected.append(
                    {
                        "timestamp": pd.Timestamp(timestamps[index]).isoformat(),
                        "value_kwh": rounded_value,
                        "baseline_kwh": rounded_baseline,
                        "deviation_kwh": round(
                            rounded_value - rounded_baseline, 4
                        ),
                        "score": round(score, 4),
                        "direction": "above" if score > 0 else "below",
                        "severity": (
                            "high"
                            if abs(score) >= threshold * 1.6
                            else "elevated"
                        ),
                    }
                )

        detected.sort(key=lambda item: abs(item["score"]), reverse=True)
        top = detected[:limit]

        return {
            "method": (
                "Modified z-score (median absolute deviation) against a "
                "centered seasonal baseline built from the same hour of day."
            ),
            "parameters": {
                "evaluation_hours": hours,
                "seasonal_window_days": window,
                "threshold": threshold,
                "returned": limit,
            },
            "series": series,
            "anomalies": top,
            "summary": {
                "evaluated": len(series),
                "anomaly_count": len(detected),
                "anomaly_rate_percent": (
                    round(len(detected) / len(series) * 100, 2)
                    if series
                    else 0.0
                ),
                "peak_score": (
                    round(max(abs(item["score"]) for item in detected), 4)
                    if detected
                    else 0.0
                ),
                "peak_value_kwh": (
                    round(max(item["value_kwh"] for item in detected), 4)
                    if detected
                    else 0.0
                ),
            },
            "caveat": (
                "A reading is unusual for its hour of day, which often simply "
                "means the household was active at that time. These are "
                "potential anomalies, not confirmed energy waste and not an "
                "appliance-level diagnosis."
            ),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
