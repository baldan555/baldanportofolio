"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Kind, Model, Table } from "@/data/data-models";

const HEAD: Record<Kind, string> = { fact: "#0b0b0b", dim: "#2a78d6", table: "#5b5b5b", event: "#eb6834", history: "#6250d6", node: "#1baf7a", edge: "#0f766e", agg: "#c29a00" };
const KIND_LABEL: Record<Kind, string> = { fact: "fact", dim: "dimension", table: "table", event: "events", history: "history", node: "nodes", edge: "edges", agg: "summary" };
const BOX_W = 186;
const HEAD_H = 26;
const ROW_H = 17;
const r1 = (v: number) => Math.round(v * 10) / 10;

const box = (t: Table) => ({ x: t.x, y: t.y, w: BOX_W, h: HEAD_H + t.cols.length * ROW_H + 6 });

/** Entity-relationship diagram: tables as boxes, keys marked, lines for the links between tables. */
export function Diagram({ m }: { m: Model }) {
  const height = Math.max(...m.tables.map((t) => box(t).y + box(t).h)) + 16;
  const byName = Object.fromEntries(m.tables.map((t) => [t.name, box(t)]));
  return (
    <svg viewBox={`0 0 640 ${height}`} className="h-auto w-full" role="img" aria-label={`Diagram of the ${m.name} model`}>
      {m.links.map(([a, b]) => {
        const A = byName[a];
        const B = byName[b];
        const ax = A.x + A.w / 2;
        const bx = B.x + B.w / 2;
        const x1 = ax < bx ? A.x + A.w : ax > bx ? A.x : ax;
        const x2 = ax < bx ? B.x : ax > bx ? B.x + B.w : bx;
        const y1 = ax === bx ? (A.y < B.y ? A.y + A.h : A.y) : A.y + HEAD_H + 8;
        const y2 = ax === bx ? (A.y < B.y ? B.y : B.y + B.h) : B.y + HEAD_H + 8;
        return (
          <g key={a + b}>
            <path d={`M${x1},${y1} C${r1((x1 + x2) / 2)},${y1} ${r1((x1 + x2) / 2)},${y2} ${x2},${y2}`} fill="none" stroke="rgba(11,11,11,0.35)" strokeWidth={1.6} />
            <circle cx={x2} cy={y2} r={3.5} fill="#0b0b0b" />
          </g>
        );
      })}
      {m.tables.map((t) => {
        const b = box(t);
        return (
          <g key={t.name}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill="#fff" stroke="rgba(11,11,11,0.14)" />
            <path d={`M${b.x},${b.y + 10} a10,10 0 0 1 10,-10 h${b.w - 20} a10,10 0 0 1 10,10 v${HEAD_H - 10} h${-b.w} Z`} fill={HEAD[t.kind]} />
            <text x={b.x + 10} y={b.y + 17} fontSize={11.5} fontWeight={700} fill="#fff" fontFamily="ui-monospace, monospace">
              {t.name}
            </text>
            <text x={b.x + b.w - 10} y={b.y + 17} fontSize={8.5} textAnchor="end" fill="rgba(255,255,255,0.7)" fontFamily="ui-monospace, monospace">
              {KIND_LABEL[t.kind].toUpperCase()}
            </text>
            {t.cols.map((c, i) => (
              <g key={c.n}>
                <text x={b.x + 10} y={b.y + HEAD_H + 14 + i * ROW_H} fontSize={10.5} fill="#0b0b0b" fontFamily="ui-monospace, monospace" fontWeight={c.k === "pk" ? 700 : 400}>
                  {c.k === "pk" ? "🔑 " : c.k === "fk" ? "↗ " : ""}
                  {c.n}
                </text>
                <text x={b.x + b.w - 10} y={b.y + HEAD_H + 14 + i * ROW_H} fontSize={9.5} textAnchor="end" fill="rgba(11,11,11,0.45)" fontFamily="ui-monospace, monospace">
                  {c.t}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function ModelExplorer({ models }: { models: Model[] }) {
  const [pick, setPick] = useState(0);
  const m = models[pick];
  const families = ["Transactional", "Analytical", "Specialised"] as const;
  const compare = ["flat", "oltp", "star", "obt"].map((id) => models.find((x) => x.id === id)!).filter(Boolean);

  return (
    <>
      <section id="shapes" className="mx-auto mt-28 max-w-[1240px] scroll-mt-32 px-5 md:px-10">
        <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">Shapes of data</p>
        <h2 className="mb-8 max-w-3xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">The same business, stored in different shapes.</h2>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="space-y-5 lg:sticky lg:top-36 lg:self-start">
            {families.map((f) => (
              <div key={f}>
                <p className="mb-2 font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">{f}</p>
                <div className="flex flex-wrap gap-1.5 lg:flex-col">
                  {models.map((x, i) =>
                    x.family === f ? (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => setPick(i)}
                        className={`rounded-2xl border px-3.5 py-2 text-left transition-colors ${i === pick ? "border-ink bg-ink text-white" : "border-ink/10 bg-white hover:border-ink/30"}`}
                      >
                        <span className="block text-[13.5px] font-semibold">{x.name}</span>
                        <span className={`block text-[11px] ${i === pick ? "text-white/60" : "text-muted"}`}>
                          {x.domain} · {x.data === "real" ? "real data" : "example"}
                        </span>
                      </button>
                    ) : null,
                  )}
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="min-w-0 space-y-4">
              <div className="rounded-[28px] bg-cream p-5 sm:p-7">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[1.9rem] leading-tight font-semibold tracking-[-0.03em]">{m.name}</h2>
                  <span className={`rounded-full px-3 py-1 font-mono text-[10.5px] tracking-[0.12em] uppercase ${m.data === "real" ? "bg-[#1baf7a]/15 text-[#138a60]" : "bg-ink/5 text-muted"}`}>
                    {m.data === "real" ? "real data" : "example data"}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-2/75">{m.blurb}</p>
                <div className="mt-5 rounded-2xl bg-white p-3">
                  <Diagram m={m} />
                </div>
                {m.json && <pre className="mt-3 overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-[12px] leading-relaxed text-white/85">{m.json}</pre>}
                <p className="mt-2 text-[11.5px] text-ink-2/55">{m.source}</p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <div className="min-w-0 rounded-[22px] border border-line bg-white p-4">
                  <p className="mb-2 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{m.sample.title}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr>
                          {m.sample.columns.map((c) => (
                            <th key={c} className="border-b border-line px-2 py-1.5 font-mono text-[10.5px] font-semibold whitespace-nowrap text-ink/70">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.sample.rows.map((r, i) => (
                          <tr key={i} className="border-b border-line/60 last:border-0">
                            {r.map((v, j) => (
                              <td
                                key={j}
                                className={`px-2 py-1.5 whitespace-nowrap ${typeof v === "number" ? "text-right font-mono" : ""} ${String(r[0]).startsWith("C") && m.id === "flat" ? "text-[#c2410c]" : ""}`}
                              >
                                {String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[22px] border border-line bg-white p-4">
                    <p className="font-mono text-[10.5px] tracking-[0.14em] text-[#138a60] uppercase">Best for</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px]">
                      {m.best.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[22px] border border-line bg-white p-4">
                    <p className="font-mono text-[10.5px] tracking-[0.14em] text-[#c2410c] uppercase">Watch out</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px]">
                      {m.watch.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] bg-ink p-4 sm:p-5">
                <p className="font-mono text-[10.5px] tracking-[0.14em] text-white/50 uppercase">SQL · {m.question}</p>
                <pre className="mt-2 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-white/90">{m.sql}</pre>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-[1240px] px-5 md:px-10">
        <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">Same question, different model</p>
        <h2 className="max-w-3xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">“Revenue per product per month”, four ways.</h2>
        <p className="mt-3 max-w-2xl text-[15px] text-ink-2/70">The shape of the data decides how much work every single query has to do.</p>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {compare.map((c) => {
            const joins = (c.sql.match(/\bJOIN\b/g) ?? []).length;
            const rules = (c.sql.match(/\bWHERE\b/g) ?? []).length;
            return (
              <div key={c.id} className="flex flex-col rounded-[22px] border border-line bg-white p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[16px] font-semibold">{c.name}</p>
                  <span className="font-mono text-[11px] text-muted">
                    {joins} join{joins === 1 ? "" : "s"} · {rules ? "cleaning in the query" : "pre-cleaned"}
                  </span>
                </div>
                <pre className="mt-3 flex-1 overflow-x-auto rounded-xl bg-ink p-3 font-mono text-[11.5px] leading-relaxed text-white/85">{c.sql}</pre>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
