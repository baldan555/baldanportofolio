"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import check from "@/data/models/air-synth.json";
import { CHORDS, SCALES, TAP, createSynth, noteName, type Synth } from "@/lib/air-synth";
import { BarChart, ChartCard, DataTable } from "../charts";
import { AirSynthDemo } from "../demos/air-synth-demo";
import { Segmented } from "../demos/controls";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const MODEL_MB = 8.4; // public/mediapipe/gesture_recognizer.task, shared with Hand Gestures and Virtual Mouse
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

const columns: ColumnDoc[] = [
  { name: "middle knuckle", type: "point 9", meaning: "Hand height: the note in Theremin mode (right hand) and the volume (left hand)", used: true },
  { name: "fingertips + middle joints", type: "points 6–20", meaning: "Which fingers are raised: the chord in Finger chords mode, a fist to mute", used: true },
  { name: "thumb tip", type: "point 4", meaning: "Touching a fingertip plays that finger's note; touching the index adds vibrato", used: true },
  { name: "wrist → middle knuckle", type: "points 0 → 9", meaning: "Palm length: every distance is divided by it, so it works near or far from the camera", used: true },
  { name: "other points", type: "the rest of 21", meaning: "Drawn as the hand skeleton", used: false },
];

const PIPELINE = [
  { t: "Camera frame", d: "Processed in the browser, never uploaded" },
  { t: "Two hands", d: "21 points each, from Google's hand landmark model" },
  { t: "Which hand is which", d: "By where it is on the mirrored screen: right plays, left controls" },
  { t: "Gestures → music", d: "Height to a note on a scale, raised fingers to a chord, thumb taps to notes" },
  { t: "Synthesizer", d: "Oscillators, filter, reverb and limiter built with the Web Audio API" },
];

const IDEAS = [
  { t: "An instrument you don't touch", d: "The theremin (1920) is played in the air: one hand near an antenna sets the pitch, the other sets the volume. Here the camera is the antenna." },
  { t: "No wrong notes", d: "Height is snapped to a scale. The pentatonic has no clashing intervals, so any melody sounds fine; Glide mode slides between notes like the real instrument." },
  { t: "Notes that don't flicker", d: "A hand resting on the line between two notes would flip between them every frame. The current note is kept until the hand is clearly past the halfway line." },
  { t: "Four chords, five fingers", d: "C, F, G, Am and Dm are the I, IV, V, vi and ii chords: enough for a huge number of pop songs. A chord must be held for four frames before it changes, so it doesn't flicker as you lift fingers." },
];

/* ------------------------------------------------------------------ playable scale keyboard */

const WHITE = [0, 2, 4, 5, 7, 9, 11];

function ScaleKeys() {
  const [scale, setScale] = useState("Pentatonic");
  const [lit, setLit] = useState<number | null>(null);
  const synth = useRef<Synth | null>(null);
  const voice = useRef(0);
  useEffect(
    () => () => {
      synth.current?.close();
      synth.current = null;
    },
    [],
  );
  const steps = SCALES[scale];
  const keys = Array.from({ length: 25 }, (_, i) => 60 + i); // C4 to C6
  const inScale = (m: number) => steps.includes((m - 60) % 12);
  const play = (m: number) => {
    synth.current ??= createSynth();
    const s = synth.current;
    void s.resume();
    const v = voice.current;
    voice.current = (v + 1) % 4;
    s.pluck(v, m);
    setTimeout(() => s.release(v), 320);
    setLit(m);
    setTimeout(() => setLit((x) => (x === m ? null : x)), 260);
  };
  const whites = keys.filter((m) => WHITE.includes((m - 60) % 12));
  const ww = 100 / whites.length;
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Segmented label="Scale (click the keys to hear it)" value={scale} options={Object.keys(SCALES)} onChange={setScale} />
        <p className="text-[12.5px] text-ink-2/60">{steps.length} notes per octave · coloured keys are the notes your hand can reach</p>
      </div>
      <div className="relative mt-4 h-[120px] select-none">
        {whites.map((m, i) => (
          <button
            key={m}
            type="button"
            aria-label={noteName(m)}
            onPointerDown={() => play(m)}
            className="absolute top-0 h-full rounded-b-lg border border-ink/15 transition-colors"
            style={{ left: `${i * ww}%`, width: `${ww}%`, background: lit === m ? "#eb6834" : inScale(m) ? "#ffe1d3" : "#fff" }}
          >
            <span className={`absolute inset-x-0 bottom-1.5 text-center text-[10px] ${inScale(m) ? "font-semibold text-ink" : "text-ink-2/40"}`}>{noteName(m)}</span>
          </button>
        ))}
        {keys
          .filter((m) => !WHITE.includes((m - 60) % 12))
          .map((m) => {
            const before = whites.filter((w) => w < m).length;
            return (
              <button
                key={m}
                type="button"
                aria-label={noteName(m)}
                onPointerDown={() => play(m)}
                className="absolute top-0 z-10 h-[62%] rounded-b-md transition-colors"
                style={{ left: `${before * ww - ww * 0.3}%`, width: `${ww * 0.6}%`, background: lit === m ? "#eb6834" : inScale(m) ? "#c2410c" : "#0b0b0b" }}
              />
            );
          })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export function AirSynthBody() {
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The signals"
          title="Two hands, 21 points each, turned into music."
          line="One hand plays and the other shapes the sound, like a theremin. No samples and no music library: the notes come from oscillators the page builds in your browser."
        />
        <DatasetCard
          name="MediaPipe hand landmarks"
          source="https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer"
          sourceLabel="Model page"
          description="Google's pretrained hand model (Apache-2.0), inside the gesture recognizer bundle this site already uses for Hand Gestures and Virtual Mouse, now tracking two hands at once. Reading the hands, the music logic and the synthesizer are written for this page."
          facts={[
            { label: "modes", value: "2" },
            { label: "scales", value: String(Object.keys(SCALES).length) },
            { label: "finger count right", value: pct(check.count_acc, 1) },
            { label: "model download", value: `${MODEL_MB} MB, shared` },
          ]}
          columns={columns}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {PIPELINE.map((p, i) => (
            <motion.div key={p.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.06 }} className="rounded-2xl border border-line bg-white p-4">
              <p className="font-mono text-[11px] text-muted">0{i + 1}</p>
              <p className="mt-1 text-[14px] font-semibold">{p.t}</p>
              <p className="mt-1 text-[12px] leading-snug text-ink-2/70">{p.d}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Play music with your hands in the air."
          line="Turn the sound on and start the camera. In Theremin mode, raise and lower your right hand for the melody and use the left for volume. In Finger chords mode, show 1 to 5 fingers on the left hand and tap your right thumb to each finger. No camera? Play with the mouse or the keyboard."
        />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <AirSynthDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle kicker="How the music works" title="A little music theory makes waving sound good." />
        <div className="grid gap-3 md:grid-cols-2">
          {IDEAS.map((m, i) => (
            <motion.div key={m.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }} className="rounded-2xl border border-line bg-white p-5">
              <p className="text-[16px] font-semibold">{m.t}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2/70">{m.d}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-4">
          <ScaleKeys />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {CHORDS.map((c, i) => (
            <div key={c.name} className="rounded-2xl border border-line bg-white p-4">
              <p className="font-mono text-[11px] text-muted">
                {i + 1} finger{i ? "s" : ""} · {c.roman}
              </p>
              <p className="mt-1 text-[22px] font-semibold">{c.name}</p>
              <p className="mt-1 text-[12px] text-ink-2/70">{c.notes.map((m) => noteName(m).replace(/\d/, "")).join(" · ")}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="Tested on real hands"
          title={`Finger counting is right on ${pct(check.count_acc, 1)} of ${check.dataset.hands} real hands.`}
          line="The chord depends on counting raised fingers, so I checked that rule on real hand landmarks: ASL fingerspelling letters whose hand shape shows a known number of fingers, from the same ASLNow! dataset as the Sign Language Speller."
        />
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <ChartCard title="Fingers counted correctly, by hand shape" takeaway="The weakest shapes are D (pinky drifts up) and W (thumb resting on the pinky reads as raised).">
            <BarChart data={check.counts.map((c) => ({ label: `${c.letter}·${c.fingers}`, value: c.acc, n: c.n }))} format={(v) => pct(v)} max={1} highlight={(d) => d.value < 0.95} width={520} />
          </ChartCard>
          <ChartCard title="Each hand shape" takeaway={`Fists mute on ${pct(check.fist.hit)} of fists; a thumb on the index is found on ${pct(check.tap.index_on_f)} of F hands.`}>
            <DataTable
              maxHeight={300}
              data={{
                columns: ["Letter", "Shape", "Fingers", "Right", "Hands"],
                rows: check.counts.map((c) => [c.letter, c.shape, c.fingers, pct(c.acc), c.n]),
              }}
            />
          </ChartCard>
        </div>
        <div className="mt-4">
          <ChartCard title="What this project is, and isn't" takeaway="Google's hand model; my hand reading, music rules and synthesizer, all on your device.">
            <DataTable
              data={{
                columns: ["", "Here"],
                rows: [
                  ["Hand model", "Google's MediaPipe hand landmarks (Apache-2.0), pretrained and used as published"],
                  ["Built here", "Which hand is which, raised-finger counting, thumb taps, notes on a scale with stable switching, chord selection, the Web Audio synthesizer, visualizer and mouse/keyboard fallback"],
                  ["Test", `${check.dataset.hands} hands from ${check.dataset.name} (${check.dataset.license}); neighbouring video frames look alike, so the numbers are a little optimistic. ASL has no five-finger letter, so "5" isn't tested`],
                  ["Thresholds", `Thumb raised when its tip is over 0.55 palm lengths from the index knuckle; a tap below ${TAP.on}, released above ${TAP.off}; set from these hands`],
                  ["Latency", "Camera, hand model and audio each add a little delay, so fast rhythms are hard; slow melodies and chords work best"],
                  ["Limits", "Needs both hands lit and in view; a hand turned sideways can hide fingers. Hands are assigned by screen side, so crossing them swaps their jobs"],
                  ["Privacy", "Video is processed in the browser and never uploaded or recorded; nothing is saved"],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
