"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import type { LogRegModel } from "@/lib/logreg";
import { InsideSection, Picker, Scrolly, type Step } from "./scrolly";

const UP = "#eb6834"; // pushes the output up
const DOWN = "#2a78d6"; // pushes it down
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export type NeuronRow = {
  id: string;
  /** the model's input, exactly as the project's demo builds it */
  input: Record<string, number | string>;
  /** what really happened, in words ("stayed", "left") */
  actual?: string;
  /** chance models: did the event happen? */
  event?: boolean;
  /** value models: the real number */
  value?: number;
  /** the score Python wrote for this row, when the project exported it (for checking the browser maths) */
  predicted?: number;
};

export type NeuronOutput =
  | {
      kind: "chance";
      event: string;
      threshold: number;
      flag: string;
      pass: string;
    }
  | { kind: "value"; name: string; unit: string; digits?: number };

type Term = {
  key: string;
  label: string;
  raw: string;
  z: number | null;
  w: number | null;
  c: number;
  cat: boolean;
  count?: number;
};

export const fmtNum = (v: number, digits?: number) => {
  if (digits !== undefined)
    return v.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  if (Number.isInteger(v)) return v.toLocaleString("en-US");
  return Math.abs(v) >= 100 ? Math.round(v).toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 2 });
};
const signed = (v: number, d = 2) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;
const pretty = (k: string) => k.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * One prediction of a linear or logistic model, taken apart term by term: each input rescaled (numbers) or
 * one-hot (categories), times its weight, plus the bias. `groups` folds several columns into one input (Age + Age²).
 */
export function neuronTerms(model: LogRegModel, input: Record<string, number | string>, labels: Record<string, string> = {}, groups: Record<string, string[]> = {}, show: Record<string, string> = {}) {
  const terms: Term[] = [];
  for (const [f, p] of Object.entries(model.numeric)) {
    const x = Number(input[f]);
    const z = (x - p.mean) / p.scale;
    terms.push({
      key: f,
      label: labels[f] ?? pretty(f),
      raw: show[f] ?? fmtNum(x),
      z,
      w: p.coef,
      c: p.coef * z,
      cat: false,
    });
  }
  for (const [f, cats] of Object.entries(model.categorical)) {
    const v = String(input[f]);
    const w = cats[v] ?? 0;
    terms.push({
      key: f,
      label: labels[f] ?? pretty(f),
      raw: show[f] ?? v,
      z: 1,
      w,
      c: w,
      cat: true,
    });
  }
  for (const [name, members] of Object.entries(groups)) {
    const parts = terms.filter((t) => members.includes(t.key));
    if (!parts.length) continue;
    const merged: Term = {
      key: name,
      label: labels[name] ?? name,
      raw: show[name] ?? parts[0].raw,
      z: null,
      w: null,
      c: parts.reduce((s, t) => s + t.c, 0),
      cat: false,
      count: parts.length,
    };
    terms.splice(terms.indexOf(parts[0]), 1, merged);
    for (const t of parts.slice(1)) terms.splice(terms.indexOf(t), 1);
  }
  const logit = model.intercept + terms.reduce((s, t) => s + t.c, 0);
  return {
    terms: [...terms].sort((a, b) => Math.abs(b.c) - Math.abs(a.c)),
    logit,
  };
}

/* ------------------------------------------------------------------ the picture */

const W = 640;
const H = 440;
const NODE_W = 196;
const NODE_H = 38;
const N = { x: 392, y: 206, r: 44 }; // the neuron
const SIG = { x: 470, y: 108, w: 156, h: 170 }; // sigmoid chart box

export function NeuronVisual({ step, terms, model, out, values, actual }: { step: number; terms: Term[]; model: LogRegModel; out: NeuronOutput; values: number[]; actual?: number }) {
  // the training illustration (step 8) grows every weight from zero to its final size, over and over
  const [t, setT] = useState(1);
  useEffect(() => {
    if (step !== 7) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT(Math.min(1, ((now - start) % 3800) / 3000));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);
  const k = step === 7 ? t : 1;
  const net = step === 8;
  const arrow = `arrow${useId().replace(/:/g, "")}`;

  const shown =
    terms.length > 7
      ? [
          ...terms.slice(0, 6),
          {
            key: "_more",
            label: `${terms.length - 6} more inputs`,
            raw: "small pushes",
            z: null,
            w: null,
            c: terms.slice(6).reduce((s, x) => s + x.c, 0),
            cat: false,
            count: terms.length - 6,
          },
        ]
      : terms;
  const n = shown.length;
  const y0 = 14;
  const span = 352 - NODE_H;
  const yOf = (i: number) => y0 + NODE_H / 2 + (n > 1 ? (i * span) / (n - 1) : span / 2);
  const maxW = Math.max(...shown.map((s) => Math.abs(s.w ?? s.c)), 0.01);
  const maxC = Math.max(...shown.map((s) => Math.abs(s.c)), 0.01);
  const sum = model.intercept * k + shown.reduce((s, x) => s + x.c * k, 0);
  const edge = (y: number) => `M${16 + NODE_W},${y} C${300},${y} ${300},${N.y} ${N.x - N.r},${N.y}`;
  const biasY = 402;
  const biasEdge = `M${16 + NODE_W},${biasY} C${330},${biasY} ${N.x},${biasY - 60} ${N.x},${N.y + N.r}`;

  // waterfall: bias, then each push, ending at the sum
  const cums = [model.intercept];
  for (const s of shown) cums.push(cums[cums.length - 1] + s.c);
  const lo = Math.min(...cums, out.kind === "chance" ? 0 : Infinity);
  const hi = Math.max(...cums, out.kind === "chance" ? 0 : -Infinity);
  const pad = (hi - lo) * 0.08 || 1;
  const wx = (v: number) => 238 + ((v - (lo - pad)) / (hi - lo + 2 * pad)) * 386;

  // output scales
  const L = 6;
  const sx = (z: number) => SIG.x + ((Math.max(-L, Math.min(L, z)) + L) / (2 * L)) * SIG.w;
  const sy = (p: number) => Math.round((SIG.y + (1 - p) * SIG.h) * 10) / 10; // rounded: exp() may differ in the last digit between server and browser
  const curve = Array.from({ length: 61 }, (_, i) => {
    const z = -L + (i / 60) * 2 * L;
    return `${i ? "L" : "M"}${sx(z).toFixed(1)},${sy(sigmoid(z)).toFixed(1)}`;
  }).join(" ");
  const vlo = Math.min(...values);
  const vhi = Math.max(...values);
  const vpad = (vhi - vlo) * 0.1 || 1;
  const vy = (v: number) => SIG.y + SIG.h - ((v - (vlo - vpad)) / (vhi - vlo + 2 * vpad)) * SIG.h;

  const fade = (on: boolean, o = 1) => ({ opacity: on ? o : 0 });
  const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="A single neuron: inputs times weights, added up, then turned into the prediction">
      {/* edges input → neuron */}
      {shown.map((s, i) => {
        const y = yOf(i);
        const wv = s.w ?? s.c;
        const colour = step >= 3 ? (s.c >= 0 ? UP : DOWN) : step >= 2 ? (wv >= 0 ? UP : DOWN) : MUTED;
        const width = step >= 3 ? 1.2 + (6 * Math.abs(s.c)) / maxC : step >= 2 ? 1.2 + (6 * Math.abs(wv)) / maxW : 1;
        return (
          <g key={`e${s.key}`}>
            <motion.path
              d={edge(y)}
              fill="none"
              initial={false}
              animate={{
                stroke: colour,
                strokeWidth: width * k,
                opacity: net ? 0.12 : step >= 1 ? 0.85 : 0.25,
              }}
              transition={tr}
            />
            {step >= 3 && step < 8 && Math.abs(s.c) > maxC * 0.04 && (
              <circle r={2.5 + (2.5 * Math.abs(s.c)) / maxC} fill={s.c >= 0 ? UP : DOWN}>
                <animateMotion dur="1.5s" repeatCount="indefinite" path={edge(y)} begin={`${(i * 0.17).toFixed(2)}s`} />
              </circle>
            )}
          </g>
        );
      })}
      <motion.path d={biasEdge} fill="none" stroke={INK} strokeDasharray="4 4" initial={false} animate={{ opacity: step >= 4 && !net ? 0.5 : 0.12 }} transition={tr} />

      {/* input nodes */}
      {shown.map((s, i) => {
        const y = yOf(i);
        const border = step >= 3 && step < 8 ? (s.c >= 0 ? UP : DOWN) : "rgba(11,11,11,0.12)";
        const chip =
          step >= 3 && step < 8
            ? signed(s.c * k)
            : step === 2 && s.w !== null
              ? `× ${s.w.toFixed(2)}`
              : step >= 1 && step < 8
                ? s.count
                  ? `${s.count} terms`
                  : s.cat
                    ? "= 1"
                    : `z ${signed(s.z ?? 0)}`
                : "";
        return (
          <g key={`n${s.key}`}>
            <motion.rect
              x={16}
              y={y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              rx={10}
              fill="#fff"
              initial={false}
              animate={{
                stroke: border,
                strokeWidth: step >= 3 && step < 8 ? 2 : 1,
              }}
              transition={tr}
            />
            <text x={26} y={y - 5} fontSize={10.5} fontFamily={MONO} fill={MUTED} style={{ textTransform: "uppercase" }}>
              {s.label.length > 26 ? `${s.label.slice(0, 25)}…` : s.label}
            </text>
            <text x={26} y={y + 12} fontSize={14} fontWeight={600} fontFamily={FONT} fill={INK}>
              {s.raw.length > 18 ? `${s.raw.slice(0, 17)}…` : s.raw}
            </text>
            {chip && (
              <text
                x={16 + NODE_W - 8}
                y={y + 12}
                fontSize={12}
                fontFamily={MONO}
                textAnchor="end"
                fill={step >= 3 ? (s.c >= 0 ? UP : DOWN) : step === 2 ? ((s.w ?? 0) >= 0 ? UP : DOWN) : MUTED}
                fontWeight={600}
              >
                {chip}
              </text>
            )}
          </g>
        );
      })}
      {/* bias node */}
      <motion.g initial={false} animate={fade(step >= 4 && !net)} transition={tr}>
        <rect x={16} y={biasY - 14} width={NODE_W} height={28} rx={8} fill="none" stroke="rgba(11,11,11,0.2)" strokeDasharray="4 3" />
        <text x={26} y={biasY + 4} fontSize={11} fontFamily={MONO} fill={MUTED}>
          BIAS (STARTING POINT)
        </text>
        <text x={16 + NODE_W - 8} y={biasY + 4} fontSize={12} fontFamily={MONO} textAnchor="end" fill={INK} fontWeight={600}>
          {out.kind === "chance" ? signed(model.intercept * k) : fmtNum(model.intercept * k, out.digits)}
        </text>
      </motion.g>

      {/* the neuron */}
      <motion.g initial={false} animate={fade(!net)} transition={tr}>
        <circle cx={N.x} cy={N.y} r={N.r + 10} fill={step >= 4 ? (sum >= 0 ? UP : DOWN) : INK} opacity={0.08} />
        <circle cx={N.x} cy={N.y} r={N.r} fill="#fff" stroke={INK} strokeWidth={2} />
        <text x={N.x} y={step >= 4 ? N.y - 4 : N.y + 9} textAnchor="middle" fontSize={step >= 4 ? 20 : 30} fontFamily={FONT} fill={INK}>
          Σ
        </text>
        {step >= 4 && (
          <text x={N.x} y={N.y + 18} textAnchor="middle" fontSize={13} fontWeight={600} fontFamily={MONO} fill={INK}>
            {out.kind === "chance" ? signed(sum) : fmtNum(sum, out.digits)}
          </text>
        )}
        <text x={N.x} y={N.y + N.r + 24} textAnchor="middle" fontSize={11} fontFamily={MONO} fill={MUTED}>
          NEURON
        </text>
      </motion.g>

      {/* output */}
      {out.kind === "chance" ? (
        <motion.g initial={false} animate={fade(step >= 5 && !net)} transition={tr}>
          <path d={`M${N.x + N.r},${N.y} L${SIG.x - 6},${N.y}`} stroke={INK} strokeWidth={1.5} markerEnd={`url(#${arrow})`} opacity={0.5} />
          <rect x={SIG.x} y={SIG.y} width={SIG.w} height={SIG.h} rx={10} fill="#fff" stroke="rgba(11,11,11,0.1)" />
          {[0, 0.5, 1].map((p) => (
            <g key={p}>
              <line x1={SIG.x} x2={SIG.x + SIG.w} y1={sy(p)} y2={sy(p)} stroke="rgba(11,11,11,0.07)" />
              <text x={SIG.x - 4} y={sy(p) + 4} fontSize={10} fontFamily={MONO} textAnchor="end" fill={MUTED}>
                {p * 100}%
              </text>
            </g>
          ))}
          <path d={curve} fill="none" stroke={INK} strokeWidth={2} />
          {step >= 6 && <line x1={SIG.x} x2={SIG.x + SIG.w} y1={sy(out.threshold)} y2={sy(out.threshold)} stroke={UP} strokeDasharray="5 4" strokeWidth={1.5} />}
          <motion.circle
            r={7}
            fill={sigmoid(sum) >= out.threshold ? UP : DOWN}
            stroke="#fff"
            strokeWidth={2}
            initial={false}
            animate={{ cx: sx(sum), cy: sy(sigmoid(sum)) }}
            transition={step === 7 ? { duration: 0 } : tr}
          />
          <text x={SIG.x + SIG.w / 2} y={SIG.y + SIG.h + 38} textAnchor="middle" fontSize={34} fontWeight={600} fontFamily={FONT} fill={INK} letterSpacing={-1}>
            {(sigmoid(sum) * 100).toFixed(sigmoid(sum) < 0.1 ? 1 : 0)}%
          </text>
          <text x={SIG.x + SIG.w / 2} y={SIG.y + SIG.h + 58} textAnchor="middle" fontSize={12} fontFamily={FONT} fill={MUTED}>
            chance of {out.event}
          </text>
          <text x={SIG.x + SIG.w / 2} y={SIG.y - 10} textAnchor="middle" fontSize={10.5} fontFamily={MONO} fill={MUTED}>
            SIGMOID: SUM → 0–100%
          </text>
        </motion.g>
      ) : (
        <motion.g initial={false} animate={fade(step >= 5 && !net)} transition={tr}>
          <path d={`M${N.x + N.r},${N.y} L${SIG.x + 40},${N.y}`} stroke={INK} strokeWidth={1.5} markerEnd={`url(#${arrow})`} opacity={0.5} />
          <line x1={SIG.x + 70} x2={SIG.x + 70} y1={SIG.y} y2={SIG.y + SIG.h} stroke="rgba(11,11,11,0.15)" strokeWidth={6} strokeLinecap="round" />
          <motion.circle cx={SIG.x + 70} r={8} fill={INK} initial={false} animate={{ cy: vy(sum) }} transition={step === 7 ? { duration: 0 } : tr} />
          <text x={SIG.x + 84} y={vy(sum) + 4} fontSize={12} fontFamily={MONO} fill={INK} fontWeight={600}>
            predicted
          </text>
          {step >= 6 && actual !== undefined && (
            <g>
              <line x1={SIG.x + 58} x2={SIG.x + 82} y1={vy(actual)} y2={vy(actual)} stroke="#1baf7a" strokeWidth={3.5} strokeLinecap="round" />
              <text x={SIG.x + 52} y={vy(actual) + 4} textAnchor="end" fontSize={12} fontFamily={MONO} fill="#138a60" fontWeight={600}>
                actual {fmtNum(actual, out.digits)}
              </text>
            </g>
          )}
          <text x={SIG.x + 70} y={SIG.y + SIG.h + 40} textAnchor="middle" fontSize={30} fontWeight={600} fontFamily={FONT} fill={INK} letterSpacing={-1}>
            {fmtNum(sum, out.digits)}
          </text>
          <text x={SIG.x + 70} y={SIG.y + SIG.h + 60} textAnchor="middle" fontSize={12} fontFamily={FONT} fill={MUTED}>
            {out.unit}
          </text>
        </motion.g>
      )}

      {/* waterfall: how the sum is built */}
      <motion.g initial={false} animate={fade(step >= 4 && step < 7)} transition={tr}>
        <line x1={238} x2={624} y1={424} y2={424} stroke="rgba(11,11,11,0.12)" />
        {out.kind === "chance" && <line x1={wx(0)} x2={wx(0)} y1={410} y2={432} stroke="rgba(11,11,11,0.25)" />}
        {shown.map((s, i) => {
          const a = cums[i];
          const b = cums[i + 1];
          const rowH = 30 / shown.length; // a staircase: each push on its own row, so reversals don't overlap
          return (
            <motion.rect
              key={`w${s.key}`}
              y={406 + i * rowH}
              height={Math.max(2.5, rowH - 1)}
              rx={1.5}
              fill={s.c >= 0 ? UP : DOWN}
              initial={false}
              animate={{
                x: wx(Math.min(a, b)),
                width: Math.max(1.5, Math.abs(wx(b) - wx(a))),
                opacity: step >= 4 ? 0.9 : 0,
              }}
              transition={{ ...tr, delay: step === 4 ? 0.12 * i : 0 }}
            />
          );
        })}
        <line x1={wx(cums[0])} x2={wx(cums[0])} y1={410} y2={436} stroke={INK} strokeDasharray="2 2" />
        <line x1={wx(cums[cums.length - 1])} x2={wx(cums[cums.length - 1])} y1={406} y2={438} stroke={INK} strokeWidth={2} />
        <text x={wx(cums[cums.length - 1])} y={402} textAnchor="middle" fontSize={10.5} fontFamily={MONO} fill={INK}>
          SUM
        </text>
      </motion.g>

      {/* training caption */}
      <motion.g initial={false} animate={fade(step === 7)} transition={tr}>
        <rect x={N.x - 70} y={N.y - N.r - 56} width={140} height={8} rx={4} fill="rgba(11,11,11,0.08)" />
        <rect x={N.x - 70} y={N.y - N.r - 56} width={140 * k} height={8} rx={4} fill={INK} />
        <text x={N.x} y={N.y - N.r - 64} textAnchor="middle" fontSize={10.5} fontFamily={MONO} fill={MUTED}>
          WEIGHTS GROWING FROM 0
        </text>
      </motion.g>

      {/* step 9: one neuron → a network */}
      <motion.g initial={false} animate={fade(net)} transition={tr} pointerEvents="none">
        {[0, 1, 2, 3, 4].map((h) => {
          const hy = 70 + h * 66;
          return (
            <g key={h}>
              {shown.map((s, i) => (
                <line key={s.key} x1={16 + NODE_W} y1={yOf(i)} x2={360} y2={hy} stroke={(i + h) % 3 ? UP : DOWN} strokeWidth={0.8} opacity={0.35} />
              ))}
              <line x1={360} y1={hy} x2={540} y2={206} stroke={h % 2 ? UP : DOWN} strokeWidth={1.4} opacity={0.5} />
              {net && (
                <circle r={3} fill={h % 2 ? UP : DOWN}>
                  <animateMotion dur="1.2s" repeatCount="indefinite" path={`M360,${hy} L540,206`} begin={`${h * 0.2}s`} />
                </circle>
              )}
              <circle cx={360} cy={hy} r={17} fill="#fff" stroke={INK} strokeWidth={1.5} />
              <text x={360} y={hy + 5} textAnchor="middle" fontSize={13} fontFamily={FONT} fill={INK}>
                Σ
              </text>
            </g>
          );
        })}
        <circle cx={540} cy={206} r={24} fill="#fff" stroke={INK} strokeWidth={2} />
        <text x={540} y={212} textAnchor="middle" fontSize={16} fontFamily={FONT} fill={INK}>
          Σ
        </text>
        <text x={450} y={30} textAnchor="middle" fontSize={11} fontFamily={MONO} fill={MUTED}>
          LAYERS OF NEURONS = A NEURAL NETWORK
        </text>
      </motion.g>

      <defs>
        <marker id={arrow} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={INK} />
        </marker>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ section */

export function NeuronExplainer({
  title,
  line,
  model,
  rows,
  entity,
  out,
  trained,
  labels,
  groups,
  shows,
}: {
  title: string;
  line?: string;
  model: LogRegModel;
  rows: NeuronRow[];
  /** "customer", "patient", "loan" */
  entity: string;
  out: NeuronOutput;
  /** how many examples the weights were learned from, in words: "5,625 past customers" */
  trained: string;
  labels?: Record<string, string>;
  groups?: Record<string, string[]>;
  /** per-row display text for inputs that look better than the raw model value (e.g. an amount before its log) */
  shows?: Record<string, string>[];
}) {
  const [pick, setPick] = useState(0);
  const row = rows[pick];
  const { terms, logit } = useMemo(() => neuronTerms(model, row.input, labels, groups, shows?.[pick]), [model, row, labels, groups, shows, pick]);
  const values = useMemo(() => {
    if (out.kind !== "value") return [0, 1];
    const all = rows.flatMap((r) => [neuronTerms(model, r.input, labels, groups).logit, r.value ?? NaN]).filter(Number.isFinite);
    return all;
  }, [rows, model, labels, groups, out.kind]);
  const p = sigmoid(logit);
  const top = terms[0];

  const steps: Step[] = [
    {
      t: `Start with one ${entity}`,
      d: `A real ${entity} from the data. These are the facts the model reads, nothing else. Pick another one at the top.`,
    },
    {
      t: "Everything becomes a number",
      d: "A number is rescaled so 0 means average (z). A category becomes a 1 for the box that applies.",
    },
    {
      t: "Every input has a weight",
      d: `Learned from the data. Orange pushes the ${out.kind === "chance" ? "chance" : out.name} up, blue pushes it down; a thicker line is a bigger weight.`,
    },
    {
      t: "Multiply",
      d: `Each input × its weight gives its push. Here the biggest push is ${top.label.toLowerCase()} (${top.raw}): ${signed(top.c)}${out.kind === "value" ? ` ${out.unit}` : ""}.`,
    },
    {
      t: "Add it all up",
      d: `Start from the bias (an average ${entity}) and add every push. The bar at the bottom shows the sum being built.`,
    },
    out.kind === "chance"
      ? {
          t: "Squash it into a chance",
          d: `The sigmoid curve turns any sum into a number between 0 and 100%. This ${entity}: ${(p * 100).toFixed(p < 0.1 ? 1 : 0)}% chance of ${out.event}.`,
        }
      : {
          t: "The sum is the prediction",
          d: `For a number like ${out.name}, nothing is squashed: the sum itself is the answer, ${fmtNum(logit, out.digits)} ${out.unit}.`,
        },
    out.kind === "chance"
      ? {
          t: "Make a decision",
          d: `Above the line (${Math.round(out.threshold * 100)}%): ${out.flag}. Below: ${out.pass}. This one is ${p >= out.threshold ? out.flag : out.pass}${row.actual ? `, and in reality ${row.actual}` : ""}.`,
        }
      : {
          t: "Check it against reality",
          d:
            row.value !== undefined
              ? `Predicted ${fmtNum(logit, out.digits)}, actual ${fmtNum(row.value, out.digits)} ${out.unit}: off by ${fmtNum(Math.abs(logit - row.value), out.digits)}.`
              : "The real value isn't known yet for this one.",
        },
    {
      t: "Where the weights came from",
      d: `Training starts every weight at zero, then nudges them again and again until the predictions match the answers for ${trained}. Watch the weights grow.`,
    },
    {
      t: "One neuron, or many",
      d: (
        <>
          This whole model is one neuron. Stack many of them in layers and you get a neural network, like the ones on the{" "}
          <Link href="/skills/deep-learning" className="underline underline-offset-2">
            Deep Learning page
          </Link>
          .
        </>
      ),
    },
  ];

  return (
    <InsideSection title={title} line={line}>
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label={entity} rows={rows} value={pick} onChange={setPick} tag={(r) => r.actual ?? ""} />
            <div className="min-h-0 flex-1 px-2 pb-9 sm:px-4">
              <NeuronVisual step={step} terms={terms} model={model} out={out} values={values} actual={row.value} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}

/** n rows spread across the model's scores (lowest to highest), so the picker shows easy and hard cases. */
export function spread<T>(rows: T[], score: (r: T) => number, n = 5): T[] {
  const sorted = [...rows].sort((a, b) => score(a) - score(b));
  if (sorted.length <= n) return sorted;
  return Array.from({ length: n }, (_, i) => sorted[Math.round((i * (sorted.length - 1)) / (n - 1))]);
}
