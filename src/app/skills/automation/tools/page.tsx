import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { AutoToolsSections } from "@/components/automation/tools/sections";
import { logosFor } from "@/components/web/logos";
import { AUTO_LAYERS, AUTO_SCENARIOS, AUTO_TASKS, AUTO_TOOLS } from "@/data/auto-tools";

export const metadata: Metadata = {
  title: "Tools — Automation & AI Agents — Baldanullah",
  description: "The automation and AI agent landscape layer by layer: no-code platforms, RPA, browser bots, schedulers, orchestrators, CI/CD, messaging APIs, models, gateways, agent frameworks and MCP, with my own stack marked, the same job written in each, live npm and PyPI downloads, head-to-heads and starting stacks.",
};

const logos = logosFor([...new Set(AUTO_TOOLS.map((t) => t.icon).filter((x): x is string => !!x))]);

const SECTIONS = [
  { href: "#map", label: "The map", note: `${AUTO_TOOLS.length} tools in ${AUTO_LAYERS.length} layers` },
  { href: "#same-task", label: "Same task", note: `${AUTO_TASKS.length} jobs, written in each tool` },
  { href: "#popular", label: "Live popularity", note: "npm and PyPI downloads" },
  { href: "#compare", label: "Head-to-head", note: "any two tools" },
  { href: "#stack", label: "Pick a stack", note: `${AUTO_SCENARIOS.length} situations` },
];

export default function AutomationToolsPage() {
  const mine = AUTO_TOOLS.filter((t) => t.mine);
  return (
    <>
      <Header
        kicker="Automation & AI Agents · Tools"
        title="Every tool for the job, and when to pick it."
        line={`No-code platforms, robots, browser bots, schedulers, orchestrators, chat APIs, models and agent frameworks: ${AUTO_TOOLS.length} tools in ${AUTO_LAYERS.length} layers, the ${mine.length} I build with among them.`}
      >
        <div className="mt-8 rounded-[24px] border border-line bg-white p-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">My automation stack</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {mine.map((t) => {
              const logo = t.icon ? logos[t.icon] : undefined;
              return (
                <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-cream/70 px-3 py-1.5 text-[13px]">
                  {logo ? (
                    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden>
                      <path d={logo.path} fill={`#${logo.hex}`} />
                    </svg>
                  ) : (
                    <span className="font-mono text-[9.5px] font-bold" style={{ color: t.color }}>
                      {t.mono}
                    </span>
                  )}
                  {t.name}
                  <span className="text-[11px] text-ink-2/45">{t.layer}</span>
                </span>
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
      <AutoToolsSections tools={AUTO_TOOLS} logos={logos} />
    </>
  );
}
