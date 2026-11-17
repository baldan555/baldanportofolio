import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { RenderRace } from "@/components/web/lab/render-race";
import { ResponsiveLab } from "@/components/web/lab/responsive";
import { VitalsLab } from "@/components/web/lab/vitals";
import { Waterfall } from "@/components/web/lab/waterfall";
import { Section } from "@/components/web/tools/shared";

export const metadata: Metadata = {
  title: "Web lab — Web, SaaS & Mobile — Baldanullah",
  description: "Poke the web while it runs: this page's live Core Web Vitals with experiments that break them, the real network waterfall of every file it loaded, four rendering strategies raced side by side, and a responsive layout you can drag.",
};

const PARTS = [
  { href: "#vitals", label: "Live Web Vitals", note: "your numbers, and two ways to break them" },
  { href: "#waterfall", label: "The waterfall", note: "every file this page loaded" },
  { href: "#rendering", label: "Rendering race", note: "SPA vs SSR vs static vs streaming" },
  { href: "#responsive", label: "Responsive", note: "drag the width, watch the CSS" },
];

export default function WebLabPage() {
  return (
    <>
      <Header kicker="Web, SaaS & Mobile · Web lab" title="Poke the web while it runs." line="Four experiments that run in your browser, on this very page: how fast it feels by Google's measures, what it downloaded, how different rendering strategies would change that, and how a layout adapts to any screen.">
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
      <Section id="vitals" kicker="01 · Live Web Vitals" title="How fast this page feels, by Google's measures." line="Core Web Vitals are what Google uses to judge page experience: loading (LCP), responsiveness (INP) and visual stability (CLS). These are yours, measured as you use the page, and you can make them worse on purpose.">
        <VitalsLab />
      </Section>
      <Section id="waterfall" kicker="02 · The waterfall" title="Every file this page loaded, in order." line="The same view developers open in DevTools: when each file started, how long it waited for the server, how long it downloaded, and whether it came from your cache. Click any row.">
        <Waterfall />
      </Section>
      <Section id="rendering" kicker="03 · Rendering race" title="Same page, four ways to render it." line="Where the HTML is built changes what people see first and when they can click. Pick a network, a slow or fast server and a small or heavy JavaScript bundle, then race them.">
        <RenderRace />
      </Section>
      <Section id="responsive" kicker="04 · Responsive playground" title="One page, every width." line="A small shop page built with real CSS container queries. Drag its width from a small phone to a laptop and watch the layout switch exactly at its breakpoints." className="pb-10">
        <ResponsiveLab />
      </Section>
    </>
  );
}
