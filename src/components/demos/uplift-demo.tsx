"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/uplift-promo.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { pc, Segmented, Slider } from "./controls";

export type CustomerSample = (typeof model.samples)[number];
type Arm = "none" | "mens" | "womens";
export type Campaign = "womens" | "mens";

export const ARM_LABEL: Record<Arm, string> = { none: "No e-mail", mens: "Men's e-mail", womens: "Women's e-mail" };
export const ARM_COLOR: Record<Arm, string> = { none: "#8a8a85", mens: "#2a78d6", womens: "#eb6834" };
const BOUGHT = ["Men's", "Women's", "Both"] as const;
type Bought = (typeof BOUGHT)[number];

/** P(visit within two weeks) for one customer under each arm, from the three exported logistic models. */
export function visitChances(c: { recency: number; history: number; mens: number; womens: number; newbie: number; zip_code: string; channel: string }) {
  const input = { recency: c.recency, log_history: Math.log1p(c.history), mens: c.mens, womens: c.womens, newbie: c.newbie, zip_code: c.zip_code, channel: c.channel };
  const p = (arm: Arm) => predict(model.models[arm] as LogRegModel, input).probability;
  return { none: p("none"), mens: p("mens"), womens: p("womens") };
}

/* ------------------------------------------------------------------ */
/* Targeting: who should get the e-mail?                               */
/* ------------------------------------------------------------------ */

export function TargetingDemo() {
  const [campaign, setCampaign] = useState<Campaign>("womens");
  const [q, setQ] = useState(50);
  const grid = model.curves.grid;
  const cur = (model.curves as unknown as Record<Campaign, Record<string, number[]>>)[campaign];
  const up = cur["T-learner · logistic"];
  const resp = cur["Response model (who visits)"];
  const total = up[up.length - 1];
  const i = Math.round(q / 5);
  const gain = up[i];
  const randGain = (q / 100) * total;

  const W = 440;
  const H = 260;
  const M = { l: 42, r: 12, t: 14, b: 36 };
  const yMax = Math.ceil((Math.max(...up, ...resp, total) * 1.1) / 10) * 10;
  const sx = (v: number) => M.l + v * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - (v / yMax) * (H - M.t - M.b);
  const path = (arr: number[]) => arr.map((v, k) => `${k ? "L" : "M"}${sx(grid[k]).toFixed(1)},${sy(v).toFixed(1)}`).join("");

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex flex-col gap-5 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Who gets the e-mail?</p>
        <Segmented<Campaign> label="Campaign" value={campaign} options={["womens", "mens"]} onChange={setCampaign} display={(v) => ARM_LABEL[v]} />
        <Slider label="E-mail the top share, ranked by predicted uplift" value={q} min={0} max={100} step={5} unit="%" onChange={setQ} />
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: `+${gain.toFixed(1)}`, l: "extra visits per 1,000 customers" },
            { v: `+${randGain.toFixed(1)}`, l: "if the same number were picked at random" },
            { v: total > 0 ? `${Math.round((gain / total) * 100)}%` : "–", l: "of the effect of e-mailing everyone" },
            { v: `${100 - q}%`, l: "of e-mails saved" },
          ].map((s) => (
            <motion.div key={s.l + s.v} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className="rounded-xl bg-cream/70 px-4 py-3">
              <p className="text-[1.6rem] leading-none font-semibold tracking-[-0.04em]">{s.v}</p>
              <p className="mt-1.5 text-[11.5px] text-ink-2/70">{s.l}</p>
            </motion.div>
          ))}
        </div>
        <p className="text-[12px] text-muted">
          Measured on the randomised test itself: within the chosen group, visit rates of customers who got the e-mail minus those who didn&apos;t. Scores are out-of-fold.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] font-semibold">Extra visits vs share e-mailed</p>
          <div className="flex flex-wrap gap-3 text-[11.5px] text-ink-2/70">
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 bg-ink" /> uplift model
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4" style={{ background: "#eb6834" }} /> response model
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 bg-ink/30" /> random
            </span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={M.l} x2={W - M.r} y1={sy(yMax * f)} y2={sy(yMax * f)} stroke="rgba(11,11,11,0.07)" />
              <text x={M.l - 6} y={sy(yMax * f) + 4} textAnchor="end" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
                {Math.round(yMax * f)}
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <text key={v} x={sx(v)} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
              {Math.round(v * 100)}%
            </text>
          ))}
          <text x={(W + M.l) / 2} y={H - 3} textAnchor="middle" fontSize="10.5" fill="#5f5f5a">
            share of customers e-mailed
          </text>
          <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(total)} stroke="#0b0b0b" strokeOpacity={0.3} strokeDasharray="4 4" />
          <path d={path(resp)} fill="none" stroke="#eb6834" strokeWidth={1.8} strokeDasharray="6 4" />
          <motion.path key={campaign} d={path(up)} fill="none" stroke="#0b0b0b" strokeWidth={2.4} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
          <line x1={sx(q / 100)} x2={sx(q / 100)} y1={M.t} y2={H - M.b} stroke="#0b0b0b" strokeOpacity={0.3} />
          <circle cx={sx(q / 100)} cy={sy(gain)} r={6} fill="#2a78d6" stroke="#fff" strokeWidth={2.5} />
        </svg>
        <p className="mt-2 text-[12.5px] text-ink-2/75">
          {campaign === "womens"
            ? "The curve bends early: the women's e-mail works for some customers and barely for others, so ranking pays off."
            : "Almost a straight line: the men's e-mail nudges nearly everyone by the same amount, so there is little to target."}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One customer: which e-mail, if any?                                 */
/* ------------------------------------------------------------------ */

const boughtOf = (s?: CustomerSample | null): Bought => (!s ? "Women's" : s.mens && s.womens ? "Both" : s.mens ? "Men's" : "Women's");

export function CustomerDemo({ preset }: { preset?: CustomerSample | null }) {
  const [recency, setRecency] = useState(preset?.recency ?? model.medians.recency);
  const [history, setHistory] = useState(preset ? Math.round(preset.history) : model.medians.history);
  const [bought, setBought] = useState<Bought>(boughtOf(preset));
  const [newbie, setNewbie] = useState<"Yes" | "No">(preset ? (preset.newbie ? "Yes" : "No") : "Yes");
  const [channel, setChannel] = useState(preset?.channel ?? "Web");
  const [zip, setZip] = useState(preset?.zip_code ?? "Suburban");

  const p = useMemo(
    () =>
      visitChances({
        recency,
        history: preset && Math.round(preset.history) === history ? preset.history : history,
        mens: bought !== "Women's" ? 1 : 0,
        womens: bought !== "Men's" ? 1 : 0,
        newbie: newbie === "Yes" ? 1 : 0,
        zip_code: zip,
        channel,
      }),
    [recency, history, bought, newbie, zip, channel, preset],
  );
  const upM = p.mens - p.none;
  const upW = p.womens - p.none;
  const best: Arm = Math.max(upM, upW) < 0.01 ? "none" : upM >= upW ? "mens" : "womens";
  const max = Math.max(p.none, p.mens, p.womens);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="grid gap-4 rounded-2xl bg-white p-5 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <Slider label="Months since last purchase" value={recency} min={1} max={12} onChange={setRecency} />
        </div>
        <div className="sm:col-span-2">
          <Slider label="Spent in the past year ($)" value={history} min={30} max={3350} step={10} onChange={setHistory} />
        </div>
        <Segmented<Bought> label="Bought before" value={bought} options={[...BOUGHT]} onChange={setBought} />
        <Segmented<"Yes" | "No"> label="New this year" value={newbie} options={["Yes", "No"]} onChange={setNewbie} />
        <Segmented label="Shops by" value={channel} options={["Web", "Phone", "Multichannel"]} onChange={setChannel} />
        <Segmented label="Area" value={zip} options={["Urban", "Suburban", "Rural"]} onChange={setZip} />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Chance of a visit in the next two weeks</p>
        <div className="space-y-3">
          {(["none", "mens", "womens"] as Arm[]).map((arm) => (
            <div key={arm}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-medium">{ARM_LABEL[arm]}</span>
                <span className="font-mono">
                  {(p[arm] * 100).toFixed(1)}%
                  {arm !== "none" && <span className={`ml-2 ${p[arm] - p.none >= 0 ? "text-ink" : "text-[#e34948]"}`}>{`${p[arm] - p.none >= 0 ? "+" : ""}${((p[arm] - p.none) * 100).toFixed(1)} pts`}</span>}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/8">
                <motion.div className="h-full rounded-full" style={{ background: ARM_COLOR[arm] }} initial={false} animate={{ width: pc((p[arm] / Math.max(max, 1e-6)) * 92) }} transition={{ type: "spring", stiffness: 160, damping: 22 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto rounded-xl bg-cream px-4 py-3.5">
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Recommendation</p>
          <p className="mt-1 text-[1.35rem] leading-tight font-semibold tracking-[-0.03em]">{best === "none" ? "Save the e-mail" : `Send the ${ARM_LABEL[best].toLowerCase()}`}</p>
          <p className="mt-1 text-[12.5px] text-ink-2/75">
            {best === "none"
              ? "Neither e-mail is expected to add even one visit per 100 customers like this."
              : `Expected to add ${(Math.max(upM, upW) * 100).toFixed(1)} visits per 100 customers like this; the other e-mail adds ${(Math.min(upM, upW) * 100).toFixed(1)}.`}
          </p>
        </div>
        {preset && (
          <p className="text-[12px] text-muted">
            In the real test, {preset.id} got <b className="text-ink">{ARM_LABEL[preset.got as Arm].toLowerCase()}</b> and {preset.visited ? "visited" : "did not visit"}. We only ever see one of the three outcomes for a customer: that is why uplift has to be learned from groups.
          </p>
        )}
      </div>
    </div>
  );
}
