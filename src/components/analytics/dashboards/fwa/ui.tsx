"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* Small chart and control kit for the FWA case: SVG lines, HTML bars and heatmaps, so they stay crisp and responsive. */

export const C = {
  ink: "#0b0b0b",
  blue: "#2a78d6",
  orange: "#eb6834",
  green: "#138a60",
  red: "#c8413f",
  violet: "#6250d6",
  gold: "#c29a00",
  grey: "#8a8a8a",
  teal: "#0f766e",
};
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "bad" | "good" }) {
  return (
    <div className="rounded-[18px] border border-line bg-white p-3">
      <p className="truncate text-[11.5px] font-semibold text-ink-2/60">{label}</p>
      <p className="mt-1 text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums" style={tone ? { color: tone === "bad" ? C.red : C.green } : undefined}>
        {value}
      </p>
      {note && <p className="mt-1 truncate text-[10.5px] text-ink-2/50">{note}</p>}
    </div>
  );
}

export function Panel({ title, sub, right, children, className = "" }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col rounded-[20px] border border-line bg-white p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14.5px] leading-tight font-semibold tracking-[-0.01em]">{title}</h3>
          {sub && <p className="mt-0.5 text-[12px] leading-snug text-ink-2/55">{sub}</p>}
        </div>
        {right}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function Insight({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-xl bg-cream/70 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2/85">
      <span className="mr-1.5 font-semibold text-ink">Read it:</span>
      {children}
    </p>
  );
}

/** A row of choice chips. */
export function Chips<V extends string | number>({ value, options, onChange, size = "sm" }: { value: V; options: { v: V; l: string }[]; onChange: (v: V) => void; size?: "sm" | "xs" }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-full border transition-colors ${size === "xs" ? "px-2.5 py-0.5 text-[11.5px]" : "px-3 py-1 text-[12.5px]"} ${value === o.v ? "border-ink bg-ink text-white" : "border-line bg-white text-ink/70 hover:border-ink/40"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Select({ label, value, options, onChange }: { label: string; value: number; options: string[]; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-ink/50 uppercase">
      {label}
      <select value={value} onChange={(e) => onChange(+e.target.value)} className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-[13px] font-normal tracking-normal text-ink normal-case">
        <option value={-1}>All</option>
        {options.map((o, i) => (
          <option key={o} value={i}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, fmt = (v: number) => String(v) }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[12.5px] text-ink/70">
        <span>{label}</span>
        <span className="font-mono text-ink">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="mt-1.5 w-full accent-[#0b0b0b]" aria-label={label} />
    </label>
  );
}

/* ---------------------------------------------------------------- line chart with hover */
type Series = { name: string; color: string; values: (number | null)[]; dash?: boolean; area?: boolean };
export function Lines({
  labels,
  series,
  bars,
  h = 220,
  yFmt = (v: number) => String(Math.round(v)),
  yMin,
  yMax,
  every = 3,
}: {
  labels: string[];
  series: Series[];
  bars?: { name: string; color: string; values: number[] };
  h?: number;
  yFmt?: (v: number) => string;
  yMin?: number;
  yMax?: number;
  every?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // draw at the panel's real width, so text stays the same size in narrow and wide panels
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const L = 46;
  const R = 12;
  const top = 12;
  const bottom = h - 26;
  const vals = [...series.flatMap((s) => s.values.filter((v): v is number => v != null)), ...(bars ? bars.values : [])];
  const lo = yMin ?? Math.min(0, ...vals);
  const hiRaw = yMax ?? Math.max(...vals);
  const step = niceStep((hiRaw - lo) / 4);
  const hi = yMax ?? Math.ceil(hiRaw / step) * step;
  const n = labels.length;
  const x = (i: number) => L + (n === 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => bottom - ((v - lo) / (hi - lo || 1)) * (bottom - top);
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  const bw = Math.max(3, ((W - L - R) / n) * 0.55);
  const fit = Math.max(1, Math.floor((W - L - R) / 52)); // labels that fit side by side
  const step2 = Math.max(1, every, Math.ceil(n / fit));
  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${W} ${h}`} className="h-auto w-full" role="img" aria-label={series.map((s) => s.name).join(", ")} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(11,11,11,0.07)" />
            <text x={L - 6} y={y(t) + 3} fontSize={10.5} textAnchor="end" fill="rgba(11,11,11,0.5)" fontFamily={MONO}>
              {yFmt(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          // every Nth label (more of them when there's room), plus the last one, never crowding it
          (i % step2 === 0 && n - 1 - i >= Math.ceil(step2 / 2)) || i === n - 1 ? (
            <text key={l} x={x(i)} y={h - 8} fontSize={10.5} textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"} fill="rgba(11,11,11,0.5)" fontFamily={FONT}>
              {l}
            </text>
          ) : null,
        )}
        {bars &&
          bars.values.map((v, i) => <rect key={i} x={x(i) - bw / 2} y={y(Math.max(v, 0))} width={bw} height={Math.abs(y(0) - y(v))} rx={2} fill={bars.color} opacity={hover === null || hover === i ? 0.35 : 0.18} />)}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)] as const));
          const d = pts.reduce((acc, p, i) => (p ? `${acc}${acc && pts[i - 1] ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)} ` : acc), "");
          return (
            <g key={s.name}>
              {s.area && <path d={`${d} L${x(s.values.length - 1)},${y(lo)} L${x(0)},${y(lo)} Z`} fill={s.color} opacity={0.08} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dash ? "5 4" : undefined} strokeLinejoin="round" />
            </g>
          );
        })}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={top} y2={bottom} stroke="rgba(11,11,11,0.25)" strokeDasharray="3 3" />}
        {hover !== null &&
          series.map((s) => (s.values[hover] == null ? null : <circle key={s.name} cx={x(hover)} cy={y(s.values[hover] as number)} r={3.5} fill="#fff" stroke={s.color} strokeWidth={2} />))}
        {labels.map((_, i) => (
          <rect key={i} x={x(i) - (W - L - R) / n / 2} y={top} width={(W - L - R) / n} height={bottom - top} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-2/70">
        {bars && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: bars.color, opacity: 0.4 }} />
            {bars.name}
            {hover !== null && <b className="ml-1 font-mono text-ink">{yFmt(bars.values[hover])}</b>}
          </span>
        )}
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5" style={{ background: s.color }} />
            {s.name}
            {hover !== null && s.values[hover] != null && <b className="ml-1 font-mono text-ink">{yFmt(s.values[hover] as number)}</b>}
          </span>
        ))}
        {hover !== null && <span className="ml-auto font-mono text-ink/60">{labels[hover]}</span>}
      </div>
    </div>
  );
}

function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/* ---------------------------------------------------------------- horizontal bars */
export function Bars({ items, fmt = (v: number) => v.toFixed(1), max, color = C.ink, note }: { items: { k: string; v: number; n?: number; color?: string }[]; fmt?: (v: number) => string; max?: number; color?: string; note?: (it: { k: string; v: number; n?: number }) => string }) {
  const top = max ?? Math.max(...items.map((i) => i.v), 0.0001);
  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => (
        <div key={it.k} className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-2 text-[12.5px]">
          <span className="truncate text-ink-2/80" title={it.k}>
            {it.k}
          </span>
          <span className="h-3 overflow-hidden rounded-full bg-ink/[0.06]">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(0, (it.v / top) * 100)}%`, background: it.color ?? color }} />
          </span>
          <span className="font-mono text-[12px] tabular-nums">
            {fmt(it.v)}
            {note && <span className="ml-1 text-ink/40">{note(it)}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- heat colours */
export const heatGreen = (v: number) => {
  // 50% -> pale, 100% -> deep green
  const t = Math.max(0, Math.min(1, (v - 45) / 55));
  return `rgb(${Math.round(250 - t * 230)},${Math.round(245 - t * 107)},${Math.round(240 - t * 144)})`;
};
export const textOn = (v: number) => (v > 82 ? "#fff" : "rgba(11,11,11,0.75)");
