import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { logosFor } from "@/components/web/logos";
import { ToolsSections } from "@/components/web/tools/tools-sections";
import { LAYERS, TASKS, WEB_TOOLS } from "@/data/web-tools";

export const metadata: Metadata = {
  title: "Tools — Web, SaaS & Mobile — Baldanullah",
  description: "The web, SaaS and mobile stack layer by layer: a map of tools with my own stack marked, the same task written in several frameworks, live npm downloads, head-to-heads and a stack builder.",
};

const logos = logosFor([...new Set(WEB_TOOLS.map((t) => t.icon).filter((x): x is string => !!x))]);

const SECTIONS = [
  { href: "#map", label: "The map", note: `${WEB_TOOLS.length} tools in ${LAYERS.length} layers` },
  { href: "#same-task", label: "Same task", note: `${TASKS.length} jobs, written in each tool` },
  { href: "#npm", label: "Live popularity", note: "npm downloads, fetched now" },
  { href: "#compare", label: "Head-to-head", note: "radar and trade-offs" },
  { href: "#builder", label: "Stack builder", note: "a stack for your project" },
];

export default function WebToolsPage() {
  const mine = WEB_TOOLS.filter((t) => t.mine);
  return (
    <>
      <Header
        kicker="Web, SaaS & Mobile · Tools"
        title="A tool for every layer of a product."
        line={`From the screen people touch to the server it runs on: the ${mine.length} tools I build with, the wider landscape around them, and how to choose.`}
      >
        <div className="mt-8 rounded-[24px] border border-line bg-white p-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">My stack, layer by layer</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {LAYERS.map((L) => {
              const row = mine.filter((t) => t.layer === L.id);
              if (!row.length) return null;
              return (
                <div key={L.id} className="rounded-2xl bg-cream/60 p-3">
                  <p className="text-[11.5px] text-ink-2/55">{L.id}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {row.map((t) => {
                      const logo = t.icon ? logos[t.icon] : undefined;
                      return (
                        <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12.5px]">
                          {logo ? (
                            <svg viewBox="0 0 24 24" width={13} height={13} aria-hidden>
                              <path d={logo.path} fill={`#${logo.hex}`} />
                            </svg>
                          ) : (
                            <span className="font-mono text-[9px] font-bold" style={{ color: t.color }}>
                              {t.mono}
                            </span>
                          )}
                          {t.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {SECTIONS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[16px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </Header>
      <ToolsSections tools={WEB_TOOLS} logos={logos} />
    </>
  );
}
