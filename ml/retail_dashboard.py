"""
Aggregates of the UCI Online Retail data for the Dashboards pages (the "question to dashboard" story and the sales
dashboard). Uses the same cleaning rules as ml/retail_profile.py. Customer IDs are only counted, never written out.

    ml/.venv/Scripts/python.exe -I ml/retail_dashboard.py
"""

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw" / "retail"
OUT = ROOT.parent / "src" / "data" / "retail-dashboard.json"

df = pd.read_pickle(RAW / "online_retail.pkl") if (RAW / "online_retail.pkl").exists() else pd.read_excel(RAW / "online_retail.xlsx")
df["InvoiceNo"] = df["InvoiceNo"].astype(str)
df["StockCode"] = df["StockCode"].astype(str)
NON_PRODUCT = ["POST", "DOT", "M", "D", "C2", "BANK CHARGES", "PADS", "CRUK", "AMAZONFEE", "S", "B"]

raw = df.drop_duplicates()
cancel = raw[raw.InvoiceNo.str.startswith("C")].copy()
clean = raw[~raw.InvoiceNo.str.startswith("C")]
clean = clean[(clean.Quantity > 0) & (clean.UnitPrice > 0) & clean.Description.notna()]
clean = clean[~clean.StockCode.str.upper().isin(NON_PRODUCT)].copy()
clean["Revenue"] = clean.Quantity * clean.UnitPrice
clean["Month"] = clean.InvoiceDate.dt.to_period("M").astype(str)
cancel["Month"] = cancel.InvoiceDate.dt.to_period("M").astype(str)
last_day = clean.InvoiceDate.max()
# net revenue: sales minus cancelled product lines (counted in the month they were cancelled). Without this, a
# single 80,995-unit order that was cancelled the same day would rank as the second best-selling product.
cancel_p = cancel[~cancel.StockCode.str.upper().isin(NON_PRODUCT)].copy()
cancel_p["Revenue"] = cancel_p.Quantity * cancel_p.UnitPrice
cols = ["InvoiceDate", "Month", "Country", "StockCode", "Description", "CustomerID", "Revenue", "Quantity"]
net = pd.concat([clean[cols], cancel_p[cols]], ignore_index=True)

# --- monthly KPIs -------------------------------------------------------------------------------------
known = clean[clean.CustomerID.notna()]
first = known.groupby("CustomerID").InvoiceDate.min().dt.to_period("M").astype(str)
monthly = []
for m, g in clean.groupby("Month"):
    orders = g.InvoiceNo.nunique()
    net_rev = float(net[net.Month == m].Revenue.sum())
    cancelled = cancel[cancel.Month == m].InvoiceNo.nunique()
    custs = g.CustomerID.dropna().unique()
    monthly.append(
        {
            "month": m,
            "revenue": round(net_rev),
            "gross_revenue": round(float(g.Revenue.sum())),
            "orders": int(orders),
            "customers": int(len(custs)),
            "new_customers": int((first == m).sum()),
            "aov": round(net_rev / orders, 2),
            "items": int(g.Quantity.sum()),
            "cancelled_orders": int(cancelled),
            "cancel_rate": round(cancelled / (orders + cancelled), 4),
            "partial": m == str(last_day.to_period("M")),
        }
    )

# --- countries ----------------------------------------------------------------------------------------
by_country = net.groupby("Country").agg(revenue=("Revenue", "sum")).join(clean.groupby("Country").agg(orders=("InvoiceNo", "nunique"))).fillna(0).sort_values("revenue", ascending=False)
iso = {
    "United Kingdom": "GBR", "Netherlands": "NLD", "EIRE": "IRL", "Germany": "DEU", "France": "FRA", "Australia": "AUS", "Switzerland": "CHE",
    "Spain": "ESP", "Belgium": "BEL", "Sweden": "SWE", "Japan": "JPN", "Norway": "NOR", "Portugal": "PRT", "Finland": "FIN", "Channel Islands": None,
    "Denmark": "DNK", "Italy": "ITA", "Cyprus": "CYP", "Singapore": None, "Austria": "AUT", "Hong Kong": None, "Israel": "ISR", "Poland": "POL",
    "Unspecified": None, "Canada": "CAN", "Iceland": "ISL", "Greece": "GRC", "USA": "USA", "United Arab Emirates": "ARE", "Malta": None,
    "Lithuania": "LTU", "Czech Republic": "CZE", "European Community": None, "Lebanon": "LBN", "Brazil": "BRA", "RSA": "ZAF", "Bahrain": None, "Saudi Arabia": "SAU",
}
countries = [{"country": c, "iso": iso.get(c), "revenue": round(float(r.revenue)), "orders": int(r.orders)} for c, r in by_country.iterrows()]
top6 = by_country.head(6).index.tolist()
country_month = {
    c: {
        "revenue": [round(float(net[(net.Country == c) & (net.Month == m["month"])].Revenue.sum())) for m in monthly],
        "orders": [int(clean[(clean.Country == c) & (clean.Month == m["month"])].InvoiceNo.nunique()) for m in monthly],
        "customers": [int(clean[(clean.Country == c) & (clean.Month == m["month"])].CustomerID.nunique()) for m in monthly],
    }
    for c in top6
}

# --- products -----------------------------------------------------------------------------------------
def top_products(d, n):
    g = d.groupby("StockCode").agg(revenue=("Revenue", "sum"), qty=("Quantity", "sum"), name=("Description", lambda s: s.dropna().mode().iloc[0].strip() if s.notna().any() else ""))
    return [{"stock": s, "name": r["name"], "revenue": round(float(r.revenue)), "qty": int(r.qty)} for s, r in g.sort_values("revenue", ascending=False).head(n).iterrows()]


products = top_products(net, 10)
products_by_country = {c: top_products(net[net.Country == c], 5) for c in top6[:4]}

# --- when people order ---------------------------------------------------------------------------------
inv = clean.groupby("InvoiceNo").InvoiceDate.first()
dow_hour = pd.crosstab(inv.dt.day_of_week, inv.dt.hour).reindex(index=range(7), columns=range(6, 21), fill_value=0)
weekday_hour = {"days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "hours": list(range(6, 21)), "orders": dow_hour.values.tolist()}

# --- cohort retention (customers counted by first purchase month) ---------------------------------------------
known_m = known.assign(Cohort=known.CustomerID.map(first))
months = [m["month"] for m in monthly if not m["partial"]]
cohorts = []
for c in months:
    members = known_m[known_m.Cohort == c].CustomerID.unique()
    size = len(members)
    active = known_m[known_m.CustomerID.isin(members)]
    shares = []
    for m in months[months.index(c):]:
        shares.append(round(active[active.Month == m].CustomerID.nunique() / size, 3))
    cohorts.append({"cohort": c, "size": int(size), "retention": shares})

# --- RFM segments at the day after the last order ------------------------------------------------------------
snap = last_day.normalize() + pd.Timedelta(days=1)
rfm = known.groupby("CustomerID").agg(recency=("InvoiceDate", lambda s: (snap - s.max()).days), frequency=("InvoiceNo", "nunique"))
rfm["monetary"] = net[net.CustomerID.notna()].groupby("CustomerID").Revenue.sum().reindex(rfm.index).fillna(0)
rfm["R"] = pd.qcut(rfm.recency.rank(method="first"), 5, labels=[5, 4, 3, 2, 1]).astype(int)
rfm["F"] = pd.qcut(rfm.frequency.rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)


def segment(r):
    if r.R >= 4 and r.F >= 4:
        return "Champions"
    if r.R >= 3 and r.F >= 3:
        return "Loyal"
    if r.R >= 4 and r.F <= 2:
        return "New / promising"
    if r.R <= 2 and r.F >= 3:
        return "At risk"
    if r.R == 3 and r.F <= 2:
        return "Need attention"
    return "Hibernating"


rfm["segment"] = rfm.apply(segment, axis=1)
seg = rfm.groupby("segment").agg(customers=("R", "size"), revenue=("monetary", "sum"), recency=("recency", "median"), frequency=("frequency", "median"))
segments = [{"segment": s, "customers": int(r.customers), "revenue": round(float(r.revenue)), "median_recency": int(r.recency), "median_orders": float(r.frequency)} for s, r in seg.sort_values("revenue", ascending=False).iterrows()]

out = {
    "source": "UCI Online Retail (CC BY 4.0), aggregated by ml/retail_dashboard.py; customer IDs are counted, never shown",
    "period": {"first": str(clean.InvoiceDate.min())[:10], "last": str(last_day)[:10]},
    "totals": {"revenue": round(float(net.Revenue.sum())), "gross_revenue": round(float(clean.Revenue.sum())), "cancelled_value": round(float(-cancel_p.Revenue.sum())), "orders": int(clean.InvoiceNo.nunique()), "customers": int(known.CustomerID.nunique()), "countries": int(clean.Country.nunique()), "products": int(clean.StockCode.nunique()), "rows": int(len(clean))},
    "monthly": monthly,
    "countries": countries,
    "country_month": country_month,
    "products": products,
    "products_by_country": products_by_country,
    "weekday_hour": weekday_hour,
    "cohorts": cohorts,
    "segments": segments,
}
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("wrote", OUT, round(OUT.stat().st_size / 1024), "KB")
print(json.dumps(out["totals"]), json.dumps(out["monthly"][-3:]))
print([(c["country"], c["revenue"]) for c in countries[:6]])
print(segments)
print(cohorts[0]["retention"][:6], cohorts[0]["size"])

# =====================================================================================================
# Filterable data for the sales dashboard: every metric by country (All + top 10) and month, products per
# country-month, map values for every country, order timing per country. Same net-revenue rules as above.
# =====================================================================================================
SALES_OUT = ROOT.parent / "src" / "data" / "sales-dashboard.json"
MONTHS = [m["month"] for m in monthly]
YEAR = [m for m in MONTHS if m != str(last_day.to_period("M"))]  # the 12 full months
TOP = by_country.head(10).index.tolist()
SCOPES = ["All"] + TOP
first_country = known.sort_values("InvoiceDate").groupby("CustomerID").Country.first()


def pick(frame, scope):
    return frame if scope == "All" else frame[frame.Country == scope]


metrics, metrics_year = {}, {}
for sc in SCOPES:
    c, n, k, x = pick(clean, sc), pick(net, sc), pick(known, sc), pick(cancel, sc)
    firsts = first if sc == "All" else first[first_country.reindex(first.index) == sc]
    metrics[sc] = {
        "revenue": [round(float(n[n.Month == m].Revenue.sum())) for m in MONTHS],
        "gross": [round(float(c[c.Month == m].Revenue.sum())) for m in MONTHS],
        "orders": [int(c[c.Month == m].InvoiceNo.nunique()) for m in MONTHS],
        "customers": [int(k[k.Month == m].CustomerID.nunique()) for m in MONTHS],
        "new": [int((firsts == m).sum()) for m in MONTHS],
        "items": [int(c[c.Month == m].Quantity.sum()) for m in MONTHS],
        "cancelled": [int(x[x.Month == m].InvoiceNo.nunique()) for m in MONTHS],
    }
    cy, ny, ky, xy = c[c.Month.isin(YEAR)], n[n.Month.isin(YEAR)], k[k.Month.isin(YEAR)], x[x.Month.isin(YEAR)]
    metrics_year[sc] = {
        "revenue": round(float(ny.Revenue.sum())),
        "gross": round(float(cy.Revenue.sum())),
        "orders": int(cy.InvoiceNo.nunique()),
        "customers": int(ky.CustomerID.nunique()),
        "new": int(firsts.isin(YEAR).sum()),
        "items": int(cy.Quantity.sum()),
        "cancelled": int(xy.InvoiceNo.nunique()),
    }

# products: a shared name list, then the top 8 per scope and month (and for the full year)
names = {}


def tops(frame, n=8):
    g = frame.groupby("StockCode").Revenue.sum().sort_values(ascending=False).head(n)
    out_ = []
    for s, v in g.items():
        if s not in names:
            desc = frame[frame.StockCode == s].Description.dropna()
            names[s] = desc.mode().iloc[0].strip() if len(desc) else s
        out_.append([s, round(float(v))])
    return out_


prod_month = {sc: [tops(pick(net, sc)[pick(net, sc).Month == m]) for m in MONTHS] for sc in SCOPES}
prod_year = {sc: tops(pick(net, sc)[pick(net, sc).Month.isin(YEAR)], 10) for sc in SCOPES}
codes = sorted(names)
index = {s: i for i, s in enumerate(codes)}
prod_month = {sc: [[[index[s], v] for s, v in month] for month in months_] for sc, months_ in prod_month.items()}
prod_year = {sc: [[index[s], v] for s, v in lst] for sc, lst in prod_year.items()}

# map: net revenue per country (ISO-3) and month, for every country that has a shape
mapv = {}
for ctry, code in iso.items():
    if code and ctry in set(net.Country):
        g = net[net.Country == ctry]
        mapv[code] = {"name": "Ireland" if ctry == "EIRE" else ("South Africa" if ctry == "RSA" else ctry), "scope": ctry if ctry in TOP else None, "revenue": [round(float(g[g.Month == m].Revenue.sum())) for m in MONTHS]}

# order timing per scope over the full year (orders by weekday × hour)
heat = {}
for sc in SCOPES:
    c = pick(clean, sc)
    inv_ = c[c.Month.isin(YEAR)].groupby("InvoiceNo").InvoiceDate.first()
    heat[sc] = pd.crosstab(inv_.dt.day_of_week, inv_.dt.hour).reindex(index=range(7), columns=range(6, 21), fill_value=0).values.tolist()

sales = {
    "source": out["source"],
    "months": MONTHS,
    "partial": str(last_day.to_period("M")),
    "last_day": str(last_day)[:10],
    "scopes": SCOPES,
    "metrics": metrics,
    "metrics_year": metrics_year,
    "products": {"names": [names[s].title() if names[s].isupper() else names[s] for s in codes], "codes": codes, "month": prod_month, "year": prod_year},
    "map": mapv,
    "heat": {"days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "hours": list(range(6, 21)), "by": heat},
    "cohorts": cohorts,
    "segments": segments,
    "notes": {
        "no_customer_lines": int(clean.CustomerID.isna().sum()),
        "cancelled_value": round(float(-cancel_p.Revenue.sum())),
        "gross": round(float(clean.Revenue.sum())),
        "net": round(float(net.Revenue.sum())),
        "rows": int(len(clean)),
        "raw_rows": int(len(df)),
    },
}
SALES_OUT.write_text(json.dumps(sales, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("wrote", SALES_OUT, round(SALES_OUT.stat().st_size / 1024), "KB;", len(codes), "products;", len(mapv), "map countries")
