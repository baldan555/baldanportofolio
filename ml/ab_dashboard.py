"""
Aggregates of the Hillstrom e-mail experiment for the A/B test dashboard. Every cell keeps n, visits, conversions,
spend and the sum of squared spend, so the page can compute rates, lifts, confidence intervals and p-values for
any segment without the raw rows.

Data: MineThatData E-Mail Analytics Challenge (Kevin Hillstrom, 2008), released publicly for the challenge.

    ml/.venv/Scripts/python.exe -I ml/ab_dashboard.py
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "src" / "data" / "ab-dashboard.json"

d = pd.read_csv(ROOT / "data" / "raw" / "hillstrom" / "hillstrom.csv")
d["zip_code"] = d["zip_code"].replace({"Surburban": "Suburban"})  # typo in the source file
ARM = {"No E-Mail": "control", "Mens E-Mail": "mens", "Womens E-Mail": "womens"}
d["arm"] = d.segment.map(ARM)
d["history_band"] = d.history_segment.str.slice(3).str.replace(" - ", "–", regex=False)
d["recency_band"] = pd.cut(d.recency, [0, 3, 6, 9, 12], labels=["1–3 months", "4–6 months", "7–9 months", "10–12 months"]).astype(str)
d["bought"] = np.where((d.mens == 1) & (d.womens == 1), "Both", np.where(d.mens == 1, "Men's only", "Women's only"))
d["customer"] = np.where(d.newbie == 1, "New (first year)", "Returning")

DIMS = {
    "all": ("Everyone", None, ["All customers"]),
    "customer": ("New or returning", "customer", ["New (first year)", "Returning"]),
    "bought": ("Bought before", "bought", ["Men's only", "Women's only", "Both"]),
    "channel": ("Channel", "channel", ["Web", "Phone", "Multichannel"]),
    "zip": ("Area", "zip_code", ["Urban", "Suburban", "Rural"]),
    "history": ("Spent last year", "history_band", sorted(d.history_band.unique(), key=lambda s: d[d.history_band == s].history.min())),
    "recency": ("Months since last purchase", "recency_band", ["1–3 months", "4–6 months", "7–9 months", "10–12 months"]),
}


def cell(g):
    return {"n": int(len(g)), "visits": int(g.visit.sum()), "conv": int(g.conversion.sum()), "spend": round(float(g.spend.sum()), 2), "spend2": round(float((g.spend**2).sum()), 2)}


dims = {}
for key, (label, col, levels) in DIMS.items():
    rows = []
    for lv in levels:
        g = d if col is None else d[d[col] == lv]
        rows.append({"level": lv, "arms": {a: cell(g[g.arm == a]) for a in ["control", "mens", "womens"]}})
    dims[key] = {"label": label, "levels": rows}

# sample-ratio check: was the 1/3 : 1/3 : 1/3 split respected?
counts = d.arm.value_counts().reindex(["control", "mens", "womens"]).values
srm = stats.chisquare(counts)

# covariate balance (measured before the e-mail): standardised mean difference of each arm against control
def smd(col):
    c = d[d.arm == "control"][col].astype(float)
    out = {}
    for a in ["mens", "womens"]:
        t = d[d.arm == a][col].astype(float)
        out[a] = round(float((t.mean() - c.mean()) / np.sqrt((t.var() + c.var()) / 2)), 4)
    return out


d["is_web"] = (d.channel == "Web").astype(int)
d["is_urban"] = (d.zip_code == "Urban").astype(int)
balance = []
for col, label in [("recency", "Months since last purchase"), ("history", "Spent last year ($)"), ("newbie", "New customers"), ("mens", "Bought men's"), ("womens", "Bought women's"), ("is_web", "Web channel"), ("is_urban", "Urban area")]:
    means = {a: round(float(d[d.arm == a][col].mean()), 4) for a in ["control", "mens", "womens"]}
    balance.append({"label": label, "means": means, "smd": smd(col)})

# spend of buyers: histogram per arm
edges = [25, 50, 75, 100, 150, 200, 300, 500]
buyers = d[d.conversion == 1]
spend_hist = {a: np.histogram(buyers[buyers.arm == a].spend, bins=edges)[0].tolist() for a in ["control", "mens", "womens"]}
buyer_stats = {a: {"n": int((buyers.arm == a).sum()), "median": round(float(buyers[buyers.arm == a].spend.median()), 2), "mean": round(float(buyers[buyers.arm == a].spend.mean()), 2)} for a in ["control", "mens", "womens"]}

out = {
    "source": {
        "name": "MineThatData E-Mail Analytics Challenge (Kevin Hillstrom, 2008)",
        "url": "https://blog.minethatdata.com/2008/03/minethatdata-e-mail-analytics-and-data.html",
        "licence": "Released publicly for the 2008 challenge; no formal licence stated",
        "window_days": 14,
    },
    "rows": int(len(d)),
    "arms": {"control": "No e-mail", "mens": "Men's e-mail", "womens": "Women's e-mail"},
    "dims": dims,
    "srm": {"counts": counts.tolist(), "chi2": round(float(srm.statistic), 3), "p": round(float(srm.pvalue), 4)},
    "balance": balance,
    "spend": {"edges": edges, "hist": spend_hist, "buyers": buyer_stats},
}
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("wrote", OUT, round(OUT.stat().st_size / 1024), "KB")
print(out["srm"], [b["smd"] for b in balance])
print(dims["all"]["levels"][0])
print(buyer_stats)
