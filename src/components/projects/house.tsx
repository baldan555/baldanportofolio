"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import model from "@/data/models/house-price-range.json";
import { BarChart, ChartCard, DataTable, GroupedBars, INK, S1, S2 } from "../charts";
import { HOOD_NAME, HouseDemo, usd, type HouseSample } from "../demos/house-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const n = (v: number) => v.toLocaleString("en-US");

const SHORT: Record<string, string> = {
  "Linear quantile regression": "Linear quantile",
  "Gradient boosting · quantile loss": "Boosting",
  "Least squares ± fixed band": "Fixed band",
  "Neighbourhood price range": "Neighbourhood",
};

const columns: ColumnDoc[] = [
  { name: "SalePrice", type: "target", meaning: "Sale price in dollars; modelled as log(price)", used: true },
  { name: "Gr Liv Area", type: "number", meaning: "Above-ground living area, sq ft (log)", used: true },
  { name: "Overall Qual · Cond", type: "1–10 · 1–9", meaning: "Assessor's rating of materials and finish · of condition", used: true },
  { name: "Year Built · Remod/Add", type: "year", meaning: "Construction year · last remodel", used: true },
  { name: "Total Bsmt SF · Garage Cars", type: "number", meaning: "Basement area · garage size in cars", used: true },
  { name: "Baths · Fireplaces", type: "number", meaning: "Full + half baths (basement included) · fireplaces", used: true },
  { name: "Lot Area · Kitchen Qual · Central Air", type: "mixed", meaning: "Lot size (log) · kitchen rating · central air yes/no", used: true },
  { name: "Neighborhood · Bldg Type", type: "category", meaning: "24 neighbourhoods with 20+ sales (the rest grouped) · detached, townhouse, duplex…", used: true },
  { name: "Yr Sold", type: "year", meaning: "Used only to split: learn 2006–08, calibrate 2009, test 2010" },
  { name: "PID · Order", type: "id", meaning: "Parcel and row numbers · never used or shown" },
  { name: "60+ other columns", type: "mixed", meaning: "Porches, roof, exterior, pool… left out to keep the model small and readable" },
];

const chosen = model.comparison.find((c) => c.model === model.chosen)!;
const gbm = model.comparison.find((c) => c.model.startsWith("Gradient"))!;
const band = model.comparison.find((c) => c.model.startsWith("Least"))!;
const hood = model.comparison.find((c) => c.model.startsWith("Neighbourhood"))!;
const q50 = model.models.q50;

/** Price vs living area, one dot per sale (random 700), darker = higher quality. */
function Scatter() {
  const W = 860;
  const H = 300;
  const M = { l: 52, r: 12, t: 12, b: 36 };
  const sx = (v: number) => M.l + ((v - 300) / (4100 - 300)) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - (v / 650000) * (H - M.t - M.b);
  const shade = (q: number) => `rgba(42,120,214,${(0.15 + (q / 10) * 0.75).toFixed(2)})`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 200000, 400000, 600000].map((v) => (
        <g key={v}>
          <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="rgba(11,11,11,0.07)" />
          <text x={M.l - 6} y={sy(v) + 4} textAnchor="end" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
            {v === 0 ? "0" : usd(v)}
          </text>
        </g>
      ))}
      {[500, 1000, 1500, 2000, 2500, 3000, 3500, 4000].map((v) => (
        <text key={v} x={sx(v)} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
          {n(v)}
        </text>
      ))}
      <text x={(W + M.l) / 2} y={H - 3} textAnchor="middle" fontSize="10.5" fill="#5f5f5a">
        living area (sq ft)
      </text>
      {model.eda.scatter.map(([a, p, q], i) => (
        <motion.circle key={i} cx={sx(a)} cy={sy(p)} r={2.6} fill={shade(q)} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: (i % 50) * 0.01 }} />
      ))}
    </svg>
  );
}

/** Effect on the middle estimate of one realistic step in each feature. */
function effects() {
  const nm = q50.numeric as Record<string, { scale: number; coef: number }>;
  const step = (f: string, d: number) => Math.exp((nm[f].coef / nm[f].scale) * d) - 1;
  return [
    { label: "+1 quality grade", value: step("Overall Qual", 1) },
    { label: "Central air (vs none)", value: step("air", 1) },
    { label: "+1 bathroom", value: step("baths", 1) },
    { label: "+1 condition grade", value: step("Overall Cond", 1) },
    { label: "+1 garage space", value: step("garage", 1) },
    { label: "+1 fireplace", value: step("Fireplaces", 1) },
    { label: "+1 kitchen grade", value: step("kitchen", 1) },
    { label: "+10% living area", value: Math.exp((nm.log_area.coef / nm.log_area.scale) * Math.log(1.1)) - 1 },
    { label: "+10 years newer", value: step("Year Built", 10) },
    { label: "+500 sq ft basement", value: step("basement", 500) },
  ].sort((a, b) => b.value - a.value);
}

export function HouseBody() {
  const [sel, setSel] = useState<HouseSample | null>(null);
  const e = model.eda;
  const fx = effects();
  const bandLabels = model.by_band.map((b) => b.label);
  const inSample = model.samples.filter((s) => s.kind === "random");

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${n(model.dataset.rows)} home sales, ${model.dataset.columns} columns each.`}
          line={`Every residential sale recorded by the Ames, Iowa assessor from ${model.dataset.years[0]} to ${model.dataset.years[1]}. Typical market sales only: ${n(model.dataset.kept)} remain.`}
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Data documentation (JSE)"
          description={`Compiled by Dean De Cock from the Ames City Assessor's records and published in the Journal of Statistics Education (2011) as a modern replacement for the Boston housing data. Following his advice, the ${model.dataset.dropped_large} houses over 4,000 sq ft and ${model.dataset.dropped_atypical} atypical sales (foreclosures and short sales, family sales, linked-property and adjoining-land deals) were removed. ${model.dataset.license}.`}
          facts={[
            { label: "sales", value: n(model.dataset.rows) },
            { label: "kept", value: n(model.dataset.kept) },
            { label: "columns", value: String(model.dataset.columns) },
            { label: "years", value: `${model.dataset.years[0]}–${model.dataset.years[1]}` },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Size and quality set the price. Location sets the range." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Price against living area"
            takeaway="Bigger homes cost more, but at any size the spread is wide; darker dots (higher quality) sit higher. That spread is exactly what a price range has to capture."
            className="md:col-span-2"
          >
            <Scatter />
          </ChartCard>
          <ChartCard title="Sale prices" takeaway={`Half of all sales are under ${usd(e.median_price)}; a long tail runs past $400k.`} table={{ columns: ["Price", "Sales"], rows: e.price_hist.map((b) => [b.label, b.value]) }}>
            <BarChart data={e.price_hist} />
          </ChartCard>
          <ChartCard
            title="Median price by overall quality"
            takeaway={`Each grade up is worth a lot: from ${usd(e.by_qual.find((b) => b.label === "5")!.value)} at grade 5 to ${usd(e.by_qual.find((b) => b.label === "8")!.value)} at grade 8.`}
            table={{ columns: ["Quality", "Median price", "Sales"], rows: e.by_qual.map((b) => [b.label, `$${n(b.value)}`, b.n]) }}
          >
            <BarChart data={e.by_qual.map((b) => ({ label: b.label, value: b.value }))} format={(v) => usd(v)} />
          </ChartCard>
          <ChartCard
            title="Median price by neighbourhood"
            takeaway={`From ${usd(e.hood_median[0].value)} in ${e.hood_median[0].label} to ${usd(e.hood_median[e.hood_median.length - 1].value)} in ${e.hood_median[e.hood_median.length - 1].label}: a ${(e.hood_median[e.hood_median.length - 1].value / e.hood_median[0].value).toFixed(1)}× gap.`}
            table={{ columns: ["Neighbourhood", "Median price", "Sales"], rows: e.hood_median.map((h) => [h.label, `$${n(h.value)}`, h.n]) }}
            className="md:col-span-2"
          >
            <ul className="grid gap-x-8 gap-y-1.5 pt-1 sm:grid-cols-2">
              {e.hood_median.map((h, i) => (
                <li key={h.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-[12.5px]">
                  <span className="truncate">{h.label}</span>
                  <span className="font-mono text-[11.5px] text-ink-2/70">{usd(h.value)}</span>
                  <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink/6">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: S1 }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.round((h.value / e.hood_median[e.hood_median.length - 1].value) * 1000) / 10}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.02 }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Describe a house, get a price range."
          line="The model learned from 2006–2008 sales and was calibrated on 2009. Click a 2010 sale to see whether its real price landed inside the range."
        />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Sale" },
            { key: "area", label: "Area", align: "right", render: (r) => `${n(r.area)} sq ft` },
            { key: "qual", label: "Quality", align: "right", render: (r) => `${r.qual}/10` },
            { key: "hood", label: "Neighbourhood", render: (r) => HOOD_NAME[r.hood] ?? r.hood },
            { key: "lo", label: "80% range", align: "right", render: (r) => `${usd(r.lo)}–${usd(r.hi)}` },
            { key: "price", label: "Sold for", align: "right", render: (r) => `$${n(r.price)}` },
            { key: "inside", label: "Inside?", render: (r) => <Pill yes={r.inside}>{r.inside ? "Yes" : "No"}</Pill> },
          ]}
          note={`${inSample.length} random 2010 sales (${inSample.filter((s) => s.inside).length} inside their range: a small draw is noisy; across all ${model.split.test} test sales it is ${pct1(chosen.calibrated.coverage)}) plus the 2 biggest misses.`}
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <HouseDemo key={sel?.id ?? "free"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`${pct1(chosen.calibrated.coverage)} of 2010 sales landed inside their 80% range.`}
          line={`Middle estimates are off by ${usd(chosen.mae)} on average (${pct1(chosen.mape)}), on ${model.split.test} sales from a year the model never saw.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Does an 80% range hold 80% of the time?"
            takeaway={`Boosting's raw ranges were overconfident (${pct(gbm.raw.coverage)}). Conformal calibration on 2009 pulled them up to ${pct(gbm.calibrated.coverage)}, still short of 80%: the guarantee assumes next year behaves like the calibration year.`}
            legend={[
              { label: "Raw", color: "#b9b6ad", shape: "square" },
              { label: "Calibrated", color: INK, shape: "square" },
            ]}
            table={{ columns: ["Model", "Raw coverage", "Calibrated coverage"], rows: model.comparison.map((c) => [c.model, pct1(c.raw.coverage), pct1(c.calibrated.coverage)]) }}
          >
            <GroupedBars
              groups={model.comparison.map((c) => SHORT[c.model] ?? c.model)}
              series={[
                { name: "Raw", color: "#b9b6ad", values: model.comparison.map((c) => c.raw.coverage) },
                { name: "Calibrated", color: INK, values: model.comparison.map((c) => c.calibrated.coverage) },
              ]}
              format={pct}
              max={1}
            />
          </ChartCard>
          <ChartCard
            title="Narrow and right beats wide and right"
            takeaway={`Pricing from neighbourhood sales alone gives ranges ${(hood.calibrated.width_pct / chosen.calibrated.width_pct).toFixed(1)}× wider and middle estimates ${(hood.mae / chosen.mae).toFixed(1)}× further off.`}
            legend={[
              { label: "Median range width (% of price)", color: S1, shape: "square" },
              { label: "Middle estimate error (% of price)", color: S2, shape: "square" },
            ]}
          >
            <GroupedBars
              groups={model.comparison.map((c) => SHORT[c.model] ?? c.model)}
              series={[
                { name: "Range width", color: S1, values: model.comparison.map((c) => c.calibrated.width_pct) },
                { name: "Error", color: S2, values: model.comparison.map((c) => c.mape) },
              ]}
              format={pct}
            />
          </ChartCard>
          <ChartCard
            title="Coverage by price level"
            takeaway={`No price group is badly off: coverage runs from ${pct(Math.min(...chosen.by_band.map((b) => b.coverage)))} to ${pct(Math.max(...chosen.by_band.map((b) => b.coverage)))} across groups of about ${Math.round(model.split.test / 4)} sales, within what sampling noise allows.`}
            legend={[
              { label: "Linear quantile", color: INK, shape: "square" },
              { label: "Fixed band", color: "#b9b6ad", shape: "square" },
              { label: "Boosting", color: S2, shape: "square" },
            ]}
            table={{ columns: ["Price group", "Linear quantile", "Fixed band", "Boosting", "Sales"], rows: bandLabels.map((l, i) => [l, pct1(chosen.by_band[i].coverage), pct1(band.by_band[i].coverage), pct1(gbm.by_band[i].coverage), model.by_band[i].n]) }}
          >
            <GroupedBars
              groups={bandLabels.map((l) => l.replace(" 25%", ""))}
              series={[
                { name: "Linear quantile", color: INK, values: chosen.by_band.map((b) => b.coverage) },
                { name: "Fixed band", color: "#b9b6ad", values: band.by_band.map((b) => b.coverage) },
                { name: "Boosting", color: S2, values: gbm.by_band.map((b) => b.coverage) },
              ]}
              format={pct}
              max={1}
            />
          </ChartCard>
          <ChartCard title="What moves the middle estimate" takeaway="Read straight from the model: each line is one realistic change with everything else held equal." table={{ columns: ["Change", "Effect on price"], rows: fx.map((f) => [f.label, `${f.value >= 0 ? "+" : ""}${(f.value * 100).toFixed(1)}%`]) }}>
            <ul className="space-y-2 pt-1">
              {fx.map((f, i) => (
                <li key={f.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[12.5px]">
                  <span>{f.label}</span>
                  <span className="font-mono text-[11.5px]">{`${f.value >= 0 ? "+" : ""}${(f.value * 100).toFixed(1)}%`}</span>
                  <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink/6">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: f.value >= 0 ? S1 : S2 }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.round((Math.abs(f.value) / Math.max(...fx.map((x) => Math.abs(x.value)))) * 1000) / 10}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </ChartCard>
          <ChartCard title="All models" takeaway={`Pinball loss scores all three quantiles at once (lower is better). A plain least-squares line with a fixed band (${pct1(band.calibrated.coverage)} coverage) is a strong rival here; the quantile model edges it on pinball loss.`} className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Model", "Avg error", "Error %", "Pinball", "Coverage raw", "Coverage calibrated", "Range width"],
                rows: model.comparison.map((c) => [c.model + (c.model === model.chosen ? " (shipped)" : ""), `$${n(c.mae)}`, pct1(c.mape), c.pinball.toFixed(4), pct1(c.raw.coverage), pct1(c.calibrated.coverage), pct1(c.calibrated.width_pct)]),
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
