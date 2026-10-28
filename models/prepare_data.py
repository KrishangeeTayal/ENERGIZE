from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "household_power_consumption.txt"


def load_raw_data():
    """Load and prepare the original electricity dataset."""
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found at: {DATA_PATH}"
        )

    df = pd.read_csv(
        DATA_PATH,
        sep=";",
        na_values=["?"],
        low_memory=False,
    )

    measurement_columns = [
        "Global_active_power",
        "Global_reactive_power",
        "Voltage",
        "Global_intensity",
        "Sub_metering_1",
        "Sub_metering_2",
        "Sub_metering_3",
    ]

    for column in measurement_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    df["timestamp"] = pd.to_datetime(
        df["Date"] + " " + df["Time"],
        format="%d/%m/%Y %H:%M:%S",
        errors="coerce",
    )

    return df


def create_hourly_data(df):
    """Aggregate minute readings into hourly energy consumption."""
    df = df.copy()

    df = df.dropna(
        subset=["timestamp", "Global_active_power"]
    )

    df = df.set_index("timestamp").sort_index()

    # Each reading represents average power over one minute.
    # Convert kW to kWh for each one-minute interval.
    df["minute_energy_kwh"] = (
        df["Global_active_power"] / 60
    )

    hourly = df.resample("h").agg(
        energy_kwh=("minute_energy_kwh", "sum"),
        valid_minutes=("Global_active_power", "count"),
    )

    # Keep hours with at least 45 valid minute readings.
    hourly = hourly.loc[hourly["valid_minutes"] >= 45].copy()

    return hourly


if __name__ == "__main__":
    data = load_raw_data()
    hourly_data = create_hourly_data(data)

    output_path = PROJECT_ROOT / "data" / "hourly_energy.csv"
    hourly_data.to_csv(output_path)
    print(f"\nSaved hourly dataset to: {output_path}")

    print("ENERGIZE — Hourly Energy Dataset")
    print("-" * 40)
    print(f"Valid hourly records: {len(hourly_data):,}")
    print("\nFirst 5 hourly records:")
    print(hourly_data.head().to_string())
    print("\nHourly energy summary (kWh):")
    print(hourly_data["energy_kwh"].describe())
    print("\nValid minutes per hour:")
    print(hourly_data["valid_minutes"].describe())