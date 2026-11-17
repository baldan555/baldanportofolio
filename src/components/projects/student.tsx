"use client";

import { useState } from "react";
import model from "@/data/models/student-performance.json";
import { BarChart, ChartCard, ConfusionMatrix, DataTable, Histogram, INK, S1, S2 } from "../charts";
import { Segmented } from "../demos/controls";
import { STAGE_LABEL, StudentDemo, type Stage, type StudentSample } from "../demos/student-demo";
import { DatasetCard, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const used = new Set(model.stages.term2.features);
const columns: ColumnDoc[] = [
  ["school", "category", "GP (Gabriel Pereira) or MS (Mousinho da Silveira)"],
  ["sex", "category", "Student's sex · left out (fairness)"],
  ["age", "number", "15–22"],
  ["address", "category", "Urban or rural home"],
  ["famsize", "category", "Family of 3 or fewer, or more"],
  ["Pstatus", "category", "Parents living together or apart"],
  ["Medu", "0–4", "Mother's education (none → higher education)"],
  ["Fedu", "0–4", "Father's education"],
  ["Mjob · Fjob", "category", "Parents' jobs"],
  ["reason", "category", "Why this school was chosen"],
  ["guardian", "category", "Mother, father or other"],
  ["traveltime", "1–4", "Home to school: < 15 min … > 1 hour"],
  ["studytime", "1–4", "Weekly study: < 2 h … > 10 h"],
  ["failures", "0–3", "Past class failures"],
  ["schoolsup", "yes/no", "Extra educational support from school"],
  ["famsup · paid", "yes/no", "Family support, paid extra classes"],
  ["activities · nursery", "yes/no", "Extra-curricular activities, attended nursery"],
  ["higher", "yes/no", "Wants to take higher education"],
  ["internet", "yes/no", "Internet access at home"],
  ["romantic", "yes/no", "In a romantic relationship"],
  ["famrel · freetime", "1–5", "Family relationship quality, free time"],
  ["goout", "1–5", "Going out with friends"],
  ["Dalc · Walc", "1–5", "Workday / weekend alcohol consumption"],
  ["health", "1–5", "Current health"],
  ["absences", "number", "School absences"],
  ["G1 · G2", "0–20", "Term 1 and term 2 grades (only used at the later stages)"],
  ["G3", "target", "Final grade, 0–20: the thing we predict"],
].map(([name, type, meaning]) => ({ name, type, meaning, used: name.split(" · ").some((n) => used.has(n)) || name === "G3" }));

const flag = model.flags["11"];

export function StudentBody() {
  const [sel, setSel] = useState<StudentSample | null>(null);
  const [evalStage, setEvalStage] = useState<Stage>("start");
  const fails = model.eda.by_failures;
  const higher = model.eda.by_higher;
  const study = model.eda.by_studytime;
  const ridge = (s: Stage) => model.comparison.find((c) => c.stage === s && c.model === "Ridge regression")!;
  const STUDY = ["< 2 h", "2–5 h", "5–10 h", "> 10 h"];

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${model.dataset.rows} students, ${model.dataset.raw_cols} columns.`}
          line="Grades on a 0–20 scale, where 10 is a pass, plus a survey about family, habits and school."
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset on UCI"
          description="Students of the Portuguese-language course at two secondary schools in Portugal, collected by Paulo Cortez and Alice Silva (2008) from school reports and questionnaires."
          facts={[
            { label: "students", value: String(model.dataset.rows) },
            { label: "average grade", value: model.dataset.mean_grade.toFixed(1) },
            { label: "pass rate", value: `${Math.round(model.dataset.pass_rate * 100)}%` },
            { label: "grade 0 (no exam)", value: String(model.dataset.zeros) },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Habits matter. Past grades matter more." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Final grade distribution"
            takeaway={`${Math.round((model.eda.grade_hist.counts.slice(10, 15).reduce((a, b) => a + b, 0) / model.dataset.rows) * 100)}% of students land between 10 and 14. The ${model.dataset.zeros} zeros are most likely students who missed the final exam.`}
            table={{ columns: ["Grade", "Students"], rows: model.eda.grade_hist.counts.map((c, i) => [i, c]) }}
          >
            <Histogram bins={model.eda.grade_hist.bins} series={[{ name: "Students", color: INK, values: model.eda.grade_hist.counts }]} />
          </ChartCard>
          <ChartCard
            title="Average final grade by past failures"
            takeaway={`No past failures: ${fails[0].value.toFixed(1)}. One or more: about ${Math.round(fails.slice(1).reduce((a, f) => a + f.value * f.n, 0) / fails.slice(1).reduce((a, f) => a + f.n, 0))}, below the pass line.`}
            table={{ columns: ["Past failures", "Average grade", "Students"], rows: fails.map((f) => [f.label, f.value.toFixed(2), f.n]) }}
          >
            <BarChart data={fails.map((f) => ({ label: `${f.label} failure${f.label === "1" ? "" : "s"}`, value: f.value, n: f.n }))} max={15} format={(v) => v.toFixed(1)} />
          </ChartCard>
          <ChartCard
            title="Average grade by weekly study time"
            takeaway={`From ${study[0].value.toFixed(1)} (under 2 hours) to ${Math.max(...study.map((s) => s.value)).toFixed(1)} for the most studious groups.`}
            table={{ columns: ["Study time", "Average grade", "Students"], rows: study.map((s) => [STUDY[Number(s.label) - 1], s.value.toFixed(2), s.n]) }}
          >
            <BarChart data={study.map((s) => ({ label: STUDY[Number(s.label) - 1], value: s.value, n: s.n }))} max={15} format={(v) => v.toFixed(1)} />
          </ChartCard>
          <ChartCard
            title="Wants higher education?"
            takeaway={`Students who plan to continue average ${higher.find((h) => h.label === "yes")!.value.toFixed(1)}; those who don't, ${higher.find((h) => h.label === "no")!.value.toFixed(1)}.`}
            table={{ columns: ["Wants higher education", "Average grade", "Students"], rows: higher.map((h) => [h.label, h.value.toFixed(2), h.n]) }}
          >
            <BarChart data={higher.map((h) => ({ label: h.label === "yes" ? "Yes" : "No", value: h.value, n: h.n }))} max={15} format={(v) => v.toFixed(1)} />
          </ChartCard>
          <ChartCard
            title="Term 1 grade vs final grade"
            takeaway="Each dot is a student. Once the first grades exist, the final grade is mostly decided, which is why early warning is the hard part."
            className="md:col-span-2"
          >
            <GradeScatter xs={model.g1} ys={model.actual} xLabel="Term 1 grade (G1)" yLabel="Final grade (G3)" />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle kicker="Try it" title="Load a student, then move the clock." line="Predictions in the table come from models that never saw that student. Pick a stage in the demo to watch the estimate tighten." />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Student" },
            { key: "school", label: "School" },
            { key: "failures", label: "Failures", align: "right" },
            { key: "studytime", label: "Study", align: "right", render: (r) => STUDY[r.studytime - 1] },
            { key: "absences", label: "Absences", align: "right" },
            { key: "higher", label: "Higher ed" },
            { key: "G1", label: "G1", align: "right" },
            { key: "G2", label: "G2", align: "right" },
            { key: "pred_start", label: "Pred · start", align: "right", render: (r) => r.pred_start.toFixed(1) },
            { key: "pred_term2", label: "Pred · term 2", align: "right", render: (r) => r.pred_term2.toFixed(1) },
            {
              key: "G3",
              label: "Real G3",
              align: "right",
              render: (r) => <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${r.G3 < 10 ? "bg-[#eb6834] text-white" : "bg-ink/[0.07]"}`}>{r.G3}</span>,
            },
          ]}
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <StudentDemo key={sel?.id ?? "default"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title="The earlier you ask, the blurrier the answer."
          line={`Guessing the average is off by ${model.baseline_mae.toFixed(2)} points. The start-of-year model cuts that to ${ridge("start").mae.toFixed(2)}; after term 2 it's ${ridge("term2").mae.toFixed(2)}.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Average error by stage (MAE, grade points)"
            takeaway="Ridge regression, 25 cross-validation folds per stage. Lower is better."
            table={{ columns: ["Stage", "Model", "MAE", "R²"], rows: model.comparison.map((c) => [STAGE_LABEL[c.stage as Stage], c.model, c.mae.toFixed(2), c.r2.toFixed(3)]) }}
          >
            <BarChart
              data={[
                { label: "Guess average", value: model.baseline_mae },
                { label: "Start of year", value: ridge("start").mae },
                { label: "After term 1", value: ridge("term1").mae },
                { label: "After term 2", value: ridge("term2").mae },
              ]}
              format={(v) => v.toFixed(2)}
              highlight={(d) => d.label !== "Guess average"}
            />
          </ChartCard>
          <ChartCard
            title="Early-warning list at the start of the year"
            takeaway={`Flag every student predicted below 11: ${flag.caught} of ${flag.fails} students who end up failing are on the list, which has ${flag.flagged} names.`}
            table={{
              columns: ["Flag below", "Students flagged", "Failing students caught", "Missed"],
              rows: Object.values(model.flags).map((f) => [f.threshold, f.flagged, `${f.caught}/${f.fails}`, f.fails - f.caught]),
            }}
          >
            <ConfusionMatrix {...flag.confusion} positive="Fail" negative="Pass" />
          </ChartCard>
          <ChartCard
            title="Predicted vs real final grade"
            takeaway="Out-of-fold predictions. Dots on the diagonal are perfect guesses. Early on, predictions huddle around the average."
            className="md:col-span-2"
          >
            <div className="mb-3">
              <Segmented label="Stage" value={evalStage} options={["start", "term1", "term2"] as Stage[]} onChange={setEvalStage} display={(s) => STAGE_LABEL[s]} />
            </div>
            <GradeScatter xs={model.stages[evalStage].oof} ys={model.actual} xLabel="Predicted final grade" yLabel="Real final grade" diagonal color={evalStage === "start" ? S2 : evalStage === "term1" ? S1 : INK} />
            <p className="mt-2 text-[12.5px] text-muted">
              {STAGE_LABEL[evalStage]}: MAE {model.stages[evalStage].oof_mae.toFixed(2)} · R² {model.stages[evalStage].oof_r2.toFixed(2)}
            </p>
          </ChartCard>
          <ChartCard title="All models, all stages" takeaway="Random forest and boosting land within a few hundredths of ridge at every stage, so the readable model stays." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Stage", "Model", "MAE", "R²"],
                rows: model.comparison.map((c) => [STAGE_LABEL[c.stage as Stage], c.model, c.mae.toFixed(2), c.r2.toFixed(3)]),
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}

/* Scatter for grades (0–20 on both axes), jittered so identical grades don't hide each other. */
function GradeScatter({
  xs,
  ys,
  xLabel,
  yLabel,
  diagonal = false,
  color = INK,
}: {
  xs: number[];
  ys: number[];
  xLabel: string;
  yLabel: string;
  diagonal?: boolean;
  color?: string;
}) {
  const W = 860;
  const H = 320;
  const M = { l: 48, r: 14, t: 12, b: 40 };
  const sx = (v: number) => M.l + (v / 20) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - (v / 20) * (H - M.t - M.b);
  const jit = (i: number, k: number) => ((((i * 9301 + k * 49297) % 233) / 233) - 0.5) * 0.6;
  const [tip, setTip] = useState<{ i: number } | null>(null);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
        {[0, 5, 10, 15, 20].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="rgba(11,11,11,0.07)" />
            <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
              {v}
            </text>
            <text x={sx(v)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
              {v}
            </text>
          </g>
        ))}
        <line x1={M.l} x2={W - M.r} y1={sy(10)} y2={sy(10)} stroke="#eb6834" strokeOpacity={0.5} strokeDasharray="4 4" />
        <text x={W - M.r} y={sy(10) - 5} textAnchor="end" fontSize="10.5" fill="#c4471a">
          pass line
        </text>
        {diagonal && <line x1={sx(0)} y1={sy(0)} x2={sx(20)} y2={sy(20)} stroke="#8a8a85" strokeDasharray="5 4" />}
        <text x={(W + M.l) / 2} y={H - 4} textAnchor="middle" fontSize="11.5" fill="#5f5f5a">
          {xLabel}
        </text>
        <text x={14} y={(H - M.b) / 2} textAnchor="middle" fontSize="11.5" fill="#5f5f5a" transform={`rotate(-90 14 ${(H - M.b) / 2})`}>
          {yLabel}
        </text>
        {xs.map((x, i) => (
          <circle
            key={i}
            cx={sx(x + jit(i, 1))}
            cy={sy(ys[i] + jit(i, 2))}
            r={3.2}
            fill={color}
            fillOpacity={0.45}
            stroke="#fff"
            strokeWidth={0.8}
            onMouseEnter={() => setTip({ i })}
          />
        ))}
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] whitespace-nowrap text-white"
          style={{
            left: `${(sx(xs[tip.i]) / W) * 100}%`,
            top: `${(sy(ys[tip.i]) / H) * 100}%`,
            transform: `translate(${sx(xs[tip.i]) > W * 0.7 ? "calc(-100% - 10px)" : "10px"}, -50%)`,
          }}
        >
          {xLabel.split(" (")[0]}: {Number(xs[tip.i]).toFixed(1)} · real: {ys[tip.i]}
        </div>
      )}
    </div>
  );
}
