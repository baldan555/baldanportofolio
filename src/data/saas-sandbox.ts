/**
 * The SaaS sandbox: a tiny invoicing product ("Faktur") with two fictional companies on different plans, five roles,
 * plan limits, feature flags, an audit log and two languages. `act` is the whole "backend": every action goes through
 * the same pipeline a real SaaS request does (verify session → resolve tenant → check permission → check plan →
 * query with a tenant filter → write the audit log → respond) and returns the trace so the page can show it.
 * All data is fictional and lives in the visitor's browser only.
 */
export type Role = "owner" | "admin" | "manager" | "staff" | "viewer";
export type Perm = "invoice.view" | "invoice.create" | "invoice.approve" | "invoice.delete" | "invoice.export" | "team.view" | "team.invite" | "billing.manage" | "audit.view";
export type PlanId = "free" | "pro" | "enterprise";
export type Lang = "en" | "id";

export const ROLES: Role[] = ["owner", "admin", "manager", "staff", "viewer"];
export const PERMS: { id: Perm; label: string }[] = [
  { id: "invoice.view", label: "See invoices" },
  { id: "invoice.create", label: "Create invoices" },
  { id: "invoice.approve", label: "Approve invoices" },
  { id: "invoice.delete", label: "Delete invoices" },
  { id: "invoice.export", label: "Export to CSV" },
  { id: "team.view", label: "See the team" },
  { id: "team.invite", label: "Invite people" },
  { id: "audit.view", label: "Read the audit log" },
  { id: "billing.manage", label: "Change the plan" },
];
export const ROLE_PERMS: Record<Role, Perm[]> = {
  owner: PERMS.map((p) => p.id),
  admin: ["invoice.view", "invoice.create", "invoice.approve", "invoice.delete", "invoice.export", "team.view", "team.invite", "audit.view"],
  manager: ["invoice.view", "invoice.create", "invoice.approve", "invoice.export", "team.view", "audit.view"],
  staff: ["invoice.view", "invoice.create", "team.view"],
  viewer: ["invoice.view", "team.view"],
};
export type Plan = { name: string; invoices: number | null; seats: number | null; export: boolean; audit: boolean; sso: boolean; support: string };
export const PLANS: Record<PlanId, Plan> = {
  free: { name: "Free", invoices: 5, seats: 3, export: false, audit: false, sso: false, support: "community" },
  pro: { name: "Pro", invoices: 200, seats: 25, export: true, audit: true, sso: false, support: "email, next day" },
  enterprise: { name: "Enterprise", invoices: null, seats: null, export: true, audit: true, sso: true, support: "dedicated" },
};
export const MONTH = "2026-11"; // the sandbox's "this month", so the demo behaves the same for everyone

export type Tenant = { id: string; name: string; plan: PlanId };
export type User = { id: string; tenant: string; name: string; role: Role; lang: Lang };
export type Invoice = { id: string; tenant: string; customer: string; amount: number; status: "draft" | "approved"; created: string; by: string; deleted?: boolean };
export type AuditEntry = { at: string; tenant: string; user: string; action: string; target: string; ok: boolean };
export type State = { tenants: Record<string, Tenant>; users: User[]; invoices: Invoice[]; audit: AuditEntry[]; seq: number };

export function initialState(): State {
  return {
    tenants: {
      makmur: { id: "makmur", name: "Toko Makmur", plan: "free" },
      nusa: { id: "nusa", name: "Nusa Logistik", plan: "pro" },
    },
    users: [
      { id: "u1", tenant: "makmur", name: "Rina", role: "owner", lang: "id" },
      { id: "u2", tenant: "makmur", name: "Budi", role: "manager", lang: "id" },
      { id: "u3", tenant: "makmur", name: "Sari", role: "staff", lang: "en" },
      { id: "u4", tenant: "nusa", name: "Dewi", role: "owner", lang: "en" },
      { id: "u5", tenant: "nusa", name: "Agus", role: "admin", lang: "id" },
      { id: "u6", tenant: "nusa", name: "Wati", role: "manager", lang: "en" },
      { id: "u7", tenant: "nusa", name: "Joko", role: "staff", lang: "id" },
      { id: "u8", tenant: "nusa", name: "Tono", role: "viewer", lang: "en" },
    ],
    invoices: [
      { id: "INV-1001", tenant: "makmur", customer: "Warung Sari", amount: 1250000, status: "approved", created: "2026-11-02", by: "Rina" },
      { id: "INV-1002", tenant: "makmur", customer: "Kios Jaya", amount: 480000, status: "draft", created: "2026-11-05", by: "Sari" },
      { id: "INV-1003", tenant: "makmur", customer: "Toko Baru", amount: 2100000, status: "draft", created: "2026-11-09", by: "Budi" },
      { id: "INV-2041", tenant: "nusa", customer: "PT Samudra", amount: 18500000, status: "approved", created: "2026-11-01", by: "Dewi" },
      { id: "INV-2042", tenant: "nusa", customer: "CV Lintas", amount: 7200000, status: "approved", created: "2026-11-03", by: "Wati" },
      { id: "INV-2043", tenant: "nusa", customer: "PT Arunika", amount: 12800000, status: "draft", created: "2026-11-06", by: "Joko" },
      { id: "INV-2044", tenant: "nusa", customer: "UD Makmur Jaya", amount: 3400000, status: "draft", created: "2026-11-08", by: "Agus" },
      { id: "INV-2045", tenant: "nusa", customer: "PT Kirana", amount: 9900000, status: "approved", created: "2026-11-10", by: "Wati" },
    ],
    audit: [
      { at: "09:12", tenant: "makmur", user: "Rina", action: "invoice.approve", target: "INV-1001", ok: true },
      { at: "10:40", tenant: "nusa", user: "Dewi", action: "plan.change", target: "free → pro", ok: true },
      { at: "11:05", tenant: "nusa", user: "Wati", action: "invoice.approve", target: "INV-2045", ok: true },
    ],
    seq: 0,
  };
}

/* ------------------------------------------------------------------ two languages */
export const I18N: Record<Lang, Record<string, string>> = {
  en: {
    invoices: "Invoices",
    team: "Team",
    billing: "Billing",
    audit: "Audit log",
    newInvoice: "New invoice",
    export: "Export CSV",
    approve: "Approve",
    delete: "Delete",
    draft: "draft",
    approved: "approved",
    customer: "Customer",
    amount: "Amount",
    status: "Status",
    usage: "invoices this month",
    seats: "seats used",
    invite: "Invite someone",
    plan: "Current plan",
    upgrade: "Switch to",
    peek: "Open another company's invoice",
    locked: "Available on Pro",
    when: "When",
    who: "Who",
    what: "Action",
    empty: "No invoices yet",
  },
  id: {
    invoices: "Faktur",
    team: "Tim",
    billing: "Tagihan",
    audit: "Log audit",
    newInvoice: "Faktur baru",
    export: "Ekspor CSV",
    approve: "Setujui",
    delete: "Hapus",
    draft: "draf",
    approved: "disetujui",
    customer: "Pelanggan",
    amount: "Jumlah",
    status: "Status",
    usage: "faktur bulan ini",
    seats: "kursi terpakai",
    invite: "Undang orang",
    plan: "Paket saat ini",
    upgrade: "Ganti ke",
    peek: "Buka faktur perusahaan lain",
    locked: "Tersedia di Pro",
    when: "Waktu",
    who: "Siapa",
    what: "Aksi",
    empty: "Belum ada faktur",
  },
};

/* ------------------------------------------------------------------ the "backend" */
export type Stage = "auth" | "tenant" | "permission" | "plan" | "query" | "audit" | "response";
export type Step = { stage: Stage; ok: boolean; text: string; code?: string };
export type Res = { status: number; title: string; body?: string };
export type Action =
  | { type: "list" }
  | { type: "create" }
  | { type: "approve"; id: string }
  | { type: "delete"; id: string }
  | { type: "export" }
  | { type: "peek" }
  | { type: "team" }
  | { type: "invite" }
  | { type: "plan"; plan: PlanId }
  | { type: "audit" }
  | { type: "lang"; lang: Lang };

const PERM_OF: Partial<Record<Action["type"], Perm>> = {
  list: "invoice.view",
  create: "invoice.create",
  approve: "invoice.approve",
  delete: "invoice.delete",
  export: "invoice.export",
  peek: "invoice.view",
  team: "team.view",
  invite: "team.invite",
  plan: "billing.manage",
  audit: "audit.view",
};
const ROUTE: Record<Action["type"], string> = {
  list: "GET /api/invoices",
  create: "POST /api/invoices",
  approve: "PATCH /api/invoices/:id",
  delete: "DELETE /api/invoices/:id",
  export: "GET /api/invoices.csv",
  peek: "GET /api/invoices/INV-2041",
  team: "GET /api/members",
  invite: "POST /api/members",
  plan: "POST /api/billing/plan",
  audit: "GET /api/audit",
  lang: "PATCH /api/me",
};
const NAMES = ["Putri", "Andi", "Maya", "Rudi", "Lina", "Fajar", "Nina", "Hendra"];
const CUSTOMERS = ["Toko Sinar", "CV Abadi", "UD Sentosa", "PT Mitra", "Warung Bu Tini", "Kios Bahari"];
const hhmm = () => new Date().toTimeString().slice(0, 5);
export const rp = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

export function route(a: Action) {
  return ROUTE[a.type].replace(":id", "id" in a ? a.id : ":id");
}

export function act(state: State, userId: string, a: Action): { state: State; res: Res; trace: Step[] } {
  const s: State = { ...state, invoices: [...state.invoices], users: [...state.users], audit: [...state.audit], tenants: { ...state.tenants } };
  const u = s.users.find((x) => x.id === userId) as User;
  const t = s.tenants[u.tenant];
  const plan = PLANS[t.plan];
  const trace: Step[] = [];
  const log = (action: string, target: string, ok: boolean) => {
    s.audit.unshift({ at: hhmm(), tenant: t.id, user: u.name, action, target, ok });
    trace.push({ stage: "audit", ok: true, text: `written to the audit log: ${u.name} · ${action} · ${target}${ok ? "" : " (denied)"}`, code: `INSERT INTO audit_log (tenant_id, user_id, action, target, allowed)\nVALUES ('${t.id}', '${u.id}', '${action}', '${target}', ${ok})` });
  };
  const done = (res: Res) => {
    trace.push({ stage: "response", ok: res.status < 400, text: `${res.status} ${res.title}` });
    return { state: s, res, trace };
  };
  trace.push({ stage: "auth", ok: true, text: `session verified: ${u.name}, ${u.role}`, code: `{ "sub": "${u.id}", "tenant": "${t.id}", "role": "${u.role}", "plan": "${t.plan}", "lang": "${u.lang}" }` });
  trace.push({ stage: "tenant", ok: true, text: `tenant = ${t.id}, taken from the session, never from the request`, code: `const tenantId = session.tenant // "${t.id}"` });
  const perm = PERM_OF[a.type];
  if (perm) {
    const ok = ROLE_PERMS[u.role].includes(perm);
    trace.push({ stage: "permission", ok, text: ok ? `${u.role} has ${perm}` : `${u.role} lacks ${perm}`, code: `can("${u.role}", "${perm}") // ${ok}` });
    if (!ok) {
      if (a.type !== "list" && a.type !== "team") log(perm, "id" in a ? a.id : a.type, false);
      return done({ status: 403, title: "Forbidden", body: `Your role (${u.role}) can't do this. Ask an owner or admin.` });
    }
  }
  const mine = s.invoices.filter((i) => i.tenant === t.id && !i.deleted);
  const sqlWhere = `WHERE tenant_id = '${t.id}'`;

  switch (a.type) {
    case "list":
      trace.push({ stage: "query", ok: true, text: `${mine.length} invoices for ${t.name}; other companies' rows never leave the database`, code: `SELECT * FROM invoices\n${sqlWhere} AND deleted_at IS NULL\nORDER BY created DESC` });
      return done({ status: 200, title: "OK", body: `${mine.length} invoices` });
    case "create": {
      const used = mine.filter((i) => i.created.startsWith(MONTH)).length;
      const ok = plan.invoices == null || used < plan.invoices;
      trace.push({ stage: "plan", ok, text: plan.invoices == null ? "Enterprise: no invoice limit" : `${used} of ${plan.invoices} invoices used this month on ${plan.name}`, code: `usage(tenant, "invoices", "${MONTH}") < limits.${t.plan}.invoices // ${ok}` });
      if (!ok) {
        log("invoice.create", "limit reached", false);
        return done({ status: 402, title: "Upgrade needed", body: `The ${plan.name} plan includes ${plan.invoices} invoices a month.` });
      }
      s.seq += 1;
      const id = `INV-${t.id === "makmur" ? 1003 + s.seq : 2045 + s.seq}`;
      const inv: Invoice = { id, tenant: t.id, customer: CUSTOMERS[s.seq % CUSTOMERS.length], amount: 250000 * (1 + (s.seq % 7)), status: "draft", created: `${MONTH}-12`, by: u.name };
      s.invoices.push(inv);
      trace.push({ stage: "query", ok: true, text: `invoice ${id} created for ${t.name}`, code: `INSERT INTO invoices (id, tenant_id, customer, amount, status)\nVALUES ('${id}', '${t.id}', '${inv.customer}', ${inv.amount}, 'draft')` });
      log("invoice.create", id, true);
      return done({ status: 201, title: "Created", body: id });
    }
    case "approve":
    case "delete": {
      const inv = mine.find((i) => i.id === a.id);
      if (!inv) {
        trace.push({ stage: "query", ok: false, text: "no such invoice in this tenant", code: `SELECT * FROM invoices WHERE id = '${a.id}' AND tenant_id = '${t.id}' -- 0 rows` });
        return done({ status: 404, title: "Not Found" });
      }
      const at = s.invoices.findIndex((i) => i.id === a.id);
      if (a.type === "approve") {
        s.invoices[at] = { ...inv, status: "approved" };
        trace.push({ stage: "query", ok: true, text: `${a.id} approved`, code: `UPDATE invoices SET status = 'approved'\nWHERE id = '${a.id}' AND tenant_id = '${t.id}'` });
      } else {
        s.invoices[at] = { ...inv, deleted: true };
        trace.push({ stage: "query", ok: true, text: `${a.id} soft-deleted: hidden, but recoverable and still auditable`, code: `UPDATE invoices SET deleted_at = now()\nWHERE id = '${a.id}' AND tenant_id = '${t.id}'` });
      }
      log(a.type === "approve" ? "invoice.approve" : "invoice.delete", a.id, true);
      return done({ status: 200, title: "OK", body: a.id });
    }
    case "export": {
      trace.push({ stage: "plan", ok: plan.export, text: plan.export ? `feature "export" is on for ${plan.name}` : `feature "export" is off on ${plan.name}`, code: `flags.isOn("export", { plan: "${t.plan}" }) // ${plan.export}` });
      if (!plan.export) {
        log("invoice.export", "feature locked", false);
        return done({ status: 402, title: "Upgrade needed", body: "CSV export is a Pro feature." });
      }
      const csv = ["id,customer,amount,status,created", ...mine.map((i) => `${i.id},${i.customer},${i.amount},${i.status},${i.created}`)].join("\n");
      trace.push({ stage: "query", ok: true, text: `${mine.length} rows exported`, code: `SELECT id, customer, amount, status, created\nFROM invoices ${sqlWhere}` });
      log("invoice.export", `${mine.length} rows`, true);
      return done({ status: 200, title: "OK", body: csv });
    }
    case "peek": {
      const other = s.invoices.find((i) => i.id === "INV-2041" && i.tenant !== t.id);
      const target = t.id === "nusa" ? "INV-1001" : "INV-2041";
      trace.push({ stage: "query", ok: false, text: other || t.id === "nusa" ? `${target} belongs to another company, so the tenant filter returns nothing` : "no such invoice", code: `SELECT * FROM invoices\nWHERE id = '${target}' AND tenant_id = '${t.id}'\n-- 0 rows` });
      log("invoice.view", target, false);
      return done({ status: 404, title: "Not Found", body: "Answering 404, not 403, so attackers can't even learn that the invoice exists." });
    }
    case "team": {
      const team = s.users.filter((x) => x.tenant === t.id);
      trace.push({ stage: "query", ok: true, text: `${team.length} members of ${t.name}`, code: `SELECT name, role FROM members ${sqlWhere}` });
      return done({ status: 200, title: "OK", body: `${team.length} members` });
    }
    case "invite": {
      const team = s.users.filter((x) => x.tenant === t.id);
      const ok = plan.seats == null || team.length < plan.seats;
      trace.push({ stage: "plan", ok, text: plan.seats == null ? "Enterprise: unlimited seats" : `${team.length} of ${plan.seats} seats used on ${plan.name}`, code: `count(members) < limits.${t.plan}.seats // ${ok}` });
      if (!ok) {
        log("team.invite", "seat limit", false);
        return done({ status: 402, title: "Upgrade needed", body: `The ${plan.name} plan includes ${plan.seats} seats.` });
      }
      s.seq += 1;
      const nu: User = { id: `n${s.seq}`, tenant: t.id, name: NAMES[s.seq % NAMES.length], role: "staff", lang: u.lang };
      s.users.push(nu);
      trace.push({ stage: "query", ok: true, text: `${nu.name} invited as staff`, code: `INSERT INTO members (tenant_id, name, role) VALUES ('${t.id}', '${nu.name}', 'staff')` });
      log("team.invite", nu.name, true);
      return done({ status: 201, title: "Created", body: nu.name });
    }
    case "plan": {
      if (a.plan === t.plan) return done({ status: 200, title: "OK", body: "Already on this plan" });
      trace.push({ stage: "plan", ok: true, text: `checkout opened at the payment provider (simulated); its webhook confirms the payment`, code: `POST /webhooks/billing\n{ "type": "subscription.updated", "tenant": "${t.id}", "plan": "${a.plan}" }` });
      s.tenants[t.id] = { ...t, plan: a.plan };
      trace.push({ stage: "query", ok: true, text: `${t.name} is now on ${PLANS[a.plan].name}: limits and flags change instantly`, code: `UPDATE tenants SET plan = '${a.plan}' WHERE id = '${t.id}'` });
      log("plan.change", `${t.plan} → ${a.plan}`, true);
      return done({ status: 200, title: "OK", body: PLANS[a.plan].name });
    }
    case "audit": {
      trace.push({ stage: "plan", ok: plan.audit, text: plan.audit ? `feature "audit" is on for ${plan.name}` : `feature "audit" is off on ${plan.name} (events are still recorded)`, code: `flags.isOn("audit", { plan: "${t.plan}" }) // ${plan.audit}` });
      if (!plan.audit) return done({ status: 402, title: "Upgrade needed", body: "Reading the audit log is a Pro feature." });
      const n = s.audit.filter((x) => x.tenant === t.id).length;
      trace.push({ stage: "query", ok: true, text: `${n} entries for ${t.name}`, code: `SELECT * FROM audit_log ${sqlWhere} ORDER BY at DESC` });
      return done({ status: 200, title: "OK", body: `${n} entries` });
    }
    case "lang": {
      const at = s.users.findIndex((x) => x.id === u.id);
      s.users[at] = { ...u, lang: a.lang };
      trace.push({ stage: "query", ok: true, text: `language saved to ${u.name}'s profile; the UI re-renders from the ${a.lang === "id" ? "Indonesian" : "English"} dictionary`, code: `UPDATE users SET lang = '${a.lang}' WHERE id = '${u.id}'\n\nt("invoices") // "${I18N[a.lang].invoices}"` });
      return done({ status: 200, title: "OK", body: a.lang });
    }
  }
}
