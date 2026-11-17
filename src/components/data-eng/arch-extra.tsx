"use client";

import { useState } from "react";
import { Dots, FLOW, RATING_LABELS, openArch } from "./arch-gallery";
import { QUESTIONS, type Arch, type ArchId } from "./archs";

const ORANGE = "#eb6834";
const INK = "#0b0b0b";

/* ------------------------------------------------------------------ all six side by side */
export function ArchCompare({ archs }: { archs: Arch[] }) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-[24px] border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-line font-mono text-[10.5px] text-ink-2/55 uppercase">
              <th className="px-4 py-3 font-normal">Architecture</th>
              <th className="px-3 py-3 font-normal">Typical latency</th>
              {RATING_LABELS.map(([k, label]) => (
                <th key={k} className="px-3 py-3 font-normal">
                  {label}
                </th>
              ))}
              <th className="px-3 py-3 font-normal">Best for</th>
            </tr>
          </thead>
          <tbody>
            {archs.map((a) => (
              <tr key={a.id} className="group cursor-pointer border-b border-line last:border-0 hover:bg-cream/40" onClick={() => openArch(a.id)}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-semibold group-hover:underline">
                    <i className="h-2 w-2 rounded-full" style={{ background: FLOW[a.flow].color }} />
                    {a.name}
                    {a.real && <span className="rounded-full bg-[#eb6834]/15 px-1.5 font-mono text-[9.5px] text-[#eb6834]">real</span>}
                  </span>
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-ink-2/70">{a.latency}</td>
                {RATING_LABELS.map(([k]) => (
                  <td key={k} className="px-3 py-3">
                    <Dots v={a.ratings[k]} color={k === "cost" || k === "effort" ? ORANGE : INK} />
                  </td>
                ))}
                <td className="px-3 py-3 text-ink-2/70">{a.best[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        Dots are rules of thumb from practice, not benchmarks: a well-run streaming job can be cheap, and a careless batch job expensive. Click a row to open it in the gallery. Real platforms usually combine two or three: CDC feeding a lakehouse, batch building marts, reverse ETL pushing scores back out.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ which one fits? */
export function ArchPicker({ archs }: { archs: Arch[] }) {
  const [answers, setAnswers] = useState<(number | null)[]>(QUESTIONS.map(() => null));
  const score = new Map<ArchId, number>(archs.map((a) => [a.id, 0]));
  const why = new Map<ArchId, string[]>(archs.map((a) => [a.id, []]));
  answers.forEach((ai, qi) => {
    if (ai == null) return;
    const o = QUESTIONS[qi].options[ai];
    for (const [id, v] of Object.entries(o.score) as [ArchId, number][]) {
      score.set(id, (score.get(id) ?? 0) + v);
      const w = o.why[id];
      if (w) why.get(id)?.push(w);
    }
  });
  const ranked = [...archs].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0));
  const answered = answers.filter((a) => a != null).length;
  const top = ranked[0],
    second = ranked[1];
  const max = Math.max(1, score.get(top.id) ?? 0);
  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <div className="space-y-2 lg:col-span-7">
        {QUESTIONS.map((q, qi) => (
          <div key={q.q} className="rounded-[20px] border border-line bg-white p-4">
            <p className="text-[14px] font-semibold">
              <span className="mr-2 font-mono text-[11px] text-ink-2/45">0{qi + 1}</span>
              {q.q}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {q.options.map((o, oi) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={answers[qi] === oi}
                  onClick={() => setAnswers((a) => a.map((x, i) => (i === qi ? (x === oi ? null : oi) : x)))}
                  className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${answers[qi] === oi ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col rounded-[24px] bg-ink p-5 text-white lg:col-span-5">
        {answered === 0 ? (
          <>
            <p className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">Your fit</p>
            <p className="mt-2 text-[1.4rem] leading-tight font-semibold tracking-[-0.02em]">Answer a question or two.</p>
            <p className="mt-2 text-[13.5px] text-white/65">The scores update with every answer, and you can change your mind.</p>
          </>
        ) : (
          <>
            <p className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
              Your fit · {answered} of {QUESTIONS.length} answered
            </p>
            <p className="mt-2 text-[2rem] leading-none font-semibold tracking-[-0.04em]">{top.name}</p>
            <ul className="mt-3 space-y-1">
              {(why.get(top.id) ?? []).map((w) => (
                <li key={w} className="flex gap-2 text-[13px] leading-snug text-white/80">
                  <span className="text-[#1baf7a]">✓</span>
                  {w}
                </li>
              ))}
            </ul>
            {(score.get(second.id) ?? 0) > 0 && (
              <p className="mt-3 text-[12.5px] text-white/60">
                Runner-up: <span className="font-semibold text-white">{second.name}</span>
                {(score.get(second.id) ?? 0) >= (score.get(top.id) ?? 0) - 1 ? ", nearly as good; many platforms use both." : "."}
              </p>
            )}
            <div className="mt-4 space-y-1.5">
              {ranked.map((a) => (
                <div key={a.id} className="grid grid-cols-[6.5rem_1fr_1.5rem] items-center gap-2 text-[11.5px]">
                  <span className="truncate text-white/70">{a.short}</span>
                  <span className="h-2 rounded-full bg-white/10">
                    <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${((score.get(a.id) ?? 0) / max) * 100}%`, background: a.id === top.id ? ORANGE : "rgba(255,255,255,0.45)" }} />
                  </span>
                  <span className="text-right font-mono text-white/50">{score.get(a.id)}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => openArch(top.id)} className="mt-5 self-start rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink">
              Open {top.short} in the gallery ↑
            </button>
          </>
        )}
      </div>
    </div>
  );
}
