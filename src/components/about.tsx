"use client";

import { motion } from "framer-motion";
import { Award, GraduationCap, Languages } from "lucide-react";
import { credentials, numbers, profile } from "@/data/profile";
import { CountUp, ease, Kicker, Reveal, SplitWords } from "./motion";

export function About() {
  return (
    <section id="about" className="mx-auto max-w-[1240px] px-5 py-28 md:px-10 md:py-36">
      <p className="mb-6 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
        <Kicker text="( 08 )  About" />
      </p>
      <h2 className="max-w-4xl text-[2.6rem] leading-[1] font-semibold tracking-[-0.05em] sm:text-[4.4rem]">
        <SplitWords text="Analyst by training, builder by habit." serifWords={["builder"]} />
      </h2>

      {/* numbers */}
      <div className="mt-16 grid grid-cols-2 border-t border-line md:grid-cols-4">
        {numbers.map((n, i) => (
          <motion.div
            key={n.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.8, ease, delay: i * 0.08 }}
            className={`border-b border-line py-8 pr-4 ${i % 2 === 0 ? "" : "pl-5 md:pl-0"} ${i > 0 ? "md:border-l md:pl-6" : ""} ${i % 2 === 1 ? "border-l md:border-l" : ""}`}
          >
            <p className="text-[3.2rem] leading-none font-semibold tracking-[-0.05em] sm:text-[4.5rem]">
              <CountUp to={n.value} decimals={n.decimals ?? 0} suffix={n.suffix} />
            </p>
            <p className="mt-3 font-mono text-[12px] tracking-wide text-muted uppercase">{n.label}</p>
          </motion.div>
        ))}
      </div>

      {/* bento */}
      <div className="mt-6 grid gap-4 md:grid-cols-6">
        <Reveal className="md:col-span-4">
          <div className="flex h-full flex-col rounded-[26px] bg-cream p-7 sm:p-9">
            <GraduationCap className="h-6 w-6" strokeWidth={1.6} />
            <p className="mt-auto pt-12 font-mono text-[12px] text-ink/50">2020 — 2024 · Jakarta</p>
            <h3 className="mt-2 text-[2rem] leading-tight font-semibold tracking-[-0.04em] sm:text-[2.5rem]">{credentials.education.title}</h3>
            <p className="mt-1 text-[16px] text-ink/60">
              {credentials.education.org} · {credentials.education.note}
            </p>
          </div>
        </Reveal>
        <Reveal className="md:col-span-2" delay={0.08}>
          <div className="flex h-full flex-col rounded-[26px] bg-ink p-7 text-white sm:p-9">
            <Award className="h-6 w-6" strokeWidth={1.6} />
            <div className="mt-auto space-y-4 pt-12">
              {credentials.certs.map((c) => (
                <div key={c.title}>
                  <p className="text-[17px] font-semibold">{c.title}</p>
                  <p className="font-mono text-[12px] text-white/50">
                    {c.org} · valid to {c.until}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal className="md:col-span-2" delay={0.05}>
          <div className="flex h-full flex-col rounded-[26px] border border-line bg-white p-7 sm:p-9">
            <Languages className="h-6 w-6" strokeWidth={1.6} />
            <p className="mt-auto pt-10 text-[17px] font-semibold">Bilingual</p>
            <p className="mt-1 text-[14px] text-ink/60">{credentials.languages}</p>
          </div>
        </Reveal>
        <Reveal className="md:col-span-4" delay={0.1}>
          <div className="flex h-full flex-col rounded-[26px] bg-cream-2 p-7 sm:p-9">
            <p className="font-mono text-[12px] text-ink/50">Always learning</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-10">
              {credentials.courses.map((c) => (
                <span key={c} className="rounded-full bg-white/70 px-4 py-2 text-[14px] font-medium">
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-5 text-[14px] text-ink/55">Based in {profile.city}, working across Indonesia.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
