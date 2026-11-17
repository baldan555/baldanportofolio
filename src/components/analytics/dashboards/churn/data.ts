/** Telco churn: de-identified rows decoded in the browser, filters, aggregates, survival curves and the logistic model. */
import C from "@/data/churn-dashboard.json";

export { C };
export type Key = keyof typeof C.cols;
export type Row = { tenure: number; monthly: number; churn: number } & Record<Key, number>;
const KEYS = Object.keys(C.cols) as Key[];

export const ROWS: Row[] = Array.from({ length: C.n }, (_, i) => {
  const r = { tenure: C.tenure[i], monthly: C.monthly[i] / 100, churn: C.churn.charCodeAt(i) - 48 } as Row;
  for (const k of KEYS) r[k] = C.cols[k].charCodeAt(i) - 48;
  return r;
});

export const BANDS = [
  { label: "0–12 months", lo: 0, hi: 12 },
  { label: "13–24 months", lo: 13, hi: 24 },
  { label: "25–48 months", lo: 25, hi: 48 },
  { label: "49–72 months", lo: 49, hi: 72 },
];
export const bandOf = (t: number) => BANDS.findIndex((b) => t >= b.lo && t <= b.hi);
export const label = (k: Key, v: number) => C.labels[k][v].replace(" (automatic)", "").replace(" service", "");

export type Filters = { contract: number; internet: number; band: number; payment: number }; // -1 = all
export const NONE: Filters = { contract: -1, internet: -1, band: -1, payment: -1 };
export const apply = (f: Filters) =>
  ROWS.filter(
    (r) => (f.contract < 0 || r.contract === f.contract) && (f.internet < 0 || r.internet === f.internet) && (f.payment < 0 || r.payment === f.payment) && (f.band < 0 || bandOf(r.tenure) === f.band),
  );

const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
export function kpis(rows: Row[]) {
  const lost = rows.filter((r) => r.churn);
  const kept = rows.filter((r) => !r.churn);
  const revenue = rows.reduce((s, r) => s + r.monthly, 0);
  const revLost = lost.reduce((s, r) => s + r.monthly, 0);
  return {
    n: rows.length,
    churned: lost.length,
    rate: rows.length ? lost.length / rows.length : NaN,
    revenue,
    revLost,
    tenureLost: avg(lost.map((r) => r.tenure)),
    tenureKept: avg(kept.map((r) => r.tenure)),
    billLost: avg(lost.map((r) => r.monthly)),
    billKept: avg(kept.map((r) => r.monthly)),
  };
}

/** Kaplan–Meier: share still a customer after t months (churn = event at its tenure, stayers censored). */
export function km(rows: Row[]) {
  const out = [1];
  let s = 1;
  for (let t = 1; t <= 72; t++) {
    const atRisk = rows.filter((r) => r.tenure >= t).length;
    const events = rows.filter((r) => r.churn && r.tenure === t).length;
    if (atRisk > 0) s *= 1 - events / atRisk;
    out.push(s);
  }
  return out;
}

/** Churn rate for every value of every feature, and how far apart the values are. */
export function drivers(rows: Row[]) {
  return KEYS.map((k) => {
    const values = C.labels[k].map((_, v) => {
      const g = rows.filter((r) => r[k] === v);
      return { v, label: label(k, v), n: g.length, rate: g.length ? g.filter((r) => r.churn).length / g.length : NaN };
    });
    const ok = values.filter((x) => x.n >= 30);
    const spread = ok.length > 1 ? Math.max(...ok.map((x) => x.rate)) - Math.min(...ok.map((x) => x.rate)) : 0;
    return { k, name: C.names[k].replace(/([a-z])([A-Z])/g, "$1 $2"), values, spread };
  }).sort((a, b) => b.spread - a.spread);
}

/** Highest-churn combinations of contract, internet, payment and tenure band (groups of 40+ customers). */
export function segments(rows: Row[], min = 40) {
  const g = new Map<string, Row[]>();
  for (const r of rows) {
    const key = `${r.contract}|${r.internet}|${r.payment}|${bandOf(r.tenure)}`;
    const list = g.get(key);
    if (list) list.push(r);
    else g.set(key, [r]);
  }
  return [...g.entries()]
    .filter(([, v]) => v.length >= min)
    .map(([key, v]) => {
      const [c, i, p, b] = key.split("|").map(Number);
      const lost = v.filter((r) => r.churn);
      return { c, i, p, b, n: v.length, rate: lost.length / v.length, revLost: lost.reduce((s, r) => s + r.monthly, 0) };
    })
    .sort((a, b) => b.rate - a.rate);
}

/* ---------------------------------------------------------------- the Telco project's logistic regression */
export type Profile = { tenure: number; monthly: number; contract: number; internet: number; payment: number; support: number; security: number; paperless: number };
const M = C.model;
const CAT = M.categorical as Record<string, Record<string, number>>;
/** Probability of churn. SeniorCitizen (an age field) is held at "No" and never shown. */
export function predict(p: Profile) {
  const num = M.numeric as Record<string, { mean: number; scale: number; coef: number }>;
  const internetNone = p.internet === 2;
  const svc = (v: number) => (internetNone ? "No internet service" : v ? "Yes" : "No");
  const z =
    M.intercept +
    ((p.tenure - num.tenure.mean) / num.tenure.scale) * num.tenure.coef +
    ((p.monthly - num.MonthlyCharges.mean) / num.MonthlyCharges.scale) * num.MonthlyCharges.coef +
    CAT.Contract[C.labels.contract[p.contract]] +
    CAT.InternetService[C.labels.internet[p.internet]] +
    CAT.PaymentMethod[C.labels.payment[p.payment]] +
    CAT.TechSupport[svc(p.support)] +
    CAT.OnlineSecurity[svc(p.security)] +
    CAT.PaperlessBilling[C.labels.paperless[p.paperless]] +
    CAT.SeniorCitizen.No;
  return 1 / (1 + Math.exp(-z));
}

export const pct = (v: number, d = 0) => (Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : "—");
export const usd = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`);
export const num = (v: number) => Math.round(v).toLocaleString("en-US");
