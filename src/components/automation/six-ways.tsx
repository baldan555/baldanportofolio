"use client";

import { useState } from "react";
import { WAYS, WAY_SPEC, wayById, type WayId } from "@/data/auto-ways";
import { TONE, useInView, useSteps } from "../web/concepts/flow";
import { ArchCanvas } from "../web/archs/arch-canvas";

/* One chore, six ways: the same four steps (download, add up, paste, message) morph from a person's checklist into
 * a script, workflow nodes, a robot's clicks, pipeline tasks and an agent's tools, with one run played through each. */
export function SixWays() {
  const [id, setId] = useState<WayId>("hand");
  const [playing, setPlaying] = useState(true);
  const way = wayById(id);
  const [ref, inView] = useInView<HTMLDivElement>();
  const { step, run, go } = useSteps(way.journey.length, inView && playing);
  const st = Math.min(step, way.journey.length - 1);
  const hop = way.journey[st];
  const pick = (next: WayId) => {
    setId(next);
    go(0);
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5 md:grid-cols-6" role="tablist" aria-label="Way of doing the chore">
        {WAYS.map((w, i) => (
          <button key={w.id} type="button" role="tab" aria-selected={w.id === id} onClick={() => pick(w.id)} className={`rounded-2xl px-3 py-2.5 text-left transition ${w.id === id ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}>
            <span className={`font-mono text-[10.5px] ${w.id === id ? "text-white/50" : "text-muted"}`}>{i === 0 ? "before" : `0${i}`}</span>
            <span className="block text-[13.5px] leading-tight font-semibold tracking-[-0.01em]">{w.name}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div ref={ref} className="min-w-0 rounded-[24px] border border-line bg-white p-3">
          <div className="overflow-x-auto rounded-[16px] bg-[#fbfaf7]">
            <div className="min-w-[560px]">
              <ArchCanvas arch={way} hop={hop} run={run} spec={WAY_SPEC} />
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-start gap-2 px-1">
            <span className="mt-[2px] shrink-0 rounded-full px-2 py-[1px] font-mono text-[10px] font-bold text-white" style={{ background: TONE[hop.tone ?? "req"] }}>
              {st + 1}/{way.journey.length}
            </span>
            <p className="min-h-[2.6em] min-w-0 flex-1 text-[13px] leading-snug text-ink-2/75">{hop.say}</p>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous step"
                disabled={st === 0}
                onClick={() => {
                  setPlaying(false);
                  go(st - 1);
                }}
                className="rounded-full px-2.5 py-1 text-[12px] ring-1 ring-line disabled:opacity-30"
              >
                ←
              </button>
              <button type="button" onClick={() => setPlaying((p) => !p)} className="rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-white">
                {playing ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                aria-label="Next step"
                disabled={st === way.journey.length - 1}
                onClick={() => {
                  setPlaying(false);
                  go(st + 1);
                }}
                className="rounded-full px-2.5 py-1 text-[12px] ring-1 ring-line disabled:opacity-30"
              >
                →
              </button>
            </div>
          </div>
          <p className="mt-1 px-1 text-[11px] text-ink-2/45 sm:hidden">Swipe the drawing sideways to see all of it.</p>
        </div>
        <div className="flex min-w-0 flex-col rounded-[24px] bg-ink p-5 text-white">
          <p className="font-mono text-[10.5px] tracking-[0.16em] text-white/45 uppercase">{id === "hand" ? "The chore, before" : "Automated"}</p>
          <h3 className="mt-1 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">{way.name}</h3>
          <p className="mt-1.5 text-[13px] leading-snug text-white/65">{way.tagline}</p>
          <dl className="mt-4 space-y-2">
            {way.facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-2 text-[12.5px] leading-snug">
                <dt className="text-white/45">{k}</dt>
                <dd className={k === "Breaks when" ? "text-[#ffb59a]" : "text-white/90"}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto pt-4">
            <p className="text-[10.5px] text-white/45">Often done with</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {way.tools.map((t) => (
                <span key={t} className="rounded-full bg-white/[0.09] px-2.5 py-1 text-[11.5px]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
