"use client";

import { useState } from "react";

/* The D-1 KPI TV dashboard's own display rules (static/app.js):
 * achievement = MTD / target, rounded to 1 decimal before colouring (≥100 good, ≥80 warning, else critical);
 * growth = MTD / LMTD − 1, an arrow only beyond ±0.05%; money scaled to K / M / Bn / Tn; branches sorted worst achievement first. */

function fmtRp(n: number) {
  const abs = Math.abs(n);
  const [unit, div] = abs >= 1e12 ? ["Tn", 1e12] : abs >= 1e9 ? ["Bn", 1e9] : abs >= 1e6 ? ["M", 1e6] : abs >= 1e3 ? ["K", 1e3] : ["", 1];
  return unit ? `${(n / div).toFixed(1)} ${unit}` : `${Math.round(n)}`;
}
const achStatus = (pct: number) => {
  const r = Math.round(pct * 10) / 10;
  return r >= 100 ? "good" : r >= 80 ? "warning" : "critical";
};
const dir = (g: number) => (g > 0.05 ? "up" : g < -0.05 ? "down" : "flat");
const COLORS = { good: "text-[#16a34a]", warning: "text-[#c98100]", critical: "text-[#d03b3b]" };
const ARROWS = { up: "▲", down: "▼", flat: "–" };

const BRANCHES = [
  { name: "Teluk Indah", mtd: 3.9e9, lmtd: 3.8e9, target: 3.7e9 },
  { name: "Pasar Lama", mtd: 3.6e9, lmtd: 3.4e9, target: 4.2e9 },
  { name: "Mekar Sari", mtd: 2.4e9, lmtd: 2.6e9, target: 3.3e9 },
];

export function KpiTvDemo() {
  const [mtd, setMtd] = useState(4.6e9);
  const [lmtd, setLmtd] = useState(4.4e9);
  const [target, setTarget] = useState(5.1e9);
  const ach = (mtd / target) * 100;
  const growth = (mtd / lmtd - 1) * 100;
  const rows = [{ name: "Your branch", mtd, lmtd, target, you: true }, ...BRANCHES.map((b) => ({ ...b, you: false }))]
    .map((r) => ({ ...r, ach: (r.mtd / r.target) * 100, growth: (r.mtd / r.lmtd - 1) * 100 }))
    .sort((a, b) => a.ach - b.ach);

  const slider = (label: string, v: number, set: (n: number) => void) => (
    <label className="block">
      <span className="flex justify-between font-mono text-[12px] text-ink/60">
        <span>{label}</span>
        <span className="text-ink">{fmtRp(v)}</span>
      </span>
      <input type="range" min={1e9} max={8e9} step={0.05e9} value={v} onChange={(e) => set(+e.target.value)} className="mt-2 w-full accent-[#94700a]" aria-label={label} />
    </label>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      <div className="flex flex-col gap-5 rounded-[22px] border border-line bg-white p-5">
        <p className="text-[14px] text-ink-2/70">Move the numbers for one branch&apos;s Secondary sales:</p>
        {slider("MTD (this month so far)", mtd, setMtd)}
        {slider("LMTD (same days last month)", lmtd, setLmtd)}
        {slider("Target", target, setTarget)}
        <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.12em] text-ink/50 uppercase">Ach.</p>
            <p className={`text-[28px] font-semibold ${COLORS[achStatus(ach)]}`}>{ach.toFixed(1)}%</p>
            <p className="text-[12px] text-ink/50">{achStatus(ach) === "good" ? "on target" : achStatus(ach) === "warning" ? "80–99.9%" : "under 80%"}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-[0.12em] text-ink/50 uppercase">Growth</p>
            <p className={`text-[28px] font-semibold ${dir(growth) === "up" ? "text-[#16a34a]" : dir(growth) === "down" ? "text-[#d03b3b]" : "text-ink/50"}`}>
              {ARROWS[dir(growth)]} {growth > 0 ? "+" : ""}
              {growth.toFixed(1)}%
            </p>
            <p className="text-[12px] text-ink/50">vs LMTD</p>
          </div>
        </div>
      </div>

      {/* the table as the TV shows it: worst achievement first */}
      <div className="overflow-hidden rounded-[22px] border border-[#94700a]/25 bg-[#f1ede2]">
        <div className="bg-gradient-to-br from-[#6b4e05] to-[#a07a10] px-5 py-3 font-semibold text-white">Secondary · worst first</div>
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-2 px-5 pt-3 pb-2 font-mono text-[11px] tracking-[0.1em] text-ink/50 uppercase">
          <span>Branch</span>
          <span className="text-right">MTD</span>
          <span className="text-right">Target</span>
          <span className="text-right">Ach.</span>
          <span className="text-right">Growth</span>
        </div>
        {rows.map((r) => (
          <div key={r.name} className={`grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] items-center gap-2 border-t border-[#94700a]/10 px-5 py-3 text-[14px] transition-colors ${r.you ? "bg-white font-semibold" : "bg-white/60"}`}>
            <span className="truncate">{r.name}</span>
            <span className="text-right tabular-nums">{fmtRp(r.mtd)}</span>
            <span className="text-right tabular-nums text-ink/60">{fmtRp(r.target)}</span>
            <span className={`text-right font-semibold tabular-nums ${COLORS[achStatus(r.ach)]}`}>{r.ach.toFixed(1)}%</span>
            <span className={`text-right tabular-nums ${dir(r.growth) === "up" ? "text-[#16a34a]" : dir(r.growth) === "down" ? "text-[#d03b3b]" : "text-ink/50"}`}>
              {ARROWS[dir(r.growth)]} {r.growth > 0 ? "+" : ""}
              {r.growth.toFixed(1)}%
            </span>
          </div>
        ))}
        <p className="px-5 py-3 font-mono text-[11px] text-ink/50">Rounded to one decimal before colouring, so 99.96% shows as 100.0% and is green, never a red “100.0%”.</p>
      </div>
    </div>
  );
}
