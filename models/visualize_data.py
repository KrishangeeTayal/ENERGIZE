
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "hourly_energy.csv"

FOREST = "#26352D"
EMERALD = "#21865A"
MINT = "rgba(33, 134, 90, 0.10)"
MUTED = "#758278"
GRID = "#E9EEE9"


if __name__ == "__main__":
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Hourly dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH, parse_dates=["timestamp"])
    df = df.sort_values("timestamp").set_index("timestamp")

    # Display the first seven days of hourly consumption.
    start_time = df.index.min()
    end_time = start_time + pd.Timedelta(days=7)

    sample = df.loc[
        (df.index >= start_time) & (df.index < end_time)
    ].copy()

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=sample.index,
            y=sample["energy_kwh"],
            name="Energy consumption",
            mode="lines",
            line=dict(color=EMERALD, width=2.2),
            fill="tozeroy",
            fillcolor=MINT,
            hovertemplate=(
                "<b>Energy consumption</b><br>"
                "%{x|%d %b %Y, %H:%M}<br>"
                "%{y:.2f} kWh"
                "<extra></extra>"
            ),
        )
    )

    fig.update_layout(
        title=dict(
            text=(
                "<b>Household energy consumption</b>"
                "<br><span style='font-size:12px;color:#758278'>"
                "Hourly electricity usage · First 7 days of recorded data"
                "</span>"
            ),
            x=0,
            xanchor="left",
            y=0.97,
        ),
        template="plotly_white",
        paper_bgcolor="#FFFFFF",
        plot_bgcolor="#FFFFFF",
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
        showlegend=False,
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
    print(f"Period: {sample.index.min()} to {sample.index.max()}")
