"use client";

import { useState } from "react";
import { PERMS, PLANS, ROLES, ROLE_PERMS, type PlanId, type Role } from "@/data/saas-sandbox";
import type { Flow } from "@/data/web-flows";
import { FlowCard } from "../concepts/flow";

/* The SaaS page's reference parts: the permission matrix and plan limits the sandbox enforces, and three ways to keep
 * tenants apart, each as an animated flow. */

export function PermissionMatrix() {
  const [role, setRole] = useState<Role>("manager");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Role">
        {ROLES.map((r) => (
          <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={`rounded-full px-3.5 py-1.5 text-[13px] capitalize transition ${role === r ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink"}`}>
            {r} <span className="font-mono text-[10.5px] opacity-60">{ROLE_PERMS[r].length}</span>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[22px] border border-line bg-white">
        <table className="w-full min-w-[620px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-2.5 text-left font-mono text-[10.5px] font-normal text-ink-2/50 uppercase">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className={`px-3 py-2.5 text-center font-semibold capitalize transition ${r === role ? "bg-ink text-white" : ""}`}>
                  <button type="button" onClick={() => setRole(r)} className="capitalize">
                    {r}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMS.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2">
                  {p.label} <span className="ml-1 font-mono text-[10.5px] text-ink-2/45">{p.id}</span>
                </td>
                {ROLES.map((r) => {
                  const on = ROLE_PERMS[r].includes(p.id);
                  return (
                    <td key={r} className={`px-3 py-2 text-center transition ${r === role ? "bg-cream" : ""}`}>
                      <span className={`inline-grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold ${on ? "bg-[#eaf8f1] text-[#1baf7a]" : "text-ink/20"}`}>{on ? "✓" : "–"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">This exact table drives the sandbox above. In production it lives in one place on the server, and every endpoint asks it before doing anything; the screen only hides buttons as a courtesy.</p>
    </div>
  );
}

export function PlanTable() {
  const rows: [string, (p: PlanId) => string][] = [
    ["Invoices per month", (p) => (PLANS[p].invoices == null ? "Unlimited" : String(PLANS[p].invoices))],
    ["Seats", (p) => (PLANS[p].seats == null ? "Unlimited" : String(PLANS[p].seats))],
    ["CSV export", (p) => (PLANS[p].export ? "✓" : "–")],
    ["Audit log", (p) => (PLANS[p].audit ? "✓" : "recorded, not readable")],
    ["Single sign-on", (p) => (PLANS[p].sso ? "✓" : "–")],
    ["Support", (p) => PLANS[p].support],
  ];
  const ids = Object.keys(PLANS) as PlanId[];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        {ids.map((p) => (
          <div key={p} className={`rounded-[22px] p-5 ${p === "pro" ? "bg-ink text-white" : "border border-line bg-white"}`}>
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase opacity-60">{p === "pro" ? "most teams" : p === "free" ? "to start" : "large companies"}</p>
            <p className="mt-1 text-[1.6rem] font-semibold tracking-[-0.03em]">{PLANS[p].name}</p>
            <ul className="mt-3 space-y-1.5">
              {rows.map(([k, f]) => (
                <li key={k} className="flex justify-between gap-2 text-[12.5px]">
                  <span className="opacity-60">{k}</span>
                  <span className="text-right font-semibold">{f(p)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">Limits are numbers in one config, not code scattered across the app: the sandbox checks usage against them on every write, and feature flags read the plan on every request. Upgrading changes the config row, so new limits apply on the very next click.</p>
    </div>
  );
}

const n = (id: string, x: number, y: number, label: string, icon: Flow["nodes"][number]["icon"], sub?: string, tone?: Flow["nodes"][number]["tone"]) => ({ id, x, y, label, icon, sub, tone });
const TENANCY: { id: string; name: string; flow: Flow; rows: string[] }[] = [
  {
    id: "shared",
    name: "Shared tables",
    flow: {
      nodes: [n("a", 50, 32, "Company A", "user"), n("b", 50, 118, "Company B", "user"), n("app", 162, 75, "One app", "server", undefined, "dark"), n("db", 272, 75, "One database", "db", "tenant_id on rows")],
      steps: [
        { from: "a", to: "app", tag: "GET /invoices", say: "Company A asks for its invoices.", tone: "req" },
        { from: "app", to: "db", tag: "tenant_id = A", say: "Every query carries the tenant filter (or row-level security adds it).", tone: "data" },
        { from: "b", to: "app", tag: "GET /invoices", say: "Company B uses the very same tables.", tone: "req" },
        { from: "app", to: "db", tag: "tenant_id = B", say: "Same rows table, different slice. Cheapest and simplest to run.", tone: "ok" },
      ],
    },
    rows: ["good, if no query forgets the filter", "lowest", "insert one row", "easy: one query", "most SaaS products"],
  },
  {
    id: "schema",
    name: "Schema per tenant",
    flow: {
      nodes: [n("app", 52, 75, "One app", "server", "picks a schema", "dark"), n("sa", 262, 26, "schema acme", "db"), n("sb", 262, 75, "schema globex", "db"), n("sc", 262, 124, "schema initech", "db")],
      steps: [
        { from: "app", to: "sa", tag: "search_path = acme", say: "The app switches to the tenant's own schema in the same database.", tone: "req" },
        { from: "app", to: "sb", tag: "search_path = globex", say: "Each tenant has its own copy of every table.", tone: "req" },
        { from: "app", to: "sc", tag: "migrate ×3", say: "The cost: every schema change runs once per tenant.", tone: "data" },
      ],
    },
    rows: ["better: separate tables", "medium", "create a schema + migrate", "harder: union across schemas", "B2B with a few hundred customers"],
  },
  {
    id: "db",
    name: "Database per tenant",
    flow: {
      nodes: [n("app", 52, 75, "Router", "server", "tenant → database", "dark"), n("d1", 266, 26, "db_acme", "db"), n("d2", 266, 75, "db_globex", "db"), n("d3", 266, 124, "db_bank", "db", "own region, own keys", "ok")],
      steps: [
        { from: "app", to: "d1", tag: "acme", say: "The app looks up which database belongs to the tenant.", tone: "req" },
        { from: "app", to: "d2", tag: "globex", say: "Each tenant's data is physically separate.", tone: "req" },
        { from: "app", to: "d3", tag: "bank: dedicated", say: "A big customer can get its own region, backups and encryption keys.", tone: "ok" },
      ],
    },
    rows: ["strongest", "highest", "provision a database", "hardest: needs a warehouse", "enterprise, banks, regulated data"],
  },
];
const TENANCY_ROWS = ["Isolation", "Cost per tenant", "Adding a tenant", "Reporting across tenants", "Typical for"];

export function TenancyModels() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        {TENANCY.map((m, i) => (
          <article key={m.id} className="flex flex-col rounded-[22px] border border-line bg-white p-3">
            <p className="px-1 font-mono text-[11px] text-muted">0{i + 1}</p>
            <h3 className="px-1 text-[1.25rem] font-semibold tracking-[-0.02em]">{m.name}</h3>
            <div className="mt-2">
              <FlowCard flow={m.flow} />
            </div>
          </article>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[22px] border border-line bg-white">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-2.5 text-left font-mono text-[10.5px] font-normal text-ink-2/50 uppercase" />
              {TENANCY.map((m) => (
                <th key={m.id} className="px-3 py-2.5 text-left font-semibold">
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TENANCY_ROWS.map((r, k) => (
              <tr key={r} className="border-b border-line last:border-0">
                <td className="px-4 py-2 text-ink-2/60">{r}</td>
                {TENANCY.map((m) => (
                  <td key={m.id} className="px-3 py-2">
                    {m.rows[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">The sandbox uses shared tables: every query you saw ends in WHERE tenant_id = …, which is why “open another company&apos;s invoice” found nothing. Many products mix models, keeping most customers on shared tables and moving the largest to their own database.</p>
    </div>
  );
}
