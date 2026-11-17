"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "../sales/tiles";
import { A, ALL, ARM_COLOR, METRICS, TESTS, compare, fmtDiff, fmtP, fmtRel, fmtValue, mde, num, value, type Arm, type Cell, type Metric } from "./stats";
import { ArmCards, Forest, Funnel, Impact, Power, Segments, SpendDist, Trust, Verdict, bestArm } from "./tiles";

const name = (a: Arm) => A.arms[a];

/** Findings written from the same statistics as the tiles. */
function findings(arm: Arm) {
  const { best } = bestArm();
  const out: string[] = [];
  for (const m of METRICS) {
    const parts = (["mens", "womens"] as Arm[]).map((a) => {
      const c = compare(ALL[a], ALL.control, m.id);
      return `${name(a).toLowerCase()} ${fmtDiff(c.diff, m.id, m.id === "spend" ? 2 : 1)} (${fmtRel(c.rel)})`;
    });
    out.push(`${m.label}: ${fmtValue(value(ALL.control, m.id), m.id)} without an e-mail; ${parts.join(", ")}.`);
  }
  // segments for the selected e-mail on spend: strongest and weakest clear slices
  const slices = (Object.keys(A.dims) as (keyof typeof A.dims)[])
    .filter((k) => k !== "all")
    .flatMap((k) =>
      A.dims[k].levels.map((l) => ({
        dim: A.dims[k].label,
        level: l.level,
        c: compare((l.arms as Record<Arm, Cell>)[arm], (l.arms as Record<Arm, Cell>).control, "spend"),
        n: (l.arms as Record<Arm, Cell>)[arm].n,
      })),
    )
    .filter((s) => s.n >= 2000);
  const strong = [...slices].sort((a, b) => b.c.diff - a.c.diff)[0];
  const weak = [...slices].sort((a, b) => a.c.diff - b.c.diff)[0];
  out.push(
    `For the ${name(arm).toLowerCase()}, the biggest spend lift is among “${strong.level}” (${strong.dim.toLowerCase()}): ${fmtDiff(strong.c.diff, "spend")} per customer, ${fmtP(strong.c.p)}.`,
  );
  out.push(`The smallest is among “${weak.level}”: ${fmtDiff(weak.c.diff, "spend")} (${weak.c.sig ? "still significant" : "not distinguishable from zero"}). Segment results are exploratory.`);
  out.push(`The split is clean: group sizes match the plan (p = ${A.srm.p.toFixed(2)}) and the groups looked alike before the e-mail.`);
  const conv = mde(ALL.control, "conv");
  out.push(
    `Purchases are rare (${fmtValue(value(ALL.control, "conv"), "conv")} without an e-mail), so this test could only see conversion lifts of about ${fmtRel(conv / value(ALL.control, "conv"))} or more.`,
  );
  if (best !== arm) out.push(`Note: the ${name(best).toLowerCase()} earned more per customer overall; this view shows the ${name(arm).toLowerCase()}.`);
  return out;
}

function Memo({ arm }: { arm: Arm }) {
  return (
    <Card title="What the test says" sub="Written from the same statistics as the charts" className="lg:col-span-5" dark>
      <ul className="space-y-2.5">
        {findings(arm).map((l, k) => (
          <li key={k} className="flex gap-2 text-[13px] leading-snug text-white/90">
            <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ARM_COLOR[arm] }} />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Behind() {
  const items: [string, string][] = [
    [
      "The experiment",
      `${num(A.rows)} customers who had bought in the last 12 months were split at random into three groups: no e-mail, a men's merchandise e-mail and a women's merchandise e-mail. Visits, purchases and spend were tracked for ${A.source.window_days} days.`,
    ],
    ["Rates", "Visit and purchase rates are compared with a two-proportion z-test; the 95% interval is the estimate ± 1.96 standard errors."],
    ["Spend", "Spend per customer (zero for most) is compared with Welch's test on means; with 21,000+ customers per group the normal approximation holds."],
    ["Six comparisons", `Two e-mails × three metrics = ${TESTS} tests, so a result counts as clear only below p = 0.05 / ${TESTS} (Bonferroni). Segment charts are exploratory and not corrected.`],
    ["Checks first", "Before any result: the sample-ratio test (were the groups the planned size?) and covariate balance (did the groups look alike before the e-mail?)."],
    ["Source", `${A.source.name}. ${A.source.licence}. One typo in the file (“Surburban”) is corrected.`],
  ];
  return (
    <section className="rounded-[24px] border border-line bg-cream/60 p-4 sm:p-6 lg:col-span-12">
      <h3 className="text-[18px] font-semibold tracking-[-0.02em]">Behind the dashboard</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white p-3">
            <p className="text-[13px] font-semibold">{k}</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-2/75">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-2/70">
        The next question, which customer should get which e-mail, is answered by an uplift model in the{" "}
        <Link href="/skills/machine-learning/uplift-promo" className="font-semibold text-ink underline underline-offset-2">
          Uplift promo
        </Link>{" "}
        machine-learning project, on the same data.
      </p>
    </section>
  );
}

export function AbDashboard() {
  const [metric, setMetric] = useState<Metric>("spend");
  const [arm, setArm] = useState<Arm>("mens");
  return (
    <div className="mx-auto max-w-[1400px] px-3 sm:px-5 md:px-10">
      <div className="z-30 -mx-3 mb-3 bg-bg/90 px-3 py-2.5 backdrop-blur sm:-mx-5 sm:px-5 md:sticky md:top-[7.6rem] md:-mx-10 md:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-ink/10 bg-white p-0.5 text-[12.5px]">
            {METRICS.map((m) => (
              <button key={m.id} type="button" onClick={() => setMetric(m.id)} className={`rounded-full px-3 py-1 ${metric === m.id ? "bg-ink text-white" : "text-ink/60 hover:text-ink"}`}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-ink/10 bg-white p-0.5 text-[12.5px]">
            {(["mens", "womens"] as Arm[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setArm(a)}
                className={`rounded-full px-3 py-1 ${arm === a ? "text-white" : "text-ink/60 hover:text-ink"}`}
                style={arm === a ? { background: ARM_COLOR[a] } : undefined}
              >
                {name(a)}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11.5px] text-ink-2/55">
            {num(A.rows)} real customers · randomised · {A.source.window_days}-day window
          </span>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-12">
        <Verdict />
        <ArmCards />
        <Forest metric={metric} />
        <Funnel />
        <Segments metric={metric} arm={arm} />
        <Memo arm={arm} />
        <Trust />
        <SpendDist />
        <Impact arm={arm} />
        <Power />
        <Behind />
      </div>
    </div>
  );
}
