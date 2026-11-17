import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { ConceptsBrowser } from "@/components/web/concepts/browser";
import { logosFor } from "@/components/web/logos";
import { CONCEPTS, GROUPS } from "@/data/web-concepts";
import { WEB_TOOLS } from "@/data/web-tools";

export const metadata: Metadata = {
  title: "Concepts — Web, SaaS & Mobile — Baldanullah",
  description: "The ideas behind web apps, SaaS and mobile apps, from HTTP, REST and CORS to JWT, multi-tenancy and offline sync: each with a small animated diagram, and live demos you can run in your browser.",
};

const used = new Set(CONCEPTS.flatMap((c) => c.tools ?? []));
const tools = WEB_TOOLS.filter((t) => used.has(t.id));
const logos = logosFor([...new Set(tools.map((t) => t.icon).filter((x): x is string => !!x))]);

export default function ConceptsPage() {
  const demos = CONCEPTS.filter((c) => c.demo).length;
  return (
    <>
      <Header
        kicker="Web, SaaS & Mobile · Concepts"
        title="The ideas behind every app, one at a time."
        line={`${CONCEPTS.length} concepts in ${GROUPS.length} groups, from what an API is to how a phone syncs offline. Each has a small animated diagram and a plain explanation; ${demos} come with a live demo you can run right here.`}
      >
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {GROUPS.map((g, i) => (
            <a key={g.id} href={`#${g.id}`} className="group rounded-2xl border border-line bg-white p-3.5 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-0.5 block text-[15px] font-semibold tracking-[-0.01em] group-hover:underline">{g.name}</span>
              <span className="block text-[12px] text-ink-2/60">{CONCEPTS.filter((c) => c.group === g.id).length} concepts</span>
            </a>
          ))}
        </div>
      </Header>
      <ConceptsBrowser tools={tools} logos={logos} />
      <div className="h-24" />
    </>
  );
}
