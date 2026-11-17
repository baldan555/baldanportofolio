"use client";

import { motion } from "framer-motion";
import p from "@/data/retail-profile.json";
import { InsideSection, Scrolly, type Step } from "../../explainers/scrolly";
import * as V from "./visuals";

const tr = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };
const n = (v: number) => v.toLocaleString("en-US");
const c = p.cases;

function Panel({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 10 }}
      transition={tr}
      className={`absolute inset-0 flex flex-col justify-center overflow-y-auto px-5 pb-10 sm:px-8 ${on ? "" : "pointer-events-none"}`}
    >
      {children}
    </motion.div>
  );
}
const Label = ({ children }: { children: React.ReactNode }) => <p className="mb-2 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{children}</p>;

/** The raw rows that show every problem at once. */
const RAW = [p.invoice[0], c.duplicates.example[0], c.duplicates.example[1], c.cancellations.example[0], c.zero_price.example[0], c.missing_description.example[0]];
const problem = (i: number) => ["", "", "exact duplicate", "cancellation", "zero price, odd name", "no description"][i];

function Funnel({ on }: { on: boolean }) {
  const max = p.funnel[0].rows;
  return (
    <div className="space-y-2">
      {p.funnel.map((f, i) => {
        const drop = i ? p.funnel[i - 1].rows - f.rows : 0;
        return (
          <div key={f.step}>
            <div className="flex justify-between text-[12px]">
              <span>{f.step}</span>
              <span className="font-mono">
                {n(f.rows)}
                {i > 0 && <span className={drop ? "text-[#c2410c]" : "text-ink/40"}> {drop ? `−${n(drop)}` : "±0"}</span>}
              </span>
            </div>
            <div className="mt-0.5 h-2.5 rounded-full bg-ink/[0.06]">
              <motion.div
                className="h-full rounded-full bg-ink"
                initial={false}
                animate={{ width: on ? `${Math.round((f.rows / max) * 1000) / 10}%` : "0%" }}
                transition={{ ...tr, delay: on ? i * 0.12 : 0 }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-ink-2/55">
        The missing-description rule removed nothing more: every remaining row without a description also had a zero price or quantity, so the rule before it had already caught it.
      </p>
    </div>
  );
}

function Visual({ step }: { step: number }) {
  return (
    <div className="relative min-h-0 flex-1">
      <Panel on={step === 0}>
        <Label>online_retail.xlsx · {n(p.rows)} rows, stored untouched (bronze)</Label>
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left font-mono text-[9.5px] text-ink/50">
                {["InvoiceNo", "StockCode", "Description", "Qty", "Price", "Customer", ""].map((h) => (
                  <th key={h} className="border-b border-line px-1.5 py-1">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RAW.map((r, i) => (
                <tr key={i} className={`border-b border-line/60 ${problem(i) ? "bg-[#e34948]/[0.06]" : ""}`}>
                  <td className="px-1.5 py-1 font-mono">{r.invoice}</td>
                  <td className="px-1.5 py-1 font-mono">{r.stock}</td>
                  <td className={`max-w-[150px] truncate px-1.5 py-1 ${r.description ? "" : "text-ink/30 italic"}`}>{r.description ?? "null"}</td>
                  <td className="px-1.5 py-1 text-right font-mono">{r.quantity}</td>
                  <td className="px-1.5 py-1 text-right font-mono">{r.price}</td>
                  <td className={`px-1.5 py-1 ${r.customer ? "" : "text-ink/30 italic"}`}>{r.customer ?? "null"}</td>
                  <td className="px-1.5 py-1 text-[10px] whitespace-nowrap text-[#c2410c]">{problem(i)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11.5px] text-ink-2/55">Real rows. Customer numbers are never shown here, only whether there is one.</p>
      </Panel>
      <Panel on={step === 1}>
        <Label>Profile: how healthy is each column?</Label>
        <V.Profiling />
      </Panel>
      <Panel on={step === 2}>
        <Label>Test: rules the data must pass</Label>
        <V.DataTests />
      </Panel>
      <Panel on={step === 3}>
        <Label>Clean: one written rule at a time (silver)</Label>
        <Funnel on={step === 3} />
      </Panel>
      <Panel on={step === 4}>
        <Label>Standardise: one name per product</Label>
        <div className="space-y-1.5">
          {c.description_variants.names.map((v) => (
            <div key={v.name} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-[12px]">
              <span className="font-mono">{v.name}</span>
              <span className="font-mono text-ink/50">{v.rows} rows</span>
            </div>
          ))}
          <p className="pt-1 text-center text-[18px]">↓</p>
          <div className="rounded-lg bg-ink px-3 py-2 text-center font-mono text-[12px] text-white">{c.description_variants.stock} → one description, kept in a mapping table</div>
        </div>
        <p className="mt-2 text-[11.5px] text-ink-2/55">
          The raw file has {n(p.columns[2].distinct)} different descriptions for {n(p.columns[1].distinct)} product codes.
        </p>
      </Panel>
      <Panel on={step === 5}>
        <Label>Model: split into facts and dimensions</Label>
        <V.Normalise />
      </Panel>
      <Panel on={step === 6}>
        <Label>Serve: small, fast tables for dashboards (gold)</Label>
        <V.Partitions />
      </Panel>
      <Panel on={step === 7}>
        <Label>Automate and document</Label>
        <V.Dag />
        <div className="mt-2">
          <V.Lineage />
        </div>
      </Panel>
    </div>
  );
}

export function RawToReady() {
  const last = p.funnel[p.funnel.length - 1].rows;
  const steps: Step[] = [
    { t: "It arrives as a file", d: `${n(p.rows)} rows exported from the shop's system. The first rule: keep this copy exactly as it came (the bronze layer), so everything can be re-run.` },
    {
      t: "Profile every column",
      d: `Before any change, measure: ${(c.missing_customer.share * 100).toFixed(1)}% of rows have no customer, ${n(c.missing_description.rows)} have no description, quantities go negative.`,
    },
    { t: "Write the tests", d: "Turn expectations into checks that run every time. Today several fail, which is exactly what tells us what to clean." },
    { t: "Clean, rule by rule", d: `Duplicates, cancellations, zero prices and fee lines go, each with a count. ${n(p.rows - last)} rows removed, ${n(last)} left (the silver layer).` },
    { t: "Standardise names", d: "The same product typed three ways would be counted as three products. One code, one name." },
    { t: "Model it", d: "Repeated details move into their own tables: invoices, lines, products. Then a star schema for reporting." },
    { t: "Serve small, fast tables", d: "Summaries per month, partitioned by date, so a dashboard reads a handful of rows instead of half a million (the gold layer)." },
    { t: "Automate and document", d: "A scheduler runs every step in order each night; lineage shows where every number came from." },
  ];
  return (
    <InsideSection
      id="pipeline"
      kicker="Raw to ready"
      title="What happens to raw data before anyone sees a chart."
      line="Scroll through the full journey of the real Online Retail file, from the export to a trusted table."
    >
      <Scrolly steps={steps}>
        {(step) => (
          <div className="flex min-h-0 flex-1 flex-col">
            <Visual step={step} />
          </div>
        )}
      </Scrolly>
    </InsideSection>
  );
}
