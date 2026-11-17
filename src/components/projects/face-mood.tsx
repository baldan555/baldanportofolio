"use client";

import { motion } from "framer-motion";
import { faceModel } from "@/data/face-model";
import { RULES, type Mood } from "@/lib/face-mood";
import { ChartCard, DataTable } from "../charts";
import { FaceMoodDemo, MOOD_COLOR, MOOD_EMOJI } from "../demos/face-mood-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const columns: ColumnDoc[] = [
  { name: "landmarks", type: `${faceModel.landmarks} × (x, y, z)`, meaning: "Points on the face mesh: eyes, brows, lips, nose, jaw and the face outline", used: true },
  { name: "blendshapes", type: `${faceModel.blendshapes} scores, 0–1`, meaning: "How strongly each facial movement is happening: smile left, brow down right, jaw open…", used: true },
  { name: "transform", type: "4×4 matrix", meaning: "Where the head points: turn, nod and tilt, used to move the avatar", used: true },
  { name: "mood", type: "1 of 5", meaning: "Computed on this page from the blendshapes with FACS rules, not by Google's model", used: true },
];

const PIPELINE = [
  { t: "Camera frame", d: "Read from your webcam, processed in the browser, never uploaded" },
  { t: `${faceModel.landmarks} face points`, d: "Google's face mesh finds the face and tracks it frame to frame" },
  { t: `${faceModel.blendshapes} movements`, d: "A second network scores each facial movement from 0 to 1" },
  { t: "Minus your relaxed face", d: `${faceModel.calibrateMs / 1000} seconds of calibration, so your resting face counts as neutral` },
  { t: "Mood + avatar", d: "FACS rules weigh the action units of each expression; the avatar copies the movements" },
];

export function FaceMoodBody() {
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The model"
          title={`${faceModel.landmarks} points and ${faceModel.blendshapes} facial movements, live.`}
          line="Google's Face Landmarker turns each camera frame into a 3D face mesh and a score for every facial movement. The mood on top of it is read with rules from the Facial Action Coding System, the standard way psychologists describe expressions."
        />
        <DatasetCard
          name={faceModel.name}
          source={faceModel.source}
          sourceLabel="Model page"
          description={`A pretrained model from Google, published for MediaPipe under ${faceModel.license} and used here as it is. It finds one face, places ${faceModel.landmarks} landmarks on it and outputs ${faceModel.blendshapes} blendshape scores plus the head's pose. Everything runs in your browser with WebAssembly and your GPU; the model file is self-hosted on this site.`}
          facts={[
            { label: "face points", value: String(faceModel.landmarks) },
            { label: "movements scored", value: String(faceModel.blendshapes) },
            { label: "model download", value: `${(faceModel.bytes / 1e6).toFixed(1)} MB` },
            { label: "moods read here", value: "5" },
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
          title="Make a face. The mirror reads it."
          line="Mood mirror shows what your expression reads as and why, with an avatar that copies you. Copy the mood challenges you to make five expressions as fast as you can. No camera? The sliders drive the same rules."
        />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <FaceMoodDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle
          kicker="How moods are read"
          title="Each mood is a recipe of facial action units."
          line="FACS, developed by Paul Ekman and Wallace Friesen, codes expressions as action units (AUs): a smile is AU12 pulling the lip corners up, often with AU6 raising the cheeks. Each mood below adds up its action units, weighted, after subtracting your relaxed face."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(RULES) as Exclude<Mood, "neutral">[]).map((m, i) => (
            <motion.div key={m} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }} className="rounded-2xl border border-line bg-white p-5">
              <p className="text-[1.3rem] font-semibold tracking-[-0.02em]" style={{ color: MOOD_COLOR[m] }}>
                {MOOD_EMOJI[m]} {cap(m)}
              </p>
              <ul className="mt-3 space-y-2">
                {RULES[m].map((p) => (
                  <li key={p.au + p.label} className="text-[12.5px]">
                    <span className="flex items-center justify-between gap-2">
                      <span>
                        <span className="font-mono text-[11px] text-muted">{p.au}</span> {p.label}
                      </span>
                      <span className="font-mono text-[11px] text-ink-2/60">×{p.w}</span>
                    </span>
                    <span className="mt-0.5 block font-mono text-[10.5px] text-ink-2/45">{p.shapes.join(" + ")}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-[13.5px] leading-relaxed text-ink-2/70">
          {MOOD_EMOJI.neutral} <b>Neutral</b> wins when no recipe has much evidence. Sad and surprised share AU1 (inner brows up), so sadness only counts the inner brows when the outer brows stay down, as in the classic worried brow.
        </p>
      </Section>

      <Section id="results">
        <SectionTitle kicker="Honest notes" title="It reads expressions, not feelings." line="A smile can be polite and a frown can be concentration. This page shows how facial movements can be measured and combined live; it doesn't know how you feel, and it shouldn't be used to decide anything about anyone." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="What this project is, and isn't" takeaway="Google's face model, my rules, avatar and challenge, running on your device." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["", "Here"],
                rows: [
                  ["Face model", `Google's MediaPipe Face Landmarker (${faceModel.license}), pretrained and used as published; not retrained or re-measured here`],
                  ["Built here", "FACS mood rules, relaxed-face calibration, smoothing, the avatar, Copy the mood and the slider mode"],
                  ["Accuracy", "Not measured: the rule weights were set by hand from the FACS definitions and checked on synthetic expressions, not on a labelled set of real faces"],
                  ["Privacy", "Video is processed in your browser and never uploaded or recorded; the challenge recap shows the avatar, not a photo"],
                  ["Limits", "Works best facing the camera in good light; side views, strong shadows, hands on the face or heavy glasses weaken the readings"],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
