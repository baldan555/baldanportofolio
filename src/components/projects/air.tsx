"use client";

import { useState } from "react";
import model from "@/data/models/air-quality.json";
import { BarChart, ChartCard, DataTable, GroupedBars, INK, LineChart, S1, S2 } from "../charts";
import { AirDemo, type AirSample } from "../demos/air-demo";
import { DatasetCard, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (ym: string) => `${MON[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;
const used = new Set(model.features);

const columns: ColumnDoc[] = [
  ["Date · Time", "datetime", "Hourly averages, March 2004 – April 2005"],
  ["CO(GT)", "target", "True carbon monoxide from the reference analyser (mg/m³): the thing we estimate"],
  ["PT08.S1(CO)", "sensor", "Tin-oxide sensor, nominally for CO"],
  ["NMHC(GT)", "reference", "Non-methane hydrocarbons, 90% missing · dropped"],
  ["C6H6(GT)", "reference", "Benzene from the analyser · not used"],
  ["PT08.S2(NMHC)", "sensor", "Titania sensor, nominally for hydrocarbons"],
  ["NOx(GT) · NO2(GT)", "reference", "Nitrogen oxides from the analyser · not used"],
  ["PT08.S3(NOx)", "sensor", "Tungsten-oxide sensor, nominally for NOx"],
  ["PT08.S4(NO2)", "sensor", "Tungsten-oxide sensor, nominally for NO₂"],
  ["PT08.S5(O3)", "sensor", "Indium-oxide sensor, nominally for ozone"],
  ["T · RH · AH", "weather", "Temperature (°C), relative and absolute humidity"],
].map(([name, type, meaning]) => ({ name, type, meaning, used: name.split(" · ").some((n) => used.has(n)) || name === "CO(GT)" }));

const ridge = model.comparison.find((c) => c.model === model.chosen)!;
const rf = model.comparison.find((c) => c.model === "Random Forest")!;
const stAvg = model.drift.reduce((a, d) => a + d.static, 0) / model.drift.length;
const rcAvg = model.drift.reduce((a, d) => a + d.recalibrated, 0) / model.drift.length;

export function AirBody() {
  const [sel, setSel] = useState<AirSample | null>(null);
  const prof = model.eda.profile;
  const peakAm = prof.Weekday.slice(5, 12).indexOf(Math.max(...prof.Weekday.slice(5, 12))) + 5;
  const peakPm = prof.Weekday.slice(15, 23).indexOf(Math.max(...prof.Weekday.slice(15, 23))) + 15;
  const w = model.window;
  const t0 = new Date(w.ts[0] + ":00:00Z").getTime();
  const hoursSince = (s: string) => (new Date(s + ":00:00Z").getTime() - t0) / 3_600_000;

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${model.dataset.rows.toLocaleString("en-US")} hours from a street-level sensor box.`}
          line="Five cheap metal-oxide sensors sat next to a certified analyser for a year. The analyser is the truth; the question is whether the cheap ones can replace it."
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset on UCI"
          description="Hourly responses of a multi-sensor gas device deployed at road level in a polluted area of an Italian city, next to a reference analyser. Collected by Saverio De Vito (ENEA) from March 2004 to April 2005."
          facts={[
            { label: "hours", value: model.dataset.rows.toLocaleString("en-US") },
            { label: "usable for training", value: model.dataset.usable.toLocaleString("en-US") },
            { label: "average CO", value: `${model.dataset.mean_co} mg/m³` },
            { label: "cheap sensors", value: "5" },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Gaps, rush hours and a noisy match." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Missing values per column"
            takeaway={`The device writes −200 for “no reading”. CO truth is missing ${pct(model.missing.find((m) => m.label === "CO(GT)")!.rate)} of the time, hydrocarbons ${pct(model.missing.find((m) => m.label === "NMHC(GT)")!.rate)}.`}
            table={{ columns: ["Column", "Missing"], rows: model.missing.map((m) => [m.label, `${(m.rate * 100).toFixed(1)}%`]) }}
          >
            <BarChart
              data={model.missing.filter((m) => m.rate > 0.01).map((m) => ({ label: m.label.replace("PT08.", "").replace("(GT)", " ✓"), value: m.rate }))}
              format={pct}
              highlight={(d) => d.value > 0.1}
            />
          </ChartCard>
          <ChartCard
            title="CO by hour of day"
            takeaway={`Weekdays peak at ${peakAm}:00 and ${peakPm}:00, traffic rush hours. Weekends stay flatter.`}
            legend={[
              { label: "Weekday", color: S1, shape: "line" },
              { label: "Weekend", color: S2, shape: "line" },
            ]}
            table={{ columns: ["Hour", "Weekday", "Weekend"], rows: prof.Weekday.map((v, h) => [`${h}:00`, v.toFixed(2), prof.Weekend[h].toFixed(2)]) }}
          >
            <LineChart
              series={[
                { name: "Weekday", color: S1, points: prof.Weekday.map((v, h) => [h, v] as [number, number]) },
                { name: "Weekend", color: S2, points: prof.Weekend.map((v, h) => [h, v] as [number, number]) },
              ]}
              xDomain={[0, 23]}
              yDomain={[0, 5]}
              xTicks={[0, 6, 12, 18, 23]}
              xFormat={(v) => `${Math.round(v)}:00`}
              yFormat={(v) => v.toFixed(1)}
            />
          </ChartCard>
          <ChartCard title="Cheap sensor S1 vs the real CO" takeaway="Related, but far from a straight line. One sensor on its own isn't enough.">
            <SensorScatter />
          </ChartCard>
          <ChartCard
            title="Average CO by month"
            takeaway="Higher from October to December, lowest in August (April 2005 has only four days). The seasons change the air, and the sensors."
            table={{ columns: ["Month", "Average CO (mg/m³)"], rows: model.eda.monthly.map((m) => [m.label, m.value.toFixed(2)]) }}
          >
            <BarChart data={model.eda.monthly.map((m) => ({ label: monthLabel(m.label), value: m.value }))} format={(v) => v.toFixed(1)} />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle kicker="Try it" title="Read the cheap sensors, estimate the real CO." line="Hours from the test months (December onward), which the static model never saw. Click one to load its readings." />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Hour" },
            { key: "PT08.S1(CO)", label: "S1", align: "right" },
            { key: "PT08.S2(NMHC)", label: "S2", align: "right" },
            { key: "PT08.S3(NOx)", label: "S3", align: "right" },
            { key: "PT08.S5(O3)", label: "S5", align: "right" },
            { key: "T", label: "°C", align: "right" },
            { key: "predicted", label: "Estimate", align: "right", render: (r) => r.predicted.toFixed(2) },
            { key: "actual", label: "Analyser", align: "right", render: (r) => r.actual.toFixed(1) },
          ]}
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <AirDemo key={sel?.id ?? "default"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title="A random split flatters. Time tells the truth."
          line={`Shuffling hours makes ridge look like ${ridge.random_mae.toFixed(2)} mg/m³ off. Trained before December and tested after, it's ${ridge.time_mae.toFixed(2)}: the sensors drift.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Error: random split vs time split (MAE, mg/m³)"
            takeaway={`Every model looks better on shuffled data. Random forest goes from ${rf.random_mae.toFixed(2)} to ${rf.time_mae.toFixed(2)} once the future is truly unseen.`}
            legend={[
              { label: "Random split", color: S1, shape: "square" },
              { label: "Time split", color: S2, shape: "square" },
            ]}
            table={{ columns: ["Model", "Random MAE", "Random R²", "Time MAE", "Time R²"], rows: model.comparison.map((c) => [c.model, c.random_mae.toFixed(3), c.random_r2.toFixed(3), c.time_mae.toFixed(3), c.time_r2.toFixed(3)]) }}
          >
            <GroupedBars
              groups={model.comparison.map((c) => c.model.replace(" regression", ""))}
              series={[
                { name: "Random split", color: S1, values: model.comparison.map((c) => c.random_mae) },
                { name: "Time split", color: S2, values: model.comparison.map((c) => c.time_mae) },
              ]}
            />
          </ChartCard>
          <ChartCard
            title="Fixing drift: recalibrate every month"
            takeaway={`Retraining on everything known before each month cuts the average monthly error from ${stAvg.toFixed(2)} to ${rcAvg.toFixed(2)}.`}
            legend={[
              { label: "Static (trained before Dec)", color: S2, shape: "line" },
              { label: "Recalibrated monthly", color: INK, shape: "line" },
            ]}
            table={{ columns: ["Month", "Static MAE", "Recalibrated MAE", "Hours"], rows: model.drift.map((d) => [d.month, d.static.toFixed(3), d.recalibrated.toFixed(3), d.hours]) }}
          >
            <LineChart
              series={[
                { name: "Static", color: S2, points: model.drift.map((d, i) => [i, d.static] as [number, number]), dashed: true },
                { name: "Recalibrated", color: INK, points: model.drift.map((d, i) => [i, d.recalibrated] as [number, number]) },
              ]}
              xDomain={[0, model.drift.length - 1]}
              yDomain={[0, 0.6]}
              xTicks={model.drift.map((_, i) => i)}
              xFormat={(v) => (model.drift[Math.round(v)] ? monthLabel(model.drift[Math.round(v)].month) : "")}
              yFormat={(v) => v.toFixed(2)}
              markers
            />
          </ChartCard>
          <ChartCard
            title={`Two weeks in the test period, hour by hour (from ${w.start})`}
            takeaway="The estimate follows the analyser's daily rhythm closely and misses some of the sharpest peaks."
            legend={[
              { label: "Analyser (truth)", color: INK, shape: "line" },
              { label: "Virtual sensor", color: S1, shape: "line" },
            ]}
            className="md:col-span-2"
          >
            <LineChart
              series={[
                { name: "Analyser", color: INK, points: w.ts.map((t, i) => [hoursSince(t), w.actual[i]] as [number, number]) },
                { name: "Virtual sensor", color: S1, points: w.ts.map((t, i) => [hoursSince(t), w.pred[i]] as [number, number]) },
              ]}
              xDomain={[0, 14 * 24]}
              yDomain={[0, 8]}
              xTicks={[0, 48, 96, 144, 192, 240, 288, 336]}
              xFormat={(v) => new Date(t0 + v * 3_600_000).toISOString().slice(5, 10)}
              yFormat={(v) => v.toFixed(0)}
              width={860}
              height={260}
            />
          </ChartCard>
          <ChartCard title="All models" takeaway={`Random forest edges ridge on the time split (${rf.time_mae.toFixed(3)} vs ${ridge.time_mae.toFixed(3)}); ridge stays for its stability and a demo that runs in the browser.`} className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Model", "Random MAE", "Random R²", "Time MAE", "Time R²"],
                rows: model.comparison.map((c) => [c.model, c.random_mae.toFixed(3), c.random_r2.toFixed(3), c.time_mae.toFixed(3), c.time_r2.toFixed(3)]),
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}

function SensorScatter() {
  const W = 420;
  const H = 240;
  const M = { l: 40, r: 8, t: 10, b: 32 };
  const [x0, x1] = [600, 2100];
  const sx = (v: number) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - (v / 10) * (H - M.t - M.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 5, 10].map((v) => (
        <g key={v}>
          <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="rgba(11,11,11,0.07)" />
          <text x={M.l - 6} y={sy(v) + 4} textAnchor="end" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
            {v}
          </text>
        </g>
      ))}
      {[800, 1200, 1600, 2000].map((v) => (
        <text key={v} x={sx(v)} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
          {v}
        </text>
      ))}
      <text x={(W + M.l) / 2} y={H - 2} textAnchor="middle" fontSize="10.5" fill="#5f5f5a">
        S1 response · CO (mg/m³) on the left
      </text>
      {model.eda.scatter.map((p, i) => (
        <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={2.2} fill={INK} fillOpacity={0.3} />
      ))}
    </svg>
  );
}
