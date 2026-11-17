"""
Analysis of the synthetic FWA base (made by ml/fwa_generate.py) for /skills/analytics/dashboards/fwa. It reads only the
seven raw CSVs, the way an analyst would get them, and writes:

    src/data/fwa-dashboard.json   aggregates, cohorts, segments, campaign lifts, the churn model and findings
    src/data/fwa-customers.json   one compact row per customer, so the page can re-cut cohorts and segments live

    ml/.venv/Scripts/python.exe -I ml/fwa_analyse.py
"""

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw" / "fwa"
OUT = ROOT.parent / "src" / "data"

c = pd.read_csv(RAW / "customers.csv")
u = pd.read_csv(RAW / "usage_monthly.csv")
b = pd.read_csv(RAW / "billing.csv", low_memory=False)
q = pd.read_csv(RAW / "service_requests.csv")
camps = pd.read_csv(RAW / "campaigns.csv")
k = pd.read_csv(RAW / "campaign_contacts.csv")

MONTHS = pd.period_range("2025-01", "2026-10", freq="M")
T = len(MONTHS)
MI = {str(m): i for i, m in enumerate(MONTHS)}
LABELS = [m.strftime("%b %y") for m in MONTHS]
PLAN_TYPICAL = {"Home 4G 20 Mbps": 150, "Home 4G 50 Mbps": 240, "Home 5G 100 Mbps": 380}
PLAN_FEE = {"Home 4G 20 Mbps": 175_000, "Home 4G 50 Mbps": 250_000, "Home 5G 100 Mbps": 350_000}
PLANS = list(PLAN_TYPICAL)
CHANNELS = ["Retail outlet", "Online", "Field sales", "Partner agent"]
REGIONS = ["Jabodetabek", "West Java", "Central Java", "East Java", "Bali & Nusa Tenggara", "Sumatra", "Kalimantan", "Sulawesi"]
AREAS = ["Metro", "Urban", "Suburban", "Rural"]
PAYS = ["Monthly package", "Postpaid invoice"]
METHODS = ["E-wallet", "Retail counter", "Bank transfer (VA)", "Autodebit"]
REASONS = ["Did not rebuy", "Payment default", "Speed or coverage", "Price", "Switched to fibre", "Low use, not needed", "Moved house", "Device problem", "Other"]

# ------------------------------------------------------------------ per-customer timeline helpers
c["act"] = pd.to_datetime(c.activation_date).dt.to_period("M").astype(str).map(MI)
c["churn_t"] = pd.to_datetime(c.churn_date).dt.to_period("M").astype(str).map(MI)
c["churn_t"] = c["churn_t"].fillna(-1).astype(int)
c["cover_t"] = c.home_5g_coverage_from.map(lambda v: -1 if v == "before 2025" else MI.get(v, 99) if isinstance(v, str) else 99)
up = q[q.type == "5G upgrade"].copy()
up["t"] = pd.to_datetime(up.created_date).dt.to_period("M").astype(str).map(MI)
upgrade_t = dict(zip(up.customer_id, up.t))
c["upgrade_t"] = c.customer_id.map(upgrade_t).fillna(-1).astype(int)
cidx = {cid: i for i, cid in enumerate(c.customer_id)}

u["t"] = u.month.map(MI)
u["ci"] = u.customer_id.map(cidx)
b["t"] = b.cycle_month.map(MI)
b["ci"] = b.customer_id.map(cidx)
b["late"] = b.status.isin(["Late", "Paid late", "Unpaid", "Not rebought", "Written off"]).astype(int)
q["t"] = pd.to_datetime(q.created_date).dt.to_period("M").astype(str).map(MI)

N = len(c)
GB = np.full((N, T), np.nan)
GB[u.ci.values, u.t.values] = u.data_gb.values
DAYS = np.full((N, T), np.nan)
DAYS[u.ci.values, u.t.values] = u.active_days.values
LATE = np.zeros((N, T))
LATE[b.ci.values, b.t.values] = b.late.values
DPD = np.zeros((N, T))
pp = b[b.pay_type == "Postpaid invoice"]
dpd_now = pp.status.isin(["Unpaid", "Written off"]).astype(int) * 30
DPD[pp.ci.values, pp.t.values] = dpd_now.values
act = c.act.values
churn_t = c.churn_t.values
alive_end = lambda t: (act <= t) & ((churn_t == -1) | (churn_t > t))  # noqa: E731


def plan_at(i, t):
    return "Home 5G 100 Mbps" if 0 <= c.upgrade_t.iat[i] <= t else c.plan_at_activation.iat[i]


TYP_AT = np.zeros((N, T))
FEE_AT = np.zeros((N, T))
for i in range(N):
    for t in range(T):
        p = plan_at(i, t)
        TYP_AT[i, t] = PLAN_TYPICAL[p]
        FEE_AT[i, t] = PLAN_FEE[p]
RATIO = GB / TYP_AT

# ------------------------------------------------------------------ base monitoring, month by month
series = []
for t in range(T):
    end = alive_end(t)
    start = alive_end(t - 1) if t else np.zeros(N, bool)
    churned = churn_t == t
    vol = churned & (c.churn_type.values == "Voluntary")
    inv = churned & (c.churn_type.values == "Involuntary")
    used = ~np.isnan(GB[:, t])
    bt = b[b.t == t]
    reb = bt[bt.pay_type == "Monthly package"]
    post = bt[bt.pay_type == "Postpaid invoice"]
    on5g = np.array([plan_at(i, t) == "Home 5G 100 Mbps" for i in np.where(end)[0]])
    covered = (c.cover_t.values <= t) & end
    series.append(
        dict(
            m=LABELS[t],
            base=int(end.sum()),
            adds=int((act == t).sum()),
            churn=int(churned.sum()),
            vol=int(vol.sum()),
            inv=int(inv.sum()),
            rate=round(churned.sum() / start.sum() * 100, 2) if start.sum() else None,
            revenue=int(bt.amount_idr.sum()),
            arpu=int(bt.amount_idr.sum() / max(1, used.sum())),
            gb=round(float(np.nanmean(GB[used, t])), 1),
            low=round(float((RATIO[used, t] < 0.5).mean() * 100), 1),
            rebuyOnTime=round((reb.status == "On time").mean() * 100, 1) if len(reb) else None,
            rebuyLapsed=round((reb.status == "Not rebought").mean() * 100, 1) if len(reb) else None,
            postOnTime=round((post.status == "Paid on time").mean() * 100, 1) if len(post) else None,
            share5g=round(on5g.mean() * 100, 1) if len(on5g) else 0,
            covered=int(covered.sum()),
        )
    )

# ------------------------------------------------------------------ cohorts
cohort_logo, cohort_rev = [], []
for a in range(T):
    members = np.where(act == a)[0]
    n = len(members)
    fee0 = FEE_AT[members, a].sum()
    logo, rev = [], []
    for kk in range(T - a):
        t = a + kk
        alive = members[(churn_t[members] == -1) | (churn_t[members] > t)]
        logo.append(round(len(alive) / n * 100, 1))
        rev.append(round(FEE_AT[alive, t].sum() / fee0 * 100, 1))
    cohort_logo.append(dict(m=LABELS[a], n=n, r=logo))
    cohort_rev.append(dict(m=LABELS[a], n=n, r=rev))


def surv_at(month):
    rows = [x for x in cohort_logo if len(x["r"]) > month]
    return [dict(m=x["m"], v=x["r"][month]) for x in rows]


survivability = dict(m3=surv_at(2), m6=surv_at(5), m12=surv_at(11))

# early churn: left in the first three months, cohorts with three months observed
early = c[c.act <= T - 3].copy()
early["early"] = (early.churn_t >= 0) & (early.churn_t - early.act <= 2)
first_ratio = np.array([RATIO[i, a] for i, a in zip(early.index, early.act)])
early["first_band"] = pd.cut(first_ratio, [-1, 0.35, 0.6, 0.9, 99], labels=["Under 35%", "35-60%", "60-90%", "90%+"])
early_by = dict(
    channel=[dict(k=ch, n=int((g := early[early.sales_channel == ch]).shape[0]), v=round(g.early.mean() * 100, 1)) for ch in CHANNELS],
    firstUse=[dict(k=str(bd), n=int((g := early[early.first_band == bd]).shape[0]), v=round(g.early.mean() * 100, 1)) for bd in early.first_band.cat.categories],
    pay=[dict(k=p, n=int((g := early[early.pay_type == p]).shape[0]), v=round(g.early.mean() * 100, 1)) for p in PAYS],
    cohort=[dict(k=LABELS[a], v=round(early[early.act == a].early.mean() * 100, 1)) for a in range(T - 2)],
)

# ------------------------------------------------------------------ features at a month end (for segments and the model)
FEATURES = [
    "tenure", "new_le2", "plan_4g50", "plan_5g", "on_4g_covered", "ch_online", "ch_field", "ch_partner",
    "postpaid", "m_retail", "m_autodebit", "bundle_on", "use_ratio", "use_falling", "active_days",
    "late_last", "late_3m", "dpd", "reloc_2m", "fault_2m", "metro", "rural",
]


def feats(t):
    ids = np.where(alive_end(t))[0]
    rows = []
    for i in ids:
        ten = t - act[i]
        plan = plan_at(i, t)
        r = RATIO[i, t]
        prev = RATIO[i, max(act[i], t - 2):t]
        falling = len(prev) == 2 and r < 0.6 * np.nanmean(prev)
        bundle = c.bundle_12m.iat[i] == "Y" and ten < 12
        req = q[(q.customer_id == c.customer_id.iat[i]) & (q.t <= t) & (q.t >= t - 1)]
        rows.append(
            dict(
                i=i, tenure=min(ten, 24), new_le2=int(ten <= 2), plan_4g50=int(plan == "Home 4G 50 Mbps"), plan_5g=int(plan == "Home 5G 100 Mbps"),
                on_4g_covered=int(plan != "Home 5G 100 Mbps" and c.cover_t.iat[i] <= t),
                ch_online=int(c.sales_channel.iat[i] == "Online"), ch_field=int(c.sales_channel.iat[i] == "Field sales"), ch_partner=int(c.sales_channel.iat[i] == "Partner agent"),
                postpaid=int(c.pay_type.iat[i] == "Postpaid invoice"), m_retail=int(c.payment_method.iat[i] == "Retail counter"), m_autodebit=int(c.payment_method.iat[i] == "Autodebit"),
                bundle_on=int(bundle), use_ratio=float(min(r, 2.0)) if not np.isnan(r) else 0.0, use_falling=int(bool(falling)),
                active_days=float(DAYS[i, t]) if not np.isnan(DAYS[i, t]) else 0.0,
                late_last=int(LATE[i, t]), late_3m=int(LATE[i, max(0, t - 2):t + 1].sum()), dpd=float(DPD[i, t]),
                reloc_2m=int((req.type == "Relocation").any()), fault_2m=int((req.type == "Device fault").any()),
                metro=int(c.area_type.iat[i] == "Metro"), rural=int(c.area_type.iat[i] == "Rural"),
                fee=FEE_AT[i, t],
                y=int(churn_t[i] in (t + 1, t + 2)),
            )
        )
    return pd.DataFrame(rows)


SEGMENTS = [
    ("Overdue or lapsing", "Late last month, late twice in the last 3 months, or still owing"),
    ("New, low use", "First 3 months of service and using under 60% of the plan's typical data"),
    ("Low or falling use", "Using under 45% of the plan's typical data, or down 40% from the two months before"),
    ("Service issue", "Relocation or device fault in the last 2 months, or a 4G line in a congested metro"),
    ("5G-ready on 4G", "Home now has 5G coverage but the line is still 4G: an upgrade opportunity"),
    ("Healthy", "None of the above"),
]


def segment(row, t):
    if row.late_last or row.late_3m >= 2 or row.dpd > 0:
        return 0
    if row.new_le2 and row.use_ratio < 0.6:
        return 1
    if row.use_ratio < 0.45 or row.use_falling:
        return 2
    if row.reloc_2m or row.fault_2m or (row.metro and not row.plan_5g and t >= 9):
        return 3
    if row.on_4g_covered:
        return 4
    return 5


now = feats(T - 1)
now["seg"] = [segment(r, T - 1) for r in now.itertuples()]
past = feats(T - 5)  # end of Jun 2026, so July and August show who left within 60 days
past["seg"] = [segment(r, T - 5) for r in past.itertuples()]
segments = []
for s, (name, rule) in enumerate(SEGMENTS):
    g, h = now[now.seg == s], past[past.seg == s]
    segments.append(dict(name=name, rule=rule, n=int(len(g)), mrr=int(g.fee.sum()), churn60=round(h.y.mean() * 100, 1) if len(h) else None, nPast=int(len(h))))

# ------------------------------------------------------------------ churn model: who leaves in the next two months
snaps = {t: feats(t) for t in range(5, T - 2)}  # Jun 2025 ... Aug 2026
train = pd.concat([snaps[t] for t in snaps if t <= 15])  # up to Apr 2026
test = pd.concat([snaps[t] for t in snaps if t > 15])  # May - Aug 2026, later in time than anything trained on
X, y = train[FEATURES].values, train.y.values
Xt, yt = test[FEATURES].values, test.y.values
mu, sd = X.mean(0), X.std(0)
sd[sd == 0] = 1
BIN = {f for j, f in enumerate(FEATURES) if set(np.unique(X[:, j])) <= {0, 1}}  # yes/no features
lr = LogisticRegression(C=0.5, max_iter=2000).fit((X - mu) / sd, y)
p_lr = lr.predict_proba((Xt - mu) / sd)[:, 1]
gbm = HistGradientBoostingClassifier(max_depth=4, learning_rate=0.06, max_iter=250, random_state=7).fit(X, y)
p_gb = gbm.predict_proba(Xt)[:, 1]
base_rate = yt.mean()


def gains(p):
    order = np.argsort(-p)
    ys = yt[order]
    out = []
    for frac in [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]:
        kk = int(len(ys) * frac)
        out.append(dict(top=round(frac * 100), captured=round(ys[:kk].sum() / ys.sum() * 100, 1), precision=round(ys[:kk].mean() * 100, 1)))
    return out


def calib(p):
    bins = np.quantile(p, np.linspace(0, 1, 11))
    out = []
    for lo, hi in zip(bins[:-1], bins[1:]):
        mask = (p >= lo) & (p <= hi)
        out.append(dict(pred=round(p[mask].mean() * 100, 1), actual=round(yt[mask].mean() * 100, 1)))
    return out


LABEL_F = {
    "tenure": "Months of service", "new_le2": "In the first 3 months", "plan_4g50": "On Home 4G 50 Mbps", "plan_5g": "On Home 5G 100 Mbps",
    "on_4g_covered": "4G line, home has 5G", "ch_online": "Sold online", "ch_field": "Sold by field sales", "ch_partner": "Sold by a partner agent",
    "postpaid": "Pays by postpaid invoice", "m_retail": "Pays at a retail counter", "m_autodebit": "Pays by autodebit", "bundle_on": "Inside a 12-month bundle",
    "use_ratio": "Data used vs plan's typical", "use_falling": "Usage down 40%+", "active_days": "Days online last month",
    "late_last": "Paid late last month", "late_3m": "Late payments, last 3 months", "dpd": "Days past due", "reloc_2m": "Relocation request, last 2 months",
    "fault_2m": "Device fault, last 2 months", "metro": "Lives in a metro area", "rural": "Lives in a rural area",
}
model = dict(
    target="Leaves in the next 2 months",
    trainRange=f"{LABELS[5]} – {LABELS[15]} month-ends",
    testRange=f"{LABELS[16]} – {LABELS[19]} month-ends",
    nTrain=int(len(train)),
    nTest=int(len(test)),
    baseRate=round(base_rate * 100, 1),
    lr=dict(auc=round(roc_auc_score(yt, p_lr), 3), ap=round(average_precision_score(yt, p_lr), 3), gains=gains(p_lr), calib=calib(p_lr)),
    gbm=dict(auc=round(roc_auc_score(yt, p_gb), 3), ap=round(average_precision_score(yt, p_gb), 3), gains=gains(p_gb)),
    features=[dict(key=f, label=LABEL_F[f], bin=f in BIN, mean=round(float(mu[j]), 4), sd=round(float(sd[j]), 4), coef=round(float(lr.coef_[0][j]), 4)) for j, f in enumerate(FEATURES)],
    intercept=round(float(lr.intercept_[0]), 4),
)

# score today's active base with the logistic model (the browser can do the same with the exported numbers)
Z = (now[FEATURES].values - mu) / sd
now["risk"] = 1 / (1 + np.exp(-(Z @ lr.coef_[0] + lr.intercept_[0])))
contrib = Z * lr.coef_[0]
reasons = []
vals = now[FEATURES].values
for i, row in enumerate(contrib):
    top = [j for j in np.argsort(-row)[:2] if row[j] > 0.15]
    # a yes/no feature can push risk up by being absent (e.g. not on a bundle): say so
    # and a number can push it up by being low (few days online): say that too
    reasons.append([LABEL_F[FEATURES[j]] + ((": no" if vals[i, j] == 0 else "") if FEATURES[j] in BIN else (" (low)" if lr.coef_[0][j] < 0 else "")) for j in top])
now["reasons"] = reasons
call_list = now.sort_values("risk", ascending=False).head(25)
call = [
    dict(id=c.customer_id.iat[r.i], plan=plan_at(r.i, T - 1).replace("Home ", ""), tenure=int(T - 1 - act[r.i]), seg=SEGMENTS[r.seg][0], risk=round(float(r.risk) * 100, 1), why=r.reasons)
    for r in call_list.itertuples()
]

# ------------------------------------------------------------------ payment recovery
reb = b[b.pay_type == "Monthly package"].copy()
reb["band"] = pd.cut(pd.to_numeric(reb.days_late, errors="coerce").fillna(99), [-1, 0, 3, 7, 14, 30, 100], labels=["On time", "1-3 days", "4-7 days", "8-14 days", "15-30 days", "Not rebought"])
rebuy_dist = [dict(k=str(x), v=round((reb.band == x).mean() * 100, 1)) for x in reb.band.cat.categories]
rebuy_by_method = [dict(k=mth, onTime=round(((g := reb[reb.merge(c[["customer_id", "payment_method"]], on="customer_id").payment_method.values == mth]).status == "On time").mean() * 100, 1), lapsed=round((g.status == "Not rebought").mean() * 100, 1), n=int(len(g))) for mth in ["E-wallet", "Bank transfer (VA)", "Retail counter"]]
post = b[b.pay_type == "Postpaid invoice"].merge(c[["customer_id", "payment_method"]], on="customer_id")
post["dl"] = pd.to_numeric(post.days_late, errors="coerce")
recovery = []
for mth in ["Autodebit", "Bank transfer (VA)", "E-wallet"]:
    g = post[(post.payment_method == mth) & (post.t <= T - 3)]
    recovery.append(dict(k=mth, n=int(len(g)), curve=[round(((g.dl <= d) & g.dl.notna()).mean() * 100, 1) for d in range(0, 46, 3)]))
owing_now = post[(post.t == T - 1) & post.status.isin(["Unpaid", "Written off"])]

# ------------------------------------------------------------------ 5G adoption
fiveg = []
for t in range(FIVE := 6, T):
    end = alive_end(t)
    cov = end & (c.cover_t.values <= t)
    ids = np.where(cov)[0]
    on5 = sum(plan_at(i, t) == "Home 5G 100 Mbps" for i in ids)
    ups = up[up.t == t]
    fiveg.append(dict(m=LABELS[t], covered=int(cov.sum()), on5g=int(on5), upgrades=int(len(ups)), viaCampaign=int((ups.channel == "Store").sum())))
before, after = [], []
for cid, t0 in upgrade_t.items():
    i = cidx[cid]
    pre = GB[i, max(0, t0 - 3):t0]
    pst = GB[i, t0 + 1:t0 + 4]
    if np.isfinite(pre).sum() >= 2 and np.isfinite(pst).sum() >= 2:
        before.append(np.nanmean(pre))
        after.append(np.nanmean(pst))
churn_cov = {"4G": [0, 0], "5G": [0, 0]}
for t in range(9, T):
    start = alive_end(t - 1) & (c.cover_t.values <= t - 1)
    for i in np.where(start)[0]:
        tech = "5G" if plan_at(i, t - 1) == "Home 5G 100 Mbps" else "4G"
        churn_cov[tech][0] += 1
        churn_cov[tech][1] += int(churn_t[i] == t)
fiveg_summary = dict(
    upgradeUsageBefore=round(float(np.mean(before)), 1), upgradeUsageAfter=round(float(np.mean(after)), 1), nUpgradesMeasured=len(before),
    churn4gCovered=round(churn_cov["4G"][1] / churn_cov["4G"][0] * 100, 2), churn5g=round(churn_cov["5G"][1] / churn_cov["5G"][0] * 100, 2),
    readyNow=int((now.on_4g_covered == 1).sum()),
)

# ------------------------------------------------------------------ lifecycle requests
req = q.merge(c[["customer_id", "churn_t"]], on="customer_id")
req["left60"] = (req.churn_t >= req.t) & (req.churn_t <= req.t + 2)
lifecycle = []
for typ in ["Relocation", "Device fault", "Renewal", "5G upgrade"]:
    g = req[req.type == typ]
    done = g[g.resolution_days.notna()]
    row = dict(type=typ, n=int(len(g)), open=int(g.resolution_days.isna().sum()), median=float(done.resolution_days.median()) if len(done) else None, sla=int(g.sla_days.iat[0]), slaMet=round((done.within_sla == "Y").mean() * 100, 1) if len(done) else None)
    if typ in ("Relocation", "Device fault"):
        inside, breach = done[done.within_sla == "Y"], done[done.within_sla == "N"]
        row.update(leftInside=round(inside.left60.mean() * 100, 1), leftBreach=round(breach.left60.mean() * 100, 1), nInside=int(len(inside)), nBreach=int(len(breach)))
    if typ == "Renewal":
        ren = g[g.outcome.str.startswith("Renewed")]
        dec = g[~g.outcome.str.startswith("Renewed")]
        row.update(renewed=round(len(ren) / len(g) * 100, 1), leftRenewed=round(ren.left60.mean() * 100, 1), leftDeclined=round(dec.left60.mean() * 100, 1))
    lifecycle.append(row)
req_monthly = [dict(m=LABELS[t], **{typ: int(((q.t == t) & (q.type == typ)).sum()) for typ in ["Relocation", "Device fault", "Renewal", "5G upgrade"]}) for t in range(T)]

# ------------------------------------------------------------------ campaign effectiveness (treatment vs control)
k["w"] = k.wave_month.map(MI)
k["ci"] = k.customer_id.map(cidx)


def lift(tr, co):
    n1, x1, n0, x0 = len(tr), int((tr == "Y").sum()), len(co), int((co == "Y").sum())
    p1, p0 = x1 / n1, x0 / n0
    se = math.sqrt(p1 * (1 - p1) / n1 + p0 * (1 - p0) / n0)
    pool = (x1 + x0) / (n1 + n0)
    z = (p1 - p0) / math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n0)) if 0 < pool < 1 else 0
    return dict(n1=n1, n0=n0, p1=round(p1 * 100, 1), p0=round(p0 * 100, 1), diff=round((p1 - p0) * 100, 1), lo=round((p1 - p0 - 1.96 * se) * 100, 1), hi=round((p1 - p0 + 1.96 * se) * 100, 1), p=round(float(2 * (1 - stats.norm.cdf(abs(z)))), 4))


OUTCOME = {"C1": "Still a customer 90 days later", "C2": "Rebought on time that month", "C3": "Paid that month's invoice", "C4": "Still a customer 90 days later", "C5": "Moved to 5G within 2 months"}
campaigns = []
for r in camps.itertuples():
    g = k[(k.campaign_id == r.campaign_id) & k.converted.isin(["Y", "N"])]
    res = lift(g[g.group == "Treatment"].converted, g[g.group == "Control"].converted)
    treated = int((g.group == "Treatment").sum())
    incr = res["diff"] / 100 * treated
    cost = treated * r.cost_per_contact_idr
    if r.campaign_id == "C4":  # the discount itself: 20% of the fee for 3 months, for treated customers who stayed
        tr_ids = g[(g.group == "Treatment") & (g.converted == "Y")].ci.values
        cost += int(sum(FEE_AT[i, min(w, T - 1)] * 0.2 * 3 for i, w in zip(tr_ids, g[(g.group == "Treatment") & (g.converted == "Y")].w.values)))
    campaigns.append(dict(id=r.campaign_id, name=r.name, objective=r.objective, channel=r.channel, offer=r.offer, rule=r.target_rule, first=r.first_wave, holdout=r.holdout_pct, outcome=OUTCOME[r.campaign_id], cost=int(cost), incremental=round(incr, 1), costPer=int(cost / incr) if incr > 0.5 else None, **res))
# the save offer, by how much money trouble the customer had when contacted
c4 = k[(k.campaign_id == "C4") & k.converted.isin(["Y", "N"])].copy()
c4["late"] = [int(LATE[i, max(0, w - 3):w].sum()) for i, w in zip(c4.ci.values, c4.w.values)]
c4["band"] = np.where(c4.late >= 2, "Late 2+ times", np.where(c4.late == 1, "Late once", "Paid on time"))
save_by_band = [dict(k=bd, **lift(c4[(c4.band == bd) & (c4.group == "Treatment")].converted, c4[(c4.band == bd) & (c4.group == "Control")].converted)) for bd in ["Paid on time", "Late once", "Late 2+ times"]]

# ------------------------------------------------------------------ customer voice: the surveys
sv = pd.read_csv(RAW / "surveys.csv")
sv["t"] = sv.survey_month.map(MI)
sv["ci"] = sv.customer_id.map(cidx)
sv["ans"] = sv.responded == "Y"
sv["churn_t"] = churn_t[sv.ci.values]
sv["left90"] = [(t < ct <= t + 3) for ct, t in zip(sv.churn_t, sv.t)]
sv["plan_t"] = [plan_at(i, t) for i, t in zip(sv.ci, sv.t)]
sv["channel"] = c.sales_channel.values[sv.ci.values]
sv["area"] = c.area_type.values[sv.ci.values]
sv["situ"] = np.where(sv.plan_t == "Home 5G 100 Mbps", "5G", np.where(sv.area == "Metro", "4G in a metro", "4G elsewhere"))
GROUPS = ["Promoter", "Passive", "Detractor"]
sv["grp"] = np.where(~sv.ans, "No answer", np.where(sv.nps >= 9, "Promoter", np.where(sv.nps >= 7, "Passive", "Detractor")))
TYPES = ["Onboarding", "Relationship", "After service request", "Exit"]
ATTRS = [("sat_speed_peak", "Speed at busy hours"), ("sat_indoor_signal", "Signal indoors"), ("sat_value", "Value for money"), ("sat_support", "Support and repairs")]
rel = sv[sv.survey_type.isin(["Onboarding", "Relationship"])]  # the regular surveys
ra = rel[rel.ans]


def nps_of(x):
    x = x.dropna()
    return round(((x >= 9).mean() - (x <= 6).mean()) * 100, 1) if len(x) else None


def nps_rows(df, col, keys):
    return [dict(k=kk, n=int((g := df[df[col] == kk]).shape[0]), v=nps_of(g.nps)) for kk in keys]


program = [dict(k=ty, sent=int((g := sv[sv.survey_type == ty]).shape[0]), answered=int(g.ans.sum()), rate=round(g.ans.mean() * 100, 1)) for ty in TYPES]
QS = sorted({f"Q{(m.month - 1) // 3 + 1} {str(m.year)[2:]}" for m in MONTHS[1:]}, key=lambda q: (q[-2:], q[1]))
ra_q = ra.assign(q=[f"Q{(MONTHS[t].month - 1) // 3 + 1} {str(MONTHS[t].year)[2:]}" for t in ra.t])
nps_trend = [dict(k=qq, n=int((g := ra_q[ra_q.q == qq]).shape[0]), v=nps_of(g.nps)) for qq in QS]

# what predicts leaving: answer group, 90 days after the survey (surveys with 3 months observed)
obs = rel[rel.t <= T - 4]
by_group = [dict(k=gname, n=int((g := obs[obs.grp == gname]).shape[0]), v=round(g.left90.mean() * 100, 1)) for gname in GROUPS + ["No answer"]]
# leavers after a low value-for-money rating: how many left by not paying?
o_obs = obs[obs.ans & obs.left90]
value_invol = round(float((c.churn_type.values[o_obs[o_obs.sat_value <= 2].ci.values] == "Involuntary").mean() * 100), 1)
other_invol = round(float((c.churn_type.values[o_obs[o_obs.sat_value >= 3].ci.values] == "Involuntary").mean() * 100), 1)
by_attr = []
for col, lab in ATTRS[:3]:
    o = obs[obs.ans]
    low, mid, high = o[o[col] <= 2], o[o[col] == 3], o[o[col] >= 4]
    by_attr.append(dict(k=lab, low=round(low.left90.mean() * 100, 1), mid=round(mid.left90.mean() * 100, 1), high=round(high.left90.mean() * 100, 1), nLow=int(len(low))))

# drivers: how strongly each rating moves with the score, and how well we do on it
drivers = []
for col, lab in ATTRS:
    g = sv[sv.ans & sv[col].notna() & sv.nps.notna() & (sv.survey_type != "Exit")]
    drivers.append(dict(k=lab, importance=round(float(g[col].corr(g.nps)), 3), score=round(float(g[col].mean()), 2), satisfied=round(float((g[col] >= 4).mean() * 100), 1), unhappy=round(float((g[col] <= 2).mean() * 100), 1), n=int(len(g))))

# where it hurts: low ratings by situation and channel
cut = dict(
    speedBySitu=[dict(k=kk, n=int((g := ra[ra.situ == kk]).shape[0]), v=round((g.sat_speed_peak <= 2).mean() * 100, 1), nps=nps_of(g.nps)) for kk in ["4G in a metro", "4G elsewhere", "5G"]],
    signalByChannel=[dict(k=kk, n=int((g := ra[ra.channel == kk]).shape[0]), v=round((g.sat_indoor_signal <= 2).mean() * 100, 1), nps=nps_of(g.nps)) for kk in CHANNELS],
    npsByArea=nps_rows(ra, "area", AREAS),
    npsByType=[dict(k="After month 1", n=int((g := ra[ra.survey_type == "Onboarding"]).shape[0]), v=nps_of(g.nps))] + [dict(k=lab, n=int((g := ra[(ra.survey_type == "Relationship") & (ra.t - act[ra.ci.values]).between(lo, hi)]).shape[0]), v=nps_of(g.nps)) for lab, lo, hi in [("Months 3-6", 3, 6), ("Months 9-12", 9, 12), ("Month 15+", 15, 99)]],
)

# exit survey: what the system logged vs what the leaver said
ex = sv[(sv.survey_type == "Exit") & sv.ans].copy()
ex["logged"] = c.churn_reason.values[ex.ci.values]
STATED = ["Slow at busy hours", "Weak signal indoors", "Router or device problems", "Too expensive for me", "Forgot to top up, then gave up", "Moved house, couldn't take it along", "Switched to fibre", "Didn't use it enough"]
SERVICE = STATED[:3]
said = []
for lg in REASONS:
    g = ex[ex.logged == lg]
    if len(g) >= 8:
        said.append(dict(k=lg, n=int(len(g)), parts=[round((g.exit_reason == st).mean() * 100, 1) for st in STATED]))
said.sort(key=lambda x: -x["n"])
invol = ex[ex.logged.isin(["Did not rebuy", "Payment default"])]
lowuse = ex[ex.logged == "Low use, not needed"]
exit_mix = [dict(k=st, v=int((ex.exit_reason == st).sum())) for st in STATED]

# what they write: coded themes, and real lines per theme
cm = sv[sv.ans & sv.theme.notna()]
THEMES = ["Slow at busy hours", "Weak signal indoors", "Price", "Slow support / fix", "Router problems", "Payment hassle", "Moved house", "Fibre competitor", "Rarely used", "Works well", "5G is faster"]
themes = [dict(k=th, all=int((cm.theme == th).sum()), det=int(((cm.theme == th) & (cm.nps <= 6)).sum())) for th in THEMES]
pick = cm.sample(frac=1.0, random_state=11)
quotes = []
for th in THEMES:
    pool = pick[pick.theme == th]
    if th not in ("Works well", "5G is faster") and (pool.nps <= 6).sum() >= 4:
        pool = pool[pool.nps <= 6]  # complaints quoted from unhappy customers
    for r in pool.assign(base=pool.comment.str.split(".").str[0]).drop_duplicates("base").head(4).itertuples():  # one line per sentence
        quotes.append(dict(theme=th, id=r.customer_id, type=r.survey_type, nps=int(r.nps) if not pd.isna(r.nps) else None, text=r.comment, en=r.comment_en, plan=r.plan_t.replace("Home ", ""), area=r.area, channel=r.channel))
onb = cm[(cm.survey_type == "Onboarding") & (cm.nps <= 6)]
new_complaints = [dict(k=th, v=round((onb.theme == th).mean() * 100, 1)) for th in THEMES if (onb.theme == th).any()]
new_complaints.sort(key=lambda x: -x["v"])

# after a repair: support rating when the fix was on time vs late
asr = sv[(sv.survey_type == "After service request") & sv.ans].merge(q[q.type.isin(["Relocation", "Device fault"])][["customer_id", "t", "within_sla"]], on=["customer_id", "t"], how="left").drop_duplicates("survey_id")
support_sla = [dict(k=kk, n=int((g := asr[asr.within_sla == yn]).shape[0]), v=round(float(g.sat_support.mean()), 2), nps=nps_of(g.nps)) for kk, yn in [("Fixed within target", "Y"), ("Fixed late", "N")]]

# does a survey answer sharpen the churn model? (answers with two months observed, behaviour features at the same month end)
from sklearn.model_selection import RepeatedStratifiedKFold  # noqa: E402
from sklearn.pipeline import make_pipeline  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402

feat_cache = {}
mrows = []
for r in ra[ra.t <= T - 3].itertuples():
    if r.t not in feat_cache:
        f = snaps.get(r.t)
        feat_cache[r.t] = (f if f is not None else feats(r.t)).set_index("i")
    f = feat_cache[r.t]
    if r.ci in f.index:
        row = f.loc[r.ci, FEATURES + ["y"]].to_dict()
        row.update(nps=r.nps, s_speed=r.sat_speed_peak, s_signal=r.sat_indoor_signal, s_value=r.sat_value)
        mrows.append(row)
md = pd.DataFrame(mrows)
SURV = ["nps", "s_speed", "s_signal", "s_value"]
cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=3)


def compare(d):
    """Cross-validated AUC and top-20% catch: behaviour only, survey only, both."""
    res = {"behaviour": [], "both": [], "survey": []}
    cap = {"behaviour": [], "both": [], "survey": []}
    for tr, te in cv.split(d, d.y):
        for name, cols in [("behaviour", FEATURES), ("both", FEATURES + SURV), ("survey", SURV)]:
            mdl = make_pipeline(StandardScaler(), LogisticRegression(C=0.5, max_iter=2000)).fit(d.iloc[tr][cols], d.y.iloc[tr])
            pr = mdl.predict_proba(d.iloc[te][cols])[:, 1]
            yt_ = d.y.iloc[te].values
            res[name].append(roc_auc_score(yt_, pr))
            top = np.argsort(-pr)[: max(1, int(len(pr) * 0.2))]
            cap[name].append(yt_[top].sum() / max(1, yt_.sum()))
    return dict(n=int(len(d)), leavers=int(d.y.sum()), **{f"auc_{kk}": round(float(np.mean(v)), 3) for kk, v in res.items()}, **{f"top20_{kk}": round(float(np.mean(v)) * 100, 1) for kk, v in cap.items()})


uplift = compare(md)
uplift_new = compare(md[md.tenure <= 1].reset_index(drop=True))
uplift_old = compare(md[md.tenure > 1].reset_index(drop=True))

voice = dict(
    program=program, invites=int(len(sv)), answers=int(sv.ans.sum()), comments=int(len(cm)), npsNow=nps_of(ra[ra.t >= T - 6].nps), npsAll=nps_of(ra.nps), nAnswersNow=int((ra.t >= T - 6).sum()),
    trend=nps_trend, byGroup=by_group, byAttr=by_attr, drivers=drivers, cut=cut,
    said=said, stated=STATED, service=SERVICE, exitN=int(len(ex)), exitMix=exit_mix,
    involService=round(invol.exit_reason.isin(SERVICE).mean() * 100, 1), involMoney=round(invol.exit_reason.isin(STATED[3:5]).mean() * 100, 1), involN=int(len(invol)),
    lowUseService=round(lowuse.exit_reason.isin(SERVICE).mean() * 100, 1), lowUseN=int(len(lowuse)),
    valueInvol=value_invol, otherInvol=other_invol, themes=themes, quotes=quotes, newComplaints=new_complaints, supportSla=support_sla, uplift=uplift, upliftNew=uplift_new, upliftOld=uplift_old,
)
print("voice program", program)
print("npsNow", voice["npsNow"], "npsAll", voice["npsAll"], "trend", [(x["k"], x["v"]) for x in nps_trend])
print("byGroup", by_group)
print("byAttr", by_attr)
print("drivers", drivers)
print("cut", json.dumps(cut))
print("invol service", voice["involService"], "money", voice["involMoney"], "n", voice["involN"], "| lowuse service", voice["lowUseService"], voice["lowUseN"])
print("new complaints", new_complaints)
print("support sla", support_sla)
print("value invol", value_invol, "other", other_invol)
print("uplift", uplift)
print("uplift new", uplift_new)
print("uplift old", uplift_old)

# ------------------------------------------------------------------ compact customer rows for the browser
cust_rows = []
risk_by_i = dict(zip(now.i, now.risk))
seg_by_i = dict(zip(now.i, now.seg))
for i in range(N):
    first = GB[i, act[i]]
    last_t = T - 1 if churn_t[i] == -1 else churn_t[i]
    cust_rows.append(
        [
            int(act[i]), int(churn_t[i]), PLANS.index(plan_at(i, last_t)), PLANS.index(c.plan_at_activation.iat[i]), CHANNELS.index(c.sales_channel.iat[i]),
            REGIONS.index(c.region.iat[i]), AREAS.index(c.area_type.iat[i]), PAYS.index(c.pay_type.iat[i]), METHODS.index(c.payment_method.iat[i]),
            int(c.bundle_12m.iat[i] == "Y"), int(c.cover_t.iat[i]), REASONS.index(c.churn_reason.iat[i]) if isinstance(c.churn_reason.iat[i], str) else -1,
            int(round(FEE_AT[i, last_t] / 1000)), round(float(first) / PLAN_TYPICAL[c.plan_at_activation.iat[i]] * 100) if np.isfinite(first) else 0,
            round(float(RATIO[i, last_t]) * 100) if np.isfinite(RATIO[i, last_t]) else 0, int(LATE[i, max(0, last_t - 2):last_t + 1].sum()),
            int(round(risk_by_i[i] * 1000)) if i in risk_by_i else -1, int(seg_by_i[i]) if i in seg_by_i else -1,
        ]
    )

# ------------------------------------------------------------------ findings, each computed from the numbers above
last, prev = series[-1], series[-2]
fresh = [x for x in cohort_logo if len(x["r"]) > 2]
best_ch = max(early_by["channel"], key=lambda x: x["v"])
low_first = early_by["firstUse"][0]
findings = dict(
    base=f"{last['base']:,} active customers at the end of {LABELS[-1]}, {last['adds'] - last['churn']:+,} in the month ({last['adds']} joined, {last['churn']} left).",
    churn=f"Monthly churn is {last['rate']}%: {last['vol']} chose to leave and {last['inv']} were lost to non-payment.",
    early=f"{round(early.early.mean() * 100, 1)}% of new customers leave within 3 months. It rises to {low_first['v']}% when first-month usage is under 35% of the plan, and to {best_ch['v']}% for customers sold through {best_ch['k'].lower()}.",
    cohorts=f"Three-month survival moved from {fresh[0]['r'][2]}% (the {fresh[0]['m']} cohort) to {fresh[-1]['r'][2]}% ({fresh[-1]['m']}).",
    risk=f"{segments[0]['n'] + segments[1]['n'] + segments[2]['n']:,} active customers sit in the three riskiest segments; in the past, {segments[0]['churn60']}% of 'overdue or lapsing' customers left within 60 days, against {segments[5]['churn60']}% of healthy ones.",
    model=f"The churn model ranks well on months it never saw (AUC {model['lr']['auc']}): calling the top 20% would reach {model['lr']['gains'][2]['captured']}% of the customers who then left.",
    fiveg=f"{fiveg_summary['readyNow']:,} customers have 5G coverage at home but are still on 4G. After upgrading, usage goes from {fiveg_summary['upgradeUsageBefore']} to {fiveg_summary['upgradeUsageAfter']} GB a month.",
    lifecycle=f"A relocation fixed within its SLA loses {lifecycle[0]['leftInside']}% of customers in 60 days; a late fix loses {lifecycle[0]['leftBreach']}%.",
    voice=f"Detractors leave {by_group[2]['v'] / by_group[0]['v']:.1f}× as often as promoters within 90 days ({by_group[2]['v']}% vs {by_group[0]['v']}%), and customers who never answer leave at {by_group[3]['v']}%. Of leavers logged as 'didn't pay', {voice['involService']}% said the service itself made them stop.",
)

dashboard = dict(
    asOf="31 Oct 2026",
    months=LABELS,
    counts=dict(customers=N, usage=int(len(u)), billing=int(len(b)), requests=int(len(q)), contacts=int(len(k)), campaigns=int(len(camps)), surveys=int(len(sv))),
    dims=dict(plans=PLANS, channels=CHANNELS, regions=REGIONS, areas=AREAS, pays=PAYS, methods=METHODS, reasons=REASONS, segments=[s[0] for s in SEGMENTS]),
    series=series,
    cohortLogo=cohort_logo,
    cohortRev=cohort_rev,
    survivability=survivability,
    early=dict(overall=round(early.early.mean() * 100, 1), **early_by),
    segments=segments,
    model=model,
    call=call,
    payments=dict(rebuyDist=rebuy_dist, rebuyByMethod=rebuy_by_method, recovery=recovery, recoveryDays=list(range(0, 46, 3)), owingNow=int(len(owing_now)), owingAmount=int(owing_now.amount_idr.sum())),
    fiveg=dict(monthly=fiveg, **fiveg_summary),
    lifecycle=dict(types=lifecycle, monthly=req_monthly),
    campaigns=campaigns,
    saveByBand=save_by_band,
    reasons=[dict(k=r, v=int((c.churn_reason == r).sum())) for r in REASONS],
    findings=findings,
    voice=voice,
)
(OUT / "fwa-dashboard.json").write_text(json.dumps(dashboard, separators=(",", ":")))
(OUT / "fwa-customers.json").write_text(json.dumps(dict(cols=["act", "churn", "plan", "plan0", "channel", "region", "area", "pay", "method", "bundle", "cover", "reason", "fee", "firstUse", "lastUse", "late3", "risk", "seg"], rows=cust_rows), separators=(",", ":")))
for f in ["fwa-dashboard.json", "fwa-customers.json"]:
    print(f, round((OUT / f).stat().st_size / 1024), "KB")
print(json.dumps(findings, indent=1))
print("model LR auc", model["lr"]["auc"], "GBM auc", model["gbm"]["auc"], "base", model["baseRate"])
print("segments", [(s["name"], s["n"], s["churn60"]) for s in segments])
print("campaigns", [(x["id"], x["p1"], x["p0"], x["diff"], x["lo"], x["hi"], x["p"]) for x in campaigns])
print("save by band", [(x["k"], x["diff"], x["n1"], x["n0"]) for x in save_by_band])
print("lifecycle", lifecycle)
