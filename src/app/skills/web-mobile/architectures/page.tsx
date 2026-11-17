import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { BreakIt } from "@/components/web/archs/break-it";
import { ArchExplorer } from "@/components/web/archs/explorer";
import { ArchFit, GrowthStory } from "@/components/web/archs/grow-compare";
import { Section } from "@/components/web/tools/shared";

export const metadata: Metadata = {
  title: "Architectures — Web, SaaS & Mobile — Baldanullah",
  description: "One online shop built six ways (monolith, modular monolith, microservices, serverless, static + APIs, backend-as-a-service), morphing on one canvas with an order followed through each, what breaks on a bad day, how products grow, and which one fits.",
};

const PARTS = [
  { href: "#gallery", label: "Six architectures", note: "one shop, one order, followed" },
  { href: "#break", label: "Break it", note: "four bad days, 24 outcomes" },
  { href: "#grow", label: "How products grow", note: "from week 1 to year 5" },
  { href: "#fit", label: "Which one fits", note: "four questions, side by side" },
];

export default function ArchitecturesPage() {
  return (
    <>
      <Header
        kicker="Web, SaaS & Mobile · Architectures"
        title="One shop, built six ways."
        line="The same online shop, with the same parts (catalog, orders, payments, users, emails), arranged six different ways. Switch between them and watch the parts move, then follow one order through each and see what breaks on a bad day."
      >
        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PARTS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[16px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </Header>
      <Section id="gallery" kicker="01 · Six architectures" title="Same parts, different arrangement." line="Each part keeps its colour in every drawing, so you can watch it move: out of one big app into its own service, down into a function, or into someone else's platform. The order below runs on its own; pause it or click any step.">
        <ArchExplorer />
      </Section>
      <Section id="break" kicker="02 · Break it" title="What happens on a bad day." line="A bug in payments, a traffic spike, a deploy, a slow database. Pick an architecture and a bad day to see which parts go down, slow down or scale out, and what customers would notice.">
        <BreakIt />
      </Section>
      <Section id="grow" kicker="03 · How products grow" title="Architecture follows the team." line="Few products start where they end up. The usual path tracks the size of the team more than the size of the traffic.">
        <GrowthStory />
      </Section>
      <Section id="fit" kicker="04 · Which one fits" title="Four questions, one starting point." line="Answer what you know about your product and team. The table underneath shows the trade-offs behind the answer." className="pb-10">
        <ArchFit />
      </Section>
    </>
  );
}
