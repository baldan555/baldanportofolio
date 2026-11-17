"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/student-performance.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { Drivers, LOWERS, pc, RAISES, Segmented, Slider } from "./controls";

export type StudentSample = (typeof model.samples)[number];
export type Stage = "start" | "term1" | "term2";
export const STAGE_LABEL: Record<Stage, string> = { start: "Start of year", term1: "After term 1", term2: "After term 2" };

const labels: Record<string, string> = {
  failures: "Past class failures",
  studytime: "Weekly study time",
  absences: "Absences",
  Medu: "Mother's education",
  goout: "Going out with friends",
  Dalc: "Weekday alcohol",
  traveltime: "Travel time to school",
  age: "Age",
  G1: "Term 1 grade",
  G2: "Term 2 grade",
  school: "School",
  higher: "Wants higher education",
  schoolsup: "Extra school support",
  internet: "Internet at home",
};
const STUDY = ["< 2 h", "2–5 h", "5–10 h", "> 10 h"];
const TRAVEL = ["< 15 min", "15–30 min", "30–60 min", "> 1 h"];
const MEDU = ["None", "Primary (4th)", "5th–9th", "Secondary", "Higher"];

/** Remount with a new `key` to load a different preset row. */
export function StudentDemo({ preset, stage: initialStage = "start" }: { preset?: StudentSample | null; stage?: Stage }) {
  const md = model.medians;
  const [stage, setStage] = useState<Stage>(initialStage);
  const [v, setV] = useState({
    failures: preset?.failures ?? 0,
    studytime: preset?.studytime ?? md.studytime,
    absences: preset?.absences ?? md.absences,
    Medu: preset?.Medu ?? md.Medu,
    goout: preset?.goout ?? md.goout,
    Dalc: preset?.Dalc ?? md.Dalc,
    traveltime: preset?.traveltime ?? md.traveltime,
    age: preset?.age ?? md.age,
    G1: preset?.G1 ?? md.G1,
    G2: preset?.G2 ?? md.G2,
    school: preset?.school ?? "GP",
    higher: preset?.higher ?? "yes",
    schoolsup: preset?.schoolsup ?? "no",
    internet: preset?.internet ?? "yes",
  });
  const set = <K extends keyof typeof v>(k: K) => (x: (typeof v)[K]) => setV((s) => ({ ...s, [k]: x }));

  const st = model.stages[stage];
  const res = useMemo(() => predict(st.model as LogRegModel, v), [st, v]);
  const grade = Math.max(0, Math.min(20, res.logit));
  const mae = st.oof_mae;
  const lo = Math.max(0, grade - mae);
  const hi = Math.min(20, grade + mae);
  const status = hi < 10 ? "At risk" : lo >= 10 ? "Likely pass" : "Borderline";

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6">
        <Segmented label="What do we know yet?" value={stage} options={["start", "term1", "term2"] as Stage[]} onChange={setStage} display={(s) => STAGE_LABEL[s]} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Slider label="Past class failures" value={v.failures} min={0} max={3} onChange={set("failures")} />
          <Slider label="Absences" value={v.absences} min={0} max={32} onChange={set("absences")} />
          <Segmented label="Weekly study time" value={String(v.studytime)} options={["1", "2", "3", "4"]} onChange={(x) => set("studytime")(Number(x))} display={(x) => STUDY[Number(x) - 1]} />
          <Segmented label="Travel to school" value={String(v.traveltime)} options={["1", "2", "3", "4"]} onChange={(x) => set("traveltime")(Number(x))} display={(x) => TRAVEL[Number(x) - 1]} />
          <Slider label="Going out with friends (1–5)" value={v.goout} min={1} max={5} onChange={set("goout")} />
          <Slider label="Weekday alcohol (1–5)" value={v.Dalc} min={1} max={5} onChange={set("Dalc")} />
          <Slider label="Age" value={v.age} min={15} max={22} unit=" yrs" onChange={set("age")} />
          <Segmented label="Mother's education" value={String(v.Medu)} options={["0", "1", "2", "3", "4"]} onChange={(x) => set("Medu")(Number(x))} display={(x) => MEDU[Number(x)]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Segmented label="School" value={v.school} options={model.options.school} onChange={set("school")} display={(x) => (x === "GP" ? "Gabriel Pereira" : "Mousinho da Silveira")} />
          <Segmented label="Wants higher education" value={v.higher} options={["yes", "no"]} onChange={set("higher")} />
          <Segmented label="Extra school support" value={v.schoolsup} options={["yes", "no"]} onChange={set("schoolsup")} />
          <Segmented label="Internet at home" value={v.internet} options={["yes", "no"]} onChange={set("internet")} />
        </div>
        {stage !== "start" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 rounded-xl bg-cream/70 p-4 sm:grid-cols-2">
            <Slider label="Term 1 grade (0–20)" value={v.G1} min={0} max={19} onChange={set("G1")} />
            {stage === "term2" && <Slider label="Term 2 grade (0–20)" value={v.G2} min={0} max={19} onChange={set("G2")} />}
          </motion.div>
        )}
      </div>

      <div className="flex flex-col gap-6 rounded-2xl bg-white p-5 sm:p-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Predicted final grade (0–20)</p>
          <div className="mt-2 flex items-baseline gap-3">
            <motion.span key={grade.toFixed(1)} initial={{ opacity: 0.5, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[4rem] leading-none font-semibold tracking-[-0.05em]">
              {grade.toFixed(1)}
            </motion.span>
            <span className="text-[15px] text-muted">± {mae.toFixed(1)}</span>
            <span
              className="ml-auto rounded-full px-2.5 py-1 text-[12.5px] font-medium"
              style={{ background: status === "At risk" ? RAISES : status === "Likely pass" ? "#0b0b0b" : "#ebe3d3", color: status === "Borderline" ? "#0b0b0b" : "#fff" }}
            >
              {status}
            </span>
          </div>

          <div className="relative mt-6 h-10">
            <div className="absolute inset-x-0 top-4 h-2 rounded-full bg-ink/[0.07]" />
            <div className="absolute top-4 h-2 rounded-l-full bg-[#eb6834]/15" style={{ left: 0, width: "50%" }} />
            <motion.div className="absolute top-3 h-4 rounded-full bg-ink/15" animate={{ left: pc((lo / 20) * 100), width: pc(((hi - lo) / 20) * 100) }} transition={{ type: "spring", stiffness: 160, damping: 22 }} />
            <motion.span
              className="absolute top-2 h-6 w-6 -translate-x-1/2 rounded-full border-[3px] border-white bg-ink shadow"
              animate={{ left: pc((grade / 20) * 100) }}
              transition={{ type: "spring", stiffness: 160, damping: 22 }}
            />
            <span className="absolute top-0 left-1/2 h-10 w-px bg-ink/40" />
            <span className="absolute -top-1 left-1/2 ml-1.5 font-mono text-[10px] text-ink/60">pass 10</span>
          </div>
          <div className="flex justify-between font-mono text-[10.5px] text-muted">
            <span>0</span>
            <span>5</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
          </div>
          <p className="mt-2 text-[12px] text-muted">
            The band is the model&apos;s average error at this stage (MAE {mae.toFixed(2)}, R² {st.oof_r2.toFixed(2)}).
          </p>
        </div>

        {preset && (
          <p className="rounded-xl bg-cream px-3 py-2 text-[12.5px]">
            Loaded student <b className="font-mono">{preset.id}</b>. Real final grade: <b>{preset.G3}</b>. Switch the stage to see how the prediction sharpens as grades come in.
          </p>
        )}

        <Drivers items={res.contributions} labels={labels} max={6} upLabel="raises the grade" downLabel="lowers the grade" upColor={LOWERS} downColor={RAISES} unit="grade points" />
      </div>
    </div>
  );
}
