"use client";

import { useMemo, useState } from "react";
import model from "@/data/models/heart-failure.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { Drivers, RiskMeter, Segmented, Slider } from "./controls";

const labels: Record<string, string> = {
  age: "Age",
  ejection_fraction: "Ejection fraction",
  serum_creatinine: "Serum creatinine",
  serum_sodium: "Serum sodium",
  high_blood_pressure: "High blood pressure",
  anaemia: "Anaemia",
};

export type HeartSample = (typeof model.samples)[number];

/** Remount with a new `key` to load a different preset row. */
export function HeartDemo({ preset }: { preset?: HeartSample | null }) {
  const m = model.medians;
  const [age, setAge] = useState(preset?.age ?? m.age);
  const [ef, setEf] = useState(preset?.ejection_fraction ?? m.ejection_fraction);
  const [cr, setCr] = useState(preset?.serum_creatinine ?? m.serum_creatinine);
  const [na, setNa] = useState(preset?.serum_sodium ?? m.serum_sodium);
  const [hbp, setHbp] = useState<"No" | "Yes">(preset?.high_blood_pressure === "Yes" ? "Yes" : "No");
  const [anaemia, setAnaemia] = useState<"No" | "Yes">(preset?.anaemia === "Yes" ? "Yes" : "No");

  const result = useMemo(
    () =>
      predict(model.model as LogRegModel, {
        age,
        ejection_fraction: ef,
        serum_creatinine: cr,
        serum_sodium: na,
        high_blood_pressure: hbp,
        anaemia,
      }),
    [age, ef, cr, na, hbp, anaemia],
  );
  const R = model.ranges;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Patient markers</p>
        <Slider label="Age" value={age} min={R.age[0]} max={R.age[1]} unit=" yrs" onChange={setAge} />
        <Slider label="Ejection fraction" value={ef} min={R.ejection_fraction[0]} max={R.ejection_fraction[1]} unit="%" onChange={setEf} />
        <Slider label="Serum creatinine" value={cr} min={R.serum_creatinine[0]} max={R.serum_creatinine[1]} step={0.1} unit=" mg/dL" onChange={setCr} />
        <Slider label="Serum sodium" value={na} min={R.serum_sodium[0]} max={R.serum_sodium[1]} unit=" mEq/L" onChange={setNa} />
        <div className="grid grid-cols-2 gap-4">
          <Segmented label="High blood pressure" value={hbp} options={["No", "Yes"]} onChange={setHbp} />
          <Segmented label="Anaemia" value={anaemia} options={["No", "Yes"]} onChange={setAnaemia} />
        </div>
        <p className="rounded-xl bg-cream/70 px-3 py-2 text-[12px] text-ink-2/70">Educational demo on a public dataset. Not medical advice.</p>
      </div>
      <div className="flex flex-col gap-6 rounded-2xl bg-white p-5 sm:p-6">
        <RiskMeter probability={result.probability} label="Estimated risk of a death event" />
        {preset && (
          <p className="-mt-2 rounded-xl bg-cream px-3 py-2 text-[12.5px]">
            Loaded patient <b className="font-mono">{preset.id}</b>. Recorded outcome: <b>{preset.actual === "Yes" ? "death event" : "survived"}</b>. The demo uses the
            final model trained on all patients, so it can differ slightly from the unseen-model score in the table.
          </p>
        )}
        <Drivers items={result.contributions} labels={labels} />
        <p className="mt-auto text-[12px] text-muted">
          Logistic regression · cross-validated ROC-AUC {model.comparison[0].roc_auc_mean.toFixed(3)} ± {model.comparison[0].roc_auc_std.toFixed(2)} on {model.dataset.rows} patients
        </p>
      </div>
    </div>
  );
}
