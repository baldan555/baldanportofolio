"""
Long-term context and an offline snapshot for the Jakarta air quality dashboard, from the hourly PM2.5 history that
ml/live_data.py caches (Open-Meteo Air Quality API, CAMS global model, CC BY 4.0). The live part of the dashboard is
fetched by the visitor's browser; this file only covers what the API can't give in one request.

    ml/.venv/Scripts/python.exe -I ml/air_dashboard.py
"""

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw" / "live" / "pm25_jakarta.json"
OUT = ROOT.parent / "src" / "data" / "air-dashboard.json"

raw = json.loads(RAW.read_text(encoding="utf-8"))
s = pd.Series(raw["pm2_5"], index=pd.to_datetime(raw["time"]), dtype="float64")
# keep only whole days before the fetch date: hours later on the fetch day may be forecasts, not history
s = s[s.index < pd.Timestamp(raw["fetched"])].dropna()

daily = s.resample("D").mean().dropna()
monthly = s.resample("MS").agg(["mean", lambda x: x.quantile(0.9), "count"]).dropna()
monthly.columns = ["mean", "p90", "hours"]
hour_month = s.groupby([s.index.month, s.index.hour]).mean().unstack().reindex(index=range(1, 13), columns=range(24))
years = []
for y, g in daily.groupby(daily.index.year):
    years.append({"year": int(y), "days": int(len(g)), "mean": round(float(g.mean()), 1), "over_who": int((g > 15).sum()), "over_id": int((g > 55).sum())})

last = s.index.max()
snap = s[s.index > last - pd.Timedelta(days=14)]
out = {
    "source": "Open-Meteo Air Quality API (CAMS global atmospheric composition model), CC BY 4.0",
    "place": "Jakarta",
    "lat": -6.2,
    "lon": 106.85,
    "range": [str(s.index.min())[:16], str(last)[:16]],
    "hours": int(len(s)),
    "monthly": [{"month": d.strftime("%Y-%m"), "mean": round(float(r["mean"]), 1), "p90": round(float(r["p90"]), 1), "hours": int(r["hours"])} for d, r in monthly.iterrows()],
    "daily": [{"date": d.strftime("%Y-%m-%d"), "mean": round(float(v), 1)} for d, v in daily.iloc[-365:].items()],
    "hour_month": [[round(float(v), 1) for v in row] for row in hour_month.values],
    "years": years,
    "snapshot": {"time": [t.strftime("%Y-%m-%dT%H:%M") for t in snap.index], "pm2_5": [round(float(v), 1) for v in snap.values]},
}
OUT.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
print("wrote", OUT, round(OUT.stat().st_size / 1024), "KB", out["range"], out["hours"])
print(years)
print([(m["month"], m["mean"]) for m in out["monthly"][-14:]])
