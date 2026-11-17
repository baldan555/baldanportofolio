"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { r1 } from "@/components/analytics/charts/kit";
import type { Arch, ArchEdge, ArchNode, Flow, Ratings } from "./archs";

export type Logo = { path: string; hex: string };
/** Other parts of the page open an architecture in the gallery with this event. */
export const SELECT_EVENT = "arch:select";
export function openArch(id: Arch["id"]) {
  window.dispatchEvent(new CustomEvent(SELECT_EVENT, { detail: id }));
  document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const W = 764,
  H = 290,
  NW = 108,
  NH = 56;
const X = (c: number) => r1(10 + c * 128);
const Y = (r: number) => r1(24 + r * 92);
const ORANGE = "#eb6834";
const INK = "#0b0b0b";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
export const FLOW: Record<Flow, { color: string; note: string }> = {
  batch: { color: INK, note: "moves in scheduled chunks" },
  stream: { color: "#1baf7a", note: "flows continuously, event by event" },
  cdc: { color: "#2a78d6", note: "inserts, updates and deletes from the log" },
  reverse: { color: "#6250d6", note: "flows out of the warehouse into tools" },
};
const CDC_OPS = ["#1baf7a", "#c29a00", "#c8413f"];

/** A curved edge between two boxes: side to side when they are apart horizontally, top to bottom otherwise. */
function edgePath(a: ArchNode, b: ArchNode, v?: boolean) {
  const ax = X(a.c),
    ay = Y(a.r),
    bx = X(b.c),
    by = Y(b.r);
  if (!v && bx >= ax + NW - 1) {
    const x0 = ax + NW,
      y0 = ay + NH / 2,
      x1 = bx,
      y1 = by + NH / 2,
      m = r1((x0 + x1) / 2);
    return `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1}`;
  }
  if (!v && bx + NW <= ax + 1) {
    const x0 = ax,
      y0 = ay + NH / 2,
      x1 = bx + NW,
      y1 = by + NH / 2,
      m = r1((x0 + x1) / 2);
    return `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1}`;
  }
  const down = by > ay;
  const x0 = r1(ax + NW / 2),
    y0 = down ? ay + NH : ay,
    x1 = r1(bx + NW / 2),
    y1 = down ? by : by + NH,
    m = r1((y0 + y1) / 2);
  return `M${x0},${y0} C${x0},${m} ${x1},${m} ${x1},${y1}`;
}

/** Ambient packets: batch waits and moves in a clump, streams trickle, CDC alternates insert/update/delete colours. */
function Packets({ d, flow, k }: { d: string; flow: Flow; k: number }) {
  if (flow === "batch")
    return (
      <g>
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} r={2.6} fill={INK}>
            <animateMotion dur="4s" begin={`-${r1(k * 0.45 + i * 0.07)}s`} repeatCount="indefinite" path={d} keyPoints="0;0;1;1" keyTimes="0;0.5;0.8;1" calcMode="linear" />
          </circle>
        ))}
      </g>
    );
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <circle key={i} r={2.8} fill={flow === "cdc" ? CDC_OPS[(i + k) % 3] : FLOW[flow].color}>
          <animateMotion dur="1.8s" begin={`-${r1(i * 0.6 + k * 0.17)}s`} repeatCount="indefinite" path={d} />
        </circle>
      ))}
    </g>
  );
}

export function Diagram({ arch, step, logos }: { arch: Arch; step: number; logos: Record<string, Logo> }) {
  const byId = new Map(arch.nodes.map((n) => [n.id, n]));
  const lit = step < 0 ? null : new Set(arch.steps[step].node);
  const incoming = (e: ArchEdge) => !!lit && lit.has(e.to);
  // a step on a source node has no incoming edge: light its outgoing ones instead
  const sourceStep = !!lit && !arch.edges.some((e) => lit.has(e.to));
  const edgeOn = (e: ArchEdge) => !lit || incoming(e) || (sourceStep && lit.has(e.from));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[680px]" role="img" aria-label={`${arch.name}: ${arch.nodes.map((n) => n.label).join(", ")}`}>
      {arch.group && (
        <g>
          <rect x={X(arch.group.c0) - 10} y={Y(arch.group.r) - 26} width={X(arch.group.c1) - X(arch.group.c0) + NW + 20} height={NH + 38} rx={18} fill="#f4f1eb" stroke="rgba(11,11,11,0.12)" strokeDasharray="5 4" />
          <text x={X(arch.group.c0) - 2} y={Y(arch.group.r) - 11} fontSize={9} fill="rgba(11,11,11,0.55)" fontFamily={MONO}>
            {arch.group.label}
          </text>
        </g>
      )}
      {arch.edges.map((e, k) => {
        const a = byId.get(e.from) as ArchNode,
          b = byId.get(e.to) as ArchNode;
        const d = edgePath(a, b, e.v);
        const control = e.flow === "control";
        const on = edgeOn(e);
        const flow = (e.flow && e.flow !== "control" ? e.flow : arch.flow) as Flow;
        return (
          <g key={`${e.from}-${e.to}`} opacity={on ? 1 : 0.25} style={{ transition: "opacity .3s" }}>
            <path d={d} fill="none" stroke={control ? ORANGE : on && lit ? INK : "rgba(11,11,11,0.3)"} strokeWidth={on && lit ? 2 : 1.4} strokeDasharray={control ? "4 4" : undefined} />
            {!control && <Packets d={d} flow={flow} k={k} />}
            {!control && on && lit && (
              <circle r={5} fill={ORANGE} stroke="#fff" strokeWidth={1.5}>
                <animateMotion dur="1.5s" repeatCount="indefinite" path={d} />
              </circle>
            )}
          </g>
        );
      })}
      {arch.nodes.map((n) => {
        const on = !!lit && lit.has(n.id);
        const dim = !!lit && !on;
        const x = X(n.c),
          y = Y(n.r);
        const logo = n.icon ? logos[n.icon] : undefined;
        const lines = n.sub.split("\n");
        return (
          <g key={n.id} opacity={dim ? 0.35 : 1} style={{ transition: "opacity .3s" }}>
            <rect x={x} y={y} width={NW} height={NH} rx={12} fill={on ? INK : n.control ? "#fff6f1" : "#fff"} stroke={on ? INK : n.control ? ORANGE : "rgba(11,11,11,0.2)"} strokeDasharray={n.control && !on ? "4 3" : undefined} strokeWidth={1.3} />
            {logo && (
              <svg x={x + 8} y={y + 8} width={13} height={13} viewBox="0 0 24 24" aria-hidden>
                <path d={logo.path} fill={on ? "#fff" : `#${logo.hex}`} />
              </svg>
            )}
            {!logo && n.mono && (
              <text x={x + 8} y={y + 18} fontSize={8.5} fontWeight={800} fill={on ? "#fff" : ORANGE} fontFamily={MONO}>
                {n.mono}
              </text>
            )}
            <text x={x + (logo ? 26 : n.mono ? 30 : 9)} y={y + 18.5} fontSize={10.5} fontWeight={700} fill={on ? "#fff" : INK} fontFamily={FONT}>
              {n.label}
            </text>
            {lines.map((l, i) => (
              <text key={i} x={x + 9} y={y + 33 + i * 11} fontSize={8} fill={on ? "rgba(255,255,255,0.7)" : "rgba(11,11,11,0.55)"} fontFamily={MONO}>
                {l}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function Dots({ v, of = 5, color = INK }: { v: number; of?: number; color?: string }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${v} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className="h-2 w-2 rounded-full" style={{ background: i < v ? color : "rgba(11,11,11,0.12)" }} />
      ))}
    </span>
  );
}
export const RATING_LABELS: [keyof Ratings, string, string][] = [
  ["fresh", "Freshness", "how quickly new data shows up"],
  ["cost", "Running cost", "more dots = more expensive"],
  ["effort", "Build effort", "more dots = harder to build and run"],
  ["replay", "Replay & backfill", "how easy it is to rebuild history"],
];

function ArchView({ arch, logos }: { arch: Arch; logos: Record<string, Logo> }) {
  const [step, setStep] = useState(-1);
  const [auto, setAuto] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const n = arch.steps.length;

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => setStep((s) => (s + 1 >= n ? s : s + 1)), 3800);
    return () => window.clearInterval(id);
  }, [auto, n]);
  useEffect(() => {
    if (auto && step >= n - 1) {
      const id = window.setTimeout(() => setAuto(false), 3800);
      return () => window.clearTimeout(id);
    }
  }, [auto, step, n]);
  // on narrow screens the diagram scrolls sideways: bring the active box into view
  useEffect(() => {
    const el = box.current;
    if (!el || el.scrollWidth <= el.clientWidth + 2 || step < 0) return;
    const node = arch.nodes.find((x) => x.id === arch.steps[step].node[0]);
    if (!node) return;
    const cx = ((X(node.c) + NW / 2) / W) * el.scrollWidth;
    el.scrollLeft = Math.max(0, cx - el.clientWidth / 2);
  }, [step, arch]);

  const s = step >= 0 ? arch.steps[step] : null;
  return (
    <div className="space-y-3">
      <section className="rounded-[24px] border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase" style={{ color: FLOW[arch.flow].color === INK ? ORANGE : FLOW[arch.flow].color }}>
              {arch.real ? "The real setup of this portfolio" : "Reference design · example records"}
            </p>
            <h3 className="mt-1 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">{arch.name}</h3>
            <p className="mt-1 text-[14px] leading-snug text-ink-2/70">{arch.tagline}</p>
          </div>
          <span className="rounded-full bg-cream px-3 py-1 font-mono text-[11.5px]">latency: {arch.latency}</span>
        </div>
        <div ref={box} className="-mx-1 mt-3 overflow-x-auto px-1">
          <Diagram arch={arch} step={step} logos={logos} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-2/60">
          <span className="inline-flex items-center gap-1.5">
            {arch.flow === "cdc" ? (
              CDC_OPS.map((c) => <i key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />)
            ) : (
              <i className="h-2 w-2 rounded-full" style={{ background: FLOW[arch.flow].color }} />
            )}
            data {FLOW[arch.flow].note}
            {arch.flow === "cdc" && " (green insert, amber update, red delete)"}
          </span>
          {arch.edges.some((e) => e.flow === "control") && (
            <span className="inline-flex items-center gap-1.5">
              <i className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: ORANGE }} /> control, not data
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full border-2 border-white" style={{ background: ORANGE, boxShadow: "0 0 0 1px rgba(11,11,11,0.1)" }} /> the record you follow
          </span>
          <span className="md:hidden">swipe the diagram sideways</span>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-12">
        {/* follow one record */}
        <section className="flex min-w-0 flex-col rounded-[24px] bg-ink p-4 text-white sm:p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">Follow one record</p>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setStep((x) => Math.max(-1, x - 1))} disabled={step < 0} className="rounded-full px-3 py-1 text-[12.5px] ring-1 ring-white/20 disabled:opacity-30" aria-label="Previous step">
                ←
              </button>
              <button
                type="button"
                onClick={() => {
                  if (auto) setAuto(false);
                  else {
                    if (step >= n - 1) setStep(0);
                    setAuto(true);
                  }
                }}
                className="rounded-full bg-white px-3.5 py-1 text-[12.5px] font-semibold text-ink"
              >
                {auto ? "Pause" : step >= n - 1 ? "Replay" : "Play"}
              </button>
              <button type="button" onClick={() => setStep((x) => Math.min(n - 1, x + 1))} disabled={step >= n - 1} className="rounded-full px-3 py-1 text-[12.5px] ring-1 ring-white/20 disabled:opacity-30" aria-label="Next step">
                →
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            <button type="button" onClick={() => {
                setAuto(false);
                setStep(-1);
              }} className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${step < 0 ? "bg-white text-ink" : "bg-white/10 text-white/70"}`}>
              whole flow
            </button>
            {arch.steps.map((st, i) => (
              <button key={st.title} type="button" onClick={() => {
                  setAuto(false);
                  setStep(i);
                }} className={`h-7 w-7 rounded-full font-mono text-[11px] ${step === i ? "bg-[#eb6834] text-white" : i < step ? "bg-white/25 text-white" : "bg-white/10 text-white/70"}`} title={st.title}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 flex-1">
            {s ? (
              <>
                <p className="font-mono text-[11px] text-white/45">
                  step {step + 1} of {n} · {s.node.map((id) => arch.nodes.find((x) => x.id === id)?.label).join(" + ")}
                </p>
                <p className="mt-1 text-[1.25rem] leading-tight font-semibold tracking-[-0.02em]">{s.title}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/75">{s.body}</p>
                {s.record && (
                  <div className="mt-3 overflow-hidden rounded-xl bg-white/[0.07]">
                    <p className="border-b border-white/10 px-3 py-1 font-mono text-[10px] text-white/40">
                      {s.record.lang}
                      {arch.real ? " · real" : " · example"}
                    </p>
                    <pre className="overflow-x-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-white/90">{s.record.text}</pre>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[1.25rem] leading-tight font-semibold tracking-[-0.02em]">{arch.steps.length} hops from source to use</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/75">Press play to follow one record through the whole architecture, or pick a step. The diagram dims everything except where the record is.</p>
                <ol className="mt-3 space-y-1">
                  {arch.steps.map((st, i) => (
                    <li key={st.title} className="text-[12.5px] text-white/65">
                      <span className="mr-2 font-mono text-white/35">{i + 1}</span>
                      {st.title}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </section>

        {/* facts */}
        <section className="flex min-w-0 flex-col gap-3 rounded-[24px] border border-line bg-white p-4 sm:p-5 lg:col-span-5">
          <div className="grid grid-cols-2 gap-2">
            {RATING_LABELS.map(([k, label, hint]) => (
              <div key={k} className="rounded-xl bg-cream/50 px-3 py-2" title={hint}>
                <p className="text-[11px] text-ink-2/55">{label}</p>
                <div className="mt-1">
                  <Dots v={arch.ratings[k]} color={k === "cost" || k === "effort" ? ORANGE : INK} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div>
              <p className="text-[12px] font-semibold">Best for</p>
              <ul className="mt-1 space-y-1">
                {arch.best.map((b) => (
                  <li key={b} className="flex gap-2 text-[12.5px] leading-snug text-ink-2/75">
                    <span className="text-[#1baf7a]">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[12px] font-semibold">Watch out for</p>
              <ul className="mt-1 space-y-1">
                {arch.watch.map((b) => (
                  <li key={b} className="flex gap-2 text-[12.5px] leading-snug text-ink-2/75">
                    <span style={{ color: ORANGE }}>!</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-1">
            {arch.tools.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[5.5rem_1fr] gap-2 rounded-lg bg-cream/40 px-2.5 py-1.5 text-[12px]">
                <span className="font-semibold">{k}</span>
                <span className="text-ink-2/70">{v}</span>
              </div>
            ))}
          </div>
          {arch.seeAlso && (
            <Link href={arch.seeAlso.href} className="group mt-auto flex items-center justify-between gap-2 rounded-xl bg-ink px-3 py-2.5 text-[13px] text-white">
              {arch.seeAlso.label}
              <ArrowUpRight className="h-4 w-4 shrink-0 transition group-hover:rotate-45" />
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

export function ArchGallery({ archs, logos }: { archs: Arch[]; logos: Record<string, Logo> }) {
  const [id, setId] = useState(archs[1].id);
  const arch = archs.find((a) => a.id === id) ?? archs[0];
  useEffect(() => {
    const on = (e: Event) => setId((e as CustomEvent<Arch["id"]>).detail);
    window.addEventListener(SELECT_EVENT, on);
    return () => window.removeEventListener(SELECT_EVENT, on);
  }, []);
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Architectures">
        {archs.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={a.id === id}
            onClick={() => setId(a.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13.5px] whitespace-nowrap transition ${a.id === id ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink hover:text-ink"}`}
          >
            <i className="h-2 w-2 rounded-full" style={{ background: a.id === id ? "#fff" : FLOW[a.flow].color === INK ? "rgba(11,11,11,0.5)" : FLOW[a.flow].color }} />
            {a.short}
            {a.real && <span className={`rounded-full px-1.5 font-mono text-[9.5px] ${a.id === id ? "bg-white/20" : "bg-[#eb6834]/15 text-[#eb6834]"}`}>real</span>}
          </button>
        ))}
      </div>
      <ArchView key={arch.id} arch={arch} logos={logos} />
    </div>
  );
}
