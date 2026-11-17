"use client";

import { useState } from "react";
import model from "@/data/models/nyc-taxi-anomaly.json";
import { ChartCard, Heatmap, Histogram, INK, LineChart, S1, S2 } from "../charts";
import { AnomalyDemo } from "../demos/anomaly-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const columns: ColumnDoc[] = [
  { name: "timestamp", type: "datetime", meaning: "Start of each 30-minute window", used: true },
  { name: "value", type: "number", meaning: "Taxi passengers in that window", used: true },
  { name: "combined_windows.json", type: "labels", meaning: "Five known events (marathon, holidays, blizzard), used only to score the detector" },
  { name: "hourly value", type: "derived", meaning: "Two half-hours summed into one hour" },
  { name: "expected", type: "derived", meaning: "Median demand for that weekday and hour" },
  { name: "z", type: "derived", meaning: "How unusual the hour is (robust z-score, 3-hour smoothed)" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const k = (v: number) => `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
const prof = model.eda.hourly_profile;
const peakWeekday = prof.Weekday.indexOf(Math.max(...prof.Weekday));
const peakWeekend = prof.Weekend.indexOf(Math.max(...prof.Weekend));
const flaggedShare = (() => {
  const t = model.default_threshold;
  const n = model.series.z.filter((z) => Math.abs(z) > t).length;
  return { n, share: n / model.series.z.length };
})();
const fmtTime = (s: string) =>
  new Date(s.replace(" ", "T") + "Z").toLocaleString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", hour: "numeric" });

export function TaxiBody() {
  const [sel, setSel] = useState<string | null>(null);
  const rows = model.samples.map((s) => ({ ...s, id: s.time }));
  const drop = model.sweep.find((s) => s.detected < s.of);

  return (
    <>
      <Section id="data">
        <SectionTitle kicker="The data" title="Seven months of New York taxi demand." line="A single number every 30 minutes, plus five events everyone agrees were unusual." />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset on GitHub (Numenta)"
          description="Taxi passenger counts from the NYC Taxi & Limousine Commission, aggregated every 30 minutes and curated by Numenta for its anomaly benchmark, with labelled event windows."
          facts={[
            { label: "raw points", value: model.dataset.points_raw.toLocaleString("en-US") },
            { label: "hours", value: model.dataset.hours.toLocaleString("en-US") },
            { label: "from", value: model.dataset.period[0] },
            { label: "to", value: model.dataset.period[1] },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Demand has a rhythm. Anomalies break it." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Average passengers by hour"
            takeaway={`Weekdays peak around ${peakWeekday}:00, weekends around ${peakWeekend}:00 (late nights).`}
            legend={[
              { label: "Weekday", color: S1, shape: "line" },
              { label: "Weekend", color: S2, shape: "line" },
            ]}
            table={{ columns: ["Hour", "Weekday", "Weekend"], rows: prof.Weekday.map((v, h) => [`${h}:00`, v.toLocaleString("en-US"), prof.Weekend[h].toLocaleString("en-US")]) }}
          >
            <LineChart
              series={[
                { name: "Weekday", color: S1, points: prof.Weekday.map((v, h) => [h, v] as [number, number]) },
                { name: "Weekend", color: S2, points: prof.Weekend.map((v, h) => [h, v] as [number, number]) },
              ]}
              xDomain={[0, 23]}
              yDomain={[0, Math.ceil(Math.max(...prof.Weekday, ...prof.Weekend) / 10000) * 10000]}
              xTicks={[0, 6, 12, 18, 23]}
              xFormat={(v) => `${Math.round(v)}:00`}
              yFormat={k}
            />
          </ChartCard>
          <ChartCard
            title="Typical demand: weekday × hour"
            takeaway="The expected value the detector compares against. Darker means busier."
            table={{ columns: ["Day", ...Array.from({ length: 24 }, (_, h) => `${h}`)], rows: model.eda.heatmap.map((r, d) => [DAYS[d], ...r]) }}
          >
            <Heatmap rows={model.eda.heatmap} rowLabels={DAYS} colLabels={Array.from({ length: 24 }, (_, h) => (h % 6 === 0 ? `${h}h` : null))} format={k} />
          </ChartCard>
          <ChartCard
            title="How unusual each hour is (z-score)"
            takeaway={`Most hours sit near 0. Only ${flaggedShare.n} of ${model.series.z.length.toLocaleString("en-US")} hours (${(flaggedShare.share * 100).toFixed(1)}%) cross ±${model.default_threshold}.`}
            className="md:col-span-2"
            table={{ columns: ["z from", "z to", "Hours"], rows: model.eda.z_hist.counts.map((c, i) => [model.eda.z_hist.bins[i], model.eda.z_hist.bins[i + 1], c]) }}
          >
            <Histogram
              bins={model.eda.z_hist.bins}
              series={[{ name: "Hours", color: INK, values: model.eda.z_hist.counts }]}
              markers={[
                { at: -model.default_threshold, label: `−${model.default_threshold}` },
                { at: model.default_threshold, label: `+${model.default_threshold}` },
              ]}
              xFormat={(v) => String(v)}
              height={200}
              width={860}
            />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle kicker="Try it" title="Jump to a moment, then tune the alarm." line="Click a row to pin that hour on the chart. Then move the threshold." />
        <SampleTable
          rows={rows}
          selected={sel}
          onSelect={(r) => setSel(r.id)}
          columns={[
            { key: "time", label: "Hour", render: (r) => fmtTime(r.time) },
            { key: "value", label: "Passengers", align: "right", render: (r) => r.value.toLocaleString("en-US") },
            { key: "expected", label: "Expected", align: "right", render: (r) => r.expected.toLocaleString("en-US") },
            { key: "z", label: "z", align: "right", render: (r) => r.z.toFixed(2) },
            {
              key: "flag",
              label: `|z| > ${model.default_threshold}`,
              render: (r) => <Pill yes={Math.abs(r.z) > model.default_threshold}>{Math.abs(r.z) > model.default_threshold ? "alert" : "normal"}</Pill>,
            },
          ]}
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <AnomalyDemo key={sel ?? "default"} focus={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle kicker="How well it works" title="Choosing the alarm level." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="False alerts by threshold"
            takeaway={drop ? `All ${drop.of} known events are found up to |z| ${model.sweep[model.sweep.indexOf(drop) - 1]?.threshold}; from ${drop.threshold} one is missed.` : "All known events are found at every threshold tested."}
            table={{ columns: ["Threshold", "Known events found", "False alerts"], rows: model.sweep.map((s) => [s.threshold, `${s.detected}/${s.of}`, s.false_alerts]) }}
          >
            <LineChart
              series={[{ name: "False alerts", color: INK, points: model.sweep.map((s) => [s.threshold, s.false_alerts] as [number, number]) }]}
              xDomain={[2, 6]}
              yDomain={[0, Math.ceil(Math.max(...model.sweep.map((s) => s.false_alerts)) / 20) * 20]}
              xTicks={[2, 3, 4, 5, 6]}
              markers
              vline={{ at: model.default_threshold, label: "chosen" }}
              xLabel="Threshold |z|"
            />
          </ChartCard>
          <ChartCard title="Known events" takeaway="Each labelled window and whether the chosen threshold catches it.">
            <ul className="divide-y divide-line">
              {model.windows.map((w) => {
                const a = new Date(w.start.replace(" ", "T") + "Z").getTime();
                const b = new Date(w.end.replace(" ", "T") + "Z").getTime();
                const t0 = new Date(model.series.start.replace(" ", "T") + "Z").getTime();
                const zs = model.series.z.filter((_, i) => {
                  const t = t0 + i * 3_600_000;
                  return t >= a && t <= b;
                });
                const peak = zs.reduce((m, z) => (Math.abs(z) > Math.abs(m) ? z : m), 0);
                const hit = Math.abs(peak) > model.default_threshold;
                return (
                  <li key={w.name} className="flex items-center justify-between py-2.5 text-[13.5px]">
                    <span className="font-medium">{w.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[12px] text-muted">peak z {peak.toFixed(1)}</span>
                      <Pill yes={hit}>{hit ? "caught" : "missed"}</Pill>
                    </span>
                  </li>
                );
              })}
            </ul>
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
