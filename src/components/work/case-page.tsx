import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { CaseStudy } from "@/data/cases";
import { BrowserShot } from "./browser-shot";
import { ForecastArt } from "./forecast-art";
import { Points, WorkSection } from "./sections";

/** The shared layout of a "how it works" page: hero, walkthrough, try-it demo, mechanisms, access, details, architecture, stack. */
export function CasePage({ c, demo }: { c: CaseStudy; demo?: ReactNode }) {
  const t = c.tone;
  const accent = { kicker: t.kicker, rule: t.rule };
  const [before, after] = c.highlight && c.title.includes(c.highlight) ? c.title.split(c.highlight) : [c.title, ""];
  let n = 0;
  const k = (label: string) => `${String(++n).padStart(2, "0")} · ${label}`;

  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className={`pointer-events-none absolute inset-0 ${t.hero}`} />
        <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-5 pt-14 pb-14 md:px-10 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:pb-20">
          <div>
            <p className={`mb-5 font-mono text-[12px] tracking-[0.2em] uppercase ${t.kicker}`}>Case study · {c.kicker}</p>
            <h1 className="text-[2.6rem] leading-[0.97] font-semibold tracking-[-0.05em] sm:text-[4rem]">
              {before}
              {c.highlight && <span className={t.highlight}>{c.highlight}</span>}
              {after}
            </h1>
            <p className="mt-6 max-w-xl text-[17.5px] leading-relaxed text-ink-2/75">{c.lede}</p>
            <div className="mt-7 flex flex-wrap gap-2 font-mono text-[11.5px]">
              {c.chips.map((chip) => (
                <span key={chip} className={`rounded-full border bg-white/70 px-3 py-1 ${t.chip}`}>
                  {chip}
                </span>
              ))}
            </div>
            {((demo && c.demo) || c.links) && (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {demo && c.demo && (
                  <a href="#try" className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold transition ${t.cta}`}>
                    {c.demo.cta} ↓
                  </a>
                )}
                {c.links?.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="Visit"
                    className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white/70 px-5 py-3 text-[14px] font-semibold text-ink transition hover:bg-white"
                  >
                    {l.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
          {c.shot ? <BrowserShot src={c.shot.src} alt={c.shot.alt} label={c.shot.label} priority /> : <ForecastArt />}
        </div>
      </section>
      <p className="mx-auto max-w-[1240px] px-5 pt-4 font-mono text-[11.5px] text-muted md:px-10">{c.dataNote}</p>

      {/* walkthrough */}
      <WorkSection accent={accent} id="flow" kicker={k(c.flow.kicker)} title={c.flow.title} line={c.flow.line}>
        <ol className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${c.flow.steps.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          {c.flow.steps.map((s, i) => (
            <li key={s.h} className={`border-t pt-4 ${t.rule}`}>
              <span className={`grid h-7 w-7 place-items-center rounded-full font-mono text-[12px] font-semibold ${t.step}`}>{i + 1}</span>
              <p className="mt-4 text-[16px] font-semibold tracking-[-0.01em]">{s.h}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2/70">{s.p}</p>
            </li>
          ))}
        </ol>
      </WorkSection>

      {/* try it */}
      {demo && c.demo && (
        <WorkSection accent={accent} id="try" kicker={k(c.demo.kicker)} title={c.demo.title} line={c.demo.line}>
          {demo}
        </WorkSection>
      )}

      {/* mechanisms, with a second screen when there is one */}
      <WorkSection accent={accent} id="mechanisms" kicker={k(c.mechanisms.kicker)} title={c.mechanisms.title} line={c.mechanisms.line}>
        {c.mechanisms.shot ? (
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            <BrowserShot src={c.mechanisms.shot.src} alt={c.mechanisms.shot.alt} label={c.mechanisms.shot.label} />
            <Points accent={accent} items={c.mechanisms.items} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-14 md:grid-cols-2">
            <Points accent={accent} items={c.mechanisms.items.slice(0, Math.ceil(c.mechanisms.items.length / 2))} />
            <div className="mt-5 md:mt-0">
              <Points accent={accent} items={c.mechanisms.items.slice(Math.ceil(c.mechanisms.items.length / 2))} />
            </div>
          </div>
        )}
      </WorkSection>

      {/* who sees what */}
      {c.access && (
        <WorkSection accent={accent} id="access" kicker={k(c.access.kicker)} title={c.access.title} line={c.access.line}>
          <div className="overflow-hidden rounded-[22px] border border-line bg-white">
            {c.access.rows.map((r, i) => (
              <div key={r.who} className={`grid grid-cols-1 gap-1 p-5 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-6 ${i ? "border-t border-line" : ""}`}>
                <p className="text-[15px] font-semibold">{r.who}</p>
                <p className="text-[14px] leading-relaxed text-ink-2/70">{r.can}</p>
              </div>
            ))}
          </div>
        </WorkSection>
      )}

      {/* small stuff */}
      <WorkSection accent={accent} id="details" kicker={k("The small stuff")} title={c.details.title}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.details.items.map((s) => (
            <div key={s.h} className="rounded-[22px] border border-line bg-white p-5">
              <p className="text-[15px] font-semibold tracking-[-0.01em]">{s.h}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2/70">{s.p}</p>
            </div>
          ))}
        </div>
      </WorkSection>

      {/* architecture */}
      <WorkSection accent={accent} id="architecture" kicker={k("How it fits together")} title={c.architecture.title} line={c.architecture.line}>
        <div className={`grid grid-cols-1 gap-3 ${c.architecture.nodes.length === 2 ? "md:grid-cols-2" : c.architecture.nodes.length >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
          {c.architecture.nodes.map((node) => (
            <div key={node.title} className={`rounded-[22px] p-5 ${node.main ? "bg-ink text-white" : node.soft ? t.soft : "border border-line bg-white"}`}>
              <p className={`font-mono text-[11px] tracking-[0.14em] uppercase ${node.main ? "text-white/50" : t.kicker}`}>{node.where}</p>
              <p className="mt-2 text-[16px] font-semibold">{node.title}</p>
              <p className={`mt-1 text-[13.5px] leading-relaxed ${node.main ? "text-white/65" : "text-ink-2/70"}`}>{node.body}</p>
              {node.parts && (
                <div className="mt-4 grid grid-cols-1 gap-2 font-mono text-[11px] sm:grid-cols-2">
                  {node.parts.map((p) => (
                    <div key={p.name} className={`rounded-xl p-2.5 ${node.main ? "bg-white/10" : "bg-ink/[0.04]"}`}>
                      <p className={`font-semibold ${node.main ? "text-white" : "text-ink"}`}>{p.name}</p>
                      <p className={node.main ? "text-white/55" : "text-ink/55"}>{p.what}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </WorkSection>

      {/* stack */}
      <WorkSection accent={accent} id="stack" kicker={k("Tech stack")} title={c.stack.title}>
        <div className="grid grid-cols-1 gap-x-10 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
          {c.stack.items.map((s) => (
            <div key={s.tech} className={`border-t py-4 ${t.rule}`}>
              <p className="font-mono text-[13px] font-semibold">{s.tech}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-2/70">{s.role}</p>
            </div>
          ))}
        </div>
      </WorkSection>
    </>
  );
}
