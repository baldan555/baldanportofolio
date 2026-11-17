"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { INK, PAL, r1 } from "../../charts/kit";
import { Card } from "../sales/tiles";
import { BANDS, C, NONE, ROWS, apply, bandOf, drivers, kpis, km, label, num, pct, predict, segments, usd, type Filters, type Key, type Profile, type Row } from "./data";

const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const BAD = "#c8413f";
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
/** White → red ramp for churn rates. */
const heat = (rate: number) => {
  const t = Math.max(0, Math.min(1, rate / 0.6));
  return `rgb(${Math.round(255 - t * 55)},${Math.round(244 - t * 179)},${Math.round(240 - t * 177)})`;
};
const ALL = kpis(ROWS);

/* ---------------------------------------------------------------- KPIs */
function Kpis({ rows }: { rows: Row[] }) {
  const k = kpis(rows);
  const cards = [
    { l: "Customers", v: num(k.n), n: `of ${num(ALL.n)}` },
    { l: "Left last month", v: num(k.churned), n: "churned" },
    { l: "Churn rate", v: pct(k.rate, 1), n: `overall ${pct(ALL.rate, 1)}`, bad: k.rate > ALL.rate },
    { l: "Monthly revenue lost", v: usd(k.revLost), n: `${pct(k.revLost / k.revenue)} of this group's bills`, bad: true },
    { l: "Tenure, left vs stayed", v: `${Math.round(k.tenureLost)} vs ${Math.round(k.tenureKept)}`, n: "months, average" },
    { l: "Bill, left vs stayed", v: `$${Math.round(k.billLost)} vs $${Math.round(k.billKept)}`, n: "per month, average" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 lg:col-span-12">
      {cards.map((c) => (
        <div key={c.l} className="rounded-[18px] border border-line bg-white p-3">
          <p className="truncate text-[11.5px] font-semibold text-ink-2/60">{c.l}</p>
          <p className="mt-1 text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums" style={c.bad ? { color: BAD } : undefined}>
            {c.v}
          </p>
          <p className="mt-1 truncate text-[10.5px] text-ink-2/45">{c.n}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- survival */
function Survival({ rows, f }: { rows: Row[]; f: Filters }) {
  const byInternet = f.contract >= 0;
  const key: Key = byInternet ? "internet" : "contract";
  const groups = C.labels[key].map((_, v) => ({ v, rows: rows.filter((r) => r[key] === v) })).filter((g) => g.rows.length >= 30);
  const curves = groups.map((g) => ({ ...g, s: km(g.rows) }));
  const W = 600;
  const H = 240;
  const x = (t: number) => r1(44 + (t / 72) * (W - 60));
  const y = (s: number) => r1(H - 30 - s * (H - 50));
  const colors = [BAD, PAL[5], GOOD];
  return (
    <Card
      title={`How long customers stay · by ${byInternet ? "internet service" : "contract"}`}
      sub={`Kaplan–Meier survival: the share still a customer after each month, from tenure and who left${f.band >= 0 ? " · the tenure filter is not applied here" : ""}`}
      className="lg:col-span-7"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Survival curves by group">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={44} x2={W - 16} y1={y(v)} y2={y(v)} stroke="rgba(11,11,11,0.07)" />
            <T x={38} y={y(v) + 3} s={9} a="end" m>
              {`${v * 100}%`}
            </T>
          </g>
        ))}
        {[0, 12, 24, 36, 48, 60, 72].map((t) => (
          <T key={t} x={x(t)} y={H - 12} s={9} a="middle" m>
            {t}
          </T>
        ))}
        <line x1={x(12)} x2={x(12)} y1={20} y2={H - 30} stroke="rgba(11,11,11,0.2)" strokeDasharray="3 3" />
        {curves.map((c, k) => {
          const col = byInternet ? [PAL[0], BAD, "#8a8a8a"][c.v] : colors[c.v];
          return (
            <g key={c.v}>
              <path d={c.s.map((s, t) => `${t ? `L${x(t)},${y(c.s[t - 1])} ` : "M"}${x(t)},${y(s)}`).join(" ")} fill="none" stroke={col} strokeWidth={2.4} />
              <rect x={x(3)} y={y(0.25) + k * 18 - 8} width={10} height={10} rx={2} fill={col} />
              <T x={x(3) + 16} y={y(0.25) + k * 18 + 1} s={10} c={col} w={700}>
                {`${label(key, c.v)}: ${pct(c.s[12])} still here after 12 months, ${pct(c.s[72])} after 72`}
              </T>
            </g>
          );
        })}
        <T x={W - 16} y={H - 1} s={8.5} a="end">
          {"months as a customer →"}
        </T>
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- drivers */
const FILTERABLE: Partial<Record<Key, keyof Filters>> = { contract: "contract", internet: "internet", payment: "payment" };
function Drivers({ rows, f, set }: { rows: Row[]; f: Filters; set: (k: keyof Filters, v: number) => void }) {
  const list = drivers(rows).slice(0, 9);
  const W = 420;
  const rowH = 34;
  const H = 30 + list.length * rowH;
  const max = 0.6;
  const x = (r: number) => r1(130 + (Math.min(r, max) / max) * (W - 150));
  const base = kpis(rows).rate;
  return (
    <Card
      title="What goes with leaving"
      sub="Churn rate for each value of each feature, features with the biggest gaps first; dot size = customers. Click contract, internet or payment to filter."
      className="lg:col-span-5"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Churn rate by feature value">
        {[0, 0.2, 0.4, 0.6].map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={18} y2={H - 6} stroke="rgba(11,11,11,0.06)" />
            <T x={x(v)} y={12} s={8.5} a="middle" m>
              {`${v * 100}%`}
            </T>
          </g>
        ))}
        <line x1={x(base)} x2={x(base)} y1={18} y2={H - 6} stroke={INK} strokeDasharray="3 3" />
        {list.map((d, i) => {
          const y = 34 + i * rowH;
          const fk = FILTERABLE[d.k];
          return (
            <g key={d.k}>
              <T x={4} y={y + 3} s={9.5} c={INK} w={600}>
                {d.name}
              </T>
              <T x={4} y={y + 14} s={8} m>
                {`gap ${Math.round(d.spread * 100)} pts`}
              </T>
              <line
                x1={x(Math.min(...d.values.filter((v) => v.n >= 30).map((v) => v.rate)))}
                x2={x(Math.max(...d.values.filter((v) => v.n >= 30).map((v) => v.rate)))}
                y1={y}
                y2={y}
                stroke="rgba(11,11,11,0.15)"
                strokeWidth={3}
              />
              {d.values
                .filter((v) => v.n >= 30)
                .map((v) => {
                  const on = fk && f[fk] === v.v;
                  const rates = d.values.filter((q) => q.n >= 30).map((q) => q.rate);
                  const extreme = v.rate === Math.max(...rates) ? "hi" : v.rate === Math.min(...rates) ? "lo" : null;
                  return (
                    <g key={v.v} onClick={() => fk && set(fk, on ? -1 : v.v)} style={{ cursor: fk ? "pointer" : "default" }}>
                      <circle cx={x(v.rate)} cy={y} r={r1(3 + Math.sqrt(v.n / ROWS.length) * 9)} fill={heat(v.rate)} stroke={on ? INK : BAD} strokeWidth={on ? 2.5 : 1}>
                        <title>{`${v.label}: ${pct(v.rate)} of ${num(v.n)} left`}</title>
                      </circle>
                      {extreme && (
                        <T x={x(v.rate) + (extreme === "hi" ? 12 : -12)} y={y + 3} s={7.5} a={extreme === "hi" ? "start" : "end"} c={INK}>
                          {`${v.label} ${pct(v.rate)}`}
                        </T>
                      )}
                    </g>
                  );
                })}
            </g>
          );
        })}
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- contract × tenure heatmap */
function Heat({ rows, f, set }: { rows: Row[]; f: Filters; set: (k: Partial<Filters>) => void }) {
  return (
    <Card title="Where churn concentrates" sub="Churn rate by contract and tenure; customers in each cell. Click a cell to filter." className="lg:col-span-5">
      <div className="grid grid-cols-[96px_repeat(4,1fr)] gap-1 text-[11px]">
        <span />
        {BANDS.map((b) => (
          <span key={b.label} className="text-center text-[10px] text-muted">
            {b.label.replace(" months", "")}
          </span>
        ))}
        {C.labels.contract.map((c, ci) => (
          <div key={c} className="contents">
            <span className="self-center pr-1 text-right text-[11px]">{c}</span>
            {BANDS.map((b, bi) => {
              const g = rows.filter((r) => r.contract === ci && bandOf(r.tenure) === bi);
              const rate = g.length ? g.filter((r) => r.churn).length / g.length : NaN;
              const on = f.contract === ci && f.band === bi;
              return (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => set(on ? { contract: -1, band: -1 } : { contract: ci, band: bi })}
                  className={`rounded-lg px-1 py-2 text-center transition ${on ? "ring-2 ring-ink" : "hover:ring-1 hover:ring-ink/30"}`}
                  style={{ background: g.length ? heat(rate) : "rgba(11,11,11,0.04)" }}
                >
                  <span className="block font-mono text-[13px] font-semibold" style={{ color: rate > 0.4 ? "#fff" : INK }}>
                    {g.length ? pct(rate) : "—"}
                  </span>
                  <span className="block text-[9.5px]" style={{ color: rate > 0.4 ? "rgba(255,255,255,0.8)" : "rgba(11,11,11,0.5)" }}>
                    {num(g.length)}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- bills */
function Bills({ rows }: { rows: Row[] }) {
  const edges = Array.from({ length: 11 }, (_, k) => 18 + k * 10.1);
  const lost = rows.filter((r) => r.churn);
  const kept = rows.filter((r) => !r.churn);
  const share = (g: Row[]) => edges.slice(0, -1).map((e, k) => (g.length ? g.filter((r) => r.monthly >= e && (k === 9 ? r.monthly <= 120 : r.monthly < edges[k + 1])).length / g.length : 0));
  const a = share(kept);
  const b = share(lost);
  const max = Math.max(...a, ...b, 0.01);
  const W = 300;
  const H = 170;
  const bw = (W - 30) / 10;
  return (
    <Card title="Monthly bill" sub="Share of stayers (grey) and leavers (red) at each bill level" className="lg:col-span-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Monthly bill distribution of stayers and leavers">
        {a.map((v, k) => (
          <g key={k}>
            <rect x={r1(20 + k * bw + 1)} y={r1(H - 28 - (v / max) * (H - 50))} width={r1(bw / 2 - 1.5)} height={r1((v / max) * (H - 50))} rx={1.5} fill="rgba(11,11,11,0.3)" />
            <rect x={r1(20 + k * bw + bw / 2)} y={r1(H - 28 - (b[k] / max) * (H - 50))} width={r1(bw / 2 - 1.5)} height={r1((b[k] / max) * (H - 50))} rx={1.5} fill={BAD} opacity={0.85} />
            {k % 2 === 0 && (
              <T x={20 + k * bw} y={H - 14} s={8} m>
                {`$${Math.round(edges[k])}`}
              </T>
            )}
          </g>
        ))}
        <T x={W - 4} y={H - 2} s={8} a="end">
          {"monthly bill →"}
        </T>
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- revenue at risk */
function Revenue({ rows }: { rows: Row[] }) {
  const cells = C.labels.contract
    .flatMap((c, ci) =>
      C.labels.internet.map((it, ii) => {
        const lost = rows.filter((r) => r.contract === ci && r.internet === ii && r.churn);
        return { c: ci, i: ii, v: lost.reduce((s, r) => s + r.monthly, 0) };
      }),
    )
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 6);
  const total = rows.filter((r) => r.churn).reduce((s, r) => s + r.monthly, 0);
  const max = Math.max(...cells.map((c) => c.v), 1);
  return (
    <Card title="Revenue walking out" sub="Monthly bills of customers who left, by contract and internet" className="lg:col-span-3">
      <div className="space-y-2">
        {cells.map((c) => (
          <div key={`${c.c}${c.i}`}>
            <div className="flex justify-between gap-2 text-[11px]">
              <span className="truncate">
                {label("contract", c.c)} · {label("internet", c.i)}
              </span>
              <span className="shrink-0 font-mono">{usd(c.v)}</span>
            </div>
            <div className="mt-0.5 h-2 rounded-full bg-ink/[0.05]">
              <div className="h-full rounded-full" style={{ width: `${Math.round((c.v / max) * 1000) / 10}%`, background: BAD }} />
            </div>
          </div>
        ))}
        <p className="pt-1 text-[10.5px] text-ink-2/50">Top cell: {total ? pct(cells[0]?.v / total) : "—"} of all lost monthly revenue.</p>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- risk segments */
function Segments({ rows }: { rows: Row[] }) {
  const list = segments(rows).slice(0, 8);
  return (
    <Card title="Highest-risk segments" sub="Combinations of contract, internet, payment and tenure with 40+ customers, by churn rate. Groups, never individuals." className="lg:col-span-7">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[12px]">
          <thead>
            <tr className="text-left text-[10.5px] text-muted">
              <th className="pb-1 font-normal">Contract</th>
              <th className="pb-1 font-normal">Internet</th>
              <th className="pb-1 font-normal">Payment</th>
              <th className="pb-1 font-normal">Tenure</th>
              <th className="pb-1 text-right font-normal">Customers</th>
              <th className="pb-1 text-right font-normal">Churn</th>
              <th className="pb-1 text-right font-normal">Lost / month</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s, k) => (
              <tr key={k} className="border-t border-line">
                <td className="py-1.5">{label("contract", s.c)}</td>
                <td className="py-1.5">{label("internet", s.i)}</td>
                <td className="py-1.5">{label("payment", s.p)}</td>
                <td className="py-1.5">{BANDS[s.b].label}</td>
                <td className="py-1.5 text-right font-mono">{s.n}</td>
                <td className="py-1.5 text-right">
                  <span className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold" style={{ background: heat(s.rate), color: s.rate > 0.4 ? "#fff" : INK }}>
                    {pct(s.rate)}
                  </span>
                </td>
                <td className="py-1.5 text-right font-mono">{usd(s.revLost)}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="py-3 text-center text-muted">
                  No segment with 40+ customers in this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- what-if */
function WhatIf() {
  const [p, setP] = useState<Profile>({ tenure: 4, monthly: 85, contract: 0, internet: 1, payment: 0, support: 0, security: 0, paperless: 1 });
  const base = predict(p);
  const moves: { t: string; q: Profile; ok: boolean }[] = [
    { t: "Offer a one-year contract", q: { ...p, contract: 1 }, ok: p.contract === 0 },
    { t: "Move them to automatic card payment", q: { ...p, payment: 3 }, ok: p.payment < 2 },
    { t: "Add tech support", q: { ...p, support: 1 }, ok: p.internet !== 2 && !p.support },
    { t: "Add online security", q: { ...p, security: 1 }, ok: p.internet !== 2 && !p.security },
  ];
  const sel = (k: keyof Profile, opts: string[]) => (
    <label className="flex items-center justify-between gap-2 text-[12px]">
      <span className="text-ink-2/60">
        {({ contract: "Contract", internet: "Internet", payment: "Payment", support: "Tech support", security: "Online security", paperless: "Paperless billing" } as Record<string, string>)[k]}
      </span>
      <select value={p[k]} onChange={(e) => setP({ ...p, [k]: Number(e.target.value) })} className="rounded-md border border-ink/15 bg-white px-1.5 py-0.5 text-[12px]">
        {opts.map((o, i) => (
          <option key={o} value={i}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <Card title="What if we act?" sub={`The Telco project's logistic regression (ROC AUC ${C.model_metrics.roc_auc}). Age is held fixed and never asked.`} className="lg:col-span-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-[12px]">
            <span className="flex justify-between">
              <span className="text-ink-2/60">Months as a customer</span>
              <span className="font-mono">{p.tenure}</span>
            </span>
            <input type="range" min={1} max={72} value={p.tenure} onChange={(e) => setP({ ...p, tenure: Number(e.target.value) })} className="w-full accent-[#c8413f]" />
          </label>
          <label className="block text-[12px]">
            <span className="flex justify-between">
              <span className="text-ink-2/60">Monthly bill</span>
              <span className="font-mono">${p.monthly}</span>
            </span>
            <input type="range" min={18} max={119} value={p.monthly} onChange={(e) => setP({ ...p, monthly: Number(e.target.value) })} className="w-full accent-[#c8413f]" />
          </label>
          {sel("contract", C.labels.contract)}
          {sel("internet", ["DSL", "Fiber optic", "None"])}
          {sel(
            "payment",
            C.labels.payment.map((x) => x.replace(" (automatic)", "")),
          )}
          {sel("support", ["No", "Yes"])}
          {sel("security", ["No", "Yes"])}
          {sel("paperless", ["No", "Yes"])}
        </div>
        <div>
          <p className="text-[11px] text-ink-2/55">Chance this customer leaves</p>
          <p className="text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums" style={{ color: base > 0.5 ? BAD : base > 0.25 ? "#c27a00" : GOOD }}>
            {pct(base)}
          </p>
          <div className="mt-3 space-y-1.5">
            {moves
              .filter((m) => m.ok)
              .map((m) => {
                const after = predict(m.q);
                return (
                  <div key={m.t} className="rounded-xl bg-ink/[0.03] p-2 text-[12px]">
                    <p>{m.t}</p>
                    <p className="font-mono text-[11.5px]">
                      {pct(base)} → <span style={{ color: GOOD }}>{pct(after)}</span> <span className="text-ink-2/50">({Math.round((after - base) * 100)} pts)</span>
                    </p>
                  </div>
                );
              })}
          </div>
          <p className="mt-2 text-[10.5px] text-ink-2/45">A model of association, not a promise: offers can change who stays for other reasons too.</p>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- memo, method */
function Memo({ rows }: { rows: Row[] }) {
  const k = kpis(rows);
  const d = drivers(rows)[0];
  const hi = [...d.values].filter((v) => v.n >= 30).sort((a, b) => b.rate - a.rate);
  const seg = segments(rows)[0];
  const m2m = rows.filter((r) => r.contract === 0);
  const two = rows.filter((r) => r.contract === 2);
  const lines = [
    `${pct(k.rate, 1)} of these ${num(k.n)} customers left last month, taking ${usd(k.revLost)} of monthly bills with them (${pct(k.revLost / k.revenue)}).`,
    hi.length > 1 ? `The biggest gap is ${d.name.toLowerCase()}: ${hi[0].label} churns at ${pct(hi[0].rate)}, ${hi[hi.length - 1].label} at ${pct(hi[hi.length - 1].rate)}.` : "",
    m2m.length >= 30 && two.length >= 30 ? `After a year, ${pct(km(m2m)[12])} of month-to-month customers are still here, against ${pct(km(two)[12])} on two-year contracts.` : "",
    `Leavers had been customers for ${Math.round(k.tenureLost)} months on average (stayers ${Math.round(k.tenureKept)}) and paid more: $${Math.round(k.billLost)} vs $${Math.round(k.billKept)} a month.`,
    seg
      ? `Riskiest group: ${label("contract", seg.c).toLowerCase()}, ${label("internet", seg.i).toLowerCase()}, paying by ${label("payment", seg.p).toLowerCase()}, ${BANDS[seg.b].label}: ${pct(seg.rate)} of ${seg.n} left.`
      : "",
  ].filter(Boolean);
  return (
    <Card title="What the churn says" sub="Written from the same numbers as the tiles, for the current filters" className="lg:col-span-5" dark>
      <ul className="space-y-2.5">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-white/90">
            <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8413f]" />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
function Behind() {
  const items: [string, string][] = [
    ["The data", `${C.source.name}: ${num(C.n)} customers of a telecom company, with their services, contract, billing, tenure and whether they left within the last month.`],
    [
      "What's left out",
      "Customer IDs, gender, age (senior citizen) and household fields (partner, dependents) are dropped before the data reaches this page. Everything shown is something the company can act on.",
    ],
    ["Churn rate", "Customers who left ÷ customers in the group. Revenue lost = their monthly bills."],
    ["Survival curves", "Kaplan–Meier: each month, the share of customers still at risk who did not leave, multiplied up. Customers who stayed count until their current tenure."],
    ["What-if", "The logistic regression from the Telco churn ML project, run in the browser. It shows association, not cause."],
  ];
  return (
    <section className="rounded-[24px] border border-line bg-cream/60 p-4 sm:p-6 lg:col-span-7">
      <h3 className="text-[18px] font-semibold tracking-[-0.02em]">Behind the dashboard</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white p-3">
            <p className="text-[13px] font-semibold">{k}</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-2/75">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-2/70">
        How the model was chosen and tested:{" "}
        <Link href="/skills/machine-learning/telco-churn" className="font-semibold text-ink underline underline-offset-2">
          Telco churn project
        </Link>
        .
      </p>
    </section>
  );
}

export function ChurnDashboard() {
  const [f, setF] = useState<Filters>(NONE);
  const rows = useMemo(() => apply(f), [f]);
  const set = (k: keyof Filters, v: number) => setF((x) => ({ ...x, [k]: v }));
  const setMany = (p: Partial<Filters>) => setF((x) => ({ ...x, ...p }));
  const changed = f.contract >= 0 || f.internet >= 0 || f.band >= 0 || f.payment >= 0;
  const select = (k: keyof Filters, name: string, opts: string[]) => (
    <label className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white py-1 pr-1 pl-3 text-[12.5px]">
      <span className="text-muted">{name}</span>
      <select value={f[k]} onChange={(e) => set(k, Number(e.target.value))} className="rounded-full bg-ink/[0.04] px-2 py-0.5 font-semibold outline-none" aria-label={`${name} filter`}>
        <option value={-1}>All</option>
        {opts.map((o, i) => (
          <option key={o} value={i}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="mx-auto max-w-[1400px] px-3 sm:px-5 md:px-10">
      <div className="z-30 -mx-3 mb-3 bg-bg/90 px-3 py-2.5 backdrop-blur sm:-mx-5 sm:px-5 md:sticky md:top-[7.6rem] md:-mx-10 md:px-10">
        <div className="flex flex-wrap items-center gap-2">
          {select("contract", "Contract", C.labels.contract)}
          {select("internet", "Internet", ["DSL", "Fiber optic", "None"])}
          {select(
            "band",
            "Tenure",
            BANDS.map((b) => b.label),
          )}
          {select(
            "payment",
            "Payment",
            C.labels.payment.map((x) => x.replace(" (automatic)", "")),
          )}
          {changed && (
            <button type="button" onClick={() => setF(NONE)} className="flex items-center gap-1 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[12px] hover:border-ink/30">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          <span className="ml-auto text-[11.5px] text-ink-2/55">
            {num(rows.length)} of {num(ROWS.length)} customers · IDs, gender and age left out
          </span>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-12">
        <Kpis rows={rows} />
        <Survival rows={apply({ ...f, band: -1 })} f={f} />
        <Drivers rows={rows} f={f} set={set} />
        <Heat rows={apply({ ...f, contract: -1, band: -1 })} f={f} set={setMany} />
        <Bills rows={rows} />
        <Revenue rows={rows} />
        <Segments rows={rows} />
        <WhatIf />
        <Memo rows={rows} />
        <Behind />
      </div>
    </div>
  );
}
