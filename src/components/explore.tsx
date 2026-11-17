"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { skills } from "@/data/skills";
import { ease, Kicker, SplitWords } from "./motion";

/** Landing-page doorway into the per-skill pages (method + lab + demos). */
export function Explore({ inside = {} }: { inside?: Record<string, string> }) {
  return (
    <section id="explore" className="mx-auto max-w-[1240px] px-5 py-28 md:px-10 md:py-36">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-6 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
            <Kicker text="( 07 )  Explore my skills" />
          </p>
          <h2 className="text-[3.2rem] leading-[0.92] font-semibold tracking-[-0.055em] sm:text-[5.2rem]">
            <SplitWords text="Go deeper, skill by skill." serifWords={["skill."]} />
          </h2>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease, delay: 0.3 }}
          className="max-w-xs text-[16px] text-ink-2/65"
        >
          Each skill has its own page: how I work, the projects, and demos you can try.
        </motion.p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((s, i) => {
          const tile = (
            <motion.div
              initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, ease, delay: (i % 3) * 0.08 }}
              className={`group relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-[26px] p-7 transition-transform duration-500 ${
                s.ready ? "bg-ink text-white hover:-translate-y-1.5" : "bg-cream text-ink"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[12px] ${s.ready ? "text-white/50" : "text-ink/40"}`}>0{i + 1}</span>
                {s.ready ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10.5px]">
                    <span className="relative flex h-1.5 w-1.5 text-live">
                      <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
                    </span>
                    lab open
                  </span>
                ) : (
                  <span className="rounded-full border border-ink/10 px-2.5 py-1 font-mono text-[10.5px] text-ink/45">being rebuilt</span>
                )}
              </div>
              <h3 className="mt-auto pt-10 text-[1.9rem] leading-[1.02] font-semibold tracking-[-0.04em]">{s.name}</h3>
              <p className={`mt-2 text-[14.5px] ${s.ready ? "text-white/65" : "text-ink/55"}`}>{s.line}</p>
              {inside[s.slug] && <p className={`mt-3 font-mono text-[11.5px] ${s.ready ? "text-[#7ee2b0]" : "text-ink/50"}`}>{inside[s.slug]}</p>}
              <div className="mt-5 flex items-end justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {s.tags.map((t) => (
                    <span key={t} className={`rounded-full px-2.5 py-1 font-mono text-[10.5px] ${s.ready ? "bg-white/10" : "bg-white/70"}`}>
                      {t}
                    </span>
                  ))}
                </div>
                {s.ready && <ArrowUpRight className="h-6 w-6 shrink-0 transition duration-300 group-hover:rotate-45" />}
              </div>
            </motion.div>
          );
          return s.ready ? (
            <Link key={s.slug} href={`/skills/${s.slug}`} data-cursor="Open" className="block">
              {tile}
            </Link>
          ) : (
            <div key={s.slug}>{tile}</div>
          );
        })}
      </div>
    </section>
  );
}
