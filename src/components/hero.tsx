"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { heroIntro, profile, roles } from "@/data/profile";
import { Character } from "./character";
import { openCvPicker } from "./cv-picker";
import { Magnetic } from "./cursor";
import { ease, RollText, Scramble } from "./motion";
import { useWeatherControl, WeatherChip, WeatherSky } from "./weather";

/** `projects` is the rounded count of things a visitor can open and try, e.g. "30+" (counted in page.tsx). */
export function Hero({ projects }: { projects: string }) {
  const ref = useRef<HTMLElement>(null);
  const { weather, mode, next } = useWeatherControl();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // the scroll cue's highlighter sweeps in once the intro has settled
  const [cueOn, setCueOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setCueOn(true), 2400);
    return () => clearTimeout(id);
  }, []);

  // Presentation-style exit: sky sinks slower, text blurs away, character settles.
  const skyY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const sideBlur = useTransform(scrollYProgress, [0, 0.5], [0, 12]);
  const sideFilter = useTransform(sideBlur, (b) => `blur(${b}px)`);
  const sideOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const leftX = useTransform(scrollYProgress, [0, 0.6], [0, -80]);
  const rightX = useTransform(scrollYProgress, [0, 0.6], [0, 80]);
  const charScale = useTransform(scrollYProgress, [0, 1], [1, 0.82]);
  const charY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section ref={ref} id="home" className="grain relative h-[100svh] min-h-[640px] overflow-hidden">
      <motion.div className="absolute inset-0" style={{ y: skyY }}>
        <WeatherSky weather={weather} />
      </motion.div>

      <div className="relative mx-auto grid h-full max-w-[1320px] grid-rows-[auto_1fr] px-5 pt-28 md:grid-cols-[1fr_minmax(300px,420px)_1fr] md:grid-rows-1 md:items-center md:gap-6 md:px-10 md:pt-0">
        {/* Left — rotating role */}
        <motion.div style={{ x: leftX, opacity: sideOpacity, filter: sideFilter }} className="z-10 md:pb-24">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-3 font-mono text-[12px] tracking-[0.2em] text-ink-2/70 uppercase"
          >
            <Scramble text="Full Stack" />
          </motion.p>
          <RotatingRole />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.9 }}
            className="mt-4 max-w-xs text-[15.5px] leading-relaxed text-ink-2/70 md:hidden"
          >
            {heroIntro.lead} {heroIntro.body}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 1.1 }}
            className="mt-8"
          >
            <div className="flex flex-wrap gap-3">
              <Magnetic>
                {/* leads to the six project hubs (#explore), worded for visitors rather than as "skills" */}
                <a
                  href="#explore"
                  className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-5 py-2.5 text-[14px] font-medium shadow-[0_6px_20px_-10px_rgba(0,0,0,0.25)] backdrop-blur transition hover:bg-white"
                >
                  <span className="relative flex h-1.5 w-1.5 text-live">
                    <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
                  </span>
                  <RollText>{`Try ${projects} live projects`}</RollText>
                </a>
              </Magnetic>
              <Magnetic>
                {/* opens the CV template picker (cv-picker.tsx), same as the round button top right */}
                <button
                  type="button"
                  onClick={() => openCvPicker("hero")}
                  aria-haspopup="dialog"
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.55)] transition hover:bg-ink/85"
                >
                  <Download className="h-4 w-4" strokeWidth={2} />
                  <RollText>Download my CV</RollText>
                </button>
              </Magnetic>
              <Magnetic>
                <a
                  href="#work"
                  className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-white/80 px-5 py-2.5 text-[14px] font-medium shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)] backdrop-blur transition hover:bg-ink hover:text-white"
                >
                  <RollText>See my work</RollText>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Magnetic>
            </div>
            <p className="mt-3.5 max-w-xs text-[13px] leading-snug text-ink-2/60">
              AI that sees and predicts, live dashboards, apps and bots. Open any of them and play.
            </p>
          </motion.div>
        </motion.div>

        {/* Center — character */}
        <motion.div
          style={{ scale: charScale, y: charY }}
          className="relative z-0 row-start-2 flex h-full items-end justify-center self-end md:col-start-2 md:row-start-1"
        >
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease, delay: 0.3 }}
            className="relative w-[300px] sm:w-[340px] md:w-[440px]"
          >
            <Character className="aspect-[400/460] w-full" />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: -8 }}
              transition={{ delay: 1.8, duration: 0.6, ease }}
              className="pointer-events-none absolute top-[6%] -right-[18%] hidden items-start gap-1 font-hand text-[26px] leading-none text-ink-2 sm:flex"
            >
              <svg width="46" height="40" viewBox="0 0 46 40" className="mt-4 -scale-x-100" fill="none">
                <motion.path
                  d="M2 4 C 18 4, 34 14, 38 34 M38 34 L 30 28 M38 34 L 42 25"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 2.1, duration: 0.8 }}
                />
              </svg>
              that&apos;s me!
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right — short intro */}
        <motion.div
          style={{ x: rightX, opacity: sideOpacity, filter: sideFilter }}
          className="z-10 hidden max-w-[300px] justify-self-end md:block md:pb-24"
        >
          {[
            { t: heroIntro.hello, c: "text-muted" },
            { t: heroIntro.lead, c: "text-ink font-medium mt-4 text-[18px]" },
            { t: heroIntro.body, c: "text-ink-2/70 mt-2" },
            { t: heroIntro.sub, c: "text-ink-2/70 mt-4" },
          ].map((l, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, ease, delay: 0.9 + i * 0.15 }}
              className={`text-[15.5px] leading-relaxed ${l.c}`}
            >
              {l.t}
            </motion.p>
          ))}
        </motion.div>
      </div>

      {/* bottom bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8, ease }}
        className="absolute inset-x-0 bottom-5 z-20 mx-auto flex max-w-[1320px] items-center justify-between px-5 md:bottom-7 md:px-10"
      >
        <WeatherChip weather={weather} mode={mode} onNext={next} />
        <div className="relative hidden items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-ink uppercase sm:flex">
          {/* a handwritten nudge, like "that's me!", pointing at the scroll cue */}
          <motion.div
            initial={{ opacity: 0, y: 8, rotate: -7 }}
            animate={{ opacity: 1, y: 0, rotate: -7 }}
            transition={{ delay: 2.6, duration: 0.6, ease }}
            className="pointer-events-none absolute right-5 bottom-full mb-1 flex items-start gap-0.5 font-hand text-[25px] leading-none tracking-normal whitespace-nowrap text-ink-2 normal-case"
          >
            scroll down
            <motion.svg width="34" height="46" viewBox="0 0 34 46" fill="none" className="mt-3" animate={{ y: [0, 3, 0] }} transition={{ delay: 3.6, duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
              <motion.path
                d="M3 4 C 20 4, 30 16, 24 40 M24 40 L 17 33 M24 40 L 30 32"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 2.9, duration: 0.8 }}
              />
            </motion.svg>
          </motion.div>
          <span className="kicker-mark" data-on={cueOn ? "true" : "false"}>
            Scroll
          </span>
          <span className="relative h-10 w-px overflow-hidden bg-ink/15">
            <motion.span
              className="absolute inset-x-0 h-4 bg-live"
              animate={{ y: [-16, 40] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
        </div>
      </motion.div>
    </section>
  );
}

function RotatingRole() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % roles.length), 3200);
    return () => clearInterval(id);
  }, []);
  const words = roles[i].split(" ");

  return (
    <h1 className="relative min-h-[2.1em] text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.04em] text-ink sm:text-[3.2rem] lg:text-[3.6rem]">
      {/* what search engines and screen readers get; the animated words below are decoration */}
      <span className="sr-only">
        {profile.name}: Full Stack {roles.join(", ")}
      </span>
      <AnimatePresence mode="wait">
        <motion.span key={i} aria-hidden className="block">
          {words.map((w, wi) => (
            <motion.span
              key={wi}
              className="mr-[0.22em] inline-block"
              initial={{ opacity: 0, y: 18, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -14, filter: "blur(12px)" }}
              transition={{ duration: 0.42, ease, delay: wi * 0.06 }}
            >
              {w}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </h1>
  );
}
