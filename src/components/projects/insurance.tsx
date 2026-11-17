"use client";

import { useState } from "react";
import model from "@/data/models/insurance-fraud.json";
import { BarChart, ChartCard, ConfusionMatrix, DataTable, Histogram, INK, LineChart, S1, S2 } from "../charts";
import { describeSplit, InsuranceDemo, type ClaimSample } from "../demos/insurance-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

const columns: ColumnDoc[] = [
  { name: "months_as_customer", type: "number", meaning: "How long the customer has held a policy", used: true },
  { name: "age · insured_sex · insured_zip", type: "profile", meaning: "Left out (fairness)" },
  { name: "insured_education_level · insured_occupation · insured_relationship", type: "profile", meaning: "Left out (fairness)" },
  { name: "insured_hobbies", type: "profile", meaning: "Left out: a suspiciously strong artifact, tested separately below" },
  { name: "policy_number · policy_bind_date · policy_state", type: "policy", meaning: "Identifiers and dates · not used" },
  { name: "policy_csl · policy_deductable · policy_annual_premium", type: "policy", meaning: "Coverage terms · not used in the final model" },
  { name: "umbrella_limit", type: "number", meaning: "Extra liability cover (one row has an impossible −1,000,000)", used: true },
  { name: "incident_type · collision_type", type: "category", meaning: "What happened ('?' kept as Unknown)", used: true },
  { name: "incident_severity", type: "category", meaning: "Trivial, minor, major damage or total loss", used: true },
  { name: "authorities_contacted", type: "category", meaning: "Police, fire, ambulance, other or none", used: true },
  { name: "incident_state · city · location · hour", type: "where/when", meaning: "Not used" },
  { name: "number_of_vehicles_involved · bodily_injuries · witnesses", type: "number", meaning: "Incident facts", used: true },
  { name: "property_damage · police_report_available", type: "yes/no/?", meaning: "'?' kept as Unknown", used: true },
  { name: "injury_claim · property_claim · vehicle_claim", type: "number ($)", meaning: "Claim amounts (total_claim_amount is their sum, so not used)", used: true },
  { name: "auto_make · auto_model · auto_year", type: "vehicle", meaning: "Not used" },
  { name: "fraud_reported", type: "target", meaning: "Y / N: the thing we predict", used: true },
];

const by = (feats: string, name: string) => model.comparison.find((c) => c.features === feats && c.model === name)!;
const lr = by("claim facts", "Logistic Regression");
const sevOnly = by("one column", "Severity only");
const lrHob = by("+ hobbies", "Logistic Regression");

// leaf rules from the depth-3 tree
type Split = { kind: string; col: string; value?: string; t?: number };
function leafRules() {
  const nodes = model.tree.nodes;
  const out: { rule: string[]; p: number; n: number }[] = [];
  const walk = (i: number, rule: string[]) => {
    const nd = nodes[i];
    if (nd.l === -1) return out.push({ rule, p: nd.p, n: nd.n });
    const s = nd.split as Split;
    walk(nd.l, [...rule, describeSplit(s, false)]);
    walk(nd.r, [...rule, describeSplit(s, true)]);
  };
  walk(0, []);
  return out.sort((a, b) => b.p - a.p);
}

export function InsuranceBody() {
  const [sel, setSel] = useState<ClaimSample | null>(null);
  const sev = model.eda.by_severity;
  const major = sev.find((s) => s.label === "Major Damage")!;
  const auth = model.eda.by_authorities;
  const police = model.eda.by_police_report;
  const hobbies = model.eda.by_hobby;
  const hist = model.eda.claim_hist;
  const cm = model.eval.confusion;
  const top20 = model.eval.gains[19].captured;
  const rules = leafRules();

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${model.dataset.rows.toLocaleString("en-US")} auto claims, ${pct(model.dataset.fraud_rate)} flagged as fraud.`}
          line={`${model.dataset.raw_cols} columns about the policy, the person, the incident and the money. Most of them shouldn't go near a fraud model.`}
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset on Mendeley Data"
          description="Auto-insurance claims from three US states with a fraud label, published on Mendeley Data under CC BY 4.0 and widely mirrored on GitHub."
          facts={[
            { label: "claims", value: model.dataset.rows.toLocaleString("en-US") },
            { label: "fraud rate", value: pct1(model.dataset.fraud_rate) },
            { label: "features used", value: String(model.dataset.features_used.length) },
            { label: "columns left out", value: String(model.dataset.raw_cols - model.dataset.features_used.length - 1) },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="One field shouts. One field lies." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Fraud rate by incident severity"
            takeaway={`“Major damage” claims are ${pct(major.rate)} fraud. Every other level sits between ${pct(Math.min(...sev.filter((s) => s !== major).map((s) => s.rate)))} and ${pct(Math.max(...sev.filter((s) => s !== major).map((s) => s.rate)))}.`}
            table={{ columns: ["Severity", "Fraud rate", "Claims"], rows: sev.map((s) => [s.label, pct1(s.rate), s.n]) }}
          >
            <BarChart data={sev.map((s) => ({ label: s.label.replace(" Damage", ""), value: s.rate, n: s.n }))} format={pct} highlight={(d) => d.label === "Major"} />
          </ChartCard>
          <ChartCard
            title="Fraud rate by insured's hobby (not used)"
            takeaway={`Chess ${pct(hobbies[0].rate)}, cross-fit ${pct(hobbies[1].rate)}, everything else under ${pct(hobbies[2].rate + 0.01)}. Too strong to be real: almost certainly an artifact of how the data was made.`}
            table={{ columns: ["Hobby", "Fraud rate", "Claims"], rows: hobbies.map((h) => [h.label, pct1(h.rate), h.n]) }}
          >
            <BarChart data={hobbies.slice(0, 8).map((h) => ({ label: h.label, value: h.rate, n: h.n }))} format={pct} highlight={(d) => d.label === "chess" || d.label === "cross-fit"} />
          </ChartCard>
          <ChartCard
            title="Fraud rate by authorities contacted"
            takeaway={`When nobody was called, only ${pct(auth.find((a) => a.label === "None")!.rate)} are fraud.`}
            table={{ columns: ["Authorities", "Fraud rate", "Claims"], rows: auth.map((a) => [a.label, pct1(a.rate), a.n]) }}
          >
            <BarChart data={auth.map((a) => ({ label: a.label, value: a.rate, n: a.n }))} format={pct} />
          </ChartCard>
          <ChartCard
            title="Police report available?"
            takeaway={`Barely matters: ${police.map((p) => pct(p.rate)).join(", ")} across no / unknown / yes.`}
            table={{ columns: ["Police report", "Fraud rate", "Claims"], rows: police.map((p) => [p.label, pct1(p.rate), p.n]) }}
          >
            <BarChart data={police.map((p) => ({ label: p.label === "NO" ? "No" : p.label === "YES" ? "Yes" : "Unknown", value: p.rate, n: p.n }))} format={pct} max={0.5} />
          </ChartCard>
          <ChartCard
            title="Total claim amount: legit vs fraud"
            takeaway={`Below $10k: ${pct(hist.series.Legit[0])} of legit claims vs ${pct(hist.series.Fraud[0])} of fraud. Fraud leans to 50–80k.`}
            legend={[
              { label: "Legit", color: S1, shape: "square" },
              { label: "Fraud", color: S2, shape: "square" },
            ]}
            table={{ columns: ["Total claim", "Legit", "Fraud"], rows: hist.series.Legit.map((v, i) => [`$${hist.bins[i] / 1000}k–${hist.bins[i + 1] / 1000}k`, pct1(v), pct1(hist.series.Fraud[i])]) }}
            className="md:col-span-2"
          >
            <Histogram
              bins={hist.bins}
              series={[
                { name: "Legit", color: S1, values: hist.series.Legit },
                { name: "Fraud", color: S2, values: hist.series.Fraud },
              ]}
              format={pct}
              xFormat={(v) => `$${v / 1000}k`}
              width={860}
              height={200}
            />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle kicker="Try it" title="Load a claim, then argue with the model." line="Five fraud and five legitimate claims. Scores in the table come from models that never saw the claim." />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Claim" },
            { key: "incident_severity", label: "Severity" },
            { key: "incident_type", label: "Type" },
            { key: "authorities_contacted", label: "Authorities" },
            { key: "vehicle_claim", label: "Vehicle $", align: "right", render: (r) => r.vehicle_claim.toLocaleString("en-US") },
            { key: "predicted", label: "Score", align: "right", render: (r) => pct(r.predicted) },
            { key: "actual", label: "Outcome", render: (r) => <Pill yes={r.actual === "Fraud"}>{r.actual}</Pill> },
          ]}
          note="Score is out-of-fold: it comes from a model that never saw this claim. The demo runs the final model trained on every claim, so its number can differ by a few points."
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <InsuranceDemo key={sel?.id ?? "default"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`Honest signal: AUC ${lr.roc_auc.toFixed(2)}. Tempting signal: ${lrHob.roc_auc.toFixed(2)}.`}
          line={`Severity alone scores ${sevOnly.roc_auc.toFixed(3)}; all the claim facts together, ${lr.roc_auc.toFixed(3)}. Adding hobbies jumps to ${lrHob.roc_auc.toFixed(3)}, and that's exactly why it stays out.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="ROC curves"
            takeaway="The hobby curve looks better. It wouldn't hold up in front of a customer, a regulator or new data."
            legend={[
              { label: `Claim facts (${lr.roc_auc.toFixed(2)})`, color: INK, shape: "line" },
              { label: `Severity only (${sevOnly.roc_auc.toFixed(2)})`, color: S1, shape: "line" },
              { label: `+ hobbies (${lrHob.roc_auc.toFixed(2)})`, color: S2, shape: "line" },
            ]}
          >
            <LineChart
              series={[
                { name: "Claim facts", color: INK, points: model.eval.roc["Claim facts"] as [number, number][] },
                { name: "Severity only", color: S1, points: model.eval.roc["Severity only"] as [number, number][] },
                { name: "+ hobbies", color: S2, points: model.eval.roc["+ hobbies"] as [number, number][], dashed: true },
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
          <ChartCard
            title="Investigation budget"
            takeaway={`Investigating the top 20% of claims by score catches ${pct(top20)} of all fraud.`}
            table={{ columns: ["Claims investigated", "Fraud caught"], rows: [10, 20, 30, 40, 50].map((k) => [`${k}%`, pct1(model.eval.gains[k - 1].captured)]) }}
          >
            <LineChart
              series={[{ name: "Fraud caught", color: INK, points: [[0, 0] as [number, number], ...model.eval.gains.map((g) => [g.pct, g.captured] as [number, number])] }]}
              xDomain={[0, 100]}
              yDomain={[0, 1]}
              diagonal
              xFormat={(v) => `${Math.round(v)}%`}
              yFormat={pct}
              vline={{ at: 20, label: "20%" }}
              xLabel="Share of claims investigated, highest score first"
            />
          </ChartCard>
          <ChartCard title="Confusion matrix at a 50% score" takeaway={`${cm.tp} of ${cm.tp + cm.fn} fraud claims flagged, ${cm.fp} legitimate claims sent for review.`}>
            <ConfusionMatrix {...cm} positive="Fraud" negative="Legit" />
          </ChartCard>
          <ChartCard title="The checklist, written out" takeaway="Every path through the depth-3 tree, riskiest first. This is what an investigator would actually read.">
            <ul className="divide-y divide-line">
              {rules.map((r, i) => (
                <li key={i} className="flex items-start justify-between gap-4 py-2.5 text-[12.5px]">
                  <span className="text-ink-2/85">{r.rule.join(" · ")}</span>
                  <span className="shrink-0 text-right">
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${r.p >= 0.5 ? "bg-[#eb6834] text-white" : "bg-ink/[0.07]"}`}>{pct(r.p)}</span>
                    <span className="mt-0.5 block font-mono text-[10.5px] text-muted">{r.n} claims</span>
                  </span>
                </li>
              ))}
            </ul>
          </ChartCard>
          <ChartCard title="All models" takeaway="Out-of-fold scores. Average precision (AP) and the share of fraud caught in the top 20% matter most for a review queue." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Model", "Features", "ROC-AUC", "Avg precision", "Fraud in top 20%"],
                rows: model.comparison.map((c) => [c.model, c.features, c.roc_auc.toFixed(3), c.ap.toFixed(3), pct1(c.top20)]),
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
