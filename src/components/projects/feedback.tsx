"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import model from "@/data/models/feedback-themes.json";
import { BarChart, ChartCard, DataTable, INK, LineChart, S1, S2 } from "../charts";
import { FeedbackDemo, THEME_COLORS, THEMES, type ReviewSample } from "../demos/feedback-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const n = (v: number) => v.toLocaleString("en-US");

const columns: ColumnDoc[] = [
  { name: "Title · Review Text", type: "text", meaning: "What the customer wrote; themes come from the text, the tone model reads both", used: true },
  { name: "Rating", type: "1–5", meaning: "Stars given; used to read the themes, not to find them", used: true },
  { name: "Recommended IND", type: "0 / 1", meaning: "Would recommend the item: the target of the tone model", used: true },
  { name: "Division · Department · Class", type: "category", meaning: "Product grouping; used to compare themes across departments", used: true },
  { name: "Positive Feedback Count", type: "number", meaning: "Other shoppers who found the review helpful · not used" },
  { name: "Clothing ID", type: "id", meaning: "Which item · not used or shown" },
  { name: "Age", type: "number", meaning: "Reviewer's age · left out (personal attribute)" },
];

const chosen = model.comparison.find((c) => c.model === model.chosen)!;
const themesOnly = model.comparison.find((c) => c.model.includes("theme"))!;
const s = model.shipped;

/** Theme heat by department: share of review content per theme. */
function DeptHeat() {
  const max = Math.max(...model.by_dept.flatMap((d) => d.share));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-1 text-[11.5px]">
        <thead>
          <tr>
            <th />
            {model.by_dept.map((d) => (
              <th key={d.dept} className="px-1 pb-1 text-center font-mono text-[10.5px] font-medium text-ink-2/70 uppercase">
                {d.dept}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {THEMES.map((t, k) => (
            <tr key={t}>
              <td className="pr-2 whitespace-nowrap">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: THEME_COLORS[k] }} />
                {t}
              </td>
              {model.by_dept.map((d) => (
                <td key={d.dept} className="h-8 rounded-md text-center font-mono" style={{ background: `rgba(42,120,214,${(0.06 + (0.7 * d.share[k]) / max).toFixed(3)})`, color: d.share[k] / max > 0.6 ? "#fff" : undefined }}>
                  {pct(d.share[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FeedbackBody() {
  const [sel, setSel] = useState<ReviewSample | null>(null);
  const e = model.eda;
  const three = e.ratings.find((r) => r.label.startsWith("3"))!;
  const byLow = [...model.themes.map((t, i) => ({ ...t, i }))].sort((a, b) => b.in_low / b.in_high - a.in_low / a.in_high);
  const worst = byLow[0];
  const best = [...model.themes].sort((a, b) => b.rating - a.rating)[0];
  const at05 = model.flags.find((f) => Math.abs(f.t - 0.5) < 1e-9)!;

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${n(model.dataset.rows)} clothing reviews, written by real customers.`}
          line={`${n(model.dataset.with_text)} have text, a median of ${model.dataset.words_median} words. Nobody labelled the topics: the themes below were found by the model.`}
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset (OpenML)"
          description={`Anonymised reviews from a women's clothing e-commerce shop, with the shop's name replaced by "retailer" in the text. Each review has a star rating and whether the customer would recommend the item. The reviewer's age is in the data but is not used or shown here. Licence: ${model.dataset.license}.`}
          facts={[
            { label: "reviews", value: n(model.dataset.rows) },
            { label: "with text", value: n(model.dataset.with_text) },
            { label: "median words", value: String(model.dataset.words_median) },
            { label: "would not recommend", value: pct1(model.split.neg_rate) },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Mostly five stars. The useful part is the rest." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Stars given"
            takeaway={`Most reviews are glowing. Three stars is a coin flip: ${pct(three.not_rec)} of 3★ reviewers would not recommend the item.`}
            table={{ columns: ["Rating", "Reviews", "Would not recommend"], rows: e.ratings.map((r) => [r.label, r.value, pct1(r.not_rec)]) }}
          >
            <BarChart data={e.ratings.map((r) => ({ label: r.label, value: r.value }))} />
          </ChartCard>
          <ChartCard title="Review length" takeaway={`A median of ${model.dataset.words_median} words: enough to say what fits, what doesn't and why.`} table={{ columns: ["Words", "Reviews"], rows: e.words_hist.map((w) => [w.label, w.value]) }}>
            <BarChart data={e.words_hist} />
          </ChartCard>
          <ChartCard
            title="Reviews per department"
            takeaway={`Tops and dresses dominate. Average ratings barely differ (${Math.min(...e.depts.map((d) => d.rating)).toFixed(2)} to ${Math.max(...e.depts.map((d) => d.rating)).toFixed(2)}), so stars alone don't say what to fix.`}
            table={{ columns: ["Department", "Reviews", "Avg rating"], rows: e.depts.map((d) => [d.label, d.value, d.rating.toFixed(2)]) }}
            className="md:col-span-2"
          >
            <BarChart data={e.depts.map((d) => ({ label: d.label, value: d.value }))} width={860} height={200} />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Paste a review, see its themes and tone."
          line="Themes come from an unsupervised topic model; the tone comes from a separate classifier trained on the recommend box. Both run in your browser."
        />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "text", label: "Review", render: (r) => (r.text.length > 54 ? `${r.text.slice(0, 52)}…` : r.text) },
            { key: "rating", label: "Stars", align: "right", render: (r) => `${r.rating}★` },
            { key: "dept", label: "Department" },
            { key: "mix", label: "Main theme", render: (r) => THEMES[r.mix.indexOf(Math.max(...r.mix))] },
            { key: "p_neg", label: "Unhappy", align: "right", render: (r) => pct(r.p_neg) },
            { key: "recommended", label: "Recommended", render: (r) => <Pill yes={r.recommended}>{r.recommended ? "Yes" : "No"}</Pill> },
          ]}
          note="8 random reviews from the test split plus the 2 the tone model got most confidently wrong: both read as happy, yet the reviewer ticked 'would not recommend'."
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <FeedbackDemo key={sel?.id ?? "free"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="What it found"
          title={`${model.k} themes, and the one behind the bad reviews.`}
          line={`“${worst.name}” takes up ${pct(worst.in_low)} of what low-rated reviews say, against ${pct(worst.in_high)} in high-rated ones.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="The themes" takeaway="Names are mine, read off each theme's top words and its most typical review. Bigger words weigh more in the theme." className="md:col-span-2">
            <div className="grid gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-5">
              {model.themes.map((t, k) => (
                <motion.div key={t.name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: (k % 5) * 0.06 }} className="flex flex-col rounded-2xl bg-cream/60 p-4">
                  <p className="flex items-center gap-2 text-[13.5px] leading-tight font-semibold">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: THEME_COLORS[k] }} />
                    {t.name}
                  </p>
                  <p className="mt-2 leading-snug">
                    {t.top.slice(0, 8).map(([w, wt]) => (
                      <span key={w} className="mr-1.5 inline-block" style={{ fontSize: `${10.5 + Number(wt) * 5}px`, opacity: 0.45 + Number(wt) * 0.55 }}>
                        {w}
                      </span>
                    ))}
                  </p>
                  <div className="mt-auto flex flex-col gap-0.5 pt-3 font-mono text-[10.5px] text-ink-2/70">
                    <span>{pct(t.share)} of all text</span>
                    <span>{t.rating.toFixed(2)}★ average</span>
                    <span>{pct(t.not_rec)} wouldn&apos;t recommend</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </ChartCard>
          <ChartCard
            title="What unhappy and happy reviews talk about"
            takeaway={`${worst.name} more than doubles in low-rated reviews; ${best.name} is the mark of the happiest ones (${best.rating.toFixed(2)}★ on average).`}
            legend={[
              { label: "1–2★ reviews", color: S2, shape: "square" },
              { label: "4–5★ reviews", color: S1, shape: "square" },
            ]}
            table={{ columns: ["Theme", "Share in 1–2★", "Share in 4–5★"], rows: byLow.map((t) => [t.name, pct1(t.in_low), pct1(t.in_high)]) }}
          >
            <ul className="space-y-2.5 pt-1">
              {byLow.map((t) => {
                const mx = Math.max(...model.themes.flatMap((x) => [x.in_low, x.in_high]));
                return (
                  <li key={t.name} className="text-[12px]">
                    <div className="flex justify-between">
                      <span>{t.name}</span>
                      <span className="font-mono text-ink-2/70">
                        {pct(t.in_low)} / {pct(t.in_high)}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.round((t.in_low / mx) * 1000) / 10}%`, background: S2 }} />
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.round((t.in_high / mx) * 1000) / 10}%`, background: S1 }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </ChartCard>
          <ChartCard title="Themes by department" takeaway="Fabric & cut letdowns lead in tops, dresses and jackets; bottoms are about jeans and waists; intimates are mostly about comfort.">
            <DeptHeat />
          </ChartCard>
          <ChartCard
            title="How many themes?"
            takeaway={`Topic coherence (NPMI: do a theme's top words really appear together?) peaks at ${model.k}; at 12 the themes start repeating each other.`}
            legend={[
              { label: "Coherence (NPMI)", color: INK, shape: "line" },
              { label: "Diversity (unique top words)", color: S2, shape: "line" },
            ]}
            table={{ columns: ["Themes", "NPMI", "Diversity"], rows: model.scan.map((x) => [x.k, x.npmi.toFixed(3), pct(x.diversity)]) }}
          >
            <LineChart
              series={[
                { name: "NPMI ×10", color: INK, points: model.scan.map((x) => [x.k, x.npmi * 10] as [number, number]) },
                { name: "Diversity", color: S2, points: model.scan.map((x) => [x.k, x.diversity] as [number, number]), dashed: true },
              ]}
              xDomain={[6, 12]}
              yDomain={[0.5, 1]}
              xTicks={[6, 8, 10, 12]}
              xFormat={(v) => String(Math.round(v))}
              yFormat={(v) => v.toFixed(2)}
              markers
              xLabel="Number of themes"
            />
          </ChartCard>
          <ChartCard
            title="Flagging unhappy reviews for follow-up"
            takeaway={`Flag reviews above 50%: ${pct(at05.flagged)} of reviews get flagged, ${pct(at05.precision)} of those really wouldn't recommend, and ${pct(at05.recall)} of all unhappy reviewers are caught.`}
            legend={[
              { label: "Precision", color: INK, shape: "line" },
              { label: "Recall", color: S2, shape: "line" },
              { label: "Share flagged", color: S1, shape: "line" },
            ]}
            table={{ columns: ["Threshold", "Flagged", "Precision", "Recall"], rows: model.flags.map((f) => [pct(f.t), pct1(f.flagged), pct1(f.precision), pct1(f.recall)]) }}
          >
            <LineChart
              series={[
                { name: "Precision", color: INK, points: model.flags.map((f) => [f.t, f.precision] as [number, number]) },
                { name: "Recall", color: S2, points: model.flags.map((f) => [f.t, f.recall] as [number, number]) },
                { name: "Flagged", color: S1, points: model.flags.map((f) => [f.t, f.flagged] as [number, number]), dashed: true },
              ]}
              xDomain={[0.1, 0.9]}
              yDomain={[0, 1]}
              xTicks={[0.1, 0.3, 0.5, 0.7, 0.9]}
              xFormat={pct}
              yFormat={pct}
              xLabel="Flag when the model is at least this sure"
            />
          </ChartCard>
          <ChartCard title="Words that move the tone" takeaway="Single words straight from the shipped model's weights; “not” is among the strongest warning signs. The model also uses two-word phrases, not shown here.">
            <div className="grid grid-cols-2 gap-4 pt-1">
              {(
                [
                  ["Towards “wouldn't recommend”", model.words.negative, S2],
                  ["Towards “would recommend”", model.words.positive, S1],
                ] as const
              ).map(([title, words, color]) => (
                <div key={title}>
                  <p className="mb-2 font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase">{title}</p>
                  <div className="flex flex-wrap gap-1">
                    {words.slice(0, 12).map(([w]) => (
                      <span key={w} className="rounded-full px-2 py-0.5 text-[11.5px] text-white" style={{ background: color }}>
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard
            title="All tone models"
            takeaway={`Words carry the signal: the theme mix alone reaches ROC-AUC ${themesOnly.roc_auc.toFixed(2)}, the words model ${chosen.roc_auc.toFixed(2)}. Regularisation picked by ${model.cv.folds}-fold CV on the training split.`}
            className="md:col-span-2"
          >
            <DataTable
              data={{
                columns: ["Model", "ROC-AUC", "Avg precision", "F1", "Accuracy"],
                rows: [
                  ...model.comparison.map((c) => [c.model, c.roc_auc.toFixed(3), c.ap.toFixed(3), c.f1.toFixed(3), pct1(c.acc)]),
                  [`Shipped: ${n(s.ngrams)} n-grams, 8-bit`, s.roc_auc.toFixed(3), s.ap.toFixed(3), s.f1.toFixed(3), pct1(s.acc)],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
