"use client";

import { useEffect, useState } from "react";
import type { Logo } from "../logos";

/** Relative brightness of a hex colour, 0 (black) to 1 (white). */
const brightness = (hex: string) => {
  const n = parseInt(hex, 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/** A tool's logo (simple-icons) or its monogram; very dark logos turn white on dark backgrounds. */
/** Anything with a logo slug, a colour and a monogram fallback (web and automation tools alike). */
export type HasLogo = { icon?: string; color: string; mono?: string };
export function ToolLogo({ t, logos, size = 22, light = false }: { t: HasLogo; logos: Record<string, Logo>; size?: number; light?: boolean }) {
  const logo = t.icon ? logos[t.icon] : undefined;
  const hex = logo ? (light && brightness(logo.hex) < 0.25 ? "ffffff" : logo.hex) : "";
  return (
    <span className="grid shrink-0 place-items-center rounded-xl" style={{ width: size + 14, height: size + 14, background: light ? "rgba(255,255,255,0.1)" : `${t.color}1a` }}>
      {logo ? (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
          <path d={logo.path} fill={`#${hex}`} />
        </svg>
      ) : (
        <span className="font-mono font-bold" style={{ color: light ? "#fff" : t.color, fontSize: Math.round(size * 0.45) }}>
          {t.mono}
        </span>
      )}
    </span>
  );
}

export function Section({ id, kicker, title, line, children, className = "" }: { id: string; kicker: string; title: string; line?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto mt-28 max-w-[1240px] scroll-mt-32 px-5 md:px-10 ${className}`}>
      <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">{kicker}</p>
      <h2 className="max-w-3xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">{title}</h2>
      {line && <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2/70">{line}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export type Downloads = { counts: Record<string, number>; start: string; end: string } | null;

/** Weekly npm downloads for every tool that has an npm package, fetched live from the public npm API. */
export function useNpmDownloads(tools: { npm?: string }[]): Downloads | "error" {
  const [d, setD] = useState<Downloads | "error">(null);
  useEffect(() => {
    let alive = true;
    const ctl = new AbortController();
    const pkgs = [...new Set(tools.map((t) => t.npm).filter((x): x is string => !!x))];
    const plain = pkgs.filter((p) => !p.startsWith("@"));
    const scoped = pkgs.filter((p) => p.startsWith("@"));
    const get = (p: string) => fetch(`https://api.npmjs.org/downloads/point/last-week/${p}`, { signal: ctl.signal }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
    // settle each request on its own: one rate-limited package shouldn't blank the rest
    Promise.allSettled([plain.length ? get(plain.join(",")) : Promise.resolve({}), ...scoped.map((p) => get(encodeURIComponent(p).replace("%40", "@")))]).then(([bulk, ...single]) => {
      if (!alive) return;
      const counts: Record<string, number> = {};
      let start = "",
        end = "";
      if (bulk.status === "fulfilled") {
        // one package returns a single object, several return a map of them
        type Pt = { downloads: number; start: string; end: string; package?: string };
        const b = bulk.value as Record<string, unknown>;
        const entries: [string, Pt | null][] = typeof b.package === "string" ? [[b.package, b as unknown as Pt]] : Object.entries(b as Record<string, Pt | null>);
        for (const [p, v] of entries) {
          if (!v) continue;
          counts[p] = v.downloads;
          start = v.start;
          end = v.end;
        }
      }
      for (const s of single) {
        if (s.status !== "fulfilled") continue;
        const v = s.value as { package: string; downloads: number; start: string; end: string };
        counts[v.package] = v.downloads;
        start ||= v.start;
        end ||= v.end;
      }
      setD(Object.keys(counts).length ? { counts, start, end } : "error");
    });
    return () => {
      alive = false;
      ctl.abort();
    };
  }, [tools]);
  return d;
}

export const big = (v: number) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)} B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)} M` : v >= 1e3 ? `${Math.round(v / 1e3)} K` : String(v));
