import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { PortalDemo } from "@/components/automation/lab/portal-demo";
import { WorkflowLab } from "@/components/automation/lab/workflow-lab";
import { Section } from "@/components/web/tools/shared";

export const metadata: Metadata = {
  title: "Workflow lab — Automation & AI Agents — Baldanullah",
  description: "Build an automation from steps and run it for real in your browser: live exchange rates, weather, air quality and npm data, IF branches, loops, retries, a human approval step, failure alerts and a full run log. Plus robot or API: the same job done by a click-recording robot, a selector-based robot and one API call, before and after a redesign.",
};

const PARTS = [
  { href: "#build", label: "Build and run", note: "a real workflow, step by step" },
  { href: "#robot", label: "Robot or API?", note: "what breaks when a site changes" },
];

export default function WorkflowLabPage() {
  return (
    <>
      <Header kicker="Automation & AI Agents · Workflow lab" title="Build an automation, then run it." line="Pick a ready-made workflow or build your own from steps, then press Run. It runs for real in your browser, on live public data, with branches, loops, retries and a step that waits for your approval. Messages and sheet rows are simulated, so nothing leaves the page.">
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {PARTS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[16px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </Header>
      <Section id="build" kicker="01 · Build and run" title="A workflow you can edit and run." line="Each card is a step. Click one to change it, use + to add steps (data, logic, people, actions), and press Run workflow: steps light up as they run, with the data going in and out of each, every API call and retry in the log, and the workflow itself as JSON.">
        <WorkflowLab />
      </Section>
      <Section id="robot" kicker="02 · Robot or API?" title="Same job, three ways, then a redesign." line="Log in to a supplier portal, open Orders and export them: once by a robot that replays recorded clicks, once by a robot that finds buttons by their names, once with a single API call. Then turn on the redesign and run them again." className="pb-10">
        <PortalDemo />
      </Section>
      <p className="mx-auto max-w-[1240px] px-5 pb-10 text-[11.5px] text-ink-2/50 md:px-10">
        Live data in the lab: exchange rates from the European Central Bank via Frankfurter, weather and air quality from Open-Meteo, package downloads from the npm registry. All free public APIs called by your browser; nothing you type is sent anywhere else.
      </p>
    </>
  );
}
