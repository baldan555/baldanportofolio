"use client";

import { useEffect, useState } from "react";
import { DEFAULTS, PERCLOS_MIN_MS } from "@/lib/drowsiness";
import { BLUE, FONT, FaceExplainer, FaceFigure, INK, MONO, MUTED, NEUTRAL, UP, earOf, eyePoints } from "../face";

const OPEN_EAR = earOf(eyePoints(0, 0, 1));
const THRESH = OPEN_EAR * DEFAULTS.closedRatio;
const r1 = (v: number) => Math.round(v * 10) / 10;

/** An example minute of eye openness: blinks, then the lids sagging and staying shut (diagram, not a recording). */
const OPENNESS = Array.from({ length: 120 }, (_, i) => {
  if ([14, 41, 66].includes(i)) return 0.05; // quick blinks
  if (i >= 88 && i <= 106) return 0.08; // eyes shut ~1.9 s at 10 samples/s
  if (i > 80 && i < 88) return 1 - (i - 80) * 0.1; // drooping
  return 1;
});

function Blinking({ step }: { step: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (step !== 3) return;
    const id = setInterval(() => setT((v) => (v + 1) % 40), 60);
    return () => clearInterval(id);
  }, [step]);
  const open = step === 3 ? Math.abs(Math.cos((t / 40) * Math.PI)) : 1;
  const pts = eyePoints(0, 0, open);
  const s = 520;
  const X = (u: number) => r1(320 + u * s);
  const Y = (v: number) => r1(180 + v * s);
  const e = earOf(pts);
  return (
    <g>
      <path
        d={`M${X(pts[0][0])},${Y(0)} Q${X(0)},${Y(pts[1][1] * 1.6)} ${X(pts[3][0])},${Y(0)} Q${X(0)},${Y(pts[5][1] * 1.6)} ${X(pts[0][0])},${Y(0)}`}
        fill="rgba(11,11,11,0.05)"
        stroke={INK}
        strokeWidth={2.5}
      />
      <line x1={X(pts[1][0])} y1={Y(pts[1][1])} x2={X(pts[5][0])} y2={Y(pts[5][1])} stroke={UP} strokeWidth={2.5} />
      <line x1={X(pts[2][0])} y1={Y(pts[2][1])} x2={X(pts[4][0])} y2={Y(pts[4][1])} stroke={UP} strokeWidth={2.5} />
      <line x1={X(pts[0][0])} y1={Y(0) + 4} x2={X(pts[3][0])} y2={Y(0) + 4} stroke={BLUE} strokeWidth={2.5} strokeDasharray="6 4" />
      {pts.map(([u, v], i) => (
        <g key={i}>
          <circle cx={X(u)} cy={Y(v)} r={6} fill={UP} />
          <text x={X(u) + (i === 0 ? -22 : i === 3 ? 10 : 6)} y={Y(v) + (i === 1 || i === 2 ? -10 : i === 4 || i === 5 ? 20 : 4)} fontSize={12} fontFamily={MONO} fill={INK}>
            p{i + 1}
          </text>
        </g>
      ))}
      <text x={320} y={300} fontSize={14} fontFamily={MONO} textAnchor="middle" fill={INK}>
        EAR = (<tspan fill={UP}>|p2−p6| + |p3−p5|</tspan>) ÷ (2 × <tspan fill={BLUE}>|p1−p4|</tspan>)
      </text>
      <text x={320} y={340} fontSize={30} fontFamily={FONT} textAnchor="middle" fill={e < THRESH ? UP : INK} fontWeight={700}>
        {e.toFixed(2)}
      </text>
      <text x={320} y={362} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
        {e < THRESH ? "CLOSED" : "OPEN"} · OPEN EYE ≈ {OPEN_EAR.toFixed(2)}
      </text>
    </g>
  );
}

export function render(step: number) {
  if (step === 2) {
    return (
      <g>
        <FaceFigure x={320} y={230} s={150} pose={NEUTRAL} eyeDots />
        <text x={320} y={428} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          SIX POINTS PER EYE, FROM THE {"478"}
        </text>
      </g>
    );
  }
  if (step === 3) return <Blinking step={step} />;
  // steps 5–7 share the timeline
  const x = (i: number) => r1(60 + (i / (OPENNESS.length - 1)) * 540);
  const ears = OPENNESS.map((o) => earOf(eyePoints(0, 0, o)));
  const y = (e: number) => r1(300 - (e / (OPEN_EAR * 1.15)) * 220);
  let run = 0;
  const closedFor = ears.map((e) => (run = e < THRESH ? run + 100 : 0));
  return (
    <g>
      <text x={60} y={50} fontSize={11} fontFamily={MONO} fill={MUTED}>
        EYE ASPECT RATIO OVER 12 SECONDS (EXAMPLE)
      </text>
      {step >= 4 && <line x1={60} x2={600} y1={y(THRESH)} y2={y(THRESH)} stroke={UP} strokeDasharray="5 4" />}
      {step >= 4 && (
        <text x={604} y={y(THRESH) + 4} fontSize={10} fontFamily={MONO} fill={UP}>
          {Math.round(DEFAULTS.closedRatio * 100)}%
        </text>
      )}
      {step >= 5 &&
        closedFor.map((ms, i) =>
          ms > 0 ? <rect key={i} x={x(i)} y={80} width={4.6} height={220} fill={ms >= DEFAULTS.alarmMs ? "#e34948" : ms > DEFAULTS.blinkMaxMs ? UP : BLUE} opacity={0.2} /> : null,
        )}
      <path d={ears.map((e, i) => `${i ? "L" : "M"}${x(i)},${y(e)}`).join(" ")} fill="none" stroke={INK} strokeWidth={2} />
      {step === 4 && (
        <g>
          <text x={60} y={340} fontSize={12.5} fontFamily={FONT} fill={INK}>
            Closed = below {Math.round(DEFAULTS.closedRatio * 100)}% of <tspan fontWeight={700}>your</tspan> open-eye value, measured in the first seconds.
          </text>
          <text x={60} y={362} fontSize={12.5} fontFamily={FONT} fill={INK}>
            Eyes differ, so the threshold adapts to each person.
          </text>
        </g>
      )}
      {step === 5 && (
        <g>
          <text x={60} y={340} fontSize={12.5} fontFamily={FONT} fill={INK}>
            <tspan fill={BLUE}>■</tspan> under {DEFAULTS.blinkMaxMs} ms: a blink · <tspan fill={UP}>■</tspan> longer: heavy eyes · <tspan fill="#e34948">■</tspan> {DEFAULTS.alarmMs / 1000} s+: alarm
          </text>
          <text x={60} y={366} fontSize={12.5} fontFamily={FONT} fill={INK} fontWeight={700}>
            The alarm goes off {DEFAULTS.alarmMs / 1000} s after the eyes shut, at {(closedFor.findIndex((ms) => ms >= DEFAULTS.alarmMs) / 10).toFixed(1)} s on this timeline.
          </text>
        </g>
      )}
      {step === 6 && (
        <g>
          <text x={60} y={340} fontSize={12.5} fontFamily={FONT} fill={INK}>
            PERCLOS: share of the last minute with eyes closed (shown after {PERCLOS_MIN_MS / 1000} s of data).
          </text>
          <text x={60} y={362} fontSize={12.5} fontFamily={FONT} fill={INK}>
            Yawns: mouth open past a ratio of {DEFAULTS.yawnMar} for {DEFAULTS.yawnMs / 1000} s.
          </text>
        </g>
      )}
    </g>
  );
}

export function Inside() {
  return (
    <FaceExplainer
      title="From eyelids to an alarm."
      line="Google's network places the face points; the rest is one ratio and a few timers I wrote. The face and the timeline are diagrams; the thresholds are the demo's real settings."
      picks={[{ id: "face", pose: NEUTRAL }]}
      steps={[
        { t: "Six points per eye", d: "Of the 478 points, six outline each eye: two corners, two on the upper lid, two on the lower lid." },
        { t: "The eye aspect ratio", d: "The two lid gaps divided by twice the eye's width. It drops towards 0 as the eye closes, at any distance from the camera." },
        { t: "Calibrated to your eyes", d: `The demo measures your open eyes first; “closed” means below ${Math.round(DEFAULTS.closedRatio * 100)}% of that.` },
        { t: "A blink or falling asleep?", d: `Blinks last a fraction of a second. Eyes closed for ${DEFAULTS.alarmMs / 1000} s set off the alarm.` },
        { t: "Slower signs of fatigue", d: "Over minutes, the share of time with eyes closed (PERCLOS) and yawns show tiredness before the eyes shut for long." },
      ]}
      render={render}
    />
  );
}
