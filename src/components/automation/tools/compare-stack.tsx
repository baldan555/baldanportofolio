"use client";

import { useState } from "react";
import { AUTO_RATING_LABELS, AUTO_SCENARIOS, type AutoTool } from "@/data/auto-tools";
import type { Logo } from "../../web/logos";
import { Section, ToolLogo } from "../../web/tools/shared";

const PAIRS: [string, string][] = [
  ["zapier", "n8n"],
  ["uipath", "playwright"],
  ["airflow", "temporal"],
  ["langgraph", "crewai"],
  ["openrouter", "ollama"],
];
const A = "#0b0b0b";
const B = "#eb6834";

/** Two tools side by side: ratings, strengths and weaknesses. */
export function AutoHeadToHead({ tools, logos }: { tools: AutoTool[]; logos: Record<string, Logo> }) {
  const [a, setA] = useState("zapier");
  const [b, setB] = useState("n8n");
  const ta = tools.find((t) => t.id === a) ?? tools[0];
  const tb = tools.find((t) => t.id === b) ?? tools[1];
  const select = (v: string, set: (x: string) => void, label: string) => (
    <select value={v} onChange={(e) => set(e.target.value)} aria-label={label} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-ink">
      {tools.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name} · {t.layer}
        </option>
      ))}
    </select>
  );
  return (
    <Section id="compare" kicker="04 · Head-to-head" title="Two tools, side by side." line="Pick any two, or start from a classic pairing. Tools from different layers can be compared too: often the real question is no-code or code, robot or API, workflow or agent.">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PAIRS.map(([x, y]) => {
          const tx = tools.find((t) => t.id === x),
            ty = tools.find((t) => t.id === y);
          const on = a === x && b === y;
          return (
            <button
              key={x + y}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setA(x);
                setB(y);
              }}
              className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${on ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}
            >
              {tx?.name} vs {ty?.name}
            </button>
          );
        })}
      </div>
      <div className="rounded-[24px] border border-line bg-white p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {select(a, setA, "First tool")}
          {select(b, setB, "Second tool")}
        </div>
        <div className="mt-4 space-y-2">
          {AUTO_RATING_LABELS.map(([k, label]) => (
            <div key={k} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[12px]">
              <span className="flex justify-end gap-1">
                {[5, 4, 3, 2, 1].map((i) => (
                  <i key={i} className="h-2.5 w-[18%] max-w-8 rounded-full" style={{ background: i <= ta.ratings[k] ? A : "rgba(11,11,11,0.08)" }} />
                ))}
              </span>
              <span className="w-36 text-center text-ink-2/65">{label}</span>
              <span className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <i key={i} className="h-2.5 w-[18%] max-w-8 rounded-full" style={{ background: i <= tb.ratings[k] ? B : "rgba(11,11,11,0.08)" }} />
                ))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[ta, tb].map((t, i) => (
            <div key={`${t.id}-${i}`} className="rounded-2xl p-4" style={{ background: i ? "#fff3ec" : "#f6f3ee" }}>
              <div className="flex items-center gap-2">
                <ToolLogo t={t} logos={logos} size={18} />
                <p className="text-[1.15rem] font-semibold" style={{ color: i ? B : A }}>
                  {t.name}
                </p>
              </div>
              <p className="mt-1 font-mono text-[10.5px] text-ink-2/50">
                {t.layer} · {t.lang}
              </p>
              <p className="mt-2 text-[13px] leading-snug">{t.what}</p>
              <p className="mt-2 text-[12.5px] leading-snug">
                <span className="font-semibold text-[#0f6e4c]">+ </span>
                {t.strong}
              </p>
              <p className="mt-1 text-[12.5px] leading-snug">
                <span className="font-semibold text-[#a3302e]">− </span>
                {t.weak}
              </p>
              <p className="mt-2 text-[12.5px] leading-snug text-ink-2/70">
                <span className="font-semibold text-ink">Pick it for </span>
                {t.when.charAt(0).toLowerCase() + t.when.slice(1)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-2/50">Ratings are my rule of thumb for typical use, not benchmarks.</p>
      </div>
    </Section>
  );
}

/** A starting stack for seven common situations, with the reason for each pick and the alternatives. */
export function AutoStackPicker({ tools, logos }: { tools: AutoTool[]; logos: Record<string, Logo> }) {
  const [id, setId] = useState(AUTO_SCENARIOS[0].id);
  const s = AUTO_SCENARIOS.find((x) => x.id === id) ?? AUTO_SCENARIOS[0];
  const byId = new Map(tools.map((t) => [t.id, t]));
  return (
    <Section id="stack" kicker="05 · Pick a stack" title="Where would you start?" line="Seven common situations and a sensible starting stack for each, with the reason behind every pick and what to use instead. A starting point, not a rule." className="pb-10">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Situation">
        {AUTO_SCENARIOS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === id} onClick={() => setId(x.id)} className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${x.id === id ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink"}`}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-[24px] bg-ink p-5 text-white sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-white/45 uppercase">The situation</p>
        <p className="mt-1 text-[1.25rem] leading-snug font-semibold tracking-[-0.02em]">{s.need}</p>
        <div className="mt-5 grid gap-2 md:grid-cols-2">
          {s.picks.map((p) => {
            const t = byId.get(p.tool);
            if (!t) return null;
            return (
              <div key={p.layer + p.tool} className="rounded-2xl bg-white/[0.07] p-3.5">
                <p className="font-mono text-[10.5px] text-white/45">{p.layer}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <ToolLogo t={t} logos={logos} size={18} light />
                  <p className="text-[16px] font-semibold">
                    {t.name}
                    {t.mine && <span className="ml-2 rounded-full bg-[#eb6834] px-1.5 py-[1px] align-middle text-[9.5px] font-bold">I use it</span>}
                  </p>
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-white/75">{p.why}</p>
                {p.alt.length > 0 && <p className="mt-1.5 text-[11.5px] text-white/45">or: {p.alt.map((x) => byId.get(x)?.name ?? x).join(", ")}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
