"use client";

import { useState } from "react";
import { INK, r1 } from "../../charts/kit";
import { Card } from "../sales/tiles";
import { A, ALL, ALPHA_ADJ, ARM_COLOR, METRICS, TESTS, compare, fmtDiff, fmtP, fmtRel, fmtValue, mde, neededN, num, value, type Arm, type Cell, type Metric } from "./stats";

const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const GOOD = "#138a60";
const T = ({
  x,
  y,
  s = 10,
  c = "rgba(11,11,11,0.55)",
  a = "start",
  w,
  m = false,
  children,
}: {
  x: number;
  y: number;
  s?: number;
  c?: string;
  a?: "start" | "middle" | "end";
  w?: number;
  m?: boolean;
  children: React.ReactNode;
}) => (
  <text x={r1(x)} y={r1(y)} fontSize={s} fill={c} textAnchor={a} fontWeight={w} fontFamily={m ? MONO : FONT}>
    {children}
  </text>
);
const ARMS: Arm[] = ["mens", "womens"];
const name = (a: Arm) => A.arms[a];

/* ---------------------------------------------------------------- verdict */
export function bestArm() {
  const s = ARMS.map((a) => ({ a, c: compare(ALL[a], ALL.control, "spend") })).sort((x, y) => y.c.diff - x.c.diff);
  const head = compare(ALL[s[0].a], ALL[s[1].a], "spend");
  return { best: s[0].a, other: s[1].a, vsControl: s[0].c, vsOther: head };
}
export function Verdict() {
  const { best, other, vsControl, vsOther } = bestArm();
  const allWin = ARMS.every((a) => METRICS.every((m) => compare(ALL[a], ALL.control, m.id).sigAdj && compare(ALL[a], ALL.control, m.id).diff > 0));
  return (
    <section className="rounded-[24px] bg-ink p-5 text-white sm:p-7 lg:col-span-12">
      <p className="font-mono text-[11px] tracking-[0.16em] text-white/50 uppercase">Verdict</p>
      <h2 className="mt-2 text-[1.7rem] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[2.4rem]">Send the {name(best).toLowerCase()}.</h2>
      <div className="mt-4 grid gap-3 text-[14px] leading-snug text-white/85 md:grid-cols-3">
        <p>
          <span className="font-semibold text-white">{fmtDiff(vsControl.diff, "spend")}</span> spend per customer over two weeks against no e-mail ({fmtRel(vsControl.rel)}; 95% interval{" "}
          {fmtDiff(vsControl.lo, "spend")} to {fmtDiff(vsControl.hi, "spend")}, {fmtP(vsControl.p)}).
        </p>
        <p>
          {allWin
            ? "Both e-mails beat no e-mail on visits, purchases and spend, even after correcting for six comparisons."
            : "Not every e-mail beats no e-mail on every metric once six comparisons are corrected for; see the lift chart."}
        </p>
        <p>
          Against the {name(other).toLowerCase()} it earns {fmtDiff(vsOther.diff, "spend")} more per customer ({fmtP(vsOther.p)}):{" "}
          {vsOther.sigAdj ? "a clear win." : vsOther.sig ? "likely better, but not beyond doubt after the correction." : "too close to call."}
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- arms */
export function ArmCards() {
  const arms: Arm[] = ["control", "mens", "womens"];
  return (
    <div className="grid gap-3 md:grid-cols-3 lg:col-span-12">
      {arms.map((a) => (
        <div key={a} className="rounded-[20px] border border-line bg-white p-4" style={{ borderTop: `4px solid ${ARM_COLOR[a]}` }}>
          <div className="flex items-baseline justify-between">
            <p className="text-[16px] font-semibold">{name(a)}</p>
            <p className="font-mono text-[11px] text-muted">{num(ALL[a].n)} customers</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {METRICS.map((m) => {
              const c = a === "control" ? null : compare(ALL[a], ALL.control, m.id);
              return (
                <div key={m.id}>
                  <p className="text-[10.5px] text-ink-2/55">{m.short}</p>
                  <p className="text-[18px] leading-tight font-semibold tabular-nums">{fmtValue(value(ALL[a], m.id), m.id)}</p>
                  {c ? (
                    <span
                      className="mt-1 inline-block rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                      style={{ color: c.sigAdj ? GOOD : "#8a6d00", background: c.sigAdj ? "rgba(19,138,96,0.12)" : "rgba(194,154,0,0.12)" }}
                    >
                      {fmtRel(c.rel)}
                    </span>
                  ) : (
                    <span className="mt-1 inline-block rounded-full bg-ink/5 px-1.5 py-0.5 font-mono text-[10px] text-ink/45">baseline</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- lift chart (forest plot) */
export function Forest({ metric }: { metric: Metric }) {
  const [mode, setMode] = useState<"rel" | "abs">("rel");
  const rows = METRICS.flatMap((m) => ARMS.map((a) => ({ m, a, c: compare(ALL[a], ALL.control, m.id) })));
  const lo = mode === "rel" ? Math.min(0, ...rows.map((r) => r.c.relLo)) : 0;
  const W = 600;
  const rowH = 30;
  const H = 30 + rows.length * rowH;
  return (
    <Card
      title="Lift against no e-mail"
      sub={`Dot = estimate, line = 95% interval. Filled dots stay significant after correcting for ${TESTS} comparisons (p < ${ALPHA_ADJ.toFixed(4)}).`}
      className="lg:col-span-7"
      right={
        <div className="flex shrink-0 rounded-full border border-ink/10 p-0.5 text-[11px]">
          {(
            [
              ["rel", "relative"],
              ["abs", "absolute"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-full px-2.5 py-0.5 ${mode === k ? "bg-ink text-white" : "text-ink/60"}`}>
              {l}
            </button>
          ))}
        </div>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Forest plot of the lift of each e-mail on each metric">
        {rows.map((r, i) => {
          const y = 26 + i * rowH;
          const hiAll = mode === "rel" ? Math.max(...rows.map((q) => q.c.relHi)) * 1.1 : Math.max(...rows.filter((q) => q.m.id === r.m.id).map((q) => q.c.hi)) * 1.15;
          const loAll = mode === "rel" ? lo : 0;
          const x = (v: number) => r1(200 + ((v - loAll) / (hiAll - loAll)) * 330);
          const [e, l, h] = mode === "rel" ? [r.c.rel, r.c.relLo, r.c.relHi] : [r.c.diff, r.c.lo, r.c.hi];
          const on = r.m.id === metric;
          return (
            <g key={`${r.m.id}${r.a}`} opacity={on ? 1 : 0.55}>
              {i % 2 === 0 && (
                <T x={8} y={y + 14} s={10.5} c={INK} w={700}>
                  {r.m.label}
                </T>
              )}
              <T x={190} y={y + 4} s={9.5} a="end" c={ARM_COLOR[r.a]} w={600}>
                {name(r.a)}
              </T>
              {mode === "abs" && i % 2 === 0 && <line x1={x(0)} x2={x(0)} y1={y - 12} y2={y + rowH + 8} stroke={INK} strokeWidth={1} />}
              <line x1={x(l)} x2={x(h)} y1={y} y2={y} stroke={ARM_COLOR[r.a]} strokeWidth={on ? 3 : 2} strokeLinecap="round" />
              <circle cx={x(e)} cy={y} r={on ? 6 : 5} fill={r.c.sigAdj ? ARM_COLOR[r.a] : "#fff"} stroke={ARM_COLOR[r.a]} strokeWidth={2} />
              <T x={x(h) + 8} y={y + 4} s={9} m c={INK}>
                {mode === "rel" ? fmtRel(e) : fmtDiff(e, r.m.id, r.m.id === "spend" ? 2 : 1)}
              </T>
            </g>
          );
        })}
        {mode === "rel" && (
          <line
            x1={200 + ((0 - lo) / (Math.max(...rows.map((q) => q.c.relHi)) * 1.1 - lo)) * 330}
            x2={200 + ((0 - lo) / (Math.max(...rows.map((q) => q.c.relHi)) * 1.1 - lo)) * 330}
            y1={10}
            y2={H - 4}
            stroke={INK}
          />
        )}
        <T x={W - 4} y={H - 2} s={8.5} a="end">
          {mode === "rel" ? "0 = no change; right = better than no e-mail" : "each metric on its own scale; line = no change"}
        </T>
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- funnel */
export function Funnel() {
  const arms: Arm[] = ["control", "mens", "womens"];
  const steps = [
    { k: "Got the e-mail (or not)", f: () => 1 },
    { k: "Visited the site", f: (c: Cell) => c.visits / c.n },
    { k: "Bought", f: (c: Cell) => c.conv / c.n },
  ];
  return (
    <Card title="From inbox to purchase" sub="Share of each group at every step, within two weeks" className="lg:col-span-5">
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={s.k}>
            <p className="text-[11.5px] font-semibold text-ink-2/70">{s.k}</p>
            <div className="mt-1 space-y-1">
              {arms.map((a) => {
                const v = s.f(ALL[a]);
                const w = i === 0 ? 100 : i === 1 ? (v / 0.2) * 100 : (v / 0.014) * 100;
                return (
                  <div key={a} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-[11px]" style={{ color: ARM_COLOR[a] }}>
                      {name(a)}
                    </span>
                    <span className="relative h-2.5 flex-1 rounded-full bg-ink/[0.05]">
                      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, Math.round(w * 10) / 10)}%`, background: ARM_COLOR[a] }} />
                    </span>
                    <span className="w-12 shrink-0 text-right font-mono text-[11px]">{i === 0 ? "100%" : `${(v * 100).toFixed(i === 2 ? 2 : 1)}%`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-[10.5px] text-ink-2/45">Bars are scaled per step (visits to 20%, purchases to 1.4%) so the small purchase rates stay readable.</p>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- trust checks */
export function Trust() {
  const { counts, p } = A.srm;
  return (
    <Card title="Can we trust the split?" sub="Checks done before reading any result: group sizes and what customers looked like before the e-mail" className="lg:col-span-6">
      <div className="rounded-xl bg-ink/[0.03] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-semibold">Sample ratio (planned 1 : 1 : 1)</p>
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold ${p > 0.01 ? "bg-[#1baf7a]/15 text-[#138a60]" : "bg-[#e34948]/15 text-[#c8413f]"}`}>
            {p > 0.01 ? `OK · p = ${p.toFixed(2)}` : `mismatch · p = ${p}`}
          </span>
        </div>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full">
          {(["control", "mens", "womens"] as Arm[]).map((a, i) => (
            <span key={a} style={{ width: `${(counts[i] / (counts[0] + counts[1] + counts[2])) * 100}%`, background: ARM_COLOR[a] }} />
          ))}
        </div>
        <p className="mt-1 font-mono text-[10.5px] text-ink-2/60">{counts.map((c, i) => `${name((["control", "mens", "womens"] as Arm[])[i])} ${num(c)}`).join(" · ")}</p>
      </div>
      <table className="mt-3 w-full text-[11.5px]">
        <thead>
          <tr className="text-left text-[10px] text-muted">
            <th className="pb-1 font-normal">Before the e-mail</th>
            <th className="pb-1 text-right font-normal">No e-mail</th>
            <th className="pb-1 text-right font-normal">Men&apos;s</th>
            <th className="pb-1 text-right font-normal">Women&apos;s</th>
            <th className="pb-1 text-right font-normal">balanced?</th>
          </tr>
        </thead>
        <tbody>
          {A.balance.map((b) => {
            const pctRow = b.means.control <= 1;
            const f = (v: number) => (pctRow ? `${(v * 100).toFixed(1)}%` : v.toFixed(1));
            const worst = Math.max(Math.abs(b.smd.mens), Math.abs(b.smd.womens));
            return (
              <tr key={b.label} className="border-t border-line">
                <td className="py-1">{b.label}</td>
                <td className="py-1 text-right font-mono">{f(b.means.control)}</td>
                <td className="py-1 text-right font-mono">{f(b.means.mens)}</td>
                <td className="py-1 text-right font-mono">{f(b.means.womens)}</td>
                <td className="py-1 text-right font-mono" style={{ color: worst < 0.1 ? GOOD : "#c8413f" }} title="largest standardised mean difference against no e-mail">
                  {worst < 0.1 ? "✓" : "✗"} {worst.toFixed(3)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[10.5px] text-ink-2/50">“Balanced” = standardised mean difference under 0.1, the usual rule of thumb. All far below it: the groups were alike before the e-mail.</p>
    </Card>
  );
}

/* ---------------------------------------------------------------- segments */
type DimKey = keyof typeof A.dims;
export function Segments({ metric, arm }: { metric: Metric; arm: Arm }) {
  const [dim, setDim] = useState<DimKey>("bought");
  const levels = A.dims[dim].levels.map((l) => ({ level: l.level, arms: l.arms as Record<Arm, Cell> }));
  const rows = levels.map((l) => ({ level: l.level, n: l.arms[arm].n + l.arms.control.n, c: compare(l.arms[arm], l.arms.control, metric) }));
  const lo = Math.min(0, ...rows.map((r) => r.c.lo));
  const hi = Math.max(...rows.map((r) => r.c.hi)) * 1.1;
  const W = 600;
  const rowH = 34;
  const H = 24 + rows.length * rowH;
  const x = (v: number) => r1(180 + ((v - lo) / (hi - lo)) * 320);
  return (
    <Card
      title={`Who responds to the ${name(arm).toLowerCase()}?`}
      sub={`Absolute lift in ${METRICS.find((m) => m.id === metric)!.label.toLowerCase()} against no e-mail, by segment, with 95% intervals. Exploratory: many slices, so treat single wins with care.`}
      className="lg:col-span-12"
      right={
        <select
          value={dim}
          onChange={(e) => setDim(e.target.value as DimKey)}
          className="shrink-0 rounded-full border border-ink/10 bg-white px-2.5 py-1 text-[12px] outline-none"
          aria-label="Segment by"
        >
          {(Object.keys(A.dims) as DimKey[])
            .filter((k) => k !== "all")
            .map((k) => (
              <option key={k} value={k}>
                {A.dims[k].label}
              </option>
            ))}
        </select>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Lift by segment with confidence intervals">
        <line x1={x(0)} x2={x(0)} y1={6} y2={H - 4} stroke={INK} />
        {rows.map((r, i) => {
          const y = 22 + i * rowH;
          return (
            <g key={r.level}>
              <T x={8} y={y + 4} s={10.5} c={INK} w={600}>
                {r.level}
              </T>
              <T x={8} y={y + 16} s={8.5} m>
                {`${num(r.n)} customers`}
              </T>
              <line x1={x(r.c.lo)} x2={x(r.c.hi)} y1={y} y2={y} stroke={ARM_COLOR[arm]} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
              <circle cx={x(r.c.diff)} cy={y} r={6} fill={r.c.sig ? ARM_COLOR[arm] : "#fff"} stroke={ARM_COLOR[arm]} strokeWidth={2} />
              <T x={Math.max(x(r.c.hi), x(r.c.diff)) + 10} y={y + 4} s={9} m c={INK}>
                {`${fmtDiff(r.c.diff, metric, metric === "spend" ? 2 : 1)} (${fmtValue(r.c.vc, metric)} → ${fmtValue(r.c.vt, metric)})`}
              </T>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- spend of buyers */
export function SpendDist() {
  const { edges, hist, buyers } = A.spend;
  const arms: Arm[] = ["control", "mens", "womens"];
  const shares = arms.map((a) => hist[a].map((v) => v / buyers[a].n));
  const max = Math.max(...shares.flat());
  const W = 300;
  const H = 170;
  const bw = (W - 40) / (edges.length - 1);
  return (
    <Card
      title="What buyers spent"
      sub={`Among customers who bought: share in each spend band. Average per buyer: ${arms.map((a) => `${name(a).toLowerCase()} $${buyers[a].mean.toFixed(0)}`).join(", ")}, so the e-mails mainly bring more buyers.`}
      className="lg:col-span-6"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Spend distribution of buyers per group">
        {edges.slice(0, -1).map((e, k) => (
          <g key={e}>
            {arms.map((a, j) => {
              const h = r1((shares[j][k] / max) * (H - 50));
              return <rect key={a} x={r1(30 + k * bw + j * (bw / 3.4) + 2)} y={r1(H - 30 - h)} width={r1(bw / 3.6)} height={h} rx={1.5} fill={ARM_COLOR[a]} opacity={0.85} />;
            })}
            <T x={30 + k * bw + bw / 2} y={H - 16} s={8} a="middle" m>
              {`$${e}+`}
            </T>
          </g>
        ))}
        {arms.map((a, j) => (
          <g key={a}>
            <rect x={8 + j * 98} y={4} width={8} height={8} rx={2} fill={ARM_COLOR[a]} />
            <T x={20 + j * 98} y={11.5} s={8} c={INK}>
              {`${a === "control" ? "No e-mail" : name(a).replace(" e-mail", "")} · median $${buyers[a].median.toFixed(0)}`}
            </T>
          </g>
        ))}
        <T x={W - 4} y={H - 3} s={7.5} a="end">
          {"band start, in dollars"}
        </T>
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- impact calculator */
export function Impact({ arm }: { arm: Arm }) {
  const [audience, setAudience] = useState(100000);
  const [cost, setCost] = useState(0);
  const v = compare(ALL[arm], ALL.control, "visit");
  const c = compare(ALL[arm], ALL.control, "conv");
  const s = compare(ALL[arm], ALL.control, "spend");
  const net = (x: number) => x * audience - cost * audience;
  const out = [
    { k: "Extra visits", e: v.diff * audience, l: v.lo * audience, h: v.hi * audience, money: false },
    { k: "Extra orders", e: c.diff * audience, l: c.lo * audience, h: c.hi * audience, money: false },
    { k: "Extra revenue", e: net(s.diff), l: net(s.lo), h: net(s.hi), money: true },
  ];
  const fmt = (x: number, money: boolean) => (money ? `${x < 0 ? "−" : ""}$${num(Math.abs(x))}` : num(x));
  return (
    <Card
      title={`If we send the ${name(arm).toLowerCase()} to…`}
      sub="Scales the measured lift to a new audience like the test's, over the same two weeks. The range is the 95% interval."
      className="lg:col-span-6"
    >
      <label className="block text-[12px]">
        <span className="flex justify-between">
          <span className="text-ink-2/60">Customers e-mailed</span>
          <span className="font-mono font-semibold">{num(audience)}</span>
        </span>
        <input type="range" min={10000} max={1000000} step={10000} value={audience} onChange={(e) => setAudience(Number(e.target.value))} className="mt-1 w-full accent-[#2a78d6]" />
      </label>
      <label className="mt-2 flex items-center justify-between gap-2 text-[12px]">
        <span className="text-ink-2/60">Cost per e-mail (your own number)</span>
        <span className="flex items-center gap-1 font-mono">
          $
          <input
            type="number"
            min={0}
            max={1}
            step={0.001}
            value={cost}
            onChange={(e) => setCost(Math.max(0, Number(e.target.value) || 0))}
            className="w-20 rounded-md border border-ink/15 px-1.5 py-0.5 text-right"
          />
        </span>
      </label>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {out.map((o) => (
          <div key={o.k} className="rounded-xl bg-ink/[0.03] p-2.5">
            <p className="text-[10.5px] text-ink-2/55">{o.k}</p>
            <p className="text-[18px] leading-tight font-semibold tabular-nums">{fmt(o.e, o.money)}</p>
            <p className="font-mono text-[9.5px] text-ink-2/50">
              {fmt(o.l, o.money)} to {fmt(o.h, o.money)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10.5px] text-ink-2/45">Assumes the new audience behaves like the 2008 test customers (all bought in the last 12 months).</p>
    </Card>
  );
}

/* ---------------------------------------------------------------- power */
export function Power() {
  const [rel, setRel] = useState(0.2);
  return (
    <Card title="How small a change could this test see?" sub="Smallest true lift detectable with 80% power at 5% significance, with ~21,300 customers per group" className="lg:col-span-6">
      <div className="space-y-2">
        {METRICS.map((m) => {
          const d = mde(ALL.control, m.id);
          return (
            <div key={m.id} className="flex items-center justify-between gap-2 border-b border-line pb-1.5 text-[12.5px]">
              <span>{m.label}</span>
              <span className="font-mono">
                {fmtDiff(d, m.id, m.id === "spend" ? 2 : 2)}{" "}
                <span className="text-ink-2/50">
                  ({fmtRel(d / value(ALL.control, m.id))} of {fmtValue(value(ALL.control, m.id), m.id)})
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <label className="mt-3 block text-[12px]">
        <span className="flex justify-between">
          <span className="text-ink-2/60">To detect a lift of</span>
          <span className="font-mono font-semibold">{fmtRel(rel)}</span>
        </span>
        <input type="range" min={0.05} max={0.6} step={0.05} value={rel} onChange={(e) => setRel(Number(e.target.value))} className="mt-1 w-full accent-[#2a78d6]" />
      </label>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {METRICS.map((m) => (
          <div key={m.id} className="rounded-xl bg-ink/[0.03] p-2">
            <p className="text-[10px] text-ink-2/55">{m.short}</p>
            <p className="font-mono text-[13px] font-semibold">{num(neededN(ALL.control, m.id, rel))}</p>
            <p className="text-[9.5px] text-ink-2/45">per group</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
