"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { BI_AXES, BI_RATINGS, STAGES, type Tool } from "@/data/analytics-tools";
import { Badge, ink, RATING_LABELS, Section, type ToolView } from "./shared";

const S = 300;
const C = S / 2;
const RAD = 108;
const r1 = (v: number) => Math.round(v * 10) / 10;
const pt = (axis: number, v: number) => {
  const a = -Math.PI / 2 + (axis / BI_AXES.length) * Math.PI * 2;
  return [r1(C + Math.cos(a) * (v / 5) * RAD), r1(C + Math.sin(a) * (v / 5) * RAD)] as const;
};
const shape = (v: number[]) => v.map((x, i) => `${i ? "L" : "M"}${pt(i, x).join(",")}`).join(" ") + " Z";

function Radar({ on, tools, hover }: { on: string[]; tools: ToolView[]; hover: string | null }) {
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto h-auto w-full max-w-[420px]" role="img" aria-label="Radar chart comparing BI tools">
      {[1, 2, 3, 4, 5].map((lv) => (
        <path key={lv} d={shape(BI_AXES.map(() => lv))} fill="none" stroke="rgba(11,11,11,0.08)" />
      ))}
      {BI_AXES.map((a, i) => {
        const [x, y] = pt(i, 5);
        const [lx, ly] = pt(i, 6.15);
        return (
          <g key={a}>
            <line x1={C} y1={C} x2={x} y2={y} stroke="rgba(11,11,11,0.08)" />
            <text x={lx} y={ly + 3} textAnchor={lx < C - 5 ? "end" : lx > C + 5 ? "start" : "middle"} fontSize={9.5} fill="rgba(11,11,11,0.6)">
              {a}
            </text>
          </g>
        );
      })}
      {BI_RATINGS.filter((b) => on.includes(b.id)).map((b) => {
        const t = tools.find((x) => x.id === b.id)!;
        const c = ink(t.color);
        const dim = hover && hover !== b.id;
        return (
          <g key={b.id}>
            <motion.path
              initial={{ d: shape(BI_AXES.map(() => 0)), opacity: 0 }}
              animate={{ d: shape(b.v), opacity: dim ? 0.15 : 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              fill={c}
              fillOpacity={0.14}
              stroke={c}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {b.v.map((v, i) => {
              const [x, y] = pt(i, v);
              return <motion.circle key={i} r={3} fill={c} initial={{ cx: C, cy: C }} animate={{ cx: x, cy: y, opacity: dim ? 0.15 : 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function BiCompare({ tools }: { tools: ToolView[] }) {
  const [on, setOn] = useState<string[]>(["powerbi", "looker"]);
  const [hover, setHover] = useState<string | null>(null);
  const bi = BI_RATINGS.map((b) => ({ ...b, t: tools.find((x) => x.id === b.id)! }));
  const toggle = (id: string) => setOn((o) => (o.includes(id) ? (o.length > 1 ? o.filter((x) => x !== id) : o) : [...o, id]));
  return (
    <Section
      id="compare"
      kicker="BI head-to-head"
      title="Power BI, Tableau, Looker Studio, Metabase, Superset."
      line="The dashboard tools compared on what actually decides the choice. Switch tools on and off; hover to isolate one. Ratings are my rule-of-thumb judgement (1–5), not benchmarks."
    >
      <div className="grid gap-6 rounded-[28px] bg-cream p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <div className="flex flex-wrap gap-1.5">
            {bi.map(({ id, t }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                onMouseEnter={() => setHover(on.includes(id) ? id : null)}
                onMouseLeave={() => setHover(null)}
                className={`flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[12.5px] transition-colors ${on.includes(id) ? "bg-white" : "border-transparent bg-white/40 text-ink/40"}`}
                style={on.includes(id) ? { borderColor: ink(t.color) } : undefined}
              >
                <Badge t={t} size={20} />
                {t.name}
              </button>
            ))}
          </div>
          <Radar on={on} tools={tools} hover={hover} />
        </div>
        <div className="overflow-x-auto rounded-2xl bg-white p-3 sm:p-4">
          <table className="w-full min-w-[460px] text-[12px]">
            <thead>
              <tr>
                <th />
                {bi.map(({ id, t }) => (
                  <th key={id} className="px-1 pb-2 text-center">
                    <span className="inline-block" title={t.name}>
                      <Badge t={t} size={26} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BI_AXES.map((a, ai) => {
                const best = Math.max(...bi.map((b) => b.v[ai]));
                return (
                  <tr key={a} className="border-t border-line">
                    <td className="py-2 pr-2 whitespace-nowrap text-ink-2/75">{a}</td>
                    {bi.map(({ id, v, t }) => (
                      <td key={id} className={`px-1 py-2 text-center ${on.includes(id) ? "" : "opacity-35"}`}>
                        <span className="inline-flex gap-[3px]">
                          {[1, 2, 3, 4, 5].map((k) => (
                            <span key={k} className="h-[7px] w-[7px] rounded-full" style={{ background: k <= v[ai] ? ink(t.color) : "rgba(11,11,11,0.08)" }} />
                          ))}
                        </span>
                        {v[ai] === best && <span className="block font-mono text-[9px] text-[#138a60]">best</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 grid gap-2 text-[12.5px] leading-snug sm:grid-cols-2">
            {[
              ["Microsoft company, governed numbers", "Power BI"],
              ["Beautiful exploration, budget available", "Tableau"],
              ["Free, Google data, share by link", "Looker Studio"],
              ["Free, self-hosted, team asks its own questions", "Metabase"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-ink/[0.03] px-3 py-2">
                <span className="text-ink-2/60">{k} → </span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

type SortKey = keyof Tool["rate"] | "stage";

/** Every tool against the five rule-of-thumb ratings, sortable. */
export function RatingsMatrix({ tools }: { tools: ToolView[] }) {
  const [sort, setSort] = useState<SortKey>("stage");
  const [mineOnly, setMineOnly] = useState(false);
  const order = STAGES.map((s) => s.id);
  const rows = tools
    .filter((t) => !mineOnly || t.mine)
    .slice()
    .sort((a, b) => (sort === "stage" ? order.indexOf(a.stage) - order.indexOf(b.stage) : b.rate[sort] - a.rate[sort] || a.name.localeCompare(b.name)));
  return (
    <Section
      id="matrix"
      kicker="Comparison matrix"
      title="Every tool, side by side."
      line="Click a column to rank the tools by it. Darker means stronger. Same caveat: rule-of-thumb judgement, so read it as a starting point, not a score."
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {(
          [
            [false, `All ${tools.length}`],
            [true, `My stack ${tools.filter((t) => t.mine).length}`],
          ] as const
        ).map(([k, l]) => (
          <button
            key={l}
            type="button"
            onClick={() => setMineOnly(k)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${mineOnly === k ? "border-ink bg-ink text-white" : "border-ink/10 bg-white hover:border-ink/30"}`}
          >
            {l}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-muted">sorted by {sort === "stage" ? "pipeline step" : RATING_LABELS.find((r) => r.key === sort)?.label.toLowerCase()}</span>
      </div>
      <div className="overflow-x-auto rounded-[24px] border border-line bg-white">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line">
              <th className="px-3 py-2.5 text-left">
                <button type="button" onClick={() => setSort("stage")} className={`font-mono text-[10.5px] tracking-[0.1em] uppercase ${sort === "stage" ? "text-ink" : "text-muted hover:text-ink"}`}>
                  Tool · step {sort === "stage" && "↓"}
                </button>
              </th>
              {RATING_LABELS.map((r) => (
                <th key={r.key} className="px-2 py-2.5 text-center">
                  <button type="button" onClick={() => setSort(r.key)} className={`font-mono text-[10.5px] tracking-[0.06em] uppercase ${sort === r.key ? "text-ink" : "text-muted hover:text-ink"}`}>
                    {r.label} {sort === r.key && "↓"}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((t) => (
                <motion.tr key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-2">
                      <Badge t={t} size={24} />
                      <span className="font-semibold">{t.name}</span>
                      <span className="font-mono text-[10px] text-muted">{t.stage}</span>
                      {t.mine && <span className="h-1.5 w-1.5 rounded-full bg-ink" title="My stack" />}
                    </span>
                  </td>
                  {RATING_LABELS.map((r) => {
                    const v = t.rate[r.key];
                    return (
                      <td key={r.key} className="px-2 py-1.5">
                        <div
                          className="mx-auto flex h-6 max-w-[96px] items-center justify-center rounded-md font-mono text-[11px]"
                          style={{ background: `rgba(11,11,11,${[0.03, 0.08, 0.2, 0.42, 0.68, 0.9][v]})`, color: v >= 4 ? "#fff" : "#0b0b0b" }}
                        >
                          {v}
                        </div>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </Section>
  );
}
