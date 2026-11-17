import type { Metadata } from "next";
import { ModelExplorer } from "@/components/analytics/model-explorer";
import { MethodLibrary } from "@/components/analytics/pipeline/method-library";
import { METHODS, STAGES } from "@/components/analytics/pipeline/methods";
import { RawToReady } from "@/components/analytics/pipeline/raw-to-ready";
import { AnalyticsHeader } from "@/components/analytics/subnav";
import { DATA_MODELS } from "@/data/data-models";

export const metadata: Metadata = {
  title: "Data models — Data Analytics & BI — Baldanullah",
  description: "From raw data to trusted tables: the full pipeline on a real file, the shapes data is stored in, and a library of data-engineering methods, all animated.",
};

const SECTIONS = [
  { href: "#pipeline", label: "Raw to ready", note: "the full journey on a real file" },
  { href: "#shapes", label: "Shapes of data", note: `${DATA_MODELS.length} ways to store it` },
  { href: "#methods", label: "Method library", note: `${METHODS.length} techniques in ${STAGES.length} stages` },
];

export default function ModelsPage() {
  return (
    <>
      <AnalyticsHeader
        kicker="Data Analytics & BI · Data models"
        title="From raw data to tables people trust."
        line="Everything that happens between a messy export and a dashboard: how data is loaded, checked, cleaned, reshaped, modelled, stored and governed. Animated, mostly on a real file."
      >
        <div className="mt-8 grid gap-2 sm:grid-cols-3">
          {SECTIONS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[17px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </AnalyticsHeader>
      <RawToReady />
      <ModelExplorer models={DATA_MODELS} />
      <MethodLibrary />
    </>
  );
}
