"""
Rebuild the portfolio ML projects from scratch.

Every number shown on the website comes from this script:
it trains each model, evaluates it, and writes a JSON file to
src/data/models/ that the site reads: metrics, model parameters for the
in-browser demo, sample rows, EDA aggregates, evaluation curves and the
row/column counts behind the "How it works" diagrams.

Run from the repo root:
    ml/.venv/Scripts/python ml/train.py            (Windows)
    ml/.venv/bin/python ml/train.py                (macOS / Linux)
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
    silhouette_score,
)
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold, cross_val_predict, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "ml" / "data" / "raw"
OUT = ROOT / "src" / "data" / "models"
OUT.mkdir(parents=True, exist_ok=True)
SEED = 42


def r(x: float, n: int = 4) -> float:
    return float(round(float(x), n))


def save(name: str, payload: dict) -> None:
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(payload, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"  -> {path.relative_to(ROOT)}  ({path.stat().st_size / 1024:.1f} KB)")


def clf_metrics(y_true, proba, threshold: float = 0.5) -> dict:
    pred = (proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred).ravel()
    return {
        "roc_auc": r(roc_auc_score(y_true, proba)),
        "accuracy": r(accuracy_score(y_true, pred)),
        "precision": r(precision_score(y_true, pred, zero_division=0)),
        "recall": r(recall_score(y_true, pred)),
        "f1": r(f1_score(y_true, pred)),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def roc_points(y_true, proba, n: int = 60) -> list[list[float]]:
    fpr, tpr, _ = roc_curve(y_true, proba)
    idx = np.unique(np.linspace(0, len(fpr) - 1, n).astype(int))
    return [[r(fpr[i], 3), r(tpr[i], 3)] for i in idx]


def threshold_curve(y_true, proba) -> list[dict]:
    out = []
    for t in np.round(np.arange(0.1, 0.91, 0.05), 2):
        pred = (proba >= t).astype(int)
        out.append({"t": float(t), "precision": r(precision_score(y_true, pred, zero_division=0), 3), "recall": r(recall_score(y_true, pred), 3)})
    return out


def hist_by_group(values: pd.Series, groups: pd.Series, bins: np.ndarray, labels: dict) -> dict:
    """Share of each group per bin (so groups of different size are comparable)."""
    out = {"bins": [r(b, 2) for b in bins], "series": {}}
    for g, name in labels.items():
        v = values[groups == g]
        counts, _ = np.histogram(v, bins=bins)
        out["series"][name] = [r(c / max(1, len(v)), 4) for c in counts]
    return out


def export_logreg(pipe: Pipeline, numeric: list[str], categorical: list[str]) -> dict:
    """Turn a (StandardScaler + OneHot) -> LogisticRegression pipeline into plain numbers for JS."""
    pre: ColumnTransformer = pipe.named_steps["pre"]
    lr: LogisticRegression = pipe.named_steps["model"]
    coefs = lr.coef_[0]
    out = {"intercept": r(lr.intercept_[0], 6), "numeric": {}, "categorical": {}}
    i = 0
    if numeric:
        sc: StandardScaler = pre.named_transformers_["num"]
        for j, col in enumerate(numeric):
            out["numeric"][col] = {"mean": r(sc.mean_[j], 6), "scale": r(sc.scale_[j], 6), "coef": r(coefs[i], 6)}
            i += 1
    if categorical:
        oh: OneHotEncoder = pre.named_transformers_["cat"]
        for col, cats in zip(categorical, oh.categories_):
            out["categorical"][col] = {}
            for c in cats:
                out["categorical"][col][str(c)] = r(coefs[i], 6)
                i += 1
    return out


def make_pipe(model, numeric: list[str], categorical: list[str]) -> Pipeline:
    transformers = []
    if numeric:
        transformers.append(("num", StandardScaler(), numeric))
    if categorical:
        transformers.append(("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical))
    return Pipeline([("pre", ColumnTransformer(transformers)), ("model", model)])


def rate_by(df: pd.DataFrame, col: str, target: pd.Series) -> list[dict]:
    return [{"label": str(k), "rate": r(target[df[col] == k].mean(), 3), "n": int((df[col] == k).sum())} for k in sorted(df[col].unique())]


# ---------------------------------------------------------------------------
# 1. Telco customer churn — binary classification
# ---------------------------------------------------------------------------
def telco() -> None:
    # STEP: Load and clean the raw file | TotalCharges arrives as text and is blank for a few brand-new customers; those rows are dropped and the target becomes 0/1.
    print("telco-churn")
    raw = pd.read_csv(RAW / "telco" / "telco.csv")
    df = raw.copy()
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
    df = df.dropna(subset=["TotalCharges"]).reset_index(drop=True)
    y = (df["Churn"] == "Yes").astype(int).to_numpy()
    ys = pd.Series(y)

    # STEP: Choose the features | Nine columns a call-centre agent can see on screen; SeniorCitizen becomes Yes/No so it is one-hot encoded like the other categories.
    numeric = ["tenure", "MonthlyCharges"]
    categorical = ["Contract", "InternetService", "PaymentMethod", "TechSupport", "OnlineSecurity", "PaperlessBilling", "SeniorCitizen"]
    df["SeniorCitizen"] = df["SeniorCitizen"].map({0: "No", 1: "Yes"})
    X = df[numeric + categorical]

    # STEP: Hold out a test set | 20% of customers, stratified so both parts keep the same churn rate. The models never see them while training.
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=SEED)

    # STEP: Train and compare three models | Each model sits in the same pipeline (scale the numbers, one-hot the categories) and is scored on the held-out customers.
    candidates = {
        "Logistic Regression": LogisticRegression(max_iter=2000),
        "Random Forest": RandomForestClassifier(n_estimators=400, min_samples_leaf=5, random_state=SEED, n_jobs=-1),
        "Gradient Boosting": GradientBoostingClassifier(random_state=SEED),
    }
    comparison, fitted = [], {}
    for name, model in candidates.items():
        pipe = make_pipe(model, numeric, categorical).fit(Xtr, ytr)
        proba = pipe.predict_proba(Xte)[:, 1]
        m = clf_metrics(yte, proba)
        comparison.append({"model": name, "roc_auc": m["roc_auc"], "f1": m["f1"], "accuracy": m["accuracy"]})
        fitted[name] = (pipe, m, proba)
        print(f"  {name:22s} AUC={m['roc_auc']:.3f} F1={m['f1']:.3f} Acc={m['accuracy']:.3f}")

    # STEP: Keep logistic regression, pick demo customers | It scores as well as the others and its coefficients are readable. Ten real test customers (5 who left, 5 who stayed) become the demo presets.
    lr_pipe, lr_m, lr_proba = fitted["Logistic Regression"]
    encoded_cols = int(lr_pipe.named_steps["pre"].transform(Xtr.head(1)).shape[1])

    # sample rows from the TEST set (unseen by the model): 5 churners, 5 stayers
    te = Xte.copy()
    te["actual"] = yte
    te["proba"] = lr_proba
    te["customerID"] = df.loc[Xte.index, "customerID"].values
    samp = pd.concat([te[te.actual == 1].sample(5, random_state=SEED), te[te.actual == 0].sample(5, random_state=SEED)]).sample(frac=1, random_state=SEED)
    samples = [
        {
            "id": row.customerID,
            **{c: (int(row[c]) if c == "tenure" else r(row[c], 2)) for c in numeric},
            **{c: row[c] for c in categorical},
            "actual": "Yes" if row.actual == 1 else "No",
            "predicted": r(row.proba, 3),
        }
        for _, row in samp.iterrows()
    ]

    # STEP: Export everything the page needs | Metrics, the model as plain numbers (export_logreg), the EDA aggregates and curves, written to src/data/models/telco-churn.json.
    tenure_bins = pd.cut(df["tenure"], bins=[0, 6, 12, 24, 48, 72], include_lowest=True, labels=["0–6", "7–12", "13–24", "25–48", "49–72"])
    save(
        "telco-churn",
        {
            "dataset": {
                "name": "IBM Telco Customer Churn",
                "source": "https://github.com/IBM/telco-customer-churn-on-icp4d",
                "raw_rows": int(len(raw)),
                "raw_cols": int(raw.shape[1]),
                "rows": int(len(df)),
                "dropped_rows": int(len(raw) - len(df)),
                "churn_rate": r(y.mean(), 3),
                "features_used": numeric + categorical,
                "encoded_cols": encoded_cols,
            },
            "split": {"test_size": 0.2, "train": int(len(Xtr)), "test": int(len(Xte))},
            "comparison": comparison,
            "chosen": "Logistic Regression",
            "metrics": lr_m,
            "model": export_logreg(lr_pipe, numeric, categorical),
            "options": {c: sorted(df[c].unique().tolist()) for c in categorical},
            "ranges": {c: [r(df[c].min(), 2), r(df[c].max(), 2)] for c in numeric},
            "samples": samples,
            "eda": {
                "churn_by_contract": rate_by(df, "Contract", ys),
                "churn_by_internet": rate_by(df, "InternetService", ys),
                "churn_by_payment": rate_by(df, "PaymentMethod", ys),
                "churn_by_tenure": [{"label": str(k), "rate": r(ys[tenure_bins == k].mean(), 3), "n": int((tenure_bins == k).sum())} for k in tenure_bins.cat.categories],
                "monthly_hist": hist_by_group(df["MonthlyCharges"], ys, np.arange(15, 126, 10), {0: "Stayed", 1: "Churned"}),
            },
            "eval": {
                "roc": {name: roc_points(yte, p) for name, (_, _, p) in fitted.items() if name != "Random Forest"},
                "thresholds": threshold_curve(yte, lr_proba),
            },
        },
    )


# ---------------------------------------------------------------------------
# 2. Heart failure — small clinical dataset, cross-validated
# ---------------------------------------------------------------------------
def heart() -> None:
    # STEP: Load the clinical records | Reads the heart-failure CSV and takes DEATH_EVENT, already 0/1, as the target the model learns to predict.
    print("heart-failure")
    raw = pd.read_csv(RAW / "heart" / "heart.csv")
    df = raw.copy()
    y = df["DEATH_EVENT"].to_numpy()
    ys = pd.Series(y)
    # STEP: Choose the features | Age, three clinical measurements and two Yes/No flags; follow-up time is left out because it is only known after the outcome and would leak.
    # 'time' (follow-up days) is left out on purpose: it is only known after the outcome, so it would leak.
    numeric = ["age", "ejection_fraction", "serum_creatinine", "serum_sodium"]
    binary = ["high_blood_pressure", "anaemia"]
    for b in binary:
        df[b] = df[b].map({0: "No", 1: "Yes"})
    X = df[numeric + binary]

    # STEP: Cross-validate two models | Logistic regression and a random forest are scored by ROC AUC over stratified 5-fold cross-validation repeated 10 times, steadier than one split on small data.
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=SEED)
    comparison, folds = [], {}
    models = {
        "Logistic Regression": LogisticRegression(max_iter=2000),
        "Random Forest": RandomForestClassifier(n_estimators=400, min_samples_leaf=3, random_state=SEED, n_jobs=-1),
    }
    for name, model in models.items():
        scores = cross_val_score(make_pipe(model, numeric, binary), X, y, cv=cv, scoring="roc_auc")
        comparison.append({"model": name, "roc_auc_mean": r(scores.mean()), "roc_auc_std": r(scores.std())})
        folds[name] = [r(s, 3) for s in scores]
        print(f"  {name:22s} AUC={scores.mean():.3f} ± {scores.std():.3f}")

    # STEP: Out-of-fold scores, final fit | Every patient gets a risk score from a model that never saw them, then logistic regression is refit on all patients for the in-browser demo.
    # out-of-fold predictions: every patient scored by a model that never saw them
    oof = cross_val_predict(make_pipe(models["Logistic Regression"], numeric, binary), X, y, cv=StratifiedKFold(5, shuffle=True, random_state=SEED), method="predict_proba")[:, 1]
    final = make_pipe(LogisticRegression(max_iter=2000), numeric, binary).fit(X, y)

    # STEP: Pick demo patients | Ten real patients (5 who died, 5 who survived) become the demo presets, each shown with their out-of-fold predicted risk.
    pick = pd.concat([df[df.DEATH_EVENT == 1].sample(5, random_state=SEED), df[df.DEATH_EVENT == 0].sample(5, random_state=SEED)]).sample(frac=1, random_state=SEED)
    samples = [
        {
            "id": f"P{int(i) + 1:03d}",
            "age": int(row.age),
            "ejection_fraction": int(row.ejection_fraction),
            "serum_creatinine": r(row.serum_creatinine, 2),
            "serum_sodium": int(row.serum_sodium),
            "high_blood_pressure": row.high_blood_pressure,
            "anaemia": row.anaemia,
            "actual": "Yes" if row.DEATH_EVENT == 1 else "No",
            "predicted": r(oof[i], 3),
        }
        for i, row in pick.iterrows()
    ]

    # STEP: Export everything the page needs | Fold scores, the logistic model as plain numbers, EDA histograms, event rate by age band and the out-of-fold ROC, written to src/data/models/heart-failure.json.
    age_band = pd.cut(df["age"], bins=[39, 50, 60, 70, 80, 95], labels=["40–50", "51–60", "61–70", "71–80", "81–95"])
    save(
        "heart-failure",
        {
            "dataset": {
                "name": "UCI Heart Failure Clinical Records",
                "source": "https://archive.ics.uci.edu/dataset/519/heart+failure+clinical+records",
                "rows": int(len(df)),
                "raw_cols": int(raw.shape[1]),
                "event_rate": r(y.mean(), 3),
                "features_used": numeric + binary,
                "left_out": ["time (follow-up days, would leak the outcome)"],
            },
            "validation": "Repeated stratified 5-fold cross-validation (10 repeats)",
            "comparison": comparison,
            "chosen": "Logistic Regression",
            "model": export_logreg(final, numeric, binary),
            "ranges": {c: [r(df[c].min(), 2), r(df[c].max(), 2)] for c in numeric},
            "medians": {c: r(df[c].median(), 2) for c in numeric},
            "samples": samples,
            "eda": {
                "ef_hist": hist_by_group(df["ejection_fraction"], ys, np.arange(10, 85, 5), {0: "Survived", 1: "Died"}),
                "creatinine_hist": hist_by_group(df["serum_creatinine"].clip(upper=4.0), ys, np.arange(0.5, 4.51, 0.5), {0: "Survived", 1: "Died"}),
                "event_by_age": [{"label": str(k), "rate": r(ys[age_band == k].mean(), 3), "n": int((age_band == k).sum())} for k in age_band.cat.categories],
            },
            "eval": {
                "folds": folds,
                "roc_oof": roc_points(y, oof),
                "oof_metrics": clf_metrics(y, oof),
            },
        },
    )


# ---------------------------------------------------------------------------
# 3. Mall customers — K-Means segmentation
# ---------------------------------------------------------------------------
def mall() -> None:
    # STEP: Load the customer list | Reads the mall CSV, renames the long column names, and keeps just two features to cluster on: annual income and spending score.
    print("mall-segments")
    df = pd.read_csv(RAW / "mall" / "mall.csv")
    df = df.rename(columns={"Annual Income (k$)": "income", "Spending Score (1-100)": "score", "Genre": "gender"})
    X = df[["income", "score"]].to_numpy(dtype=float)

    # STEP: Try k from 2 to 8 | K-Means (20 random starts each) runs for every k, recording inertia for the elbow chart and the silhouette score; the k with the best silhouette wins.
    ks, runs = list(range(2, 9)), {}
    for k in ks:
        km = KMeans(n_clusters=k, n_init=20, random_state=SEED).fit(X)
        runs[k] = {
            "inertia": r(km.inertia_, 1),
            "silhouette": r(silhouette_score(X, km.labels_)),
            "labels": km.labels_.tolist(),
            "centroids": [[r(a, 2), r(b, 2)] for a, b in km.cluster_centers_],
        }
        print(f"  k={k} silhouette={runs[k]['silhouette']:.3f}")
    best = max(ks, key=lambda k: runs[k]["silhouette"])

    # STEP: Name the segments | Each centroid is named by comparing its income and score with the medians (e.g. High income, big spenders), plus its size, average age and female share.
    inc_med, sc_med = float(np.median(X[:, 0])), float(np.median(X[:, 1]))

    def name_segment(c):
        inc = "High income" if c[0] > inc_med * 1.15 else "Low income" if c[0] < inc_med * 0.85 else "Mid income"
        sp = "big spenders" if c[1] > sc_med * 1.2 else "careful spenders" if c[1] < sc_med * 0.8 else "average spenders"
        return f"{inc}, {sp}"

    best_run = runs[best]
    labels = np.array(best_run["labels"])
    segments = []
    for i, c in enumerate(best_run["centroids"]):
        m = labels == i
        segments.append(
            {
                "id": i,
                "name": name_segment(c),
                "size": int(m.sum()),
                "centroid": c,
                "avg_age": r(df.loc[m, "Age"].mean(), 1),
                "female_share": r((df.loc[m, "gender"] == "Female").mean(), 3),
            }
        )

    # STEP: Pick demo customers | Ten random customers become the demo presets, each with the segment the best-k model assigned them.
    samp = df.sample(10, random_state=SEED)
    samples = [
        {"id": str(row.CustomerID), "gender": row.gender, "age": int(row.Age), "income": int(row.income), "score": int(row.score), "segment": int(labels[i])}
        for i, row in samp.iterrows()
    ]

    # STEP: Export everything the page needs | The elbow table, labels and centroids for every k so the page can switch k, the named segments and histograms, written to src/data/models/mall-segments.json.
    save(
        "mall-segments",
        {
            "dataset": {"name": "Mall Customers", "rows": int(len(df)), "raw_cols": int(df.shape[1]), "features_used": ["Annual Income (k$)", "Spending Score (1-100)"]},
            "best_k": best,
            "elbow": [{"k": k, "inertia": runs[k]["inertia"], "silhouette": runs[k]["silhouette"]} for k in ks],
            "points": [[int(a), int(b)] for a, b in X],
            "runs": {str(k): {"labels": runs[k]["labels"], "centroids": runs[k]["centroids"]} for k in ks},
            "segments": segments,
            "samples": samples,
            "eda": {
                "income_hist": {"bins": list(range(10, 150, 10)), "counts": np.histogram(df["income"], bins=range(10, 150, 10))[0].tolist()},
                "score_hist": {"bins": list(range(0, 110, 10)), "counts": np.histogram(df["score"], bins=range(0, 110, 10))[0].tolist()},
                "gender": {"Female": int((df.gender == "Female").sum()), "Male": int((df.gender == "Male").sum())},
            },
        },
    )


# ---------------------------------------------------------------------------
# 4. NYC taxi demand — seasonal baseline + robust z-score anomalies
# ---------------------------------------------------------------------------
def nyc_taxi() -> None:
    # STEP: Load and resample to hours | Reads the NAB taxi series, sums the half-hourly counts into hourly totals, and tags each hour with its weekday and hour of day.
    print("nyc-taxi-anomaly")
    df = pd.read_csv(RAW / "nyc_taxi" / "nyc_taxi.csv", parse_dates=["timestamp"])
    s = df.set_index("timestamp")["value"].resample("1h").sum()
    hourly = s.to_frame("value")
    hourly["dow"] = hourly.index.day_of_week
    hourly["hour"] = hourly.index.hour

    # STEP: Build a baseline and z-score | Expected demand is the median for that weekday and hour; the gap from it is scaled by the MAD into a robust z-score and smoothed over 3 hours.
    # Expected demand for that weekday-hour, robust to the anomalies themselves (median).
    baseline = hourly.groupby(["dow", "hour"])["value"].transform("median")
    resid = hourly["value"] - baseline
    mad = np.median(np.abs(resid - np.median(resid)))
    z = (resid / (1.4826 * mad)).rolling(3, center=True, min_periods=1).mean()
    hourly["baseline"], hourly["z"] = baseline, z

    # STEP: Score alerts against known events | Loads the five labelled event windows and defines how a threshold is judged: events caught versus false alerts, with flags within 6 hours grouped into one.
    windows = json.loads((RAW / "nyc_taxi" / "combined_windows.json").read_text())["realKnownCause/nyc_taxi.csv"]
    windows = [[pd.Timestamp(a), pd.Timestamp(b)] for a, b in windows]
    names = ["NYC Marathon", "Thanksgiving", "Christmas", "New Year", "Blizzard"]

    def evaluate(threshold: float) -> dict:
        flags = hourly.index[np.abs(hourly["z"]) > threshold]
        hit = [any((t >= a) & (t <= b) for t in flags) for a, b in windows]
        outside = [t for t in flags if not any(a <= t <= b for a, b in windows)]
        events, last = 0, None  # group flags closer than 6h into one "alert"
        for t in outside:
            if last is None or (t - last) > pd.Timedelta(hours=6):
                events += 1
            last = t
        return {"threshold": threshold, "detected": int(sum(hit)), "of": len(windows), "false_alerts": events}

    # STEP: Sweep the alert threshold | Every z threshold from 2.0 to 6.0 in steps of 0.5 is scored this way, and 4.5 is set as the page's default.
    sweep = [evaluate(t) for t in [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]]
    default = 4.5
    for e in sweep:
        print(f"  z>{e['threshold']}: detected {e['detected']}/{e['of']}, false alerts {e['false_alerts']}")

    # STEP: Pick demo hours | The 5 biggest moments inside known events (one per day), the 3 biggest outside them, and 4 ordinary hours with a z-score under 0.5.
    # sample rows: biggest moments inside known events, a few outside, a few ordinary hours
    inside = hourly[[any(a <= t <= b for a, b in windows) for t in hourly.index]]
    outside = hourly.drop(inside.index)
    pick = pd.concat(
        [
            inside.reindex(inside["z"].abs().sort_values(ascending=False).index).groupby(inside.index.date).head(1).head(5),
            outside.reindex(outside["z"].abs().sort_values(ascending=False).index).groupby(outside.index.date).head(1).head(3),
            outside[outside["z"].abs() < 0.5].sample(4, random_state=SEED),
        ]
    ).sort_index()
    samples = [
        {
            "time": str(t),
            "value": int(row.value),
            "expected": int(row.baseline),
            "z": r(row.z, 2),
        }
        for t, row in pick.iterrows()
    ]

    # STEP: Export everything the page needs | Daily profiles, the weekday-hour heatmap, z histogram, threshold sweep and the full hourly series, written to src/data/models/nyc-taxi-anomaly.json.
    weekday = hourly[hourly["dow"] < 5].groupby("hour")["value"].mean()
    weekend = hourly[hourly["dow"] >= 5].groupby("hour")["value"].mean()
    heat = hourly.groupby(["dow", "hour"])["value"].median().unstack()
    zb = np.arange(-8, 8.5, 0.5)
    zcounts = np.histogram(hourly["z"].clip(-8, 8), bins=zb)[0]

    save(
        "nyc-taxi-anomaly",
        {
            "dataset": {
                "name": "NAB nyc_taxi (Numenta Anomaly Benchmark)",
                "source": "https://github.com/numenta/NAB",
                "points_raw": int(len(df)),
                "hours": int(len(hourly)),
                "resolution": "30 min, aggregated to hourly",
                "period": [str(hourly.index.min().date()), str(hourly.index.max().date())],
            },
            "method": "Median baseline per weekday-hour, robust z-score of the residual (MAD), 3-hour smoothing",
            "default_threshold": default,
            "sweep": sweep,
            "windows": [{"name": n, "start": str(a), "end": str(b)} for n, (a, b) in zip(names, windows)],
            "samples": samples,
            "eda": {
                "hourly_profile": {"Weekday": [int(v) for v in weekday], "Weekend": [int(v) for v in weekend]},
                "heatmap": [[int(v) for v in heat.loc[d]] for d in range(7)],
                "z_hist": {"bins": [r(b, 1) for b in zb], "counts": zcounts.tolist()},
            },
            "series": {
                "start": str(hourly.index[0]),
                "step_hours": 1,
                "value": [int(v) for v in hourly["value"]],
                "baseline": [int(v) for v in hourly["baseline"]],
                "z": [r(v, 2) for v in hourly["z"]],
            },
        },
    )


# ---------------------------------------------------------------------------
# 5. Credit risk — cost-aware decisions on UCI German Credit
# ---------------------------------------------------------------------------
CREDIT_COLS = [
    "checking", "duration", "history", "purpose", "amount", "savings", "employment", "installment_rate",
    "personal_status_sex", "other_debtors", "residence_since", "property", "age", "other_plans", "housing",
    "existing_credits", "job", "dependents", "telephone", "foreign_worker", "target",
]
CREDIT_CODES = {
    "checking": {"A11": "< 0 DM", "A12": "0–200 DM", "A13": "≥ 200 DM", "A14": "No account"},
    "history": {
        "A30": "No credits / all repaid",
        "A31": "All repaid at this bank",
        "A32": "Existing credits on time",
        "A33": "Delays in the past",
        "A34": "Critical / credits elsewhere",
    },
    "purpose": {
        "A40": "Car (new)", "A41": "Car (used)", "A42": "Furniture", "A43": "Radio / TV", "A44": "Appliances",
        "A45": "Repairs", "A46": "Education", "A47": "Vacation", "A48": "Retraining", "A49": "Business", "A410": "Other",
    },
    "savings": {"A61": "< 100 DM", "A62": "100–500 DM", "A63": "500–1000 DM", "A64": "≥ 1000 DM", "A65": "Unknown / none"},
    "employment": {"A71": "Unemployed", "A72": "< 1 year", "A73": "1–4 years", "A74": "4–7 years", "A75": "≥ 7 years"},
    "personal_status_sex": {"A91": "male: divorced", "A92": "female: div/married", "A93": "male: single", "A94": "male: married", "A95": "female: single"},
    "other_debtors": {"A101": "None", "A102": "Co-applicant", "A103": "Guarantor"},
    "property": {"A121": "Real estate", "A122": "Savings / insurance", "A123": "Car / other", "A124": "None known"},
    "other_plans": {"A141": "Bank", "A142": "Stores", "A143": "None"},
    "housing": {"A151": "Rent", "A152": "Own", "A153": "For free"},
    "job": {"A171": "Unskilled, non-resident", "A172": "Unskilled, resident", "A173": "Skilled", "A174": "Management / self-employed"},
    "telephone": {"A191": "No", "A192": "Yes"},
    "foreign_worker": {"A201": "Yes", "A202": "No"},
}
COST_FN = 5  # approving someone who defaults
COST_FP = 1  # declining someone who would have repaid


def credit() -> None:
    # STEP: Load and decode the codes | Reads the raw german.data file, maps codes like A11 to readable labels, and marks bad credit (target 2) as 1.
    print("credit-risk")
    raw = pd.read_csv(RAW / "credit" / "german.data", sep=r"\s+", header=None, names=CREDIT_COLS)
    df = raw.copy()
    for c, m in CREDIT_CODES.items():
        df[c] = df[c].map(m)
    y = (df["target"] == 2).astype(int).to_numpy()  # 1 = bad credit (defaulted)
    ys = pd.Series(y)

    # STEP: Choose the features | Three numbers and eight categories; personal status/sex, age and foreign-worker status are left out for fairness, telephone as irrelevant.
    # Left out on purpose: personal status/sex, age and foreign-worker status (fairness),
    # telephone (irrelevant), plus a few weak extras to keep the form short.
    numeric = ["duration", "amount", "installment_rate"]
    categorical = ["checking", "history", "purpose", "savings", "employment", "property", "other_plans", "housing"]
    X = df[numeric + categorical]

    # STEP: Cross-validate three models | Logistic regression, a random forest and gradient boosting are scored by ROC AUC over stratified 5-fold cross-validation repeated 5 times.
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=SEED)
    models = {
        "Logistic Regression": LogisticRegression(max_iter=3000),
        "Random Forest": RandomForestClassifier(n_estimators=500, min_samples_leaf=3, random_state=SEED, n_jobs=-1),
        "Gradient Boosting": GradientBoostingClassifier(random_state=SEED),
    }
    comparison, folds = [], {}
    for name, model in models.items():
        scores = cross_val_score(make_pipe(model, numeric, categorical), X, y, cv=cv, scoring="roc_auc")
        comparison.append({"model": name, "roc_auc_mean": r(scores.mean()), "roc_auc_std": r(scores.std())})
        folds[name] = [r(s, 3) for s in scores]
        print(f"  {name:22s} AUC={scores.mean():.3f} ± {scores.std():.3f}")

    # STEP: Price every decision threshold | Using out-of-fold risks, each threshold from 0.05 to 0.95 is costed (approving a defaulter costs 5, declining a good payer 1) and compared with 0.5 and 1/6.
    oof = cross_val_predict(make_pipe(models["Logistic Regression"], numeric, categorical), X, y, cv=StratifiedKFold(5, shuffle=True, random_state=SEED), method="predict_proba")[:, 1]

    # Cost of each decision threshold: decline when P(default) >= t
    def cost_at(t: float) -> dict:
        decline = oof >= t
        fn = int(((~decline) & (y == 1)).sum())  # approved, then defaulted
        fp = int((decline & (y == 0)).sum())  # declined a good customer
        return {"t": r(t, 2), "cost": fn * COST_FN + fp * COST_FP, "approved_bad": fn, "declined_good": fp, "declined": int(decline.sum())}

    curve = [cost_at(t) for t in np.round(np.arange(0.05, 0.96, 0.05), 2)]
    best = min(curve, key=lambda c: c["cost"])
    bayes_t = COST_FP / (COST_FP + COST_FN)  # 1/6: where the two expected costs are equal
    at_half = cost_at(0.5)
    at_bayes = cost_at(bayes_t)
    print(f"  cost @0.50={at_half['cost']}  @{bayes_t:.3f}={at_bayes['cost']}  best grid t={best['t']} cost={best['cost']}")

    # STEP: Final model and demo loans | Logistic regression is refit on every applicant for the demo, and ten real loans (5 defaulted, 5 repaid) become presets with their out-of-fold risk.
    final = make_pipe(LogisticRegression(max_iter=3000), numeric, categorical).fit(X, y)
    encoded_cols = int(final.named_steps["pre"].transform(X.head(1)).shape[1])

    pick = pd.concat([df[y == 1].sample(5, random_state=SEED), df[y == 0].sample(5, random_state=SEED)]).sample(frac=1, random_state=SEED)
    samples = [
        {
            "id": f"L{int(i) + 1:04d}",
            **{c: int(row[c]) for c in numeric},
            **{c: row[c] for c in categorical},
            "actual": "Defaulted" if row.target == 2 else "Repaid",
            "predicted": r(oof[i], 3),
        }
        for i, row in pick.iterrows()
    ]

    # STEP: Export everything the page needs | Costs, the logistic model as plain numbers, EDA rates, the cost curve and confusion matrices at 0.5 and 1/6, written to src/data/models/credit-risk.json.
    duration_band = pd.cut(df["duration"], bins=[0, 12, 24, 36, 72], labels=["≤ 12", "13–24", "25–36", "37–72"])
    save(
        "credit-risk",
        {
            "dataset": {
                "name": "Statlog German Credit (UCI)",
                "source": "https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data",
                "rows": int(len(df)),
                "raw_cols": int(raw.shape[1]),
                "default_rate": r(y.mean(), 3),
                "features_used": numeric + categorical,
                "left_out": ["personal_status_sex", "age", "foreign_worker", "telephone", "other_debtors", "residence_since", "existing_credits", "job", "dependents"],
                "encoded_cols": encoded_cols,
            },
            "costs": {"approve_bad": COST_FN, "decline_good": COST_FP, "bayes_threshold": r(bayes_t, 4)},
            "validation": "Repeated stratified 5-fold cross-validation (5 repeats)",
            "comparison": comparison,
            "chosen": "Logistic Regression",
            "model": export_logreg(final, numeric, categorical),
            "options": {c: sorted(df[c].unique().tolist()) for c in categorical},
            "ranges": {c: [int(df[c].min()), int(df[c].max())] for c in numeric},
            "medians": {c: r(df[c].median(), 1) for c in numeric},
            "samples": samples,
            "eda": {
                "default_by_checking": rate_by(df, "checking", ys),
                "default_by_history": rate_by(df, "history", ys),
                "default_by_savings": rate_by(df, "savings", ys),
                "default_by_duration": [{"label": str(k), "rate": r(ys[duration_band == k].mean(), 3), "n": int((duration_band == k).sum())} for k in duration_band.cat.categories],
                "amount_hist": hist_by_group(df["amount"].clip(upper=15000), ys, np.arange(0, 15001, 1500), {0: "Repaid", 1: "Defaulted"}),
            },
            "eval": {
                "folds": folds,
                "roc_oof": roc_points(y, oof),
                "oof_auc": r(roc_auc_score(y, oof)),
                "cost_curve": curve,
                "at_half": at_half,
                "at_bayes": at_bayes,
                "confusion_bayes": clf_metrics(y, oof, bayes_t)["confusion"],
                "confusion_half": clf_metrics(y, oof, 0.5)["confusion"],
            },
        },
    )


# ---------------------------------------------------------------------------
# 6. Manufacturing defects — AI4I 2020, physics features + a readable tree
# ---------------------------------------------------------------------------
def ai4i() -> None:
    # STEP: Load the machine data | Reads the AI4I 2020 file, gives the columns short names (air, process, speed, torque, wear) and uses the machine-failure flag as the target.
    from sklearn.metrics import average_precision_score, precision_recall_curve
    from sklearn.tree import DecisionTreeClassifier

    print("manufacturing-defects")
    raw = pd.read_csv(RAW / "ai4i" / "ai4i2020.csv", encoding="utf-8-sig")
    df = raw.copy()
    df.columns = ["udi", "product_id", "type", "air", "process", "speed", "torque", "wear", "fail", "TWF", "HDF", "PWF", "OSF", "RNF"]
    y = df["fail"].to_numpy()

    # STEP: Add physics features, check rules | Adds temperature difference, power and tool strain, one-hot codes the product type, then counts how often each failure mode matches its documented rule.
    # physics features
    df["temp_diff"] = df["process"] - df["air"]  # K
    df["power"] = df["torque"] * df["speed"] * 2 * np.pi / 60  # W
    df["strain"] = df["wear"] * df["torque"]  # min·Nm
    for t in ["L", "M", "H"]:
        df[f"type_{t}"] = (df["type"] == t).astype(int)

    # check the documented failure-mode rules against the data itself
    osf_limit = df["type"].map({"L": 11000, "M": 12000, "H": 13000})
    rule_checks = {
        "HDF": {"rule": "temp difference < 8.6 K and speed < 1380 rpm", "rows": int(df.HDF.sum()),
                "match": int(((df.temp_diff < 8.6) & (df.speed < 1380))[df.HDF == 1].sum())},
        "PWF": {"rule": "power < 3500 W or > 9000 W", "rows": int(df.PWF.sum()),
                "match": int(((df.power < 3500) | (df.power > 9000))[df.PWF == 1].sum())},
        "OSF": {"rule": "tool wear × torque > 11,000 (L) / 12,000 (M) / 13,000 (H) min·Nm", "rows": int(df.OSF.sum()),
                "match": int((df.strain > osf_limit)[df.OSF == 1].sum())},
        "TWF": {"rule": "tool replaced or fails at a random wear time between 200 and 240 min", "rows": int(df.TWF.sum()),
                "match": int(((df.wear >= 200) & (df.wear <= 240))[df.TWF == 1].sum())},
        "RNF": {"rule": "random 0.1% failure, no pattern", "rows": int(df.RNF.sum()), "match": None},
    }
    for k, v in rule_checks.items():
        print(f"  rule {k}: {v['match']}/{v['rows']} rows satisfy '{v['rule']}'")

    # STEP: Hold out a test set | Two feature lists (raw readings, and raw plus physics) and a 20% test split, stratified so both parts keep the same failure rate.
    rawf = ["air", "process", "speed", "torque", "wear", "type_L", "type_M", "type_H"]
    engf = rawf + ["temp_diff", "power", "strain"]
    idx_tr, idx_te = train_test_split(np.arange(len(df)), test_size=0.2, stratify=y, random_state=SEED)
    ytr, yte = y[idx_tr], y[idx_te]

    # STEP: Train three models twice | Logistic regression, a depth-5 tree and gradient boosting each run on raw and on physics features, scored on the test set by average precision, F1 and recall.
    def fit_eval(name, model, feats):
        model.fit(df.loc[idx_tr, feats], ytr)
        proba = model.predict_proba(df.loc[idx_te, feats])[:, 1]
        pred = (proba >= 0.5).astype(int)
        res = {
            "model": name,
            "features": "physics" if feats is engf else "raw",
            "ap": r(average_precision_score(yte, proba)),
            "f1": r(f1_score(yte, pred)),
            "recall": r(recall_score(yte, pred)),
            "precision": r(precision_score(yte, pred, zero_division=0)),
        }
        print(f"  {name:28s} {res['features']:8s} AP={res['ap']:.3f} F1={res['f1']:.3f} R={res['recall']:.3f} P={res['precision']:.3f}")
        return res, proba, model

    lr = lambda: Pipeline([("sc", StandardScaler()), ("m", LogisticRegression(max_iter=3000))])
    runs = [
        fit_eval("Logistic Regression", lr(), rawf),
        fit_eval("Decision tree (depth 5)", DecisionTreeClassifier(max_depth=5, random_state=SEED), rawf),
        fit_eval("Gradient Boosting", GradientBoostingClassifier(random_state=SEED), rawf),
        fit_eval("Logistic Regression", lr(), engf),
        fit_eval("Decision tree (depth 5)", DecisionTreeClassifier(max_depth=5, random_state=SEED), engf),
        fit_eval("Gradient Boosting", GradientBoostingClassifier(random_state=SEED), engf),
    ]
    comparison = [r_[0] for r_ in runs]
    tree_raw_proba = runs[1][1]
    gb_eng_proba = runs[5][1]
    tree_res, tree_proba, tree = runs[4]

    def pr_points(proba, n=50):
        p, rc, _ = precision_recall_curve(yte, proba)
        idx = np.unique(np.linspace(0, len(p) - 1, n).astype(int))
        return [[r(rc[i], 3), r(p[i], 3)] for i in idx]

    # STEP: Keep the tree, flatten it | The depth-5 tree on physics features is kept and turned into plain nodes the browser can walk, with feature importances and recall per failure mode.
    # export the tree as plain nodes for the browser
    t = tree.tree_
    nodes = []
    for i in range(t.node_count):
        counts = t.value[i][0]
        nodes.append(
            {
                "f": engf[t.feature[i]] if t.children_left[i] != -1 else None,
                "t": r(t.threshold[i], 3) if t.children_left[i] != -1 else None,
                "l": int(t.children_left[i]),
                "r": int(t.children_right[i]),
                "p": r(counts[1] / counts.sum(), 4),
                "n": int(t.n_node_samples[i]),
            }
        )
    importance = sorted(
        [{"feature": f, "importance": r(v, 4)} for f, v in zip(engf, tree.feature_importances_) if v > 0],
        key=lambda d: -d["importance"],
    )
    cm = confusion_matrix(yte, (tree_proba >= 0.5).astype(int)).ravel()
    te_df = df.loc[idx_te]
    caught = tree_proba >= 0.5
    recall_by_mode = {
        m: {"caught": int((caught & (te_df[m].to_numpy() == 1) & (yte == 1)).sum()), "total": int(((te_df[m].to_numpy() == 1) & (yte == 1)).sum())}
        for m in ["HDF", "PWF", "OSF", "TWF", "RNF"]
    }
    print("  recall by mode:", recall_by_mode)

    # STEP: Pick demo test runs | One test-set failure per mode where possible, up to 2 more failures and 5 normal runs, capped at 12, each with the tree's predicted risk.
    # samples from the TEST set: one of each failure mode where possible + normal runs
    te = df.loc[idx_te].copy()
    te["proba"] = tree_proba
    picks = []
    for mode in ["HDF", "PWF", "OSF", "TWF", "RNF"]:
        sub = te[(te[mode] == 1) & (te.fail == 1)]
        if len(sub):
            picks.append(sub.sample(1, random_state=SEED))
    picks.append(te[te.fail == 1].drop(pd.concat(picks).index, errors="ignore").sample(min(2, int(te.fail.sum())), random_state=SEED))
    picks.append(te[te.fail == 0].sample(5, random_state=SEED))
    samp = pd.concat(picks).drop_duplicates(subset="udi").head(12)
    samples = []
    for _, row in samp.iterrows():
        mode = next((m for m in ["HDF", "PWF", "OSF", "TWF", "RNF"] if row[m] == 1), None)
        samples.append(
            {
                "id": row.product_id,
                "type": row.type,
                "air": r(row.air, 1),
                "process": r(row.process, 1),
                "speed": int(row.speed),
                "torque": r(row.torque, 1),
                "wear": int(row.wear),
                "actual": "Failure" if row.fail == 1 else "OK",
                "mode": mode,
                "predicted": r(row.proba, 3),
            }
        )

    # STEP: Export everything the page needs | A speed-torque scatter (all failures plus 1200 normal runs), rule checks, the tree, EDA and PR curves, written to src/data/models/manufacturing-defects.json.
    # scatter: all failures + a sample of normal runs
    sc = pd.concat([df[df.fail == 1], df[df.fail == 0].sample(1200, random_state=SEED)])
    scatter = [
        [int(r_.speed), r(r_.torque, 1), next((m for m in ["HDF", "PWF", "OSF", "TWF", "RNF"] if r_[m] == 1), "OK" if r_.fail == 0 else "Other")]
        for _, r_ in sc.iterrows()
    ]
    ys = pd.Series(y)
    save(
        "manufacturing-defects",
        {
            "dataset": {
                "name": "AI4I 2020 Predictive Maintenance (UCI)",
                "source": "https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset",
                "rows": int(len(df)),
                "raw_cols": int(raw.shape[1]),
                "failure_rate": r(y.mean(), 4),
                "failures": int(y.sum()),
                "features_raw": rawf,
                "features_physics": ["temp_diff", "power", "strain"],
            },
            "split": {"train": int(len(idx_tr)), "test": int(len(idx_te)), "test_failures": int(yte.sum())},
            "rule_checks": rule_checks,
            "comparison": comparison,
            "chosen": "Decision tree (depth 5) · physics features",
            "metrics": {**tree_res, "confusion": {"tn": int(cm[0]), "fp": int(cm[1]), "fn": int(cm[2]), "tp": int(cm[3])}},
            "tree": {"features": engf, "nodes": nodes, "depth": int(tree.get_depth()), "leaves": int(tree.get_n_leaves())},
            "importance": importance,
            "ranges": {c: [r(df[c].min(), 1), r(df[c].max(), 1)] for c in ["air", "process", "speed", "torque", "wear"]},
            "medians": {c: r(df[c].median(), 1) for c in ["air", "process", "speed", "torque", "wear"]},
            "samples": samples,
            "eda": {
                "fail_by_type": rate_by(df, "type", ys),
                "modes": {m: int(df[m].sum()) for m in ["HDF", "PWF", "OSF", "TWF", "RNF"]},
                "torque_hist": hist_by_group(df["torque"], ys, np.arange(0, 81, 5), {0: "OK", 1: "Failure"}),
                "wear_hist": hist_by_group(df["wear"], ys, np.arange(0, 261, 20), {0: "OK", 1: "Failure"}),
                "scatter": scatter,
            },
            "eval": {
                "pr": {
                    "Tree · physics features": pr_points(tree_proba),
                    "Boosting · physics features": pr_points(gb_eng_proba),
                    "Tree · raw features": pr_points(tree_raw_proba),
                },
                "base_rate": r(yte.mean(), 4),
                "recall_by_mode": recall_by_mode,
            },
        },
    )


# ---------------------------------------------------------------------------
# 7. Student performance — regression, "what you know and when"
# ---------------------------------------------------------------------------
def export_linear(pipe: Pipeline, numeric: list[str], categorical: list[str]) -> dict:
    """Same shape as export_logreg, for a linear regressor (Ridge)."""
    pre: ColumnTransformer = pipe.named_steps["pre"]
    m = pipe.named_steps["model"]
    coefs = np.ravel(m.coef_)
    out = {"intercept": r(float(np.ravel(m.intercept_)[0]) if np.ndim(m.intercept_) else m.intercept_, 6), "numeric": {}, "categorical": {}}
    i = 0
    sc: StandardScaler = pre.named_transformers_["num"]
    for j, col in enumerate(numeric):
        out["numeric"][col] = {"mean": r(sc.mean_[j], 6), "scale": r(sc.scale_[j], 6), "coef": r(coefs[i], 6)}
        i += 1
    oh: OneHotEncoder = pre.named_transformers_["cat"]
    for col, cats in zip(categorical, oh.categories_):
        out["categorical"][col] = {}
        for c in cats:
            out["categorical"][col][str(c)] = r(coefs[i], 6)
            i += 1
    return out


def student() -> None:
    # STEP: Load the grades | Reads the Portuguese-course student file, makes the term grades G1 and G2 numeric, and takes the final grade G3 as the target.
    from sklearn.linear_model import RidgeCV
    from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
    from sklearn.metrics import mean_absolute_error, r2_score
    from sklearn.model_selection import KFold, RepeatedKFold, cross_validate

    print("student-performance")
    df = pd.read_csv(RAW / "student" / "student-por.csv", sep=";")
    for c in ["G1", "G2"]:
        df[c] = pd.to_numeric(df[c])
    y = df["G3"].to_numpy().astype(float)

    # STEP: Define three prediction stages | The same background features at every stage, plus G1 after term 1 and G1 and G2 after term 2, to show how much each new grade helps.
    base_num = ["failures", "studytime", "absences", "Medu", "goout", "Dalc", "traveltime", "age"]
    cat = ["school", "higher", "schoolsup", "internet"]
    stages = {
        "start": {"label": "Start of year", "num": base_num},
        "term1": {"label": "After term 1", "num": base_num + ["G1"]},
        "term2": {"label": "After term 2", "num": base_num + ["G1", "G2"]},
    }
    # STEP: Set up validation and a baseline | Ridge picks its strength from 30 alphas, models get 5-fold cross-validation repeated 5 times, and always guessing the mean gives a baseline MAE.
    alphas = np.logspace(-2, 3, 30)
    cv = RepeatedKFold(n_splits=5, n_repeats=5, random_state=SEED)
    baseline_mae = float(np.abs(y - y.mean()).mean())

    # STEP: Compare models at each stage | Ridge, a random forest and gradient boosting are compared by MAE and R2; Ridge then gets out-of-fold predictions and a final fit exported as plain numbers.
    out_stages, comparison = {}, []
    for key, st in stages.items():
        num = st["num"]
        X = df[num + cat]
        for name, model in {
            "Ridge regression": RidgeCV(alphas=alphas),
            "Random Forest": RandomForestRegressor(n_estimators=400, min_samples_leaf=3, random_state=SEED, n_jobs=-1),
            "Gradient Boosting": GradientBoostingRegressor(random_state=SEED),
        }.items():
            s = cross_validate(make_pipe(model, num, cat), X, y, cv=cv, scoring=["neg_mean_absolute_error", "r2"])
            comparison.append({"stage": key, "model": name, "mae": r(-s["test_neg_mean_absolute_error"].mean(), 3), "r2": r(s["test_r2"].mean(), 3)})
            print(f"  {st['label']:14s} {name:18s} MAE={-s['test_neg_mean_absolute_error'].mean():.2f} R2={s['test_r2'].mean():.3f}")

        oof = cross_val_predict(make_pipe(RidgeCV(alphas=alphas), num, cat), X, y, cv=KFold(5, shuffle=True, random_state=SEED))
        final = make_pipe(RidgeCV(alphas=alphas), num, cat).fit(X, y)
        out_stages[key] = {
            "label": st["label"],
            "features": num + cat,
            "model": export_linear(final, num, cat),
            "alpha": r(final.named_steps["model"].alpha_, 4),
            "oof": [r(v, 2) for v in oof],
            "oof_mae": r(mean_absolute_error(y, oof), 3),
            "oof_r2": r(r2_score(y, oof), 3),
            "encoded_cols": int(final.named_steps["pre"].transform(X.head(1)).shape[1]),
        }

    # STEP: Test an early-warning flag | Start-of-year predictions below 10, 11 or 12 flag a student, and each cut-off is checked against who actually failed (final grade under 10).
    # early-warning flag at the start of the year: predicted grade below 11 → check with the student
    early = np.array(out_stages["start"]["oof"])
    fail = y < 10
    flags = {}
    for thr in [10, 11, 12]:
        f = early < thr
        flags[str(thr)] = {
            "threshold": thr,
            "flagged": int(f.sum()),
            "caught": int((f & fail).sum()),
            "fails": int(fail.sum()),
            "confusion": {"tn": int((~f & ~fail).sum()), "fp": int((f & ~fail).sum()), "fn": int((~f & fail).sum()), "tp": int((f & fail).sum())},
        }

    # STEP: Pick demo students | Ten real students (4 who failed, 6 who passed) become presets, each with out-of-fold predictions from all three stages.
    pick = pd.concat([df[fail].sample(4, random_state=SEED), df[~fail].sample(6, random_state=SEED)]).sample(frac=1, random_state=SEED)
    samples = [
        {
            "id": f"S{int(i) + 1:03d}",
            **{c: int(row[c]) for c in base_num + ["G1", "G2"]},
            **{c: row[c] for c in cat},
            "G3": int(row.G3),
            "pred_start": out_stages["start"]["oof"][i],
            "pred_term1": out_stages["term1"]["oof"][i],
            "pred_term2": out_stages["term2"]["oof"][i],
        }
        for i, row in pick.iterrows()
    ]

    # STEP: Export everything the page needs | Stage models, the comparison, early-warning flags, grade averages by group and the grade histogram, written to src/data/models/student-performance.json.
    ys = pd.Series(y)
    mean_by = lambda col: [{"label": str(k), "value": r(ys[df[col] == k].mean(), 2), "n": int((df[col] == k).sum())} for k in sorted(df[col].unique())]
    save(
        "student-performance",
        {
            "dataset": {
                "name": "UCI Student Performance (Portuguese course)",
                "source": "https://archive.ics.uci.edu/dataset/320/student+performance",
                "rows": int(len(df)),
                "raw_cols": int(df.shape[1]),
                "mean_grade": r(y.mean(), 2),
                "zeros": int((y == 0).sum()),
                "pass_rate": r((y >= 10).mean(), 3),
                "left_out": ["sex (fairness)", "G1 and G2 at the start-of-year stage"],
            },
            "baseline_mae": r(baseline_mae, 3),
            "comparison": comparison,
            "stages": out_stages,
            "actual": [int(v) for v in y],
            "g1": [int(v) for v in df["G1"]],
            "flags": flags,
            "ranges": {c: [int(df[c].min()), int(df[c].max())] for c in base_num + ["G1", "G2"]},
            "medians": {c: int(df[c].median()) for c in base_num + ["G1", "G2"]},
            "options": {c: sorted(df[c].unique().tolist()) for c in cat},
            "samples": samples,
            "eda": {
                "grade_hist": {"bins": list(range(0, 22, 1)), "counts": np.histogram(y, bins=range(0, 22))[0].tolist()},
                "by_failures": mean_by("failures"),
                "by_studytime": mean_by("studytime"),
                "by_higher": mean_by("higher"),
                "by_school": mean_by("school"),
            },
        },
    )


# ---------------------------------------------------------------------------
# 8. Demand forecasting — Capital Bikeshare daily rentals, rolling backtest
# ---------------------------------------------------------------------------
def bike() -> None:
    # STEP: Load and prepare the days | Reads daily rentals, adds a time index, rescales temperature, humidity and wind to real units, and treats month, weekday and weather as categories.
    from sklearn.linear_model import Ridge
    from sklearn.ensemble import GradientBoostingRegressor

    print("demand-forecasting")
    d = pd.read_csv(RAW / "bike" / "day.csv", parse_dates=["dteday"])
    d["t"] = np.arange(len(d))
    d["temp_c"] = d["temp"] * 41
    d["temp_c2"] = d["temp_c"] ** 2
    d["hum_p"] = d["hum"] * 100
    d["wind"] = d["windspeed"] * 67
    for c in ["mnth", "weekday", "weathersit"]:
        d[c] = d[c].astype(int).astype(str)
    y = d["cnt"].to_numpy().astype(float)

    # STEP: Set up a rolling backtest | From an origin every week of 2012, each model trains only on earlier days and forecasts the next 14, using calendar features alone or calendar plus weather.
    cal_num, cal_cat = ["t", "holiday", "workingday"], ["mnth", "weekday"]
    w_num, w_cat = cal_num + ["temp_c", "temp_c2", "hum_p", "wind"], cal_cat + ["weathersit"]
    H = 14
    origins = list(range(365, len(d) - H, 7))  # every week of 2012

    def backtest(make, num, cat):
        fc = {}
        for o in origins:
            p = make_pipe(make(), num, cat).fit(d.iloc[:o][num + cat], y[:o])
            fc[o] = p.predict(d.iloc[o : o + H][num + cat])
        return fc

    # STEP: Backtest four forecasters | A seasonal naive baseline (repeat last week), Ridge on calendar only, Ridge with weather, and gradient boosting with weather all forecast from every origin.
    runs = {
        "Seasonal naive (last week)": {o: np.array(list(y[o - 7 : o]) * 2) for o in origins},
        "Ridge · calendar only": backtest(lambda: Ridge(1.0), cal_num, cal_cat),
        "Ridge · calendar + weather": backtest(lambda: Ridge(1.0), w_num, w_cat),
        "Gradient Boosting · calendar + weather": backtest(lambda: GradientBoostingRegressor(random_state=SEED), w_num, w_cat),
    }

    # STEP: Score the forecasts | Errors over all origins give each forecaster's MAE, WAPE and average error for each of the 14 days ahead.
    def score(fc):
        err = np.concatenate([np.abs(fc[o] - y[o : o + H]) for o in origins])
        act = np.concatenate([y[o : o + H] for o in origins])
        by_h = [r(np.mean([abs(fc[o][h] - y[o + h]) for o in origins]), 1) for h in range(H)]
        return {"mae": r(err.mean(), 1), "wape": r(err.sum() / act.sum(), 4), "by_horizon": by_h}

    comparison = []
    for name, fc in runs.items():
        s = score(fc)
        comparison.append({"model": name, "mae": s["mae"], "wape": s["wape"], "by_horizon": s["by_horizon"]})
        print(f"  {name:40s} MAE={s['mae']:.0f}  WAPE={s['wape']:.3f}")

    # STEP: Keep Ridge with weather | Ridge on calendar plus weather is the chosen model: its backtest forecasts feed the time machine, and it is refit on all days and exported for the demo.
    best = runs["Ridge · calendar + weather"]
    naive = runs["Seasonal naive (last week)"]
    timemachine = [
        {"origin": int(o), "date": str(d.dteday.iloc[o].date()), "ridge": [int(round(v)) for v in best[o]], "naive": [int(v) for v in naive[o]]}
        for o in origins
    ]

    # the most recent forecast (shortest horizon) for every 2012 day, for the sample table
    latest = {}
    for o in origins:
        for h in range(H):
            latest[o + h] = (h, float(best[o][h]))

    final = make_pipe(Ridge(1.0), w_num, w_cat).fit(d[w_num + w_cat], y)
    model_export = export_linear(final, w_num, w_cat)

    # STEP: Pick contrasting demo days | Ten 2012 days with very different conditions (hot weekday, rainy day, Hurricane Sandy, busiest day) each shown with its most recent backtest forecast.
    # sample days from 2012: very different conditions
    picks = {
        "hot weekday": d[(d.yr == 1) & (d.workingday == 1)].sort_values("temp_c").index[-3],
        "mild Saturday": d[(d.yr == 1) & (d.weekday == "6") & (d.temp_c.between(20, 26))].index[2],
        "rainy day": d[(d.yr == 1) & (d.weathersit == "3")].index[1],
        "holiday": d[(d.yr == 1) & (d.holiday == 1)].index[3],
        "Hurricane Sandy": d[d.dteday == "2012-10-29"].index[0],
        "cold winter day": d[(d.yr == 1) & (d.mnth.isin(["1", "12"]))].sort_values("temp_c").index[0],
        "busiest day": d[d.yr == 1].sort_values("cnt").index[-1],
        "spring Sunday": d[(d.yr == 1) & (d.weekday == "0") & (d.mnth == "4")].index[1],
        "misty weekday": d[(d.yr == 1) & (d.weathersit == "2") & (d.workingday == 1)].index[5],
        "autumn weekday": d[(d.yr == 1) & (d.mnth == "9") & (d.workingday == 1)].index[4],
    }
    samples = []
    for label, i in picks.items():
        row = d.loc[i]
        h, f = latest.get(int(i), (None, None))
        samples.append(
            {
                "id": str(row.dteday.date()),
                "label": label,
                "weekday": int(row.weekday),
                "mnth": int(row.mnth),
                "holiday": int(row.holiday),
                "workingday": int(row.workingday),
                "weathersit": int(row.weathersit),
                "temp_c": r(row.temp_c, 1),
                "hum_p": int(round(row.hum_p)),
                "wind": r(row.wind, 1),
                "actual": int(row.cnt),
                "forecast": int(round(f)) if f is not None else None,
                "horizon": int(h) + 1 if h is not None else None,
            }
        )

    # STEP: Export everything the page needs | Backtest settings, the comparison, the Ridge model, the time machine, samples and EDA by month, weather and weekday, written to src/data/models/demand-forecasting.json.
    monthly = d.groupby(["yr", d.dteday.dt.month])["cnt"].mean().unstack(0)
    by_weather = d.groupby("weathersit")["cnt"].agg(["mean", "count"])
    by_wd = d.groupby(d["weekday"].astype(int))[["casual", "registered"]].mean()
    save(
        "demand-forecasting",
        {
            "dataset": {
                "name": "UCI Bike Sharing (Capital Bikeshare, Washington D.C.)",
                "source": "https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset",
                "rows": int(len(d)),
                "raw_cols": 16,
                "period": [str(d.dteday.min().date()), str(d.dteday.max().date())],
                "mean_2011": int(d[d.yr == 0].cnt.mean()),
                "mean_2012": int(d[d.yr == 1].cnt.mean()),
            },
            "backtest": {"origins": len(origins), "horizon": H, "first": str(d.dteday.iloc[origins[0]].date()), "last": str(d.dteday.iloc[origins[-1]].date())},
            "comparison": comparison,
            "chosen": "Ridge · calendar + weather",
            "model": model_export,
            "t_last": int(d["t"].iloc[-1]),
            "series": {"start": str(d.dteday.iloc[0].date()), "cnt": [int(v) for v in y]},
            "timemachine": timemachine,
            "samples": samples,
            "eda": {
                "monthly": {"2011": [int(v) for v in monthly[0]], "2012": [int(v) for v in monthly[1]]},
                "by_weather": [{"label": str(k), "value": int(v["mean"]), "n": int(v["count"])} for k, v in by_weather.iterrows()],
                "by_weekday": {"casual": [int(v) for v in by_wd["casual"]], "registered": [int(v) for v in by_wd["registered"]]},
                "temp_scatter": [[r(a, 1), int(b)] for a, b in zip(d.temp_c, d.cnt)],
            },
        },
    )


# ---------------------------------------------------------------------------
# 9. Air quality — a virtual CO sensor, random vs time split, drift
# ---------------------------------------------------------------------------
def air() -> None:
    # STEP: Load and clean the sensor log | Reads the semicolon-separated UCI file with comma decimals, builds a timestamp, turns the -200 missing code into gaps and records each column's missing rate.
    from sklearn.linear_model import RidgeCV
    from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
    from sklearn.metrics import mean_absolute_error, r2_score

    print("air-quality")
    raw = pd.read_csv(RAW / "air" / "AirQualityUCI.csv", sep=";", decimal=",").dropna(how="all", axis=1).dropna(subset=["Date"])
    raw["ts"] = pd.to_datetime(raw["Date"] + " " + raw["Time"].str.replace(".", ":"), format="%d/%m/%Y %H:%M:%S")
    df = raw.replace(-200, np.nan)
    cols = ["CO(GT)", "PT08.S1(CO)", "NMHC(GT)", "C6H6(GT)", "PT08.S2(NMHC)", "NOx(GT)", "PT08.S3(NOx)", "NO2(GT)", "PT08.S4(NO2)", "PT08.S5(O3)", "T", "RH", "AH"]
    missing = [{"label": c, "rate": r(df[c].isna().mean(), 4)} for c in cols]

    # STEP: Add hour-of-day features | Keeps hours where all eight sensor and weather inputs and true CO exist, encodes the hour as sine and cosine, and sets a predict-the-mean MAE baseline.
    sensors = ["PT08.S1(CO)", "PT08.S2(NMHC)", "PT08.S3(NOx)", "PT08.S4(NO2)", "PT08.S5(O3)", "T", "RH", "AH"]
    d = df.dropna(subset=sensors + ["CO(GT)"]).copy().reset_index(drop=True)
    d["hour_sin"] = np.sin(2 * np.pi * d.ts.dt.hour / 24)
    d["hour_cos"] = np.cos(2 * np.pi * d.ts.dt.hour / 24)
    feats = sensors + ["hour_sin", "hour_cos"]
    y = d["CO(GT)"].to_numpy()
    baseline = float(np.abs(y - y.mean()).mean())

    # STEP: Compare three models two ways | Ridge, random forest and gradient boosting are each scored by MAE and R² twice: on a random 20% split and on a time split that tests from 2004-12-01 on.
    ridge = lambda: Pipeline([("pre", ColumnTransformer([("num", StandardScaler(), feats)])), ("model", RidgeCV(alphas=np.logspace(-3, 3, 20)))])
    models = {
        "Ridge regression": ridge,
        "Random Forest": lambda: RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=SEED, n_jobs=-1),
        "Gradient Boosting": lambda: GradientBoostingRegressor(random_state=SEED),
    }

    idx_tr, idx_te = train_test_split(np.arange(len(d)), test_size=0.2, random_state=SEED)
    cut = pd.Timestamp("2004-12-01")
    t_tr = (d.ts < cut).to_numpy()
    comparison = []
    for name, make in models.items():
        m1 = make().fit(d.loc[idx_tr, feats], y[idx_tr])
        p1 = m1.predict(d.loc[idx_te, feats])
        m2 = make().fit(d.loc[t_tr, feats], y[t_tr])
        p2 = m2.predict(d.loc[~t_tr, feats])
        comparison.append(
            {
                "model": name,
                "random_mae": r(mean_absolute_error(y[idx_te], p1), 3),
                "random_r2": r(r2_score(y[idx_te], p1), 3),
                "time_mae": r(mean_absolute_error(y[~t_tr], p2), 3),
                "time_r2": r(r2_score(y[~t_tr], p2), 3),
            }
        )
        print(f"  {name:18s} random MAE={comparison[-1]['random_mae']:.3f}  time MAE={comparison[-1]['time_mae']:.3f}")

    # STEP: Measure month-by-month drift | A ridge trained before December is compared, month by month, with one refit on all data before each month, measuring what regular recalibration buys.
    # drift: static model (trained before Dec) vs recalibrating every month on all data so far
    static = ridge().fit(d.loc[t_tr, feats], y[t_tr])
    months = sorted(d.loc[~t_tr, "ts"].dt.to_period("M").unique())
    drift = []
    for mth in months:
        mask = (d.ts.dt.to_period("M") == mth).to_numpy()
        before = (d.ts < mth.start_time).to_numpy()
        recal = ridge().fit(d.loc[before, feats], y[before])
        drift.append(
            {
                "month": str(mth),
                "static": r(mean_absolute_error(y[mask], static.predict(d.loc[mask, feats])), 3),
                "recalibrated": r(mean_absolute_error(y[mask], recal.predict(d.loc[mask, feats])), 3),
                "hours": int(mask.sum()),
            }
        )
    st_all = np.mean([m["static"] for m in drift])
    rc_all = np.mean([m["recalibrated"] for m in drift])
    print(f"  drift: static {st_all:.3f} vs monthly recalibration {rc_all:.3f}")

    # STEP: Predict a two-week window | The static ridge predicts every test hour, and 14 days from 2005-02-07 are kept so the page can plot actual against predicted CO hour by hour.
    test = d.loc[~t_tr].copy()
    test["pred"] = static.predict(test[feats])
    # two weeks of the test period, hour by hour
    w0 = pd.Timestamp("2005-02-07")
    win = test[(test.ts >= w0) & (test.ts < w0 + pd.Timedelta(days=14))]

    # STEP: Refit ridge, pick demo hours | Ridge is refit on all usable hours and exported as means, scales and coefficients; ten random test-period hours become the demo presets.
    final = ridge().fit(d[feats], y)
    sc: StandardScaler = final.named_steps["pre"].named_transformers_["num"]
    coefs = final.named_steps["model"].coef_
    model_export = {
        "intercept": r(final.named_steps["model"].intercept_, 6),
        "numeric": {f: {"mean": r(sc.mean_[j], 6), "scale": r(sc.scale_[j], 6), "coef": r(coefs[j], 6)} for j, f in enumerate(feats)},
        "categorical": {},
    }

    samp = test.sample(10, random_state=SEED).sort_values("ts")
    samples = [
        {
            "id": str(row.ts)[:16],
            "hour": int(row.ts.hour),
            **{s: r(row[s], 3 if s == "AH" else 1) for s in sensors},
            "actual": r(row["CO(GT)"], 1),
            "predicted": r(row["pred"], 2),
        }
        for _, row in samp.iterrows()
    ]

    # STEP: Export the JSON | Weekday and weekend hourly profiles, monthly means, a 1500-point scatter, the comparison and drift tables and the model are written to air-quality.json.
    prof = d.assign(hour=d.ts.dt.hour, weekend=d.ts.dt.dayofweek >= 5).groupby(["weekend", "hour"])["CO(GT)"].mean().unstack(0)
    monthly = d.groupby(d.ts.dt.to_period("M"))["CO(GT)"].mean()
    sc_pts = d.sample(1500, random_state=SEED)
    save(
        "air-quality",
        {
            "dataset": {
                "name": "UCI Air Quality (multi-sensor device, Italian city)",
                "source": "https://archive.ics.uci.edu/dataset/360/air+quality",
                "rows": int(len(raw)),
                "usable": int(len(d)),
                "raw_cols": 15,
                "period": [str(raw.ts.min())[:10], str(raw.ts.max())[:10]],
                "mean_co": r(y.mean(), 2),
            },
            "baseline_mae": r(baseline, 3),
            "missing": missing,
            "comparison": comparison,
            "split": {"cut": "2004-12-01", "train": int(t_tr.sum()), "test": int((~t_tr).sum())},
            "drift": drift,
            "chosen": "Ridge regression",
            "model": model_export,
            "features": feats,
            "ranges": {s: [r(d[s].quantile(0.01), 2 if s == "AH" else 1), r(d[s].quantile(0.99), 2 if s == "AH" else 1)] for s in sensors},
            "medians": {s: r(d[s].median(), 2 if s == "AH" else 1) for s in sensors},
            "samples": samples,
            "window": {"start": str(w0.date()), "ts": [str(t)[:13] for t in win.ts], "actual": [r(v, 1) for v in win["CO(GT)"]], "pred": [r(v, 2) for v in win["pred"]]},
            "eda": {
                "profile": {"Weekday": [r(v, 2) for v in prof[False]], "Weekend": [r(v, 2) for v in prof[True]]},
                "monthly": [{"label": str(k), "value": r(v, 2)} for k, v in monthly.items()],
                "scatter": [[int(a), r(b, 1)] for a, b in zip(sc_pts["PT08.S1(CO)"], sc_pts["CO(GT)"])],
            },
        },
    )


# ---------------------------------------------------------------------------
# 10. Bank churn — who to call when the retention budget is limited
# ---------------------------------------------------------------------------
def bank() -> None:
    # STEP: Load the customer file | Reads bank.csv and uses Exited (1 = the customer left) as the 0/1 target.
    print("bank-churn")
    df = pd.read_csv(RAW / "bank" / "bank.csv")
    y = df["Exited"].to_numpy()
    ys = pd.Series(y)

    # STEP: Engineer extra features | Adds age squared, a zero-balance flag, and product count and activity as categories; identifiers and Gender (for fairness) are left out of both feature sets.
    df["age2"] = df["Age"] ** 2
    df["zero_balance"] = (df["Balance"] == 0).astype(int)
    df["products"] = df["NumOfProducts"].astype(str)
    df["active"] = df["IsActiveMember"].map({0: "No", 1: "Yes"})
    # Left out: Surname and CustomerId (identifiers), Gender (fairness).
    raw_num, raw_cat = ["CreditScore", "Age", "Tenure", "Balance", "NumOfProducts", "HasCrCard", "IsActiveMember", "EstimatedSalary"], ["Geography"]
    eng_num, eng_cat = ["CreditScore", "Age", "age2", "Tenure", "Balance", "zero_balance", "EstimatedSalary"], ["Geography", "products", "active"]

    # STEP: Set up cross-validation and candidates | Stratified 5-fold CV for four variants: logistic on raw columns, logistic on engineered ones, random forest and gradient boosting, plus top-share capture helpers.
    cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
    variants = {
        "Logistic · raw columns": (LogisticRegression(max_iter=3000), raw_num, raw_cat),
        "Logistic · engineered": (LogisticRegression(max_iter=3000), eng_num, eng_cat),
        "Random Forest": (RandomForestClassifier(n_estimators=400, min_samples_leaf=5, random_state=SEED, n_jobs=-1), raw_num, raw_cat),
        "Gradient Boosting": (GradientBoostingClassifier(random_state=SEED), raw_num, raw_cat),
    }

    def capture(scores, frac):
        order = np.argsort(-scores)
        k = int(round(len(scores) * frac))
        return float(y[order[:k]].sum() / y.sum())

    def gains(scores):
        order = np.argsort(-scores)
        cum = np.cumsum(y[order])
        out = []
        for pct in range(1, 101):
            k = int(round(len(scores) * pct / 100))
            out.append({"pct": pct, "captured": r(cum[k - 1] / y.sum(), 4), "precision": r(cum[k - 1] / k, 4)})
        return out

    # STEP: Score every variant out of fold | Each pipeline gets out-of-fold churn probabilities, scored by ROC AUC and by the share of leavers caught when calling the top 10, 20 or 30% of customers.
    comparison, oof = [], {}
    for name, (model, num, cat) in variants.items():
        p = cross_val_predict(make_pipe(model, num, cat), df[num + cat], y, cv=cv, method="predict_proba")[:, 1]
        oof[name] = p
        comparison.append(
            {
                "model": name,
                "roc_auc": r(roc_auc_score(y, p)),
                "top10": r(capture(p, 0.10), 3),
                "top20": r(capture(p, 0.20), 3),
                "top30": r(capture(p, 0.30), 3),
            }
        )
        c = comparison[-1]
        print(f"  {name:24s} AUC={c['roc_auc']:.3f}  top10%={c['top10']:.3f}  top20%={c['top20']:.3f}")

    # STEP: Keep engineered logistic, pick demo customers | The engineered logistic regression is refit on all customers for export; ten real customers (5 who left, 5 who stayed) with out-of-fold scores become presets.
    chosen = "Logistic · engineered"
    final = make_pipe(LogisticRegression(max_iter=3000), eng_num, eng_cat).fit(df[eng_num + eng_cat], y)
    p_lr = oof[chosen]

    pick = pd.concat([df[y == 1].sample(5, random_state=SEED), df[y == 0].sample(5, random_state=SEED)]).sample(frac=1, random_state=SEED)
    samples = [
        {
            "id": f"C{int(i) + 1:05d}",
            "CreditScore": int(row.CreditScore),
            "Geography": row.Geography,
            "Age": int(row.Age),
            "Tenure": int(row.Tenure),
            "Balance": int(round(row.Balance)),
            "NumOfProducts": int(row.NumOfProducts),
            "IsActiveMember": int(row.IsActiveMember),
            "EstimatedSalary": int(round(row.EstimatedSalary)),
            "actual": "Left" if row.Exited == 1 else "Stayed",
            "predicted": r(p_lr[i], 3),
        }
        for i, row in pick.iterrows()
    ]

    # STEP: Export lift, gains and the model | Churn by age band and lift per score decile are computed, then metrics, the model, EDA charts and gains curves are written to bank-churn.json.
    age_band = pd.cut(df["Age"], bins=[17, 30, 40, 50, 60, 92], labels=["18–30", "31–40", "41–50", "51–60", "61+"])
    lift = []
    order = np.argsort(-p_lr)
    for dec in range(10):
        idx = order[dec * len(order) // 10 : (dec + 1) * len(order) // 10]
        lift.append({"decile": dec + 1, "rate": r(y[idx].mean(), 4), "lift": r(y[idx].mean() / y.mean(), 3)})

    save(
        "bank-churn",
        {
            "dataset": {
                "name": "Bank Customer Churn (Churn_Modelling.csv)",
                "source": "https://github.com/selva86/datasets/blob/master/Churn_Modelling.csv",
                "rows": int(len(df)),
                "raw_cols": int(df.shape[1] - 4),
                "churn_rate": r(y.mean(), 4),
                "zero_balance_share": r(df["zero_balance"].mean(), 3),
                "left_out": ["Surname", "CustomerId", "RowNumber", "Gender (fairness)"],
            },
            "validation": "Stratified 5-fold cross-validation, out-of-fold scores",
            "comparison": comparison,
            "chosen": chosen,
            "model": export_logreg(final, eng_num, eng_cat),
            "encoded_cols": int(final.named_steps["pre"].transform(df[eng_num + eng_cat].head(1)).shape[1]),
            "ranges": {c: [int(df[c].min()), int(df[c].max())] for c in ["CreditScore", "Age", "Tenure", "Balance", "EstimatedSalary"]},
            "medians": {c: int(df[c].median()) for c in ["CreditScore", "Age", "Tenure", "Balance", "EstimatedSalary"]},
            "samples": samples,
            "eda": {
                "by_products": rate_by(df, "NumOfProducts", ys),
                "by_age": [{"label": str(k), "rate": r(ys[age_band == k].mean(), 3), "n": int((age_band == k).sum())} for k in age_band.cat.categories],
                "by_geography": rate_by(df, "Geography", ys),
                "by_active": rate_by(df, "active", ys),
                "balance_hist": hist_by_group(df["Balance"], ys, np.arange(0, 260001, 20000), {0: "Stayed", 1: "Left"}),
            },
            "eval": {
                "gains": {name: gains(oof[name]) for name in [chosen, "Gradient Boosting", "Logistic · raw columns"]},
                "lift": lift,
                "roc": {name: roc_points(y, oof[name]) for name in [chosen, "Gradient Boosting"]},
            },
        },
    )


# ---------------------------------------------------------------------------
# 11. Insurance claim fraud — readable signals, and one tempting artifact
# ---------------------------------------------------------------------------
def insurance() -> None:
    # STEP: Load and clean the claims | Reads insurance_claims.csv, turns fraud_reported into a 0/1 target and replaces "?" with Unknown and a missing authorities_contacted with None.
    from sklearn.metrics import average_precision_score
    from sklearn.tree import DecisionTreeClassifier

    print("insurance-fraud")
    raw = pd.read_csv(RAW / "insurance" / "insurance_claims.csv").dropna(axis=1, how="all")
    df = raw.copy()
    y = (df["fraud_reported"] == "Y").astype(int).to_numpy()
    ys = pd.Series(y)
    for c in ["collision_type", "property_damage", "police_report_available"]:
        df[c] = df[c].replace("?", "Unknown")
    df["authorities_contacted"] = df["authorities_contacted"].fillna("None")

    # STEP: Choose claim-fact features | Eight numeric and six categorical facts about the claim; identity and profile fields like sex, age and hobbies are left out, with hobbies tested separately.
    # Left out: identity and profile fields (sex, age, zip, education, occupation, relationship, hobbies),
    # IDs, dates and locations. Hobbies are tested separately to show why.
    num = ["months_as_customer", "umbrella_limit", "injury_claim", "property_claim", "vehicle_claim", "number_of_vehicles_involved", "bodily_injuries", "witnesses"]
    cat = ["incident_severity", "incident_type", "collision_type", "authorities_contacted", "property_damage", "police_report_available"]

    # STEP: Compare six variants by cross-validation | Out-of-fold scores (stratified 5-fold) for logistic, a depth-3 tree, boosting, severity alone and two hobby variants, scored by AUC, average precision and top-20% capture.
    cv = StratifiedKFold(5, shuffle=True, random_state=SEED)

    def oof(model, n, c):
        return cross_val_predict(make_pipe(model, n, c), df[n + c], y, cv=cv, method="predict_proba")[:, 1]

    def top_capture(p, frac):
        o = np.argsort(-p)
        return float(y[o[: int(round(len(p) * frac))]].sum() / y.sum())

    variants = [
        ("Logistic Regression", "claim facts", LogisticRegression(max_iter=3000), num, cat),
        ("Decision tree (depth 3)", "claim facts", DecisionTreeClassifier(max_depth=3, random_state=SEED), num, cat),
        ("Gradient Boosting", "claim facts", GradientBoostingClassifier(random_state=SEED), num, cat),
        ("Severity only", "one column", DecisionTreeClassifier(max_depth=3, random_state=SEED), [], ["incident_severity"]),
        ("Logistic Regression", "+ hobbies", LogisticRegression(max_iter=3000), num, cat + ["insured_hobbies"]),
        ("Gradient Boosting", "+ hobbies", GradientBoostingClassifier(random_state=SEED), num, cat + ["insured_hobbies"]),
    ]
    comparison, preds = [], {}
    for name, feats, model, n, c in variants:
        p = oof(model, n, c)
        preds[(name, feats)] = p
        comparison.append(
            {
                "model": name,
                "features": feats,
                "roc_auc": r(roc_auc_score(y, p)),
                "ap": r(average_precision_score(y, p)),
                "top20": r(top_capture(p, 0.2), 3),
            }
        )
        print(f"  {name:24s} {feats:12s} AUC={comparison[-1]['roc_auc']:.3f} AP={comparison[-1]['ap']:.3f} top20%={comparison[-1]['top20']:.3f}")

    # STEP: Fit final model and tree | Logistic regression on claim facts is refit on all claims for the demo, and a depth-3 tree is fit too, with its splits turned back into raw values as a checklist.
    p_lr = preds[("Logistic Regression", "claim facts")]
    final = make_pipe(LogisticRegression(max_iter=3000), num, cat).fit(df[num + cat], y)

    # readable checklist: a depth-3 tree on the claim facts, trained on all data
    tree_pipe = make_pipe(DecisionTreeClassifier(max_depth=3, random_state=SEED), num, cat).fit(df[num + cat], y)
    names = list(tree_pipe.named_steps["pre"].get_feature_names_out())
    t = tree_pipe.named_steps["model"].tree_
    pre = tree_pipe.named_steps["pre"]
    sc: StandardScaler = pre.named_transformers_["num"]

    def describe(i):
        f = names[t.feature[i]]
        thr = t.threshold[i]
        if f.startswith("num__"):
            col = f[5:]
            j = num.index(col)
            raw_thr = thr * sc.scale_[j] + sc.mean_[j]
            return {"kind": "num", "col": col, "t": r(raw_thr, 1)}
        col, val = f[5:].split("_", 1) if False else (None, None)
        # one-hot name looks like cat__incident_severity_Major Damage
        body = f[5:]
        for c_ in cat:
            if body.startswith(c_ + "_"):
                return {"kind": "cat", "col": c_, "value": body[len(c_) + 1 :]}
        return {"kind": "num", "col": body, "t": r(thr, 2)}

    nodes = []
    for i in range(t.node_count):
        counts = t.value[i][0]
        leaf = t.children_left[i] == -1
        nodes.append({"split": None if leaf else describe(i), "l": int(t.children_left[i]), "r": int(t.children_right[i]), "p": r(counts[1] / counts.sum(), 4), "n": int(t.n_node_samples[i])})

    # STEP: Pick demo claims | Ten real claims (5 fraud, 5 legit) with their out-of-fold logistic scores become the demo presets.
    pick = pd.concat([df[y == 1].sample(5, random_state=SEED), df[y == 0].sample(5, random_state=SEED)]).sample(frac=1, random_state=SEED)
    samples = [
        {
            "id": f"CLM-{int(row.policy_number)}",
            **{c: int(row[c]) for c in num},
            **{c: row[c] for c in cat},
            "actual": "Fraud" if row.fraud_reported == "Y" else "Legit",
            "predicted": r(p_lr[i], 3),
        }
        for i, row in pick.iterrows()
    ]

    # STEP: Export the JSON | Fraud rate by hobby, a gains curve, ROC curves for three variants, the model and the tree nodes are written to insurance-fraud.json.
    hobby = df.assign(f=y).groupby("insured_hobbies")["f"].agg(["mean", "count"]).sort_values("mean", ascending=False)
    o = np.argsort(-p_lr)
    gains = [{"pct": k, "captured": r(y[o[: int(round(len(y) * k / 100))]].sum() / y.sum(), 4)} for k in range(1, 101)]
    save(
        "insurance-fraud",
        {
            "dataset": {
                "name": "Auto insurance claims (insurance_claims.csv)",
                "source": "https://data.mendeley.com/datasets/992mh7dk9y/2",
                "mirror": "https://github.com/mwitiderrick/insurancedata",
                "rows": int(len(df)),
                "raw_cols": int(raw.shape[1]),
                "fraud_rate": r(y.mean(), 3),
                "features_used": num + cat,
                "left_out": ["insured_sex", "age", "insured_zip", "insured_education_level", "insured_occupation", "insured_relationship", "insured_hobbies", "policy_number", "dates", "locations", "auto make/model"],
            },
            "validation": "Stratified 5-fold cross-validation, out-of-fold scores",
            "comparison": comparison,
            "chosen": "Logistic Regression · claim facts",
            "model": export_logreg(final, num, cat),
            "options": {c: sorted(df[c].unique().tolist()) for c in cat},
            "ranges": {c: [int(df[c].min()), int(df[c].max())] for c in num},
            "medians": {c: int(df[c].median()) for c in num},
            "tree": {"nodes": nodes},
            "samples": samples,
            "eda": {
                "by_severity": rate_by(df, "incident_severity", ys),
                "by_type": rate_by(df, "incident_type", ys),
                "by_authorities": rate_by(df, "authorities_contacted", ys),
                "by_police_report": rate_by(df, "police_report_available", ys),
                "by_hobby": [{"label": k, "rate": r(v["mean"], 3), "n": int(v["count"])} for k, v in hobby.iterrows()],
                "claim_hist": hist_by_group(df["total_claim_amount"], ys, np.arange(0, 120001, 10000), {0: "Legit", 1: "Fraud"}),
            },
            "eval": {
                "roc": {"Claim facts": roc_points(y, p_lr), "+ hobbies": roc_points(y, preds[("Logistic Regression", "+ hobbies")]), "Severity only": roc_points(y, preds[("Severity only", "one column")])},
                "gains": gains,
                "confusion": clf_metrics(y, p_lr)["confusion"],
            },
        },
    )


# ---------------------------------------------------------------------------
# 12. Card fraud — 0.17% positives, time split, analyst review queue
# ---------------------------------------------------------------------------
def card_fraud() -> None:
    # STEP: Load transactions, add features | Reads creditcard.csv with Class as the target and adds hour of day and log amount; the model uses the 28 anonymised V columns plus log_amount.
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.metrics import average_precision_score, precision_recall_curve

    print("bank-fraud")
    df = pd.read_csv(RAW / "creditcard" / "creditcard.csv")
    y = df["Class"].to_numpy()
    df["hour"] = (df["Time"] // 3600) % 24
    df["log_amount"] = np.log1p(df["Amount"])
    vf = [f"V{i}" for i in range(1, 29)]
    feats = vf + ["log_amount"]

    # STEP: Split by time | Transactions up to the 70% time quantile train the models and later ones test them, so every model is judged on transactions that came after its training data.
    cut = float(df["Time"].quantile(0.7))
    tr = (df["Time"] <= cut).to_numpy()
    te = ~tr
    yte = y[te]
    hours_test = float((df.loc[te, "Time"].max() - df.loc[te, "Time"].min()) / 3600)

    # STEP: Train and compare four models | Balanced and plain logistic regression, random forest and balanced hist gradient boosting, scored by average precision, ROC AUC and frauds caught in the top 50 to 500.
    lr_bal = Pipeline([("pre", ColumnTransformer([("num", StandardScaler(), feats)])), ("model", LogisticRegression(max_iter=3000, class_weight="balanced"))])
    models = {
        "Logistic (class-balanced)": lr_bal,
        "Logistic (plain)": Pipeline([("pre", ColumnTransformer([("num", StandardScaler(), feats)])), ("model", LogisticRegression(max_iter=3000))]),
        "Random Forest": RandomForestClassifier(n_estimators=200, min_samples_leaf=2, random_state=SEED, n_jobs=-1),
        "Hist Gradient Boosting (balanced)": HistGradientBoostingClassifier(random_state=SEED, class_weight="balanced"),
    }
    comparison, scores = [], {}
    for name, m in models.items():
        m.fit(df.loc[tr, feats], y[tr])
        p = m.predict_proba(df.loc[te, feats])[:, 1]
        scores[name] = p
        o = np.argsort(-p)
        caught = {str(k): int(yte[o[:k]].sum()) for k in [50, 100, 200, 500]}
        comparison.append({"model": name, "ap": r(average_precision_score(yte, p)), "roc_auc": r(roc_auc_score(yte, p)), "caught": caught})
        print(f"  {name:34s} AP={comparison[-1]['ap']:.3f} AUC={comparison[-1]['roc_auc']:.3f} caught@100={caught['100']} @200={caught['200']}")

    # STEP: Keep balanced logistic, build the queue | The class-balanced logistic is kept; frauds caught are counted down its ranked review queue (and the random forest's), and its scaler and weights are exported.
    chosen = "Logistic (class-balanced)"
    p = scores[chosen]
    order = np.argsort(-p)
    cum = np.cumsum(yte[order])
    steps = list(range(1, 51)) + list(range(60, 1001, 10))
    queue = [{"n": n, "caught": int(cum[n - 1])} for n in steps]
    queue_rf = [{"n": n, "caught": int(np.cumsum(yte[np.argsort(-scores['Random Forest'])])[n - 1])} for n in steps]

    def pr_pts(sc, n=60):
        pr, rc, _ = precision_recall_curve(yte, sc)
        idx = np.unique(np.linspace(0, len(pr) - 1, n).astype(int))
        return [[r(rc[i], 3), r(pr[i], 3)] for i in idx]

    # explanation model export (same pipeline as the queue)
    sc_: StandardScaler = lr_bal.named_steps["pre"].named_transformers_["num"]
    coefs = lr_bal.named_steps["model"].coef_[0]
    model_export = {
        "intercept": r(lr_bal.named_steps["model"].intercept_[0], 6),
        "numeric": {f: {"mean": r(sc_.mean_[j], 6), "scale": r(sc_.scale_[j], 6), "coef": r(coefs[j], 6)} for j, f in enumerate(feats)},
        "categorical": {},
    }

    # STEP: Pick demo transactions | Five test frauds spread across the score ranking, two high-scoring legit and three random legit transactions become demo presets with their score and rank.
    test = df.loc[te].copy()
    test["score"] = p
    test["rank"] = pd.Series(p).rank(ascending=False, method="first").astype(int).to_numpy()
    frauds = test[test.Class == 1].sort_values("score", ascending=False)
    legit = test[test.Class == 0].sort_values("score", ascending=False)
    pick = pd.concat(
        [
            frauds.iloc[[0, len(frauds) // 4, len(frauds) // 2, (3 * len(frauds)) // 4, len(frauds) - 1]],
            legit.iloc[[0, 50]],
            legit.sample(3, random_state=SEED),
        ]
    ).sort_values("score", ascending=False)
    samples = [
        {
            "id": f"TX-{int(i)}",
            "hour": int(row.hour),
            "amount": r(row.Amount, 2),
            **{f: r(row[f], 4) for f in vf},
            "score": r(row.score, 4),
            "rank": int(row["rank"]),
            "actual": "Fraud" if row.Class == 1 else "Legit",
        }
        for i, row in pick.iterrows()
    ]

    # STEP: Export EDA and curves | Univariate AUC per V column, fraud by hour and amount, precision-recall curves and both review queues are written to bank-fraud.json.
    # EDA
    uni = sorted(
        [{"feature": f, "auc": r(max(roc_auc_score(y, df[f]), 1 - roc_auc_score(y, df[f])), 3)} for f in vf],
        key=lambda d: -d["auc"],
    )
    per_hour = df.assign(h=(df.Time // 3600).astype(int)).groupby("h").agg(tx=("Class", "size"), fraud=("Class", "sum"))
    by_hod = df.groupby("hour")["Class"].agg(["mean", "size"])
    save(
        "bank-fraud",
        {
            "dataset": {
                "name": "Credit Card Fraud Detection (ULB × Worldline)",
                "source": "https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud",
                "download": "https://storage.googleapis.com/download.tensorflow.org/data/creditcard.csv",
                "license": "Open Data Commons DbCL 1.0",
                "rows": int(len(df)),
                "frauds": int(y.sum()),
                "fraud_rate": r(y.mean(), 5),
                "hours": r(df.Time.max() / 3600, 1),
            },
            "split": {"cut_hours": r(cut / 3600, 1), "train": int(tr.sum()), "test": int(te.sum()), "test_frauds": int(yte.sum()), "test_hours": r(hours_test, 1)},
            "comparison": comparison,
            "chosen": chosen,
            "model": model_export,
            "queue": queue,
            "queue_rf": queue_rf,
            "samples": samples,
            "eda": {
                "amount_hist": hist_by_group(np.log10(df["Amount"] + 1), pd.Series(y), np.arange(0, 4.6, 0.25), {0: "Legit", 1: "Fraud"}),
                "per_hour": {"tx": [int(v) for v in per_hour.tx], "fraud": [int(v) for v in per_hour.fraud]},
                "fraud_rate_by_hour": [{"label": int(h), "rate": r(v["mean"], 5), "n": int(v["size"])} for h, v in by_hod.iterrows()],
                "univariate_auc": uni[:10],
                "amount_median": {"Legit": r(df.Amount[y == 0].median(), 2), "Fraud": r(df.Amount[y == 1].median(), 2)},
                "small_share": {"Legit": r((df.Amount[y == 0] <= 1).mean(), 3), "Fraud": r((df.Amount[y == 1] <= 1).mean(), 3)},
            },
            "eval": {
                "pr": {name: pr_pts(sc) for name, sc in scores.items() if name != "Logistic (plain)"},
                "base_rate": r(yte.mean(), 5),
            },
        },
    )


# ---------------------------------------------------------------------------
# 13. Product recommender — "bought this, also bought", hide-one-item test
# ---------------------------------------------------------------------------
def retail() -> None:
    # STEP: Load and clean the orders | Reads the Online Retail file, then drops cancelled invoices, non-positive quantities or prices and non-product codes such as postage and fees.
    print("product-recommender")
    cache = RAW / "retail" / "online_retail.pkl"
    df = pd.read_pickle(cache) if cache.exists() else pd.read_excel(RAW / "retail" / "online_retail.xlsx")
    raw_rows = int(len(df))
    cancel = df["InvoiceNo"].astype(str).str.startswith("C")
    d = df[~cancel & (df.Quantity > 0) & (df.UnitPrice > 0) & df.Description.notna()].copy()
    d["StockCode"] = d["StockCode"].astype(str)
    nonprod = d["StockCode"].str.match(r"^(POST|DOT|M|D|C2|BANK CHARGES|AMAZONFEE|S|PADS|B|CRUK|gift_.*)$")
    d = d[~nonprod]
    d["InvoiceNo"] = d["InvoiceNo"].astype(str)
    clean = {"rows": int(len(d)), "cancelled_rows": int(cancel.sum()), "invoices": int(d.InvoiceNo.nunique()), "products": int(d.StockCode.nunique()), "countries": int(d.Country.nunique())}
    print(f"  clean rows {clean['rows']}  invoices {clean['invoices']}  products {clean['products']}")

    # STEP: Build baskets, split by date | Each invoice becomes a basket of distinct products, with baskets before 2011-10-01 used for training and later ones for testing.
    names = d.groupby("StockCode")["Description"].agg(lambda s: s.mode().iloc[0]).str.strip()
    prices = d.groupby("StockCode")["UnitPrice"].median()
    inv_date = d.groupby("InvoiceNo")["InvoiceDate"].min()

    cut = pd.Timestamp("2011-10-01")
    train_inv = set(inv_date[inv_date < cut].index)
    baskets = d.groupby("InvoiceNo")["StockCode"].apply(lambda s: sorted(set(s)))
    tr_b = baskets[baskets.index.isin(train_inv)]
    te_b = baskets[~baskets.index.isin(train_inv)]

    # STEP: Score co-purchases | For the 300 most-bought products, a basket-by-item matrix gives co-occurrence counts, turned into confidence P(B given A), lift and cosine similarity.
    N = 300
    counts = pd.Series([c for b in tr_b for c in b]).value_counts()
    items = list(counts.index[:N])
    idx = {c: i for i, c in enumerate(items)}
    # basket × item matrix → co-occurrence counts
    rows, cols = [], []
    for bi, b in enumerate(tr_b):
        for c in b:
            j = idx.get(c)
            if j is not None:
                rows.append(bi)
                cols.append(j)
    from scipy.sparse import csr_matrix

    X = csr_matrix((np.ones(len(rows)), (rows, cols)), shape=(len(tr_b), N))
    co = (X.T @ X).toarray()
    n_item = np.diag(co).copy()
    n_b = len(tr_b)
    np.fill_diagonal(co, 0)
    conf = co / n_item[:, None]  # P(B | A), row = A
    lift = conf / (n_item[None, :] / n_b)
    cos = co / np.sqrt(n_item[:, None] * n_item[None, :])
    pop = n_item / n_b

    # STEP: Run the hide-one-item test | One item is hidden from each test basket with 2+ catalog items; the method whose top 5 most often contains it wins, with plain popularity as the baseline to beat.
    methods = {"Most popular": None, "Co-purchase (confidence)": conf, "Lift": lift, "Cosine similarity": cos}

    def scores(basket_idx, M):
        s = pop.copy() if M is None else M[basket_idx].sum(axis=0)
        s[basket_idx] = -np.inf
        return s

    def ranking(basket_idx, M):
        # score first, popularity breaks ties (the browser sorts the same way)
        return np.lexsort((-pop, -scores(basket_idx, M)))

    def recommend(basket_idx, M, k):
        return ranking(basket_idx, M)[:k]

    rng = np.random.default_rng(SEED)
    tests = []
    for inv, b in te_b.items():
        bi = [idx[c] for c in b if c in idx]
        if len(bi) >= 2:
            hide = bi[int(rng.integers(len(bi)))]
            tests.append((inv, [i for i in bi if i != hide], hide))

    def hit(M, k, subset=None):
        sub = tests if subset is None else subset
        return float(np.mean([h in recommend(g, M, k) for _, g, h in sub]))

    comparison = []
    for name, M in methods.items():
        comparison.append({"model": name, "hit5": r(hit(M, 5), 4), "hit10": r(hit(M, 10), 4)})
        print(f"  {name:26s} hit@5={comparison[-1]['hit5']:.3f} hit@10={comparison[-1]['hit10']:.3f}")
    best = max(comparison[1:], key=lambda c: c["hit5"])["model"]

    # STEP: Trim to 20 neighbours per product | Only each product's 20 strongest neighbours under the winning method are kept and rounded, then re-tested as shipped and broken down by basket size.
    # what ships to the browser: top-K neighbours per product, rounded; evaluated as shipped
    K = 20
    M = np.zeros_like(methods[best])
    for i in range(N):
        o = np.lexsort((-pop, -methods[best][i]))[:K]
        M[i, o] = np.round(methods[best][i, o], 4)
    shipped = {"k": K, "hit5": r(hit(M, 5), 4), "hit10": r(hit(M, 10), 4)}
    print(f"  shipped top-{K}            hit@5={shipped['hit5']:.3f} hit@10={shipped['hit10']:.3f}")

    # hit rate by how many items we already know
    by_size = []
    for lo, hi_, lab in [(1, 1, "1"), (2, 3, "2–3"), (4, 9, "4–9"), (10, 999, "10+")]:
        sub = [t for t in tests if lo <= len(t[1]) <= hi_]
        if sub:
            by_size.append({"label": lab, "n": len(sub), "model": r(hit(M, 5, sub), 4), "popular": r(hit(None, 5, sub), 4)})

    neighbors = []
    for i in range(N):
        o = [j for j in np.lexsort((-pop, -M[i]))[:K] if M[i, j] > 0]
        neighbors.append([[int(j), int(co[i, j]), float(M[i, j])] for j in o])

    def title(s):
        return " ".join(w.capitalize() if len(w) > 2 else w.lower() for w in str(s).split())

    catalog = [{"id": c, "name": title(names.get(c, c)), "price": r(prices.get(c, 0), 2), "baskets": int(n_item[i])} for i, c in enumerate(items)]

    # STEP: Pick demo baskets | Eight test baskets with 3 to 8 known items are drawn at random, storing the hidden item's rank and the top 5 recommendations.
    # sample test baskets for the "try it" table
    rng2 = np.random.default_rng(SEED + 1)
    cand = [t for t in tests if 3 <= len(t[1]) <= 8]
    pick = [cand[i] for i in rng2.choice(len(cand), size=8, replace=False)]
    samples = []
    for inv, given, hide in pick:
        sc = scores(given, M)
        rank = int(list(ranking(given, M)).index(hide)) + 1 if sc[hide] > 0 else None
        samples.append(
            {
                "id": f"INV-{inv}",
                "date": str(inv_date[inv].date()),
                "items": len(given) + 1,
                "given": [int(g) for g in given],
                "hidden": int(hide),
                "hit": bool(rank is not None and rank <= 5),
                "rank": rank,
                "top5": [int(j) for j in recommend(given, M, 5)],
            }
        )

    # STEP: Export the JSON | Monthly invoices, top countries, basket sizes and top products, plus the catalog and neighbour lists, are written to product-recommender.json.
    monthly = d.groupby(d.InvoiceDate.dt.to_period("M"))["InvoiceNo"].nunique()
    by_country = d.groupby("Country")["InvoiceNo"].nunique().sort_values(ascending=False)
    bsize = baskets.apply(len)
    by_dow = d.drop_duplicates("InvoiceNo").groupby(d.drop_duplicates("InvoiceNo").InvoiceDate.dt.dayofweek)["InvoiceNo"].count()
    save(
        "product-recommender",
        {
            "dataset": {
                "name": "UCI Online Retail (UK online gift retailer)",
                "source": "https://archive.ics.uci.edu/dataset/352/online+retail",
                "license": "CC BY 4.0",
                "raw_rows": raw_rows,
                "period": [str(df.InvoiceDate.min().date()), str(df.InvoiceDate.max().date())],
                **clean,
            },
            "split": {"cut": str(cut.date()), "train_baskets": int(n_b), "test_baskets": int(len(te_b)), "tests": len(tests)},
            "catalog_size": N,
            "coverage": r(float(d.StockCode.isin(items).mean()), 3),
            "comparison": comparison,
            "chosen": best,
            "shipped": shipped,
            "by_size": by_size,
            "catalog": catalog,
            "neighbors": neighbors,
            "samples": samples,
            "eda": {
                "monthly": [{"label": str(k), "value": int(v)} for k, v in monthly.items()],
                "countries": [{"label": k, "value": int(v)} for k, v in by_country.head(8).items()],
                "uk_share": r(by_country.get("United Kingdom", 0) / by_country.sum(), 3),
                "basket_hist": [
                    {"label": lab, "value": int(((bsize >= lo) & (bsize < hi_)).sum())}
                    for lo, hi_, lab in [(1, 5, "1–4"), (5, 10, "5–9"), (10, 20, "10–19"), (20, 30, "20–29"), (30, 50, "30–49"), (50, 100, "50–99"), (100, 200, "100–199"), (200, 10**6, "200+")]
                ],
                "basket_median": int(bsize.median()),
                "basket_max": int(bsize.max()),
                "by_dow": {str(int(k)): int(v) for k, v in by_dow.items()},
                "top_products": [{"label": title(names[c]), "value": int(counts[c])} for c in items[:10]],
            },
        },
    )


# ---------------------------------------------------------------------------
# 14. Complaint router — BANKING77 text → intent → team, character n-grams
# ---------------------------------------------------------------------------
B77_TEAMS = {
    "Cards & delivery": [
        "activate_my_card", "card_arrival", "card_delivery_estimate", "card_linking", "card_about_to_expire",
        "get_physical_card", "order_physical_card", "getting_spare_card", "getting_virtual_card",
        "get_disposable_virtual_card", "disposable_card_limits", "virtual_card_not_working", "visa_or_mastercard",
    ],
    "Card security": [
        "lost_or_stolen_card", "compromised_card", "card_not_working", "contactless_not_working", "card_swallowed",
        "pin_blocked", "change_pin", "passcode_forgotten", "lost_or_stolen_phone", "card_acceptance", "apple_pay_or_google_pay",
    ],
    "Payments & disputes": [
        "card_payment_fee_charged", "card_payment_not_recognised", "card_payment_wrong_exchange_rate", "declined_card_payment",
        "pending_card_payment", "reverted_card_payment?", "transaction_charged_twice", "extra_charge_on_statement",
        "direct_debit_payment_not_recognised", "request_refund", "Refund_not_showing_up",
    ],
    "Cash & ATM": [
        "atm_support", "cash_withdrawal_charge", "cash_withdrawal_not_recognised", "declined_cash_withdrawal",
        "pending_cash_withdrawal", "wrong_amount_of_cash_received", "wrong_exchange_rate_for_cash_withdrawal",
    ],
    "Transfers": [
        "beneficiary_not_allowed", "cancel_transfer", "declined_transfer", "failed_transfer", "pending_transfer",
        "transfer_fee_charged", "transfer_into_account", "transfer_not_received_by_recipient", "transfer_timing",
        "receiving_money", "balance_not_updated_after_bank_transfer",
    ],
    "Top-ups": [
        "automatic_top_up", "pending_top_up", "top_up_by_bank_transfer_charge", "top_up_by_card_charge",
        "top_up_by_cash_or_cheque", "top_up_failed", "top_up_limits", "top_up_reverted", "topping_up_by_card",
        "verify_top_up", "balance_not_updated_after_cheque_or_cash_deposit",
    ],
    "Exchange & currency": [
        "exchange_charge", "exchange_rate", "exchange_via_app", "fiat_currency_support", "supported_cards_and_currencies",
        "country_support",
    ],
    "Account & identity": [
        "age_limit", "edit_personal_details", "terminate_account", "unable_to_verify_identity", "verify_my_identity",
        "verify_source_of_funds", "why_verify_identity",
    ],
}


def complaints() -> None:
    # STEP: Load BANKING77 and map teams | Loads the train and test CSVs, checks all 77 intents map to a team in B77_TEAMS, and sets up word and character n-gram TF-IDF helpers.
    import base64

    from scipy import sparse
    from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
    from sklearn.metrics import f1_score
    from sklearn.naive_bayes import ComplementNB
    from sklearn.svm import LinearSVC

    print("complaint-router")
    tr = pd.read_csv(RAW / "banking77" / "train.csv")
    te = pd.read_csv(RAW / "banking77" / "test.csv")
    team_names = list(B77_TEAMS)
    team_of = {i: t for t, intents in B77_TEAMS.items() for i in intents}
    assert set(team_of) == set(tr.category) == set(te.category) and len(team_of) == 77
    X, y, Xt, yt = tr.text, tr.category.to_numpy(), te.text, te.category.to_numpy()
    yt_team = np.array([team_of[i] for i in yt])

    def pretty(intent: str) -> str:
        s = intent.replace("?", "").replace("_", " ").strip().lower()
        s = s[0].upper() + s[1:]
        for a, b in [("Atm", "ATM"), (" pin", " PIN"), ("Pin ", "PIN "), ("Apple pay", "Apple Pay"), ("google pay", "Google Pay"), ("visa", "Visa"), ("mastercard", "Mastercard")]:
            s = s.replace(a, b)
        return s

    def char(**kw):
        return TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True, min_df=2, **kw)

    def word(**kw):
        return TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=2, **kw)

    # STEP: Tune regularisation on training data | C is chosen from 3, 10 and 30 by 3-fold cross-validation of character n-gram logistic regression on the training set only, never on the test set.
    # regularisation picked on the training data only (3-fold CV), never on the test set
    cv3 = StratifiedKFold(3, shuffle=True, random_state=SEED)
    cv_scores = {}
    for C in [3, 10, 30]:
        cv_scores[C] = float(cross_val_score(Pipeline([("v", char()), ("m", LogisticRegression(C=C, max_iter=3000))]), X, y, cv=cv3).mean())
        print(f"  CV C={C}: {cv_scores[C]:.4f}")
    C = max(cv_scores, key=cv_scores.get)

    # STEP: Compare four text classifiers | Naive Bayes, linear SVM and logistic regression on words, plus logistic on character 2–5 grams, scored on test by accuracy, macro F1, top-3 and team accuracy.
    def scores_of(m, texts):
        return m.predict_proba(texts) if hasattr(m, "predict_proba") else m.decision_function(texts)

    def metrics(classes, S, truth):
        cls = np.asarray(classes)
        top = np.argsort(-S, axis=1)
        pred = cls[top[:, 0]]
        top3 = np.mean([truth[i] in cls[top[i, :3]] for i in range(len(truth))])
        return pred, {
            "acc": r(np.mean(pred == truth), 4),
            "macro_f1": r(f1_score(truth, pred, average="macro"), 4),
            "top3": r(top3, 4),
            "team_acc": r(np.mean(np.array([team_of[p] for p in pred]) == np.array([team_of[t] for t in truth])), 4),
        }

    models = {
        "Naive Bayes · words": Pipeline([("v", TfidfVectorizer(ngram_range=(1, 2), min_df=2)), ("m", ComplementNB())]),
        "Linear SVM · words": Pipeline([("v", word()), ("m", LinearSVC(C=1))]),
        "Logistic · words": Pipeline([("v", word()), ("m", LogisticRegression(C=C, max_iter=3000))]),
        "Logistic · character n-grams": Pipeline([("v", char()), ("m", LogisticRegression(C=C, max_iter=3000))]),
    }
    comparison = []
    for name, m in models.items():
        m.fit(X, y)
        _, met = metrics(m.classes_, scores_of(m, Xt), yt)
        comparison.append({"model": name, **met, "features": int(len(m.named_steps["v"].vocabulary_))})
        print(f"  {name:30s} acc={met['acc']:.4f} f1={met['macro_f1']:.4f} top3={met['top3']:.4f} team={met['team_acc']:.4f}")
    # STEP: Shrink the model to int8 | Keeps the 60 strongest n-grams per intent, refits on them, stores the weights as int8 and re-scores the test set exactly as the browser will compute it.
    chosen = "Logistic · character n-grams"
    full = models[chosen]

    # what ships: the strongest n-grams per intent, refit, weights stored as int8 per intent
    K = 60
    sel = sorted(set(np.argsort(-np.abs(full.named_steps["m"].coef_), axis=1)[:, :K].ravel()))
    names = [str(s) for s in full.named_steps["v"].get_feature_names_out()[sel]]
    v2 = char(vocabulary=names)
    lr2 = LogisticRegression(C=C, max_iter=3000).fit(v2.fit_transform(X), y)
    classes = [str(c) for c in lr2.classes_]
    idf = np.round(v2.idf_, 5)
    scale = np.array([float(f"{s:.8g}") for s in np.abs(lr2.coef_).max(axis=1) / 127])
    q = np.round(lr2.coef_ / scale[:, None]).astype(np.int8)
    b = np.round(lr2.intercept_, 5)
    Wq = q.astype(float) * scale[:, None]
    counter = CountVectorizer(analyzer="char_wb", ngram_range=(2, 5), vocabulary=names)

    def ship_logits(texts):
        """Exactly what the browser computes: counts, 1 + ln(tf), times idf, L2 norm, int8 weights."""
        M = counter.transform(texts).astype(float).tocsr()
        M.data = 1 + np.log(M.data)
        M = M.multiply(idf[None, :]).tocsr()
        norms = np.sqrt(np.asarray(M.multiply(M).sum(axis=1)).ravel())
        norms[norms == 0] = 1
        return np.asarray((sparse.diags(1 / norms) @ M) @ Wq.T) + b

    L = ship_logits(Xt)
    P = np.exp(L - L.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    pred, shipped_met = metrics(classes, P, yt)
    shipped = {"k": K, "ngrams": len(names), "bytes": int(q.size), **shipped_met}
    print(f"  shipped ({len(names)} n-grams, int8)  acc={shipped['acc']:.4f} top3={shipped['top3']:.4f} team={shipped['team_acc']:.4f}")
    # STEP: Check confidence and mistakes | Measures accuracy against coverage at each confidence threshold, the 10 most common mix-ups, team-level confusion and a learning curve on 10% to 100% of the training data.
    pred_team = np.array([team_of[p] for p in pred])
    conf = P.max(axis=1)

    confidence = []
    for t in np.round(np.arange(0, 0.951, 0.05), 2):
        m_ = conf >= t
        confidence.append(
            {
                "t": float(t),
                "coverage": r(m_.mean(), 4),
                "acc": r((pred[m_] == yt[m_]).mean() if m_.any() else 1, 4),
                "team_acc": r((pred_team[m_] == yt_team[m_]).mean() if m_.any() else 1, 4),
            }
        )

    pairs = pd.Series([(a, p) for a, p in zip(yt, pred) if a != p]).value_counts().head(10)
    pair_list = [{"actual": classes.index(a), "predicted": classes.index(p), "n": int(n)} for (a, p), n in pairs.items()]
    team_conf = [[int(((yt_team == a) & (pred_team == p)).sum()) for p in team_names] for a in team_names]
    team_f1 = f1_score(yt_team, pred_team, labels=team_names, average=None)

    # learning curve: same recipe, less labelled data
    learning = []
    for frac in [0.1, 0.25, 0.5, 1.0]:
        idx = tr.groupby("category", group_keys=False).sample(frac=frac, random_state=SEED).index if frac < 1 else tr.index
        m = Pipeline([("v", char()), ("m", LogisticRegression(C=C, max_iter=3000))]).fit(X[idx], y[idx])
        learning.append({"n": int(len(idx)), "acc": r(np.mean(m.predict(Xt) == yt), 4)})
        print(f"  learning n={len(idx)} acc={learning[-1]['acc']:.4f}")

    # STEP: Pick demo queries | Eight random test queries plus the two most confident mistakes become presets, each with its top 3 intents and whether the team was right.
    # sample test queries: a random draw plus the two most confident mistakes
    rng = np.random.default_rng(SEED)
    pick = [int(i) for i in rng.choice(len(te), size=8, replace=False)]
    wrong = np.where(pred != yt)[0]
    worst = [int(i) for i in wrong[np.argsort(-conf[wrong])][:2]]
    pick += [i for i in worst if i not in pick]
    top3 = np.argsort(-P, axis=1)[:, :3]
    samples = [
        {
            "id": f"Q-{i + 1:04d}",
            "text": str(Xt.iloc[i]),
            "actual": classes.index(yt[i]),
            "predicted": classes.index(pred[i]),
            "p": r(conf[i], 4),
            "top3": [[int(j), r(P[i, j], 4)] for j in top3[i]],
            "correct": bool(pred[i] == yt[i]),
            "team_correct": bool(pred_team[i] == yt_team[i]),
            "kind": "mistake" if i in worst else "random",
        }
        for i in pick
    ]

    # STEP: Export the JSON | Word-count and per-intent histograms, the most telling words per team and the int8 model are written to complaint-router.json.
    # EDA
    wc = tr.text.str.split().str.len()
    word_bins = [(1, 5, "1–4"), (5, 9, "5–8"), (9, 13, "9–12"), (13, 17, "13–16"), (17, 25, "17–24"), (25, 10**4, "25+")]
    per_intent = tr.category.value_counts()
    cv_words = CountVectorizer(stop_words="english", min_df=10)
    Wc = cv_words.fit_transform(tr.text)
    vocab_w = cv_words.get_feature_names_out()
    tr_team = tr.category.map(team_of).to_numpy()
    telling = {}
    for t in team_names:
        a = np.asarray(Wc[tr_team == t].sum(axis=0)).ravel() + 1
        bb = np.asarray(Wc[tr_team != t].sum(axis=0)).ravel() + 1
        s = np.log(a / a.sum()) - np.log(bb / bb.sum())
        telling[t] = [str(vocab_w[j]) for j in np.argsort(-s)[:6]]

    save(
        "complaint-router",
        {
            "dataset": {
                "name": "BANKING77 (PolyAI)",
                "source": "https://github.com/PolyAI-LDN/task-specific-datasets",
                "paper": "Casanueva et al., Efficient Intent Detection with Dual Sentence Encoders, NLP for ConvAI workshop at ACL 2020",
                "license": "CC BY 4.0",
                "train": int(len(tr)),
                "test": int(len(te)),
                "intents": 77,
                "teams": len(team_names),
                "words_median": int(wc.median()),
            },
            "teams": [{"name": t, "intents": [classes.index(i) for i in B77_TEAMS[t]]} for t in team_names],
            "labels": [pretty(c) for c in classes],
            "cv": {"folds": 3, "scores": {str(k): r(v, 4) for k, v in cv_scores.items()}, "C": C},
            "comparison": comparison,
            "chosen": chosen,
            "shipped": shipped,
            "model": {
                "ngram": [2, 5],
                "vocab": names,
                "idf": [float(v) for v in idf],
                "classes": classes,
                "team": [team_names.index(team_of[c]) for c in classes],
                "scale": [float(s) for s in scale],
                "b": [float(v) for v in b],
                "q": base64.b64encode(q.tobytes()).decode("ascii"),
            },
            "confidence": confidence,
            "pairs": pair_list,
            "team_confusion": team_conf,
            "team_f1": [{"team": t, "f1": r(f, 4), "n": int((yt_team == t).sum())} for t, f in zip(team_names, team_f1)],
            "learning": learning,
            "samples": samples,
            "eda": {
                "per_intent": {"min": int(per_intent.min()), "max": int(per_intent.max()), "min_label": pretty(per_intent.idxmin()), "max_label": pretty(per_intent.idxmax())},
                "per_intent_hist": [{"label": f"{lo}–{hi_ - 1}", "value": int(((per_intent >= lo) & (per_intent < hi_)).sum())} for lo, hi_ in [(30, 60), (60, 90), (90, 120), (120, 150), (150, 190)]],
                "words_hist": [{"label": lab, "value": int(((wc >= lo) & (wc < hi_)).sum())} for lo, hi_, lab in word_bins],
                "per_team": [{"label": t, "value": int((tr_team == t).sum()), "intents": len(B77_TEAMS[t])} for t in team_names],
                "telling": telling,
            },
        },
    )


# ---------------------------------------------------------------------------
# 15. Uplift promo — Hillstrom randomised e-mail test, who should get which e-mail
# ---------------------------------------------------------------------------
def uplift() -> None:
    # STEP: Load the e-mail experiment | Reads the Hillstrom file, fixes a zip-code typo, log-transforms past spend and maps each customer to an arm: no e-mail, men's e-mail or women's e-mail.
    from sklearn.ensemble import HistGradientBoostingClassifier

    print("uplift-promo")
    d = pd.read_csv(RAW / "hillstrom" / "hillstrom.csv")
    d["zip_code"] = d["zip_code"].replace({"Surburban": "Suburban"})  # typo in the source file
    d["log_history"] = np.log1p(d["history"])
    arm_of = {"No E-Mail": "none", "Mens E-Mail": "mens", "Womens E-Mail": "womens"}
    d["arm"] = d["segment"].map(arm_of)
    arms = ["none", "mens", "womens"]
    num = ["recency", "log_history", "mens", "womens", "newbie"]
    cat = ["zip_code", "channel"]
    feats = num + cat
    y = d["visit"].to_numpy()
    a = d["arm"].to_numpy()
    N = len(d)
    share = {k: float((a == k).mean()) for k in arms}

    # STEP: Measure average and subgroup effects | Because e-mails were assigned at random, a difference in means against the no-e-mail group is causal; effects get 95% intervals overall and per subgroup.
    # average effects with 95% intervals (randomised, so a difference in means is causal)
    def diff(col, t, sub=None):
        m = np.ones(N, bool) if sub is None else sub
        xt, xc = d.loc[m & (a == t), col], d.loc[m & (a == "none"), col]
        e = xt.mean() - xc.mean()
        se = np.sqrt(xt.var(ddof=1) / len(xt) + xc.var(ddof=1) / len(xc))
        return [r(e, 5), r(e - 1.96 * se, 5), r(e + 1.96 * se, 5)]

    rates = {k: {"visit": r(d.visit[a == k].mean(), 4), "conversion": r(d.conversion[a == k].mean(), 5), "spend": r(d.spend[a == k].mean(), 3), "n": int((a == k).sum())} for k in arms}
    ate = {t: {c: diff(c, t) for c in ["visit", "conversion", "spend"]} for t in ["mens", "womens"]}
    print(f"  visit rates {rates['none']['visit']} / mens {rates['mens']['visit']} / womens {rates['womens']['visit']}")

    rec_b = pd.cut(d.recency, [0, 3, 6, 9, 12], labels=["1–3 months", "4–6 months", "7–9 months", "10–12 months"])
    hist_b = pd.cut(d.history, [0, 100, 200, 500, 1e9], labels=["< $100", "$100–200", "$200–500", "$500+"])
    bought = np.where((d.mens == 1) & (d.womens == 1), "Both", np.where(d.mens == 1, "Men's only", "Women's only"))
    dims = {
        "Bought before": pd.Series(bought, index=d.index),
        "Months since last purchase": rec_b.astype(str),
        "Past spend": hist_b.astype(str),
        "Customer": pd.Series(np.where(d.newbie == 1, "New this year", "Returning"), index=d.index),
        "Channel": d.channel,
        "Area": d.zip_code,
    }
    order = {"Months since last purchase": list(rec_b.cat.categories), "Past spend": list(hist_b.cat.categories)}
    subgroups = []
    for dim, s in dims.items():
        levels = order.get(dim) or sorted(s.unique())
        subgroups.append({"dim": dim, "rows": [{"label": str(lv), "n": int((s == lv).sum()), "mens": diff("visit", "mens", (s == lv).to_numpy()), "womens": diff("visit", "womens", (s == lv).to_numpy())} for lv in levels]})

    # STEP: Predict every arm out of fold | Over stratified 5 folds it fits T-learners (a logistic and a boosting model per arm), an S-learner with arm as a feature, and a class-transformation logistic.
    # out-of-fold predictions for every customer, every arm
    def lr():
        return make_pipe(LogisticRegression(max_iter=2000), num, cat)

    def hgb():
        return make_pipe(HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=250, random_state=SEED), num, cat)

    strat = d["arm"] + "_" + d["visit"].astype(str)
    folds = list(StratifiedKFold(5, shuffle=True, random_state=SEED).split(d, strat))
    oof = {m: {k: np.zeros(N) for k in arms} for m in ["T · logistic", "T · boosting", "S · boosting"]}
    ct = {t: np.zeros(N) for t in ["mens", "womens"]}
    for tr_i, te_i in folds:
        Xtr, Xte = d.iloc[tr_i], d.iloc[te_i]
        for k in arms:
            sub = Xtr[Xtr.arm == k]
            oof["T · logistic"][k][te_i] = lr().fit(sub[feats], sub.visit).predict_proba(Xte[feats])[:, 1]
            oof["T · boosting"][k][te_i] = hgb().fit(sub[feats], sub.visit).predict_proba(Xte[feats])[:, 1]
        s_model = make_pipe(HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=250, random_state=SEED), num, cat + ["arm"]).fit(Xtr[feats + ["arm"]], Xtr.visit)
        for k in arms:
            oof["S · boosting"][k][te_i] = s_model.predict_proba(Xte[feats].assign(arm=k))[:, 1]
        for t in ["mens", "womens"]:
            sub = Xtr[Xtr.arm.isin([t, "none"])]
            z = ((sub.arm == t) & (sub.visit == 1)) | ((sub.arm == "none") & (sub.visit == 0))
            ct[t][te_i] = 2 * lr().fit(sub[feats], z.astype(int)).predict_proba(Xte[feats])[:, 1] - 1

    # STEP: Compare uplift methods by Qini | Customers are ranked by each method's predicted uplift; extra visits per 1,000 from e-mailing the top share are traced and summarised as Qini area over random.
    grid = np.round(np.linspace(0, 1, 21), 2)

    def curve(score, t):
        """Extra visits per 1,000 customers if we e-mail the top share by `score`, measured on the randomised data."""
        m = (a == t) | (a == "none")
        sc, yy, tt = score[m], y[m], (a[m] == t)
        o = np.argsort(-sc, kind="stable")
        yy, tt = yy[o], tt[o]
        n = len(sc)
        out = []
        for g in grid:
            k = int(round(g * n))
            if k == 0:
                out.append(0.0)
                continue
            nt, nc = tt[:k].sum(), (~tt[:k]).sum()
            rt = yy[:k][tt[:k]].mean() if nt else 0
            rc = yy[:k][~tt[:k]].mean() if nc else 0
            out.append(r((rt - rc) * g * 1000, 2))
        return out

    methods = {
        "T-learner · logistic": lambda t: oof["T · logistic"][t] - oof["T · logistic"]["none"],
        "T-learner · boosting": lambda t: oof["T · boosting"][t] - oof["T · boosting"]["none"],
        "S-learner · boosting": lambda t: oof["S · boosting"][t] - oof["S · boosting"]["none"],
        "Class transformation · logistic": lambda t: ct[t],
        "Response model (who visits)": lambda t: oof["T · logistic"][t],
    }
    comparison, curves = [], {}
    for name, f in methods.items():
        row = {"model": name}
        for t in ["mens", "womens"]:
            c = curve(f(t), t)
            rand = [r(g * c[-1], 2) for g in grid]
            area = float(np.trapezoid(np.array(c) - np.array(rand), grid))
            row[t] = {"qini": r(area, 2), "top30": c[6], "all": c[-1]}
            curves.setdefault(t, {})[name] = c
        comparison.append(row)
        print(f"  {name:32s} qini mens={row['mens']['qini']:6.2f} womens={row['womens']['qini']:6.2f}  top30 mens={row['mens']['top30']} womens={row['womens']['top30']}")
    chosen = "T-learner · logistic"

    # STEP: Pick one e-mail per customer | The logistic T-learner picks the e-mail with the larger predicted uplift, and targeting policies are valued by inverse propensity weighting on the randomised data.
    # one decision per customer: which e-mail, if any — evaluated by inverse propensity on the randomised data
    P = oof["T · logistic"]
    up = np.vstack([P["mens"] - P["none"], P["womens"] - P["none"]])
    best = np.where(up[0] >= up[1], "mens", "womens")
    best_up = up.max(axis=0)

    def value(policy):
        hit = a == policy
        w = np.array([1 / share[k] for k in a])
        return float((hit * y * w).sum() / N * 1000)

    rng = np.random.default_rng(SEED)
    rand_mail = rng.choice(["mens", "womens"], size=N)
    budget = []
    o = np.argsort(-best_up, kind="stable")
    resp_o = np.argsort(-np.maximum(P["mens"], P["womens"]), kind="stable")
    for q in np.round(np.linspace(0, 1, 21), 2):
        k = int(round(q * N))
        pol = np.full(N, "none", dtype=object)
        pol[o[:k]] = best[o[:k]]
        resp =np.full(N, "none", dtype=object)
        resp[resp_o[:k]] = np.where(P["mens"] >= P["womens"], "mens", "womens")[resp_o[:k]]
        budget.append({"q": float(q), "model": r(value(pol), 1), "random": r(value(_shuffle_policy(rand_mail, k, SEED)), 1), "response": r(value(resp), 1)})
    policies = {
        "Nobody": r(value(np.full(N, "none", dtype=object)), 1),
        "Everyone · men's e-mail": r(value(np.full(N, "mens", dtype=object)), 1),
        "Everyone · women's e-mail": r(value(np.full(N, "womens", dtype=object)), 1),
        "Everyone · best e-mail per customer": r(value(best.astype(object)), 1),
    }
    pick = {"mens": int((best == "mens").sum()), "womens": int((best == "womens").sum()), "negative": int((best_up <= 0).sum())}
    print(f"  policy values per 1,000: {policies}  picks {pick}")

    # STEP: Fit final models, pick samples | Three logistic regressions, one per arm, are refit on all customers for the browser; nine customers (one visitor and two non-visitors per arm) become presets.
    # final models on all data, for the browser
    final = {k: lr().fit(d.loc[a == k, feats], d.loc[a == k, "visit"]) for k in arms}
    models = {k: export_logreg(final[k], num, cat) for k in arms}

    def up_hist(v):
        bins = np.arange(-0.06, 0.205, 0.02)
        h = np.histogram(np.clip(v, bins[0], bins[-1] - 1e-9), bins=bins)[0]
        return {"bins": [r(b, 3) for b in bins], "counts": h.tolist()}

    # sample customers: one row per arm per kind of profile, with what we saw and what the model expects
    samp_idx = []
    rs = np.random.default_rng(SEED + 3)
    for k in arms:
        for vis in [1, 0]:
            pool = np.where((a == k) & (y == vis))[0]
            samp_idx += list(rs.choice(pool, size=2 if vis == 0 else 1, replace=False))
    Xs = d.iloc[samp_idx]
    ps = {k: final[k].predict_proba(Xs[feats])[:, 1] for k in arms}
    samples = []
    for j, (i, row) in enumerate(Xs.iterrows()):
        samples.append(
            {
                "id": f"C-{int(i) + 1:05d}",
                "recency": int(row.recency),
                "history": r(row.history, 2),
                "mens": int(row.mens),
                "womens": int(row.womens),
                "newbie": int(row.newbie),
                "zip_code": str(row.zip_code),
                "channel": str(row.channel),
                "got": str(row.arm),
                "visited": bool(row.visit),
                "p": {k: r(ps[k][j], 4) for k in arms},
            }
        )

    # STEP: Export the JSON | Rates, effects, subgroups, Qini curves, budget and policy values and the three arm models are written to uplift-promo.json.
    hist_counts = d.groupby(hist_b, observed=False).size()
    save(
        "uplift-promo",
        {
            "dataset": {
                "name": "MineThatData E-Mail Analytics Challenge (Kevin Hillstrom, 2008)",
                "source": "https://blog.minethatdata.com/2008/03/minethatdata-e-mail-analytics-and-data.html",
                "download": "http://www.minethatdata.com/Kevin_Hillstrom_MineThatData_E-MailAnalytics_DataMiningChallenge_2008.03.20.csv",
                "license": "Released publicly for the 2008 challenge; no formal licence stated",
                "rows": N,
                "window_days": 14,
            },
            "rates": rates,
            "ate": ate,
            "subgroups": subgroups,
            "comparison": comparison,
            "chosen": chosen,
            "curves": {"grid": [float(g) for g in grid], **curves},
            "budget": budget,
            "policies": policies,
            "picks": pick,
            "uplift_hist": {"mens": up_hist(up[0]), "womens": up_hist(up[1])},
            "models": models,
            "ranges": {"recency": [1, 12], "history": [30, 1500]},
            "medians": {"recency": int(d.recency.median()), "history": r(d.history.median(), 0)},
            "samples": samples,
            "eda": {
                "history_bins": [{"label": str(k), "value": int(v)} for k, v in hist_counts.items()],
                "recency": [{"label": str(k), "value": int(v)} for k, v in d.recency.value_counts().sort_index().items()],
                "channel": {k: int(v) for k, v in d.channel.value_counts().items()},
                "zip": {k: int(v) for k, v in d.zip_code.value_counts().items()},
                "bought": {k: int(v) for k, v in pd.Series(bought).value_counts().items()},
                "newbie_share": r(d.newbie.mean(), 3),
            },
        },
    )


def _shuffle_policy(mail, k, seed):
    """Random targeting: e-mail k random customers, each with a random e-mail."""
    rng = np.random.default_rng(seed + 7)
    pol = np.full(len(mail), "none", dtype=object)
    idx = rng.permutation(len(mail))[:k]
    pol[idx] = mail[idx]
    return pol


# ---------------------------------------------------------------------------
# 16. House price range — Ames, quantile regression + conformal calibration
# ---------------------------------------------------------------------------
AMES_HOODS = {
    "Blmngtn": "Bloomington Heights", "Blueste": "Bluestem", "BrDale": "Briardale", "BrkSide": "Brookside",
    "ClearCr": "Clear Creek", "CollgCr": "College Creek", "Crawfor": "Crawford", "Edwards": "Edwards",
    "Gilbert": "Gilbert", "Greens": "Greens", "GrnHill": "Green Hills", "IDOTRR": "Iowa DOT and Rail Road",
    "Landmrk": "Landmark", "MeadowV": "Meadow Village", "Mitchel": "Mitchell", "NAmes": "North Ames",
    "NoRidge": "Northridge", "NPkVill": "Northpark Villa", "NridgHt": "Northridge Heights", "NWAmes": "Northwest Ames",
    "OldTown": "Old Town", "SWISU": "South & West of ISU", "Sawyer": "Sawyer", "SawyerW": "Sawyer West",
    "Somerst": "Somerset", "StoneBr": "Stone Brook", "Timber": "Timberland", "Veenker": "Veenker",
}


def ames() -> None:
    # STEP: Load and filter the sales | Reads AmesHousing.txt and drops homes with more than 4000 sq ft of living area and any sale whose condition is not Normal or Partial.
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.linear_model import QuantileRegressor, Ridge

    print("house-price-range")
    raw = pd.read_csv(RAW / "ames" / "AmesHousing.txt", sep="\t")
    big = raw["Gr Liv Area"] > 4000
    atypical = ~raw["Sale Condition"].isin(["Normal", "Partial"])
    d = raw[~big & ~atypical].copy()
    print(f"  kept {len(d)} of {len(raw)} (dropped {int(big.sum())} large, {int((atypical & ~big).sum())} atypical sales)")

    # STEP: Engineer house features | Log-transforms living and lot area, sums bathrooms, maps kitchen quality to 1–5, groups neighbourhoods with under 20 sales into Other, and targets log sale price.
    qual = {"Po": 1, "Fa": 2, "TA": 3, "Gd": 4, "Ex": 5}
    d["log_area"] = np.log(d["Gr Liv Area"])
    d["log_lot"] = np.log(d["Lot Area"])
    d["baths"] = d["Full Bath"] + 0.5 * d["Half Bath"] + d["Bsmt Full Bath"].fillna(0) + 0.5 * d["Bsmt Half Bath"].fillna(0)
    d["basement"] = d["Total Bsmt SF"].fillna(0)
    d["garage"] = d["Garage Cars"].fillna(0)
    d["kitchen"] = d["Kitchen Qual"].map(qual).fillna(3)
    d["air"] = (d["Central Air"] == "Y").astype(int)
    d["remod"] = d["Year Remod/Add"]
    d["y"] = np.log(d["SalePrice"])
    hood_n = d["Neighborhood"].value_counts()
    d["hood"] = np.where(d["Neighborhood"].map(hood_n) >= 20, d["Neighborhood"], "Other")
    d["bldg"] = d["Bldg Type"]

    num = ["log_area", "Overall Qual", "Overall Cond", "Year Built", "remod", "basement", "garage", "baths", "Fireplaces", "log_lot", "kitchen", "air"]
    cat = ["hood", "bldg"]
    feats = num + cat

    # STEP: Split by year sold | Sales from 2006–08 fit the models, 2009 calibrates the intervals and 2010 is the test year; each model predicts the 10th, 50th and 90th percentiles.
    fit_m = d["Yr Sold"] <= 2008
    cal_m = d["Yr Sold"] == 2009
    tst_m = d["Yr Sold"] == 2010
    trn_m = fit_m | cal_m
    F, Cc, T = d[fit_m], d[cal_m], d[tst_m]
    print(f"  fit 2006–08: {len(F)}, calibrate 2009: {len(Cc)}, test 2010: {len(T)}")
    Q = [0.1, 0.5, 0.9]

    def lin(q, alpha=1e-4):
        return make_pipe(QuantileRegressor(quantile=q, alpha=alpha, solver="highs"), num, cat)

    def gbm(q):
        return make_pipe(GradientBoostingRegressor(loss="quantile", alpha=q, n_estimators=400, max_depth=3, learning_rate=0.05, subsample=0.8, random_state=SEED), num, cat)

    def pinball(yv, pred, q):
        e = yv - pred
        return float(np.mean(np.maximum(q * e, (q - 1) * e)))

    # STEP: Pick the penalty on 2009 | The linear quantile regression penalty is chosen from four alpha values by mean pinball loss on the calibration year, never on the test year.
    # choose the linear penalty on the calibration year only
    alphas = [0.0, 1e-4, 1e-3, 1e-2]
    pick_alpha = {}
    for al in alphas:
        loss = np.mean([pinball(Cc.y, lin(q, al).fit(F[feats], F.y).predict(Cc[feats]), q) for q in Q])
        pick_alpha[al] = float(loss)
    alpha = min(pick_alpha, key=pick_alpha.get)
    print(f"  alpha by calibration pinball: {pick_alpha} -> {alpha}")

    # STEP: Compare four interval methods | Linear and boosted quantile models, least squares with a fixed band and neighbourhood ranges are each conformally calibrated to 80% on 2009 and scored on 2010.
    def evaluate(name, lo_c, md_c, hi_c, lo_t, md_t, hi_t):
        # conformalised quantile regression: widen/narrow both ends by the calibration year's 80% score
        scores = np.maximum(lo_c - Cc.y.to_numpy(), Cc.y.to_numpy() - hi_c)
        n = len(scores)
        c = float(np.quantile(scores, min(1, np.ceil((n + 1) * 0.8) / n), method="higher"))
        yt = T.y.to_numpy()
        price = np.exp(yt)
        out = {"model": name, "offset": r(c, 5)}
        for tag, lo, hi in [("raw", lo_t, hi_t), ("calibrated", lo_t - c, hi_t + c)]:
            inside = (yt >= lo) & (yt <= hi)
            out[tag] = {"coverage": r(inside.mean(), 4), "width_pct": r(np.median((np.exp(hi) - np.exp(lo)) / np.exp(md_t)), 4), "width_usd": r(np.median(np.exp(hi) - np.exp(lo)), 0)}
        lo_k, hi_k = lo_t - c, hi_t + c
        ins = (yt >= lo_k) & (yt <= hi_k)
        bands = pd.qcut(price, 4, labels=False)
        out["by_band"] = [{"coverage": r(ins[bands == b].mean(), 4), "width_pct": r(np.median(((np.exp(hi_k) - np.exp(lo_k)) / np.exp(md_t))[bands == b]), 4)} for b in range(4)]
        out["mae"] = r(np.mean(np.abs(np.exp(md_t) - price)), 0)
        out["mape"] = r(np.mean(np.abs(np.exp(md_t) - price) / price), 4)
        out["pinball"] = r(np.mean([pinball(yt, p, q) for p, q in zip([lo_t, md_t, hi_t], Q)]), 5)
        return out

    comparison, preds = [], {}
    # 1. linear quantile regression
    lm = {q: lin(q, alpha).fit(F[feats], F.y) for q in Q}
    p_c = [lm[q].predict(Cc[feats]) for q in Q]
    p_t = [lm[q].predict(T[feats]) for q in Q]
    comparison.append(evaluate("Linear quantile regression", *p_c, *p_t))
    preds["Linear quantile regression"] = p_t
    # 2. gradient boosting, quantile loss
    gm = {q: gbm(q).fit(F[feats], F.y) for q in Q}
    g_c = [gm[q].predict(Cc[feats]) for q in Q]
    g_t = [gm[q].predict(T[feats]) for q in Q]
    comparison.append(evaluate("Gradient boosting · quantile loss", *g_c, *g_t))
    preds["Gradient boosting · quantile loss"] = g_t
    # 3. fixed-width: least squares median ± residual quantiles from the fit years
    ols = make_pipe(Ridge(alpha=1.0), num, cat).fit(F[feats], F.y)
    res = F.y - ols.predict(F[feats])
    rq = np.quantile(res, [0.1, 0.9])
    o_c, o_t = ols.predict(Cc[feats]), ols.predict(T[feats])
    comparison.append(evaluate("Least squares ± fixed band", o_c + rq[0], o_c, o_c + rq[1], o_t + rq[0], o_t, o_t + rq[1]))
    # 4. comparable sales: neighbourhood quantiles
    hq = F.groupby("hood")["y"].quantile(Q).unstack()
    allq = F["y"].quantile(Q).to_numpy()

    def hood_q(frame):
        m = frame["hood"].map(lambda h: hq.loc[h].to_numpy() if h in hq.index else allq)
        return [np.array([v[i] for v in m]) for i in range(3)]

    comparison.append(evaluate("Neighbourhood price range", *hood_q(Cc), *hood_q(T)))
    for c_ in comparison:
        print(f"  {c_['model']:36s} MAE=${c_['mae']:,.0f} MAPE={c_['mape']:.3f} pinball={c_['pinball']:.4f} cover raw={c_['raw']['coverage']:.3f} cal={c_['calibrated']['coverage']:.3f} width={c_['calibrated']['width_pct']:.3f}")

    # STEP: Keep linear quantile regression | Its calibrated interval is checked per price quarter on 2010, and the three quantile models, fit on 2006–08 only, are exported as plain numbers.
    chosen = "Linear quantile regression"
    ch = next(c_ for c_ in comparison if c_["model"] == chosen)
    off = ch["offset"]
    lo_t, md_t, hi_t = preds[chosen]
    lo_t, hi_t = lo_t - off, hi_t + off
    yt = T.y.to_numpy()
    inside = (yt >= lo_t) & (yt <= hi_t)

    # coverage by price band and by neighbourhood type on the test year
    band = pd.qcut(np.exp(yt), 4, labels=["Cheapest 25%", "Lower-mid 25%", "Upper-mid 25%", "Priciest 25%"])
    by_band = [{"label": str(b), "coverage": r(inside[band == b].mean(), 4), "n": int((band == b).sum()), "width_pct": r(np.median(((np.exp(hi_t) - np.exp(lo_t)) / np.exp(md_t))[band == b]), 4)} for b in band.categories]

    # export the shipped linear models (fit years only, as calibrated)
    def export_lin(pipe):
        pre = pipe.named_steps["pre"]
        coef = pipe.named_steps["model"].coef_
        sc = pre.named_transformers_["num"]
        oh = pre.named_transformers_["cat"]
        out = {"intercept": r(pipe.named_steps["model"].intercept_, 6), "numeric": {}, "categorical": {}}
        i = 0
        for j, col in enumerate(num):
            out["numeric"][col] = {"mean": r(sc.mean_[j], 6), "scale": r(sc.scale_[j], 6), "coef": r(coef[i], 6)}
            i += 1
        for col, cats in zip(cat, oh.categories_):
            out["categorical"][col] = {}
            for cv in cats:
                out["categorical"][col][str(cv)] = r(coef[i], 6)
                i += 1
        return out

    models = {f"q{int(q * 100)}": export_lin(lm[q]) for q in Q}

    # STEP: Pick demo homes and export | Eight random 2010 sales plus the two biggest interval misses become presets, and EDA, models and comparisons are written to house-price-range.json.
    # samples from the test year: a random draw, plus the two biggest misses
    rng = np.random.default_rng(SEED)
    pick = list(rng.choice(len(T), size=8, replace=False))
    miss = np.argsort(-np.maximum(lo_t - yt, yt - hi_t))[:2]
    pick += [int(i) for i in miss if i not in pick]
    samples = []
    for i in pick:
        row = T.iloc[i]
        samples.append(
            {
                "id": f"H-{int(row['Order']):04d}",
                "area": int(row["Gr Liv Area"]),
                "qual": int(row["Overall Qual"]),
                "cond": int(row["Overall Cond"]),
                "built": int(row["Year Built"]),
                "remod": int(row["remod"]),
                "basement": int(row["basement"]),
                "garage": int(row["garage"]),
                "baths": float(row["baths"]),
                "fireplaces": int(row["Fireplaces"]),
                "lot": int(row["Lot Area"]),
                "kitchen": int(row["kitchen"]),
                "air": int(row["air"]),
                "hood": str(row["hood"]),
                "bldg": str(row["bldg"]),
                "price": int(row["SalePrice"]),
                "lo": r(np.exp(lo_t[i]), 0),
                "mid": r(np.exp(md_t[i]), 0),
                "hi": r(np.exp(hi_t[i]), 0),
                "inside": bool(inside[i]),
                "kind": "miss" if i in miss else "random",
            }
        )

    # EDA (all kept sales)
    price = d["SalePrice"]
    pbins = [0, 100e3, 150e3, 200e3, 250e3, 300e3, 400e3, 1e9]
    plabs = ["< $100k", "$100–150k", "$150–200k", "$200–250k", "$250–300k", "$300–400k", "$400k+"]
    hood_med = d.groupby("Neighborhood")["SalePrice"].agg(["median", "size"]).query("size >= 20").sort_values("median")
    rng2 = np.random.default_rng(SEED + 5)
    sc_idx = rng2.choice(len(d), size=700, replace=False)
    save(
        "house-price-range",
        {
            "dataset": {
                "name": "Ames Housing (De Cock, 2011)",
                "source": "https://jse.amstat.org/v19n3/decock/DataDocumentation.txt",
                "download": "https://jse.amstat.org/v19n3/decock/AmesHousing.txt",
                "paper": "De Cock, Ames, Iowa: Alternative to the Boston Housing Data as an End of Semester Regression Project, Journal of Statistics Education 19(3), 2011",
                "license": "Published as a teaching dataset; no formal licence stated",
                "rows": int(len(raw)),
                "kept": int(len(d)),
                "dropped_large": int(big.sum()),
                "dropped_atypical": int((atypical & ~big).sum()),
                "columns": int(raw.shape[1]),
                "years": [int(raw["Yr Sold"].min()), int(raw["Yr Sold"].max())],
            },
            "split": {"fit": int(len(F)), "calibrate": int(len(Cc)), "test": int(len(T))},
            "alpha": {"picked": alpha, "pinball": {str(k): r(v, 5) for k, v in pick_alpha.items()}},
            "comparison": comparison,
            "chosen": chosen,
            "by_band": by_band,
            "models": models,
            "offset": off,
            "hoods": {h: AMES_HOODS.get(h, h) for h in sorted(d["hood"].unique()) if h != "Other"},
            "bldg_types": sorted(d["bldg"].unique().tolist()),
            "medians": {
                "area": int(d["Gr Liv Area"].median()), "qual": int(d["Overall Qual"].median()), "cond": int(d["Overall Cond"].median()),
                "built": int(d["Year Built"].median()), "remod": int(d["remod"].median()), "basement": int(d["basement"].median()),
                "garage": int(d["garage"].median()), "baths": float(d["baths"].median()), "fireplaces": int(d["Fireplaces"].median()),
                "lot": int(d["Lot Area"].median()), "kitchen": int(d["kitchen"].median()), "air": 1, "hood": "NAmes", "bldg": "1Fam",
            },
            "samples": samples,
            "eda": {
                "price_hist": [{"label": lab, "value": int(((price >= lo) & (price < hi_)).sum())} for lo, hi_, lab in zip(pbins[:-1], pbins[1:], plabs)],
                "median_price": int(price.median()),
                "per_year": [{"label": str(int(k)), "value": int(v)} for k, v in d["Yr Sold"].value_counts().sort_index().items()],
                "by_qual": [{"label": str(int(k)), "value": int(v), "n": int(n)} for (k, v), n in zip(d.groupby("Overall Qual")["SalePrice"].median().items(), d.groupby("Overall Qual").size())],
                "hood_median": [{"label": AMES_HOODS.get(h, h), "value": int(v["median"]), "n": int(v["size"])} for h, v in hood_med.iterrows()],
                "scatter": [[int(d["Gr Liv Area"].iloc[i]), int(price.iloc[i]), int(d["Overall Qual"].iloc[i])] for i in sc_idx],
            },
        },
    )


# ---------------------------------------------------------------------------
# 17. Feedback themes — clothing reviews: NMF themes + "would not recommend" model
# ---------------------------------------------------------------------------
def _read_arff(path) -> pd.DataFrame:
    import csv
    import io
    import re

    text = open(path, encoding="utf-8").read()
    head, body = re.split(r"\n@data\s*\n", text, maxsplit=1, flags=re.IGNORECASE)
    cols = [line.split()[1].strip("'\"") for line in head.split("\n") if line.lower().startswith("@attribute")]
    rows = [r for r in csv.reader(io.StringIO(body), quotechar="'", escapechar="\\") if r]
    return pd.DataFrame(rows, columns=cols).replace("?", np.nan)


# names given after reading each theme's top words and example reviews (see the project page)
FEEDBACK_THEME_NAMES = {
    0: "Fabric & cut letdowns",
    1: "Quality & versatility",
    2: "True to size",
    3: "Runs small or large",
    4: "Sweaters & warmth",
    5: "Comfort & compliments",
    6: "Jeans & pants",
    7: "Length & season",
    8: "Skirts & waist",
    9: "Colour",
}


def feedback() -> None:
    # STEP: Load reviews with text | Reads the clothing reviews ARFF file, keeps reviews that have text and makes "would not recommend" the 0/1 target to predict.
    import base64

    from sklearn.decomposition import NMF
    from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, CountVectorizer, TfidfVectorizer
    from sklearn.metrics import f1_score
    from sklearn.naive_bayes import ComplementNB
    from sklearn.svm import LinearSVC

    print("feedback-themes")
    raw = _read_arff(RAW / "clothing" / "reviews.arff")
    d = raw[raw["Review_Text"].notna()].copy()
    d["rating"] = d["Rating"].astype(int)
    d["rec"] = d["Recommended_IND"].astype(int)
    d["neg"] = 1 - d["rec"]
    d["dept"] = d["Department_Name"].fillna("Unknown")
    d["body"] = d["Review_Text"].str.lower()
    d["full"] = (d["Title"].fillna("") + " " + d["Review_Text"]).str.lower()
    print(f"  reviews with text: {len(d)} of {len(raw)}")

    # STEP: Find themes with NMF | NMF on TF-IDF of review text is tried with 6, 8, 10 and 12 themes, and the count whose top words have the best NPMI coherence is kept.
    # ---------- themes: NMF on TF-IDF of the review body ----------
    stop = sorted(ENGLISH_STOP_WORDS | {"dress", "dresses", "top", "shirt", "love", "loved", "really", "just", "like", "wear", "wearing", "worn", "bought", "ordered", "order", "retailer", "im", "ive", "did", "got", "usually", "think", "lbs", "petite"})
    theme_tok = r"(?a)\b[a-z][a-z]+\b"
    tv = TfidfVectorizer(stop_words=stop, token_pattern=theme_tok, min_df=20, max_df=0.5, max_features=2000)
    X = tv.fit_transform(d["body"])
    vocab = tv.get_feature_names_out()
    B = (X > 0).astype(float).tocsc()
    N = B.shape[0]
    dfreq = np.asarray(B.sum(axis=0)).ravel()

    def npmi(top):
        vals = []
        for i in range(len(top)):
            for j in range(i + 1, len(top)):
                co = B[:, top[i]].multiply(B[:, top[j]]).sum()
                vals.append(-1.0 if co == 0 else np.log(co * N / (dfreq[top[i]] * dfreq[top[j]])) / -np.log(co / N))
        return float(np.mean(vals))

    scan = []
    for k in [6, 8, 10, 12]:
        m = NMF(n_components=k, init="nndsvda", random_state=SEED, max_iter=600).fit(X)
        tops = [np.argsort(-w)[:10] for w in m.components_]
        scan.append({"k": k, "npmi": r(np.mean([npmi(t) for t in tops]), 4), "diversity": r(len(set(np.concatenate(tops))) / (10 * k), 3)})
        print(f"  k={k} NPMI={scan[-1]['npmi']} diversity={scan[-1]['diversity']}")
    K = max(scan, key=lambda s: s["npmi"])["k"]
    nmf = NMF(n_components=K, init="nndsvda", random_state=SEED, max_iter=600)
    H = nmf.fit_transform(X)
    W = nmf.components_
    names = [FEEDBACK_THEME_NAMES.get(i, f"Theme {i + 1}") for i in range(K)]
    for i in range(K):
        print(f"  {i} {names[i]:24s} {' '.join(vocab[np.argsort(-W[i])[:10]])}")

    # STEP: Compress and profile the themes | Theme weights are stored as uint8 with the browser's update rule reproduced, and each theme gets top words, share, average rating and an example review.
    # browser copy: uint8 per theme, and the exact transform the browser runs (multiplicative updates)
    wscale = W.max(axis=1) / 255
    Wq8 = np.round(W / wscale[:, None]).astype(np.uint8)
    Wq = Wq8.astype(float) * wscale[:, None]
    WWt = Wq @ Wq.T
    tcount = CountVectorizer(vocabulary=list(vocab), token_pattern=theme_tok)
    t_idf = np.round(tv.idf_, 5)

    def theme_mix(texts, iters=200):
        M = tcount.transform([t.lower() for t in texts]).astype(float).multiply(t_idf[None, :]).tocsr()
        out = []
        for i in range(M.shape[0]):
            row = M.getrow(i)
            nrm = np.sqrt(row.multiply(row).sum())
            if nrm == 0:
                out.append(np.zeros(K))
                continue
            wx = np.asarray(row @ Wq.T).ravel() / nrm
            h = np.full(K, 0.1)
            for _ in range(iters):
                h = h * wx / (WWt @ h + 1e-9)
            out.append(h)
        return np.array(out)

    # theme statistics on all reviews (fitted weights)
    share = H / np.maximum(H.sum(axis=1, keepdims=True), 1e-12)
    dom = H.argmax(axis=1)
    has = H.sum(axis=1) > 0
    low = (d["rating"] <= 2).to_numpy()
    high = (d["rating"] >= 4).to_numpy()
    themes = []
    for i in range(K):
        m_ = has & (dom == i)
        themes.append(
            {
                "name": names[i],
                "top": [[str(vocab[j]), r(W[i, j] / W[i].max(), 3)] for j in np.argsort(-W[i])[:12]],
                "n": int(m_.sum()),
                "share": r(share[:, i].mean(), 4),
                "rating": r(d["rating"][m_].mean(), 3),
                "low": r(low[m_].mean(), 4),
                "not_rec": r(d["neg"][m_].mean(), 4),
                "in_low": r(share[low, i].mean(), 4),
                "in_high": r(share[high, i].mean(), 4),
                "example": str(d["Review_Text"].iloc[int(np.argmax(np.where(m_, share[:, i], -1)))])[:260],
            }
        )
    depts = [x for x in ["Tops", "Dresses", "Bottoms", "Intimate", "Jackets"] if x in set(d["dept"])]
    by_dept = [{"dept": dp, "n": int((d["dept"] == dp).sum()), "share": [r(v, 4) for v in share[(d["dept"] == dp).to_numpy()].mean(axis=0)]} for dp in depts]

    # STEP: Split and tune the classifier | Reviews are split 80/20, stratified on the target, and the logistic C is chosen from 1, 3 and 10 by 3-fold cross-validated ROC AUC on training data.
    # ---------- "would not recommend": words → probability ----------
    y = d["neg"].to_numpy()
    idx_tr, idx_te = train_test_split(np.arange(len(d)), test_size=0.2, stratify=y, random_state=SEED)
    Xtr, Xte, ytr, yte = d["full"].iloc[idx_tr], d["full"].iloc[idx_te], y[idx_tr], y[idx_te]
    word_tok = r"(?a)\b\w\w+\b"

    def wv(**kw):
        return TfidfVectorizer(ngram_range=(1, 2), token_pattern=word_tok, min_df=3, sublinear_tf=True, **kw)

    cv3 = StratifiedKFold(3, shuffle=True, random_state=SEED)
    cv_scores = {C: float(cross_val_score(Pipeline([("v", wv()), ("m", LogisticRegression(C=C, max_iter=3000))]), Xtr, ytr, cv=cv3, scoring="roc_auc").mean()) for C in [1, 3, 10]}
    C = max(cv_scores, key=cv_scores.get)
    print(f"  sentiment CV AUC {cv_scores} -> C={C}")

    # STEP: Compare four classifiers | Naive Bayes, linear SVM and logistic regression on words, plus logistic on the theme mix alone, are scored on the test set by AUC, average precision and F1.
    from sklearn.metrics import average_precision_score

    def met(score, pred):
        return {"roc_auc": r(roc_auc_score(yte, score), 4), "ap": r(average_precision_score(yte, score), 4), "f1": r(f1_score(yte, pred), 4), "acc": r(np.mean(pred == yte), 4)}

    comparison = []
    nb = Pipeline([("v", TfidfVectorizer(ngram_range=(1, 2), token_pattern=word_tok, min_df=3)), ("m", ComplementNB())]).fit(Xtr, ytr)
    comparison.append({"model": "Naive Bayes · words", **met(nb.predict_proba(Xte)[:, 1], nb.predict(Xte))})
    svm = Pipeline([("v", wv()), ("m", LinearSVC(C=0.5))]).fit(Xtr, ytr)
    comparison.append({"model": "Linear SVM · words", **met(svm.decision_function(Xte), svm.predict(Xte))})
    lr = Pipeline([("v", wv()), ("m", LogisticRegression(C=C, max_iter=3000))]).fit(Xtr, ytr)
    p_lr = lr.predict_proba(Xte)[:, 1]
    comparison.append({"model": "Logistic · words", **met(p_lr, (p_lr >= 0.5).astype(int))})
    th = LogisticRegression(max_iter=2000).fit(share[idx_tr], ytr)
    p_th = th.predict_proba(share[idx_te])[:, 1]
    comparison.append({"model": "Logistic · theme mix only", **met(p_th, (p_th >= 0.5).astype(int))})
    for c_ in comparison:
        print(f"  {c_['model']:28s} AUC={c_['roc_auc']:.4f} AP={c_['ap']:.4f} F1={c_['f1']:.4f}")
    chosen = "Logistic · words"

    # STEP: Ship a compact int8 model | The 2500 strongest n-grams are refit and stored as int8 weights, re-scored exactly as the browser computes, plus flag rates per threshold and the strongest words.
    # ship: strongest n-grams, refit, int8 weights, evaluated exactly as the browser computes
    KS = 2500
    coef = lr.named_steps["m"].coef_[0]
    sel = np.argsort(-np.abs(coef))[:KS]
    s_vocab = [str(v) for v in lr.named_steps["v"].get_feature_names_out()[np.sort(sel)]]
    lr2 = Pipeline([("v", wv(vocabulary=s_vocab)), ("m", LogisticRegression(C=C, max_iter=3000))]).fit(Xtr, ytr)
    s_idf = np.round(lr2.named_steps["v"].idf_, 5)
    w2 = lr2.named_steps["m"].coef_[0]
    sscale = float(f"{np.abs(w2).max() / 127:.8g}")
    sq = np.round(w2 / sscale).astype(np.int8)
    sb = r(lr2.named_steps["m"].intercept_[0], 5)
    scount = CountVectorizer(ngram_range=(1, 2), token_pattern=word_tok, vocabulary=s_vocab)

    def ship_prob(texts):
        M = scount.transform([t.lower() for t in texts]).astype(float).tocsr()
        M.data = 1 + np.log(M.data)
        M = M.multiply(s_idf[None, :]).tocsr()
        nrm = np.sqrt(np.asarray(M.multiply(M).sum(axis=1)).ravel())
        nrm[nrm == 0] = 1
        z = np.asarray(M @ (sq.astype(float) * sscale)).ravel() / nrm + sb
        return 1 / (1 + np.exp(-z))

    p_ship = ship_prob(list(Xte))
    shipped = {"ngrams": len(s_vocab), **met(p_ship, (p_ship >= 0.5).astype(int))}
    print(f"  shipped ({len(s_vocab)} n-grams, int8) AUC={shipped['roc_auc']:.4f} AP={shipped['ap']:.4f}")

    # threshold view for the review queue: flag reviews above t
    flags = []
    for t in np.round(np.arange(0.1, 0.91, 0.1), 2):
        f = p_ship >= t
        flags.append({"t": float(t), "flagged": r(f.mean(), 4), "precision": r(yte[f].mean() if f.any() else 0, 4), "recall": r(f[yte == 1].mean(), 4)})

    # strongest words either way (shipped model, unigrams)
    uni = [(v, w) for v, w in zip(s_vocab, sq.astype(float) * sscale) if " " not in v]
    neg_words = [[v, r(w, 3)] for v, w in sorted(uni, key=lambda t: -t[1])[:15]]
    pos_words = [[v, r(w, 3)] for v, w in sorted(uni, key=lambda t: t[1])[:15]]

    # STEP: Pick demo reviews and export | Eight random test reviews plus the two most confident mistakes get scores and theme mixes, and everything is written to feedback-themes.json.
    # samples from the test split: random reviews plus the two most confident mistakes
    rng = np.random.default_rng(SEED)
    pick = [int(i) for i in rng.choice(len(idx_te), size=8, replace=False)]
    wrong = np.where(((p_ship >= 0.5).astype(int)) != yte)[0]
    worst = [int(i) for i in wrong[np.argsort(-np.abs(p_ship[wrong] - 0.5))][:2]]
    pick += [i for i in worst if i not in pick]
    bodies = [str(d["Review_Text"].iloc[idx_te[i]]) for i in pick]
    mixes = theme_mix(bodies)
    samples = []
    for j, i in enumerate(pick):
        row = d.iloc[idx_te[i]]
        h = mixes[j]
        samples.append(
            {
                "id": f"R-{int(row['Unnamed:_0']) + 1:05d}",
                "title": None if not isinstance(row["Title"], str) else str(row["Title"]),
                "text": str(row["Review_Text"]),
                "rating": int(row["rating"]),
                "recommended": bool(row["rec"]),
                "dept": str(row["dept"]),
                "p_neg": r(p_ship[i], 4),
                "mix": [r(v, 5) for v in h],
                "kind": "mistake" if i in worst else "random",
            }
        )

    wc = d["Review_Text"].str.split().str.len()
    save(
        "feedback-themes",
        {
            "dataset": {
                "name": "Women's E-Commerce Clothing Reviews",
                "source": "https://www.openml.org/d/43673",
                "license": "CC0: Public Domain",
                "rows": int(len(raw)),
                "with_text": int(len(d)),
                "words_median": int(wc.median()),
            },
            "scan": scan,
            "k": K,
            "themes": themes,
            "by_dept": by_dept,
            "theme_model": {
                "vocab": [str(v) for v in vocab],
                "idf": [float(v) for v in t_idf],
                "scale": [float(f"{v:.8g}") for v in wscale],
                "w": base64.b64encode(Wq8.tobytes()).decode("ascii"),
                "iters": 200,
            },
            "cv": {"folds": 3, "scores": {str(k): r(v, 4) for k, v in cv_scores.items()}, "C": C},
            "comparison": comparison,
            "chosen": chosen,
            "shipped": shipped,
            "sentiment_model": {"vocab": s_vocab, "idf": [float(v) for v in s_idf], "scale": sscale, "q": base64.b64encode(sq.tobytes()).decode("ascii"), "b": sb},
            "split": {"train": int(len(idx_tr)), "test": int(len(idx_te)), "neg_rate": r(y.mean(), 4)},
            "flags": flags,
            "words": {"negative": neg_words, "positive": pos_words},
            "samples": samples,
            "eda": {
                "ratings": [{"label": f"{k} ★", "value": int((d["rating"] == k).sum()), "not_rec": r(d.loc[d["rating"] == k, "neg"].mean(), 4)} for k in range(1, 6)],
                "words_hist": [{"label": lab, "value": int(((wc >= lo) & (wc < hi_)).sum())} for lo, hi_, lab in [(1, 20, "1–19"), (20, 40, "20–39"), (40, 60, "40–59"), (60, 80, "60–79"), (80, 100, "80–99"), (100, 10**4, "100+")]],
                "depts": [{"label": dp, "value": int((d["dept"] == dp).sum()), "rating": r(d.loc[d["dept"] == dp, "rating"].mean(), 3)} for dp in depts],
            },
        },
    )


# ---------------------------------------------------------------------------
# DL 1. Handwritten digits — MNIST, from softmax regression to an augmented CNN
# ---------------------------------------------------------------------------
def mnist() -> None:
    # STEP: Load MNIST and hold out validation | Seeds TensorFlow for repeatable runs, loads mnist.npz, sets aside 5000 random training images for validation and scales pixels to 0–1.
    import base64
    import time

    import keras
    import tensorflow as tf
    from keras import layers
    from scipy import ndimage

    print("handwritten-digits")
    keras.utils.set_random_seed(SEED)
    tf.config.experimental.enable_op_determinism()
    z = np.load(RAW / "mnist" / "mnist.npz", allow_pickle=False)
    xtr_all, ytr_all, xte, yte = z["x_train"], z["y_train"], z["x_test"], z["y_test"]
    rng = np.random.default_rng(SEED)
    perm = rng.permutation(len(xtr_all))
    val_idx, tr_idx = perm[:5000], perm[5000:]
    f = lambda a: (a.astype("float32") / 255.0)[..., None]  # noqa: E731
    Xtr, ytr, Xva, yva, Xte = f(xtr_all[tr_idx]), ytr_all[tr_idx], f(xtr_all[val_idx]), ytr_all[val_idx], f(xte)

    # STEP: Define four candidate networks | From simple to strong: softmax regression, a dense net with one 128-unit hidden layer, a small two-conv CNN, and the same CNN with random rotation, shift and zoom.
    def softmax_reg():
        return keras.Sequential([keras.Input((28, 28, 1)), layers.Flatten(), layers.Dense(10)], name="softmax")

    def mlp():
        return keras.Sequential([keras.Input((28, 28, 1)), layers.Flatten(), layers.Dense(128, activation="relu"), layers.Dropout(0.2), layers.Dense(10)], name="mlp")

    def cnn(augment: bool):
        aug = [layers.RandomRotation(0.04, fill_mode="constant"), layers.RandomTranslation(0.1, 0.1, fill_mode="constant"), layers.RandomZoom(0.1, fill_mode="constant")] if augment else []
        return keras.Sequential(
            [
                keras.Input((28, 28, 1)),
                *aug,
                layers.Conv2D(16, 3, activation="relu", name="conv1"),
                layers.MaxPooling2D(2),
                layers.Conv2D(32, 3, activation="relu", name="conv2"),
                layers.MaxPooling2D(2),
                layers.Flatten(),
                layers.Dense(64, activation="relu", name="dense1"),
                layers.Dropout(0.3),
                layers.Dense(10, name="out"),
            ],
            name="cnn_aug" if augment else "cnn",
        )

    builders = {
        "Softmax regression (no hidden layer)": softmax_reg,
        "Dense network (1 hidden layer)": mlp,
        "Small CNN": lambda: cnn(False),
        "Small CNN + augmentation": lambda: cnn(True),
    }

    # STEP: Build distorted test sets | Copies of the test digits shifted up to 4 px, rotated up to 25 degrees or shrunk to 70%, to check which model copes with messier handwriting.
    # robustness sets: the same test digits, shifted, rotated or shrunk (seeded)
    rr = np.random.default_rng(SEED + 1)
    shift = np.stack([ndimage.shift(im, (rr.integers(-4, 5), rr.integers(-4, 5)), order=1, mode="constant") for im in xte.astype("float32")])
    rot = np.stack([ndimage.rotate(im, rr.uniform(-25, 25), reshape=False, order=1, mode="constant") for im in xte.astype("float32")])
    small = np.stack([np.pad(ndimage.zoom(im, 0.7, order=1), ((4, 4), (4, 4)))[:28, :28] for im in xte.astype("float32")])
    robust_sets = {"Original": Xte, "Shifted ±4 px": f(np.clip(shift, 0, 255)), "Rotated ±25°": f(np.clip(rot, 0, 255)), "Shrunk to 70%": f(np.clip(small, 0, 255))}

    # STEP: Train and compare the networks | Each network trains up to 40 epochs with Adam, early stopping and learning-rate halving on validation loss, then is scored on the original and distorted test sets.
    comparison, histories, trained = [], {}, {}
    for name, build in builders.items():
        model = build()
        model.compile(optimizer=keras.optimizers.Adam(1e-3), loss=keras.losses.SparseCategoricalCrossentropy(from_logits=True), metrics=["accuracy"])
        t0 = time.time()
        h = model.fit(
            Xtr, ytr, validation_data=(Xva, yva), epochs=40, batch_size=128, verbose=0,
            callbacks=[keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True, monitor="val_loss"), keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2, min_lr=1e-5)],
        )
        secs = time.time() - t0
        rob = {k: r(float(np.mean(model.predict(v, verbose=0, batch_size=1000).argmax(1) == yte)), 4) for k, v in robust_sets.items()}
        comparison.append({"model": name, "params": int(model.count_params()), "acc": rob["Original"], "robust": rob, "epochs": len(h.history["loss"]), "seconds": r(secs, 1)})
        histories[name] = {k: [r(v, 6 if k == "learning_rate" else 4) for v in vals] for k, vals in h.history.items()}
        trained[name] = model
        print(f"  {name:38s} params={model.count_params():6d} acc={rob['Original']:.4f} shift={rob['Shifted ±4 px']:.4f} rot={rob['Rotated ±25°']:.4f} small={rob['Shrunk to 70%']:.4f} epochs={len(h.history['loss'])} {secs:.0f}s")

    # STEP: Quantise to int8 and re-test | Keeps the augmented CNN, stores each layer as int8 with one scale per output unit, and re-scores the test set with the NumPy forward pass the browser mirrors.
    chosen = "Small CNN + augmentation"
    model = trained[chosen]

    # export with int8 weights (one scale per output channel / unit), evaluated with the browser's forward pass
    def q8(w, axis_out):
        moved = np.moveaxis(w, axis_out, -1)
        scale = np.abs(moved).reshape(-1, moved.shape[-1]).max(axis=0) / 127
        scale = np.array([float(f"{s:.8g}") for s in scale])
        q = np.round(moved / scale).astype(np.int8)
        return q, scale

    L = {ly.name: ly.get_weights() for ly in model.layers if ly.get_weights()}
    export, deq = {}, {}
    for name in ["conv1", "conv2", "dense1", "out"]:
        w, b = L[name]
        q, scale = q8(w, w.ndim - 1)
        export[name] = {"shape": list(w.shape), "scale": [float(s) for s in scale], "b": [r(v, 6) for v in b], "q": base64.b64encode(q.tobytes()).decode("ascii")}
        deq[name] = (q.astype(np.float64) * scale, np.round(b.astype(np.float64), 6))

    def conv_valid(x, w, b):
        """x: (H, W, Cin), w: (3, 3, Cin, Cout) — Keras layout, valid padding, stride 1."""
        H, Wd, _ = x.shape
        kh, kw, _, co = w.shape
        out = np.zeros((H - kh + 1, Wd - kw + 1, co))
        for i in range(kh):
            for j in range(kw):
                out += np.tensordot(x[i : i + H - kh + 1, j : j + Wd - kw + 1, :], w[i, j], axes=([2], [0]))
        return out + b

    def pool(x):
        H, Wd, C = x.shape
        h2, w2 = H // 2, Wd // 2
        return x[: h2 * 2, : w2 * 2].reshape(h2, 2, w2, 2, C).max(axis=(1, 3))

    def forward(img):
        a = np.maximum(conv_valid(img, *deq["conv1"]), 0)
        a = pool(a)
        a = np.maximum(conv_valid(a, *deq["conv2"]), 0)
        a = pool(a).reshape(-1)
        a = np.maximum(a @ deq["dense1"][0] + deq["dense1"][1], 0)
        return a @ deq["out"][0] + deq["out"][1]

    logits = np.array([forward(im.astype(np.float64)) for im in Xte])
    pred = logits.argmax(1)
    shipped_acc = float(np.mean(pred == yte))
    keras_acc = comparison[-1]["acc"]
    print(f"  shipped int8 accuracy {shipped_acc:.4f} (float model {keras_acc:.4f})")
    prob = np.exp(logits - logits.max(1, keepdims=True))
    prob /= prob.sum(1, keepdims=True)

    # STEP: Analyse errors, pick demo digits | Counts the confusion matrix and top 8 mix-ups, picks a random test digit per class plus the 6 most confident mistakes, and averages each digit's training images.
    conf = [[int(((yte == a) & (pred == p)).sum()) for p in range(10)] for a in range(10)]
    pairs = sorted([(conf[a][p], a, p) for a in range(10) for p in range(10) if a != p], reverse=True)[:8]
    per_digit = [r(conf[d][d] / sum(conf[d]), 4) for d in range(10)]

    def b64img(im):
        return base64.b64encode(np.asarray(im, dtype=np.uint8).tobytes()).decode("ascii")

    rs = np.random.default_rng(SEED + 2)
    pick = [int(rs.choice(np.where(yte == dgt)[0])) for dgt in range(10)]
    wrong = np.where(pred != yte)[0]
    worst = [int(i) for i in wrong[np.argsort(-prob[wrong].max(1))][:6]]
    samples = [
        {"id": f"T-{i:05d}", "label": int(yte[i]), "pred": int(pred[i]), "p": r(prob[i].max(), 4), "probs": [r(v, 5) for v in prob[i]], "img": b64img(xte[i]), "kind": "mistake" if i in worst else "random"}
        for i in pick + worst
    ]
    means = [b64img(np.round(xtr_all[ytr_all == dgt].mean(axis=0))) for dgt in range(10)]
    ink = [r(float((xtr_all[ytr_all == dgt] > 50).mean()), 4) for dgt in range(10)]

    # STEP: Export the JSON | Writes the int8 weights, model comparison, training histories, confusion matrix, digit averages and samples to src/data/models/handwritten-digits.json.
    save(
        "handwritten-digits",
        {
            "dataset": {
                "name": "MNIST handwritten digits",
                "source": "https://yann.lecun.com/exdb/mnist/",
                "download": "https://storage.googleapis.com/tensorflow/tf-keras-datasets/mnist.npz",
                "license": "CC BY-SA 3.0 (Yann LeCun and Corinna Cortes)",
                "train": int(len(xtr_all)),
                "test": int(len(xte)),
                "size": 28,
            },
            "split": {"train": int(len(tr_idx)), "val": int(len(val_idx)), "test": int(len(xte))},
            "counts": {"train": np.bincount(ytr_all).tolist(), "test": np.bincount(yte).tolist()},
            "comparison": comparison,
            "chosen": chosen,
            "history": histories[chosen],
            "history_plain": histories["Small CNN"],
            "shipped": {"acc": r(shipped_acc, 4), "float_acc": keras_acc, "bytes": int(sum(np.prod(export[k]["shape"]) for k in export)), "errors": int((pred != yte).sum())},
            "confusion": conf,
            "pairs": [{"actual": a, "predicted": p, "n": n_} for n_, a, p in pairs],
            "per_digit": per_digit,
            "model": export,
            "samples": samples,
            "means": means,
            "ink": ink,
            "tf": {"tensorflow": tf.__version__, "keras": keras.__version__},
        },
    )


# ---------------------------------------------------------------------------
# DL 2. Hand gestures — rock / paper / scissors, CNN with class activation maps
# ---------------------------------------------------------------------------
def rps() -> None:
    # STEP: Load the photos at two sizes | Seeds TensorFlow, defines texture and background-swap helpers, and loads every training and test photo at 64 px for the small CNN and 96 px for MobileNetV2.
    import base64
    import os
    import time

    import keras
    import tensorflow as tf
    from keras import layers
    from scipy import ndimage

    print("hand-gestures")
    keras.utils.set_random_seed(SEED)
    tf.config.experimental.enable_op_determinism()
    CLASSES = ["rock", "paper", "scissors"]
    S, SM = 64, 96  # small CNN input, MobileNetV2 input

    def textures(n, seed):
        """Busy backgrounds: smooth colour noise plus stripes, so 'white = background' stops working."""
        g = np.random.default_rng(seed)
        out = []
        for _ in range(n):
            base = g.uniform(0, 255, (6, 6, 3))
            t = np.stack([ndimage.zoom(base[..., c], 300 / 6, order=1) for c in range(3)], -1)[:300, :300]
            yy, xx = np.mgrid[0:300, 0:300]
            stripes = 40 * np.sin((xx * g.uniform(0.02, 0.15) + yy * g.uniform(0.02, 0.15)) + g.uniform(0, 6))
            out.append(np.clip(t + stripes[..., None] + g.normal(0, 12, (300, 300, 3)), 0, 255))
        return out

    def swap_bg(img, tex):
        # background = near-white pixels connected to the border (keeps bright highlights on the hand itself)
        mask = ndimage.binary_opening(img.min(axis=2) > 225, iterations=1)
        lab, _ = ndimage.label(mask)
        edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        mask = np.isin(lab, edge[edge > 0])
        out = img.astype(np.float64).copy()
        out[mask] = tex[mask]
        return out

    def small(img, size):
        return tf.image.resize(img[None].astype("float32"), (size, size), method="area")[0].numpy()

    def load(root):
        X, Xm, y, names = [], [], [], []
        for k, c in enumerate(CLASSES):
            for fn in sorted(os.listdir(root / c)):
                img = tf.io.decode_png(tf.io.read_file(str(root / c / fn)), channels=3).numpy()
                X.append(np.round(small(img, S)).astype(np.uint8))
                Xm.append(np.round(small(img, SM)).astype(np.uint8))
                y.append(k)
                names.append(f"{c}/{fn}")
        return np.stack(X), np.stack(Xm), np.array(y), names

    tr_root, te_root = RAW / "rps" / "rps", RAW / "rps" / "rps-test-set"
    Xtr_all, Xtrm_all, ytr_all, _ = load(tr_root)
    Xte, Xtem, yte, te_names = load(te_root)
    print(f"  train {len(ytr_all)}, test {len(yte)}")

    # STEP: Make background and stress copies | Pastes busy textures behind every training hand, then makes test copies rotated up to 30 degrees, darkened, or on unseen textures to measure robustness.
    # training copies with swapped backgrounds (seed A); test stress set uses different textures (seed B)
    tex_tr = textures(60, SEED + 10)
    tex_te = textures(40, SEED + 20)
    g = np.random.default_rng(SEED + 11)
    bg_tr, bg_trm = [], []
    for k, c in enumerate(CLASSES):
        for fn in sorted(os.listdir(tr_root / c)):
            img = tf.io.decode_png(tf.io.read_file(str(tr_root / c / fn)), channels=3).numpy()
            sw = swap_bg(img, tex_tr[g.integers(len(tex_tr))])
            bg_tr.append(np.round(small(sw, S)).astype(np.uint8))
            bg_trm.append(np.round(small(sw, SM)).astype(np.uint8))
    bg_tr, bg_trm = np.stack(bg_tr), np.stack(bg_trm)

    # stress versions of the test set, built from the 300×300 originals
    rr = np.random.default_rng(SEED + 21)
    stress = {"Original": (Xte, Xtem)}
    rot, dark, newbg = [[], []], [[], []], [[], []]
    for i, name in enumerate(te_names):
        img = tf.io.decode_png(tf.io.read_file(str(te_root / name)), channels=3).numpy().astype(np.float64)
        rimg = ndimage.rotate(img, rr.uniform(-30, 30), reshape=False, order=1, mode="constant", cval=255)
        dimg = img * 0.55
        bimg = swap_bg(img.astype(np.uint8), tex_te[rr.integers(len(tex_te))])
        for store, v in [(rot, rimg), (dark, dimg), (newbg, bimg)]:
            store[0].append(np.round(small(np.clip(v, 0, 255), S)).astype(np.uint8))
            store[1].append(np.round(small(np.clip(v, 0, 255), SM)).astype(np.uint8))
    stress["Rotated ±30°"] = (np.stack(rot[0]), np.stack(rot[1]))
    stress["Darker"] = (np.stack(dark[0]), np.stack(dark[1]))
    stress["New background"] = (np.stack(newbg[0]), np.stack(newbg[1]))

    # STEP: Split and define the networks | Holds out 15% of training photos for validation, then defines a four-conv small CNN with optional augmentation and a frozen ImageNet MobileNetV2 with a new head.
    perm = np.random.default_rng(SEED).permutation(len(ytr_all))
    nval = int(0.15 * len(perm))
    va, tr = perm[:nval], perm[nval:]
    f32 = lambda a: a.astype("float32") / 255.0  # noqa: E731

    def cnn(name, augment):
        aug = (
            [
                layers.RandomFlip("horizontal"),
                layers.RandomRotation(0.08, fill_mode="constant", fill_value=1.0),
                layers.RandomZoom(0.15, fill_mode="constant", fill_value=1.0),
                layers.RandomTranslation(0.1, 0.1, fill_mode="constant", fill_value=1.0),
                layers.RandomBrightness(0.25, value_range=(0.0, 1.0)),
                layers.RandomContrast(0.25),
            ]
            if augment
            else []
        )
        return keras.Sequential(
            [
                keras.Input((S, S, 3)),
                *aug,
                layers.Conv2D(16, 3, padding="same", activation="relu", name="conv1"),
                layers.MaxPooling2D(2),
                layers.Conv2D(32, 3, padding="same", activation="relu", name="conv2"),
                layers.MaxPooling2D(2),
                layers.Conv2D(64, 3, padding="same", activation="relu", name="conv3"),
                layers.MaxPooling2D(2),
                layers.Conv2D(64, 3, padding="same", activation="relu", name="conv4"),
                layers.GlobalAveragePooling2D(),
                layers.Dropout(0.3),
                layers.Dense(3, name="out"),
            ],
            name=name,
        )

    def mobilenet():
        base = keras.applications.MobileNetV2(input_shape=(SM, SM, 3), include_top=False, weights=str(RAW / "keras" / "mobilenet_v2_1.0_96_no_top.h5"))
        base.trainable = False
        inp = keras.Input((SM, SM, 3))
        x = layers.Rescaling(2.0, offset=-1.0)(inp)  # 0–1 → −1…1, as MobileNetV2 expects
        x = base(x, training=False)
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dropout(0.3)(x)
        return keras.Model(inp, layers.Dense(3)(x), name="mobilenet")

    def fit(model, Xa, ya, Xv, yv, epochs=40):
        model.compile(optimizer=keras.optimizers.Adam(1e-3), loss=keras.losses.SparseCategoricalCrossentropy(from_logits=True), metrics=["accuracy"])
        t0 = time.time()
        h = model.fit(
            Xa, ya, validation_data=(Xv, yv), epochs=epochs, batch_size=32, verbose=0,
            callbacks=[keras.callbacks.EarlyStopping(patience=6, restore_best_weights=True, monitor="val_loss"), keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-5)],
        )
        return h, time.time() - t0

    # STEP: Train and compare the models | A pixel logistic-regression baseline, three small-CNN variants and MobileNetV2 are each scored on the original test photos and every stressed copy.
    comparison, histories, trained = [], {}, {}

    # 0. logistic regression on 32×32 grayscale pixels
    def gray32(a):
        return tf.image.resize(a.astype("float32"), (32, 32), method="area").numpy().mean(axis=3).reshape(len(a), -1) / 255.0

    t0 = time.time()
    logit = LogisticRegression(max_iter=3000).fit(gray32(Xtr_all[tr]), ytr_all[tr])
    rob = {k: r(float(np.mean(logit.predict(gray32(v[0])) == yte)), 4) for k, v in stress.items()}
    comparison.append({"model": "Logistic regression on pixels", "params": int(logit.coef_.size + logit.intercept_.size), "acc": rob["Original"], "robust": rob, "epochs": 0, "seconds": r(time.time() - t0, 1)})

    variants = {
        "Small CNN": dict(augment=False, bg=False),
        "Small CNN + augmentation": dict(augment=True, bg=False),
        "Small CNN + augmentation + new backgrounds": dict(augment=True, bg=True),
    }
    for name, v in variants.items():
        Xa, ya = Xtr_all[tr], ytr_all[tr]
        if v["bg"]:
            Xa, ya = np.concatenate([Xa, bg_tr[tr]]), np.concatenate([ya, ytr_all[tr]])
        model = cnn(name.replace(" ", "_").replace("+", "p"), v["augment"])
        h, secs = fit(model, f32(Xa), ya, f32(Xtr_all[va]), ytr_all[va])
        rob = {k: r(float(np.mean(model.predict(f32(s[0]), verbose=0).argmax(1) == yte)), 4) for k, s in stress.items()}
        comparison.append({"model": name, "params": int(model.count_params()), "acc": rob["Original"], "robust": rob, "epochs": len(h.history["loss"]), "seconds": r(secs, 1)})
        histories[name] = {k: [r(x, 6 if k == "learning_rate" else 4) for x in vals] for k, vals in h.history.items()}
        trained[name] = model

    # MobileNetV2 transfer learning, also with background copies (fair to the best small CNN)
    mn = mobilenet()
    Xa, ya = np.concatenate([Xtrm_all[tr], bg_trm[tr]]), np.concatenate([ytr_all[tr], ytr_all[tr]])
    h, secs = fit(mn, f32(Xa), ya, f32(Xtrm_all[va]), ytr_all[va], epochs=20)
    rob = {k: r(float(np.mean(mn.predict(f32(s[1]), verbose=0).argmax(1) == yte)), 4) for k, s in stress.items()}
    comparison.append({"model": "MobileNetV2 transfer (ImageNet) + new backgrounds", "params": int(mn.count_params()), "trainable": int(sum(np.prod(w.shape) for w in mn.trainable_weights)), "acc": rob["Original"], "robust": rob, "epochs": len(h.history["loss"]), "seconds": r(secs, 1)})
    for c_ in comparison:
        rb = c_["robust"]
        print(f"  {c_['model']:52s} params={c_['params']:8d} acc={rb['Original']:.4f} rot={rb['Rotated ±30°']:.4f} dark={rb['Darker']:.4f} bg={rb['New background']:.4f}")

    # STEP: Quantise to int8 and re-test | Keeps the augmented, background-trained CNN, stores its weights as int8 per output channel and re-scores every test set with the NumPy forward pass the browser mirrors.
    chosen = "Small CNN + augmentation + new backgrounds"
    model = trained[chosen]

    # export: int8 weights per output channel; evaluate with the browser's forward pass (same padding)
    def q8(w):
        scale = np.abs(w).reshape(-1, w.shape[-1]).max(axis=0) / 127
        scale = np.array([float(f"{s:.8g}") for s in scale])
        return np.round(w / scale).astype(np.int8), scale

    L = {ly.name: ly.get_weights() for ly in model.layers if ly.get_weights()}
    export, deq = {}, {}
    for name in ["conv1", "conv2", "conv3", "conv4", "out"]:
        w, b = L[name]
        q, scale = q8(w)
        export[name] = {"shape": list(w.shape), "scale": [float(s) for s in scale], "b": [r(x, 6) for x in b], "q": base64.b64encode(q.tobytes()).decode("ascii")}
        deq[name] = (q.astype(np.float64) * scale, np.round(b.astype(np.float64), 6))

    def conv_same(x, w, b):
        H, Wd, _ = x.shape
        xp = np.pad(x, ((1, 1), (1, 1), (0, 0)))
        out = np.zeros((H, Wd, w.shape[3]))
        for i in range(3):
            for j in range(3):
                out += np.tensordot(xp[i : i + H, j : j + Wd, :], w[i, j], axes=([2], [0]))
        return np.maximum(out + b, 0)

    def pool(x):
        H, Wd, C = x.shape
        return x[: H // 2 * 2, : Wd // 2 * 2].reshape(H // 2, 2, Wd // 2, 2, C).max(axis=(1, 3))

    def forward(img):
        a = pool(conv_same(img, *deq["conv1"]))
        a = pool(conv_same(a, *deq["conv2"]))
        a = pool(conv_same(a, *deq["conv3"]))
        a4 = conv_same(a, *deq["conv4"])
        gap = a4.mean(axis=(0, 1))
        return gap @ deq["out"][0] + deq["out"][1], a4

    def ship_eval(X):
        res = [forward(f32(im).astype(np.float64)) for im in X]
        return np.array([z for z, _ in res]), [a for _, a in res]

    logits, _ = ship_eval(Xte)
    pred = logits.argmax(1)
    prob = np.exp(logits - logits.max(1, keepdims=True))
    prob /= prob.sum(1, keepdims=True)
    ship_rob = {k: r(float(np.mean(ship_eval(s[0])[0].argmax(1) == yte)), 4) for k, s in stress.items()}
    print(f"  shipped int8: {ship_rob}")
    conf = [[int(((yte == a) & (pred == p)).sum()) for p in range(3)] for a in range(3)]

    # STEP: Pick demo photos | Three random test photos per gesture, up to three mistakes, and one new-background copy per gesture, each with the shipped model's probabilities.
    # samples: 3 per gesture (random) + misclassified ones, plus one swapped-background copy per gesture
    def b64(a):
        return base64.b64encode(np.asarray(a, dtype=np.uint8).tobytes()).decode("ascii")

    rs = np.random.default_rng(SEED + 3)
    pick = [int(i) for k in range(3) for i in rs.choice(np.where(yte == k)[0], size=3, replace=False)]
    wrong = [int(i) for i in np.where(pred != yte)[0][:3]]
    samples = []
    for i in pick + [w for w in wrong if w not in pick]:
        samples.append({"id": f"T-{i:03d}", "label": int(yte[i]), "pred": int(pred[i]), "probs": [r(x, 5) for x in prob[i]], "img": b64(Xte[i]), "kind": "mistake" if pred[i] != yte[i] else "random", "variant": "original"})
    bgX = stress["New background"][0]
    bg_logits, _ = ship_eval(bgX)
    bg_prob = np.exp(bg_logits - bg_logits.max(1, keepdims=True))
    bg_prob /= bg_prob.sum(1, keepdims=True)
    for k in range(3):
        i = int(rs.choice(np.where(yte == k)[0]))
        samples.append({"id": f"B-{i:03d}", "label": int(yte[i]), "pred": int(bg_prob[i].argmax()), "probs": [r(x, 5) for x in bg_prob[i]], "img": b64(bgX[i]), "kind": "background", "variant": "new background"})

    # STEP: Export the JSON | Writes the int8 weights, model comparison, training history, stress results, confusion matrix and samples to src/data/models/hand-gestures.json.
    save(
        "hand-gestures",
        {
            "dataset": {
                "name": "Rock, Paper, Scissors (Laurence Moroney, 2019)",
                "source": "https://laurencemoroney.com/datasets.html",
                "download": "https://storage.googleapis.com/download.tensorflow.org/data/rps.zip",
                "license": "CC BY 2.0",
                "train": int(len(ytr_all)),
                "test": int(len(yte)),
                "size": 300,
            },
            "classes": CLASSES,
            "input": S,
            "split": {"train": int(len(tr)), "val": int(len(va)), "test": int(len(yte))},
            "comparison": comparison,
            "chosen": chosen,
            "history": histories[chosen],
            "history_plain": histories["Small CNN + augmentation"],
            "shipped": {"acc": ship_rob["Original"], "robust": ship_rob, "float_acc": next(c_["acc"] for c_ in comparison if c_["model"] == chosen), "bytes": int(sum(np.prod(export[k]["shape"]) for k in export)), "errors": int((pred != yte).sum())},
            "confusion": conf,
            "model": export,
            "samples": samples,
            "tf": {"tensorflow": tf.__version__, "keras": keras.__version__},
        },
    )


# ---------------------------------------------------------------------------
# DL 4. Live Forecast Lab: small LSTMs on Jakarta PM2.5, USD/IDR and Indonesian Wikipedia attention.
#        History is cached by ml/live_data.py; the browser fetches fresh data and forecasts from today.
# ---------------------------------------------------------------------------
def live_forecasts() -> None:
    # STEP: Set up the LSTM recipe | Seeds TensorFlow and defines one shared recipe: an LSTM layer plus a dense head that outputs all forecast steps at once, trained with Huber loss and early stopping.
    import keras
    import tensorflow as tf
    from keras import layers

    print("live-forecasts")
    keras.utils.set_random_seed(SEED)
    tf.config.experimental.enable_op_determinism()
    LIVE = RAW / "live"
    parity: dict = {}

    def build(L, F, units, H):
        return keras.Sequential([keras.Input((L, F)), layers.LSTM(units, name="lstm"), layers.Dense(H, name="out")])

    def fit(model, Xtr, ytr, Xva, yva, epochs=60, batch=256):
        model.compile(optimizer=keras.optimizers.Adam(1e-3), loss=keras.losses.Huber(delta=1.0))
        h = model.fit(
            Xtr, ytr, validation_data=(Xva, yva), epochs=epochs, batch_size=batch, verbose=0, shuffle=True,
            callbacks=[keras.callbacks.EarlyStopping(patience=6, restore_best_weights=True), keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=3, min_lr=1e-5)],
        )
        return {"loss": [r(v, 5) for v in h.history["loss"]], "val_loss": [r(v, 5) for v in h.history["val_loss"]]}

    # STEP: Mirror the browser's forward pass | Exports LSTM weights as plain numbers, re-runs them in NumPy exactly as src/lib/lstm.ts does, and measures the gap to Keras to prove the gate order matches.
    def export(model):
        k, rk, b = model.get_layer("lstm").get_weights()
        w, bd = model.get_layer("out").get_weights()
        rnd = lambda a: [float(f"{v:.6g}") for v in np.asarray(a).ravel()]  # noqa: E731
        return {"units": int(rk.shape[0]), "inputDim": int(k.shape[0]), "horizon": int(w.shape[1]), "kernel": rnd(k), "recurrent": rnd(rk), "bias": rnd(b), "dense": {"w": rnd(w), "b": rnd(bd)}}

    def run_np(m, X):
        """The browser's forward pass (src/lib/lstm.ts) on the rounded exported weights. X: n x L x F."""
        U, F, H = m["units"], m["inputDim"], m["horizon"]
        K = np.array(m["kernel"]).reshape(F, 4 * U)
        R = np.array(m["recurrent"]).reshape(U, 4 * U)
        B = np.array(m["bias"])
        W = np.array(m["dense"]["w"]).reshape(U, H)
        Bd = np.array(m["dense"]["b"])
        sig = lambda x: 1 / (1 + np.exp(-x))  # noqa: E731
        X = np.asarray(X, dtype=np.float64)
        h = np.zeros((len(X), U))
        c = np.zeros((len(X), U))
        for t in range(X.shape[1]):
            z = X[:, t, :] @ K + h @ R + B
            i, f, g, o = sig(z[:, :U]), sig(z[:, U : 2 * U]), np.tanh(z[:, 2 * U : 3 * U]), sig(z[:, 3 * U :])
            c = f * c + i * g
            h = o * np.tanh(c)
        return h @ W + Bd

    def vs_keras(mdl, m, X):
        """Max gap between Keras itself and the exported-weights forward pass: proves the gate order and layout."""
        gap = float(np.abs(mdl.predict(X[:512], verbose=0) - run_np(m, X[:512])).max())
        print(f"    keras vs exported forward pass: max gap {gap:.2e}")
        return float(f"{gap:.3g}")

    def keep_parity(name, m, X):
        Xr = np.round(X[-300:].astype(np.float64), 6)
        parity[name] = {"X": Xr.tolist(), "y": run_np(m, Xr).tolist()}
        return {"X": Xr[-2:].tolist(), "y": np.round(run_np(m, Xr[-2:]), 8).tolist()}

    # STEP: Prepare Jakarta PM2.5 windows | Hourly readings are log-scaled and cut into 72-hour windows with hour-of-day features to predict the next 24; the last 90 days are test, the 30 before validation.
    out: dict = {}

    # ---------------------------------------------------------------- PM2.5, Jakarta, hourly
    d = json.load(open(LIVE / "pm25_jakarta.json"))
    s = pd.Series(d["pm2_5"], index=pd.to_datetime(d["time"]), dtype="float64")
    s = s[s.index < pd.Timestamp(d["fetched"])]  # the rest of the fetch day is CAMS forecast, not analysis
    s = s[s.first_valid_index() :].interpolate(limit=6, limit_area="inside")
    v = s.to_numpy()
    y = np.log1p(v)
    hours = s.index.hour.to_numpy()
    L, H = 72, 24
    n = len(s)
    test_from = n - 90 * 24
    val_from = test_from - 30 * 24
    mu, sd = float(np.nanmean(y[:val_from])), float(np.nanstd(y[:val_from]))
    feats = np.stack([(y - mu) / sd, np.sin(2 * np.pi * hours / 24), np.cos(2 * np.pi * hours / 24)], 1)
    ts = np.array([t for t in range(L - 1, n - H) if np.isfinite(y[t - L + 1 : t + H + 1]).all()])
    X = np.stack([feats[t - L + 1 : t + 1] for t in ts]).astype("float32")
    Y = np.stack([y[t + 1 : t + H + 1] - y[t] for t in ts]).astype("float32")
    tr_m, va_m, te_m = ts + H < val_from, (ts >= val_from) & (ts + H < test_from), ts >= test_from
    # STEP: Train and test the PM2.5 model | A 32-unit LSTM learns the next 24 hourly changes; its exported-weights forecasts face same-as-now and same-hour-yesterday baselines and a 14-day backtest.
    mdl = build(L, 3, 32, H)
    hist_pm = fit(mdl, X[tr_m], Y[tr_m], X[va_m], Y[va_m])
    m_pm = export(mdl)
    gap_pm = vs_keras(mdl, m_pm, X[te_m])
    t_te = ts[te_m]
    P = run_np(m_pm, X[te_m])
    actual = np.stack([v[t + 1 : t + H + 1] for t in t_te])
    preds = {
        "LSTM": np.expm1(y[t_te][:, None] + P),
        "Same as now": np.repeat(v[t_te][:, None], H, 1),
        "Same hour yesterday": np.stack([v[t + 1 - 24 : t + H + 1 - 24] for t in t_te]),
    }
    pm_cmp = []
    for k, p in preds.items():
        e = np.abs(p - actual)
        pm_cmp.append({"model": k, "mae": r(e.mean(), 3), "by_h": [r(x, 3) for x in e.mean(0)]})
    print("  pm2.5", [(c_["model"], c_["mae"]) for c_ in pm_cmp], "windows", len(ts), "epochs", len(hist_pm["loss"]))
    idx = {t: i for i, t in enumerate(t_te)}
    backtest = []
    for t_end in range(n - 14 * 24, n):
        t0 = t_end - 24
        if t0 in idx:
            backtest.append([s.index[t_end].strftime("%Y-%m-%dT%H:%M"), r(v[t_end], 2), r(preds["LSTM"][idx[t0], 23], 2), r(v[t0], 2)])
    daily = s.resample("D").mean().dropna()
    out["pm25"] = {
        "source": "Open-Meteo Air Quality API (CAMS global atmospheric composition forecasts)",
        "url": "https://open-meteo.com/en/docs/air-quality-api",
        "place": "Jakarta",
        "lat": -6.2,
        "lon": 106.85,
        "range": [str(s.index[0].date()), str(s.index[-1].date())],
        "hours": int(np.isfinite(v).sum()),
        "windows": int(len(ts)),
        "L": L,
        "H": H,
        "mu": r(mu, 6),
        "sd": r(sd, 6),
        "model": m_pm,
        "history": hist_pm,
        "comparison": pm_cmp,
        "split": {"val_from": str(s.index[val_from].date()), "test_from": str(s.index[test_from].date()), "train": int(tr_m.sum()), "val": int(va_m.sum()), "test": int(te_m.sum())},
        "backtest": backtest,
        "by_hour": [r(x, 2) for x in s.groupby(s.index.hour).median().to_numpy()],
        "by_month": [r(x, 2) for x in s.groupby(s.index.month).median().to_numpy()],
        "who": 15.0,  # WHO 2021 air quality guideline, 24-hour mean PM2.5 (ug/m3)
        "days_over_who": r((daily > 15.0).mean(), 4),
        "days": int(len(daily)),
        "snapshot": {"time": [t.strftime("%Y-%m-%dT%H:%M") for t in s.index[-168:]], "value": [r(x, 2) for x in v[-168:]]},
        "check": keep_parity("pm25", m_pm, X[te_m]),
        "keras_gap": gap_pm,
    }
    sv, st = np.array(out["pm25"]["snapshot"]["value"]), s.index[-168:]
    seq = np.stack([(np.log1p(sv) - out["pm25"]["mu"]) / out["pm25"]["sd"], np.sin(2 * np.pi * st.hour / 24), np.cos(2 * np.pi * st.hour / 24)], 1)[-L:]
    out["pm25"]["snapshot"]["forecast"] = [r(x, 6) for x in np.expm1(np.log1p(sv[-1]) + run_np(m_pm, seq[None])[0])]

    # STEP: Prepare USD/IDR windows | Daily log returns, scaled by their long-run spread, form 60-day windows that predict the next 5 days; the last 500 days are test and the 250 before validation.
    # ---------------------------------------------------------------- USD/IDR, daily (ECB business days)
    d = json.load(open(LIVE / "usd_idr.json"))
    fx = pd.Series(d["rates"], dtype="float64")
    fx.index = pd.to_datetime(fx.index)
    v = fx.to_numpy()
    lr = np.log(v)
    ret = np.diff(lr, prepend=lr[0])
    L, H, VOLW, VOLF = 60, 5, 20, 0.25
    n = len(v)
    test_from = n - 500
    val_from = test_from - 250
    sd_r = float(ret[1:val_from].std())
    feat = (ret / sd_r)[:, None]
    ts = np.arange(L, n - H)
    X = np.stack([feat[t - L + 1 : t + 1] for t in ts]).astype("float32")
    Y = np.stack([(lr[t + 1 : t + H + 1] - lr[t]) / sd_r for t in ts]).astype("float32")
    vol = np.maximum(X[:, -VOLW:, 0].astype(np.float64).std(1), VOLF)  # recent volatility, in units of the long-run daily move
    tr_m, va_m, te_m = ts + H < val_from, (ts >= val_from) & (ts + H < test_from), ts >= test_from
    # STEP: Train and test the USD/IDR model | A 16-unit LSTM faces random-walk and drift baselines; the 0.1 and 0.9 quantiles of its validation errors, scaled by recent volatility, set its forecast band.
    mdl = build(L, 1, 16, H)
    hist_fx = fit(mdl, X[tr_m], Y[tr_m], X[va_m], Y[va_m])
    m_fx = export(mdl)
    gap_fx = vs_keras(mdl, m_fx, X[te_m])
    resid = (Y[va_m] - run_np(m_fx, X[va_m])) / vol[va_m][:, None]
    q_lo, q_hi = np.quantile(resid, 0.1, axis=0), np.quantile(resid, 0.9, axis=0)
    t_te = ts[te_m]
    P = run_np(m_fx, X[te_m])
    now = v[t_te][:, None]
    act = np.stack([v[t + 1 : t + H + 1] for t in t_te])
    to_rate = lambda z: now * np.exp(z * sd_r)  # noqa: E731
    drift = float(ret[1:val_from].mean())
    preds = {"LSTM": to_rate(P), "No change (random walk)": np.repeat(now, H, 1), "Long-run drift": now * np.exp(drift * np.arange(1, H + 1))[None, :]}
    moved = act[:, -1] != now[:, 0]
    fx_cmp = []
    for k, p in preds.items():
        e = np.abs(p - act)
        dir_acc = None if k.startswith("No change") else r(np.mean(np.sign(p[moved, -1] - now[moved, 0]) == np.sign(act[moved, -1] - now[moved, 0])), 4)
        fx_cmp.append({"model": k, "mae1": r(e[:, 0].mean(), 2), "mae5": r(e[:, -1].mean(), 2), "by_h": [r(x, 2) for x in e.mean(0)], "direction": dir_acc})
    vt = vol[te_m][:, None]
    lo, hi = to_rate(P + q_lo * vt), to_rate(P + q_hi * vt)
    inside = (act >= lo) & (act <= hi)
    calm = vt[:, 0] <= np.median(vt)
    print("  usd/idr", [(c_["model"], c_["mae1"], c_["mae5"], c_["direction"]) for c_ in fx_cmp], "band cover", round(float(inside.mean()), 3), "epochs", len(hist_fx["loss"]))
    out["fx"] = {
        "source": "Frankfurter API (European Central Bank reference rates)",
        "url": "https://frankfurter.dev",
        "range": [str(fx.index[0].date()), str(fx.index[-1].date())],
        "days": int(n),
        "L": L,
        "H": H,
        "sd": r(sd_r, 8),
        "vol_window": VOLW,
        "vol_floor": VOLF,
        "band": {
            "lo": [r(x, 6) for x in q_lo],
            "hi": [r(x, 6) for x in q_hi],
            "coverage": r(inside.mean(), 4),
            "coverage_calm": r(inside[calm].mean(), 4),
            "coverage_rough": r(inside[~calm].mean(), 4),
            "width5": r(np.mean(hi[:, -1] - lo[:, -1]), 1),
            "width5_calm": r(np.mean((hi[:, -1] - lo[:, -1])[calm]), 1),
            "width5_rough": r(np.mean((hi[:, -1] - lo[:, -1])[~calm]), 1),
        },
        "model": m_fx,
        "history": hist_fx,
        "comparison": fx_cmp,
        "up_share": r(np.mean(act[moved, -1] > now[moved, 0]), 4),  # weeks the rupiah weakened: what an "always up" guess scores
        "split": {"val_from": str(fx.index[val_from].date()), "test_from": str(fx.index[test_from].date()), "train": int(tr_m.sum()), "val": int(va_m.sum()), "test": int(te_m.sum())},
        "monthly": [[str(k.date())[:7], r(x, 1)] for k, x in fx.resample("MS").mean().items()],
        "vol_by_year": [{"label": str(k), "value": r(np.diff(np.log(g.to_numpy())).std() * np.sqrt(252), 4)} for k, g in fx.groupby(fx.index.year) if len(g) > 50],
        "snapshot": {"date": [str(t.date()) for t in fx.index[-120:]], "value": [r(x, 2) for x in v[-120:]]},
        "check": keep_parity("fx", m_fx, X[te_m]),
        "keras_gap": gap_fx,
    }
    sv, sdr, bd = np.array(out["fx"]["snapshot"]["value"]), out["fx"]["sd"], out["fx"]["band"]
    seq = (np.diff(np.log(sv)) / sdr)[-L:]
    vv = max(seq[-VOLW:].std(), VOLF)
    o = run_np(m_fx, seq[None, :, None])[0]
    out["fx"]["snapshot"]["forecast"] = {k: [r(x, 4) for x in sv[-1] * np.exp((o + np.array(q) * vv) * sdr)] for k, q in [("mid", [0] * H), ("lo", bd["lo"]), ("hi", bd["hi"])]}

    # STEP: Prepare Wikipedia attention windows | Every article feeds one global model: 28-day log windows with weekday features predict the next 7 days, skipping quiet windows under 20 views and flagging spikes.
    # ---------------------------------------------------------------- Indonesian Wikipedia attention, daily, one global model
    d = json.load(open(LIVE / "wiki_id.json"))
    L, H, MINV = 28, 7, 20
    days = pd.date_range(end=pd.Timestamp(d["fetched"]) - pd.Timedelta(days=1), periods=2 * 365 + 30)
    dow = days.day_of_week.to_numpy()  # Monday = 0, as in the browser's (getUTCDay() + 6) % 7
    dsin, dcos = np.sin(2 * np.pi * dow / 7), np.cos(2 * np.pi * dow / 7)
    test_from_day, val_from_day = days[-60], days[-90]
    Xs, Ys, when, base_seas, base_mean, spike = [], [], [], [], [], []
    for ser in d["series"].values():
        vv = pd.Series({pd.Timestamp(k): x for k, x in ser.items()}, dtype="float64").reindex(days).fillna(0.0).to_numpy()
        lv = np.log1p(vv)
        for t in range(L - 1, len(vv) - H, 2):
            w = lv[t - L + 1 : t + 1]
            if np.expm1(w.mean()) < MINV:
                continue
            Xs.append(np.stack([w - w.mean(), dsin[t - L + 1 : t + 1], dcos[t - L + 1 : t + 1]], 1))
            Ys.append(lv[t + 1 : t + H + 1] - lv[t])
            when.append(days[t])
            base_seas.append(lv[t + 1 - 7 : t + H + 1 - 7] - lv[t])
            base_mean.append(lv[t - 6 : t + 1].mean() - lv[t])
            spike.append(vv[t] >= 3 * np.median(vv[t - L + 1 : t + 1]))
    X = np.stack(Xs).astype("float32")
    Y = np.stack(Ys).astype("float32")
    when = pd.DatetimeIndex(when)
    tr_m = np.asarray(when + pd.Timedelta(days=H) < val_from_day)
    va_m = np.asarray((when >= val_from_day) & (when + pd.Timedelta(days=H) < test_from_day))
    te_m = np.asarray(when >= test_from_day)
    # STEP: Train and test the Wikipedia model | A 32-unit LSTM is scored against yesterday, last-week and 7-day-average baselines, overall and on spike days, and its post-spike decay is compared with reality.
    mdl = build(L, 3, 32, H)
    hist_wk = fit(mdl, X[tr_m], Y[tr_m], X[va_m], Y[va_m], epochs=40, batch=512)
    m_wk = export(mdl)
    gap_wk = vs_keras(mdl, m_wk, X[te_m])
    P = run_np(m_wk, X[te_m])
    Yt = Y[te_m].astype(np.float64)
    sp = np.array(spike)[te_m]
    base = {"LSTM": P, "Same as yesterday": np.zeros_like(Yt), "Same weekday last week": np.array(base_seas)[te_m], "Last 7-day average": np.repeat(np.array(base_mean)[te_m][:, None], H, 1)}
    wk_cmp = []
    for k, p in base.items():
        e = np.abs(p - Yt)
        wk_cmp.append({"model": k, "mae_log": r(e.mean(), 4), "typical": r(np.expm1(e.mean()), 4), "by_h": [r(x, 4) for x in e.mean(0)], "spike_mae_log": r(e[sp].mean(), 4), "spike_typical": r(np.expm1(e[sp].mean()), 4)})
    print("  wiki", [(c_["model"], c_["mae_log"], c_["spike_mae_log"]) for c_ in wk_cmp], "windows", len(X), "test", int(te_m.sum()), "spikes", int(sp.sum()), "epochs", len(hist_wk["loss"]))
    top = [a for a in sorted(d["top_days"], key=lambda a: -d["top_days"][a]) if a in d["series"]][:6]
    out["wiki"] = {
        "source": "Wikimedia REST API (pageviews, Indonesian Wikipedia, user agents only)",
        "url": "https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/",
        "articles": len(d["series"]),
        "distinct_trending": len(d["top_days"]),
        "range": [str(days[0].date()), str(days[-1].date())],
        "windows": int(len(X)),
        "L": L,
        "H": H,
        "min_views": MINV,
        "model": m_wk,
        "history": hist_wk,
        "comparison": wk_cmp,
        "decay": {  # median views on the days after a spike, as a share of the spike day
            "actual": [r(x, 4) for x in np.median(np.exp(Y[np.array(spike)]), axis=0)],
            "spikes": int(np.sum(spike)),
            "test_actual": [r(x, 4) for x in np.median(np.exp(Yt[sp]), axis=0)],
            "test_lstm": [r(x, 4) for x in np.median(np.exp(P[sp]), axis=0)],
        },
        "split": {"val_from": str(val_from_day.date()), "test_from": str(test_from_day.date()), "train": int(tr_m.sum()), "val": int(va_m.sum()), "test": int(te_m.sum()), "spikes": int(sp.sum())},
        "snapshot": {
            "date": [str(t.date()) for t in days[-42:]],
            "articles": {a: [int(d["series"][a].get(f"{t:%Y%m%d}", 0)) for t in days[-42:]] for a in top},
        },
        "check": keep_parity("wiki", m_wk, X[te_m]),
        "keras_gap": gap_wk,
    }
    a0 = top[0]
    lv = np.log1p(np.array(out["wiki"]["snapshot"]["articles"][a0], dtype=np.float64))[-L:]
    dw = pd.DatetimeIndex(out["wiki"]["snapshot"]["date"][-L:]).day_of_week.to_numpy()
    seq = np.stack([lv - lv.mean(), np.sin(2 * np.pi * dw / 7), np.cos(2 * np.pi * dw / 7)], 1)
    out["wiki"]["snapshot"]["forecast"] = [r(x, 4) for x in np.expm1(lv[-1] + run_np(m_wk, seq[None])[0])]

    # STEP: Save parity data and JSON | Writes test windows and their NumPy forecasts to parity.json for checking the browser code, then saves all three models and results to live-forecasts.json.
    json.dump(parity, open(LIVE / "parity.json", "w"))
    save("live-forecasts", {**out, "trained": str(pd.Timestamp.today().date()), "tf": {"tensorflow": tf.__version__, "keras": keras.__version__}})


# ---------------------------------------------------------------------------
# DL 5. Bilingual Sentiment: Indonesian reviews (SmSA, IndoNLU) and English Reddit comments (GoEmotions)
#        TF-IDF + logistic regression vs averaged embeddings vs BiLSTM; int8 weights, run in the browser
# ---------------------------------------------------------------------------
SENT_TOKEN = r"[a-z0-9]+(?:'[a-z]+)?|[^\sa-z0-9]"  # the browser uses the same pattern (src/lib/text-lstm.ts)
SENT_MAXLEN = 100
SENT_CONFIGS = {"avg": [(48, 0)], "bilstm": [(48, 32), (64, 64)]}  # (embedding size, LSTM units per direction)
# never shown among the top words (the models still see them in training, as in the real data)
SENT_RUDE = {
    "fuck", "fucking", "fucked", "shit", "bitch", "cunt", "dick", "asshole", "bastard", "slut", "whore", "fag", "retard", "nigga", "nigger", "piss", "cock", "pussy", "porn", "sex", "rape",
    "anjing", "bangsat", "bokong", "kontol", "memek", "goblok", "tolol", "bego", "kampret", "tai", "jancok", "asu", "babi", "ngentot", "bajingan", "brengsek",
}


# Demo samples: real test rows, hand-picked for plain topics (apps, phones, food, sport, hobbies) after word filters kept
# letting sensitive Reddit comments through. Two the shipped model gets right and one it gets wrong per class.
SENT_PICKS = {
    "id": [135, 155, 181, 264, 266, 453, 17, 41, 308],
    "en": [3, 61, 1, 23, 28, 36, 96, 8, 103, 85, 300, 143],
}


def sentiment() -> None:
    # STEP: Tokenise and define the networks | Uses the browser's token pattern, maps words to ids (0 for padding, 1 for unknown) and defines an averaged-embedding model and a BiLSTM with padding-aware max pooling.
    import base64
    import re

    import keras
    import tensorflow as tf
    from keras import layers
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics import accuracy_score, confusion_matrix, f1_score

    print("bilingual-sentiment")
    keras.utils.set_random_seed(SEED)
    tf.config.experimental.enable_op_determinism()
    TOK = re.compile(SENT_TOKEN)
    tok = lambda t: TOK.findall(str(t).replace("’", "'").lower())[:SENT_MAXLEN]  # noqa: E731
    parity: dict = {}

    class MaskedMax(layers.Layer):
        """Max over time that ignores padding, so the browser can run unpadded sequences and get the same answer."""

        def __init__(self, **kw):
            super().__init__(**kw)
            self.supports_masking = True

        def call(self, x, mask=None):
            if mask is not None:
                x = keras.ops.where(keras.ops.expand_dims(mask, -1), x, -1e9)
            return keras.ops.max(x, axis=1)

        def compute_mask(self, inputs, mask=None):
            return None

    def vocab_of(token_lists, min_count, cap):
        cnt: dict[str, int] = {}
        for ts in token_lists:
            for t in ts:
                cnt[t] = cnt.get(t, 0) + 1
        words = [w for w, c in sorted(cnt.items(), key=lambda kv: (-kv[1], kv[0])) if c >= min_count][:cap]
        return words, {w: i + 2 for i, w in enumerate(words)}  # 0 = padding, 1 = unknown word

    def encode(token_lists, index):
        X = np.zeros((len(token_lists), SENT_MAXLEN), dtype="int32")
        for i, ts in enumerate(token_lists):
            ids = [index.get(t, 1) for t in ts] or [1]
            X[i, : len(ids)] = ids
        return X

    def build(kind, V, heads, D=48, U=32):
        inp = keras.Input((SENT_MAXLEN,), dtype="int32")
        x = layers.Embedding(V, D, mask_zero=True, name="emb")(inp)
        if kind == "avg":
            x = layers.GlobalAveragePooling1D()(x)
        else:
            x = layers.SpatialDropout1D(0.2)(x)
            x = layers.Bidirectional(layers.LSTM(U, return_sequences=True), name="bilstm")(x)
            x = MaskedMax()(x)
        x = layers.Dropout(0.3)(x)
        outs = [layers.Dense(n, activation=act, name=name)(x) for name, n, act in heads]
        return keras.Model(inp, outs if len(outs) > 1 else outs[0])

    def balanced(y, k):
        w = len(y) / (k * np.bincount(y, minlength=k))
        return w[y]

    # STEP: Write the export and training helpers | Int8 export with one scale per row or column, a NumPy copy of the browser's forward pass, plus training, rare-emotion loss, threshold and top-word helpers.
    def q8_cols(w):
        scale = np.abs(w).max(axis=0) / 127
        scale = np.where(scale == 0, 1e-12, scale)
        scale = np.array([float(f"{s:.8g}") for s in scale])
        q = np.round(w / scale).astype(np.int8)
        return {"shape": list(w.shape), "scale": [float(s) for s in scale], "q": base64.b64encode(q.tobytes()).decode("ascii")}, q.astype(np.float64) * scale

    def export(model, kind, head_names):
        E = model.get_layer("emb").get_weights()[0]
        rs = np.abs(E).max(axis=1) / 127
        rs = np.where(rs == 0, 1e-12, rs)
        rs = np.array([float(f"{s:.6g}") for s in rs])
        Eq = np.clip(np.round(E / rs[:, None]), -127, 127).astype(np.int8)
        out = {"kind": kind, "emb": {"shape": list(E.shape), "scale": [float(s) for s in rs], "q": base64.b64encode(Eq.tobytes()).decode("ascii")}}
        deq = {"emb": Eq.astype(np.float64) * rs[:, None]}
        if kind == "bilstm":
            fk, fr, fb, bk, br, bb = model.get_layer("bilstm").get_weights()
            for name, (k, rr, b) in {"fwd": (fk, fr, fb), "bwd": (bk, br, bb)}.items():
                ek, dk = q8_cols(k)
                er, dr = q8_cols(rr)
                out[name] = {"units": int(rr.shape[0]), "kernel": ek, "recurrent": er, "bias": [r(v, 6) for v in b]}
                deq[name] = (dk, dr, np.round(b.astype(np.float64), 6), int(rr.shape[0]))
        for h in head_names:
            w, b = model.get_layer(h).get_weights()
            ew, dw = q8_cols(w)
            out[h] = {"w": ew, "b": [r(v, 6) for v in b]}
            deq[h] = (dw, np.round(b.astype(np.float64), 6))
        return out, deq

    sig = lambda z: 1 / (1 + np.exp(-z))  # noqa: E731

    def forward(deq, kind, ids, head_names):
        """Exactly the browser's forward pass on one unpadded sentence (list of ids)."""
        x = deq["emb"][np.asarray(ids)]
        if kind == "avg":
            hvec = x.mean(axis=0)
        else:
            seqs = []
            for name, rev in [("fwd", False), ("bwd", True)]:
                k, rr, b, U = deq[name]
                h = np.zeros(U)
                c = np.zeros(U)
                outs = []
                for t in (x[::-1] if rev else x):
                    z = t @ k + h @ rr + b
                    i, f, g, o = sig(z[:U]), sig(z[U : 2 * U]), np.tanh(z[2 * U : 3 * U]), sig(z[3 * U :])
                    c = f * c + i * g
                    h = o * np.tanh(c)
                    outs.append(h)
                seqs.append(np.array(outs[::-1] if rev else outs))
            hvec = np.concatenate(seqs, axis=1).max(axis=0)
        res = {}
        for hname in head_names:
            w, b = deq[hname]
            z = hvec @ w + b
            res[hname] = (np.exp(z - z.max()) / np.exp(z - z.max()).sum()) if hname == "sent" else sig(z)
        return res

    def fit(model, X, ys, ws, Xv, yv, wv, losses, loss_weights=None):
        model.compile(optimizer=keras.optimizers.Adam(2e-3), loss=losses, loss_weights=loss_weights)
        h = model.fit(
            X, ys, sample_weight=ws, validation_data=(Xv, yv, wv), epochs=25, batch_size=128, verbose=0,
            callbacks=[keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True), keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=1, min_lr=1e-4)],
        )
        return {"loss": [r(v, 5) for v in h.history["loss"]], "val_loss": [r(v, 5) for v in h.history["val_loss"]]}

    def weighted_bce(pos_weight):
        """Binary cross-entropy that counts each rare emotion's positives more (the first run's emotion head barely learned)."""
        pw = keras.ops.convert_to_tensor(pos_weight.astype("float32"))

        def loss(y, p):
            p = keras.ops.clip(p, 1e-7, 1 - 1e-7)
            return -keras.ops.mean(pw * y * keras.ops.log(p) + (1 - y) * keras.ops.log(1 - p), axis=-1)

        return loss

    def best_thresholds(P, Y):
        grid = np.concatenate([[0.01, 0.02, 0.03, 0.04], np.arange(0.05, 0.96, 0.05)])  # rare emotions need low cut-offs
        return np.array([grid[int(np.argmax([f1_score(Y[:, j], P[:, j] >= t, zero_division=0) for t in grid]))] for j in range(Y.shape[1])])

    def top_words(vec, lr, classes, k=12):
        names = np.array(vec.get_feature_names_out())
        out = {}
        for ci, c in enumerate(classes):
            coef = lr.coef_[ci]
            idx = [i for i in np.argsort(-coef) if " " not in names[i] and names[i].isalpha() and names[i] not in SENT_RUDE][:k]
            out[c] = [{"word": str(names[i]), "weight": r(coef[i], 3)} for i in idx]
        return out

    # STEP: Prepare the Indonesian reviews | Loads the SmSA train, validation and test files, tokenises each review and keeps words seen at least twice, up to 8000, as the vocabulary.
    payload: dict = {}

    # ================================================================ Indonesian: SmSA (IndoNLU, Apache-2.0)
    rd = lambda f: pd.read_csv(RAW / "smsa" / f, sep="\t", header=None, names=["text", "label"], quoting=3)  # noqa: E731
    tr, va, te = rd("train_preprocess.tsv"), rd("valid_preprocess.tsv"), rd("test_preprocess.tsv")
    ID_CLASSES = ["positive", "neutral", "negative"]
    ci = {c: i for i, c in enumerate(ID_CLASSES)}
    ytr, yva, yte = (d.label.map(ci).to_numpy() for d in (tr, va, te))
    Ttr, Tva, Tte = ([tok(t) for t in d.text] for d in (tr, va, te))
    words, index = vocab_of(Ttr, 2, 8000)
    V = len(words) + 2
    Xtr, Xva, Xte = encode(Ttr, index), encode(Tva, index), encode(Tte, index)
    oov = float(np.mean([index.get(t, 1) == 1 for ts in Tte for t in ts]))
    print(f"  id: vocab {V}, test OOV {oov:.3f}")
    # STEP: Compare three Indonesian models | TF-IDF with logistic regression, averaged embeddings and a BiLSTM, each tuned on validation macro-F1 with balanced class weights, then scored on the test reviews.
    cmp_id = []
    # 1) TF-IDF + logistic regression
    best = None
    for C in [1, 3, 10]:
        vec = TfidfVectorizer(tokenizer=tok, lowercase=False, token_pattern=None, ngram_range=(1, 2), min_df=2, sublinear_tf=True)
        A = vec.fit_transform(tr.text)
        lr = LogisticRegression(C=C, max_iter=3000, class_weight="balanced").fit(A, ytr)
        f = f1_score(yva, lr.predict(vec.transform(va.text)), average="macro")
        if best is None or f > best[0]:
            best = (f, C, vec, lr)
    _, C_id, vec_id, lr_id = best
    p = lr_id.predict(vec_id.transform(te.text))
    cmp_id.append({"model": "TF-IDF + logistic regression", "val_f1": r(best[0], 4), "acc": r(accuracy_score(yte, p), 4), "f1": r(f1_score(yte, p, average="macro"), 4), "params": int(lr_id.coef_.size)})
    # 2) + 3) neural models
    trained_id = {}
    for kind, label in [("avg", "Word embeddings, averaged"), ("bilstm", "BiLSTM")]:
        cand = None
        for D, U in SENT_CONFIGS[kind]:  # sizes compared on validation data only
            keras.utils.set_random_seed(SEED)
            m = build(kind, V, [("sent", 3, "softmax")], D, U)
            hist = fit(m, Xtr, ytr, balanced(ytr, 3), Xva, yva, balanced(yva, 3), "sparse_categorical_crossentropy")
            vf = f1_score(yva, m.predict(Xva, verbose=0).argmax(1), average="macro")
            print(f"    id {kind} dim {D} units {U}: val macro-F1 {vf:.4f}")
            if cand is None or vf > cand[2]:
                cand = (m, hist, vf, D, U)
        m, hist, vf, D, U = cand
        pt = m.predict(Xte, verbose=0).argmax(1)
        trained_id[kind] = (m, hist, vf)
        cmp_id.append({"model": label, "val_f1": r(vf, 4), "acc": r(accuracy_score(yte, pt), 4), "f1": r(f1_score(yte, pt, average="macro"), 4), "params": int(m.count_params()), "epochs": len(hist["loss"]), "dim": D, "units": U if kind == "bilstm" else None})
    print("  id", [(c_["model"], c_["acc"], c_["f1"]) for c_ in cmp_id])
    # STEP: Ship the Indonesian model | Keeps the neural model with the best validation F1, exports it as int8 and re-scores the test reviews with the NumPy forward pass, checking it against the float model.
    kind_id = max(trained_id, key=lambda k: trained_id[k][2])
    m_id, hist_id, _ = trained_id[kind_id]
    exp_id, deq_id = export(m_id, kind_id, ["sent"])
    seqs_te = [[index.get(t, 1) for t in ts] or [1] for ts in Tte]
    P_ship = np.array([forward(deq_id, kind_id, s, ["sent"])["sent"] for s in seqs_te])
    p_ship = P_ship.argmax(1)
    agree = float(np.mean(p_ship == m_id.predict(Xte, verbose=0).argmax(1)))
    gap = float(np.abs(m_id.predict(Xte[:200], verbose=0) - P_ship[:200]).max())
    print(f"  id shipped {kind_id}: acc {accuracy_score(yte, p_ship):.4f} f1 {f1_score(yte, p_ship, average='macro'):.4f}, agrees with float {agree:.4f}, max prob gap {gap:.4f}")
    parity["id"] = {"seqs": seqs_te, "probs": P_ship.tolist(), "texts": te.text.tolist()[:300], "tokens": [[index.get(t, 1) for t in ts] for ts in Tte[:300]]}
    pick = [{"id": f"id-{i}", "text": te.text[i], "label": ID_CLASSES[yte[i]], "pred": ID_CLASSES[p_ship[i]], "probs": [r(v, 4) for v in P_ship[i]]} for i in SENT_PICKS["id"]]
    payload["id"] = {
        "dataset": {"name": "SmSA (IndoNLU)", "source": "https://github.com/IndoNLP/indonlu", "license": "Apache-2.0", "origin": "Prosa.ai; Purwarianti & Crisdayanti (2019)", "train": len(tr), "val": len(va), "test": len(te)},
        "classes": ID_CLASSES,
        "label_counts": {d: {c: int((x == i).sum()) for i, c in enumerate(ID_CLASSES)} for d, x in [("train", ytr), ("val", yva), ("test", yte)]},
        "lengths": [int(v) for v in np.percentile([len(t) for t in Ttr], [10, 25, 50, 75, 90, 95])],
        "len_hist": np.histogram(np.minimum([len(t) for t in Ttr], 120), bins=24, range=(0, 120))[0].tolist(),
        "vocab": words,
        "oov": r(oov, 4),
        "comparison": cmp_id,
        "chosen": dict(avg="Word embeddings, averaged", bilstm="BiLSTM")[kind_id],
        "lr_C": C_id,
        "history": hist_id,
        "shipped": {"acc": r(accuracy_score(yte, p_ship), 4), "f1": r(f1_score(yte, p_ship, average="macro"), 4), "per_class_f1": [r(v, 4) for v in f1_score(yte, p_ship, average=None)], "agree_float": r(agree, 4), "confusion": confusion_matrix(yte, p_ship).tolist()},
        "top_words": top_words(vec_id, lr_id, ID_CLASSES),
        "model": exp_id,
        "samples": pick,
        "check": {"ids": seqs_te[:3], "probs": [[r(v, 8) for v in P_ship[i]] for i in range(3)]},
    }

    # STEP: Prepare the English comments | GoEmotions labels map to positive, neutral, negative or ambiguous; mixed-sentiment comments train only the emotion task; the vocabulary keeps up to 10000 words.
    # ================================================================ English: GoEmotions (Google Research, Apache-2.0)
    emo = open(RAW / "goemotions" / "emotions.txt", encoding="utf-8").read().split()
    mapping = json.load(open(RAW / "goemotions" / "sentiment_mapping.json"))
    group = {e: k for k, v in mapping.items() for e in v}
    group["neutral"] = "neutral"
    EN_CLASSES = ["positive", "neutral", "negative", "ambiguous"]
    rg = lambda f: pd.read_csv(RAW / "goemotions" / f, sep="\t", header=None, names=["text", "labels", "id"], quoting=3)  # noqa: E731
    gtr, gva, gte = rg("train.tsv"), rg("dev.tsv"), rg("test.tsv")

    def targets(d):
        E = np.zeros((len(d), len(emo)), dtype="float32")
        s = np.zeros(len(d), dtype="int32")
        keep = np.ones(len(d), dtype=bool)
        for i, ls in enumerate(d.labels):
            ids = [int(x) for x in str(ls).split(",")]
            E[i, ids] = 1
            gs = {group[emo[j]] for j in ids}
            if len(gs) == 1:
                s[i] = EN_CLASSES.index(gs.pop())
            else:
                keep[i] = False  # mixed: no single sentiment, still used for emotions
        return E, s, keep

    Etr, Str, Ktr = targets(gtr)
    Eva, Sva, Kva = targets(gva)
    Ete, Ste, Kte = targets(gte)
    Gtr, Gva, Gte = ([tok(t) for t in d.text] for d in (gtr, gva, gte))
    gwords, gindex = vocab_of(Gtr, 2, 10000)
    GV = len(gwords) + 2
    GXtr, GXva, GXte = encode(Gtr, gindex), encode(Gva, gindex), encode(Gte, gindex)
    goov = float(np.mean([gindex.get(t, 1) == 1 for ts in Gte for t in ts]))
    print(f"  en: vocab {GV}, test OOV {goov:.3f}, mixed-sentiment rows dropped from the sentiment task: {int((~Ktr).sum())}")
    # STEP: Compare English models with two heads | A TF-IDF baseline adds one logistic regression per emotion; neural models get a sentiment head and an emotion head, trying two positive-weight schemes for rare emotions.
    cmp_en = []
    best = None
    for C in [1, 3, 10]:
        vec = TfidfVectorizer(tokenizer=tok, lowercase=False, token_pattern=None, ngram_range=(1, 2), min_df=2, sublinear_tf=True)
        A = vec.fit_transform(gtr.text)
        lr = LogisticRegression(C=C, max_iter=3000, class_weight="balanced").fit(A[Ktr], Str[Ktr])
        f = f1_score(Sva[Kva], lr.predict(vec.transform(gva.text[Kva])), average="macro")
        if best is None or f > best[0]:
            best = (f, C, vec, lr, A)
    _, C_en, vec_en, lr_en, A_en = best
    p = lr_en.predict(vec_en.transform(gte.text[Kte]))
    # emotions with the baseline: one logistic regression per emotion
    from sklearn.multiclass import OneVsRestClassifier

    ovr = OneVsRestClassifier(LogisticRegression(C=C_en, max_iter=3000, class_weight="balanced"), n_jobs=-1).fit(A_en, Etr.astype(int))
    th_lr = best_thresholds(ovr.predict_proba(vec_en.transform(gva.text)), Eva)
    emo_f1_lr = f1_score(Ete, ovr.predict_proba(vec_en.transform(gte.text)) >= th_lr, average="macro", zero_division=0)
    cmp_en.append({"model": "TF-IDF + logistic regression", "val_f1": r(best[0], 4), "acc": r(accuracy_score(Ste[Kte], p), 4), "f1": r(f1_score(Ste[Kte], p, average="macro"), 4), "emo_f1": r(emo_f1_lr, 4), "params": int(lr_en.coef_.size + sum(e.coef_.size for e in ovr.estimators_))})
    heads = [("sent", 4, "softmax"), ("emo", len(emo), "sigmoid")]
    trained_en = {}
    ratio = (1 - Etr.mean(0)) / Etr.mean(0)
    POS_W = {"sqrt": np.clip(np.sqrt(ratio), 1, 15), "full": np.clip(ratio, 1, 50)}  # per emotion: rarer -> heavier positives
    ws = balanced(Str, 4) * Ktr  # mixed rows weigh 0 for sentiment, full for emotions
    wv = balanced(Sva, 4) * Kva
    for kind, label in [("avg", "Word embeddings, averaged"), ("bilstm", "BiLSTM")]:
        cand = None
        for D, U in SENT_CONFIGS[kind]:
            for scheme in POS_W:
                keras.utils.set_random_seed(SEED)
                m = build(kind, GV, heads, D, U)
                # outputs in order [sentiment, emotions]: Keras 3 takes lists for multi-output targets and weights
                hist = fit(m, GXtr, [Str, Etr], [ws, np.ones(len(Etr))], GXva, [Sva, Eva], [wv, np.ones(len(Eva))], ["sparse_categorical_crossentropy", weighted_bce(POS_W[scheme])], loss_weights=[1.0, 3.0])
                Pv_s, Pv_e = m.predict(GXva, verbose=0)
                vf = f1_score(Sva[Kva], Pv_s[Kva].argmax(1), average="macro")
                ef = f1_score(Eva, Pv_e >= best_thresholds(Pv_e, Eva), average="macro", zero_division=0)  # optimistic (tuned on val), only to compare runs
                print(f"    en {kind} dim {D} units {U} pos-weights {scheme}: val sentiment F1 {vf:.4f}, val emotions F1 {ef:.4f}")
                if cand is None or vf + ef > cand[2] + cand[6]:
                    cand = (m, hist, vf, D, U, Pv_e, ef, scheme)
        m, hist, vf, D, U, Pv_e, _, scheme = cand
        Pt_s, Pt_e = m.predict(GXte, verbose=0)
        th = best_thresholds(Pv_e, Eva)
        trained_en[kind] = (m, hist, vf)
        cmp_en.append({"model": label, "val_f1": r(vf, 4), "acc": r(accuracy_score(Ste[Kte], Pt_s[Kte].argmax(1)), 4), "f1": r(f1_score(Ste[Kte], Pt_s[Kte].argmax(1), average="macro"), 4), "emo_f1": r(f1_score(Ete, Pt_e >= th, average="macro", zero_division=0), 4), "params": int(m.count_params()), "epochs": len(hist["loss"]), "dim": D, "units": U if kind == "bilstm" else None, "pos_weights": scheme})
    print("  en", [(c_["model"], c_["acc"], c_["f1"], c_["emo_f1"]) for c_ in cmp_en])
    # STEP: Ship the English model | Keeps the neural model with the best validation sentiment F1, exports it as int8, tunes each emotion's cut-off on the int8 outputs and scores the test comments.
    kind_en = max(trained_en, key=lambda k: trained_en[k][2])
    m_en, hist_en, _ = trained_en[kind_en]
    exp_en, deq_en = export(m_en, kind_en, ["sent", "emo"])
    gseq_va = [[gindex.get(t, 1) for t in ts] or [1] for ts in Gva]
    gseq_te = [[gindex.get(t, 1) for t in ts] or [1] for ts in Gte]
    Fva = [forward(deq_en, kind_en, s, ["sent", "emo"]) for s in gseq_va]
    Fte = [forward(deq_en, kind_en, s, ["sent", "emo"]) for s in gseq_te]
    Sv, Ev = np.array([f["sent"] for f in Fva]), np.array([f["emo"] for f in Fva])
    St, Et = np.array([f["sent"] for f in Fte]), np.array([f["emo"] for f in Fte])
    th_ship = best_thresholds(Ev, Eva)  # thresholds tuned on the shipped (int8) model's validation outputs
    ps = St.argmax(1)
    emo_f1 = f1_score(Ete, Et >= th_ship, average=None, zero_division=0)
    agree_en = float(np.mean(ps[Kte] == m_en.predict(GXte, verbose=0)[0][Kte].argmax(1)))
    print(f"  en shipped {kind_en}: acc {accuracy_score(Ste[Kte], ps[Kte]):.4f} f1 {f1_score(Ste[Kte], ps[Kte], average='macro'):.4f} emo macro-F1 {emo_f1.mean():.4f}, agrees with float {agree_en:.4f}")
    parity["en"] = {"seqs": gseq_te[:600], "sent": St[:600].tolist(), "emo": Et[:600].tolist(), "texts": gte.text.tolist()[:300], "tokens": [[gindex.get(t, 1) for t in ts] for ts in Gte[:300]]}
    pick_en = [
        {"id": f"en-{i}", "text": gte.text[i], "label": EN_CLASSES[Ste[i]], "pred": EN_CLASSES[ps[i]], "emotions": [emo[j] for j in np.where(Ete[i] == 1)[0]], "probs": [r(v, 4) for v in St[i]]}
        for i in SENT_PICKS["en"]
    ]
    payload["en"] = {
        "dataset": {"name": "GoEmotions", "source": "https://github.com/google-research/google-research/tree/master/goemotions", "license": "Apache-2.0", "origin": "Google Research; Demszky et al. (2020)", "train": len(gtr), "val": len(gva), "test": len(gte)},
        "classes": EN_CLASSES,
        "emotions": emo,
        "groups": {e: group[e] for e in emo},
        "label_counts": {d: {c: int(((s == i) & k).sum()) for i, c in enumerate(EN_CLASSES)} | {"mixed": int((~k).sum())} for d, s, k in [("train", Str, Ktr), ("val", Sva, Kva), ("test", Ste, Kte)]},
        "emotion_counts": {e: int(Etr[:, j].sum()) for j, e in enumerate(emo)},
        "multi_label": r(float((Etr.sum(1) > 1).mean()), 4),
        "lengths": [int(v) for v in np.percentile([len(t) for t in Gtr], [10, 25, 50, 75, 90, 95])],
        "len_hist": np.histogram(np.minimum([len(t) for t in Gtr], 60), bins=20, range=(0, 60))[0].tolist(),
        "vocab": gwords,
        "oov": r(goov, 4),
        "comparison": cmp_en,
        "chosen": dict(avg="Word embeddings, averaged", bilstm="BiLSTM")[kind_en],
        "lr_C": C_en,
        "history": hist_en,
        "thresholds": [r(v, 2) for v in th_ship],
        "shipped": {
            "acc": r(accuracy_score(Ste[Kte], ps[Kte]), 4),
            "f1": r(f1_score(Ste[Kte], ps[Kte], average="macro"), 4),
            "per_class_f1": [r(v, 4) for v in f1_score(Ste[Kte], ps[Kte], average=None)],
            "emo_f1": r(emo_f1.mean(), 4),
            "emo_per_class": {e: r(emo_f1[j], 4) for j, e in enumerate(emo)},
            "agree_float": r(agree_en, 4),
            "confusion": confusion_matrix(Ste[Kte], ps[Kte]).tolist(),
            "test_rows": int(Kte.sum()),
        },
        "top_words": top_words(vec_en, lr_en, EN_CLASSES),
        "model": exp_en,
        "samples": pick_en,
        "check": {"ids": gseq_te[:3], "sent": [[r(v, 8) for v in St[i]] for i in range(3)], "emo": [[r(v, 8) for v in Et[i]] for i in range(3)]},
    }

    # STEP: Export weights and results | Saves parity data, moves the int8 weights and vocabularies to public/models/bilingual-sentiment-weights.json so the page stays light, then writes the results JSON.
    json.dump(parity, open(RAW / "sentiment_parity.json", "w"))
    # weights + vocabularies (~2 MB) go to a static file the demo fetches when it opens, so the page itself stays light
    weights = {lang: {"model": payload[lang].pop("model"), "vocab": payload[lang].pop("vocab")} for lang in ("id", "en")}
    for lang in ("id", "en"):
        payload[lang]["vocab_size"] = len(weights[lang]["vocab"])
    wp = ROOT / "public" / "models" / "bilingual-sentiment-weights.json"
    wp.parent.mkdir(parents=True, exist_ok=True)
    wp.write_text(json.dumps({**weights, "token_pattern": SENT_TOKEN, "maxlen": SENT_MAXLEN}, separators=(",", ":")), encoding="utf-8")
    print(f"  -> {wp.relative_to(ROOT)}  ({wp.stat().st_size / 1024:.1f} KB)")
    save("bilingual-sentiment", {**payload, "token_pattern": SENT_TOKEN, "maxlen": SENT_MAXLEN, "tf": {"tensorflow": tf.__version__, "keras": keras.__version__}})


# ---------------------------------------------------------------------------
# DL 6. Doodle Duel: a CNN that guesses 30 kinds of doodles (Quick, Draw! by Google, CC BY 4.0)
#        sample fetched by ml/quickdraw_data.py; the browser frames visitors' strokes the same way
# ---------------------------------------------------------------------------
QD_CATEGORIES = [
    "apple", "banana", "bicycle", "bird", "book", "butterfly", "cake", "car", "cat", "clock",
    "cloud", "coffee cup", "dog", "fish", "flower", "guitar", "hamburger", "house", "ice cream", "key",
    "light bulb", "moon", "mountain", "pizza", "rainbow", "star", "sun", "tree", "umbrella", "airplane",
]


def doodles() -> None:
    # STEP: Load and split the doodles | Seeds TensorFlow, then shuffles each category's drawings and takes 8000 for training and 1000 each for validation and test, as 28x28 images.
    import base64
    import time

    import keras
    import tensorflow as tf
    from keras import layers

    print("doodle-duel")
    keras.utils.set_random_seed(SEED)
    tf.config.experimental.enable_op_determinism()
    K = len(QD_CATEGORIES)
    rng = np.random.default_rng(SEED)
    parts = {"train": ([], []), "val": ([], []), "test": ([], [])}
    available = {}
    for k, c in enumerate(QD_CATEGORIES):
        a = np.load(RAW / "quickdraw" / f"{c}.npy")
        p = rng.permutation(len(a))
        for name, idx in [("train", p[:8000]), ("val", p[8000:9000]), ("test", p[9000:10000])]:
            parts[name][0].append(a[idx])
            parts[name][1].append(np.full(len(idx), k, dtype=np.int32))
        available[c] = int(len(a))
    Xtr, ytr = (np.concatenate(v) for v in parts["train"])
    Xva, yva = (np.concatenate(v) for v in parts["val"])
    Xte, yte = (np.concatenate(v) for v in parts["test"])
    Xtr, Xva, Xte = (x.reshape(-1, 28, 28, 1) for x in (Xtr, Xva, Xte))
    print(f"  train {len(Xtr)}, val {len(Xva)}, test {len(Xte)}")

    # STEP: Define four candidate networks | A tf.data pipeline scales pixels to 0–1 in batches of 256; candidates are softmax regression, a dense network, a small CNN and a wider CNN with augmentation.
    def ds(X, y, shuffle):
        d = tf.data.Dataset.from_tensor_slices((X, y))
        if shuffle:
            d = d.shuffle(len(X), seed=SEED, reshuffle_each_iteration=True)
        return d.batch(256).map(lambda a, b: (tf.cast(a, tf.float32) / 255.0, b)).prefetch(2)

    def predict(model, X):
        return model.predict(ds(X, np.zeros(len(X), dtype=np.int32), False), verbose=0)

    def softmax_reg():
        return keras.Sequential([keras.Input((28, 28, 1)), layers.Flatten(), layers.Dense(K)], name="softmax")

    def mlp():
        return keras.Sequential([keras.Input((28, 28, 1)), layers.Flatten(), layers.Dense(256, activation="relu"), layers.Dropout(0.3), layers.Dense(K)], name="mlp")

    def cnn(c1, c2, d1, augment):
        aug = [layers.RandomRotation(0.03, fill_mode="constant"), layers.RandomTranslation(0.08, 0.08, fill_mode="constant"), layers.RandomZoom(0.1, fill_mode="constant")] if augment else []
        return keras.Sequential(
            [
                keras.Input((28, 28, 1)),
                *aug,
                layers.Conv2D(c1, 3, activation="relu", name="conv1"),
                layers.MaxPooling2D(2),
                layers.Conv2D(c2, 3, activation="relu", name="conv2"),
                layers.MaxPooling2D(2),
                layers.Flatten(),
                layers.Dense(d1, activation="relu", name="dense1"),
                layers.Dropout(0.4),
                layers.Dense(K, name="out"),
            ]
        )

    builders = {
        "Softmax regression (no hidden layer)": softmax_reg,
        "Dense network (1 hidden layer)": mlp,
        "Small CNN": lambda: cnn(16, 32, 64, False),
        "Wider CNN + augmentation": lambda: cnn(32, 64, 128, True),
    }
    # STEP: Train and compare the networks | Each network trains up to 15 epochs with Adam, early stopping and learning-rate halving, and is scored on test accuracy and top-3 accuracy.
    comparison, histories, trained = [], {}, {}
    tr_ds, va_ds = ds(Xtr, ytr, True), ds(Xva, yva, False)
    for name, build in builders.items():
        keras.utils.set_random_seed(SEED)
        model = build()
        model.compile(optimizer=keras.optimizers.Adam(1e-3), loss=keras.losses.SparseCategoricalCrossentropy(from_logits=True), metrics=["accuracy"])
        t0 = time.time()
        h = model.fit(
            tr_ds, validation_data=va_ds, epochs=15, verbose=0,
            callbacks=[keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True, monitor="val_loss"), keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=1, min_lr=1e-5)],
        )
        secs = time.time() - t0
        Pv, Pt = predict(model, Xva), predict(model, Xte)
        top3 = float(np.mean([y in np.argsort(-p)[:3] for p, y in zip(Pt, yte)]))
        comparison.append({"model": name, "params": int(model.count_params()), "val_acc": r(float(np.mean(Pv.argmax(1) == yva)), 4), "acc": r(float(np.mean(Pt.argmax(1) == yte)), 4), "top3": r(top3, 4), "epochs": len(h.history["loss"]), "seconds": r(secs, 1)})
        histories[name] = {k: [r(v, 6 if k == "learning_rate" else 4) for v in vals] for k, vals in h.history.items()}
        trained[name] = model
        print(f"  {name:38s} params={model.count_params():7d} val={comparison[-1]['val_acc']:.4f} test={comparison[-1]['acc']:.4f} top3={top3:.4f} epochs={len(h.history['loss'])} {secs:.0f}s", flush=True)

    # STEP: Pick a CNN, quantise and re-test | The CNN with the best validation accuracy is kept, stored as int8 per output unit, and re-scored on the test set with a NumPy copy of the browser's src/lib/cnn.ts.
    cnn_names = [c_["model"] for c_ in comparison if "CNN" in c_["model"]]
    chosen = max(cnn_names, key=lambda n_: next(c_["val_acc"] for c_ in comparison if c_["model"] == n_))  # by validation, not test
    model = trained[chosen]

    def q8(w):
        moved = w
        scale = np.abs(moved).reshape(-1, moved.shape[-1]).max(axis=0) / 127
        scale = np.array([float(f"{s:.8g}") for s in scale])
        return np.round(moved / scale).astype(np.int8), scale

    Lw = {ly.name: ly.get_weights() for ly in model.layers if ly.get_weights()}
    export, deq = {}, {}
    for name in ["conv1", "conv2", "dense1", "out"]:
        w, b = Lw[name]
        q, scale = q8(w)
        export[name] = {"shape": list(w.shape), "scale": [float(s) for s in scale], "b": [r(v, 6) for v in b], "q": base64.b64encode(q.tobytes()).decode("ascii")}
        deq[name] = (q.astype(np.float64) * scale, np.round(b.astype(np.float64), 6))

    def conv_valid(x, w, b):
        H, Wd, _ = x.shape
        kh, kw, _, co = w.shape
        out = np.zeros((H - kh + 1, Wd - kw + 1, co))
        for i in range(kh):
            for j in range(kw):
                out += np.tensordot(x[i : i + H - kh + 1, j : j + Wd - kw + 1, :], w[i, j], axes=([2], [0]))
        return out + b

    def pool(x):
        H, Wd, C = x.shape
        return x[: H // 2 * 2, : Wd // 2 * 2].reshape(H // 2, 2, Wd // 2, 2, C).max(axis=(1, 3))

    def forward(img):
        """Exactly createDigitNet in src/lib/cnn.ts, on the int8 weights. img: 28x28x1 floats 0-1."""
        a = pool(np.maximum(conv_valid(img, *deq["conv1"]), 0))
        a = pool(np.maximum(conv_valid(a, *deq["conv2"]), 0)).reshape(-1)
        a = np.maximum(a @ deq["dense1"][0] + deq["dense1"][1], 0)
        return a @ deq["out"][0] + deq["out"][1]

    t0 = time.time()
    logits = np.array([forward(im.astype(np.float64) / 255.0) for im in Xte])
    print(f"  numpy forward pass on {len(Xte)} test doodles: {time.time() - t0:.0f}s")
    pred = logits.argmax(1)
    prob = np.exp(logits - logits.max(1, keepdims=True))
    prob /= prob.sum(1, keepdims=True)
    shipped_acc = float(np.mean(pred == yte))
    shipped_top3 = float(np.mean([y in np.argsort(-p)[:3] for p, y in zip(prob, yte)]))
    float_acc = next(c_["acc"] for c_ in comparison if c_["model"] == chosen)
    print(f"  shipped {chosen} int8: acc {shipped_acc:.4f} top3 {shipped_top3:.4f} (float {float_acc:.4f})")
    # STEP: Analyse the mistakes | Builds the confusion matrix, per-category accuracy and the 12 most common mix-ups, plus each category's average drawing and share of inked pixels.
    conf = [[int(((yte == a) & (pred == p)).sum()) for p in range(K)] for a in range(K)]
    per_class = [r(conf[k][k] / sum(conf[k]), 4) for k in range(K)]
    pairs = sorted([(conf[a][p], a, p) for a in range(K) for p in range(K) if a != p], reverse=True)[:12]

    def b64img(im):
        return base64.b64encode(np.asarray(im, dtype=np.uint8).reshape(-1).tobytes()).decode("ascii")

    means = [b64img(np.round(Xtr[ytr == k].mean(axis=0))) for k in range(K)]
    ink = [r(float((Xtr[ytr == k] > 0).mean()), 4) for k in range(K)]
    # STEP: Save parity data and JSON | Writes up to 500 test doodles with their logits to doodle_parity.json for checking the browser, then saves the int8 model and results to doodle-duel.json.
    json.dump({"imgs": [b64img(im) for im in Xte[::60][:500]], "logits": logits[::60][:500].tolist(), "y": yte[::60][:500].tolist()}, open(RAW / "doodle_parity.json", "w"))
    save(
        "doodle-duel",
        {
            "dataset": {
                "name": "Quick, Draw! (sample)",
                "source": "https://github.com/googlecreativelab/quickdraw-dataset",
                "license": "CC BY 4.0 (Google)",
                "per_class": 10000,
                "available": available,
                "size": 28,
            },
            "categories": QD_CATEGORIES,
            "split": {"train": int(len(Xtr)), "val": int(len(Xva)), "test": int(len(Xte))},
            "comparison": comparison,
            "chosen": chosen,
            "history": histories[chosen],
            "shipped": {"acc": r(shipped_acc, 4), "top3": r(shipped_top3, 4), "float_acc": float_acc, "bytes": int(sum(np.prod(export[k]["shape"]) for k in export)), "errors": int((pred != yte).sum())},
            "per_class": per_class,
            "confusion": conf,
            "pairs": [{"actual": QD_CATEGORIES[a], "predicted": QD_CATEGORIES[p], "n": n_} for n_, a, p in pairs],
            "means": means,
            "ink": ink,
            "model": export,
            "check": {"imgs": [b64img(Xte[i]) for i in (0, 4500, 29999)], "probs": [[r(v, 6) for v in prob[i]] for i in (0, 4500, 29999)]},
            "tf": {"tensorflow": tf.__version__, "keras": keras.__version__},
        },
    )


# ---------------------------------------------------------------------------
# DL 10. Sign Language Speller: ASL fingerspelling letters from MediaPipe hand landmarks (ASLNow!, MIT)
#         a small neural network on 21 normalised hand points, run in the browser on live hand tracking
# ---------------------------------------------------------------------------
def _asl_normalise(h: np.ndarray) -> np.ndarray:
    """(n, 21, 3) landmarks -> wrist at the origin, scaled by palm length (wrist to middle knuckle). Same as the browser."""
    h = h - h[:, :1, :]
    palm = np.linalg.norm(h[:, 9, :2], axis=1)[:, None, None]
    return h / np.maximum(palm, 1e-6)


def asl() -> None:
    # STEP: Load the landmark files | Every sample is a JSON list of 21 hand points (x, y, z) from MediaPipe's web hand tracker, stored in a folder named after its letter.
    import keras
    import tensorflow as tf
    from keras import layers
    from scipy.sparse import csr_matrix
    from scipy.sparse.csgraph import connected_components
    from sklearn.model_selection import StratifiedGroupKFold
    from sklearn.neighbors import KNeighborsClassifier

    print("sign-language")
    keras.utils.set_random_seed(SEED)
    tf.config.experimental.enable_op_determinism()
    root = RAW / "aslnow"
    letters = sorted(p.name for p in root.iterdir() if p.is_dir() and len(p.name) == 1)
    hands, labels = [], []
    for k, letter in enumerate(letters):
        for f in sorted((root / letter).glob("*.json")):
            pts = json.load(open(f))
            if len(pts) == 21:
                hands.append([[p["x"], p["y"], p["z"]] for p in pts])
                labels.append(k)
    H = np.array(hands, dtype=np.float64)
    y = np.array(labels)
    print(f"  {len(H)} samples, {len(letters)} letters")

    # STEP: Normalise every hand | Move the wrist to the origin and divide by the palm's length, so position in the frame and distance to the camera stop mattering.
    X = _asl_normalise(H)
    Xf = X.reshape(len(X), -1)

    # STEP: Group near-duplicate samples | The files carry no participant id and neighbouring video frames look alike, so samples closer than a small distance are grouped and never split between train and test.
    D = np.sqrt(((Xf[:, None, :] - Xf[None, :, :]) ** 2).sum(-1))
    np.fill_diagonal(D, np.inf)
    eps = float(np.quantile(D.min(1), 0.5))  # half of all samples have a twin at least this close
    n_groups, groups = connected_components(csr_matrix(D < eps), directed=False)
    print(f"  near-duplicate threshold {eps:.4f}: {n_groups} groups, largest {np.bincount(groups).max()} samples")

    # STEP: Define the models | k-nearest neighbours and a random forest as classic baselines, and a small neural network trained with mirrored, rotated and stretched hands.
    def augment(A, yy, copies=6, seed=SEED):
        rng = np.random.default_rng(seed)
        out, ys = [A], [yy]
        for _ in range(copies):
            B = A.copy()
            flip = rng.random(len(B)) < 0.5  # left or right hand
            B[flip, :, 0] *= -1
            th = rng.uniform(-0.3, 0.3, len(B))  # roll the hand up to about 17 degrees
            c, s = np.cos(th)[:, None], np.sin(th)[:, None]
            x0, y0 = B[:, :, 0].copy(), B[:, :, 1].copy()
            B[:, :, 0], B[:, :, 1] = c * x0 - s * y0, s * x0 + c * y0
            B[:, :, 0] *= rng.uniform(0.75, 1.33, len(B))[:, None]  # widescreen vs 4:3 cameras squeeze x differently
            B += rng.normal(0, 0.02, B.shape)
            out.append(B)
            ys.append(yy)
        return np.concatenate(out).reshape(-1, 63).astype("float32"), np.concatenate(ys)

    def mlp():
        return keras.Sequential(
            [keras.Input((63,)), layers.Dense(128, activation="relu", name="d1"), layers.Dropout(0.3), layers.Dense(64, activation="relu", name="d2"), layers.Dropout(0.2), layers.Dense(len(letters), name="out")]
        )

    def fit_mlp(A, yy, epochs=60):
        keras.utils.set_random_seed(SEED)
        m = mlp()
        m.compile(optimizer=keras.optimizers.Adam(2e-3), loss=keras.losses.SparseCategoricalCrossentropy(from_logits=True), metrics=["accuracy"])
        Xa, ya = augment(A, yy)
        m.fit(Xa, ya, epochs=epochs, batch_size=128, verbose=0, shuffle=True)
        return m

    def mirror_both(A):
        B = A.copy()
        B[:, :, 0] *= -1
        return np.concatenate([A, B])

    # STEP: Evaluate two ways | Stratified 5-fold cross-validation on a random split and on the near-duplicate groups; the grouped score is the honest one.
    results = {}
    conf = np.zeros((len(letters), len(letters)), dtype=int)
    for split_name, splitter, g in [("random", StratifiedKFold(5, shuffle=True, random_state=SEED), None), ("grouped", StratifiedGroupKFold(5, shuffle=True, random_state=SEED), groups)]:
        accs = {"k-nearest neighbours (k=5)": [], "Random forest": [], "Neural network (MLP)": []}
        for tr, te in splitter.split(Xf, y, g):
            knn = KNeighborsClassifier(5).fit(mirror_both(X[tr]).reshape(-1, 63), np.concatenate([y[tr], y[tr]]))
            accs["k-nearest neighbours (k=5)"].append(float(np.mean(knn.predict(Xf[te]) == y[te])))
            rf = RandomForestClassifier(n_estimators=300, random_state=SEED, n_jobs=-1).fit(*augment(X[tr], y[tr], copies=3))
            accs["Random forest"].append(float(np.mean(rf.predict(Xf[te]) == y[te])))
            m = fit_mlp(X[tr], y[tr])
            p = m.predict(Xf[te].astype("float32"), verbose=0).argmax(1)
            accs["Neural network (MLP)"].append(float(np.mean(p == y[te])))
            if split_name == "grouped":
                for a, b in zip(y[te], p):
                    conf[a, b] += 1
        results[split_name] = {k: r(np.mean(v), 4) for k, v in accs.items()}
        print(f"  {split_name}: " + ", ".join(f"{k} {np.mean(v):.4f}" for k, v in accs.items()))

    # STEP: Train the final network and mirror it in NumPy | Fit the MLP on every sample, export its weights as plain numbers and check that the browser's forward pass gives the same answers.
    final = fit_mlp(X, y)
    Lw = {ly.name: ly.get_weights() for ly in final.layers if ly.get_weights()}
    rnd = lambda a: [float(f"{v:.6g}") for v in np.asarray(a).ravel()]  # noqa: E731
    export = {name: {"shape": list(Lw[name][0].shape), "w": rnd(Lw[name][0]), "b": rnd(Lw[name][1])} for name in ["d1", "d2", "out"]}

    def forward(F):
        a = F.astype(np.float64)
        for name, act in [("d1", True), ("d2", True), ("out", False)]:
            W = np.array(export[name]["w"]).reshape(export[name]["shape"])
            a = a @ W + np.array(export[name]["b"])
            if act:
                a = np.maximum(a, 0)
        return a

    gap = float(np.abs(forward(Xf[:300]) - final.predict(Xf[:300].astype("float32"), verbose=0)).max())
    print(f"  keras vs numpy forward pass: max gap {gap:.2e}")
    json.dump({"X": Xf[::5][:400].round(6).tolist(), "logits": forward(Xf[::5][:400].round(6)).tolist()}, open(RAW / "asl_parity.json", "w"))

    # STEP: Export the JSON | Letters, counts, both evaluations, the grouped confusion matrix, the average hand per letter for the reference chart and the network weights.
    per_letter = [r(conf[k, k] / max(1, conf[k].sum()), 4) for k in range(len(letters))]
    pairs = sorted([(int(conf[a, b]), letters[a], letters[b]) for a in range(len(letters)) for b in range(len(letters)) if a != b], reverse=True)[:10]
    # for the reference sketches only: put every hand the same way round (index knuckle right of the pinky's) before averaging,
    # otherwise left and right hands cancel out sideways
    canon = X.copy()
    canon[canon[:, 5, 0] < canon[:, 17, 0], :, 0] *= -1
    mean_hand = [np.round(canon[y == k].mean(0)[:, :2], 4).tolist() for k in range(len(letters))]
    knuckles = float(np.median(np.abs(canon[:, 5, 0] - canon[:, 17, 0])))  # knuckle span / palm length, about 0.8 on a real hand
    save(
        "sign-language",
        {
            "dataset": {"name": "ASLNow! fingerspelling", "source": "https://huggingface.co/datasets/sid220/asl-now-fingerspelling", "license": "MIT", "samples": int(len(X)), "commit": "9b3c96ae"},
            "letters": letters,
            "counts": [int((y == k).sum()) for k in range(len(letters))],
            "groups": int(n_groups),
            "eps": r(eps, 5),
            "results": results,
            "per_letter": per_letter,
            "confusion": conf.tolist(),
            "pairs": [{"actual": a, "predicted": b, "n": n_} for n_, a, b in pairs if n_ > 0],
            "mean_hand": mean_hand,
            "knuckle_ratio": r(knuckles, 3),
            "data_aspect": 16 / 9,  # estimated: the data's sideways squeeze matches a widescreen camera (see knuckle_ratio)
            "keras_gap": float(f"{gap:.3g}"),
            "model": export,
            "check": {"X": Xf[:2].round(6).tolist(), "logits": [[r(v, 6) for v in row] for row in forward(Xf[:2].round(6))]},
            "tf": {"tensorflow": tf.__version__, "keras": keras.__version__},
        },
    )


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:  # e.g. `python ml/train.py live_forecasts` runs only that project
        for name in sys.argv[1:]:
            globals()[name]()
        raise SystemExit
    telco()
    heart()
    mall()
    nyc_taxi()
    credit()
    ai4i()
    student()
    bike()
    air()
    bank()
    insurance()
    card_fraud()
    retail()
    complaints()
    uplift()
    ames()
    feedback()
    mnist()  # needs TensorFlow
    rps()  # needs TensorFlow
    live_forecasts()  # needs TensorFlow and ml/live_data.py
    sentiment()  # needs TensorFlow
    doodles()  # needs TensorFlow and ml/quickdraw_data.py
    asl()  # needs TensorFlow and ml/data/raw/aslnow (git clone of the ASLNow! dataset)
