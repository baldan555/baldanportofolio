"use client";

import { useState } from "react";
import model from "@/data/models/heart-failure.json";
import { BarChart, ChartCard, ConfusionMatrix, DotStrip, Histogram, INK, LineChart, S1, S2 } from "../charts";
import { Drivers } from "../demos/controls";
import { HeartDemo, type HeartSample } from "../demos/heart-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const used = new Set(model.dataset.features_used);

const columns: ColumnDoc[] = [
  ["age", "number", "Age of the patient (years)"],
  ["anaemia", "yes/no", "Low red blood cells or haemoglobin"],
  ["creatinine_phosphokinase", "number", "CPK enzyme level in the blood (mcg/L)"],
  ["diabetes", "yes/no", "Patient has diabetes"],
  ["ejection_fraction", "number (%)", "Share of blood leaving the heart at each beat"],
  ["high_blood_pressure", "yes/no", "Patient has hypertension"],
  ["platelets", "number", "Platelets in the blood (kiloplatelets/mL)"],
  ["serum_creatinine", "number", "Creatinine in the blood (mg/dL), a kidney marker"],
  ["serum_sodium", "number", "Sodium in the blood (mEq/L)"],
  ["sex", "category", "Woman or man"],
  ["smoking", "yes/no", "Patient smokes"],
  ["time", "number", "Follow-up period in days. Removed: it leaks the outcome"],
  ["DEATH_EVENT", "target", "Patient died during the follow-up: the thing we predict"],
].map(([name, type, meaning]) => ({ name, type, meaning, used: used.has(name) || name === "DEATH_EVENT" }));

// shares computed from the exported histograms (no hand-typed numbers)
const shareBelow = (h: { bins: number[]; series: Record<string, number[]> }, group: string, edge: number) =>
  h.series[group].reduce((a, v, i) => (h.bins[i + 1] <= edge ? a + v : a), 0);
const shareAbove = (h: { bins: number[]; series: Record<string, number[]> }, group: string, edge: number) =>
  h.series[group].reduce((a, v, i) => (h.bins[i] >= edge ? a + v : a), 0);

const coefItems = [
  ...Object.entries(model.model.numeric).map(([f, p]) => ({ feature: `${f} (+1 std)`, value: "", effect: p.coef })),
  ...Object.entries(model.model.categorical).map(([f, cats]) => ({ feature: `${f}: Yes`, value: "", effect: cats.Yes - cats.No })),
].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));

export function HeartBody() {
  const [sel, setSel] = useState<HeartSample | null>(null);
  const ef = model.eda.ef_hist;
  const cr = model.eda.creatinine_hist;
  const age = model.eda.event_by_age;
  const oof = model.eval.oof_metrics;
  const lr = model.comparison.find((c) => c.model === "Logistic Regression")!;
  const rf = model.comparison.find((c) => c.model === "Random Forest")!;

  return (
    <>
      <Section id="data">
        <SectionTitle kicker="The data" title={`${model.dataset.rows} patients, ${model.dataset.raw_cols} measurements.`} line="Small, real and messy enough to punish over-confident models." />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset on UCI"
          description="Medical records of heart-failure patients collected at the Faisalabad Institute of Cardiology (Pakistan) in 2015, published on the UCI Machine Learning Repository."
          facts={[
            { label: "patients", value: String(model.dataset.rows) },
            { label: "columns", value: String(model.dataset.raw_cols) },
            { label: "event rate", value: pct1(model.dataset.event_rate) },
            { label: "features used", value: String(model.dataset.features_used.length) },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Two markers do a lot of the work." line="Ejection fraction and serum creatinine show the clearest gap between the two groups." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Ejection fraction by outcome"
            takeaway={`${pct(shareBelow(ef, "Died", 30))} of patients who died had a fraction under 30%, vs ${pct(shareBelow(ef, "Survived", 30))} of survivors.`}
            legend={[
              { label: "Survived", color: S1, shape: "square" },
              { label: "Died", color: S2, shape: "square" },
            ]}
            table={{ columns: ["Ejection fraction", "Survived", "Died"], rows: ef.series.Survived.map((v, i) => [`${ef.bins[i]}–${ef.bins[i + 1]}%`, pct1(v), pct1(ef.series.Died[i])]) }}
          >
            <Histogram
              bins={ef.bins}
              series={[
                { name: "Survived", color: S1, values: ef.series.Survived },
                { name: "Died", color: S2, values: ef.series.Died },
              ]}
              format={pct}
              xFormat={(v) => `${v}%`}
            />
          </ChartCard>
          <ChartCard
            title="Serum creatinine by outcome"
            takeaway={`Above 1.5 mg/dL: ${pct(shareAbove(cr, "Died", 1.5))} of patients who died vs ${pct(shareAbove(cr, "Survived", 1.5))} of survivors.`}
            legend={[
              { label: "Survived", color: S1, shape: "square" },
              { label: "Died", color: S2, shape: "square" },
            ]}
            table={{ columns: ["Serum creatinine", "Survived", "Died"], rows: cr.series.Survived.map((v, i) => [`${cr.bins[i]}–${cr.bins[i + 1]}`, pct1(v), pct1(cr.series.Died[i])]) }}
          >
            <Histogram
              bins={cr.bins}
              series={[
                { name: "Survived", color: S1, values: cr.series.Survived },
                { name: "Died", color: S2, values: cr.series.Died },
              ]}
              format={pct}
              xFormat={(v) => v.toFixed(1)}
            />
          </ChartCard>
          <ChartCard
            title="Event rate by age"
            takeaway={`Rises from about ${pct(age[0].rate)} in the 40s to ${pct(age[age.length - 1].rate)} above 80 (only ${age[age.length - 1].n} patients there).`}
            table={{ columns: ["Age", "Event rate", "Patients"], rows: age.map((a) => [a.label, pct1(a.rate), a.n]) }}
          >
            <BarChart data={age.map((a) => ({ label: a.label, value: a.rate, n: a.n }))} format={pct} />
          </ChartCard>
          <ChartCard title="What the model leans on" takeaway="Coefficients of the final model: orange raises risk, blue lowers it.">
            <Drivers items={coefItems} labels={{}} max={6} />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle kicker="Try it" title="Load a patient, move the markers." line="Five patients who died and five who survived. Scores in the table come from models that never saw that patient." />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Patient" },
            { key: "age", label: "Age", align: "right" },
            { key: "ejection_fraction", label: "EF %", align: "right" },
            { key: "serum_creatinine", label: "Creatinine", align: "right" },
            { key: "serum_sodium", label: "Sodium", align: "right" },
            { key: "high_blood_pressure", label: "High BP" },
            { key: "anaemia", label: "Anaemia" },
            { key: "predicted", label: "Unseen-model risk", align: "right", render: (r) => pct(r.predicted) },
            { key: "actual", label: "Death event", render: (r) => <Pill yes={r.actual === "Yes"}>{r.actual}</Pill> },
          ]}
          note="Educational use only. Not medical advice."
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <HeartDemo key={sel?.id ?? "default"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle kicker="How well it works" title="50 folds, not one lucky split." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="ROC-AUC on every fold"
            takeaway={`Each dot is one of 50 folds. Means: logistic ${lr.roc_auc_mean.toFixed(3)}, random forest ${rf.roc_auc_mean.toFixed(3)}. The spread is the real story.`}
            legend={[
              { label: "Logistic regression", color: INK },
              { label: "Random forest", color: S2 },
            ]}
            className="md:col-span-2"
          >
            <DotStrip
              groups={[
                { name: "Logistic regression", color: INK, values: model.eval.folds["Logistic Regression"] },
                { name: "Random forest", color: S2, values: model.eval.folds["Random Forest"] },
              ]}
              domain={[0.5, 1]}
              format={(v) => v.toFixed(2)}
            />
          </ChartCard>
          <ChartCard title="ROC curve (out-of-fold)" takeaway={`Every patient scored by a model that never saw them: AUC ${oof.roc_auc.toFixed(3)}.`}>
            <LineChart
              series={[{ name: "Logistic regression", color: INK, points: model.eval.roc_oof as [number, number][] }]}
              xDomain={[0, 1]}
              yDomain={[0, 1]}
              diagonal
              xFormat={(v) => v.toFixed(2)}
              yFormat={(v) => v.toFixed(1)}
              xLabel="False positive rate"
              yLabel="True positive rate"
            />
          </ChartCard>
          <ChartCard title="Confusion matrix (out-of-fold, 50% threshold)" takeaway={`Recall ${pct(oof.recall)}, precision ${pct(oof.precision)}. A screening tool would lower the threshold.`}>
            <ConfusionMatrix {...oof.confusion} positive="Event" negative="Survive" />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
