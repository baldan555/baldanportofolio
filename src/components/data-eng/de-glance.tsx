"use client";

import { motion } from "framer-motion";
import C from "@/data/de-catalog.json";
import P from "@/data/de-pipeline.json";

/** The hub's opening strip: the pipeline below in six real numbers, with data flowing underneath. */
const n0 = (v: number) => v.toLocaleString("en-US");
const measured = C.pipelines.filter((p) => p.seconds != null);
const seconds = measured.reduce((a, p) => a + (p.seconds as number), 0);
const inBytes = [...new Map(measured.flatMap((p) => p.inputs).map((i) => [i.file, i.bytes ?? 0])).values()].reduce((a, b) => a + b, 0);
const outBytes = measured.flatMap((p) => p.outputs).reduce((a, o) => a + (o.bytes ?? 0), 0);
const mb = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

const STATS = [
  { v: String(P.requests), k: "API requests" },
  { v: n0(P.raw.slots), k: "hourly slots landed" },
  { v: String(P.checks.length), k: "checks on every load" },
  { v: n0(P.silver.rows), k: "clean hours kept" },
  { v: n0(P.gold.days), k: "daily averages" },
  { v: String(P.serve.files.length), k: "pages fed" },
];

export function DeGlance() {
  return (
    <section id="numbers" className="mx-auto mt-12 max-w-[1240px] scroll-mt-8 px-5 md:px-10">
      <div className="relative overflow-hidden rounded-[28px] bg-ink px-5 pt-6 pb-5 text-white sm:px-8 sm:pt-8">
        <p className="font-mono text-[11px] tracking-[0.18em] text-white/45 uppercase">The pipeline on this page, in numbers</p>
        <div className="relative mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {STATS.map((s, i) => (
            <motion.div key={s.k} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }} className="relative">
              <p className="text-[2.2rem] leading-none font-semibold tracking-[-0.05em] tabular-nums sm:text-[2.6rem]">{s.v}</p>
              <p className="mt-1.5 text-[12.5px] text-white/55">{s.k}</p>
              {i < STATS.length - 1 && <span className="absolute top-3 -right-1 hidden font-mono text-[14px] text-white/25 lg:block">→</span>}
            </motion.div>
          ))}
        </div>
        {/* data flowing left to right under the numbers */}
        <svg viewBox="0 0 1000 24" preserveAspectRatio="none" className="mt-6 block h-6 w-full" aria-hidden>
          <line x1="0" y1="12" x2="1000" y2="12" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} y="9" width="10" height="6" rx="3" fill={i % 4 === 0 ? "#eb6834" : i % 3 === 0 ? "#1baf7a" : "rgba(255,255,255,0.7)"}>
              <animate attributeName="x" from="-20" to="1000" dur="6s" begin={`-${(i * 6) / 9}s`} repeatCount="indefinite" />
            </rect>
          ))}
        </svg>
        <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
          {[`${C.pipelines.length} pipelines behind this site`, `${seconds.toFixed(1)} s to rebuild the batch ones`, `${mb(inBytes)} raw → ${mb(outBytes)} served`].map((t) => (
            <span key={t} className="rounded-full bg-white/[0.08] px-3 py-1 text-white/70">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
