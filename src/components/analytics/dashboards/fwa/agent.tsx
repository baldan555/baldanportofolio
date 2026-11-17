"use client";

import { Bot, Check, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { DASH, num, pct, rp } from "./data";
import { C, Panel } from "./ui";

/* A simulated agent run over this page's data: real numbers, scripted reasoning, no messages sent, a human approval gate. */

const S = DASH.series;
const LAST = S[S.length - 1];
const seg = (name: string) => DASH.segments.find((s) => s.name === name)!;
const c4 = DASH.campaigns.find((c) => c.id === "C4")!;
const c5 = DASH.campaigns.find((c) => c.id === "C5")!;
const onTime = DASH.saveByBand.find((b) => b.k === "Paid on time")!;
const V = DASH.voice;
const metro4g = V.cut.speedBySitu[0];
const online = V.cut.signalByChannel.find((x) => x.k === "Online")!;

type Step = { who: "agent" | "tool" | "human"; title: string; body: string; code?: string };
const STEPS: Step[] = [
  { who: "agent", title: "Check the base", body: "Every Monday the agent starts by reading the base-monitoring numbers, like an analyst would.", code: "monitor_base(as_of='2026-10-31')" },
  { who: "tool", title: "Base health", body: `${num(LAST.base)} active, churn ${pct(LAST.rate ?? 0, 2)} (${LAST.vol} by choice, ${LAST.inv} non-payment), ${pct(LAST.rebuyOnTime ?? 0)} rebuys on time. Churn is above the 4% target.` },
  { who: "agent", title: "Find who needs attention", body: "Churn is above target, so it pulls the risk segments and scores the active base with the churn model.", code: "segments(); score_customers(model='fwa-churn-lr')" },
  {
    who: "tool",
    title: "Segments and scores",
    body: `Overdue or lapsing: ${num(seg("Overdue or lapsing").n)} (past 60-day churn ${pct(seg("Overdue or lapsing").churn60 ?? 0)}). New, low use: ${num(seg("New, low use").n)}. 5G coverage but still on 4G: ${num(DASH.fiveg.readyNow)}. Top-risk list ready (${DASH.call.length} customers above ${pct(DASH.call[DASH.call.length - 1].risk)}).`,
  },
  { who: "agent", title: "Check what worked before", body: "Before proposing anything it reads past campaign results, so it doesn't repeat what failed.", code: "campaign_results(min_power=0.8)" },
  {
    who: "tool",
    title: "Lessons",
    body: `Save offer works (${c4.diff > 0 ? "+" : ""}${c4.diff} pts overall) but mainly for customers who pay on time (${onTime.diff > 0 ? "+" : ""}${onTime.diff} pts). 5G upgrade: +${c5.diff} pts. Early-life welcome: no proven effect.`,
  },
  { who: "agent", title: "Ask why", body: "Numbers say who is at risk, not why. Before choosing actions it reads the latest survey answers and exit reasons.", code: "survey_themes(last_days=90); exit_reasons()" },
  {
    who: "tool",
    title: "What customers say",
    body: `${pct(metro4g.v, 0)} of metro 4G customers are unhappy with evening speed. Online sales: ${pct(online.v, 0)} unhappy with indoor signal. ${pct(V.involService, 0)} of leavers logged as 'didn't pay' blamed the service, not money. Price barely moves the score.`,
  },
  {
    who: "agent",
    title: "Draft a plan",
    body: `1) Save offer to the 120 highest-risk customers who pay on time. 2) Payment recovery for the overdue segment, not a discount. 3) 5G upgrade offer to the ${num(DASH.fiveg.readyNow)} customers whose home has 5G but who are still on 4G. 4) Pilot a signal check before online and agent sales. Keep 20–30% as control in each. Estimated cost ${rp(120 * 8000 + 120 * 0.2 * 3 * 250000)} for the offer.`,
    code: "propose_campaigns(budget_cap=rp(25_000_000))",
  },
  { who: "human", title: "Approval", body: "A retention lead reviews the plan, the offer wording and the budget. Nothing goes out without this step." },
  { who: "agent", title: "Write the messages", body: "Per customer, from approved templates only: “Hi, we noticed your home internet has been slower lately. Your area now has 5G: swap your router for free and get 100 Mbps for Rp 350k.”", code: "draft_messages(template='5g-upgrade-v2', channel='whatsapp')" },
  { who: "agent", title: "Measure, then learn", body: "In 60 days it compares each group with its control, updates the scoreboard, and drops what didn't work from next month's plan.", code: "schedule(measure_lift, in_days=60)" },
];

export function AgentLoop() {
  const [n, setN] = useState(3);
  const [approved, setApproved] = useState(false);
  const gate = STEPS.findIndex((s) => s.who === "human");
  const blocked = n > gate && !approved;
  const shown = STEPS.slice(0, blocked ? gate + 1 : n);
  return (
    <Panel
      title="An agent that runs the retention loop"
      sub="A simulation on this page's data: the numbers are real, the reasoning is scripted, and nothing is sent. The agent's tools only read data and draft; a person approves offers, budgets and wording."
      right={
        <div className="flex gap-2">
          <button type="button" onClick={() => setN((v) => Math.min(STEPS.length, v + 1))} disabled={blocked || n >= STEPS.length} className="rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-30">
            Next step
          </button>
          <button
            type="button"
            onClick={() => {
              setN(3);
              setApproved(false);
            }}
            className="rounded-full border border-line px-3.5 py-1.5 text-[12.5px]"
          >
            Restart
          </button>
        </div>
      }
    >
      <ol className="flex flex-col gap-2">
        {shown.map((s, i) => {
          const Icon = s.who === "agent" ? Bot : s.who === "human" ? User : Check;
          return (
            <li key={s.title} className={`grid grid-cols-[32px_1fr] gap-3 rounded-2xl p-3 ${s.who === "tool" ? "bg-ink/[0.035]" : s.who === "human" ? "border border-[#c29a00]/40 bg-[#fff8e1]" : "border border-line"}`}>
              <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: s.who === "agent" ? C.ink : s.who === "human" ? C.gold : "#e6e6e3", color: s.who === "tool" ? C.ink : "#fff" }}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">
                  <span className="mr-2 font-mono text-[10.5px] text-ink/40 uppercase">{s.who === "tool" ? "tool result" : s.who}</span>
                  {s.title}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2/80">{s.body}</p>
                {s.code && <code className="mt-1.5 inline-block rounded-md bg-ink px-2 py-0.5 font-mono text-[11px] text-white/85">{s.code}</code>}
                {s.who === "human" && i === gate && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {approved ? (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: C.green }}>
                        <ShieldCheck className="h-4 w-4" /> Approved: the agent may continue
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setApproved(true);
                            setN(gate + 2);
                          }}
                          className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-white"
                          style={{ background: C.green }}
                        >
                          Approve plan
                        </button>
                        <span className="text-[12px] text-ink/50">The agent waits here until someone approves.</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 grid gap-2 text-[12.5px] sm:grid-cols-3">
        {[
          ["Where AI helps", "Reading the numbers every week, spotting who needs what, drafting personal messages at scale, and remembering what worked."],
          ["Where people stay", "Offers, budgets, wording, and anything that touches a customer's money or contract."],
          ["Guardrails", "Read-only data tools, approved templates, a control group on every action, and a log of every step."],
        ].map(([h, p]) => (
          <div key={h} className="rounded-2xl border border-line p-3">
            <p className="font-semibold">{h}</p>
            <p className="mt-1 text-ink-2/70">{p}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
