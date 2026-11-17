import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CaseStudy } from "@/data/skills";
import { getCodeDoc } from "@/lib/code-docs";
import { Reveal, SplitWords } from "../motion";
import { Inside } from "../explainers/inside";
import { INSIDE_SLUGS } from "../explainers/slugs";
import { CodeWalkthrough } from "./code-walkthrough";
import { ProjectBody } from "./project-body";
import { ProcessFlow, SectionTitle } from "./sections";

const nav = [
  { id: "overview", label: "Overview" },
  { id: "how", label: "How it works" },
  { id: "data", label: "Data" },
  { id: "explore", label: "Explore" },
  { id: "try", label: "Try it" },
  { id: "results", label: "Results" },
  { id: "code", label: "Code" },
  { id: "notes", label: "Notes" },
];

export function CaseStudyPage({ study, skill, list }: { study: CaseStudy; skill: { slug: string; name: string }; list: CaseStudy[] }) {
  const i = list.findIndex((c) => c.slug === study.slug);
  const next = list[(i + 1) % list.length];
  const doc = getCodeDoc(study.slug, study.code); // read from the source files at build time
  const inside = INSIDE_SLUGS.includes(study.slug);
  const links = inside ? [...nav.slice(0, 2), { id: "inside", label: "Inside the model" }, ...nav.slice(2)] : nav;

  return (
    <article>
      {/* ---------- header ---------- */}
      <section className="mx-auto max-w-[1240px] px-5 pt-12 md:px-10 md:pt-16">
        <Link href={`/skills/${skill.slug}`} className="group inline-flex items-center gap-2 text-[14px] text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" /> {skill.name} lab
        </Link>
        <p className="mt-10 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">{study.category}</p>
        <h1 className="mt-4 text-[2.8rem] leading-[0.95] font-semibold tracking-[-0.05em] sm:text-[5rem]">
          <SplitWords text={study.title} />
        </h1>
        <Reveal delay={0.15}>
          <p className="mt-5 max-w-xl text-[19px] leading-relaxed text-ink-2/75">{study.line}</p>
        </Reveal>
        <Reveal delay={0.25} className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {study.stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-white px-4 py-4">
              <p className="text-[1.7rem] leading-none font-semibold tracking-[-0.04em] sm:text-[2rem]">{s.value}</p>
              <p className="mt-2 font-mono text-[11px] text-muted uppercase">{s.label}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ---------- in-page nav ---------- */}
      <nav className="sticky top-16 z-40 mt-12 border-y border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto px-5 py-2 md:px-10">
          {links.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap text-ink/60 transition-colors hover:bg-ink hover:text-white">
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ---------- overview ---------- */}
      <section id="overview" className="mx-auto mt-20 max-w-[1240px] scroll-mt-32 px-5 md:px-10">
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <p className="font-mono text-[12px] tracking-[0.2em] text-muted uppercase md:pt-2">Overview</p>
          <Reveal className="max-w-3xl space-y-5">
            {study.overview.map((p, n) => (
              <p key={n} className={n === 0 ? "text-[1.45rem] leading-[1.45] font-medium tracking-[-0.015em] sm:text-[1.7rem]" : "text-[17px] leading-relaxed text-ink-2/75"}>
                {p}
              </p>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="how" className="mx-auto mt-24 max-w-[1240px] scroll-mt-32 px-5 md:px-10">
        <SectionTitle kicker="How it works" title="From raw file to prediction." line="Every number below comes from the training run." />
        <ProcessFlow steps={study.process} />
      </section>

      {/* ---------- project-specific: data, explore, try it, results ---------- */}
      <Inside slug={study.slug} />
      <ProjectBody slug={study.slug} />

      {/* ---------- build notes: the real code, step by step ---------- */}
      {doc && <CodeWalkthrough doc={doc} dataSource={study.data.source} />}

      {/* ---------- notes ---------- */}
      <section id="notes" className="mx-auto mt-24 max-w-[1240px] scroll-mt-32 px-5 md:px-10">
        <SectionTitle kicker="Notes" title="The decisions behind it." />
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal className="rounded-2xl border border-line bg-white p-6">
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Approach</p>
            <ol className="mt-4 space-y-4">
              {study.approach.map((a, n) => (
                <li key={n} className="flex gap-4">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink font-mono text-[11px] text-white">{n + 1}</span>
                  <p className="text-[15.5px] leading-relaxed text-ink-2/85">{a}</p>
                </li>
              ))}
            </ol>
          </Reveal>
          <div className="flex flex-col gap-4">
            {study.comparison && (
              <Reveal className="overflow-hidden rounded-2xl border border-line bg-white">
                <p className="border-b border-line px-5 py-3 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">{study.comparisonLabel}</p>
                {study.comparison.map((c) => (
                  <div key={c.model} className={`flex items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-b-0 ${c.note ? "bg-cream/60" : ""}`}>
                    <span className="text-[14.5px] font-medium">{c.model}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[13px]">{c.score}</span>
                      {c.note && <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] text-white">{c.note}</span>}
                    </span>
                  </div>
                ))}
              </Reveal>
            )}
            <Reveal className="rounded-2xl bg-cream p-6">
              <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Honest note</p>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2/85">{study.honest}</p>
              <p className="mt-4 font-mono text-[12px] text-muted">Reproduce: {study.code}</p>
              {study.data.source && (
                <a href={study.data.source} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-mono text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">
                  dataset source <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- next ---------- */}
      <section className="mx-auto mt-24 max-w-[1240px] px-5 md:px-10">
        <Link href={`/skills/${skill.slug}/${next.slug}`} className="group flex items-center justify-between rounded-[28px] bg-ink p-8 text-white sm:p-12">
          <div>
            <p className="font-mono text-[12px] tracking-[0.16em] text-white/50 uppercase">Next project</p>
            <p className="mt-2 text-[1.8rem] font-semibold tracking-[-0.04em] sm:text-[2.6rem]">{next.title}</p>
          </div>
          <ArrowRight className="h-8 w-8 transition group-hover:translate-x-1" />
        </Link>
      </section>
    </article>
  );
}
