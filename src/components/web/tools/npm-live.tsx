"use client";

import { LAYERS, type WebTool } from "@/data/web-tools";
import type { Logo } from "../logos";
import { Section, ToolLogo, big, type Downloads } from "./shared";

/** Weekly npm downloads of every JavaScript tool on the map, fetched live, grouped by layer. */
export function NpmLive({ tools, logos, downloads }: { tools: WebTool[]; logos: Record<string, Logo>; downloads: Downloads | "error" }) {
  const js = tools.filter((t) => t.npm);
  const d = downloads && downloads !== "error" ? downloads : null;
  return (
    <Section
      id="npm"
      kicker="03 · Live popularity"
      title="What the JavaScript world installed last week."
      line="Weekly downloads from the public npm registry, fetched by your browser just now. A rough signal of how much a tool is used, not of how good it is: build servers and other packages count too, and Python, PHP, Go or native tools don't appear on npm at all."
    >
      {downloads === "error" ? (
        <p className="rounded-2xl bg-cream/60 px-4 py-8 text-center text-[13px] text-ink-2/60">The npm registry could not be reached right now. Try again in a moment.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {LAYERS.map((L) => {
            const row = js.filter((t) => t.layer === L.id).sort((a, b) => (d?.counts[b.npm as string] ?? 0) - (d?.counts[a.npm as string] ?? 0));
            if (!row.length) return null;
            const max = Math.max(1, ...row.map((t) => d?.counts[t.npm as string] ?? 0));
            return (
              <div key={L.id} className="rounded-[20px] border border-line bg-white p-4">
                <p className="text-[13.5px] font-semibold">{L.id}</p>
                <div className="mt-3 space-y-2">
                  {row.map((t) => {
                    const v = d?.counts[t.npm as string];
                    return (
                      <div key={t.id} className="grid grid-cols-[minmax(0,8.5rem)_1fr_3.6rem] items-center gap-2 text-[12px]">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <ToolLogo t={t} logos={logos} size={11} />
                          <span className="truncate">{t.name}</span>
                        </span>
                        <span className="h-3 rounded-full bg-cream/70">
                          {v != null ? (
                            <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(1.5, (v / max) * 100)}%`, background: t.mine ? "#eb6834" : "#0b0b0b" }} />
                          ) : (
                            <span className="block h-full w-1/3 animate-pulse rounded-full bg-ink/10" />
                          )}
                        </span>
                        <span className="text-right font-mono tabular-nums">{v != null ? big(v) : "…"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[11.5px] text-ink-2/55">
        Source: npm registry downloads API{d ? `, ${d.start} to ${d.end}` : ""}. Bars are scaled within each group; orange marks tools I build with.
      </p>
    </Section>
  );
}
