"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import model from "@/data/models/uplift-promo.json";
import { BarChart, ChartCard, DataTable, GroupedBars, Histogram, INK, LineChart, S1, S2 } from "../charts";
import { Segmented } from "../demos/controls";
import { ARM_LABEL, CustomerDemo, TargetingDemo, visitChances, type CustomerSample } from "../demos/uplift-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const pts = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)} pts`;
const n = (v: number) => v.toLocaleString("en-US");

const SHORT: Record<string, string> = {
  "T-learner · logistic": "T · LR",
  "T-learner · boosting": "T · GB",
  "S-learner · boosting": "S · GB",
  "Class transformation · logistic": "Class tr.",
  "Response model (who visits)": "Response",
};

const columns: ColumnDoc[] = [
  { name: "recency", type: "number", meaning: "Months since the last purchase (1–12)", used: true },
  { name: "history", type: "number", meaning: "Dollars spent in the past year; the model uses log(1 + history)", used: true },
  { name: "history_segment", type: "category", meaning: "The same spend in bands · not used (duplicate)" },
  { name: "mens · womens", type: "0 / 1", meaning: "Bought men's / women's merchandise in the past year (not the customer's gender)", used: true },
  { name: "newbie", type: "0 / 1", meaning: "New customer in the past twelve months", used: true },
  { name: "zip_code", type: "category", meaning: "Urban, suburban or rural area (fixed a 'Surburban' typo)", used: true },
  { name: "channel", type: "category", meaning: "Bought by phone, web or both", used: true },
  { name: "segment", type: "treatment", meaning: "Randomly assigned: men's e-mail, women's e-mail or no e-mail", used: true },
  { name: "visit", type: "target", meaning: "Visited the website within two weeks: what the uplift is measured on", used: true },
  { name: "conversion · spend", type: "outcome", meaning: "Bought / dollars spent within two weeks · reported, too rare to model per customer" },
];

const womensCurve = model.curves.womens["T-learner · logistic"];
const half = womensCurve[10] / womensCurve[womensCurve.length - 1];

/** Forest plot: the e-mail effect inside each customer group, with 95% intervals. */
function EffectByGroup() {
  const [dim, setDim] = useState(model.subgroups[0].dim);
  const g = model.subgroups.find((s) => s.dim === dim)!;
  const lo = -0.02;
  const hi = 0.18;
  const x = (v: number) => `${((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 100}%`;
  return (
    <div>
      <Segmented label="Split customers by" value={dim} options={model.subgroups.map((s) => s.dim)} onChange={setDim} />
      <div className="mt-5 space-y-4">
        {g.rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[130px_1fr] items-center gap-3 sm:grid-cols-[170px_1fr]">
            <div>
              <p className="text-[13px] font-medium">{r.label}</p>
              <p className="font-mono text-[10.5px] text-muted">{n(r.n)} customers</p>
            </div>
            <div className="relative h-11 rounded-lg bg-cream/50">
              <span className="absolute inset-y-0 w-px bg-ink/30" style={{ left: x(0) }} />
              {(["mens", "womens"] as const).map((arm, k) => {
                const [e, a, b] = r[arm];
                const color = arm === "mens" ? S1 : S2;
                return (
                  <div key={arm} className="absolute h-0" style={{ top: k ? "70%" : "30%", left: 0, right: 0 }}>
                    <motion.span
                      className="absolute h-[3px] -translate-y-1/2 rounded-full"
                      style={{ background: color, left: x(a), width: `calc(${x(b)} - ${x(a)})` }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5 }}
                      key={dim + r.label + arm}
                    />
                    <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ background: color, left: x(e) }} title={`${ARM_LABEL[arm]}: ${pts(e)} (${pts(a)} to ${pts(b)})`} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[130px_1fr] gap-3 sm:grid-cols-[170px_1fr]">
          <span />
          <div className="relative h-4 font-mono text-[10px] text-muted">
            {[0, 0.05, 0.1, 0.15].map((v) => (
              <span key={v} className="absolute -translate-x-1/2" style={{ left: x(v) }}>
                {v === 0 ? "0" : `+${v * 100}`}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-ink-2/70">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: S1 }} /> men&apos;s e-mail
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: S2 }} /> women&apos;s e-mail
        </span>
        <span>dot = extra visits per 100 customers, line = 95% interval</span>
      </div>
    </div>
  );
}

export function UpliftBody() {
  const [sel, setSel] = useState<CustomerSample | null>(null);
  const rates = model.rates;
  const ate = model.ate;
  const bought = model.subgroups.find((s) => s.dim === "Bought before")!;
  const mensOnly = bought.rows.find((r) => r.label === "Men's only")!;
  const womensOnly = bought.rows.find((r) => r.label === "Women's only")!;
  const hist = model.uplift_hist;
  const toShare = (c: number[]) => {
    const t = c.reduce((a, b) => a + b, 0);
    return c.map((v) => v / t);
  };
  const g = model.curves.grid;
  const bud = model.budget;
  const pol = model.policies as Record<string, number>;
  const mensShares = toShare(hist.mens.counts);
  const menBand = mensShares[hist.mens.bins.findIndex((b) => Math.abs(b - 0.06) < 1e-9)];

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${n(model.dataset.rows)} customers, one randomised e-mail test.`}
          line="A third got a men's e-mail, a third a women's e-mail, a third nothing. Then the shop counted who visited its website in the next two weeks."
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Kevin Hillstrom's blog (2008)"
          description={`Released by Kevin Hillstrom (MineThatData) for an open e-mail analytics challenge. Customers had all bought something in the past twelve months; the e-mail they received was decided at random, which is what makes a cause-and-effect answer possible. ${model.dataset.license}; it is widely used in uplift-modelling libraries.`}
          facts={[
            { label: "customers", value: n(model.dataset.rows) },
            { label: "groups", value: `3 × ~${n(Math.round(model.dataset.rows / 3 / 100) * 100)}` },
            { label: "follow-up", value: `${model.dataset.window_days} days` },
            { label: "visit rate, no e-mail", value: pct1(rates.none.visit) },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Both e-mails work. Not for the same people." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Visited within two weeks"
            takeaway={`The men's e-mail lifts visits from ${pct1(rates.none.visit)} to ${pct1(rates.mens.visit)}; the women's to ${pct1(rates.womens.visit)}.`}
            table={{ columns: ["Group", "Customers", "Visit", "Bought", "Spend ($)"], rows: (["none", "mens", "womens"] as const).map((k) => [ARM_LABEL[k], rates[k].n, pct1(rates[k].visit), pct1(rates[k].conversion), rates[k].spend.toFixed(2)]) }}
          >
            <BarChart data={(["none", "mens", "womens"] as const).map((k) => ({ label: ARM_LABEL[k], value: rates[k].visit }))} format={pct1} max={0.2} />
          </ChartCard>
          <ChartCard title="Average effect, with 95% intervals" takeaway="Visits move a lot; purchases move too, but they are rare (about 1 in 100), so uplift per customer is modelled on visits.">
            <DataTable
              data={{
                columns: ["Outcome", "Men's e-mail", "Women's e-mail"],
                rows: [
                  ["Visited", `${pts(ate.mens.visit[0])} (${pts(ate.mens.visit[1])} to ${pts(ate.mens.visit[2])})`, `${pts(ate.womens.visit[0])} (${pts(ate.womens.visit[1])} to ${pts(ate.womens.visit[2])})`],
                  ["Bought", `${pts(ate.mens.conversion[0])} (${pts(ate.mens.conversion[1])} to ${pts(ate.mens.conversion[2])})`, `${pts(ate.womens.conversion[0])} (${pts(ate.womens.conversion[1])} to ${pts(ate.womens.conversion[2])})`],
                  ["Spend per customer", `+$${ate.mens.spend[0].toFixed(2)} ($${ate.mens.spend[1].toFixed(2)} to $${ate.mens.spend[2].toFixed(2)})`, `+$${ate.womens.spend[0].toFixed(2)} ($${ate.womens.spend[1].toFixed(2)} to $${ate.womens.spend[2].toFixed(2)})`],
                ],
              }}
            />
          </ChartCard>
          <ChartCard
            title="Where each e-mail works"
            takeaway={`The women's e-mail barely moves customers who only bought men's products (${pts(mensOnly.womens[0])}), against ${pts(womensOnly.womens[0])} for women's-only buyers. The men's e-mail works almost everywhere.`}
            table={{ columns: ["Split", "Group", "Customers", "Men's e-mail", "Women's e-mail"], rows: model.subgroups.flatMap((s) => s.rows.map((r) => [s.dim, r.label, r.n, pts(r.mens[0]), pts(r.womens[0])])) }}
            className="md:col-span-2"
          >
            <EffectByGroup />
          </ChartCard>
          <ChartCard
            title="Predicted uplift per customer"
            takeaway={`Men's e-mail: ${pct(menBand)} of customers sit in one narrow band, +6 to +8 points. Women's e-mail: two groups, one from −2 to +4 points and one from +6 to +10.`}
            legend={[
              { label: "Men's e-mail", color: S1, shape: "square" },
              { label: "Women's e-mail", color: S2, shape: "square" },
            ]}
            className="md:col-span-2"
          >
            <Histogram
              bins={hist.mens.bins}
              series={[
                { name: "Men's e-mail", color: S1, values: toShare(hist.mens.counts) },
                { name: "Women's e-mail", color: S2, values: toShare(hist.womens.counts) },
              ]}
              format={pct}
              xFormat={(v) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}`}
              width={860}
              height={220}
            />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Spend fewer e-mails, keep the effect."
          line="First pick a campaign and a budget. Then build a customer and see which e-mail, if any, is worth sending."
        />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <TargetingDemo />
        </div>
        <div className="mt-8">
          <SampleTable
            rows={model.samples}
            selected={sel?.id}
            onSelect={setSel}
            columns={[
              { key: "id", label: "Customer" },
              { key: "recency", label: "Last buy", align: "right", render: (r) => `${r.recency} mo` },
              { key: "history", label: "Spent", align: "right", render: (r) => `$${Math.round(r.history)}` },
              { key: "mens", label: "Bought", render: (r) => (r.mens && r.womens ? "Both" : r.mens ? "Men's" : "Women's") },
              { key: "got", label: "Got", render: (r) => ARM_LABEL[r.got as keyof typeof ARM_LABEL] },
              { key: "visited", label: "Visited", render: (r) => <Pill yes={r.visited}>{r.visited ? "Yes" : "No"}</Pill> },
              {
                key: "p",
                label: "Best e-mail",
                render: (r) => {
                  const p = visitChances(r);
                  const um = p.mens - p.none;
                  const uw = p.womens - p.none;
                  return Math.max(um, uw) < 0.01 ? "None" : um >= uw ? `Men's ${pts(um)}` : `Women's ${pts(uw)}`;
                },
              },
            ]}
            note="Three customers from each group, two who didn't visit and one who did. What they actually got was random; the last column is what the model would send."
          />
          <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
            <DemoHeader />
            <CustomerDemo key={sel?.id ?? "free"} preset={sel} />
          </div>
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`Half the women's e-mails, ${pct(half)} of the effect.`}
          line="Every score here is out-of-fold and measured against the randomised control group, the only fair way to check uplift."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Qini: extra visits above random targeting"
            takeaway="For the women's e-mail every uplift method clearly beats ranking by who is likely to visit. For the men's e-mail all areas are small, and the plain response model even does best: there is little to find."
            legend={[
              { label: "Men's e-mail", color: S1, shape: "square" },
              { label: "Women's e-mail", color: S2, shape: "square" },
            ]}
            table={{ columns: ["Method", "Men's", "Women's"], rows: model.comparison.map((c) => [c.model, c.mens.qini.toFixed(2), c.womens.qini.toFixed(2)]) }}
          >
            <GroupedBars
              groups={model.comparison.map((c) => SHORT[c.model] ?? c.model)}
              series={[
                { name: "Men's", color: S1, values: model.comparison.map((c) => c.mens.qini) },
                { name: "Women's", color: S2, values: model.comparison.map((c) => c.womens.qini) },
              ]}
              format={(v) => v.toFixed(1)}
            />
          </ChartCard>
          <ChartCard
            title="Women's e-mail: uplift curves"
            takeaway={`Ranked by the T-learner, e-mailing half the list gives ${womensCurve[10].toFixed(1)} of the ${womensCurve[womensCurve.length - 1].toFixed(1)} extra visits per 1,000 that e-mailing everyone would.`}
            legend={[
              { label: "T-learner · logistic", color: INK, shape: "line" },
              { label: "Class transformation", color: S1, shape: "line" },
              { label: "Response model", color: S2, shape: "line" },
            ]}
          >
            <LineChart
              series={[
                { name: "Random", color: "#b9b6ad", points: g.map((x) => [x, x * womensCurve[womensCurve.length - 1]] as [number, number]), dashed: true },
                { name: "Response", color: S2, points: g.map((x, i) => [x, model.curves.womens["Response model (who visits)"][i]] as [number, number]), dashed: true },
                { name: "Class transformation", color: S1, points: g.map((x, i) => [x, model.curves.womens["Class transformation · logistic"][i]] as [number, number]) },
                { name: "T-learner", color: INK, points: g.map((x, i) => [x, womensCurve[i]] as [number, number]) },
              ]}
              xDomain={[0, 1]}
              yDomain={[0, 50]}
              xFormat={pct}
              yFormat={(v) => String(Math.round(v))}
              xLabel="Share of customers e-mailed"
              yLabel="Extra visits / 1,000"
            />
          </ChartCard>
          <ChartCard
            title="One e-mail per customer, either kind"
            takeaway="Choosing who gets an e-mail, and which one, beats random at every budget. Here a plain response model does as well or slightly better, because most of the gain comes from the men's e-mail, which works on almost everyone."
            legend={[
              { label: "Uplift model", color: INK, shape: "line" },
              { label: "Response model", color: S2, shape: "line" },
              { label: "Random", color: "#b9b6ad", shape: "line" },
            ]}
            table={{ columns: ["Share e-mailed", "Uplift model", "Response model", "Random"], rows: bud.map((b) => [pct(b.q), b.model, b.response, b.random]) }}
          >
            <LineChart
              series={[
                { name: "Random", color: "#b9b6ad", points: bud.map((b) => [b.q, b.random] as [number, number]), dashed: true },
                { name: "Response", color: S2, points: bud.map((b) => [b.q, b.response] as [number, number]), dashed: true },
                { name: "Uplift", color: INK, points: bud.map((b) => [b.q, b.model] as [number, number]) },
              ]}
              xDomain={[0, 1]}
              yDomain={[100, 190]}
              xFormat={pct}
              yFormat={(v) => String(Math.round(v))}
              xLabel="Share of customers e-mailed"
              yLabel="Visits / 1,000"
            />
          </ChartCard>
          <ChartCard
            title="If everyone gets an e-mail anyway"
            takeaway={`Send the men's one. Picking the best e-mail per customer gives ${pol["Everyone · best e-mail per customer"]} visits per 1,000 against ${pol["Everyone · men's e-mail"]}: no real difference.`}
          >
            <DataTable data={{ columns: ["Policy", "Visits per 1,000 customers"], rows: Object.entries(pol).map(([k, v]) => [k, v.toFixed(1)]) }} />
            <p className="mt-3 text-[12px] text-muted">Estimated from the randomised groups by inverse-propensity weighting: each customer counts when the e-mail they got matches the policy.</p>
          </ChartCard>
          <ChartCard title="All methods" takeaway="Qini = average gap between a method's curve and random targeting. Top 30% = extra visits per 1,000 customers when only the best-ranked 30% are e-mailed." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Method", "Qini · men's", "Qini · women's", "Top 30% · men's", "Top 30% · women's"],
                rows: model.comparison.map((c) => [c.model + (c.model === model.chosen ? " (shipped)" : ""), c.mens.qini.toFixed(2), c.womens.qini.toFixed(2), c.mens.top30.toFixed(1), c.womens.top30.toFixed(1)]),
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
