"use client";

import { useState } from "react";
import model from "@/data/models/telco-churn.json";
import { BarChart, ChartCard, ConfusionMatrix, Histogram, INK, LineChart, S1, S2 } from "../charts";
import { Drivers } from "../demos/controls";
import { ChurnDemo, type TelcoSample } from "../demos/churn-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const used = new Set(model.dataset.features_used);

const columns: ColumnDoc[] = [
  ["customerID", "id", "Unique customer code"],
  ["gender", "category", "Male / Female"],
  ["SeniorCitizen", "yes/no", "Customer is 65 or older"],
  ["Partner", "yes/no", "Has a partner"],
  ["Dependents", "yes/no", "Has dependents"],
  ["tenure", "number", "Months the customer has stayed"],
  ["PhoneService", "yes/no", "Has a phone line"],
  ["MultipleLines", "category", "More than one phone line"],
  ["InternetService", "category", "DSL, fiber optic or none"],
  ["OnlineSecurity", "category", "Online security add-on"],
  ["OnlineBackup", "category", "Online backup add-on"],
  ["DeviceProtection", "category", "Device protection add-on"],
  ["TechSupport", "category", "Tech support add-on"],
  ["StreamingTV", "category", "Streams TV"],
  ["StreamingMovies", "category", "Streams movies"],
  ["Contract", "category", "Month-to-month, one year or two year"],
  ["PaperlessBilling", "yes/no", "Gets bills by email"],
  ["PaymentMethod", "category", "How the bill is paid"],
  ["MonthlyCharges", "number ($)", "Current monthly bill"],
  ["TotalCharges", "number ($)", "Total billed so far (11 blanks removed)"],
  ["Churn", "target", "Left in the last month: the thing we predict"],
].map(([name, type, meaning]) => ({ name, type, meaning, used: used.has(name) || name === "Churn" }));

const contract = model.eda.churn_by_contract;
const m2m = contract.find((c) => c.label === "Month-to-month")!;
const two = contract.find((c) => c.label === "Two year")!;
const fiber = model.eda.churn_by_internet.find((c) => c.label === "Fiber optic")!;
const ten = model.eda.churn_by_tenure;
const echeck = model.eda.churn_by_payment.find((c) => c.label === "Electronic check")!;

// coefficient view for "what moves churn most"
const coefItems = [
  ...Object.entries(model.model.numeric).map(([f, p]) => ({ feature: `${f} (+1 std)`, value: "", effect: p.coef })),
  ...Object.entries(model.model.categorical).flatMap(([f, cats]) => Object.entries(cats).map(([c, v]) => ({ feature: `${f}: ${c}`, value: "", effect: v }))),
].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));

export function TelcoBody() {
  const [sel, setSel] = useState<TelcoSample | null>(null);
  const cm = model.metrics.confusion;
  const lrRoc = model.eval.roc["Logistic Regression"] as [number, number][];
  const gbRoc = model.eval.roc["Gradient Boosting"] as [number, number][];
  const gbAuc = model.comparison.find((c) => c.model === "Gradient Boosting")!.roc_auc;

  return (
    <>
      {/* ---------- data ---------- */}
      <Section id="data">
        <SectionTitle kicker="The data" title="One row per customer." line="Services, billing and one simple question: did they leave last month?" />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset on GitHub (IBM)"
          description="A sample customer table IBM publishes for churn modelling: what each customer subscribes to, how they pay, and whether they churned."
          facts={[
            { label: "rows", value: model.dataset.raw_rows.toLocaleString("en-US") },
            { label: "columns", value: String(model.dataset.raw_cols) },
            { label: "churn rate", value: pct1(model.dataset.churn_rate) },
            { label: "features used", value: String(model.dataset.features_used.length) },
          ]}
          columns={columns}
        />
      </Section>

      {/* ---------- EDA ---------- */}
      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Where churn hides." line="Four cuts of the data before any model. Hover the bars, or switch any chart to a table." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Churn rate by contract"
            takeaway={`Month-to-month churns at ${pct(m2m.rate)}; two-year at ${pct(two.rate)}.`}
            table={{ columns: ["Contract", "Churn rate", "Customers"], rows: contract.map((c) => [c.label, pct1(c.rate), c.n]) }}
          >
            <BarChart data={contract.map((c) => ({ label: c.label, value: c.rate, n: c.n }))} format={pct} />
          </ChartCard>
          <ChartCard
            title="Churn rate by months with the company"
            takeaway={`New customers (0–6 months) churn at ${pct(ten[0].rate)}; after 4 years only ${pct(ten[ten.length - 1].rate)}.`}
            table={{ columns: ["Tenure (months)", "Churn rate", "Customers"], rows: ten.map((c) => [c.label, pct1(c.rate), c.n]) }}
          >
            <BarChart data={ten.map((c) => ({ label: c.label, value: c.rate, n: c.n }))} format={pct} />
          </ChartCard>
          <ChartCard
            title="Monthly bill: who stays vs who leaves"
            takeaway="Share of each group per $10 band. Churners skew to higher bills."
            legend={[
              { label: "Stayed", color: S1, shape: "square" },
              { label: "Churned", color: S2, shape: "square" },
            ]}
            table={{
              columns: ["Monthly bill", "Stayed", "Churned"],
              rows: model.eda.monthly_hist.series.Stayed.map((v, i) => [
                `$${model.eda.monthly_hist.bins[i]}–${model.eda.monthly_hist.bins[i + 1]}`,
                pct1(v),
                pct1(model.eda.monthly_hist.series.Churned[i]),
              ]),
            }}
          >
            <Histogram
              bins={model.eda.monthly_hist.bins}
              series={[
                { name: "Stayed", color: S1, values: model.eda.monthly_hist.series.Stayed },
                { name: "Churned", color: S2, values: model.eda.monthly_hist.series.Churned },
              ]}
              format={pct}
              xFormat={(v) => `$${v}`}
            />
          </ChartCard>
          <ChartCard
            title="Churn rate by payment method"
            takeaway={`Electronic check stands out at ${pct(echeck.rate)}; fiber internet churns at ${pct(fiber.rate)}.`}
            table={{ columns: ["Payment", "Churn rate", "Customers"], rows: model.eda.churn_by_payment.map((c) => [c.label, pct1(c.rate), c.n]) }}
          >
            <BarChart
              data={model.eda.churn_by_payment.map((c) => ({ label: c.label.replace(" (automatic)", ""), value: c.rate, n: c.n }))}
              format={pct}
            />
          </ChartCard>
        </div>
      </Section>

      {/* ---------- try it ---------- */}
      <Section id="try">
        <SectionTitle kicker="Try it" title="Load a real customer, then change them." line="These ten customers come from the test set, so the model never saw them during training." />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Customer" },
            { key: "tenure", label: "Months", align: "right" },
            { key: "MonthlyCharges", label: "Bill $", align: "right" },
            { key: "Contract", label: "Contract" },
            { key: "InternetService", label: "Internet" },
            { key: "PaymentMethod", label: "Payment", render: (r) => r.PaymentMethod.replace(" (automatic)", "") },
            { key: "predicted", label: "Model says", align: "right", render: (r) => pct(r.predicted) },
            { key: "actual", label: "Really churned", render: (r) => <Pill yes={r.actual === "Yes"}>{r.actual}</Pill> },
          ]}
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <ChurnDemo key={sel?.id ?? "default"} preset={sel} />
        </div>
      </Section>

      {/* ---------- evaluation ---------- */}
      <Section id="results">
        <SectionTitle kicker="How well it works" title={`Measured on ${model.split.test.toLocaleString("en-US")} unseen customers.`} />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="ROC curve"
            takeaway={`Logistic regression ${model.metrics.roc_auc.toFixed(3)} vs boosting ${gbAuc.toFixed(3)}. The dashed line is guessing.`}
            legend={[
              { label: `Logistic regression (${model.metrics.roc_auc.toFixed(3)})`, color: INK, shape: "line" },
              { label: `Gradient boosting (${gbAuc.toFixed(3)})`, color: S2, shape: "line" },
            ]}
          >
            <LineChart
              series={[
                { name: "Logistic regression", color: INK, points: lrRoc },
                { name: "Gradient boosting", color: S2, points: gbRoc, dashed: true },
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
          <ChartCard title="Confusion matrix at a 50% threshold" takeaway={`Catches ${cm.tp} of ${cm.tp + cm.fn} churners, with ${cm.fp} false alarms.`}>
            <ConfusionMatrix {...cm} positive="Churn" negative="Stay" />
          </ChartCard>
          <ChartCard
            title="Precision vs recall by threshold"
            takeaway="Lower the threshold to catch more churners, at the cost of more false alarms."
            legend={[
              { label: "Recall (churners caught)", color: S1, shape: "line" },
              { label: "Precision (alerts that are right)", color: S2, shape: "line" },
            ]}
            table={{ columns: ["Threshold", "Precision", "Recall"], rows: model.eval.thresholds.map((t) => [t.t.toFixed(2), pct1(t.precision), pct1(t.recall)]) }}
          >
            <LineChart
              series={[
                { name: "Recall", color: S1, points: model.eval.thresholds.map((t) => [t.t, t.recall] as [number, number]) },
                { name: "Precision", color: S2, points: model.eval.thresholds.map((t) => [t.t, t.precision] as [number, number]) },
              ]}
              xDomain={[0.1, 0.9]}
              yDomain={[0, 1]}
              xTicks={[0.1, 0.3, 0.5, 0.7, 0.9]}
              xFormat={(v) => v.toFixed(2)}
              yFormat={pct}
              vline={{ at: 0.5, label: "used" }}
              xLabel="Decision threshold"
            />
          </ChartCard>
          <ChartCard title="What moves churn most" takeaway="Model coefficients: orange pushes towards leaving, blue keeps the customer.">
            <Drivers items={coefItems} labels={{}} max={8} />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}

export function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto mt-24 max-w-[1240px] scroll-mt-24 px-5 md:px-10">
      {children}
    </section>
  );
}

export function DemoHeader() {
  return (
    <div className="mb-5 flex items-center justify-between px-1">
      <p className="flex items-center gap-2 font-mono text-[12px] tracking-[0.16em] uppercase">
        <span className="relative flex h-1.5 w-1.5 text-live">
          <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
        </span>
        Live demo
      </p>
      <p className="font-hand text-[20px] text-ink-2/70">runs in your browser</p>
    </div>
  );
}
