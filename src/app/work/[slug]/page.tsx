import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CasePage } from "@/components/work/case-page";
import { BudgetDemo } from "@/components/work/demos/budget-demo";
import { EmbedDemo } from "@/components/work/demos/embed-demo";
import { FulfillmentDemo } from "@/components/work/demos/fulfillment-demo";
import { FusionDemo } from "@/components/work/demos/fusion-demo";
import { InventoryDemo } from "@/components/work/demos/inventory-demo";
import { KpiTvDemo } from "@/components/work/demos/kpi-tv-demo";
import { PortalDemo } from "@/components/work/demos/portal-demo";
import { QuadrantDemo } from "@/components/work/demos/quadrant-demo";
import { TickmateDemo } from "@/components/work/demos/tickmate-demo";
import { cases, getCase } from "@/data/cases";

// Fully static (generateStaticParams), like the skill pages: complete HTML for crawlers, no skeleton.
// PROTRACK and GatherInsight keep their own hand-built folders next to this route.
export const instant = false;

// each demo runs the app's own rules in the browser, on made-up data
const DEMOS: Record<string, () => ReactNode> = {
  portals: () => <PortalDemo />,
  tickmate: () => <TickmateDemo />,
  embedhub: () => <EmbedDemo />,
  fulfillment: () => <FulfillmentDemo />,
  budgettower: () => <BudgetDemo />,
  inventory: () => <InventoryDemo />,
  automation: () => <FusionDemo />,
  dashboards: () => (
    <>
      <KpiTvDemo />
      <QuadrantDemo />
    </>
  ),
};

export function generateStaticParams() {
  return cases.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = getCase(slug);
  return c ? { title: `${c.name}: how it works — Baldanullah`, description: c.description, alternates: { canonical: `/work/${c.slug}` } } : {};
}

export default async function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const c = getCase(slug);
  if (!c) notFound();
  return <CasePage c={c} demo={DEMOS[slug]?.()} />;
}
