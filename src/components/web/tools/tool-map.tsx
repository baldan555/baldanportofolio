"use client";

import { useState } from "react";
import { LAYERS, RATING_LABELS, type WebTool } from "@/data/web-tools";
import type { Logo } from "../logos";
import { Section, ToolLogo, big, type Downloads } from "./shared";

/** Every tool, layer by layer: tiles you can click, my own stack marked, and a detail card for the selected one. */
export function ToolMap({ tools, logos, downloads }: { tools: WebTool[]; logos: Record<string, Logo>; downloads: Downloads | "error" }) {
  const [sel, setSel] = useState("next");
  const [mineOnly, setMineOnly] = useState(false);
  const t = tools.find((x) => x.id === sel) ?? tools[0];
  const dl = downloads && downloads !== "error" && t.npm ? downloads.counts[t.npm] : undefined;
  const mine = tools.filter((x) => x.mine).length;
  return (
    <Section
      id="map"
      kicker="01 · The map"
      title={`${tools.length} tools, eight layers.`}
      line={`Every layer of a web, SaaS or mobile product and the tools people actually choose for it. The ${mine} marked with a dot are the ones I build with. Click any tool.`}
    >
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter">
        {[
          [false, "All tools"],
          [true, "My stack only"],
        ].map(([v, label]) => (
          <button key={label as string} type="button" aria-pressed={mineOnly === v} onClick={() => setMineOnly(v as boolean)} className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${mineOnly === v ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink"}`}>
            {label as string}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          {LAYERS.map((L) => {
            const row = tools.filter((x) => x.layer === L.id);
            return (
              <div key={L.id} className="rounded-[20px] border border-line bg-white p-3 sm:p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-[14px] font-semibold">{L.id}</p>
                  <p className="text-[11.5px] text-ink-2/55">{L.what}</p>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {row.map((x) => {
                    const dim = mineOnly && !x.mine;
                    return (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => setSel(x.id)}
                        aria-pressed={sel === x.id}
                        className={`relative flex items-center gap-2 rounded-xl border py-1 pr-3 pl-1 text-[12.5px] transition ${sel === x.id ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/40"} ${dim ? "opacity-25" : ""}`}
                      >
                        <ToolLogo t={x} logos={logos} size={14} light={sel === x.id} />
                        {x.name}
                        {x.mine && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#eb6834]" title="I build with this" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="rounded-[24px] bg-ink p-5 text-white sm:p-6">
            <div className="flex items-start gap-3">
              <ToolLogo t={t} logos={logos} size={28} light />
              <div className="min-w-0">
                <p className="text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">{t.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-white/50">
                  {t.layer} · {t.lang}
                  {t.mine ? " · I build with it" : ""}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[14.5px] leading-relaxed text-white/85">{t.what}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl bg-white/[0.07] p-3">
                <p className="text-[11px] font-semibold text-[#7ee2b0]">Strong at</p>
                <p className="mt-1 text-[13px] leading-snug text-white/80">{t.strong}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.07] p-3">
                <p className="text-[11px] font-semibold text-[#ff9b72]">Watch out</p>
                <p className="mt-1 text-[13px] leading-snug text-white/80">{t.weak}</p>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-white/70">
              <span className="font-semibold text-white">Pick it for </span>
              {t.when.charAt(0).toLowerCase() + t.when.slice(1)}
            </p>
            <div className="mt-4 space-y-1.5">
              {RATING_LABELS.map(([k, label]) => (
                <div key={k} className="grid grid-cols-[7.5rem_1fr] items-center gap-2 text-[11.5px]">
                  <span className="text-white/60">{label}</span>
                  <span className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <i key={i} className="h-2 flex-1 rounded-full" style={{ background: i <= t.ratings[k] ? "#eb6834" : "rgba(255,255,255,0.12)" }} />
                    ))}
                  </span>
                </div>
              ))}
              <p className="pt-1 text-[10.5px] text-white/40">Ratings: my rule of thumb, not a benchmark.</p>
            </div>
            <div className="mt-4 rounded-2xl bg-white/[0.07] px-3 py-2.5 text-[12.5px]">
              {t.npm ? (
                downloads === "error" ? (
                  <span className="text-white/60">npm downloads could not be loaded right now.</span>
                ) : dl != null ? (
                  <span>
                    <span className="text-[1.2rem] font-semibold tabular-nums">{big(dl)}</span> <span className="text-white/60">npm downloads last week (live), package </span>
                    <span className="font-mono text-white/80">{t.npm}</span>
                  </span>
                ) : (
                  <span className="text-white/60">fetching npm downloads…</span>
                )
              ) : (
                <span className="text-white/60">Not distributed through npm, so no live download count.</span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </Section>
  );
}
