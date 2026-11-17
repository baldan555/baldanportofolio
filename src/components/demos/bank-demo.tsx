"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/bank-churn.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { Drivers, RiskMeter, Segmented, Slider } from "./controls";

export type BankSample = (typeof model.samples)[number];

const labels: Record<string, string> = {
  CreditScore: "Credit score",
  Age: "Age",
  age2: "Age² (late-life dip)",
  Tenure: "Years with the bank",
  Balance: "Balance",
  zero_balance: "Zero balance",
  EstimatedSalary: "Salary",
  Geography: "Country",
  products: "Number of products",
  active: "Active member",
};

/** Customer scorer. Remount with a new `key` to load a preset row. */
export function BankDemo({ preset }: { preset?: BankSample | null }) {
  const md = model.medians;
  const [score, setScore] = useState(preset?.CreditScore ?? md.CreditScore);
  const [age, setAge] = useState(preset?.Age ?? md.Age);
  const [tenure, setTenure] = useState(preset?.Tenure ?? md.Tenure);
  const [balance, setBalance] = useState(preset?.Balance ?? 100000);
  const [salary, setSalary] = useState(preset?.EstimatedSalary ?? md.EstimatedSalary);
  const [geo, setGeo] = useState(preset?.Geography ?? "France");
  const [products, setProducts] = useState(String(preset?.NumOfProducts ?? 1));
  const [active, setActive] = useState<"Yes" | "No">(preset ? (preset.IsActiveMember ? "Yes" : "No") : "Yes");

  const res = useMemo(() => {
    const out = predict(model.model as LogRegModel, {
      CreditScore: score,
      Age: age,
      age2: age * age,
      Tenure: tenure,
      Balance: balance,
      zero_balance: balance === 0 ? 1 : 0,
      EstimatedSalary: salary,
      Geography: geo,
      products,
      active,
    });
    // fold age + age² into one effect
    const a1 = out.contributions.find((c) => c.feature === "Age")?.effect ?? 0;
    const a2 = out.contributions.find((c) => c.feature === "age2")?.effect ?? 0;
    const contributions = [...out.contributions.filter((c) => c.feature !== "Age" && c.feature !== "age2"), { feature: "Age", value: String(age), effect: a1 + a2 }]
      .map((c) => (c.feature === "Balance" || c.feature === "EstimatedSalary" ? { ...c, value: `${Math.round(Number(c.value) / 1000)}k` } : c))
      .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
    return { p: out.probability, contributions };
  }, [score, age, tenure, balance, salary, geo, products, active]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Build a customer</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Slider label="Age" value={age} min={18} max={92} unit=" yrs" onChange={setAge} />
          <Slider label="Years with the bank" value={tenure} min={0} max={10} onChange={setTenure} />
          <Slider label="Balance" value={balance} min={0} max={250000} step={1000} onChange={setBalance} />
          <Slider label="Salary (estimated)" value={salary} min={0} max={200000} step={1000} onChange={setSalary} />
          <Slider label="Credit score" value={score} min={model.ranges.CreditScore[0]} max={model.ranges.CreditScore[1]} onChange={setScore} />
        </div>
        <Segmented label="Country" value={geo} options={["France", "Germany", "Spain"]} onChange={setGeo} />
        <div className="grid grid-cols-2 gap-4">
          <Segmented label="Products held" value={products} options={["1", "2", "3", "4"]} onChange={setProducts} />
          <Segmented label="Active member" value={active} options={["Yes", "No"]} onChange={setActive} />
        </div>
      </div>
      <div className="flex flex-col gap-6 rounded-2xl bg-white p-5 sm:p-6">
        <RiskMeter probability={res.p} label="Chance this customer leaves" />
        {preset && (
          <p className="-mt-2 rounded-xl bg-cream px-3 py-2 text-[12.5px]">
            Loaded customer <b className="font-mono">{preset.id}</b>. What really happened: <b>{preset.actual === "Left" ? "left the bank" : "stayed"}</b>. The table score comes
            from a model that never saw them; the demo uses the final model.
          </p>
        )}
        <Drivers items={res.contributions} labels={labels} max={6} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign planner: how many churners does a budget reach?            */
/* ------------------------------------------------------------------ */

const S1 = "#2a78d6";
const S2 = "#eb6834";

export function BudgetPlanner() {
  const [pct, setPct] = useState(10);
  const g = model.eval.gains[model.chosen as keyof typeof model.eval.gains];
  const gb = model.eval.gains["Gradient Boosting"];
  const at = g[pct - 1];
  const atGb = gb[pct - 1];
  const customers = Math.round((model.dataset.rows * pct) / 100);
  const churners = Math.round(model.dataset.rows * model.dataset.churn_rate);
  const reached = Math.round(at.captured * churners);

  const W = 420;
  const H = 260;
  const M = { l: 40, r: 10, t: 12, b: 34 };
  const sx = (v: number) => M.l + (v / 100) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - v * (H - M.t - M.b);
  const path = (arr: { pct: number; captured: number }[]) => `M${sx(0)},${sy(0)}` + arr.map((d) => `L${sx(d.pct).toFixed(1)},${sy(d.captured).toFixed(1)}`).join("");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-5 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Plan the retention campaign</p>
        <Slider label="We can call the riskiest…" value={pct} min={1} max={60} unit="% of customers" onChange={setPct} />
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: customers.toLocaleString("en-US"), l: "customers called" },
            { v: `${Math.round(at.captured * 100)}%`, l: `of churners reached (${reached.toLocaleString("en-US")})` },
            { v: `${Math.round(at.precision * 100)}%`, l: "of calls hit a churner" },
            { v: `${(at.captured / (pct / 100)).toFixed(1)}×`, l: "better than calling at random" },
          ].map((s) => (
            <motion.div key={s.l + s.v} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className="rounded-xl bg-cream/70 px-4 py-3">
              <p className="text-[1.7rem] leading-none font-semibold tracking-[-0.04em]">{s.v}</p>
              <p className="mt-1.5 text-[11.5px] text-ink-2/70">{s.l}</p>
            </motion.div>
          ))}
        </div>
        <p className="text-[12px] text-muted">
          Calling the same {pct}% at random would reach about {pct}% of churners. Gradient boosting would reach {Math.round(atGb.captured * 100)}%.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] font-semibold">Cumulative gains</p>
          <div className="flex gap-3 text-[11.5px] text-ink-2/70">
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 bg-ink" /> our model
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4" style={{ background: S2 }} /> boosting
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 border-t-2 border-dashed border-[#8a8a85]" /> random
            </span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="rgba(11,11,11,0.07)" />
              <text x={M.l - 6} y={sy(v) + 4} textAnchor="end" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
                {v * 100}%
              </text>
            </g>
          ))}
          {[0, 25, 50, 75, 100].map((v) => (
            <text key={v} x={sx(v)} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
              {v}%
            </text>
          ))}
          <text x={(W + M.l) / 2} y={H - 2} textAnchor="middle" fontSize="10.5" fill="#5f5f5a">
            share of customers called, riskiest first
          </text>
          <rect x={sx(0)} y={M.t} width={sx(pct) - sx(0)} height={H - M.t - M.b} fill="#f3ede1" />
          <line x1={sx(0)} y1={sy(0)} x2={sx(100)} y2={sy(1)} stroke="#8a8a85" strokeDasharray="5 4" />
          <path d={path(gb)} fill="none" stroke={S2} strokeWidth={1.8} strokeDasharray="6 4" />
          <path d={path(g)} fill="none" stroke="#0b0b0b" strokeWidth={2.2} />
          <line x1={sx(pct)} x2={sx(pct)} y1={M.t} y2={H - M.b} stroke="#0b0b0b" strokeOpacity={0.4} />
          <circle cx={sx(pct)} cy={sy(at.captured)} r={6} fill={S1} stroke="#fff" strokeWidth={2.5} />
          <text x={sx(pct) + 9} y={sy(at.captured) + 4} fontSize="11.5" fill="#0b0b0b" fontWeight={600}>
            {Math.round(at.captured * 100)}%
          </text>
        </svg>
      </div>
    </div>
  );
}
