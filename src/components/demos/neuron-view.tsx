"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import type { DigitNet, DigitRun } from "@/lib/cnn";

const S1 = "#2a78d6";
const S2 = "#eb6834";
const VB = { w: 560, h: 320 };
const X = { input: 8, l1: 128, l2: 238, h: 348, out: 478 };

const col = (n: number, top = 18, bottom = VB.h - 18) => Array.from({ length: n }, (_, i) => top + (n === 1 ? 0 : (i * (bottom - top)) / (n - 1)));
const Y1 = col(16, 30, 290);
const Y2 = col(32);
const YH = col(32);
const YO = col(10, 34, 286);
const hx = (j: number) => (j % 2 ? X.h + 9 : X.h - 9);
const hy = (j: number) => YH[j >> 1];

type Wire = { x1: number; y1: number; x2: number; y2: number; s: number; hot?: boolean };

function topK(vals: number[], k: number) {
  return vals
    .map((v, i) => [v, i] as const)
    .filter(([v]) => v > 0)
    .sort((a, b) => b[0] - a[0])
    .slice(0, k)
    .map(([, i]) => i);
}

/**
 * Live view of the digit CNN. Node brightness = average activation of that filter / neuron (relative to its layer).
 * Wires = the largest real contributions (activation × weight) feeding the winning digit, layer by layer.
 */
export function NeuronView({ run, net, pixels }: { run: DigitRun | null; net: DigitNet; pixels: ArrayLike<number> | null }) {
  const img = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = img.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const im = ctx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const v = pixels ? Math.round(Math.min(1, Math.max(0, pixels[i])) * 255) : 0;
      im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
      im.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
  }, [pixels]);

  const view = useMemo(() => {
    if (!run) return null;
    const { c1, c2, d1, d2 } = net.dims;
    const W = net.weights;
    const mean = (t: { data: Float64Array; h: number; w: number; c: number }, ch: number) => {
      let s = 0;
      for (let i = 0; i < t.h * t.w; i++) s += t.data[i * t.c + ch];
      return s / (t.h * t.w);
    };
    const norm = (v: number[]) => {
      const m = Math.max(...v, 1e-9);
      return v.map((x) => Math.max(0, x) / m);
    };
    const l1 = norm(Array.from({ length: c1 }, (_, ch) => mean(run.conv1, ch)));
    const l2 = norm(Array.from({ length: c2 }, (_, ch) => mean(run.conv2, ch)));
    const hid = norm(Array.from(run.hidden));
    const win = run.probs.indexOf(Math.max(...run.probs));

    // dense → winning digit
    const toOut = Array.from({ length: d1 }, (_, j) => run.hidden[j] * W.out[j * d2 + win]);
    const topH = topK(toOut, 6);
    const mOut = Math.max(...topH.map((j) => toOut[j]), 1e-9);
    const wires: Wire[] = topH.map((j) => ({ x1: hx(j), y1: hy(j), x2: X.out, y2: YO[win], s: toOut[j] / mOut, hot: true }));

    // conv2 channels → those dense neurons
    const p2 = run.pool2.data;
    const S = run.pool2.h * run.pool2.w;
    const l2Used = new Map<number, number>();
    const w2h: Wire[] = [];
    let m2 = 1e-9;
    const raw2: [number, number, number][] = [];
    for (const j of topH) {
      const contrib = Array.from({ length: c2 }, (_, c) => {
        let s = 0;
        for (let p = 0; p < S; p++) s += p2[p * c2 + c] * W.dense1[(p * c2 + c) * d1 + j];
        return s;
      });
      for (const c of topK(contrib, 2)) {
        raw2.push([c, j, contrib[c]]);
        m2 = Math.max(m2, contrib[c]);
        l2Used.set(c, Math.max(l2Used.get(c) ?? 0, contrib[c]));
      }
    }
    for (const [c, j, v] of raw2) w2h.push({ x1: X.l2, y1: Y2[c], x2: hx(j), y2: hy(j), s: v / m2 });

    // conv1 channels → the strongest of those conv2 channels (exact sums over every position and kernel tap)
    const p1 = run.pool1;
    const O = p1.h - 2;
    const w12: Wire[] = [];
    const raw1: [number, number, number][] = [];
    let m1 = 1e-9;
    const l2Top = [...l2Used.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
    for (const co of l2Top) {
      const contrib = Array.from({ length: c1 }, (_, ci) => {
        let s = 0;
        for (let y = 0; y < O; y++)
          for (let x = 0; x < O; x++)
            for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) s += p1.data[((y + i) * p1.w + x + k) * c1 + ci] * W.conv2[((i * 3 + k) * c1 + ci) * c2 + co];
        return s;
      });
      for (const ci of topK(contrib, 2)) {
        raw1.push([ci, co, contrib[ci]]);
        m1 = Math.max(m1, contrib[ci]);
      }
    }
    for (const [ci, co, v] of raw1) w12.push({ x1: X.l1, y1: Y1[ci], x2: X.l2, y2: Y2[co], s: v / m1 });

    const win1: Wire[] = topK(l1, 5).map((ci) => ({ x1: X.input + 60, y1: VB.h / 2, x2: X.l1, y2: Y1[ci], s: l1[ci] }));
    const all: Wire[] = [...win1, ...w12, ...w2h, ...wires];
    return { l1, l2, hid, probs: run.probs, win, wires: all };
  }, [run, net]);

  const node = (x: number, y: number, r: number, a: number, key: string, color = S1) => (
    <motion.circle key={key} cx={x} cy={y} initial={false} animate={{ r: r * (0.75 + 0.45 * a), fillOpacity: 0.1 + 0.9 * a }} transition={{ duration: 0.18 }} fill={color} />
  );

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="w-full" role="img" aria-label="Live view of the network's layers">
        {/* layer labels */}
        {[
          ["input", X.input + 30],
          ["filters 1", X.l1],
          ["filters 2", X.l2],
          ["dense", X.h],
          ["output", X.out],
        ].map(([t, x]) => (
          <text key={t} x={Number(x)} y={VB.h - 2} textAnchor="middle" fontSize="10" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
            {t}
          </text>
        ))}

        {/* wires */}
        <g>
          {view?.wires.map((w, i) => (
            <line
              key={i}
              x1={w.x1}
              y1={w.y1}
              x2={w.x2}
              y2={w.y2}
              stroke={w.hot ? S2 : S1}
              strokeOpacity={0.2 + 0.65 * w.s}
              strokeWidth={0.6 + (w.hot ? 2.6 : 1.8) * w.s}
              strokeLinecap="round"
              className="wire-flow"
            />
          ))}
        </g>

        {/* input image */}
        <foreignObject x={X.input} y={VB.h / 2 - 30} width={60} height={60}>
          <canvas ref={img} width={28} height={28} className="h-[60px] w-[60px] rounded-[4px] bg-black [image-rendering:pixelated]" />
        </foreignObject>

        {/* nodes */}
        {Y1.map((y, i) => node(X.l1, y, 6, view?.l1[i] ?? 0, `a${i}`))}
        {Y2.map((y, i) => node(X.l2, y, 3.8, view?.l2[i] ?? 0, `b${i}`))}
        {Array.from({ length: 64 }, (_, j) => node(hx(j), hy(j), 3.6, view?.hid[j] ?? 0, `h${j}`))}
        {YO.map((y, d) => {
          const p = view?.probs[d] ?? 0;
          const isWin = view?.win === d;
          return (
            <g key={`o${d}`}>
              {isWin && <motion.circle cx={X.out} cy={y} r={17} fill="none" stroke={S2} strokeWidth={2} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${X.out}px ${y}px` }} />}
              <motion.circle cx={X.out} cy={y} r={11} initial={false} animate={{ fillOpacity: 0.07 + 0.93 * p }} transition={{ duration: 0.18 }} fill="#0b0b0b" />
              <text x={X.out} y={y + 4} textAnchor="middle" fontSize="11.5" fontWeight={600} fill={p > 0.45 ? "#fff" : "#0b0b0b"} fontFamily="var(--font-geist-mono)">
                {d}
              </text>
              <text x={X.out + 22} y={y + 4} fontSize="10" fill={isWin ? "#0b0b0b" : "#8a8a85"} fontWeight={isWin ? 600 : 400} fontFamily="var(--font-geist-mono)">
                {view ? `${(p * 100).toFixed(p >= 0.995 ? 0 : 1)}%` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
