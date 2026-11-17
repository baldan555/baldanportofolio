"use client";

import { CHORDS, SCALES, fingersUp, heightToPos, noteName, scaleNotes, tapRatios, tappedFinger, BAND } from "@/lib/air-synth";
import { BLUE, FONT, HANDS, HandExplainer, HandFigure, INK, MONO, MUTED, UP, at, r1, type Hand } from "../hand";

const xy = (h: Hand) => h.map(([x, y]) => ({ x, y }));
const NOTES = scaleNotes(60, SCALES.Pentatonic, 2);
const FINGER = ["index", "middle", "ring", "pinky"];

export function render(step: number, hand: Hand) {
  if (step === 2) {
    return (
      <g>
        <line x1={320} x2={320} y1={40} y2={410} stroke="rgba(11,11,11,0.25)" strokeDasharray="6 6" />
        <text x={160} y={52} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={BLUE}>
          LEFT OF SCREEN: CONTROLS
        </text>
        <text x={480} y={52} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={UP}>
          RIGHT OF SCREEN: PLAYS
        </text>
        <HandFigure hand={HANDS.B} x={170} y={350} s={80} color={BLUE} dot={BLUE} mirror />
        <HandFigure hand={hand} x={470} y={350} s={80} color={UP} dot={UP} />
        <text x={320} y={430} fontSize={11.5} fontFamily={FONT} textAnchor="middle" fill={INK}>
          Sorted by where they are on the mirrored screen, not by the model&apos;s left/right label, so crossing over just swaps jobs.
        </text>
      </g>
    );
  }
  if (step === 3) {
    // the playing hand at 62% of the way up the band
    const yFrame = BAND.bottom - 0.62 * (BAND.bottom - BAND.top);
    const pos = heightToPos(yFrame, NOTES.length);
    const idx = Math.round(pos);
    const yOf = (i: number) => r1(400 - (i / (NOTES.length - 1)) * 350);
    return (
      <g>
        {NOTES.map((m, i) => (
          <g key={m}>
            {i === idx && <rect x={300} y={yOf(i) - 15} width={300} height={30} fill={UP} opacity={0.18} />}
            <line x1={300} x2={600} y1={yOf(i)} y2={yOf(i)} stroke="rgba(11,11,11,0.15)" />
            <text x={606} y={yOf(i) + 4} fontSize={11} fontFamily={MONO} fill={i === idx ? UP : MUTED} fontWeight={i === idx ? 700 : 400}>
              {noteName(m)}
            </text>
          </g>
        ))}
        <HandFigure hand={hand} x={450} y={r1(yOf(idx) - hand[9][1] * 58)} s={58} color={UP} dot={UP} />
        <circle cx={r1(450 + hand[9][0] * 58)} cy={yOf(idx)} r={7} fill={UP} />
        <text x={60} y={170} fontSize={13} fontFamily={FONT} fill={INK}>
          Higher hand,
        </text>
        <text x={60} y={190} fontSize={13} fontFamily={FONT} fill={INK}>
          higher note:
        </text>
        <text x={60} y={222} fontSize={26} fontFamily={FONT} fill={UP} fontWeight={700}>
          {noteName(NOTES[idx])}
        </text>
        <text x={60} y={250} fontSize={11} fontFamily={MONO} fill={MUTED}>
          PENTATONIC · NO CLASHING NOTES
        </text>
      </g>
    );
  }
  if (step === 4) {
    const four: [string, Hand][] = [
      ["D", HANDS.D],
      ["V", HANDS.V],
      ["W", HANDS.W],
      ["B", HANDS.B],
    ];
    return (
      <g>
        <text x={320} y={40} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          LEFT HAND: COUNT THE RAISED FINGERS → CHORD
        </text>
        {four.map(([l, h], k) => {
          const n = fingersUp(xy(h));
          const x = 95 + k * 150;
          return (
            <g key={l}>
              <HandFigure hand={h} x={x} y={300} s={62} color={BLUE} dot={BLUE} />
              <text x={x} y={345} fontSize={13} fontFamily={FONT} textAnchor="middle" fill={INK}>
                {n} up
              </text>
              <text x={x} y={378} fontSize={24} fontFamily={FONT} textAnchor="middle" fill={UP} fontWeight={700}>
                {n >= 1 ? CHORDS[n - 1].name : "–"}
              </text>
            </g>
          );
        })}
        <text x={320} y={420} fontSize={11.5} fontFamily={FONT} textAnchor="middle" fill={INK}>
          A finger is up when its tip is farther from the wrist than its middle joint. (Average “D”, “V”, “W”, “B” hands.)
        </text>
      </g>
    );
  }
  if (step === 5) {
    const h = HANDS.F;
    const r = tapRatios(xy(h));
    const f = tappedFinger(-1, r);
    const [tx, ty] = at(h, 4, 250, 340, 96);
    return (
      <g>
        <HandFigure hand={h} x={250} y={340} s={96} hi={[4, [8, 12, 16, 20][Math.max(0, f)]]} color={UP} dot={UP} />
        {[8, 12, 16, 20].map((tip, i) => {
          const [fx, fy] = at(h, tip, 250, 340, 96);
          return <line key={tip} x1={tx} y1={ty} x2={fx} y2={fy} stroke={i === f ? INK : "rgba(11,11,11,0.15)"} strokeWidth={i === f ? 3 : 1.5} strokeDasharray={i === f ? undefined : "3 3"} />;
        })}
        {r.map((v, i) => (
          <text key={i} x={420} y={150 + i * 34} fontSize={13} fontFamily={MONO} fill={i === f ? UP : INK} fontWeight={i === f ? 700 : 400}>
            thumb→{FINGER[i]}: {v.toFixed(2)}
          </text>
        ))}
        <text x={420} y={310} fontSize={13} fontFamily={FONT} fill={INK}>
          {f >= 0 ? `touching the ${FINGER[f]}: plays ${noteName(CHORDS[0].notes[f])}` : "no finger touching"}
        </text>
        <text x={420} y={332} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
          (AVERAGE “F” HAND · CHORD C)
        </text>
      </g>
    );
  }
  // step 6: the synthesizer
  const boxes = ["oscillators", "low-pass filter", "reverb", "limiter", "speakers"];
  return (
    <g>
      <text x={60} y={110} fontSize={11} fontFamily={MONO} fill={MUTED}>
        WEB AUDIO: BUILT FROM BROWSER PARTS, NO SAMPLES
      </text>
      {boxes.map((b, i) => (
        <g key={b} transform={`translate(${40 + i * 116}, 160)`}>
          <rect width={104} height={60} rx={12} fill={i === 0 ? UP : "#fff"} stroke="rgba(11,11,11,0.15)" />
          <text x={52} y={35} fontSize={11.5} fontFamily={FONT} textAnchor="middle" fill={i === 0 ? "#fff" : INK}>
            {b}
          </text>
          {i < boxes.length - 1 && <path d="M106,30 L114,30" stroke={INK} strokeWidth={2} />}
        </g>
      ))}
      <text x={60} y={280} fontSize={12} fontFamily={FONT} fill={INK}>
        Pitch, volume, vibrato and chord notes are just numbers sent to these parts 30 times a second.
      </text>
    </g>
  );
}

export function Inside() {
  return (
    <HandExplainer
      title="From two hands to music."
      line="Google's networks find the hands; the music is rules I wrote on top of 21 points per hand. Scroll through the pipeline."
      picks={[
        { id: "B", hand: HANDS.B, tag: "open" },
        { id: "V", hand: HANDS.V, tag: "two fingers" },
        { id: "L", hand: HANDS.L, tag: "thumb out" },
      ]}
      steps={[
        { t: "Which hand plays?", d: "With two hands in view, the one further right on the mirrored screen plays and the other controls." },
        {
          t: "Height becomes a note",
          d: "The playing hand's height is spread over two octaves of a pentatonic scale, and it only leaves a note once it is clearly past the halfway line, so notes don't flicker.",
        },
        { t: "Fingers become chords", d: "In chord mode the other hand's raised fingers pick one of five chords. A count must hold for four frames before the chord changes." },
        { t: "Thumb taps become notes", d: "Thumb-to-fingertip distance over palm length, for each finger: the closest one under the threshold plays that note of the chord." },
        { t: "Then sound", d: "The browser's own audio parts make the sound: oscillators, a filter, a generated reverb and a limiter." },
      ]}
      render={render}
    />
  );
}
