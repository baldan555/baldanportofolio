"use client";

import { motion } from "framer-motion";
import model from "@/data/models/sign-language.json";
import { BarChart, ChartCard, DataTable } from "../charts";
import { HandSketch, LETTERS, SignDemo } from "../demos/sign-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const n = (v: number) => v.toLocaleString("en-US");
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const NN = "Neural network (MLP)";
const grouped = model.results.grouped as Record<string, number>;
const random = model.results.random as Record<string, number>;
const byLetter = LETTERS.map((l, k) => ({ l, v: model.per_letter[k], c: model.counts[k] })).sort((a, b) => b.v - a.v);

const columns: ColumnDoc[] = [
  { name: "21 points", type: "x, y, z each", meaning: "Wrist, then four joints per finger, from MediaPipe's hand tracker in a web browser", used: true },
  { name: "letter", type: `1 of ${LETTERS.length}`, meaning: "The folder the sample sits in: the letter the participant was asked to sign", used: true },
];

const PIPELINE = [
  { t: "Camera frame", d: "Processed in the browser, never uploaded" },
  { t: "21 hand points", d: "Google's hand tracker, the same family that recorded the training data" },
  { t: "Normalise", d: "Wrist to the origin, divided by palm length: position and distance stop mattering" },
  { t: "Neural network", d: "63 numbers in, two hidden layers, one score per letter out" },
  { t: "Hold to type", d: `The letter must win most of the last frames, then be held for a moment` },
];

export function SignBody() {
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${n(model.dataset.samples)} hand shapes, ${LETTERS.length} letters.`}
          line="Fingerspelling spells words letter by letter with one hand. The ASLNow! project recorded people signing each letter and stored the hand landmarks, not the video, so the data is small, private and ready for a model."
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset on Hugging Face"
          description={`Published under the ${model.dataset.license} licence. Each sample is the 21 points of one signing hand, captured with MediaPipe's web hand tracker from several participants. The files carry no participant id, and J and Z (moving letters in ASL) are recorded as still poses.`}
          facts={[
            { label: "samples", value: n(model.dataset.samples) },
            { label: "letters", value: String(LETTERS.length) },
            { label: "numbers per sample", value: "63" },
            { label: "near-duplicate groups", value: n(model.groups) },
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
        <SectionTitle kicker="Try it" title="Spell with your hand." line="Start the camera and make a letter with one hand. Hold it steady and it is typed. Practise words shows the next letter's average hand shape from the data as a hint." />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <SignDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle kicker="What the data looks like" title="The average hand for every letter." line="Each sketch is the mean of all normalised samples for that letter: wrist at the bottom, fingertips in orange. They are averages of the data, not official ASL diagrams, but the shapes are already recognisable: the fist of A, the flat hand of B, the hook of C." />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-13">
          {LETTERS.map((l, k) => (
            <motion.div key={l} initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: (k % 13) * 0.03 }} className="rounded-xl border border-line bg-white p-1.5 text-center">
              <div className="grid place-items-center">
                <HandSketch k={k} size={70} />
              </div>
              <p className="text-[14px] font-semibold">{l}</p>
              <p className="font-mono text-[10px] text-muted">{model.counts[k]}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How good is it, honestly"
          title={`${pct(grouped[NN])} of letters right when near-duplicates can't leak, ${pct(random[NN])} on a random split.`}
          line="Neighbouring frames of one recording look almost identical. On a random split they land on both sides and inflate the score, so samples closer than a small distance were grouped and kept together. The grouped number is the one to trust; a new signer may still score lower."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="Three models, two ways of testing (5-fold cross-validation)" takeaway="All three find the shapes; the neural network, trained on mirrored, rotated and stretched hands, is shipped because it is small and smooth to run live.">
            <DataTable
              data={{
                columns: ["Model", "Random split", "Near-duplicates grouped"],
                rows: Object.keys(grouped).map((m) => [m + (m === NN ? " ✓" : ""), pct(random[m]), pct(grouped[m])]),
              }}
            />
          </ChartCard>
          <ChartCard title="Letters it confuses most (grouped test)" takeaway="The mix-ups are letters that differ by one finger or a thumb position, which ASL learners confuse too.">
            <div className="space-y-1.5">
              {model.pairs.slice(0, 8).map((p) => (
                <div key={`${p.actual}-${p.predicted}`} className="flex items-center justify-between rounded-lg bg-cream/60 px-3 py-1.5 text-[13px]">
                  <span>
                    <b>{p.actual}</b> <span className="text-ink-2/50">read as</span> <b>{p.predicted}</b>
                  </span>
                  <span className="font-mono text-[12px] text-ink-2/70">{p.n}×</span>
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard title="Accuracy per letter (grouped test, neural network)" takeaway={`${byLetter[0].l} and ${byLetter[1].l} are easiest; ${byLetter.at(-1)!.l} and ${byLetter.at(-2)!.l} are hardest.`} table={{ columns: ["Letter", "Accuracy", "Samples"], rows: byLetter.map((x) => [x.l, pct(x.v), x.c]) }} className="md:col-span-2">
            <BarChart data={byLetter.map((x) => ({ label: x.l, value: x.v * 100 }))} format={(v) => `${v.toFixed(0)}%`} max={100} width={860} height={230} />
          </ChartCard>
          <ChartCard title="What this project is, and isn't" takeaway="A letter speller trained from scratch on public landmark data, not a full sign language translator." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["", "Here"],
                rows: [
                  ["Model", "A dense neural network (63 → 128 → 64 → 26) trained in TensorFlow on normalised landmarks, run in TypeScript and checked against NumPy"],
                  ["Hand tracking", "Google's MediaPipe hand landmarks (Apache-2.0), the same tracker family that recorded the training data"],
                  ["Scope", "ASL fingerspelling only: single letters held still. Real sign languages, including Indonesia's BISINDO, use movement, both hands, the face and grammar"],
                  ["Limits", `${n(model.dataset.samples)} samples from an unknown number of people; unusual hands, angles or lighting will do worse. J and Z are learned as still poses`],
                  ["Privacy", "Video is processed in the browser and never uploaded or recorded"],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
