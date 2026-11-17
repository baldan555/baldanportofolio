"use client";

import { useMemo, useState } from "react";
import { useWidth } from "../../data-eng/use-width";

/*
 * Unit economics of a subscription business, from the visitor's own inputs: monthly recurring revenue over two
 * years, the ceiling where new customers equal churned ones, lifetime value, LTV:CAC and payback. Simple formulas,
 * stated on the page (revenue only: no margins, upgrades or discounts).
 */
const GR = "#1baf7a";
const AM = "#c29a00";
const RD = "#c8413f";
const OR = "#eb6834";
const rp = (v: number) => (v >= 1e9 ? `Rp ${(v / 1e9).toFixed(2)}bn` : v >= 1e6 ? `Rp ${(v / 1e6).toFixed(1)}m` : `Rp ${Math.round(v / 1e3)}k`);
const r1 = (v: number) => Math.round(v * 10) / 10;

function Slider({ label, value, min, max, step, show, onChange, accent }: { label: string; value: number; min: number; max: number; step: number; show: string; onChange: (v: number) => void; accent: string }) {
  return (
    <label className="block text-[12px] font-semibold">
      <span className="flex justify-between gap-2">
        {label}
        <span className="font-mono">{show}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1.5 w-full" style={{ accentColor: accent }} />
    </label>
  );
}

export function UnitEconomics() {
  const [price, setPrice] = useState(150000);
  const [fresh, setFresh] = useState(40);
  const [churn, setChurn] = useState(3);
  const [cac, setCac] = useState(900000);
  const [ref, w] = useWidth(640);
  const sim = useMemo(() => {
    const c = [0];
    for (let m = 1; m <= 24; m++) c.push(c[m - 1] * (1 - churn / 100) + fresh);
    return c.map((x) => x * price);
  }, [price, fresh, churn]);
  const ceiling = (fresh / (churn / 100)) * price;
  const ltv = price / (churn / 100);
  const ratio = ltv / cac;
  const payback = cac / price;
  const life = 100 / churn;
  const H = 220,
    L = 70,
    R = 12,
    T = 18,
    B = 26;
  const max = Math.max(ceiling, ...sim) * 1.08;
  const X = (m: number) => r1(L + (m / 24) * (w - L - R));
  const Y = (v: number) => r1(T + (H - T - B) * (1 - v / max));
  const line = sim.map((v, m) => `${m ? "L" : "M"}${X(m)},${Y(v)}`).join(" ");
  const area = `${line} L${X(24)},${Y(0)} L${X(0)},${Y(0)} Z`;
  const tiles: [string, string, string?][] = [
    ["MRR after 12 months", rp(sim[12])],
    ["MRR after 24 months", rp(sim[24])],
    ["ARR at month 24", rp(sim[24] * 12)],
    ["Ceiling (MRR)", rp(ceiling), "where new customers = churned customers"],
    ["Lifetime value", rp(ltv), `a customer stays about ${r1(life)} months`],
    ["LTV : CAC", `${ratio.toFixed(1)} : 1`, ratio >= 3 ? GR : ratio >= 1 ? AM : RD],
    ["Payback", `${r1(payback)} months`, payback <= 12 ? GR : payback <= 24 ? AM : RD],
  ];
  return (
    <div className="space-y-3">
      <div className="grid gap-4 rounded-[22px] border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Slider label="Price per customer / month" value={price} min={25000} max={1000000} step={25000} show={rp(price)} onChange={setPrice} accent={OR} />
        <Slider label="New customers / month" value={fresh} min={5} max={300} step={5} show={String(fresh)} onChange={setFresh} accent={GR} />
        <Slider label="Monthly churn" value={churn} min={0.5} max={15} step={0.5} show={`${churn}%`} onChange={setChurn} accent={RD} />
        <Slider label="Cost to win a customer (CAC)" value={cac} min={100000} max={10000000} step={100000} show={rp(cac)} onChange={setCac} accent="#6250d6" />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div ref={ref} className="rounded-[22px] bg-[#fbfaf7] p-3">
          <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="block h-auto max-w-full" role="img" aria-label="Monthly recurring revenue over 24 months">
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={L} x2={w - R} y1={Y(max * f)} y2={Y(max * f)} stroke="rgba(11,11,11,0.07)" />
                <text x={L - 6} y={Y(max * f) + 3} fontSize={10} textAnchor="end" fill="rgba(11,11,11,0.5)" fontFamily="ui-monospace, monospace">
                  {rp(max * f)}
                </text>
              </g>
            ))}
            <path d={area} fill={OR} opacity={0.12} />
            <path d={line} fill="none" stroke={OR} strokeWidth={2.5} strokeLinejoin="round" />
            <line x1={L} x2={w - R} y1={Y(ceiling)} y2={Y(ceiling)} stroke={RD} strokeDasharray="5 4" strokeWidth={1.5} />
            <text x={w - R} y={Y(ceiling) - 5} fontSize={10.5} textAnchor="end" fill={RD} fontWeight={700} fontFamily="ui-sans-serif, system-ui">
              ceiling: churn cancels growth
            </text>
            {[0, 6, 12, 18, 24].map((m) => (
              <text key={m} x={X(m)} y={H - 8} fontSize={10} textAnchor={m === 0 ? "start" : m === 24 ? "end" : "middle"} fill="rgba(11,11,11,0.5)" fontFamily="ui-sans-serif, system-ui">
                {m === 0 ? "start" : `month ${m}`}
              </text>
            ))}
            {[12, 24].map((m) => (
              <circle key={m} cx={X(m)} cy={Y(sim[m])} r={4} fill={OR} stroke="#fff" strokeWidth={1.5} />
            ))}
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map(([k, v, extra]) => {
            const isColor = extra?.startsWith("#");
            return (
              <div key={k} className={`rounded-2xl border border-line bg-white px-3 py-2.5 ${k === "MRR after 24 months" ? "col-span-2" : ""}`}>
                <p className="text-[11px] text-ink-2/55">{k}</p>
                <p className="mt-0.5 text-[1.25rem] leading-tight font-semibold tabular-nums" style={{ color: isColor ? extra : undefined }}>
                  {v}
                </p>
                {extra && !isColor && <p className="mt-0.5 text-[10.5px] leading-snug text-ink-2/50">{extra}</p>}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        Your inputs, simple formulas: customers next month = customers × (1 − churn) + new; lifetime value = price ÷ churn; payback = CAC ÷ price. Revenue only, before costs, upgrades or discounts. A rule of thumb often quoted for healthy SaaS: LTV at least 3× CAC and payback within 12 months. Try halving churn: the ceiling doubles.
      </p>
    </div>
  );
}
