"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type Item = { id: string; label: string };

type Lab = { label: string; count?: number } & ({ id: string; href?: never } | { href: string; id?: never });

/**
 * Skill page frame: a left rail that follows the scroll (wide screens) and, on phones, a floating button to the project list.
 * The lab entry always glows (.spotlight), because that's where the projects are: a section on this page (id) or the hub's lab page (href).
 * `top` clears whatever is pinned above (hubs have a second menu under the header).
 */
export function SkillShell({ items, lab, top = "top-28", children }: { items: Item[]; lab: Lab; top?: "top-28" | "top-36"; children: ReactNode }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? lab.id ?? "");
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const ids = [...items.map((i) => i.id), ...(lab.id ? [lab.id] : [])];
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.35;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
      setPastHero(window.scrollY > window.innerHeight * 0.7);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items, lab.id]);

  const go = (id: string) => (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  const inLab = !!lab.id && active === lab.id;
  const labHref = lab.href ?? `#${lab.id}`;
  const labLink = (className: string, inner: ReactNode) =>
    lab.href ? (
      <Link href={lab.href} className={className}>
        {inner}
      </Link>
    ) : (
      <a href={labHref} onClick={go(lab.id!)} aria-current={inLab ? "location" : undefined} className={className}>
        {inner}
      </a>
    );

  return (
    <>
      {/* wide screens: the rail */}
      <nav aria-label="On this page" className={`fixed ${top} left-0 z-30 hidden w-48 pl-6 lg:block`}>
        <p className="mb-4 font-mono text-[10.5px] tracking-[0.18em] text-muted uppercase">On this page</p>
        <ol className="relative flex flex-col gap-0.5 border-l border-line">
          {items.map((it) => {
            const on = active === it.id;
            return (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  onClick={go(it.id)}
                  aria-current={on ? "location" : undefined}
                  className={`-ml-px block border-l-2 py-1.5 pr-2 pl-3.5 text-[13px] leading-snug transition-colors ${on ? "border-ink font-semibold text-ink" : "border-transparent text-ink/50 hover:text-ink"}`}
                >
                  {it.label}
                </a>
              </li>
            );
          })}
        </ol>
        {labLink(
          `spotlight mt-5 flex w-fit items-center rounded-full p-[2px] ${inLab ? "ring-2 ring-ink/80 ring-offset-2 ring-offset-bg" : ""}`,
          <span className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-ink">
            <span className="relative flex h-2 w-2 text-live">
              <span className="pulse-ring relative h-2 w-2 rounded-full bg-live" />
            </span>
            {lab.label}
            {lab.count !== undefined && <span className="rounded-full bg-ink px-1.5 py-px font-mono text-[10.5px] text-white tabular-nums">{lab.count}</span>}
            {lab.href && <span aria-hidden>→</span>}
          </span>,
        )}
      </nav>

      {/* phones and tablets: a floating way to the projects, gone once you're there */}
      <div aria-hidden={!pastHero || inLab} className={`fixed bottom-5 left-1/2 z-40 -translate-x-1/2 transition-all duration-300 lg:hidden ${pastHero && !inLab ? "translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-6 opacity-0"}`}>
        {labLink(
          "spotlight flex items-center rounded-full p-[2px]",
          <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold whitespace-nowrap text-ink">
            <span className="relative flex h-2 w-2 text-live">
              <span className="pulse-ring relative h-2 w-2 rounded-full bg-live" />
            </span>
            {lab.href ? `${lab.label} →` : lab.count !== undefined ? `${lab.label} · ${lab.count} projects ↓` : `${lab.label} ↓`}
          </span>,
        )}
      </div>

      <div className="lg:pl-48">{children}</div>
    </>
  );
}

/** The highlighted shortcut to the project list: an anchor on this page (↓) or another page of the skill (→). */
export function LabButton({ href = "#lab", label, count, className = "" }: { href?: string; label: string; count?: number; className?: string }) {
  const inner = (
    <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold whitespace-nowrap text-ink">
      <span className="relative flex h-2 w-2 text-live">
        <span className="pulse-ring relative h-2 w-2 rounded-full bg-live" />
      </span>
      {label}
      {count !== undefined && <span className="rounded-full bg-ink px-1.5 py-px font-mono text-[11px] text-white tabular-nums">{count}</span>}
      <span aria-hidden>{href.startsWith("#") ? "↓" : "→"}</span>
    </span>
  );
  const cls = `spotlight inline-flex w-fit items-center rounded-full p-[2px] ${className}`;
  return href.startsWith("#") ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
