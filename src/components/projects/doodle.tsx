"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import model from "@/data/models/doodle-duel.json";
import { decodeImage } from "@/lib/cnn";
import { BarChart, ChartCard, DataTable } from "../charts";
import { CATS, DoodleDemo, EMOJI } from "../demos/doodle-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const n = (v: number) => v.toLocaleString("en-US");
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const ship = model.shipped;
const byName = (m: string) => model.comparison.find((c) => c.model === m)!;
const soft = byName("Softmax regression (no hidden layer)");
const chosen = byName(model.chosen);
const classAcc = CATS.map((c, i) => ({ c, v: model.per_class[i] })).sort((a, b) => b.v - a.v);

const columns: ColumnDoc[] = [
  { name: "drawing", type: "28×28 pixels", meaning: "A doodle drawn in under 20 seconds, cropped and scaled so its longest side fills the square", used: true },
  { name: "word", type: `1 of ${CATS.length}`, meaning: "What the person was asked to draw", used: true },
];

const PIPELINE = [
  { t: "Your strokes", d: "Every line you draw, recorded as points" },
  { t: "Frame", d: "Crop to the drawing, scale the longest side to 26 px, centre in 28×28" },
  { t: "CNN", d: `Two convolution blocks find lines, curves and corners; ${n(chosen.params)} weights in 8 bits` },
  { t: "30 scores", d: "One probability per thing it knows, recomputed while you draw" },
  { t: "The duel", d: `It wins the round once your word is its top guess with at least 25%` },
];

function Doodle28({ b64, className = "" }: { b64: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const px = decodeImage(b64);
    const img = ctx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const v = 255 - Math.round(px[i] * 255);
      img.data.set([v, v, v, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
  }, [b64]);
  return <canvas ref={ref} width={28} height={28} className={`aspect-square w-full rounded-lg [image-rendering:pixelated] ${className}`} />;
}

export function DoodleBody() {
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${n(model.split.train + model.split.val + model.split.test)} real doodles, ${CATS.length} things.`}
          line="People around the world were given a word and 20 seconds to draw it. Google published those drawings as the Quick, Draw! dataset; this network learned from a sample of 10,000 per word."
        />
        <DatasetCard
          name="Quick, Draw! (sample)"
          source={model.dataset.source}
          sourceLabel="Quick, Draw! dataset"
          description={`${model.dataset.license}. For each of the ${CATS.length} words, 10,000 drawings taken from five places spread through Google's file (each word has over a hundred thousand), then split 8,000 / 1,000 / 1,000 for training, validation and test. The dataset was moderated by Google, which notes some drawings may still be inappropriate, so no raw training doodle is shown on this page: only averages, and your own drawings.`}
          facts={[
            { label: "train", value: n(model.split.train) },
            { label: "validation", value: n(model.split.val) },
            { label: "test", value: n(model.split.test) },
            { label: "pixels each", value: "28×28" },
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
        <SectionTitle kicker="Play" title="Doodle Duel: you draw, it guesses." line="Six words, twenty seconds each. Draw fast: the network guesses while you draw and calls it the moment it is confident. Works with a finger on a phone." />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <DoodleDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle kicker="What people draw" title="The average of 8,000 doodles per word." line="Each tile is the pixel-by-pixel average of every training drawing for that word. Shared habits survive the averaging: the round apple, the triangle roof, the arc of a rainbow." />
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-10">
          {CATS.map((c, i) => (
            <motion.div key={c} initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: (i % 10) * 0.03 }} className="rounded-xl border border-line bg-white p-1.5">
              <Doodle28 b64={model.means[i]} />
              <p className="mt-1 truncate text-center text-[11px] text-ink-2/75" title={c}>
                {EMOJI[c]} {c}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How good is it"
          title={`${pct(ship.acc)} of test doodles guessed first time, ${pct(ship.top3)} within three guesses.`}
          line={`Four networks of growing power, tested on ${n(model.split.test)} doodles none of them saw. The chosen one was picked on validation accuracy, then shrunk to 8-bit weights and tested again with the exact forward pass your browser runs.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="Four networks, same test doodles" takeaway={`No hidden layer already gets ${pct(soft.acc, 0)}; convolutions add the rest by finding strokes and shapes anywhere in the square.`}>
            <DataTable
              data={{
                columns: ["Model", "Accuracy", "Top-3", "Weights"],
                rows: model.comparison.map((c) => [c.model + (c.model === model.chosen ? " ✓" : ""), pct(c.acc), pct(c.top3), n(c.params)]),
              }}
            />
            <p className="mt-3 text-[12.5px] text-ink-2/70">
              Shipped in 8 bits: {pct(ship.acc, 2)} (full precision {pct(ship.float_acc, 2)}), {Math.round(ship.bytes / 1024)} KB of weights.
            </p>
          </ChartCard>
          <ChartCard title="Most confused pairs (test set)" takeaway="The mistakes look like ones people would make: shapes that share an outline.">
            <div className="space-y-1.5">
              {model.pairs.slice(0, 8).map((p) => (
                <div key={`${p.actual}-${p.predicted}`} className="flex items-center justify-between rounded-lg bg-cream/60 px-3 py-1.5 text-[13px]">
                  <span>
                    {EMOJI[p.actual]} {p.actual} <span className="text-ink-2/50">read as</span> {EMOJI[p.predicted]} {p.predicted}
                  </span>
                  <span className="font-mono text-[12px] text-ink-2/70">{p.n} of 1,000</span>
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard
            title="Accuracy for each word"
            takeaway={`${cap(classAcc[0].c)} (${pct(classAcc[0].v, 0)}) and ${classAcc[1].c} (${pct(classAcc[1].v, 0)}) are easiest; ${classAcc.at(-1)!.c} (${pct(classAcc.at(-1)!.v, 0)}) and ${classAcc.at(-2)!.c} (${pct(classAcc.at(-2)!.v, 0)}) are hardest.`}
            table={{ columns: ["Word", "Accuracy"], rows: classAcc.map((x) => [x.c, pct(x.v)]) }}
            className="md:col-span-2"
          >
            <BarChart data={classAcc.map((x) => ({ label: x.c, value: x.v * 100 }))} format={(v) => `${v.toFixed(0)}%`} max={100} width={860} height={240} />
          </ChartCard>
          <ChartCard title="What this project is, and isn't" takeaway="A CNN trained from scratch on public doodles, playing a game in your browser." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["", "Here"],
                rows: [
                  ["Model", `${model.chosen}: ${n(chosen.params)} weights trained in TensorFlow, int8 in the browser; the forward pass is TypeScript, checked against NumPy`],
                  ["Data", `${n(model.split.train)} training doodles from Google's Quick, Draw! dataset (CC BY 4.0); 10,000 of the 100,000+ per word`],
                  ["Game", "Rounds, timer, live guesses, voice and the 28×28 'what it sees' view are built for this page; nothing you draw leaves your device"],
                  ["Limits", `Only ${CATS.length} words; it was trained on fast doodles, so detailed drawings or unusual angles can confuse it more than a quick sketch`],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}

