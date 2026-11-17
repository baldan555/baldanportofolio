"use client";

import model from "@/data/models/hand-gestures.json";
import { FONT, HANDS, HandExplainer, HandFigure, INK, MONO, MUTED, UP, type Hand } from "../hand";

const GESTURES = ["Closed fist", "Open palm", "Pointing up", "Thumb down", "Thumb up", "Victory", "I love you"];
const robust = (name: string) => model.comparison.find((c) => c.model === name)!.robust as Record<string, number>;
const NEWBG = Object.keys(model.shipped.robust).find((k) => k.startsWith("New"))!;
const plain = robust("Small CNN");
const mine = model.shipped.robust as Record<string, number>;

export function render(step: number, hand: Hand) {
  if (step === 2) {
    return (
      <g>
        <HandFigure hand={hand} x={150} y={330} s={70} />
        <text x={150} y={370} fontSize={10.5} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          21 POINTS
        </text>
        <path d="M250,230 L300,230" stroke={INK} strokeWidth={2} />
        <rect x={305} y={190} width={110} height={80} rx={12} fill={INK} />
        <text x={360} y={226} fontSize={12} fontFamily={FONT} textAnchor="middle" fill="#fff">
          Google&apos;s
        </text>
        <text x={360} y={244} fontSize={12} fontFamily={FONT} textAnchor="middle" fill="#fff">
          classifier
        </text>
        <path d="M420,230 L450,230" stroke={INK} strokeWidth={2} />
        {GESTURES.map((g, i) => (
          <text key={g} x={460} y={140 + i * 26} fontSize={12.5} fontFamily={FONT} fill={INK}>
            {g}
          </text>
        ))}
      </g>
    );
  }
  if (step === 3) {
    const rps: [string, string, Hand][] = [
      ["Closed fist", "rock", HANDS.A],
      ["Open palm", "paper", HANDS.B],
      ["Victory", "scissors", HANDS.V],
    ];
    return (
      <g>
        {rps.map(([g, r, h], k) => (
          <g key={r}>
            <HandFigure hand={h} x={120 + k * 200} y={300} s={72} />
            <text x={120 + k * 200} y={345} fontSize={12} fontFamily={FONT} textAnchor="middle" fill={MUTED}>
              {g}
            </text>
            <text x={120 + k * 200} y={378} fontSize={22} fontFamily={FONT} textAnchor="middle" fill={UP} fontWeight={700}>
              {r}
            </text>
          </g>
        ))}
        <text x={320} y={420} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          AVERAGE “A”, “B” AND “V” HANDS FROM THE ASL DATASET
        </text>
      </g>
    );
  }
  // step 5: why landmarks — my pixel CNN on a new background
  const bars: [string, number][] = [
    ["Plain CNN, usual background", plain.Original],
    ["Plain CNN, new background", plain[NEWBG]],
    ["My final CNN, new background", mine[NEWBG]],
  ];
  return (
    <g>
      <text x={60} y={80} fontSize={11} fontFamily={MONO} fill={MUTED}>
        MY CNN ON PIXELS: SHARE OF TEST HANDS RIGHT
      </text>
      {bars.map(([name, v], i) => (
        <g key={name}>
          <text x={60} y={140 + i * 70} fontSize={13} fontFamily={FONT} fill={INK}>
            {name}
          </text>
          <rect x={60} y={150 + i * 70} width={480} height={20} rx={10} fill="rgba(11,11,11,0.06)" />
          <rect x={60} y={150 + i * 70} width={v * 480} height={20} rx={10} fill={i === 1 ? "#e34948" : i === 2 ? UP : "rgba(11,11,11,0.35)"} />
          <text x={548} y={165 + i * 70} fontSize={12} fontFamily={MONO} fill={INK}>
            {Math.round(v * 100)}%
          </text>
        </g>
      ))}
      <text x={60} y={380} fontSize={12} fontFamily={FONT} fill={INK}>
        Pixels carry the background too; 21 points don&apos;t. That&apos;s why the live demo uses landmarks.
      </text>
    </g>
  );
}

export function Inside() {
  return (
    <HandExplainer
      title="From a hand to a gesture."
      line="The live demo stands on Google's pretrained hand networks; my own CNN on pixels is the experiment that shows why. Scroll through both."
      picks={[
        { id: "A", hand: HANDS.A, tag: "fist" },
        { id: "B", hand: HANDS.B, tag: "open palm" },
        { id: "V", hand: HANDS.V, tag: "victory" },
      ]}
      steps={[
        { t: "A small classifier names the gesture", d: "Google's gesture model reads the 21 points and picks one of seven gestures, or none." },
        { t: "Gestures become a game", d: "A fist is rock, an open palm is paper, a victory sign is scissors. The demo's computer opponent picks at random." },
        {
          t: "Why not pixels?",
          d: `My own CNN learned rock, paper, scissors straight from images: ${Math.round(plain.Original * 100)}% right on test hands, but only ${Math.round(plain[NEWBG] * 100)}% once the background changed. Training on swapped backgrounds lifted that to ${Math.round(mine[NEWBG] * 100)}%; landmarks avoid the problem entirely.`,
        },
      ]}
      render={render}
    />
  );
}
