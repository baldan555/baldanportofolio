/* Building blocks shared by the case pages under /work, tinted with each product's colour. */

export type Accent = { kicker: string; rule: string };

export const ACCENTS = {
  magenta: { kicker: "text-[#a80058]", rule: "border-[#d5006f]/20" },
  blue: { kicker: "text-[#1a5fa8]", rule: "border-[#2088e4]/25" },
} satisfies Record<string, Accent>;

export function WorkSection({ id, kicker, title, line, accent, children }: { id: string; kicker: string; title: string; line?: string; accent: Accent; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto mt-28 max-w-[1240px] scroll-mt-24 px-5 md:px-10">
      <p className={`mb-3 font-mono text-[12px] tracking-[0.2em] uppercase ${accent.kicker}`}>{kicker}</p>
      <h2 className="max-w-3xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">{title}</h2>
      {line && <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2/70">{line}</p>}
      <div className="mt-10">{children}</div>
    </section>
  );
}

export function Points({ items, accent }: { items: { h: string; p: string }[]; accent: Accent }) {
  return (
    <ul className="flex flex-col gap-5">
      {items.map((it) => (
        <li key={it.h} className={`border-t pt-4 ${accent.rule}`}>
          <p className="text-[16px] font-semibold tracking-[-0.01em]">{it.h}</p>
          <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2/70">{it.p}</p>
        </li>
      ))}
    </ul>
  );
}
