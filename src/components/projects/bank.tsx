"use client";

import { useState } from "react";
import model from "@/data/models/bank-churn.json";
import { BarChart, ChartCard, DataTable, Histogram, INK, LineChart, S1, S2 } from "../charts";
import { BankDemo, BudgetPlanner, type BankSample } from "../demos/bank-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

const columns: ColumnDoc[] = [
  { name: "RowNumber · CustomerId", type: "id", meaning: "Identifiers · not used" },
  { name: "Surname", type: "text", meaning: "Family name · never used or shown" },
  { name: "CreditScore", type: "number", meaning: "Credit score (350–850)", used: true },
  { name: "Geography", type: "category", meaning: "France, Germany or Spain", used: true },
  { name: "Gender", type: "category", meaning: "Left out (fairness)" },
  { name: "Age", type: "number", meaning: "Age in years; the model also gets age²", used: true },
  { name: "Tenure", type: "number", meaning: "Years with the bank (0–10)", used: true },
  { name: "Balance", type: "number", meaning: "Account balance; a zero-balance flag is added", used: true },
  { name: "NumOfProducts", type: "1–4", meaning: "Products held, treated as categories", used: true },
  { name: "HasCrCard", type: "yes/no", meaning: "Has a credit card · not used in the final model" },
  { name: "IsActiveMember", type: "yes/no", meaning: "Uses the bank actively", used: true },
  { name: "EstimatedSalary", type: "number", meaning: "Estimated yearly salary", used: true },
  { name: "Exited", type: "target", meaning: "Closed the account: the thing we predict", used: true },
];

const chosen = model.comparison.find((c) => c.model === model.chosen)!;
const raw = model.comparison.find((c) => c.model === "Logistic · raw columns")!;
const gb = model.comparison.find((c) => c.model === "Gradient Boosting")!;

export function BankBody() {
  const [sel, setSel] = useState<BankSample | null>(null);
  const prod = model.eda.by_products;
  const age = model.eda.by_age;
  const geo = model.eda.by_geography;
  const act = model.eda.by_active;
  const bal = model.eda.balance_hist;
  const peakAge = [...age].sort((a, b) => b.rate - a.rate)[0];

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${model.dataset.rows.toLocaleString("en-US")} bank customers, ${pct1(model.dataset.churn_rate)} left.`}
          line="One row per customer with their profile, their products and whether they closed the account."
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Copy used (GitHub mirror)"
          description="A widely used teaching dataset of customers from a European bank in France, Germany and Spain. It originally circulates on Kaggle; this rebuild uses a public GitHub copy so no login is needed."
          facts={[
            { label: "customers", value: model.dataset.rows.toLocaleString("en-US") },
            { label: "churn rate", value: pct1(model.dataset.churn_rate) },
            { label: "zero balance", value: pct(model.dataset.zero_balance_share) },
            { label: "countries", value: "3" },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Churn isn't a straight line." line="Products, age and country bend the risk in ways a raw linear model misses." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Churn rate by number of products"
            takeaway={`Two products: ${pct(prod[1].rate)}. Three: ${pct(prod[2].rate)}. Four: ${pct(prod[3].rate)} (only ${prod[3].n} customers). Not a trend: categories.`}
            table={{ columns: ["Products", "Churn rate", "Customers"], rows: prod.map((p) => [p.label, pct1(p.rate), p.n]) }}
          >
            <BarChart data={prod.map((p) => ({ label: `${p.label} product${p.label === "1" ? "" : "s"}`, value: p.rate, n: p.n }))} format={pct} />
          </ChartCard>
          <ChartCard
            title="Churn rate by age"
            takeaway={`Rises to ${pct(peakAge.rate)} at ${peakAge.label}, then drops for 61+. A curve, so the model also gets age².`}
            table={{ columns: ["Age", "Churn rate", "Customers"], rows: age.map((a) => [a.label, pct1(a.rate), a.n]) }}
          >
            <BarChart data={age.map((a) => ({ label: a.label, value: a.rate, n: a.n }))} format={pct} />
          </ChartCard>
          <ChartCard
            title="Churn rate by country"
            takeaway={`Germany churns at ${pct(geo.find((g) => g.label === "Germany")!.rate)}, about twice France and Spain.`}
            table={{ columns: ["Country", "Churn rate", "Customers"], rows: geo.map((g) => [g.label, pct1(g.rate), g.n]) }}
          >
            <BarChart data={geo.map((g) => ({ label: g.label, value: g.rate, n: g.n }))} format={pct} />
          </ChartCard>
          <ChartCard
            title="Balance: stayed vs left"
            takeaway={`${pct(bal.series.Stayed[0])} of customers who stayed hold a zero balance, vs ${pct(bal.series.Left[0])} of those who left. Leavers cluster at 100–140k.`}
            legend={[
              { label: "Stayed", color: S1, shape: "square" },
              { label: "Left", color: S2, shape: "square" },
            ]}
            table={{
              columns: ["Balance", "Stayed", "Left"],
              rows: bal.series.Stayed.map((v, i) => [`${bal.bins[i] / 1000}k–${bal.bins[i + 1] / 1000}k`, pct1(v), pct1(bal.series.Left[i])]),
            }}
          >
            <Histogram
              bins={bal.bins}
              series={[
                { name: "Stayed", color: S1, values: bal.series.Stayed },
                { name: "Left", color: S2, values: bal.series.Left },
              ]}
              format={pct}
              xFormat={(v) => `${v / 1000}k`}
            />
          </ChartCard>
          <ChartCard
            title="Active vs inactive members"
            takeaway={`Inactive members churn at ${pct(act.find((a) => a.label === "No")!.rate)}, active ones at ${pct(act.find((a) => a.label === "Yes")!.rate)}.`}
            table={{ columns: ["Active member", "Churn rate", "Customers"], rows: act.map((a) => [a.label, pct1(a.rate), a.n]) }}
          >
            <BarChart data={act.map((a) => ({ label: a.label === "Yes" ? "Active" : "Inactive", value: a.rate, n: a.n }))} format={pct} />
          </ChartCard>
          <ChartCard title="What the features add" takeaway={`Same logistic regression: AUC ${raw.roc_auc.toFixed(3)} on raw columns, ${chosen.roc_auc.toFixed(3)} with age², product categories and a zero-balance flag.`}>
            <BarChart
              data={model.comparison.map((c) => ({ label: c.model.replace("Logistic · ", "Logistic ").replace("engineered", "+ features").replace("raw columns", "raw"), value: c.roc_auc }))}
              max={1}
              format={(v) => v.toFixed(2)}
              highlight={(d) => d.label.includes("features")}
            />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle kicker="Try it" title="Score a customer, then plan the campaign." line="Load a real customer into the scorer, or skip to the budget slider below." />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Customer" },
            { key: "Geography", label: "Country" },
            { key: "Age", label: "Age", align: "right" },
            { key: "NumOfProducts", label: "Products", align: "right" },
            { key: "IsActiveMember", label: "Active", render: (r) => (r.IsActiveMember ? "Yes" : "No") },
            { key: "Balance", label: "Balance", align: "right", render: (r) => r.Balance.toLocaleString("en-US") },
            { key: "predicted", label: "Risk", align: "right", render: (r) => pct(r.predicted) },
            { key: "actual", label: "Outcome", render: (r) => <Pill yes={r.actual === "Left"}>{r.actual}</Pill> },
          ]}
        />
        <div className="mt-4 space-y-6 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <BankDemo key={sel?.id ?? "default"} preset={sel} />
          <BudgetPlanner />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`Call ${10}%, reach ${pct(chosen.top10)} of leavers.`}
          line={`Out-of-fold scores on all ${model.dataset.rows.toLocaleString("en-US")} customers. For a campaign, what matters is how well the top of the list is sorted, not the average.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Churn rate by risk decile"
            takeaway={`The riskiest tenth churns at ${pct(model.eval.lift[0].rate)}: ${model.eval.lift[0].lift.toFixed(1)}× the average. The safest tenth: ${pct(model.eval.lift[9].rate)}.`}
            table={{ columns: ["Decile", "Churn rate", "Lift"], rows: model.eval.lift.map((l) => [l.decile, pct1(l.rate), `${l.lift.toFixed(2)}×`]) }}
          >
            <BarChart data={model.eval.lift.map((l) => ({ label: `D${l.decile}`, value: l.rate }))} format={pct} highlight={(d) => d.label === "D1" || d.label === "D2"} />
          </ChartCard>
          <ChartCard
            title="ROC curve"
            takeaway={`Logistic + features ${chosen.roc_auc.toFixed(3)}, boosting ${gb.roc_auc.toFixed(3)}.`}
            legend={[
              { label: "Logistic + features", color: INK, shape: "line" },
              { label: "Gradient boosting", color: S2, shape: "line" },
            ]}
          >
            <LineChart
              series={[
                { name: "Logistic + features", color: INK, points: model.eval.roc[model.chosen as keyof typeof model.eval.roc] as [number, number][] },
                { name: "Gradient boosting", color: S2, points: model.eval.roc["Gradient Boosting"] as [number, number][], dashed: true },
              ]}
              xDomain={[0, 1]}
              yDomain={[0, 1]}
              diagonal
              xFormat={(v) => v.toFixed(2)}
              yFormat={(v) => v.toFixed(1)}
              xLabel="False positive rate"
              yLabel="True positive rate"
            />
          </ChartCard>
          <ChartCard title="All models" takeaway="Share of all churners reached when calling the top 10%, 20% or 30% of the list." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Model", "ROC-AUC", "Top 10%", "Top 20%", "Top 30%"],
                rows: model.comparison.map((c) => [c.model, c.roc_auc.toFixed(3), pct1(c.top10), pct1(c.top20), pct1(c.top30)]),
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
