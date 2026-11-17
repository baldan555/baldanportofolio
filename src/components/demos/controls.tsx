"use client";

import { motion } from "framer-motion";
import type { Contribution } from "@/lib/logreg";

// Validated categorical slots (dataviz reference palette, light mode).
export const RAISES = "#eb6834"; // slot 2 orange — pushes risk up
export const LOWERS = "#2a78d6"; // slot 1 blue — pulls risk down

/** Percent string rounded to 2 decimals, so server and client render identical inline styles. */
export const pc = (v: number) => `${Math.round(v * 100) / 100}%`;

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[13.5px]">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-[13px]">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink/10 accent-[#0b0b0b]"
      />
    </label>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  display,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
  display?: (v: T) => string;
}) {
  return (
    <div>
      <p className="text-[13.5px] font-medium">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] transition-colors ${
              value === o ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/70 hover:border-ink/30"
            }`}
          >
            {display ? display(o) : o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[13.5px] font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full cursor-pointer rounded-xl border border-ink/10 bg-white px-3 py-2 text-[13.5px] outline-none focus:border-ink/40"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Big probability readout with a track and a moving marker. */
export function RiskMeter({ probability, label, bands = [0.3, 0.6] }: { probability: number; label: string; bands?: [number, number] }) {
  const pct = probability * 100;
  const level = probability < bands[0] ? "Low" : probability < bands[1] ? "Medium" : "High";
  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">{label}</p>
      <div className="mt-2 flex items-baseline gap-3">
        <motion.span key={Math.round(pct)} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[4rem] leading-none font-semibold tracking-[-0.05em]">
          {pct.toFixed(0)}%
        </motion.span>
        <span className="rounded-full border border-ink/15 px-2.5 py-1 text-[12.5px] font-medium">{level} risk</span>
      </div>
      <div className="relative mt-5 h-2 rounded-full bg-ink/10">
        <div className="absolute inset-y-0 rounded-full bg-ink/15" style={{ left: `${bands[0] * 100}%`, width: `${(bands[1] - bands[0]) * 100}%` }} />
        <motion.div className="absolute inset-y-0 left-0 rounded-full bg-ink" animate={{ width: pc(pct) }} transition={{ type: "spring", stiffness: 160, damping: 22 }} />
        <motion.span
          className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-[3px] border-ink bg-white shadow"
          animate={{ left: pc(pct) }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10.5px] text-muted">
        <span>0%</span>
        <span>{bands[0] * 100}%</span>
        <span>{bands[1] * 100}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/** Diverging bars: what pushes the prediction up or down for this exact input. */
export function Drivers({
  items,
  labels,
  max = 6,
  upLabel = "raises risk",
  downLabel = "lowers risk",
  upColor = RAISES,
  downColor = LOWERS,
  unit = "on the log-odds",
}: {
  items: Contribution[];
  labels: Record<string, string>;
  max?: number;
  upLabel?: string;
  downLabel?: string;
  upColor?: string;
  downColor?: string;
  unit?: string;
}) {
  const top = items.slice(0, max);
  const scale = Math.max(0.5, ...top.map((t) => Math.abs(t.effect)));
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Why</p>
        <div className="flex gap-3 text-[11.5px] text-ink-2/70">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: downColor }} /> {downLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: upColor }} /> {upLabel}
          </span>
        </div>
      </div>
      <ul className="mt-3 space-y-2.5">
        {top.map((c) => {
          const w = (Math.abs(c.effect) / scale) * 50;
          const up = c.effect > 0;
          return (
            <li key={c.feature} title={`${labels[c.feature] ?? c.feature}: ${c.effect >= 0 ? "+" : ""}${c.effect.toFixed(2)} ${unit}`}>
              <div className="flex justify-between text-[12.5px]">
                <span className="font-medium">{labels[c.feature] ?? c.feature}</span>
                <span className="text-ink-2/60">{c.value}</span>
              </div>
              <div className="relative mt-1 h-2.5">
                <span className="absolute top-0 bottom-0 left-1/2 w-px bg-ink/25" />
                <motion.span
                  className="absolute top-0 bottom-0 rounded-[4px]"
                  style={{ background: up ? upColor : downColor }}
                  animate={{ left: up ? "50%" : pc(50 - w), width: pc(w) }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
