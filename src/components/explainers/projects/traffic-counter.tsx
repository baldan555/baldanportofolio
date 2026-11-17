"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { TRACK, Tracker, iou, type Det, type Line } from "@/lib/tracker";
import { InsideSection, Scrolly, type Step } from "../scrolly";

const UP = "#eb6834";
const BLUE = "#2a78d6";
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
const r1 = (v: number) => Math.round(v * 10) / 10;

/*
 * A simulated street (not a camera recording): three road users cross the picture while a pretend detector reports
 * their boxes with a little jitter and one missed frame. The tracker and the counting line are the demo's real code.
 */
const FRAMES = 44;
const LINE: Line = { x1: 330, y1: 150, x2: 330, y2: 330 };
const USERS = [
  { cls: "car", y: 180, w: 70, h: 40, x0: -60, v: 15, miss: [14] },
  { cls: "bus", y: 250, w: 120, h: 54, x0: 40, v: 9, miss: [] as number[] },
  { cls: "bicycle", y: 300, w: 34, h: 28, x0: 560, v: -8, miss: [] as number[] },
];
const jit = (f: number, k: number) => (((f * 73 + k * 151) % 17) - 8) * 0.4; // fixed pseudo-noise, a few pixels
const DETS: Det[][] = Array.from({ length: FRAMES }, (_, f) =>
  USERS.flatMap((u, k) => {
    const x = u.x0 + u.v * f;
    if (u.miss.includes(f) || x < -u.w || x > 640) return [];
    return [{ x: x + jit(f, k), y: u.y + jit(f + 3, k), w: u.w, h: u.h, cls: u.cls, score: 0.6 + ((f + k) % 5) * 0.06 }];
  }),
);
/** Run the real tracker over the simulated frames once, keeping what to draw for every frame. */
const RUN = (() => {
  const t = new Tracker();
  let count = 0;
  return DETS.map((dets) => {
    count += t.update(dets, LINE).length;
    return { dets, tracks: t.visible().map((x) => ({ id: x.id, box: { ...x.box }, cls: x.cls, trail: [...x.trail], counted: x.counted, missed: x.misses > 0 })), count };
  });
})();

const W = 640;
const H = 440;

export function Visual({ step }: { step: number }) {
  const [f, setF] = useState(FRAMES - 1);
  useEffect(() => {
    if (step < 1 || step > 4 || step === 2) return;
    let k = 0;
    const id = setInterval(() => {
      k = (k + 1) % (FRAMES + 8);
      setF(Math.min(k, FRAMES - 1));
    }, 140);
    return () => clearInterval(id);
  }, [step]);
  const frame = step === 0 ? 20 : step === 2 ? 9 : f;
  const fr = RUN[frame];
  const a = DETS[9].find((d) => d.cls === "car")!;
  const b = DETS[10].find((d) => d.cls === "car")!;
  const overlap = iou(a, b);
  const showTracks = step >= 3;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Simulated traffic: boxes every frame, matched into tracks, counted once at a line">
      {/* the road */}
      <rect x={0} y={160} width={W} height={180} fill="rgba(11,11,11,0.06)" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={i * 90 + 10} y={248} width={50} height={4} fill="rgba(11,11,11,0.15)" />
      ))}
      <text x={16} y={150} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
        SIMULATED STREET · FRAME {frame + 1} / {FRAMES}
      </text>
      {/* counting line */}
      <motion.g initial={false} animate={{ opacity: step >= 4 ? 1 : 0 }} transition={tr}>
        <line x1={LINE.x1} y1={LINE.y1 - 10} x2={LINE.x2} y2={LINE.y2 + 10} stroke={UP} strokeWidth={3} strokeDasharray="8 5" />
        <text x={LINE.x1 + 8} y={LINE.y1 - 14} fontSize={11} fontFamily={MONO} fill={UP}>
          COUNTING LINE
        </text>
        <rect x={470} y={46} width={150} height={70} rx={12} fill="#fff" stroke="rgba(11,11,11,0.12)" />
        <text x={545} y={88} fontSize={30} fontFamily={FONT} textAnchor="middle" fill={INK} fontWeight={700}>
          {fr.count}
        </text>
        <text x={545} y={108} fontSize={10.5} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          COUNTED
        </text>
      </motion.g>
      {/* step 3: two boxes, one car */}
      {step === 2 && (
        <g>
          <rect x={a.x} y={a.y} width={a.w} height={a.h} fill="none" stroke={BLUE} strokeWidth={2.5} />
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={UP} strokeWidth={2.5} />
          <text x={a.x} y={a.y - 8} fontSize={11} fontFamily={MONO} fill={BLUE}>
            frame 10
          </text>
          <text x={b.x + b.w - 50} y={b.y + b.h + 16} fontSize={11} fontFamily={MONO} fill={UP}>
            frame 11
          </text>
          <text x={W / 2} y={400} fontSize={14} fontFamily={FONT} textAnchor="middle" fill={INK}>
            overlap ÷ union = <tspan fontWeight={700}>{overlap.toFixed(2)}</tspan> ≥ {TRACK.iouMin} → same car
          </text>
        </g>
      )}
      {/* raw detections */}
      {(step === 0 || step === 1) &&
        fr.dets.map((d, i) => (
          <g key={i}>
            <rect x={r1(d.x)} y={r1(d.y)} width={d.w} height={d.h} rx={4} fill="rgba(11,11,11,0.1)" stroke={step === 1 ? INK : "rgba(11,11,11,0.3)"} strokeWidth={step === 1 ? 2 : 1} />
            {step === 1 && (
              <text x={r1(d.x)} y={r1(d.y) - 5} fontSize={10.5} fontFamily={MONO} fill={INK}>
                {d.cls} {d.score.toFixed(2)}
              </text>
            )}
          </g>
        ))}
      {step === 1 && DETS[frame].length < USERS.filter((u) => u.x0 + u.v * frame > -u.w && u.x0 + u.v * frame < 640).length && (
        <text x={16} y={380} fontSize={12} fontFamily={FONT} fill="#e34948">
          The detector missed the car in this frame.
        </text>
      )}
      {/* tracks */}
      {showTracks &&
        fr.tracks.map((t) => (
          <g key={t.id}>
            <path d={t.trail.map((p, i) => `${i ? "L" : "M"}${r1(p.x)},${r1(p.y)}`).join(" ")} fill="none" stroke={t.counted ? UP : BLUE} strokeWidth={2} opacity={0.6} />
            <rect x={r1(t.box.x)} y={r1(t.box.y)} width={t.box.w} height={t.box.h} rx={4} fill="none" stroke={t.counted ? UP : BLUE} strokeWidth={2.5} strokeDasharray={t.missed ? "5 4" : undefined} />
            <text x={r1(t.box.x)} y={r1(t.box.y) - 5} fontSize={11} fontFamily={MONO} fill={t.counted ? UP : BLUE} fontWeight={700}>
              #{t.id} {t.cls}
              {t.missed ? " (coasting)" : ""}
            </text>
          </g>
        ))}
      {step === 5 && (
        <g>
          <rect x={40} y={350} width={560} height={84} rx={12} fill="#fff" stroke="rgba(11,11,11,0.12)" />
          <text x={58} y={374} fontSize={13} fontFamily={FONT} fill={INK} fontWeight={700}>
            On the real cameras
          </text>
          <text x={58} y={396} fontSize={12} fontFamily={FONT} fill={INK}>
            London JamCam clips: about 10 s of low-resolution video, analysed at 12 frames a second.
          </text>
          <text x={58} y={416} fontSize={12} fontFamily={FONT} fill={INK}>
            Small or far vehicles get missed; overlaps can merge tracks; not checked against hand counts.
          </text>
        </g>
      )}
    </svg>
  );
}

export function Inside() {
  const total = useMemo(() => RUN[RUN.length - 1].count, []);
  const steps: Step[] = [
    { t: "A street, frame by frame", d: "The demo plays a live London traffic camera clip. Here a simulated street stands in for it, so every step is easy to see." },
    {
      t: "Detect every frame",
      d: "Google's EfficientDet-Lite0 finds cars, buses, bikes and people in each frame on its own, with a confidence score. It has no idea that a box in one frame is the same car as in the next, and sometimes it misses one.",
    },
    {
      t: "Same car or a new one?",
      d: `Boxes are matched to the previous frame's tracks by overlap: the shared area over the combined area (IoU). At ${TRACK.iouMin} or more, it's the same road user.`,
    },
    {
      t: "Tracks with an ID",
      d: `A track needs ${TRACK.confirmHits} matches before it counts as real. When the detector misses a frame, the track coasts on its last speed for up to ${TRACK.maxMisses} frames instead of disappearing.`,
    },
    { t: "Count once, at the line", d: `When a track's centre crosses the counting line it is counted, once, with its direction. Here: ${total} road users crossed.` },
    { t: "Honest limits", d: "Counting needs identity: without tracking, one car seen in 30 frames would count 30 times. Even with it, the clips are short and blurry." },
  ];
  return (
    <InsideSection
      title="From boxes to a count."
      line="A detector finds road users in every frame; my tracker decides which boxes are the same car and counts each one once. The street is simulated; the tracker is the real code."
    >
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
