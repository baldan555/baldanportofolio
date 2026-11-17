"use client";

import { useMemo, useRef, useState } from "react";
import model from "@/data/models/nyc-taxi-anomaly.json";
import { RAISES, Slider } from "./controls";

const W = 1000;
const H = 300;
const M = { l: 52, r: 12, t: 44, b: 30 };
const HOUR = 3_600_000;

const values = model.series.value;
const baseline = model.series.baseline;
const zs = model.series.z;
const t0 = new Date(model.series.start.replace(" ", "T") + "Z").getTime();
const N = values.length;
const maxV = Math.max(...values);
const yTop = Math.ceil(maxV / 10000) * 10000;

const sx = (i: number) => M.l + (i / (N - 1)) * (W - M.l - M.r);
const sy = (v: number) => H - M.b - (v / yTop) * (H - M.t - M.b);
const toIdx = (iso: string) => Math.round((new Date(iso.replace(" ", "T") + "Z").getTime() - t0) / HOUR);
const windows = model.windows.map((w) => ({ ...w, a: toIdx(w.start), b: toIdx(w.end) }));
const fmt = (i: number) =>
  new Date(t0 + i * HOUR).toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "numeric" });

// Same evaluation as ml/train.py: known events hit + false alerts grouped by 6h gaps.
function evaluate(th: number) {
  const flags: number[] = [];
  for (let i = 0; i < N; i++) if (Math.abs(zs[i]) > th) flags.push(i);
  const inside = (i: number) => windows.some((w) => i >= w.a && i <= w.b);
  const hit = windows.map((w) => flags.some((i) => i >= w.a && i <= w.b));
  let alerts = 0;
  let last = -Infinity;
  for (const i of flags) {
    if (inside(i)) continue;
    if (i - last > 6) alerts++;
    last = i;
  }
  return { flags, hit, alerts };
}

// Value line, sampled to ~1 point per 2 hours for drawing (flags still use every hour).
const linePath = (() => {
  let d = "";
  for (let i = 0; i < N; i += 2) d += `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(values[i]).toFixed(1)}`;
  return d;
})();

const monthTicks = (() => {
  const out: { i: number; label: string }[] = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(t0 + i * HOUR);
    if (d.getUTCDate() === 1 && d.getUTCHours() === 0) out.push({ i, label: d.toLocaleString("en-US", { timeZone: "UTC", month: "short" }) });
  }
  return out;
})();

/** `focus` (a timestamp from the sample table) pins the tooltip to that hour. Remount with a new key to change it. */
export function AnomalyDemo({ focus }: { focus?: string | null }) {
  const [th, setTh] = useState(model.default_threshold);
  const pinned = focus ? toIdx(focus) : null;
  const [hoverRaw, setHover] = useState<number | null>(null);
  const hover = hoverRaw ?? pinned;
  const svg = useRef<SVGSVGElement>(null);
  const res = useMemo(() => evaluate(th), [th]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (N - 1));
    setHover(i >= 0 && i < N ? i : null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="rounded-2xl bg-white p-5">
          <Slider label="Alert threshold |z|" value={th} min={2} max={6} step={0.1} onChange={setTh} />
          <p className="mt-2 text-[12px] text-muted">Lower = more sensitive. Higher = fewer false alarms.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white px-5 py-4">
            <p className="text-[2.2rem] leading-none font-semibold tracking-[-0.04em]">
              {res.hit.filter(Boolean).length}/{windows.length}
            </p>
            <p className="mt-1.5 font-mono text-[10.5px] text-muted uppercase">known events found</p>
          </div>
          <div className="rounded-2xl bg-white px-5 py-4">
            <p className="text-[2.2rem] leading-none font-semibold tracking-[-0.04em]">{res.alerts}</p>
            <p className="mt-1.5 font-mono text-[10.5px] text-muted uppercase">false alerts</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] font-semibold">Taxi passengers per hour, New York</p>
          <div className="flex items-center gap-4 text-[11.5px] text-ink-2/70">
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 bg-ink" /> passengers
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: RAISES }} /> flagged hour
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-cream-2" /> known event
            </span>
          </div>
        </div>
        <div className="relative overflow-x-auto">
          <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px] select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={M.l} x2={W - M.r} y1={sy(yTop * f)} y2={sy(yTop * f)} stroke="#0b0b0b" strokeOpacity="0.06" />
                <text x={M.l - 8} y={sy(yTop * f) + 4} textAnchor="end" fontSize="11" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
                  {Math.round((yTop * f) / 1000)}k
                </text>
              </g>
            ))}
            {windows.map((w, i) => (
              <g key={w.name}>
                <rect x={sx(w.a)} y={M.t} width={Math.max(3, sx(w.b) - sx(w.a))} height={H - M.t - M.b} fill="#ebe3d3" />
                <text x={sx((w.a + w.b) / 2)} y={M.t - 8 - (i % 2) * 14} textAnchor="middle" fontSize="10.5" fill={res.hit[i] ? "#0b0b0b" : "#8a8a85"} fontWeight={res.hit[i] ? 600 : 400}>
                  {res.hit[i] ? "✓ " : ""}
                  {w.name}
                </text>
              </g>
            ))}
            {monthTicks.map((m) => (
              <text key={m.i} x={sx(m.i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
                {m.label}
              </text>
            ))}
            <path d={linePath} fill="none" stroke="#0b0b0b" strokeWidth={1.2} strokeLinejoin="round" />
            {res.flags.map((i) => (
              <circle key={i} cx={sx(i)} cy={sy(values[i])} r={3.5} fill={RAISES} stroke="#ffffff" strokeWidth={1.5} />
            ))}
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={sx(hover)} x2={sx(hover)} y1={M.t} y2={H - M.b} stroke="#0b0b0b" strokeOpacity="0.35" />
                <circle cx={sx(hover)} cy={sy(values[hover])} r={4} fill="#0b0b0b" stroke="#fff" strokeWidth={2} />
              </g>
            )}
          </svg>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-8 z-10 rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] whitespace-nowrap text-white"
              style={{ left: `${(sx(hover) / W) * 100}%`, transform: `translateX(${sx(hover) > W * 0.75 ? "-105%" : "8px"})` }}
            >
              {fmt(hover)}
              <br />
              <span className="text-white/75">
                {values[hover].toLocaleString("en-US")} rides · expected {baseline[hover].toLocaleString("en-US")}
              </span>
              <br />
              <span className="text-white/75">z = {zs[hover].toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
