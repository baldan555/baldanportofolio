"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/air-quality.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { Drivers, LOWERS, pc, RAISES, Slider } from "./controls";

export type AirSample = (typeof model.samples)[number];
type Sensor = "PT08.S1(CO)" | "PT08.S2(NMHC)" | "PT08.S3(NOx)" | "PT08.S4(NO2)" | "PT08.S5(O3)" | "T" | "RH" | "AH";

const SENSOR_LABEL: Record<string, string> = {
  "PT08.S1(CO)": "Tin-oxide sensor S1 (CO)",
  "PT08.S2(NMHC)": "Titania sensor S2 (hydrocarbons)",
  "PT08.S3(NOx)": "Tungsten-oxide sensor S3 (NOx)",
  "PT08.S4(NO2)": "Tungsten-oxide sensor S4 (NO₂)",
  "PT08.S5(O3)": "Indium-oxide sensor S5 (O₃)",
  T: "Temperature",
  RH: "Relative humidity",
  AH: "Absolute humidity",
  hour: "Hour of day",
};
const TIME_MAE = model.comparison.find((c) => c.model === model.chosen)!.time_mae;

/** Remount with a new `key` to load a different preset row. */
export function AirDemo({ preset }: { preset?: AirSample | null }) {
  const md = model.medians;
  const R = model.ranges;
  const [hour, setHour] = useState(preset?.hour ?? 9);
  const [v, setV] = useState<Record<Sensor, number>>({
    "PT08.S1(CO)": preset?.["PT08.S1(CO)"] ?? md["PT08.S1(CO)"],
    "PT08.S2(NMHC)": preset?.["PT08.S2(NMHC)"] ?? md["PT08.S2(NMHC)"],
    "PT08.S3(NOx)": preset?.["PT08.S3(NOx)"] ?? md["PT08.S3(NOx)"],
    "PT08.S4(NO2)": preset?.["PT08.S4(NO2)"] ?? md["PT08.S4(NO2)"],
    "PT08.S5(O3)": preset?.["PT08.S5(O3)"] ?? md["PT08.S5(O3)"],
    T: preset?.T ?? md.T,
    RH: preset?.RH ?? md.RH,
    AH: preset?.AH ?? md.AH,
  });
  const set = (k: Sensor) => (x: number) => setV((s) => ({ ...s, [k]: x }));

  const res = useMemo(() => {
    const out = predict(model.model as LogRegModel, { ...v, hour_sin: Math.sin((2 * Math.PI * hour) / 24), hour_cos: Math.cos((2 * Math.PI * hour) / 24) });
    const hs = out.contributions.find((c) => c.feature === "hour_sin")?.effect ?? 0;
    const hc = out.contributions.find((c) => c.feature === "hour_cos")?.effect ?? 0;
    const contributions = [...out.contributions.filter((c) => !c.feature.startsWith("hour_")), { feature: "hour", value: `${hour}:00`, effect: hs + hc }].sort(
      (a, b) => Math.abs(b.effect) - Math.abs(a.effect),
    );
    return { value: Math.max(0, out.logit), contributions };
  }, [v, hour]);

  const lo = Math.max(0, res.value - TIME_MAE);
  const hi = res.value + TIME_MAE;
  const scaleMax = 8;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Cheap sensor readings</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {(["PT08.S1(CO)", "PT08.S2(NMHC)", "PT08.S3(NOx)", "PT08.S4(NO2)", "PT08.S5(O3)"] as Sensor[]).map((s) => (
            <Slider key={s} label={SENSOR_LABEL[s]} value={v[s]} min={Math.floor(R[s][0])} max={Math.ceil(R[s][1])} onChange={set(s)} />
          ))}
          <Slider label="Hour of day" value={hour} min={0} max={23} unit=":00" onChange={setHour} />
        </div>
        <div className="grid gap-5 border-t border-line pt-4 sm:grid-cols-3">
          <Slider label="Temperature" value={v.T} min={Math.floor(R.T[0])} max={Math.ceil(R.T[1])} step={0.1} unit=" °C" onChange={set("T")} />
          <Slider label="Rel. humidity" value={v.RH} min={Math.floor(R.RH[0])} max={Math.ceil(R.RH[1])} step={0.1} unit=" %" onChange={set("RH")} />
          <Slider label="Abs. humidity" value={v.AH} min={R.AH[0]} max={R.AH[1]} step={0.01} onChange={set("AH")} />
        </div>
        <p className="text-[12px] text-muted">Sensor values are raw responses (arbitrary units), as the device reports them.</p>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl bg-white p-5 sm:p-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Estimated carbon monoxide</p>
          <div className="mt-2 flex items-baseline gap-2">
            <motion.span key={res.value.toFixed(2)} initial={{ opacity: 0.5, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[4rem] leading-none font-semibold tracking-[-0.05em]">
              {res.value.toFixed(2)}
            </motion.span>
            <span className="text-[15px] text-muted">mg/m³ ± {TIME_MAE.toFixed(2)}</span>
          </div>
          <div className="relative mt-5 h-8">
            <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-gradient-to-r from-[#cde2fb] via-[#6da7ec] to-[#184f95]" />
            <motion.div className="absolute top-2 h-4 rounded-full bg-ink/20" animate={{ left: pc((lo / scaleMax) * 100), width: pc(((Math.min(hi, scaleMax) - lo) / scaleMax) * 100) }} />
            <motion.span
              className="absolute top-1 h-6 w-6 -translate-x-1/2 rounded-full border-[3px] border-white bg-ink shadow"
              animate={{ left: pc(Math.min(1, res.value / scaleMax) * 100) }}
              transition={{ type: "spring", stiffness: 160, damping: 22 }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10.5px] text-muted">
            {[0, 2, 4, 6, 8].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">The band is the error on months the model never saw (time split), not the rosier random-split number.</p>
        </div>

        {preset && (
          <p className="rounded-xl bg-cream px-3 py-2 text-[12.5px]">
            Loaded <b className="font-mono">{preset.id}</b>. The lab-grade analyser measured <b>{preset.actual} mg/m³</b>.
          </p>
        )}

        <Drivers items={res.contributions} labels={SENSOR_LABEL} max={6} upLabel="raises the estimate" downLabel="lowers it" upColor={RAISES} downColor={LOWERS} unit="mg/m³" />
        <p className="-mt-3 text-[11.5px] text-muted">The sensors overlap a lot, so their individual effects partly cancel; S2 carries most of the signal.</p>
      </div>
    </div>
  );
}
