"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/product-recommender.json";
import { rankAll } from "../../demos/retail-demo";
import { InsideSection, Picker, Scrolly, type Step } from "../scrolly";

const C = model.catalog;
const NB = model.neighbors as [number, number, number][][];
const UP = "#eb6834";
const BLUE = "#2a78d6";
const n = (v: number) => v.toLocaleString("en-US");
const short = (s: string, k = 34) => (s.length > k ? `${s.slice(0, k - 1)}…` : s);
const cos = model.comparison.find((c) => c.model === model.chosen)!.hit5;
const pop = model.comparison.find((c) => c.model === "Most popular")!.hit5;
/** Rounded for inline styles, so server HTML and the browser agree (hydration). */
const r2 = (v: number) => Math.round(v * 100) / 100;
const tr = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

function Panel({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 10 }}
      transition={tr}
      className={`absolute inset-0 flex flex-col justify-center px-5 pb-10 sm:px-8 ${on ? "" : "pointer-events-none"}`}
    >
      {children}
    </motion.div>
  );
}

export function Visual({ step, basket }: { step: number; basket: (typeof model.samples)[number] }) {
  const ranked = useMemo(() => rankAll(basket.given), [basket]);
  const top = ranked[0];
  const a = top.because;
  const b = top.j;
  const link = NB[a].find((x) => x[0] === b)!;
  const hiddenRank = ranked.findIndex((r) => r.j === basket.hidden) + 1;
  const bars = ranked.slice(0, 8);
  const max = bars[0].score;
  const ra = Math.sqrt(C[a].baskets);
  const rb = Math.sqrt(C[b].baskets);
  const scale = 70 / Math.max(ra, rb);

  return (
    <div className="relative min-h-0 flex-1">
      {/* the basket */}
      <Panel on={step === 0}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
          Basket {basket.id} · {basket.date}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {basket.given.map((j) => (
            <div key={j} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[13px]">
              {short(C[j].name, 40)}
              <span className="block font-mono text-[10.5px] text-muted">in {n(C[j].baskets)} earlier baskets</span>
            </div>
          ))}
          <div className="rounded-xl border-2 border-dashed border-[#eb6834] bg-white/60 px-3 py-2.5 text-[13px] font-semibold text-[#c2410c]">
            ? one item hidden
            <span className="block font-mono text-[10.5px] font-normal text-muted">can the model guess it?</span>
          </div>
        </div>
      </Panel>

      {/* two products as sets of baskets */}
      <Panel on={step === 1 || step === 2}>
        <svg viewBox="0 0 520 240" className="mx-auto w-full max-w-[520px]">
          <circle cx={260 - ra * scale * 0.55} cy={110} r={ra * scale} fill={BLUE} opacity={0.18} stroke={BLUE} />
          <circle cx={260 + rb * scale * 0.55} cy={110} r={rb * scale} fill={UP} opacity={0.18} stroke={UP} />
          <text x={260 - ra * scale * 0.55 - ra * scale * 0.35} y={112} textAnchor="middle" fontSize={13} fontWeight={600}>
            {n(C[a].baskets)}
          </text>
          <text x={260 + rb * scale * 0.55 + rb * scale * 0.4} y={112} textAnchor="middle" fontSize={13} fontWeight={600}>
            {n(C[b].baskets)}
          </text>
          <text x={260 + (rb - ra) * scale * 0.1} y={106} textAnchor="middle" fontSize={15} fontWeight={700}>
            {n(link[1])}
          </text>
          <text x={260 + (rb - ra) * scale * 0.1} y={122} textAnchor="middle" fontSize={10} fill="rgba(11,11,11,0.55)">
            together
          </text>
          <text x={20} y={222} fontSize={11.5} fill={BLUE} fontWeight={600}>
            {short(C[a].name, 38)}
          </text>
          <text x={500} y={238} fontSize={11.5} fill="#c2410c" fontWeight={600} textAnchor="end">
            {short(C[b].name, 38)}
          </text>
        </svg>
        <motion.div initial={false} animate={{ opacity: step === 2 ? 1 : 0 }} transition={tr} className="mx-auto mt-3 rounded-2xl bg-white px-4 py-3 text-center">
          <p className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">cosine similarity</p>
          <p className="mt-1 text-[17px] font-semibold">
            {n(link[1])} ÷ √({n(C[a].baskets)} × {n(C[b].baskets)}) = {link[2].toFixed(3)}
          </p>
          <p className="text-[12px] text-ink-2/60">0 = never bought together · 1 = always bought together</p>
        </motion.div>
      </Panel>

      {/* score every candidate */}
      <Panel on={step === 3 || step === 4}>
        <p className="mb-2 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Score = sum of similarities to the basket</p>
        <div className="space-y-1.5">
          {bars.map((r, i) => {
            const hidden = r.j === basket.hidden;
            const inTop = step === 4 && i < 5;
            return (
              <div key={r.j} className="grid grid-cols-[1fr_120px] items-center gap-2 text-[12px] sm:grid-cols-[1fr_180px]">
                <span className={`truncate ${hidden ? "font-semibold text-[#c2410c]" : ""} ${step === 4 && i >= 5 ? "opacity-35" : ""}`}>
                  {i + 1}. {C[r.j].name}
                  {hidden ? " ← the hidden item" : ""}
                </span>
                <div className="h-3 rounded-full bg-ink/[0.06]">
                  <motion.div
                    className="h-full rounded-full"
                    initial={false}
                    animate={{ width: `${r2((r.score / max) * 100)}%`, background: hidden ? UP : inTop ? "#0b0b0b" : "rgba(11,11,11,0.35)" }}
                    transition={{ ...tr, delay: step === 3 ? i * 0.06 : 0 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <motion.p initial={false} animate={{ opacity: step === 4 ? 1 : 0 }} transition={tr} className="mt-3 text-[13px] font-medium">
          {hiddenRank > 0 && hiddenRank <= 5
            ? `Hit: the hidden item is #${hiddenRank} of the 5 suggestions.`
            : hiddenRank > 0
              ? `Miss: the hidden item is #${hiddenRank}, outside the top 5.`
              : "Miss: the hidden item isn't linked to anything in this basket."}
          <span className="block text-[12px] font-normal text-ink-2/60">Hidden: {C[basket.hidden].name}</span>
        </motion.p>
      </Panel>

      {/* how good, on all test baskets */}
      <Panel on={step === 5}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Hidden item in the top 5 · {n(model.split.tests)} test baskets</p>
        <div className="space-y-2">
          {model.comparison.map((c) => (
            <div key={c.model} className="grid grid-cols-[150px_1fr_48px] items-center gap-2 text-[12.5px] sm:grid-cols-[190px_1fr_48px]">
              <span className={c.model === model.chosen ? "font-semibold" : ""}>{c.model}</span>
              <div className="h-3 rounded-full bg-ink/[0.06]">
                <motion.div
                  className="h-full rounded-full"
                  initial={false}
                  animate={{ width: step === 5 ? `${r2((c.hit5 / 0.3) * 100)}%` : "0%" }}
                  style={{ background: c.model === model.chosen ? "#0b0b0b" : "rgba(11,11,11,0.3)" }}
                  transition={tr}
                />
              </div>
              <span className="text-right font-mono">{(c.hit5 * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function Inside() {
  const baskets = model.samples;
  const [pick, setPick] = useState(0);
  const basket = baskets[pick];
  const top = useMemo(() => rankAll(basket.given)[0], [basket]);

  const steps: Step[] = [
    { t: "Start with a real basket", d: `An invoice from after ${model.split.cut}, the test period. One item is hidden; the model sees the rest.` },
    { t: "A product is the baskets it's in", d: "The model knows nothing about what products are. It only knows which earlier baskets contained each one, and how many contained both." },
    { t: "Cosine similarity", d: `Times bought together, divided by the geometric mean of how often each sells. Popular products don't win just by being everywhere. Here: ${top.best.toFixed(2)}.` },
    { t: "Score every product", d: `Each candidate gets the sum of its similarities to everything in the basket (from each product's ${model.shipped.k} closest neighbours).` },
    { t: "Suggest the top 5", d: "The five highest scores are the suggestions. Did the hidden item make it?" },
    {
      t: "Check on every test basket",
      d: `Hiding one item from each of ${n(model.split.tests)} later baskets: cosine finds it in the top 5 ${(cos * 100).toFixed(0)}% of the time, about ${Math.round(cos / pop)} times as often as suggesting the bestsellers.`,
    },
  ];

  return (
    <InsideSection title="Bought together, measured." line="No neural network, no product descriptions: just counting which products share baskets. Scroll through one real basket.">
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label="Basket" rows={baskets} value={pick} onChange={setPick} tag={(r) => (r.hit ? "hit" : "miss")} />
            <div className="flex min-h-0 flex-1 flex-col">
              <Visual step={step} basket={basket} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
