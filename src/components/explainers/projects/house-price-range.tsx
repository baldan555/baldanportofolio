"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/house-price-range.json";
import type { LogRegModel } from "@/lib/logreg";
import { neuronTerms, spread } from "../neuron";
import { InsideSection, Picker, Scrolly, type Step } from "../scrolly";

const Q = model.models as Record<"q10" | "q50" | "q90", LogRegModel>;
const LO = "#2a78d6";
const HI = "#eb6834";
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const usd = (v: number) => `$${Math.round(v / 1000).toLocaleString("en-US")}k`;
const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
const lin = model.comparison.find((c) => c.model === model.chosen)!;

type House = (typeof model.samples)[number];
/** Same inputs as the demo: log area and log lot, remodel year never before the build year. */
const features = (h: House): Record<string, number | string> => ({
  log_area: Math.log(h.area),
  "Overall Qual": h.qual,
  "Overall Cond": h.cond,
  "Year Built": h.built,
  remod: Math.max(h.remod, h.built),
  basement: h.basement,
  garage: h.garage,
  baths: h.baths,
  Fireplaces: h.fireplaces,
  log_lot: Math.log(h.lot),
  kitchen: h.kitchen,
  air: h.air,
  hood: h.hood,
  bldg: h.bldg,
});

function bands(h: House) {
  const x = features(h);
  const raw = { q10: Math.exp(neuronTerms(Q.q10, x).logit), q50: Math.exp(neuronTerms(Q.q50, x).logit), q90: Math.exp(neuronTerms(Q.q90, x).logit) };
  const cal = { q10: raw.q10 * Math.exp(-model.offset), q50: raw.q50, q90: raw.q90 * Math.exp(model.offset) };
  return { raw, cal };
}

const W = 640;
const H = 440;

export function Visual({ step, h }: { step: number; h: House }) {
  const { raw, cal } = useMemo(() => bands(h), [h]);
  const b = step >= 3 ? cal : raw;
  const lo = Math.min(b.q10, h.price) * 0.9;
  const hi = Math.max(b.q90, h.price) * 1.1;
  const x = (v: number) => Math.round((60 + ((v - lo) / (hi - lo)) * 520) * 10) / 10; // rounded: prices come from exp()
  const axisY = 250;
  const inside = h.price >= cal.q10 && h.price <= cal.q90;

  // pinball loss for one quantile: under-predicting costs q per dollar, over-predicting costs 1 − q
  const loss = (q: number, e: number) => (e >= 0 ? q * e : (q - 1) * e);
  const lossPath = (q: number, ox: number) =>
    Array.from({ length: 41 }, (_, i) => {
      const e = -1 + i / 20;
      return `${i ? "L" : "M"}${(ox + e * 70).toFixed(1)},${(380 - loss(q, e) * 120).toFixed(1)}`;
    }).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Three price models give a low, middle and high price; the real price should fall between low and high">
      {/* facts */}
      <motion.g initial={false} animate={{ opacity: step === 0 ? 1 : 0 }} transition={tr}>
        {[
          ["Living area", `${h.area.toLocaleString("en-US")} sq ft`],
          ["Overall quality", `${h.qual} / 10`],
          ["Year built", String(h.built)],
          ["Neighbourhood", h.hood],
          ["Bathrooms", String(h.baths)],
          ["Garage", `${h.garage} cars`],
        ].map(([k, v], i) => (
          <g key={k} transform={`translate(${60 + (i % 3) * 180}, ${70 + Math.floor(i / 3) * 62})`}>
            <rect width={166} height={50} rx={10} fill="#fff" stroke="rgba(11,11,11,0.1)" />
            <text x={12} y={19} fontSize={10} fontFamily={MONO} fill={MUTED}>
              {k.toUpperCase()}
            </text>
            <text x={12} y={38} fontSize={15} fontWeight={600} fontFamily={FONT} fill={INK}>
              {v}
            </text>
          </g>
        ))}
      </motion.g>

      {/* the price axis with three predictions */}
      <motion.g initial={false} animate={{ opacity: step === 1 || step === 3 || step === 4 ? 1 : 0 }} transition={tr}>
        <line x1={60} x2={580} y1={axisY} y2={axisY} stroke="rgba(11,11,11,0.25)" />
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <text key={v} x={x(v)} y={axisY + 22} fontSize={10} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
            {usd(v)}
          </text>
        ))}
        <motion.rect y={axisY - 34} height={68} rx={8} fill={INK} initial={false} animate={{ x: x(b.q10), width: x(b.q90) - x(b.q10), opacity: step >= 3 ? 0.08 : 0 }} transition={tr} />
        {(["q10", "q50", "q90"] as const).map((q, i) => (
          <motion.g key={q} initial={false} animate={{ x: x(b[q]) }} transition={tr}>
            <line y1={axisY - 40} y2={axisY + 4} stroke={[LO, INK, HI][i]} strokeWidth={3} />
            <text y={axisY - 50 - i * 16} fontSize={11.5} fontFamily={FONT} textAnchor="middle" fill={[LO, INK, HI][i]} fontWeight={600}>
              {["low (10%)", "middle (50%)", "high (90%)"][i]} {usd(b[q])}
            </text>
          </motion.g>
        ))}
        <motion.g initial={false} animate={{ opacity: step >= 4 ? 1 : 0 }} transition={tr}>
          <circle cx={x(h.price)} cy={axisY} r={8} fill={inside ? "#1baf7a" : "#e34948"} stroke="#fff" strokeWidth={2} />
          <text x={x(h.price)} y={axisY + 44} fontSize={12} fontFamily={FONT} textAnchor="middle" fill={INK} fontWeight={600}>
            sold for {usd(h.price)} {inside ? "✓ inside" : "✗ outside"}
          </text>
        </motion.g>
      </motion.g>

      {/* step 3: asymmetric losses */}
      <motion.g initial={false} animate={{ opacity: step === 2 ? 1 : 0 }} transition={tr}>
        {[0.1, 0.5, 0.9].map((q, i) => {
          const ox = 140 + i * 180;
          return (
            <g key={q}>
              <line x1={ox - 75} x2={ox + 75} y1={380} y2={380} stroke="rgba(11,11,11,0.2)" />
              <line x1={ox} x2={ox} y1={300} y2={384} stroke="rgba(11,11,11,0.15)" />
              <path d={lossPath(q, ox)} fill="none" stroke={[LO, INK, HI][i]} strokeWidth={2.5} />
              <text x={ox} y={402} fontSize={10} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
                PRICE TOO LOW ← · → TOO HIGH
              </text>
              <text x={ox} y={292} fontSize={11.5} fontFamily={FONT} textAnchor="middle" fill={[LO, INK, HI][i]} fontWeight={600}>
                {Math.round(q * 100)}% model
              </text>
            </g>
          );
        })}
      </motion.g>

      {/* step 6: does 80% hold? */}
      <motion.g initial={false} animate={{ opacity: step === 5 ? 1 : 0 }} transition={tr}>
        <text x={W / 2} y={56} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          SHARE OF {model.split.test} TEST HOUSES (2010) INSIDE THEIR RANGE, BY PRICE
        </text>
        <line x1={70} x2={590} y1={360 - 0.8 * 260} y2={360 - 0.8 * 260} stroke={HI} strokeDasharray="5 4" />
        <text x={592} y={360 - 0.8 * 260 + 4} fontSize={10} fontFamily={MONO} fill={HI}>
          80%
        </text>
        {model.by_band.map((d, i) => (
          <g key={d.label}>
            <rect x={90 + i * 125} y={360 - d.coverage * 260} width={90} height={d.coverage * 260} rx={6} fill={INK} opacity={0.75} />
            <text x={135 + i * 125} y={352 - d.coverage * 260} fontSize={12} fontFamily={MONO} textAnchor="middle" fill={INK}>
              {Math.round(d.coverage * 100)}%
            </text>
            <text x={135 + i * 125} y={380} fontSize={11} fontFamily={FONT} textAnchor="middle" fill={INK}>
              {d.label}
            </text>
          </g>
        ))}
      </motion.g>
    </svg>
  );
}

export function Inside() {
  const rows = useMemo(() => spread(model.samples, (s) => s.price), []);
  const [pick, setPick] = useState(0);
  const h = rows[pick];

  const steps: Step[] = [
    { t: "Start with one house", d: "A real sale from Ames, Iowa, in 2010, the test year. A single price guess would be wrong anyway; the useful answer is a range." },
    { t: "Three neurons, three prices", d: "Three linear models read the same facts. Each is one neuron summing weighted inputs, on the log of the price, so effects are percentages." },
    {
      t: "Each aims at a different spot",
      d: "They differ only in how errors are punished. The high model pays 9× more for guessing too low than too high, so it settles where 90% of prices fall below it. The low model is the mirror image.",
    },
    {
      t: "A check on unseen houses",
      d: `Before testing, the band is checked on ${model.split.calibrate} houses from 2009 that no model saw, and widened just enough to hold 80% of them (conformal calibration: ×${Math.exp(model.offset).toFixed(3)} here).`,
    },
    { t: "The range", d: `Low to high is an 80% range. This house sold for ${usd(h.price)}.` },
    {
      t: "Does 80% really mean 80%?",
      d: `On the ${model.split.test} test houses, ${(lin.calibrated.coverage * 100).toFixed(0)}% landed inside their range, which spans ${(lin.calibrated.width_pct * 100).toFixed(0)}% of the price on average. By price group it swings between ${Math.round(Math.min(...model.by_band.map((d) => d.coverage)) * 100)}% and ${Math.round(Math.max(...model.by_band.map((d) => d.coverage)) * 100)}%: close to 80%, not exact.`,
    },
  ];

  return (
    <InsideSection title="A price range, not a guess." line="Three neurons give a low, middle and high price, and a check on unseen houses makes the range honest. Scroll through a real sale.">
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label="House" rows={rows} value={pick} onChange={setPick} tag={(r) => usd(r.price)} />
            <div className="min-h-0 flex-1 px-2 pb-9 sm:px-4">
              <Visual step={step} h={h} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
