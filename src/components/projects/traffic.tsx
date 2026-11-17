"use client";

import { motion } from "framer-motion";
import { TRACK } from "@/lib/tracker";
import { ChartCard, DataTable } from "../charts";
import { CLASSES, CLASS_COLOR, TrafficDemo } from "../demos/traffic-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const columns: ColumnDoc[] = [
  { name: "clip", type: "≈10 s video", meaning: "Each camera's newest clip, replaced by TfL every few minutes", used: true },
  { name: "camera", type: "id · name · position", meaning: "From TfL's Places API (type JamCam), with an 'available' flag", used: true },
  { name: "boxes", type: "x · y · w · h · class · score", meaning: "Found in every frame by EfficientDet-Lite0 in your browser", used: true },
  { name: "tracks", type: "id · path · direction", meaning: "Built on this page by matching boxes from frame to frame", used: true },
];

const PIPELINE = [
  { t: "TfL camera", d: "A real London junction, newest 10-second clip" },
  { t: "This site's route", d: "Relays the clip from TfL so your browser is allowed to read its pixels" },
  { t: "Detector", d: "EfficientDet-Lite0 finds cars, buses, trucks, motorbikes, bikes and people" },
  { t: "Tracker", d: "Boxes are linked frame to frame into tracks with an id and a path" },
  { t: "Line counter", d: "Each track counts once, with its direction, when it crosses your line" },
];

const STEPS = [
  { t: "Predict", d: "Each track's box is moved by its recent speed, so a fast car is still matched next frame." },
  { t: "Match by overlap", d: `New boxes join the track they overlap most (IoU ≥ ${TRACK.iouMin}); cars, buses and trucks can match each other because the detector often swaps those labels.` },
  { t: "Confirm and coast", d: `A track counts as real after ${TRACK.confirmHits} frames, and coasts on its speed for up to ${TRACK.maxMisses} missed frames (a lorry hiding a car).` },
  { t: "Count once", d: "When a confirmed track's centre crosses the line segment, it is counted with its direction and never again." },
];

export function TrafficBody() {
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title="Nearly 900 live London cameras, in your browser."
          line="Transport for London publishes its traffic cameras as open data: a short clip from each camera, refreshed every few minutes. This page picks one, detects every road user in it and counts them across a line you place."
        />
        <DatasetCard
          name="TfL JamCams"
          source="https://api.tfl.gov.uk/Place/Type/JamCam"
          sourceLabel="TfL camera list (API)"
          description="Open data from Transport for London, used under TfL's Transport Data Service terms (based on the Open Government Licence v2.0). Powered by TfL Open Data. The clips are low resolution, as traffic cameras are, and this project is not affiliated with or endorsed by TfL. The detector is Google's EfficientDet-Lite0, trained on COCO and also used in Live Object Detection."
          facts={[
            { label: "cameras", value: "~900" },
            { label: "clip length", value: "≈10 s" },
            { label: "road-user types", value: String(CLASSES.length) },
            { label: "server work", value: "one relay" },
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
        <SectionTitle kicker="Try it" title="Count London's traffic, right now." line="Pick a junction or search any camera. The newest clip plays, every road user gets a box, an id and a trail, and the counter ticks when they cross the dashed line. Move or turn the line to count other lanes; switch to your own camera to count your street." />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <TrafficDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle kicker="How the counting works" title="Detection finds things. Tracking makes them countable." line="A detector only sees one frame at a time: the same car in the next frame is just another box. Counting needs identity, so every box is linked to the box it was a moment ago. This tracker is written for this page, in the spirit of SORT (Bewley et al., 2016) without the Kalman filter." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }} className="rounded-2xl border border-line bg-white p-5">
              <p className="font-mono text-[11px] text-muted">0{i + 1}</p>
              <p className="mt-1 text-[15px] font-semibold">{s.t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2/70">{s.d}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CLASSES.map((c) => (
            <span key={c} className="rounded-full bg-white px-3 py-1 text-[12.5px]">
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: CLASS_COLOR[c] }} />
              {c}
            </span>
          ))}
        </div>
      </Section>

      <Section id="results">
        <SectionTitle kicker="Honest notes" title="Counts from a clip, not a traffic census." line="Each clip is about ten seconds of one junction, so the numbers describe that moment. Real traffic counters run continuously, often with cameras placed and calibrated for the job." />
        <ChartCard title="What this project is, and isn't" takeaway="TfL's open cameras, Google's detector, my tracker, counter and relay, all visible in the Code section below.">
          <DataTable
            data={{
              columns: ["", "Here"],
              rows: [
                ["Data", "TfL JamCam clips, open data under TfL's Transport Data Service terms; Powered by TfL Open Data; not affiliated with or endorsed by TfL"],
                ["Detector", "Google's EfficientDet-Lite0 (COCO, Apache-2.0), pretrained and used as published"],
                ["Built here", "The clip relay route, the tracker, line counting with direction, the camera picker and the dashboard"],
                ["Accuracy", "Not measured against hand counts. Low-resolution clips mean small or distant vehicles are missed, and heavy overlap can merge or split tracks"],
                ["Server", "The site is static except one route that fetches a TfL clip for a TfL camera id and passes it on; it accepts nothing else and stores nothing"],
                ["Privacy", "Traffic cameras are low resolution and nothing is stored: frames are analysed in your browser and discarded"],
              ],
            }}
          />
        </ChartCard>
      </Section>
    </>
  );
}
