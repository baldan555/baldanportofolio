"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Database, MousePointerClick } from "lucide-react";
import type { ReactNode } from "react";
import { ease } from "../motion";

export function SectionTitle({ kicker, title, line }: { kicker: string; title: string; line?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">{kicker}</p>
      <h2 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">{title}</h2>
      {line && <p className="mt-3 text-[16px] leading-relaxed text-ink-2/70">{line}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* How it works: a pipeline that lights up step by step                 */
/* ------------------------------------------------------------------ */

export type ProcessStep = { title: string; value: string; detail: string };

export function ProcessFlow({ steps }: { steps: ProcessStep[] }) {
  return (
    <motion.ol
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-15%" }}
      transition={{ staggerChildren: 0.18 }}
      className="relative grid gap-3 md:grid-cols-[repeat(var(--n),minmax(0,1fr))]"
      style={{ ["--n" as string]: steps.length }}
    >
      {/* connector (desktop) */}
      <motion.span
        aria-hidden
        className="absolute top-[34px] right-[6%] left-[6%] hidden h-[2px] origin-left bg-ink md:block"
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: steps.length * 0.18 + 0.4, ease: "easeInOut" } } }}
      />
      {/* connector (mobile) */}
      <motion.span
        aria-hidden
        className="absolute top-6 bottom-6 left-[26px] w-[2px] origin-top bg-ink md:hidden"
        variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: steps.length * 0.18 + 0.4, ease: "easeInOut" } } }}
      />
      {steps.map((s, i) => (
        <motion.li
          key={s.title}
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
          className="relative flex gap-4 md:flex-col md:gap-0"
        >
          <motion.span
            variants={{ hidden: { scale: 0.6, backgroundColor: "#ffffff", color: "#0b0b0b" }, show: { scale: 1, backgroundColor: "#0b0b0b", color: "#ffffff", transition: { duration: 0.4 } } }}
            className="relative z-10 grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full border-2 border-ink font-mono text-[13px] md:h-[68px] md:w-[68px] md:text-[14px]"
          >
            {String(i + 1).padStart(2, "0")}
          </motion.span>
          <div className="flex-1 rounded-2xl border border-line bg-white p-4 md:mt-4">
            <p className="font-mono text-[11px] tracking-wide text-muted uppercase">{s.title}</p>
            <p className="mt-1.5 text-[1.35rem] leading-tight font-semibold tracking-[-0.03em]">{s.value}</p>
            <p className="mt-1.5 text-[13px] leading-snug text-ink-2/65">{s.detail}</p>
          </div>
        </motion.li>
      ))}
    </motion.ol>
  );
}

/* ------------------------------------------------------------------ */
/* Dataset card with column dictionary                                  */
/* ------------------------------------------------------------------ */

export type ColumnDoc = { name: string; type: string; meaning: string; used?: boolean };

export function DatasetCard({
  name,
  source,
  sourceLabel,
  facts,
  description,
  columns,
}: {
  name: string;
  source?: string;
  sourceLabel?: string;
  facts: { label: string; value: string }[];
  description: string;
  columns: ColumnDoc[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div className="flex flex-col rounded-2xl bg-ink p-6 text-white">
        <Database className="h-6 w-6" strokeWidth={1.6} />
        <p className="mt-6 text-[1.5rem] leading-tight font-semibold tracking-[-0.03em]">{name}</p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-white/70">{description}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[1.15rem] font-semibold">{f.value}</p>
              <p className="font-mono text-[10.5px] text-white/55 uppercase">{f.label}</p>
            </div>
          ))}
        </div>
        {source && (
          <a
            href={source}
            target="_blank"
            rel="noreferrer"
            data-cursor="Open"
            className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 pt-2 text-[13px] font-medium text-ink transition hover:bg-cream"
            style={{ marginTop: 24 }}
          >
            {sourceLabel ?? "Open dataset"} <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-[14px] font-semibold">Column dictionary</p>
          <p className="font-mono text-[10.5px] text-muted uppercase">● used by the model</p>
        </div>
        <div className="max-h-[380px] overflow-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-cream">
              <tr>
                {["Column", "Type", "What it means"].map((h) => (
                  <th key={h} className="px-4 py-2 font-mono text-[10.5px] font-medium text-ink-2/70 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((c) => (
                <tr key={c.name} className="border-t border-line align-top">
                  <td className="px-4 py-2 font-mono text-[12px] whitespace-nowrap">
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${c.used ? "bg-ink" : "bg-ink/15"}`} />
                    {c.name}
                  </td>
                  <td className="px-4 py-2 text-ink-2/60">{c.type}</td>
                  <td className="px-4 py-2 text-ink-2/80">{c.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sample table: real rows; click one to send it to the demo            */
/* ------------------------------------------------------------------ */

export function SampleTable<T extends { id: string }>({
  rows,
  columns,
  selected,
  onSelect,
  note,
}: {
  rows: T[];
  columns: { key: string; label: string; render?: (row: T) => ReactNode; align?: "right" }[];
  selected?: string | null;
  onSelect: (row: T) => void;
  note?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold">
          <MousePointerClick className="h-4 w-4" /> Real rows from the dataset
        </p>
        <p className="font-hand text-[18px] text-ink-2/70">click a row to try it in the demo ↓</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-cream">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-mono text-[10.5px] font-medium whitespace-nowrap text-ink-2/70 uppercase ${c.align === "right" ? "text-right" : ""}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = selected === r.id;
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r)}
                  data-cursor="Try"
                  className={`cursor-pointer border-t border-line transition-colors ${on ? "bg-ink text-white" : "hover:bg-cream/60"}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2 whitespace-nowrap ${c.align === "right" ? "text-right font-mono" : ""}`}>
                      {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {note && <p className="border-t border-line px-4 py-2.5 text-[12px] text-muted">{note}</p>}
    </div>
  );
}

export function Pill({ yes, children }: { yes: boolean; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${yes ? "bg-[#eb6834] text-white" : "bg-ink/[0.07]"}`}>{children}</span>;
}
