"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { RUNS, tokensOf, type Msg } from "@/data/agent-runs";
import { useInView } from "../../web/concepts/flow";

/* The agent loop, message by message: what the model is sent on every call (the whole conversation so far), which
 * phase of the loop it's in, and how the context grows. Recorded example runs; the live one is the final page. */
const OR = "#eb6834";
const BL = "#2a78d6";
const GR = "#1baf7a";
type Phase = "setup" | "think" | "observe" | "answer" | "guard";
const phaseOf = (m: Msg): Phase => (m.role === "assistant" ? (m.call ? "think" : "answer") : m.role === "tool" ? "observe" : m.role === "guard" ? "guard" : "setup");
const n0 = (v: number) => v.toLocaleString("en-US");

function Bubble({ m, latest }: { m: Msg; latest: boolean }) {
  const ring = latest ? "ring-2 ring-[#eb6834]/50" : "";
  if (m.role === "system")
    return (
      <div className={`rounded-xl bg-[#f1efea] px-3 py-2 ${ring}`}>
        <p className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink-2/50 uppercase">system · instructions</p>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-2/80">{m.text}</p>
      </div>
    );
  if (m.role === "tools")
    return (
      <div className={`rounded-xl bg-ink px-3 py-2 text-white ${ring}`}>
        <p className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-white/50 uppercase">tool definitions</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {m.names.map((t) => (
            <span key={t} className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10.5px]">
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  if (m.role === "user")
    return (
      <div className={`ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-cream px-3 py-2 ${ring}`}>
        <p className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink-2/50 uppercase">user · the goal</p>
        <p className="mt-0.5 text-[12.5px] leading-snug">{m.text}</p>
      </div>
    );
  if (m.role === "assistant")
    return (
      <div className={`max-w-[92%] rounded-xl rounded-tl-sm border border-line bg-white px-3 py-2 ${ring}`}>
        <p className="font-mono text-[9.5px] font-bold tracking-[0.12em] uppercase" style={{ color: OR }}>
          assistant · {m.call ? "tool call" : "answer"}
        </p>
        {m.think && <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2/55 italic">{m.think}</p>}
        {m.call && (
          <p className="mt-1 rounded-lg px-2 py-1 font-mono text-[11px] leading-snug break-words text-white" style={{ background: OR }}>
            {m.call.name}({m.call.args})
          </p>
        )}
        {m.text && <p className="mt-0.5 text-[12.5px] leading-snug">{m.text}</p>}
      </div>
    );
  if (m.role === "tool")
    return (
      <div className={`max-w-[92%] rounded-xl bg-[#e7f0fb] px-3 py-2 ${ring}`}>
        <p className="font-mono text-[9.5px] font-bold tracking-[0.12em] uppercase" style={{ color: BL }}>
          tool result · {m.name}
        </p>
        <p className="mt-0.5 font-mono text-[11px] leading-snug break-words text-ink-2/80">{m.result}</p>
        {m.flag && <p className="mt-1 rounded-md bg-[#fdf0ee] px-2 py-0.5 text-[11px] text-[#a3302e]">⚠ {m.flag}</p>}
      </div>
    );
  return (
    <div className={`rounded-xl border border-dashed border-[#eb6834] bg-[#fff3ec] px-3 py-2 ${ring}`}>
      <p className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-[#a8461f] uppercase">harness · not sent to the model</p>
      <p className="mt-0.5 text-[12px] leading-snug">{m.text}</p>
    </div>
  );
}

function LoopRing({ phase }: { phase: Phase }) {
  const nodes: [Phase, string, number, number][] = [
    ["think", "Think & act", 110, 30],
    ["observe", "Observe", 180, 132],
    ["setup", "Read context", 40, 132],
  ];
  const active = phase === "answer" ? "answer" : phase === "guard" ? "guard" : phase;
  return (
    <svg viewBox="0 0 220 200" className="mx-auto block h-auto w-full max-w-[260px]" role="img" aria-label={`Agent loop, current phase: ${phase}`}>
      <circle cx={110} cy={98} r={66} fill="none" stroke="rgba(11,11,11,0.12)" strokeWidth={2} strokeDasharray="4 4" />
      <path d="M140,40 A66,66 0 0 1 172,110" fill="none" stroke={active === "think" ? OR : "rgba(11,11,11,0.2)"} strokeWidth={2} markerEnd="url(#lr)" />
      <path d="M160,150 A66,66 0 0 1 60,150" fill="none" stroke={active === "observe" ? BL : "rgba(11,11,11,0.2)"} strokeWidth={2} markerEnd="url(#lr)" />
      <path d="M48,110 A66,66 0 0 1 80,40" fill="none" stroke={active === "setup" ? "#0b0b0b" : "rgba(11,11,11,0.2)"} strokeWidth={2} markerEnd="url(#lr)" />
      <defs>
        <marker id="lr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="rgba(11,11,11,0.45)" />
        </marker>
      </defs>
      {nodes.map(([k, label, x, y]) => {
        const on = active === k;
        const col = k === "think" ? OR : k === "observe" ? BL : "#0b0b0b";
        return (
          <g key={k}>
            <rect x={x - 42} y={y - 14} width={84} height={28} rx={14} fill={on ? col : "#fff"} stroke={col} strokeWidth={1.5} />
            <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={on ? "#fff" : col} fontFamily="ui-sans-serif, system-ui">
              {label}
            </text>
          </g>
        );
      })}
      <text x={110} y={102} textAnchor="middle" fontSize={11} fontWeight={700} fill={active === "answer" ? GR : active === "guard" ? OR : "rgba(11,11,11,0.45)"} fontFamily="ui-sans-serif, system-ui">
        {active === "answer" ? "Answer ✓" : active === "guard" ? "Harness check" : "the loop"}
      </text>
    </svg>
  );
}

export function LoopSim() {
  const [id, setId] = useState(RUNS[0].id);
  const [i, setI] = useState(2);
  const [playing, setPlaying] = useState(true);
  const run = RUNS.find((r) => r.id === id) ?? RUNS[0];
  const [ref, inView] = useInView<HTMLDivElement>();
  const box = useRef<HTMLDivElement>(null);
  const last = run.msgs.length - 1;
  useEffect(() => {
    if (!playing || !inView || i >= last) return;
    const t = window.setTimeout(() => setI((x) => Math.min(last, x + 1)), 1700);
    return () => window.clearTimeout(t);
  }, [playing, inView, i, last]);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [i, id]);
  const shown = run.msgs.slice(0, i + 1);
  const sent = (k: number) => run.msgs.slice(0, k).filter((m) => m.role !== "guard");
  const ctx = shown.filter((m) => m.role !== "guard").reduce((a, m) => a + tokensOf(m), 0);
  const calls = shown.filter((m) => m.role === "assistant").length;
  const toolCalls = shown.filter((m) => m.role === "assistant" && m.call).length;
  const processed = run.msgs.slice(0, i + 1).reduce((a, m, k) => (m.role === "assistant" ? a + sent(k).reduce((s, x) => s + tokensOf(x), 0) : a), 0);
  const fullCtx = run.msgs.filter((m) => m.role !== "guard").reduce((a, m) => a + tokensOf(m), 0);
  const cur = run.msgs[i];
  const lastCall = [...shown.keys()].reverse().find((k) => run.msgs[k].role === "assistant");
  const thisCall = lastCall != null ? sent(lastCall).reduce((s, x) => s + tokensOf(x), 0) : 0;
  const pick = (next: string) => {
    setId(next);
    setI(2);
    setPlaying(true);
  };
  return (
    <div ref={ref} className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {RUNS.map((r) => (
          <button key={r.id} type="button" aria-pressed={r.id === id} onClick={() => pick(r.id)} className={`rounded-2xl px-3.5 py-2 text-left transition ${r.id === id ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}>
            <span className="block text-[13px] font-semibold">{r.title}</span>
            <span className={`block text-[11px] ${r.id === id ? "text-white/55" : "text-ink-2/50"}`}>{r.shows}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-[24px] border border-line bg-[#fbfaf7] p-3">
          <p className="px-1 text-[12px] font-semibold">What the model is sent, growing with every step</p>
          <div ref={box} data-lenis-prevent className="mt-2 h-[460px] space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {shown.map((m, k) => (
                <motion.div key={`${id}-${k}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <Bubble m={m} latest={k === i} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="rounded-[24px] border border-line bg-white p-4">
            <LoopRing phase={phaseOf(cur)} />
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <button type="button" aria-label="Restart" onClick={() => setI(2)} className="rounded-full p-2 ring-1 ring-line hover:ring-ink">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setPlaying((p) => !p)} className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-[12.5px] font-semibold text-white">
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {playing ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                aria-label="Next step"
                disabled={i >= last}
                onClick={() => {
                  setPlaying(false);
                  setI((x) => Math.min(last, x + 1));
                }}
                className="rounded-full p-2 ring-1 ring-line hover:ring-ink disabled:opacity-30"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["Model calls", `${calls} of max ${run.maxSteps}`],
                ["Tool calls", String(toolCalls)],
                ["This call sends", `≈ ${n0(thisCall)} tokens`],
                ["Tokens processed so far", `≈ ${n0(processed)}`],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-line bg-white px-3 py-2.5">
                <p className="text-[10.5px] text-ink-2/55">{k}</p>
                <p className="mt-0.5 text-[1.05rem] leading-tight font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-line bg-white px-3 py-2.5">
            <p className="flex justify-between text-[10.5px] text-ink-2/55">
              Context so far <span className="font-mono">≈ {n0(ctx)} tokens</span>
            </p>
            <div className="mt-1.5 h-2.5 rounded-full bg-cream">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, (ctx / fullCtx) * 100)}%`, background: OR }} />
            </div>
          </div>
          {i >= last && <p className="rounded-2xl bg-ink px-4 py-3 text-[12.5px] leading-snug text-white">{run.ending}</p>}
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">Recorded example runs written to show how the loop works, not live model output; token counts are estimates (about four characters per token, tool definitions counted as their JSON). The Prompt → automation page runs a real model.</p>
    </div>
  );
}
