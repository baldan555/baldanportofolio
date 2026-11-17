import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { PromptBuilder } from "@/components/automation/prompt/builder";
import { HowItWorks, ModelBrief } from "@/components/automation/prompt/explain";
import { Section } from "@/components/web/tools/shared";

export const metadata: Metadata = {
  title: "Prompt → automation — Automation & AI Agents — Baldanullah",
  description: "Describe a task in plain words and an AI model (through OpenRouter) turns it into a workflow: triggers, live data, branches, loops, approvals and messages, which then runs in your browser. With the exact prompt and tool the model gets, and how the key and costs are kept safe.",
};

export default function PromptPage() {
  return (
    <>
      <Header kicker="Automation & AI Agents · Prompt → automation" title="Describe a task. Get an automation." line="Write what you want done, in English or Indonesian. A language model turns it into a workflow made of the same steps as the Workflow lab, and you can run it right away: live exchange rates, weather, air quality and package data, with branches, loops and approvals. Messages are simulated.">
        <div className="mt-6" />
      </Header>
      <Section id="build" kicker="01 · Try it" title="From a sentence to a running workflow.">
        <PromptBuilder />
      </Section>
      <Section id="how" kicker="02 · How it works" title="Where your words go." line="Six steps, from the text box to a workflow running in your browser. The model only ever proposes; code decides what actually runs.">
        <HowItWorks />
      </Section>
      <Section id="brief" kicker="03 · What the model is told" title="The exact prompt and tool." line="Nothing hidden: these are the instructions and the tool definition sent with every request, read from the same code the server uses." className="pb-10">
        <ModelBrief />
      </Section>
    </>
  );
}
