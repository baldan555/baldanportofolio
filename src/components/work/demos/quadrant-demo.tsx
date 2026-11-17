"use client";

import { useState } from "react";

/* Partner Quadrant's scoring (app.js): each axis = weighted average of its scores (0–100);
 * Willingness ≥ 80 and Capability ≥ 80 → Strategic; only capability → Performance; only willingness → Growth; neither → At Risk. */

const W_ITEMS = ["Program uptake", "Stock commitment", "Report discipline"];
const C_ITEMS = ["Outlet coverage", "Sales team", "Working capital"];
const QUAD = {
  HH: { name: "Strategic Partner", cls: "bg-[#dcfce7] text-[#15803d]" },
  LH: { name: "Performance Partner", cls: "bg-[#dbeafe] text-[#1d4ed8]" },
  HL: { name: "Growth Partner", cls: "bg-[#fef3c7] text-[#a16207]" },
  LL: { name: "At Risk Partner", cls: "bg-[#fee2e2] text-[#b91c1c]" },
};

export function QuadrantDemo() {
  const [w, setW] = useState([86, 74, 90]);
  const [c, setC] = useState([70, 82, 64]);
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const W = avg(w);
  const C = avg(c);
  const key = (W >= 80 ? "H" : "L") + (C >= 80 ? "H" : "L");
  const q = QUAD[(key === "HH" ? "HH" : key === "LH" ? "LH" : key === "HL" ? "HL" : "LL") as keyof typeof QUAD];

  const group = (title: string, items: string[], vals: number[], set: (v: number[]) => void) => (
    <div>
      <p className="font-mono text-[11px] tracking-[0.14em] text-ink/50 uppercase">{title}</p>
      {items.map((it, i) => (
        <label key={it} className="mt-3 block">
          <span className="flex justify-between text-[12.5px] text-ink/70">
            <span>{it}</span>
            <span className="font-mono text-ink">{vals[i]}</span>
          </span>
          <input type="range" min={0} max={100} value={vals[i]} onChange={(e) => set(vals.map((v, k) => (k === i ? +e.target.value : v)))} className="w-full accent-[#94700a]" aria-label={it} />
        </label>
      ))}
    </div>
  );

  return (
    <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
      <div className="flex flex-col gap-6 rounded-[22px] border border-line bg-white p-5">
        <p className="text-[14px] text-ink-2/70">Partner Quadrant: score one distributor.</p>
        {group("Willingness", W_ITEMS, w, setW)}
        {group("Capability", C_ITEMS, c, setC)}
      </div>
      <div className="rounded-[22px] border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${q.cls}`}>{q.name}</span>
          <span className="font-mono text-[12px] text-ink/60">
            W {W.toFixed(1)} · C {C.toFixed(1)}
          </span>
        </div>
        <div className="relative mt-4 aspect-square w-full max-w-[420px] rounded-2xl border border-line">
          {/* quadrants split at 80 / 80 */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "80% 20%", gridTemplateRows: "20% 80%" }}>
            <div className="bg-[#dbeafe]/50" />
            <div className="bg-[#dcfce7]/60" />
            <div className="bg-[#fee2e2]/45" />
            <div className="bg-[#fef3c7]/60" />
          </div>
          <span className="absolute top-2 left-3 font-mono text-[10.5px] text-[#1d4ed8]">Performance</span>
          <span className="absolute top-2 right-2 font-mono text-[10.5px] text-[#15803d]">Strategic</span>
          <span className="absolute bottom-2 left-3 font-mono text-[10.5px] text-[#b91c1c]">At Risk</span>
          <span className="absolute right-2 bottom-2 font-mono text-[10.5px] text-[#a16207]">Growth</span>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[11px] text-ink/50">Willingness →</span>
          <span className="absolute top-1/2 -left-7 -translate-y-1/2 -rotate-90 font-mono text-[11px] text-ink/50">Capability →</span>
          <span className="absolute h-5 w-5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-[#7a5a08] shadow transition-all" style={{ left: `${W}%`, bottom: `${C}%` }} />
        </div>
        <p className="mt-9 text-[12.5px] text-ink/50">It replaces one long Excel IF formula with a chart a manager can read at a glance.</p>
      </div>
    </div>
  );
}
