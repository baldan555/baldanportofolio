"use client";

import { useState } from "react";
import model from "@/data/models/mall-segments.json";
import { BarChart, ChartCard, DataTable, Histogram, INK, LineChart } from "../charts";
import { ClusterDemo, type MallSample } from "../demos/cluster-demo";
import { DatasetCard, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const SOURCE = "https://github.com/SteffiPeTaffy/machineLearningAZ";

const columns: ColumnDoc[] = [
  { name: "CustomerID", type: "id", meaning: "Member number" },
  { name: "Genre", type: "category", meaning: "Gender of the member" },
  { name: "Age", type: "number", meaning: "Age in years" },
  { name: "Annual Income (k$)", type: "number", meaning: "Yearly income in thousands of dollars", used: true },
  { name: "Spending Score (1-100)", type: "number", meaning: "Score the mall gives from purchase behaviour", used: true },
];

const bestSil = model.elbow.find((e) => e.k === model.best_k)!.silhouette;
const segName = (id: number) => model.segments.find((s) => s.id === id)?.name ?? `Segment ${id + 1}`;
const biggest = [...model.segments].sort((a, b) => b.size - a.size)[0];

export function MallBody() {
  const [sel, setSel] = useState<MallSample | null>(null);
  const inc = model.eda.income_hist;
  const sc = model.eda.score_hist;

  return (
    <>
      <Section id="data">
        <SectionTitle kicker="The data" title={`${model.dataset.rows} mall members, no labels.`} line="Nobody told the model which shopper is which. It has to find the groups itself." />
        <DatasetCard
          name={model.dataset.name}
          source={SOURCE}
          sourceLabel="Copy used (GitHub mirror)"
          description="A small teaching dataset of mall members: age, gender, yearly income and a spending score the mall assigns from purchase behaviour. Widely mirrored; this project uses a public GitHub copy."
          facts={[
            { label: "members", value: String(model.dataset.rows) },
            { label: "columns", value: String(model.dataset.raw_cols) },
            { label: "women / men", value: `${model.eda.gender.Female} / ${model.eda.gender.Male}` },
            { label: "features used", value: "2" },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Before clustering, look at the shape." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Annual income"
            takeaway="Members per $10k band."
            table={{ columns: ["Income (k$)", "Members"], rows: inc.counts.map((c, i) => [`${inc.bins[i]}–${inc.bins[i + 1]}`, c]) }}
          >
            <Histogram bins={inc.bins} series={[{ name: "Members", color: INK, values: inc.counts }]} xFormat={(v) => `${v}k`} />
          </ChartCard>
          <ChartCard
            title="Spending score"
            takeaway="Members per 10-point band."
            table={{ columns: ["Score", "Members"], rows: sc.counts.map((c, i) => [`${sc.bins[i]}–${sc.bins[i + 1]}`, c]) }}
          >
            <Histogram bins={sc.bins} series={[{ name: "Members", color: INK, values: sc.counts }]} />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle kicker="Try it" title="Pick a member, see their segment." line="Click a row to drop that member on the map, or click the chart to add your own." />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Member" },
            { key: "gender", label: "Gender" },
            { key: "age", label: "Age", align: "right" },
            { key: "income", label: "Income k$", align: "right" },
            { key: "score", label: "Score", align: "right" },
            {
              key: "segment",
              label: `Segment (k=${model.best_k})`,
              render: (r) => (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[r.segment] }} />
                  {segName(r.segment)}
                </span>
              ),
            },
          ]}
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <ClusterDemo key={sel?.id ?? "default"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle kicker="How well it works" title={`Why k = ${model.best_k}?`} line="Two views of the same runs: tighter clusters (inertia) and better-separated clusters (silhouette)." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Elbow: inertia by k"
            takeaway="Lower is tighter. The curve bends, but the elbow alone is a judgement call."
            table={{ columns: ["k", "Inertia", "Silhouette"], rows: model.elbow.map((e) => [e.k, e.inertia.toLocaleString("en-US"), e.silhouette.toFixed(3)]) }}
          >
            <LineChart
              series={[{ name: "Inertia", color: INK, points: model.elbow.map((e) => [e.k, e.inertia] as [number, number]) }]}
              xDomain={[2, 8]}
              yDomain={[0, Math.ceil(Math.max(...model.elbow.map((e) => e.inertia)) / 50000) * 50000]}
              xTicks={[2, 3, 4, 5, 6, 7, 8]}
              yFormat={(v) => `${Math.round(v / 1000)}k`}
              markers
              vline={{ at: model.best_k, label: "chosen" }}
              xLabel="k (number of segments)"
            />
          </ChartCard>
          <ChartCard title="Silhouette by k" takeaway={`Higher is better separated. Peaks at k = ${model.best_k} (${bestSil.toFixed(3)}), so that's the pick.`}>
            <LineChart
              series={[{ name: "Silhouette", color: INK, points: model.elbow.map((e) => [e.k, e.silhouette] as [number, number]) }]}
              xDomain={[2, 8]}
              yDomain={[0, 0.7]}
              xTicks={[2, 3, 4, 5, 6, 7, 8]}
              yFormat={(v) => v.toFixed(2)}
              markers
              vline={{ at: model.best_k, label: "chosen" }}
              xLabel="k (number of segments)"
            />
          </ChartCard>
          <ChartCard title="Segment profiles" takeaway={`The biggest group is "${biggest.name}" with ${biggest.size} members.`} className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Segment", "Members", "Avg income (k$)", "Avg score", "Avg age", "Women"],
                rows: model.segments.map((s) => [s.name, s.size, s.centroid[0].toFixed(1), s.centroid[1].toFixed(1), s.avg_age.toFixed(1), `${Math.round(s.female_share * 100)}%`]),
              }}
            />
            <div className="mt-4">
              <BarChart
                data={model.segments.map((s) => ({ label: s.name.split(",")[0] + (s.name.includes("big") ? " · big" : s.name.includes("careful") ? " · careful" : " · avg"), value: s.size }))}
                height={200}
                width={860}
              />
            </div>
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
