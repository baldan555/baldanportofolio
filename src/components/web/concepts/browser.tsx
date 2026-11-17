"use client";

import Link from "next/link";
import { useLenis } from "lenis/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { CONCEPTS, GROUPS, type Concept, type Group } from "@/data/web-concepts";
import { FLOWS } from "@/data/web-flows";
import type { WebTool } from "@/data/web-tools";
import type { Logo } from "../logos";
import { ToolLogo } from "../tools/shared";
import { ConceptDemo } from "./demos";
import { FlowCard, FlowPlayer } from "./flow";

/** The concept library: search, filter by group, cards with step-by-step animated flows, and a detail panel per concept. */
export function ConceptsBrowser({ tools, logos }: { tools: WebTool[]; logos: Record<string, Logo> }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<Group | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const lenis = useLenis();
  const byTool = useMemo(() => new Map(tools.map((t) => [t.id, t])), [tools]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return CONCEPTS.filter((c) => (group === "all" || c.group === group) && (!s || `${c.name} ${c.short} ${c.body}`.toLowerCase().includes(s)));
  }, [q, group]);

  const show = useCallback((id: string | null) => {
    setOpen(id);
    history.replaceState(null, "", id ? `#c-${id}` : `${location.pathname}${location.search}`);
  }, []);

  // deep links: #c-<id> opens that concept
  useEffect(() => {
    const read = () => {
      const m = location.hash.match(/^#c-(.+)$/);
      setOpen(m && CONCEPTS.some((c) => c.id === m[1]) ? m[1] : null);
    };
    const id = window.setTimeout(read, 0);
    window.addEventListener("hashchange", read);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("hashchange", read);
    };
  }, []);

  // while the panel is open: Esc closes it and the page behind stops scrolling
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") show(null);
    };
    window.addEventListener("keydown", onKey);
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
      document.body.style.overflow = prev;
    };
  }, [open, lenis, show]);

  const c = open ? CONCEPTS.find((x) => x.id === open) : undefined;
  const order = list.some((x) => x.id === open) ? list : CONCEPTS;
  const at = c ? order.findIndex((x) => x.id === c.id) : -1;

  return (
    <div className="mx-auto max-w-[1240px] px-5 md:px-10">
      <div className="sticky top-[6.75rem] z-30 -mx-5 border-b border-line bg-bg/90 px-5 py-3 backdrop-blur-xl md:-mx-10 md:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search concepts: API, cache, JWT…" aria-label="Search concepts" className="w-full rounded-full border border-line bg-white py-2 pr-3 pl-9 text-[13.5px] outline-none focus:border-ink" />
          </label>
          <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Group">
            {[{ id: "all" as const, name: "All" }, ...GROUPS].map((g) => (
              <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => setGroup(g.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] whitespace-nowrap transition ${group === g.id ? "bg-ink text-white" : "text-ink/60 hover:bg-ink/5 hover:text-ink"}`}>
                {g.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {list.length === 0 && <p className="mt-10 rounded-2xl bg-cream/60 px-4 py-10 text-center text-[14px] text-ink-2/60">No concept matches “{q}”.</p>}

      {GROUPS.map((g) => {
        const items = list.filter((x) => x.group === g.id);
        if (!items.length) return null;
        return (
          <section key={g.id} id={g.id} className="mt-12 scroll-mt-48">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-[1.7rem] leading-tight font-semibold tracking-[-0.03em]">{g.name}</h2>
              <p className="text-[13.5px] text-ink-2/55">
                {g.line} · {items.length}
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((x) => (
                <button key={x.id} type="button" onClick={() => show(x.id)} className="group flex flex-col rounded-[22px] border border-line bg-white p-3 text-left transition hover:-translate-y-1 hover:border-ink/30">
                  <FlowCard flow={FLOWS[x.id]} />
                  <div className="mt-3 flex items-start justify-between gap-2 px-1">
                    <p className="text-[15.5px] leading-tight font-semibold tracking-[-0.01em]">{x.name}</p>
                    {x.demo && <span className="shrink-0 rounded-full bg-[#eb6834]/12 px-2 py-0.5 font-mono text-[10px] text-[#eb6834]">try it</span>}
                  </div>
                  <p className="mt-1 flex-1 px-1 text-[12.5px] leading-snug text-ink-2/60">{x.short}</p>
                  <span className="mt-2 px-1 text-[12px] font-semibold text-ink/50 group-hover:text-ink">Open →</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {c && <Panel c={c} byTool={byTool} logos={logos} onClose={() => show(null)} prev={at > 0 ? order[at - 1] : undefined} next={at >= 0 && at < order.length - 1 ? order[at + 1] : undefined} go={show} />}
    </div>
  );
}

function Panel({ c, byTool, logos, onClose, prev, next, go }: { c: Concept; byTool: Map<string, WebTool>; logos: Record<string, Logo>; onClose: () => void; prev?: Concept; next?: Concept; go: (id: string) => void }) {
  const g = GROUPS.find((x) => x.id === c.group);
  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label={c.name}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" />
      <div data-lenis-prevent className="relative h-full w-full max-w-[580px] overflow-y-auto overscroll-contain bg-bg p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">{g?.name}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-ink/5" autoFocus>
            <X className="h-5 w-5" />
          </button>
        </div>
        <h3 className="mt-1 text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em]">{c.name}</h3>
        <p className="mt-2 text-[16px] leading-snug font-medium text-ink/80">{c.short}</p>
        <div className="mt-4">
          <FlowPlayer key={c.id} flow={FLOWS[c.id]} />
        </div>
        <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2/80">{c.body}</p>
        <div className="mt-4 rounded-2xl border border-line bg-white p-3.5">
          <p className="text-[11.5px] font-semibold text-ink-2/55">For example</p>
          <p className="mt-1 text-[14px] leading-snug">{c.example}</p>
        </div>
        {c.demo && (
          <div className="mt-4 rounded-[22px] border-2 border-[#eb6834]/40 bg-white p-4">
            <p className="mb-3 font-mono text-[11px] tracking-[0.14em] text-[#eb6834] uppercase">Try it, live</p>
            <ConceptDemo kind={c.demo} />
          </div>
        )}
        {c.tools && c.tools.length > 0 && (
          <div className="mt-5">
            <p className="text-[12px] font-semibold text-ink-2/60">Tools involved</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.tools.map((id) => {
                const t = byTool.get(id);
                if (!t) return null;
                return (
                  <Link key={id} href="/skills/web-mobile/tools#map" className="inline-flex items-center gap-2 rounded-xl border border-line bg-white py-1 pr-3 pl-1 text-[12.5px] hover:border-ink">
                    <ToolLogo t={t} logos={logos} size={13} />
                    {t.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        {c.links && c.links.length > 0 && (
          <div className="mt-5 space-y-1.5">
            {c.links.map((l) => (
              <Link key={l.href + l.label} href={l.href} className="group flex items-center justify-between gap-2 rounded-xl bg-ink px-3.5 py-2.5 text-[13px] text-white">
                {l.label}
                <ArrowUpRight className="h-4 w-4 shrink-0 transition group-hover:rotate-45" />
              </Link>
            ))}
          </div>
        )}
        <div className="mt-7 flex items-center justify-between gap-2 border-t border-line pt-4">
          {prev ? (
            <button type="button" onClick={() => go(prev.id)} className="inline-flex min-w-0 items-center gap-1 text-[13px] text-ink/60 hover:text-ink">
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{prev.name}</span>
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button type="button" onClick={() => go(next.id)} className="inline-flex min-w-0 items-center gap-1 text-right text-[13px] text-ink/60 hover:text-ink">
              <span className="truncate">{next.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
