"use client";

import { useMemo, useState } from "react";
import { ACTIVE, DASH, DIMS, T, num, pct, rp, score, tenureOf, type Cust } from "./data";
import { Bars, C, Chips, Insight, Panel, Slider, Tile } from "./ui";

/* ================================================================ segment builder */
export function SegmentBuilder() {
  const [use, setUse] = useState(60);
  const [late, setLate] = useState(0);
  const [tenure, setTenure] = useState(24);
  const [risk, setRisk] = useState(0);
  const [pay, setPay] = useState(-1);
  const seg = useMemo(
    () => ACTIVE.filter((c) => c.lastUse < use && c.late3 >= late && tenureOf(c) <= tenure && c.risk / 10 >= risk && (pay < 0 || c.pay === pay)),
    [use, late, tenure, risk, pay],
  );
  const baseRisk = ACTIVE.reduce((a, c) => a + c.risk, 0) / ACTIVE.length / 10;
  const segRisk = seg.length ? seg.reduce((a, c) => a + c.risk, 0) / seg.length / 10 : 0;
  const leavers = seg.reduce((a, c) => a + c.risk / 1000, 0);
  const mrr = seg.reduce((a, c) => a + c.fee * 1000, 0);
  const by = (key: keyof Cust, names: string[]) => names.map((k, v) => ({ k, v: seg.filter((c) => c[key] === v).length })).filter((x) => x.v > 0);
  const sql = [
    "SELECT c.customer_id, c.plan_current, c.sales_channel",
    "FROM customers c",
    "JOIN usage_monthly u ON u.customer_id = c.customer_id AND u.month = '2026-10'",
    "JOIN (SELECT customer_id, COUNT(*) AS late_3m FROM billing",
    "      WHERE cycle_month >= '2026-08' AND status IN ('Late','Not rebought','Paid late','Unpaid')",
    "      GROUP BY customer_id) b ON b.customer_id = c.customer_id",
    "WHERE c.status = 'Active'",
    `  AND u.data_gb < ${use / 100} * typical_gb(c.plan_current)   -- usage under ${use}% of the plan`,
    late ? `  AND b.late_3m >= ${late}` : null,
    tenure < 24 ? `  AND months_between(c.activation_date, '2026-10-31') <= ${tenure}` : null,
    pay >= 0 ? `  AND c.pay_type = '${DIMS.pays[pay]}'` : null,
    risk ? `  AND churn_score(c.customer_id) >= ${risk / 100}   -- model risk, 60 days` : null,
  ].filter(Boolean);

  return (
    <Panel title="Segment builder" sub="Set the rules; the segment is cut live from today's 3,000-odd active customers, with each one's model risk.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="flex flex-col gap-4">
          <Slider label="Usage last month below" value={use} min={10} max={200} step={5} onChange={setUse} fmt={(v) => `${v}% of plan`} />
          <Slider label="Late payments, last 3 months, at least" value={late} min={0} max={3} onChange={setLate} fmt={(v) => String(v)} />
          <Slider label="Months of service, at most" value={tenure} min={1} max={24} onChange={setTenure} fmt={(v) => (v >= 24 ? "any" : String(v))} />
          <Slider label="Model risk (60 days), at least" value={risk} min={0} max={40} onChange={setRisk} fmt={(v) => `${v}%`} />
          <Chips value={pay} onChange={setPay} options={[{ v: -1, l: "Any way to pay" }, ...DIMS.pays.map((p, i) => ({ v: i, l: p }))]} size="xs" />
        </div>
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Customers" value={num(seg.length)} note={`${pct((seg.length / ACTIVE.length) * 100)} of active`} />
            <Tile label="Fees per month" value={rp(mrr)} />
            <Tile label="Average risk" value={pct(segRisk)} note={`base ${pct(baseRisk)}`} tone={segRisk > baseRisk * 1.3 ? "bad" : undefined} />
            <Tile label="Expected to leave" value={num(leavers)} note="within 60 days, by the model" tone="bad" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11.5px] font-semibold text-ink/55">By plan</p>
              <Bars items={by("plan", DIMS.plans)} fmt={(v) => num(v)} color={C.blue} />
            </div>
            <div>
              <p className="mb-1.5 text-[11.5px] font-semibold text-ink/55">By channel</p>
              <Bars items={by("channel", DIMS.channels)} fmt={(v) => num(v)} color={C.violet} />
            </div>
          </div>
          <p className="mt-3 mb-1 text-[11.5px] font-semibold text-ink/55">The same segment as a query on the raw tables</p>
          <pre className="overflow-x-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-white/85">{sql.join("\n")}</pre>
        </div>
      </div>
    </Panel>
  );
}

/* ================================================================ model what-if */
const START = { tenure: 2, plan: 0, channel: 1, postpaid: 0, method: 1, bundle_on: 0, use: 40, use_falling: 0, active_days: 18, late_last: 1, late_3m: 1, dpd: 0, reloc_2m: 0, fault_2m: 0, area: 0, covered: 0 };
export function WhatIf() {
  const [s, setS] = useState(START);
  const set = (k: keyof typeof START) => (v: number) => setS((x) => ({ ...x, [k]: v }));
  const x = {
    tenure: s.tenure,
    new_le2: s.tenure <= 2 ? 1 : 0,
    plan_4g50: s.plan === 1 ? 1 : 0,
    plan_5g: s.plan === 2 ? 1 : 0,
    on_4g_covered: s.plan < 2 && s.covered ? 1 : 0,
    ch_online: s.channel === 1 ? 1 : 0,
    ch_field: s.channel === 2 ? 1 : 0,
    ch_partner: s.channel === 3 ? 1 : 0,
    postpaid: s.postpaid,
    m_retail: s.method === 1 ? 1 : 0,
    m_autodebit: s.method === 3 ? 1 : 0,
    bundle_on: s.bundle_on,
    use_ratio: s.use / 100,
    use_falling: s.use_falling,
    active_days: s.active_days,
    late_last: s.late_last,
    late_3m: Math.max(s.late_3m, s.late_last),
    dpd: s.postpaid ? s.dpd : 0,
    reloc_2m: s.reloc_2m,
    fault_2m: s.fault_2m,
    metro: s.area === 0 ? 1 : 0,
    rural: s.area === 3 ? 1 : 0,
  };
  const { p, parts } = score(x);
  const top = [...parts].sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 8);
  const base = DASH.model.baseRate;
  const toggle = (k: keyof typeof START, l: string) => (
    <button type="button" onClick={() => set(k)(s[k] ? 0 : 1)} className={`rounded-full border px-3 py-1 text-[12px] ${s[k] ? "border-ink bg-ink text-white" : "border-line text-ink/70"}`}>
      {l}
    </button>
  );
  return (
    <Panel title="Model what-if" sub="Build one customer and watch the exported model (the same weights as scikit-learn's) score them.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="flex flex-col gap-3">
          <Slider label="Months of service" value={s.tenure} min={0} max={24} onChange={set("tenure")} />
          <Slider label="Data last month, % of plan's typical" value={s.use} min={5} max={200} step={5} onChange={set("use")} fmt={(v) => `${v}%`} />
          <Slider label="Days online last month" value={s.active_days} min={1} max={30} onChange={set("active_days")} />
          <Slider label="Late payments, last 3 months" value={s.late_3m} min={0} max={3} onChange={set("late_3m")} />
          <div className="flex flex-col gap-1.5">
            <Chips value={s.plan} onChange={set("plan")} options={DIMS.plans.map((l, v) => ({ v, l: l.replace("Home ", "") }))} size="xs" />
            <Chips value={s.channel} onChange={set("channel")} options={DIMS.channels.map((l, v) => ({ v, l }))} size="xs" />
            <Chips value={s.area} onChange={set("area")} options={DIMS.areas.map((l, v) => ({ v, l }))} size="xs" />
            <Chips value={s.method} onChange={set("method")} options={DIMS.methods.map((l, v) => ({ v, l }))} size="xs" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {toggle("late_last", "Late last month")}
            {toggle("use_falling", "Usage down 40%+")}
            {toggle("bundle_on", "In a 12-month bundle")}
            {toggle("postpaid", "Postpaid invoice")}
            {toggle("covered", "Home has 5G")}
            {toggle("reloc_2m", "Relocation request")}
            {toggle("fault_2m", "Device fault")}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-[11.5px] font-semibold text-ink/55">Chance of leaving in the next 2 months</p>
              <p className="text-[46px] leading-none font-semibold tracking-[-0.04em] tabular-nums" style={{ color: p * 100 > base * 1.5 ? C.red : p * 100 < base * 0.7 ? C.green : C.ink }}>
                {pct(p * 100)}
              </p>
            </div>
            <p className="pb-2 text-[12.5px] text-ink/60">
              average customer: {pct(base)} · this one is {(p / (base / 100)).toFixed(1)}× the average
            </p>
          </div>
          <p className="mt-4 mb-1.5 text-[11.5px] font-semibold text-ink/55">What moves this score (log-odds contribution)</p>
          <div className="flex flex-col gap-1">
            {top.map((d) => (
              <div key={d.key} className="grid grid-cols-[minmax(0,1fr)_140px_48px] items-center gap-2 text-[12px]">
                <span className="truncate text-ink-2/80">{d.label}</span>
                <span className="relative h-3">
                  <span className="absolute top-0 left-1/2 h-3 w-px bg-ink/20" />
                  <span className="absolute top-0.5 h-2 rounded-full" style={d.v > 0 ? { left: "50%", width: `${Math.min(50, Math.abs(d.v) * 40)}%`, background: C.red } : { right: "50%", width: `${Math.min(50, Math.abs(d.v) * 40)}%`, background: C.green }} />
                </span>
                <span className="text-right font-mono text-[11px]">{d.v > 0 ? "+" : ""}{d.v.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Insight>Try a new online customer with low usage who was late last month, then give them a 12-month bundle or move them to 5G: the drivers that push risk up are exactly what the campaigns target.</Insight>
        </div>
      </div>
    </Panel>
  );
}

/* ================================================================ campaign planner */
type Plan = "save" | "rebuy" | "upgrade";
export function Planner() {
  const [plan, setPlan] = useState<Plan>("save");
  const [cap, setCap] = useState(150);
  const [target, setTarget] = useState<"risk" | "random" | "ontime">("risk");
  const camp = (id: string) => DASH.campaigns.find((c) => c.id === id)!;
  const r = useMemo(() => {
    if (plan === "save") {
      // the save offer's measured effect differs by how the customer pays, so each picked customer gets their own band's effect
      const relOf = (k: string) => {
        const b = DASH.saveByBand.find((x) => x.k === k)!;
        return Math.max(0, 1 - (100 - b.p1) / (100 - b.p0));
      };
      const band = (c: Cust) => (c.late3 === 0 ? "Paid on time" : c.late3 === 1 ? "Late once" : "Late 2+ times");
      const pool = target === "ontime" ? ACTIVE.filter((c) => c.late3 === 0) : ACTIVE;
      const picked = target === "random" ? pool.filter((_, i) => i % Math.max(1, Math.floor(pool.length / cap)) === 0).slice(0, cap) : [...pool].sort((a, b) => b.risk - a.risk).slice(0, cap);
      const expectedLeave = picked.reduce((a, c) => a + c.risk / 1000, 0);
      const saves = picked.reduce((a, c) => a + (c.risk / 1000) * relOf(band(c)), 0);
      const fee = picked.reduce((a, c) => a + c.fee * 1000, 0) / Math.max(1, picked.length);
      const stayers = picked.length - expectedLeave + saves; // everyone who stays gets the discount
      const cost = picked.length * 8000 + stayers * fee * 0.2 * 3;
      const late2 = picked.filter((c) => c.late3 >= 2).length;
      return {
        n: picked.length,
        expectedLeave,
        extra: saves,
        unit: "customers kept",
        cost,
        value: saves * fee * 12,
        note: `Each picked customer's own model risk × the offer's measured effect for their payment band: ${pct(relOf("Paid on time") * 100, 0)} fewer leavers if they pay on time, ${pct(relOf("Late once") * 100, 0)} if late once, none if late twice or more (${num(late2)} of this pick). Value = a year of their fee.`,
      };
    }
    if (plan === "rebuy") {
      const c2 = camp("C2");
      const pool = ACTIVE.filter((c) => c.pay === 0 && c.late3 >= 1);
      const n = Math.min(cap, pool.length);
      const extra = (n * c2.diff) / 100;
      const fee = pool.reduce((a, c) => a + c.fee * 1000, 0) / Math.max(1, pool.length);
      return { n, expectedLeave: 0, extra, unit: "extra on-time rebuys a month", cost: n * 400, value: extra * fee * 0.25, note: `Eligible now: ${num(pool.length)} package customers late at least once. Uses the measured +${c2.diff} points. Value = a week of service not lost per late rebuy.` };
    }
    const c5 = camp("C5");
    const pool = ACTIVE.filter((c) => c.plan < 2 && c.cover <= T - 1);
    const n = Math.min(cap, pool.length);
    const extra = (n * c5.diff) / 100;
    return { n, expectedLeave: 0, extra, unit: "extra 5G upgrades", cost: n * 3000, value: extra * (350_000 - 210_000) * 12, note: `Eligible now: ${num(pool.length)} covered 4G customers. Uses the measured +${c5.diff} points. Value = 12 months of the higher 5G fee.` };
  }, [plan, cap, target]);
  const per = r.extra > 0 ? r.cost / r.extra : 0;
  return (
    <Panel title="Campaign planner" sub="Pick a campaign, how many people the team can contact this month and who to pick. The numbers use the lifts measured against control groups above, not guesses.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="flex flex-col gap-4">
          <Chips value={plan} onChange={setPlan} options={[{ v: "save", l: "Save offer" }, { v: "rebuy", l: "Rebuy reminder" }, { v: "upgrade", l: "5G upgrade" }]} />
          <Slider label="Contacts this month" value={cap} min={25} max={600} step={25} onChange={setCap} />
          {plan === "save" && (
            <div>
              <p className="mb-1.5 text-[11.5px] font-semibold text-ink/55">Who gets the offer</p>
              <Chips value={target} onChange={setTarget} options={[{ v: "risk", l: "Highest model risk" }, { v: "ontime", l: "Highest risk, paying on time" }, { v: "random", l: "Random" }]} size="xs" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Contacted" value={num(r.n)} />
            <Tile label="Result" value={`+${r.extra.toFixed(1)}`} note={r.unit} tone="good" />
            <Tile label="Cost" value={rp(r.cost)} note={plan === "save" ? "contacts + 3 months of discount" : "contacts"} />
            <Tile label="Cost per result" value={r.extra > 0 ? rp(per) : "–"} note={`value ${rp(r.value)}`} tone={r.value > r.cost ? "good" : "bad"} />
          </div>
          {plan === "save" && <p className="mt-3 text-[12.5px]">Without the offer, about <b>{r.expectedLeave.toFixed(1)}</b> of these {num(r.n)} would leave within 60 days.</p>}
          <Insight>{r.note} {plan === "save" && "Compare the three ways to pick: the riskiest customers are mostly late payers, whom a discount doesn't move, so the riskiest on-time payers keep the most customers per rupiah."}</Insight>
        </div>
      </div>
    </Panel>
  );
}
