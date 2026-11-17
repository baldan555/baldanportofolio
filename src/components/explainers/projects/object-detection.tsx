"use client";

import { motion } from "framer-motion";
import { detector, detectorOptions } from "@/data/object-detector";
import { iou, type Box } from "@/lib/tracker";
import { InsideSection, Scrolly, type Step } from "../scrolly";

const UP = "#eb6834";
const BLUE = "#2a78d6";
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
const chosen = detectorOptions.find((o) => o.chosen)!;
const THRESHOLD = 0.3; // the demo's score threshold (src/lib/mediapipe.ts loadObjectDetector)

/** A drawn desk scene with example candidate boxes and scores (illustration; the demo runs the real model). */
type Cand = Box & { cls: string; score: number };
const CANDS: Cand[] = [
  { x: 120, y: 150, w: 220, h: 150, cls: "laptop", score: 0.91 },
  { x: 110, y: 140, w: 240, h: 165, cls: "laptop", score: 0.74 },
  { x: 135, y: 165, w: 195, h: 130, cls: "laptop", score: 0.62 },
  { x: 400, y: 205, w: 70, h: 90, cls: "cup", score: 0.82 },
  { x: 392, y: 198, w: 82, h: 100, cls: "cup", score: 0.66 },
  { x: 405, y: 215, w: 60, h: 78, cls: "cup", score: 0.41 },
  { x: 500, y: 120, w: 90, h: 180, cls: "bottle", score: 0.22 },
  { x: 60, y: 300, w: 120, h: 50, cls: "book", score: 0.12 },
  { x: 380, y: 120, w: 110, h: 90, cls: "tv", score: 0.08 },
];
const KEEP = CANDS.filter((c) => c.score >= THRESHOLD);
/** Non-maximum suppression: best box first, drop same-class boxes that overlap it a lot. */
const FINAL = (() => {
  const out: Cand[] = [];
  for (const c of [...KEEP].sort((a, b) => b.score - a.score)) if (!out.some((o) => o.cls === c.cls && iou(o, c) > 0.5)) out.push(c);
  return out;
})();

const W = 640;
const H = 440;

function Scene() {
  return (
    <g>
      <rect x={20} y={300} width={600} height={110} fill="rgba(11,11,11,0.05)" />
      <path d="M135,290 L325,290 L340,305 L120,305 Z" fill="rgba(11,11,11,0.35)" />
      <rect x={145} y={170} width={170} height={118} rx={6} fill="rgba(11,11,11,0.75)" />
      <path d="M410,215 L460,215 L455,290 L415,290 Z" fill="rgba(11,11,11,0.55)" />
      <path d="M460,232 Q480,250 457,268" fill="none" stroke="rgba(11,11,11,0.55)" strokeWidth={6} />
    </g>
  );
}

export function Visual({ step }: { step: number }) {
  const grid = step === 1;
  const shown = step <= 1 ? [] : step === 2 ? CANDS : step === 3 ? CANDS : step === 4 ? KEEP : FINAL;
  const best = Math.max(...detectorOptions.map((o) => o.cpu));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="An object detector: many candidate boxes, scored, filtered and merged">
      <motion.g initial={false} animate={{ opacity: step <= 5 ? 1 : 0 }} transition={tr}>
        <Scene />
        {step === 0 && (
          <g>
            <rect x={20} y={30} width={600} height={380} fill="none" stroke="rgba(11,11,11,0.25)" strokeDasharray="5 5" />
            <text x={26} y={24} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
              RESIZED TO {detector.input} × {detector.input} PIXELS
            </text>
          </g>
        )}
        {grid &&
          Array.from({ length: 140 }, (_, i) => {
            const cx = 40 + (i % 14) * 43;
            const cy = 50 + Math.floor(i / 14) * 36;
            const s = [24, 40, 60][i % 3];
            return <rect key={i} x={cx - s / 2} y={cy - s / 2} width={s} height={s * (i % 2 ? 0.7 : 1.3)} fill="none" stroke={BLUE} strokeWidth={0.6} opacity={0.35} />;
          })}
        {shown.map((c, i) => {
          const faded = step === 3 && c.score < THRESHOLD;
          const final = step >= 5;
          return (
            <g key={i} opacity={faded ? 0.18 : 1}>
              <rect x={c.x} y={c.y} width={c.w} height={c.h} fill="none" stroke={final ? UP : c.score >= THRESHOLD ? INK : MUTED} strokeWidth={final ? 3 : 1.5} rx={4} />
              <rect x={c.x} y={c.y - 18} width={92} height={18} fill={final ? UP : "rgba(11,11,11,0.75)"} rx={3} />
              <text x={c.x + 5} y={c.y - 5} fontSize={10.5} fontFamily={MONO} fill="#fff">
                {c.cls} {c.score.toFixed(2)}
              </text>
            </g>
          );
        })}
        {step === 3 && (
          <text x={20} y={430} fontSize={12} fontFamily={FONT} fill={INK}>
            Below {THRESHOLD}: dropped ({CANDS.length - KEEP.length} here)
          </text>
        )}
        {step === 4 && (
          <text x={20} y={430} fontSize={12} fontFamily={FONT} fill={INK}>
            Three boxes around one laptop: keep the best, drop the ones that overlap it by more than half (IoU {iou(CANDS[0], CANDS[1]).toFixed(2)}).
          </text>
        )}
      </motion.g>
      <motion.g initial={false} animate={{ opacity: step === 6 ? 1 : 0 }} transition={tr}>
        <text x={40} y={50} fontSize={11} fontFamily={MONO} fill={MUTED}>
          TIME PER PICTURE ON A PIXEL 6 PHONE CPU (GOOGLE&apos;S BENCHMARK, MS)
        </text>
        {detectorOptions.map((o, i) => (
          <g key={o.model}>
            <text x={40} y={92 + i * 62} fontSize={12.5} fontFamily={FONT} fill={INK} fontWeight={o.chosen ? 700 : 400}>
              {o.model} · {o.mb} MB
            </text>
            <rect x={40} y={102 + i * 62} width={(o.cpu / best) * 480} height={16} rx={8} fill={o.chosen ? UP : "rgba(11,11,11,0.3)"} />
            <text x={48 + (o.cpu / best) * 480} y={115 + i * 62} fontSize={11} fontFamily={MONO} fill={INK}>
              {o.cpu}
            </text>
          </g>
        ))}
      </motion.g>
    </svg>
  );
}

export function Inside() {
  const steps: Step[] = [
    { t: "A picture, made small", d: `Every camera frame is resized to ${detector.input} × ${detector.input} pixels: small enough to run many times a second on a phone.` },
    {
      t: `${detector.candidates.toLocaleString("en-US")} guesses at once`,
      d: "The network doesn't search the picture. In one pass it scores a fixed grid of candidate boxes at every position and several sizes and shapes, and nudges each box to fit.",
    },
    {
      t: "A score for every object type",
      d: `Each candidate gets a score for each of the ${detector.classes} things it knows (person, cup, laptop, bottle…), learned from ${detector.instances} labelled objects in the COCO dataset.`,
    },
    { t: "Keep the confident ones", d: `Boxes scoring under ${THRESHOLD} are dropped. Lower finds more things and more mistakes; higher misses more.` },
    { t: "One box per object", d: "Several candidates usually fire on the same object. Non-maximum suppression keeps the best and removes the others that overlap it heavily." },
    {
      t: "What's left is the answer",
      d: "Boxes, labels and scores, drawn on your camera image dozens of times a second. The scene and scores here are an illustration; the demo shows the real output.",
    },
    {
      t: "Why this model",
      d: `Google benchmarks several detectors. EfficientDet-Lite0 in 16-bit floats is ${chosen.mb} MB and takes about ${Math.round(chosen.gpu ?? 0)} ms on a phone's graphics chip; the 8-bit version is quicker on the CPU but can't use the graphics chip.`,
    },
  ];
  return (
    <InsideSection title="How a detector finds things." line="Google's EfficientDet-Lite0 runs in your browser; here is what happens inside one pass, drawn on an illustrated desk.">
      <Scrolly steps={steps}>
        {(step) => (
          <div className="min-h-0 flex-1 px-2 pt-3 pb-9 sm:px-4">
            <Visual step={step} />
          </div>
        )}
      </Scrolly>
    </InsideSection>
  );
}
