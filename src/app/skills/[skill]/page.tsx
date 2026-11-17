import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DlSkillPage } from "@/components/skills/dl-page";
import { MlSkillPage } from "@/components/skills/ml-page";
import { getSkill, skills } from "@/data/skills";

// Fully static (generateStaticParams): navigating here only waits on a prerendered file,
// so the page may block instead of streaming a skeleton. Keeps complete HTML for crawlers.
export const instant = false;

export function generateStaticParams() {
  // these skills are hubs with their own static folders (src/app/skills/…) and sub-pages
  const hubs = ["analytics", "data-engineering", "web-mobile", "automation"];
  return skills.filter((s) => s.ready && !hubs.includes(s.slug)).map((s) => ({ skill: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/skills/[skill]">): Promise<Metadata> {
  const { skill } = await params;
  const s = getSkill(skill);
  return s ? { title: `${s.name} — Baldanullah`, description: s.line } : {};
}

export default async function SkillPage({ params }: PageProps<"/skills/[skill]">) {
  const { skill } = await params;
  const s = getSkill(skill);
  if (!s || !s.ready) notFound();
  if (skill === "deep-learning") return <DlSkillPage />;
  return <MlSkillPage />;
}
