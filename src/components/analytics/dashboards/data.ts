/** Numbers for the Dashboards pages, all derived from the real Online Retail aggregates (ml/retail_dashboard.py). */
import d from "@/data/retail-dashboard.json";
import { monthOf, monthYearOf } from "@/lib/months";

export const R = d;
export const FULL = d.monthly.filter((m) => !m.partial);
export const LAST = FULL[FULL.length - 1];
export const PREV = FULL[FULL.length - 2];
export const MONTH = (m: string, style: "short" | "long" = "short") => monthOf(m, style);
export const MONTH_YEAR = (m: string) => monthYearOf(m);
export const gbp = (v: number) => (Math.abs(v) >= 1e6 ? `£${(v / 1e6).toFixed(2)}m` : Math.abs(v) >= 1e3 ? `£${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}k` : `£${Math.round(v)}`);
export const num = (v: number) => v.toLocaleString("en-US");
export const delta = (a: number, b: number) => a / b - 1;
export const pct = (v: number, d = 0) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(d)}%`;
export const days = Math.round((Date.parse(d.period.last) - Date.parse(d.period.first)) / 86400000) + 1;
export const ukShare = d.countries[0].revenue / d.totals.revenue;
