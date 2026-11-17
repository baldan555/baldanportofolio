"""
Profiles the raw UCI Online Retail file for the Data Analytics & BI "Data models" page: column health, the messy
cases a cleaning pipeline has to handle (with real example rows), a step-by-step cleaning funnel, and small
aggregates for the join / window / pivot demos. Customer IDs are only counted, never written out.

    ml/.venv/Scripts/python.exe -I ml/retail_profile.py
"""

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw" / "retail"
OUT = ROOT.parent / "src" / "data" / "retail-profile.json"

df = pd.read_pickle(RAW / "online_retail.pkl") if (RAW / "online_retail.pkl").exists() else pd.read_excel(RAW / "online_retail.xlsx")
df["InvoiceNo"] = df["InvoiceNo"].astype(str)
df["StockCode"] = df["StockCode"].astype(str)


def row(r: pd.Series) -> dict:
    """One raw row for display, without the customer's ID (only whether it is there)."""
    return {
        "invoice": r.InvoiceNo,
        "stock": r.StockCode,
        "description": None if pd.isna(r.Description) else str(r.Description),
        "quantity": int(r.Quantity),
        "date": str(r.InvoiceDate)[:16],
        "price": float(r.UnitPrice),
        "customer": None if pd.isna(r.CustomerID) else "known",
        "country": str(r.Country),
    }


# --- column health ---------------------------------------------------------------------------------
cols = []
for c in ["InvoiceNo", "StockCode", "Description", "Quantity", "InvoiceDate", "UnitPrice", "CustomerID", "Country"]:
    s = df[c]
    info = {"name": c, "type": str(s.dtype), "nulls": int(s.isna().sum()), "distinct": int(s.nunique())}
    if c in ("Quantity", "UnitPrice"):
        info.update({"min": float(s.min()), "max": float(s.max()), "negative": int((s < 0).sum()), "zero": int((s == 0).sum())})
    if c == "InvoiceDate":
        info.update({"min": str(s.min())[:10], "max": str(s.max())[:10]})
    cols.append(info)

# --- messy cases, with real examples ---------------------------------------------------------------
is_cancel = df.InvoiceNo.str.startswith("C")
first_dup = df[df.duplicated()].iloc[0]
dups = df[(df[df.columns] == first_dup).all(axis=1) | ((df.drop(columns=["CustomerID", "Description"]) == first_dup.drop(["CustomerID", "Description"])).all(axis=1) & (df.Description == first_dup.Description))].head(2)  # a row and its exact twin
non_product = df.StockCode.str.upper().isin(["POST", "DOT", "M", "D", "C2", "BANK CHARGES", "PADS", "CRUK", "AMAZONFEE", "S", "B"])
missing_desc = df[df.Description.isna()].head(1)
zero_price = df[(df.UnitPrice == 0) & df.Description.notna()].head(1)
# the same product code written with different descriptions
desc_variants = (
    df.dropna(subset=["Description"])
    .groupby("StockCode")["Description"]
    .agg(lambda s: s.value_counts().to_dict())
)
multi = desc_variants[desc_variants.map(len) >= 3].head(1)
variants = {"stock": multi.index[0], "names": [{"name": k, "rows": int(v)} for k, v in list(multi.iloc[0].items())[:4]]}
big = df.loc[df.Quantity.idxmax()]
big_cancel = df[(df.StockCode == big.StockCode) & (df.Quantity == -big.Quantity)].head(1)

cases = {
    "duplicates": {"rows": int(df.duplicated().sum()), "example": [row(r) for _, r in dups.iterrows()]},
    "cancellations": {"rows": int(is_cancel.sum()), "example": [row(df[is_cancel].iloc[0])]},
    "negative_quantity": {"rows": int((df.Quantity <= 0).sum())},
    "zero_price": {"rows": int((df.UnitPrice <= 0).sum()), "example": [row(zero_price.iloc[0])] if len(zero_price) else []},
    "missing_description": {"rows": int(df.Description.isna().sum()), "example": [row(missing_desc.iloc[0])]},
    "missing_customer": {"rows": int(df.CustomerID.isna().sum()), "share": round(float(df.CustomerID.isna().mean()), 4)},
    "non_product_codes": {"rows": int(non_product.sum()), "codes": sorted(df.loc[non_product, "StockCode"].str.upper().unique().tolist())},
    "description_variants": variants,
    "outlier": {
        "example": [row(big)] + [row(r) for _, r in big_cancel.iterrows()],
        # quartiles of positive quantities, for an IQR fence
        "quantiles": {k: float(df.loc[df.Quantity > 0, "Quantity"].quantile(q)) for k, q in [("q1", 0.25), ("median", 0.5), ("q3", 0.75), ("p99", 0.99)]},
        "above_fence": int((df.Quantity > df.loc[df.Quantity > 0, "Quantity"].quantile(0.75) + 1.5 * (df.loc[df.Quantity > 0, "Quantity"].quantile(0.75) - df.loc[df.Quantity > 0, "Quantity"].quantile(0.25))).sum()),
    },
}

# --- a cleaning funnel, one rule at a time -----------------------------------------------------------
steps = [("Raw rows", df)]
d = df.drop_duplicates()
steps.append(("Exact duplicates removed", d))
d = d[~d.InvoiceNo.str.startswith("C")]
steps.append(("Cancellations removed", d))
d = d[(d.Quantity > 0) & (d.UnitPrice > 0)]
steps.append(("Zero or negative quantity / price removed", d))
d = d[d.Description.notna()]
steps.append(("Missing descriptions removed", d))
d = d[~d.StockCode.str.upper().isin(cases["non_product_codes"]["codes"])]
steps.append(("Postage, fees and adjustments removed", d))
funnel = [{"step": name, "rows": int(len(x))} for name, x in steps]
clean = d.copy()
clean["Revenue"] = clean.Quantity * clean.UnitPrice

# --- small aggregates for the demos -------------------------------------------------------------------
invoice = df[df.InvoiceNo == "536365"]
lines = [row(r) for _, r in invoice.iterrows()]
top3 = clean.Country.value_counts().head(3).index.tolist()
clean["Month"] = clean.InvoiceDate.dt.to_period("M").astype(str)
months = sorted(clean.Month.unique())[-4:-1]  # three full months before the partial last one
pivot = clean[clean.Country.isin(top3) & clean.Month.isin(months)].groupby(["Country", "Month"]).InvoiceNo.nunique().reset_index()
monthly = clean.groupby("Month").agg(orders=("InvoiceNo", "nunique"), revenue=("Revenue", "sum")).reset_index()
products = clean.groupby(["StockCode", "Description"]).size().reset_index(name="lines").sort_values("lines", ascending=False).head(5)

out = {
    "source": "UCI Online Retail (CC BY 4.0), profiled by ml/retail_profile.py; customer IDs are counted, never shown",
    "rows": int(len(df)),
    "columns": cols,
    "cases": cases,
    "funnel": funnel,
    "invoice": lines,
    "pivot": {"countries": top3, "months": months, "cells": [{"country": r.Country, "month": r.Month, "orders": int(r.InvoiceNo)} for r in pivot.itertuples()]},
    "monthly": [{"month": r.Month, "orders": int(r.orders), "revenue": round(float(r.revenue))} for r in monthly.itertuples()],
    "top_products": [{"stock": r.StockCode, "description": r.Description.strip(), "lines": int(r.lines)} for r in products.itertuples()],
}
OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
print(json.dumps({k: v for k, v in out.items() if k in ("rows", "funnel")}, indent=1))
print(json.dumps(cases, indent=1, default=str)[:2500])
