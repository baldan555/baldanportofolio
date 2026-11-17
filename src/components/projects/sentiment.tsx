"use client";

import { motion } from "framer-motion";
import model from "@/data/models/bilingual-sentiment.json";
import { BarChart, ChartCard, DataTable, Heatmap } from "../charts";
import { SENT_COLOR, SentimentDemo } from "../demos/sentiment-demo";
import { DatasetCard, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const { id: ID, en: EN } = model;
const n = (v: number) => v.toLocaleString("en-US");
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const NAME: Record<string, string> = { positive: "Positive", neutral: "Neutral", negative: "Negative", ambiguous: "Ambiguous", mixed: "Mixed" };
const cmp = (l: typeof ID | typeof EN, m: string) => l.comparison.find((c) => c.model === m)!;
const verdict = (a: number, b: number) => (Math.abs(a - b) < 0.02 ? "level with" : a > b ? "ahead of" : "behind");

const idCols: ColumnDoc[] = [
  { name: "text", type: "sentence", meaning: "A review or opinion in Indonesian, already lower-cased and split into words by the dataset authors", used: true },
  { name: "label", type: "3 classes", meaning: "positive, neutral or negative, labelled by people", used: true },
];
const enCols: ColumnDoc[] = [
  { name: "text", type: "comment", meaning: "A Reddit comment in English; names are replaced by [NAME]", used: true },
  { name: "emotions", type: "1+ of 28", meaning: "admiration, gratitude, anger, curiosity… or neutral; a comment can have several", used: true },
  { name: "sentiment", type: "4 classes", meaning: "Derived from the emotions with Google's own mapping: positive, negative, ambiguous or neutral", used: true },
  { name: "id", type: "text", meaning: "Reddit comment id", used: false },
];

const PIPELINE = [
  { t: "Words", d: "The text is split into words and punctuation, exactly the same way in Python and in your browser" },
  { t: "Numbers", d: `Each known word becomes a learned vector (${cmp(ID, ID.chosen).dim}–${cmp(EN, EN.chosen).dim} numbers); unknown words share one vector` },
  { t: "BiLSTM", d: "Two LSTMs read the sentence, one left to right and one right to left, so each word is seen in context" },
  { t: "Strongest signals", d: "For every feature, the strongest value anywhere in the sentence is kept" },
  { t: "Answer", d: "Sentiment probabilities; for English also 28 emotions, each with its own threshold" },
];

export function SentimentBody() {
  const idShip = ID.shipped;
  const enShip = EN.shipped;
  const emoF1 = Object.entries(enShip.emo_per_class).sort((a, b) => b[1] - a[1]);
  const emoCounts = Object.entries(EN.emotion_counts).sort((a, b) => b[1] - a[1]);
  const lrId = cmp(ID, "TF-IDF + logistic regression");
  const lrEn = EN.comparison.find((c) => c.model === "TF-IDF + logistic regression")!;
  const lstmId = cmp(ID, "BiLSTM");
  const lstmEn = EN.comparison.find((c) => c.model === "BiLSTM")!;
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title="Two languages, two kinds of text."
          line="Indonesian reviews and opinions, and English Reddit comments labelled with 28 emotions. Each language gets its own model, trained on its own data; the test sets stay untouched until the end."
        />
        <div className="space-y-4">
          <DatasetCard
            name="SmSA: Indonesian sentiment"
            source={ID.dataset.source}
            sourceLabel="IndoNLU on GitHub"
            description={`${n(ID.dataset.train + ID.dataset.val + ID.dataset.test)} Indonesian sentences from reviews and opinions, labelled positive, neutral or negative. Collected by ${ID.dataset.origin}, published in the IndoNLU benchmark under ${ID.dataset.license}.`}
            facts={[
              { label: "train", value: n(ID.dataset.train) },
              { label: "validation", value: n(ID.dataset.val) },
              { label: "test", value: n(ID.dataset.test) },
              { label: "words known", value: n(ID.vocab_size) },
            ]}
            columns={idCols}
          />
          <DatasetCard
            name="GoEmotions: English emotions"
            source={EN.dataset.source}
            sourceLabel="GoEmotions on GitHub"
            description={`${n(EN.dataset.train + EN.dataset.val + EN.dataset.test)} English Reddit comments, each labelled by raters with one or more of 27 emotions or neutral. Published by ${EN.dataset.origin} in a repository under ${EN.dataset.license}. Reddit language is informal and sometimes rude; rude comments are left in training but never shown as samples here.`}
            facts={[
              { label: "train", value: n(EN.dataset.train) },
              { label: "validation", value: n(EN.dataset.val) },
              { label: "test", value: n(EN.dataset.test) },
              { label: "with 2+ emotions", value: pct(EN.multi_label, 0) },
            ]}
            columns={enCols}
          />
        </div>
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
        <SectionTitle kicker="Try it" title="Write something. Watch which words decide." line="Type in Indonesian or English; the page guesses the language. The colours show how much each word moved the answer: remove it, and the probability changes by that much." />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <SentimentDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle kicker="What the data looks like" title="Unbalanced labels, short texts, telling words." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Indonesian training labels"
            takeaway={`Positive dominates (${pct(ID.label_counts.train.positive / ID.dataset.train, 0)}) and neutral is rare, so every model was trained with balanced class weights and judged by macro-F1, which counts each class equally.`}
            table={{ columns: ["Label", "Train", "Test"], rows: ID.classes.map((c) => [NAME[c], ID.label_counts.train[c as keyof typeof ID.label_counts.train], ID.label_counts.test[c as keyof typeof ID.label_counts.test]]) }}
          >
            <BarChart data={ID.classes.map((c) => ({ label: NAME[c], value: ID.label_counts.train[c as keyof typeof ID.label_counts.train] }))} format={(v) => n(Math.round(v))} />
          </ChartCard>
          <ChartCard
            title="English training labels (sentiment from emotions)"
            takeaway={`"Mixed" comments carry emotions from more than one group (say, gratitude and sadness). They have no single sentiment, so they train the emotion head only: ${n(EN.label_counts.train.mixed)} of ${n(EN.dataset.train)}.`}
            table={{ columns: ["Label", "Train", "Test"], rows: [...EN.classes, "mixed"].map((c) => [NAME[c], EN.label_counts.train[c as keyof typeof EN.label_counts.train], EN.label_counts.test[c as keyof typeof EN.label_counts.test]]) }}
          >
            <BarChart data={[...EN.classes, "mixed"].map((c) => ({ label: NAME[c], value: EN.label_counts.train[c as keyof typeof EN.label_counts.train] }))} format={(v) => n(Math.round(v))} />
          </ChartCard>
          <ChartCard
            title="Words that point each way (from the TF-IDF baseline)"
            takeaway="The strongest single words in the logistic regression baseline. They are what any model latches onto first; the BiLSTM can also use word order, as in 'tidak enak' or 'not bad'."
            className="md:col-span-2"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { l: "Indonesian", d: ID },
                { l: "English", d: EN },
              ].map(({ l, d }) => (
                <div key={l} className="space-y-2">
                  <p className="font-mono text-[11px] text-muted uppercase">{l}</p>
                  {(["positive", "negative"] as const).map((c) => (
                    <div key={c} className="flex flex-wrap items-center gap-1.5">
                      <span className="w-[68px] text-[12px] font-semibold" style={{ color: SENT_COLOR[c] }}>
                        {NAME[c]}
                      </span>
                      {d.top_words[c].slice(0, 9).map((w) => (
                        <span key={w.word} className="rounded-full px-2.5 py-0.5 text-[12px]" style={{ background: `${SENT_COLOR[c]}1f` }}>
                          {w.word}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard
            title="The 28 emotions in English training data"
            takeaway={`${emoCounts[0][0]} is the most common label (${n(emoCounts[0][1])}); ${emoCounts.at(-1)![0]} the rarest (${n(emoCounts.at(-1)![1])}). Rare emotions are much harder to learn.`}
            table={{ columns: ["Emotion", "Train comments"], rows: emoCounts }}
            className="md:col-span-2"
          >
            <BarChart data={emoCounts.map(([e, v]) => ({ label: e, value: v }))} format={(v) => n(Math.round(v))} width={860} height={240} />
          </ChartCard>
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How good is it, honestly"
          title={`For sentiment, the BiLSTM is ${verdict(lstmId.f1, lrId.f1)} the classic baseline in Indonesian and ${verdict(lstmEn.f1, lrEn.f1)} it in English.`}
          line={`Three models per language, compared on test data none of them saw: a TF-IDF + logistic regression baseline, averaged word embeddings and a BiLSTM, with sizes chosen on validation data only. For the 28 English emotions the baseline, with one classifier per emotion, stays ahead (macro-F1 ${lrEn.emo_f1.toFixed(3)} vs ${lstmEn.emo_f1.toFixed(3)}). Macro-F1 averages every class's F1, so rare classes count as much as common ones.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title={`Indonesian test set (${n(ID.dataset.test)} sentences)`} takeaway={`Shipped: ${ID.chosen}, ${pct(idShip.acc)} accuracy, macro-F1 ${idShip.f1.toFixed(3)}; its 8-bit browser version agrees with full precision on ${pct(idShip.agree_float)} of test sentences. Every model loses about ${(ID.comparison.reduce((a, c) => a + c.val_f1 - c.f1, 0) / ID.comparison.length).toFixed(2)} macro-F1 from validation to test: the official test set is more balanced than training.`}>
            <DataTable data={{ columns: ["Model", "Accuracy", "Macro-F1", "Weights"], rows: ID.comparison.map((c) => [c.model + (c.model === ID.chosen ? " ✓" : ""), pct(c.acc), c.f1.toFixed(3), n(c.params)]) }} />
          </ChartCard>
          <ChartCard
            title={`English test set (${n(enShip.test_rows)} comments with one sentiment)`}
            takeaway={`Shipped: ${EN.chosen}, ${pct(enShip.acc)} accuracy over 4 sentiments, macro-F1 ${enShip.f1.toFixed(3)}; emotions macro-F1 ${enShip.emo_f1.toFixed(3)} over all ${n(EN.dataset.test)} test comments.`}
          >
            <DataTable data={{ columns: ["Model", "Accuracy", "Macro-F1", "Emotions F1"], rows: EN.comparison.map((c) => [c.model + (c.model === EN.chosen ? " ✓" : ""), pct(c.acc), c.f1.toFixed(3), c.emo_f1.toFixed(3)]) }} />
          </ChartCard>
          <ChartCard title="Indonesian: where it goes wrong" takeaway={`Rows are the human label, columns the model's answer. Neutral is the hardest class (F1 ${idShip.per_class_f1[1].toFixed(2)}): it is rare in training and sits between the other two.`}>
            <Heatmap rows={idShip.confusion} rowLabels={ID.classes.map((c) => NAME[c].slice(0, 3))} colLabels={ID.classes.map((c) => NAME[c])} />
          </ChartCard>
          <ChartCard
            title="English: where it goes wrong"
            takeaway={`Ambiguous (surprise, curiosity, confusion, realisation) is the hardest group, F1 ${enShip.per_class_f1[3].toFixed(2)}; positive is the easiest, F1 ${enShip.per_class_f1[0].toFixed(2)}.`}
          >
            <Heatmap rows={enShip.confusion} rowLabels={EN.classes.map((c) => NAME[c].slice(0, 3))} colLabels={EN.classes.map((c) => NAME[c])} />
          </ChartCard>
          <ChartCard
            title="English: F1 for each of the 28 emotions (shipped model)"
            takeaway={`${emoF1[0][0]} (${emoF1[0][1].toFixed(2)}) and ${emoF1[1][0]} (${emoF1[1][1].toFixed(2)}) are easy: they come with telling words. ${emoF1.at(-1)![0]} (${emoF1.at(-1)![1].toFixed(2)}) and ${emoF1.at(-2)![0]} (${emoF1.at(-2)![1].toFixed(2)}) are hard: rare, subtle or both.`}
            table={{ columns: ["Emotion", "F1", "Threshold"], rows: emoF1.map(([e, v]) => [e, v.toFixed(3), EN.thresholds[EN.emotions.indexOf(e)]]) }}
            className="md:col-span-2"
          >
            <BarChart data={emoF1.map(([e, v]) => ({ label: e, value: v }))} format={(v) => v.toFixed(2)} max={1} width={860} height={240} />
          </ChartCard>
          <ChartCard title="What this project is, and isn't" takeaway="Two small networks trained from scratch, not a large pretrained language model." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["", "Here"],
                rows: [
                  ["Models", `BiLSTMs trained from scratch in TensorFlow: ${n(lstmId.params)} weights for Indonesian, ${n(lstmEn.params)} for English; int8 weights in the browser`],
                  ["Runs on", "Your browser, in TypeScript; checked against the NumPy reference sentence by sentence. Nothing you type leaves the page"],
                  ["Indonesian", "Trained on reviews and opinions; slang, typos and words it never saw weaken it. Neutral is its weakest class"],
                  ["English", "Trained on Reddit comments; sarcasm and long, mixed texts fool it. Emotions are English only"],
                  ["Not comparable", "The two test sets are different kinds of text with different labels, so Indonesian vs English scores say nothing about the languages"],
                  ["Better models exist", "Pretrained transformers (IndoBERT, RoBERTa) score higher but are hundreds of MB; these run instantly in a page"],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
