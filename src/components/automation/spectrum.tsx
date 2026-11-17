"use client";

import { useState } from "react";

/* Rules or reasoning: where each kind of automation sits between fixed rules and open-ended judgement, what changes
 * as a task needs more judgement, and eight everyday tasks to sort. Rules of thumb, stated as such on the page. */
const MARKS: [string, number][] = [
  ["Script / CI", 6],
  ["RPA bot", 14],
  ["Pipeline", 22],
  ["No-code workflow", 32],
  ["Workflow + one AI step", 58],
  ["AI agent", 86],
];
const ZONES = [
  {
    to: 40,
    name: "Fixed rules",
    advice: "Use plain automation: it's exact, cheap to run and easy to test. Most automation lives here.",
    traits: { "Same input, same output": "always", "Cost per run": "next to nothing", "When it goes wrong": "loudly, with an error", "How you test it": "ordinary tests" },
  },
  {
    to: 70,
    name: "Mostly rules, some reading",
    advice: "Keep the workflow fixed and add an AI step only where text has to be read or written: a ticket sorted, an invoice read, a reply drafted.",
    traits: { "Same input, same output": "mostly", "Cost per run": "small, plus the AI calls", "When it goes wrong": "at the AI step", "How you test it": "tests, plus checks on sample outputs" },
  },
  {
    to: 101,
    name: "Open-ended judgement",
    advice: "An agent can plan the steps itself. Give it few, well-described tools, hard limits, a log of every step and a person to approve anything risky.",
    traits: { "Same input, same output": "not guaranteed", "Cost per run": "an AI call at every step", "When it goes wrong": "quietly, with a plausible wrong answer", "How you test it": "evaluations on many examples" },
  },
];

type Opt = "script" | "workflow" | "rpa" | "pipeline" | "agent";
const OPTS: [Opt, string][] = [
  ["script", "Script, cron or CI"],
  ["workflow", "No-code workflow"],
  ["rpa", "RPA / browser bot"],
  ["pipeline", "Orchestrated pipeline"],
  ["agent", "AI agent"],
];
const TASKS: { task: string; ok: Opt[]; why: string }[] = [
  { task: "Back up the database every night at 2 am.", ok: ["script", "pipeline"], why: "Fixed steps on a schedule, no decisions: a scheduled script (or a CI job) is all it takes." },
  { task: "When someone fills in the website form, add them to a sheet and send a welcome email.", ok: ["workflow"], why: "One event, two apps with ready-made connectors: a classic no-code workflow." },
  { task: "Type 300 invoices into an old desktop accounting app that has no API.", ok: ["rpa"], why: "With no API, the only way in is the screen. That's what RPA is for." },
  { task: "Read customer emails, work out what each one wants and draft replies for a person to check.", ok: ["agent"], why: "Free text and judgement: an AI agent, with a person approving before anything is sent." },
  { task: "Every night, pull sales from five systems, clean them and rebuild the dashboard tables.", ok: ["pipeline"], why: "Many dependent steps that must not fail in silence: an orchestrated pipeline with retries and alerts." },
  { task: "Sort incoming support tickets by topic and urgency.", ok: ["workflow", "agent"], why: "Reading text needs a model, but a fixed workflow with one AI step is usually enough; a full agent is optional." },
  { task: "Run the tests and publish the website every time code is pushed.", ok: ["script"], why: "That's CI/CD: a scripted pipeline triggered by a push, for example GitHub Actions." },
  { task: "Download a report from a supplier's website every morning. It has no API.", ok: ["rpa"], why: "A browser bot (Playwright) or an RPA robot logs in and clicks Download for you." },
];

export function Spectrum() {
  const [need, setNeed] = useState(25);
  const zone = ZONES.find((z) => need < z.to) ?? ZONES[2];
  const near = MARKS.filter(([, p]) => Math.abs(p - need) <= 16).map(([n]) => n);
  return (
    <div className="rounded-[24px] border border-line bg-white p-4 sm:p-5">
      <div className="relative mt-6 h-3 rounded-full" style={{ background: "linear-gradient(90deg, #0b0b0b 0%, #6250d6 55%, #eb6834 100%)" }}>
        {MARKS.map(([n, p], i) => (
          <span key={n} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${p}%` }}>
            <span className="block h-4 w-4 rounded-full border-2 border-white" style={{ background: near.includes(n) ? "#eb6834" : "#0b0b0b" }} />
            <span className={`absolute left-1/2 hidden -translate-x-1/2 text-[11px] font-semibold whitespace-nowrap md:block ${i % 2 ? "top-6" : "-top-7"} ${near.includes(n) ? "text-ink" : "text-ink-2/45"}`}>{n}</span>
          </span>
        ))}
        <span className="pointer-events-none absolute top-1/2 h-7 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#eb6834] shadow" style={{ left: `${need}%` }} />
      </div>
      <div className="mt-9 flex justify-between font-mono text-[10.5px] tracking-[0.12em] text-ink-2/50 uppercase">
        <span>fixed rules</span>
        <span>open-ended judgement</span>
      </div>
      <label className="mt-3 block text-[13px] font-semibold">
        How much judgement does your task need?
        <input type="range" min={0} max={100} value={need} onChange={(e) => setNeed(Number(e.target.value))} className="mt-2 w-full" style={{ accentColor: "#eb6834" }} />
      </label>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl bg-cream/60 p-4">
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-ink-2/50 uppercase">{zone.name}</p>
          <p className="mt-1 text-[14px] leading-snug font-medium">{zone.advice}</p>
          <p className="mt-2 text-[12px] text-ink-2/60">Fits here: {near.length ? near.join(", ") : "—"}</p>
        </div>
        <dl className="grid grid-cols-2 gap-2">
          {Object.entries(zone.traits).map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-line px-3 py-2.5">
              <dt className="text-[11px] text-ink-2/55">{k}</dt>
              <dd className="mt-0.5 text-[13.5px] leading-snug font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function TaskSorter() {
  const [picks, setPicks] = useState<(Opt | null)[]>(TASKS.map(() => null));
  const done = picks.filter((p) => p != null).length;
  const right = picks.filter((p, i) => p != null && TASKS[i].ok.includes(p)).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-[20px] bg-ink px-4 py-3 text-white">
        <p className="text-[13px]">
          <span className="text-[1.4rem] font-semibold tabular-nums">{right}</span>
          <span className="text-white/60"> good calls of {done} answered</span>
        </p>
        <p className="text-[12px] text-white/50">Pick the kind of automation you&apos;d use for each task.</p>
        {done > 0 && (
          <button type="button" onClick={() => setPicks(TASKS.map(() => null))} className="ml-auto rounded-full border border-white/25 px-3 py-1 text-[12px]">
            Start over
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {TASKS.map((t, i) => {
          const p = picks[i];
          const good = p != null && t.ok.includes(p);
          return (
            <div key={t.task} className={`rounded-[20px] border bg-white p-4 transition ${p == null ? "border-line" : good ? "border-[#1baf7a]" : "border-[#c8413f]"}`}>
              <p className="text-[14px] leading-snug font-semibold">
                <span className="mr-1.5 font-mono text-[11px] text-muted">0{i + 1}</span>
                {t.task}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {OPTS.map(([k, label]) => {
                  const chosen = p === k;
                  const isOk = t.ok.includes(k);
                  const cls = p == null ? "bg-cream/70 text-ink/75 hover:text-ink" : chosen ? (isOk ? "bg-[#1baf7a] text-white" : "bg-[#c8413f] text-white") : isOk ? "ring-2 ring-[#1baf7a] text-ink" : "text-ink/35";
                  return (
                    <button key={k} type="button" aria-pressed={chosen} onClick={() => setPicks((a) => a.map((x, j) => (j === i ? k : x)))} className={`rounded-full px-2.5 py-1 text-[12px] transition ${cls}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
              {p != null && (
                <p className="mt-2 text-[12.5px] leading-snug text-ink-2/70">
                  <span className="font-semibold" style={{ color: good ? "#0f6e4c" : "#a3302e" }}>
                    {good ? "Good call. " : "Usually not. "}
                  </span>
                  {t.why}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
