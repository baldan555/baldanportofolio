"""
Compact, de-identified rows of the IBM Telco churn sample for the churn dashboard. Customer IDs are dropped, and so
are gender, age (SeniorCitizen) and household fields (Partner, Dependents): the dashboard only uses what a company
can act on (contract, services, billing, tenure). Categorical columns are stored as digit strings to keep it small.

    ml/.venv/Scripts/python.exe -I ml/churn_dashboard.py
"""

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "src" / "data" / "churn-dashboard.json"
MODEL = ROOT.parent / "src" / "data" / "models" / "telco-churn.json"

d = pd.read_csv(ROOT / "data" / "raw" / "telco" / "telco.csv")

CODES = {
    "contract": ("Contract", ["Month-to-month", "One year", "Two year"]),
    "internet": ("InternetService", ["DSL", "Fiber optic", "No"]),
    "payment": ("PaymentMethod", ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"]),
    "paperless": ("PaperlessBilling", ["No", "Yes"]),
    "phone": ("PhoneService", ["No", "Yes"]),
    "lines": ("MultipleLines", ["No", "Yes", "No phone service"]),
    "security": ("OnlineSecurity", ["No", "Yes", "No internet service"]),
    "backup": ("OnlineBackup", ["No", "Yes", "No internet service"]),
    "protection": ("DeviceProtection", ["No", "Yes", "No internet service"]),
    "support": ("TechSupport", ["No", "Yes", "No internet service"]),
    "tv": ("StreamingTV", ["No", "Yes", "No internet service"]),
    "movies": ("StreamingMovies", ["No", "Yes", "No internet service"]),
}
cols = {}
for key, (col, values) in CODES.items():
    idx = {v: i for i, v in enumerate(values)}
    assert set(d[col].unique()) <= set(values), (col, d[col].unique())
    cols[key] = "".join(str(idx[v]) for v in d[col])

model = json.loads(MODEL.read_text(encoding="utf-8"))
out = {
    "source": {"name": "IBM Telco Customer Churn (sample data, fictional customers)", "url": "https://github.com/IBM/telco-customer-churn-on-icp4d"},
    "n": int(len(d)),
    "labels": {k: v[1] for k, v in CODES.items()},
    "names": {k: v[0] for k, v in CODES.items()},
    "tenure": d.tenure.astype(int).tolist(),
    "monthly": (d.MonthlyCharges * 100).round().astype(int).tolist(),
    "churn": "".join("1" if c == "Yes" else "0" for c in d.Churn),
    "cols": cols,
    # the Telco project's logistic regression (trained in ml/train.py), for the what-if panel
    "model": model["model"],
    "model_metrics": {"roc_auc": model["metrics"]["roc_auc"], "accuracy": model["metrics"]["accuracy"]},
}
OUT.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
print("wrote", OUT, round(OUT.stat().st_size / 1024), "KB;", out["n"], "rows; churn", round(d.Churn.eq("Yes").mean(), 4))
