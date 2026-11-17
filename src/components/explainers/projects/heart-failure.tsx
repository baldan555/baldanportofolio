"use client";

import model from "@/data/models/heart-failure.json";
import type { LogRegModel } from "@/lib/logreg";
import { NeuronExplainer, spread } from "../neuron";

export const rows = spread(model.samples, (s) => s.predicted).map((s) => ({
  id: s.id,
  input: {
    age: s.age,
    ejection_fraction: s.ejection_fraction,
    serum_creatinine: s.serum_creatinine,
    serum_sodium: s.serum_sodium,
    high_blood_pressure: s.high_blood_pressure,
    anaemia: s.anaemia,
  },
  actual: s.actual === "Yes" ? "died" : "survived",
  event: s.actual === "Yes",
  predicted: s.predicted,
}));

const labels = {
  age: "Age",
  ejection_fraction: "Ejection fraction (%)",
  serum_creatinine: "Creatinine (mg/dL)",
  serum_sodium: "Sodium (mEq/L)",
  high_blood_pressure: "High blood pressure",
  anaemia: "Anaemia",
};

export function Inside() {
  return (
    <NeuronExplainer
      title="One patient, one neuron."
      line="Logistic regression is a single artificial neuron. Scroll to watch it weigh one real patient's test results with the model's real weights."
      model={model.model as LogRegModel}
      rows={rows}
      entity="patient"
      out={{
        kind: "chance",
        event: "death during follow-up",
        threshold: 0.5,
        flag: "closer follow-up",
        pass: "routine follow-up",
      }}
      trained={`all ${model.dataset.rows} patients`}
      labels={labels}
    />
  );
}
