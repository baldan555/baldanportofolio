"use client";

import model from "@/data/models/credit-risk.json";
import type { LogRegModel } from "@/lib/logreg";
import { NeuronExplainer, spread } from "../neuron";

export const rows = spread(model.samples, (s) => s.predicted).map((s) => ({
  id: s.id,
  input: {
    duration: s.duration,
    amount: s.amount,
    installment_rate: Number(s.installment_rate),
    checking: s.checking,
    history: s.history,
    purpose: s.purpose,
    savings: s.savings,
    employment: s.employment,
    property: s.property,
    other_plans: s.other_plans,
    housing: s.housing,
  },
  actual: s.actual === "Repaid" ? "repaid" : "defaulted",
  event: s.actual !== "Repaid",
  predicted: s.predicted,
}));

const labels = {
  duration: "Duration (months)",
  amount: "Amount (DM)",
  installment_rate: "Instalment rate",
  checking: "Checking account",
  history: "Credit history",
  other_plans: "Other instalments",
};

export function Inside() {
  return (
    <NeuronExplainer
      title="One loan, one neuron."
      line="Logistic regression is a single artificial neuron. The decision line sits low on purpose: approving a bad loan costs five times more than turning down a good one."
      model={model.model as LogRegModel}
      rows={rows}
      entity="loan"
      out={{
        kind: "chance",
        event: "default",
        threshold: model.costs.bayes_threshold,
        flag: "decline",
        pass: "approve",
      }}
      trained={`${model.dataset.rows.toLocaleString("en-US")} past loans`}
      labels={labels}
    />
  );
}
