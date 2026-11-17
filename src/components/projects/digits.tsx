"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import model from "@/data/models/handwritten-digits.json";
import { decodeImage } from "@/lib/cnn";
import { BarChart, ChartCard, DataTable, GroupedBars, INK, LineChart, S1, S2 } from "../charts";
import { DigitsDemo, paintGray } from "../demos/digits-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const n = (v: number) => v.toLocaleString("en-US");

const SHORT: Record<string, string> = {
  "Softmax regression (no hidden layer)": "No hidden layer",
  "Dense network (1 hidden layer)": "Dense",
  "Small CNN": "CNN",
  "Small CNN + augmentation": "CNN + aug.",
};
const CONDITIONS = ["Original", "Shifted ±4 px", "Rotated ±25°", "Shrunk to 70%"] as const;
const COND_COLORS = [INK, S1, S2, "#1baf7a"];

const columns: ColumnDoc[] = [
  { name: "pixels", type: "28×28 · 0–255", meaning: "Grayscale image of one digit, white ink on black; scaled to 0–1", used: true },
  { name: "label", type: "0–9", meaning: "The digit written: what the network predicts", used: true },
];

const chosen = model.comparison.find((c) => c.model === model.chosen)!;
const plain = model.comparison.find((c) => c.model === "Small CNN")!;
const soft = model.comparison[0];

function Img({ b64, size = 56, className = "" }: { b64: string; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => paintGray(ref.current, decodeImage(b64), 28, 28), [b64]);
  return <canvas ref={ref} width={28} height={28} style={{ width: size, height: size }} className={`rounded-md bg-black [image-rendering:pixelated] ${className}`} />;
}

/** The shipped network, one block per layer, sized by its output. */
function Architecture() {
  const conv1 = model.model.conv1.shape;
  const conv2 = model.model.conv2.shape;
  const d1 = model.model.dense1.shape;
  const params = (s: number[], b: number) => s.reduce((a, v) => a * v, 1) + b;
  const blocks = [
    { name: "Input", dims: "28×28×1", note: "your drawing", h: 100, c: "#0b0b0b", p: 0 },
    { name: "Conv 3×3", dims: `26×26×${conv1[3]}`, note: `${conv1[3]} filters`, h: 92, c: S1, p: params(conv1, conv1[3]) },
    { name: "Max-pool", dims: `13×13×${conv1[3]}`, note: "keep the strongest", h: 64, c: "#b9b6ad", p: 0 },
    { name: "Conv 3×3", dims: `11×11×${conv2[3]}`, note: `${conv2[3]} filters`, h: 58, c: S1, p: params(conv2, conv2[3]) },
    { name: "Max-pool", dims: `5×5×${conv2[3]}`, note: `${5 * 5 * conv2[3]} numbers`, h: 40, c: "#b9b6ad", p: 0 },
    { name: "Dense", dims: String(d1[1]), note: "dropout while training", h: 30, c: S2, p: params(d1, d1[1]) },
    { name: "Output", dims: "10", note: "one score per digit", h: 18, c: "#0b0b0b", p: params(model.model.out.shape, 10) },
  ];
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[720px] items-end gap-2 pt-2">
        {blocks.map((b, i) => (
          <motion.div key={i} className="flex flex-1 flex-col items-center text-center" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}>
            <div className="flex h-[110px] w-full items-end justify-center">
              <div className="w-[70%] rounded-lg" style={{ height: b.h, background: b.c, opacity: b.c === "#b9b6ad" ? 0.6 : 0.9 }} />
            </div>
            <p className="mt-2 text-[12.5px] font-semibold">{b.name}</p>
            <p className="font-mono text-[11px]">{b.dims}</p>
            <p className="text-[11px] text-ink-2/60">{b.note}</p>
            <p className="font-mono text-[10.5px] text-muted">{b.p ? `${n(b.p)} params` : "—"}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** 10×10 confusion: diagonal = share right per digit, off-diagonal = count of mistakes. */
function Confusion() {
  const rows = model.confusion;
  const off = Math.max(...rows.flatMap((r, i) => r.filter((_, j) => j !== i)));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-[3px] font-mono text-[11px]">
        <thead>
          <tr>
            <th className="text-left text-[10px] font-medium text-muted">true ↓ · read as →</th>
            {rows.map((_, j) => (
              <th key={j} className="font-medium">
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const tot = r.reduce((a, b) => a + b, 0);
            return (
              <tr key={i}>
                <td className="pr-1 font-semibold">{i}</td>
                {r.map((v, j) => (
                  <td
                    key={j}
                    title={`${i} read as ${j}: ${v}`}
                    className={`h-8 rounded text-center ${i === j ? "bg-ink text-[10px] text-white" : ""}`}
                    style={i === j ? undefined : { background: v ? `rgba(235,104,52,${(0.12 + (0.7 * v) / off).toFixed(3)})` : "rgba(11,11,11,0.03)" }}
                  >
                    {i === j ? `${((v / tot) * 100).toFixed(1)}` : v || ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DigitsBody() {
  const h = model.history;
  const hp = model.history_plain;
  const epochs = h.loss.length;
  const mistakes = model.samples.filter((s) => s.kind === "mistake");
  const ink = model.ink;
  const minInk = ink.indexOf(Math.min(...ink));
  const maxInk = ink.indexOf(Math.max(...ink));

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${n(model.dataset.train + model.dataset.test)} handwritten digits, 28 by 28 pixels.`}
          line="The classic first dataset of computer vision: small, clean, and still the clearest way to see what a convolutional network learns."
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="MNIST (Yann LeCun's page)"
          description={`Digits written by US Census Bureau employees and high-school students, collected by NIST and normalised by Yann LeCun, Corinna Cortes and Christopher Burges: each one centred in a 28×28 grayscale image. The test set's writers are different people from the training set's. Licence: ${model.dataset.license}; loaded from Keras' public mirror.`}
          facts={[
            { label: "training images", value: n(model.dataset.train) },
            { label: "test images", value: n(model.dataset.test) },
            { label: "pixels each", value: "28 × 28" },
            { label: "classes", value: "10" },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Average every digit and the shapes appear." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="The average image of each digit" takeaway="Thousands of handwritings blur into one ghost per digit. A model with no hidden layer learns little more than these templates." className="md:col-span-2">
            <div className="grid grid-cols-5 gap-3 pt-1 sm:grid-cols-10">
              {model.means.map((m, d) => (
                <motion.div key={d} className="flex flex-col items-center gap-1" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: d * 0.05 }}>
                  <Img b64={m} size={72} />
                  <span className="font-mono text-[12px]">{d}</span>
                </motion.div>
              ))}
            </div>
          </ChartCard>
          <ChartCard title="Images per digit" takeaway="Close to balanced: from 5,421 fives to 6,742 ones in training." table={{ columns: ["Digit", "Train", "Test"], rows: model.counts.train.map((c, d) => [d, c, model.counts.test[d]]) }}>
            <BarChart data={model.counts.train.map((c, d) => ({ label: String(d), value: c }))} format={(v) => n(Math.round(v))} />
          </ChartCard>
          <ChartCard
            title="Ink per digit"
            takeaway={`Share of pixels with ink: ${minInk}s use the least (${pct(ink[minInk])}), ${maxInk}s the most (${pct(ink[maxInk])}). Simple pixel counts already separate some digits.`}
            table={{ columns: ["Digit", "Ink"], rows: ink.map((v, d) => [d, pct(v)]) }}
          >
            <BarChart data={ink.map((v, d) => ({ label: String(d), value: v }))} format={(v) => pct(v)} highlight={(dd) => dd.label === String(minInk) || dd.label === String(maxInk)} />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Draw a digit. Watch the network read it."
          line="Your drawing is cropped, scaled and centred the way MNIST digits were, then run through the network on every stroke. Watch the neurons light up and the winning digit's output fire."
        />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <DigitsDemo />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`${n(model.shipped.errors)} mistakes in ${n(model.dataset.test)} test digits.`}
          line={`${pct(model.shipped.acc, 2)} accuracy for the 8-bit model in your browser (${pct(model.shipped.float_acc, 2)} before shrinking), against ${pct(soft.acc)} for a model with no hidden layer.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="The network, layer by layer" takeaway={`${n(chosen.params)} parameters in total; most of them sit in the dense layer.`} className="md:col-span-2">
            <Architecture />
          </ChartCard>
          <ChartCard
            title="Four networks, four kinds of test"
            takeaway={`On clean test digits the CNNs tie (${pct(plain.acc, 2)} vs ${pct(chosen.acc, 2)}). Move the digits around and augmentation pays: shifted digits ${pct(plain.robust["Shifted ±4 px"])} → ${pct(chosen.robust["Shifted ±4 px"])}, shrunk ${pct(plain.robust["Shrunk to 70%"])} → ${pct(chosen.robust["Shrunk to 70%"])}.`}
            legend={CONDITIONS.map((c, i) => ({ label: c, color: COND_COLORS[i], shape: "square" as const }))}
            table={{ columns: ["Model", ...CONDITIONS], rows: model.comparison.map((c) => [c.model, ...CONDITIONS.map((k) => pct(c.robust[k], 2))]) }}
            className="md:col-span-2"
          >
            <GroupedBars groups={model.comparison.map((c) => SHORT[c.model] ?? c.model)} series={CONDITIONS.map((k, i) => ({ name: k, color: COND_COLORS[i], values: model.comparison.map((c) => c.robust[k]) }))} format={(v) => pct(v, 0)} max={1} />
          </ChartCard>
          <ChartCard
            title="Training the shipped network"
            takeaway={`Stopped after ${epochs} epochs, when validation loss stopped improving. Training accuracy sits below validation because augmentation and dropout make training harder on purpose.`}
            legend={[
              { label: "Training accuracy", color: S2, shape: "line" },
              { label: "Validation accuracy", color: INK, shape: "line" },
              { label: "Plain CNN, validation", color: "#b9b6ad", shape: "line" },
            ]}
            table={{ columns: ["Epoch", "Train acc", "Val acc"], rows: h.accuracy.map((a, i) => [i + 1, pct(a, 2), pct(h.val_accuracy[i], 2)]) }}
          >
            <LineChart
              series={[
                { name: "Plain CNN val", color: "#b9b6ad", points: hp.val_accuracy.map((v, i) => [i + 1, v] as [number, number]), dashed: true },
                { name: "Train", color: S2, points: h.accuracy.map((v, i) => [i + 1, v] as [number, number]) },
                { name: "Val", color: INK, points: h.val_accuracy.map((v, i) => [i + 1, v] as [number, number]) },
              ]}
              xDomain={[1, Math.max(epochs, hp.val_accuracy.length)]}
              yDomain={[0.9, 1]}
              xFormat={(v) => String(Math.round(v))}
              yFormat={(v) => pct(v, 0)}
              markers
              xLabel="Epoch"
            />
          </ChartCard>
          <ChartCard title="Per-digit accuracy" takeaway={`Weakest: ${model.per_digit.indexOf(Math.min(...model.per_digit))} (${pct(Math.min(...model.per_digit), 2)}). Strongest: ${model.per_digit.indexOf(Math.max(...model.per_digit))} (${pct(Math.max(...model.per_digit), 2)}).`} table={{ columns: ["Digit", "Accuracy"], rows: model.per_digit.map((v, d) => [d, pct(v, 2)]) }}>
            <BarChart data={model.per_digit.map((v, d) => ({ label: String(d), value: v }))} format={(v) => pct(v, 1)} max={1} />
          </ChartCard>
          <ChartCard title="Which digits get mixed up" takeaway={`Dark diagonal: % read correctly. Orange: mistakes. The most common: ${model.pairs[0].actual} read as ${model.pairs[0].predicted} (${model.pairs[0].n} times).`} className="md:col-span-2">
            <Confusion />
          </ChartCard>
          <ChartCard title="The mistakes it was surest about" takeaway="Some are genuinely ambiguous; a few look mislabelled. This is where 99% stops being about the model and starts being about the data." className="md:col-span-2">
            <div className="flex flex-wrap gap-4 pt-1">
              {mistakes.map((s) => (
                <div key={s.id} className="flex flex-col items-center gap-1.5">
                  <Img b64={s.img} size={84} />
                  <p className="font-mono text-[11px]">
                    label <b>{s.label}</b> · read <b className="text-[#eb6834]">{s.pred}</b>
                  </p>
                  <p className="font-mono text-[10.5px] text-muted">{pct(s.p, 0)} sure</p>
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard title="All networks" takeaway="Trained on CPU with early stopping; seconds are wall-clock time on a laptop." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Model", "Parameters", "Test accuracy", "Shifted", "Rotated", "Shrunk", "Epochs", "Seconds"],
                rows: [
                  ...model.comparison.map((c) => [c.model + (c.model === model.chosen ? " (shipped)" : ""), n(c.params), pct(c.acc, 2), pct(c.robust["Shifted ±4 px"], 1), pct(c.robust["Rotated ±25°"], 1), pct(c.robust["Shrunk to 70%"], 1), c.epochs, c.seconds]),
                  ["Shipped, 8-bit weights", n(chosen.params), pct(model.shipped.acc, 2), "–", "–", "–", "–", "–"],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
