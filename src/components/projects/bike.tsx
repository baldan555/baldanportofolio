"use client";

import { useState } from "react";
import model from "@/data/models/demand-forecasting.json";
import { BarChart, ChartCard, DataTable, INK, LineChart, S1, S2 } from "../charts";
import { ForecastDemo, type BikeSample } from "../demos/forecast-demo";
import { DatasetCard, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEATHER = ["Clear", "Mist / cloudy", "Light rain / snow"];
const k = (v: number) => `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;

const columns: ColumnDoc[] = [
  { name: "instant · dteday", type: "id / date", meaning: "Row number and date" },
  { name: "season · yr · mnth", type: "calendar", meaning: "Season, year (2011/2012) and month", used: true },
  { name: "holiday", type: "yes/no", meaning: "Public holiday in Washington D.C.", used: true },
  { name: "weekday · workingday", type: "calendar", meaning: "Day of week; working day = not weekend or holiday", used: true },
  { name: "weathersit", type: "1–4", meaning: "Clear · mist · light rain/snow · heavy rain (never occurs daily)", used: true },
  { name: "temp · atemp", type: "number", meaning: "Temperature / feels-like, scaled by 41 °C and 50 °C. Model uses temp, converted back to °C", used: true },
  { name: "hum · windspeed", type: "number", meaning: "Humidity (÷100) and wind speed (÷67), converted back for the model", used: true },
  { name: "casual · registered", type: "count", meaning: "Rentals by casual vs registered users (not used: they add up to the answer)" },
  { name: "cnt", type: "target", meaning: "Total rentals that day: the thing we forecast", used: true },
];

const chosen = model.comparison.find((c) => c.model === model.chosen)!;
const naive = model.comparison.find((c) => c.model.startsWith("Seasonal"))!;
const sandyIdx = model.series.cnt.indexOf(Math.min(...model.series.cnt));

export function BikeBody() {
  const [sel, setSel] = useState<BikeSample | null>(null);
  const m = model.eda.monthly;
  const wd = model.eda.by_weekday;
  const weather = model.eda.by_weather;
  const growth = model.dataset.mean_2012 / model.dataset.mean_2011 - 1;

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${model.dataset.rows} days of bike rentals.`}
          line={`${model.dataset.period[0]} to ${model.dataset.period[1]}: one row per day with the calendar, the weather and how many bikes were rented.`}
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset on UCI"
          description="Daily rentals from Capital Bikeshare in Washington D.C., joined with weather and the city's holiday calendar by Hadi Fanaee-T and João Gama (2013)."
          facts={[
            { label: "days", value: String(model.dataset.rows) },
            { label: "avg / day 2011", value: model.dataset.mean_2011.toLocaleString("en-US") },
            { label: "avg / day 2012", value: model.dataset.mean_2012.toLocaleString("en-US") },
            { label: "growth", value: `+${Math.round(growth * 100)}%` },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Trend, season, weekday, weather." line="Four forces stack on top of each other. A good forecaster needs all of them." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Every day, two years"
            takeaway={`Summer peaks, winter dips, and 2012 sits well above 2011. The lowest point is ${new Date(Date.UTC(2011, 0, 1) + sandyIdx * 86_400_000).toISOString().slice(0, 10)}: Hurricane Sandy (${model.series.cnt[sandyIdx]} rentals).`}
            className="md:col-span-2"
          >
            <LineChart
              series={[{ name: "Rentals", color: INK, points: model.series.cnt.map((v, i) => [i, v] as [number, number]) }]}
              xDomain={[0, model.series.cnt.length - 1]}
              yDomain={[0, 9000]}
              xTicks={[0, 181, 365, 546, 730]}
              xFormat={(v) => new Date(Date.UTC(2011, 0, 1) + Math.round(v) * 86_400_000).toISOString().slice(0, 7)}
              yFormat={k}
              vline={{ at: sandyIdx, label: "Sandy" }}
              width={860}
              height={240}
            />
          </ChartCard>
          <ChartCard
            title="Average rentals by month"
            takeaway={`Same seasonal shape both years; 2012 runs about ${Math.round(growth * 100)}% higher.`}
            legend={[
              { label: "2011", color: S1, shape: "line" },
              { label: "2012", color: S2, shape: "line" },
            ]}
            table={{ columns: ["Month", "2011", "2012"], rows: m["2011"].map((v, i) => [MONTHS[i], v.toLocaleString("en-US"), m["2012"][i].toLocaleString("en-US")]) }}
          >
            <LineChart
              series={[
                { name: "2011", color: S1, points: m["2011"].map((v, i) => [i + 1, v] as [number, number]) },
                { name: "2012", color: S2, points: m["2012"].map((v, i) => [i + 1, v] as [number, number]) },
              ]}
              xDomain={[1, 12]}
              yDomain={[0, 8000]}
              xTicks={[1, 3, 5, 7, 9, 11]}
              xFormat={(v) => MONTHS[Math.round(v) - 1]}
              yFormat={k}
              markers
            />
          </ChartCard>
          <ChartCard
            title="Who rides when"
            takeaway={`Casual riders peak at weekends (${wd.casual[6].toLocaleString("en-US")} on Saturdays); registered riders on weekdays.`}
            legend={[
              { label: "Registered", color: S1, shape: "line" },
              { label: "Casual", color: S2, shape: "line" },
            ]}
            table={{ columns: ["Day", "Registered", "Casual"], rows: DAYS.map((d, i) => [d, wd.registered[i].toLocaleString("en-US"), wd.casual[i].toLocaleString("en-US")]) }}
          >
            <LineChart
              series={[
                { name: "Registered", color: S1, points: wd.registered.map((v, i) => [i, v] as [number, number]) },
                { name: "Casual", color: S2, points: wd.casual.map((v, i) => [i, v] as [number, number]) },
              ]}
              xDomain={[0, 6]}
              yDomain={[0, 5000]}
              xTicks={[0, 1, 2, 3, 4, 5, 6]}
              xFormat={(v) => DAYS[Math.round(v)]}
              yFormat={k}
              markers
            />
          </ChartCard>
          <ChartCard
            title="Temperature vs rentals"
            takeaway="Rentals climb with warmth, then flatten and dip on the hottest days, so the model gets temperature and temperature²."
          >
            <TempScatter />
          </ChartCard>
          <ChartCard
            title="Average rentals by weather"
            takeaway={`Light rain or snow cuts a typical day from ${weather[0].value.toLocaleString("en-US")} to ${weather[2].value.toLocaleString("en-US")} rentals (only ${weather[2].n} such days).`}
            table={{ columns: ["Weather", "Average rentals", "Days"], rows: weather.map((w) => [WEATHER[Number(w.label) - 1], w.value.toLocaleString("en-US"), w.n]) }}
          >
            <BarChart data={weather.map((w) => ({ label: WEATHER[Number(w.label) - 1], value: w.value, n: w.n }))} format={k} />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle
          kicker="Try it"
          title="Travel back in time, or plan a day."
          line="Replay the 2012 backtest week by week, or load one of these days into the planner. The forecast column shows what the backtest predicted before that day happened."
        />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Date" },
            { key: "label", label: "What kind of day" },
            { key: "weekday", label: "Day", render: (r) => DAYS[r.weekday] },
            { key: "weathersit", label: "Weather", render: (r) => WEATHER[r.weathersit - 1] },
            { key: "temp_c", label: "°C", align: "right" },
            { key: "forecast", label: "Forecast", align: "right", render: (r) => (r.forecast === null ? "–" : r.forecast.toLocaleString("en-US")) },
            { key: "actual", label: "Actual", align: "right", render: (r) => r.actual.toLocaleString("en-US") },
          ]}
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <ForecastDemo key={sel?.id ?? "default"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title={`${Math.round((1 - chosen.mae / naive.mae) * 100)}% less error than “same as last week”.`}
          line={`Rolling backtest: ${model.backtest.origins} starting points from ${model.backtest.first} to ${model.backtest.last}, each forecasting the next ${model.backtest.horizon} days using only the past.`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Average error per day (MAE, bikes)"
            takeaway="Calendar features beat the naive guess; adding weather cuts the error again."
            table={{ columns: ["Model", "MAE", "WAPE"], rows: model.comparison.map((c) => [c.model, Math.round(c.mae).toLocaleString("en-US"), `${(c.wape * 100).toFixed(1)}%`]) }}
          >
            <BarChart
              data={model.comparison.map((c) => ({
                label: c.model.startsWith("Seasonal") ? "Last week" : c.model.startsWith("Gradient") ? "Boosting + weather" : c.model.includes("weather") ? "Ridge + weather" : "Ridge calendar",
                value: c.mae,
              }))}
              format={(v) => Math.round(v).toLocaleString("en-US")}
              highlight={(d) => d.label === "Ridge + weather"}
            />
          </ChartCard>
          <ChartCard
            title="Error by days ahead"
            takeaway={`Tomorrow: ${Math.round(chosen.by_horizon[0])} bikes off. Two weeks out: ${Math.round(chosen.by_horizon[13])}. Still well under the naive guess.`}
            legend={[
              { label: "Ridge + weather", color: S1, shape: "line" },
              { label: "Same as last week", color: S2, shape: "line" },
            ]}
            table={{ columns: ["Days ahead", "Ridge + weather", "Last week"], rows: chosen.by_horizon.map((v, i) => [i + 1, Math.round(v), Math.round(naive.by_horizon[i])]) }}
          >
            <LineChart
              series={[
                { name: "Ridge + weather", color: S1, points: chosen.by_horizon.map((v, i) => [i + 1, v] as [number, number]) },
                { name: "Same as last week", color: S2, points: naive.by_horizon.map((v, i) => [i + 1, v] as [number, number]), dashed: true },
              ]}
              xDomain={[1, 14]}
              yDomain={[0, 1600]}
              xTicks={[1, 4, 7, 10, 14]}
              xFormat={(v) => `+${Math.round(v)}d`}
              yFormat={(v) => Math.round(v).toLocaleString("en-US")}
              markers
            />
          </ChartCard>
          <ChartCard title="All models" takeaway="WAPE = total absolute error ÷ total rentals. More robust than MAPE when a day has almost no rentals." className="md:col-span-2">
            <DataTable
              data={{
                columns: ["Model", "MAE (bikes/day)", "WAPE", "Error tomorrow", "Error in 14 days"],
                rows: model.comparison.map((c) => [c.model, Math.round(c.mae).toLocaleString("en-US"), `${(c.wape * 100).toFixed(1)}%`, Math.round(c.by_horizon[0]), Math.round(c.by_horizon[13])]),
              }}
            />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}

function TempScatter() {
  const W = 420;
  const H = 240;
  const M = { l: 40, r: 8, t: 10, b: 32 };
  const sx = (v: number) => M.l + ((v - 0) / 36) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - (v / 9000) * (H - M.t - M.b);
  const [tip, setTip] = useState<number[] | null>(null);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
        {[0, 4500, 9000].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="rgba(11,11,11,0.07)" />
            <text x={M.l - 6} y={sy(v) + 4} textAnchor="end" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
              {v / 1000}k
            </text>
          </g>
        ))}
        {[0, 10, 20, 30].map((v) => (
          <text key={v} x={sx(v)} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
            {v}°C
          </text>
        ))}
        {model.eda.temp_scatter.map((p, i) => (
          <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={2.6} fill={INK} fillOpacity={0.35} onMouseEnter={() => setTip(p)} />
        ))}
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] whitespace-nowrap text-white"
          style={{ left: `${(sx(tip[0]) / W) * 100}%`, top: `${(sy(tip[1]) / H) * 100}%`, transform: `translate(${sx(tip[0]) > W * 0.65 ? "calc(-100% - 10px)" : "10px"}, -50%)` }}
        >
          {tip[0]} °C · {tip[1].toLocaleString("en-US")} rentals
        </div>
      )}
    </div>
  );
}
