from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

from models.train_model import create_features, load_hourly_data


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"

FEATURE_COLUMNS = [
    "hour",
    "day_of_week",
    "month",
    "lag_1",
    "lag_24",
    "lag_168",
]


def calculate_metrics(actual, predicted):
    """Calculate MAE and RMSE."""
    mae = mean_absolute_error(actual, predicted)
    rmse = mean_squared_error(actual, predicted) ** 0.5

    return mae, rmse


if __name__ == "__main__":
    hourly_data = load_hourly_data()
    data = create_features(hourly_data)

    split_index = int(len(data) * 0.8)
    test = data.iloc[split_index:]

    actual = test["energy_kwh"]

    baseline_predictions = test["lag_1"]

    rf_bundle = joblib.load(
        ARTIFACTS_DIR / "random_forest.joblib"
    )
    rf_predictions = rf_bundle["model"].predict(
        test[FEATURE_COLUMNS]
    )

    xgb_bundle = joblib.load(
        ARTIFACTS_DIR / "xgboost_model.joblib"
    )
    xgb_predictions = xgb_bundle["model"].predict(
        test[FEATURE_COLUMNS]
    )

    results = []

    for model_name, predictions in [
        ("Previous-hour baseline", baseline_predictions),
        ("Random Forest", rf_predictions),
        ("XGBoost", xgb_predictions),
    ]:
        mae, rmse = calculate_metrics(actual, predictions)

        results.append(
            {
                "Model": model_name,
                "MAE (kWh)": round(mae, 4),
                "RMSE (kWh)": round(rmse, 4),
            }
        )

    results_df = pd.DataFrame(results)

    print("ENERGIZE — Model Comparison")
    print("-" * 55)
    print(results_df.to_string(index=False))

    # Display XGBoost feature importance.
    xgb_model = xgb_bundle["model"]

    importance_df = pd.DataFrame(
        {
            "Feature": FEATURE_COLUMNS,
            "Importance": xgb_model.feature_importances_,
        }
    ).sort_values("Importance", ascending=False)

    print("\nXGBoost Feature Importance")
    print("-" * 35)
    print(importance_df.to_string(index=False))

    output_path = ARTIFACTS_DIR / "model_comparison.csv"
    results_df.to_csv(output_path, index=False)

    print(f"\nSaved comparison results to: {output_path}")