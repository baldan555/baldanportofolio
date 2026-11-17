"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { statement, workedWith } from "@/data/profile";
import { Kicker, ScrollWords } from "./motion";

/* ---------------- 1. Statement: words light up as you scroll ---------------- */

export function Statement() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const words = useTransform(scrollYProgress, [0.05, 0.8], [0, 1]);
  const labelOpacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);

  return (
    <section id="story" ref={ref} className="relative h-[230vh]">
      <div className="sticky top-0 flex h-[100svh] items-center">
        <div className="mx-auto w-full max-w-[1180px] px-5 md:px-10">
          <motion.p style={{ opacity: labelOpacity }} className="mb-8 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
            <Kicker text="( 01 )  What I do" />
          </motion.p>
          <ScrollWords
            text={statement}
            progress={words}
            className="text-[2.1rem] leading-[1.12] font-medium tracking-[-0.035em] text-ink sm:text-5xl lg:text-[4.1rem]"
          />
        </div>
      </div>
    </section>
  );
}

/* ---------------- 2. Worked with: big muted names drifting ---------------- */

export function WorkedWith() {
  return (
    <section className="border-y border-line py-14">
      <p className="mx-auto mb-8 max-w-[1180px] px-5 text-[15px] text-muted md:px-10">Led data work at</p>
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="animate-marquee flex w-max items-center gap-14 pr-14">
          {[...workedWith, ...workedWith].map((n, i) => (
            <span
              key={i}
              className="text-[2rem] font-semibold tracking-[-0.03em] whitespace-nowrap text-ink/20 transition-colors duration-300 hover:text-ink sm:text-[2.6rem]"
            >
              {n}
              <span className="ml-14 inline-block h-2 w-2 -translate-y-2 rounded-full bg-ink/15 align-middle" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
