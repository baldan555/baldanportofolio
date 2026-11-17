import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { Anatomy } from "@/components/web/anatomy";
import { ClickToPage } from "@/components/web/click-to-page";
import { DeviceShowcase } from "@/components/web/device-showcase";
import { WebGlance } from "@/components/web/glance";
import { logosFor } from "@/components/web/logos";
import { ShipWays } from "@/components/web/ship-ways";
import { CONCEPTS, GROUPS } from "@/data/web-concepts";
import { WEB_TOOLS } from "@/data/web-tools";
import { LabButton, SkillShell } from "@/components/skills/skill-shell";

export const metadata: Metadata = {
  title: "Web, SaaS & Mobile — Baldanullah",
  description: "How web apps, SaaS products and mobile apps work: one live app on every screen, the layers every product is made of, and one click followed from DNS to a finished page with this page's real load times.",
};

const logos = logosFor([...new Set(WEB_TOOLS.map((t) => t.icon).filter((x): x is string => !!x))]);

const EXPLORE = [
  { href: "/skills/web-mobile/tools", n: "01", t: "Tools", d: `${WEB_TOOLS.length} tools across ${8} layers, the same task written in several of them, live npm downloads, head-to-heads and a stack builder.` },
  { href: "/skills/web-mobile/concepts", n: "02", t: "Concepts", d: `${CONCEPTS.length} ideas in ${GROUPS.length} groups, from HTTP, REST and CORS to JWT, multi-tenancy and offline sync, each animated; some you can run live.` },
  { href: "/skills/web-mobile/lab", n: "03", t: "Web lab", d: "This page's live Web Vitals with experiments that break them, the real waterfall of every file it loaded, a rendering race and a responsive playground." },
  { href: "/skills/web-mobile/saas", n: "04", t: "SaaS anatomy", d: "A working mini SaaS with its backend exposed: sessions, tenants, roles, plans, feature flags, audit log and two languages, plus tenant isolation and unit economics." },
  { href: "/skills/web-mobile/mobile", n: "05", t: "Mobile lab", d: "Four ways to build an app and a picker, two phones syncing offline with real conflicts, push across the app lifecycle, and your device's sensors read live." },
  { href: "/skills/web-mobile/architectures", n: "06", t: "Architectures", d: "One shop built six ways, from monolith to microservices, serverless, static + APIs and backend-as-a-service, morphing on one canvas, with what breaks on a bad day." },
];

export default function WebMobilePage() {
  return (
    <SkillShell
      top="top-36"
      items={[
        { id: "screens", label: "One app, every screen" },
        { id: "ship", label: "Three ways to ship" },
        { id: "anatomy", label: "Anatomy of an app" },
        { id: "measured", label: "This page, measured" },
        { id: "click", label: "Between a click and a page" },
        { id: "deeper", label: "Go deeper" },
      ]}
      lab={{ href: "/skills/web-mobile/lab", label: "Web lab" }}
    >
      <Header
        kicker="Skill 05 · Web, SaaS & Mobile"
        title="Products people log into every day."
        line="Web apps, SaaS platforms and mobile apps, and what actually happens inside them. Shown with things that run in your browser, starting with a live app and the page you are reading."
      >
        <div className="mt-8 flex flex-wrap gap-2">
          {["Next.js", "React", "TypeScript", "FastAPI", "PostgreSQL", "Expo", "React Native", "Cloud Run"].map((t) => (
            <span key={t} className="rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[13px]">
              {t}
            </span>
          ))}
        </div>
        <LabButton href="/skills/web-mobile/lab" label="Open the web lab" className="mt-6" />
      </Header>

      <DeviceShowcase />
      <ShipWays />
      <Anatomy tools={WEB_TOOLS} logos={logos} />
      <WebGlance />
      <ClickToPage />

      <section id="deeper" className="scroll-mt-8 mx-auto max-w-[1240px] px-5 pt-28 pb-10 md:px-10">
        <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">Explore</p>
        <h2 className="max-w-3xl text-[2.4rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.4rem]">Go deeper.</h2>
        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {EXPLORE.map((s) =>
            s.href ? (
              <Link key={s.t} href={s.href} className="group flex h-full flex-col rounded-[24px] bg-ink p-6 text-white transition hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[12px] text-white/50">{s.n}</span>
                  <ArrowUpRight className="h-5 w-5 transition group-hover:rotate-45" />
                </div>
                <p className="mt-8 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">{s.t}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-white/65">{s.d}</p>
              </Link>
            ) : (
              <div key={s.t} className="flex h-full flex-col rounded-[24px] bg-cream p-6 text-ink/70">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[12px] text-ink/40">{s.n}</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[10.5px] text-ink/50">soon</span>
                </div>
                <p className="mt-8 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em] text-ink/80">{s.t}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink/60">{s.d}</p>
              </div>
            ),
          )}
        </div>
      </section>
    </SkillShell>
  );
}
