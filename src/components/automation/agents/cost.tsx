"use client";

import { useEffect, useMemo, useState } from "react";
import type { ModelInfo } from "@/lib/openrouter-models";
import { useWidth } from "../../data-eng/use-width";

/*
 * What an agent costs to run, from live model prices (OpenRouter's public list, through this site's daily-cached
 * route) and the visitor's own assumptions. The key effect: every step re-sends the whole conversation, so input
 * tokens grow with each step and the total grows faster than the number of steps.
 */
const OR = "#eb6834";
const usd = (v: number) => (v === 0 ? "$0" : v < 0.01 ? `$${v.toFixed(4)}` : v < 1 ? `$${v.toFixed(3)}` : v < 1000 ? `$${v.toFixed(2)}` : `$${Math.round(v).toLocaleString("en-US")}`);
const kt = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(Math.round(v)));

function Slider({ label, value, min, max, step, show, onChange }: { label: string; value: number; min: number; max: number; step: number; show: string; onChange: (v: number) => void }) {
  return (
    <label className="block text-[12px] font-semibold">
      <span className="flex justify-between gap-2">
        {label} <span className="font-mono">{show}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full" style={{ accentColor: OR }} />
    </label>
  );
}

export function AgentCost() {
  const [models, setModels] = useState<ModelInfo[] | "error" | null>(null);
  const [q, setQ] = useState("");
  const [toolsOnly, setToolsOnly] = useState(true);
  const [id, setId] = useState("");
  const [steps, setSteps] = useState(6);
  const [base, setBase] = useState(2000);
  const [added, setAdded] = useState(600);
  const [out, setOut] = useState(250);
  const [perDay, setPerDay] = useState(100);
  const [ref, w] = useWidth(560);
  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/models", { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { models: ModelInfo[] }) => {
        setModels(j.models);
        const pick = j.models.find((m) => m.tools && /claude-sonnet/i.test(m.id)) ?? j.models.find((m) => m.tools && m.inM > 0) ?? j.models[0];
        if (pick) setId(pick.id);
      })
      .catch((e: Error) => e.name !== "AbortError" && setModels("error"));
    return () => ctl.abort();
  }, []);
  const list = useMemo(() => {
    if (!models || models === "error") return [];
    const s = q.trim().toLowerCase();
    return models.filter((m) => (!toolsOnly || m.tools) && (!s || `${m.name} ${m.id}`.toLowerCase().includes(s)));
  }, [models, q, toolsOnly]);
  const m = models && models !== "error" ? (models.find((x) => x.id === id) ?? null) : null;
  // tokens sent on each call: the fixed part, plus everything added and written on earlier steps
  const per = Array.from({ length: steps }, (_, i) => base + i * (added + out));
  const inTok = per.reduce((a, b) => a + b, 0);
  const outTok = steps * out;
  const cost = m ? (inTok * m.inM + outTok * m.outM) / 1e6 : 0;
  const single = m ? (base * m.inM + out * m.outM) / 1e6 : 0;
  const tooBig = m && m.ctx > 0 && per[per.length - 1] > m.ctx;
  const H = 150,
    L = 44,
    R = 8,
    T = 10,
    B = 22;
  const max = Math.max(...per, 1);
  const bw = (w - L - R) / steps;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-3 rounded-[22px] border border-line bg-white p-4">
          <div>
            <p className="text-[12px] font-semibold">Model and its live price</p>
            {models === "error" ? (
              <p className="mt-1 text-[12.5px] text-[#a3302e]">The model list couldn&apos;t be loaded right now.</p>
            ) : !models ? (
              <p className="mt-1 text-[12.5px] text-ink-2/55">Loading prices…</p>
            ) : (
              <>
                <div className="mt-1.5 flex gap-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter: claude, gpt, gemini, llama…" aria-label="Filter models" className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-[12.5px] outline-none focus:border-ink" />
                  <label className="flex shrink-0 items-center gap-1.5 text-[11.5px]">
                    <input type="checkbox" checked={toolsOnly} onChange={(e) => setToolsOnly(e.target.checked)} style={{ accentColor: OR }} />
                    tool calling
                  </label>
                </div>
                <select value={id} onChange={(e) => setId(e.target.value)} aria-label="Model" className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2 text-[12.5px] outline-none focus:border-ink">
                  {m && !list.some((x) => x.id === m.id) && <option value={m.id}>{m.name}</option>}
                  {list.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · ${x.inM}/${x.outM}
                    </option>
                  ))}
                </select>
                {m && (
                  <p className="mt-1.5 font-mono text-[11px] text-ink-2/60">
                    ${m.inM} per 1M input · ${m.outM} per 1M output · context {kt(m.ctx)} tokens
                  </p>
                )}
              </>
            )}
          </div>
          <Slider label="Steps (model calls) per task" value={steps} min={1} max={30} step={1} show={String(steps)} onChange={setSteps} />
          <Slider label="Instructions + tool definitions" value={base} min={200} max={20000} step={100} show={`${kt(base)} tokens`} onChange={setBase} />
          <Slider label="Tool results added per step" value={added} min={50} max={8000} step={50} show={`${kt(added)} tokens`} onChange={setAdded} />
          <Slider label="Written by the model per step" value={out} min={20} max={2000} step={10} show={`${kt(out)} tokens`} onChange={setOut} />
          <Slider label="Tasks per day" value={perDay} min={1} max={5000} step={1} show={perDay.toLocaleString("en-US")} onChange={setPerDay} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["Per task", m ? usd(cost) : "—"],
                ["Per month", m ? usd(cost * perDay * 30) : "—"],
                ["Tokens per task", `${kt(inTok + outTok)}`],
                ["vs one call", m && single > 0 ? `${Math.round(cost / single)}×` : "—"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-line bg-white px-3 py-2.5">
                <p className="text-[10.5px] text-ink-2/55">{k}</p>
                <p className="mt-0.5 text-[1.2rem] leading-tight font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          <div ref={ref} className="rounded-[22px] bg-[#fbfaf7] p-3">
            <p className="mb-1 text-[11.5px] font-semibold">Input tokens sent on each call</p>
            <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="block h-auto max-w-full" role="img" aria-label="Input tokens sent on each step">
              {[0, 0.5, 1].map((f) => (
                <g key={f}>
                  <line x1={L} x2={w - R} y1={T + (H - T - B) * (1 - f)} y2={T + (H - T - B) * (1 - f)} stroke="rgba(11,11,11,0.07)" />
                  <text x={L - 5} y={T + (H - T - B) * (1 - f) + 3} fontSize={9.5} textAnchor="end" fill="rgba(11,11,11,0.5)" fontFamily="ui-monospace, monospace">
                    {kt(max * f)}
                  </text>
                </g>
              ))}
              {per.map((v, i) => {
                const h = ((H - T - B) * v) / max;
                return <rect key={i} x={L + i * bw + 1} y={H - B - h} width={Math.max(1, bw - 2)} height={h} rx={2} fill={m && m.ctx > 0 && v > m.ctx ? "#c8413f" : i === per.length - 1 ? OR : "rgba(11,11,11,0.55)"} />;
              })}
              {[0, steps - 1].map((i) => (
                <text key={i} x={L + i * bw + bw / 2} y={H - 6} fontSize={9.5} textAnchor="middle" fill="rgba(11,11,11,0.5)" fontFamily="ui-sans-serif, system-ui">
                  step {i + 1}
                </text>
              ))}
            </svg>
          </div>
          {tooBig && <p className="rounded-xl bg-[#fdf0ee] px-3 py-2 text-[12.5px] text-[#a3302e]">The last steps don&apos;t fit this model&apos;s context window: the conversation must be summarised or split.</p>}
          <p className="rounded-xl bg-cream/60 px-3 py-2.5 text-[12.5px] leading-snug">Each call re-sends everything so far, so {steps} steps send {kt(inTok)} input tokens, not {kt(base + steps * added)}. Ways down: fewer steps, shorter tool results, a smaller model for easy steps, and prompt caching for the repeated start (check your provider).</p>
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        Prices: live from{" "}
        <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer" className="underline">
          OpenRouter&apos;s public model list
        </a>
        , refreshed daily. Token amounts are your assumptions; real runs vary, and caching, batching and reasoning tokens change the bill.
      </p>
    </div>
  );
}
