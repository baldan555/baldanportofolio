/** Experiment statistics for the A/B dashboard, computed in the browser from cell sums (real Hillstrom data). */
import A from "@/data/ab-dashboard.json";

export { A };
export type Arm = "control" | "mens" | "womens";
export type Metric = "visit" | "conv" | "spend";
export type Cell = { n: number; visits: number; conv: number; spend: number; spend2: number };

export const METRICS: { id: Metric; label: string; short: string; unit: "rate" | "money" }[] = [
  { id: "spend", label: "Spend per customer", short: "Spend", unit: "money" },
  { id: "conv", label: "Conversion rate", short: "Purchases", unit: "rate" },
  { id: "visit", label: "Visit rate", short: "Visits", unit: "rate" },
];
export const ARM_COLOR: Record<Arm, string> = { control: "#8a8a8a", mens: "#2a78d6", womens: "#d6497b" };
export const ALPHA = 0.05;
export const TESTS = 6; // 2 e-mails × 3 metrics
export const ALPHA_ADJ = ALPHA / TESTS;
export const Z = 1.959964;

/** Standard normal CDF (Abramowitz & Stegun 7.1.26), plain arithmetic. */
export function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export const value = (c: Cell, m: Metric) => (m === "visit" ? c.visits / c.n : m === "conv" ? c.conv / c.n : c.spend / c.n);
export function sd(c: Cell, m: Metric) {
  if (m === "spend") return Math.sqrt(Math.max(0, (c.spend2 - (c.spend * c.spend) / c.n) / (c.n - 1)));
  const p = value(c, m);
  return Math.sqrt(p * (1 - p));
}
export const se = (c: Cell, m: Metric) => sd(c, m) / Math.sqrt(c.n);

/** Treatment minus control: absolute and relative difference, 95% interval, z and two-sided p (normal / Welch approximation). */
export function compare(t: Cell, c: Cell, m: Metric) {
  const vt = value(t, m);
  const vc = value(c, m);
  const diff = vt - vc;
  const s = Math.sqrt(se(t, m) ** 2 + se(c, m) ** 2);
  const z = s ? diff / s : 0;
  const p = 2 * (1 - phi(Math.abs(z)));
  return {
    vt,
    vc,
    diff,
    lo: diff - Z * s,
    hi: diff + Z * s,
    rel: vc ? diff / vc : NaN,
    relLo: vc ? (diff - Z * s) / vc : NaN,
    relHi: vc ? (diff + Z * s) / vc : NaN,
    z,
    p,
    sig: p < ALPHA,
    sigAdj: p < ALPHA_ADJ,
  };
}
/** Smallest true difference this test could reliably detect (two-sided 5%, 80% power), per arm size n. */
export const mde = (c: Cell, m: Metric, n = c.n) => (Z + 0.841621) * Math.sqrt(2) * (sd(c, m) / Math.sqrt(n));
/** Customers needed per arm to detect a relative lift `rel` on this metric. */
export const neededN = (c: Cell, m: Metric, rel: number) => Math.ceil((((Z + 0.841621) * Math.sqrt(2) * sd(c, m)) / (rel * value(c, m))) ** 2);

export const fmtValue = (v: number, m: Metric, d?: number) => (m === "spend" ? `$${v.toFixed(d ?? 2)}` : `${(v * 100).toFixed(d ?? 2)}%`);
export const fmtDiff = (v: number, m: Metric, d?: number) => `${v >= 0 ? "+" : "−"}${m === "spend" ? `$${Math.abs(v).toFixed(d ?? 2)}` : `${Math.abs(v * 100).toFixed(d ?? 2)} pts`}`;
export const fmtRel = (v: number, d = 0) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(d)}%`;
export const fmtP = (p: number) => (p < 0.0001 ? "p < 0.0001" : `p = ${p.toFixed(p < 0.01 ? 4 : 3)}`);
export const num = (v: number) => Math.round(v).toLocaleString("en-US");

export const ALL = A.dims.all.levels[0].arms as Record<Arm, Cell>;
