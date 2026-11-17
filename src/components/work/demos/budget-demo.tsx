"use client";

import { useState } from "react";

/* Budget Tower's quarter meter (dashboard/page.tsx, lib/dashboardData.ts):
 * committed = Σ Plan Cost of the proposals, realized = Σ Accurate Cost of the payments, remaining = budget − committed;
 * pct = committed / budget (100 when there is no budget but money is committed); ≥ 100 critical, ≥ 80 warning (high is bad: it's spending);
 * the bar's base = max(budget, committed): realized, committed-not-yet-realized, remaining. */

const fmt = (n: number) => `Rp ${(n / 1e9).toFixed(2).replace(".", ",")} M`;

export function BudgetDemo() {
  const [budget, setBudget] = useState(4.2e9);
  const [committed, setCommitted] = useState(3.41e9);
  const [realized, setRealized] = useState(2.68e9);
  const r = Math.min(realized, committed);
  const pct = budget > 0 ? (committed / budget) * 100 : committed > 0 ? 100 : 0;
  const status = pct >= 100 ? "critical" : pct >= 80 ? "warning" : "good";
  const base = Math.max(budget, committed, 1);
  const seg = { realized: Math.max(r, 0) / base, pending: Math.max(committed - r, 0) / base, left: Math.max(base - committed, 0) / base };
  const remaining = budget - committed;
  const color = { critical: "text-[#d03b3b]", warning: "text-[#c97f00]", good: "text-[#0ca30c]" }[status];

  const slider = (label: string, v: number, set: (n: number) => void, max: number, accent: string) => (
    <label className="block">
      <span className="flex justify-between font-mono text-[12px] text-ink/60">
        <span>{label}</span>
        <span className="text-ink">{fmt(v)}</span>
      </span>
      <input type="range" min={0} max={max} step={0.01e9} value={v} onChange={(e) => set(+e.target.value)} className={`mt-2 w-full ${accent}`} aria-label={label} />
    </label>
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
      <div className="flex flex-col gap-5 rounded-[22px] border border-line bg-white p-5">
        {slider("Quarter budget", budget, setBudget, 7e9, "accent-[#4a3aa7]")}
        {slider("Committed (Plan Cost of proposals)", committed, (v) => {
          setCommitted(v);
          if (realized > v) setRealized(v);
        }, 7e9, "accent-[#2a63d6]")}
        {slider("Realized (Accurate Cost paid)", realized, (v) => setRealized(Math.min(v, committed)), 7e9, "accent-[#0ca30c]")}
      </div>
      <div className="rounded-[22px] border border-line bg-white p-6">
        <div className="flex items-baseline justify-between">
          <p className="text-[17px] font-semibold">
            Q1 <span className="text-[14px] font-normal text-ink/50">Jan – Mar</span>
          </p>
          <p className={`font-mono text-[15px] font-semibold ${color}`}>{pct.toFixed(1).replace(".", ",")}%</p>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-ink/5">
          <div className="bg-[#0ca30c] transition-all" style={{ width: `${seg.realized * 100}%` }} />
          <div className="bg-[#2a63d6] transition-all" style={{ width: `${seg.pending * 100}%` }} />
          <div className="bg-[#4a3aa7] transition-all" style={{ width: `${seg.left * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          <span className="text-[#0ca30c]">Realized: {fmt(r)}</span>
          <span className="text-[#2a63d6]">Committed: {fmt(committed)}</span>
          <span className="text-ink/50">Budget: {fmt(budget)}</span>
          <span className={remaining < 0 ? "font-semibold text-[#d03b3b]" : "text-[#4a3aa7]"}>Remaining: {fmt(remaining)}</span>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-[13px] text-ink-2/70">
          <p>
            <span className="block font-semibold text-ink">Under 80%</span>room to spend
          </p>
          <p>
            <span className="block font-semibold text-[#c97f00]">80 – 99.9%</span>close to the ceiling
          </p>
          <p>
            <span className="block font-semibold text-[#d03b3b]">100% +</span>over budget
          </p>
        </div>
        <p className="mt-4 text-[12.5px] text-ink/50">Remaining is counted against what&apos;s committed, not what&apos;s paid: once a proposal is approved, that money is spoken for.</p>
      </div>
    </div>
  );
}
