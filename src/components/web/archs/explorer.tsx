"use client";

import { useEffect, useState } from "react";
import { ARCHS, archById, type ArchId } from "@/data/web-archs";
import { TONE, useInView, useSteps } from "../concepts/flow";
import { ArchCanvas } from "./arch-canvas";

/** Other sections ask the gallery to show an architecture with this event (detail = ArchId), then scroll to it. */
export const SELECT_ARCH = "web-arch:select";
export function showArch(id: ArchId) {
  window.dispatchEvent(new CustomEvent(SELECT_ARCH, { detail: id }));
  document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ArchExplorer() {
  const [id, setId] = useState<ArchId>("monolith");
  const [playing, setPlaying] = useState(true);
  const arch = archById(id);
  const [ref, inView] = useInView<HTMLDivElement>();
  const { step, run, go } = useSteps(arch.journey.length, inView && playing);
  const st = Math.min(step, arch.journey.length - 1);
  const hop = arch.journey[st];
  const pick = (next: ArchId) => {
    setId(next);
    go(0);
  };
  useEffect(() => {
    const on = (e: Event) => {
      setId((e as CustomEvent<ArchId>).detail);
      setPlaying(true);
    };
    window.addEventListener(SELECT_ARCH, on);
    return () => window.removeEventListener(SELECT_ARCH, on);
  }, []);
  const net = arch.journey.filter((h) => h.net && !h.side).length;
  const local = arch.journey.filter((h) => !h.net).length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label="Architecture">
        {ARCHS.map((a, i) => (
          <button key={a.id} type="button" role="tab" aria-selected={a.id === id} onClick={() => pick(a.id)} className={`rounded-2xl px-3.5 py-2.5 text-left transition ${a.id === id ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}>
            <span className={`font-mono text-[10.5px] ${a.id === id ? "text-white/50" : "text-muted"}`}>0{i + 1}</span>
            <span className="block text-[14.5px] leading-tight font-semibold tracking-[-0.01em]">{a.name}</span>
            <span className={`block text-[11px] ${a.id === id ? "text-white/55" : "text-ink-2/50"}`}>{a.deploys}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div ref={ref} className="min-w-0 rounded-[24px] border border-line bg-white p-3">
          <div className="overflow-x-auto rounded-[16px] bg-[#fbfaf7]">
            <div className="min-w-[560px]">
              <ArchCanvas arch={arch} hop={hop} run={run} />
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-start gap-2 px-1">
            <span className="mt-[2px] shrink-0 rounded-full px-2 py-[1px] font-mono text-[10px] font-bold text-white" style={{ background: TONE[hop.tone ?? "req"] }}>
              {st + 1}/{arch.journey.length}
            </span>
            <p className="min-h-[2.6em] min-w-0 flex-1 text-[13px] leading-snug text-ink-2/75">{hop.say}</p>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" aria-label="Previous step" disabled={st === 0} onClick={() => {
                  setPlaying(false);
                  go(st - 1);
                }} className="rounded-full px-2.5 py-1 text-[12px] ring-1 ring-line disabled:opacity-30">
                ←
              </button>
              <button type="button" onClick={() => setPlaying((p) => !p)} className="rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-white">
                {playing ? "Pause" : "Play"}
              </button>
              <button type="button" aria-label="Next step" disabled={st === arch.journey.length - 1} onClick={() => {
                  setPlaying(false);
                  go(st + 1);
                }} className="rounded-full px-2.5 py-1 text-[12px] ring-1 ring-line disabled:opacity-30">
                →
              </button>
            </div>
          </div>
          <p className="mt-1 px-1 text-[11px] text-ink-2/45 sm:hidden">Swipe the drawing sideways to see all of it.</p>
        </div>
        <div className="flex min-w-0 flex-col rounded-[24px] bg-ink p-5 text-white">
          <p className="font-mono text-[10.5px] tracking-[0.16em] text-white/45 uppercase">One order, followed</p>
          <h3 className="mt-1 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">{arch.name}</h3>
          <p className="mt-1.5 text-[13px] leading-snug text-white/65">{arch.tagline}</p>
          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {(
              [
                ["You deploy", arch.deploys],
                ["Databases", arch.dbs],
                ["Network hops", `${net}${local ? ` + ${local} in-process` : ""}`],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/[0.07] px-2.5 py-2">
                <p className="text-[10px] text-white/45">{k}</p>
                <p className="mt-0.5 text-[12.5px] leading-tight font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <ol className="mt-3 space-y-0.5">
            {arch.journey.map((h, i) => (
              <li key={`${h.from}-${h.to}-${h.tag}`}>
                <button type="button" onClick={() => {
                    setPlaying(false);
                    go(i);
                  }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition ${i === st ? "bg-white/[0.12]" : "hover:bg-white/[0.05]"}`}>
                  <span className="shrink-0 rounded-full px-1.5 py-[1px] font-mono text-[10px] font-bold" style={h.net ? { background: TONE[h.tone ?? "req"], color: "#fff", opacity: i === st ? 1 : 0.6 } : { border: `1px dashed ${TONE[h.tone ?? "req"]}`, color: TONE[h.tone ?? "req"] }}>
                    {h.tag}
                  </span>
                  <span className={`truncate text-[11.5px] ${i === st ? "text-white" : "text-white/50"}`}>
                    {arch.parts[h.from]?.label} → {arch.parts[h.to]?.label}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[9.5px] text-white/35">{h.side ? "later" : h.net ? "network" : "in-process"}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-line bg-white p-4">
          <p className="text-[12px] font-semibold" style={{ color: "#0f6e4c" }}>
            Good for
          </p>
          <ul className="mt-1.5 space-y-1 text-[13px] leading-snug">
            {arch.best.map((x) => (
              <li key={x}>✓ {x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[22px] border border-line bg-white p-4">
          <p className="text-[12px] font-semibold" style={{ color: "#a3302e" }}>
            Watch out for
          </p>
          <ul className="mt-1.5 space-y-1 text-[13px] leading-snug">
            {arch.watch.map((x) => (
              <li key={x}>! {x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[22px] border border-line bg-white p-4">
          <p className="text-[12px] font-semibold">Often built with</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {arch.stack.map((x) => (
              <span key={x} className="rounded-full bg-cream px-2.5 py-1 text-[12px]">
                {x}
              </span>
            ))}
          </div>
          {arch.real && <p className="mt-3 rounded-xl bg-[#eaf8f1] px-3 py-2 text-[12px] leading-snug text-[#0f6e4c]">{arch.real}</p>}
        </div>
      </div>
    </div>
  );
}
