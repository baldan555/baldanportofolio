import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { CronLab, IdemLab, PollingLab, RetryLab } from "@/components/automation/methods/labs";
import { MethodLibrary } from "@/components/automation/methods/library";
import { Section } from "@/components/web/tools/shared";
import { BLOCKS, BLOCK_GROUPS, KINDS, KIND_GROUPS } from "@/data/auto-methods";

export const metadata: Metadata = {
  title: "Methods — Automation & AI Agents — Baldanullah",
  description: "Every kind of automation, from scripts, cron jobs and webhooks to no-code workflows, RPA, browser bots, queues, orchestration, document AI and AI agents, plus the building blocks every automation is made of, each animated, with live labs for cron, polling, retries and idempotency.",
};

const LABS = [
  { id: "lab-cron", t: "Cron, explained", d: "Type a schedule, read it in plain words, see the next runs in your time zone.", el: <CronLab /> },
  { id: "lab-polling", t: "Polling or webhook?", d: "How late and how wasteful checking every few minutes really is.", el: <PollingLab /> },
  { id: "lab-retry", t: "Retries, backoff and jitter", d: "Two dozen jobs hit a service that's down. Watch what each retry policy does to it.", el: <RetryLab /> },
  { id: "lab-idem", t: "Idempotency keys", d: "A lost reply, a retry, and a customer charged twice, unless…", el: <IdemLab /> },
];

export default function MethodsPage() {
  return (
    <>
      <Header
        kicker="Automation & AI Agents · Methods"
        title="Every way to automate, and what it's made of."
        line={`${KINDS.length} kinds of automation in ${KIND_GROUPS.length} families, and the ${BLOCKS.length} building blocks they're all assembled from: triggers, logic, reliability and safety. Every one is animated step by step; four you can try right here.`}
      >
        <div className="mt-8 grid gap-2 sm:grid-cols-3">
          {[
            { href: "#kinds", n: "01", t: "Kinds of automation", d: `${KINDS.length} methods, from scripts to agents` },
            { href: "#blocks", n: "02", t: "Building blocks", d: `${BLOCKS.length} parts every automation uses` },
            { href: "#labs", n: "03", t: "Try them", d: "cron, polling, retries, idempotency" },
          ].map((s) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">{s.n}</span>
              <span className="mt-1 block text-[16px] font-semibold tracking-[-0.01em] group-hover:underline">{s.t}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.d}</span>
            </a>
          ))}
        </div>
      </Header>
      <Section id="kinds" kicker="01 · Kinds of automation" title="What does the work." line="Six families, from code a developer writes to robots that use the screen and models that read and decide. Open any card for the full story, when to use it and what to watch out for.">
        <MethodLibrary items={KINDS} groups={KIND_GROUPS} prefix="k" placeholder="Search methods: webhook, RPA, agent…" />
      </Section>
      <Section id="blocks" kicker="02 · Building blocks" title="What every automation is made of." line="Whatever the tool, an automation is a trigger, some logic, and the unglamorous parts that keep it working: retries, timeouts, alerts, approvals and safely kept secrets.">
        <MethodLibrary items={BLOCKS} groups={BLOCK_GROUPS} prefix="b" placeholder="Search blocks: retry, approval, cron…" />
      </Section>
      <Section id="labs" kicker="03 · Try them" title="Four building blocks, hands-on." line="The cron lab works on real dates in your time zone; the other three are simulations, so you can break things safely." className="pb-10">
        <div className="grid gap-3 lg:grid-cols-2">
          {LABS.map((l) => (
            <div key={l.id} id={l.id} className="scroll-mt-32 rounded-[24px] border border-line bg-white p-4 sm:p-5">
              <h3 className="text-[1.3rem] font-semibold tracking-[-0.02em]">{l.t}</h3>
              <p className="mt-0.5 mb-3 text-[13px] text-ink-2/60">{l.d}</p>
              {l.el}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
