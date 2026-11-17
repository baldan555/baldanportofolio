import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudyPage } from "@/components/skills/case-study";
import { dlCaseStudies } from "@/data/dl";
import { caseStudies, getSkill, type CaseStudy } from "@/data/skills";

// Fully static (generateStaticParams): navigating here only waits on a prerendered file,
// so the page may block instead of streaming a skeleton. Keeps complete HTML for crawlers.
export const instant = false;

/** Case studies per skill; each skill's projects live under /skills/<skill>/<project>. */
const lists: Record<string, CaseStudy[]> = { "machine-learning": caseStudies, "deep-learning": dlCaseStudies };

export function generateStaticParams() {
  return Object.entries(lists).flatMap(([skill, list]) => list.map((c) => ({ skill, project: c.slug })));
}

export async function generateMetadata({ params }: PageProps<"/skills/[skill]/[project]">): Promise<Metadata> {
  const { skill, project } = await params;
  const c = lists[skill]?.find((x) => x.slug === project);
  const s = getSkill(skill);
  return c && s ? { title: `${c.title} — ${s.name} lab`, description: c.line } : {};
}

export default async function ProjectPage({ params }: PageProps<"/skills/[skill]/[project]">) {
  const { skill, project } = await params;
  const list = lists[skill];
  const s = getSkill(skill);
  const c = list?.find((x) => x.slug === project);
  if (!list || !s?.ready || !c) notFound();
  return <CaseStudyPage study={c} skill={{ slug: s.slug, name: s.name }} list={list} />;
}
