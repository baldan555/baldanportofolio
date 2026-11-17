"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/sign-language.json";
import { softmax, type Layer, type SignModel } from "@/lib/sign";
import { InsideSection, Picker, Scrolly, type Step } from "../scrolly";

const M = model.model as SignModel;
const UP = "#eb6834";
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const BONES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];
const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
const r2 = (v: number) => Math.round(v * 100) / 100;

/** The same dense layers as src/lib/sign.ts, keeping every layer's activations for the picture. */
function dense(x: number[], l: Layer, relu: boolean) {
  const [nin, nout] = l.shape;
  const out = l.b.slice();
  for (let i = 0; i < nin; i++) for (let j = 0; j < nout; j++) out[j] += x[i] * l.w[i * nout + j];
  return relu ? out.map((v) => Math.max(0, v)) : out;
}
function forward(f: number[]) {
  const h1 = dense(f, M.d1, true);
  const h2 = dense(h1, M.d2, true);
  const logits = dense(h2, M.out, false);
  return { h1, h2, probs: softmax(logits) };
}

// each letter's average hand from the dataset (x, y already normalised); depth is left out, so z = 0
const HANDS = model.mean_hand as [number, number][][];
const featuresOf = (k: number) => HANDS[k].flatMap((p) => [p[0], p[1], 0]);
const GUESS = HANDS.map((_, k) => {
  const p = forward(featuresOf(k)).probs;
  return p.indexOf(Math.max(...p));
});
const CORRECT = GUESS.filter((g, k) => g === k).length;
const MISSES = GUESS.map((g, k) => (g === k ? "" : `${model.letters[k]}→${model.letters[g]}`)).filter(Boolean);

const W = 640;
const H = 440;

function Block({ x, y, cols, cell, values, max, on }: { x: number; y: number; cols: number; cell: number; values: number[]; max: number; on: boolean }) {
  return (
    <motion.g initial={false} animate={{ opacity: on ? 1 : 0.15 }} transition={tr}>
      {values.map((v, i) => (
        <rect key={i} x={x + (i % cols) * cell} y={y + Math.floor(i / cols) * cell} width={cell - 2} height={cell - 2} rx={2} fill={INK} opacity={r2(0.06 + 0.94 * Math.min(1, Math.abs(v) / max))} />
      ))}
    </motion.g>
  );
}

export function Visual({ step, k }: { step: number; k: number }) {
  const f = useMemo(() => featuresOf(k), [k]);
  const { h1, h2, probs } = useMemo(() => forward(f), [f]);
  const top = probs.indexOf(Math.max(...probs));
  const order = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);
  const hand = HANDS[k];
  // step 1 shows the hand somewhere in a camera frame; step 2 moves it to the normalised position
  const norm = step >= 1;
  const S = norm ? 78 : 56;
  const ox = norm ? 100 : 150;
  const oy = norm ? 340 : 290;
  const px = (p: [number, number]) => [ox + p[0] * S, oy + p[1] * S] as const;
  const net = step >= 2 && step <= 5;
  const inX = 212;
  const h1X = 268;
  const h2X = 420;
  const outX = 572;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="A hand's 21 points flowing through a small neural network to a letter">
      {/* the hand */}
      <motion.g initial={false} animate={{ opacity: step <= 5 ? 1 : 0 }} transition={tr}>
        {step === 0 && <rect x={40} y={60} width={300} height={300} rx={14} fill="none" stroke="rgba(11,11,11,0.15)" strokeDasharray="5 5" />}
        {step === 0 && (
          <text x={48} y={78} fontSize={10} fontFamily={MONO} fill={MUTED}>
            CAMERA FRAME
          </text>
        )}
        {BONES.map(([a, b]) => {
          const [x1, y1] = px(hand[a]);
          const [x2, y2] = px(hand[b]);
          return <motion.line key={`${a}-${b}`} initial={false} animate={{ x1, y1, x2, y2 }} transition={tr} stroke="rgba(11,11,11,0.35)" strokeWidth={2} />;
        })}
        {hand.map((p, i) => {
          const [cx, cy] = px(p);
          return <motion.circle key={i} r={i === 0 || i === 9 ? 5 : 3.5} initial={false} animate={{ cx, cy }} transition={tr} fill={i === 0 || i === 9 ? UP : INK} />;
        })}
        {step === 1 && (
          <g>
            <line x1={ox} y1={oy} x2={px(hand[9])[0]} y2={px(hand[9])[1]} stroke={UP} strokeWidth={2.5} strokeDasharray="5 3" />
            <text x={ox + 10} y={oy + 22} fontSize={11} fontFamily={MONO} fill={UP}>
              wrist = (0, 0) · palm length = 1
            </text>
          </g>
        )}
      </motion.g>

      {/* the network */}
      <motion.g initial={false} animate={{ opacity: net ? 1 : 0 }} transition={tr}>
        <text x={inX} y={44} fontSize={10} fontFamily={MONO} fill={MUTED}>
          63 IN
        </text>
        <Block x={inX} y={52} cols={3} cell={11} values={f} max={Math.max(...f.map(Math.abs))} on={step >= 2} />
        <text x={h1X} y={44} fontSize={10} fontFamily={MONO} fill={MUTED}>
          128 NEURONS
        </text>
        <Block x={h1X} y={52} cols={8} cell={14} values={h1} max={Math.max(...h1, 1e-9)} on={step >= 3} />
        <text x={h2X} y={44} fontSize={10} fontFamily={MONO} fill={MUTED}>
          64 NEURONS
        </text>
        <Block x={h2X} y={52} cols={8} cell={16} values={h2} max={Math.max(...h2, 1e-9)} on={step >= 4} />
        <text x={outX} y={44} fontSize={10} fontFamily={MONO} fill={MUTED}>
          26 LETTERS
        </text>
        <motion.g initial={false} animate={{ opacity: step >= 5 ? 1 : 0.15 }} transition={tr}>
          {model.letters.map((l, i) => (
            <g key={l}>
              <rect x={outX + (i % 2) * 30} y={52 + Math.floor(i / 2) * 26} width={26} height={22} rx={5} fill={i === top ? UP : INK} opacity={i === top ? 1 : r2(0.06 + 0.9 * probs[i])} />
              <text x={outX + (i % 2) * 30 + 13} y={52 + Math.floor(i / 2) * 26 + 15} fontSize={11} fontFamily={FONT} textAnchor="middle" fill={i === top || probs[i] > 0.5 ? "#fff" : INK}>
                {l}
              </text>
            </g>
          ))}
        </motion.g>
        {[
          [inX + 33, h1X - 4, step >= 3],
          [h1X + 112, h2X - 4, step >= 4],
          [h2X + 128, outX - 4, step >= 5],
        ].map(([a, b, on], i) => (
          <g key={i} opacity={on ? 1 : 0.2}>
            {[0, 1, 2, 3, 4].map((j) => (
              <line key={j} x1={a as number} y1={90 + j * 50} x2={b as number} y2={110 + j * 40} stroke={j % 2 ? UP : "#2a78d6"} strokeWidth={1} opacity={0.35} />
            ))}
            {on && (
              <circle r={3} fill={UP}>
                <animateMotion dur="1.2s" repeatCount="indefinite" path={`M${a},${200} L${b},${200}`} />
              </circle>
            )}
          </g>
        ))}
      </motion.g>

      {/* step 6: answer */}
      <motion.g initial={false} animate={{ opacity: step === 6 ? 1 : 0 }} transition={tr}>
        <text x={W / 2} y={70} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          TOP 5 OF 26 · SOFTMAX
        </text>
        {order.slice(0, 5).map((i, n) => (
          <g key={i}>
            <text x={170} y={120 + n * 52} fontSize={20} fontFamily={FONT} fontWeight={700} fill={n === 0 ? UP : INK}>
              {model.letters[i]}
            </text>
            <rect x={210} y={104 + n * 52} width={300} height={18} rx={9} fill="rgba(11,11,11,0.06)" />
            <rect x={210} y={104 + n * 52} width={Math.max(3, probs[i] * 300)} height={18} rx={9} fill={n === 0 ? UP : "rgba(11,11,11,0.35)"} />
            <text x={520} y={118 + n * 52} fontSize={12} fontFamily={MONO} fill={INK}>
              {(probs[i] * 100).toFixed(1)}%
            </text>
          </g>
        ))}
      </motion.g>

      {/* step 7: tested fairly */}
      <motion.g initial={false} animate={{ opacity: step === 7 ? 1 : 0 }} transition={tr}>
        <text x={W / 2} y={70} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          LETTERS RIGHT ON UNSEEN HANDS (5-FOLD, NEAR-DUPLICATES KEPT TOGETHER)
        </text>
        {Object.entries(model.results.grouped).map(([name, acc], n) => (
          <g key={name}>
            <text x={60} y={140 + n * 70} fontSize={13} fontFamily={FONT} fill={INK} fontWeight={name.startsWith("Neural") ? 700 : 400}>
              {name}
            </text>
            <rect x={60} y={150 + n * 70} width={500} height={20} rx={10} fill="rgba(11,11,11,0.06)" />
            <rect x={60} y={150 + n * 70} width={(acc as number) * 500} height={20} rx={10} fill={name.startsWith("Neural") ? UP : "rgba(11,11,11,0.35)"} />
            <text x={570} y={165 + n * 70} fontSize={12} fontFamily={MONO} fill={INK}>
              {((acc as number) * 100).toFixed(1)}%
            </text>
          </g>
        ))}
      </motion.g>
    </svg>
  );
}

const PICKS = ["A", "B", "L", "V", "W", "Y"].map((l) => model.letters.indexOf(l));
const rows = PICKS.map((k) => ({ id: model.letters[k], k }));

export function Inside() {
  const [pick, setPick] = useState(0);
  const k = rows[pick].k;
  const { probs } = useMemo(() => forward(featuresOf(k)), [k]);
  const top = probs.indexOf(Math.max(...probs));
  const params = [M.d1, M.d2, M.out].reduce((s, l) => s + l.shape[0] * l.shape[1] + l.b.length, 0);

  const steps: Step[] = [
    {
      t: "A hand as 21 points",
      d: `Google's hand model turns the camera picture into 21 points: wrist, knuckles, joints and fingertips. This is the average “${model.letters[k]}” of the dataset's ${model.dataset.samples.toLocaleString("en-US")} hands.`,
    },
    { t: "Normalise first", d: "Move the wrist to (0, 0) and divide by the palm length. Now a hand close to the camera and one far away give the same numbers." },
    { t: "63 numbers in", d: "21 points × (x, y, depth) = 63 inputs (depth is 0 for these averages). The squares show them; darker means further from the wrist." },
    { t: "128 neurons", d: "Each neuron weighs all 63 inputs, adds them up and keeps the result only if it's positive. Darker squares fired harder for this hand." },
    { t: "64 more neurons", d: "The second layer combines the first layer's patterns: which fingers are bent, where the thumb sits." },
    { t: "26 output neurons", d: "One per letter. The strongest one is the network's answer." },
    {
      t: "Softmax: the answer",
      d: `Here: ${model.letters[top]} at ${(probs[top] * 100).toFixed(1)}%. Fed every letter's average hand, it names ${CORRECT} of 26 correctly; the misses (${MISSES.join(", ")}) are shapes told apart by depth or crossed fingers, which a flat average hides.`,
    },
    {
      t: "Tested fairly",
      d: `Neighbouring video frames look alike, so near-identical hands were kept on the same side of every split. With that, the network (${params.toLocaleString("en-US")} weights) gets ${(model.results.grouped["Neural network (MLP)"] * 100).toFixed(1)}% of letters right on hands it never saw, ahead of simpler methods.`,
    },
  ];

  return (
    <InsideSection
      title="From 21 points to a letter."
      line="Google's model finds the hand; a small neural network I trained reads the letter. Scroll through one hand, computed live with the real weights."
    >
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label="Average hand" rows={rows} value={pick} onChange={setPick} />
            <div className="min-h-0 flex-1 px-2 pb-9 sm:px-4">
              <Visual step={step} k={k} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
