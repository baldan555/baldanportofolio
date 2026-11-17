"use client";

import model from "@/data/models/telco-churn.json";
import type { LogRegModel } from "@/lib/logreg";
import { NeuronExplainer, spread } from "../neuron";

export const rows = spread(model.samples, (s) => s.predicted).map((s) => ({
  id: s.id,
  input: {
    tenure: s.tenure,
    MonthlyCharges: s.MonthlyCharges,
    Contract: s.Contract,
    InternetService: s.InternetService,
    PaymentMethod: s.PaymentMethod,
    TechSupport: s.TechSupport,
    OnlineSecurity: s.OnlineSecurity,
    PaperlessBilling: s.PaperlessBilling,
    SeniorCitizen: s.SeniorCitizen,
  },
  actual: s.actual === "Yes" ? "left" : "stayed",
  event: s.actual === "Yes",
  predicted: s.predicted,
}));

const labels = {
  tenure: "Months as customer",
  MonthlyCharges: "Monthly bill ($)",
  InternetService: "Internet",
  PaymentMethod: "Payment",
  TechSupport: "Tech support",
  OnlineSecurity: "Online security",
  PaperlessBilling: "Paperless billing",
  SeniorCitizen: "Senior citizen",
};

export function Inside() {
  return (
    <NeuronExplainer
      title="One customer, one neuron."
      line="Logistic regression is a single artificial neuron. Scroll to watch it score one real customer with the model's real weights."
      model={model.model as LogRegModel}
      rows={rows}
      entity="customer"
      out={{
        kind: "chance",
        event: "leaving",
        threshold: 0.5,
        flag: "worth a call",
        pass: "fine for now",
      }}
      trained={`${model.split.train.toLocaleString("en-US")} past customers`}
      labels={labels}
    />
  );
}
