"use client";

import { useState } from "react";
import model from "@/data/models/credit-risk.json";
import { BarChart, ChartCard, ConfusionMatrix, DotStrip, Histogram, INK, LineChart, S1, S2 } from "../charts";
import { CREDIT_ORDER, CreditDemo, type CreditSample } from "../demos/credit-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const used = new Set(model.dataset.features_used);
const SENSITIVE = new Set(["personal_status_sex", "age", "foreign_worker"]);

const columns: ColumnDoc[] = [
  ["checking", "category", "Balance of the current account (DM)"],
  ["duration", "number", "Loan length in months"],
  ["history", "category", "How past credits were repaid"],
  ["purpose", "category", "What the loan is for"],
  ["amount", "number", "Loan amount (Deutsche Mark)"],
  ["savings", "category", "Savings account or bonds"],
  ["employment", "category", "Years at the current job"],
  ["installment_rate", "number", "Installment as % of disposable income (1–4)"],
  ["personal_status_sex", "category", "Sex and marital status · left out (fairness)"],
  ["other_debtors", "category", "Co-applicant or guarantor"],
  ["residence_since", "number", "Years at the current address"],
  ["property", "category", "Most valuable property"],
  ["age", "number", "Age in years · left out (fairness)"],
  ["other_plans", "category", "Other installment plans (bank, stores)"],
  ["housing", "category", "Rent, own or live for free"],
  ["existing_credits", "number", "Credits already at this bank"],
  ["job", "category", "Skill level of the job"],
  ["dependents", "number", "People the applicant supports"],
  ["telephone", "yes/no", "Registered phone line"],
  ["foreign_worker", "yes/no", "Foreign worker · left out (fairness)"],
  ["target", "target", "Repaid (1) or defaulted (2): the thing we predict"],
].map(([name, type, meaning]) => ({ name, type, meaning, used: used.has(name) || name === "target" }));

const ordered = (rows: { label: string; rate: number; n: number }[], key: string) => {
  const order = CREDIT_ORDER[key];
  return order ? order.map((o) => rows.find((r) => r.label === o)!).filter(Boolean) : rows;
};

const ev = model.eval;
const saving = 1 - ev.at_bayes.cost / ev.at_half.cost;

export function CreditBody() {
  const [sel, setSel] = useState<CreditSample | null>(null);
  const checking = ordered(model.eda.default_by_checking, "checking");
  const history = ordered(model.eda.default_by_history, "history");
  const dur = model.eda.default_by_duration;
  const amt = model.eda.amount_hist;
  const neg = checking.find((c) => c.label === "< 0 DM")!;
  const none = checking.find((c) => c.label === "No account")!;
  const lr = model.comparison.find((c) => c.model === "Logistic Regression")!;
  const best = [...model.comparison].sort((a, b) => b.roc_auc_mean - a.roc_auc_mean)[0];

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${model.dataset.rows.toLocaleString("en-US")} loans, ${model.dataset.raw_cols - 1} attributes.`}
          line="Every column arrives as a code (A11, A34…). Step one was turning codes back into words."
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset on UCI"
          description="Loan applications from a German bank, published by Prof. Hans Hofmann on the UCI repository. It ships with its own cost matrix: approving a bad borrower costs 5, declining a good one costs 1."
          facts={[
            { label: "applications", value: model.dataset.rows.toLocaleString("en-US") },
            { label: "default rate", value: pct1(model.dataset.default_rate) },
            { label: "features used", value: String(model.dataset.features_used.length) },
            { label: "left out (fairness)", value: String([...SENSITIVE].length) },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="The account says a lot." line="Default rate cut four ways. Hover the bars, or flip any chart to a table." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Default rate by checking account"
            takeaway={`Overdrawn accounts default at ${pct(neg.rate)}; applicants without a checking account at ${pct(none.rate)}.`}
            table={{ columns: ["Checking", "Default rate", "Loans"], rows: checking.map((c) => [c.label, pct1(c.rate), c.n]) }}
          >
            <BarChart data={checking.map((c) => ({ label: c.label, value: c.rate, n: c.n }))} format={pct} />
          </ChartCard>
          <ChartCard
            title="Default rate by loan duration"
            takeaway={`Rises from ${pct(dur[0].rate)} for loans up to a year to ${pct(dur[dur.length - 1].rate)} beyond three years.`}
            table={{ columns: ["Duration (months)", "Default rate", "Loans"], rows: dur.map((c) => [c.label, pct1(c.rate), c.n]) }}
          >
            <BarChart data={dur.map((c) => ({ label: c.label, value: c.rate, n: c.n }))} format={pct} />
          </ChartCard>
          <ChartCard
            title="Default rate by credit history"
            takeaway={`Counter-intuitive: “critical” histories default least (${pct(history.find((h) => h.label.startsWith("Critical"))!.rate)}), “no credits / all repaid” most (${pct(history.find((h) => h.label.startsWith("No credits"))!.rate)}). Likely how the loans were sampled: a reason to question data, not trust it.`}
            table={{ columns: ["History", "Default rate", "Loans"], rows: history.map((c) => [c.label, pct1(c.rate), c.n]) }}
          >
            <BarChart data={history.map((c) => ({ label: c.label.split(" / ")[0].replace("Existing credits on time", "On time"), value: c.rate, n: c.n }))} format={pct} />
          </ChartCard>
          <ChartCard
            title="Loan amount: repaid vs defaulted"
            takeaway={`Above 6,000 DM: ${pct(amt.series.Defaulted.reduce((a, v, i) => (amt.bins[i] >= 6000 ? a + v : a), 0))} of defaulted loans vs ${pct(amt.series.Repaid.reduce((a, v, i) => (amt.bins[i] >= 6000 ? a + v : a), 0))} of repaid ones.`}
            legend={[
              { label: "Repaid", color: S1, shape: "square" },
              { label: "Defaulted", color: S2, shape: "square" },
            ]}
            table={{
              columns: ["Amount (DM)", "Repaid", "Defaulted"],
              rows: amt.series.Repaid.map((v, i) => [`${amt.bins[i].toLocaleString("en-US")}–${amt.bins[i + 1].toLocaleString("en-US")}`, pct1(v), pct1(amt.series.Defaulted[i])]),
            }}
          >
            <Histogram
              bins={amt.bins}
              series={[
                { name: "Repaid", color: S1, values: amt.series.Repaid },
                { name: "Defaulted", color: S2, values: amt.series.Defaulted },
              ]}
              format={pct}
              xFormat={(v) => `${v / 1000}k`}
            />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Load an application, then decide."
          line="Five applications that defaulted, five that repaid. Scores in the table come from models that never saw that loan."
        />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Loan" },
            { key: "duration", label: "Months", align: "right" },
            { key: "amount", label: "Amount DM", align: "right", render: (r) => r.amount.toLocaleString("en-US") },
            { key: "checking", label: "Checking" },
            { key: "purpose", label: "Purpose" },
            { key: "savings", label: "Savings" },
            { key: "predicted", label: "Default risk", align: "right", render: (r) => pct(r.predicted) },
            { key: "actual", label: "Outcome", render: (r) => <Pill yes={r.actual === "Defaulted"}>{r.actual}</Pill> },
          ]}
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <CreditDemo key={sel?.id ?? "default"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`Same model, ${pct(saving)} lower cost.`}
          line="Ranking quality is similar across models. The real win comes from choosing the threshold the costs call for."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Total cost by decision threshold"
            takeaway={`At 50% the errors cost ${ev.at_half.cost}. At 1/6, where 5 × risk equals 1 × (1 − risk), they cost ${ev.at_bayes.cost}.`}
            table={{ columns: ["Threshold", "Total cost", "Approved then defaulted", "Declined but good"], rows: ev.cost_curve.map((c) => [c.t.toFixed(2), c.cost, c.approved_bad, c.declined_good]) }}
            className="md:col-span-2"
          >
            <LineChart
              series={[{ name: "Total cost", color: INK, points: ev.cost_curve.map((c) => [c.t, c.cost] as [number, number]) }]}
              xDomain={[0.05, 0.95]}
              yDomain={[0, Math.ceil(Math.max(...ev.cost_curve.map((c) => c.cost)) / 250) * 250]}
              xTicks={[0.1, 0.3, 0.5, 0.7, 0.9]}
              xFormat={(v) => v.toFixed(2)}
              markers
              vline={{ at: model.costs.bayes_threshold, label: "1/6 (chosen)" }}
              xLabel="Decline when risk ≥ threshold"
              height={240}
              width={860}
            />
          </ChartCard>
          <ChartCard title="Errors at a naive 50% threshold" takeaway={`${ev.at_half.approved_bad} bad loans approved (×${model.costs.approve_bad}), ${ev.at_half.declined_good} good ones declined (×${model.costs.decline_good}).`}>
            <ConfusionMatrix {...ev.confusion_half} positive="Default" negative="Repay" />
          </ChartCard>
          <ChartCard title="Errors at the cost-aware 1/6 threshold" takeaway={`Only ${ev.at_bayes.approved_bad} bad loans slip through, but ${ev.at_bayes.declined_good} good ones are declined.`}>
            <ConfusionMatrix {...ev.confusion_bayes} positive="Default" negative="Repay" />
          </ChartCard>
          <ChartCard
            title="ROC-AUC on every fold"
            takeaway={`25 folds each. Best mean: ${best.model.toLowerCase()} ${best.roc_auc_mean.toFixed(3)}; logistic ${lr.roc_auc_mean.toFixed(3)}, well inside the spread.`}
            legend={[
              { label: "Logistic regression", color: INK },
              { label: "Random forest", color: S2 },
              { label: "Gradient boosting", color: S1 },
            ]}
            className="md:col-span-2"
          >
            <DotStrip
              groups={[
                { name: "Logistic regression", color: INK, values: ev.folds["Logistic Regression"] },
                { name: "Random forest", color: S2, values: ev.folds["Random Forest"] },
                { name: "Gradient boosting", color: S1, values: ev.folds["Gradient Boosting"] },
              ]}
              domain={[0.6, 0.95]}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
