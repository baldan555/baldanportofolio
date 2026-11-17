"use client";

import model from "@/data/models/nyc-taxi-anomaly.json";
import { AnomalyExplainer, type Window } from "../anomaly";

const t0 = Date.parse(model.series.start.replace(" ", "T") + "Z");
const hour = (s: string) => Math.floor((Date.parse(s.replace(" ", "T") + "Z") - t0) / 3600000);
export const windows: Window[] = model.windows.map((w) => ({ id: w.name, from: hour(w.start), to: hour(w.end) }));

export function Inside() {
  return (
    <AnomalyExplainer
      title="Normal is different every hour."
      line="No neural network here: a baseline per weekday and hour, and a robust score for how far each hour strays from it. Scroll through a real event."
      series={model.series}
      windows={windows}
      threshold={model.default_threshold}
      entity="Rides"
    />
  );
}
