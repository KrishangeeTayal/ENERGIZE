# ENERGIZE

**Predict intelligently. Optimize responsibly.**

An intelligent digital twin for energy conservation — combining energy forecasting,
consumption analysis, anomaly investigation and optimisation over the UCI *Household
Power Consumption* dataset.

The product is a React + TypeScript frontend served by a FastAPI backend that loads
two trained regression models and a prepared hourly dataset.

---

## Contents

- [What you need first](#what-you-need-first)
- [Step 1 — Extract and open in VS Code](#step-1--extract-and-open-in-vs-code)
- [Step 2 — Set up the Python backend](#step-2--set-up-the-python-backend)
- [Step 3 — Set up the frontend](#step-3--set-up-the-frontend)
- [Step 4 — Open the app](#step-4--open-the-app)
- [The six workspaces](#the-six-workspaces)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Data and models](#data-and-models)
- [Optional — the Streamlit companion app](#optional--the-streamlit-companion-app)
- [Useful commands](#useful-commands)
- [Troubleshooting](#troubleshooting)
- [A note on honesty in the numbers](#a-note-on-honesty-in-the-numbers)

---

## What you need first

| Tool | Version | Why |
|---|---|---|
| [Python](https://www.python.org/downloads/windows/) | **3.11 or newer** | The backend, pandas 3 and scikit-learn 1.9 all require 3.11+ |
| [Node.js](https://nodejs.org/en/download) | **20.19+ or 22.12+** | Vite 8 refuses to run on anything older |
| [VS Code](https://code.visualstudio.com/download) | Current | Editor and terminal |

> On the Python installer, tick **"Add python.exe to PATH"**. It is the single
> most common cause of the setup steps below failing.

---

## Step 1 — Extract and open in VS Code

1. Download the ZIP and extract it. You will get a folder called `energize`.
2. In VS Code: **File → Open Folder…** and select the `energize` folder (not the
   file inside it).
3. Open the integrated terminal with **Ctrl + `** (or **Terminal → New Terminal**).

You will now have a terminal in the `energize` folder.

---

## Step 2 — Set up the Python backend

Run these in the VS Code terminal, one at a time.

### 2a. Create a virtual environment

```powershell
py -3.11 -m venv .venv
```

If you have several Pythons installed, `py -0p` lists them so you can pick the
right one, for example `py -3.12 -m venv .venv`.

### 2b. Activate it

**PowerShell** (the default terminal):

```powershell
.\.venv\Scripts\Activate.ps1
```

**Command Prompt** instead:

```cmd
.venv\Scripts\activate.bat
```

> **PowerShell may refuse to activate.** If you see
> `running scripts is disabled on this system`, run this once per terminal
> session and then activate again:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```
> This only affects the current terminal window.

You should now see `(.venv)` at the start of the prompt.

### 2c. Install the dependencies

```powershell
pip install -r requirements.txt
```

This takes a minute or two — it downloads pandas, scikit-learn and XGBoost.

### 2d. Start the API

```powershell
uvicorn api:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
```

**Leave this terminal running.** The frontend needs the API.

Check it works — open <http://127.0.0.1:8000/api/health> in a browser. You should
see `{"status":"ok","service":"ENERGIZE API"}`. Interactive API docs live at
<http://127.0.0.1:8000/docs>.

---

## Step 3 — Set up the frontend

Open a **second** VS Code terminal (the split button in the terminal panel, or
**Ctrl+Shift+`**), so the backend keeps running in the first one.

```powershell
cd frontend
npm install
```

Then start the dev server:

```powershell
npm run dev
```

You should see:

```
  VITE v8.3.5  ready in 800 ms
  ➜  Local:   http://localhost:5173/
```

---

## Step 4 — Open the app

Go to **<http://localhost:5173>**.

The sidebar shows **API online** once the frontend reaches the backend. If it
says **API offline**, the backend on port 8000 is not running — go back to the
first terminal.

You now have two terminals running:

| Terminal | Command | URL |
|---|---|---|
| 1 | `uvicorn api:app --reload --port 8000` | <http://127.0.0.1:8000> |
| 2 | `npm run dev` (in `frontend/`) | <http://localhost:5173> |

Press **Ctrl + C** in either terminal to stop it.

---

## The six workspaces

| Page | What it does | Data behind it |
|---|---|---|
| **01 Overview** | Landing dashboard: the headline consumption figure, a real historical chart, and the signals worth acting on | `/api/overview`, `/api/history`, `/api/profile`, `/api/anomalies`, `/api/model-comparison` |
| **02 Energy Prediction** | Single-step prediction with the lag inputs pre-filled from the household's own record, plus a recursive 24/48/72-hour forecast chart | `POST /api/predict`, `POST /api/forecast` |
| **03 Waste Investigator** | Hourly consumption scored against the household's baseline for that same hour of day, with a ranked table of the strongest departures | `GET /api/anomalies` |
| **04 Digital Twin** | The observed shape of the household — a day × hour heatmap — with the forecast layered over the hour-of-day profile | `GET /api/profile`, `POST /api/forecast` |
| **05 Optimization Lab** | Hypothetical reduction scenarios computed on the server, with the recommended scenario, the hourly baseline-vs-simulated chart and the feasibility limits | `POST /api/optimize` |
| **06 Model Lab** | Verified error metrics, the evaluation window they were measured in, and the feature importances read from the trained artifacts | `GET /api/model-comparison` |

Navigation is a left rail and the URL is a hash route, so you can link directly
to a page — for example <http://localhost:5173/#/model-lab>.

---

## Project structure

```
energize/
├── api.py                      FastAPI backend — 9 endpoints
├── app.py                      Optional Streamlit companion app
├── requirements.txt            Python dependencies
├── README.md                   This file
│
├── data/
│   ├── household_power_consumption.txt   Original UCI dataset (read-only)
│   └── hourly_energy.csv                 Prepared hourly dataset (the app reads this)
│
├── artifacts/
│   ├── random_forest.joblib    Trained Random Forest regressor
│   ├── xgboost_model.joblib    Trained XGBoost regressor
│   └── model_comparison.csv    Verified test-set metrics
│
├── models/                     Training and preprocessing scripts
│   ├── prepare_data.py         Builds data/hourly_energy.csv from the raw file
│   ├── train_model.py          Trains and saves the Random Forest
│   ├── train_xgboost.py        Trains and saves the XGBoost model
│   ├── compare_models.py       Regenerates artifacts/model_comparison.csv
│   ├── plot_predictions.py     Plotly actual-vs-predicted chart
│   └── visualize_data.py       Plotly overview chart
│
└── frontend/
    ├── package.json            React 19 + Vite 8 + Recharts 3
    ├── package-lock.json       Exact dependency versions
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json           Solution file — references the two below
    ├── tsconfig.app.json       Type-checking for src/
    ├── tsconfig.node.json      Type-checking for vite.config.ts
    ├── .oxlintrc.json          Lint configuration
    └── src/
        ├── main.tsx            Entry point
        ├── App.tsx             Shell, routing, lazy-loaded pages
        ├── styles/             tokens.css, base.css, index.css
        ├── lib/                api.ts, types.ts, format.ts, hooks.ts, navigation.tsx
        ├── components/
        │   ├── layout/         AppShell, Sidebar, Topbar, PageHeader, icons
        │   ├── ui/             Panel, Metric, Button, Field, Badge, StateBlock, Sparkline
        │   └── charts/         ConsumptionChart, ForecastChart, BaselineChart,
        │                       ProfileChart, ProfileHeatmap, ScenarioChart, FeatureBars
        └── pages/              One module + one CSS module per workspace
```

---

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/overview` | Record count, mean / min / max, period covered |
| `GET` | `/api/history` | Historical consumption. Optional `limit`, `bucket` (`hour`/`day`/`week`/`month`), `start`, `end` |
| `GET` | `/api/model-comparison` | Verified metrics, feature importances, evaluation window |
| `GET` | `/api/profile` | Mean consumption for every hour of every weekday |
| `GET` | `/api/anomalies` | Anomaly scan. Optional `hours`, `window`, `threshold`, `limit` |
| `POST` | `/api/predict` | Single-timestamp prediction from supplied lags |
| `POST` | `/api/forecast` | Recursive hourly forecast (1–168 hours) |
| `POST` | `/api/optimize` | Reduction scenarios, feasibility filtering and a recommendation |

> **`/api/forecast` and `/api/optimize` are strict about the start time.** Both
> require `start_timestamp` to be exactly one hour after the last recorded
> reading (`2010-11-26T21:00:00` for the shipped dataset). The frontend reads
> this from `/api/overview` and sends it for you. If you call them by hand,
> use that exact value.

---

## Data and models

**Do not regenerate the dataset or retrain the models unless you intend to.**
The shipped files are the verified artifacts the interface was built against,
and their SHA-256 hashes are recorded in the project record.

| File | What it is |
|---|---|
| `data/household_power_consumption.txt` | The original UCI dataset — 2,075,259 minute-level readings from Dec 2006 to Nov 2010. It is 127 MB and is only needed if you want to re-run `models/prepare_data.py`. It is read-only. |
| `data/hourly_energy.csv` | The prepared dataset the app actually uses — 34,151 hourly rows with `timestamp`, `energy_kwh` and `valid_minutes` |
| `artifacts/random_forest.joblib` | Trained Random Forest regressor (100 trees, depth 15) |
| `artifacts/xgboost_model.joblib` | Trained XGBoost regressor (300 estimators, depth 6, lr 0.05) |
| `artifacts/model_comparison.csv` | Test-set MAE and RMSE for the baseline, Random Forest and XGBoost |

Both models use the same six features: `hour`, `day_of_week`, `month`, and the
previous 1, 24 and 168 hourly readings.

To retrain (optional, and it will overwrite the artifacts):

```powershell
python models\prepare_data.py
python models\train_model.py
python models\train_xgboost.py
python models\compare_models.py
```

---

## Optional — the Streamlit companion app

`app.py` is an earlier Streamlit version of the interface. It still works and is
handy for quick charts, but the React frontend is the current product.

```powershell
streamlit run app.py
```

It opens on <http://localhost:8501>. It needs the same virtual environment
activated, and it reads the same `data/` and `artifacts/` folders.

---

## Useful commands

Run from `frontend/`:

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on <http://localhost:5173> |
| `npm run build` | Type-check (`tsc -b`) and build to `frontend/dist/` |
| `npm run preview` | Serve the production build on <http://localhost:4173> |
| `npm run lint` | Lint with oxlint |

Run from the project root:

| Command | What it does |
|---|---|
| `uvicorn api:app --reload --port 8000` | Start the API with auto-reload |

---

## Troubleshooting

**`python` or `pip` is not recognised**
Python is not on your PATH. Re-run the installer and tick *Add python.exe to
PATH*, or use the `py` launcher instead (`py -m pip install -r requirements.txt`).

**`py -3.11` says "no Python 3.11 installed"**
Run `py -0p` to list every Python you have, then use one of those, for example
`py -3.12 -m venv .venv`.

**PowerShell: "running scripts is disabled on this system"**
```
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
then activate the environment again. It only affects the current window.

**The sidebar says "API offline"**
The backend is not running or is on a different port. Check terminal 1 is
showing `Uvicorn running on http://127.0.0.1:8000`, and visit
<http://127.0.0.1:8000/api/health> directly.

**`Address already in use`**
Another process holds port 8000 or 5173. Either stop it, or run the backend on
another port (`--port 8001`) and update `API_BASE` in `frontend/src/lib/api.ts`.

**Vite: "Node.js version 20.19 or 22.12+ required"**
Update Node.js, then delete `frontend\node_modules` and run `npm install` again.

**`npm install` reports engine mismatches**
Usually harmless, but check your Node version meets the requirement above.

**Model loading warnings mentioning XGBoost**
Something like *"you are loading a serialized model from an older version"* is
expected and harmless. The model still loads and predicts correctly.

**The charts are empty**
The API is not reachable, or `data/hourly_energy.csv` is missing. The API
returns a clear 500 with the file path if the dataset is absent.

---

## A note on honesty in the numbers

The interface deliberately separates four different kinds of number, and labels
them as such in the UI:

- **Measured** — actual readings from `hourly_energy.csv`
- **Forecast** — model output, drawn as a dashed amber line
- **Detected anomaly** — a reading that deviates from the household's own
  baseline for that hour of day
- **Simulated** — a hypothetical reduction applied to a forecast

Two limitations are worth understanding before you present this:

1. **Anomalies are not proof of waste.** The detector flags readings that are
   unusual *for their hour of day*. A household simply being awake at 03:00
   looks anomalous. The interface says so on the page.
2. **The prepared dataset carries total household consumption only.** The
   original UCI file has per-appliance submetering (`Sub_metering_1/2/3`), but
   `models/prepare_data.py` does not carry those through, so no reading can be
   attributed to a specific appliance. This would require changing the
   preprocessing pipeline.

The optimisation scenarios are a transparent decision heuristic (0.7 weight on
estimated savings, 0.3 on conservativeness) — not a learned optimisation model.
Savings are hypothetical and are not guaranteed.

---

*Built around data. Designed for efficiency.*
