"""
Facts for the Data Engineering overview: the Jakarta PM2.5 pipeline of this portfolio, measured stage by stage on the
real cached data (ml/live_data.py → ml/data/raw/live/pm25_jakarta.json → ml/air_dashboard.py / ml/train.py).

    ml/.venv/Scripts/python.exe -I ml/de_profile.py
"""

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw" / "live" / "pm25_jakarta.json"
OUT = ROOT.parent / "src" / "data" / "de-pipeline.json"

raw_text = RAW.read_text(encoding="utf-8")
raw = json.loads(raw_text)
times, vals, fetched = raw["time"], raw["pm2_5"], raw["fetched"]

# --- extract: how the history is requested -----------------------------------------------------------------
years = sorted({t[:4] for t in times})
src = (ROOT / "live_data.py").read_text(encoding="utf-8")
get_fn = re.search(r"def get\(.*?\n(?=\n\n)", src, re.S).group(0)
pm_fn = re.search(r"def pm25\(\).*?\n(?=\n\n)", src, re.S).group(0)

# --- validate ---------------------------------------------------------------------------------------------------
s = pd.Series(vals, index=pd.to_datetime(times), dtype="float64")
first = s.first_valid_index()
before = int(s[s.index < first].isna().sum())
history = s[(s.index >= first) & (s.index < pd.Timestamp(fetched))]
after_fetch = int((s.index >= pd.Timestamp(fetched)).sum())
gaps = history.isna()
runs = (gaps != gaps.shift()).cumsum()[gaps]
gap_lengths = runs.value_counts().values if len(runs) else []
dup = int(pd.Index(times).duplicated().sum())
hourly = pd.date_range(first, history.index.max(), freq="h")
missing_slots = int(len(hourly.difference(history.index)))
checks = [
    {"name": "Schema", "rule": "time and pm2_5 are arrays of the same length", "ok": len(times) == len(vals), "detail": f"{len(times):,} = {len(vals):,}"},
    {"name": "Unique hours", "rule": "no timestamp appears twice", "ok": dup == 0, "detail": f"{dup} duplicates"},
    {"name": "Hourly grid", "rule": "one slot for every hour, none skipped", "ok": missing_slots == 0, "detail": f"{missing_slots} missing slots"},
    {"name": "Range", "rule": "0 ≤ PM2.5 ≤ 1,000 µg/m³", "ok": bool(((history.dropna() >= 0) & (history.dropna() <= 1000)).all()), "detail": f"min {history.min():.1f}, max {history.max():.1f}"},
    {"name": "Coverage start", "rule": "values before the API's first hour are expected to be empty", "ok": True, "detail": f"{before:,} empty hours before {str(first)[:16]}"},
    {"name": "Gaps", "rule": "empty hours inside the history are flagged", "ok": int(gaps.sum()) == 0, "detail": f"{int(gaps.sum())} empty hours in {len(gap_lengths)} gaps, longest {int(max(gap_lengths)) if len(gap_lengths) else 0} h"},
    {"name": "Not the future", "rule": "hours on or after the fetch day may be forecasts: kept out of history", "ok": True, "detail": f"{after_fetch} hours set aside"},
]

# --- silver / gold ------------------------------------------------------------------------------------------
clean = history.dropna()
daily = clean.resample("D").mean().dropna()
monthly = clean.resample("MS").mean().dropna()
air = ROOT.parent / "src" / "data" / "air-dashboard.json"

# --- tiles for the overview animation: every 120 slots (5 days) become one tile ------------------------------------
all_s = pd.Series(vals, index=pd.to_datetime(times), dtype="float64")
future = all_s.index >= pd.Timestamp(fetched)
TILE = 120
tiles = []
for k in range(0, len(times), TILE):
    block, fut = all_s.iloc[k : k + TILE], future[k : k + TILE]
    hist = block[~fut]
    tiles.append([round(float(hist.mean()), 1) if hist.notna().any() else None, int(hist.isna().sum()), int(fut.sum()), times[k][:10]])
per_year = {y: int((pd.Index(times).str[:4] == y).sum()) for y in years}
worst, best = monthly.idxmax(), monthly.idxmin()
lf = ROOT.parent / "src" / "data" / "models" / "live-forecasts.json"

out = {
    "source": {"name": "Open-Meteo Air Quality API (CAMS)", "licence": "CC BY 4.0", "docs": "https://open-meteo.com/en/docs/air-quality-api", "endpoint": "https://air-quality-api.open-meteo.com/v1/air-quality", "params": {"latitude": -6.2, "longitude": 106.85, "hourly": "pm2_5", "timezone": "Asia/Jakarta"}},
    "requests": len(years),
    "years": years,
    "code": {"get": get_fn.strip(), "pm25": pm_fn.strip()},
    "raw": {"file": "ml/data/raw/live/pm25_jakarta.json", "bytes": len(raw_text.encode("utf-8")), "slots": len(times), "first": times[0], "last": times[-1], "fetched": fetched, "sample": [[t, v] for t, v in list(zip(times, vals))[s.index.get_loc(first) - 2 : s.index.get_loc(first) + 4]]},
    "checks": checks,
    "silver": {"rows": int(len(clean)), "first": str(clean.index.min())[:16], "last": str(clean.index.max())[:16], "preview": [[str(t)[:16], round(float(v), 1)] for t, v in clean.iloc[-5:].items()]},
    "gold": {"days": int(len(daily)), "months": int(len(monthly)), "daily_last60": [round(float(v), 1) for v in daily.iloc[-60:].values], "daily_first": str(daily.index[-60].date())},
    "tiles": {"size": TILE, "list": tiles},
    "per_year": per_year,
    "months": {"worst": [str(worst)[:7], round(float(monthly.max()), 1)], "best": [str(best)[:7], round(float(monthly.min()), 1)], "first": str(monthly.index[0])[:7], "values": [round(float(v), 1) for v in monthly.values]},
    "serve": {"files": [{"file": "src/data/air-dashboard.json", "bytes": air.stat().st_size, "used_by": "Jakarta air dashboard"}, {"file": "src/data/models/live-forecasts.json", "bytes": lf.stat().st_size, "used_by": "Live Forecast Lab (LSTM)"}]},
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote", OUT, round(OUT.stat().st_size / 1024), "KB")
print(json.dumps({k: out[k] for k in ["requests", "years"]}), out["raw"]["bytes"], out["raw"]["slots"])
for c in checks:
    print(json.dumps(c))
print(out["silver"]["rows"], out["gold"]["days"], out["gold"]["months"])
print("tiles", len(tiles), "empty", sum(t[0] is None for t in tiles), "partial-empty", sum(t[1] > 0 and t[0] is not None for t in tiles), "future", sum(t[2] > 0 for t in tiles), json.dumps(per_year), json.dumps(out["months"]["worst"]), json.dumps(out["months"]["best"]))
