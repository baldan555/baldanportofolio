"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useLenis } from "lenis/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type Step = { t: string; d: ReactNode };

/**
 * Scroll-driven explainer, like a presentation: short steps scroll past on the left while one visual stays pinned
 * on the right and redraws itself for the step in the middle of the screen. On phones the visual pins to the top
 * and the steps scroll underneath. Steps can also be clicked, or stepped with the arrows.
 */
export function Scrolly({ steps, children }: { steps: Step[]; children: (step: number) => ReactNode }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const lenis = useLenis();

  useEffect(() => {
    // the reading line: mid-screen on desktop, below the pinned visual on phones
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: wide ? "-45% 0px -45% 0px" : "-72% 0px -22% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);

  const go = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(steps.length - 1, i))];
    if (!el) return;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const line = window.innerHeight * (wide ? 0.5 : 0.75);
    const offset = -(line - el.offsetHeight / 2);
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.1 });
    else
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY + offset,
        behavior: "smooth",
      });
    setActive(i);
  };

  return (
    <div className="relative md:grid md:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] md:gap-12">
      <div className="sticky top-[7.5rem] z-10 h-[50vh] md:order-last md:top-36 md:h-[min(620px,calc(100vh-11rem))] md:self-start">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-line bg-cream">
          {children(active)}
          <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-1 backdrop-blur">
            {steps.map((s, i) => (
              <button
                key={s.t}
                type="button"
                aria-label={`Step ${i + 1}: ${s.t}`}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-ink" : "w-1.5 bg-ink/25 hover:bg-ink/50"}`}
              />
            ))}
            <button type="button" aria-label="Previous step" onClick={() => go(active - 1)} className="ml-1 rounded-full p-0.5 hover:bg-ink/5 disabled:opacity-30" disabled={active === 0}>
              <ChevronUp className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Next step" onClick={() => go(active + 1)} className="rounded-full p-0.5 hover:bg-ink/5 disabled:opacity-30" disabled={active === steps.length - 1}>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="md:order-first">
        {steps.map((s, i) => (
          <div
            key={s.t}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-step={i}
            className="flex min-h-[58vh] items-center py-6 md:min-h-[72vh]"
          >
            <button type="button" onClick={() => go(i)} className={`text-left transition-opacity duration-500 ${active === i ? "opacity-100" : "opacity-30 hover:opacity-60"}`}>
              <span className="block font-mono text-[12px] text-muted">
                {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
              </span>
              <span className="mt-2 block text-[1.55rem] leading-tight font-semibold tracking-[-0.03em] sm:text-[2rem]">{s.t}</span>
              <span className="mt-3 block max-w-md text-[15.5px] leading-relaxed text-ink-2/75">{s.d}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Row of sample chips at the top of a visual: pick which real example the animation follows. */
export function Picker<T extends { id: string }>({ label, rows, value, onChange, tag }: { label: string; rows: T[]; value: number; onChange: (i: number) => void; tag?: (r: T) => string }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-4 pt-3.5 text-[11.5px]">
      <span className="mr-1 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{label}</span>
      {rows.map((r, i) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(i)}
          className={`rounded-full border px-2.5 py-1 transition-colors ${i === value ? "border-ink bg-ink text-white" : "border-ink/10 bg-white/70 hover:border-ink/30"}`}
        >
          {r.id}
          {tag && <span className={i === value ? "text-white/60" : "text-muted"}> · {tag(r)}</span>}
        </button>
      ))}
    </div>
  );
}

/** Section wrapper for "Inside the model". */
export function InsideSection({ id = "inside", kicker = "Inside the model", title, line, children }: { id?: string; kicker?: string; title: string; line?: string; children: ReactNode }) {
  return (
    <section id={id} className="mx-auto mt-24 max-w-[1240px] scroll-mt-24 px-5 md:px-10">
      <div className="mb-4 max-w-2xl">
        <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">{kicker}</p>
        <h2 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">{title}</h2>
        {line && <p className="mt-3 text-[16px] leading-relaxed text-ink-2/70">{line}</p>}
      </div>
      {children}
    </section>
  );
}
