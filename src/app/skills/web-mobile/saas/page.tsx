import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { PermissionMatrix, PlanTable, TenancyModels } from "@/components/web/saas/anatomy-parts";
import { UnitEconomics } from "@/components/web/saas/metrics";
import { SaasSandbox } from "@/components/web/saas/sandbox";
import { Section } from "@/components/web/tools/shared";

export const metadata: Metadata = {
  title: "SaaS anatomy — Web, SaaS & Mobile — Baldanullah",
  description: "A working SaaS sandbox with everything the backend does shown step by step: sessions, tenants, roles, plans, feature flags, the audit log and two languages. Plus the permission matrix, plan limits, three ways to isolate tenants and a unit-economics calculator.",
};

const PARTS = [
  { href: "#sandbox", label: "The sandbox", note: "a real mini SaaS, with its backend exposed" },
  { href: "#permissions", label: "Roles", note: "who may do what" },
  { href: "#plans", label: "Plans & limits", note: "one config, enforced everywhere" },
  { href: "#tenancy", label: "Tenant isolation", note: "three ways to keep customers apart" },
  { href: "#economics", label: "Unit economics", note: "MRR, churn, LTV, CAC" },
];

export default function SaasPage() {
  return (
    <>
      <Header
        kicker="Web, SaaS & Mobile · SaaS anatomy"
        title="Inside a SaaS, one click at a time."
        line="A SaaS is one system serving many companies at once, each with its own people, permissions, plan and data. Use the product below as different people in different companies, and watch what the backend does with every click."
      >
        <div className="mt-8 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {PARTS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[16px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </Header>
      <Section id="sandbox" kicker="01 · The sandbox" title="Faktur: a tiny invoicing SaaS, with the lid off." line="Two companies on different plans, eight people with five roles. Sign in as anyone, then create, approve, delete, export, invite, upgrade or switch language. Try things your role or plan doesn't allow, and try to read the other company's data.">
        <SaasSandbox />
      </Section>
      <Section id="permissions" kicker="02 · Roles & permissions" title="Who may do what." line="Roles bundle permissions; every request checks one. Pick a role to see what it can do.">
        <PermissionMatrix />
      </Section>
      <Section id="plans" kicker="03 · Plans & limits" title="What each plan unlocks." line="Plans are limits and feature flags read from one place. The sandbox enforced these on every click.">
        <PlanTable />
      </Section>
      <Section id="tenancy" kicker="04 · Tenant isolation" title="Three ways to keep customers apart." line="The most important promise a SaaS makes: one customer never sees another's data. There are three common ways to keep it, each with its own cost.">
        <TenancyModels />
      </Section>
      <Section id="economics" kicker="05 · Unit economics" title="The numbers a subscription business lives by." line="Recurring revenue only grows until churn catches up. Move the sliders to see where your ceiling is and whether each customer pays back what it cost to win." className="pb-10">
        <UnitEconomics />
      </Section>
    </>
  );
}
