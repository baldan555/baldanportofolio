import type { MetadataRoute } from "next";
import { dlCaseStudies } from "@/data/dl";
import { caseStudies } from "@/data/skills";
import { SITE_URL } from "@/lib/site";

/** Every public page, for search engines. Keep in step with the routes under src/app/skills. */
const PAGES = [
  "/work/protrack",
  "/work/gatherinsight",
  "/work/portals",
  "/work/tickmate",
  "/work/embedhub",
  "/work/fulfillment",
  "/work/budgettower",
  "/work/inventory",
  "/work/automation",
  "/work/dashboards",
  "/work/bitumen",
  "/skills/machine-learning",
  "/skills/deep-learning",
  "/skills/analytics",
  "/skills/analytics/models",
  "/skills/analytics/tools",
  "/skills/analytics/charts",
  "/skills/analytics/dashboards",
  "/skills/analytics/dashboards/sales",
  "/skills/analytics/dashboards/churn",
  "/skills/analytics/dashboards/fwa",
  "/skills/analytics/dashboards/ab-test",
  "/skills/analytics/dashboards/air",
  "/skills/data-engineering",
  "/skills/data-engineering/lab",
  "/skills/data-engineering/simulator",
  "/skills/data-engineering/architectures",
  "/skills/web-mobile",
  "/skills/web-mobile/tools",
  "/skills/web-mobile/concepts",
  "/skills/web-mobile/lab",
  "/skills/web-mobile/saas",
  "/skills/web-mobile/mobile",
  "/skills/web-mobile/architectures",
  "/skills/automation",
  "/skills/automation/methods",
  "/skills/automation/tools",
  "/skills/automation/lab",
  "/skills/automation/agents",
  "/skills/automation/build",
  "/skills/automation/prompt",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const projects = [...caseStudies.map((c) => `/skills/machine-learning/${c.slug}`), ...dlCaseStudies.map((c) => `/skills/deep-learning/${c.slug}`)];
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    ...PAGES.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "monthly" as const, priority: p.split("/").length <= 3 ? 0.8 : 0.6 })),
    ...projects.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}
