"use client";

import model from "@/data/models/bank-churn.json";
import type { LogRegModel } from "@/lib/logreg";
import { NeuronExplainer, spread } from "../neuron";

export const rows = spread(model.samples, (s) => s.predicted).map((s) => ({
  id: s.id,
  input: {
    CreditScore: s.CreditScore,
    Age: s.Age,
    age2: s.Age * s.Age,
    Tenure: s.Tenure,
    Balance: s.Balance,
    zero_balance: s.Balance === 0 ? 1 : 0,
    EstimatedSalary: s.EstimatedSalary,
    Geography: s.Geography,
    products: String(s.NumOfProducts),
    active: s.IsActiveMember ? "Yes" : "No",
  },
  actual: s.actual === "Stayed" ? "stayed" : "left",
  event: s.actual !== "Stayed",
  predicted: s.predicted,
}));

const labels = {
  CreditScore: "Credit score",
  Tenure: "Years with the bank",
  EstimatedSalary: "Salary (€)",
  products: "Products held",
  active: "Active member",
};

export function Inside() {
  return (
    <NeuronExplainer
      title="One customer, one neuron."
      line="Logistic regression is a single artificial neuron. Age and age² enter as one input here, as do the balance and the empty-account flag."
      model={model.model as LogRegModel}
      rows={rows}
      entity="customer"
      out={{
        kind: "chance",
        event: "leaving",
        threshold: 0.5,
        flag: "a retention offer",
        pass: "no action",
      }}
      trained={`${model.dataset.rows.toLocaleString("en-US")} customers`}
      labels={labels}
      groups={{
        Age: ["Age", "age2"],
        "Balance (€)": ["Balance", "zero_balance"],
      }}
    />
  );
}
