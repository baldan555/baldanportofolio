"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { InsideSection, Picker, Scrolly, type Step } from "./scrolly";

const UP = "#eb6834";
const DOWN = "#2a78d6";
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export type Series = { start: string; value: number[]; baseline: number[]; z: number[] };
export type Window = { id: string; from: number; to: number };

const W = 640;
const H = 440;
const X0 = 54;
const X1 = 624;
const TOP = { y0: 26, y1: 250 };
const BOT = { y0: 300, y1: 410 };

export function Visual({ step, s, win, threshold, fixed }: { step: number; s: Series; win: Window; threshold: number; fixed: [number, number] }) {
  const pad = 48;
  const a = Math.max(0, win.from - pad);
  const b = Math.min(s.value.length - 1, win.to + pad);
  const idx = Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const vmax = Math.max(...idx.map((i) => Math.max(s.value[i], s.baseline[i])), step === 5 ? fixed[1] : 0) * 1.05;
  const zr = Math.max(threshold + 2, ...idx.map((i) => Math.abs(s.z[i])));
  const x = (i: number) => X0 + ((i - a) / (b - a)) * (X1 - X0);
  const y = (v: number) => TOP.y1 - (v / vmax) * (TOP.y1 - TOP.y0);
  const zy = (z: number) => (BOT.y0 + BOT.y1) / 2 - (Math.max(-zr, Math.min(zr, z)) / zr) * ((BOT.y1 - BOT.y0) / 2);
  const line = (f: (i: number) => number) => idx.map((i, k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${f(i).toFixed(1)}`).join(" ");
  const flagged = idx.filter((i) => Math.abs(s.z[i]) > threshold);
  const fixedFlags = idx.filter((i) => s.value[i] < fixed[0] || s.value[i] > fixed[1]);
  const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
  const t0 = Date.parse(s.start.replace(" ", "T") + "Z");
  const day = (i: number) => new Date(t0 + i * 3600000).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Rides per hour against the usual level for that hour, and how unusual each gap is">
      {/* the event's own span */}
      <rect x={x(win.from)} y={TOP.y0} width={x(win.to) - x(win.from)} height={BOT.y1 - TOP.y0} fill={UP} opacity={0.06} />
      {/* day ticks */}
      {idx
        .filter((i) => i % 24 === 0)
        .map((i) => (
          <g key={`d${i}`}>
            <line x1={x(i)} x2={x(i)} y1={TOP.y0} y2={TOP.y1} stroke="rgba(11,11,11,0.06)" />
            <text x={x(i) + 3} y={TOP.y1 + 14} fontSize={9.5} fontFamily={MONO} fill={MUTED}>
              {day(i)}
            </text>
          </g>
        ))}
      <text x={X0} y={TOP.y0 - 8} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
        TAXI RIDES PER HOUR
      </text>
      {/* gaps between actual and usual */}
      <motion.g initial={false} animate={{ opacity: step >= 2 ? 0.55 : 0 }} transition={tr}>
        {idx.map((i) => (
          <line key={`g${i}`} x1={x(i)} x2={x(i)} y1={y(s.baseline[i])} y2={y(s.value[i])} stroke={s.value[i] >= s.baseline[i] ? UP : DOWN} strokeWidth={2} />
        ))}
      </motion.g>
      <motion.path d={line((i) => y(s.baseline[i]))} fill="none" stroke={INK} strokeDasharray="4 3" strokeWidth={1.4} initial={false} animate={{ opacity: step >= 1 ? 0.6 : 0 }} transition={tr} />
      <path d={line((i) => y(s.value[i]))} fill="none" stroke={INK} strokeWidth={1.8} />
      {step >= 1 && (
        <text x={X1} y={TOP.y0 - 8} fontSize={10.5} fontFamily={MONO} textAnchor="end" fill={MUTED}>
          — ACTUAL · - - USUAL FOR THAT WEEKDAY &amp; HOUR
        </text>
      )}
      {/* fixed limits, for comparison */}
      <motion.g initial={false} animate={{ opacity: step === 5 ? 1 : 0 }} transition={tr}>
        {fixed.map((f) => (
          <line key={f} x1={X0} x2={X1} y1={y(f)} y2={y(f)} stroke={MUTED} strokeDasharray="6 4" />
        ))}
        {step === 5 && fixedFlags.map((i) => <circle key={`f${i}`} cx={x(i)} cy={y(s.value[i])} r={3.5} fill="none" stroke={INK} />)}
      </motion.g>
      {/* flagged hours */}
      {step >= 4 && step !== 5 && flagged.map((i) => <circle key={`a${i}`} cx={x(i)} cy={y(s.value[i])} r={4} fill={s.z[i] < 0 ? DOWN : UP} stroke="#fff" />)}

      {/* z panel */}
      <motion.g initial={false} animate={{ opacity: step >= 3 ? 1 : 0 }} transition={tr}>
        <text x={X0} y={BOT.y0 - 10} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
          HOW UNUSUAL (ROBUST Z-SCORE)
        </text>
        <line x1={X0} x2={X1} y1={zy(0)} y2={zy(0)} stroke="rgba(11,11,11,0.2)" />
        <path d={line((i) => zy(s.z[i]))} fill="none" stroke={INK} strokeWidth={1.4} />
        <motion.g initial={false} animate={{ opacity: step >= 4 ? 1 : 0 }} transition={tr}>
          {[threshold, -threshold].map((t) => (
            <g key={t}>
              <line x1={X0} x2={X1} y1={zy(t)} y2={zy(t)} stroke={UP} strokeDasharray="5 4" />
              <text x={X0 - 4} y={zy(t) + 3} fontSize={9.5} fontFamily={MONO} textAnchor="end" fill={UP}>
                {t > 0 ? "+" : "−"}
                {Math.abs(t)}
              </text>
            </g>
          ))}
        </motion.g>
      </motion.g>
      {step >= 4 && (
        <text x={X1} y={H - 8} fontSize={11} fontFamily={FONT} textAnchor="end" fill={INK}>
          {step === 5 ? `fixed limits: ${fixedFlags.length} hours flagged · z-score: ${flagged.length}` : `${flagged.length} hours flagged in this view`}
        </text>
      )}
    </svg>
  );
}

export function AnomalyExplainer({ title, line, series, windows, threshold, entity }: { title: string; line?: string; series: Series; windows: Window[]; threshold: number; entity: string }) {
  const [pick, setPick] = useState(0);
  const win = windows[pick];
  // a fixed rule for comparison: mean ± 2 standard deviations of every hour in the data
  const fixed = useMemo<[number, number]>(() => {
    const v = series.value;
    const mean = v.reduce((s, x) => s + x, 0) / v.length;
    const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
    return [Math.max(0, mean - 2 * sd), mean + 2 * sd];
  }, [series]);
  const deepest = useMemo(() => {
    let best = win.from;
    for (let i = win.from; i <= win.to; i++) if (Math.abs(series.z[i]) > Math.abs(series.z[best])) best = i;
    return best;
  }, [series, win]);
  const gap = series.value[deepest] - series.baseline[deepest];

  const steps: Step[] = [
    { t: `${entity} every hour`, d: `Real New York taxi rides, hour by hour, around ${win.id}. Busy evenings, quiet nights: the rhythm repeats every week.` },
    {
      t: "What's normal for this hour?",
      d: "For every weekday and hour (Monday 8:00, Monday 9:00, …) the model takes the median over every week in the data; a median ignores the odd holiday. That dashed line is “usual”.",
    },
    { t: "Measure the gap", d: `Each bar is actual minus usual. At the most unusual hour here, rides were ${Math.round(Math.abs(gap)).toLocaleString("en-US")} ${gap < 0 ? "below" : "above"} usual.` },
    {
      t: "Is the gap unusual?",
      d: "A gap of 2,000 rides is nothing at rush hour and huge at 4 a.m. Dividing by the typical size of gaps (the median absolute deviation) gives a robust z-score, smoothed over 3 hours.",
    },
    {
      t: `Flag beyond ±${threshold}`,
      d: `Hours past the line become alerts. Training tried thresholds from 2 to 6: ±${threshold} is the strictest that still catches all five labelled events, with the fewest false alerts.`,
    },
    {
      t: "Why not one fixed limit?",
      d: "The dashed lines are a single limit for every hour (average ± 2 standard deviations). They ignore the daily rhythm, so they react to ordinary peaks and quiet nights and miss shifts that are only odd for that hour.",
    },
  ];

  return (
    <InsideSection title={title} line={line}>
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label="Event" rows={windows} value={pick} onChange={setPick} />
            <div className="min-h-0 flex-1 px-2 pb-9 sm:px-4">
              <Visual step={step} s={series} win={win} threshold={threshold} fixed={fixed} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
