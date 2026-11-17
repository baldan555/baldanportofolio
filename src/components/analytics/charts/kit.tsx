/**
 * A tiny SVG chart kit for the chart library: shared sizes, colours, scales and axes. No chart library underneath;
 * every coordinate is rounded to 0.1 px so the server and the browser print identical SVG.
 */
import type { ReactNode } from "react";

export const W = 360;
export const H = 220;
export const M = { l: 40, r: 14, t: 14, b: 28 };
export const INK = "#0b0b0b";
export const MUTED = "rgba(11,11,11,0.5)";
export const GRID = "rgba(11,11,11,0.08)";
export const PAL = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6", "#d6497b", "#c29a00", "#0f766e", "#8a8a8a"];
export const FONT = "ui-sans-serif, system-ui, sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export const r1 = (v: number) => Math.round(v * 10) / 10;
/** Linear scale from [d0, d1] to [p0, p1]. */
export const lin = (d0: number, d1: number, p0: number, p1: number) => (v: number) => r1(p0 + ((v - d0) / (d1 - d0 || 1)) * (p1 - p0));
/** A "nice" round number at or above v, for axis maxima. */
export function nice(v: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1e-9)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
/** Running totals before each value ([3, 2, 5] → [0, 3, 5, 10]): start and end offsets for stacked parts, slices and segments. */
export const offsets = (values: number[]) => values.reduce<number[]>((acc, v) => [...acc, acc[acc.length - 1] + v], [0]);
export const fmt = (v: number) => (Math.abs(v) >= 1000 ? `${r1(v / 1000)}k` : String(Math.round(v * 10) / 10));
/** Evenly spaced bands for categories. */
export const band = (n: number, p0: number, p1: number, pad = 0.25) => {
  const step = (p1 - p0) / n;
  return { step, bw: r1(step * (1 - pad)), at: (i: number) => r1(p0 + i * step + (step * pad) / 2), mid: (i: number) => r1(p0 + (i + 0.5) * step) };
};

export function Svg({ children, label, h = H }: { children: ReactNode; label: string; h?: number }) {
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="h-auto w-full" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

export function Text({
  x,
  y,
  children,
  size = 10,
  anchor = "start",
  color = MUTED,
  weight,
  mono = false,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  color?: string;
  weight?: number;
  mono?: boolean;
}) {
  return (
    <text x={r1(x)} y={r1(y)} fontSize={size} textAnchor={anchor} fill={color} fontWeight={weight} fontFamily={mono ? MONO : FONT}>
      {children}
    </text>
  );
}

/** How many grid steps give round labels for a range from nice(): 2.5k → 5 steps of 500, 2k → 4 of 500. */
export function autoTicks(range: number) {
  const m = Math.round((range / 10 ** Math.floor(Math.log10(Math.max(range, 1e-9)))) * 10) / 10;
  return m === 2 || m === 4 || m === 8 ? 4 : m === 3 || m === 6 ? 3 : 5;
}

/** Horizontal grid lines with value labels on the left. */
export function YGrid({
  y,
  max,
  min = 0,
  ticks,
  x0 = M.l,
  x1 = W - M.r,
  format = fmt,
}: {
  y: (v: number) => number;
  max: number;
  min?: number;
  ticks?: number;
  x0?: number;
  x1?: number;
  format?: (v: number) => string;
}) {
  return (
    <g>
      {Array.from({ length: (ticks ?? autoTicks(max - min)) + 1 }, (_, i) => min + ((max - min) * i) / (ticks ?? autoTicks(max - min))).map((v) => (
        <g key={v}>
          <line x1={x0} x2={x1} y1={y(v)} y2={y(v)} stroke={GRID} />
          <Text x={x0 - 5} y={y(v) + 3} anchor="end" mono size={9}>
            {format(v)}
          </Text>
        </g>
      ))}
    </g>
  );
}

/** Category labels under a horizontal axis. */
export function XLabels({ labels, x, y = H - M.b + 14, every = 1 }: { labels: string[]; x: (i: number) => number; y?: number; every?: number }) {
  return (
    <g>
      {labels.map((l, i) =>
        i % every === 0 ? (
          <Text key={l + i} x={x(i)} y={y} anchor="middle" size={9}>
            {l}
          </Text>
        ) : null,
      )}
    </g>
  );
}

export const path = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${r1(x)},${r1(y)}`).join(" ");

/** Arc segment path (for pies, donuts, gauges, sunbursts), angles in radians clockwise from 12 o'clock. */
export function arc(cx: number, cy: number, r0: number, r: number, a0: number, a1: number) {
  const p = (rad: number, a: number) => `${r1(cx + rad * Math.sin(a))},${r1(cy - rad * Math.cos(a))}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  if (r0 <= 0) return `M${cx},${cy} L${p(r, a0)} A${r},${r} 0 ${large} 1 ${p(r, a1)} Z`;
  return `M${p(r, a0)} A${r},${r} 0 ${large} 1 ${p(r, a1)} L${p(r0, a1)} A${r0},${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

/** Simple legend row. */
export function Legend({ items, x = M.l, y = 10 }: { items: { label: string; color: string }[]; x?: number; y?: number }) {
  const starts = offsets(items.map((it) => 14 + it.label.length * 5.6 + 10));
  return (
    <g>
      {items.map((it, i) => {
        const at = x + starts[i];
        return (
          <g key={it.label}>
            <rect x={at} y={y - 7} width={9} height={9} rx={2} fill={it.color} />
            <Text x={at + 13} y={y + 1} size={9}>
              {it.label}
            </Text>
          </g>
        );
      })}
    </g>
  );
}
