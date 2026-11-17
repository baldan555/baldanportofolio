"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { faceModel } from "@/data/face-model";
import { DEFAULTS, EYE_A, EYE_B } from "@/lib/drowsiness";
import { ChartCard, DataTable } from "../charts";
import { Slider } from "../demos/controls";
import { DrowsinessDemo, EyeDiagram } from "../demos/drowsiness-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const columns: ColumnDoc[] = [
  { name: "eye points", type: `2 × 6 of ${faceModel.landmarks}`, meaning: `Corners, upper and lower eyelid of each eye (mesh points ${EYE_A.join(", ")} and ${EYE_B.join(", ")})`, used: true },
  { name: "mouth points", type: `8 of ${faceModel.landmarks}`, meaning: "Mouth corners and three inner-lip pairs, for the yawn ratio", used: true },
  { name: "other points", type: `${faceModel.landmarks - 20}`, meaning: "Tracked by the model but not needed for drowsiness", used: false },
];

const PIPELINE = [
  { t: "Camera frame", d: "Processed in your browser, never uploaded" },
  { t: `${faceModel.landmarks} face points`, d: "Google's Face Landmarker tracks the face every frame" },
  { t: "EAR per eye", d: "Eyelid opening over eye width, from six points per eye" },
  { t: "Against your open eyes", d: `Closed below ${Math.round(DEFAULTS.closedRatio * 100)}% of your own open-eye EAR from a 2-second calibration` },
  { t: "Timer → alarm", d: `Short closures count as blinks; ${DEFAULTS.alarmMs / 1000} s closed sounds the alarm` },
];

export function DrowsinessBody() {
  const [open, setOpen] = useState(0.8);
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The signal"
          title="Twelve points around the eyes, thirty times a second."
          line="Drowsy drivers close their eyes for longer, blink more slowly and yawn. All three can be measured from face landmarks: no special hardware, just a webcam and a face mesh model."
        />
        <DatasetCard
          name={faceModel.name}
          source={faceModel.source}
          sourceLabel="Model page"
          description={`Google's pretrained face mesh model (${faceModel.license}), the same one behind Face Mood Mirror. Of its ${faceModel.landmarks} points, this detector uses 12 around the eyes and 8 around the mouth. Everything else is plain geometry and timing, written for this page.`}
          facts={[
            { label: "points used", value: "20" },
            { label: "calibration", value: "2 s" },
            { label: "default alarm", value: `${DEFAULTS.alarmMs / 1000} s` },
            { label: "model download", value: `${(faceModel.bytes / 1e6).toFixed(1)} MB` },
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
        <SectionTitle kicker="Try it" title="Close your eyes. It will notice." line="Start the camera, keep your eyes open for the 2-second calibration, then blink, yawn or close your eyes and wait for the alarm. Turn the sound on for the full effect; there is a simulation if you have no camera." />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <DrowsinessDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle
          kicker="How it measures"
          title="One ratio for the eyes, one for the mouth, and a clock."
          line="The eye aspect ratio (Soukupová and Čech, 2016) divides the two vertical eyelid distances by the eye's width. It stays fairly constant while the eye is open and falls towards zero as it closes, whatever the size of your face in the picture."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="The eye aspect ratio, by hand" takeaway="Drag the slider to close the drawn eye and watch the ratio fall. The detector calls an eye closed when its EAR drops below a share of your own open-eye value.">
            <EyeDiagram open={open} size={360} />
            <div className="mt-2">
              <Slider label="Eye openness" value={Math.round(open * 100)} min={0} max={100} unit="%" onChange={(v) => setOpen(v / 100)} />
            </div>
          </ChartCard>
          <ChartCard title="The signals on the dashboard" takeaway="Researchers combine several cues, because a single long blink or one yawn isn't drowsiness on its own.">
            <DataTable
              data={{
                columns: ["Signal", "How it's computed here"],
                rows: [
                  ["Eyes closed", `EAR below ${Math.round(DEFAULTS.closedRatio * 100)}% of your open-eye EAR`],
                  ["Blink", `A closure shorter than ${DEFAULTS.blinkMaxMs} ms; shown as blinks per minute`],
                  ["Alarm", `Eyes closed for ${DEFAULTS.alarmMs / 1000} s or more (adjustable)`],
                  ["PERCLOS", "Share of the last minute with the eyes closed, a standard fatigue measure"],
                  ["Yawn", `Mouth aspect ratio above ${DEFAULTS.yawnMar} for at least ${DEFAULTS.yawnMs / 1000} s`],
                  ["Level", "Drowsy at the alarm or PERCLOS above 30%; tired above 15%, or 3 yawns in 5 minutes"],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>

      <Section id="results">
        <SectionTitle kicker="Honest notes" title="A demonstration, not a safety device." line="If you feel drowsy while driving, stop and rest. Commercial driver-monitoring systems use infrared cameras that work at night and through sunglasses, and are tested on many drivers; this page shows the core idea in a browser." />
        <ChartCard title="What this project is, and isn't" takeaway="Google's face mesh, my geometry, timers, alarm and dashboard, all on your device.">
          <DataTable
            data={{
              columns: ["", "Here"],
              rows: [
                ["Face model", `Google's MediaPipe Face Landmarker (${faceModel.license}), pretrained and used as published`],
                ["Built here", "EAR and mouth ratio from the landmarks, per-person calibration, blink, PERCLOS and yawn tracking, the alarm, the dashboard and the simulation"],
                ["Accuracy", "Not measured on a labelled drowsiness dataset; the default thresholds come from the EAR literature and were checked on simulated eye closures"],
                ["Limits", "Needs a lit, visible face: darkness, sunglasses, strong side angles or a lowered head defeat it. Looking down at a phone can look like closed eyes"],
                ["Privacy", "Video is processed in the browser and never uploaded or recorded"],
              ],
            }}
          />
        </ChartCard>
      </Section>
    </>
  );
}

