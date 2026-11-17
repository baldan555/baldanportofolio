import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import D from "@/data/fwa-dashboard.json";
import { AgentLoop } from "@/components/analytics/dashboards/fwa/agent";
import { Planner, SegmentBuilder, WhatIf } from "@/components/analytics/dashboards/fwa/playground";
import { SurveyExplorer, Voice } from "@/components/analytics/dashboards/fwa/voice";
import { DataBlock } from "@/components/analytics/dashboards/fwa/raw-data";
import { Campaigns, Cohorts, FiveG, Lifecycle, Monitoring, Payments, Risk } from "@/components/analytics/dashboards/fwa/sections";
import { LabButton, SkillShell } from "@/components/skills/skill-shell";

export const metadata: Metadata = {
  title: "FWA base health — Customer analytics — Baldanullah",
  description:
    "A home-internet (Fixed Wireless Access) base from raw data to decisions: cohorts, survival, risk segments, a churn model, payment recovery, 5G adoption, lifecycle requests, campaign results and customer surveys that explain why people leave, with a playground and an agent loop.",
};

const num = (v: number) => v.toLocaleString("en-US");
const rows = Object.values(D.counts).reduce((a, b) => a + b, 0);

// Retention execution, said from the campaign scoreboard itself.
const proven = D.campaigns.filter((c) => c.p < 0.05 && c.diff > 0).sort((a, b) => b.diff - a.diff);
const unclear = D.campaigns.filter((c) => c.p >= 0.05 && c.diff >= 3);
const none = D.campaigns.filter((c) => c.p >= 0.05 && !unclear.includes(c));
const short = (name: string) => {
  const s = name.replace(/\s*\(.*\)/, "");
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
};
const execution = `Five campaigns, each with a random control group. ${proven.length} show a proven lift (${proven.map((c) => `${short(c.name)} +${c.diff} pts`).join(", ")})${unclear.length ? `; ${unclear.map((c) => short(c.name)).join(", ")} looks positive but needs more customers to be sure` : ""}${none.length ? `; ${none.map((c) => short(c.name)).join(", ")} changed nothing` : ""}.`;

const SCOPE = [
  { n: "1", h: "Base monitoring", a: `${D.findings.base} ${D.findings.churn}`, href: "#monitoring" },
  { n: "2", h: "Risk segmentation", a: `${D.findings.risk} ${D.findings.model}`, href: "#risk" },
  { n: "3", h: "Retention execution", a: execution, href: "#campaigns" },
  { n: "4", h: "5G adoption", a: D.findings.fiveg, href: "#fiveg" },
  { n: "5", h: "Lifecycle requests", a: D.findings.lifecycle, href: "#lifecycle" },
  { n: "6", h: "Performance feedback", a: `${D.findings.early} ${D.findings.cohorts}`, href: "#cohorts" },
];
const answered = D.voice.program.reduce((a, p) => a + p.answered, 0);

function Block({ id, n, kicker, title, line, children }: { id: string; n: string; kicker: string; title: string; line?: string; children: ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-[1400px] scroll-mt-8 px-5 pt-20 md:px-10">
      <p className="font-mono text-[11.5px] tracking-[0.16em] text-muted uppercase">
        {n} · {kicker}
      </p>
      <h2 className="mt-2 max-w-3xl text-[1.9rem] leading-[1.02] font-semibold tracking-[-0.04em] sm:text-[2.5rem]">{title}</h2>
      {line && <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-2/70">{line}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function FwaPage() {
  return (
    <SkillShell
      top="top-36"
      items={[
        { id: "job", label: "The job, answered" },
        { id: "data", label: "The raw data" },
        { id: "monitoring", label: "Base monitoring" },
        { id: "cohorts", label: "Cohorts & survival" },
        { id: "risk", label: "Risk & the model" },
        { id: "payments", label: "Payment recovery" },
        { id: "fiveg", label: "5G adoption" },
        { id: "lifecycle", label: "Lifecycle requests" },
        { id: "campaigns", label: "Campaign results" },
        { id: "voice", label: "Customer voice: why" },
        { id: "agent", label: "Agentic AI" },
      ]}
      lab={{ id: "playground", label: "Playground" }}
    >
      <section className="mx-auto max-w-[1400px] px-5 pt-10 md:px-10 md:pt-14">
        <Link href="/skills/analytics/dashboards" className="font-mono text-[11.5px] tracking-[0.14em] text-muted uppercase hover:text-ink">
          ← Dashboards · 04 Customer analytics
        </Link>
        <h1 className="mt-3 max-w-4xl text-[2.4rem] leading-[0.95] font-semibold tracking-[-0.05em] sm:text-[3.6rem]">Is the home-internet base getting healthier?</h1>
        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-2/75">
          Fixed Wireless Access (FWA) is home internet over the mobile network: a router at home with a SIM, on 4G or 5G. This is the whole job of looking after such a base, from the raw tables to the
          campaign results, and the customer surveys that explain why people leave. All on data made up for this page, so every row can be shown.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-[13px]">
          {[
            [num(D.counts.customers), "customers"],
            [String(D.months.length), `months, ${D.months[0]} – ${D.months[D.months.length - 1]}`],
            ["7", "raw tables"],
            [num(answered), "survey answers"],
            [num(rows), "rows"],
            [String(D.counts.campaigns), "campaigns with control groups"],
          ].map(([v, l]) => (
            <span key={l} className="rounded-full border border-ink/10 bg-white px-3.5 py-1.5">
              <b className="tabular-nums">{v}</b> {l}
            </span>
          ))}
        </div>
        <LabButton href="#playground" label="Open the playground" className="mt-6" />
      </section>

      <section id="job" className="mx-auto max-w-[1400px] scroll-mt-8 px-5 pt-14 md:px-10">
        <p className="font-mono text-[11.5px] tracking-[0.16em] text-muted uppercase">The job, answered</p>
        <h2 className="mt-2 max-w-3xl text-[1.9rem] leading-[1.02] font-semibold tracking-[-0.04em] sm:text-[2.5rem]">Six parts of the role, six answers from the data.</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SCOPE.map((s) => (
            <a key={s.n} href={s.href} className="group flex flex-col rounded-[22px] border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-ink/30">
              <span className="flex items-center justify-between">
                <span className="font-mono text-[11.5px] text-ink/45">0{s.n}</span>
                <span className="text-ink/30 transition group-hover:translate-y-0.5 group-hover:text-ink" aria-hidden>
                  ↓
                </span>
              </span>
              <span className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">{s.h}</span>
              <span className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2/75">{s.a}</span>
            </a>
          ))}
          <a href="#voice" className="group spotlight rounded-[24px] p-[2px] md:col-span-2 xl:col-span-3">
            <span className="flex h-full flex-col gap-3 rounded-[22px] bg-ink p-5 text-white sm:flex-row sm:items-center sm:gap-6">
              <span className="shrink-0">
                <span className="font-mono text-[11.5px] text-white/45">+ the why</span>
                <span className="mt-1 block text-[20px] font-semibold tracking-[-0.02em]">Customer voice</span>
              </span>
              <span className="text-[13.5px] leading-relaxed text-white/75">
                {D.findings.voice} The survey turns &quot;who&quot; into &quot;why&quot;: on the decision board it narrows one action, rebuilds another and adds one no dashboard suggested.
              </span>
              <span className="shrink-0 text-white/50 transition group-hover:translate-y-0.5 group-hover:text-white" aria-hidden>
                ↓
              </span>
            </span>
          </a>
        </div>
      </section>

      <Block id="data" n="01" kicker="The raw data" title="What the team has, down to the last row." line="Seven tables a telco would really hold on an FWA base, customer surveys included. Read how they join, what every column means and how they were made, then browse or download every row.">
        <DataBlock />
      </Block>

      <Block id="monitoring" n="02" kicker="Base monitoring" title="Size, flows, churn, usage, payments." line="The monthly view of the base: who joined and left, why they left, how much they use and how they pay.">
        <Monitoring />
      </Block>

      <Block id="cohorts" n="03" kicker="Cohorts & survival" title="Does each new group of customers stay longer?" line="Customers grouped by the month they joined, followed month by month. Filter by plan, channel, way to pay, area or region.">
        <Cohorts />
      </Block>

      <Block id="risk" n="04" kicker="Risk segments & machine learning" title="Who needs attention, and in what order." line="Rule-based segments the team can act on, and a churn model that ranks every active customer by their chance of leaving in the next two months.">
        <Risk />
      </Block>

      <Block id="payments" n="05" kicker="Payment recovery" title="Late rebuys and unpaid invoices." line="How on time customers rebuy or pay, by method, how fast late payers come back, and what is owed today.">
        <Payments />
      </Block>

      <Block id="fiveg" n="06" kicker="5G adoption" title="Moving covered homes onto 5G." line="Where 5G reaches, who has moved, what upgrading does to usage and churn, and who is ready now.">
        <FiveG />
      </Block>

      <Block id="lifecycle" n="07" kicker="Lifecycle requests" title="Renewals, relocations and device faults." line="Every request, how fast it was handled against its target, and what a slow fix costs in customers.">
        <Lifecycle />
      </Block>

      <Block id="campaigns" n="08" kicker="Campaign results" title="What actually worked, against a control group." line="Each campaign kept a random group that got nothing. The lift is the difference between the two, with its 95% range and cost per result.">
        <Campaigns />
      </Block>

      <Block
        id="voice"
        n="09"
        kicker="Customer voice · surveys"
        title="Why do they really leave? Ask them."
        line="The numbers above say what happened and to whom. Surveys say why: after the first month, every quarter, after a repair and when a customer leaves. Here is what they add, and how they change the decisions."
      >
        <Voice />
      </Block>

      <Block id="playground" n="10" kicker="Playground" title="Try it yourself." line="Cut your own segment from the live base, read every survey answer, score a customer you build, and plan next month's campaign with the measured lifts.">
        <div className="flex flex-col gap-3">
          <SegmentBuilder />
          <SurveyExplorer />
          <WhatIf />
          <Planner />
        </div>
      </Block>

      <Block id="agent" n="11" kicker="Agentic AI" title="Where an AI agent fits in this job." line="The weekly loop of monitor, segment, act and measure is a good fit for an agent with read-only tools and a person approving every action. Step through one run.">
        <AgentLoop />
      </Block>

      <section className="mx-auto max-w-[1400px] px-5 pt-14 pb-24 md:px-10">
        <p className="max-w-3xl rounded-2xl bg-cream px-4 py-3 text-[13px] leading-relaxed text-ink-2/75">
          <b className="text-ink">About the data.</b> Every customer, payment and campaign here was generated by a script with fixed rules and a fixed random seed, so the numbers are reproducible and no
          real person is in them. Plans, prices and channels are typical of the Indonesian market, not any one operator.
        </p>
      </section>
    </SkillShell>
  );
}
