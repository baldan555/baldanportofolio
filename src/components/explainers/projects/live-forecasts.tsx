"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import lf from "@/data/models/live-forecasts.json";
import type { LstmModel } from "@/lib/lstm";
import { InsideSection, Scrolly, type Step } from "../scrolly";

const PM = lf.pm25;
const M = PM.model as LstmModel;
const SNAP = PM.snapshot;
const L = PM.L; // hours the network reads
const UP = "#eb6834";
const BLUE = "#2a78d6";
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const TAU = 2 * Math.PI;
const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const sig = (x: number) => 1 / (1 + Math.exp(-x));

/** The window the network reads: per hour, the scaled log level and the hour as a point on a clock (as src/lib/live-forecast.ts). */
const END = SNAP.value.length - 1;
const SEQ = Array.from({ length: L }, (_, k) => {
  const i = END - L + 1 + k;
  const h = Number(SNAP.time[i].slice(11, 13));
  return [(Math.log1p(SNAP.value[i]) - PM.mu) / PM.sd, Math.sin((TAU * h) / 24), Math.cos((TAU * h) / 24)];
});

/** lstmRun from src/lib/lstm.ts, step by step, keeping the memory and the gates of every hour for the picture. */
function trace(m: LstmModel, seq: number[][]) {
  const U = m.units;
  const G = 4 * U;
  let h = new Array<number>(U).fill(0);
  let c = new Array<number>(U).fill(0);
  const steps: { c: number[]; h: number[]; gi: number; gf: number; go: number }[] = [];
  for (const x of seq) {
    const z = new Array<number>(G);
    for (let g = 0; g < G; g++) {
      let s = m.bias[g];
      for (let i = 0; i < m.inputDim; i++) s += x[i] * m.kernel[i * G + g];
      for (let j = 0; j < U; j++) s += h[j] * m.recurrent[j * G + g];
      z[g] = s;
    }
    const hn: number[] = [];
    const cn: number[] = [];
    let gi = 0;
    let gf = 0;
    let go = 0;
    for (let u = 0; u < U; u++) {
      const ig = sig(z[u]);
      const fg = sig(z[U + u]);
      const og = sig(z[3 * U + u]);
      cn[u] = fg * c[u] + ig * Math.tanh(z[2 * U + u]);
      hn[u] = og * Math.tanh(cn[u]);
      gi += ig / U;
      gf += fg / U;
      go += og / U;
    }
    h = hn;
    c = cn;
    steps.push({ c, h, gi, gf, go });
  }
  const out = Array.from({ length: m.horizon }, (_, k) => h.reduce((s, v, u) => s + v * m.dense.w[u * m.horizon + k], m.dense.b[k]));
  const base = Math.log1p(SNAP.value[END]);
  return { steps, forecast: out.map((o) => Math.expm1(base + o)) };
}
const T = trace(M, SEQ);

const W = 640;
const H = 440;
const X0 = 50;
const X1 = 620;
const C = { y0: 34, y1: 196 };
const HOURS = SNAP.value.length + M.horizon;
const vmax = Math.max(...SNAP.value, ...T.forecast) * 1.08;
const x = (i: number) => r1(X0 + (i / (HOURS - 1)) * (X1 - X0));
const y = (v: number) => r1(C.y1 - (v / vmax) * (C.y1 - C.y0));
const WIN0 = END - L + 1;
const lstm = PM.comparison.find((c) => c.model === "LSTM")!;
const yest = PM.comparison.find((c) => c.model === "Same hour yesterday")!;

export function Visual({ step }: { step: number }) {
  // steps 3–4 replay the 72 hours one by one
  const [t, setT] = useState(L - 1);
  useEffect(() => {
    if (step !== 2 && step !== 3) return;
    let k = 0;
    const id = setInterval(() => {
      k = (k + 1) % (L + 12);
      setT(Math.min(k, L - 1));
    }, 70);
    return () => clearInterval(id);
  }, [step]);
  const at = step === 2 || step === 3 ? t : L - 1;
  const s = T.steps[at];
  const cmax = Math.max(...T.steps.flatMap((q) => q.c.map(Math.abs)), 1e-9);
  const line = (vals: number[], from: number) => vals.map((v, k) => `${k ? "L" : "M"}${x(from + k)},${y(v)}`).join(" ");
  const day = (i: number) => SNAP.time[i].slice(5, 10);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="An LSTM reads 72 hours of air quality one hour at a time, then forecasts the next 24">
      {/* the week */}
      <rect x={x(WIN0)} y={C.y0 - 6} width={x(END) - x(WIN0)} height={C.y1 - C.y0 + 12} rx={6} fill={UP} opacity={step >= 1 ? 0.07 : 0} />
      {step >= 1 && (
        <text x={x(WIN0) + 6} y={C.y0 + 8} fontSize={10} fontFamily={MONO} fill={UP}>
          THE {L} HOURS IT READS
        </text>
      )}
      {SNAP.time.map((tm, i) =>
        tm.endsWith("T00:00") ? (
          <text key={tm} x={x(i)} y={C.y1 + 16} fontSize={9.5} fontFamily={MONO} fill={MUTED}>
            {day(i)}
          </text>
        ) : null,
      )}
      <text x={X0} y={C.y0 - 14} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
        PM2.5 IN JAKARTA, µg/m³ PER HOUR
      </text>
      <path d={line(SNAP.value, 0)} fill="none" stroke={INK} strokeWidth={1.8} />
      {(step === 2 || step === 3) && <circle cx={x(WIN0 + at)} cy={y(SNAP.value[WIN0 + at])} r={6} fill={UP} stroke="#fff" strokeWidth={2} />}
      <motion.path
        d={line([SNAP.value[END], ...T.forecast], END)}
        fill="none"
        stroke={UP}
        strokeWidth={2.5}
        strokeDasharray="5 3"
        initial={false}
        animate={{ opacity: step >= 4 ? 1 : 0 }}
        transition={tr}
      />
      {step >= 4 && (
        <text x={x(END) + 6} y={y(T.forecast[0]) - 10} fontSize={10.5} fontFamily={MONO} fill={UP}>
          NEXT 24 H
        </text>
      )}

      {/* step 2: three numbers per hour */}
      <motion.g initial={false} animate={{ opacity: step === 1 ? 1 : 0 }} transition={tr}>
        <text x={X0} y={246} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
          EACH HOUR BECOMES 3 NUMBERS
        </text>
        {["level (log, scaled)", "hour: sine", "hour: cosine"].map((lab, r) => (
          <g key={lab}>
            <text x={X0} y={272 + r * 34} fontSize={10.5} fontFamily={FONT} fill={INK}>
              {lab}
            </text>
            {SEQ.map((v, k) => (
              <rect key={k} x={170 + k * 6} y={258 + r * 34} width={5} height={22} fill={v[r] >= 0 ? UP : BLUE} opacity={r2(Math.min(1, Math.abs(v[r]) / (r ? 1 : 2)))} />
            ))}
          </g>
        ))}
        <text x={170} y={376} fontSize={10.5} fontFamily={FONT} fill={MUTED}>
          The clock numbers tell it the time of day: 23:00 sits next to 00:00, as it should.
        </text>
      </motion.g>

      {/* steps 3–5: memory and gates */}
      <motion.g initial={false} animate={{ opacity: step >= 2 && step <= 4 ? 1 : 0 }} transition={tr}>
        <text x={X0} y={246} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
          {step === 4 ? "FINAL MEMORY → 24 FORECASTS" : `MEMORY CELLS AFTER HOUR ${at + 1} OF ${L} · ${SNAP.time[WIN0 + at].slice(5, 16).replace("T", " ")}`}
        </text>
        {s.c.map((v, u) => (
          <rect key={u} x={X0 + u * 17} y={256} width={15} height={40} rx={3} fill={v >= 0 ? UP : BLUE} opacity={r2(0.1 + 0.9 * Math.min(1, Math.abs(v) / cmax))} />
        ))}
        <text x={X0} y={312} fontSize={10} fontFamily={FONT} fill={MUTED}>
          {M.units} memory cells · <tspan fill={UP}>■</tspan> positive · <tspan fill={BLUE}>■</tspan> negative
        </text>
      </motion.g>
      <motion.g initial={false} animate={{ opacity: step === 3 ? 1 : 0 }} transition={tr}>
        {[
          ["forget", s.gf, "how much old memory to keep"],
          ["input", s.gi, "how much of this hour to write in"],
          ["output", s.go, "how much memory to pass on"],
        ].map(([name, v, d], r) => (
          <g key={name as string}>
            <text x={X0} y={346 + r * 28} fontSize={11.5} fontFamily={FONT} fill={INK} fontWeight={600}>
              {name} gate
            </text>
            <rect x={150} y={334 + r * 28} width={200} height={14} rx={7} fill="rgba(11,11,11,0.06)" />
            <rect x={150} y={334 + r * 28} width={r1((v as number) * 200)} height={14} rx={7} fill={INK} />
            <text x={360} y={346 + r * 28} fontSize={10.5} fontFamily={FONT} fill={MUTED}>
              {Math.round((v as number) * 100)}% · {d}
            </text>
          </g>
        ))}
      </motion.g>

      {/* step 6: against simple guesses */}
      <motion.g initial={false} animate={{ opacity: step === 5 ? 1 : 0 }} transition={tr}>
        <text x={X0} y={246} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
          AVERAGE MISS OVER THE NEXT 24 H, ON {PM.split.test.toLocaleString("en-US")} UNSEEN TEST HOURS (µg/m³)
        </text>
        {PM.comparison.map((c, r) => (
          <g key={c.model}>
            <text x={X0} y={282 + r * 40} fontSize={12} fontFamily={FONT} fill={INK} fontWeight={c.model === "LSTM" ? 700 : 400}>
              {c.model}
            </text>
            <rect x={230} y={270 + r * 40} width={r1((c.mae / 20) * 340)} height={16} rx={8} fill={c.model === "LSTM" ? UP : "rgba(11,11,11,0.3)"} />
            <text x={238 + (c.mae / 20) * 340} y={283 + r * 40} fontSize={11} fontFamily={MONO} fill={INK}>
              {c.mae.toFixed(1)}
            </text>
          </g>
        ))}
      </motion.g>
    </svg>
  );
}

export function Inside() {
  const gain = 1 - lstm.mae / yest.mae;
  const steps: Step[] = [
    { t: "A week of air", d: `Hourly PM2.5 in Jakarta from ${PM.source.split(" (")[0]}, the same data the live demo pulls. Pollution rises and falls with traffic, weather and the time of day.` },
    { t: "Each hour becomes three numbers", d: "The level (on a log scale, so a jump from 10 to 20 counts like 50 to 100) and the hour of day as a point on a clock." },
    {
      t: "Read one hour at a time",
      d: `An LSTM is a neuron layer with memory. It reads the ${L} hours in order, and after each one it updates ${M.units} memory cells that summarise what it has seen so far.`,
    },
    {
      t: "Three gates decide",
      d: "At every hour three small sets of neurons decide how much old memory to forget, how much of the new hour to write in, and how much to pass on. These gates are what let it remember a pattern from a day ago.",
    },
    { t: "Memory → 24 forecasts", d: `After the last hour, one ordinary layer turns the ${M.units} memory cells into 24 numbers: the next 24 hours, all at once.` },
    {
      t: "Is it worth it?",
      d: `On ${PM.split.test.toLocaleString("en-US")} test hours it never saw, the LSTM misses by ${lstm.mae.toFixed(1)} µg/m³ on average, ${Math.round(gain * 100)}% less than simply repeating the same hour yesterday. Trained on ${PM.split.train.toLocaleString("en-US")} earlier windows.`,
    },
  ];
  return (
    <InsideSection title="A network with memory." line="Scroll to watch the LSTM read three days of real Jakarta air, hour by hour, and forecast the next day, with its real weights.">
      <Scrolly steps={steps}>
        {(step) => (
          <div className="min-h-0 flex-1 px-2 pt-3 pb-9 sm:px-4">
            <Visual step={step} />
          </div>
        )}
      </Scrolly>
    </InsideSection>
  );
}
