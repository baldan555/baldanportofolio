import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { Anatomy, Patterns } from "@/components/automation/agents/anatomy-patterns";
import { AgentCost } from "@/components/automation/agents/cost";
import { LoopSim } from "@/components/automation/agents/loop-sim";
import { AutonomyDial, Failures, GuardLab } from "@/components/automation/agents/safety";
import { Section } from "@/components/web/tools/shared";
import { PATTERNS } from "@/data/agent-patterns";

export const metadata: Metadata = {
  title: "AI agents — Automation & AI Agents — Baldanullah",
  description: "How an AI agent works inside: the loop message by message, its parts (model, instructions, tools, memory, guardrails, limits), twelve patterns from one model call to teams of agents, levels of autonomy, how agents fail, a guardrails lab against prompt injection, and a cost calculator with live model prices.",
};

const PARTS = [
  { href: "#loop", label: "The loop", note: "what the model sees, step by step" },
  { href: "#anatomy", label: "Anatomy", note: "the nine parts of an agent" },
  { href: "#patterns", label: "Patterns", note: `${PATTERNS.length}, from one call to teams` },
  { href: "#autonomy", label: "Autonomy", note: "how much to hand over" },
  { href: "#guardrails", label: "Guardrails", note: "failures and defences, live" },
  { href: "#cost", label: "Cost", note: "live prices, your numbers" },
];

export default function AgentsPage() {
  return (
    <>
      <Header kicker="Automation & AI Agents · AI agents" title="What an agent actually is." line="A language model, a set of tools, and a loop: read everything so far, decide the next step, run it, look at the result, repeat. Here is that loop message by message, the parts around it, the patterns people build, and what keeps an agent safe and affordable.">
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PARTS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-3.5 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-0.5 block text-[15px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12px] leading-snug text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </Header>
      <Section id="loop" kicker="01 · The loop" title="One agent run, message by message." line="On every step the model is sent the whole conversation: instructions, tool descriptions, the goal, and every call and result so far. It replies with either a tool call or a final answer. Watch the conversation, and the bill, grow.">
        <LoopSim />
      </Section>
      <Section id="anatomy" kicker="02 · Anatomy" title="The parts around the model." line="The model is only the centre. What makes it an agent, and a safe one, is everything around it.">
        <Anatomy />
      </Section>
      <Section id="patterns" kicker="03 · Patterns" title="From one call to a team of agents." line="Most “agents” in production are really workflows with model calls at fixed points, and that's often the right choice. Pick a pattern to see how it flows.">
        <Patterns />
      </Section>
      <Section id="autonomy" kicker="04 · Autonomy" title="How much should the agent decide alone?" line="Autonomy is a dial, not a switch. The same refund process, at six levels, and what each level needs to be safe.">
        <AutonomyDial />
      </Section>
      <Section id="guardrails" kicker="05 · Failures & guardrails" title="How agents go wrong, and what stops them." line="Eight common failures, then a lab: an agent handles a refund email, and some emails contain instructions aimed at the agent itself. Switch defences on and off.">
        <div className="space-y-6">
          <Failures />
          <GuardLab />
        </div>
      </Section>
      <Section id="cost" kicker="06 · Cost" title="What a run costs." line="Agents pay for every token they read and write, on every step. Pick a model, with its live price, set your own assumptions, and see what a task and a month cost." className="pb-10">
        <AgentCost />
      </Section>
    </>
  );
}
