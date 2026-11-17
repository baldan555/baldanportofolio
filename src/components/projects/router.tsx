"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import model from "@/data/models/complaint-router.json";
import { BarChart, ChartCard, DataTable, GroupedBars, INK, LineChart, S1, S2 } from "../charts";
import { LABELS, RouterDemo, TEAM_COLORS, TEAMS, teamOf, type QuerySample } from "../demos/router-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const n = (v: number) => v.toLocaleString("en-US");

const SHORT: Record<string, string> = {
  "Naive Bayes · words": "NB",
  "Linear SVM · words": "SVM",
  "Logistic · words": "LR words",
  "Logistic · character n-grams": "LR chars",
};

const columns: ColumnDoc[] = [
  { name: "text", type: "text", meaning: "The customer's message, as typed", used: true },
  { name: "category", type: "target", meaning: "One of 77 intents, e.g. card_arrival or top_up_reverted: what we predict", used: true },
  { name: "team", type: "added", meaning: "Which of 8 support teams handles that intent: my grouping, shown in full below" },
];

const chosen = model.comparison.find((c) => c.model === model.chosen)!;
const s = model.shipped;
const sameTeamShare = (s.team_acc - s.acc) / (1 - s.acc);

function TeamBars() {
  const data = model.eda.per_team;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="space-y-2 pt-1">
      {data.map((d, i) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[12.5px]">
          <span className="truncate">
            {d.label} <span className="text-muted">· {d.intents} intents</span>
          </span>
          <span className="font-mono text-[11.5px] text-ink-2/70">{n(d.value)}</span>
          <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink/6">
            <motion.div
              className="h-full rounded-full"
              style={{ background: TEAM_COLORS[i] }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(d.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.04 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Rows: the team the message belongs to. Columns: where the model sent it. */
function TeamConfusion() {
  const rows = model.team_confusion;
  const offMax = Math.max(...rows.flatMap((r, i) => r.filter((_, j) => j !== i)));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-1 text-[12px]">
        <thead>
          <tr>
            <th className="text-left font-mono text-[10px] font-medium text-muted uppercase">Belongs to ↓ · sent to →</th>
            {TEAMS.map((t, j) => (
              <th key={t} className="w-[52px] font-mono text-[10.5px] font-medium" title={t}>
                <span className="mx-auto mb-1 block h-1.5 w-5 rounded-full" style={{ background: TEAM_COLORS[j] }} />
                {j + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const total = r.reduce((a, b) => a + b, 0);
            return (
              <tr key={i}>
                <td className="pr-2 whitespace-nowrap">
                  <span className="mr-1.5 font-mono text-[10.5px] text-muted">{i + 1}</span>
                  {TEAMS[i]}
                </td>
                {r.map((v, j) => (
                  <td
                    key={j}
                    title={`${TEAMS[i]} → ${TEAMS[j]}: ${v}`}
                    className={`h-9 rounded-md text-center font-mono ${i === j ? "bg-ink text-white" : ""}`}
                    style={i === j ? undefined : { background: v ? `rgba(235,104,52,${(0.12 + (0.6 * v) / offMax).toFixed(3)})` : "rgba(11,11,11,0.03)" }}
                  >
                    {i === j ? pct(v / total) : v || ""}
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

export function RouterBody() {
  const [sel, setSel] = useState<QuerySample | null>(null);
  const e = model.eda;
  const conf = model.confidence;
  const at60 = conf.find((c) => Math.abs(c.t - 0.6) < 1e-9)!;
  const lc = model.learning;
  const groups = [...model.comparison.map((c) => SHORT[c.model] ?? c.model), "Shipped"];

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${n(model.dataset.train + model.dataset.test)} customer messages, 77 intents.`}
          line={`Short questions to an online bank, a median of ${model.dataset.words_median} words each. I grouped the 77 intents into the 8 teams a support desk might have.`}
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset (PolyAI, GitHub)"
          description={`Released by PolyAI with the paper “Efficient Intent Detection with Dual Sentence Encoders” (Casanueva et al., 2020). Each message carries one of 77 fine-grained intents, from a card that hasn't arrived to a top-up that was reverted. The authors fixed the test set at 40 messages per intent, so every number here is on data the model never saw. Licence: ${model.dataset.license}.`}
          facts={[
            { label: "training messages", value: n(model.dataset.train) },
            { label: "test messages", value: n(model.dataset.test) },
            { label: "intents", value: String(model.dataset.intents) },
            { label: "teams (my grouping)", value: String(model.dataset.teams) },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Cards, top-ups and a lot of “why”." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="Training messages per team" takeaway="Payments & disputes is the busiest desk. Exchange & currency and Account & identity get the least." table={{ columns: ["Team", "Intents", "Messages"], rows: e.per_team.map((t) => [t.label, t.intents, t.value]) }}>
            <TeamBars />
          </ChartCard>
          <ChartCard title="Words per message" takeaway={`Most messages are 5 to 12 words: about as much as a chat bubble. ${pct(e.words_hist[e.words_hist.length - 1].value / model.dataset.train)} run past 25 words.`} table={{ columns: ["Words", "Messages"], rows: e.words_hist.map((w) => [w.label, w.value]) }}>
            <BarChart data={e.words_hist} />
          </ChartCard>
          <ChartCard
            title="How 77 intents become 8 teams"
            takeaway="Each card lists the words that are most typical of that team compared with all the others, then the intents it owns."
            className="md:col-span-2"
          >
            <div className="grid gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-4">
              {model.teams.map((t, i) => (
                <div key={t.name} className="rounded-2xl bg-cream/60 p-4">
                  <p className="flex items-center gap-2 text-[14px] font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: TEAM_COLORS[i] }} />
                    {t.name}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {(e.telling as Record<string, string[]>)[t.name].map((w) => (
                      <span key={w} className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px]">
                        {w}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-[11.5px] leading-relaxed text-ink-2/65">{t.intents.map((k) => LABELS[k]).join(" · ")}</p>
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard
            title="Examples per intent (training set)"
            takeaway={`Uneven: from ${e.per_intent.min} (${e.per_intent.min_label.toLowerCase()}) to ${e.per_intent.max} (${e.per_intent.max_label.toLowerCase()}). The test set is perfectly even at 40 each.`}
            table={{ columns: ["Examples", "Intents"], rows: e.per_intent_hist.map((b) => [b.label, b.value]) }}
            className="md:col-span-2"
          >
            <BarChart data={e.per_intent_hist} width={860} height={200} />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Type a message, watch it get routed."
          line="The model reads letter chunks (2 to 5 characters inside each word), so typos and word endings still count. Click a real test message or write your own."
        />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "text", label: "Message", render: (r) => (r.text.length > 52 ? `${r.text.slice(0, 50)}…` : r.text) },
            { key: "actual", label: "Labelled", render: (r) => LABELS[r.actual] },
            { key: "predicted", label: "Model says", render: (r) => LABELS[r.predicted] },
            { key: "p", label: "Sure", align: "right", render: (r) => pct(r.p) },
            { key: "correct", label: "Result", render: (r) => <Pill yes={r.correct}>{r.correct ? "Exact" : r.team_correct ? "Right team" : "Wrong team"}</Pill> },
          ]}
          note="8 random test messages plus the 2 mistakes the model was most sure about. Both still land with the right team, and both labels are arguable."
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <RouterDemo key={sel?.id ?? "free"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`${pct(s.acc)} exact intent, ${pct1(s.team_acc)} to the right team.`}
          line={`On ${n(model.dataset.test)} test messages, choosing between 77 intents. Always guessing one intent would score ${pct1(1 / model.dataset.intents)}. ${pct(sameTeamShare)} of the intent mistakes still reach the right team.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Four models, one test set"
            takeaway={`Character n-grams beat words (${pct1(chosen.acc)} vs ${pct1(model.comparison.find((c) => c.model === "Logistic · words")!.acc)}). Shrinking the model to ${n(s.ngrams)} n-grams with 8-bit weights for the browser costs ${((chosen.acc - s.acc) * 100).toFixed(1)} points.`}
            legend={[
              { label: "Exact intent", color: INK, shape: "square" },
              { label: "Right team", color: "#b9b6ad", shape: "square" },
            ]}
            table={{ columns: ["Model", "Exact intent", "Right team"], rows: [...model.comparison.map((c) => [c.model, pct1(c.acc), pct1(c.team_acc)]), ["Shipped (browser)", pct1(s.acc), pct1(s.team_acc)]] }}
          >
            <GroupedBars
              groups={groups}
              series={[
                { name: "Exact intent", color: INK, values: [...model.comparison.map((c) => c.acc), s.acc] },
                { name: "Right team", color: "#b9b6ad", values: [...model.comparison.map((c) => c.team_acc), s.team_acc] },
              ]}
              format={pct}
              max={1}
            />
          </ChartCard>
          <ChartCard
            title="Automate the sure ones, ask a human for the rest"
            takeaway={`At 60% confidence, ${pct(at60.coverage)} of messages are routed automatically and ${pct1(at60.team_acc)} of those reach the right team. The rest go to a person.`}
            legend={[
              { label: "Share auto-routed", color: S1, shape: "line" },
              { label: "Right team, of those", color: INK, shape: "line" },
              { label: "Exact intent, of those", color: S2, shape: "line" },
            ]}
            table={{ columns: ["Threshold", "Auto-routed", "Right team", "Exact intent"], rows: conf.map((c) => [pct(c.t), pct1(c.coverage), pct1(c.team_acc), pct1(c.acc)]) }}
          >
            <LineChart
              series={[
                { name: "Auto-routed", color: S1, points: conf.map((c) => [c.t, c.coverage] as [number, number]) },
                { name: "Right team", color: INK, points: conf.map((c) => [c.t, c.team_acc] as [number, number]) },
                { name: "Exact intent", color: S2, points: conf.map((c) => [c.t, c.acc] as [number, number]), dashed: true },
              ]}
              xDomain={[0, 0.95]}
              yDomain={[0.5, 1]}
              xTicks={[0, 0.25, 0.5, 0.75, 0.95]}
              xFormat={pct}
              yFormat={pct}
              xLabel="Confidence needed to auto-route"
            />
          </ChartCard>
          <ChartCard
            title="More labelled messages, better routing"
            takeaway={`With ${n(lc[0].n)} labelled examples the model is right ${pct(lc[0].acc)} of the time; all ${n(lc[lc.length - 1].n)} get it to ${pct(lc[lc.length - 1].acc)}. Still climbing: more labels would help.`}
            table={{ columns: ["Training messages", "Exact intent"], rows: lc.map((l) => [n(l.n), pct1(l.acc)]) }}
          >
            <LineChart
              series={[{ name: "Exact intent", color: INK, points: lc.map((l) => [l.n, l.acc] as [number, number]) }]}
              xDomain={[0, 10500]}
              yDomain={[0.7, 0.95]}
              xTicks={[0, 2500, 5000, 7500, 10000]}
              xFormat={(v) => (v === 0 ? "0" : `${(v / 1000).toFixed(1)}k`)}
              yFormat={pct}
              markers
              xLabel="Labelled training messages"
            />
          </ChartCard>
          <ChartCard
            title="The intents it mixes up"
            takeaway="Almost all near-misses are siblings: a virtual card that doesn't work vs getting one, a failed top-up vs a reverted one."
            table={{ columns: ["Labelled", "Predicted", "Times"], rows: model.pairs.map((p) => [LABELS[p.actual], LABELS[p.predicted], p.n]) }}
          >
            <ul className="space-y-2 pt-1 text-[12.5px]">
              {model.pairs.slice(0, 7).map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <span className="min-w-0">
                    {LABELS[p.actual]} <span className="text-muted">→</span> {LABELS[p.predicted]}
                    {teamOf(p.actual) === teamOf(p.predicted) && <span className="ml-1.5 rounded-full bg-cream px-1.5 py-0.5 text-[10.5px] text-ink-2/70">same team</span>}
                  </span>
                  <span className="shrink-0 font-mono">{p.n}×</span>
                </li>
              ))}
            </ul>
          </ChartCard>
          <ChartCard title="Where team routing goes wrong" takeaway="Dark cells: share of each team's messages routed correctly. Orange: messages sent to another team." className="md:col-span-2">
            <TeamConfusion />
          </ChartCard>
          <ChartCard title="All models" takeaway={`Regularisation was chosen by ${model.cv.folds}-fold cross-validation on the training set (C = ${model.cv.C}); the test set was only used for these final numbers.`} className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Model", "Exact intent", "Macro-F1", "Right intent in top 3", "Right team", "Features"],
                rows: [
                  ...model.comparison.map((c) => [c.model, pct1(c.acc), c.macro_f1.toFixed(3), pct1(c.top3), pct1(c.team_acc), n(c.features)]),
                  ["Shipped: char n-grams, 8-bit", pct1(s.acc), s.macro_f1.toFixed(3), pct1(s.top3), pct1(s.team_acc), n(s.ngrams)],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
