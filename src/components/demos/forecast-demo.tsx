"use client";

import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import model from "@/data/models/demand-forecasting.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { Drivers, LOWERS, RAISES, Segmented, Slider } from "./controls";

export type BikeSample = (typeof model.samples)[number];

const S1 = "#2a78d6";
const S2 = "#eb6834";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEATHER = ["Clear", "Mist / cloudy", "Light rain / snow"];
const DAY0 = new Date(model.series.start + "T00:00:00Z").getTime();
const dateOf = (i: number) => new Date(DAY0 + i * 86_400_000);
const fmt = (i: number) => dateOf(i).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

/** Two tabs: replay the 2012 backtest, or plan a day with the final model. Remount with a new key to load a preset. */
export function ForecastDemo({ preset }: { preset?: BikeSample | null }) {
  const [tab, setTab] = useState<"Time machine" | "Plan a day">(preset ? "Plan a day" : "Time machine");
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Segmented label="" value={tab} options={["Time machine", "Plan a day"]} onChange={setTab} />
      </div>
      {tab === "Time machine" ? <TimeMachine /> : <Planner preset={preset} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TimeMachine() {
  const tm = model.timemachine;
  const [k, setK] = useState(Math.floor(tm.length * 0.45));
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => setK((v) => (v + 1) % tm.length), 900);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, tm.length]);

  const w = tm[k];
  const H = model.backtest.horizon;
  const past = 28;
  const start = w.origin - past;
  const cnt = model.series.cnt;
  const actual = cnt.slice(start, w.origin + H);
  const errR = w.ridge.reduce((a, v, i) => a + Math.abs(v - cnt[w.origin + i]), 0) / H;
  const errN = w.naive.reduce((a, v, i) => a + Math.abs(v - cnt[w.origin + i]), 0) / H;

  const W = 860;
  const Hh = 300;
  const M = { l: 52, r: 12, t: 16, b: 30 };
  const n = past + H;
  const sx = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const top = 9000;
  const sy = (v: number) => Hh - M.b - (v / top) * (Hh - M.t - M.b);
  const line = (vals: number[], off: number) => vals.map((v, i) => `${i ? "L" : "M"}${sx(i + off).toFixed(1)},${sy(v).toFixed(1)}`).join("");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="rounded-2xl bg-white p-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="flex-1">
              <Slider label="Pretend today is" value={k} min={0} max={tm.length - 1} onChange={(v) => { setPlaying(false); setK(v); }} />
            </div>
          </div>
          <p className="mt-2 text-[13px]">
            <b>{dateOf(w.origin).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" })}</b>
            <span className="text-muted"> · the model only knows the days before this one</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white px-5 py-4">
            <p className="text-[2rem] leading-none font-semibold tracking-[-0.04em]">{Math.round(errR).toLocaleString("en-US")}</p>
            <p className="mt-1.5 font-mono text-[10.5px] text-muted uppercase">model error / day</p>
          </div>
          <div className="rounded-2xl bg-white px-5 py-4">
            <p className="text-[2rem] leading-none font-semibold tracking-[-0.04em] text-ink/50">{Math.round(errN).toLocaleString("en-US")}</p>
            <p className="mt-1.5 font-mono text-[10.5px] text-muted uppercase">“last week” error</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] font-semibold">Daily rentals: 4 weeks of history, 2 weeks of forecast</p>
          <div className="flex flex-wrap gap-4 text-[11.5px] text-ink-2/70">
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 bg-ink" /> actual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4" style={{ background: S1 }} /> model forecast
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 border-t-2 border-dashed" style={{ borderColor: S2 }} /> same as last week
            </span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
          <rect x={sx(past)} y={M.t} width={sx(n - 1) - sx(past)} height={Hh - M.t - M.b} fill="#f3ede1" />
          <text x={sx(past) + 6} y={M.t + 12} fontSize="11" fill="#5f5f5a">
            future (hidden from the model)
          </text>
          {[0, 3000, 6000, 9000].map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="rgba(11,11,11,0.07)" />
              <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
                {v / 1000}k
              </text>
            </g>
          ))}
          {[0, 7, 14, 21, 28, 35, 41].map((i) => (
            <text key={i} x={sx(i)} y={Hh - 8} textAnchor="middle" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
              {fmt(start + i)}
            </text>
          ))}
          <path d={line(actual, 0)} fill="none" stroke="#0b0b0b" strokeWidth={2} strokeLinejoin="round" />
          <motion.path key={`n${k}`} d={line(w.naive, past)} fill="none" stroke={S2} strokeWidth={2} strokeDasharray="6 4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
          <motion.path key={`r${k}`} d={line(w.ridge, past)} fill="none" stroke={S1} strokeWidth={2.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
          {w.ridge.map((v, i) => (
            <circle key={i} cx={sx(past + i)} cy={sy(v)} r={3.5} fill={S1} stroke="#fff" strokeWidth={1.5} />
          ))}
          <line x1={sx(past)} x2={sx(past)} y1={M.t} y2={Hh - M.b} stroke="#0b0b0b" strokeOpacity={0.5} />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const labels: Record<string, string> = {
  t: "Demand trend (end of 2012)",
  holiday: "Holiday",
  workingday: "Working day",
  temp: "Temperature",
  hum_p: "Humidity",
  wind: "Wind",
  mnth: "Month",
  weekday: "Day of week",
  weathersit: "Weather",
};

function Planner({ preset }: { preset?: BikeSample | null }) {
  const [weekday, setWeekday] = useState(String(preset?.weekday ?? 3));
  const [month, setMonth] = useState(preset?.mnth ?? 6);
  const [holiday, setHoliday] = useState<"No" | "Yes">(preset?.holiday ? "Yes" : "No");
  const [weather, setWeather] = useState(String(preset?.weathersit ?? 1));
  const [temp, setTemp] = useState(preset?.temp_c ?? 24);
  const [hum, setHum] = useState(preset?.hum_p ?? 60);
  const [wind, setWind] = useState(preset?.wind ?? 12);

  const workingday = holiday === "No" && weekday !== "0" && weekday !== "6" ? 1 : 0;
  const res = useMemo(() => {
    const out = predict(model.model as LogRegModel, {
      t: model.t_last,
      holiday: holiday === "Yes" ? 1 : 0,
      workingday,
      temp_c: temp,
      temp_c2: temp * temp,
      hum_p: hum,
      wind,
      mnth: String(month),
      weekday,
      weathersit: weather,
    });
    // fold temp + temp² into one "Temperature" effect
    const t1 = out.contributions.find((c) => c.feature === "temp_c")?.effect ?? 0;
    const t2 = out.contributions.find((c) => c.feature === "temp_c2")?.effect ?? 0;
    const contributions = [
      ...out.contributions.filter((c) => c.feature !== "temp_c" && c.feature !== "temp_c2"),
      { feature: "temp", value: `${temp} °C`, effect: t1 + t2 },
    ]
      .map((c) => ({
        ...c,
        value:
          c.feature === "mnth" ? MONTHS[Number(c.value) - 1] : c.feature === "weekday" ? DAYS[Number(c.value)] : c.feature === "weathersit" ? WEATHER[Number(c.value) - 1] : c.feature === "t" ? "" : c.value,
      }))
      .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
    return { value: Math.max(0, out.logit), contributions };
  }, [weekday, month, holiday, weather, temp, hum, wind, workingday]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Plan a day</p>
        <Segmented label="Day of week" value={weekday} options={["1", "2", "3", "4", "5", "6", "0"]} onChange={setWeekday} display={(d) => DAYS[Number(d)]} />
        <Slider label="Month" value={month} min={1} max={12} onChange={setMonth} />
        <p className="-mt-3 font-mono text-[12px] text-muted">{MONTHS[month - 1]}</p>
        <div className="grid grid-cols-2 gap-4">
          <Segmented label="Public holiday" value={holiday} options={["No", "Yes"]} onChange={setHoliday} />
          <Segmented label="Weather" value={weather} options={["1", "2", "3"]} onChange={setWeather} display={(w) => WEATHER[Number(w) - 1]} />
        </div>
        <Slider label="Temperature" value={temp} min={-5} max={36} step={0.5} unit=" °C" onChange={setTemp} />
        <Slider label="Humidity" value={hum} min={20} max={100} unit=" %" onChange={setHum} />
        <Slider label="Wind" value={wind} min={0} max={35} step={0.5} unit=" km/h" onChange={setWind} />
      </div>
      <div className="flex flex-col gap-6 rounded-2xl bg-white p-5 sm:p-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Expected rentals that day</p>
          <motion.p key={Math.round(res.value / 50)} initial={{ opacity: 0.5, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-[4rem] leading-none font-semibold tracking-[-0.05em]">
            {Math.round(res.value).toLocaleString("en-US")}
          </motion.p>
          <p className="mt-2 text-[12px] text-muted">
            At the end-of-2012 demand level. Typical backtest error: ± {Math.round(model.comparison.find((c) => c.model === model.chosen)!.mae).toLocaleString("en-US")} bikes.
          </p>
        </div>
        {preset && (
          <p className="rounded-xl bg-cream px-3 py-2 text-[12.5px]">
            Loaded <b>{preset.id}</b> ({preset.label}). Real rentals: <b>{preset.actual.toLocaleString("en-US")}</b>
            {preset.forecast !== null && (
              <>
                ; the backtest forecast {preset.horizon} day{preset.horizon === 1 ? "" : "s"} ahead said <b>{preset.forecast.toLocaleString("en-US")}</b>
              </>
            )}
            .
          </p>
        )}
        <Drivers items={res.contributions} labels={labels} max={7} upLabel="more rentals" downLabel="fewer rentals" upColor={LOWERS} downColor={RAISES} unit="bikes" />
      </div>
    </div>
  );
}
