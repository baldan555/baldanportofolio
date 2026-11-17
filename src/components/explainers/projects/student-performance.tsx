"use client";

import model from "@/data/models/student-performance.json";
import type { LogRegModel } from "@/lib/logreg";
import { NeuronExplainer, spread } from "../neuron";

const stage = model.stages.start;
export const rows = spread(model.samples, (s) => s.pred_start).map((s) => ({
  id: s.id,
  input: {
    failures: s.failures,
    studytime: s.studytime,
    absences: s.absences,
    Medu: s.Medu,
    goout: s.goout,
    Dalc: s.Dalc,
    traveltime: s.traveltime,
    age: s.age,
    school: s.school,
    higher: s.higher,
    schoolsup: s.schoolsup,
    internet: s.internet,
  },
  actual: `${s.G3}/20`,
  value: s.G3,
  predicted: s.pred_start,
}));

const labels = {
  failures: "Past failures",
  studytime: "Study time (1–4)",
  absences: "Absences",
  Medu: "Mother's education (0–4)",
  goout: "Going out (1–5)",
  Dalc: "Weekday alcohol (1–5)",
  traveltime: "Travel time (1–4)",
  higher: "Wants higher education",
  schoolsup: "Extra school support",
};

export function Inside() {
  return (
    <NeuronExplainer
      title="One student, one neuron."
      line="Ridge regression is a single neuron without the squashing step: it adds up weighted inputs and the sum is the grade. This is the start-of-year model, before any marks exist."
      model={stage.model as LogRegModel}
      rows={rows}
      entity="student"
      out={{
        kind: "value",
        name: "the final grade",
        unit: "out of 20",
        digits: 1,
      }}
      trained={`${model.dataset.rows} students`}
      labels={labels}
    />
  );
}
