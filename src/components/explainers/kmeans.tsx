"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { InsideSection, Scrolly, type Step } from "./scrolly";

const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6", "#d6497b", "#c29a00", "#0f766e", "#64748b"];
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

type Pt = [number, number];
export type KState = { c: Pt[]; lab: number[]; moved: number };

/** Lloyd's algorithm, one state per round: centres, who belongs to which, and how far the centres then moved. */
export function lloyd(points: Pt[], init: Pt[], maxIter = 50): KState[] {
  let c = init.map((p) => [...p] as Pt);
  const states: KState[] = [];
  for (let it = 0; it < maxIter; it++) {
    const lab = points.map((p) => {
      let best = 0;
      let bd = Infinity;
      c.forEach((q, k) => {
        const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
        if (dd < bd) [bd, best] = [dd, k];
      });
      return best;
    });
    const next = c.map((q, k) => {
      const mine = points.filter((_, i) => lab[i] === k);
      return mine.length ? ([mine.reduce((s, p) => s + p[0], 0) / mine.length, mine.reduce((s, p) => s + p[1], 0) / mine.length] as Pt) : q;
    });
    const moved = next.reduce((s, q, k) => s + Math.hypot(q[0] - c[k][0], q[1] - c[k][1]), 0);
    states.push({ c, lab, moved });
    c = next;
    if (moved < 1e-9) break;
  }
  return states;
}

const W = 640;
const H = 440;
const M = { l: 52, r: 18, t: 22, b: 46 };

export function Visual({
  step,
  points,
  states,
  names,
  axes,
  scores,
  best,
}: {
  step: number;
  points: Pt[];
  states: KState[];
  names: { name: string; size: number }[];
  axes: { x: string; y: string; xr: Pt; yr: Pt };
  scores: { k: number; s: number }[];
  best: number;
}) {
  // step 5 replays every round on a loop
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (step !== 4) return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % (states.length + 3); // pause on the final state for a moment
      setRound(Math.min(i, states.length - 1));
    }, 650);
    return () => clearInterval(id);
  }, [step, states.length]);

  const last = states.length - 1;
  const s = step <= 1 ? states[0] : step === 2 ? states[0] : step === 3 ? { ...states[1], lab: states[0].lab } : step === 4 ? states[round] : states[last];
  const coloured = step >= 2;
  const sx = (v: number) => M.l + ((v - axes.xr[0]) / (axes.xr[1] - axes.xr[0])) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((v - axes.yr[0]) / (axes.yr[1] - axes.yr[0])) * (H - M.t - M.b);
  const tr = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };
  const showScores = step === 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="K-means: centres move to the middle of their groups until nothing changes">
      <motion.g initial={false} animate={{ opacity: showScores ? 0.12 : 1 }} transition={tr}>
        {/* axes */}
        <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="rgba(11,11,11,0.2)" />
        <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="rgba(11,11,11,0.2)" />
        <text x={(M.l + W - M.r) / 2} y={H - 12} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          {axes.x.toUpperCase()}
        </text>
        <text x={14} y={(M.t + H - M.b) / 2} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED} transform={`rotate(-90 14 ${(M.t + H - M.b) / 2})`}>
          {axes.y.toUpperCase()}
        </text>
        {/* step 3: who is nearest to which centre */}
        {step === 2 &&
          points.map((p, i) => {
            const c = s.c[s.lab[i]];
            return <line key={`l${i}`} x1={sx(p[0])} y1={sy(p[1])} x2={sx(c[0])} y2={sy(c[1])} stroke={COLORS[s.lab[i]]} strokeWidth={0.6} opacity={0.35} />;
          })}
        {/* the people */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={sx(p[0])}
            cy={sy(p[1])}
            r={4}
            initial={false}
            animate={{ fill: coloured ? COLORS[s.lab[i]] : "rgba(11,11,11,0.35)" }}
            transition={{ duration: 0.35 }}
            opacity={0.8}
          />
        ))}
        {/* the centres */}
        {step >= 1 &&
          s.c.map((c, k) => (
            <motion.g key={`c${k}`} initial={false} animate={{ x: sx(c[0]), y: sy(c[1]) }} transition={step === 4 ? { duration: 0.5, ease: "easeInOut" } : tr}>
              <circle r={13} fill="#fff" stroke={COLORS[k]} strokeWidth={3} />
              <path d="M-5,-5 L5,5 M5,-5 L-5,5" stroke={INK} strokeWidth={2} />
            </motion.g>
          ))}
        {/* final: names */}
        {step === 5 &&
          states[last].c.map((c, k) => (
            <g key={`n${k}`}>
              <rect x={Math.min(W - 190, sx(c[0]) + 16)} y={sy(c[1]) - 26} width={172} height={22} rx={6} fill="#fff" stroke={COLORS[k]} />
              <text x={Math.min(W - 190, sx(c[0]) + 16) + 8} y={sy(c[1]) - 11} fontSize={10.5} fontFamily={FONT} fill={INK}>
                {names[k].name.slice(0, 28)} · {names[k].size}
              </text>
            </g>
          ))}
        {step === 4 && (
          <text x={W - M.r} y={M.t + 8} fontSize={11} fontFamily={MONO} textAnchor="end" fill={INK}>
            ROUND {round + 1} / {states.length} · CENTRES MOVED {states[round].moved.toFixed(1)}
          </text>
        )}
      </motion.g>
      {/* step 7: how good is each k? */}
      <motion.g initial={false} animate={{ opacity: showScores ? 1 : 0 }} transition={tr} pointerEvents="none">
        <text x={W / 2} y={60} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          SILHOUETTE SCORE FOR EACH NUMBER OF GROUPS (HIGHER = CLEANER GROUPS)
        </text>
        {scores.map((d, i) => {
          const bw = (W - 160) / scores.length;
          const x = 80 + i * bw;
          const max = Math.max(...scores.map((q) => q.s));
          const h = (d.s / max) * 260;
          return (
            <g key={d.k}>
              <rect x={x + 8} y={360 - h} width={bw - 16} height={h} rx={4} fill={d.k === best ? INK : "rgba(11,11,11,0.18)"} />
              <text x={x + bw / 2} y={352 - h} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={INK}>
                {d.s.toFixed(2)}
              </text>
              <text x={x + bw / 2} y={380} fontSize={12} fontFamily={FONT} textAnchor="middle" fill={INK} fontWeight={d.k === best ? 700 : 400}>
                k = {d.k}
              </text>
            </g>
          );
        })}
      </motion.g>
    </svg>
  );
}

export function KMeansExplainer({
  title,
  line,
  points,
  init,
  names,
  axes,
  scores,
  best,
  entity,
  starts,
}: {
  title: string;
  line?: string;
  points: Pt[];
  /** indices of the starting centres (real points) */
  init: number[];
  /** final centre → segment name and size, in the same order as the replay's centres */
  names: (centres: Pt[]) => { name: string; size: number }[];
  axes: { x: string; y: string; xr: Pt; yr: Pt };
  scores: { k: number; s: number }[];
  best: number;
  entity: string;
  /** how many random starts training tried */
  starts: number;
}) {
  const states = useMemo(
    () =>
      lloyd(
        points,
        init.map((i) => points[i]),
      ),
    [points, init],
  );
  const final = states[states.length - 1].c;
  const segs = useMemo(() => names(final), [names, final]);
  const k = init.length;

  const steps: Step[] = [
    { t: `${points.length} ${entity}s, two numbers each`, d: `Each dot is a real ${entity}: ${axes.x.toLowerCase()} across, ${axes.y.toLowerCase()} up. Nobody told the model any groups.` },
    { t: `Drop ${k} centres`, d: `K-means starts with ${k} centres placed on random ${entity}s. Their places don't matter much, as you'll see.` },
    { t: "Everyone joins the nearest centre", d: `Each ${entity} takes the colour of the closest centre, measured as straight-line distance.` },
    { t: "Each centre moves to its group's middle", d: "Every centre jumps to the average position of the dots that chose it. Now some dots are closer to a different centre." },
    {
      t: "Repeat until nothing moves",
      d: `Join, move, join, move. This start settles after ${states.length} rounds. Training ran ${starts} different starts and kept the tightest result; most land on the same groups.`,
    },
    { t: `${k} segments`, d: "The final groups get names from where they sit: income and spending together describe each type of shopper." },
    { t: `Why ${best}?`, d: `K-means can't choose k itself. Training ran it for every k and scored how cleanly separated the groups are (silhouette); ${best} scored highest.` },
  ];

  return (
    <InsideSection title={title} line={line}>
      <Scrolly steps={steps}>
        {(step) => (
          <div className="min-h-0 flex-1 px-2 pt-3 pb-9 sm:px-4">
            <Visual step={step} points={points} states={states} names={segs} axes={axes} scores={scores} best={best} />
          </div>
        )}
      </Scrolly>
    </InsideSection>
  );
}
