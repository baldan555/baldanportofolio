"use client";

import { motion } from "framer-motion";
import { InsideSection, Scrolly, type Step } from "../explainers/scrolly";

const UP = "#eb6834";
const BLUE = "#2a78d6";
const INK = "#0b0b0b";
const tr = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };
const n = (v: number) => v.toLocaleString("en-US");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mon = (label: string) => `${MONTHS[Number(label.slice(5, 7)) - 1]} ${label.slice(2, 4)}`;

export type RetailFacts = {
  name: string;
  license: string;
  rawRows: number;
  rows: number;
  cancelledRows: number;
  invoices: number;
  products: number;
  countries: number;
  ukShare: number;
  monthly: { label: string; value: number }[];
  period: [string, string];
};

function Panel({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 10 }}
      transition={tr}
      className={`absolute inset-0 flex flex-col justify-center overflow-hidden px-5 pb-10 sm:px-8 ${on ? "" : "pointer-events-none"}`}
    >
      {children}
    </motion.div>
  );
}
const Label = ({ children }: { children: React.ReactNode }) => <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{children}</p>;

const COLUMNS = ["InvoiceNo", "StockCode", "Description", "Quantity", "InvoiceDate", "UnitPrice", "CustomerID", "Country"];

function Visual({ step, f }: { step: number; f: RetailFacts }) {
  // the last month in the data is only partly covered (it ends on the 9th), so it's left out of comparisons
  const full = f.monthly.slice(0, -1);
  const max = Math.max(...f.monthly.map((m) => m.value));
  const peak = full.reduce((a, b) => (b.value > a.value ? b : a));
  const low = full.reduce((a, b) => (b.value < a.value ? b : a));
  const removed = f.rawRows - f.rows;
  return (
    <div className="relative min-h-0 flex-1">
      <Panel on={step === 0}>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">From the buying team of an online gift shop</p>
          <p className="mt-3 text-[24px] leading-snug font-semibold tracking-[-0.02em]">“When do orders peak, and when should we start stocking up?”</p>
        </div>
        <p className="mt-4 text-[12.5px] text-ink-2/60">Good analysis starts from a decision someone has to make, not from the data.</p>
      </Panel>

      <Panel on={step === 1}>
        <Label>
          The raw file · {n(f.rawRows)} rows × {COLUMNS.length} columns
        </Label>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {COLUMNS.map((c) => (
            <span key={c} className="truncate rounded-lg bg-white px-2 py-2 text-center font-mono text-[10.5px]">
              {c}
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 text-[13px]">
          {[
            `${n(f.cancelledRows)} rows are cancellations (invoice number starts with “C”)`,
            "Returns appear as negative quantities",
            "Postage, fees and manual adjustments sit next to real products",
            "Some rows have no description",
          ].map((t) => (
            <p key={t} className="flex gap-2">
              <span className="text-[#e34948]">●</span> {t}
            </p>
          ))}
        </div>
      </Panel>

      <Panel on={step === 2}>
        <Label>Cleaning: keep what counts as a real sale</Label>
        {[
          { label: "Raw rows", v: f.rawRows, c: "rgba(11,11,11,0.25)" },
          { label: "Clean sales rows", v: f.rows, c: INK },
        ].map((r) => (
          <div key={r.label} className="mb-3">
            <div className="flex justify-between text-[13px]">
              <span>{r.label}</span>
              <span className="font-mono">{n(r.v)}</span>
            </div>
            <div className="mt-1 h-4 rounded-full bg-ink/[0.06]">
              <motion.div
                className="h-full rounded-full"
                initial={false}
                animate={{ width: step === 2 ? `${Math.round((r.v / f.rawRows) * 1000) / 10}%` : "0%" }}
                transition={tr}
                style={{ background: r.c }}
              />
            </div>
          </div>
        ))}
        <p className="mt-2 text-[12.5px] text-ink-2/60">
          {n(removed)} rows removed: cancellations, zero or negative quantities and prices, missing descriptions and non-product codes. Each rule is written down, so the numbers can be reproduced.
        </p>
      </Panel>

      <Panel on={step === 3}>
        <Label>Model: one fact table, a few dimensions (a star schema)</Label>
        <svg viewBox="0 0 520 260" className="w-full max-w-[520px] self-center">
          {[
            { x: 20, y: 20, t: "dim_date", d: "day · month · weekday" },
            { x: 340, y: 20, t: "dim_product", d: `${n(f.products)} products` },
            { x: 20, y: 180, t: "dim_country", d: `${f.countries} countries` },
            { x: 340, y: 180, t: "dim_invoice", d: `${n(f.invoices)} orders` },
          ].map((b) => (
            <g key={b.t}>
              <line x1={b.x + 80} y1={b.y + 30} x2={260} y2={130} stroke="rgba(11,11,11,0.25)" strokeWidth={2} />
              <rect x={b.x} y={b.y} width={160} height={60} rx={12} fill="#fff" stroke="rgba(11,11,11,0.15)" />
              <text x={b.x + 14} y={b.y + 26} fontSize={13} fontFamily="ui-monospace, monospace" fill={BLUE} fontWeight={700}>
                {b.t}
              </text>
              <text x={b.x + 14} y={b.y + 45} fontSize={11} fill="rgba(11,11,11,0.55)">
                {b.d}
              </text>
            </g>
          ))}
          <rect x={185} y={100} width={150} height={60} rx={12} fill={INK} />
          <text x={260} y={126} fontSize={13} fontFamily="ui-monospace, monospace" fill="#fff" fontWeight={700} textAnchor="middle">
            fact_sales
          </text>
          <text x={260} y={145} fontSize={11} fill="rgba(255,255,255,0.65)" textAnchor="middle">
            one row per item sold
          </text>
        </svg>
      </Panel>

      <Panel on={step === 4}>
        <Label>Query</Label>
        <pre className="overflow-hidden rounded-2xl bg-ink p-4 font-mono text-[12.5px] leading-relaxed text-white/90">
          <span className="text-[#7cc4ff]">SELECT</span> date_trunc(<span className="text-[#ffb37c]">&apos;month&apos;</span>, d.day) <span className="text-[#7cc4ff]">AS</span> month,
          {"\n       "}
          <span className="text-[#7cc4ff]">COUNT</span>(<span className="text-[#7cc4ff]">DISTINCT</span> s.invoice_no) <span className="text-[#7cc4ff]">AS</span> orders
          {"\n"}
          <span className="text-[#7cc4ff]">FROM</span> fact_sales s <span className="text-[#7cc4ff]">JOIN</span> dim_date d <span className="text-[#7cc4ff]">USING</span> (date_key)
          {"\n"}
          <span className="text-[#7cc4ff]">GROUP BY</span> month <span className="text-[#7cc4ff]">ORDER BY</span> month;
        </pre>
        <div className="mt-3 grid grid-cols-3 gap-1.5 font-mono text-[11.5px]">
          {f.monthly.slice(0, 3).map((m) => (
            <span key={m.label} className="rounded-lg bg-white px-2 py-1.5">
              {m.label} · {n(m.value)}
            </span>
          ))}
        </div>
      </Panel>

      <Panel on={step === 5 || step === 6}>
        <Label>
          Orders per month · {f.period[0]} to {f.period[1]}
        </Label>
        <div className="flex h-[55%] items-end gap-1.5">
          {f.monthly.map((m, i) => {
            const partial = i === f.monthly.length - 1;
            const hi = step === 6 && (m.label === peak.label || m.label === low.label);
            return (
              <div key={m.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                {step === 6 && hi && <span className="font-mono text-[10px]">{n(m.value)}</span>}
                <motion.div
                  className="w-full rounded-t-md"
                  initial={false}
                  animate={{ height: `${Math.round((m.value / max) * 1000) / 10}%` }}
                  transition={{ ...tr, delay: step === 5 ? i * 0.04 : 0 }}
                  style={{
                    background: partial ? "repeating-linear-gradient(45deg, rgba(11,11,11,0.15) 0 4px, transparent 4px 8px)" : m.label === peak.label && step === 6 ? UP : "rgba(11,11,11,0.7)",
                  }}
                />
                <span className="font-mono text-[9px] text-muted">{mon(m.label)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-ink-2/60">
          {step === 6
            ? `${mon(peak.label)} had ${(peak.value / low.value).toFixed(1)}× the orders of ${mon(low.label)}. The striped bar is a partial month (data ends on the 9th).`
            : "One bar per month: the simplest chart that answers the question."}
        </p>
      </Panel>

      <Panel on={step === 7}>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Recommendation</p>
          <p className="mt-2 text-[20px] leading-snug font-semibold">Plan stock and staff for {mon(peak.label).split(" ")[0]} from September.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-ink-2/75">
            <li>
              Orders climb through autumn and peak in {mon(peak.label)} at {(peak.value / low.value).toFixed(1)}× the quietest month.
            </li>
            <li>{Math.round(f.ukShare * 100)}% of customers are in the UK, so UK holidays drive the curve.</li>
            <li>Caveat: only one year of data. Check against a second year before committing budget.</li>
          </ul>
        </div>
      </Panel>
    </div>
  );
}

export function AnalysisFlow({ facts }: { facts: RetailFacts }) {
  const steps: Step[] = [
    { t: "Start with a question", d: "A real decision, owned by real people. Everything after this exists to answer it." },
    { t: "Look at the raw data", d: `${facts.name}: every line of every order for a year. Raw files are never clean.` },
    { t: "Clean it, with written rules", d: "Decide what counts as a sale, apply it in code, and count what each rule removes." },
    { t: "Model it", d: "Split the data into a central table of sales and small tables that describe them. Queries and dashboards get simpler and faster." },
    { t: "Query it", d: "One SQL query turns half a million rows into thirteen numbers." },
    { t: "Chart it", d: "Pick the chart that fits the question: months in order, one bar each." },
    { t: "Find the insight", d: "Read the chart against the question: how big is the peak, and when does the climb start?" },
    { t: "Recommend, with caveats", d: "End with what to do, why, and how sure we are. That's the deliverable, not the chart." },
  ];
  return (
    <InsideSection id="flow" kicker="How an analysis works" title="From half a million rows to one decision." line={`Scroll through a real analysis of the ${facts.name} (${facts.license}).`}>
      <Scrolly steps={steps}>
        {(step) => (
          <div className="flex min-h-0 flex-1 flex-col">
            <Visual step={step} f={facts} />
          </div>
        )}
      </Scrolly>
    </InsideSection>
  );
}
