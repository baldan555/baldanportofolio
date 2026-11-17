"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Behind } from "./behind";
import { DEFAULT, MONTHS, PARTIAL, S, monthYear, periodLabel, scopeName, type Period, type Sel } from "./data";
import { Memo } from "./memo";
import { Cancels, Cohorts, Countries, Kpis, MapTile, Products, Segments, Timing, Trend } from "./tiles";
import { dayOf } from "@/lib/months";

const lastDay = dayOf(S.last_day);

export function SalesDashboard() {
  const [sel, setSel] = useState<Sel>(DEFAULT);
  const setScope = (scope: string) => setSel((s) => ({ ...s, scope }));
  const setPeriod = (period: Period) => setSel((s) => ({ ...s, period }));
  const changed = sel.scope !== DEFAULT.scope || sel.period !== DEFAULT.period;
  return (
    <div className="mx-auto max-w-[1400px] px-3 sm:px-5 md:px-10">
      <div className="z-30 -mx-3 mb-3 bg-bg/90 px-3 py-2.5 backdrop-blur sm:-mx-5 sm:px-5 md:sticky md:top-[7.6rem] md:-mx-10 md:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white py-1 pr-1 pl-3 text-[12.5px]">
            <span className="text-muted">Country</span>
            <select value={sel.scope} onChange={(e) => setScope(e.target.value)} className="rounded-full bg-ink/[0.04] px-2 py-0.5 font-semibold outline-none" aria-label="Country filter">
              {S.scopes.map((s) => (
                <option key={s} value={s}>
                  {scopeName(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white py-1 pr-1 pl-3 text-[12.5px]">
            <span className="text-muted">Period</span>
            <select
              value={String(sel.period)}
              onChange={(e) => setPeriod(e.target.value === "year" ? "year" : Number(e.target.value))}
              className="rounded-full bg-ink/[0.04] px-2 py-0.5 font-semibold outline-none"
              aria-label="Period filter"
            >
              <option value="year">{periodLabel("year")}</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {monthYear(m)}
                  {i === PARTIAL ? " (9 days)" : ""}
                </option>
              ))}
            </select>
          </label>
          {changed && (
            <button type="button" onClick={() => setSel(DEFAULT)} className="flex items-center gap-1 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[12px] hover:border-ink/30">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-ink-2/55">
            <span className="h-2 w-2 rounded-full bg-[#1baf7a]" /> Data to {lastDay} · {scopeName(sel.scope)} · {periodLabel(sel.period)}
            {sel.period !== "year" && sel.period > 0 ? ` vs ${monthYear(MONTHS[sel.period - 1], "short")}` : ""}
          </span>
        </div>
      </div>

      <Kpis sel={sel} />
      <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <Trend sel={sel} onPick={setPeriod} />
        <Memo sel={sel} />
        <MapTile sel={sel} onScope={setScope} />
        <Countries sel={sel} onScope={setScope} />
        <Products sel={sel} />
        <Timing sel={sel} />
        <Cancels sel={sel} onPick={setPeriod} />
        <Cohorts sel={sel} />
        <Segments sel={sel} />
        <Behind />
      </div>
    </div>
  );
}
