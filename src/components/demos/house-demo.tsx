"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/house-price-range.json";
import { pc, Segmented, Select, Slider } from "./controls";

type LinModel = { intercept: number; numeric: Record<string, { mean: number; scale: number; coef: number }>; categorical: Record<string, Record<string, number>> };
export type HouseSample = (typeof model.samples)[number];
export type House = {
  area: number;
  qual: number;
  cond: number;
  built: number;
  remod: number;
  basement: number;
  garage: number;
  baths: number;
  fireplaces: number;
  lot: number;
  kitchen: number;
  air: number;
  hood: string;
  bldg: string;
};

export const HOOD_NAME: Record<string, string> = { ...(model.hoods as Record<string, string>), Other: "Other (small neighbourhoods)" };
export const BLDG_NAME: Record<string, string> = { "1Fam": "Detached", TwnhsE: "Townhouse, end", Twnhs: "Townhouse, inside", Duplex: "Duplex", "2fmCon": "Two-family conversion" };
const KITCHEN = ["Fair", "Typical", "Good", "Excellent"] as const;
const LABEL: Record<string, string> = {
  log_area: "Living area",
  "Overall Qual": "Overall quality",
  "Overall Cond": "Condition",
  "Year Built": "Year built",
  remod: "Last remodel",
  basement: "Basement",
  garage: "Garage",
  baths: "Bathrooms",
  Fireplaces: "Fireplaces",
  log_lot: "Lot size",
  kitchen: "Kitchen",
  air: "Central air",
  hood: "Neighbourhood",
  bldg: "Building type",
};
export const usd = (v: number) => `$${Math.round(v / 1000).toLocaleString("en-US")}k`;

function features(h: House): Record<string, number | string> {
  return {
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
  };
}

function linear(m: LinModel, x: Record<string, number | string>) {
  let s = m.intercept;
  for (const [f, p] of Object.entries(m.numeric)) s += (p.coef * (Number(x[f]) - p.mean)) / p.scale;
  for (const [f, cats] of Object.entries(m.categorical)) s += cats[String(x[f])] ?? 0;
  return s;
}

const M = model.models as Record<"q10" | "q50" | "q90", LinModel>;

/** 80% price range: linear quantile regressions on log price, widened by the conformal offset from 2009. */
export function priceRange(h: House) {
  const x = features(h);
  const raw = [Math.exp(linear(M.q10, x) - model.offset), Math.exp(linear(M.q50, x)), Math.exp(linear(M.q90, x) + model.offset)];
  const [lo, mid, hi] = [...raw].sort((a, b) => a - b); // separate quantile lines can cross for unusual houses
  return { lo, mid, hi };
}

const TYPICAL: House = { ...(model.medians as House) };

/** How each feature moves the median price compared with a typical Ames house (median of every feature). */
function drivers(h: House) {
  const x = features(h);
  const ref = features(TYPICAL);
  const out: { key: string; pct: number; value: string }[] = [];
  for (const [f, p] of Object.entries(M.q50.numeric)) {
    const d = (p.coef * (Number(x[f]) - Number(ref[f]))) / p.scale;
    out.push({ key: f, pct: Math.exp(d) - 1, value: valueOf(f, h) });
  }
  for (const [f, cats] of Object.entries(M.q50.categorical)) {
    const d = (cats[String(x[f])] ?? 0) - (cats[String(ref[f])] ?? 0);
    out.push({ key: f, pct: Math.exp(d) - 1, value: valueOf(f, h) });
  }
  return out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
}

function valueOf(f: string, h: House) {
  switch (f) {
    case "log_area":
      return `${h.area.toLocaleString("en-US")} sq ft`;
    case "log_lot":
      return `${h.lot.toLocaleString("en-US")} sq ft`;
    case "Overall Qual":
      return `${h.qual}/10`;
    case "Overall Cond":
      return `${h.cond}/9`;
    case "Year Built":
      return String(h.built);
    case "remod":
      return String(Math.max(h.remod, h.built));
    case "basement":
      return `${h.basement.toLocaleString("en-US")} sq ft`;
    case "garage":
      return `${h.garage} car${h.garage === 1 ? "" : "s"}`;
    case "baths":
      return String(h.baths);
    case "Fireplaces":
      return String(h.fireplaces);
    case "kitchen":
      return KITCHEN[h.kitchen - 2] ?? "Poor";
    case "air":
      return h.air ? "Yes" : "No";
    case "hood":
      return HOOD_NAME[h.hood] ?? h.hood;
    case "bldg":
      return BLDG_NAME[h.bldg] ?? h.bldg;
    default:
      return "";
  }
}

export function HouseDemo({ preset }: { preset?: HouseSample | null }) {
  const [h, setH] = useState<House>(() => (preset ? { ...preset } : { ...TYPICAL }));
  const set = <K extends keyof House>(k: K) => (v: House[K]) => setH((s) => ({ ...s, [k]: v }));
  const r = useMemo(() => priceRange(h), [h]);
  const dr = useMemo(() => drivers(h).slice(0, 7), [h]);
  const typical = useMemo(() => priceRange(TYPICAL).mid, []);
  const lo = Math.min(r.lo, preset?.price ?? r.lo) * 0.8;
  const hi = Math.max(r.hi, preset?.price ?? r.hi) * 1.15;
  const x = (v: number) => pc(((v - lo) / (hi - lo)) * 100);
  const maxPct = Math.max(0.05, ...dr.map((d) => Math.abs(d.pct)));
  const hoodNames = Object.values(HOOD_NAME);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      <div className="grid gap-4 rounded-2xl bg-white p-5 sm:grid-cols-2 sm:p-6">
        <Slider label="Living area (sq ft)" value={h.area} min={500} max={4000} step={10} onChange={set("area")} />
        <Slider label="Overall quality (1–10)" value={h.qual} min={1} max={10} onChange={set("qual")} />
        <Slider label="Condition (1–9)" value={h.cond} min={1} max={9} onChange={set("cond")} />
        <Slider label="Year built" value={h.built} min={1872} max={2010} onChange={set("built")} />
        <Slider label="Last remodel" value={Math.max(h.remod, h.built)} min={1950} max={2010} onChange={set("remod")} />
        <Slider label="Basement (sq ft)" value={h.basement} min={0} max={2500} step={10} onChange={set("basement")} />
        <Slider label="Garage (cars)" value={h.garage} min={0} max={4} onChange={set("garage")} />
        <Slider label="Bathrooms" value={h.baths} min={1} max={5} step={0.5} onChange={set("baths")} />
        <Slider label="Fireplaces" value={h.fireplaces} min={0} max={3} onChange={set("fireplaces")} />
        <Slider label="Lot (sq ft)" value={h.lot} min={1500} max={35000} step={100} onChange={set("lot")} />
        <Segmented label="Kitchen" value={KITCHEN[Math.max(0, h.kitchen - 2)]} options={[...KITCHEN]} onChange={(v) => set("kitchen")(KITCHEN.indexOf(v) + 2)} />
        <Segmented<"Yes" | "No"> label="Central air" value={h.air ? "Yes" : "No"} options={["Yes", "No"]} onChange={(v) => set("air")(v === "Yes" ? 1 : 0)} />
        <div className="sm:col-span-2">
          <Select label="Neighbourhood" value={HOOD_NAME[h.hood] ?? h.hood} options={hoodNames} onChange={(v) => set("hood")(Object.keys(HOOD_NAME).find((k) => HOOD_NAME[k] === v) ?? "Other")} />
        </div>
        <div className="sm:col-span-2">
          <Segmented label="Building type" value={BLDG_NAME[h.bldg] ?? h.bldg} options={model.bldg_types.map((b) => BLDG_NAME[b] ?? b)} onChange={(v) => set("bldg")(Object.keys(BLDG_NAME).find((k) => BLDG_NAME[k] === v) ?? "1Fam")} />
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl bg-white p-5 sm:p-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">80% price range</p>
          <p className="mt-2 text-[2.4rem] leading-none font-semibold tracking-[-0.045em]">
            {usd(r.lo)} – {usd(r.hi)}
          </p>
          <p className="mt-2 text-[13px] text-ink-2/75">
            Middle estimate <b>{usd(r.mid)}</b> · range ±{Math.round(((r.hi - r.lo) / 2 / r.mid) * 100)}% · typical Ames house {usd(typical)}
          </p>
        </div>

        <div className="relative h-16">
          <div className="absolute inset-x-0 top-7 h-px bg-ink/15" />
          <motion.div className="absolute top-4 h-7 rounded-full bg-[#2a78d6]/20 ring-1 ring-[#2a78d6]/40" initial={false} animate={{ left: x(r.lo), width: pc(((r.hi - r.lo) / (hi - lo)) * 100) }} transition={{ type: "spring", stiffness: 170, damping: 24 }} />
          <motion.div className="absolute top-2.5 h-10 w-[3px] -translate-x-1/2 rounded-full bg-ink" initial={false} animate={{ left: x(r.mid) }} transition={{ type: "spring", stiffness: 170, damping: 24 }} />
          {preset && <span className="absolute top-1 h-12 w-0 -translate-x-1/2 border-l-2 border-dashed border-[#eb6834]" style={{ left: x(preset.price) }} title={`Sold for $${preset.price.toLocaleString("en-US")}`} />}
          <span className="absolute top-12 font-mono text-[10.5px] text-muted" style={{ left: 0 }}>
            {usd(lo)}
          </span>
          <span className="absolute top-12 right-0 font-mono text-[10.5px] text-muted">{usd(hi)}</span>
        </div>

        {preset && (
          <p className="-mt-2 rounded-xl bg-cream px-3.5 py-2.5 text-[12.5px]">
            {preset.id} sold in 2010 for <b>${preset.price.toLocaleString("en-US")}</b> (dashed line).{" "}
            {preset.price >= r.lo && preset.price <= r.hi ? "Inside the range." : "Outside the range: one of the roughly 1 in 5 that should fall outside."}
          </p>
        )}

        <div>
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Versus a typical Ames house</p>
          <ul className="mt-3 space-y-2">
            {dr.map((d) => (
              <li key={d.key}>
                <div className="flex justify-between gap-3 text-[12.5px]">
                  <span className="font-medium">
                    {LABEL[d.key]} <span className="font-normal text-muted">· {d.value}</span>
                  </span>
                  <span className={`font-mono ${d.pct >= 0 ? "text-ink" : "text-[#e34948]"}`}>{`${d.pct >= 0 ? "+" : ""}${(d.pct * 100).toFixed(1)}%`}</span>
                </div>
                <div className="relative mt-1 h-2">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-ink/25" />
                  <motion.span
                    className="absolute inset-y-0 rounded-[4px]"
                    style={{ background: d.pct >= 0 ? "#2a78d6" : "#eb6834" }}
                    initial={false}
                    animate={{ left: d.pct >= 0 ? "50%" : pc(50 - (Math.abs(d.pct) / maxPct) * 50), width: pc((Math.abs(d.pct) / maxPct) * 50) }}
                    transition={{ type: "spring", stiffness: 200, damping: 26 }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
