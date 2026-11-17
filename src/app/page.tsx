import type { Metadata } from "next";
import { About } from "@/components/about";
import { CHARTS } from "@/components/analytics/charts/catalog";
import { Capabilities } from "@/components/capabilities";
import { Contact } from "@/components/contact";
import { Cursor } from "@/components/cursor";
import { Explore } from "@/components/explore";
import { Hero } from "@/components/hero";
import { Journey } from "@/components/journey";
import { Nav } from "@/components/nav";
import { Process } from "@/components/process";
import { SmoothScroll } from "@/components/smooth-scroll";
import { Stack } from "@/components/stack";
import { Statement, WorkedWith } from "@/components/story";
import { Works } from "@/components/works";
import { dlCaseStudies } from "@/data/dl";
import { credentials, profile } from "@/data/profile";
import { caseStudies } from "@/data/skills";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** What's inside each skill page, counted from the same data the pages use. */
const INSIDE: Record<string, string> = {
  "machine-learning": `${caseStudies.length} case studies with models you can run`,
  "deep-learning": `${dlCaseStudies.length} demos: camera, drawing, forecasts`,
  analytics: `${CHARTS.length} charts · 4 live dashboards · data models`,
  "data-engineering": "Pipeline lab · incident simulator · 6 architectures",
  "web-mobile": "7 pages · SaaS sandbox · mobile lab · concepts",
  automation: "7 pages · workflow lab · AI agents · prompt → automation",
};

/** Hero button count, rounded down to a ten so it stays true: every ML and DL case study plus the 4 live dashboards. */
const LIVE_PROJECTS = `${Math.floor((caseStudies.length + dlCaseStudies.length + 4) / 10) * 10}+`;

/** Structured data so search engines know who this site is about. */
const PERSON = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  alternateName: "Baldanullah",
  jobTitle: profile.role,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  sameAs: [profile.linkedin],
  address: { "@type": "PostalAddress", addressLocality: profile.city, addressCountry: "ID" },
  alumniOf: { "@type": "CollegeOrUniversity", name: credentials.education.org },
  knowsAbout: ["Machine learning", "Deep learning", "Data analytics", "Data engineering", "SaaS development", "Mobile apps", "Automation", "AI agents"],
};

export default function Home() {
  return (
    <SmoothScroll>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON).replace(/</g, "\\u003c") }} />
      <Cursor />
      <Nav projects={LIVE_PROJECTS} />
      <main>
        <Hero projects={LIVE_PROJECTS} />
        <Statement />
        <WorkedWith />
        <Capabilities />
        <Works />
        <Process />
        <Journey />
        <Stack />
        <Explore inside={INSIDE} />
        <About />
        <Contact />
      </main>
    </SmoothScroll>
  );
}
