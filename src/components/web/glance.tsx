"use client";

import { motion } from "framer-motion";
import { ms, msOr, size, usePageTiming } from "./timing";

/** The hub's opening strip: how this page loaded for the visitor, measured by their own browser. */
export function WebGlance() {
  const t = usePageTiming();
  const stats = [
    { v: t ? ms(t.total) : "…", k: "to load this page, for you" },
    { v: t ? String(t.files) : "…", k: "files your browser fetched" },
    { v: t ? size(t.bytes) : "…", k: "over the network" },
    { v: t ? msOr(t.fcp) : "…", k: "until the first content" },
    { v: t ? t.protocol : "…", k: "the protocol it spoke" },
    { v: t ? String(t.cached) : "…", k: "files from your cache" },
  ];
  return (
    <section id="measured" className="mx-auto mt-12 max-w-[1240px] scroll-mt-8 px-5 md:px-10">
      <div className="relative overflow-hidden rounded-[28px] bg-ink px-5 pt-6 pb-5 text-white sm:px-8 sm:pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-[11px] tracking-[0.18em] text-white/45 uppercase">This page, measured by your browser</p>
          <p className="font-mono text-[11px] text-white/40">{t ? (t.samePage ? "this page" : `your first page in this tab: ${t.url}`) : "waiting for the page to finish loading"}</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s, i) => (
            <motion.div key={s.k} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}>
              <p className="text-[2rem] leading-none font-semibold tracking-[-0.05em] tabular-nums sm:text-[2.4rem]">{s.v}</p>
              <p className="mt-1.5 text-[12.5px] text-white/55">{s.k}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-6 text-[12px] leading-relaxed text-white/45">
          Read from your browser&apos;s Performance API after the page finished loading. Nothing is sent anywhere.{t?.local ? " You are on a local development server, so files are bigger and slower than on the live site." : ""}
        </p>
      </div>
    </section>
  );
}
