"use client";

import { useState } from "react";
import { S, gbp, num } from "./data";

const TABS = ["Data model", "Metrics", "Pipeline", "Data notes"] as const;
type Tab = (typeof TABS)[number];
const n = S.notes;

const METRICS: [string, string][] = [
  [
    "Net revenue",
    "SUM(quantity * unit_price)          -- sales lines\n+ SUM(quantity * unit_price)        -- cancelled lines (negative),\n  FILTER (WHERE is_cancellation)    -- counted in the month cancelled",
  ],
  ["Orders", "COUNT(DISTINCT invoice_no)\n  FILTER (WHERE NOT is_cancellation)"],
  ["Average order", "net_revenue / orders"],
  ["Customers", "COUNT(DISTINCT customer_key)       -- lines without a customer\n                                    -- count for revenue, not here"],
  ["New customers", "COUNT(*) FROM dim_customer\n  WHERE first_order_month = :month"],
  ["Cancellation rate", "cancelled_invoices\n  / (orders + cancelled_invoices)"],
];
const PIPE: [string, string][] = [
  ["Raw export", `${num(n.raw_rows)} lines, kept untouched (online_retail.xlsx)`],
  ["Clean", `duplicates, cancellations, zero prices, missing descriptions and fee codes removed: ${num(n.rows)} sales lines`],
  ["Net", `cancelled product lines subtracted: ${gbp(n.gross)} gross → ${gbp(n.net)} net`],
  ["Aggregate", "Python (ml/retail_dashboard.py) builds every number by country and month"],
  ["Serve", "a small JSON file the page reads; every tile and the memo use the same file"],
];

function Model() {
  const box = (name: string, rows: string, cols: string[], dark = false) => (
    <div className={`rounded-xl border p-2.5 ${dark ? "border-ink bg-ink text-white" : "border-[#2a78d6]/40 bg-white"}`}>
      <p className={`font-mono text-[12px] font-bold ${dark ? "" : "text-[#1f5fae]"}`}>{name}</p>
      <p className={`text-[10.5px] ${dark ? "text-white/60" : "text-ink-2/55"}`}>{rows}</p>
      <ul className={`mt-1.5 space-y-0.5 font-mono text-[10.5px] ${dark ? "text-white/80" : "text-ink-2/75"}`}>
        {cols.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="grid items-center gap-3 md:grid-cols-[1fr_1.2fr_1fr]">
      <div className="space-y-3">
        {box("dim_date", "one row per day", ["date_key", "month", "weekday", "hour"])}
        {box("dim_country", "38 countries", ["country_key", "name", "iso3"])}
      </div>
      {box(
        "fct_sales",
        `${num(n.rows)} sales lines + cancellations`,
        ["date_key", "product_key", "country_key", "customer_key (nullable)", "invoice_no", "quantity", "unit_price", "is_cancellation"],
        true,
      )}
      <div className="space-y-3">
        {box("dim_product", "one row per stock code", ["product_key", "stock_code", "description (most common)"])}
        {box("dim_customer", "IDs only counted, never shown", ["customer_key", "first_order_month", "rfm_segment"])}
      </div>
    </div>
  );
}

export function Behind() {
  const [tab, setTab] = useState<Tab>("Data model");
  return (
    <section className="rounded-[24px] border border-line bg-cream/60 p-4 sm:p-6 lg:col-span-12">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-2 text-[18px] font-semibold tracking-[-0.02em]">Behind the dashboard</h3>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${tab === t ? "border-ink bg-ink text-white" : "border-ink/10 bg-white hover:border-ink/30"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === "Data model" && <Model />}
        {tab === "Metrics" && (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {METRICS.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white p-3">
                <p className="text-[13px] font-semibold">{k}</p>
                <pre className="mt-1.5 overflow-x-auto rounded-lg bg-ink p-2.5 font-mono text-[10.5px] leading-relaxed text-white/85">{v}</pre>
              </div>
            ))}
          </div>
        )}
        {tab === "Pipeline" && (
          <ol className="grid gap-2 md:grid-cols-5">
            {PIPE.map(([k, v], i) => (
              <li key={k} className="relative rounded-xl bg-white p-3">
                <span className="font-mono text-[10.5px] text-muted">0{i + 1}</span>
                <p className="text-[13.5px] font-semibold">{k}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2/70">{v}</p>
              </li>
            ))}
          </ol>
        )}
        {tab === "Data notes" && (
          <ul className="grid gap-2 text-[12.5px] leading-snug md:grid-cols-2">
            {[
              "Source: “Online Retail”, UCI Machine Learning Repository (Daqing Chen, 2015), CC BY 4.0. A UK online gift retailer, 1 Dec 2010 to 9 Dec 2011, amounts in pounds.",
              `Net revenue: ${gbp(n.cancelled_value)} of cancelled product lines are subtracted in the month they were cancelled. Without it, one 80,995-unit order cancelled the same day would rank as a top product.`,
              `${num(n.no_customer_lines)} sales lines have no customer ID: they count for revenue and orders, not for customers, cohorts or segments.`,
              "December 2011 holds only nine days, so it's shown but never compared or ranked.",
              "The shop took no orders on Saturdays: the empty row in the timing heatmap is real, not missing data.",
              "Customer IDs are only counted. No customer is identifiable anywhere on this page.",
              "Map shapes: Natural Earth 1:110m (public domain). Very small places (Singapore, Hong Kong, Malta, Bahrain, Channel Islands) have no shape at this scale.",
              "Cohorts and segments cover all countries; they fade when a country filter is on so nobody reads them as filtered.",
            ].map((t) => (
              <li key={t} className="rounded-xl bg-white p-3">
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
