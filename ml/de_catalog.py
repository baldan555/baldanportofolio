"""
The catalog of pipelines behind this portfolio, measured: runs every local (offline) pipeline script, times it and
records the sizes and row counts going in and out. Network pipelines (live_data.py) and model training (train.py)
are listed from their outputs only, not re-run.

    ml/.venv/Scripts/python.exe -I ml/de_catalog.py
"""

import datetime as dt
import json
import subprocess
import sys
import time
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
SRC = ROOT.parent / "src" / "data"
RAW = ROOT / "data" / "raw"
OUT = SRC / "de-catalog.json"


def size(p: Path) -> int:
    return p.stat().st_size if p.exists() else 0


def rel(p: Path) -> str:
    return p.resolve().relative_to(ROOT.parent).as_posix()


retail_in = RAW / "retail" / ("online_retail.pkl" if (RAW / "retail" / "online_retail.pkl").exists() else "online_retail.xlsx")
PIPES = [
    {
        "id": "retail-profile",
        "name": "Retail profiling",
        "script": "retail_profile.py",
        "kind": "batch",
        "inputs": [(retail_in, 541909)],
        "outputs": [SRC / "retail-profile.json"],
        "steps": ["load the raw export", "profile every column", "find duplicates, cancellations, odd prices", "count each cleaning rule", "small aggregates for demos"],
        "feeds": "Data models page (Raw to ready, method library)",
    },
    {
        "id": "retail-dashboard",
        "name": "Sales dashboard ETL",
        "script": "retail_dashboard.py",
        "kind": "batch",
        "inputs": [(retail_in, 541909)],
        "outputs": [SRC / "retail-dashboard.json", SRC / "sales-dashboard.json"],
        "steps": ["same cleaning rules", "net revenue (minus cancellations)", "metrics by country × month", "products, timing, cohorts, RFM", "serve as JSON"],
        "feeds": "Overview journey, Dashboards story, sales dashboard",
    },
    {
        "id": "ab-dashboard",
        "name": "A/B test aggregates",
        "script": "ab_dashboard.py",
        "kind": "batch",
        "inputs": [(RAW / "hillstrom" / "hillstrom.csv", None)],
        "outputs": [SRC / "ab-dashboard.json"],
        "steps": ["fix a typo in the source", "segment bands", "cell sums per arm (n, visits, buys, spend, spend²)", "sample-ratio and balance checks"],
        "feeds": "A/B test dashboard",
    },
    {
        "id": "churn-dashboard",
        "name": "Churn de-identification",
        "script": "churn_dashboard.py",
        "kind": "batch",
        "inputs": [(RAW / "telco" / "telco.csv", None)],
        "outputs": [SRC / "churn-dashboard.json"],
        "steps": ["drop IDs, gender, age, household", "encode categories as digit strings", "attach the trained model"],
        "feeds": "Churn dashboard",
    },
    {
        "id": "air-dashboard",
        "name": "Air quality history",
        "script": "air_dashboard.py",
        "kind": "batch",
        "inputs": [(RAW / "live" / "pm25_jakarta.json", None)],
        "outputs": [SRC / "air-dashboard.json"],
        "steps": ["keep whole days before the fetch", "daily, monthly, hour × month", "days over WHO / Indonesian limits", "14-day offline snapshot"],
        "feeds": "Jakarta air dashboard",
    },
    {
        "id": "geo",
        "name": "Map shapes",
        "script": "geo_prepare.py",
        "kind": "batch",
        "inputs": [(RAW / "geo" / "idn_adm1_simplified.geojson", None), (RAW / "geo" / "ne_110m_countries.geojson", None)],
        "outputs": [SRC / "geo-shapes.json"],
        "steps": ["project lon/lat to SVG", "simplify rings (Douglas–Peucker)", "drop specks, keep islands", "sample store dots inside provinces"],
        "feeds": "Real maps in the chart library",
    },
    {
        "id": "de-profile",
        "name": "Pipeline profile",
        "script": "de_profile.py",
        "kind": "batch",
        "inputs": [(RAW / "live" / "pm25_jakarta.json", None)],
        "outputs": [SRC / "de-pipeline.json"],
        "steps": ["measure every stage", "run the seven checks", "extract the real code"],
        "feeds": "This hub's overview story",
    },
]


def rows_of(p: Path) -> int | None:
    if p.suffix == ".csv":
        return int(sum(1 for _ in p.open(encoding="utf-8", errors="ignore")) - 1)
    if p.suffix == ".geojson":
        return len(json.loads(p.read_text(encoding="utf-8"))["features"])
    if p.name == "pm25_jakarta.json":
        return len(json.loads(p.read_text(encoding="utf-8"))["time"])
    return None


catalog = []
for pipe in PIPES:
    t0 = time.perf_counter()
    r = subprocess.run([sys.executable, "-I", str(ROOT / pipe["script"])], capture_output=True, text=True, encoding="utf-8", errors="replace")
    secs = time.perf_counter() - t0
    if r.returncode != 0:
        print("FAILED", pipe["script"], r.stderr[-400:])
        continue
    catalog.append(
        {
            "id": pipe["id"],
            "name": pipe["name"],
            "script": f"ml/{pipe['script']}",
            "kind": pipe["kind"],
            "seconds": round(secs, 1),
            "inputs": [{"file": rel(p), "bytes": size(p), "rows": n if n else rows_of(p)} for p, n in pipe["inputs"]],
            "outputs": [{"file": rel(p), "bytes": size(p)} for p in pipe["outputs"]],
            "steps": pipe["steps"],
            "feeds": pipe["feeds"],
        }
    )
    print(f"{pipe['script']:<22} {secs:6.1f}s")

# listed, not re-run: the network fetcher and model training
live = RAW / "live"
models = sorted((SRC / "models").glob("*.json"))
extra = [
    {
        "id": "live-data",
        "name": "Live API fetcher",
        "script": "ml/live_data.py",
        "kind": "api",
        "seconds": None,
        "inputs": [{"file": "Open-Meteo · Frankfurter · Wikimedia APIs", "bytes": None, "rows": None}],
        "outputs": [{"file": rel(p), "bytes": size(p)} for p in [live / "pm25_jakarta.json", live / "usd_idr.json", live / "wiki_id.json"]],
        "steps": ["yearly or monthly requests", "retries with backoff, longer on HTTP 429", "skip what is already cached", "filter unsafe Wikipedia titles"],
        "feeds": "Live Forecast Lab, air dashboard, this hub",
    },
    {
        "id": "train",
        "name": "Model training",
        "script": "ml/train.py",
        "kind": "ml",
        "seconds": None,
        "inputs": [{"file": "public datasets in ml/data/raw", "bytes": None, "rows": None}],
        "outputs": [{"file": f"src/data/models/ ({len(models)} JSON files)", "bytes": sum(size(p) for p in models)}],
        "steps": ["one function per project", "train, compare, pick", "export weights and samples as JSON", "parity checks with the browser"],
        "feeds": "Every ML and DL project page",
    },
]
OUT.write_text(json.dumps({"measured": str(dt.date.today()), "python": sys.version.split()[0], "pandas": pd.__version__, "pipelines": catalog + extra}, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote", OUT, len(catalog) + len(extra), "pipelines")
