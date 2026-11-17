import type { Metadata } from "next";
import { ChartLibrary } from "@/components/analytics/chart-library";
import { CHARTS, FAMILIES, GROUPS } from "@/components/analytics/charts/catalog";
import { AnalyticsHeader } from "@/components/analytics/subnav";

export const metadata: Metadata = {
  title: "Chart library — Data Analytics & BI — Baldanullah",
  description: "Nearly three hundred charts in families: every kind of bar, line, pie, real map, word cloud and table, each with when to use it and when not to.",
};

export default function ChartsPage() {
  return (
    <>
      <AnalyticsHeader
        kicker="Data Analytics & BI · Chart library"
        title="The right chart for the question."
        line={`${CHARTS.length} charts in ${GROUPS.reduce((s, g) => s + FAMILIES[g].length, 0)} families: every kind of bar, line, pie, real map, word cloud and table, each with when to use it and when to avoid it. All drawn from scratch as SVG, the same parts the dashboards are built from.`}
      >
        <p className="mt-6 inline-flex rounded-full bg-cream px-4 py-2 text-[13px] text-ink-2/75">
          Example data: a made-up coffee chain, “Kopi Senja”, in eight Indonesian cities. None of these numbers are real. Map shapes are real: provinces from OCHA via HDX / geoBoundaries (CC BY 3.0
          IGO), countries from Natural Earth (public domain).
        </p>
      </AnalyticsHeader>
      <ChartLibrary />
    </>
  );
}
