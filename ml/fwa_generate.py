"""
Synthetic customer base of a fictional FWA (Fixed Wireless Access) home-internet service, for the FWA base-health case
on /skills/analytics/dashboards/fwa. Everything is made up: the service, its customers, usage, payments, service
requests and retention campaigns. The rules that create the data are all in this file, so every pattern the analysis
finds can be traced back to a cause written here.

    ml/.venv/Scripts/python.exe -I ml/fwa_generate.py

Writes ml/data/raw/fwa/*.csv and copies them to public/data/fwa/ for the page's raw-data explorer.

The world, in short
- 22 months (Jan 2025 - Oct 2026), data as of 31 Oct 2026. New customers every month (cohorts), more over time.
- Plans: Home 4G 20 Mbps, Home 4G 50 Mbps, and from Jul 2025 Home 5G 100 Mbps (needs 5G coverage at home).
- Two ways to pay: a monthly package that must be re-bought before it expires (rebuy), or a postpaid invoice.
- 5G coverage rolls out over time, faster in metro areas. A covered 4G customer can upgrade to a 5G plan and device.
- Each customer has a hidden engagement level (drifts month to month) and affordability. They drive usage, paying on
  time and churn. Early months are the riskiest; falling usage, late payments, 4G congestion in metros, unresolved
  relocations and device faults raise churn; a 12-month bundle, 5G and some campaigns lower it.
- Five campaigns run with a random holdout (control) group, so their real effect can be measured.
- Customers are surveyed after their first month, every quarter, after a relocation or device fault, and when they
  leave. Answers come from the same hidden state that drives churn (congestion, indoor signal, affordability, slow
  fixes), so the survey can explain the "why" that usage and billing only hint at. Online and partner-agent sales skip
  the signal check at the address, so more of those homes have weak indoor signal. Engaged customers answer more often,
  so the quiet ones, who leave most, are heard least. Surveys use their own random stream: the other tables stay the
  same when the survey rules change.
"""

import shutil
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw" / "fwa"
PUBLIC = ROOT.parent / "public" / "data" / "fwa"
rng = np.random.default_rng(20261031)

MONTHS = pd.period_range("2025-01", "2026-10", freq="M")
T = len(MONTHS)
AS_OF = pd.Timestamp("2026-10-31")
FIVE_G_LAUNCH = 6  # Jul 2025

REGIONS = [  # name, share of new customers, area-type mix (metro, urban, suburban, rural)
    ("Jabodetabek", 0.30, (0.70, 0.22, 0.08, 0.00)),
    ("West Java", 0.15, (0.15, 0.40, 0.30, 0.15)),
    ("Central Java", 0.11, (0.10, 0.35, 0.35, 0.20)),
    ("East Java", 0.14, (0.20, 0.35, 0.30, 0.15)),
    ("Bali & Nusa Tenggara", 0.05, (0.15, 0.40, 0.25, 0.20)),
    ("Sumatra", 0.12, (0.15, 0.35, 0.30, 0.20)),
    ("Kalimantan", 0.07, (0.10, 0.35, 0.30, 0.25)),
    ("Sulawesi", 0.06, (0.10, 0.35, 0.30, 0.25)),
]
AREAS = ["Metro", "Urban", "Suburban", "Rural"]
COVER_EVENTUAL = {"Metro": 0.72, "Urban": 0.45, "Suburban": 0.18, "Rural": 0.04}
PLANS = {  # code: name, fee (IDR / month), technology, speed (Mbps), typical GB / month
    "H4G20": ("Home 4G 20 Mbps", 175_000, "4G", 20, 150),
    "H4G50": ("Home 4G 50 Mbps", 250_000, "4G", 50, 240),
    "H5G100": ("Home 5G 100 Mbps", 350_000, "5G", 100, 380),
}
CHANNELS = ["Retail outlet", "Online", "Field sales", "Partner agent"]
CHANNEL_SHARE = [0.38, 0.22, 0.25, 0.15]
CHANNEL_ENGAGE = {"Retail outlet": 0.0, "Online": -0.15, "Field sales": 0.1, "Partner agent": -0.2}
CHANNEL_CHURN = {"Retail outlet": 0.0, "Online": 0.30, "Field sales": -0.10, "Partner agent": 0.25}

CAMPAIGNS = [  # id, name, objective, channel, first wave (month index), target rule, offer, holdout share, cost per contact (IDR)
    ("C1", "Early-life welcome", "Cut churn in the first months", "WhatsApp + call", 8, "Month 2 of service and first-month usage under 60% of the plan's typical", "Setup tips and a usage check call", 0.20, 6_000),
    ("C2", "Rebuy reminder", "Rebuy on time", "WhatsApp", 6, "Monthly-package customers who were late at least once in the last 3 months", "Reminder 3 days before the package expires", 0.20, 400),
    ("C3", "Payment recovery", "Recover overdue invoices", "Call + WhatsApp", 9, "Postpaid customers 5 to 30 days past due", "Reminder call and a payment link", 0.20, 5_000),
    ("C4", "Save offer", "Keep customers at risk", "Retention desk call", 12, "Active customers with a risk flag (late payment, low or falling usage, open complaint), up to 120 per month", "20% off for 3 months", 0.30, 8_000),
    ("C5", "5G upgrade", "Move covered 4G customers to 5G", "WhatsApp + outlet", 10, "4G customers whose home now has 5G coverage, not contacted in the last 3 months, up to 150 per month", "Free 5G device swap with a 5G plan", 0.20, 3_000),
]


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def day_in(month_idx, lo=1, hi=28):
    p = MONTHS[month_idx]
    return pd.Timestamp(year=p.year, month=p.month, day=int(rng.integers(lo, hi + 1)))


def season(t):
    m = MONTHS[t].month
    return {3: 0.96, 4: 0.97, 6: 1.04, 7: 1.05, 12: 1.06}.get(m, 1.0)


# ------------------------------------------------------------------ customers arrive
customers = []
for t in range(T):
    month = MONTHS[t]
    trend = 150 + 5.2 * t
    bump = 1.18 if month.month in (3, 12) else 1.0  # Ramadan / year-end promotions
    n_new = int(rng.poisson(trend * bump))
    for _ in range(n_new):
        r = rng.choice(len(REGIONS), p=[x[1] for x in REGIONS])
        region, _, mix = REGIONS[r]
        area = AREAS[rng.choice(4, p=mix)]
        covered_ever = rng.random() < COVER_EVENTUAL[area]
        # coverage date: metro early, others later; some homes covered before 2025
        if covered_ever:
            start = {"Metro": -4, "Urban": 2, "Suburban": 8, "Rural": 14}[area]
            cover_from = int(np.clip(round(rng.normal(start + 6, 6)), -6, T + 6))
        else:
            cover_from = 999
        covered_now = cover_from <= t
        if covered_now and t >= FIVE_G_LAUNCH:
            plan = rng.choice(["H5G100", "H4G50", "H4G20"], p=[0.55, 0.30, 0.15])
        else:
            plan = rng.choice(["H4G50", "H4G20"], p=[0.30, 0.70] if area == "Rural" else [0.47, 0.53])
        channel = CHANNELS[rng.choice(4, p=CHANNEL_SHARE)]
        postpaid_p = {"Metro": 0.50, "Urban": 0.38, "Suburban": 0.30, "Rural": 0.22}[area] + (0.12 if channel == "Field sales" else 0)
        pay = "Postpaid invoice" if rng.random() < postpaid_p else "Monthly package"
        if pay == "Monthly package":
            method = rng.choice(["E-wallet", "Retail counter", "Bank transfer (VA)"], p=[0.45, 0.30, 0.25])
            contract = rng.random() < 0.15
        else:
            method = rng.choice(["Autodebit", "Bank transfer (VA)", "E-wallet"], p=[0.35, 0.40, 0.25])
            contract = rng.random() < 0.60
        customers.append(
            dict(
                idx=len(customers),
                act=t,
                act_date=day_in(t),
                region=region,
                area=area,
                cover_from=cover_from,
                plan0=str(plan),
                plan=str(plan),
                channel=channel,
                pay=pay,
                method=str(method),
                contract=bool(contract),
                e0=rng.normal(0, 1) + CHANNEL_ENGAGE[channel],
                aff=rng.normal(0, 1) + {"Metro": 0.3, "Urban": 0.1, "Suburban": -0.1, "Rural": -0.4}[area],
                e=None,
                status="Active",
                churn_t=None,
                churn_reason=None,
                churn_type=None,
                gb_hist=[],
                late_hist=[],
                dpd=0,
                open_reloc=None,
                open_fault=None,
                renewed=None,
                upgraded_t=None,
                treat={},  # campaign id -> (wave month, group)
                hist={},  # month -> that month's hidden state, for the surveys (uses no random numbers)
            )
        )
for i, c in enumerate(customers):
    c["id"] = f"FWA-{i + 1:06d}"
    c["e"] = c["e0"]

# ------------------------------------------------------------------ month by month
usage_rows, billing_rows, request_rows, contact_rows = [], [], [], []
req_seq = 0


def in_treat(c, cid, t, months):
    """Treatment group of campaign cid, contacted within the last `months` months."""
    w = c["treat"].get(cid)
    return w is not None and w[1] == "Treatment" and w[2] and 0 <= t - w[0] < months


for t in range(T):
    active = [c for c in customers if c["act"] <= t and c["status"] == "Active"]
    for c in active:
        m = t - c["act"]  # months of service, 0 = first month
        name, fee, tech, speed, typical = PLANS[c["plan"]]
        covered = c["cover_from"] <= t
        # engagement drifts; a few customers sour on the service
        c["e"] = 0.85 * c["e"] + 0.15 * c["e0"] + rng.normal(0, 0.22) - (0.08 if rng.random() < 0.04 else 0)
        e = c["e"]

        # ---- usage
        ramp = [0.55, 0.85, 1.0][min(m, 2)]
        welcomed = in_treat(c, "C1", t, 3)
        gb = typical * np.exp(0.5 * e + rng.normal(0, 0.22)) * ramp * season(t) * (1.10 if welcomed else 1.0)
        if c["upgraded_t"] is not None and t > c["upgraded_t"]:
            gb *= 1.0  # already on the 5G plan's typical usage
        congested = tech == "4G" and c["area"] == "Metro" and t >= 9
        speed_avg = speed * (0.55 if congested else 0.78) * np.exp(rng.normal(0, 0.12)) if tech == "4G" else (speed * 0.82 * np.exp(rng.normal(0, 0.1)) if covered else 30 * np.exp(rng.normal(0, 0.15)))
        share5g = (np.clip(rng.normal(0.86, 0.07), 0.4, 0.99) if covered else 0.0) if tech == "5G" else 0.0
        days = int(np.clip(round(30 * sigmoid(1.6 + 0.9 * e + rng.normal(0, 0.4))), 1, 30))
        gb = round(float(gb), 1)
        ratio = gb / typical
        prev = c["gb_hist"][-2:]
        falling = len(prev) == 2 and gb < 0.6 * (sum(prev) / 2)
        c["gb_hist"].append(gb)
        usage_rows.append((c["id"], str(MONTHS[t]), gb, days, round(float(speed_avg), 1), round(float(share5g) * 100)))

        # ---- paying for this month (a welcome call and a discount also help people keep paying)
        late = 0
        lost_to_payment = False
        saved = in_treat(c, "C4", t, 3)
        if c["pay"] == "Monthly package":
            expiry = day_in(t, 1, 28)
            method_eff = {"E-wallet": 0.4, "Retail counter": -0.45, "Bank transfer (VA)": 0.0}[c["method"]]
            reminded = in_treat(c, "C2", t, 1)
            habit = sum(c["late_hist"][-3:])  # people who paid late before tend to do it again
            p_on_time = sigmoid(1.5 + 0.7 * c["aff"] + 0.55 * e + method_eff + (0.6 if reminded else 0) - 0.4 * habit)
            if rng.random() < p_on_time:
                rebuy, days_late, status = expiry - pd.Timedelta(days=int(rng.integers(0, 4))), 0, "On time"
            else:
                p_lapse = sigmoid(-2.5 - 0.6 * c["aff"] - 0.8 * e + 0.45 * habit + (0.5 if m < 3 else 0) - (0.4 if reminded else 0) - (0.6 if welcomed and m < 3 else 0) - (0.6 if saved else 0))
                if rng.random() < p_lapse:
                    rebuy, days_late, status, lost_to_payment = None, None, "Not rebought", True
                else:
                    days_late = int(min(30, 1 + rng.geometric(0.22)))
                    rebuy, status, late = expiry + pd.Timedelta(days=days_late), "Late", 1
            billing_rows.append((c["id"], str(MONTHS[t]), c["pay"], fee, expiry.date(), rebuy.date() if rebuy is not None else "", days_late if days_late is not None else "", status, ""))
        else:
            invoice = pd.Timestamp(year=MONTHS[t].year, month=MONTHS[t].month, day=1)
            due = invoice + pd.Timedelta(days=14)
            nudged = in_treat(c, "C3", t, 1)
            auto = c["method"] == "Autodebit"
            p_on_time = sigmoid(1.8 + 0.6 * c["aff"] + 0.45 * e + (1.6 if auto else 0) - 0.4 * sum(c["late_hist"][-3:]))
            if c["dpd"] > 0:  # still owing from last month
                p_on_time = sigmoid(-0.6 + 0.5 * c["aff"] + 0.4 * e + (0.9 if nudged else 0))
            if rng.random() < p_on_time:
                paid = due - pd.Timedelta(days=int(rng.integers(0, 10)))
                dpd, status, dunning = 0, "Paid on time", ""
            else:
                p_never = sigmoid(-2.0 - 0.7 * c["aff"] - 0.7 * e + (0.6 if c["dpd"] > 0 else 0) - (0.9 if nudged else 0) - (0.6 if saved else 0))
                if rng.random() < p_never:
                    paid, dpd, status = None, c["dpd"] + 30, "Unpaid"
                    dunning = "Suspended" if dpd >= 30 else "Reminder"
                    if dpd >= 60:
                        lost_to_payment, status, dunning = True, "Written off", "Terminated"
                else:
                    late_days = int(min(45, 1 + rng.geometric(0.12)))
                    paid, dpd, status, dunning, late = due + pd.Timedelta(days=late_days), 0, "Paid late", "Reminder" if late_days > 3 else "", 1
                    if (paid - AS_OF).days > 0:  # not paid yet on the data date
                        paid, status, dpd = None, "Unpaid", (AS_OF - due).days
            c["dpd"] = dpd
            billing_rows.append((c["id"], str(MONTHS[t]), c["pay"], fee, due.date(), paid.date() if paid is not None else "", (paid - due).days if paid is not None else "", status, dunning))
        c["late_hist"].append(late)

        # ---- service requests
        if c["open_reloc"] is None and rng.random() < 0.006:
            req_seq += 1
            created = day_in(t)
            days_res = float(rng.lognormal(np.log(5 if c["area"] in ("Metro", "Urban") else 9), 0.7))
            resolved = created + pd.Timedelta(days=round(days_res))
            open_now = resolved > AS_OF
            c["open_reloc"] = (t, days_res)
            request_rows.append([f"RQ-{req_seq:06d}", c["id"], created.date(), "Relocation", rng.choice(["Call center", "App", "Store"]), "" if open_now else resolved.date(), "" if open_now else round(days_res), 7, "" if open_now else ("Y" if days_res <= 7 else "N"), "Open" if open_now else "Moved, service working"])
        if c["open_fault"] is None and rng.random() < 0.007 + 0.0004 * m:
            req_seq += 1
            created = day_in(t)
            days_res = float(rng.lognormal(np.log(2.5), 0.8))
            resolved = created + pd.Timedelta(days=round(days_res))
            open_now = resolved > AS_OF
            c["open_fault"] = (t, days_res)
            request_rows.append([f"RQ-{req_seq:06d}", c["id"], created.date(), "Device fault", rng.choice(["Call center", "App", "Store"]), "" if open_now else resolved.date(), "" if open_now else round(days_res), 3, "" if open_now else ("Y" if days_res <= 3 else "N"), "Open" if open_now else rng.choice(["Device replaced", "Fixed remotely"])])
        if c["contract"] and m == 11 and c["renewed"] is None:
            req_seq += 1
            created = day_in(t)
            renew = rng.random() < sigmoid(0.4 + 0.8 * e + 0.3 * c["aff"])
            c["renewed"] = renew
            request_rows.append([f"RQ-{req_seq:06d}", c["id"], created.date(), "Renewal", "Call center", (created + pd.Timedelta(days=2)).date(), 2, 5, "Y", "Renewed 12 months" if renew else "Declined, no contract"])
        upgrade_push = in_treat(c, "C5", t, 2)
        if tech == "4G" and covered and t >= FIVE_G_LAUNCH and c["upgraded_t"] is None and rng.random() < (0.11 if upgrade_push else 0.035) * sigmoid(0.6 + 0.6 * e + 0.4 * c["aff"]) * 2:
            req_seq += 1
            created = day_in(t)
            c["upgraded_t"] = t
            c["plan"] = "H5G100"
            request_rows.append([f"RQ-{req_seq:06d}", c["id"], created.date(), "5G upgrade", "Store" if upgrade_push else rng.choice(["Store", "App"]), (created + pd.Timedelta(days=1)).date(), 1, 3, "Y", "Moved to Home 5G 100 Mbps"])

        # ---- does the customer leave this month?
        reloc_bad = c["open_reloc"] is not None and c["open_reloc"][1] > 7 and t - c["open_reloc"][0] <= 1  # fixed after the 7-day SLA
        fault_bad = c["open_fault"] is not None and c["open_fault"][1] > 3 and t - c["open_fault"][0] <= 1  # fixed after the 3-day SLA
        if c["open_reloc"] is not None and t - c["open_reloc"][0] > 1:
            c["open_reloc"] = None
        if c["open_fault"] is not None and t - c["open_fault"][0] > 1:
            c["open_fault"] = None
        contract_on = c["contract"] and (m < 12 or c["renewed"])
        five_g = PLANS[c["plan"]][2] == "5G" and covered
        c["hist"][t] = dict(e=e, congested=congested, ratio=ratio, plan=c["plan"], five_g=five_g, reloc_bad=reloc_bad, fault_bad=fault_bad, fee=fee, saved=saved, late3=sum(c["late_hist"][-3:]))
        logit = (
            -4.35
            + {0: 0.9, 1: 0.75, 2: 0.4}.get(m, 0.0)
            + (0.9 if ratio < 0.35 else 0.4 if ratio < 0.6 else 0.0)
            + (0.6 if falling else 0.0)
            + 0.35 * sum(c["late_hist"][-3:])
            + (0.6 if congested else 0.0)
            + (-1.0 if contract_on else 0.0)
            + (1.0 if c["contract"] and m == 12 and not c["renewed"] else 0.5 if c["contract"] and m == 13 and not c["renewed"] else 0.0)
            + (-0.5 if five_g else 0.0)
            + CHANNEL_CHURN[c["channel"]]
            + (0.4 if fee >= 350_000 and c["aff"] < -0.5 else 0.0)
            + (0.25 if c["area"] == "Metro" and t >= 12 else 0.0)
            + (1.9 if reloc_bad else 0.0)
            + (1.2 if fault_bad else 0.0)
            + (-0.35 if welcomed and m <= 3 else 0.0)
        )
        p = sigmoid(logit)
        if saved:
            p *= 0.85 if sum(c["late_hist"][-3:]) >= 2 else 0.4  # the offer helps less when money is the problem
        if lost_to_payment:
            c.update(status="Churned", churn_t=t, churn_type="Involuntary", churn_reason="Did not rebuy" if c["pay"] == "Monthly package" else "Payment default")
        elif rng.random() < p:
            drivers = {
                "Moved house": 3.0 if reloc_bad else 0.05,
                "Device problem": 2.5 if fault_bad else 0.05,
                "Speed or coverage": 1.4 if congested else 0.25,
                "Price": 1.0 if fee >= 250_000 and c["aff"] < 0 else 0.3,
                "Switched to fibre": 0.8 if c["area"] == "Metro" and t >= 12 else 0.15,
                "Low use, not needed": 1.2 if ratio < 0.5 else 0.15,
                "Other": 0.3,
            }
            keys = list(drivers)
            w = np.array([drivers[k] for k in keys])
            c.update(status="Churned", churn_t=t, churn_type="Voluntary", churn_reason=keys[rng.choice(len(keys), p=w / w.sum())])

    # ---- campaign waves for next month, from what is known at the end of this month
    still = [c for c in active if c["status"] == "Active"]

    def wave(cid, pool, cap=None):
        _, _, _, _, start, _, _, holdout, _ = next(x for x in CAMPAIGNS if x[0] == cid)
        if t + 1 < start or t + 1 >= T:
            return
        pool = [c for c in pool if not (c["treat"].get(cid) and t + 1 - c["treat"][cid][0] < 3)]
        if cap is not None and len(pool) > cap:
            pool = [pool[i] for i in rng.choice(len(pool), cap, replace=False)]
        for c in pool:
            group = "Control" if rng.random() < holdout else "Treatment"
            reached = group == "Treatment" and rng.random() < 0.85
            c["treat"][cid] = (t + 1, group, reached)
            contact_rows.append(dict(campaign_id=cid, customer_id=c["id"], wave_month=t + 1, group=group, reached="Y" if reached else ("N" if group == "Treatment" else "")))

    wave("C1", [c for c in still if t - c["act"] == 0 and c["gb_hist"] and c["gb_hist"][-1] / PLANS[c["plan"]][4] < 0.6 / 0.55])
    wave("C2", [c for c in still if c["pay"] == "Monthly package" and sum(c["late_hist"][-3:]) >= 1])
    wave("C3", [c for c in still if c["pay"] == "Postpaid invoice" and 5 <= c["dpd"] <= 30])
    risky = [c for c in still if t - c["act"] >= 2 and (sum(c["late_hist"][-3:]) >= 1 or (c["gb_hist"] and c["gb_hist"][-1] / PLANS[c["plan"]][4] < 0.45) or c["open_fault"] or c["open_reloc"])]
    wave("C4", risky, cap=120)
    wave("C5", [c for c in still if PLANS[c["plan"]][2] == "4G" and c["cover_from"] <= t and t >= FIVE_G_LAUNCH], cap=150)

# ------------------------------------------------------------------ outcomes of each contact, from what happened next
by_id = {c["id"]: c for c in customers}
usage_df = pd.DataFrame(usage_rows, columns=["customer_id", "month", "data_gb", "active_days", "avg_download_mbps", "share_5g_pct"])
billing_df = pd.DataFrame(billing_rows, columns=["customer_id", "cycle_month", "pay_type", "amount_idr", "due_date", "paid_date", "days_late", "status", "dunning"])
bill_status = {(r.customer_id, r.cycle_month): r.status for r in billing_df.itertuples()}
for row in contact_rows:
    c = by_id[row["customer_id"]]
    w = row["wave_month"]
    horizon_ok = w + 2 < T  # three months of follow-up observed
    alive_after = c["churn_t"] is None or c["churn_t"] > w + 2
    row["outcome_window"] = "complete" if horizon_ok else "partial"
    row["retained_90d"] = ("Y" if alive_after else "N") if horizon_ok else ("N" if c["churn_t"] is not None else "")
    cid = row["campaign_id"]
    if cid == "C2":
        s = bill_status.get((c["id"], str(MONTHS[w])), "")
        row["converted"] = "Y" if s == "On time" else ("N" if s else "")
    elif cid == "C3":
        s = bill_status.get((c["id"], str(MONTHS[w])), "")
        row["converted"] = "Y" if s in ("Paid on time", "Paid late") else ("N" if s else "")
    elif cid == "C5":
        row["converted"] = ("Y" if c["upgraded_t"] is not None and w <= c["upgraded_t"] <= w + 1 else "N") if w + 1 < T else ""
    else:
        row["converted"] = row["retained_90d"]
contacts_df = pd.DataFrame(contact_rows)
contacts_df.insert(0, "contact_id", [f"CT-{i + 1:06d}" for i in range(len(contacts_df))])
contacts_df["wave_month"] = contacts_df["wave_month"].map(lambda w: str(MONTHS[w]))

cust_df = pd.DataFrame(
    [
        dict(
            customer_id=c["id"],
            activation_date=c["act_date"].date(),
            region=c["region"],
            area_type=c["area"],
            sales_channel=c["channel"],
            plan_at_activation=PLANS[c["plan0"]][0],
            plan_current=PLANS[c["plan"]][0],
            device=f"{PLANS[c['plan']][2]} CPE",
            monthly_fee_idr=PLANS[c["plan"]][1],
            pay_type=c["pay"],
            payment_method=c["method"],
            bundle_12m="Y" if c["contract"] else "N",
            home_5g_coverage_from=str(MONTHS[c["cover_from"]]) if 0 <= c["cover_from"] < T else ("before 2025" if c["cover_from"] < 0 else ""),
            status=c["status"],
            churn_date=day_in(c["churn_t"]).date() if c["churn_t"] is not None else "",
            churn_type=c["churn_type"] or "",
            churn_reason=c["churn_reason"] or "",
        )
        for c in customers
    ]
)
req_df = pd.DataFrame(request_rows, columns=["request_id", "customer_id", "created_date", "type", "channel", "resolved_date", "resolution_days", "sla_days", "within_sla", "outcome"])
camp_df = pd.DataFrame([dict(campaign_id=x[0], name=x[1], objective=x[2], channel=x[3], first_wave=str(MONTHS[x[4]]), target_rule=x[5], offer=x[6], holdout_pct=round(x[7] * 100), cost_per_contact_idr=x[8]) for x in CAMPAIGNS])

# ------------------------------------------------------------------ customer surveys, on their own random stream
srng = np.random.default_rng(20261115)
SIG_CHANNEL = {"Retail outlet": 0.0, "Online": -0.5, "Field sales": 0.3, "Partner agent": -0.45}  # online and agent sales skip the signal check
SIG_AREA = {"Metro": 0.1, "Urban": 0.0, "Suburban": -0.15, "Rural": -0.35}
for c in customers:  # indoor signal at the home: part of why engagement is what it is
    c["sig"] = 0.75 * (c["e0"] - CHANNEL_ENGAGE[c["channel"]]) + 0.45 * srng.normal() + SIG_CHANNEL[c["channel"]] + SIG_AREA[c["area"]]
MI_G = {str(m): i for i, m in enumerate(MONTHS)}
req_by_c = {}
for r in request_rows:
    req_by_c.setdefault(r[1], []).append((MI_G[str(pd.Period(r[2], "M"))], r[3], r[8]))

TEXT = {  # theme -> (as written, English); customers mostly write in Indonesian
    "Slow at busy hours": [
        ("Malam hari lemot banget, streaming putus-putus", "Really slow at night, streaming keeps cutting out"),
        ("Jam 7 sampai 10 malam kecepatan turun drastis", "Speed drops sharply from 7 to 10 pm"),
        ("Pagi kencang, sore sampai malam lambat sekali", "Fast in the morning, very slow from afternoon to night"),
        ("Pas semua orang di rumah pakai, langsung lemot", "As soon as everyone at home is online, it crawls"),
        ("Habis magrib susah buat video call", "Hard to make video calls after sunset"),
        ("Malam minggu paling parah, buka YouTube saja buffering", "Saturday nights are the worst, even YouTube buffers"),
    ],
    "Weak signal indoors": [
        ("Sinyal di dalam rumah lemah, modem harus ditaruh dekat jendela", "Weak signal inside, the router has to sit by the window"),
        ("Di kamar belakang tidak dapat sinyal sama sekali", "No signal at all in the back room"),
        ("Sinyal naik turun, sering putus sendiri", "Signal goes up and down and keeps dropping"),
        ("Waktu beli tidak dicek sinyal di rumah, ternyata jelek", "Nobody checked the signal at my house when I bought it, and it's bad"),
        ("Lampu sinyal di modem cuma satu atau dua bar", "The router only ever shows one or two signal bars"),
        ("Di lantai dua lumayan, di bawah hampir tidak bisa", "Upstairs is OK, downstairs barely works"),
    ],
    "Price": [
        ("Harganya agak mahal untuk kecepatan segini", "A bit expensive for this speed"),
        ("Berat bayar tiap bulan, tolong ada paket lebih murah", "Hard to pay every month, please add a cheaper package"),
        ("Promo cuma di awal, setelah itu mahal", "The promo is only at the start, then it gets expensive"),
        ("Untuk pemakaian saya, harganya kurang sepadan", "For how much I use it, it isn't worth the price"),
        ("Gaji pas-pasan, kadang telat beli paket", "Money is tight, sometimes I buy the package late"),
    ],
    "Slow support / fix": [
        ("Lapor gangguan tapi lama sekali baru ditangani", "Reported a problem but it took ages to be handled"),
        ("CS susah dihubungi, harus telepon berkali-kali", "Hard to reach customer service, had to call many times"),
        ("Teknisi janji datang tapi tidak datang", "The technician promised to come but didn't"),
        ("Tiket gangguan ditutup padahal belum beres", "The fault ticket was closed though it wasn't fixed"),
    ],
    "Router problems": [
        ("Modem sering panas dan restart sendiri", "The router overheats and restarts by itself"),
        ("Modem rusak, penggantiannya lama", "Router broke and the replacement took long"),
        ("Adaptor modem rusak, harus beli sendiri", "The router's adaptor broke and I had to buy one myself"),
    ],
    "Moved house": [
        ("Pindah rumah, layanan tidak bisa dipindah cepat", "Moved house and the service couldn't be moved quickly"),
        ("Pindah alamat, dua minggu tidak bisa internet", "Changed address and had no internet for two weeks"),
    ],
    "Fibre competitor": [
        ("Tetangga pakai fiber, lebih cepat dengan harga mirip", "Neighbours use fibre, faster for a similar price"),
        ("Sudah ada fiber masuk di perumahan, pindah ke sana", "Fibre reached our estate, so we switched"),
    ],
    "Payment hassle": [
        ("Lupa beli paket, tiba-tiba internet mati", "Forgot to buy the package and the internet just stopped"),
        ("Bayar di konter repot, maunya bisa otomatis", "Paying at the counter is a hassle, I'd like it automatic"),
    ],
    "Rarely used": [
        ("Jarang dipakai, lebih sering pakai kuota HP", "Hardly used it, mostly used my phone data"),
        ("Anak sudah kos, di rumah jarang ada yang pakai", "The kids moved out, nobody at home uses it much"),
    ],
    "Works well": [
        ("Lancar, cukup untuk satu keluarga", "Runs smoothly, enough for the whole family"),
        ("Pemasangan cepat, tinggal colok langsung jalan", "Quick setup, plug in and it works"),
        ("Stabil buat kerja dari rumah", "Stable for working from home"),
        ("Anak-anak sekolah online lancar", "The kids' online school runs fine"),
        ("Harga sesuai, jarang ada gangguan", "Fair price, rarely any problems"),
    ],
    "5G is faster": [
        ("Sejak pindah ke 5G jauh lebih cepat", "Much faster since moving to 5G"),
        ("5G kencang, malam juga tetap lancar", "5G is fast, smooth even at night"),
        ("Ganti modem 5G gratis, sekarang streaming 4K aman", "Free swap to a 5G router, 4K streaming is fine now"),
    ],
}
EXIT_THEME = {
    "Slow at busy hours": "Slow at busy hours",
    "Weak signal indoors": "Weak signal indoors",
    "Too expensive for me": "Price",
    "Moved house, couldn't take it along": "Moved house",
    "Router or device problems": "Router problems",
    "Switched to fibre": "Fibre competitor",
    "Didn't use it enough": "Rarely used",
    "Forgot to top up, then gave up": "Payment hassle",
}
LOGGED_HINT = {  # what the call centre logged nudges what the customer says, but doesn't decide it
    "Moved house": {"Moved house, couldn't take it along": 3.0},
    "Device problem": {"Router or device problems": 2.5},
    "Switched to fibre": {"Switched to fibre": 2.0},
    "Price": {"Too expensive for me": 1.5},
    "Speed or coverage": {"Slow at busy hours": 1.0, "Weak signal indoors": 1.0},
    "Low use, not needed": {"Didn't use it enough": 0.6},
}


def recent_requests(c, t):
    return [r for r in req_by_c.get(c["id"], []) if t - 2 <= r[0] <= t and r[1] in ("Relocation", "Device fault")]


def opinion(c, t):
    """Ratings (1-5) and NPS (0-10) the customer would give in month t, from that month's hidden state."""
    h = c["hist"][t]
    recent = recent_requests(c, t)
    fault = any(r[1] == "Device fault" for r in recent)
    halo = 0.25 * h["e"]  # happier customers rate everything a little higher
    speed = 3.55 + halo - (1.5 if h["congested"] else 0) + (0.95 if h["five_g"] else 0) - (0.35 if h["plan"] == "H4G20" else 0) + srng.normal(0, 0.7)
    signal = 3.45 + halo + 0.8 * c["sig"] - (0.9 if fault else 0) + srng.normal(0, 0.7)
    value = 3.3 + halo + 0.45 * c["aff"] - (0.3 if h["fee"] >= 250_000 else 0) - (0.5 if h["fee"] >= 350_000 and c["aff"] < 0 else 0) + (0.5 if h["saved"] else 0) + srng.normal(0, 0.7)
    support = (4.3 - (2.2 if any(r[2] == "N" for r in recent) else 0) + srng.normal(0, 0.6)) if recent else None
    z = 0.95 * (speed - 3) + 0.95 * (signal - 3) + 0.35 * (value - 3) + (0.6 * (support - 3) if support is not None else 0) + 1.0 * h["e"] + srng.normal(0, 0.8)
    nps = int(np.clip(round(6.6 + z), 0, 10))

    def r15(v):
        return int(np.clip(round(v), 1, 5))

    return dict(nps=nps, speed=r15(speed), signal=r15(signal), value=r15(value), support=r15(support) if support is not None else None, fault=fault, raw=dict(speed=speed, signal=signal, value=value, support=support))


def theme_for(c, t, o):
    h = c["hist"][t]
    if o["nps"] >= 9:
        return "5G is faster" if h["five_g"] and srng.random() < 0.6 else "Works well"
    raw = o["raw"]
    score = {
        "Slow at busy hours": 5 - raw["speed"],
        "Weak signal indoors": 5 - raw["signal"],
        "Price": 0.8 * (5 - raw["value"]),
        "Slow support / fix": 1.2 * (5 - raw["support"]) if raw["support"] is not None else -9,
        "Router problems": 2.6 if o["fault"] else -9,
        "Payment hassle": 1.6 if c["method"] == "Retail counter" and h["late3"] > 0 else -9,
    }
    keys = list(score)
    w = np.exp(1.4 * np.array([score[k] for k in keys]))
    return keys[srng.choice(len(keys), p=w / w.sum())]


TAIL_BAD = [("", ""), ("", ""), (" Tolong diperbaiki.", " Please fix it."), (" Sudah lapor tapi belum ada perubahan.", " Reported it already, nothing changed."), (" Kecewa sih.", " Pretty disappointing."), (" Mohon dicek.", " Please look into it."), (" Kalau begini terus mau berhenti.", " If it stays like this I'll quit."), (" Harusnya bisa lebih baik.", " It should be better.")]
TAIL_GOOD = [("", ""), ("", ""), (" Mantap!", " Great!"), (" Terima kasih.", " Thank you."), (" Recommended.", " Recommended."), (" Semoga tetap begini.", " Hope it stays this way.")]


def text_for(theme):
    txt, en = TEXT[theme][srng.integers(len(TEXT[theme]))]
    tails = TAIL_GOOD if theme in ("Works well", "5G is faster") else TAIL_BAD
    t_id, t_en = tails[srng.integers(len(tails))]
    return (txt + "." + t_id, en + "." + t_en) if t_id else (txt, en)


def responds(base, e, nps):
    return srng.random() < sigmoid(np.log(base / (1 - base)) + 0.8 * e + (0.35 if nps <= 4 else 0))


def sent_in(t, lo=1, hi=24):
    p = MONTHS[t]
    return pd.Timestamp(year=p.year, month=p.month, day=int(srng.integers(lo, hi + 1)))


def blank(c, t, kind, sent, channel, ok):
    return dict(customer_id=c["id"], survey_type=kind, survey_month=str(MONTHS[t]), sent_date=sent.date(), channel=channel, responded="Y" if ok else "N", response_date="", nps="", sat_speed_peak="", sat_indoor_signal="", sat_value="", sat_support="", exit_reason="", comment="", comment_en="", theme="")


survey_rows = []


def add_survey(c, t, kind, sent, channel, base, support_only=False):
    o = opinion(c, t)
    ok = responds(base, c["hist"][t]["e"], o["nps"])
    row = blank(c, t, kind, sent, channel, ok)
    if ok:
        row.update(response_date=(sent + pd.Timedelta(days=int(srng.integers(0, 5)))).date(), nps=o["nps"], sat_support=o["support"] if o["support"] is not None else "")
        if not support_only:
            row.update(sat_speed_peak=o["speed"], sat_indoor_signal=o["signal"], sat_value=o["value"])
        if srng.random() < 0.55:
            th = theme_for(c, t, o)
            txt, en = text_for(th)
            row.update(comment=txt, comment_en=en, theme=th)
    survey_rows.append(row)


churn_dates = dict(zip(cust_df.customer_id, cust_df.churn_date))
for c in customers:
    last = c["churn_t"] if c["churn_t"] is not None else T  # surveys only while still a customer
    for m in (1, 3, 6, 9, 12, 15, 18, 21):  # onboarding after the first month, then every quarter
        t = c["act"] + m
        if t < T and t < last:
            add_survey(c, t, "Onboarding" if m == 1 else "Relationship", sent_in(t), "WhatsApp" if srng.random() < 0.7 else "SMS", 0.30 if m == 1 else 0.20)
    for r in req_by_c.get(c["id"], []):  # after a relocation or device fault is closed
        if r[1] in ("Relocation", "Device fault") and r[2] in ("Y", "N") and r[0] < last:
            add_survey(c, r[0], "After service request", sent_in(r[0], 5, 26), "WhatsApp", 0.35, support_only=True)
    if c["churn_t"] is not None:  # exit survey, a few days after leaving
        t = c["churn_t"]
        sent = pd.Timestamp(churn_dates[c["id"]]) + pd.Timedelta(days=int(srng.integers(2, 7)))
        if sent > AS_OF:
            continue
        h = c["hist"][t]
        ok = srng.random() < sigmoid(np.log(0.28 / 0.72) + 0.4 * h["e"])
        row = blank(c, t, "Exit", sent, "Call" if srng.random() < 0.6 else "WhatsApp", ok)
        if ok:
            invol = c["churn_type"] == "Involuntary"
            w = {
                "Slow at busy hours": 2.2 if h["congested"] else (0.1 if h["five_g"] else 0.3),
                "Weak signal indoors": 0.1 + 2.0 * sigmoid(-2.5 * (c["sig"] + 0.4)),
                "Too expensive for me": 0.15 + 1.8 * sigmoid(-2.5 * (c["aff"] + 0.6)) + (0.5 if h["fee"] >= 350_000 else 0) + (0.6 if invol else 0),
                "Moved house, couldn't take it along": 3.0 if h["reloc_bad"] else 0.05,
                "Router or device problems": 2.5 if h["fault_bad"] else 0.08,
                "Switched to fibre": 1.2 if c["area"] == "Metro" and t >= 12 else 0.15,
                "Didn't use it enough": 0.6 if h["ratio"] < 0.5 else 0.1,
                "Forgot to top up, then gave up": 0.5 if invol and c["pay"] == "Monthly package" else 0.0,
            }
            for k, v in LOGGED_HINT.get(c["churn_reason"], {}).items():
                w[k] += v
            keys = list(w)
            ww = np.array([w[k] for k in keys])
            reason = keys[srng.choice(len(keys), p=ww / ww.sum())]
            o = opinion(c, t)
            row.update(response_date=(sent + pd.Timedelta(days=int(srng.integers(0, 3)))).date(), nps=min(o["nps"], 6) if srng.random() < 0.8 else o["nps"], exit_reason=reason)
            if srng.random() < 0.7:
                txt, en = text_for(EXIT_THEME[reason])
                row.update(comment=txt, comment_en=en, theme=EXIT_THEME[reason])
        survey_rows.append(row)
survey_df = pd.DataFrame(survey_rows).sort_values(["sent_date", "customer_id"], kind="stable").reset_index(drop=True)
survey_df.insert(0, "survey_id", [f"SV-{i + 1:06d}" for i in range(len(survey_df))])


RAW.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)
tables = {"customers": cust_df, "usage_monthly": usage_df, "billing": billing_df, "service_requests": req_df, "campaigns": camp_df, "campaign_contacts": contacts_df, "surveys": survey_df}
for name, df in tables.items():
    df.to_csv(RAW / f"{name}.csv", index=False)
    shutil.copyfile(RAW / f"{name}.csv", PUBLIC / f"{name}.csv")
    print(f"{name:18s} {len(df):7,d} rows  {(RAW / f'{name}.csv').stat().st_size / 1024:8.0f} KB")
print("churned:", (cust_df.status == "Churned").sum(), "of", len(cust_df), "| active at end:", (cust_df.status == "Active").sum())
