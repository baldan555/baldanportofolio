"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { AUTO_TASKS, type AutoTool } from "@/data/auto-tools";
import type { Logo } from "../../web/logos";
import { Section, ToolLogo } from "../../web/tools/shared";

/** The same automation job written in several tools: pick a job, then a tool, and compare. */
export function AutoSameTask({ tools, logos }: { tools: AutoTool[]; logos: Record<string, Logo> }) {
  const [task, setTask] = useState(AUTO_TASKS[0].id);
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const T = AUTO_TASKS.find((x) => x.id === task) ?? AUTO_TASKS[0];
  const sn = T.snippets[Math.min(i, T.snippets.length - 1)];
  const byId = new Map(tools.map((t) => [t.id, t]));
  const lines = sn.code.split("\n").length;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sn.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: nothing to do
    }
  };
  return (
    <Section id="same-task" kicker="02 · Same task" title="One job, written in many tools." line="The best way to see the difference between tools is the same job done in each. Pick a job, then flip between tools: the code, the steps and the trade-offs change; the result doesn't.">
      <div className="grid gap-2 md:grid-cols-3">
        {AUTO_TASKS.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={x.id === task}
            onClick={() => {
              setTask(x.id);
              setI(0);
            }}
            className={`rounded-2xl p-4 text-left transition ${x.id === task ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}
          >
            <p className="text-[15px] font-semibold">{x.title}</p>
            <p className={`mt-1 text-[12.5px] leading-snug ${x.id === task ? "text-white/65" : "text-ink-2/60"}`}>{x.ask}</p>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-[24px] border border-line bg-white p-3 sm:p-4">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Tool">
          {T.snippets.map((s, k) => {
            const tool = byId.get(s.tool);
            return (
              <button key={`${s.tool}-${s.file}`} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={`flex items-center gap-1.5 rounded-xl border py-1 pr-3 pl-1 text-[12.5px] transition ${k === i ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40"}`}>
                {tool && <ToolLogo t={tool} logos={logos} size={13} light={k === i} />}
                {tool?.name ?? s.tool}
              </button>
            );
          })}
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-ink">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
            <p className="truncate font-mono text-[11.5px] text-white/60">{sn.file}</p>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-[10.5px] text-white/40">{lines} lines</span>
              <button type="button" onClick={copy} className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/10">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <pre data-lenis-prevent className="max-h-[440px] overflow-auto p-4 font-mono text-[12px] leading-relaxed text-white/90">
            <code>{sn.code}</code>
          </pre>
        </div>
        {sn.note && <p className="mt-2.5 px-1 text-[12.5px] leading-snug text-ink-2/65">{sn.note}</p>}
      </div>
    </Section>
  );
}
