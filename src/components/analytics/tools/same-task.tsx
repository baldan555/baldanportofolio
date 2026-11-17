"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SAME_TASK } from "@/data/analytics-tools";
import p from "@/data/retail-profile.json";
import { Badge, Section, type ToolView } from "./shared";
import { monthOf } from "@/lib/months";

const CLICKS = new Set(["excel", "tableau", "looker", "metabase"]);
const MONTH = (m: string) => monthOf(m);
const cell = (c: string, m: string) => p.pivot.cells.find((x) => x.country === c && x.month === m)?.orders ?? 0;
const MAX = Math.max(...p.pivot.cells.map((x) => x.orders));
// log scale, so Germany and France still show a shade next to the UK
const shade = (v: number) => Math.round((Math.log10(v) / Math.log10(MAX)) * 100) / 100;

function Run({ v, tool }: { v: (typeof SAME_TASK.versions)[number]; tool?: ToolView }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [chars, setChars] = useState(0);
  const done = chars >= v.code.length;
  useEffect(() => {
    if (!inView) return;
    const step = Math.max(2, Math.ceil(v.code.length / 45));
    const id = setInterval(() => setChars((c) => (c >= v.code.length ? c : c + step)), 22);
    return () => clearInterval(id);
  }, [inView, v.code.length]);

  return (
    <div ref={ref} className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="flex min-h-[250px] flex-col overflow-hidden rounded-[22px] bg-[#14161a]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          {tool && <Badge t={tool} size={22} />}
          <span className="font-mono text-[11.5px] text-white/70">{v.label}</span>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[9.5px] tracking-[0.1em] uppercase ${CLICKS.has(v.id) ? "bg-[#c29a00]/25 text-[#ffd75e]" : "bg-[#2a78d6]/30 text-[#9cc8ff]"}`}
          >
            {CLICKS.has(v.id) ? "clicks & drags" : "typed code"}
          </span>
        </div>
        <pre className="flex-1 overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-white/85">
          {v.code.slice(0, chars)}
          {!done && <span className="ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[3px] animate-pulse bg-white/80" />}
        </pre>
      </div>
      <div className="relative rounded-[22px] border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Result · orders</p>
          <motion.span
            initial={false}
            animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.6, rotate: done ? -4 : 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 16 }}
            className="rounded-full border-2 border-[#138a60] px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.1em] text-[#138a60] uppercase"
          >
            ✓ same answer
          </motion.span>
        </div>
        <table className="mt-3 w-full border-separate border-spacing-1 text-[12.5px]">
          <thead>
            <tr>
              <th className="text-left font-mono text-[10px] font-normal text-muted">country</th>
              {p.pivot.months.map((m) => (
                <th key={m} className="text-right font-mono text-[10px] font-normal text-muted">
                  {MONTH(m)} 2011
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.pivot.countries.map((c, r) => (
              <tr key={c}>
                <td className="pr-2 text-[12px]">{c}</td>
                {p.pivot.months.map((m, k) => {
                  const val = cell(c, m);
                  return (
                    <motion.td
                      key={m}
                      initial={false}
                      animate={{ opacity: done ? 1 : 0.15, backgroundColor: done ? `rgba(235,104,52,${shade(val)})` : "rgba(11,11,11,0.04)" }}
                      transition={{ duration: 0.35, delay: done ? (r * 3 + k) * 0.05 : 0 }}
                      className={`rounded-lg px-2 py-2 text-right font-mono ${shade(val) > 0.75 ? "text-white" : ""}`}
                    >
                      {val.toLocaleString("en-US")}
                    </motion.td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11.5px] leading-snug text-ink-2/55">
          Real result from the cleaned Online Retail data (distinct invoices). Colour on a log scale, so the smaller countries still show.
        </p>
      </div>
    </div>
  );
}

export function SameTask({ tools }: { tools: ToolView[] }) {
  const [i, setI] = useState(0);
  const v = SAME_TASK.versions[i];
  const byId = (id: string) => tools.find((t) => t.id === id);
  return (
    <Section
      id="same-task"
      kicker="Same task, every tool"
      title="One question, eight ways to ask it."
      line={`“${SAME_TASK.question}”, answered in ${SAME_TASK.versions.length} tools. Some are typed, some are clicked; the answer is the same. Pick a tool to watch it run.`}
    >
      <div className="mb-4 flex flex-wrap gap-1.5">
        {SAME_TASK.versions.map((x, k) => {
          const t = byId(x.id);
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setI(k)}
              className={`flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[13px] transition-colors ${i === k ? "border-ink bg-ink text-white" : "border-ink/10 bg-white hover:border-ink/30"}`}
            >
              {t && <Badge t={t} size={22} />}
              {x.label}
            </button>
          );
        })}
      </div>
      <Run key={v.id} v={v} tool={byId(v.id)} />
    </Section>
  );
}
