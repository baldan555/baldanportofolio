"use client";

import model from "@/data/models/air-quality.json";
import type { LogRegModel } from "@/lib/logreg";
import { NeuronExplainer, spread } from "../neuron";

const SENSORS = ["PT08.S1(CO)", "PT08.S2(NMHC)", "PT08.S3(NOx)", "PT08.S4(NO2)", "PT08.S5(O3)", "T", "RH", "AH"] as const;
const picked = spread(model.samples, (s) => s.predicted);
export const rows = picked.map((s) => {
  const input: Record<string, number> = {
    hour_sin: Math.sin((2 * Math.PI * s.hour) / 24),
    hour_cos: Math.cos((2 * Math.PI * s.hour) / 24),
  };
  for (const k of SENSORS) input[k] = s[k];
  return {
    id: s.id.slice(5),
    input,
    actual: `${s.actual} mg/m³`,
    value: s.actual,
    predicted: s.predicted,
  };
});
const shows = picked.map((s) => ({ "Hour of day": `${s.hour}:00` }));

const labels = {
  "PT08.S1(CO)": "CO sensor",
  "PT08.S2(NMHC)": "Hydrocarbon sensor",
  "PT08.S3(NOx)": "NOx sensor",
  "PT08.S4(NO2)": "NO₂ sensor",
  "PT08.S5(O3)": "Ozone sensor",
  T: "Temperature (°C)",
  RH: "Humidity (%)",
  AH: "Absolute humidity",
};

export function Inside() {
  return (
    <NeuronExplainer
      title="One hour, one neuron."
      line="Ridge regression is a single neuron without the squashing step: cheap sensor readings, each times a weight, add up to the CO level. The hour enters as two numbers on a clock circle, shown here as one input."
      model={model.model as LogRegModel}
      rows={rows}
      entity="hour"
      out={{ kind: "value", name: "the CO level", unit: "mg/m³", digits: 2 }}
      trained={`${model.split.train.toLocaleString("en-US")} earlier hours`}
      labels={labels}
      groups={{ "Hour of day": ["hour_sin", "hour_cos"] }}
      shows={shows}
    />
  );
}
