"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { METHODS, STAGES, type Stage } from "./methods";

export function MethodLibrary() {
  const [stage, setStage] = useState<Stage | "All">("All");
  const shown = stage === "All" ? METHODS : METHODS.filter((m) => m.stage === stage);
  return (
    <section id="methods" className="mx-auto mt-28 max-w-[1240px] scroll-mt-32 px-5 md:px-10">
      <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">Method library</p>
      <h2 className="max-w-3xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">Every technique between raw data and a trusted table.</h2>
      <p className="mt-3 max-w-2xl text-[15px] text-ink-2/70">
        {METHODS.length} methods used in data teams and databases, each animated. Most run on the real Online Retail rows; the others are marked as examples.
      </p>
      <div className="sticky top-[7.6rem] z-30 -mx-5 mt-6 flex gap-1.5 overflow-x-auto bg-bg/90 px-5 py-3 backdrop-blur md:-mx-10 md:px-10">
        {(["All", ...STAGES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${stage === s ? "border-ink bg-ink text-white" : "border-ink/10 bg-white hover:border-ink/30"}`}
          >
            {s}
            <span className={stage === s ? "text-white/60" : "text-muted"}> {s === "All" ? METHODS.length : METHODS.filter((m) => m.stage === s).length}</span>
          </button>
        ))}
      </div>
      <motion.div layout className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((m) => (
          <motion.article
            layout
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col rounded-[22px] border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{m.stage}</span>
              <span className={`rounded-full px-2 py-0.5 font-mono text-[9.5px] tracking-[0.08em] uppercase ${m.real ? "bg-[#1baf7a]/12 text-[#138a60]" : "bg-ink/5 text-ink/45"}`}>
                {m.real ? "real data" : "example"}
              </span>
            </div>
            <h3 className="mt-1.5 text-[17px] leading-tight font-semibold tracking-[-0.01em]">{m.name}</h3>
            <p className="mt-1 text-[13px] leading-snug text-ink-2/75">{m.what}</p>
            <div className="mt-3 rounded-xl bg-cream/60 p-2.5">
              <m.V />
            </div>
            <ul className="mt-3 list-disc space-y-0.5 pl-4 text-[12.5px] leading-snug text-ink-2/80">
              {m.how.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            {m.sql && (
              <details className="group mt-3">
                <summary className="cursor-pointer list-none font-mono text-[11px] text-ink/60 hover:text-ink">
                  <span className="inline-block transition group-open:rotate-90">▸</span> SQL
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-white/85">{m.sql}</pre>
              </details>
            )}
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
