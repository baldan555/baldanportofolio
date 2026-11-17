"use client";

import { motion } from "framer-motion";
import { Banknote, BookOpen, Wind } from "lucide-react";
import lf from "@/data/models/live-forecasts.json";
import { BarChart, ChartCard, DataTable, INK, LineChart, S1, S2 } from "../charts";
import { LiveForecastDemo } from "../demos/live-forecast-demo";
import { SectionTitle } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const { pm25: PM, fx: FX, wiki: WK } = lf;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GREY = "#b9b6ad";
const n = (v: number) => v.toLocaleString("en-US");
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const dmy = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

const pmBy = (m: string) => PM.comparison.find((c) => c.model === m)!;
const pmL = pmBy("LSTM");
const pmNow = pmBy("Same as now");
const pmDay = pmBy("Same hour yesterday");
const fxBy = (m: string) => FX.comparison.find((c) => c.model.startsWith(m))!;
const fxL = fxBy("LSTM");
const fxRw = fxBy("No change");
const fxDr = fxBy("Long-run drift");
const wkBy = (m: string) => WK.comparison.find((c) => c.model === m)!;
const wkL = wkBy("LSTM");
const wkY = wkBy("Same as yesterday");
const wkBest = [...WK.comparison].filter((c) => c.model !== "LSTM").sort((a, b) => a.mae_log - b.mae_log)[0];
const halfDay = WK.decay.actual.findIndex((v) => v <= 0.5) + 1;

const SOURCES = [
  {
    icon: Wind,
    name: "Jakarta air, PM2.5",
    what: "Fine particles in the air over Jakarta, every hour, from the Copernicus atmosphere model (CAMS) via Open-Meteo.",
    facts: [
      { label: "hourly values", value: n(PM.hours) },
      { label: "since", value: dmy(PM.range[0]) },
      { label: "forecast", value: `${PM.H} hours` },
    ],
    licence: "CC BY 4.0 · non-commercial",
  },
  {
    icon: Banknote,
    name: "Rupiah, USD/IDR",
    what: "The European Central Bank's daily reference rate, crossed to rupiah per US dollar by the Frankfurter API.",
    facts: [
      { label: "business days", value: n(FX.days) },
      { label: "since", value: dmy(FX.range[0]) },
      { label: "forecast", value: `${FX.H} days` },
    ],
    licence: "ECB reference rates",
  },
  {
    icon: BookOpen,
    name: "Wikipedia attention",
    what: "Daily human views of the articles that trended on Indonesian Wikipedia over the past year: what people suddenly want to know.",
    facts: [
      { label: "articles", value: n(WK.articles) },
      { label: "daily windows", value: n(WK.windows) },
      { label: "forecast", value: `${WK.H} days` },
    ],
    licence: "Wikimedia pageviews API",
  },
];

const PIPELINE = [
  { t: "Fetch today", d: "Your browser calls the three public APIs directly: no key, no server of mine" },
  { t: "Window", d: `The last ${PM.L} hours, ${FX.L} business days or ${WK.L} days, scaled as in training` },
  { t: "LSTM", d: "A small recurrent network reads the window step by step, in TypeScript" },
  { t: "Forecast", d: `The next ${PM.H} hours, ${FX.H} business days or ${WK.H} days, from now` },
  { t: "Check yesterday", d: "The forecast it made one horizon ago, against what then happened" },
];


export function LiveBody() {
  const pmMax = Math.max(...pmNow.by_h) * 1.1;
  const wkMax = Math.max(...WK.comparison.flatMap((c) => c.by_h)) * 1.1;
  const bt = PM.backtest;
  const btMax = Math.max(...bt.flatMap((r) => [r[1] as number, r[2] as number, r[3] as number])) * 1.08;
  const monthly = FX.monthly as [string, number][];
  const fxMin = Math.min(...monthly.map((m) => m[1]));
  const fxMax = Math.max(...monthly.map((m) => m[1]));
  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title="Three live signals, always the latest."
          line="Air pollution, a currency and public attention: three series with very different rhythms. Each was trained on years of history, and each is fetched fresh every time you open this page."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {SOURCES.map((s, i) => (
            <motion.div key={s.name} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.08 }} className="flex flex-col rounded-2xl bg-ink p-6 text-white">
              <s.icon className="h-6 w-6" strokeWidth={1.6} />
              <p className="mt-5 text-[1.3rem] leading-tight font-semibold tracking-[-0.02em]">{s.name}</p>
              <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-white/70">{s.what}</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {s.facts.map((f) => (
                  <div key={f.label} className="rounded-xl bg-white/10 px-2.5 py-2">
                    <p className="text-[0.95rem] font-semibold">{f.value}</p>
                    <p className="font-mono text-[9.5px] text-white/55 uppercase">{f.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono text-[10.5px] text-white/50">{s.licence}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {PIPELINE.map((p, i) => (
            <motion.div key={p.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.06 }} className="rounded-2xl border border-line bg-white p-4">
              <p className="font-mono text-[11px] text-muted">0{i + 1}</p>
              <p className="mt-1 text-[14px] font-semibold">{p.t}</p>
              <p className="mt-1 text-[12px] leading-snug text-ink-2/70">{p.d}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Forecasts from right now."
          line="Pick a series. The page pulls the newest data, the LSTM forecasts forward from this moment, and the check below each chart shows how its forecast from one horizon ago actually did."
        />
        <div className="rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <LiveForecastDemo />
        </div>
      </Section>

      <Section id="explore">
        <SectionTitle kicker="What the history says" title="Three rhythms: a daily cycle, a random walk, a spike that fades." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Jakarta PM2.5 by hour of day (median, µg/m³)"
            takeaway={`Air is dirtiest around ${String(PM.by_hour.indexOf(Math.max(...PM.by_hour))).padStart(2, "0")}:00 and cleanest around ${String(PM.by_hour.indexOf(Math.min(...PM.by_hour))).padStart(2, "0")}:00. A daily cycle this strong is why "same hour yesterday" is a tough baseline.`}
            table={{ columns: ["Hour", "Median µg/m³"], rows: PM.by_hour.map((v, h) => [`${String(h).padStart(2, "0")}:00`, v]) }}
          >
            <BarChart data={PM.by_hour.map((v, h) => ({ label: String(h).padStart(2, "0"), value: v }))} format={(v) => v.toFixed(0)} />
          </ChartCard>
          <ChartCard
            title="Jakarta PM2.5 by month (median, µg/m³)"
            takeaway={`The dry season is the worst: ${MONTHS[PM.by_month.indexOf(Math.max(...PM.by_month))]} has the highest median. Over the whole history, ${pct(PM.days_over_who)} of days averaged above the WHO daily guideline of ${PM.who} µg/m³.`}
            table={{ columns: ["Month", "Median µg/m³"], rows: PM.by_month.map((v, i) => [MONTHS[i], v]) }}
          >
            <BarChart data={PM.by_month.map((v, i) => ({ label: MONTHS[i], value: v }))} format={(v) => v.toFixed(0)} highlight={(d) => d.value === Math.max(...PM.by_month)} />
          </ChartCard>
          <ChartCard
            title="USD/IDR since 1999 (monthly average)"
            takeaway={`From about ${n(Math.round(monthly[0][1]))} rupiah per dollar in ${monthly[0][0].slice(0, 4)} to ${n(Math.round(monthly.at(-1)![1]))} now. The long climb is visible; next week's move is not.`}
            table={{ columns: ["Month", "IDR per USD"], rows: monthly.slice(-36).map((m) => [m[0], m[1]]) }}
          >
            <LineChart
              series={[{ name: "USD/IDR", color: INK, points: monthly.map((m, i) => [i, m[1]]) }]}
              xDomain={[0, monthly.length - 1]}
              yDomain={[Math.floor(fxMin / 1000) * 1000, Math.ceil(fxMax / 1000) * 1000]}
              xTicks={monthly.map((m, i) => (m[0].endsWith("-01") && Number(m[0].slice(0, 4)) % 5 === 0 ? i : -1)).filter((i) => i >= 0)}
              xFormat={(i) => monthly[Math.round(i)]?.[0].slice(0, 4) ?? ""}
              yFormat={(v) => n(Math.round(v))}
            />
          </ChartCard>
          <ChartCard
            title={`Wikipedia: views after a spike, as a share of the spike day (${n(WK.decay.spikes)} spikes)`}
            takeaway={`${halfDay > 0 ? `Attention fades fast: by day ${halfDay} the typical article has lost half of its spike-day views.` : `A week after a spike the typical article still keeps ${pct(WK.decay.actual.at(-1)!)} of its spike-day views.`} "Same as yesterday" assumes no fading at all, which is why it loses after spikes.`}
            table={{ columns: ["Day after spike", "Median share of spike-day views"], rows: WK.decay.actual.map((v, k) => [`+${k + 1}`, pct(v, 1)]) }}
          >
            <BarChart data={WK.decay.actual.map((v, k) => ({ label: `+${k + 1}`, value: v * 100 }))} format={(v) => `${v.toFixed(0)}%`} max={100} />
          </ChartCard>
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How good is it, honestly"
          title={`Air: ${pct(1 - pmL.mae / pmDay.mae)} better than the best simple guess. Rupiah: no better than “no change”.`}
          line={`Every model was tested on the most recent stretch of history it never saw (from ${dmy(PM.split.test_from)} for air, ${dmy(FX.split.test_from)} for the rupiah, ${dmy(WK.split.test_from)} for Wikipedia), against the simple guesses a forecaster has to beat.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="PM2.5: average error by hours ahead (µg/m³)"
            takeaway={`Averaged over the 24 hours, the LSTM misses by ${pmL.mae.toFixed(1)} µg/m³, against ${pmDay.mae.toFixed(1)} for "same hour yesterday" and ${pmNow.mae.toFixed(1)} for "same as now". Over ${n(PM.split.test)} test windows.`}
            legend={[
              { label: "LSTM", color: S1, shape: "line" },
              { label: "Same hour yesterday", color: S2, shape: "line" },
              { label: "Same as now", color: GREY, shape: "line" },
            ]}
            table={{ columns: ["Hours ahead", "LSTM", "Same hour yesterday", "Same as now"], rows: pmL.by_h.map((v, k) => [k + 1, v, pmDay.by_h[k], pmNow.by_h[k]]) }}
          >
            <LineChart
              series={[
                { name: "LSTM", color: S1, points: pmL.by_h.map((v, k) => [k + 1, v]) },
                { name: "Same hour yesterday", color: S2, points: pmDay.by_h.map((v, k) => [k + 1, v]), dashed: true },
                { name: "Same as now", color: GREY, points: pmNow.by_h.map((v, k) => [k + 1, v]), dashed: true },
              ]}
              xDomain={[1, PM.H]}
              yDomain={[0, Math.ceil(pmMax / 5) * 5]}
              xTicks={[1, 6, 12, 18, 24]}
              xFormat={(v) => `${Math.round(v)}h`}
              yFormat={(v) => v.toFixed(0)}
            />
          </ChartCard>
          <ChartCard
            title="PM2.5: the last 14 test days, forecast a full day ahead"
            takeaway="Each blue point was forecast 24 hours before it happened. The LSTM follows the daily cycle and most swings; it smooths sharp peaks, a typical price of minimising average error."
            legend={[
              { label: "CAMS estimate", color: INK, shape: "line" },
              { label: "LSTM, 24 h before", color: S1, shape: "line" },
            ]}
            table={{ columns: ["Hour", "CAMS estimate", "LSTM 24 h before", "Same as 24 h before"], rows: bt.slice(-48).map((r) => [String(r[0]).replace("T", " "), r[1], r[2], r[3]]) }}
          >
            <LineChart
              series={[
                { name: "CAMS estimate", color: INK, points: bt.map((r, i) => [i, r[1] as number]) },
                { name: "LSTM, 24 h before", color: S1, points: bt.map((r, i) => [i, r[2] as number]) },
              ]}
              xDomain={[0, bt.length - 1]}
              yDomain={[0, Math.ceil(btMax / 10) * 10]}
              xTicks={bt
                .map((r, i) => (String(r[0]).endsWith("T00:00") ? i : -1))
                .filter((i) => i >= 0)
                .filter((_, k) => k % 3 === 0)}
              xFormat={(i) => {
                const t = String(bt[Math.round(i)]?.[0] ?? "");
                return t ? `${MONTHS[Number(t.slice(5, 7)) - 1]} ${Number(t.slice(8, 10))}` : "";
              }}
              yFormat={(v) => v.toFixed(0)}
            />
          </ChartCard>
          <ChartCard
            title="Rupiah: average error in rupiah, 1 and 5 business days ahead"
            takeaway={`Five days ahead the LSTM misses by Rp ${fxL.mae5.toFixed(0)} on average, "no change" by Rp ${fxRw.mae5.toFixed(0)}: within a few rupiah, because exchange rates move close to a random walk, and ${n(FX.split.test)} test days are not enough to call a winner. The ${pct(fxL.direction ?? 0)} "right direction" score is the trend, not insight: the rupiah weakened in ${pct(FX.up_share)} of test weeks, and the drift guess scores ${pct(fxDr.direction ?? 0)}.`}
          >
            <DataTable
              data={{
                columns: ["Model", "Day 1", "Day 5", "Direction, day 5"],
                rows: FX.comparison.map((c) => [c.model, `Rp ${c.mae1.toFixed(1)}`, `Rp ${c.mae5.toFixed(1)}`, c.direction == null ? "–" : pct(c.direction, 1)]),
              }}
            />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-cream/70 px-3 py-2.5">
                <p className="text-[1.2rem] font-semibold">{pct(FX.band.coverage, 1)}</p>
                <p className="font-mono text-[10px] text-muted uppercase">inside the 80% band</p>
              </div>
              <div className="rounded-xl bg-cream/70 px-3 py-2.5">
                <p className="text-[1.2rem] font-semibold">±{n(Math.round(FX.band.width5_calm / 2))}</p>
                <p className="font-mono text-[10px] text-muted uppercase">day-5 band, calm weeks</p>
              </div>
              <div className="rounded-xl bg-cream/70 px-3 py-2.5">
                <p className="text-[1.2rem] font-semibold">±{n(Math.round(FX.band.width5_rough / 2))}</p>
                <p className="font-mono text-[10px] text-muted uppercase">day-5 band, jumpy weeks</p>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] leading-snug text-ink-2/70">
              What does work is the uncertainty: the band, scaled by the last {FX.vol_window} days&apos; volatility, held {pct(FX.band.coverage_calm, 1)} of outcomes in calm weeks and {pct(FX.band.coverage_rough, 1)} in jumpy ones, against a target of 80%.
            </p>
          </ChartCard>
          <ChartCard
            title="Wikipedia: typical miss by days ahead"
            takeaway={`One LSTM for all ${n(WK.articles)} articles. Its typical miss is ${pct(wkL.typical)} against ${pct(wkBest.typical)} for the best simple guess (${wkBest.model.toLowerCase()}). Right after a spike the gap widens: ${pct(wkL.spike_typical)} vs ${pct(wkY.spike_typical)} for "same as yesterday".`}
            legend={WK.comparison.map((c, i) => ({ label: c.model, color: [S1, S2, GREY, "#1baf7a"][i], shape: "line" as const }))}
            table={{ columns: ["Days ahead", ...WK.comparison.map((c) => c.model)], rows: wkL.by_h.map((_, k) => [k + 1, ...WK.comparison.map((c) => pct(Math.expm1(c.by_h[k]), 1))]) }}
          >
            <LineChart
              series={WK.comparison.map((c, i) => ({ name: c.model, color: [S1, S2, GREY, "#1baf7a"][i], points: c.by_h.map((v, k) => [k + 1, Math.expm1(v) * 100] as [number, number]), dashed: i > 0 }))}
              xDomain={[1, WK.H]}
              yDomain={[0, Math.ceil((Math.expm1(wkMax) * 100) / 10) * 10]}
              xTicks={[1, 2, 3, 4, 5, 6, 7]}
              xFormat={(v) => `+${Math.round(v)}d`}
              yFormat={(v) => `${v.toFixed(0)}%`}
            />
          </ChartCard>
          <ChartCard title="What this project is, and isn't" takeaway="Three small LSTMs trained by me in TensorFlow, run on live data in your browser." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["", "Here"],
                rows: [
                  ["Models", `Three LSTMs (${PM.model.units}, ${FX.model.units} and ${WK.model.units} units) plus a dense output layer, trained in ml/train.py, weights shipped as JSON`],
                  ["Runs on", "Your browser: the LSTM is written in TypeScript and checked against NumPy; the data comes straight from the public APIs"],
                  ["Air", "Beats both simple guesses on 90 test days. Its “actuals” are CAMS model estimates, not sensors, so it learns to forecast that estimate"],
                  ["Rupiah", "Does not beat “no change”. It is shown because an honest forecaster says so; the volatility band is the useful part"],
                  ["Wikipedia", "One model for every article; it can't see news coming, so it can't predict a new spike, only how an existing one fades"],
                  ["Not for", "Health, trading or editorial decisions: a portfolio demonstration of the method"],
                ],
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
