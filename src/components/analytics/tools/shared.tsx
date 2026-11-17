import type { Tool } from "@/data/analytics-tools";

/** A tool plus its logo, resolved on the server (simple-icons) so the browser only gets the paths it needs. */
export type ToolView = Tool & { logo?: { path: string; hex: string } };

/** Yellow logos need a darker ink to be readable as text. */
export const ink = (c: string) => (c === "#F2C811" ? "#8a6d00" : c === "#FFC107" ? "#9a7400" : c);

export function Badge({ t, size = 40, ring = false }: { t: ToolView; size?: number; ring?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl ${ring ? "ring-1 ring-ink/10" : ""}`} style={{ width: size, height: size, background: t.logo ? `#${t.logo.hex}1f` : `${t.color}22` }}>
      {t.logo ? (
        <svg viewBox="0 0 24 24" width={Math.round(size * 0.55)} height={Math.round(size * 0.55)} aria-hidden>
          <path d={t.logo.path} fill={`#${t.logo.hex}`} />
        </svg>
      ) : (
        <span className="font-mono font-bold" style={{ color: ink(t.color), fontSize: Math.max(9, Math.round(size * 0.28)) }}>
          {t.mono}
        </span>
      )}
    </span>
  );
}

export const RATING_LABELS: { key: keyof Tool["rate"]; label: string }[] = [
  { key: "scale", label: "Handles big data" },
  { key: "ease", label: "Easy to start" },
  { key: "collab", label: "Teamwork" },
  { key: "realtime", label: "Real-time" },
  { key: "governance", label: "Governance" },
];

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
