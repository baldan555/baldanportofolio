/* The FWA base-health case: everything the page shows comes from ml/fwa_analyse.py (aggregates, model) or is recomputed
 * here from one compact row per customer (cohorts, survival, segments), so filters stay live. The data is synthetic
 * (ml/fwa_generate.py): a fictional FWA service, made-up customers. */

import CUST from "@/data/fwa-customers.json";
import D from "@/data/fwa-dashboard.json";

export const DASH = D;
export const MONTHS = D.months;
export const T = MONTHS.length;
export const DIMS = D.dims;

export type Cust = {
  act: number; // activation month index
  churn: number; // month index they left, -1 if still active
  plan: number; // current (or last) plan
  plan0: number;
  channel: number;
  region: number;
  area: number;
  pay: number;
  method: number;
  bundle: number;
  cover: number; // month index 5G arrived at home (-1 before 2025, 99 never)
  reason: number;
  fee: number; // thousand IDR
  firstUse: number; // first-month usage, % of plan's typical
  lastUse: number; // last-month usage, % of plan's typical
  late3: number; // late payments in the last 3 months
  risk: number; // model probability x1000, -1 if gone
  seg: number; // segment, -1 if gone
};

const COLS = CUST.cols as (keyof Cust)[];
export const CUSTS: Cust[] = (CUST.rows as number[][]).map((r) => Object.fromEntries(COLS.map((k, j) => [k, r[j]])) as Cust);
export const ACTIVE = CUSTS.filter((c) => c.churn === -1);
export const tenureOf = (c: Cust) => (c.churn === -1 ? T - 1 : c.churn) - c.act;

/* ---------------------------------------------------------------- formatting */
export const num = (v: number) => Math.round(v).toLocaleString("en-US");
export const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;
export const rp = (v: number) =>
  Math.abs(v) >= 1e9 ? `Rp ${(v / 1e9).toFixed(2)}bn` : Math.abs(v) >= 1e6 ? `Rp ${(v / 1e6).toFixed(1)}m` : Math.abs(v) >= 1e3 ? `Rp ${Math.round(v / 1e3)}k` : `Rp ${Math.round(v)}`;
export const signed = (v: number, d = 1) => `${v > 0 ? "+" : ""}${v.toFixed(d)}`;

/* ---------------------------------------------------------------- filters */
export type Filt = { plan: number; channel: number; pay: number; area: number; region: number };
export const NO_FILTER: Filt = { plan: -1, channel: -1, pay: -1, area: -1, region: -1 };
/** Plan filter uses the plan at activation, so a cohort keeps its members when some later upgrade to 5G. */
export const matches = (c: Cust, f: Filt) =>
  (f.plan < 0 || c.plan0 === f.plan) && (f.channel < 0 || c.channel === f.channel) && (f.pay < 0 || c.pay === f.pay) && (f.area < 0 || c.area === f.area) && (f.region < 0 || c.region === f.region);

/* ---------------------------------------------------------------- cohorts and survival */
/** Share of each activation month still active k months later (k = 0 is the end of the first month). */
export function cohorts(rows: Cust[]) {
  return MONTHS.map((m, a) => {
    const members = rows.filter((c) => c.act === a);
    const n = members.length;
    const r = Array.from({ length: T - a }, (_, k) => (n ? (members.filter((c) => c.churn === -1 || c.churn > a + k).length / n) * 100 : NaN));
    return { m, n, r };
  });
}

/** Kaplan–Meier: share still a customer after each month of service, using everyone's tenure (active ones are censored). */
export function km(rows: Cust[]) {
  const out: number[] = [];
  let s = 1;
  for (let k = 0; k < T; k++) {
    let atRisk = 0;
    let left = 0;
    for (const c of rows) {
      const ten = tenureOf(c);
      if (ten >= k) {
        atRisk++;
        if (c.churn !== -1 && ten === k) left++;
      }
    }
    if (atRisk < 20) break; // too few left to say anything
    s *= 1 - left / atRisk;
    out.push(s * 100);
  }
  return out;
}

/* ---------------------------------------------------------------- the churn model, exported from scikit-learn */
export const MODEL = D.model;
export type FeatureKey = (typeof MODEL.features)[number]["key"];
export function score(x: Partial<Record<string, number>>) {
  let z = MODEL.intercept;
  const parts: { key: string; label: string; v: number }[] = [];
  for (const f of MODEL.features) {
    const v = ((x[f.key] ?? f.mean) - f.mean) / f.sd;
    z += v * f.coef;
    // say which way it pushes: a yes/no that is "no", or a number that is low
    const label = f.bin ? (x[f.key] === 0 ? `${f.label}: no` : f.label) : v * f.coef > 0 && f.coef < 0 ? `${f.label} (low)` : f.label;
    parts.push({ key: f.key, label, v: v * f.coef });
  }
  return { p: 1 / (1 + Math.exp(-z)), parts };
}
