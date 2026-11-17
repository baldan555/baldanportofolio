"use client";

import { useState } from "react";
import { TASKS, type WebTool } from "@/data/web-tools";
import type { Logo } from "../logos";
import { Section, ToolLogo } from "./shared";

/** The same small job written in several tools, with the line count of each and a preview of the result. */
const EXAMPLE_STORES = ["Toko Makmur · Makassar", "Warung Sari · Jakarta", "Kios Jaya · Bandung", "Toko Baru · Surabaya"];

function Preview({ kind }: { kind: "counter" | "json" | "phone" }) {
  const [n, setN] = useState(0);
  if (kind === "counter")
    return (
      <div className="grid h-full min-h-[180px] place-items-center rounded-2xl bg-white">
        <button type="button" onClick={() => setN((x) => x + 1)} className="rounded-xl bg-ink px-5 py-2.5 text-[14px] font-semibold text-white transition active:scale-95">
          Clicked {n} times
        </button>
      </div>
    );
  if (kind === "json")
    return (
      <div className="h-full min-h-[180px] rounded-2xl bg-white p-4 font-mono text-[12px] leading-relaxed">
        <p className="text-ink-2/50">GET /api/stores/12 → 200</p>
        <pre className="mt-1 text-ink">{`{\n  "id": 12,\n  "name": "Toko Makmur",\n  "city": "Makassar"\n}`}</pre>
        <p className="mt-3 text-ink-2/50">GET /api/stores/999 → 404</p>
        <pre className="mt-1 text-[#c8413f]">{`{ "error": "Not found" }`}</pre>
      </div>
    );
  return (
    <div className="grid h-full min-h-[180px] place-items-center rounded-2xl bg-white py-4">
      <div className="w-[170px] rounded-[26px] border-2 border-ink bg-white p-3">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink" />
        <p className="text-[17px] font-semibold">Stores</p>
        <div className="mt-2 divide-y divide-ink/10">
          {EXAMPLE_STORES.map((s) => (
            <p key={s} className="py-2 text-[11.5px]">
              {s}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SameTask({ tools, logos }: { tools: WebTool[]; logos: Record<string, Logo> }) {
  const [ti, setTi] = useState(0);
  const [si, setSi] = useState(0);
  const task = TASKS[ti];
  const snip = task.snippets[Math.min(si, task.snippets.length - 1)];
  const byId = new Map(tools.map((t) => [t.id, t]));
  const lines = (c: string) => c.split("\n").length;
  const maxLines = Math.max(...task.snippets.map((s) => lines(s.code)));
  return (
    <Section id="same-task" kicker="02 · Same task, different tools" title="One job, written in each tool." line="The fastest way to feel the difference between frameworks: the same small task, side by side. The preview is what every version produces.">
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Task">
        {TASKS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={ti === i}
            onClick={() => {
              setTi(i);
              setSi(0);
            }}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${ti === i ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink"}`}
          >
            {t.title}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 overflow-hidden rounded-[24px] bg-ink text-white">
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2">
            {task.snippets.map((s, i) => {
              const t = byId.get(s.tool) as WebTool;
              return (
                <button key={s.tool} type="button" onClick={() => setSi(i)} aria-pressed={si === i} className={`flex shrink-0 items-center gap-2 rounded-xl py-1 pr-3 pl-1 text-[12.5px] transition ${si === i ? "bg-white text-ink" : "text-white/70 hover:bg-white/10"}`}>
                  <ToolLogo t={t} logos={logos} size={13} light={si !== i} />
                  {t.name}
                </button>
              );
            })}
          </div>
          <p className="px-4 pt-3 font-mono text-[11px] text-white/45">
            {snip.file} · {lines(snip.code)} lines
          </p>
          <pre className="overflow-x-auto px-4 pt-2 pb-5 font-mono text-[12px] leading-relaxed text-white/90">{snip.code}</pre>
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-[24px] border border-line bg-cream/60 p-3">
            <p className="mb-2 px-1 text-[12px] font-semibold">
              The result <span className="font-normal text-ink-2/55">· {task.ask}</span>
            </p>
            <Preview kind={task.preview} />
          </div>
          <div className="rounded-[24px] border border-line bg-white p-4">
            <p className="text-[12px] font-semibold">Lines of code for this task</p>
            <div className="mt-2 space-y-1.5">
              {task.snippets.map((s, i) => {
                const t = byId.get(s.tool) as WebTool;
                return (
                  <button key={s.tool} type="button" onClick={() => setSi(i)} className="grid w-full grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-left text-[12px]">
                    <span className={`truncate ${si === i ? "font-semibold" : ""}`}>{t.name}</span>
                    <span className="h-2.5 rounded-full bg-cream">
                      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${(lines(s.code) / maxLines) * 100}%`, background: si === i ? "#eb6834" : t.color }} />
                    </span>
                    <span className="text-right font-mono tabular-nums">{lines(s.code)}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-ink-2/50">Counted from the snippets above. Fewer lines isn&apos;t automatically better: structure pays off as apps grow.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
