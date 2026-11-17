"use client";

import { useState } from "react";
import { ARCHS, FIT_QS, RATING_ROWS, STAGES, archById, type ArchId } from "@/data/web-archs";
import { ArchCanvas } from "./arch-canvas";
import { showArch } from "./explorer";

/* ------------------------------------------------------------------ how products usually grow */
function Thumb({ id }: { id: ArchId }) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#fbfaf7] p-1.5">
      <ArchCanvas arch={archById(id)} mini />
    </div>
  );
}

export function GrowthStory() {
  const line = STAGES.filter((s) => !s.alongside);
  const side = STAGES.filter((s) => s.alongside);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {line.map((s, i) => (
          <article key={s.arch} className="relative flex flex-col rounded-[22px] border border-line bg-white p-3">
            <div className="flex items-baseline justify-between px-1">
              <span className="text-[13px] font-semibold">{s.when}</span>
              <span className="font-mono text-[10.5px] text-ink-2/50">{s.team}</span>
            </div>
            <div className="mt-2">
              <Thumb id={s.arch} />
            </div>
            <h3 className="mt-2.5 px-1 text-[1.15rem] font-semibold tracking-[-0.02em]">{archById(s.arch).name}</h3>
            <p className="mt-0.5 flex-1 px-1 text-[12.5px] leading-snug text-ink-2/65">{s.text}</p>
            <button type="button" onClick={() => showArch(s.arch)} className="mt-2.5 self-start rounded-full px-1 text-[12px] font-semibold text-[#eb6834] hover:underline">
              See it animated ↑
            </button>
            {i < line.length - 1 && (
              <span aria-hidden className="absolute top-1/2 -right-[13px] z-10 hidden h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-ink text-[12px] text-white xl:grid">
                →
              </span>
            )}
          </article>
        ))}
      </div>
      <div className="grid gap-3 rounded-[22px] bg-cream/60 p-3 md:grid-cols-[auto_1fr_1fr] md:items-center">
        <p className="px-2 text-[13px] font-semibold md:w-28">Any time, alongside the rest</p>
        {side.map((s) => (
          <div key={s.arch} className="grid grid-cols-[110px_1fr] items-center gap-3 rounded-2xl bg-white p-2.5">
            <Thumb id={s.arch} />
            <div>
              <p className="text-[14px] font-semibold">{archById(s.arch).name}</p>
              <p className="text-[12px] leading-snug text-ink-2/65">{s.text}</p>
              <button type="button" onClick={() => showArch(s.arch)} className="mt-1 text-[12px] font-semibold text-[#eb6834] hover:underline">
                See it animated ↑
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">A common path, not a ladder everyone must climb. Plenty of successful products stay a well-kept monolith or modular monolith for good; moving right only pays off once the problems on the left actually hurt.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ side by side */
function Dots({ n, on }: { n: number; on: boolean }) {
  return (
    <span className="inline-flex gap-[3px]" aria-label={`${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="h-2 w-2 rounded-full" style={{ background: i <= n ? (on ? "#eb6834" : "#0b0b0b") : "rgba(11,11,11,0.1)" }} />
      ))}
    </span>
  );
}

export function ArchTable({ mark }: { mark?: ArchId | null }) {
  const [hover, setHover] = useState<ArchId | null>(null);
  const hi = hover ?? mark ?? null;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-[22px] border border-line bg-white">
        <table className="w-full min-w-[820px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-2.5 text-left font-mono text-[10.5px] font-normal text-ink-2/50 uppercase">rule of thumb, 5 = best</th>
              {ARCHS.map((a) => (
                <th key={a.id} onMouseEnter={() => setHover(a.id)} onMouseLeave={() => setHover(null)} className={`px-3 py-2.5 text-left font-semibold transition ${hi === a.id ? "bg-ink text-white" : ""}`}>
                  {a.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RATING_ROWS.map(([k, label]) => (
              <tr key={k} className="border-b border-line last:border-0">
                <td className="px-4 py-2 text-ink-2/65">{label}</td>
                {ARCHS.map((a) => (
                  <td key={a.id} onMouseEnter={() => setHover(a.id)} onMouseLeave={() => setHover(null)} className={`px-3 py-2 transition ${hi === a.id ? "bg-cream" : ""}`}>
                    <Dots n={a.ratings[k]} on={hi === a.id} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">Rules of thumb for a typical product, not measurements: a disciplined team can make a monolith scale well or keep microservices simple. No column wins every row, which is the point.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ which one fits */
export function ArchFit() {
  const [ans, setAns] = useState<(number | null)[]>(FIT_QS.map(() => null));
  const score = Object.fromEntries(ARCHS.map((a) => [a.id, 0])) as Record<ArchId, number>;
  ans.forEach((a, i) => {
    if (a == null) return;
    for (const [k, v] of Object.entries(FIT_QS[i].opts[a].w) as [ArchId, number][]) score[k] += v;
  });
  const answered = ans.filter((a) => a != null).length;
  const ranked = [...ARCHS].sort((a, b) => score[b.id] - score[a.id]);
  const best = ranked[0];
  const max = Math.max(1, score[best.id]);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          {FIT_QS.map((q, i) => (
            <div key={q.q} className="rounded-2xl border border-line bg-white px-4 py-3">
              <p className="text-[13.5px] font-semibold">{q.q}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.opts.map((o, j) => (
                  <button key={o.a} type="button" aria-pressed={ans[i] === j} onClick={() => setAns((a) => a.map((x, k) => (k === i ? (x === j ? null : j) : x)))} className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${ans[i] === j ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}>
                    {o.a}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col rounded-[22px] bg-ink p-5 text-white">
          <p className="font-mono text-[11px] tracking-[0.16em] text-white/45 uppercase">{answered ? `Start here · ${answered} of ${FIT_QS.length} answered` : "Start here"}</p>
          {answered ? (
            <>
              <p className="mt-2 text-[2rem] leading-none font-semibold tracking-[-0.04em]">{best.name}</p>
              <p className="mt-2 text-[13px] leading-snug text-white/65">{best.tagline}</p>
              <div className="mt-3 overflow-hidden rounded-xl bg-white p-1.5">
                <ArchCanvas arch={best} mini />
              </div>
              <div className="mt-4 space-y-1.5">
                {ranked.map((a) => (
                  <div key={a.id} className="grid grid-cols-[9.5rem_1fr_1.5rem] items-center gap-2 text-[11.5px]">
                    <span className="truncate text-white/70">{a.name}</span>
                    <span className="h-2 rounded-full bg-white/10">
                      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${(score[a.id] / max) * 100}%`, background: a.id === best.id ? "#eb6834" : "rgba(255,255,255,0.45)" }} />
                    </span>
                    <span className="text-right font-mono text-white/50">{score[a.id]}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => showArch(best.id)} className="mt-4 self-start rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-ink">
                Watch an order go through it ↑
              </button>
            </>
          ) : (
            <p className="mt-2 text-[1.3rem] leading-snug font-semibold">Answer a question or two and a starting point appears, with how every option scored.</p>
          )}
        </div>
      </div>
      <ArchTable mark={answered ? best.id : null} />
    </div>
  );
}
