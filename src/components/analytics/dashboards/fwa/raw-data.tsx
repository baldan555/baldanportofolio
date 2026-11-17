"use client";

import { ArrowDownToLine, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DASH, num } from "./data";
import { Panel } from "./ui";

type Col = { name: string; type: string; meaning: string };
type Table = { name: string; title: string; grain: string; key: string; rows: number; cols: Col[] };

export const TABLES: Table[] = [
  {
    name: "customers",
    title: "Customers",
    grain: "One row per customer (CRM master)",
    key: "customer_id",
    rows: DASH.counts.customers,
    cols: [
      { name: "customer_id", type: "text", meaning: "Made-up ID, the key every other table joins on" },
      { name: "activation_date", type: "date", meaning: "First day of service; its month is the customer's cohort" },
      { name: "region / area_type", type: "text", meaning: "Where the home is: 8 regions; metro, urban, suburban or rural" },
      { name: "sales_channel", type: "text", meaning: "Retail outlet, online, field sales or partner agent" },
      { name: "plan_at_activation / plan_current", type: "text", meaning: "Home 4G 20 Mbps, Home 4G 50 Mbps or Home 5G 100 Mbps" },
      { name: "device", type: "text", meaning: "4G CPE or 5G CPE (the home router)" },
      { name: "monthly_fee_idr", type: "number", meaning: "Price of the current plan per month" },
      { name: "pay_type / payment_method", type: "text", meaning: "Monthly package to rebuy, or postpaid invoice; e-wallet, VA, autodebit, retail counter" },
      { name: "bundle_12m", type: "Y/N", meaning: "Signed a 12-month device bundle" },
      { name: "home_5g_coverage_from", type: "month", meaning: "When 5G reached the home (blank: not yet)" },
      { name: "status / churn_date", type: "text, date", meaning: "Active or churned, and when" },
      { name: "churn_type / churn_reason", type: "text", meaning: "Voluntary or involuntary (non-payment), and the reason given" },
    ],
  },
  {
    name: "usage_monthly",
    title: "Monthly usage",
    grain: "One row per customer per active month",
    key: "customer_id + month",
    rows: DASH.counts.usage,
    cols: [
      { name: "month", type: "YYYY-MM", meaning: "Usage month" },
      { name: "data_gb", type: "number", meaning: "Data used that month" },
      { name: "active_days", type: "number", meaning: "Days the router was online" },
      { name: "avg_download_mbps", type: "number", meaning: "Average download speed seen" },
      { name: "share_5g_pct", type: "number", meaning: "Share of traffic on 5G (0 for 4G devices)" },
    ],
  },
  {
    name: "billing",
    title: "Billing and rebuys",
    grain: "One row per customer per billing cycle",
    key: "customer_id + cycle_month",
    rows: DASH.counts.billing,
    cols: [
      { name: "cycle_month", type: "YYYY-MM", meaning: "Which month's package or invoice" },
      { name: "amount_idr", type: "number", meaning: "Package price or invoice amount" },
      { name: "due_date", type: "date", meaning: "Package expiry date, or invoice due date" },
      { name: "paid_date", type: "date", meaning: "When it was rebought or paid (blank: not paid)" },
      { name: "days_late", type: "number", meaning: "Days after expiry or due date" },
      { name: "status", type: "text", meaning: "On time, late, not rebought, paid on time, paid late, unpaid, written off" },
      { name: "dunning", type: "text", meaning: "Collection step reached: reminder, suspended, terminated" },
    ],
  },
  {
    name: "service_requests",
    title: "Service requests",
    grain: "One row per lifecycle request",
    key: "request_id",
    rows: DASH.counts.requests,
    cols: [
      { name: "type", type: "text", meaning: "Relocation, device fault, renewal or 5G upgrade" },
      { name: "created_date / resolved_date", type: "date", meaning: "Opened and closed (blank: still open)" },
      { name: "resolution_days / sla_days", type: "number", meaning: "Days taken, and the target for that type" },
      { name: "within_sla", type: "Y/N", meaning: "Closed within the target" },
      { name: "outcome", type: "text", meaning: "What happened: renewed, device replaced, moved to 5G…" },
    ],
  },
  {
    name: "campaigns",
    title: "Campaigns",
    grain: "One row per retention campaign",
    key: "campaign_id",
    rows: DASH.counts.campaigns,
    cols: [
      { name: "objective / offer / channel", type: "text", meaning: "What it's for, what it offers, how it reaches people" },
      { name: "target_rule", type: "text", meaning: "Who gets picked each month" },
      { name: "holdout_pct", type: "number", meaning: "Share kept as a random control group, for honest measurement" },
      { name: "cost_per_contact_idr", type: "number", meaning: "Cost of one contact (the discount is costed separately)" },
    ],
  },
  {
    name: "campaign_contacts",
    title: "Campaign contacts",
    grain: "One row per customer picked in a wave",
    key: "contact_id",
    rows: DASH.counts.contacts,
    cols: [
      { name: "wave_month", type: "YYYY-MM", meaning: "Month of the wave" },
      { name: "group", type: "text", meaning: "Treatment (contacted) or control (held out on purpose)" },
      { name: "reached", type: "Y/N", meaning: "Contact actually reached the customer" },
      { name: "retained_90d", type: "Y/N", meaning: "Still a customer three months later" },
      { name: "converted", type: "Y/N", meaning: "Did the campaign's goal: rebought on time, paid, moved to 5G, stayed" },
      { name: "outcome_window", type: "text", meaning: "complete, or partial when three months haven't passed yet" },
    ],
  },
  {
    name: "surveys",
    title: "Customer surveys",
    grain: "One row per survey sent (answered or not)",
    key: "survey_id",
    rows: DASH.counts.surveys,
    cols: [
      { name: "survey_type", type: "text", meaning: "Onboarding (after month 1), relationship (every quarter), after a service request, or exit (after leaving)" },
      { name: "survey_month / sent_date", type: "month, date", meaning: "When it was sent; the month links it to usage, billing and churn" },
      { name: "channel", type: "text", meaning: "How it was sent: WhatsApp, SMS or a call" },
      { name: "responded / response_date", type: "Y/N, date", meaning: "Whether the customer answered. Non-answers are kept: who stays silent matters too" },
      { name: "nps", type: "0-10", meaning: "How likely they are to recommend the service. 9-10 promoter, 7-8 passive, 0-6 detractor" },
      { name: "sat_speed_peak", type: "1-5", meaning: "Satisfaction with speed at busy hours (evenings)" },
      { name: "sat_indoor_signal", type: "1-5", meaning: "Satisfaction with signal and stability inside the home" },
      { name: "sat_value", type: "1-5", meaning: "Satisfaction with value for money" },
      { name: "sat_support", type: "1-5", meaning: "Satisfaction with support and repairs (only if they had a request)" },
      { name: "exit_reason", type: "text", meaning: "Exit survey only: the main reason in the customer's own choice" },
      { name: "comment", type: "text", meaning: "What they wrote, as written (mostly Indonesian)" },
      { name: "comment_en", type: "text", meaning: "English translation of the comment" },
      { name: "theme", type: "text", meaning: "The comment coded into one theme, e.g. weak signal indoors, slow at busy hours, price" },
    ],
  },
];

/** Quote-aware CSV reader: fields with commas come wrapped in quotes. */
export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const PAGE = 25;

export function RawExplorer() {
  const [name, setName] = useState(TABLES[0].name);
  const [data, setData] = useState<Record<string, { head: string[]; rows: string[][]; kb: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const table = TABLES.find((t) => t.name === name)!;
  const loaded = data[name];

  useEffect(() => {
    if (data[name]) return;
    let cancelled = false;
    fetch(`/data/fwa/${name}.csv`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        const all = parseCsv(text.trim());
        setData((d) => ({ ...d, [name]: { head: all[0], rows: all.slice(1), kb: Math.round(text.length / 1024) } }));
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [name, data]);

  const view = useMemo(() => {
    if (!loaded) return [];
    const q = query.trim().toLowerCase();
    let rows = q ? loaded.rows.filter((r) => r.some((v) => v.toLowerCase().includes(q))) : loaded.rows;
    if (sort) {
      const { col, dir } = sort;
      rows = [...rows].sort((a, b) => {
        const x = a[col];
        const y = b[col];
        const nx = Number(x);
        const ny = Number(y);
        if (x !== "" && y !== "" && !Number.isNaN(nx) && !Number.isNaN(ny)) return (nx - ny) * dir;
        return x.localeCompare(y) * dir;
      });
    }
    return rows;
  }, [loaded, query, sort]);
  const pages = Math.max(1, Math.ceil(view.length / PAGE));
  const shown = view.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <Panel
      title="Raw data explorer"
      sub="The seven CSV files exactly as the analysis reads them. Search, sort by any column, page through, or download."
      right={
        <a href={`/data/fwa/${name}.csv`} download className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12.5px] hover:border-ink">
          <ArrowDownToLine className="h-3.5 w-3.5" /> {name}.csv
        </a>
      }
    >
      <div className="flex flex-wrap gap-1">
        {TABLES.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => {
              setName(t.name);
              setQuery("");
              setSort(null);
              setPage(0);
            }}
            className={`rounded-full border px-3 py-1 text-[12.5px] ${name === t.name ? "border-ink bg-ink text-white" : "border-line text-ink/70 hover:border-ink/40"}`}
          >
            {t.title} <span className="font-mono text-[11px] opacity-60">{num(t.rows)}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line px-3 py-1.5">
          <Search className="h-4 w-4 text-ink/40" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search any value, e.g. FWA-000042, Late, Relocation"
            className="w-full bg-transparent text-[13px] outline-none"
            aria-label="Search the table"
          />
        </label>
        <p className="font-mono text-[11.5px] text-ink/55">
          {loaded ? `${num(view.length)} of ${num(loaded.rows.length)} rows · ${loaded.head.length} columns · ${loaded.kb} KB · ${table.grain.toLowerCase()}` : error ? `Couldn't load: ${error}` : "Loading…"}
        </p>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-cream">
            <tr>
              {(loaded?.head ?? []).map((h, j) => (
                <th key={h} className="px-2.5 py-2 font-mono text-[10.5px] font-medium whitespace-nowrap text-ink-2/70">
                  <button type="button" onClick={() => setSort((s) => (s?.col === j ? { col: j, dir: s.dir === 1 ? -1 : 1 } : { col: j, dir: 1 }))} className="hover:text-ink">
                    {h}
                    {sort?.col === j ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className="border-t border-line">
                {r.map((v, j) => (
                  <td key={j} className="max-w-[280px] truncate px-2.5 py-1.5 whitespace-nowrap" title={v}>
                    {v === "" ? <span className="text-ink/25">—</span> : v}
                  </td>
                ))}
              </tr>
            ))}
            {!loaded && (
              <tr>
                <td className="px-3 py-6 text-ink/50">{error ? "The file couldn't be loaded." : "Loading the file…"}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-[12px]">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-line px-3 py-1 disabled:opacity-30">
          ← Prev
        </button>
        <span className="font-mono text-ink/55">
          page {page + 1} / {pages}
        </span>
        <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-line px-3 py-1 disabled:opacity-30">
          Next →
        </button>
      </div>
    </Panel>
  );
}

/** The six tables and how they join. */
export function Schema() {
  const boxes = [
    { n: "usage_monthly", x: 20, y: 20, k: "customer_id, month" },
    { n: "billing", x: 20, y: 150, k: "customer_id, cycle_month" },
    { n: "customers", x: 250, y: 85, k: "customer_id", main: true },
    { n: "service_requests", x: 480, y: 20, k: "customer_id" },
    { n: "campaign_contacts", x: 480, y: 150, k: "customer_id, campaign_id" },
    { n: "campaigns", x: 480, y: 250, k: "campaign_id" },
    { n: "surveys", x: 20, y: 250, k: "customer_id, survey_month" },
  ];
  const at = (n: string) => boxes.find((b) => b.n === n)!;
  const link = (a: string, b: string) => {
    const p = at(a);
    const q = at(b);
    const x1 = p.x + 170;
    const y1 = p.y + 30;
    const x2 = q.x;
    const y2 = q.y + 30;
    return a === "campaign_contacts" ? `M${p.x + 85},${p.y + 60} L${q.x + 85},${q.y}` : p.x < q.x ? `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}` : `M${q.x + 170},${y2} C${(q.x + 170 + p.x) / 2},${y2} ${(q.x + 170 + p.x) / 2},${y1} ${p.x},${y1}`;
  };
  return (
    <svg viewBox="0 0 670 320" className="h-auto w-full" role="img" aria-label="Seven tables joined on customer_id and campaign_id">
      {[
        ["usage_monthly", "customers"],
        ["billing", "customers"],
        ["customers", "service_requests"],
        ["customers", "campaign_contacts"],
        ["campaign_contacts", "campaigns"],
        ["surveys", "customers"],
      ].map(([a, b]) => (
        <path key={a + b} d={link(a, b)} fill="none" stroke="rgba(11,11,11,0.35)" strokeWidth={1.5} strokeDasharray="4 3" />
      ))}
      {boxes.map((b) => (
        <g key={b.n}>
          <rect x={b.x} y={b.y} width={170} height={60} rx={12} fill={b.main ? "#0b0b0b" : "#fff"} stroke={b.main ? "#0b0b0b" : "rgba(11,11,11,0.15)"} />
          <text x={b.x + 14} y={b.y + 25} fontSize={13} fontWeight={700} fill={b.main ? "#fff" : "#0b0b0b"} fontFamily="ui-monospace, monospace">
            {b.n}
          </text>
          <text x={b.x + 14} y={b.y + 44} fontSize={10.5} fill={b.main ? "rgba(255,255,255,0.6)" : "rgba(11,11,11,0.5)"} fontFamily="ui-sans-serif, system-ui">
            {`key: ${b.k}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

export const RULES = [
  { h: "Who joins", p: "New customers every month for 22 months (Jan 2025 – Oct 2026), more each month, with bumps at Ramadan and year-end. Each gets a region, area type, sales channel, plan, way to pay and maybe a 12-month bundle." },
  { h: "5G arrives", p: "Coverage reaches homes over time, metros first. The 5G plan launches in July 2025 and needs coverage at home; covered 4G customers can upgrade." },
  { h: "Hidden traits", p: "Every customer has an engagement level that drifts month to month, and an affordability level. Neither is in the data, just like in real life: you only see their effects." },
  { h: "Usage", p: "Data used depends on the plan, engagement and season, starts low in the first month, and jumps after a 5G upgrade." },
  { h: "Paying", p: "On-time rebuys and payments depend on affordability, engagement, the payment method (autodebit is best, retail counters worst) and habit: people who were late tend to be late again." },
  { h: "Leaving", p: "Churn is likelier in the first three months, with low or falling usage, after late payments, on congested 4G in metros, when a relocation or device fault is fixed late, or when a bundle ends without renewal. Bundles and 5G keep people." },
  { h: "Surveys", p: "Customers are asked after their first month, every quarter, after a repair and when they leave. Answers follow the same hidden state that drives churn. Online and agent sales skip the signal check at the address, so more of those homes have weak indoor signal. Engaged customers answer more, so the quiet ones are heard least." },
  { h: "Campaigns", p: "Five campaigns pick customers by a rule and keep a random control group. Their true effects are set here (one of them does nothing), so the measured lifts can be checked." },
];

/** The whole "data" block: where it comes from, how the tables join, every column, then every row. */
export function DataBlock() {
  const [pick, setPick] = useState(TABLES[0].name);
  const t = TABLES.find((x) => x.name === pick)!;
  const steps = [
    ["ml/fwa_generate.py", "simulates 22 months of the base"],
    [`${TABLES.length} CSV files`, `${num(TABLES.reduce((a, x) => a + x.rows, 0))} rows, below`],
    ["ml/fwa_analyse.py", "cohorts, survival, segments, model, campaign tests, surveys"],
    ["fwa-dashboard.json", "what the charts read"],
    ["this page", "charts, playground, agent"],
  ];
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-wrap items-stretch gap-1.5 text-[12px]">
        {steps.map(([h, p], i) => (
          <li key={h} className="flex items-center gap-1.5">
            <span className={`rounded-xl px-3 py-2 ${i === 1 ? "bg-ink text-white" : "border border-line bg-white"}`}>
              <span className="block font-mono text-[11.5px] font-semibold">{h}</span>
              <span className={i === 1 ? "text-white/60" : "text-ink/55"}>{p}</span>
            </span>
            {i < steps.length - 1 && <span className="text-ink/30">→</span>}
          </li>
        ))}
      </ol>
      <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
        <Panel title="Seven tables, joined on customer_id" sub="What a telco would hold on a home-internet base: the CRM record, monthly usage from the network, billing, service tickets, campaign logs and customer surveys.">
          <Schema />
        </Panel>
        <Panel title="How the data was made" sub="Made up by a script with known rules, so the analysis can be checked against the truth. No real customer is in it.">
          <ol className="flex flex-col gap-2 text-[12.5px] leading-relaxed">
            {RULES.map((r) => (
              <li key={r.h}>
                <b>{r.h}.</b> <span className="text-ink-2/75">{r.p}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <Panel title="Data dictionary" sub="Every column of every table: its type and what it means.">
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="flex flex-row flex-wrap gap-1 md:flex-col">
            {TABLES.map((x) => (
              <button
                key={x.name}
                type="button"
                onClick={() => setPick(x.name)}
                className={`rounded-xl border px-3 py-2 text-left text-[12.5px] ${pick === x.name ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40"}`}
              >
                <span className="block font-mono font-semibold">{x.name}</span>
                <span className={`text-[11px] ${pick === x.name ? "text-white/60" : "text-ink/50"}`}>{num(x.rows)} rows</span>
              </button>
            ))}
          </div>
          <div className="min-w-0">
            <p className="text-[13px]">
              <b>{t.title}</b> <span className="text-ink-2/65">· {t.grain} · key: </span>
              <code className="font-mono text-[12px]">{t.key}</code>
            </p>
            <div className="mt-2 overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-[12.5px]">
                <thead className="bg-cream text-[11px] text-ink-2/60">
                  <tr>
                    <th className="px-3 py-2 font-medium">Column</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {t.cols.map((c) => (
                    <tr key={c.name} className="border-t border-line align-top">
                      <td className="px-3 py-1.5 font-mono text-[11.5px] whitespace-nowrap">{c.name}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-ink/55">{c.type}</td>
                      <td className="px-3 py-1.5 text-ink-2/80">{c.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Panel>
      <RawExplorer />
    </div>
  );
}
