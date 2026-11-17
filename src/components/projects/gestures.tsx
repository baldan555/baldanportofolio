"use client";

import model from "@/data/models/hand-gestures.json";
import { ChartCard, DataTable, GroupedBars, INK, LineChart, S1, S2 } from "../charts";
import { CameraGestureDemo } from "../demos/camera-gesture-demo";
import { GESTURE_EMOJI, GESTURES, GestureDemo } from "../demos/gesture-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const n = (v: number) => v.toLocaleString("en-US");

const CONDITIONS = ["Original", "Rotated ±30°", "Darker", "New background"] as const;
const COND_COLORS = [INK, S1, "#1baf7a", S2];
const SHORT: Record<string, string> = {
  "Logistic regression on pixels": "Pixels",
  "Small CNN": "CNN",
  "Small CNN + augmentation": "CNN + aug.",
  "Small CNN + augmentation + new backgrounds": "+ backgrounds",
  "MobileNetV2 transfer (ImageNet) + new backgrounds": "MobileNetV2",
};

const columns: ColumnDoc[] = [
  { name: "image", type: "300×300 RGB", meaning: "A rendered hand on a white background; resized to 64×64 for the CNN experiment", used: true },
  { name: "label", type: "rock · paper · scissors", meaning: "The gesture the CNN predicts", used: true },
];

const cmp = (name: string) => model.comparison.find((c) => c.model === name)!;
const chosen = cmp(model.chosen);
const aug = cmp("Small CNN + augmentation");
const plain = cmp("Small CNN");
const mobile = model.comparison.find((c) => c.model.startsWith("MobileNet"))!;
const pixels = model.comparison[0];

const PIPELINE = [
  { t: "Camera frame", d: "640×480 from your webcam, kept on the device" },
  { t: "Find the hand", d: "MediaPipe's palm detector locates it, then tracks it frame to frame" },
  { t: "21 hand points", d: "Knuckles and fingertips in 3D: shape without background" },
  { t: "Gesture", d: "A small classifier reads the points: fist, palm, victory…" },
  { t: "Steady answer", d: "Majority vote over the last 10 frames" },
];

export function GesturesBody() {
  const h = model.history;
  const hp = model.history_plain;
  const epochs = h.loss.length;
  const conf = model.confusion;

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title="A hand tracker for the camera, a dataset for the experiment."
          line="The live demo uses MediaPipe's gesture recognizer, trained by Google on real hands. To show why that approach works, I also trained my own CNN on the Rock, Paper, Scissors images."
        />
        <div className="mb-4 grid gap-3 sm:grid-cols-5">
          {PIPELINE.map((p, i) => (
            <div key={p.t} className="rounded-2xl border border-line bg-white p-4">
              <p className="font-mono text-[11px] text-muted">0{i + 1}</p>
              <p className="mt-1 text-[14px] font-semibold">{p.t}</p>
              <p className="mt-1 text-[12px] leading-snug text-ink-2/70">{p.d}</p>
            </div>
          ))}
        </div>
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Laurence Moroney's datasets page"
          description={`For the CNN experiment: ${n(model.dataset.train)} training and ${n(model.dataset.test)} test images of rendered hands, 300×300 pixels on a white background, with different skin tones, ages and genders. Licence: ${model.dataset.license}, attribution to Laurence Moroney.`}
          facts={[
            { label: "training images", value: n(model.dataset.train) },
            { label: "test images", value: n(model.dataset.test) },
            { label: "per gesture", value: n(model.dataset.train / 3) },
            { label: "CNN input", value: `${model.input}×${model.input}` },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Make a fist at your camera."
          line="Hand tracking and gesture recognition run live in your browser on WebAssembly and your GPU. Then play rock, paper, scissors against the computer."
        />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <CameraGestureDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Why landmarks, not pixels" title="A CNN on pixels learns the background too." />
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <ChartCard title="The experiment" takeaway="The dataset's hands are all on white. A network trained on those pixels can learn 'hand = whatever isn't white': fine on the test set, wrong on a real room. So I trained a small CNN, added augmentation, then added copies with the white swapped for random textures, and tested every model on backgrounds it never saw.">
            <ul className="space-y-2 pt-1 text-[13px]">
              {[
                ["Original test images", "white background, like training"],
                ["Rotated ±30°", "hands held at an angle"],
                ["Darker", "55% brightness, a dim room"],
                ["New background", "unseen colour textures behind the hand"],
              ].map(([a, b], i) => (
                <li key={a} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COND_COLORS[i] }} />
                  <span className="font-medium">{a}</span>
                  <span className="text-ink-2/60">· {b}</span>
                </li>
              ))}
            </ul>
          </ChartCard>
          <ChartCard title="Three gestures, equal shares" takeaway={`${n(model.dataset.train / 3)} training and ${n(model.dataset.test / 3)} test images of each, so accuracy can't be inflated by guessing one class.`}>
            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              {GESTURES.map((g, k) => (
                <div key={g} className="rounded-2xl bg-cream/60 px-3 py-4">
                  <p className="text-[2.4rem] leading-none">{GESTURE_EMOJI[k]}</p>
                  <p className="mt-2 text-[13px] font-semibold">{g}</p>
                  <p className="font-mono text-[11px] text-muted">
                    {n(model.dataset.train / 3)} + {n(model.dataset.test / 3)}
                  </p>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <p className="mb-4 max-w-2xl px-1 text-[13.5px] text-ink-2/75">My CNN, running in your browser: pick a test image, swap in a busy background, rotate or darken it, and watch the orange heatmap show where it looks.</p>
          <GestureDemo />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`${pct(aug.robust["New background"])} → ${pct(chosen.robust["New background"])} on backgrounds it never saw.`}
          line={`Swapping backgrounds while training rescues the pixel CNN, but only partly. Hand landmarks sidestep the problem: 21 points carry the shape of the hand and nothing about the wall behind it, which is why the live demo is built on them.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Five models, four kinds of test"
            takeaway={`Pixels alone: ${pct(pixels.acc)}. A small CNN: ${pct(plain.acc)} on clean images. Augmentation and background swaps mostly buy robustness; clean accuracy moves by about a point. MobileNetV2 reaches ${pct(mobile.robust["New background"])} on new backgrounds with ${n(mobile.params)} parameters, ${Math.round(mobile.params / chosen.params)}× the CNN.`}
            legend={CONDITIONS.map((c, i) => ({ label: c, color: COND_COLORS[i], shape: "square" as const }))}
            table={{ columns: ["Model", ...CONDITIONS], rows: model.comparison.map((c) => [c.model, ...CONDITIONS.map((k) => pct(c.robust[k]))]) }}
            className="md:col-span-2"
          >
            <GroupedBars groups={model.comparison.map((c) => SHORT[c.model] ?? c.model)} series={CONDITIONS.map((k, i) => ({ name: k, color: COND_COLORS[i], values: model.comparison.map((c) => c.robust[k]) }))} format={(v) => pct(v, 0)} max={1} />
          </ChartCard>
          <ChartCard
            title="Training the CNN"
            takeaway={`Stopped after ${epochs} epochs. Validation uses plain white-background images; training images include swapped backgrounds and random changes, so training accuracy runs lower.`}
            legend={[
              { label: "Training accuracy", color: S2, shape: "line" },
              { label: "Validation accuracy", color: INK, shape: "line" },
              { label: "Without background swaps (val)", color: "#b9b6ad", shape: "line" },
            ]}
          >
            <LineChart
              series={[
                { name: "No bg val", color: "#b9b6ad", points: hp.val_accuracy.map((v, i) => [i + 1, v] as [number, number]), dashed: true },
                { name: "Train", color: S2, points: h.accuracy.map((v, i) => [i + 1, v] as [number, number]) },
                { name: "Val", color: INK, points: h.val_accuracy.map((v, i) => [i + 1, v] as [number, number]) },
              ]}
              xDomain={[1, Math.max(epochs, hp.val_accuracy.length)]}
              yDomain={[0.3, 1]}
              xFormat={(v) => String(Math.round(v))}
              yFormat={(v) => pct(v, 0)}
              markers
              xLabel="Epoch"
            />
          </ChartCard>
          <ChartCard title="Which gestures the CNN confuses" takeaway={`${model.shipped.errors === 0 ? "No mistakes" : `${model.shipped.errors} mistake${model.shipped.errors === 1 ? "" : "s"}`} in ${n(model.dataset.test)} original test images for the 8-bit browser version.`}>
            <table className="mt-1 w-full border-separate border-spacing-1 text-center font-mono text-[12px]">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-medium text-muted">true ↓ · read →</th>
                  {GESTURES.map((g, k) => (
                    <th key={g} className="font-medium">
                      {GESTURE_EMOJI[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conf.map((r, i) => (
                  <tr key={i}>
                    <td className="text-left">
                      {GESTURE_EMOJI[i]} {GESTURES[i]}
                    </td>
                    {r.map((v, j) => (
                      <td key={j} className={`h-10 rounded-md ${i === j ? "bg-ink text-white" : ""}`} style={i === j ? undefined : { background: v ? "rgba(235,104,52,0.45)" : "rgba(11,11,11,0.03)" }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
          <ChartCard title="All CNN models" takeaway="Seconds are CPU training time on a laptop. MobileNetV2 reuses ImageNet features and only trains its last layer; it stays a reference, the browser runs the small CNN." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Model", "Parameters", "Original", "Rotated", "Darker", "New background", "Epochs", "Seconds"],
                rows: [
                  ...model.comparison.map((c) => [c.model + (c.model === model.chosen ? " (in the demo)" : ""), n(c.params), pct(c.acc), pct(c.robust["Rotated ±30°"]), pct(c.robust["Darker"]), pct(c.robust["New background"]), c.epochs || "–", c.seconds]),
                  ["In the demo, 8-bit weights", n(chosen.params), pct(model.shipped.robust["Original"]), pct(model.shipped.robust["Rotated ±30°"]), pct(model.shipped.robust["Darker"]), pct(model.shipped.robust["New background"]), "–", "–"],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
