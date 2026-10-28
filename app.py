
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

# ---------------------------------------------------------
# ENERGIZE — Editorial Energy Intelligence
# ---------------------------------------------------------

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "hourly_energy.csv"
COMPARISON_PATH = ROOT / "artifacts" / "model_comparison.csv"

FOREST = "#213F32"
EMERALD = "#21865A"
MINT = "#E5F4EA"
CREAM = "#F7F9F6"
WHITE = "#FFFFFF"
INK = "#26352D"
MUTED = "#78847B"
BORDER = "#DDE6DC"
AMBER = "#D99A35"

st.set_page_config(
    page_title="ENERGIZE | Overview",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

    :root {
        --forest: #213F32;
        --emerald: #21865A;
        --mint: #E5F4EA;
        --cream: #F7F9F6;
        --ink: #26352D;
        --muted: #78847B;
        --border: #DDE6DC;
        --amber: #D99A35;
    }

    html, body, [class*="css"] {
        font-family: 'DM Sans', sans-serif;
        color: var(--ink);
        font-size: 18px;
    }

    .stApp { background: var(--cream); }

    [data-testid="stHeader"] {
        background: var(--cream);
    }

    [data-testid="stDecoration"] { display: none; }

    .block-container {
        max-width: 1900px;
        padding: 2.2rem 3rem 3rem;
    }

    [data-testid="stSidebar"] {
        background: #FFFFFF;
        border-right: 1px solid var(--border);
        min-width: 270px;
    }

    [data-testid="stSidebar"] > div:first-child {
        padding: 1.6rem 1rem;
    }

    .brand {
        padding: 0.3rem 0.5rem 1.8rem;
        border-bottom: 1px solid var(--border);
    }

    .brand-name {
        font-family: 'Manrope', sans-serif;
        font-weight: 800;
        font-size: 2rem;
        letter-spacing: -1.4px;
        color: var(--forest);
    }

    .brand-name span { color: var(--emerald); }

    .brand-tagline {
        margin-top: 0.45rem;
        color: var(--muted);
        font-size: 0.78rem;
        line-height: 1.6;
    }

    .nav-caption, .eyebrow {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 1.6px;
        text-transform: uppercase;
    }

    .nav-caption {
        color: #929D93;
        margin: 1.5rem 0 0.65rem 0.5rem;
    }

    [data-testid="stSidebar"] [data-testid="stRadio"] > label {
        display: none;
    }

    [data-testid="stSidebar"] div[role="radiogroup"] {
        gap: 0.3rem;
    }

    [data-testid="stSidebar"] div[role="radiogroup"] label {
        border-radius: 10px;
        padding: 0.55rem 0.65rem;
        border: 1px solid transparent;
        min-height: 43px;
    }

    [data-testid="stSidebar"] div[role="radiogroup"] label:has(input:checked) {
        background: var(--mint);
        border-color: #D3E8D8;
    }

    [data-testid="stSidebar"] div[role="radiogroup"] label p {
        font-size: 0.85rem;
        color: var(--ink);
    }

    [data-testid="stSidebar"] div[role="radiogroup"] label:has(input:checked) p {
        color: #176B46;
        font-weight: 700;
    }

    .sidebar-status {
        margin-top: 2rem;
        padding: 1.1rem 0.45rem;
        border-top: 1px solid var(--border);
        color: var(--muted);
        font-size: 0.76rem;
        line-height: 1.7;
    }

    .hero {
        position: relative;
        overflow: hidden;
        background: var(--forest);
        color: white;
        border-radius: 22px;
        padding: 2.2rem 2.4rem;
        min-height: 280px;
        margin-bottom: 1.5rem;
        box-shadow: 0 12px 35px rgba(33, 63, 50, 0.09);
    }

    .hero::after {
        content: "";
        position: absolute;
        width: 260px;
        height: 260px;
        right: -85px;
        top: -100px;
        border: 1px solid rgba(229,244,234,0.17);
        border-radius: 50%;
        box-shadow: 0 0 0 24px rgba(229,244,234,0.035),
                    0 0 0 52px rgba(229,244,234,0.025);
        pointer-events: none;
    }

    .hero .eyebrow { color: #B8D9BD; }

    .hero-title {
        font-family: 'Manrope', sans-serif;
        font-size: clamp(2.5rem, 4vw, 3.7rem);
        font-weight: 800;
        letter-spacing: -1.8px;
        line-height: 1.12;
        margin-top: 1rem;
    }

    .hero-title span { color: #D4EDC8; }

    .hero-copy {
        max-width: 640px;
        color: #D1DDD3;
        font-size: 0.9rem;
        line-height: 1.75;
        margin-top: 0.9rem;
    }

    .hero-mark {
        position: absolute;
        right: 2.5rem;
        bottom: 1.5rem;
        color: rgba(229,244,234,0.12);
        font-family: 'Manrope', sans-serif;
        font-weight: 800;
        font-size: 5rem;
        letter-spacing: -4px;
    }

    .section-header { margin: 1.8rem 0 1rem; }

    .eyebrow { color: var(--emerald); }

    .section-title {
        font-family: 'Manrope', sans-serif;
        color: var(--forest);
        font-size: 1.55rem;
        font-weight: 800;
        letter-spacing: -0.7px;
        margin-top: 0.25rem;
    }

    .section-copy {
        color: var(--muted);
        font-size: 0.84rem;
        line-height: 1.65;
        margin-top: 0.3rem;
    }

    .metric {
        background: white;
        border: 1px solid var(--border);
        border-radius: 15px;
        padding: 1.2rem 1.25rem;
        min-height: 145px;
        box-shadow: 0 4px 18px rgba(33,63,50,0.025);
    }

    .metric-label {
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.7px;
        text-transform: uppercase;
    }

    .metric-value {
        font-family: 'Manrope', sans-serif;
        color: var(--forest);
        font-size: clamp(1.4rem, 2vw, 1.9rem);
        font-weight: 800;
        letter-spacing: -0.9px;
        margin-top: 0.8rem;
        overflow-wrap: anywhere;
    }

    .metric-note {
        color: var(--muted);
        font-size: 0.74rem;
        margin-top: 0.45rem;
        line-height: 1.5;
    }

    .surface {
        background: white;
        border: 1px solid var(--border);
        border-radius: 17px;
        padding: 1.35rem 1.4rem;
        box-shadow: 0 4px 18px rgba(33,63,50,0.025);
    }

    .surface-title {
        font-family: 'Manrope', sans-serif;
        color: var(--forest);
        font-size: 1.05rem;
        font-weight: 800;
    }

    .surface-copy {
        color: var(--muted);
        font-size: 0.79rem;
        line-height: 1.65;
        margin-top: 0.35rem;
    }

    .period-date {
        font-family: 'Manrope', sans-serif;
        font-size: 1.1rem;
        color: var(--forest);
        font-weight: 800;
        margin-top: 0.9rem;
    }

    .status-pill {
        display: inline-block;
        margin-top: 0.9rem;
        padding: 0.4rem 0.7rem;
        border-radius: 99px;
        background: var(--mint);
        color: #176B46;
        font-size: 0.72rem;
        font-weight: 700;
    }

    [data-testid="stSelectbox"] label {
        font-size: 0.8rem;
        color: var(--forest);
        font-weight: 700;
    }

    [data-testid="stSelectbox"] div[data-baseweb="select"] > div {
        background: white;
        border-color: var(--border);
        border-radius: 10px;
        min-height: 42px;
    }

    .footer {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
        color: var(--muted);
        font-size: 0.72rem;
        line-height: 1.7;
    }

    @media (max-width: 1000px) {
        .block-container { padding: 1.2rem; }
        .hero { padding: 1.5rem; }
        .hero-mark { display: none; }
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def load_data():
    if not DATA_PATH.exists():
        return pd.DataFrame()
    data = pd.read_csv(DATA_PATH, parse_dates=["timestamp"])
    return data.sort_values("timestamp")


@st.cache_data
def load_comparison():
    if not COMPARISON_PATH.exists():
        return pd.DataFrame()
    return pd.read_csv(COMPARISON_PATH)


hourly = load_data()
comparison = load_comparison()


def find_metric(row, target):
    for column in comparison.columns:
        normalized = str(column).strip().lower()
        if normalized == target.lower() or normalized.startswith(target.lower() + " "):
            try:
                return float(row[column])
            except (TypeError, ValueError):
                continue
    return None


mae = None
rmse = None

if not comparison.empty:
    model_column = next(
        (c for c in comparison.columns if str(c).strip().lower() == "model"),
        None,
    )
    if model_column:
        matches = comparison[
            comparison[model_column].astype(str).str.contains("xgboost", case=False)
        ]
        if not matches.empty:
            row = matches.iloc[0]
            mae = find_metric(row, "mae")
            rmse = find_metric(row, "rmse")


pages = {
    "Overview": "⌂",
    "Energy Prediction": "↗",
    "Waste Investigator": "⌕",
    "Digital Twin": "◈",
    "Optimization Lab": "⚙",
    "Model Lab": "▥",
}

with st.sidebar:
    st.markdown(
        """
        <div class="brand">
            <div class="brand-name">ENER<span>GIZE</span></div>
            <div class="brand-tagline">
                Predict intelligently.<br>
                Optimize responsibly.
            </div>
        </div>
        <div class="nav-caption">WORKSPACE</div>
        """,
        unsafe_allow_html=True,
    )

    selected_page = st.radio(
        "Workspace navigation",
        list(pages),
        format_func=lambda page: f"{pages[page]}   {page}",
        label_visibility="collapsed",
        key="energize_redesign_navigation",
    )

    st.markdown(
        """
        <div class="sidebar-status">
            <strong style="color:#213F32">● Platform online</strong><br>
            Energy intelligence workspace<br>
            Local development build
        </div>
        """,
        unsafe_allow_html=True,
    )


# Main editorial hero
st.markdown(
    """
    <div class="hero">
        <div class="eyebrow">ENERGY INTELLIGENCE / HOUSEHOLD SYSTEMS</div>
        <div class="hero-title">Your energy,<br><span>understood.</span></div>
        <div class="hero-copy">
            A clearer view of household electricity consumption.
            Explore historical patterns, investigate peaks, and build
            a more informed approach to energy efficiency.
        </div>
        <div class="hero-mark">E/01</div>
    </div>
    """,
    unsafe_allow_html=True,
)


if selected_page == "Overview":
    st.markdown(
        """
        <div class="section-header">
            <div class="eyebrow">THE BIG PICTURE</div>
            <div class="section-title">A household energy portrait</div>
            <div class="section-copy">
                Historical measurements and model evaluation, presented in one place.
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    record_count = len(hourly)
    average_energy = (
        float(hourly["energy_kwh"].mean())
        if not hourly.empty and "energy_kwh" in hourly
        else None
    )
    peak_energy = (
        float(hourly["energy_kwh"].max())
        if not hourly.empty and "energy_kwh" in hourly
        else None
    )

    metrics = [
        ("01 / OBSERVATIONS", f"{record_count:,}" if record_count else "—",
         "Prepared hourly records"),
        ("02 / MEAN CONSUMPTION",
         f"{average_energy:.2f} kWh" if average_energy is not None else "—",
         "Per recorded hour"),
        ("03 / PEAK HOUR",
         f"{peak_energy:.2f} kWh" if peak_energy is not None else "—",
         "Highest recorded hourly use"),
        ("04 / XGBOOST MAE",
         f"{mae:.3f} kWh" if mae is not None else "—",
         "Mean absolute test error"),
    ]

    cols = st.columns(4, gap="medium")
    for col, (label, value, note) in zip(cols, metrics):
        with col:
            st.markdown(
                f"""
                <div class="metric">
                    <div class="metric-label">{label}</div>
                    <div class="metric-value">{value}</div>
                    <div class="metric-note">{note}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    st.markdown(
        """
        <div class="section-header">
            <div class="eyebrow">HISTORICAL SIGNAL</div>
            <div class="section-title">The rhythm of consumption</div>
            <div class="section-copy">
                Move through the recorded data to inspect daily changes in electricity use.
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    chart_col, side_col = st.columns([1.85, 1], gap="large")

    with chart_col:
        with st.container(border=True):
            days = st.selectbox(
                "Historical window",
                [1, 3, 7, 14],
                index=2,
                format_func=lambda value: f"Last {value} days",
                key="redesign_days",
            )

            if not hourly.empty and {"timestamp", "energy_kwh"}.issubset(hourly.columns):
                last_timestamp = hourly["timestamp"].max()
                first_timestamp = last_timestamp - pd.Timedelta(days=days)
                sample = hourly[hourly["timestamp"] >= first_timestamp].copy()

                if sample.empty:
                    st.info("No readings are available for this time window.")
                else:
                    fig = go.Figure()
                    fig.add_trace(
                        go.Scatter(
                            x=sample["timestamp"],
                            y=sample["energy_kwh"],
                            mode="lines",
                            name="Recorded consumption",
                            line=dict(color=EMERALD, width=2.3),
                            fill="tozeroy",
                            fillcolor="rgba(33,134,90,0.10)",
                            hovertemplate=(
                                "<b>Recorded consumption</b><br>"
                                "%{x|%d %b %Y, %H:%M}<br>"
                                "%{y:.2f} kWh<extra></extra>"
                            ),
                        )
                    )
                    fig.update_layout(
                        height=400,
                        margin=dict(l=8, r=12, t=18, b=8),
                        paper_bgcolor=WHITE,
                        plot_bgcolor=WHITE,
                        font=dict(family="DM Sans, sans-serif", size=12, color=FOREST),
                        showlegend=False,
                        hovermode="x unified",
                    )
                    fig.update_xaxes(
                        showgrid=False,
                        showline=True,
                        linecolor=BORDER,
                        tickfont=dict(color=MUTED),
                    )
                    fig.update_yaxes(
                        title="Energy (kWh)",
                        showgrid=True,
                        gridcolor="#E9EEE9",
                        zeroline=False,
                        rangemode="tozero",
                        tickfont=dict(color=MUTED),
                    )
                    st.plotly_chart(
                        fig,
                        width="stretch",
                        config={"displaylogo": False, "responsive": True},
                    )
                    st.caption(
                        f"{len(sample):,} hourly observations in the selected window. "
                        "This chart shows recorded history, not a future forecast."
                    )
            else:
                st.warning(
                    "Hourly data is unavailable. Check data/hourly_energy.csv "
                    "and confirm it contains timestamp and energy_kwh columns."
                )

    with side_col:
        st.markdown(
            """
            <div class="surface">
                <div class="eyebrow">DATASET RECORD</div>
                <div class="surface-title" style="margin-top:0.5rem">
                    Coverage at a glance
                </div>
                <div class="surface-copy">
                    The first and last timestamps available in the prepared dataset.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        if not hourly.empty and "timestamp" in hourly:
            start_date = hourly["timestamp"].min().strftime("%d %b %Y")
            end_date = hourly["timestamp"].max().strftime("%d %b %Y")
        else:
            start_date = end_date = "Unavailable"

        st.markdown(
            f"""
            <div class="surface" style="margin-top:0.8rem;background:#EAF0E8">
                <div class="eyebrow">FIRST OBSERVATION</div>
                <div class="period-date">{start_date}</div>
                <div class="eyebrow" style="margin-top:1.3rem">LAST OBSERVATION</div>
                <div class="period-date">{end_date}</div>
                <div class="status-pill">Historical data summary</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown(
            """
            <div class="surface" style="margin-top:0.8rem">
                <div class="eyebrow">MODEL EVALUATION</div>
                <div class="surface-title" style="margin-top:0.5rem">
                    XGBoost
                </div>
                <div class="surface-copy">
                    Test-set error metrics from the saved model comparison file.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        if mae is not None or rmse is not None:
            m1, m2 = st.columns(2)
            with m1:
                st.metric("MAE", f"{mae:.3f} kWh" if mae is not None else "—")
            with m2:
                st.metric("RMSE", f"{rmse:.3f} kWh" if rmse is not None else "—")
        else:
            st.info(
                "XGBoost evaluation metrics could not be read from "
                "artifacts/model_comparison.csv."
            )

    st.markdown(
        """
        <div class="footer">
            ENERGIZE · Predict intelligently. Optimize responsibly.<br>
            Historical household electricity dataset · Local development build
        </div>
        """,
        unsafe_allow_html=True,
    )

else:
    descriptions = {
        "Energy Prediction": "Forecast electricity demand using the saved, evaluated models.",
        "Waste Investigator": "Inspect unusually high recorded consumption and identify periods worth investigating.",
        "Digital Twin": "Explore the recorded household energy profile and its recurring patterns.",
        "Optimization Lab": "Compare hypothetical energy-saving scenarios with transparent assumptions.",
        "Model Lab": "Review the available model comparison metrics and evaluation results.",
    }

    st.markdown(
        f"""
        <div class="section-header">
            <div class="eyebrow">ENERGIZE WORKSPACE</div>
            <div class="section-title">{selected_page}</div>
            <div class="section-copy">{descriptions[selected_page]}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    
    if selected_page == "Energy Prediction":
        st.markdown("### Forecast your household consumption")
        st.write(
            "Explore estimated electricity consumption using your trained "
            "machine-learning models and historical usage patterns."
        )

        forecast_days = st.slider(
            "Forecast horizon (days)",
            min_value=1,
            max_value=7,
            value=1,
        )

        model_choice = st.selectbox(
            "Prediction model",
            ["XGBoost", "Random Forest"],
        )

        st.info(
            f"You selected a {forecast_days}-day forecast using {model_choice}. "
            "Next, we'll connect these controls to the saved model and generate "
            "actual predictions."
        )
    else:
        st.info(
            "This workspace is coming next. Its functionality will be "
            "implemented while preserving the ENERGIZE design."
        )

