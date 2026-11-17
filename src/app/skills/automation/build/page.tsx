import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { AgentApi } from "@/components/automation/build/agent-api";
import { Inspector } from "@/components/automation/build/inspector";
import { McpSteps } from "@/components/automation/build/mcp";
import { ToolLint } from "@/components/automation/build/tool-lint";
import { Section } from "@/components/web/tools/shared";

export const metadata: Metadata = {
  title: "Build an agent — Automation & AI Agents — Baldanullah",
  description: "How to build an AI agent for real: tool calling turn by turn in the exact JSON of the OpenAI-compatible (OpenRouter), Anthropic and Gemini APIs with tools that really run, a tool-definition checker, MCP message by message, and a complete agent API in TypeScript and Python with a launch checklist and an evaluation set.",
};

const PARTS = [
  { href: "#calls", label: "The API calls", note: "turn by turn, three formats" },
  { href: "#tools", label: "Good tools", note: "a definition checker" },
  { href: "#mcp", label: "MCP", note: "message by message" },
  { href: "#api", label: "Your agent API", note: "code, checklist, tests" },
];

export default function BuildAgentPage() {
  return (
    <>
      <Header kicker="Automation & AI Agents · Build an agent" title="Build one: the actual calls." line="No framework magic: the requests and responses an agent really exchanges, how to describe tools so a model uses them well, how MCP connects agents to your systems, and a complete agent behind one API endpoint.">
        <div className="mt-8 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {PARTS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[16px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </Header>
      <Section id="calls" kicker="01 · The API calls" title="Tool calling, turn by turn." line="Pick a question and a format, then step through: what you send, what the model sends back, the tool your code runs (for real, here), and the second round trip. The same five steps in every API; only the JSON differs.">
        <Inspector />
      </Section>
      <Section id="tools" kicker="02 · Good tools" title="Describe tools so the model uses them well." line="The model chooses tools by reading their names, descriptions and parameter schemas, nothing else. Edit a definition and see how it measures up.">
        <ToolLint />
      </Section>
      <Section id="mcp" kicker="03 · MCP" title="The Model Context Protocol, message by message." line="MCP lets you write a tool server once and plug it into any MCP-capable app or agent. Here is a whole session: connect, discover tools, hand them to the model, run a call.">
        <McpSteps />
      </Section>
      <Section id="api" kicker="04 · Your agent API" title="A complete agent behind one endpoint." line="Everything above in about 70 lines: an API route that runs the loop with the key kept on the server, then what to check before putting it online, and how to test it." className="pb-10">
        <AgentApi />
      </Section>
    </>
  );
}
