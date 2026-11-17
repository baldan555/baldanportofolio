import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { LiveRule } from "@/components/automation/live-rule";
import { SixWays } from "@/components/automation/six-ways";
import { Spectrum, TaskSorter } from "@/components/automation/spectrum";
import { WorthIt } from "@/components/automation/worth-it";
import { Section } from "@/components/web/tools/shared";
import { LabButton, SkillShell } from "@/components/skills/skill-shell";

export const metadata: Metadata = {
  title: "Automation & AI Agents — Baldanullah",
  description: "Every way to automate work, from scripts and schedules to no-code workflows, RPA robots, orchestrated pipelines and AI agents: a real automation running in your browser, one chore automated six ways, where rules end and judgement begins, and whether a task is worth automating.",
};

const EXPLORE: { n: string; t: string; d: string; href?: string }[] = [
  { href: "/skills/automation/methods", n: "01", t: "Methods", d: "Every kind of automation and its building blocks: triggers, schedules, webhooks, queues, retries, approvals, each animated." },
  { href: "/skills/automation/tools", n: "02", t: "Tools", d: "No-code platforms, RPA, browser bots, schedulers, orchestrators, CI/CD, messaging APIs, models and agent frameworks, side by side." },
  { href: "/skills/automation/lab", n: "03", t: "Workflow lab", d: "Build a workflow from nodes and run it on real public data, with retries, branches and a human approval step." },
  { href: "/skills/automation/agents", n: "04", t: "AI agents", d: "How an agent works inside: the loop message by message, its parts, twelve patterns, autonomy levels, a guardrails lab and costs with live model prices." },
  { href: "/skills/automation/build", n: "05", t: "Build an agent", d: "The actual API calls, tool schemas and MCP, step by step, with the request and response at every turn." },
  { href: "/skills/automation/prompt", n: "06", t: "Prompt → automation", d: "Describe a task in plain words and watch an AI turn it into a workflow, then run it." },
];

export default function AutomationPage() {
  return (
    <SkillShell
      top="top-36"
      items={[
        { id: "live", label: "Running right now" },
        { id: "ways", label: "One chore, six ways" },
        { id: "judgement", label: "Rules or reasoning" },
        { id: "worth", label: "Worth it?" },
        { id: "deeper", label: "Go deeper" },
      ]}
      lab={{ href: "/skills/automation/lab", label: "Workflow lab" }}
    >
      <Header
        kicker="Skill 06 · Automation & AI Agents"
        title="Work that runs itself."
        line="Automation is software doing the repetitive work: on a schedule, when something happens, or when you ask in plain words. Here is every way it's done, from a ten-line script to an AI agent, shown with things that actually run in your browser."
      >
        <div className="mt-8 flex flex-wrap gap-2">
          {["Python", "Playwright", "n8n", "Power Automate", "UiPath", "Airflow", "GitHub Actions", "LLMs", "MCP", "OpenRouter"].map((t) => (
            <span key={t} className="rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[13px]">
              {t}
            </span>
          ))}
        </div>
        <LabButton href="/skills/automation/lab" label="Open the workflow lab" className="mt-6" />
      </Header>
      <Section id="live" kicker="Running right now" title="This page is running an automation." line="A real one, in your browser: it listens to every change made across Wikipedia and its sister sites, keeps the article edits, and alerts on new pages and big changes. Start it, then change the rule while it runs.">
        <LiveRule />
      </Section>
      <Section id="ways" kicker="01 · One chore, six ways" title="The same morning chore, automated six ways." line="Every morning: get yesterday's orders from a supplier portal, add them up per store, update the sales sheet and tell the team. The four steps keep their colour, so you can watch who does the work change.">
        <SixWays />
      </Section>
      <Section id="judgement" kicker="02 · Rules or reasoning" title="Where rules end and judgement begins." line="Most automation follows fixed rules, and that's a strength. AI earns its place only where a task needs reading, writing or judgement. Slide to see what changes.">
        <div className="space-y-6">
          <Spectrum />
          <TaskSorter />
        </div>
      </Section>
      <Section id="worth" kicker="03 · Worth it?" title="Is it worth automating?" line="Building takes time, and so does keeping it running. Put in how often a task happens and how long it takes, and see when the automation pays for itself.">
        <WorthIt />
      </Section>
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
