"use client";

import { useMemo, useState } from "react";
import { CUSTS, DASH, DIMS, MONTHS, NO_FILTER, cohorts, km, matches, num, pct, rp, signed, type Filt } from "./data";
import { Bars, C, Chips, Insight, Lines, Panel, Select, Tile, heatGreen, textOn } from "./ui";

const S = DASH.series;
const LAST = S[S.length - 1];
const PREV = S[S.length - 2];

// gains points on an even 10% grid, so the x axis is evenly spaced
const tens = <G extends { top: number }>(g: G[]) => g.filter((x) => x.top % 10 === 0);

/* ================================================================ 02 base monitoring */
export function Monitoring() {
  const early = DASH.early;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <Tile label="Active customers" value={num(LAST.base)} note={`${signed(LAST.base - PREV.base, 0)} vs ${PREV.m}`} />
        <Tile label="Joined / left" value={`${LAST.adds} / ${LAST.churn}`} note={`net ${signed(LAST.adds - LAST.churn, 0)}`} />
        <Tile label="Monthly churn" value={pct(LAST.rate ?? 0, 2)} note={`${PREV.m}: ${pct(PREV.rate ?? 0, 2)}`} tone={(LAST.rate ?? 0) > 4 ? "bad" : undefined} />
        <Tile label="Voluntary / non-payment" value={`${LAST.vol} / ${LAST.inv}`} note="of this month's leavers" />
        <Tile label="ARPU" value={rp(LAST.arpu)} note="billed per active customer" />
        <Tile label="Data per customer" value={`${LAST.gb} GB`} note={`${pct(LAST.low)} use under half the plan`} />
        <Tile label="Rebought on time" value={pct(LAST.rebuyOnTime ?? 0)} note={`${pct(LAST.rebuyLapsed ?? 0)} did not rebuy`} />
        <Tile label="On a 5G plan" value={pct(LAST.share5g)} note={`${num(LAST.covered)} homes have 5G`} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Base and flows" sub="Active customers at month end, and who joined and left each month">
          <Lines labels={MONTHS} series={[{ name: "Joined", color: C.green, values: S.map((s) => s.adds) }, { name: "Left, by choice", color: C.orange, values: S.map((s) => s.vol) }, { name: "Left, non-payment", color: C.red, values: S.map((s) => s.inv) }]} bars={{ name: "Active base (right scale ÷10)", color: C.blue, values: S.map((s) => s.base / 10) }} yFmt={(v) => num(v)} />
          <Insight>
            The base grows every month because joiners outnumber leavers, but leavers grow too: {LAST.churn} left in {LAST.m} against {S[9].churn} a year earlier. Bars are the base divided by ten, to share the scale.
          </Insight>
        </Panel>
        <Panel title="Churn rate" sub="Leavers ÷ customers at the start of the month, split by kind">
          <Lines
            labels={MONTHS.slice(3)}
            series={[
              { name: "Total", color: C.ink, values: S.slice(3).map((s) => s.rate) },
              { name: "By choice", color: C.orange, values: S.slice(3).map((s) => (s.vol / (s.base - s.adds + s.churn)) * 100) },
              { name: "Non-payment", color: C.red, values: S.slice(3).map((s) => (s.inv / (s.base - s.adds + s.churn)) * 100) },
            ]}
            yFmt={(v) => `${v.toFixed(1)}%`}
            yMin={0}
          />
          <Insight>Early months are noisy because the base is young; from mid-2025 churn settles around 4% a month, and almost half of it is customers who simply stop paying or rebuying.</Insight>
        </Panel>
        <Panel title="Payment health" sub="Share of packages rebought on time, and of invoices paid by the due date">
          <Lines labels={MONTHS} series={[{ name: "Package rebought on time", color: C.blue, values: S.map((s) => s.rebuyOnTime) }, { name: "Invoice paid on time", color: C.violet, values: S.map((s) => s.postOnTime) }, { name: "Package not rebought", color: C.red, values: S.map((s) => s.rebuyLapsed), dash: true }]} yFmt={(v) => `${Math.round(v)}%`} yMin={0} yMax={100} />
        </Panel>
        <Panel title="Usage" sub="Average data per active customer, and the share using less than half their plan's typical">
          <Lines labels={MONTHS} series={[{ name: "GB per customer", color: C.teal, values: S.map((s) => s.gb), area: true }, { name: "Low users (% × 10)", color: C.orange, values: S.map((s) => s.low * 10), dash: true }]} yFmt={(v) => num(v)} yMin={0} />
        </Panel>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Leaving in the first 3 months" sub={`${pct(early.overall)} of new customers overall, by first-month usage`}>
          <Bars items={early.firstUse.map((x) => ({ k: `${x.k} of plan`, v: x.v, n: x.n }))} fmt={(v) => pct(v)} color={C.red} note={(x) => `n=${x.n}`} />
          <Insight>The first month tells you a lot: customers who barely use the service in month one are the likeliest to be gone by month three.</Insight>
        </Panel>
        <Panel title="…by sales channel" sub="Same early churn, by where the customer was sold">
          <Bars items={early.channel.map((x) => ({ k: x.k, v: x.v, n: x.n }))} fmt={(v) => pct(v)} color={C.orange} note={(x) => `n=${x.n}`} />
          <Insight>Online and partner sales bring in customers who leave sooner; field sales the most loyal ones. A welcome check matters most for the first two.</Insight>
        </Panel>
        <Panel title="Why people left" sub="Reason recorded at churn, all 22 months">
          <Bars items={DASH.reasons.filter((r) => r.v > 0).sort((a, b) => b.v - a.v).map((r) => ({ k: r.k, v: r.v, color: r.k === "Did not rebuy" || r.k === "Payment default" ? C.red : C.ink }))} fmt={(v) => num(v)} />
        </Panel>
      </div>
    </div>
  );
}

/* ================================================================ 03 cohorts */
type Dim = "channel" | "plan0" | "pay" | "area";
const DIM_LABELS: Record<Dim, { l: string; names: string[] }> = {
  channel: { l: "Channel", names: DIMS.channels },
  plan0: { l: "Plan at start", names: DIMS.plans },
  pay: { l: "Way to pay", names: DIMS.pays },
  area: { l: "Area", names: DIMS.areas },
};
const LINE_COLORS = [C.blue, C.orange, C.green, C.violet];

export function Cohorts() {
  const [f, setF] = useState<Filt>(NO_FILTER);
  const [mode, setMode] = useState<"logo" | "rev">("logo");
  const [dim, setDim] = useState<Dim>("channel");
  const filtered = f === NO_FILTER || Object.values(f).every((v) => v < 0);
  const rows = useMemo(() => CUSTS.filter((c) => matches(c, f)), [f]);
  const grid = useMemo(() => (mode === "rev" && filtered ? DASH.cohortRev : cohorts(rows)), [rows, mode, filtered]);
  const curves = useMemo(() => DIM_LABELS[dim].names.map((name, v) => ({ name, values: km(rows.filter((c) => c[dim] === v)) })), [rows, dim]);
  const maxK = Math.max(...curves.map((c) => c.values.length));
  const sv = DASH.survivability;
  const set = (k: keyof Filt) => (v: number) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-line bg-white p-3 sm:grid-cols-3 lg:grid-cols-6">
        <Select label="Plan at start" value={f.plan} options={DIMS.plans} onChange={set("plan")} />
        <Select label="Channel" value={f.channel} options={DIMS.channels} onChange={set("channel")} />
        <Select label="Way to pay" value={f.pay} options={DIMS.pays} onChange={set("pay")} />
        <Select label="Area" value={f.area} options={DIMS.areas} onChange={set("area")} />
        <Select label="Region" value={f.region} options={DIMS.regions} onChange={set("region")} />
        <div className="flex flex-col justify-end">
          <p className="font-mono text-[11.5px] text-ink/55">{num(rows.length)} customers</p>
          <button type="button" onClick={() => setF(NO_FILTER)} className="mt-1 w-fit rounded-full border border-line px-3 py-1 text-[12px] hover:border-ink">
            Reset
          </button>
        </div>
      </div>
      <Panel
        title="Retention by cohort"
        sub={mode === "logo" ? "Share of each month's new customers still active after N months (0 = end of the first month)" : "Monthly fees still coming in from each cohort, % of what it started with (upgrades count)"}
        right={<Chips value={mode} onChange={setMode} options={[{ v: "logo", l: "Customers" }, { v: "rev", l: "Revenue" }]} size="xs" />}
      >
        {mode === "rev" && !filtered && <p className="mb-2 text-[11.5px] text-ink/50">Revenue view is for the whole base; clear the filters to change it.</p>}
        {mode === "rev" && filtered ? null : null}
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-[2px] text-[10.5px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-1.5 text-left font-mono font-medium text-ink/50">Cohort</th>
                <th className="px-1 font-mono font-medium text-ink/50">n</th>
                {MONTHS.map((_, k) => (
                  <th key={k} className="min-w-[30px] font-mono font-medium text-ink/45">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(mode === "rev" && filtered ? DASH.cohortRev : grid).map((row) => (
                <tr key={row.m}>
                  <td className="sticky left-0 bg-white px-1.5 font-mono whitespace-nowrap text-ink/70">{row.m}</td>
                  <td className="px-1 text-right font-mono text-ink/45">{row.n}</td>
                  {row.r.map((v, k) => (
                    <td key={k} className="h-6 rounded-[4px] text-center font-mono tabular-nums" style={{ background: Number.isNaN(v) ? "transparent" : heatGreen(v), color: textOn(v) }} title={`${row.m}, month ${k}: ${Number.isNaN(v) ? "–" : v.toFixed(1)}%`}>
                      {Number.isNaN(v) ? "" : Math.round(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Insight>
          Read across a row to follow one cohort as it ages, and down a column to compare cohorts at the same age. The biggest drop is always in the first three columns: that is where retention work pays off most.
        </Insight>
      </Panel>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Survival curves" sub="Kaplan–Meier: share still a customer after each month of service, using every customer's tenure" right={<Chips value={dim} onChange={setDim} options={(Object.keys(DIM_LABELS) as Dim[]).map((d) => ({ v: d, l: DIM_LABELS[d].l }))} size="xs" />}>
          <Lines labels={Array.from({ length: maxK }, (_, k) => `${k + 1}`)} series={curves.map((c, i) => ({ name: c.name, color: LINE_COLORS[i], values: Array.from({ length: maxK }, (_, k) => c.values[k] ?? null) }))} yFmt={(v) => `${Math.round(v)}%`} yMax={100} yMin={30} every={3} />
          <p className="mt-1 text-[11px] text-ink/45">x axis: months of service. Curves stop when fewer than 20 customers are left to follow.</p>
        </Panel>
        <Panel title="Cohort survivability" sub="Share of each cohort still active after 3, 6 and 12 months: are newer cohorts doing better?">
          <Lines
            labels={sv.m3.map((x) => x.m)}
            series={[
              { name: "After 3 months", color: C.blue, values: sv.m3.map((x) => x.v) },
              { name: "After 6 months", color: C.violet, values: sv.m3.map((x) => sv.m6.find((y) => y.m === x.m)?.v ?? null) },
              { name: "After 12 months", color: C.ink, values: sv.m3.map((x) => sv.m12.find((y) => y.m === x.m)?.v ?? null) },
            ]}
            yFmt={(v) => `${Math.round(v)}%`}
            yMin={40}
            yMax={100}
          />
          <Insight>{DASH.findings.cohorts} The welcome campaign started in Sep 2025; if it worked, the 3-month line would climb after that. It barely does, which the campaign results below confirm.</Insight>
        </Panel>
      </div>
    </div>
  );
}

/* ================================================================ 04 risk segmentation + model */
export function Risk() {
  const M = DASH.model;
  const maxChurn = Math.max(...DASH.segments.map((s) => s.churn60 ?? 0));
  const drivers = [...M.features].sort((a, b) => b.coef - a.coef);
  return (
    <div className="flex flex-col gap-3">
      <Panel title="Risk segments, today" sub="Every active customer falls in the first segment whose rule fits. The last column checks each rule on the past: of the customers who fitted it at the end of Jun 26, how many left within 60 days?">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead className="font-mono text-[10.5px] text-ink/50 uppercase">
              <tr>
                <th className="py-2 font-medium">Segment</th>
                <th className="font-medium">Rule</th>
                <th className="text-right font-medium">Active now</th>
                <th className="text-right font-medium">Fees / month</th>
                <th className="pl-4 font-medium">Left within 60 days (past check)</th>
              </tr>
            </thead>
            <tbody>
              {DASH.segments.map((s) => (
                <tr key={s.name} className="border-t border-line align-top">
                  <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">{s.name}</td>
                  <td className="pr-3 text-ink-2/70">{s.rule}</td>
                  <td className="text-right font-mono tabular-nums">{num(s.n)}</td>
                  <td className="text-right font-mono tabular-nums">{rp(s.mrr)}</td>
                  <td className="pl-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-28 overflow-hidden rounded-full bg-ink/[0.06]">
                        <span className="block h-full rounded-full" style={{ width: `${((s.churn60 ?? 0) / maxChurn) * 100}%`, background: (s.churn60 ?? 0) > 8 ? C.red : C.ink }} />
                      </span>
                      <span className="font-mono tabular-nums">{s.churn60 == null ? "–" : pct(s.churn60)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Insight>{DASH.findings.risk}</Insight>
      </Panel>
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Churn model, tested on the future" sub={`${M.target}. Trained on ${M.trainRange} (${num(M.nTrain)} rows), tested on ${M.testRange} (${num(M.nTest)} rows) it never saw.`}>
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Logistic regression" value={`AUC ${M.lr.auc}`} note="exported, runs in your browser" />
            <Tile label="Gradient boosting" value={`AUC ${M.gbm.auc}`} note="for comparison" />
            <Tile label="Base rate" value={pct(M.baseRate)} note="leave within 2 months" />
            <Tile label="Top 20% catches" value={pct(M.lr.gains[2].captured)} note={`of leavers, ${pct(M.lr.gains[2].precision)} hit rate`} />
          </div>
          <Insight>The simple, explainable model ranks about as well as the boosted one, so it is the one used: every score can be explained by its drivers.</Insight>
        </Panel>
        <Panel title="How much of churn you catch" sub="Call the riskiest X% (by model score): what share of the customers who then left were in that group?">
          <Lines
            labels={["0", ...tens(M.lr.gains).map((g) => `${g.top}`)]}
            series={[
              { name: "Logistic", color: C.ink, values: [0, ...tens(M.lr.gains).map((g) => g.captured)] },
              { name: "Boosting", color: C.violet, values: [0, ...tens(M.gbm.gains).map((g) => g.captured)], dash: true },
              { name: "Random calls", color: C.grey, values: [0, ...tens(M.lr.gains).map((g) => g.top)], dash: true },
            ]}
            yFmt={(v) => `${Math.round(v)}%`}
            yMax={100}
            every={2}
          />
          <p className="mt-1 text-[11px] text-ink/45">x axis: % of the base called, riskiest first</p>
        </Panel>
        <Panel title="What drives the score" sub="Model weights on standardised features: right pushes risk up, left pulls it down">
          <div className="flex flex-col gap-1">
            {drivers
              .filter((d) => Math.abs(d.coef) > 0.04)
              .map((d) => {
                const w = Math.min(50, Math.abs(d.coef) * 90);
                return (
                  <div key={d.key} className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-2 text-[11.5px]">
                    <span className="truncate text-ink-2/80" title={d.label}>
                      {d.label}
                    </span>
                    <span className="relative h-3">
                      <span className="absolute top-0 left-1/2 h-3 w-px bg-ink/20" />
                      <span className="absolute top-0.5 h-2 rounded-full" style={d.coef > 0 ? { left: "50%", width: `${w}%`, background: C.red } : { right: "50%", width: `${w}%`, background: C.green }} />
                    </span>
                  </div>
                );
              })}
          </div>
        </Panel>
      </div>
      <Panel title="Who to call this week" sub="The 25 active customers with the highest model risk today, with the two features pushing their score up most (made-up IDs)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12px]">
            <thead className="font-mono text-[10.5px] text-ink/50 uppercase">
              <tr>
                <th className="py-1.5 font-medium">Customer</th>
                <th className="font-medium">Plan</th>
                <th className="text-right font-medium">Months</th>
                <th className="pl-3 font-medium">Segment</th>
                <th className="text-right font-medium">Risk, 60 days</th>
                <th className="pl-4 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {DASH.call.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-1.5 font-mono">{r.id}</td>
                  <td>{r.plan}</td>
                  <td className="text-right font-mono">{r.tenure}</td>
                  <td className="pl-3">{r.seg}</td>
                  <td className="text-right font-mono font-semibold" style={{ color: C.red }}>
                    {pct(r.risk)}
                  </td>
                  <td className="pl-4 text-ink-2/70">{r.why.join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ================================================================ 05 payment recovery */
export function Payments() {
  const P = DASH.payments;
  const c2 = DASH.campaigns.find((c) => c.id === "C2")!;
  const c3 = DASH.campaigns.find((c) => c.id === "C3")!;
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel title="How late packages get rebought" sub="Every monthly-package cycle, by days after expiry">
        <Bars items={P.rebuyDist.map((x) => ({ k: x.k, v: x.v, color: x.k === "Not rebought" ? C.red : x.k === "On time" ? C.green : C.orange }))} fmt={(v) => pct(v)} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="font-mono text-[10.5px] text-ink/50 uppercase">
              <tr>
                <th className="py-1 font-medium">Pays with</th>
                <th className="text-right font-medium">On time</th>
                <th className="text-right font-medium">Never rebought</th>
              </tr>
            </thead>
            <tbody>
              {P.rebuyByMethod.map((m) => (
                <tr key={m.k} className="border-t border-line">
                  <td className="py-1.5">{m.k}</td>
                  <td className="text-right font-mono">{pct(m.onTime)}</td>
                  <td className="text-right font-mono" style={{ color: m.lapsed > 4 ? C.red : undefined }}>
                    {pct(m.lapsed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Invoices recovered over time" sub="Postpaid: share of invoices paid by each day after the due date (day 0 = on time)">
        <Lines labels={P.recoveryDays.map((d) => `${d}`)} series={P.recovery.map((r, i) => ({ name: r.k, color: [C.green, C.blue, C.orange][i], values: r.curve }))} yFmt={(v) => `${Math.round(v)}%`} yMin={70} yMax={100} every={2} />
        <p className="mt-1 text-[11px] text-ink/45">x axis: days after the due date</p>
        <Insight>
          Autodebit customers are almost always on time. Everyone else recovers mostly in the first two weeks; what isn&apos;t paid by day 30 rarely comes back. Owing right now: {num(P.owingNow)} invoices, {rp(P.owingAmount)}.
        </Insight>
      </Panel>
      <Panel title="What the nudges did" sub="Measured against a random control group that got nothing">
        {[c2, c3].map((c) => (
          <div key={c.id} className="mb-3 rounded-2xl border border-line p-3">
            <p className="text-[13px] font-semibold">{c.name}</p>
            <p className="text-[11.5px] text-ink-2/60">{c.outcome}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-mono text-[16px] font-semibold">{pct(c.p1)}</p>
                <p className="text-[10.5px] text-ink/50">contacted (n={c.n1})</p>
              </div>
              <div>
                <p className="font-mono text-[16px] font-semibold text-ink/55">{pct(c.p0)}</p>
                <p className="text-[10.5px] text-ink/50">control (n={c.n0})</p>
              </div>
              <div>
                <p className="font-mono text-[16px] font-semibold" style={{ color: c.p < 0.05 ? C.green : C.gold }}>
                  {signed(c.diff)} pts
                </p>
                <p className="text-[10.5px] text-ink/50">{c.p < 0.05 ? "significant" : `not proven (p=${c.p})`}</p>
              </div>
            </div>
          </div>
        ))}
        <Insight>The reminder works and costs almost nothing. The recovery call looks strong but its control group is tiny, so the result could still be luck: hold out more people next time.</Insight>
      </Panel>
    </div>
  );
}

/* ================================================================ 06 5G adoption */
export function FiveG() {
  const F = DASH.fiveg;
  const c5 = DASH.campaigns.find((c) => c.id === "C5")!;
  const last = F.monthly[F.monthly.length - 1];
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Tile label="5G-ready, still on 4G" value={num(F.readyNow)} note="covered homes to upgrade" />
        <Tile label="Covered homes on 5G" value={pct((last.on5g / last.covered) * 100)} note={`${num(last.on5g)} of ${num(last.covered)}`} />
        <Tile label="Data before → after upgrade" value={`${Math.round(F.upgradeUsageBefore)} → ${Math.round(F.upgradeUsageAfter)} GB`} note={`${F.nUpgradesMeasured} upgrades measured`} tone="good" />
        <Tile label="Monthly churn, covered 4G" value={pct(F.churn4gCovered, 2)} tone="bad" />
        <Tile label="Monthly churn, 5G" value={pct(F.churn5g, 2)} tone="good" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Coverage and adoption" sub="Active customers whose home has 5G, how many are on a 5G plan, and upgrades each month">
          <Lines labels={F.monthly.map((m) => m.m)} series={[{ name: "Homes with 5G", color: C.ink, values: F.monthly.map((m) => m.covered) }, { name: "On a 5G plan", color: C.violet, values: F.monthly.map((m) => m.on5g), area: true }]} bars={{ name: "Upgrades in the month", color: C.green, values: F.monthly.map((m) => m.upgrades) }} yFmt={(v) => num(v)} every={2} />
        </Panel>
        <Panel title="The upgrade campaign" sub={`${c5.offer}. Who: ${c5.rule}.`}>
          <Bars items={[{ k: "Contacted", v: c5.p1, color: C.violet }, { k: "Control", v: c5.p0, color: C.grey }]} fmt={(v) => pct(v)} max={Math.max(c5.p1, c5.p0) * 1.15} />
          <p className="mt-3 text-[13px]">
            <b>{signed(c5.diff)} points</b> more moved to 5G within two months (95% range {signed(c5.lo)} to {signed(c5.hi)}), about {Math.round(c5.incremental)} extra upgrades from {num(c5.n1)} contacts.
          </p>
          <Insight>{DASH.findings.fiveg} Upgraded customers also leave less, so the campaign pays twice: more data and a stickier base.</Insight>
        </Panel>
      </div>
    </div>
  );
}

/* ================================================================ 07 lifecycle requests */
type Life = { type: string; n: number; open: number; median: number | null; sla: number; slaMet: number | null; leftInside?: number; leftBreach?: number; nInside?: number; nBreach?: number; renewed?: number; leftRenewed?: number; leftDeclined?: number };
export function Lifecycle() {
  const L = DASH.lifecycle.types as Life[];
  const M = DASH.lifecycle.monthly;
  const types = ["Relocation", "Device fault", "Renewal", "5G upgrade"] as const;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-4">
        {L.map((r) => (
          <Panel key={r.type} title={r.type} sub={`${num(r.n)} requests · target ${r.sla} days`}>
            <div className="grid grid-cols-2 gap-2">
              <Tile label="Median days" value={r.median == null ? "–" : String(r.median)} />
              <Tile label="Within target" value={r.slaMet == null ? "–" : pct(r.slaMet, 0)} tone={r.slaMet != null && r.slaMet < 70 ? "bad" : undefined} />
            </div>
            {r.leftInside != null && (
              <p className="mt-3 text-[12.5px] leading-relaxed">
                Left within 60 days: <b style={{ color: C.green }}>{pct(r.leftInside)}</b> if fixed in time, <b style={{ color: C.red }}>{pct(r.leftBreach ?? 0)}</b> if late.
              </p>
            )}
            {r.renewed != null && (
              <p className="mt-3 text-[12.5px] leading-relaxed">
                {pct(r.renewed)} renewed. Left within 60 days: <b style={{ color: C.green }}>{pct(r.leftRenewed ?? 0)}</b> after renewing, <b style={{ color: C.red }}>{pct(r.leftDeclined ?? 0)}</b> after declining.
              </p>
            )}
            {r.type === "5G upgrade" && <p className="mt-3 text-[12.5px] leading-relaxed">Done in a day; the bottleneck is reaching eligible customers, not the swap.</p>}
          </Panel>
        ))}
      </div>
      <Panel title="Requests per month" sub="Every lifecycle request, by type">
        <Lines labels={MONTHS} series={types.map((t, i) => ({ name: t, color: [C.orange, C.red, C.blue, C.violet][i], values: M.map((m) => (m as Record<string, number | string>)[t] as number) }))} yFmt={(v) => num(v)} yMin={0} />
        <Insight>{DASH.findings.lifecycle} Today {pct(100 - (L[0].slaMet ?? 0), 0)} of relocations and {pct(100 - (L[1].slaMet ?? 0), 0)} of device faults miss their target: fixing that is one of the cheapest ways to keep customers.</Insight>
      </Panel>
    </div>
  );
}

/* ================================================================ 08 campaigns and performance feedback */
export function Campaigns() {
  const rows = DASH.campaigns;
  const lo = Math.min(...rows.map((r) => r.lo), -5);
  const hi = Math.max(...rows.map((r) => r.hi), 5);
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const band = DASH.saveByBand;
  return (
    <div className="flex flex-col gap-3">
      <Panel title="Campaign scoreboard" sub="Every campaign kept a random control group. The bar is the measured lift with its 95% range: if the range crosses zero, the effect isn't proven.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[12px]">
            <thead className="font-mono text-[10.5px] text-ink/50 uppercase">
              <tr>
                <th className="py-2 font-medium">Campaign</th>
                <th className="font-medium">Measured outcome</th>
                <th className="text-right font-medium">Contacted</th>
                <th className="text-right font-medium">Control</th>
                <th className="w-[220px] pl-4 font-medium">Lift (points) and 95% range</th>
                <th className="text-right font-medium">Extra</th>
                <th className="text-right font-medium">Cost</th>
                <th className="text-right font-medium">Per extra</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sig = r.p < 0.05;
                return (
                  <tr key={r.id} className="border-t border-line align-middle">
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[11px] text-ink/50">{r.offer}</p>
                    </td>
                    <td className="pr-3 text-ink-2/70">{r.outcome}</td>
                    <td className="text-right font-mono">
                      {pct(r.p1)}
                      <span className="block text-[10px] text-ink/40">n={num(r.n1)}</span>
                    </td>
                    <td className="text-right font-mono text-ink/60">
                      {pct(r.p0)}
                      <span className="block text-[10px] text-ink/40">n={num(r.n0)}</span>
                    </td>
                    <td className="pl-4">
                      <div className="relative h-5">
                        <span className="absolute top-0 h-5 w-px bg-ink/30" style={{ left: `${x(0)}%` }} />
                        <span className="absolute top-2 h-1 rounded-full" style={{ left: `${x(r.lo)}%`, width: `${x(r.hi) - x(r.lo)}%`, background: sig ? C.green : C.gold, opacity: 0.45 }} />
                        <span className="absolute top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white" style={{ left: `${x(r.diff)}%`, background: sig ? C.green : C.gold }} />
                      </div>
                      <p className="font-mono text-[11px]">
                        <b style={{ color: sig ? C.green : C.gold }}>{signed(r.diff)}</b> <span className="text-ink/45">[{signed(r.lo)}, {signed(r.hi)}] · p={r.p}</span>
                      </p>
                    </td>
                    <td className="text-right font-mono">{r.incremental > 0 ? `+${Math.round(r.incremental)}` : "0"}</td>
                    <td className="text-right font-mono">{rp(r.cost)}</td>
                    <td className="text-right font-mono">{r.costPer && sig ? rp(r.costPer) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Insight>
          Keep the 5G upgrade and the rebuy reminder: clear, cheap wins. The save offer works, but see who it works for below. The recovery call needs a bigger control group to prove itself, and the early-life welcome shows no effect: redesign it or stop it.
        </Insight>
      </Panel>
      <Panel title="Who the save offer actually helps" sub="Same campaign, split by how the customer had been paying when contacted">
        <div className="grid gap-3 md:grid-cols-3">
          {band.map((b) => {
            const sig = b.p < 0.05;
            return (
              <div key={b.k} className="rounded-2xl border border-line p-3">
                <p className="text-[13px] font-semibold">{b.k}</p>
                <p className="mt-1 font-mono text-[22px] font-semibold" style={{ color: b.diff > 0 ? (sig ? C.green : C.gold) : C.red }}>
                  {signed(b.diff)} pts
                </p>
                <p className="text-[11px] text-ink/50">
                  stayed: {pct(b.p1)} vs {pct(b.p0)} · n={b.n1}/{b.n0} · {sig ? "significant" : "not proven"}
                </p>
              </div>
            );
          })}
        </div>
        <Insight>A discount keeps people who were happy to pay but tempted to leave. For customers who keep paying late, money is the problem and the discount doesn&apos;t fix it: send them to payment recovery instead.</Insight>
      </Panel>
    </div>
  );
}
