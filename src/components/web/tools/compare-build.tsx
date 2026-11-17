"use client";

import { useState } from "react";
import { LAYERS, RATING_LABELS, SCENARIOS, type Layer, type WebTool } from "@/data/web-tools";
import type { Logo } from "../logos";
import { Section, ToolLogo } from "./shared";

const COLORS = ["#eb6834", "#2a78d6", "#1baf7a"];
const r1 = (v: number) => Math.round(v * 10) / 10;

/* ------------------------------------------------------------------ head-to-head */
const PAIRS: { layer: Layer; ids: string[] }[] = [
  { layer: "Frontend", ids: ["react", "vue", "svelte"] },
  { layer: "Meta-framework", ids: ["next", "nuxt", "astro"] },
  { layer: "Backend", ids: ["fastapi", "laravel", "go"] },
  { layer: "Data", ids: ["postgres", "mongodb", "firestore"] },
  { layer: "Mobile", ids: ["expo", "flutter", "kotlin"] },
];

function Radar({ picks }: { picks: WebTool[] }) {
  const cx = 160,
    cy = 150,
    R = 110;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / RATING_LABELS.length) * Math.PI * 2;
    return [r1(cx + Math.cos(a) * R * (v / 5)), r1(cy + Math.sin(a) * R * (v / 5))];
  };
  return (
    <svg viewBox="0 0 320 300" className="h-auto w-full" role="img" aria-label="Radar of rule-of-thumb ratings">
      {[1, 2, 3, 4, 5].map((ring) => (
        <polygon key={ring} points={RATING_LABELS.map((_, i) => pt(i, ring).join(",")).join(" ")} fill="none" stroke="rgba(11,11,11,0.08)" />
      ))}
      {RATING_LABELS.map(([k, label], i) => {
        const [x, y] = pt(i, 5.9);
        return (
          <g key={k}>
            <line x1={cx} y1={cy} x2={pt(i, 5)[0]} y2={pt(i, 5)[1]} stroke="rgba(11,11,11,0.08)" />
            <text x={x} y={y + 3} fontSize={9.5} textAnchor="middle" fill="rgba(11,11,11,0.6)" fontFamily="ui-sans-serif, system-ui, sans-serif">
              {label}
            </text>
          </g>
        );
      })}
      {picks.map((t, j) => (
        <polygon key={t.id} points={RATING_LABELS.map(([k], i) => pt(i, t.ratings[k]).join(",")).join(" ")} fill={COLORS[j]} fillOpacity={0.14} stroke={COLORS[j]} strokeWidth={2} style={{ transition: "all .4s" }} />
      ))}
    </svg>
  );
}

export function HeadToHead({ tools, logos }: { tools: WebTool[]; logos: Record<string, Logo> }) {
  const [layer, setLayer] = useState<Layer>("Frontend");
  const [ids, setIds] = useState<string[]>(PAIRS[0].ids);
  const row = tools.filter((t) => t.layer === layer);
  const picks = ids.map((id) => tools.find((t) => t.id === id)).filter((t): t is WebTool => !!t);
  const toggle = (id: string) => setIds((cur) => (cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : cur.length >= 3 ? [...cur.slice(1), id] : [...cur, id]));
  return (
    <Section id="compare" kicker="04 · Head-to-head" title="Pick a layer, compare up to three." line="Five rule-of-thumb ratings from building with these tools, not benchmarks. The text beside the radar is where the real differences are.">
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Layer">
        {PAIRS.map((p) => (
          <button
            key={p.layer}
            type="button"
            role="tab"
            aria-selected={layer === p.layer}
            onClick={() => {
              setLayer(p.layer);
              setIds(p.ids);
            }}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${layer === p.layer ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink"}`}
          >
            {p.layer}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {row.map((t) => {
          const j = ids.indexOf(t.id);
          return (
            <button key={t.id} type="button" onClick={() => toggle(t.id)} aria-pressed={j >= 0} className="flex items-center gap-2 rounded-xl border bg-white py-1 pr-3 pl-1 text-[12.5px] transition" style={{ borderColor: j >= 0 ? COLORS[j] : "rgba(11,11,11,0.1)", boxShadow: j >= 0 ? `inset 0 0 0 1px ${COLORS[j]}` : undefined }}>
              <ToolLogo t={t} logos={logos} size={13} />
              {t.name}
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)]">
        <div className="rounded-[24px] border border-line bg-cream/50 p-4">
          <Radar picks={picks} />
          <div className="flex flex-wrap justify-center gap-3 text-[12px]">
            {picks.map((t, j) => (
              <span key={t.id} className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[j] }} />
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <div className={`grid gap-3 ${picks.length === 3 ? "md:grid-cols-3" : picks.length === 2 ? "md:grid-cols-2" : ""}`}>
          {picks.map((t, j) => (
            <article key={t.id} className="flex flex-col rounded-[24px] border-2 bg-white p-4" style={{ borderColor: COLORS[j] }}>
              <div className="flex items-center gap-2">
                <ToolLogo t={t} logos={logos} size={18} />
                <p className="text-[16px] font-semibold">{t.name}</p>
              </div>
              <p className="mt-2 text-[12.5px] leading-snug text-ink-2/70">{t.what}</p>
              <p className="mt-3 text-[11px] font-semibold text-[#1baf7a]">Strong at</p>
              <p className="text-[12.5px] leading-snug">{t.strong}</p>
              <p className="mt-2 text-[11px] font-semibold text-[#c8413f]">Watch out</p>
              <p className="text-[12.5px] leading-snug">{t.weak}</p>
              <p className="mt-auto pt-3 text-[12px] text-ink-2/60">
                <span className="font-semibold text-ink">For </span>
                {t.when.charAt(0).toLowerCase() + t.when.slice(1)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ stack builder */
export function StackBuilder({ tools, logos }: { tools: WebTool[]; logos: Record<string, Logo> }) {
  const [sid, setSid] = useState("saas");
  const [swap, setSwap] = useState<Record<string, string>>({});
  const sc = SCENARIOS.find((s) => s.id === sid) ?? SCENARIOS[0];
  const byId = new Map(tools.map((t) => [t.id, t]));
  const layers = LAYERS.filter((L) => sc.picks[L.id]);
  return (
    <Section id="builder" kicker="05 · Stack builder" title="What would I pick for your project?" line="Choose what you're building. Each layer gets a pick and the reason for it; click an alternative to see how the choice changes." className="pb-10">
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Project">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={sid === s.id}
            onClick={() => {
              setSid(s.id);
              setSwap({});
            }}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${sid === s.id ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="rounded-[28px] bg-ink p-5 text-white sm:p-7">
        <p className="font-mono text-[11px] tracking-[0.16em] text-white/45 uppercase">{sc.label}</p>
        <p className="mt-1 max-w-2xl text-[1.3rem] leading-snug font-semibold tracking-[-0.02em]">{sc.need}</p>
        <div className="mt-5 space-y-2">
          {layers.map((L, i) => {
            const pick = sc.picks[L.id] as { tool: string; why: string; alt: string[] };
            const chosen = swap[L.id] ?? pick.tool;
            const t = byId.get(chosen) as WebTool;
            const isPick = chosen === pick.tool;
            return (
              <div key={L.id} className="grid gap-3 rounded-2xl bg-white/[0.06] p-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center">
                <p className="font-mono text-[11px] text-white/50">
                  0{i + 1} · {L.id}
                </p>
                <div className="flex min-w-0 items-start gap-3">
                  <ToolLogo t={t} logos={logos} size={20} light />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">
                      {t.name}
                      {t.mine && <span className="ml-2 rounded-full bg-[#eb6834]/25 px-1.5 py-0.5 font-mono text-[9.5px] text-[#ffb08f]">I use</span>}
                    </p>
                    <p className="text-[12.5px] leading-snug text-white/70">{isPick ? `because ${pick.why}` : `an alternative: good for ${t.when.charAt(0).toLowerCase() + t.when.slice(1)}`}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[pick.tool, ...pick.alt].map((id) => {
                    const a = byId.get(id) as WebTool;
                    return (
                      <button key={id} type="button" onClick={() => setSwap((s) => ({ ...s, [L.id]: id }))} aria-pressed={chosen === id} className={`rounded-full px-2.5 py-1 text-[11.5px] transition ${chosen === id ? "bg-white text-ink" : "bg-white/10 text-white/70 hover:text-white"}`}>
                        {a.name}
                        {id === pick.tool ? " ★" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11.5px] text-white/45">★ = my first pick for this kind of project. Layers not listed don&apos;t need a separate tool here.</p>
      </div>
    </Section>
  );
}
