from pathlib import Path

import joblib
import pandas as pd
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "hourly_energy.csv"
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"

FEATURE_COLUMNS = [
    "hour",
    "day_of_week",
    "month",
    "lag_1",
    "lag_24",
    "lag_168",
]


def load_hourly_data():
    """Load hourly energy consumption."""
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Hourly dataset not found: {DATA_PATH}"
        )

    df = pd.read_csv(DATA_PATH, parse_dates=["timestamp"])
    df = df.sort_values("timestamp").set_index("timestamp")

    return df


def create_features(df):
    """Create calendar and historical consumption features."""
    data = df.copy()

    data["hour"] = data.index.hour
    data["day_of_week"] = data.index.dayofweek
    data["month"] = data.index.month

    data["lag_1"] = data["energy_kwh"].shift(1)
    data["lag_24"] = data["energy_kwh"].shift(24)
    data["lag_168"] = data["energy_kwh"].shift(168)

    return data.dropna()


def evaluate_predictions(actual, predicted):
    """Calculate MAE and RMSE."""
    mae = mean_absolute_error(actual, predicted)
    rmse = mean_squared_error(actual, predicted) ** 0.5

    return mae, rmse


if __name__ == "__main__":
    hourly_data = load_hourly_data()
    data = create_features(hourly_data)

    # Use the same chronological split as the Random Forest model.
    split_index = int(len(data) * 0.8)
    train = data.iloc[:split_index]
    test = data.iloc[split_index:]

    X_train = train[FEATURE_COLUMNS]
    y_train = train["energy_kwh"]

    X_test = test[FEATURE_COLUMNS]
    y_test = test["energy_kwh"]

    model = XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    mae, rmse = evaluate_predictions(y_test, predictions)

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    model_path = ARTIFACTS_DIR / "xgboost_model.joblib"

    joblib.dump(
        {
            "model": model,
            "feature_columns": FEATURE_COLUMNS,
        },
        model_path,
    )

    print("ENERGIZE — XGBoost Forecast")
    print("-" * 40)
    print(f"Training records: {len(train):,}")
    print(f"Testing records: {len(test):,}")
    print(
        f"Test period: {test.index.min()} to {test.index.max()}"
    )
    print(f"MAE:  {mae:.4f} kWh")
    print(f"RMSE: {rmse:.4f} kWh")
    print(f"\nSaved XGBoost model to: {model_path}")