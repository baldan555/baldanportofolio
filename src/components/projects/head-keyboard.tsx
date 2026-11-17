"use client";

import { motion } from "framer-motion";
import { faceModel } from "@/data/face-model";
import { BLINK, INSTANT } from "@/lib/head-keyboard";
import { ChartCard, DataTable } from "../charts";
import { HeadKeyboardDemo } from "../demos/head-keyboard-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const columns: ColumnDoc[] = [
  { name: "head pose", type: "yaw · pitch · roll", meaning: "From the face model's 4×4 transformation matrix: where your head points", used: true },
  { name: "eye points", type: "2 × 6", meaning: "Eyelid points for the eye aspect ratio: when the eyes close, how long they stay closed", used: true },
  { name: "iris points", type: "2 × 5", meaning: "Iris centres and edges: where the eyes look, for the eye pointer", used: true },
  { name: "other points", type: `${faceModel.landmarks - 22}`, meaning: "Tracked by the model, not needed here", used: false },
];

const PIPELINE = [
  { t: "Camera frame", d: "Processed in the browser, never uploaded" },
  { t: "Face model", d: `${faceModel.landmarks} points and the head's pose, every frame` },
  { t: "Head or eyes → pointer", d: "Head turn around your neutral pose, or iris position after a 5-dot eye calibration, smoothed" },
  { t: "Blink or dwell", d: "An instant blink, a held blink, or holding still on a key presses it" },
  { t: "Words → voice", d: "Word suggestions speed typing; Speak reads the message aloud" },
];

const METHODS = [
  { t: "Point + blink", who: "With the head or the eyes", d: `Point with small head movements, or with your eyes after a 5-dot calibration. Instant mode clicks the moment your eyes close (at most once per ${INSTANT.refractoryMs / 1000} s); Hold mode needs about ${BLINK.minMs / 1000} s, so natural blinks don't type.` },
  { t: "Point + dwell", who: "For people who can't blink on purpose", d: "Point with your head or eyes and stay on a key until its bar fills. No blinking needed; the dwell time is adjustable." },
  { t: "Blink only (scanning)", who: "For people who can't move their head", d: "Rows light up one after another; blink to pick a row, then keys light up; blink again to type. The classic switch-access method used in AAC devices." },
];

export function HeadKeyboardBody() {
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The signals"
          title="Your head or eyes as a pointer, a blink as the button."
          line="People with ALS, spinal cord injuries or cerebral palsy often can't use a keyboard or mouse but can move their head or blink. Augmentative and alternative communication (AAC) tools turn those small movements into words. This one runs on a webcam."
        />
        <DatasetCard
          name={faceModel.name}
          source={faceModel.source}
          sourceLabel="Model page"
          description={`Google's pretrained face model (${faceModel.license}), the same one behind Face Mood Mirror and the Drowsiness Detector. It gives the head's pose every frame and the eyelid points for the eye aspect ratio; the pointer, blink detection, dwell, scanning and word suggestions are written for this page.`}
          facts={[
            { label: "select methods", value: "3" },
            { label: "deliberate blink", value: `≥ ${BLINK.minMs / 1000} s` },
            { label: "suggestion languages", value: "2" },
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
        <SectionTitle kicker="Try it" title="Type a message without your hands." line="Start the camera and look at the middle of the keyboard to calibrate. Point with your head, or switch to Eyes and follow the five dots, then blink to type. Try Blink only to type with blinks alone, and Speak to hear it. No camera? The arrow keys and Space do the same." />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <HeadKeyboardDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Three ways to press a key" title="Different bodies need different inputs." />
        <div className="grid gap-3 md:grid-cols-3">
          {METHODS.map((m, i) => (
            <motion.div key={m.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }} className="rounded-2xl border border-line bg-white p-5">
              <p className="text-[16px] font-semibold">{m.t}</p>
              <p className="mt-0.5 text-[12px] font-medium text-[#138a60]">{m.who}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2/70">{m.d}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-[13.5px] leading-relaxed text-ink-2/70">
          The keyboard is alphabetical, as many AAC boards are, so scanning is predictable. The top row suggests the next word from short, hand-made lists of everyday words in English and Bahasa Indonesia (needs, feelings, people, places), because every key saved matters when each press takes a second or two.
        </p>
      </Section>

      <Section id="results">
        <SectionTitle kicker="Honest notes" title="A demonstration of the idea, not a medical device." line="Dedicated AAC devices use infrared eye trackers, are fitted by therapists and are tested with their users. This page shows how far an ordinary webcam can go, and has not been tested with people who rely on AAC." />
        <ChartCard title="What this project is, and isn't" takeaway="Google's face model, my pointer, blink, dwell, scanning and suggestions, all on your device.">
          <DataTable
            data={{
              columns: ["", "Here"],
              rows: [
                ["Face model", `Google's MediaPipe Face Landmarker (${faceModel.license}), pretrained and used as published`],
                ["Built here", "Head and eye pointers with calibration and smoothing, instant and held blink clicks, dwell, row/column scanning, word suggestions, speech and the keyboard"],
                ["Eye pointer", "Webcam gaze is rough: iris position relative to the eye corners and lids, mapped by a 5-dot calibration. It assumes a still head; big keys make it usable, a dedicated eye tracker is far more precise"],
                ["Instant blink", "Fast but unforgiving: natural blinks click too. Hold mode, dwell or scanning avoid that"],
                ["Speed", "Expect a few words per minute, typical for head and blink input; suggestions help most"],
                ["Limits", "Needs a lit, visible face; glasses glare, strong head tremor or drooping eyelids need different settings (flip, range, dwell, scan speed)"],
                ["Privacy", "Video is processed in the browser and never uploaded or recorded; the message stays on the page"],
              ],
            }}
          />
        </ChartCard>
      </Section>
    </>
  );
}
