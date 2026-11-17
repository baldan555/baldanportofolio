"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { BriefcaseBusiness, Download, House, Layers, Network, Route, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { CvPicker, openCvPicker } from "./cv-picker";
import { Magnetic } from "./cursor";
import { ease, RollText } from "./motion";

const links = [
  { id: "home", label: "Home", icon: House },
  { id: "build", label: "Build", icon: Layers },
  { id: "work", label: "Work", icon: BriefcaseBusiness },
  { id: "journey", label: "Journey", icon: Route },
  { id: "stack", label: "Stack", icon: Network },
  // #explore (the project hubs) has its own glowing button next to the bar instead of an item here
  { id: "about", label: "About", icon: UserRound },
];

const ticks = ["home", "story", "build", "work", "process", "journey", "stack", "explore", "about", "contact"];
// titles beside the ticks, numbered like the section labels on the page
const tickLabels: Record<string, string> = {
  home: "Home",
  story: "01 What I do",
  build: "02 What I build",
  work: "03 Work",
  process: "04 How I ship",
  journey: "05 Journey",
  stack: "06 Toolkit",
  explore: "07 Skills",
  about: "08 About",
  contact: "09 Contact",
};

/** `projects` is the rounded count of live projects, e.g. "30+" (counted in page.tsx, same as the hero button). */
export function Nav({ projects }: { projects: string }) {
  const [active, setActive] = useState("home");
  const [expanded, setExpanded] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    const onScroll = () => setExpanded(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ticks.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <>
      <CvPicker />
      <motion.div className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-ink" style={{ scaleX: progress }} />

      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease, delay: 0.2 }}
        className="fixed inset-x-0 top-4 z-50 flex items-center justify-center gap-1.5 px-2 sm:gap-2 sm:px-3"
      >
        <nav className="flex items-center gap-0.5 rounded-full border border-black/5 bg-white/75 p-1.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          {links.map((l) => {
            const on = active === l.id || (l.id === "home" && active === "story");
            return (
              <a
                key={l.id}
                href={`#${l.id}`}
                aria-label={l.label}
                className={`relative flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium transition-colors sm:px-2.5 ${
                  on ? "text-ink" : "text-ink-2/55 hover:text-ink"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.15)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <l.icon className="relative h-[17px] w-[17px]" strokeWidth={1.7} />
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease }}
                      className="relative hidden overflow-hidden whitespace-nowrap lg:block"
                    >
                      {l.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </a>
            );
          })}
        </nav>

        {/* the spotlight: glowing edge + breathing halo (.spotlight in globals.css); phones show just the count */}
        <Magnetic strength={0.25}>
          <a
            href="#explore"
            aria-label={`Try ${projects} live projects`}
            data-cursor="Play"
            className={`spotlight flex h-[46px] items-center rounded-full p-[2px] sm:h-[50px] ${active === "explore" ? "ring-2 ring-ink/80 ring-offset-2" : ""}`}
          >
            <span className="flex h-full items-center gap-2 rounded-full bg-white px-2.5 text-[14px] font-medium text-ink sm:px-4">
              <span className="relative hidden h-2 w-2 text-live sm:flex">
                <span className="pulse-ring relative h-2 w-2 rounded-full bg-live" />
              </span>
              <span className="font-semibold tabular-nums">{projects}</span>
              <span className="hidden whitespace-nowrap sm:inline">
                live<span className="hidden lg:inline"> projects</span>
              </span>
            </span>
          </a>
        </Magnetic>

        <Magnetic strength={0.25}>
          <a
            href="#contact"
            aria-label="Let's talk"
            className="flex h-[50px] items-center gap-2.5 rounded-full bg-ink py-1.5 pr-1.5 pl-1.5 text-[14px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] sm:pr-5"
          >
            <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white">
              <motion.span
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              >
                {[0, 120, 240].map((d) => (
                  <span
                    key={d}
                    className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-ink"
                    style={{ transform: `rotate(${d}deg) translate(9px) translate(-50%,-50%)` }}
                  />
                ))}
              </motion.span>
            </span>
            {/* on phones the button is just the round icon, so the whole bar fits a 360 px screen */}
            <span className="hidden sm:inline">
              <RollText>Let&apos;s talk</RollText>
            </span>
          </a>
        </Magnetic>
      </motion.header>

      {/* CV button, top right: opens the template picker (one CV per country format) */}
      <motion.button
        type="button"
        onClick={() => openCvPicker("top_button")}
        aria-label="Download CV"
        aria-haspopup="dialog"
        data-cursor="CV"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.6, ease }}
        className="fixed top-5 right-5 z-50 hidden h-11 w-11 place-items-center rounded-full border border-black/5 bg-white/75 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.2)] backdrop-blur-xl md:grid"
      >
        <Download className="h-4 w-4" strokeWidth={1.8} />
      </motion.button>

      {/* section ticks, left edge, each with its title (short, to stay clear of the content) */}
      <nav aria-label="Sections" className="fixed top-1/2 left-5 z-40 hidden -translate-y-1/2 flex-col gap-1 mix-blend-difference 2xl:flex">
        {ticks.map((t) => {
          const on = active === t;
          return (
            <a key={t} href={`#${t}`} aria-current={on ? "location" : undefined} className="group flex h-5 items-center gap-2.5">
              <motion.span className="block h-px shrink-0 bg-white" animate={{ width: on ? 28 : 12, opacity: on ? 1 : 0.45 }} transition={{ duration: 0.4, ease }} />
              <span
                className={`font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-white uppercase transition-opacity duration-300 group-hover:opacity-100 ${on ? "font-semibold opacity-100" : "opacity-40"}`}
              >
                {tickLabels[t]}
              </span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
