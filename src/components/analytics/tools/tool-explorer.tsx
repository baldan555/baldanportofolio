"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { STAGES } from "@/data/analytics-tools";
import { MockUI } from "./mocks";
import { Badge, ink, RATING_LABELS, Section, type ToolView } from "./shared";

type Filter = "all" | "mine" | "landscape";

const COST_TONE: Record<string, string> = {
  Free: "bg-[#1baf7a]/12 text-[#138a60]",
  "Open source": "bg-[#1baf7a]/12 text-[#138a60]",
  "Free tier, then paid": "bg-[#2a78d6]/10 text-[#1f5fae]",
  Paid: "bg-[#eb6834]/12 text-[#c2410c]",
};

function Ratings({ t }: { t: ToolView }) {
  return (
    <div className="space-y-1.5">
      {RATING_LABELS.map((r, i) => (
        <div key={r.key} className="grid grid-cols-[110px_1fr] items-center gap-2 text-[12px]">
          <span className="text-ink-2/70">{r.label}</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((k) => (
              <motion.span
                key={k}
                className="h-2 flex-1 rounded-full"
                initial={{ backgroundColor: "rgba(11,11,11,0.07)" }}
                animate={{ backgroundColor: k <= t.rate[r.key] ? ink(t.color) : "rgba(11,11,11,0.07)" }}
                transition={{ duration: 0.25, delay: i * 0.05 + k * 0.04 }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Detail({ t }: { t: ToolView }) {
  return (
    <motion.div
      key={t.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3 }}
      className="grid gap-5 rounded-[28px] border border-line bg-white p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
    >
      <div>
        <div className="overflow-hidden rounded-[14px] shadow-[0_14px_40px_-16px_rgba(11,11,11,0.3)]">
          <MockUI mock={t.mock} color={t.color} name={t.name} />
        </div>
        <p className="mt-2 text-[11px] text-ink-2/50">A drawn illustration of working in it, not a screenshot. Numbers shown come from the Online Retail data.</p>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <Badge t={t} size={52} />
          <div>
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
              {t.stage} · {t.mine ? "my stack" : "wider landscape"}
            </p>
            <p className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">{t.name}</p>
          </div>
          <span className={`ml-auto rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.06em] whitespace-nowrap uppercase ${COST_TONE[t.cost]}`}>{t.cost}</span>
        </div>
        <p className="mt-3 text-[14.5px] leading-snug text-ink-2/80">{t.what}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#1baf7a]/[0.07] p-3">
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#138a60] uppercase">Strong at</p>
            <p className="mt-1 text-[13px] leading-snug">{t.strong}</p>
          </div>
          <div className="rounded-2xl bg-[#eb6834]/[0.07] p-3">
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#c2410c] uppercase">Watch out</p>
            <p className="mt-1 text-[13px] leading-snug">{t.weak}</p>
          </div>
        </div>
        <div className="mt-4">
          <Ratings t={t} />
          <p className="mt-1.5 text-[10.5px] text-ink-2/45">Rule-of-thumb ratings (1–5), my judgement, not benchmarks.</p>
        </div>
        <div className={`mt-4 rounded-2xl p-3 ${t.mine ? "bg-ink text-white" : "border border-dashed border-ink/20"}`}>
          <p className={`font-mono text-[10px] tracking-[0.14em] uppercase ${t.mine ? "text-white/55" : "text-muted"}`}>{t.mine ? "I use it for" : "Where it fits"}</p>
          <p className="mt-1 text-[13px] leading-snug">{t.mine ? t.use : `Not part of my daily stack, but worth knowing: it is a common choice at the ${t.stage.toLowerCase()} step.`}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function ToolExplorer({ tools }: { tools: ToolView[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState("dbt");
  const [hover, setHover] = useState<string | null>(null);
  const visible = (t: ToolView) => filter === "all" || (filter === "mine" ? t.mine : !t.mine);
  const t = tools.find((x) => x.id === active)!;
  const mine = tools.filter((x) => x.mine).length;

  return (
    <Section
      id="map"
      kicker="The map"
      title={`${tools.length} tools, seven steps, one pipeline.`}
      line={
        <>Solid cards are the {mine} tools I work with; outlined ones are the wider landscape, shown so the choices make sense. Click any tool for what it is, what it looks like, and when it fits.</>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(
          [
            ["all", `All ${tools.length}`],
            ["mine", `My stack ${mine}`],
            ["landscape", `Wider landscape ${tools.length - mine}`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${filter === k ? "border-ink bg-ink text-white" : "border-ink/10 bg-white hover:border-ink/30"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative overflow-x-auto rounded-[28px] bg-cream p-4 sm:p-6">
        <div className="grid min-w-[980px] grid-cols-7 gap-3">
          {STAGES.map((st, i) => (
            <div key={st.id} className="relative flex flex-col gap-2">
              <div className="mb-1">
                <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
                  0{i + 1} · {st.id}
                </p>
                <p className="mt-0.5 min-h-[44px] text-[11px] leading-snug text-ink-2/55">{st.line}</p>
              </div>
              {tools
                .filter((x) => x.stage === st.id)
                .map((x) => {
                  const on = active === x.id;
                  const dim = !visible(x);
                  return (
                    <motion.button
                      key={x.id}
                      type="button"
                      layout
                      onClick={() => setActive(x.id)}
                      onMouseEnter={() => setHover(x.id)}
                      onMouseLeave={() => setHover(null)}
                      animate={{ opacity: dim ? 0.25 : 1, scale: on ? 1.03 : 1 }}
                      transition={{ duration: 0.25 }}
                      className={`relative flex items-center gap-2 rounded-2xl px-2 py-2 text-left transition-colors ${
                        x.mine
                          ? on
                            ? "bg-white shadow-[0_8px_24px_-10px_rgba(11,11,11,0.35)] ring-2 ring-ink"
                            : "bg-white hover:shadow-sm"
                          : on
                            ? "border-2 border-ink bg-white/80"
                            : "border border-dashed border-ink/25 bg-transparent hover:bg-white/50"
                      }`}
                    >
                      <Badge t={x} size={28} />
                      <span className="min-w-0 text-[12px] leading-tight font-semibold">{x.name}</span>
                      {hover === x.id && !on && <span className="absolute inset-0 rounded-2xl ring-1 ring-ink/30" />}
                    </motion.button>
                  );
                })}
              {/* data flowing on to the next step */}
              {i < STAGES.length - 1 && (
                <div className="pointer-events-none absolute top-[18px] -right-3 h-px w-3 bg-ink/20">
                  <motion.span
                    className="absolute -top-[3px] block h-[7px] w-[7px] rounded-full bg-[#eb6834]"
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-ink-2/50 md:hidden">Swipe the map sideways to see every step.</p>

      <div className="mt-4">
        <AnimatePresence mode="wait" initial={false}>
          <Detail key={t.id} t={t} />
        </AnimatePresence>
      </div>
    </Section>
  );
}
