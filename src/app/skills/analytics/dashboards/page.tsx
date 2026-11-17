import type { Metadata } from "next";
import { DashboardKinds } from "@/components/analytics/dashboards/kinds";
import { DashboardMakeover } from "@/components/analytics/dashboards/makeover";
import { DashboardStory } from "@/components/analytics/dashboards/story";
import { AnalyticsHeader } from "@/components/analytics/subnav";

export const metadata: Metadata = {
  title: "Dashboards — Data Analytics & BI — Baldanullah",
  description: "How a dashboard is built from a question, the four kinds of dashboards, and a makeover that fixes a bad one, all on real Online Retail data.",
};

const SECTIONS = [
  { href: "#build", label: "Question to dashboard", note: "8 steps on real sales data" },
  { href: "#kinds", label: "Four kinds of dashboards", note: "strategic to operational" },
  { href: "#makeover", label: "Dashboard makeover", note: "five fixes, switched on one by one" },
];

export default function DashboardsPage() {
  return (
    <>
      <AnalyticsHeader
        kicker="Data Analytics & BI · Dashboards"
        title="A dashboard is a decision, drawn."
        line="Before the dashboards themselves: how one is built from a question, which kind fits which job, and what separates a good dashboard from a busy one. Everything on the real Online Retail data."
      >
        <div className="mt-8 grid gap-2 sm:grid-cols-3">
          {SECTIONS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[17px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </AnalyticsHeader>
      <DashboardStory />
      <DashboardKinds />
      <DashboardMakeover />
    </>
  );
}
