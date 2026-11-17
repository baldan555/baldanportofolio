"use client";

import model from "@/data/models/bank-fraud.json";
import type { LogRegModel } from "@/lib/logreg";
import { NeuronExplainer, neuronTerms, spread } from "../neuron";

const m = model.model as LogRegModel;
type Sample = (typeof model.samples)[number];
const inputOf = (s: Sample) => {
  const input: Record<string, number> = { log_amount: Math.log1p(s.amount) };
  for (const k of Object.keys(m.numeric)) if (k.startsWith("V")) input[k] = s[k as keyof Sample] as number;
  return input;
};
const picked = spread(model.samples, (s) => neuronTerms(m, inputOf(s)).logit);
export const rows = picked.map((s) => ({
  id: s.id,
  input: inputOf(s),
  actual: s.actual === "Fraud" ? "fraud" : "legit",
  event: s.actual === "Fraud",
}));
const shows = picked.map((s) => ({
  log_amount: `€${s.amount.toLocaleString("en-US")}`,
}));
const labels: Record<string, string> = { log_amount: "Amount" };
for (const k of Object.keys(m.numeric)) if (k.startsWith("V")) labels[k] = `${k} (anonymised)`;

export function Inside() {
  return (
    <NeuronExplainer
      title="One payment, one neuron."
      line="Logistic regression is a single artificial neuron. The bank published its 28 signals only as anonymised components, so their names are V1 to V28."
      model={m}
      rows={rows}
      entity="payment"
      out={{
        kind: "chance",
        event: "fraud",
        threshold: 0.5,
        flag: "send to an analyst",
        pass: "let it through",
      }}
      trained={`${model.split.train.toLocaleString("en-US")} earlier payments`}
      labels={labels}
      shows={shows}
    />
  );
}
