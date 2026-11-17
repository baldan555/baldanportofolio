import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { mlCategories, mlMethod, mlProjects, skills } from "@/data/skills";
import { HowMlLearns } from "../explainers/ml-learns";
import { Reveal, SplitWords } from "../motion";
import { Lab } from "./lab";
import { LabButton, SkillShell } from "./skill-shell";
import { MlToolkit } from "./ml-toolkit";

export function MlSkillPage() {
  const live = mlProjects.filter((p) => p.status === "live").length;
  const idx = skills.findIndex((s) => s.slug === "machine-learning");
  const next = skills[idx + 1];

  return (
    <SkillShell
      items={[
        { id: "learn", label: "How it learns" },
        { id: "method", label: "How I do it" },
        { id: "toolkit", label: "Tech stack" },
        { id: "toolkit-models", label: "Models" },
        { id: "toolkit-checks", label: "Methodology" },
      ]}
      lab={{ id: "lab", label: "The lab", count: mlProjects.length }}
    >
      {/* ---------------- header ---------------- */}
      <section className="mx-auto max-w-[1240px] px-5 pt-16 pb-14 md:px-10 md:pt-24">
        <p className="mb-6 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
          Skill 0{idx + 1} / 0{skills.length}
        </p>
        <h1 className="text-[3.2rem] leading-[0.92] font-semibold tracking-[-0.055em] sm:text-[6rem] lg:text-[7.5rem]">
          <SplitWords text="Machine Learning" serifWords={["Learning"]} />
        </h1>
        <Reveal delay={0.2}>
          <p className="mt-6 max-w-xl text-[19px] leading-relaxed text-ink-2/75">
            Turning history into predictions people can act on. Every project below was rebuilt from scratch, and the live ones run right in your browser.
          </p>
        </Reveal>
        <Reveal delay={0.3} className="mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { v: String(live), l: "live demos" },
            { v: String(mlProjects.length), l: "projects in the lab" },
            { v: "6", l: "step method" },
            { v: "0", l: "servers needed" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-line bg-white px-4 py-3.5">
              <p className="text-[2rem] leading-none font-semibold tracking-[-0.04em]">{s.v}</p>
              <p className="mt-1.5 font-mono text-[11px] text-muted uppercase">{s.l}</p>
            </div>
          ))}
        </Reveal>
        <Reveal delay={0.4} className="mt-6 flex flex-wrap gap-2">
          {[
            { href: "#learn", label: "How it learns" },
            { href: "#method", label: "How I do it" },
            { href: "#toolkit", label: "Tech stack" },
            { href: "#toolkit-models", label: "Models" },
            { href: "#toolkit-checks", label: "Methodology" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[13px] transition-colors hover:border-ink hover:bg-ink hover:text-white">
              {l.label}
            </a>
          ))}
          <LabButton label="The lab · all projects" count={mlProjects.length} />
        </Reveal>
      </section>

      {/* ---------------- the idea, animated: how a model learns ---------------- */}
      <HowMlLearns />
      <div className="h-20 md:h-28" />

      {/* ---------------- method ---------------- */}
      <section id="method" className="scroll-mt-24 border-y border-line bg-white/60 py-20 md:py-28">
        <div className="mx-auto max-w-[1240px] px-5 md:px-10">
          <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">How I do it</p>
          <h2 className="max-w-3xl text-[2.4rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.6rem]">
            <SplitWords text="Six steps, every project." serifWords={["every"]} />
          </h2>

          <ol className="mt-14 divide-y divide-line border-y border-line">
            {mlMethod.map((m, i) => (
              <li key={m.title}>
                <Reveal y={16} className="grid gap-4 py-8 md:grid-cols-[110px_1fr_1fr] md:gap-10 md:py-10">
                  <span className="font-mono text-[13px] text-muted">0{i + 1}</span>
                  <div>
                    <h3 className="text-[1.6rem] leading-tight font-semibold tracking-[-0.03em] sm:text-[2rem]">{m.title}</h3>
                    <p className="mt-2 max-w-md text-[16px] leading-relaxed text-ink-2/70">{m.line}</p>
                  </div>
                  <div className="flex flex-wrap content-start gap-1.5">
                    {m.tools.map((t) => (
                      <span key={t} className="rounded-full border border-ink/10 bg-white px-3 py-1 font-mono text-[11.5px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <Reveal y={16} className="mt-10 flex flex-col items-start gap-4 rounded-[24px] bg-cream p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <p className="max-w-md text-[16px] leading-relaxed text-ink-2/80">Every project in the lab goes through these steps. Pick one and try it.</p>
            <LabButton label="Go to the projects" count={mlProjects.length} />
          </Reveal>
        </div>
      </section>

      {/* ---------------- toolkit: stack, models, methodology ---------------- */}
      <MlToolkit />

      {/* ---------------- lab ---------------- */}
      <section id="lab" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-24 md:px-10 md:pt-32">
        <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">The lab</p>
        <h2 className="max-w-3xl text-[2.4rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.6rem]">
          <SplitWords text="Pick a project, try the model." serifWords={["try"]} />
        </h2>
        <Lab projects={mlProjects} categories={mlCategories} skill="machine-learning" />
      </section>

      {/* ---------------- next ---------------- */}
      {next && (
        <section className="mx-auto max-w-[1240px] px-5 pt-24 md:px-10">
          {(() => {
            const card = (
              <div className="group flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-ink p-8 text-white sm:p-12">
                <div>
                  <p className="font-mono text-[12px] tracking-[0.16em] text-white/50 uppercase">Next skill</p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] sm:text-[2.6rem]">{next.name}</p>
                  <p className="mt-1 text-white/60">{next.line}</p>
                </div>
                <span className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 font-mono text-[12px] text-white/70 transition-colors group-hover:border-white group-hover:text-white">
                  {next.ready ? "Open" : "Being rebuilt"}
                  {next.ready && <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:rotate-45" />}
                </span>
              </div>
            );
            return next.ready ? <Link href={`/skills/${next.slug}`}>{card}</Link> : card;
          })()}
        </section>
      )}
    </SkillShell>
  );
}
