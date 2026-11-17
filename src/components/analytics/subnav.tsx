"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ANALYTICS_MENU = [
  { href: "/skills/analytics", label: "Overview" },
  { href: "/skills/analytics/models", label: "Data models" },
  { href: "/skills/analytics/tools", label: "Tools" },
  { href: "/skills/analytics/charts", label: "Chart library" },
  { href: "/skills/analytics/dashboards", label: "Dashboards", lab: true },
  { href: "", label: "SQL playground", soon: true },
];

/** The Data Analytics & BI sub-menu, pinned under the site header on every analytics page. */
export function AnalyticsNav() {
  const path = usePathname();
  return (
    <nav className="sticky top-16 z-40 border-y border-line bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] items-center gap-1 overflow-x-auto px-5 py-2.5 md:px-10">
        <span className="mr-2 hidden font-mono text-[11px] tracking-[0.16em] whitespace-nowrap text-muted uppercase sm:inline">Data Analytics & BI</span>
        {ANALYTICS_MENU.map((m) =>
          m.soon ? (
            <span key={m.label} className="rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap text-ink/30" title="Coming next">
              {m.label} <span className="font-mono text-[10px]">soon</span>
            </span>
          ) : "lab" in m && m.lab ? (
            // the project list, always glowing so it's found first
            <Link
              key={m.label}
              href={m.href}
              className={`spotlight flex shrink-0 rounded-full p-[1.5px] ${path === m.href || (m.href !== "/skills/analytics" && path.startsWith(`${m.href}/`)) ? "ring-2 ring-ink/70 ring-offset-1 ring-offset-bg" : ""}`}
            >
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold whitespace-nowrap ${path === m.href || (m.href !== "/skills/analytics" && path.startsWith(`${m.href}/`)) ? "bg-ink text-white" : "bg-white text-ink"}`}>
                <span className="relative flex h-1.5 w-1.5 text-live">
                  <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
                </span>
                {m.label}
              </span>
            </Link>
          ) : (
            <Link
              key={m.label}
              href={m.href}
              className={`rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors ${path === m.href || (m.href !== "/skills/analytics" && path.startsWith(`${m.href}/`)) ? "bg-ink text-white" : "text-ink/60 hover:bg-ink/5 hover:text-ink"}`}
            >
              {m.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}

/** Page header shared by the analytics pages. */
export function AnalyticsHeader({ kicker, title, line, children }: { kicker: string; title: string; line: string; children?: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1240px] px-5 pt-14 pb-10 md:px-10 md:pt-20">
      <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">{kicker}</p>
      <h1 className="max-w-4xl text-[2.8rem] leading-[0.95] font-semibold tracking-[-0.05em] sm:text-[4.6rem]">{title}</h1>
      <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-ink-2/75">{line}</p>
      {children}
    </section>
  );
}
