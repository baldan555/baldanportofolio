import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RawToDashboard } from "@/components/analytics/raw-to-dashboard";
import { AnalyticsHeader } from "@/components/analytics/subnav";
import { LabButton, SkillShell } from "@/components/skills/skill-shell";

export const metadata: Metadata = {
  title: "Data Analytics & BI — Baldanullah",
  description: "From raw data to decisions: data models, tools, a library of chart types and dashboards.",
};

const SECTIONS = [
  {
    href: "/skills/analytics/models",
    n: "01",
    t: "Data models",
    d: "The same business stored in different shapes: flat files, normalised tables, star schemas, event logs, history tables, time series.",
  },
  {
    href: "/skills/analytics/tools",
    n: "02",
    t: "Tools",
    d: "One real file followed through every tool, a map of 28 tools with drawn interfaces, the same question in eight tools, a BI head-to-head and a stack builder.",
  },
  {
    href: "/skills/analytics/charts",
    n: "03",
    t: "Chart library",
    d: "Nearly three hundred charts in 34 families: every kind of bar, line, pie, real map, word cloud and table, each with when to use it.",
  },
  {
    href: "/skills/analytics/dashboards",
    n: "04",
    t: "Dashboards",
    d: "How a dashboard is built, then five working ones: Online Retail sales, an e-mail A/B test, live Jakarta air quality, customer churn and an FWA base-health case built from raw data.",
  },
  { href: "", n: "05", t: "SQL playground", d: "Write SQL against the datasets in your browser. Coming next.", soon: true },
];

export default function AnalyticsPage() {
  return (
    <SkillShell
      top="top-36"
      items={[
        { id: "journey", label: "One case, start to finish" },
        { id: "parts", label: "Every part of the job" },
      ]}
      lab={{ href: "/skills/analytics/dashboards", label: "Dashboards" }}
    >
      <AnalyticsHeader
        kicker="Skill 03 · Data Analytics & BI"
        title="Questions in, decisions out."
        line="Analytics is the path from a business question to a decision people can act on: model the data, query it, chart it, and say what it means."
      >
        <div className="mt-8 flex flex-wrap gap-2">
          {["SQL", "Data modelling", "Power BI", "Tableau", "Excel", "Python", "Storytelling"].map((t) => (
            <span key={t} className="rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[13px]">
              {t}
            </span>
          ))}
        </div>
        <LabButton href="/skills/analytics/dashboards" label="Open the dashboards" className="mt-6" />
      </AnalyticsHeader>

      <RawToDashboard />

      <section id="parts" className="scroll-mt-8 mx-auto max-w-[1240px] px-5 pt-28 md:px-10">
        <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">Explore</p>
        <h2 className="max-w-3xl text-[2.4rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.4rem]">Every part of the job, one page each.</h2>
        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => {
            const card = (
              <div className={`group flex h-full flex-col rounded-[24px] p-6 transition ${s.soon ? "bg-cream text-ink/60" : "bg-ink text-white hover:-translate-y-1"}`}>
                <div className="flex items-start justify-between">
                  <span className={`font-mono text-[12px] ${s.soon ? "text-ink/40" : "text-white/50"}`}>{s.n}</span>
                  {!s.soon && <ArrowUpRight className="h-5 w-5 transition group-hover:rotate-45" />}
                </div>
                <p className="mt-8 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">{s.t}</p>
                <p className={`mt-2 text-[14px] leading-relaxed ${s.soon ? "text-ink/55" : "text-white/65"}`}>{s.d}</p>
              </div>
            );
            return s.soon ? (
              <div key={s.t}>{card}</div>
            ) : (
              <Link key={s.t} href={s.href}>
                {card}
              </Link>
            );
          })}
        </div>
      </section>
    </SkillShell>
  );
}
