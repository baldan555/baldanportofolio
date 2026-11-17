"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/credit-risk.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { Drivers, LOWERS, pc, RAISES, RiskMeter, Segmented, Select, Slider } from "./controls";

export type CreditSample = (typeof model.samples)[number];

// Logical (not alphabetical) order for the dropdowns.
export const CREDIT_ORDER: Record<string, string[]> = {
  checking: ["< 0 DM", "0–200 DM", "≥ 200 DM", "No account"],
  history: ["No credits / all repaid", "All repaid at this bank", "Existing credits on time", "Delays in the past", "Critical / credits elsewhere"],
  savings: ["< 100 DM", "100–500 DM", "500–1000 DM", "≥ 1000 DM", "Unknown / none"],
  employment: ["Unemployed", "< 1 year", "1–4 years", "4–7 years", "≥ 7 years"],
};
const opts = (k: keyof typeof model.options) => CREDIT_ORDER[k] ?? model.options[k];

const labels: Record<string, string> = {
  duration: "Duration (months)",
  amount: "Amount (DM)",
  installment_rate: "Installment % of income",
  checking: "Checking account",
  history: "Credit history",
  purpose: "Purpose",
  savings: "Savings",
  employment: "Employed for",
  property: "Property",
  other_plans: "Other installment plans",
  housing: "Housing",
};

const BAYES = model.costs.bayes_threshold;

/** Remount with a new `key` to load a different preset row. */
export function CreditDemo({ preset }: { preset?: CreditSample | null }) {
  const md = model.medians;
  const [duration, setDuration] = useState(preset?.duration ?? md.duration);
  const [amount, setAmount] = useState(preset?.amount ?? Math.round(md.amount / 50) * 50);
  const [rate, setRate] = useState(String(preset?.installment_rate ?? 3));
  const [checking, setChecking] = useState(preset?.checking ?? "0–200 DM");
  const [history, setHistory] = useState(preset?.history ?? "Existing credits on time");
  const [purpose, setPurpose] = useState(preset?.purpose ?? "Radio / TV");
  const [savings, setSavings] = useState(preset?.savings ?? "< 100 DM");
  const [employment, setEmployment] = useState(preset?.employment ?? "1–4 years");
  const [property, setProperty] = useState(preset?.property ?? "Car / other");
  const [otherPlans, setOtherPlans] = useState(preset?.other_plans ?? "None");
  const [housing, setHousing] = useState(preset?.housing ?? "Own");
  const [policy, setPolicy] = useState<"Cost-aware (1/6)" | "Naive (50%)">("Cost-aware (1/6)");

  const result = useMemo(
    () =>
      predict(model.model as LogRegModel, {
        duration,
        amount,
        installment_rate: Number(rate),
        checking,
        history,
        purpose,
        savings,
        employment,
        property,
        other_plans: otherPlans,
        housing,
      }),
    [duration, amount, rate, checking, history, purpose, savings, employment, property, otherPlans, housing],
  );

  const p = result.probability;
  const t = policy === "Naive (50%)" ? 0.5 : BAYES;
  const decline = p >= t;
  const costApprove = model.costs.approve_bad * p; // expected cost if we approve
  const costDecline = model.costs.decline_good * (1 - p); // expected cost if we decline
  const maxCost = Math.max(costApprove, costDecline, 0.5);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Loan application</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Slider label="Duration" value={duration} min={model.ranges.duration[0]} max={model.ranges.duration[1]} unit=" mo" onChange={setDuration} />
          <Slider label="Amount" value={amount} min={250} max={18400} step={50} unit=" DM" onChange={setAmount} />
        </div>
        <Segmented label="Installment as % of disposable income (1 = low, 4 = high)" value={rate} options={["1", "2", "3", "4"]} onChange={setRate} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Checking account" value={checking} options={opts("checking")} onChange={setChecking} />
          <Select label="Savings" value={savings} options={opts("savings")} onChange={setSavings} />
          <Select label="Credit history" value={history} options={opts("history")} onChange={setHistory} />
          <Select label="Purpose" value={purpose} options={opts("purpose")} onChange={setPurpose} />
          <Select label="Employed for" value={employment} options={opts("employment")} onChange={setEmployment} />
          <Select label="Property" value={property} options={opts("property")} onChange={setProperty} />
          <Select label="Other installment plans" value={otherPlans} options={opts("other_plans")} onChange={setOtherPlans} />
          <Select label="Housing" value={housing} options={opts("housing")} onChange={setHousing} />
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl bg-white p-5 sm:p-6">
        <RiskMeter probability={p} label="Chance this loan defaults" bands={[Math.round(BAYES * 100) / 100, 0.5]} />

        <div>
          <Segmented label="Decision policy" value={policy} options={["Cost-aware (1/6)", "Naive (50%)"]} onChange={setPolicy} />
          <motion.div
            key={`${decline}-${policy}`}
            initial={{ scale: 0.96, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ${decline ? "bg-[#eb6834] text-white" : "bg-ink text-white"}`}
          >
            <span className="text-[1.3rem] font-semibold tracking-[-0.02em]">{decline ? "Decline" : "Approve"}</span>
            <span className="font-mono text-[12px] opacity-80">
              risk {(p * 100).toFixed(0)}% {decline ? "≥" : "<"} {(t * 100).toFixed(1)}%
            </span>
          </motion.div>
        </div>

        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Expected cost of each choice</p>
          {[
            { label: `Approve · ${model.costs.approve_bad} × risk`, v: costApprove, c: RAISES },
            { label: `Decline · ${model.costs.decline_good} × (1 − risk)`, v: costDecline, c: LOWERS },
          ].map((b) => (
            <div key={b.label} className="mt-2.5">
              <div className="flex justify-between text-[12.5px]">
                <span>{b.label}</span>
                <span className="font-mono">{b.v.toFixed(2)}</span>
              </div>
              <div className="mt-1 h-2.5 rounded-full bg-ink/[0.06]">
                <motion.div className="h-full rounded-[4px]" style={{ background: b.c }} animate={{ width: pc((b.v / maxCost) * 100) }} transition={{ type: "spring", stiffness: 200, damping: 26 }} />
              </div>
            </div>
          ))}
          <p className="mt-2 text-[12px] text-muted">The cost-aware policy simply picks the cheaper bar.</p>
        </div>

        {preset && (
          <p className="rounded-xl bg-cream px-3 py-2 text-[12.5px]">
            Loaded application <b className="font-mono">{preset.id}</b>. What really happened: <b>{preset.actual.toLowerCase()}</b>. The demo uses the final
            model trained on all loans, so its score can differ a little from the unseen-model score in the table.
          </p>
        )}

        <Drivers items={result.contributions} labels={labels} max={6} />
      </div>
    </div>
  );
}
