"use client";

import { useState } from "react";
import type { Flow } from "@/data/web-flows";
import { CREATE_WORKFLOW_TOOL, buildSystemPrompt } from "@/lib/workflow/ai";
import { FlowPlayer } from "../../web/concepts/flow";

/* How the prompt-to-automation demo works, and exactly what the model is given (imported from the same module the
 * server route uses, so this is the real prompt and tool, not a copy). */
const FLOW: Flow = {
  nodes: [
    { id: "you", x: 46, y: 40, label: "You", icon: "user", sub: "describe a task" },
    { id: "route", x: 160, y: 40, label: "Server route", icon: "server", sub: "key + limits", tone: "dark" },
    { id: "or", x: 272, y: 40, label: "OpenRouter", icon: "cloud", sub: "the model you pick" },
    { id: "check", x: 160, y: 115, label: "Validator", icon: "shield", sub: "known steps only" },
    { id: "page", x: 46, y: 115, label: "This page", icon: "browser", sub: "runs it" },
  ],
  steps: [
    { from: "you", to: "route", tag: "your words", say: "Your description goes to this site's server, never straight to the model.", tone: "req" },
    { from: "route", to: "or", tag: "+ key, tool", say: "The server adds the secret key, the instructions and one tool: create_workflow.", tone: "req", payload: '{ "tools": [create_workflow], "tool_choice": { "function": { "name": "create_workflow" } } }' },
    { from: "or", to: "route", tag: "tool call", say: "The model answers by calling the tool, with a whole workflow as its arguments.", tone: "res" },
    { from: "route", to: "check", tag: "untrusted JSON", say: "Model output is untrusted: unknown steps are dropped, values clamped, ids reassigned.", tone: "data" },
    { from: "check", to: "page", tag: "workflow", say: "A clean workflow reaches the page…", tone: "ok" },
    { from: "page", to: "page", tag: "run", say: "…which runs it in your browser: real public data, simulated messages, approvals by you.", tone: "ok" },
  ],
};

export function HowItWorks() {
  return <FlowPlayer flow={FLOW} />;
}

export function ModelBrief() {
  const [tab, setTab] = useState<"prompt" | "tool">("prompt");
  const text = tab === "prompt" ? buildSystemPrompt() : JSON.stringify(CREATE_WORKFLOW_TOOL, null, 2);
  return (
    <div className="rounded-[22px] border border-line bg-white p-3 sm:p-4">
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {(
          [
            ["prompt", "The instructions (system prompt)"],
            ["tool", "The tool it must call"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${tab === k ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      <pre data-lenis-prevent className="mt-3 max-h-[460px] overflow-auto rounded-2xl bg-ink p-4 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-white/90">{text}</pre>
      <p className="mt-2 px-1 text-[12px] leading-snug text-ink-2/60">Generated from the engine&apos;s own catalogue of steps, so the model is told exactly what the engine can run. Your description is sent as the user message after this.</p>
    </div>
  );
}
