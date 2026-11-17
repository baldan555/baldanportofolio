"use client";

import { useState } from "react";
import model from "@/data/models/bank-fraud.json";
import { BarChart, ChartCard, DataTable, Histogram, INK, LineChart, S1, S2 } from "../charts";
import { FraudDemo, type TxSample } from "../demos/fraud-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

const columns: ColumnDoc[] = [
  { name: "Time", type: "seconds", meaning: "Seconds since the first transaction in the file (no clock time given)" },
  { name: "V1 … V28", type: "number", meaning: "Principal components of the original features, anonymised by the bank", used: true },
  { name: "Amount", type: "number", meaning: "Transaction amount; the model uses log(1 + amount)", used: true },
  { name: "Class", type: "target", meaning: "1 = fraud, 0 = legitimate: the thing we predict", used: true },
];

const chosen = model.comparison.find((c) => c.model === model.chosen)!;
const rf = model.comparison.find((c) => c.model === "Random Forest")!;
const oneIn = Math.round(1 / model.dataset.fraud_rate);

export function FraudBody() {
  const [sel, setSel] = useState<TxSample | null>(null);
  const amt = model.eda.amount_hist;
  const ph = model.eda.per_hour;
  const byh = model.eda.fraud_rate_by_hour;
  const peak = [...byh].sort((a, b) => b.rate - a.rate)[0];
  const median = byh.map((b) => b.rate).sort((a, b) => a - b)[12];

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${model.dataset.rows.toLocaleString("en-US")} card payments, ${model.dataset.frauds} frauds.`}
          line={`One fraud in every ${oneIn.toLocaleString("en-US")} transactions. A model that says "never fraud" is ${pct1(1 - model.dataset.fraud_rate)} accurate and catches nothing.`}
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset page (ULB)"
          description={`Two days of real European card payments from September 2013, released by the Machine Learning Group at ULB with Worldline. To protect cardholders, every feature except time and amount was turned into anonymous principal components. Licence: ${model.dataset.license}; this rebuild downloads the public copy hosted for TensorFlow's tutorials.`}
          facts={[
            { label: "transactions", value: model.dataset.rows.toLocaleString("en-US") },
            { label: "frauds", value: String(model.dataset.frauds) },
            { label: "fraud rate", value: `${(model.dataset.fraud_rate * 100).toFixed(3)}%` },
            { label: "hours covered", value: String(Math.round(model.dataset.hours)) },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="A needle, a haystack, and some clues." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Transactions and frauds per hour"
            takeaway="Volume drops for several hours each day (probably night). Frauds don't drop with it."
            legend={[
              { label: "Transactions (÷100)", color: S1, shape: "line" },
              { label: "Frauds", color: S2, shape: "line" },
            ]}
            table={{ columns: ["Hour since start", "Transactions", "Frauds"], rows: ph.tx.map((t, i) => [i, t, ph.fraud[i]]) }}
            className="md:col-span-2"
          >
            <LineChart
              series={[
                { name: "Transactions ÷100", color: S1, points: ph.tx.map((t, i) => [i, t / 100] as [number, number]) },
                { name: "Frauds", color: S2, points: ph.fraud.map((f, i) => [i, f] as [number, number]) },
              ]}
              xDomain={[0, ph.tx.length - 1]}
              yDomain={[0, 100]}
              xTicks={[0, 12, 24, 36, 47]}
              xFormat={(v) => `+${Math.round(v)}h`}
              yFormat={(v) => String(Math.round(v))}
              width={860}
              height={220}
            />
          </ChartCard>
          <ChartCard
            title="Fraud rate by hour of each day"
            takeaway={`Hour ${peak.label} (counting from the start of recording) is the worst: ${(peak.rate * 1000).toFixed(1)} frauds per 1,000 payments, vs a typical ${(median * 1000).toFixed(1)}.`}
            table={{ columns: ["Hour", "Fraud per 1,000", "Transactions"], rows: byh.map((b) => [b.label, (b.rate * 1000).toFixed(2), b.n]) }}
          >
            <BarChart data={byh.map((b) => ({ label: String(b.label), value: b.rate * 1000 }))} format={(v) => v.toFixed(1)} highlight={(d) => d.value > median * 1000 * 2} />
          </ChartCard>
          <ChartCard
            title="Amount: legit vs fraud"
            takeaway={`Log scale. ${pct(model.eda.small_share.Fraud)} of frauds are for 1 or less, vs ${pct(model.eda.small_share.Legit)} of legit payments, a pattern often linked to test charges. Median fraud ${model.eda.amount_median.Fraud}, legit ${model.eda.amount_median.Legit}.`}
            legend={[
              { label: "Legit", color: S1, shape: "square" },
              { label: "Fraud", color: S2, shape: "square" },
            ]}
          >
            <Histogram
              bins={amt.bins}
              series={[
                { name: "Legit", color: S1, values: amt.series.Legit },
                { name: "Fraud", color: S2, values: amt.series.Fraud },
              ]}
              format={pct}
              xFormat={(v) => (v === 0 ? "0" : `${Math.round(10 ** v - 1)}`)}
            />
          </ChartCard>
          <ChartCard
            title="Which anonymous signals separate fraud best"
            takeaway={`On its own, ${model.eda.univariate_auc[0].feature} already ranks fraud with an AUC of ${model.eda.univariate_auc[0].auc.toFixed(2)}.`}
            table={{ columns: ["Signal", "AUC on its own"], rows: model.eda.univariate_auc.map((u) => [u.feature, u.auc.toFixed(3)]) }}
            className="md:col-span-2"
          >
            <BarChart data={model.eda.univariate_auc.map((u) => ({ label: u.feature, value: u.auc }))} max={1} format={(v) => v.toFixed(2)} width={860} height={200} />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Run the review queue."
          line={`Trained on the first ${model.split.cut_hours} hours, tested on the last ${model.split.test_hours}. Pick how many alerts the team can check; click a transaction to see where it landed.`}
        />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Transaction" },
            { key: "amount", label: "Amount", align: "right", render: (r) => r.amount.toLocaleString("en-US") },
            { key: "score", label: "Score", align: "right", render: (r) => (r.score >= 0.9999 ? "> 0.9999" : r.score.toFixed(4)) },
            { key: "rank", label: "Queue position", align: "right", render: (r) => `#${r.rank.toLocaleString("en-US")}` },
            { key: "actual", label: "Truth", render: (r) => <Pill yes={r.actual === "Fraud"}>{r.actual}</Pill> },
          ]}
          note="Picked to show the full range: frauds at the top, middle and bottom of the queue, plus the highest-scoring false alarms."
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <FraudDemo selected={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`100 alerts, ${chosen.caught["100"]} of ${model.split.test_frauds} frauds.`}
          line="Every model scores a ROC-AUC above 0.95, which says little at 0.17% fraud. Precision-recall and frauds per alert tell the real story."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Precision–recall curves"
            takeaway={`Average precision: logistic ${chosen.ap.toFixed(2)}, random forest ${rf.ap.toFixed(2)}. Guessing would sit at ${(model.eval.base_rate * 100).toFixed(2)}%.`}
            legend={[
              { label: "Logistic (balanced)", color: INK, shape: "line" },
              { label: "Random forest", color: S2, shape: "line" },
              { label: "Hist boosting (balanced)", color: S1, shape: "line" },
            ]}
          >
            <LineChart
              series={[
                { name: "Logistic", color: INK, points: model.eval.pr["Logistic (class-balanced)"] as [number, number][] },
                { name: "Random forest", color: S2, points: model.eval.pr["Random Forest"] as [number, number][], dashed: true },
                { name: "Hist boosting", color: S1, points: model.eval.pr["Hist Gradient Boosting (balanced)"] as [number, number][] },
              ]}
              xDomain={[0, 1]}
              yDomain={[0, 1]}
              xFormat={(v) => v.toFixed(2)}
              yFormat={(v) => v.toFixed(1)}
              xLabel="Recall (share of frauds caught)"
              yLabel="Precision"
            />
          </ChartCard>
          <ChartCard
            title="Frauds caught at fixed review budgets"
            takeaway="What an operations manager actually asks: if we check N alerts, how many frauds do we stop?"
            legend={model.comparison.map((c, i) => ({ label: c.model, color: [INK, "#8a8a85", S2, S1][i], shape: "square" as const }))}
          >
            <DataTable
              data={{
                columns: ["Model", "Top 50", "Top 100", "Top 200", "Top 500"],
                rows: model.comparison.map((c) => [c.model, c.caught["50"], c.caught["100"], c.caught["200"], c.caught["500"]]),
              }}
            />
          </ChartCard>
          <ChartCard title="All models" takeaway={`The random forest edges the logistic model (${rf.caught["100"]} vs ${chosen.caught["100"]} in the top 100). The logistic model stays because it can explain each alert in the browser.`} className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Model", "Avg precision", "ROC-AUC", "Caught in top 100", "Caught in top 200"],
                rows: model.comparison.map((c) => [c.model, c.ap.toFixed(3), c.roc_auc.toFixed(3), `${c.caught["100"]}/${model.split.test_frauds}`, `${c.caught["200"]}/${model.split.test_frauds}`]),
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
