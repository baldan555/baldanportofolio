import type { Metadata } from "next";
import air from "@/data/air-dashboard.json";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { Section } from "@/components/analytics/tools/shared";
import { Guardrails } from "@/components/data-eng/guardrails";
import { IncidentSimulator } from "@/components/data-eng/incident-sim";

export const metadata: Metadata = {
  title: "Incident simulator — Data Engineering — Baldanullah",
  description: "Break an hourly pipeline on purpose (API down, schema change, duplicates, late data) and compare a naive copy with a guarded one on real Jakarta PM2.5 hours.",
};

// the last five days of the saved hourly snapshot: 48 hours of shared history, then 72 simulated runs
const HOURS = 120;
const times = air.snapshot.time.slice(-HOURS);
const truth = (air.snapshot.pm2_5 as number[]).slice(-HOURS);

const PARTS = [
  { href: "#simulator", label: "The simulator", note: "two copies of one pipeline, four incidents" },
  { href: "#guardrails", label: "The guardrails", note: "the four patterns that make the difference" },
];

export default function SimulatorPage() {
  return (
    <>
      <Header
        kicker="Data Engineering · Incident simulator"
        title="Break the pipeline. Watch it recover."
        line="Pipelines rarely fail loudly. More often they keep running and quietly publish something wrong. Here two copies of the same hourly pipeline replay real Jakarta air-quality hours through the same four incidents: one without guardrails, one with."
      >
        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:max-w-3xl">
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
        id="simulator"
        kicker="01 · The simulator"
        title="Same data, same incidents, two pipelines."
        line="Press play: one run per simulated hour, four scheduled incidents. Or inject your own at any moment, and drag the timeline to rewind. Watch what readers see on each dashboard, and the postmortem underneath."
      >
        <IncidentSimulator times={times} truth={truth} />
      </Section>

      <Section
        id="guardrails"
        kicker="02 · The guardrails"
        title="Four habits that turn incidents into non-events."
        line="None of these is exotic. Together they make a pipeline that says when it is late, refuses to publish what it does not understand, can be re-run safely, and fixes its own gaps."
        className="pb-10"
      >
        <Guardrails />
      </Section>
    </>
  );
}
