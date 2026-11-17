"use client";

import { AUTO_LAYERS, type AutoTool } from "@/data/auto-tools";
import type { Logo } from "../../web/logos";
import { Section, ToolLogo, big, type Downloads } from "../../web/tools/shared";
import type { Pypi } from "./map";

const NPM = "#cb3837";
const PY = "#3776ab";

/** Weekly downloads from npm (fetched by the browser) and PyPI (through a cached server route), layer by layer. */
export function AutoPopular({ tools, logos, npm, pypi }: { tools: AutoTool[]; logos: Record<string, Logo>; npm: Downloads | "error"; pypi: Pypi }) {
  const n = npm && npm !== "error" ? npm.counts : null;
  const p = pypi && pypi !== "error" ? pypi : null;
  const rows = tools.filter((t) => t.npm || t.pypi);
  return (
    <Section
      id="popular"
      kicker="03 · Live popularity"
      title="What developers installed last week."
      line="Weekly downloads from npm (JavaScript) and PyPI (Python), fetched just now. A rough signal of use, not of quality: build servers and other packages count too, and no-code platforms and RPA studios don't show up at all."
    >
      <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-ink-2/65">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: NPM }} /> npm
          {npm === "error" && <span className="text-[#a3302e]">(unavailable right now)</span>}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: PY }} /> PyPI
          {pypi === "error" && <span className="text-[#a3302e]">(unavailable right now)</span>}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {AUTO_LAYERS.map((L) => {
          const row = rows.filter((t) => t.layer === L.id);
          if (!row.length) return null;
          const score = (t: AutoTool) => (t.npm ? (n?.[t.npm] ?? 0) : 0) + (t.pypi ? (p?.[t.pypi] ?? 0) : 0);
          const sorted = [...row].sort((a, b) => score(b) - score(a));
          const max = Math.max(1, ...row.map((t) => Math.max(t.npm ? (n?.[t.npm] ?? 0) : 0, t.pypi ? (p?.[t.pypi] ?? 0) : 0)));
          return (
            <div key={L.id} className="rounded-[20px] border border-line bg-white p-4">
              <p className="text-[13.5px] font-semibold">{L.id}</p>
              <div className="mt-3 space-y-2.5">
                {sorted.map((t) => (
                  <div key={t.id} className="grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-2 text-[12px]">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <ToolLogo t={t} logos={logos} size={11} />
                      <span className="truncate">{t.name}</span>
                    </span>
                    <span className="space-y-1">
                      {(
                        [
                          [t.npm, n, NPM],
                          [t.pypi, p, PY],
                        ] as const
                      ).map(([pkg, src, color]) =>
                        pkg ? (
                          <span key={color} className="grid grid-cols-[1fr_3.4rem] items-center gap-2">
                            <span className="h-2.5 rounded-full bg-cream/70">
                              {src ? <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(1.5, ((src[pkg] ?? 0) / max) * 100)}%`, background: color }} /> : <span className="block h-full w-1/3 animate-pulse rounded-full bg-ink/10" />}
                            </span>
                            <span className="text-right font-mono text-[11px] tabular-nums">{src ? (src[pkg] != null ? big(src[pkg]) : "—") : "…"}</span>
                          </span>
                        ) : null,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-2/55">
        Sources: the npm registry downloads API{npm && npm !== "error" ? ` (${npm.start} to ${npm.end})` : ""}, and{" "}
        <a href="https://pypistats.org" target="_blank" rel="noreferrer" className="underline">
          pypistats.org
        </a>{" "}
        for the last 7 days of PyPI, refreshed daily. Bars share one scale within each group.
      </p>
    </Section>
  );
}
