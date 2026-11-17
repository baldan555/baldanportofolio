import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { siJson, siKeras, siMediapipe, siNextdotjs, siNumpy, siReact, siScipy, siTensorflow, siTypescript } from "simple-icons";
import { dlCategories, dlChecks, dlMethod, dlNetworkSizes, dlProjects, dlStack, pmProfile } from "@/data/dl";
import { skills } from "@/data/skills";
import { HowNnLearns } from "../explainers/nn-learns";
import { Reveal, SplitWords } from "../motion";
import { Lab } from "./lab";
import { LabButton, SkillShell } from "./skill-shell";
import { CheckGrid, StackPipeline, type GroupView, type StageView } from "./ml-toolkit-client";

/** Logos from simple-icons (CC0), resolved on the server so only the paths reach the browser. */
const LOGOS: Record<string, { path: string; hex: string }> = { siJson, siKeras, siMediapipe, siNextdotjs, siNumpy, siReact, siScipy, siTensorflow, siTypescript };

const Kicker = ({ children }: { children: React.ReactNode }) => <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">{children}</p>;

/** Deep Learning & Vision: same template as the ML page, normal scroll. Server component. */
export function DlSkillPage() {
  const live = dlProjects.filter((p) => p.status === "live").length;
  const idx = skills.findIndex((s) => s.slug === "deep-learning");
  const next = skills[idx + 1];
  const stages: StageView[] = dlStack.map((s) => ({
    ...s,
    tools: s.tools.map((t) => {
      const logo = "logo" in t && t.logo ? LOGOS[t.logo] : undefined;
      return { name: t.name, version: "version" in t ? t.version : undefined, role: t.role, lucide: "lucide" in t ? t.lucide : undefined, logo: logo ? { path: logo.path, hex: logo.hex } : undefined };
    }),
  }));
  const label = (slug: string) => ({ slug, label: dlProjects.find((p) => p.slug === slug)?.title ?? slug });
  const groups: GroupView[] = dlChecks.map((g) => ({ ...g, checks: g.checks.map((c) => ({ name: c.name, detail: c.detail, projects: c.slugs.map(label) })) }));

  return (
    <SkillShell
      items={[
        { id: "learn", label: "How it learns" },
        { id: "method", label: "How I do it" },
        { id: "toolkit", label: "Tech stack" },
        { id: "checks", label: "Methodology" },
      ]}
      lab={{ id: "lab", label: "The lab", count: dlProjects.length }}
    >
      {/* ---------------- header ---------------- */}
      <section className="mx-auto max-w-[1240px] px-5 pt-16 pb-14 md:px-10 md:pt-24">
        <p className="mb-6 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
          Skill 0{idx + 1} / 0{skills.length}
        </p>
        <h1 className="text-[3.2rem] leading-[0.92] font-semibold tracking-[-0.055em] sm:text-[6rem] lg:text-[7.5rem]">
          <SplitWords text="Deep Learning & Vision" serifWords={["Vision"]} />
        </h1>
        <Reveal delay={0.2}>
          <p className="mt-6 max-w-xl text-[19px] leading-relaxed text-ink-2/75">
            Neural networks that learn their own features from pixels, text and signals. Trained with TensorFlow, rebuilt from scratch, and small enough to run in your browser.
          </p>
        </Reveal>
        <Reveal delay={0.3} className="mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { v: String(live), l: live === 1 ? "live demo" : "live demos" },
            { v: String(dlProjects.length), l: "in the lab" },
            { v: String(dlMethod.length), l: "step method" },
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
            { href: "#checks", label: "Methodology" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[13px] transition-colors hover:border-ink hover:bg-ink hover:text-white">
              {l.label}
            </a>
          ))}
          <LabButton label="The lab · all projects" count={dlProjects.length} />
        </Reveal>
      </section>

      {/* ---------------- the idea, animated: how a neural network learns ---------------- */}
      <HowNnLearns byHour={pmProfile.byHour} hours={pmProfile.hours} week={pmProfile.week} sizes={dlNetworkSizes} />
      <div className="h-20 md:h-28" />

      {/* ---------------- method ---------------- */}
      <section id="method" className="scroll-mt-24 border-y border-line bg-white/60 py-20 md:py-28">
        <div className="mx-auto max-w-[1240px] px-5 md:px-10">
          <Kicker>How I do it</Kicker>
          <h2 className="max-w-3xl text-[2.4rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.6rem]">
            <SplitWords text="Simple first, then deeper." serifWords={["deeper."]} />
          </h2>
          <ol className="mt-14 divide-y divide-line border-y border-line">
            {dlMethod.map((m, i) => (
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
            <LabButton label="Go to the projects" count={dlProjects.length} />
          </Reveal>
        </div>
      </section>

      {/* ---------------- toolkit ---------------- */}
      <section id="toolkit" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-20 md:px-10 md:pt-28">
        <Kicker>The toolkit</Kicker>
        <h2 className="max-w-4xl text-[2.4rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.6rem]">
          <SplitWords text="Trained in TensorFlow, run in TypeScript." serifWords={["TensorFlow,"]} />
        </h2>
        <Reveal delay={0.15}>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2/70">
            Networks are trained with Keras on TensorFlow, then every layer is re-implemented in TypeScript, so the demos need no TensorFlow.js and no server. The browser version is checked against Python on the full test set.
          </p>
        </Reveal>
        <StackPipeline stages={stages} />
      </section>

      <section id="checks" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-24 md:px-10 md:pt-32">
        <Kicker>The methodology</Kicker>
        <h3 className="max-w-4xl text-[2.2rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.2rem]">
          <SplitWords text="Deep, but still honest." serifWords={["honest."]} />
        </h3>
        <CheckGrid groups={groups} />
      </section>

      {/* ---------------- lab ---------------- */}
      <section id="lab" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-24 md:px-10 md:pt-32">
        <Kicker>The lab</Kicker>
        <h2 className="max-w-3xl text-[2.4rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.6rem]">
          <SplitWords text="Draw, type, watch it think." serifWords={["think."]} />
        </h2>
        <Lab projects={dlProjects} categories={dlCategories} skill="deep-learning" />
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
