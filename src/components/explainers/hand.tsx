"use client";

import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import data from "@/data/sample-hands.json";
import { InsideSection, Picker, Scrolly, type Step } from "./scrolly";

export type Hand = [number, number][];
/** Average hands of a few ASL letters from the ASLNow! dataset: wrist at (0, 0), palm length 1, y downwards. */
export const HANDS = data.hands as unknown as Record<string, Hand>;

export const UP = "#eb6834";
export const BLUE = "#2a78d6";
export const INK = "#0b0b0b";
export const MUTED = "rgba(11,11,11,0.45)";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
export const FONT = "ui-sans-serif, system-ui, sans-serif";
export const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
export const r1 = (v: number) => Math.round(v * 10) / 10;
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
export const TIPS = [4, 8, 12, 16, 20];

/** Screen position of landmark i when the hand is drawn with its wrist at (x, y) and palm length s. */
export const at = (hand: Hand, i: number, x: number, y: number, s: number, mirror = false) => [r1(x + (mirror ? -1 : 1) * hand[i][0] * s), r1(y + hand[i][1] * s)] as const;

/** A hand skeleton (SVG group). `hi` highlights landmarks; `color` tints bones. */
export function HandFigure({
  hand,
  x,
  y,
  s,
  hi = [],
  color = "rgba(11,11,11,0.35)",
  dot = INK,
  labels = false,
  mirror = false,
}: {
  hand: Hand;
  x: number;
  y: number;
  s: number;
  hi?: number[];
  color?: string;
  dot?: string;
  labels?: boolean;
  mirror?: boolean;
}) {
  return (
    <g>
      {BONES.map(([a, b]) => {
        const [x1, y1] = at(hand, a, x, y, s, mirror);
        const [x2, y2] = at(hand, b, x, y, s, mirror);
        return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={Math.max(1.5, s / 30)} strokeLinecap="round" />;
      })}
      {hand.map((_, i) => {
        const [cx, cy] = at(hand, i, x, y, s, mirror);
        const h = hi.includes(i);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={h ? Math.max(4, s / 14) : Math.max(2.4, s / 26)} fill={h ? UP : dot} />
            {labels && (i === 0 || TIPS.includes(i)) && (
              <text x={cx + 7} y={cy - 6} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
                {i}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

const W = 640;
const H = 440;

/** Steps 1–2 are the same for every hand project: find the hand, then 21 points. The rest comes from `render`. */
export function HandVisual({ step, hand, render }: { step: number; hand: Hand; render: (step: number, hand: Hand) => ReactNode }) {
  const common = step <= 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="A hand turned into 21 points, then into an action">
      <motion.g initial={false} animate={{ opacity: common ? 1 : 0 }} transition={tr}>
        <rect x={150} y={36} width={340} height={360} rx={14} fill="#fff" opacity={0.5} stroke="rgba(11,11,11,0.15)" strokeDasharray="5 5" />
        <text x={160} y={56} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
          CAMERA FRAME
        </text>
        <motion.rect x={232} y={92} width={176} height={276} rx={10} fill="none" stroke={UP} strokeWidth={2.5} initial={false} animate={{ opacity: step === 0 ? 1 : 0.25 }} transition={tr} />
        {step === 0 && (
          <text x={236} y={86} fontSize={10.5} fontFamily={MONO} fill={UP}>
            PALM DETECTOR: A HAND IS HERE
          </text>
        )}
        <HandFigure hand={hand} x={320} y={350} s={92} labels={step === 1} dot={step === 1 ? INK : "rgba(11,11,11,0.25)"} color={step === 1 ? "rgba(11,11,11,0.4)" : "rgba(11,11,11,0.15)"} />
        {step === 1 && (
          <text x={W / 2} y={420} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
            21 LANDMARKS · x, y AND DEPTH · 0 = WRIST, 4 8 12 16 20 = FINGERTIPS
          </text>
        )}
      </motion.g>
      {!common && render(step, hand)}
    </svg>
  );
}

export function HandExplainer({
  title,
  line,
  picks,
  steps,
  render,
}: {
  title: string;
  line?: string;
  picks: { id: string; hand: Hand; tag?: string }[];
  steps: Step[];
  render: (step: number, hand: Hand) => ReactNode;
}) {
  const [pick, setPick] = useState(0);
  const hand = picks[pick].hand;
  const all: Step[] = [
    { t: "Find the hand", d: "Google's first network scans the camera picture for a palm and draws a box around it. Everything here runs in your browser." },
    {
      t: "Place 21 points",
      d: "A second network looks inside the box and places 21 landmarks with depth: the wrist, every knuckle and joint, every fingertip. From here on, only these 63 numbers matter.",
    },
    ...steps,
  ];
  return (
    <InsideSection title={title} line={line}>
      <Scrolly steps={all}>
        {(step) => (
          <>
            <Picker label="Hand" rows={picks} value={pick} onChange={setPick} tag={(r) => r.tag ?? ""} />
            <div className="min-h-0 flex-1 px-2 pb-9 sm:px-4">
              <HandVisual step={step} hand={hand} render={render} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
