"use client";

import { motion } from "framer-motion";
import { detector, detectorOptions } from "@/data/object-detector";
import { BarChart, ChartCard, DataTable, GroupedBars, INK } from "../charts";
import { OBJECT_GROUPS, ObjectDetectionDemo } from "../demos/object-detection-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const GROUP_COLOR: Record<string, string> = {
  People: "#eb6834",
  Vehicles: "#2a78d6",
  Electronics: "#6250d6",
  "Food & kitchen": "#1baf7a",
  Home: "#eda100",
  Animals: "#e87ba4",
  "Bags & sport": "#008300",
  Street: "#e34948",
};

const columns: ColumnDoc[] = [
  { name: "image", type: "photo", meaning: `Any camera frame, resized to ${detector.input}×${detector.input} for the network`, used: true },
  { name: "box", type: "x · y · w · h", meaning: "Where the object is, in pixels of the original frame", used: true },
  { name: "category", type: "1 of 80", meaning: "Which COCO object it is: person, cup, laptop, car…", used: true },
  { name: "score", type: "0–1", meaning: "How sure the model is; your slider decides the cut-off", used: true },
];

const PIPELINE = [
  { t: "Frame", d: "A camera frame or your photo, kept on the device" },
  { t: `${detector.input}×${detector.input}`, d: "Resized for EfficientDet-Lite0" },
  { t: `${detector.candidates.toLocaleString("en-US")} boxes`, d: "Every frame, the network scores this many candidate boxes" },
  { t: "Best box wins", d: "Overlapping boxes for the same object are merged (non-max suppression)" },
  { t: "Your filter", d: "Confidence slider and object groups, applied live" },
];

const chosen = detectorOptions.find((o) => o.chosen)!;

export function ObjectsBody() {
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The model and its data"
          title={`${detector.classes} everyday objects, ${detector.instances} labelled examples.`}
          line="The detector is EfficientDet-Lite0, trained by Google on COCO and run in your browser by MediaPipe. It finds objects and draws a box around each one, frame after frame."
        />
        <div className="mb-4 grid gap-3 sm:grid-cols-5">
          {PIPELINE.map((p, i) => (
            <motion.div key={p.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.06 }} className="rounded-2xl border border-line bg-white p-4">
              <p className="font-mono text-[11px] text-muted">0{i + 1}</p>
              <p className="mt-1 text-[14px] font-semibold">{p.t}</p>
              <p className="mt-1 text-[12px] leading-snug text-ink-2/70">{p.d}</p>
            </motion.div>
          ))}
        </div>
        <DatasetCard
          name="COCO: Common Objects in Context"
          source={detector.coco}
          sourceLabel="COCO dataset"
          description={`The model was trained on COCO, a dataset of everyday scenes with ${detector.instances} labelled object instances across ${detector.classes} categories. COCO's annotations are CC BY 4.0; its images come from Flickr under their own licences. The trained model is Google's, published for MediaPipe; it is used here as it is, not retrained.`}
          facts={[
            { label: "object types", value: String(detector.classes) },
            { label: "labelled objects", value: detector.instances },
            { label: "model input", value: `${detector.input}×${detector.input}` },
            { label: "model download", value: `${(detector.bytes / 1e6).toFixed(1)} MB` },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Point your camera at anything."
          line="Your desk, a cup, your phone, the street outside, or yourself. Boxes, labels and counts update live; on a phone you can switch to the back camera."
        />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <ObjectDetectionDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle kicker="What it can see" title="Eighty objects, nothing more." />
        <ChartCard title="The 80 COCO objects, grouped as in the demo's filter" takeaway="Anything outside this list is invisible to the model, or gets the name of the closest thing it knows. There is a 'car' but no 'racing car', a 'cup' but no 'mug'.">
          <div className="grid gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(OBJECT_GROUPS).map(([g, list], i) => (
              <motion.div key={g} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: (i % 4) * 0.06 }} className="rounded-2xl bg-cream/60 p-4">
                <p className="flex items-center gap-2 text-[13.5px] font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLOR[g] }} />
                  {g}
                  <span className="font-mono text-[11px] font-normal text-muted">{list.length}</span>
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-2/70">{list.join(" · ")}</p>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="Why this model"
          title={`${(chosen.mb).toFixed(1)} MB, about ${Math.round(chosen.gpu!)} ms a frame on a phone GPU.`}
          line="Google publishes five ready-made detectors for MediaPipe. EfficientDet-Lite0 in float16 is the balance: small enough to download on a phone, fast on the GPU, and the variant Google recommends. Your own speed shows live in the demo's corner."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Speed per frame (Google's benchmark, Pixel 6)"
            takeaway="On the GPU the Lite0 variants and SSD MobileNetV2 all run near 28 ms, fast enough for live video. Lite2 sees more detail (448 px input) but costs far more, especially on the CPU. The int8 version has no GPU figure."
            legend={[
              { label: "CPU", color: "#b9b6ad", shape: "square" },
              { label: "GPU", color: INK, shape: "square" },
            ]}
            table={{ columns: ["Model", "Input", "CPU ms", "GPU ms"], rows: detectorOptions.map((o) => [o.model, `${o.input} px`, o.cpu, o.gpu ?? "–"]) }}
          >
            <GroupedBars
              groups={detectorOptions.map((o) => o.model.replace("EfficientDet-", "").replace("SSD MobileNetV2", "SSD").replace(" · ", " "))}
              series={[
                { name: "CPU", color: "#b9b6ad", values: detectorOptions.map((o) => o.cpu) },
                { name: "GPU", color: INK, values: detectorOptions.map((o) => o.gpu ?? 0) },
              ]}
              format={(v) => (v ? `${Math.round(v)}` : "–")}
            />
          </ChartCard>
          <ChartCard title="Download size" takeaway={`The browser downloads the model once. float16 halves the float32 file at no GPU speed cost; int8 is smaller still but CPU-only in this table.`} table={{ columns: ["Model", "MB"], rows: detectorOptions.map((o) => [o.model, o.mb]) }}>
            <BarChart data={detectorOptions.map((o) => ({ label: o.model.replace("EfficientDet-", "").replace("SSD MobileNetV2", "SSD").replace(" · ", " "), value: o.mb }))} format={(v) => `${v.toFixed(1)}`} highlight={(d) => d.label.includes("Lite0 float16")} />
          </ChartCard>
          <ChartCard title="What this project is, and isn't" takeaway="A rebuild of my F1 object detection project as a live, private, in-browser tool." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["", "Here"],
                rows: [
                  ["The model", "Google's EfficientDet-Lite0, pretrained on COCO, used as published"],
                  ["Built here", "Camera pipeline, coordinate mapping, mirroring, confidence filter, object groups, live counts, photo mode"],
                  ["Runs on", "Your device: WebAssembly and your GPU, self-hosted files, no server"],
                  ["Accuracy", "Not re-measured here; Google's page publishes speeds, not accuracy, for these models"],
                  ["Limits", "Only the 80 COCO objects; small, distant, blurry or partly hidden objects are often missed"],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
