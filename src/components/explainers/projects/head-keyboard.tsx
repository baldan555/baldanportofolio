"use client";

import { BLINK, INSTANT, headPointer, predict, WORDS } from "@/lib/head-keyboard";
import { FONT, FaceExplainer, FaceFigure, INK, MONO, MUTED, NEUTRAL, UP, type Pose } from "../face";

const r1 = (v: number) => Math.round(v * 10) / 10;
const ROWS = ["ABCDEFG", "HIJKLMN", "OPQRSTU", "VWXYZ.?"];
const RANGE = { yaw: 18, pitch: 12 }; // degrees of head turn that cover the keyboard (example setting)
const POSES: { id: string; pose: Pose; deg: { yaw: number; pitch: number } }[] = [
  { id: "Centre", pose: NEUTRAL, deg: { yaw: 0, pitch: 0 } },
  { id: "Turn left", pose: { ...NEUTRAL, yaw: -0.6 }, deg: { yaw: 12, pitch: 0 } },
  { id: "Look down-right", pose: { ...NEUTRAL, yaw: 0.5, pitch: 0.5 }, deg: { yaw: -10, pitch: 8 } },
];

function Keyboard({ px, py, hi }: { px: number; py: number; hi?: string }) {
  const x0 = 300;
  const y0 = 110;
  const kw = 42;
  const kh = 44;
  const cx = r1(x0 + px * 7 * kw);
  const cy = r1(y0 + py * 4 * kh);
  const key = ROWS[Math.min(3, Math.floor(py * 4))]?.[Math.min(6, Math.floor(px * 7))];
  return (
    <g>
      {ROWS.map((row, r) =>
        Array.from(row).map((k, c) => (
          <g key={k + r}>
            <rect x={x0 + c * kw + 2} y={y0 + r * kh + 2} width={kw - 4} height={kh - 4} rx={8} fill={k === (hi ?? key) ? UP : "#fff"} stroke="rgba(11,11,11,0.12)" />
            <text x={x0 + c * kw + kw / 2} y={y0 + r * kh + kh / 2 + 5} fontSize={14} fontFamily={FONT} textAnchor="middle" fill={k === (hi ?? key) ? "#fff" : INK}>
              {k}
            </text>
          </g>
        )),
      )}
      <circle cx={cx} cy={cy} r={11} fill="none" stroke={INK} strokeWidth={3} />
    </g>
  );
}

export function render(step: number, pick: number) {
  const p = POSES[pick];
  const ptr = headPointer({ ...p.deg, roll: 0 }, { yaw: 0, pitch: 0, ear: 0.3 }, RANGE);
  if (step === 2) {
    return (
      <g>
        <FaceFigure x={150} y={230} s={92} pose={p.pose} />
        <text x={150} y={400} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          YAW {p.deg.yaw}° · PITCH {p.deg.pitch}°
        </text>
        <Keyboard px={ptr.x} py={ptr.y} />
        <text x={300} y={320} fontSize={12} fontFamily={FONT} fill={INK}>
          ±{RANGE.yaw}° left–right and ±{RANGE.pitch}° up–down cover the whole keyboard,
        </text>
        <text x={300} y={340} fontSize={12} fontFamily={FONT} fill={INK}>
          mirrored like a selfie (an example setting; it&apos;s adjustable).
        </text>
      </g>
    );
  }
  if (step === 3) {
    return (
      <g>
        <text x={60} y={60} fontSize={11} fontFamily={MONO} fill={MUTED}>
          OR THE EYES: WHERE THE IRIS SITS BETWEEN THE EYE CORNERS AND LIDS
        </text>
        {[-1, 0, 1].map((g, i) => (
          <g key={g} transform={`translate(${120 + i * 200}, 170)`}>
            <path d="M-70,0 Q0,-46 70,0 Q0,46 -70,0" fill="#fff" stroke={INK} strokeWidth={2.5} />
            <circle cx={g * 34} cy={0} r={20} fill={INK} />
            <text x={0} y={80} fontSize={12} fontFamily={FONT} textAnchor="middle" fill={INK}>
              {["looking left", "centre", "looking right"][i]}
            </text>
          </g>
        ))}
        <text x={60} y={320} fontSize={12.5} fontFamily={FONT} fill={INK}>
          Five dots on screen calibrate it: where your iris sits when you look at each one.
        </text>
      </g>
    );
  }
  if (step === 4) {
    return (
      <g>
        <text x={60} y={60} fontSize={11} fontFamily={MONO} fill={MUTED}>
          TWO WAYS TO CLICK WITH A BLINK
        </text>
        {[
          ["Instant", `clicks the moment the eyes close; at most once every ${INSTANT.refractoryMs / 1000} s`, 0.15],
          ["Hold", `eyes closed ${BLINK.minMs / 1000}–${BLINK.maxMs / 1000} s, clicks on reopening: natural blinks don't type`, 0.55],
        ].map(([name, d, w], i) => (
          <g key={name as string} transform={`translate(60, ${110 + i * 120})`}>
            <text fontSize={15} fontFamily={FONT} fill={INK} fontWeight={700}>
              {name as string}
            </text>
            <text y={24} fontSize={12} fontFamily={FONT} fill={INK}>
              {d as string}
            </text>
            <rect y={40} width={500} height={14} rx={7} fill="rgba(11,11,11,0.06)" />
            <rect y={40} width={(w as number) * 500} height={14} rx={7} fill={UP} />
            <text x={(w as number) * 500 + 8} y={52} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
              eyes closed
            </text>
          </g>
        ))}
      </g>
    );
  }
  if (step === 5) {
    return (
      <g>
        <Keyboard px={0.07} py={0.62} hi="Q" />
        <text x={60} y={140} fontSize={14} fontFamily={FONT} fill={INK} fontWeight={700}>
          Dwell
        </text>
        <text x={60} y={162} fontSize={12} fontFamily={FONT} fill={INK}>
          stay on a key until its bar fills
        </text>
        <text x={60} y={220} fontSize={14} fontFamily={FONT} fill={INK} fontWeight={700}>
          Scanning
        </text>
        <text x={60} y={242} fontSize={12} fontFamily={FONT} fill={INK}>
          rows light up in turn; blink
        </text>
        <text x={60} y={260} fontSize={12} fontFamily={FONT} fill={INK}>
          to pick a row, then a key
        </text>
      </g>
    );
  }
  const typed = "i need wa";
  const sug = predict(typed, WORDS.en);
  return (
    <g>
      <text x={60} y={80} fontSize={11} fontFamily={MONO} fill={MUTED}>
        WORD SUGGESTIONS SAVE PRESSES
      </text>
      <rect x={60} y={100} width={520} height={56} rx={12} fill="#fff" stroke="rgba(11,11,11,0.12)" />
      <text x={78} y={135} fontSize={20} fontFamily={FONT} fill={INK}>
        {typed}
        <tspan fill={UP}>|</tspan>
      </text>
      {sug.map((w, i) => (
        <g key={w} transform={`translate(${60 + i * 140}, 180)`}>
          <rect width={128} height={44} rx={10} fill={i === 0 ? INK : "#fff"} stroke="rgba(11,11,11,0.12)" />
          <text x={64} y={28} fontSize={15} fontFamily={FONT} textAnchor="middle" fill={i === 0 ? "#fff" : INK}>
            {w}
          </text>
        </g>
      ))}
      <text x={60} y={270} fontSize={12} fontFamily={FONT} fill={INK}>
        One blink on a suggestion finishes the word. Then Speak reads the message aloud.
      </text>
    </g>
  );
}

export function Inside() {
  return (
    <FaceExplainer
      title="From a head turn to a word."
      line="Google's network gives the head's pose, the eyelids and the irises; the pointer, clicks and keyboard are my code. The faces are diagrams; the settings are the demo's."
      picks={POSES.map((p) => ({ id: p.id, pose: p.pose }))}
      steps={[
        { t: "The head is the pointer", d: "Yaw (left–right) and pitch (up–down) from the face model, measured from your relaxed pose, move the pointer over the keyboard." },
        { t: "Or the eyes", d: "For people who can't move their head: the iris position between the eye corners and lids, mapped by a 5-dot calibration." },
        { t: "A blink is the click", d: "The same eye aspect ratio as the Drowsiness Detector tells when the eyes close." },
        { t: "No blinking needed", d: "Dwell presses whatever you stay on; scanning lets someone type with blinks alone." },
        { t: "Fewer presses per word", d: "Suggestions from short English and Indonesian word lists finish words early, because every press takes effort." },
      ]}
      render={render}
    />
  );
}
