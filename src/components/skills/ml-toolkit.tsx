import type { ReactNode } from "react";
import { siFramer, siGithub, siJson, siKaggle, siNextdotjs, siNumpy, siPandas, siPython, siReact, siScikitlearn, siScipy, siTailwindcss, siTypescript } from "simple-icons";
import { checkGroups, mlAlgos, mlMetrics, stackStages } from "@/data/ml-stack";
import { mlProjects } from "@/data/skills";
import { Reveal, SplitWords } from "../motion";
import { CheckGrid, ModelMatrix, StackPipeline, type AlgoView, type ColumnView, type GroupView, type StageView } from "./ml-toolkit-client";

/** Logos from simple-icons (CC0). Resolved here, on the server, so only the paths reach the browser. */
const LOGOS: Record<string, { path: string; hex: string }> = { siFramer, siGithub, siJson, siKaggle, siNextdotjs, siNumpy, siPandas, siPython, siReact, siScikitlearn, siScipy, siTailwindcss, siTypescript };

const SHORT: Record<string, string> = {
  "telco-churn": "Telco churn",
  "heart-failure": "Heart failure",
  "mall-segments": "Mall segments",
  "nyc-taxi-anomaly": "NYC taxi",
  "credit-risk": "Credit risk",
  "manufacturing-defects": "Machine defects",
  "student-performance": "Student grades",
  "demand-forecasting": "Bike demand",
  "air-quality": "Air quality",
  "bank-churn": "Bank churn",
  "insurance-fraud": "Insurance fraud",
  "bank-fraud": "Card fraud",
  "product-recommender": "Recommender",
  "complaint-router": "Complaint router",
  "uplift-promo": "Uplift promo",
  "house-price-range": "House price range",
  "feedback-themes": "Feedback themes",
};

const Kicker = ({ children }: { children: ReactNode }) => <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">{children}</p>;

/** Tech stack, algorithms and validation methods behind the ML lab. Server component: no model JSON is shipped. */
export function MlToolkit() {
  const columns: ColumnView[] = mlProjects.map((p) => ({ slug: p.slug, label: SHORT[p.slug] ?? p.title }));
  const label = (slug: string) => ({ slug, label: SHORT[slug] ?? slug });

  const stages: StageView[] = stackStages.map((s) => ({
    ...s,
    tools: s.tools.map((t) => ({ name: t.name, version: t.version, role: t.role, lucide: t.lucide, logo: t.logo ? { path: LOGOS[t.logo].path, hex: LOGOS[t.logo].hex } : undefined })),
  }));

  const algos: AlgoView[] = mlAlgos.map((a) => ({
    name: a.name,
    family: a.family,
    line: a.line,
    cells: columns.map((c) => (a.chosen.includes(c.slug) ? 2 : a.tried.includes(c.slug) ? 1 : 0)),
    tried: a.tried.length,
    chosen: a.chosen.length,
  }));
  const realAlgos = mlAlgos.filter((a) => a.family !== "Sanity check").length;
  const shipped = mlAlgos.reduce((n, a) => n + a.chosen.length, 0);
  const ensembleProjects = new Set(mlAlgos.filter((a) => a.family.startsWith("Ensemble")).flatMap((a) => a.tried)).size;
  const top = [...mlAlgos].sort((a, b) => b.chosen.length - a.chosen.length)[0];

  const groups: GroupView[] = checkGroups.map((g) => ({ ...g, checks: g.checks.map((c) => ({ name: c.name, detail: c.detail, projects: c.slugs.map(label) })) }));

  return (
    <section id="toolkit" className="scroll-mt-24">
      {/* ---------------- stack ---------------- */}
      <div className="mx-auto max-w-[1240px] px-5 pt-20 md:px-10 md:pt-28">
        <Kicker>The toolkit</Kicker>
        <h2 className="max-w-4xl text-[2.4rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.6rem]">
          <SplitWords text="Trained in Python, run in your browser." serifWords={["Python,"]} />
        </h2>
        <Reveal delay={0.15}>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2/70">
            Every model is trained offline with open-source Python, exported as a small JSON file, and re-run in TypeScript. No server, no API key: the demos work the moment the page loads.
          </p>
        </Reveal>
        <StackPipeline stages={stages} />
      </div>

      {/* ---------------- models ---------------- */}
      <div id="toolkit-models" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-24 md:px-10 md:pt-32">
        <Kicker>The models</Kicker>
        <h3 className="max-w-4xl text-[2.2rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.2rem]">
          <SplitWords text={`${realAlgos} algorithms, picked on evidence.`} serifWords={["evidence."]} />
        </h3>
        <Reveal delay={0.1} className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { v: String(shipped), l: "final models" },
            { v: `${top.chosen.length}×`, l: `${top.name.toLowerCase()} shipped` },
            { v: `0 / ${ensembleProjects}`, l: "forests & boosting shipped / tried" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-line bg-white px-4 py-3.5">
              <p className="text-[2rem] leading-none font-semibold tracking-[-0.04em]">{s.v}</p>
              <p className="mt-1.5 font-mono text-[11px] text-muted uppercase">{s.l}</p>
            </div>
          ))}
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-6 max-w-2xl text-[15.5px] leading-relaxed text-ink-2/70">
            Random forests and gradient boosting were benchmarked in {ensembleProjects} projects and often scored a little higher. None shipped: the gaps were small (each one is shown on its project page), and the simpler model explains every prediction and runs in your browser.
          </p>
        </Reveal>
        <ModelMatrix algos={algos} columns={columns} />
      </div>

      {/* ---------------- checks ---------------- */}
      <div id="toolkit-checks" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-24 md:px-10 md:pt-32">
        <Kicker>The methodology</Kicker>
        <h3 className="max-w-4xl text-[2.2rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.2rem]">
          <SplitWords text="How every number is earned." serifWords={["earned."]} />
        </h3>
        <CheckGrid groups={groups} />
        <Reveal delay={0.1} className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-2 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Scored with</span>
          {mlMetrics.map((m) => (
            <span key={m} className="rounded-full border border-ink/10 bg-white px-3 py-1 font-mono text-[11.5px]">
              {m}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
