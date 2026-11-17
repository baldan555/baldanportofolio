"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Building2, CornerDownLeft, CreditCard, Database, Eye, KeyRound, Lock, ScrollText, ShieldCheck, type LucideIcon } from "lucide-react";
import { I18N, MONTH, PLANS, act, initialState, route, rp, type Action, type PlanId, type Res, type Stage, type State, type Step } from "@/data/saas-sandbox";

/*
 * The SaaS sandbox: a working mini invoicing app on the left, and on the right everything the backend does for each
 * click, step by step. Sign in as different people in different companies to see roles, plans, feature flags,
 * tenant isolation, the audit log and two languages at work. Fictional data, kept in this browser tab only.
 */
const GR = "#1baf7a";
const RD = "#c8413f";
const AM = "#c29a00";
const OR = "#eb6834";
const STAGE: Record<Stage, { label: string; Icon: LucideIcon }> = {
  auth: { label: "Session", Icon: KeyRound },
  tenant: { label: "Tenant", Icon: Building2 },
  permission: { label: "Permission", Icon: ShieldCheck },
  plan: { label: "Plan & flags", Icon: CreditCard },
  query: { label: "Database", Icon: Database },
  audit: { label: "Audit log", Icon: ScrollText },
  response: { label: "Response", Icon: CornerDownLeft },
};
type Tab = "invoices" | "team" | "billing" | "audit";
type Last = { key: number; action: Action; res: Res; trace: Step[] };
const statusColor = (s: number) => (s >= 400 && s !== 402 ? RD : s === 402 ? AM : GR);

export function SaasSandbox() {
  const [state, setState] = useState<State>(initialState);
  const [userId, setUserId] = useState("u2");
  const [tab, setTab] = useState<Tab>("invoices");
  const [last, setLast] = useState<Last>(() => {
    const r = act(initialState(), "u2", { type: "list" });
    return { key: 0, action: { type: "list" }, res: r.res, trace: r.trace };
  });
  const user = state.users.find((u) => u.id === userId) ?? state.users[0];
  const tenant = state.tenants[user.tenant];
  const plan = PLANS[tenant.plan];
  const t = I18N[user.lang];
  const run = (a: Action, from: State = state, as = userId) => {
    const r = act(from, as, a);
    setState(r.state);
    setLast((l) => ({ key: l.key + 1, action: a, res: r.res, trace: r.trace }));
  };
  const readFor = (tb: Tab): Action | null => (tb === "invoices" ? { type: "list" } : tb === "team" ? { type: "team" } : tb === "audit" ? { type: "audit" } : null);
  const go = (tb: Tab) => {
    setTab(tb);
    const a = readFor(tb);
    if (a) run(a);
  };
  const signIn = (id: string) => {
    setUserId(id);
    const a = readFor(tab) ?? { type: "list" };
    run(a, state, id);
  };
  const reset = () => {
    const s = initialState();
    setState(s);
    setUserId("u2");
    setTab("invoices");
    const r = act(s, "u2", { type: "list" });
    setLast((l) => ({ key: l.key + 1, action: { type: "list" }, res: r.res, trace: r.trace }));
  };
  const mine = state.invoices.filter((i) => i.tenant === tenant.id && !i.deleted);
  const used = mine.filter((i) => i.created.startsWith(MONTH)).length;
  const team = state.users.filter((u) => u.tenant === tenant.id);
  const log = state.audit.filter((x) => x.tenant === tenant.id);

  return (
    <div className="space-y-3">
      {/* who am I */}
      <div className="rounded-[22px] border border-line bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Sign in as</p>
          <button type="button" onClick={reset} className="rounded-full border border-line px-3 py-1 text-[12px] hover:border-ink">
            Reset sandbox
          </button>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {Object.values(state.tenants).map((tn) => (
            <div key={tn.id} className={`rounded-2xl p-2.5 ${tn.id === tenant.id ? "bg-cream" : "bg-cream/40"}`}>
              <p className="flex items-center justify-between text-[12.5px] font-semibold">
                {tn.name}
                <span className="rounded-full px-2 py-0.5 font-mono text-[10px] text-white" style={{ background: tn.plan === "free" ? "#8a8a8a" : tn.plan === "pro" ? OR : "#6250d6" }}>
                  {PLANS[tn.plan].name}
                </span>
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {state.users
                  .filter((u) => u.tenant === tn.id)
                  .map((u) => (
                    <button key={u.id} type="button" onClick={() => signIn(u.id)} aria-pressed={u.id === userId} className={`rounded-full px-2.5 py-1 text-[11.5px] transition ${u.id === userId ? "bg-ink text-white" : "bg-white text-ink/70 hover:text-ink"}`}>
                      {u.name} <span className="opacity-60">· {u.role}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* the app */}
        <div className="overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_18px_50px_-30px_rgba(11,11,11,0.45)]">
          <div className="flex items-center gap-2 border-b border-line bg-cream/50 px-3 py-2">
            <span className="flex gap-1">
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <i key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              ))}
            </span>
            <span className="min-w-0 flex-1 truncate rounded-full bg-white px-3 py-0.5 font-mono text-[11px] text-ink/60">
              faktur.app/{tenant.id}/{tab}
            </span>
          </div>
          <div className="grid min-h-[430px] grid-cols-[minmax(0,8.5rem)_1fr]">
            <aside className="flex flex-col gap-1 border-r border-line bg-[#fbfaf7] p-2">
              <p className="px-2 pt-1 pb-2 text-[13px] font-semibold">
                <span className="mr-1 inline-block h-3 w-3 rounded bg-[#eb6834] align-middle" /> Faktur
              </p>
              {(["invoices", "team", "billing", "audit"] as Tab[]).map((tb) => (
                <button key={tb} type="button" onClick={() => go(tb)} className={`rounded-lg px-2 py-1.5 text-left text-[12.5px] transition ${tab === tb ? "bg-ink text-white" : "text-ink/70 hover:bg-ink/5"}`}>
                  {t[tb]}
                </button>
              ))}
              <div className="mt-auto space-y-1.5 px-1 pt-3">
                <div className="flex rounded-full bg-white p-0.5 ring-1 ring-line">
                  {(["en", "id"] as const).map((l) => (
                    <button key={l} type="button" onClick={() => run({ type: "lang", lang: l })} aria-pressed={user.lang === l} className={`flex-1 rounded-full py-0.5 font-mono text-[10.5px] uppercase ${user.lang === l ? "bg-ink text-white" : "text-ink/60"}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <p className="truncate text-[11px] text-ink-2/55">
                  {user.name} · {user.role}
                </p>
              </div>
            </aside>
            <main className="min-w-0 p-3">
              {tab === "invoices" && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[18px] font-semibold tracking-[-0.02em]">{t.invoices}</p>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => run({ type: "export" })} className="rounded-full border border-line px-3 py-1.5 text-[12px] hover:border-ink">
                        {t.export}
                        {!plan.export && <Lock className="ml-1 inline h-3 w-3 align-[-1px]" />}
                      </button>
                      <button type="button" onClick={() => run({ type: "create" })} className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white">
                        + {t.newInvoice}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-[11px] text-ink-2/60">
                      <span>
                        {used}
                        {plan.invoices != null ? ` / ${plan.invoices}` : ""} {t.usage}
                      </span>
                      <span>{plan.name}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-cream">
                      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: plan.invoices == null ? "8%" : `${Math.min(100, (used / plan.invoices) * 100)}%`, background: plan.invoices != null && used >= plan.invoices ? RD : GR }} />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <AnimatePresence initial={false}>
                      {mine.map((i) => (
                        <motion.div key={i.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-line px-2.5 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-semibold">
                              {i.customer} <span className="font-mono text-[10.5px] font-normal text-ink-2/50">{i.id}</span>
                            </p>
                            <p className="font-mono text-[11px] text-ink-2/65">
                              {rp(i.amount)} ·{" "}
                              <span style={{ color: i.status === "approved" ? GR : AM }}>{t[i.status]}</span>
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {i.status === "draft" && (
                              <button type="button" onClick={() => run({ type: "approve", id: i.id })} className="rounded-full bg-[#eaf8f1] px-2.5 py-1 text-[11px] font-semibold text-[#0f6e4c]">
                                {t.approve}
                              </button>
                            )}
                            <button type="button" onClick={() => run({ type: "delete", id: i.id })} className="rounded-full bg-[#fdf0ee] px-2.5 py-1 text-[11px] font-semibold text-[#a3302e]">
                              {t.delete}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {!mine.length && <p className="py-6 text-center text-[12.5px] text-ink-2/50">{t.empty}</p>}
                  </div>
                  <button type="button" onClick={() => run({ type: "peek" })} className="mt-3 w-full rounded-xl border border-dashed border-[#c8413f]/60 px-3 py-2 text-left text-[12px] text-[#a3302e] hover:bg-[#fdf0ee]">
                    <Eye className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                    {t.peek} <span className="font-mono text-[10.5px]">({tenant.id === "nusa" ? "INV-1001" : "INV-2041"})</span>
                  </button>
                </div>
              )}
              {tab === "team" && (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[18px] font-semibold tracking-[-0.02em]">{t.team}</p>
                    <button type="button" onClick={() => run({ type: "invite" })} className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white">
                      + {t.invite}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-2/60">
                    {team.length}
                    {plan.seats != null ? ` / ${plan.seats}` : ""} {t.seats}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {team.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-xl border border-line px-2.5 py-2 text-[12.5px]">
                        <span className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-cream text-[11px] font-semibold">{m.name[0]}</span>
                          {m.name}
                        </span>
                        <span className="rounded-full bg-cream px-2 py-0.5 font-mono text-[10.5px]">{m.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tab === "billing" && (
                <div>
                  <p className="text-[18px] font-semibold tracking-[-0.02em]">{t.billing}</p>
                  <p className="mt-1 text-[12px] text-ink-2/60">
                    {t.plan}: <b>{plan.name}</b>
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {(Object.keys(PLANS) as PlanId[]).map((p) => {
                      const P = PLANS[p];
                      const on = p === tenant.plan;
                      return (
                        <div key={p} className={`flex flex-col rounded-2xl border p-2.5 ${on ? "border-ink" : "border-line"}`}>
                          <p className="text-[14px] font-semibold">{P.name}</p>
                          <ul className="mt-1.5 flex-1 space-y-0.5 text-[11px] text-ink-2/70">
                            <li>{P.invoices == null ? "Unlimited" : P.invoices} invoices / month</li>
                            <li>{P.seats == null ? "Unlimited" : P.seats} seats</li>
                            <li>{P.export ? "✓" : "✗"} CSV export</li>
                            <li>{P.audit ? "✓" : "✗"} audit log</li>
                            <li>{P.sso ? "✓" : "✗"} single sign-on</li>
                          </ul>
                          <button type="button" disabled={on} onClick={() => run({ type: "plan", plan: p })} className={`mt-2 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${on ? "bg-cream text-ink/50" : "bg-ink text-white"}`}>
                            {on ? "✓" : `${t.upgrade} ${P.name}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {tab === "audit" && (
                <div>
                  <p className="text-[18px] font-semibold tracking-[-0.02em]">{t.audit}</p>
                  {plan.audit ? (
                    <div className="mt-2 space-y-1">
                      <div className="grid grid-cols-[3rem_4rem_1fr] gap-2 px-2 font-mono text-[10px] text-ink-2/50">
                        <span>{t.when}</span>
                        <span>{t.who}</span>
                        <span>{t.what}</span>
                      </div>
                      {log.slice(0, 12).map((e, i) => (
                        <div key={i} className="grid grid-cols-[3rem_4rem_1fr] gap-2 rounded-lg bg-cream/50 px-2 py-1 font-mono text-[11px]">
                          <span>{e.at}</span>
                          <span className="truncate">{e.user}</span>
                          <span className="truncate" style={{ color: e.ok ? undefined : RD }}>
                            {e.action} · {e.target}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl bg-cream/60 p-4 text-center">
                      <p className="text-[13px] font-semibold">
                        <Lock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                        {t.locked}
                      </p>
                      <p className="mt-1 text-[11.5px] text-ink-2/60">{log.length} events are already recorded; the Free plan just can&apos;t read them.</p>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>

        {/* behind the scenes */}
        <div className="flex min-w-0 flex-col rounded-[22px] bg-ink p-4 text-white">
          <p className="font-mono text-[11px] tracking-[0.16em] text-white/45 uppercase">Behind the scenes</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[12px] break-all text-white/85">{route(last.action)}</p>
            <motion.span key={`s${last.key}`} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18, delay: last.trace.length * 0.12 }} className="rounded-full px-2.5 py-0.5 font-mono text-[12px] font-bold" style={{ background: statusColor(last.res.status) }}>
              {last.res.status} {last.res.title}
            </motion.span>
          </div>
          <ol className="mt-3 space-y-1.5">
            {last.trace.map((st, i) => (
              <motion.li key={`${last.key}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12, duration: 0.25 }} className="rounded-xl bg-white/[0.06] p-2">
                <div className="flex items-start gap-2">
                  {(() => {
                    const I = STAGE[st.stage].Icon;
                    return (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg" style={{ background: st.ok ? "rgba(27,175,122,0.2)" : "rgba(200,65,63,0.25)", color: st.ok ? "#7ee2b0" : "#ff9b8f" }}>
                        <I className="h-3.5 w-3.5" />
                      </span>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold" style={{ color: st.ok ? "#7ee2b0" : "#ff9b8f" }}>
                      {STAGE[st.stage].label} {st.ok ? "✓" : "✗"}
                    </p>
                    <p className="text-[12px] leading-snug text-white/80">{st.text}</p>
                    {st.code && <pre className="mt-1 rounded-lg bg-black/40 p-1.5 font-mono text-[10.5px] leading-relaxed break-all whitespace-pre-wrap text-white/70">{st.code}</pre>}
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
          {last.res.body && (
            <motion.div key={`b${last.key}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: last.trace.length * 0.12 + 0.1 }} className="mt-3 rounded-xl bg-white/[0.08] p-2.5">
              <p className="text-[10.5px] text-white/45">response body</p>
              <pre className="mt-0.5 max-h-36 overflow-auto font-mono text-[11px] whitespace-pre-wrap text-white/85">{last.res.body}</pre>
            </motion.div>
          )}
          <p className="mt-auto pt-3 text-[11px] text-white/45">Every button works for everyone on purpose: click one your role or plan doesn&apos;t allow and watch where it stops.</p>
        </div>
      </div>
      <p className="text-[11.5px] text-ink-2/55">Fictional companies and invoices, simulated payments; everything runs and stays in this browser tab. The same rules a production SaaS enforces on the server are applied here in the same order.</p>
    </div>
  );
}
