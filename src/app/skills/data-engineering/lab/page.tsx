import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { Section } from "@/components/analytics/tools/shared";
import { PipelineCatalog } from "@/components/data-eng/catalog";
import { QualityMonitor } from "@/components/data-eng/quality";
import { WikiStream } from "@/components/data-eng/stream";

export const metadata: Metadata = {
  title: "Pipeline lab — Data Engineering — Baldanullah",
  description: "Wikipedia changes processed live as a stream in your browser, live data-quality checks on public APIs, and every pipeline behind this site, measured.",
};

const PARTS = [
  { href: "#stream", label: "Live stream", note: "Wikipedia changes, windowed in your browser" },
  { href: "#quality", label: "Live data quality", note: "checks on three public APIs, right now" },
  { href: "#catalog", label: "Pipelines behind this site", note: "every script, timed on a real run" },
];

export default function PipelineLabPage() {
  return (
    <>
      <Header
        kicker="Data Engineering · Pipeline lab"
        title="Pipelines you can watch run."
        line="Nothing here is a recording. A streaming pipeline you start yourself, data-quality checks that run against live APIs when you open the page, and the real batch pipelines that build this site, with their measured run times."
      >
        <div className="mt-8 grid gap-2 sm:grid-cols-3">
          {PARTS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[17px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </Header>

      <Section
        id="stream"
        kicker="01 · Live stream"
        title="Wikipedia, processed as a stream."
        line="Press start and this page connects to Wikimedia's public event stream and runs a small streaming pipeline in your browser: parse, filter, a privacy step, 10-second event-time windows with a watermark, and a side output for late events."
      >
        <WikiStream />
      </Section>

      <Section
        id="quality"
        kicker="02 · Live data quality"
        title="Checks that run before anyone trusts the numbers."
        line="Three public APIs, fetched by your browser just now, each put through the same eight checks a production pipeline runs before it publishes. They should mostly pass, so break the data on purpose and watch which checks catch it."
      >
        <QualityMonitor />
      </Section>

      <Section
        id="catalog"
        kicker="03 · Pipelines behind this site"
        title="Every page here is fed by a pipeline."
        line="The dashboards, maps and models on this site read small JSON files that batch pipelines build from raw data. Here is each one, re-run and timed for this page, with what goes in and what comes out."
        className="pb-10"
      >
        <PipelineCatalog />
      </Section>
    </>
  );
}
