"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { processAppliesTo, processSteps } from "@/data/profile";
import { ease, Kicker, SplitWords } from "./motion";
import { ProcessScene } from "./process-scenes";

/**
 * "How I ship": one flow behind every model, product and bot.
 * Pinned: as you scroll, the mini character acts out Listen → Prototype → Ship → Keep improving on the stage,
 * and the step list beside it checks off its points.
 */
export function Process() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [col, setCol] = useState(-1);
  const head = useTransform(scrollYProgress, [0.05, 0.9], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const c = p < 0.05 ? -1 : Math.min(processSteps.length - 1, Math.floor(((p - 0.05) / 0.85) * processSteps.length));
    setCol((prev) => (prev === c ? prev : c));
  });

  const step = Math.max(0, col);
  const current = processSteps[step];

  return (
    <section id="process" ref={ref} className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="mx-auto w-full max-w-[1240px] px-5 pt-14 md:px-10 md:pt-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mb-4 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
                <Kicker text="( 04 )  How I ship" />
              </p>
              <h2 className="text-[2.4rem] leading-[0.95] font-semibold tracking-[-0.05em] sm:text-[3.8rem]">
                <SplitWords text="From problem to production." serifWords={["production."]} />
              </h2>
              <p className="mt-3 max-w-md text-[16px] text-ink-2/65">The same four steps, whatever I&apos;m building.</p>
            </div>

            {/* what the flow applies to */}
            <div className="hidden sm:block">
              <p className="mb-2 font-mono text-[10.5px] tracking-[0.18em] text-muted uppercase">Same flow for</p>
              <div className="flex flex-col gap-1.5">
                {processAppliesTo.map((s, i) => (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease, delay: 0.1 + i * 0.08 }}
                    className="flex items-center gap-2.5 rounded-full border border-ink/[0.07] bg-white px-3.5 py-1.5"
                  >
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ink">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                    </span>
                    <span className="text-[12.5px] font-medium whitespace-nowrap">{s}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-[1.25fr_1fr] md:gap-5">
            {/* the stage */}
            <div className="relative aspect-[44/30] overflow-hidden rounded-[28px] bg-cream">
              <div className="absolute inset-0 [background-image:radial-gradient(rgba(0,0,0,0.07)_1px,transparent_1px)] [background-size:20px_20px]" />
              <div className="absolute inset-x-3 top-3 bottom-6 sm:inset-x-6 sm:top-5 sm:bottom-8">
                <ProcessScene step={step} />
              </div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={step}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.35, ease }}
                  className="absolute top-3 left-3 rounded-full bg-ink px-3 py-1 font-mono text-[11px] text-white sm:top-5 sm:left-5"
                >
                  0{step + 1} · {current.title}
                </motion.span>
              </AnimatePresence>
              {/* playhead */}
              <div className="absolute inset-x-5 bottom-3 h-[3px] rounded-full bg-ink/10 sm:inset-x-7 sm:bottom-4">
                <motion.div className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: head }} />
                <motion.span className="absolute -top-[5px] h-[13px] w-[13px] -translate-x-1/2 rounded-full border-[3px] border-ink bg-white" style={{ left: head }} />
              </div>
            </div>

            {/* the steps: all four from md up */}
            <ol className="hidden flex-col gap-2.5 md:flex">
              {processSteps.map((r, ci) => {
                const on = ci <= col;
                const now = ci === col;
                return (
                  <motion.li
                    key={r.title}
                    animate={{ x: now ? -6 : 0 }}
                    transition={{ duration: 0.5, ease }}
                    className={`flex-1 rounded-2xl p-4 transition-colors duration-500 ${now ? "bg-ink text-white shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)]" : on ? "bg-white" : "bg-white/50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-[11px] ${now ? "text-white/55" : "text-ink/35"}`}>0{ci + 1}</span>
                      <p className={`text-[16px] font-semibold ${on ? "" : "text-ink/35"}`}>{r.title}</p>
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 pl-7">
                      {r.items.map((it, ii) => (
                        <li key={it} className="flex items-center gap-1.5">
                          <motion.span
                            initial={false}
                            animate={{ scale: on ? 1 : 0.6, backgroundColor: on ? (now ? "#ffffff" : "#0b0b0b") : "rgba(11,11,11,0.08)" }}
                            transition={{ delay: now ? 0.15 + ii * 0.18 : 0, type: "spring", stiffness: 380, damping: 20 }}
                            className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full"
                          >
                            {on && <Check className={`h-2 w-2 ${now ? "text-ink" : "text-white"}`} strokeWidth={4} />}
                          </motion.span>
                          <span className={`text-[12.5px] leading-snug ${on ? "" : "opacity-40"}`}>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.li>
                );
              })}
            </ol>

            {/* phones: just the step on stage */}
            <div className="md:hidden">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease }} className="rounded-2xl bg-ink p-4 text-white">
                  <div className="flex items-center justify-between">
                    <p className="text-[16px] font-semibold">{current.title}</p>
                    <span className="flex gap-1">
                      {processSteps.map((_, i) => (
                        <span key={i} className={`h-1.5 w-4 rounded-full ${i <= step ? "bg-white" : "bg-white/25"}`} />
                      ))}
                    </span>
                  </div>
                  <ul className="mt-2.5 space-y-1.5">
                    {current.items.map((it) => (
                      <li key={it} className="flex items-center gap-2 text-[13.5px]">
                        <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} /> {it}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
