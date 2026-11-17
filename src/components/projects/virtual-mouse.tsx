"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { BOX, OneEuro, PINCH } from "@/lib/virtual-mouse";
import { ChartCard, DataTable, LineChart, S1 } from "../charts";
import { Slider } from "../demos/controls";
import { VirtualMouseDemo } from "../demos/virtual-mouse-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const MODEL_MB = 8.4; // public/mediapipe/gesture_recognizer.task, shared with Hand Gestures

const columns: ColumnDoc[] = [
  { name: "thumb tip", type: "point 4", meaning: "One end of the pinch; the cursor sits halfway between it and the index tip", used: true },
  { name: "index tip", type: "point 8", meaning: "The other end of the pinch", used: true },
  { name: "wrist → middle knuckle", type: "points 0 → 9", meaning: "Palm length: divides the pinch gap so it works near or far from the camera", used: true },
  { name: "other points", type: "18 more", meaning: "Drawn as the hand skeleton in the preview", used: false },
];

const PIPELINE = [
  { t: "Camera frame", d: "Processed in the browser, never uploaded" },
  { t: "21 hand points", d: "Google's hand landmark model, inside the gesture recognizer bundle" },
  { t: "Cursor point", d: "Midpoint of thumb and index tips, mirrored, mapped from the middle of the view" },
  { t: "One Euro filter", d: "Smooth when the hand is still, quick when it moves" },
  { t: "Pinch → events", d: "Gap ÷ palm length with hysteresis becomes pointerdown, move, up and click" },
];

/** A deterministic noisy hand path (sine sweep + jitter) to show what the filter does. */
function demoPath(minCutoff: number, beta: number) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  const f = new OneEuro(minCutoff, beta);
  const raw: [number, number][] = [];
  const smooth: [number, number][] = [];
  for (let i = 0; i <= 150; i++) {
    const t = i * 33;
    const truth = i < 50 ? 300 : i < 90 ? 300 + (i - 50) * 9 : 660; // still, fast move, still
    const v = truth + rand() * 22;
    raw.push([t / 1000, v]);
    smooth.push([t / 1000, f.filter(v, t)]);
  }
  return { raw, smooth };
}

const CHOICES = [
  { t: "Cursor between the fingertips", d: "When you pinch, both tips move towards each other, so their midpoint stays put: the click lands where you aimed." },
  { t: "Pinch relative to the palm", d: "Dividing the fingertip gap by the palm's length gives the same number whether your hand is close to the camera or far away." },
  { t: "Two thresholds, not one", d: `Pinch closes below ${PINCH.down} and opens only above ${PINCH.up}. With one threshold, a hand resting near it would click on and off.` },
  { t: "Only the middle of the view", d: `The box from ${BOX.x0 * 100}% to ${BOX.x1 * 100}% across and ${BOX.y0 * 100}% to ${BOX.y1 * 100}% down covers the whole playground, so you never reach for the frame's edge, where tracking is weakest.` },
];

export function VirtualMouseBody() {
  const [beta, setBeta] = useState(0.02);
  const path = useMemo(() => demoPath(1.2, beta), [beta]);
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The signal"
          title="Twenty-one points on your hand, turned into a mouse."
          line="Hand tracking gives the position of every joint, many times a second. Two fingertips and the palm's length are enough for a cursor you can move, click and drag with."
        />
        <DatasetCard
          name="MediaPipe hand landmarks"
          source="https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer"
          sourceLabel="Model page"
          description={`Google's pretrained hand landmark model (Apache-2.0), packed inside the gesture recognizer bundle this site already uses for Hand Gestures, so the cursor costs no extra download. It returns 21 points per hand; everything from point to cursor and click is written for this page.`}
          facts={[
            { label: "hand points", value: "21" },
            { label: "points used", value: "4" },
            { label: "pinch closes", value: `< ${PINCH.down}` },
            { label: "model (shared)", value: `${MODEL_MB} MB` },
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
        <SectionTitle kicker="Try it" title="Point, pinch, drag. No mouse needed." line="Start the camera and hold up one hand. Change the colour, slide the size, drag the sticker, pop eight bubbles against the clock or draw on the pad, all with a pinch." />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <VirtualMouseDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle kicker="The details that make it usable" title="Raw hand points are jittery. Four small decisions fix that." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CHOICES.map((c, i) => (
            <motion.div key={c.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }} className="rounded-2xl border border-line bg-white p-5">
              <p className="font-mono text-[11px] text-muted">0{i + 1}</p>
              <p className="mt-1 text-[15px] font-semibold">{c.t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2/70">{c.d}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-4">
          <ChartCard
            title="The One Euro filter on a simulated hand path"
            takeaway="Still, quick move, still. Raise beta and the filter follows fast moves sooner; lower it and it smooths more but lags. The demo uses beta 0.02."
            legend={[
              { label: "raw fingertip", color: "#b9b6ad", shape: "line" },
              { label: "filtered cursor", color: S1, shape: "line" },
            ]}
          >
            <LineChart
              series={[
                { name: "raw fingertip", color: "#b9b6ad", points: path.raw },
                { name: "filtered cursor", color: S1, points: path.smooth },
              ]}
              xDomain={[0, 5]}
              yDomain={[250, 720]}
              xTicks={[0, 1, 2, 3, 4, 5]}
              xFormat={(v) => `${v.toFixed(0)} s`}
              yFormat={(v) => `${v.toFixed(0)} px`}
              width={860}
              height={240}
            />
            <div className="mt-2 max-w-sm">
              <Slider label="beta (speed sensitivity)" value={beta} min={0} max={0.1} step={0.005} onChange={setBeta} />
            </div>
          </ChartCard>
        </div>
      </Section>

      <Section id="results">
        <SectionTitle kicker="Honest notes" title="A mouse inside the page, not your computer's." line="Browsers don't let websites move the system cursor or click outside the page, for good security reasons. A desktop version would send the same events to the operating system, for example with Python and PyAutoGUI." />
        <ChartCard title="What this project is, and isn't" takeaway="Google's hand model, my cursor, filter, pinch logic and playground, on your device.">
          <DataTable
            data={{
              columns: ["", "Here"],
              rows: [
                ["Hand model", "Google's MediaPipe hand landmarks (Apache-2.0), pretrained and used as published"],
                ["Built here", "Cursor mapping, One Euro smoothing, pinch with hysteresis, synthetic pointer and click events, and the playground"],
                ["Accuracy", "Not benchmarked; thresholds were tuned by hand. Speed depends on your device and is shown live"],
                ["Limits", "One hand, good light, palm facing the camera. Holding an arm up gets tiring after a minute or two, which is why hand-tracked mice suit short tasks"],
                ["Privacy", "Video is processed in the browser and never uploaded or recorded"],
              ],
            }}
          />
        </ChartCard>
      </Section>
    </>
  );
}
