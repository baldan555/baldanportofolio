"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const DE_MENU = [
  { href: "/skills/data-engineering", label: "Overview" },
  { href: "/skills/data-engineering/lab", label: "Pipeline lab", lab: true },
  { href: "/skills/data-engineering/simulator", label: "Incident simulator" },
  { href: "/skills/data-engineering/architectures", label: "Architectures" },
  { href: "", label: "Work case", soon: true },
];

/** The Data Engineering sub-menu, pinned under the site header on every page of the hub. */
export function DataEngNav() {
  const path = usePathname();
  return (
    <nav className="sticky top-16 z-40 border-y border-line bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] items-center gap-1 overflow-x-auto px-5 py-2.5 md:px-10">
        <span className="mr-2 hidden font-mono text-[11px] tracking-[0.16em] whitespace-nowrap text-muted uppercase sm:inline">Data Engineering</span>
        {DE_MENU.map((m) =>
          m.soon ? (
            <span key={m.label} className="rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap text-ink/30" title="Coming next">
              {m.label} <span className="font-mono text-[10px]">soon</span>
            </span>
          ) : "lab" in m && m.lab ? (
            // the project list, always glowing so it's found first
            <Link
              key={m.label}
              href={m.href}
              className={`spotlight flex shrink-0 rounded-full p-[1.5px] ${path === m.href || (m.href !== "/skills/data-engineering" && path.startsWith(`${m.href}/`)) ? "ring-2 ring-ink/70 ring-offset-1 ring-offset-bg" : ""}`}
            >
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold whitespace-nowrap ${path === m.href || (m.href !== "/skills/data-engineering" && path.startsWith(`${m.href}/`)) ? "bg-ink text-white" : "bg-white text-ink"}`}>
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
              className={`rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors ${path === m.href || (m.href !== "/skills/data-engineering" && path.startsWith(`${m.href}/`)) ? "bg-ink text-white" : "text-ink/60 hover:bg-ink/5 hover:text-ink"}`}
            >
              {m.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
