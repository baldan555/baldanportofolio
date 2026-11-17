"use client";

import { motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import type { FIcon, Flow, FNode, FTone } from "@/data/web-flows";

/*
 * The concept flow engine: nodes with icons, and steps that send a labelled packet along a curved lane from one node
 * to the next. Requests and responses between the same two nodes use opposite lanes. The node receiving a packet
 * pulses; a blocked step stops halfway with a red cross.
 */
const W = 320;
const H = 150;
const INK = "#0b0b0b";
export const TONE: Record<FTone, string> = { req: "#eb6834", res: "#1baf7a", ok: "#1baf7a", bad: "#c8413f", data: "#2a78d6" };
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const r1 = (v: number) => Math.round(v * 10) / 10;
const STEP_MS = 2300;

/* ------------------------------------------------------------------ geometry */
export function nodeSize(n: FNode) {
  const w = n.w ?? Math.max(n.icon ? 74 : 64, Math.min(124, Math.max(n.label.length * 5.2 + (n.icon ? 30 : 16), (n.sub?.length ?? 0) * 4.2 + (n.icon ? 30 : 16))));
  return { w: Math.round(w), h: n.h ?? (n.sub ? 38 : 30) };
}
function exit(a: FNode, tx: number, ty: number) {
  const { w, h } = nodeSize(a);
  const dx = tx - a.x,
    dy = ty - a.y;
  const t = Math.min(dx ? w / 2 / Math.abs(dx) : Infinity, dy ? h / 2 / Math.abs(dy) : Infinity);
  return [a.x + dx * t, a.y + dy * t];
}
/** A curved lane from a to b; the side of the bend depends on direction, so a→b and b→a never overlap. */
function lane(a: FNode, b: FNode) {
  if (a.id === b.id) {
    // a step a node does to itself: a small arc above it
    const { w, h } = nodeSize(a);
    const x0 = a.x - w / 4,
      x1 = a.x + w / 4,
      y0 = a.y - h / 2,
      cy = y0 - 34;
    const at = (t: number) => [r1((1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * a.x + t * t * x1), r1((1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y0)];
    return { d: `M${r1(x0)},${r1(y0)} Q${r1(a.x)},${r1(cy)} ${r1(x1)},${r1(y0)}`, at };
  }
  const forward = a.x < b.x || (a.x === b.x && a.y < b.y);
  const bend = (forward ? -1 : 1) * 13;
  const mx = (a.x + b.x) / 2,
    my = (a.y + b.y) / 2;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bend,
    cy = my + (dx / len) * bend;
  const [x0, y0] = exit(a, cx, cy);
  const [x1, y1] = exit(b, cx, cy);
  const at = (t: number) => [r1((1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1), r1((1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1)];
  return { d: `M${r1(x0)},${r1(y0)} Q${r1(cx)},${r1(cy)} ${r1(x1)},${r1(y1)}`, at };
}

/* ------------------------------------------------------------------ icons (16×16 box) */
export function Glyph({ icon, x, y, color }: { icon: FIcon; x: number; y: number; color: string }) {
  const p = { fill: "none", stroke: color, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const g = (() => {
    switch (icon) {
      case "browser":
        return (
          <>
            <rect x={1} y={2.5} width={14} height={11} rx={2} {...p} />
            <path d="M1 5.8h14" {...p} />
          </>
        );
      case "server":
        return (
          <>
            <rect x={2} y={2} width={12} height={5} rx={1.5} {...p} />
            <rect x={2} y={9} width={12} height={5} rx={1.5} {...p} />
            <circle cx={4.8} cy={4.5} r={0.6} fill={color} />
            <circle cx={4.8} cy={11.5} r={0.6} fill={color} />
          </>
        );
      case "db":
        return (
          <>
            <ellipse cx={8} cy={3.5} rx={5.5} ry={2} {...p} />
            <path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" {...p} />
          </>
        );
      case "phone":
        return (
          <>
            <rect x={4} y={1} width={8} height={14} rx={2} {...p} />
            <circle cx={8} cy={12.3} r={0.7} fill={color} />
          </>
        );
      case "user":
        return (
          <>
            <circle cx={8} cy={5} r={3} {...p} />
            <path d="M2.5 14.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" {...p} />
          </>
        );
      case "cloud":
        return <path d="M4.5 13h7.5a3 3 0 0 0 .3-6A4.3 4.3 0 0 0 4 6.6 3.2 3.2 0 0 0 4.5 13z" {...p} />;
      case "globe":
        return (
          <>
            <circle cx={8} cy={8} r={6} {...p} />
            <ellipse cx={8} cy={8} rx={2.6} ry={6} {...p} />
            <path d="M2 8h12" {...p} />
          </>
        );
      case "code":
        return <path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9 3 7 13" {...p} />;
      case "file":
        return <path d="M4 1.5h5.5L13 5v9.5H4zM9.5 1.5V5H13" {...p} />;
      case "box":
        return (
          <>
            <path d="M8 1.8 14 5v6.2L8 14.4 2 11.2V5z" {...p} />
            <path d="M2 5l6 3.2L14 5M8 8.2v6.2" {...p} />
          </>
        );
      case "shield":
        return <path d="M8 1.5 13.5 3.5v4.2c0 3.2-2.3 5.6-5.5 6.8C4.8 13.3 2.5 10.9 2.5 7.7V3.5z" {...p} />;
      case "queue":
        return (
          <>
            <rect x={2} y={2.5} width={12} height={3} rx={1} {...p} />
            <rect x={2} y={6.5} width={12} height={3} rx={1} {...p} />
            <rect x={2} y={10.5} width={12} height={3} rx={1} {...p} />
          </>
        );
      case "key":
        return (
          <>
            <circle cx={5} cy={8} r={3} {...p} />
            <path d="M8 8h6.5M12 8v2.5M14 8v2" {...p} />
          </>
        );
      case "bolt":
        return <path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z" {...p} />;
      case "chart":
        return <path d="M2 14h12M4 12V8M7.3 12V4M10.6 12V9.5M13.5 12V6" {...p} />;
      case "bell":
        return <path d="M3.5 11.5h9l-1.2-1.6V7a3.3 3.3 0 0 0-6.6 0v2.9zM6.8 13.4a1.3 1.3 0 0 0 2.4 0" {...p} />;
      case "lock":
        return (
          <>
            <rect x={3} y={7} width={10} height={7.5} rx={1.5} {...p} />
            <path d="M5.3 7V5a2.7 2.7 0 0 1 5.4 0v2" {...p} />
          </>
        );
      case "clock":
        return (
          <>
            <circle cx={8} cy={8} r={6} {...p} />
            <path d="M8 4.5V8l2.5 1.5" {...p} />
          </>
        );
      case "robot":
        return (
          <>
            <rect x={2.5} y={5} width={11} height={8.5} rx={2} {...p} />
            <path d="M8 5V2.5M5.5 13.5v1.5M10.5 13.5v1.5M1 9h1.5M13.5 9H15" {...p} />
            <circle cx={5.8} cy={8.8} r={0.9} fill={color} />
            <circle cx={10.2} cy={8.8} r={0.9} fill={color} />
          </>
        );
      case "spark":
        return <path d="M8 1.5c.6 3.4 2.1 4.9 5.5 5.5-3.4.6-4.9 2.1-5.5 5.5-.6-3.4-2.1-4.9-5.5-5.5C5.9 6.4 7.4 4.9 8 1.5zM13 11.5c.2 1.2.8 1.8 2 2-1.2.2-1.8.8-2 2-.2-1.2-.8-1.8-2-2 1.2-.2 1.8-.8 2-2z" {...p} />;
      case "chat":
        return <path d="M2 3.5h12v7.5H7l-3 2.5V11H2z" {...p} />;
      case "sheet":
        return (
          <>
            <rect x={1.5} y={2.5} width={13} height={11} rx={1.5} {...p} />
            <path d="M1.5 6.2h13M1.5 9.8h13M6 2.5v11" {...p} />
          </>
        );
      case "mail":
        return (
          <>
            <rect x={1.5} y={3.5} width={13} height={9} rx={1.5} {...p} />
            <path d="M2 4.2 8 9l6-4.8" {...p} />
          </>
        );
      default:
        return null;
    }
  })();
  return <g transform={`translate(${r1(x)} ${r1(y)})`}>{g}</g>;
}

/* ------------------------------------------------------------------ the canvas */
const NODE: Record<string, { fill: string; stroke: string; text: string; sub: string; icon: string }> = {
  default: { fill: "#ffffff", stroke: "rgba(11,11,11,0.16)", text: INK, sub: "rgba(11,11,11,0.55)", icon: "rgba(11,11,11,0.7)" },
  dark: { fill: INK, stroke: INK, text: "#ffffff", sub: "rgba(255,255,255,0.6)", icon: "#ffffff" },
  ok: { fill: "#eaf8f1", stroke: "#1baf7a", text: "#0f6e4c", sub: "rgba(15,110,76,0.7)", icon: "#1baf7a" },
  bad: { fill: "#fdf0ee", stroke: "#c8413f", text: "#a3302e", sub: "rgba(163,48,46,0.7)", icon: "#c8413f" },
  accent: { fill: "#fff3ec", stroke: "#eb6834", text: "#a8461f", sub: "rgba(168,70,31,0.7)", icon: "#eb6834" },
};

export function FlowCanvas({ flow, step, run }: { flow: Flow; step: number; run: number }) {
  const pid = `dots${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const byId = new Map(flow.nodes.map((n) => [n.id, n]));
  const cur = flow.steps[step];
  const seen = new Set<string>();
  const tracks = flow.steps.filter((s) => {
    const k = `${s.from}>${s.to}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const a = byId.get(cur.from) as FNode,
    b = byId.get(cur.to) as FNode;
  const L = lane(a, b);
  const color = TONE[cur.tone ?? "req"];
  const N = 16;
  const end = cur.stop ? 0.55 : 1;
  const pts = Array.from({ length: N + 1 }, (_, i) => L.at((i / N) * end));
  const tw = Math.round(cur.tag.length * 4.55 + 12);
  const [sx, sy] = L.at(end);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={flow.steps.map((s) => s.tag).join(", ")}>
      <defs>
        <pattern id={pid} width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="rgba(11,11,11,0.08)" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#${pid})`} />
      {/* every lane, faint */}
      {tracks.map((s) => {
        const t = lane(byId.get(s.from) as FNode, byId.get(s.to) as FNode);
        return <path key={`${s.from}>${s.to}`} d={t.d} fill="none" stroke="rgba(11,11,11,0.13)" strokeWidth={1.2} strokeDasharray="2 3" />;
      })}
      {/* the active lane */}
      <path key={`lane-${run}-${step}`} d={L.d} fill="none" stroke={color} strokeWidth={1.8} strokeDasharray="5 4" opacity={0.85}>
        <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.9s" repeatCount="indefinite" />
      </path>
      {/* nodes */}
      {flow.nodes.map((n) => {
        const { w, h } = nodeSize(n);
        const st = NODE[n.tone ?? "default"];
        const x = n.x - w / 2,
          y = n.y - h / 2;
        const sending = n.id === cur.from;
        const hasIcon = !!n.icon;
        const tx = hasIcon ? x + 25 : n.x;
        return (
          <g key={n.id}>
            {n.id === cur.to && (
              <motion.rect
                key={`pulse-${run}-${step}`}
                x={r1(x - 3)}
                y={r1(y - 3)}
                width={w + 6}
                height={h + 6}
                rx={12}
                fill="none"
                stroke={cur.stop ? TONE.bad : color}
                strokeWidth={2}
                initial={{ opacity: 0 }}
                animate={{ opacity: cur.stop ? 0 : [0, 0.95, 0] }}
                transition={{ duration: 0.8, delay: 0.85 }}
              />
            )}
            <rect x={r1(x)} y={r1(y)} width={w} height={h} rx={9} fill={st.fill} stroke={sending ? color : st.stroke} strokeWidth={sending ? 1.8 : 1.2} />
            {hasIcon && (
              <>
                <rect x={r1(x + 5)} y={r1(n.y - 9)} width={18} height={18} rx={5} fill={n.tone === "dark" ? "rgba(255,255,255,0.12)" : "rgba(11,11,11,0.05)"} />
                <Glyph icon={n.icon as FIcon} x={x + 6} y={n.y - 8} color={st.icon} />
              </>
            )}
            <text x={r1(tx)} y={r1(n.y + (n.sub ? -1.5 : 3))} fontSize={8.4} fontWeight={800} fill={st.text} textAnchor={hasIcon ? "start" : "middle"} fontFamily={FONT}>
              {n.label}
            </text>
            {n.sub && (
              <text x={r1(tx)} y={r1(n.y + 9)} fontSize={6.5} fill={st.sub} textAnchor={hasIcon ? "start" : "middle"} fontFamily={MONO}>
                {n.sub}
              </text>
            )}
          </g>
        );
      })}
      {/* the packet */}
      <motion.g
        key={`pkt-${run}-${step}`}
        initial={{ x: pts[0][0], y: pts[0][1], opacity: 0 }}
        animate={{ x: pts.map((p) => p[0]), y: pts.map((p) => p[1]), opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.9, ease: "easeInOut", opacity: { duration: 1.5, times: [0, 0.08, 0.72, 1] } }}
      >
        <rect x={-tw / 2} y={-7} width={tw} height={14} rx={7} fill={color} />
        <text y={2.6} fontSize={7.3} fontWeight={700} fill="#fff" textAnchor="middle" fontFamily={MONO}>
          {cur.tag}
        </text>
      </motion.g>
      {cur.stop && (
        <motion.g key={`x-${run}-${step}`} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, duration: 0.3 }} style={{ originX: `${r1(sx)}px`, originY: `${r1(sy + 16)}px` }}>
          <circle cx={r1(sx)} cy={r1(sy + 16)} r={7} fill={TONE.bad} />
          <path d={`M${r1(sx - 3)},${r1(sy + 13)} l6,6 M${r1(sx + 3)},${r1(sy + 13)} l-6,6`} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
        </motion.g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ timing */
/** Advances through the steps while `playing`; `run` changes on every loop so packets restart. */
export function useSteps(n: number, playing: boolean) {
  const [state, setState] = useState({ step: 0, run: 0 });
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setState((s) => (s.step + 1 >= n ? { step: 0, run: s.run + 1 } : { step: s.step + 1, run: s.run })), STEP_MS);
    return () => window.clearInterval(id);
  }, [n, playing]);
  const go = (step: number) => setState((s) => ({ step: Math.max(0, Math.min(n - 1, step)), run: s.run + 1 }));
  return { ...state, go };
}

/** True while the element is on screen (cards only animate when visible). */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "60px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

/** A card's flow: plays while visible, with a one-line caption of the current step. */
export function FlowCard({ flow }: { flow: Flow }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const { step, run } = useSteps(flow.steps.length, inView);
  const s = flow.steps[step];
  return (
    <div ref={ref}>
      <div className="overflow-hidden rounded-[14px] bg-[#fbfaf7]">
        <FlowCanvas flow={flow} step={step} run={run} />
      </div>
      <div className="mt-2 flex items-start gap-2 px-1">
        <span className="mt-[1px] shrink-0 rounded-full px-1.5 py-[1px] font-mono text-[9.5px] font-bold text-white" style={{ background: TONE[s.tone ?? "req"] }}>
          {step + 1}/{flow.steps.length}
        </span>
        <p className="line-clamp-2 min-h-[2.5em] text-[11.5px] leading-snug text-ink-2/65">{s.say}</p>
      </div>
    </div>
  );
}

/** The panel's flow player: the canvas, play/pause and step buttons, every step listed with its payload. */
export function FlowPlayer({ flow }: { flow: Flow }) {
  const [playing, setPlaying] = useState(true);
  const { step, run, go } = useSteps(flow.steps.length, playing);
  const s = flow.steps[step];
  return (
    <div className="rounded-[20px] border border-line bg-white p-3">
      <div className="overflow-hidden rounded-[14px] bg-[#fbfaf7]">
        <FlowCanvas flow={flow} step={step} run={run} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] text-ink-2/55">
          step {step + 1} of {flow.steps.length}
        </p>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous step" onClick={() => {
              setPlaying(false);
              go(step - 1);
            }} disabled={step === 0} className="rounded-full px-2.5 py-1 text-[12px] ring-1 ring-line disabled:opacity-30">
            ←
          </button>
          <button type="button" onClick={() => setPlaying((p) => !p)} className="rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-white">
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" aria-label="Next step" onClick={() => {
              setPlaying(false);
              go(step + 1);
            }} disabled={step === flow.steps.length - 1} className="rounded-full px-2.5 py-1 text-[12px] ring-1 ring-line disabled:opacity-30">
            →
          </button>
        </div>
      </div>
      <ol className="mt-2 space-y-1">
        {flow.steps.map((x, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                go(i);
              }}
              className={`flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left transition ${i === step ? "bg-cream" : "hover:bg-cream/50"}`}
            >
              <span className="mt-[1px] shrink-0 rounded-full px-1.5 py-[1px] font-mono text-[10px] font-bold text-white" style={{ background: TONE[x.tone ?? "req"], opacity: i === step ? 1 : 0.55 }}>
                {x.tag}
              </span>
              <span className={`text-[12.5px] leading-snug ${i === step ? "text-ink" : "text-ink-2/60"}`}>{x.say}</span>
            </button>
          </li>
        ))}
      </ol>
      {s.payload && <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-white/85">{s.payload}</pre>}
    </div>
  );
}
