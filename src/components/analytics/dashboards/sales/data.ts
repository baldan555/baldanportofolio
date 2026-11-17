/** The sales dashboard's data (real UCI Online Retail, aggregated by ml/retail_dashboard.py) and the maths of a selection. */
import S from "@/data/sales-dashboard.json";
import { monthOf } from "@/lib/months";

export { S };
export type Scope = (typeof S.scopes)[number];
export type Period = number | "year";
export type Sel = { scope: string; period: Period };

export const MONTHS = S.months;
export const PARTIAL = MONTHS.indexOf(S.partial);
export const FULL_IDX = MONTHS.map((_, i) => i).filter((i) => i !== PARTIAL);
export const DEFAULT: Sel = { scope: "All", period: PARTIAL - 1 };

export const monthName = (m: string, style: "short" | "long" = "short") => monthOf(m, style);
export const monthYear = (m: string, style: "short" | "long" = "long") => `${monthName(m, style)} ${m.slice(0, 4)}`;
export const scopeName = (s: string) => (s === "All" ? "All countries" : s === "EIRE" ? "Ireland" : s);
export const gbp = (v: number) =>
  Math.abs(v) >= 1e6 ? `£${(v / 1e6).toFixed(2)}m` : Math.abs(v) >= 1e4 ? `£${(v / 1e3).toFixed(0)}k` : Math.abs(v) >= 1e3 ? `£${(v / 1e3).toFixed(1)}k` : `£${Math.round(v)}`;
export const num = (v: number) => Math.round(v).toLocaleString("en-US");
export const pct = (v: number | null, d = 0) => (v === null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(d)}%`);
export const ch = (a: number, b: number | null | undefined) => (b ? a / b - 1 : null);
export const periodLabel = (p: Period) => (p === "year" ? `12 months to ${monthYear(MONTHS[PARTIAL - 1], "short")}` : `${monthYear(MONTHS[p])}${p === PARTIAL ? " (to 9 Dec)" : ""}`);

type M = (typeof S.metrics)["All"];
export const metricsOf = (scope: string) => (S.metrics as Record<string, M>)[scope];

/** Values for the KPI row: current and previous (null when there is nothing to compare with). */
export function kpis({ scope, period }: Sel) {
  const m = metricsOf(scope);
  const y = (S.metrics_year as Record<string, (typeof S.metrics_year)["All"]>)[scope];
  const at = (k: keyof M, i: number) => m[k][i];
  const cur =
    period === "year"
      ? y
      : {
          revenue: at("revenue", period),
          gross: at("gross", period),
          orders: at("orders", period),
          customers: at("customers", period),
          new: at("new", period),
          items: at("items", period),
          cancelled: at("cancelled", period),
        };
  const prev =
    period === "year" || period === 0
      ? null
      : { revenue: at("revenue", period - 1), orders: at("orders", period - 1), customers: at("customers", period - 1), new: at("new", period - 1), cancelled: at("cancelled", period - 1) };
  const rate = (c: number, o: number) => c / (o + c);
  const series = (k: keyof M) => FULL_IDX.map((i) => m[k][i]);
  return {
    cur,
    prev,
    cards: [
      {
        key: "revenue",
        label: "Net revenue",
        value: gbp(cur.revenue),
        change: prev ? ch(cur.revenue, prev.revenue) : null,
        good: 1,
        series: series("revenue"),
        help: "Sales minus cancelled product lines",
      },
      { key: "orders", label: "Orders", value: num(cur.orders), change: prev ? ch(cur.orders, prev.orders) : null, good: 1, series: series("orders"), help: "Distinct invoices" },
      {
        key: "aov",
        label: "Average order",
        value: gbp(cur.revenue / cur.orders),
        change: prev ? ch(cur.revenue / cur.orders, prev.revenue / prev.orders) : null,
        good: 1,
        series: FULL_IDX.map((i) => m.revenue[i] / (m.orders[i] || 1)),
        help: "Net revenue ÷ orders",
      },
      {
        key: "customers",
        label: "Customers",
        value: num(cur.customers),
        change: prev ? ch(cur.customers, prev.customers) : null,
        good: 1,
        series: series("customers"),
        help: "Distinct known customers (IDs counted, never shown)",
      },
      {
        key: "new",
        label: "New customers",
        value: period === "year" || period === 0 ? "—" : num(cur.new),
        change: prev && period !== 1 ? ch(cur.new, prev.new) : null,
        good: 1,
        series: series("new").slice(1),
        help: period === "year" || period === 0 ? "The data starts in Dec 2010, so everyone is new in the first month" : "First purchase in this month",
      },
      {
        key: "cancel",
        label: "Cancellation rate",
        value: `${(rate(cur.cancelled, cur.orders) * 100).toFixed(1)}%`,
        change: prev ? rate(cur.cancelled, cur.orders) - rate(prev.cancelled, prev.orders) : null,
        good: -1,
        series: FULL_IDX.map((i) => rate(m.cancelled[i], m.orders[i])),
        help: "Cancelled invoices ÷ all invoices",
        points: true,
      },
    ],
  };
}

export const productName = (i: number) => S.products.names[i];
export function productsOf({ scope, period }: Sel) {
  const list = period === "year" ? S.products.year[scope as keyof typeof S.products.year] : S.products.month[scope as keyof typeof S.products.month][period];
  return list.map(([i, v]) => ({ name: productName(i), revenue: v }));
}
export function mapValues(period: Period) {
  return Object.entries(S.map).map(([iso, c]) => ({ iso, name: c.name, scope: c.scope, revenue: period === "year" ? FULL_IDX.reduce((s, i) => s + c.revenue[i], 0) : c.revenue[period] }));
}
export const SCOPES = S.scopes;
