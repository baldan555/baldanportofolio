/**
 * Shared helpers for the chart variants: small stats, colour ramps, polar maths and curve paths. Everything returns
 * rounded numbers so the server and the browser print the same SVG.
 */
import { useId } from "react";
import { r1 } from "../kit";

export const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
export const mean = (v: number[]) => sum(v) / (v.length || 1);
export const sd = (v: number[]) => {
  const m = mean(v);
  return Math.sqrt(sum(v.map((x) => (x - m) ** 2)) / Math.max(1, v.length - 1));
};
export const quant = (v: number[], q: number) => {
  const s = [...v].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i - Math.floor(i));
};
/** Least-squares line y = a + b·x. */
export function linreg(xs: number[], ys: number[]) {
  const mx = mean(xs);
  const my = mean(ys);
  const b = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / (sum(xs.map((x) => (x - mx) ** 2)) || 1);
  return { a: my - b * mx, b };
}
/** Kernel density (Epanechnikov: polynomial, identical everywhere) over [lo, hi]. */
export const kde = (v: number[], lo: number, hi: number, h: number, steps = 48) =>
  Array.from({ length: steps + 1 }, (_, k) => {
    const x = lo + ((hi - lo) * k) / steps;
    const d = v.reduce((s, p) => {
      const u = (x - p) / h;
      return s + (Math.abs(u) < 1 ? 0.75 * (1 - u * u) : 0);
    }, 0);
    return [x, d / (v.length * h)] as [number, number];
  });
export const bins = (v: number[], lo: number, step: number, n: number) => Array.from({ length: n }, (_, i) => v.filter((x) => x >= lo + i * step && x < lo + (i + 1) * step).length);

/** Point on a circle, angle in radians clockwise from 12 o'clock. */
export const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [r1(cx + r * Math.sin(a)), r1(cy - r * Math.cos(a))];

/** Smooth curve through points (Catmull–Rom converted to cubic Béziers). */
export function smooth(pts: [number, number][], t = 0.18) {
  if (pts.length < 2) return "";
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) * t)},${r1(p1[1] + (p2[1] - p0[1]) * t)} ${r1(p2[0] - (p3[0] - p1[0]) * t)},${r1(p2[1] - (p3[1] - p1[1]) * t)} ${r1(p2[0])},${r1(p2[1])}`;
  }
  return d;
}
/** Step path (value holds until the next point). */
export const stepPath = (pts: [number, number][]) => pts.map(([x, y], i) => (i ? `H${r1(x)} V${r1(y)}` : `M${r1(x)},${r1(y)}`)).join(" ");

/** Area between an upper and a lower line. */
export const band2 = (top: [number, number][], bottom: [number, number][]) =>
  `M${top.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" L")} L${[...bottom]
    .reverse()
    .map(([x, y]) => `${r1(x)},${r1(y)}`)
    .join(" L")} Z`;

const hex = (n: number) =>
  Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, "0");
/** Linear interpolation between two hex colours, t in [0, 1]. */
export function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => hex(v + (pb[i] - v) * Math.max(0, Math.min(1, t)))).join("")}`;
}
/** Sequential blue ramp and a diverging red–grey–green ramp. */
export const seq = (t: number) => mix("#e8f1fb", "#14457f", t);
export const div = (t: number) => (t < 0 ? mix("#f1f1f1", "#c8413f", -t) : mix("#f1f1f1", "#138a60", t));

export const GOOD = "#1baf7a";
export const BAD = "#e34948";
export const SOFT = "rgba(11,11,11,0.18)";
export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

/** A unique id for SVG gradients, clip paths and markers, so two copies of a chart never share definitions. */
export const useSvgId = (prefix: string) => prefix + useId().replace(/[^a-zA-Z0-9]/g, "");

/** Marching squares: line segments where a grid of values crosses `level`; toXY maps grid indices to SVG points. */
export function isolines(grid: number[][], level: number, toXY: (i: number, j: number) => [number, number]) {
  const out: string[] = [];
  for (let j = 0; j < grid.length - 1; j++)
    for (let i = 0; i < grid[0].length - 1; i++) {
      const v = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]];
      const c = [toXY(i, j), toXY(i + 1, j), toXY(i + 1, j + 1), toXY(i, j + 1)];
      const pts: [number, number][] = [];
      for (let e = 0; e < 4; e++) {
        const a = v[e];
        const b = v[(e + 1) % 4];
        if (a < level !== b < level) {
          const t = (level - a) / (b - a);
          pts.push([c[e][0] + (c[(e + 1) % 4][0] - c[e][0]) * t, c[e][1] + (c[(e + 1) % 4][1] - c[e][1]) * t]);
        }
      }
      for (let k = 0; k + 1 < pts.length; k += 2) out.push(`M${r1(pts[k][0])},${r1(pts[k][1])} L${r1(pts[k + 1][0])},${r1(pts[k + 1][1])}`);
    }
  return out.join(" ");
}

/** Clip a convex polygon to the half-plane closer to site a than to site b (one step of a Voronoi cell). */
export function clipHalf(poly: [number, number][], a: [number, number], b: [number, number]) {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const nx = b[0] - a[0];
  const ny = b[1] - a[1];
  const side = (p: [number, number]) => (p[0] - mx) * nx + (p[1] - my) * ny;
  const out: [number, number][] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp <= 0) out.push(p);
    if (sp < 0 !== sq < 0) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  });
  return out;
}
