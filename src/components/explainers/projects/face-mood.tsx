"use client";

import { MOODS, moodProbs, type Shapes } from "@/lib/face-mood";
import { FONT, FaceExplainer, FaceFigure, INK, MONO, MUTED, NEUTRAL, UP, type Pose } from "../face";

/** Example movement scores for five faces (made up for the diagram; the demo reads yours from the camera). */
const FACES: { id: string; pose: Pose; shapes: Shapes }[] = [
  { id: "Smile", pose: { ...NEUTRAL, smile: 0.9, open: 0.8 }, shapes: { mouthSmileLeft: 0.7, mouthSmileRight: 0.68, cheekSquintLeft: 0.35, cheekSquintRight: 0.33 } },
  {
    id: "Surprise",
    pose: { ...NEUTRAL, brow: 1, mouth: 0.8, open: 1.25 },
    shapes: { browInnerUp: 0.6, browOuterUpLeft: 0.5, browOuterUpRight: 0.48, jawOpen: 0.45, eyeWideLeft: 0.3, eyeWideRight: 0.3 },
  },
  {
    id: "Frown",
    pose: { ...NEUTRAL, smile: -0.8, brow: 0.3 },
    shapes: { mouthFrownLeft: 0.25, mouthFrownRight: 0.24, browInnerUp: 0.35, browOuterUpLeft: 0.05, browOuterUpRight: 0.05, mouthShrugLower: 0.3 },
  },
  {
    id: "Scowl",
    pose: { ...NEUTRAL, brow: -1, open: 0.7, smile: -0.2 },
    shapes: { browDownLeft: 0.5, browDownRight: 0.52, noseSneerLeft: 0.25, noseSneerRight: 0.22, mouthPressLeft: 0.3, mouthPressRight: 0.28, eyeSquintLeft: 0.3, eyeSquintRight: 0.3 },
  },
  { id: "Relaxed", pose: NEUTRAL, shapes: { mouthFrownLeft: 0.12, mouthFrownRight: 0.12, browInnerUp: 0.08 } },
];
/** A resting face whose mouth naturally turns down a little: what calibration subtracts. */
const RESTING: Shapes = { mouthFrownLeft: 0.12, mouthFrownRight: 0.12, browInnerUp: 0.08 };

export function render(step: number, pick: number) {
  const f = FACES[pick];
  const res = moodProbs(f.shapes);
  if (step === 2) {
    const entries = Object.entries(f.shapes).sort((a, b) => b[1] - a[1]);
    return (
      <g>
        <FaceFigure x={150} y={220} s={92} pose={f.pose} />
        <text x={300} y={70} fontSize={11} fontFamily={MONO} fill={MUTED}>
          MOVEMENT SCORES, 0–1 (EXAMPLE VALUES)
        </text>
        {entries.map(([k, v], i) => (
          <g key={k}>
            <text x={300} y={104 + i * 30} fontSize={12} fontFamily={MONO} fill={INK}>
              {k}
            </text>
            <rect x={470} y={93 + i * 30} width={140} height={12} rx={6} fill="rgba(11,11,11,0.06)" />
            <rect x={470} y={93 + i * 30} width={v * 140} height={12} rx={6} fill={INK} />
          </g>
        ))}
        <text x={300} y={104 + entries.length * 30 + 10} fontSize={11} fontFamily={FONT} fill={MUTED}>
          …and {52 - entries.length} more near 0
        </text>
      </g>
    );
  }
  if (step === 3) {
    const top = res.top === "neutral" ? "happy" : res.top;
    const parts = res.ev[top].parts;
    return (
      <g>
        <text x={60} y={70} fontSize={11} fontFamily={MONO} fill={MUTED}>
          RULES FOR “{top.toUpperCase()}” (FACIAL ACTION CODING SYSTEM)
        </text>
        {parts.map((p, i) => (
          <g key={p.au + p.label}>
            <text x={60} y={118 + i * 54} fontSize={13} fontFamily={MONO} fill={UP} fontWeight={700}>
              {p.au}
            </text>
            <text x={130} y={118 + i * 54} fontSize={13} fontFamily={FONT} fill={INK}>
              {p.label}
            </text>
            <rect x={130} y={128 + i * 54} width={380} height={10} rx={5} fill="rgba(11,11,11,0.06)" />
            <rect x={130} y={128 + i * 54} width={p.v * 380} height={10} rx={5} fill={UP} />
            <text x={520} y={138 + i * 54} fontSize={11} fontFamily={MONO} fill={INK}>
              {Math.round(p.v * 100)}%
            </text>
          </g>
        ))}
        <text x={60} y={118 + parts.length * 54 + 16} fontSize={12} fontFamily={FONT} fill={INK}>
          Evidence for {top}: {Math.round(res.ev[top].e * 100)}% (weighted: the main movement counts most)
        </text>
      </g>
    );
  }
  if (step === 4) {
    return (
      <g>
        <FaceFigure x={150} y={220} s={92} pose={f.pose} />
        <text x={300} y={90} fontSize={11} fontFamily={MONO} fill={MUTED}>
          EVIDENCE → CHANCES (NEUTRAL WINS WHEN NOTHING IS STRONG)
        </text>
        {MOODS.map((m, i) => (
          <g key={m}>
            <text x={300} y={134 + i * 44} fontSize={14} fontFamily={FONT} fill={INK} fontWeight={m === res.top ? 700 : 400}>
              {m}
            </text>
            <rect x={400} y={122 + i * 44} width={170} height={14} rx={7} fill="rgba(11,11,11,0.06)" />
            <rect x={400} y={122 + i * 44} width={Math.max(2, res.probs[m] * 170)} height={14} rx={7} fill={m === res.top ? UP : "rgba(11,11,11,0.35)"} />
            <text x={578} y={134 + i * 44} fontSize={11} fontFamily={MONO} fill={INK}>
              {Math.round(res.probs[m] * 100)}%
            </text>
          </g>
        ))}
      </g>
    );
  }
  if (step === 5) {
    const raw = moodProbs(FACES[4].shapes);
    const cal = moodProbs(FACES[4].shapes, RESTING);
    return (
      <g>
        <text x={60} y={70} fontSize={11} fontFamily={MONO} fill={MUTED}>
          A RESTING FACE WHOSE MOUTH TURNS DOWN A LITTLE
        </text>
        {[
          ["Without calibration", raw],
          ["Measured against the same face, relaxed", cal],
        ].map(([label, r], k) => {
          const rr = r as typeof raw;
          return (
            <g key={label as string} transform={`translate(60, ${120 + k * 140})`}>
              <text fontSize={13} fontFamily={FONT} fill={INK} fontWeight={600}>
                {label as string}
              </text>
              <text y={30} fontSize={26} fontFamily={FONT} fill={rr.top === "neutral" ? "#138a60" : UP} fontWeight={700}>
                {rr.top} · {Math.round(rr.probs[rr.top] * 100)}%
              </text>
              <text y={54} fontSize={11.5} fontFamily={FONT} fill={MUTED}>
                sad {Math.round(rr.probs.sad * 100)}% · neutral {Math.round(rr.probs.neutral * 100)}%
              </text>
            </g>
          );
        })}
      </g>
    );
  }
  return (
    <g>
      <text x={60} y={120} fontSize={20} fontFamily={FONT} fill={INK} fontWeight={600}>
        It reads expressions, not feelings.
      </text>
      <text x={60} y={160} fontSize={13} fontFamily={FONT} fill={INK}>
        A smile can be polite, a frown can be concentration. The rules describe what the face does;
      </text>
      <text x={60} y={182} fontSize={13} fontFamily={FONT} fill={INK}>
        what the person feels isn&apos;t measured anywhere, and the mood accuracy isn&apos;t tested.
      </text>
    </g>
  );
}

export function Inside() {
  return (
    <FaceExplainer
      title="From a face to a mood."
      line="Google's network scores 52 facial movements; my rules, based on the Facial Action Coding System, turn them into a mood. The faces here are diagrams with example scores."
      picks={FACES.map((f) => ({ id: f.id, pose: f.pose }))}
      steps={[
        { t: "Movements, not emotions", d: "The network outputs how strongly each facial movement is happening: lip corners up, brows down, jaw open… one number from 0 to 1 each." },
        { t: "Rules from FACS", d: "Psychologists describe expressions as action units (AU12: lip corners pulled up). Each mood is a weighted set of them; each score is boosted and capped at 1." },
        { t: "Evidence becomes a mood", d: "The strongest evidence wins through a softmax; if nothing is strong, neutral wins." },
        {
          t: "Calibrated to your face",
          d: "Some faces rest with lowered lip corners or raised brows. The demo first records your relaxed face and subtracts it, so your resting face reads as neutral.",
        },
        { t: "Honest limits", d: "Expressions differ between people and cultures, and the reading has not been tested against how people actually feel." },
      ]}
      render={render}
    />
  );
}
