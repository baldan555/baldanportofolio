import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { DeGlance } from "@/components/data-eng/de-glance";
import { DeExplore, DeRules } from "@/components/data-eng/de-sections";
import { NeverSleeps } from "@/components/data-eng/never-sleeps";
import { LabButton, SkillShell } from "@/components/skills/skill-shell";

export const metadata: Metadata = {
  title: "Data Engineering — Baldanullah",
  description: "Pipelines that make messy data trustworthy: 42,600 hours of Jakarta air followed from the API to the page, the rules every pipeline here follows, a live stream lab, an incident simulator and six architectures.",
};

export default function DataEngineeringPage() {
  return (
    <SkillShell
      top="top-36"
      items={[
        { id: "numbers", label: "In numbers" },
        { id: "pipeline", label: "A pipeline that never sleeps" },
        { id: "rules", label: "How I build them" },
        { id: "explore", label: "Explore" },
      ]}
      lab={{ href: "/skills/data-engineering/lab", label: "Pipeline lab" }}
    >
      <Header
        kicker="Skill 04 · Data Engineering"
        title="Pipelines that make messy data trustworthy."
        line="Getting data out of systems and APIs, landing it safely, checking it, shaping it and serving it, on a schedule, without anyone watching. Shown here with pipelines that really run."
      >
        <div className="mt-8 flex flex-wrap gap-2">
          {["Python", "SQL", "BigQuery", "GCP", "dbt", "Airflow", "Data quality", "Streaming"].map((t) => (
            <span key={t} className="rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[13px]">
              {t}
            </span>
          ))}
        </div>
        <LabButton href="/skills/data-engineering/lab" label="Open the pipeline lab" className="mt-6" />
      </Header>

      <DeGlance />
      <NeverSleeps />
      <DeRules />
      <DeExplore />
    </SkillShell>
  );
}
