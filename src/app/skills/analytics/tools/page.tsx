import type { Metadata } from "next";
import * as icons from "simple-icons";
import { AnalyticsHeader } from "@/components/analytics/subnav";
import { BiCompare, RatingsMatrix } from "@/components/analytics/tools/bi-compare";
import { StackJourney } from "@/components/analytics/tools/journey";
import { SameTask } from "@/components/analytics/tools/same-task";
import type { ToolView } from "@/components/analytics/tools/shared";
import { StackBuilder } from "@/components/analytics/tools/stack-builder";
import { ToolExplorer } from "@/components/analytics/tools/tool-explorer";
import { SAME_TASK, STAGES, TOOLS } from "@/data/analytics-tools";

export const metadata: Metadata = {
  title: "Tools — Data Analytics & BI — Baldanullah",
  description:
    "The data stack from collection to collaboration: one real dataset followed through every tool, a map of 28 tools with drawn interfaces, the same question answered in eight tools, a BI head-to-head, and a stack builder.",
};

type Icon = { path: string; hex: string };
// logos resolved on the server, so the browser only receives the few paths it needs
const views: ToolView[] = TOOLS.map((t) => {
  const icon = t.icon ? (icons as unknown as Record<string, Icon>)[t.icon] : undefined;
  return { ...t, logo: icon ? { path: icon.path, hex: icon.hex } : undefined };
});

const SECTIONS = [
  { href: "#journey", label: "One file, every tool", note: `${STAGES.length} steps on the real data` },
  { href: "#map", label: "The map", note: `${TOOLS.length} tools, drawn and rated` },
  { href: "#same-task", label: "Same task", note: `one question in ${SAME_TASK.versions.length} tools` },
  { href: "#compare", label: "BI head-to-head", note: "radar and comparison matrix" },
  { href: "#builder", label: "Stack builder", note: "the right tools for your job" },
];

export default function ToolsPage() {
  const mine = TOOLS.filter((t) => t.mine).length;
  return (
    <>
      <AnalyticsHeader
        kicker="Data Analytics & BI · Tools"
        title="A tool for every step of the pipeline."
        line={`From pulling data out of a system to the dashboard and the history behind it: the ${mine} tools I work with, the wider landscape around them, and how to choose.`}
      >
        <div className="mt-8 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {SECTIONS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[16px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </AnalyticsHeader>
      <StackJourney tools={views} />
      <ToolExplorer tools={views} />
      <SameTask tools={views} />
      <BiCompare tools={views} />
      <RatingsMatrix tools={views} />
      <StackBuilder tools={views} />
    </>
  );
}
