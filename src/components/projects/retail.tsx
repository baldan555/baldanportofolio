"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import model from "@/data/models/product-recommender.json";
import { BarChart, ChartCard, DataTable, GroupedBars, INK, S1, S2 } from "../charts";
import { RetailDemo, type BasketSample } from "../demos/retail-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const n = (v: number) => v.toLocaleString("en-US");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHORT: Record<string, string> = { "Most popular": "Popular", "Co-purchase (confidence)": "Confidence", Lift: "Lift", "Cosine similarity": "Cosine" };
const C = model.catalog;

const columns: ColumnDoc[] = [
  { name: "InvoiceNo", type: "id", meaning: "One order = one basket. Numbers starting with C are cancellations (removed)", used: true },
  { name: "StockCode", type: "id", meaning: "Product code; postage, fees and manual adjustments removed", used: true },
  { name: "Description", type: "text", meaning: "Product name, shown in the demo" },
  { name: "Quantity", type: "number", meaning: "Units on the line; only whether a product is in the basket is used" },
  { name: "InvoiceDate", type: "datetime", meaning: "When the order was placed; used to split train / test by time", used: true },
  { name: "UnitPrice", type: "number", meaning: "Price per unit in pounds sterling; shown, not used" },
  { name: "CustomerID", type: "id", meaning: "Not used and never shown: suggestions depend only on the basket" },
  { name: "Country", type: "category", meaning: "Customer's country; explored, not used" },
];

const chosen = model.comparison.find((c) => c.model === model.chosen)!;
const popular = model.comparison[0];
const lift = model.comparison.find((c) => c.model === "Lift")!;

/** Simple ranked horizontal bars for long labels. */
function HBars({ data, color = INK, format = n }: { data: { label: string; value: number }[]; color?: string; format?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="space-y-2 pt-1">
      {data.map((d, i) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[12.5px]">
          <span className="truncate">{d.label}</span>
          <span className="font-mono text-[11.5px] text-ink-2/70">{format(d.value)}</span>
          <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink/6">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(d.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.04 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RetailBody() {
  const [sel, setSel] = useState<BasketSample | null>(null);
  const e = model.eda;
  const monthly = e.monthly.map((m) => {
    const [y, mo] = m.label.split("-");
    return { label: `${MONTHS[Number(mo) - 1]} ’${y.slice(2)}`, long: `${LONG[Number(mo) - 1]} ${y}`, value: m.value };
  });
  const peak = monthly.reduce((a, b) => (b.value > a.value ? b : a));
  const dow = DAYS.map((label, i) => ({ label, value: (e.by_dow as Record<string, number>)[String(i)] ?? 0 }));
  const busiest = dow.reduce((a, b) => (b.value > a.value ? b : a));
  const abroad = e.countries.filter((c) => c.label !== "United Kingdom").map((c) => ({ label: c.label === "EIRE" ? "Ireland (EIRE)" : c.label, value: c.value }));
  const hits = model.samples.filter((s) => s.hit).length;
  const times = (model.shipped.hit5 / popular.hit5).toFixed(1);

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${n(model.dataset.raw_rows)} order lines, ${n(model.dataset.invoices)} baskets.`}
          line={`A year of orders from a UK online gift shop. After cleaning: ${n(model.dataset.products)} products, a median basket of ${e.basket_median} different items.`}
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset page (UCI)"
          description={`Every order line from ${model.dataset.period[0]} to ${model.dataset.period[1]} at a UK-based online retailer selling gifts and homeware; UCI notes many of its customers are wholesalers. Released by Daqing Chen (London South Bank University) under ${model.dataset.license}. Cancellations (${n(model.dataset.cancelled_rows)} lines), zero prices, postage and fee lines were removed, leaving ${n(model.dataset.rows)} lines.`}
          facts={[
            { label: "order lines", value: n(model.dataset.raw_rows) },
            { label: "baskets", value: n(model.dataset.invoices) },
            { label: "products", value: n(model.dataset.products) },
            { label: "countries", value: String(model.dataset.countries) },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Hearts, lunch bags and a Christmas rush." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Baskets per month"
            takeaway={`Orders build from September to a peak in ${peak.long} (${n(peak.value)} baskets): Christmas stock. The data stops on 9 December 2011, so the last bar is a partial month.`}
            table={{ columns: ["Month", "Baskets"], rows: monthly.map((m) => [m.label, m.value]) }}
            className="md:col-span-2"
          >
            <BarChart data={monthly} highlight={(d) => d.label === peak.label} max={3000} width={860} height={220} />
          </ChartCard>
          <ChartCard
            title="Different products per basket"
            takeaway={`Half the baskets hold ${e.basket_median} or more different products, and the biggest has ${n(e.basket_max)}: plenty of co-purchase signal.`}
            table={{ columns: ["Products in basket", "Baskets"], rows: e.basket_hist.map((b) => [b.label, b.value]) }}
          >
            <BarChart data={e.basket_hist} />
          </ChartCard>
          <ChartCard
            title="Orders by day of week"
            takeaway={`${busiest.label === "Thu" ? "Thursday" : busiest.label} is busiest, and there is not a single order on a Saturday in the whole year.`}
            table={{ columns: ["Day", "Baskets"], rows: dow.map((d) => [d.label, d.value]) }}
          >
            <BarChart data={dow} highlight={(d) => d.label === busiest.label} />
          </ChartCard>
          <ChartCard
            title="Best sellers"
            takeaway="Baskets containing each product, training period (Dec 2010 – Sep 2011)."
            table={{ columns: ["Product", "Baskets"], rows: e.top_products.map((p) => [p.label, p.value]) }}
          >
            <HBars data={e.top_products.slice(0, 8)} />
          </ChartCard>
          <ChartCard
            title={`Outside the UK (the UK is ${pct(e.uk_share)} of baskets)`}
            takeaway="Mostly nearby European countries. The model ignores country: it only looks at what sits together in a basket."
            table={{ columns: ["Country", "Baskets"], rows: e.countries.map((c) => [c.label, c.value]) }}
          >
            <HBars data={abroad} color={S1} />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Build a basket, get suggestions."
          line={`Trained on orders before ${model.split.cut}; the baskets below came later and were never seen. One product was hidden from each: can the rest bring it back?`}
        />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Invoice" },
            { key: "date", label: "Date" },
            { key: "items", label: "Catalog items", align: "right" },
            { key: "hidden", label: "Hidden product", render: (r) => C[r.hidden].name },
            { key: "rank", label: "Model rank", align: "right", render: (r) => (r.rank === null ? "not suggested" : `#${r.rank}`) },
            { key: "hit", label: "Top 5?", render: (r) => <Pill yes={r.hit}>{r.hit ? "Hit" : "Miss"}</Pill> },
          ]}
          note={`A random draw of 8 test baskets (${hits} hits): close to the overall rate of ${pct(model.shipped.hit5)}. Only products from the ${model.catalog_size}-item catalog are counted.`}
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <RetailDemo key={sel?.id ?? "free"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`The hidden product is in the top 5 for ${pct(model.shipped.hit5)} of baskets.`}
          line={`Suggesting the best sellers finds it ${pct1(popular.hit5)} of the time, so the co-purchase model is ${times}× better. Tested on ${n(model.split.tests)} baskets from Oct–Dec 2011.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Hidden product found in the suggestions"
            takeaway={`Cosine similarity beats lift (${pct1(chosen.hit5)} vs ${pct1(lift.hit5)} in the top 5). Lift tends to favour rare products that co-occurred a handful of times; cosine also needs the pair to be common.`}
            legend={[
              { label: "in top 5", color: INK, shape: "square" },
              { label: "in top 10", color: "#b9b6ad", shape: "square" },
            ]}
            table={{ columns: ["Method", "Top 5", "Top 10"], rows: model.comparison.map((c) => [c.model, pct1(c.hit5), pct1(c.hit10)]) }}
          >
            <GroupedBars
              groups={model.comparison.map((c) => SHORT[c.model] ?? c.model)}
              series={[
                { name: "Top 5", color: INK, values: model.comparison.map((c) => c.hit5) },
                { name: "Top 10", color: "#b9b6ad", values: model.comparison.map((c) => c.hit10) },
              ]}
              format={pct}
              max={0.4}
            />
          </ChartCard>
          <ChartCard
            title="By how much of the basket we already know"
            takeaway="Best with two or three items to go on. With ten or more, the hidden product is one of many, and the summed scores spread over more directions."
            legend={[
              { label: "Co-purchase model", color: S1, shape: "square" },
              { label: "Best sellers", color: S2, shape: "square" },
            ]}
            table={{ columns: ["Items known", "Baskets", "Model top 5", "Best sellers top 5"], rows: model.by_size.map((b) => [b.label, b.n, pct1(b.model), pct1(b.popular)]) }}
          >
            <GroupedBars
              groups={model.by_size.map((b) => `${b.label} known`)}
              series={[
                { name: "Model", color: S1, values: model.by_size.map((b) => b.model) },
                { name: "Best sellers", color: S2, values: model.by_size.map((b) => b.popular) },
              ]}
              format={pct}
              max={0.4}
            />
          </ChartCard>
          <ChartCard
            title="All methods"
            takeaway={`Keeping only each product's ${model.shipped.k} closest neighbours (what the browser downloads) costs less than one point: ${pct1(chosen.hit5)} → ${pct1(model.shipped.hit5)}.`}
            className="md:col-span-2"
          >
            <DataTable
              data={{
                columns: ["Method", "How it scores a candidate", "Top 5", "Top 10"],
                rows: [
                  ...model.comparison.map((c) => [
                    c.model,
                    {
                      "Most popular": "How many baskets contain it",
                      "Co-purchase (confidence)": "P(candidate | basket item), summed",
                      Lift: "Confidence ÷ how common the candidate is",
                      "Cosine similarity": "Together ÷ √(count A × count B), summed",
                    }[c.model] ?? "",
                    pct1(c.hit5),
                    pct1(c.hit10),
                  ]),
                  [`Cosine, top ${model.shipped.k} neighbours (shipped)`, "Same, but only each product's closest 20", pct1(model.shipped.hit5), pct1(model.shipped.hit10)],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
