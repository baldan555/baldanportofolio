"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ease } from "../motion";

export type LabItem = {
  slug: string;
  title: string;
  category: string;
  problem: string;
  method: string;
  metric?: { label: string; value: string };
  status: "live" | "rebuilding";
};

type Filter = string;

/** Filterable, searchable grid of a skill's projects. Live projects link to their case study + demo.
 *  Data comes in as props: importing skills.ts here would ship every model JSON to the browser. */
export function Lab({ projects: mlProjects, categories: mlCategories, skill }: { projects: LabItem[]; categories: string[]; skill: string }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [q, setQ] = useState("");

  const filters: Filter[] = ["All", ...mlCategories.filter((c) => mlProjects.some((p) => p.category === c))];
  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    return mlProjects
      .filter((p) => filter === "All" || p.category === filter)
      .filter((p) => !term || `${p.title} ${p.problem} ${p.method} ${p.category}`.toLowerCase().includes(term))
      .sort((a, b) => (a.status === b.status ? 0 : a.status === "live" ? -1 : 1));
  }, [filter, q, mlProjects]);

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1 rounded-full border border-line bg-white p-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${filter === f ? "text-white" : "text-ink/55 hover:text-ink"}`}
            >
              {filter === f && <motion.span layoutId="lab-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative">{f}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 md:w-72">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted"
          />
        </label>
      </div>

      <motion.div layout className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {items.map((p) => {
            const card = (
              <div
                className={`group flex h-full flex-col rounded-[22px] p-6 transition-all duration-300 ${
                  p.status === "live" ? "border border-ink/10 bg-white hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(0,0,0,0.35)]" : "bg-cream/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted uppercase">{p.category}</span>
                  {p.status === "live" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 font-mono text-[10.5px] text-white">
                      <span className="relative flex h-1.5 w-1.5 text-live">
                        <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
                      </span>
                      live demo
                    </span>
                  ) : (
                    <span className="rounded-full border border-ink/10 px-2.5 py-1 font-mono text-[10.5px] text-ink/50">rebuilding</span>
                  )}
                </div>
                <h3 className={`mt-5 text-[1.35rem] leading-tight font-semibold tracking-[-0.03em] ${p.status === "live" ? "" : "text-ink/70"}`}>{p.title}</h3>
                <p className="mt-1.5 text-[15px] text-ink-2/65">{p.problem}</p>
                <p className="mt-4 text-[13px] text-ink-2/55">{p.method}</p>
                <div className="mt-auto flex items-end justify-between pt-6">
                  {p.metric ? (
                    <div>
                      <p className="text-[1.6rem] leading-none font-semibold tracking-[-0.03em]">{p.metric.value}</p>
                      <p className="mt-1 font-mono text-[10.5px] text-muted uppercase">{p.metric.label}</p>
                    </div>
                  ) : (
                    <p className="font-mono text-[11px] text-ink/40">new version in progress</p>
                  )}
                  {p.status === "live" && <ArrowUpRight className="h-5 w-5 transition group-hover:rotate-45" />}
                </div>
              </div>
            );
            return (
              <motion.div
                key={p.slug}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease }}
              >
                {p.status === "live" ? (
                  <Link href={`/skills/${skill}/${p.slug}`} data-cursor="Try it" className="block h-full">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
      {items.length === 0 && <p className="mt-10 text-center text-muted">No project matches “{q}”.</p>}
    </div>
  );
}
