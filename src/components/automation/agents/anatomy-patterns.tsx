"use client";

import { useState } from "react";
import { PARTS, PATTERNS } from "@/data/agent-patterns";
import { FlowCard, FlowPlayer } from "../../web/concepts/flow";

/* ------------------------------------------------------------------ the parts of an agent */
const W = 120;
const H = 46;
export function Anatomy() {
  const [sel, setSel] = useState("model");
  const p = PARTS.find((x) => x.id === sel) ?? PARTS[0];
  const center = PARTS[0];
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-[24px] border border-line bg-[#fbfaf7] p-3">
        <div className="overflow-x-auto">
          <svg viewBox="0 0 520 340" className="block h-auto w-full min-w-[460px]" role="img" aria-label="The parts of an AI agent around the model">
            {PARTS.slice(1).map((q) => (
              <line key={q.id} x1={center.x} y1={center.y} x2={q.x} y2={q.y} stroke={q.id === sel ? "#eb6834" : "rgba(11,11,11,0.15)"} strokeWidth={q.id === sel ? 2 : 1.2} strokeDasharray={q.id === sel ? undefined : "4 4"} />
            ))}
            {PARTS.map((q) => {
              const on = q.id === sel;
              const big = q.id === "model";
              const w = big ? 150 : W,
                h = big ? 64 : H;
              return (
                <g key={q.id} role="button" tabIndex={0} onClick={() => setSel(q.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(q.id)} style={{ cursor: "pointer" }}>
                  <rect x={q.x - w / 2} y={q.y - h / 2} width={w} height={h} rx={14} fill={big ? "#0b0b0b" : on ? "#eb6834" : "#fff"} stroke={on ? "#eb6834" : big ? "#0b0b0b" : "rgba(11,11,11,0.2)"} strokeWidth={on ? 2.5 : 1.2} />
                  <text x={q.x} y={q.y - (big ? 4 : 3)} textAnchor="middle" fontSize={big ? 15 : 12} fontWeight={750} fill={big || on ? "#fff" : "#0b0b0b"} fontFamily="ui-sans-serif, system-ui">
                    {q.label}
                  </text>
                  <text x={q.x} y={q.y + (big ? 14 : 12)} textAnchor="middle" fontSize={9.5} fill={big || on ? "rgba(255,255,255,0.7)" : "rgba(11,11,11,0.5)"} fontFamily="ui-sans-serif, system-ui">
                    {q.short}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="mt-1 px-1 text-[11.5px] text-ink-2/50">Click a part.</p>
      </div>
      <div className="flex min-w-0 flex-col rounded-[24px] bg-ink p-5 text-white">
        <p className="font-mono text-[10.5px] tracking-[0.16em] text-white/45 uppercase">{p.short}</p>
        <h3 className="mt-1 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">{p.label}</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/80">{p.detail}</p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-white/[0.08] p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-white/85">{p.example}</pre>
        <div className="mt-3 rounded-xl bg-white/[0.06] p-3">
          <p className="text-[11px] font-semibold text-[#ff9b72]">Without it</p>
          <p className="mt-0.5 text-[13px] leading-snug text-white/80">{p.without}</p>
        </div>
        <div className="mt-auto flex flex-wrap gap-1 pt-4">
          {PARTS.map((q) => (
            <button key={q.id} type="button" onClick={() => setSel(q.id)} className={`rounded-full px-2.5 py-1 text-[11px] transition ${q.id === sel ? "bg-white text-ink" : "bg-white/[0.08] text-white/70 hover:text-white"}`}>
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ patterns */
const Dots = ({ n }: { n: number }) => (
  <span className="inline-flex gap-[3px]" aria-label={`${n} of 3`}>
    {[1, 2, 3].map((i) => (
      <i key={i} className="h-2 w-2 rounded-full" style={{ background: i <= n ? "#0b0b0b" : "rgba(11,11,11,0.12)" }} />
    ))}
  </span>
);
export function Patterns() {
  const [sel, setSel] = useState("react");
  const [kind, setKind] = useState<"all" | "workflow" | "agent">("all");
  const p = PATTERNS.find((x) => x.id === sel) ?? PATTERNS[0];
  const list = PATTERNS.filter((x) => kind === "all" || x.kind === kind);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <FlowPlayer key={p.id} flow={p.flow} />
        </div>
        <div className="flex min-w-0 flex-col rounded-[24px] border border-line bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase" style={{ background: p.kind === "agent" ? "#fff3ec" : "#eaf2fb", color: p.kind === "agent" ? "#a8461f" : "#1d5aa6" }}>
              {p.kind === "agent" ? "agent: decides its own steps" : "workflow: steps fixed in code"}
            </span>
          </div>
          <h3 className="mt-2 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">{p.name}</h3>
          <p className="mt-1.5 text-[14px] leading-snug text-ink/80">{p.short}</p>
          <dl className="mt-4 space-y-2 text-[13px]">
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-ink-2/55">Use it when</dt>
              <dd>{p.when}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-ink-2/55">Model calls per task</dt>
              <dd className="font-mono">{p.calls}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] items-center gap-2">
              <dt className="text-ink-2/55">Predictable</dt>
              <dd>
                <Dots n={p.predictable} />
              </dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-ink-2/55">For example</dt>
              <dd className="text-ink-2/80">{p.example}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["all", `All ${PATTERNS.length}`],
            ["workflow", "Workflows"],
            ["agent", "Agents"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${kind === k ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((x) => (
          <button key={x.id} type="button" aria-pressed={x.id === sel} onClick={() => setSel(x.id)} className={`flex flex-col rounded-[20px] border bg-white p-2.5 text-left transition hover:-translate-y-0.5 ${x.id === sel ? "border-ink shadow-[0_0_0_1px_#0b0b0b]" : "border-line hover:border-ink/40"}`}>
            <FlowCard flow={x.flow} />
            <p className="mt-2 flex items-center justify-between gap-2 px-1">
              <span className="text-[14px] leading-tight font-semibold">
                <span className="mr-1 font-mono text-[10.5px] text-muted">{String(PATTERNS.indexOf(x) + 1).padStart(2, "0")}</span>
                {x.name}
              </span>
              <span className="shrink-0 rounded-full px-1.5 py-[1px] font-mono text-[9.5px] font-bold uppercase" style={{ background: x.kind === "agent" ? "#fff3ec" : "#eaf2fb", color: x.kind === "agent" ? "#a8461f" : "#1d5aa6" }}>
                {x.kind}
              </span>
            </p>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[22px] border border-line bg-white">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-4 py-2.5 font-mono text-[10.5px] font-normal text-ink-2/50 uppercase">pattern</th>
              <th className="px-3 py-2.5 font-semibold">Steps decided by</th>
              <th className="px-3 py-2.5 font-semibold">Model calls per task</th>
              <th className="px-3 py-2.5 font-semibold">Predictable</th>
              <th className="px-3 py-2.5 font-semibold">Use it when</th>
            </tr>
          </thead>
          <tbody>
            {PATTERNS.map((x) => (
              <tr key={x.id} onClick={() => setSel(x.id)} className={`cursor-pointer border-b border-line last:border-0 ${x.id === sel ? "bg-cream" : "hover:bg-cream/50"}`}>
                <td className="px-4 py-2 font-semibold">{x.name}</td>
                <td className="px-3 py-2">{x.kind === "agent" ? "the model" : "your code"}</td>
                <td className="px-3 py-2 font-mono">{x.calls}</td>
                <td className="px-3 py-2">
                  <Dots n={x.predictable} />
                </td>
                <td className="px-3 py-2 text-ink-2/70">{x.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">Names follow common usage, including Anthropic&apos;s “Building effective agents”. The rule most practitioners share: start with the simplest pattern that works, and add autonomy only where fixed steps fall short.</p>
    </div>
  );
}
