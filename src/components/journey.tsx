"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { journey } from "@/data/profile";
import { JourneyVignette, RailWalker } from "./journey-scenes";
import { Kicker, SplitWords } from "./motion";

/** Vertical scroll drives a horizontal ride through the timeline; each stop shows the mini character in that role, and he walks the rail below. */
export function Journey() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!track.current) return;
      setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const x = useTransform(smooth, [0, 1], [0, -distance]);
  const line = useTransform(smooth, [0, 1], [0, 1]);
  const walker = useTransform(smooth, (v) => `${v * 100}%`);

  return (
    <section id="journey" ref={section} className="relative" style={{ height: `calc(100svh + ${distance}px)` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <motion.div ref={track} style={{ x }} className="flex w-max items-stretch gap-5 pr-[10vw] pl-5 md:pl-10">
          {/* intro panel */}
          <div className="flex w-[78vw] max-w-[520px] flex-col justify-center pr-6 sm:w-[46vw]">
            <p className="mb-6 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
              <Kicker text="( 05 )  Journey" />
            </p>
            <h2 className="text-[3.6rem] leading-[0.92] font-semibold tracking-[-0.055em] sm:text-[6rem]">
              <SplitWords text="Six stops," />
              <br />
              <SplitWords text="one thread." serifWords={["thread."]} delay={0.15} />
            </h2>
            <p className="mt-6 max-w-xs text-[16px] text-ink-2/60">From media analytics to telco operations. Keep scrolling →</p>
          </div>

          {journey.map((j, i) => (
            <article
              key={j.role + j.org}
              className="group relative flex h-[min(64vh,470px)] w-[78vw] max-w-[360px] shrink-0 flex-col rounded-[26px] border border-ink/[0.06] bg-cream p-7 transition-colors duration-500 hover:bg-ink hover:text-white sm:w-[340px]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] opacity-50">0{i + 1}</span>
                {j.current && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-mono text-[10.5px] tracking-wider text-ink uppercase">
                    <span className="relative flex h-1.5 w-1.5 text-live">
                      <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
                    </span>
                    now
                  </span>
                )}
              </div>
              {/* the scene fills the free space, standing on its floor like a small room */}
              <div className="mt-4 flex min-h-0 flex-1 items-end overflow-hidden rounded-2xl bg-white/75 px-2 pt-2">
                <JourneyVignette scene={j.scene} />
              </div>
              <p className="pt-4 font-mono text-[13px] opacity-60">{j.period}</p>
              <h3 className="mt-2 text-[1.6rem] leading-[1.05] font-semibold tracking-[-0.035em]">{j.role}</h3>
              <p className="mt-2 text-[15px] font-medium opacity-70">{j.org}</p>
              <p className="mt-4 border-t border-current/15 pt-3 text-[14px] leading-snug opacity-60">{j.line}</p>
            </article>
          ))}
        </motion.div>

        {/* progress rail, walked by the mini character */}
        <div className="relative mx-5 mt-16 h-px bg-ink/10 md:mx-10">
          <motion.div className="h-px origin-left bg-ink" style={{ scaleX: line }} />
          <motion.div className="absolute bottom-0 -translate-x-1/2" style={{ left: walker }}>
            <RailWalker />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
