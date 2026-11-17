"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import model from "@/data/models/student-performance.json";
import { InsideSection, Scrolly, type Step } from "./scrolly";

/*
 * "How machine learning learns", on real data: every student's first-term grade (G1) against their final grade,
 * from the Student Performance dataset. A straight line with two knobs is fitted by gradient descent, live, in the
 * browser; nothing here is pre-recorded.
 */

const X = model.g1;
const Y = model.actual;
const N = X.length;
const UP = "#eb6834";
const BLUE = "#2a78d6";
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT = "ui-sans-serif, system-ui, sans-serif";

const test = (i: number) => i % 5 === 4; // every fifth student is held back for the final check
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const mse = (w: number, b: number, idx: number[]) => idx.reduce((s, i) => s + (w * X[i] + b - Y[i]) ** 2, 0) / idx.length;
const mae = (w: number, b: number, idx: number[]) => idx.reduce((s, i) => s + Math.abs(w * X[i] + b - Y[i]), 0) / idx.length;
const ALL = X.map((_, i) => i);
const TRAIN = ALL.filter((i) => !test(i));
const TEST = ALL.filter(test);

/**
 * Gradient descent on the training students. The input is rescaled to mean 0 / spread 1 so one learning rate suits
 * both knobs; every step is converted back to "final = slope × first-term + intercept" for display.
 */
function descend(steps = 50, rate = 0.05) {
  const xs = TRAIN.map((i) => X[i]);
  const mx = mean(xs);
  const sd = Math.sqrt(mean(xs.map((v) => (v - mx) ** 2)));
  let w = 0;
  let b = 0;
  const path: { w: number; b: number; loss: number }[] = [];
  for (let t = 0; t <= steps; t++) {
    const W = w / sd;
    const B = b - (w * mx) / sd;
    path.push({ w: W, b: B, loss: mse(W, B, TRAIN) });
    let gw = 0;
    let gb = 0;
    for (const i of TRAIN) {
      const z = (X[i] - mx) / sd;
      const err = w * z + b - Y[i];
      gw += err * z;
      gb += err;
    }
    w -= (rate * 2 * gw) / TRAIN.length;
    b -= (rate * 2 * gb) / TRAIN.length;
  }
  return path;
}
const PATH = descend();
const FINAL = PATH[PATH.length - 1];

// a tiny, fixed nudge per dot so students with identical grades don't hide behind each other (display only)
// (integer hashing, not Math.sin: server and browser must compute exactly the same positions)
const jitter = (i: number, k: number) => ((((i * 2654435761 + k * 40503) >>> 0) % 1000) / 1000 - 0.5) * 0.72;

const W = 640;
const H = 440;
const P = { l: 56, r: 24, t: 24, b: 48 };
const r1 = (v: number) => Math.round(v * 10) / 10;
const sx = (v: number) => r1(P.l + (v / 20) * (W - P.l - P.r));
const sy = (v: number) => r1(H - P.b - (v / 20) * (H - P.t - P.b));
// the loss landscape: slope across, intercept up
const LS = { w0: -0.3, w1: 1.5, b0: -4, b1: 8, cols: 46, rows: 32 };
const lx = (w: number) => P.l + ((w - LS.w0) / (LS.w1 - LS.w0)) * (W - P.l - P.r);
const ly = (b: number) => H - P.b - ((b - LS.b0) / (LS.b1 - LS.b0)) * (H - P.t - P.b);
const GRID = (() => {
  const cells: { x: number; y: number; v: number }[] = [];
  const max = Math.log(mse(LS.w0, LS.b0, TRAIN) + 1);
  for (let c = 0; c < LS.cols; c++)
    for (let r = 0; r < LS.rows; r++) {
      const w = LS.w0 + ((c + 0.5) / LS.cols) * (LS.w1 - LS.w0);
      const b = LS.b0 + ((r + 0.5) / LS.rows) * (LS.b1 - LS.b0);
      cells.push({ x: c, y: r, v: Math.round((1 - Math.log(mse(w, b, TRAIN) + 1) / max) * 100) / 100 });
    }
  return cells;
})();

export function Visual({ step }: { step: number }) {
  // steps 4–5 replay the descent on a loop
  const [it, setIt] = useState(0);
  useEffect(() => {
    if (step !== 3 && step !== 4) return;
    let t = 0;
    const id = setInterval(() => {
      t = (t + 1) % (PATH.length + 14);
      setIt(Math.min(t, PATH.length - 1));
    }, 110);
    return () => clearInterval(id);
  }, [step]);
  const k = step < 3 ? 0 : step <= 4 ? it : PATH.length - 1;
  const cur = PATH[k];
  const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
  const landscape = step === 4;
  const showLine = step >= 1 && !landscape;
  const lossMax = PATH[0].loss;

  return (
    <div className="relative min-h-0 flex-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="A line fitted to students' grades by gradient descent">
        {/* scatter of students */}
        <motion.g initial={false} animate={{ opacity: landscape || step === 6 ? 0 : 1 }} transition={tr}>
          <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="rgba(11,11,11,0.25)" />
          <line x1={P.l} x2={P.l} y1={P.t} y2={H - P.b} stroke="rgba(11,11,11,0.25)" />
          {[0, 5, 10, 15, 20].map((v) => (
            <g key={v}>
              <text x={sx(v)} y={H - P.b + 16} fontSize={10} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
                {v}
              </text>
              <text x={P.l - 8} y={sy(v) + 3} fontSize={10} fontFamily={MONO} textAnchor="end" fill={MUTED}>
                {v}
              </text>
            </g>
          ))}
          <text x={(P.l + W - P.r) / 2} y={H - 10} fontSize={10.5} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
            FIRST-TERM GRADE (0–20)
          </text>
          <text x={16} y={(P.t + H - P.b) / 2} fontSize={10.5} fontFamily={MONO} textAnchor="middle" fill={MUTED} transform={`rotate(-90 16 ${(P.t + H - P.b) / 2})`}>
            FINAL GRADE (0–20)
          </text>
          {/* misses: each student's distance to the line */}
          {step === 2 &&
            ALL.map((i) => {
              const px = X[i] + jitter(i, 1);
              return <line key={`m${i}`} x1={sx(px)} x2={sx(px)} y1={sy(Y[i] + jitter(i, 2))} y2={sy(cur.w * X[i] + cur.b)} stroke={UP} strokeWidth={0.6} opacity={0.25} />;
            })}
          {ALL.map((i) => (
            <circle
              key={i}
              cx={sx(X[i] + jitter(i, 1))}
              cy={sy(Y[i] + jitter(i, 2))}
              r={step === 5 && test(i) ? 3.4 : 2.6}
              fill={step === 5 ? (test(i) ? UP : "rgba(11,11,11,0.25)") : INK}
              opacity={step === 5 ? 1 : 0.45}
            />
          ))}
          {/* the model: one straight line, two knobs */}
          {showLine && (
            <motion.line
              x1={sx(0)}
              x2={sx(20)}
              initial={false}
              animate={{ y1: sy(Math.max(-2, Math.min(22, cur.b))), y2: sy(Math.max(-2, Math.min(22, cur.w * 20 + cur.b))) }}
              transition={step === 3 ? { duration: 0.1, ease: "linear" } : tr}
              stroke={BLUE}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          )}
          {showLine && (
            <g>
              <rect x={P.l + 10} y={P.t + 4} width={236} height={step >= 2 ? 64 : 46} rx={10} fill="#fff" stroke="rgba(11,11,11,0.1)" />
              <text x={P.l + 22} y={P.t + 24} fontSize={12.5} fontFamily={MONO} fill={INK}>
                final ={" "}
                <tspan fill={BLUE} fontWeight={700}>
                  {cur.w.toFixed(2)}
                </tspan>{" "}
                × first +{" "}
                <tspan fill={BLUE} fontWeight={700}>
                  {cur.b.toFixed(2)}
                </tspan>
              </text>
              <text x={P.l + 22} y={P.t + 40} fontSize={10} fontFamily={MONO} fill={MUTED}>
                SLOPE KNOB · INTERCEPT KNOB
              </text>
              {step >= 2 && (
                <text x={P.l + 22} y={P.t + 58} fontSize={12} fontFamily={MONO} fill={UP} fontWeight={700}>
                  average squared miss: {cur.loss.toFixed(1)}
                </text>
              )}
            </g>
          )}
          {/* the loss falling */}
          {step === 3 && (
            <g transform={`translate(${W - P.r - 210}, ${H - P.b - 130})`}>
              <rect width={200} height={112} rx={10} fill="#fff" stroke="rgba(11,11,11,0.1)" />
              <text x={12} y={18} fontSize={10} fontFamily={MONO} fill={MUTED}>
                MISS, STEP {k} OF {PATH.length - 1}
              </text>
              <path
                d={PATH.slice(0, k + 1)
                  .map((p, j) => `${j ? "L" : "M"}${(12 + (j / (PATH.length - 1)) * 176).toFixed(1)},${(100 - (p.loss / lossMax) * 70).toFixed(1)}`)
                  .join(" ")}
                fill="none"
                stroke={UP}
                strokeWidth={2}
              />
            </g>
          )}
        </motion.g>

        {/* the loss landscape */}
        <motion.g initial={false} animate={{ opacity: landscape ? 1 : 0 }} transition={tr}>
          {GRID.map((c) => (
            <rect
              key={`${c.x}-${c.y}`}
              x={P.l + (c.x / LS.cols) * (W - P.l - P.r)}
              y={H - P.b - ((c.y + 1) / LS.rows) * (H - P.t - P.b)}
              width={(W - P.l - P.r) / LS.cols + 0.5}
              height={(H - P.t - P.b) / LS.rows + 0.5}
              fill={INK}
              opacity={Math.round(c.v ** 3 * 85) / 100}
            />
          ))}
          <polyline
            points={PATH.slice(0, k + 1)
              .map((p) => `${lx(p.w).toFixed(1)},${ly(p.b).toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke={UP}
            strokeWidth={2.5}
          />
          <circle cx={lx(cur.w)} cy={ly(cur.b)} r={7} fill={UP} stroke="#fff" strokeWidth={2} />
          <circle cx={lx(FINAL.w)} cy={ly(FINAL.b)} r={5} fill="none" stroke="#fff" strokeWidth={2} />
          <text x={(P.l + W - P.r) / 2} y={H - 18} fontSize={10.5} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
            SLOPE KNOB →
          </text>
          <text x={18} y={(P.t + H - P.b) / 2} fontSize={10.5} fontFamily={MONO} textAnchor="middle" fill={MUTED} transform={`rotate(-90 18 ${(P.t + H - P.b) / 2})`}>
            INTERCEPT KNOB →
          </text>
          <text x={lx(0) + 10} y={ly(0) + 4} fontSize={11} fontFamily={FONT} fill={INK} fontWeight={600}>
            start (0, 0)
          </text>
          <text x={W - P.r - 6} y={P.t + 14} fontSize={10.5} fontFamily={MONO} textAnchor="end" fill={INK}>
            DARKER = SMALLER MISS
          </text>
        </motion.g>

        {step === 5 && (
          <g>
            <motion.line x1={sx(0)} x2={sx(20)} y1={sy(FINAL.b)} y2={sy(FINAL.w * 20 + FINAL.b)} stroke={BLUE} strokeWidth={3.5} strokeLinecap="round" initial={false} />
            <rect x={W - P.r - 236} y={H - P.b - 86} width={228} height={74} rx={10} fill="#fff" stroke="rgba(11,11,11,0.1)" />
            <text x={W - P.r - 222} y={H - P.b - 62} fontSize={12} fontFamily={MONO} fill={INK}>
              learned on {TRAIN.length} students: ±{mae(FINAL.w, FINAL.b, TRAIN).toFixed(2)}
            </text>
            <text x={W - P.r - 222} y={H - P.b - 42} fontSize={12} fontFamily={MONO} fill={UP} fontWeight={700}>
              {TEST.length} unseen students: ±{mae(FINAL.w, FINAL.b, TEST).toFixed(2)}
            </text>
            <text x={W - P.r - 222} y={H - P.b - 24} fontSize={10} fontFamily={MONO} fill={MUTED}>
              AVERAGE MISS, IN GRADE POINTS
            </text>
          </g>
        )}
      </svg>

      {/* the recipe, everywhere */}
      <motion.div
        initial={false}
        animate={{ opacity: step === 6 ? 1 : 0, y: step === 6 ? 0 : 10 }}
        transition={tr}
        className={`absolute inset-0 flex flex-col justify-center px-5 pb-10 sm:px-8 ${step === 6 ? "" : "pointer-events-none"}`}
      >
        <div className="grid grid-cols-2 gap-2">
          {[
            { t: "This line + a squash", d: "Logistic regression: the same knobs, then a curve that turns the sum into a chance. Churn, credit, fraud, health.", n: "10 projects" },
            { t: "Questions instead of knobs", d: "Decision trees learn which yes/no question splits the data best, then the next one.", n: "Machines, insurance" },
            { t: "No answers to learn from", d: "K-means and NMF find groups and themes by themselves.", n: "Segments, reviews" },
            { t: "Counting and comparing", d: "Baselines, z-scores and similarities: sometimes the simplest model wins.", n: "Taxi, recommender" },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl bg-white p-2.5 sm:p-3.5">
              <p className="text-[12.5px] leading-tight font-semibold sm:text-[14px]">{c.t}</p>
              <p className="mt-1 line-clamp-4 text-[11px] leading-snug text-ink-2/70 sm:text-[12px]">{c.d}</p>
              <p className="mt-1.5 font-mono text-[10.5px] text-muted uppercase">{c.n}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function HowMlLearns() {
  const start = PATH[0];
  const settled = PATH.findIndex((p) => p.loss - FINAL.loss < 0.01);

  const steps: Step[] = [
    { t: "Learning from examples", d: `Each dot is a real student (${N} of them): first-term grade across, final grade up. Can the first tell us the second?` },
    { t: "A model is a guess with knobs", d: "The simplest guess is a straight line. It has two knobs: how steep it is, and where it starts. Both begin at zero, so it predicts 0 for everyone." },
    { t: "Measure how wrong it is", d: `Each orange line is one miss. Square them and average: ${start.loss.toFixed(0)}. That single number, the loss, is what learning tries to shrink.` },
    {
      t: "Turn the knobs downhill",
      d: `Calculus says which way to turn each knob to shrink the loss fastest (the gradient). Take a small step that way, measure again, repeat. After ${settled} steps it has settled at ${FINAL.loss.toFixed(1)}.`,
    },
    {
      t: "The landscape of mistakes",
      d: "Every knob setting has a loss. Gradient descent is a walk downhill on that landscape until it reaches the valley floor. It never sees the whole map, only the slope where it stands.",
    },
    {
      t: "Test on students it never saw",
      d: `Every fifth student was kept out of training. On them the line misses by ±${mae(FINAL.w, FINAL.b, TEST).toFixed(2)} grade points on average, about as well as on the students it learned from: it found a pattern, not a memory. Guessing the average for everyone would miss by ±${mae(0, mean(TRAIN.map((i) => Y[i])), TEST).toFixed(2)}.`,
    },
    {
      t: "Every project is this recipe",
      d: "Data, a model with knobs, a loss, a way to turn the knobs, and a test on unseen data. The models change; the recipe doesn't. Each project below shows its own version under “Inside the model”.",
    },
  ];

  return (
    <InsideSection
      id="learn"
      kicker="How machine learning learns"
      title="A line, two knobs, and a lot of small steps."
      line="Before the projects: the idea behind all of them, shown on real data and computed live in your browser."
    >
      <Scrolly steps={steps}>
        {(step) => (
          <div className="flex min-h-0 flex-1 flex-col px-2 pt-3 pb-9 sm:px-4">
            <Visual step={step} />
          </div>
        )}
      </Scrolly>
    </InsideSection>
  );
}
