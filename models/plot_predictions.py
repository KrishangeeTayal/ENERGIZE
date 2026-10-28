
from pathlib import Path

import joblib
import pandas as pd
import plotly.graph_objects as go

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

FOREST = "#26352D"
EMERALD = "#21865A"
MINT = "rgba(33, 134, 90, 0.10)"
MUTED = "#758278"
GRID = "#E9EEE9"
BACKGROUND = "#FFFFFF"


if __name__ == "__main__":
    hourly_data = load_hourly_data()
    data = create_features(hourly_data)

    split_index = int(len(data) * 0.8)
    test = data.iloc[split_index:]

    bundle = joblib.load(ARTIFACTS_DIR / "xgboost_model.joblib")
    model = bundle["model"]

    predictions = model.predict(test[FEATURE_COLUMNS])

    results = pd.DataFrame(
        {
            "timestamp": test.index,
            "actual_kwh": test["energy_kwh"].to_numpy(),
            "predicted_kwh": predictions,
        }
    )

    start_time = results["timestamp"].min()
    end_time = start_time + pd.Timedelta(days=7)

    sample = results[
        (results["timestamp"] >= start_time)
        & (results["timestamp"] < end_time)
    ].copy()

    fig = go.Figure()

    # Actual consumption
    fig.add_trace(
        go.Scatter(
            x=sample["timestamp"],
            y=sample["actual_kwh"],
            name="Actual",
            mode="lines",
            line=dict(color=FOREST, width=2.2),
            hovertemplate=(
                "<b>Actual consumption</b><br>"
                "%{x|%d %b, %H:%M}<br>"
                "%{y:.2f} kWh"
                "<extra></extra>"
            ),
        )
    )

    # Model predictions
    fig.add_trace(
        go.Scatter(
            x=sample["timestamp"],
            y=sample["predicted_kwh"],
            name="XGBoost prediction",
            mode="lines",
            line=dict(color=EMERALD, width=2.2),
            fill="tozeroy",
            fillcolor=MINT,
            hovertemplate=(
                "<b>XGBoost prediction</b><br>"
                "%{x|%d %b, %H:%M}<br>"
                "%{y:.2f} kWh"
                "<extra></extra>"
            ),
        )
    )

    fig.update_layout(
        title=dict(
            text=(
                "<b>Actual vs predicted consumption</b>"
                "<br><span style='font-size:12px;color:#758278'>"
                "Hourly electricity usage · 7-day test window"
                "</span>"
            ),
            x=0,
            xanchor="left",
            y=0.97,
        ),
        template="plotly_white",
        paper_bgcolor=BACKGROUND,
        plot_bgcolor=BACKGROUND,
        font=dict(
            family="Arial, sans-serif",
            size=12,
            color=FOREST,
        ),
        height=520,
        margin=dict(l=20, r=24, t=105, b=45),
        hovermode="x unified",
        hoverlabel=dict(
            bgcolor="#FFFFFF",
            bordercolor=GRID,
            font=dict(color=FOREST, size=12),
        ),
        legend=dict(
            orientation="h",
            x=0,
            y=1.08,
            xanchor="left",
            yanchor="bottom",
            bgcolor="rgba(255,255,255,0)",
            font=dict(size=11, color=MUTED),
        ),
    )

    fig.update_xaxes(
        title_text=None,
        showgrid=False,
        showline=True,
        linecolor=GRID,
        tickfont=dict(size=11, color=MUTED),
        tickformat="%d %b",
        dtick=24 * 60 * 60 * 1000,
        ticks="outside",
        ticklen=5,
        tickcolor=GRID,
        automargin=True,
    )

    fig.update_yaxes(
        title_text="Energy consumption (kWh)",
        title_font=dict(size=11, color=MUTED),
        title_standoff=12,
        showgrid=True,
        gridcolor=GRID,
        gridwidth=1,
        zeroline=False,
        showline=False,
        tickfont=dict(size=11, color=MUTED),
        ticks="outside",
        ticklen=4,
        tickcolor=GRID,
        rangemode="tozero",
    )

    fig.show(config={"displaylogo": False, "responsive": True})

    print(f"Records plotted: {len(sample):,}")
    print(f"Period: {start_time} to {sample['timestamp'].max()}")
