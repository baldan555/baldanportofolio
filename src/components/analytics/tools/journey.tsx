"use client";

import { animate, AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { STAGES, type Stage } from "@/data/analytics-tools";
import p from "@/data/retail-profile.json";
import { InsideSection, Scrolly, type Step } from "../../explainers/scrolly";
import { MockUI } from "./mocks";
import { Badge, type ToolView } from "./shared";
import { monthYearOf } from "@/lib/months";

const n = (v: number) => v.toLocaleString("en-US");
const clean = p.funnel[p.funnel.length - 1].rows;
const busiest = p.monthly.reduce((a, b) => (b.orders > a.orders ? b : a));
const revenue = p.monthly.reduce((s, m) => s + m.revenue, 0);
const orders = p.monthly.reduce((s, m) => s + m.orders, 0);
const monthName = (m: string) => monthYearOf(m);

/** What the data looks like in hand at each stage: the thread of real numbers through the story. */
const HAND: Record<Stage, { v: number | null; unit: string; tool: string; also: string[] }> = {
  Collect: { v: p.rows, unit: "raw rows, loaded exactly as exported", tool: "python", also: ["airbyte", "fivetran"] },
  Store: { v: p.rows, unit: "rows in a queryable table (bronze)", tool: "postgres", also: ["duckdb", "bigquery"] },
  Transform: { v: clean, unit: "clean rows after the written rules (silver)", tool: "dbt", also: ["sql", "spark"] },
  Orchestrate: { v: null, unit: "the same steps, every night, in order", tool: "airflow", also: ["prefect"] },
  Analyse: { v: p.monthly.length, unit: "monthly summary rows (gold)", tool: "jupyter", also: ["pandas", "excel"] },
  Visualise: { v: 3, unit: "numbers on a manager's screen", tool: "powerbi", also: ["tableau", "looker", "metabase"] },
  Collaborate: { v: null, unit: "one history of every change", tool: "git", also: [] },
};

function Counter({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const c = animate(from.current, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(Math.round(v)) });
    from.current = value;
    return () => c.stop();
  }, [value]);
  return <>{n(shown)}</>;
}

function Rail({ step }: { step: number }) {
  const pct = (step / (STAGES.length - 1)) * 100;
  return (
    <div className="relative mx-1 mb-1 h-9 shrink-0">
      <div className="absolute top-[13px] right-3 left-3 h-[3px] rounded-full bg-ink/10" />
      <motion.div
        className="absolute top-[13px] left-3 h-[3px] rounded-full bg-ink"
        initial={false}
        animate={{ width: `calc((100% - 24px) * ${pct / 100})` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="absolute inset-x-0 top-0 flex justify-between">
        {STAGES.map((s, i) => (
          <div key={s.id} className="flex w-6 flex-col items-center">
            <motion.span
              className="mt-[7px] block h-[15px] w-[15px] rounded-full border-2"
              initial={false}
              animate={{ backgroundColor: i <= step ? "#0b0b0b" : "#ffffff", borderColor: i <= step ? "#0b0b0b" : "rgba(11,11,11,0.2)", scale: i === step ? 1.25 : 1 }}
              transition={{ duration: 0.35 }}
            />
            <span className={`mt-1 hidden text-[9.5px] whitespace-nowrap sm:block ${i === step ? "font-semibold text-ink" : "text-ink/40"}`}>{s.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Visual({ step, tools }: { step: number; tools: ToolView[] }) {
  const stage = STAGES[step].id;
  const h = HAND[stage];
  const t = tools.find((x) => x.id === h.tool)!;
  const also = h.also.map((id) => tools.find((x) => x.id === id)!).filter(Boolean);
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-12 sm:px-6 sm:pt-5">
      <Rail step={step} />
      <div className="relative mt-2 min-h-0 flex-1">
        <AnimatePresence initial={false}>
          <motion.div
            key={stage}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col justify-center"
          >
            <div className="flex items-center gap-2.5">
              <Badge t={t} size={34} />
              <div className="min-w-0">
                <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
                  {String(step + 1).padStart(2, "0")} · {stage}
                </p>
                <p className="truncate text-[15px] leading-tight font-semibold">
                  {t.name}
                  {!t.mine && <span className="ml-1.5 align-middle font-mono text-[9.5px] font-normal text-muted">(e.g.)</span>}
                </p>
              </div>
              {also.length > 0 && (
                <div className="ml-auto hidden items-center gap-1 sm:flex">
                  <span className="mr-0.5 text-[10.5px] text-muted">or</span>
                  {also.map((a) => (
                    <span key={a.id} title={a.name}>
                      <Badge t={a} size={22} />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mx-auto mt-3 w-full max-w-[480px] min-h-0 overflow-hidden rounded-[12px] shadow-[0_10px_40px_-12px_rgba(11,11,11,0.25)]">
              <MockUI mock={t.mock} color={t.color} name={t.name} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-2 flex shrink-0 items-baseline gap-2 rounded-2xl bg-white px-3.5 py-2.5">
        <span className="font-mono text-[22px] leading-none font-semibold tracking-[-0.02em] sm:text-[26px]">
          {h.v === null ? stage === "Orchestrate" ? "02:00" : "main" : <Counter value={h.v} />}
        </span>
        <span className="text-[12px] leading-tight text-ink-2/65">{h.unit}</span>
      </div>
    </div>
  );
}

export function StackJourney({ tools }: { tools: ToolView[] }) {
  const steps: Step[] = [
    {
      t: "Collect: get the data out",
      d: `It starts as an export from the shop's system: ${n(p.rows)} rows. A short Python script loads it untouched; with dozens of sources, a connector tool like Airbyte or Fivetran does this instead.`,
    },
    {
      t: "Store: somewhere it can be queried",
      d: "Into a database, so anyone can ask it questions in SQL. PostgreSQL for team-sized data, DuckDB on a laptop, BigQuery when it reaches billions of rows.",
    },
    {
      t: "Transform: from raw to trusted",
      d: `dbt runs the cleaning rules as tested SQL models in dependency order: duplicates, cancellations, zero prices and fee lines go. ${n(p.rows - clean)} rows removed, ${n(clean)} left.`,
    },
    {
      t: "Orchestrate: every night, in order",
      d: "A scheduler runs extract, load, transform, test and refresh in order. If a test fails, it stops before a wrong number reaches a dashboard, and someone gets an alert.",
    },
    {
      t: "Analyse: ask the questions",
      d: `In a notebook the clean table becomes ${p.monthly.length} monthly rows, and patterns appear: ${monthName(busiest.month)} is the busiest month, with ${n(busiest.orders)} orders.`,
    },
    {
      t: "Visualise: for the people who decide",
      d: `A report turns it into the few numbers a manager needs: £${(revenue / 1e6).toFixed(1)} million in revenue from ${n(orders)} orders, filterable by month and country.`,
    },
    { t: "Collaborate: nothing lives on one laptop", d: "Every query, model and notebook goes into Git: reviewed before it changes, and reversible when something breaks." },
  ];
  return (
    <InsideSection
      id="journey"
      kicker="One dataset, the whole stack"
      title="Follow one file through every tool."
      line="The real Online Retail export, from the moment it is pulled out of the shop's system to the dashboard and the history behind it. Scroll, or click the steps."
    >
      <Scrolly steps={steps}>{(step) => <Visual step={step} tools={tools} />}</Scrolly>
    </InsideSection>
  );
}
