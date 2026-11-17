"use client";

import { useState } from "react";
import { useWidth } from "../data-eng/use-width";

/*
 * Is it worth automating? From the visitor's own numbers: hours spent by hand, the month the automation pays for
 * itself (build time plus upkeep), and a grid of how long you could spend building and still break even over five
 * years. The grid idea comes from xkcd 1205 "Is It Worth the Time?"; every number here is computed on the page.
 */
const FREQ: [string, number][] = [
  ["50× a day", 50],
  ["5× a day", 5],
  ["Daily", 1],
  ["Weekly", 1 / 7],
  ["Monthly", 1 / 30.44],
  ["Yearly", 1 / 365.25],
];
const SAVE: [string, number][] = [
  ["1 sec", 1],
  ["5 sec", 5],
  ["30 sec", 30],
  ["1 min", 60],
  ["5 min", 300],
  ["30 min", 1800],
  ["1 hour", 3600],
  ["6 hours", 21600],
  ["1 day", 86400],
];
const OR = "#eb6834";
const INK = "#0b0b0b";
const GR = "#1baf7a";
const r1 = (v: number) => Math.round(v * 10) / 10;
/** A length of time in its largest sensible unit. */
function span(sec: number) {
  const u: [number, string][] = [
    [365.25 * 86400, "year"],
    [30.44 * 86400, "month"],
    [7 * 86400, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"],
  ];
  for (const [s, name] of u) {
    if (sec >= s) {
      const v = sec / s;
      const n = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
      return `${n} ${name}${n === 1 ? "" : "s"}`;
    }
  }
  return "under a second";
}

export function WorthIt() {
  const [fi, setFi] = useState(2);
  const [si, setSi] = useState(4);
  const [build, setBuild] = useState(16);
  const [upkeep, setUpkeep] = useState(1);
  const [ref, w] = useWidth(640);
  const perDay = FREQ[fi][1];
  const sec = SAVE[si][1];
  const possible = sec * perDay <= 86400;
  const manualMonth = (sec * perDay * 30.44) / 3600; // hours of manual work per month
  const net = manualMonth - upkeep;
  const breakEven = net > 0 ? build / net : Infinity;
  const fiveYear = manualMonth * 60 - (build + upkeep * 60);
  // chart: cumulative hours over 24 months
  const H = 210,
    L = 46,
    R = 12,
    T = 14,
    B = 26;
  const months = 24;
  const manual = (m: number) => m * manualMonth;
  const auto = (m: number) => build + m * upkeep;
  const max = Math.max(manual(months), auto(months), 1) * 1.08;
  const X = (m: number) => r1(L + (m / months) * (w - L - R));
  const Y = (v: number) => r1(T + (H - T - B) * (1 - v / max));
  const line = (f: (m: number) => number) => Array.from({ length: months + 1 }, (_, m) => `${m ? "L" : "M"}${X(m)},${Y(f(m))}`).join(" ");
  const hrs = (v: number) => (v >= 100 ? `${Math.round(v)} h` : `${r1(v)} h`);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-[22px] border border-line bg-white p-4 lg:grid-cols-2">
        <div>
          <p className="text-[12px] font-semibold">How often is it done?</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FREQ.map(([k], i) => (
              <button key={k} type="button" aria-pressed={i === fi} onClick={() => setFi(i)} className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${i === fi ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}>
                {k}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12px] font-semibold">How long does it take by hand?</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SAVE.map(([k], i) => (
              <button key={k} type="button" aria-pressed={i === si} onClick={() => setSi(i)} className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${i === si ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-[12px] font-semibold">
            <span className="flex justify-between">
              Hours to build the automation <span className="font-mono">{build} h</span>
            </span>
            <input type="range" min={1} max={160} value={build} onChange={(e) => setBuild(Number(e.target.value))} className="mt-1.5 w-full" style={{ accentColor: OR }} />
          </label>
          <label className="block text-[12px] font-semibold">
            <span className="flex justify-between">
              Hours a month to keep it running <span className="font-mono">{upkeep} h</span>
            </span>
            <input type="range" min={0} max={20} step={0.5} value={upkeep} onChange={(e) => setUpkeep(Number(e.target.value))} className="mt-1.5 w-full" style={{ accentColor: "#6250d6" }} />
          </label>
          <p className="text-[11.5px] leading-snug text-ink-2/55">Upkeep is the part people forget: logins expire, a website changes, an API is renamed.</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div ref={ref} className="rounded-[22px] bg-[#fbfaf7] p-3">
          {possible ? (
            <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="block h-auto max-w-full" role="img" aria-label="Hours spent over 24 months, by hand and automated">
              {[0, 0.5, 1].map((f) => (
                <g key={f}>
                  <line x1={L} x2={w - R} y1={Y(max * f)} y2={Y(max * f)} stroke="rgba(11,11,11,0.07)" />
                  <text x={L - 6} y={Y(max * f) + 3} fontSize={10} textAnchor="end" fill="rgba(11,11,11,0.5)" fontFamily="ui-monospace, monospace">
                    {hrs(max * f)}
                  </text>
                </g>
              ))}
              <path d={line(manual)} fill="none" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
              <path d={line(auto)} fill="none" stroke={OR} strokeWidth={2.5} strokeLinejoin="round" />
              {breakEven <= months && <circle cx={X(breakEven)} cy={Y(auto(breakEven))} r={5} fill={GR} stroke="#fff" strokeWidth={1.5} />}
              <text x={X(months)} y={Y(manual(months)) - 6} fontSize={10.5} fontWeight={700} textAnchor="end" fill={INK} fontFamily="ui-sans-serif, system-ui">
                by hand
              </text>
              <text x={X(months)} y={Y(auto(months)) + (auto(months) > manual(months) ? -6 : 14)} fontSize={10.5} fontWeight={700} textAnchor="end" fill={OR} fontFamily="ui-sans-serif, system-ui">
                automated
              </text>
              {[0, 6, 12, 18, 24].map((m) => (
                <text key={m} x={X(m)} y={H - 8} fontSize={10} textAnchor={m === 0 ? "start" : m === 24 ? "end" : "middle"} fill="rgba(11,11,11,0.5)" fontFamily="ui-sans-serif, system-ui">
                  {m === 0 ? "now" : `month ${m}`}
                </text>
              ))}
            </svg>
          ) : (
            <p className="grid h-[210px] place-items-center px-6 text-center text-[14px] text-ink-2/60">That&apos;s more than a day of work every day. Something has to be automated.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["By hand, per month", possible ? hrs(manualMonth) : "—"],
              ["Pays for itself after", !possible ? "—" : breakEven === Infinity ? "never" : breakEven < 1 ? `${Math.max(1, Math.round(breakEven * 30.44))} days` : `${r1(breakEven)} months`],
              ["Saved over 5 years", possible ? (fiveYear > 0 ? hrs(fiveYear) : "nothing") : "—"],
              ["Max worth building (5 yrs)", possible ? span(sec * perDay * 365.25 * 5) : "—"],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-line bg-white px-3 py-2.5">
              <p className="text-[11px] text-ink-2/55">{k}</p>
              <p className="mt-0.5 text-[1.2rem] leading-tight font-semibold tabular-nums" style={{ color: k === "Pays for itself after" ? (breakEven <= 12 ? "#0f6e4c" : breakEven === Infinity ? "#a3302e" : undefined) : undefined }}>
                {v}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-[22px] border border-line bg-white">
        <table className="w-full min-w-[760px] text-[12px]">
          <caption className="px-4 pt-3 text-left text-[12.5px] font-semibold">How long you can spend making it faster and still come out ahead over five years</caption>
          <thead>
            <tr className="border-b border-line">
              <th className="px-3 py-2 text-left font-mono text-[10px] font-normal text-ink-2/50 uppercase">how often ↓ · time saved →</th>
              {SAVE.map(([k], i) => (
                <th key={k} className={`px-2 py-2 text-right font-semibold ${i === si ? "text-[#eb6834]" : ""}`}>
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FREQ.map(([fk, pd], i) => (
              <tr key={fk} className="border-b border-line last:border-0">
                <td className={`px-3 py-1.5 font-semibold ${i === fi ? "text-[#eb6834]" : "text-ink-2/70"}`}>{fk}</td>
                {SAVE.map(([sk, s], j) => {
                  const ok = s * pd <= 86400;
                  const on = i === fi && j === si;
                  return (
                    <td key={sk} className="px-1 py-1 text-right">
                      <button type="button" disabled={!ok} onClick={() => {
                          setFi(i);
                          setSi(j);
                        }} className={`w-full rounded-md px-1.5 py-1 text-right tabular-nums transition ${on ? "bg-[#eb6834] font-semibold text-white" : ok ? "hover:bg-cream" : "text-ink/20"}`}>
                        {ok ? span(s * pd * 365.25 * 5) : "—"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        Your numbers, simple arithmetic: time by hand × how often, against build time plus monthly upkeep. The grid idea comes from{" "}
        <a href="https://xkcd.com/1205/" target="_blank" rel="noreferrer" className="underline">
          xkcd 1205, “Is It Worth the Time?”
        </a>
        ; the values are computed here. It counts hours only: automation also removes typos, runs while you sleep and doesn&apos;t forget.
      </p>
    </div>
  );
}
