"use client";

import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { faceModel } from "@/data/face-model";
import { InsideSection, Picker, Scrolly, type Step } from "./scrolly";

export const UP = "#eb6834";
export const BLUE = "#2a78d6";
export const INK = "#0b0b0b";
export const MUTED = "rgba(11,11,11,0.45)";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
export const FONT = "ui-sans-serif, system-ui, sans-serif";
export const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
const r1 = (v: number) => Math.round(v * 10) / 10;

/** A face pose for the diagram: eyes open 0–1, mouth open 0–1, smile −1–1, brows −1 (down) to 1 (up), head turn −1–1. */
export type Pose = { open: number; mouth: number; smile: number; brow: number; yaw: number; pitch: number };
export const NEUTRAL: Pose = { open: 1, mouth: 0, smile: 0, brow: 0, yaw: 0, pitch: 0 };

const EYE_W = 0.42;
/** The six eyelid points the detector uses (corner, two on the upper lid, corner, two on the lower lid), in face units. */
export function eyePoints(cx: number, cy: number, open: number) {
  const h = 0.3 * EYE_W * open; // an open eye's aspect ratio is about 0.3
  return [
    [cx - EYE_W / 2, cy],
    [cx - EYE_W / 6, cy - h / 2],
    [cx + EYE_W / 6, cy - h / 2],
    [cx + EYE_W / 2, cy],
    [cx + EYE_W / 6, cy + h / 2],
    [cx - EYE_W / 6, cy + h / 2],
  ] as [number, number][];
}
/** Eye aspect ratio: the two lid gaps over twice the eye's width (the formula in src/lib/drowsiness.ts). */
export function earOf(p: [number, number][]) {
  const d = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  return (d(p[1], p[5]) + d(p[2], p[4])) / (2 * d(p[0], p[3]));
}

/** A simple drawn face (a diagram, not a model output) whose features follow `pose`. */
export function FaceFigure({ x, y, s, pose, eyeDots = false, mesh = false }: { x: number; y: number; s: number; pose: Pose; eyeDots?: boolean; mesh?: boolean }) {
  const fx = (u: number) => r1(x + (u + pose.yaw * 0.32) * s);
  const fy = (v: number) => r1(y + (v + pose.pitch * 0.22) * s);
  const eyes = [-0.42, 0.42].map((cx) => eyePoints(cx, -0.22, pose.open));
  const brow = (cx: number, side: number) => {
    const lift = pose.brow * 0.09;
    const inner = pose.brow < 0 ? pose.brow * 0.08 : pose.brow * 0.05;
    return `M${fx(cx - side * 0.24)},${fy(-0.46 - lift)} Q${fx(cx)},${fy(-0.54 - lift)} ${fx(cx + side * 0.24)},${fy(-0.46 - lift + inner)}`;
  };
  const mw = 0.32;
  const my = 0.62;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={s} ry={s * 1.3} fill="#fff" stroke="rgba(11,11,11,0.25)" strokeWidth={2} />
      {mesh &&
        Array.from({ length: 120 }, (_, i) => {
          // evenly spread dots inside the oval, to suggest the model's dense mesh (illustration)
          const a = i * 2.39996;
          const rr = Math.sqrt((i + 0.5) / 120);
          return <circle key={i} cx={fx(Math.cos(a) * rr * 0.92)} cy={fy(Math.sin(a) * rr * 1.2)} r={1.4} fill="rgba(11,11,11,0.25)" />;
        })}
      {eyes.map((p, k) => (
        <g key={k}>
          <path
            d={`M${fx(p[0][0])},${fy(p[0][1])} Q${fx(p[1][0] + EYE_W / 6)},${fy(p[1][1] - 0.04 * pose.open)} ${fx(p[3][0])},${fy(p[3][1])} Q${fx(p[5][0] + EYE_W / 6)},${fy(p[5][1] + 0.04 * pose.open)} ${fx(p[0][0])},${fy(p[0][1])}`}
            fill="rgba(11,11,11,0.06)"
            stroke={INK}
            strokeWidth={1.8}
          />
          {pose.open > 0.25 && <circle cx={fx(k ? 0.42 : -0.42)} cy={fy(-0.22)} r={0.05 * s * Math.min(1, pose.open)} fill={INK} />}
          {eyeDots && p.map(([u, v], i) => <circle key={i} cx={fx(u)} cy={fy(v)} r={3.6} fill={UP} />)}
        </g>
      ))}
      <path d={brow(-0.42, -1)} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d={brow(0.42, 1)} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${fx(0)},${fy(-0.1)} L${fx(-0.08)},${fy(0.28)} L${fx(0.06)},${fy(0.3)}`} fill="none" stroke="rgba(11,11,11,0.4)" strokeWidth={1.8} />
      <path
        d={`M${fx(-mw)},${fy(my - pose.smile * 0.08)} Q${fx(0)},${fy(my + pose.smile * 0.16)} ${fx(mw)},${fy(my - pose.smile * 0.08)}`}
        fill="none"
        stroke={INK}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      {pose.mouth > 0.05 && <path d={`M${fx(-mw * 0.8)},${fy(my)} Q${fx(0)},${fy(my + pose.mouth * 0.42)} ${fx(mw * 0.8)},${fy(my)}`} fill="rgba(11,11,11,0.75)" />}
    </g>
  );
}

const W = 640;
const H = 440;

export function FaceVisual({ step, pose, render }: { step: number; pose: Pose; render: (step: number) => ReactNode }) {
  const common = step <= 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="A face turned into landmarks and movements, then into a reading">
      <motion.g initial={false} animate={{ opacity: common ? 1 : 0 }} transition={tr}>
        <FaceFigure x={320} y={225} s={118} pose={pose} mesh={step === 1} />
        <motion.rect x={180} y={50} width={280} height={350} rx={14} fill="none" stroke={UP} strokeWidth={2.5} initial={false} animate={{ opacity: step === 0 ? 1 : 0 }} transition={tr} />
        {step === 0 && (
          <text x={184} y={42} fontSize={10.5} fontFamily={MONO} fill={UP}>
            FACE DETECTOR: A FACE IS HERE
          </text>
        )}
        {step === 1 && (
          <text x={W / 2} y={428} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
            {faceModel.landmarks} POINTS · {faceModel.blendshapes} MOVEMENT SCORES · HEAD POSE (DIAGRAM)
          </text>
        )}
      </motion.g>
      {!common && render(step)}
    </svg>
  );
}

export function FaceExplainer({
  title,
  line,
  picks,
  steps,
  render,
}: {
  title: string;
  line?: string;
  picks: { id: string; pose: Pose; tag?: string }[];
  steps: Step[];
  render: (step: number, pick: number) => ReactNode;
}) {
  const [pick, setPick] = useState(0);
  const all: Step[] = [
    { t: "Find the face", d: "Google's face detector finds the face in the camera picture. The drawing here is a diagram; the real thing runs on your camera in the demo." },
    {
      t: `${faceModel.landmarks} points and ${faceModel.blendshapes} movements`,
      d: `A second network places ${faceModel.landmarks} points on the face, scores ${faceModel.blendshapes} facial movements (smile, blink, brow raise…) and estimates where the head points. Everything after this is my code.`,
    },
    ...steps,
  ];
  return (
    <InsideSection title={title} line={line}>
      <Scrolly steps={all}>
        {(step) => (
          <>
            {picks.length > 1 && <Picker label="Face" rows={picks} value={pick} onChange={setPick} tag={(r) => r.tag ?? ""} />}
            <div className="min-h-0 flex-1 px-2 pt-2 pb-9 sm:px-4">
              <FaceVisual step={step} pose={picks[pick].pose} render={(s) => render(s, pick)} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
