"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Camera, ChartColumn, Database, FileSpreadsheet, Flag, Globe, Music, PenLine, Scale, ShieldCheck, Split } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ease } from "../motion";

export type ToolView = { name: string; version?: string; role: string; logo?: { path: string; hex: string }; lucide?: "database" | "sheet" | "chart" | "pen" | "camera" | "globe" | "music" };
export type StageView = { title: string; line: string; tools: ToolView[] };
export type AlgoView = { name: string; family: string; line: string; cells: (0 | 1 | 2)[]; tried: number; chosen: number };
export type ColumnView = { slug: string; label: string };
export type CheckView = { name: string; detail: string; projects: ColumnView[] };
export type GroupView = { title: string; line: string; icon: "split" | "scale" | "shield" | "flag"; checks: CheckView[] };

const LUCIDE = { database: Database, sheet: FileSpreadsheet, chart: ChartColumn, pen: PenLine, camera: Camera, globe: Globe, music: Music };
const GROUP_ICON = { split: Split, scale: Scale, shield: ShieldCheck, flag: Flag };

/* ------------------------------------------------------------------ */
/* Stack: four stages joined by a flowing line                         */
/* ------------------------------------------------------------------ */

export function StackPipeline({ stages }: { stages: StageView[] }) {
  const cols = "lg:grid-cols-[1.1fr_1.5fr_0.75fr_1.6fr]";
  return (
    <div className="mt-14">
      {/* stage markers on the flow line (desktop) */}
      <div className="relative hidden lg:block">
        <div className="flow-line absolute inset-x-5 top-1/2 h-px" aria-hidden />
        {[0, 1, 2].map((i) => (
          <span key={i} className="packet" style={{ animationDelay: `${-i * 1.8}s` }} aria-hidden />
        ))}
        <div className={`relative grid gap-4 ${cols}`}>
          {stages.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.18 }}
              className="flex items-center"
            >
              <span className="ml-5 grid h-10 w-10 place-items-center rounded-full bg-ink font-mono text-[12px] text-white ring-8 ring-bg">0{i + 1}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className={`mt-0 grid gap-4 md:grid-cols-2 lg:mt-5 ${cols}`}>
        {stages.map((s, i) => (
          <Stage key={s.title} stage={s} index={i} />
        ))}
      </div>
    </div>
  );
}

function Stage({ stage, index }: { stage: StageView; index: number }) {
  const [active, setActive] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const tool = active === null ? null : stage.tools[active];
  const single = stage.tools.length === 1;
  const tileCols = single ? "grid-cols-1" : stage.tools.length <= 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.8, ease, delay: index * 0.15 }}
      onMouseLeave={() => setActive(null)}
      className="flex flex-col rounded-[24px] border border-line bg-white p-5"
    >
      <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
        <span className="lg:hidden">0{index + 1} · </span>
        {stage.title}
      </p>
      <p className="mt-2 text-[13.5px] leading-snug text-ink-2/75">{stage.line}</p>

      <motion.div
        className={`mt-5 grid flex-1 content-start gap-2 ${tileCols}`}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ staggerChildren: 0.07, delayChildren: 0.25 + index * 0.15 }}
      >
        {stage.tools.map((t, i) => {
          const on = active === i;
          const Icon = t.lucide ? LUCIDE[t.lucide] : null;
          return (
            <motion.button
              key={t.name}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={`${t.name}${t.version ? ` ${t.version}` : ""}: ${t.role}`}
              variants={{
                hidden: { opacity: 0, y: 18, scale: 0.8 },
                show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 22 } },
              }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-1.5 text-center transition-[background-color,box-shadow] duration-300 ${single ? "py-7" : "pt-4 pb-3"} ${
                on ? "bg-white shadow-[0_10px_30px_-12px_rgba(11,11,11,0.3)] ring-1 ring-ink/10" : "bg-cream/70"
              }`}
            >
              <motion.span
                className="mb-1 block"
                animate={reduce ? undefined : { y: [0, -3, 0] }}
                transition={{ duration: 2.8 + (i % 3) * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
              >
                {t.logo ? (
                  <svg viewBox="0 0 24 24" className={single ? "h-12 w-12" : "h-8 w-8"} aria-hidden>
                    <path d={t.logo.path} fill={on ? `#${t.logo.hex}` : "currentColor"} style={{ transition: "fill 0.3s" }} />
                  </svg>
                ) : (
                  Icon && <Icon className="h-8 w-8" strokeWidth={1.5} style={{ color: on ? "#2a78d6" : undefined, transition: "color 0.3s" }} />
                )}
              </motion.span>
              <span className="text-[11.5px] leading-tight font-medium">{t.name}</span>
              {t.version && <span className="font-mono text-[10px] text-muted">{t.version}</span>}
            </motion.button>
          );
        })}
      </motion.div>

      <div className="mt-4 min-h-[44px] border-t border-line pt-3 text-[12.5px] leading-snug">
        {tool ? (
          <motion.p key={tool.name} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <b>{tool.name}</b> <span className="text-ink-2/70">· {tool.role}</span>
          </motion.p>
        ) : (
          <p className="font-hand text-[17px] text-ink-2/55">{single ? "tap the file ↑" : "hover or tap a logo ↑"}</p>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Models × projects matrix                                            */
/* ------------------------------------------------------------------ */

export function ModelMatrix({ algos, columns }: { algos: AlgoView[]; columns: ColumnView[] }) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  return (
    <div className="mt-10 overflow-hidden rounded-[24px] border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-5 pt-5 pb-3 align-bottom font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase">Algorithm</th>
              {columns.map((c, j) => (
                <th key={c.slug} className="px-0 pt-5 pb-3 align-bottom" onMouseEnter={() => setHoverCol(j)} onMouseLeave={() => setHoverCol(null)}>
                  <Link
                    href={`/skills/machine-learning/${c.slug}`}
                    className={`mx-auto block h-[104px] text-[11.5px] whitespace-nowrap transition-colors [writing-mode:vertical-rl] rotate-180 ${hoverCol === j ? "text-ink" : "text-ink-2/60"}`}
                    data-cursor="Open"
                  >
                    {c.label}
                  </Link>
                </th>
              ))}
              <th className="px-5 pt-5 pb-3 text-right align-bottom font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase">Shipped</th>
            </tr>
          </thead>
          <motion.tbody initial="hidden" whileInView="show" viewport={{ once: true, margin: "-10% 0px" }}>
            {algos.map((a, r) => (
              <tr key={a.name} className="group border-t border-line transition-colors hover:bg-cream/40">
                <td className="sticky left-0 z-10 max-w-[340px] bg-white px-5 py-3.5 transition-colors group-hover:bg-[#f8f6f0]">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[14.5px] font-semibold tracking-[-0.01em]">
                    {a.name}
                    <span className="font-mono text-[10px] font-normal text-muted uppercase">{a.family}</span>
                  </p>
                  <p className="mt-1 hidden text-[12.5px] leading-snug text-ink-2/65 md:block">{a.line}</p>
                </td>
                {a.cells.map((v, j) => (
                  <td key={j} className={`px-0 py-3.5 text-center transition-colors ${hoverCol === j ? "bg-cream/70" : ""}`}>
                    <motion.span
                      custom={r * 0.05 + j * 0.025}
                      variants={{
                        hidden: { scale: 0, opacity: 0 },
                        show: (d: number) => ({ scale: 1, opacity: 1, transition: { delay: d, type: "spring", stiffness: 420, damping: 20 } }),
                      }}
                      title={v === 2 ? `Shipped in ${columns[j].label}` : v === 1 ? `Compared in ${columns[j].label}` : undefined}
                      className={`mx-auto block rounded-full ${v === 2 ? "h-3.5 w-3.5 bg-ink" : v === 1 ? "h-3 w-3 border-[1.5px] border-ink/40" : "h-1 w-1 bg-ink/10"}`}
                    />
                  </td>
                ))}
                <td className="px-5 py-3.5 text-right font-mono text-[12.5px] whitespace-nowrap">
                  <span className={a.chosen ? "font-semibold" : "text-muted"}>{a.chosen}</span>
                  <span className="text-muted"> / {a.tried}</span>
                </td>
              </tr>
            ))}
          </motion.tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-5 py-3 text-[12px] text-ink-2/70">
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-ink" /> final model, running in the demo
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-[1.5px] border-ink/40" /> compared, not shipped
        </span>
        <span className="text-muted">Click a project name to open it.</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* How results are checked                                             */
/* ------------------------------------------------------------------ */

export function CheckGrid({ groups }: { groups: GroupView[] }) {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      {groups.map((g, gi) => {
        const Icon = GROUP_ICON[g.icon];
        return (
          <motion.div
            key={g.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.8, ease, delay: (gi % 2) * 0.12 }}
            className="group/card rounded-[24px] border border-line bg-white p-6 sm:p-7"
          >
            <div className="flex items-start gap-4">
              <motion.span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cream text-ink transition-colors duration-300 group-hover/card:bg-ink group-hover/card:text-white"
                whileHover={{ rotate: -8 }}
              >
                <Icon className="h-5 w-5" strokeWidth={1.7} />
              </motion.span>
              <div>
                <h4 className="text-[1.35rem] leading-tight font-semibold tracking-[-0.03em]">{g.title}</h4>
                <p className="mt-1 text-[13.5px] text-ink-2/65">{g.line}</p>
              </div>
            </div>
            <motion.ul
              className="mt-5 divide-y divide-line border-t border-line"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ staggerChildren: 0.08, delayChildren: 0.2 }}
            >
              {g.checks.map((c) => (
                <motion.li
                  key={c.name}
                  variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease } } }}
                  className="grid gap-2 py-3.5 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4"
                >
                  <div>
                    <p className="text-[14px] font-semibold">{c.name}</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2/65">{c.detail}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:max-w-[220px] sm:justify-end">
                    {c.projects.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/skills/machine-learning/${p.slug}`}
                        className="group/chip inline-flex items-center gap-1 rounded-full border border-ink/10 px-2.5 py-1 text-[11.5px] whitespace-nowrap transition-colors hover:border-ink hover:bg-ink hover:text-white"
                      >
                        {p.label}
                        <ArrowUpRight className="h-3 w-3 opacity-50 transition group-hover/chip:rotate-45 group-hover/chip:opacity-100" />
                      </Link>
                    ))}
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        );
      })}
    </div>
  );
}
