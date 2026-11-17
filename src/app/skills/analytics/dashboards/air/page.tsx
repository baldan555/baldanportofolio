import type { Metadata } from "next";
import Link from "next/link";
import { AirDashboard } from "@/components/analytics/dashboards/air/dashboard";

export const metadata: Metadata = {
  title: "Jakarta air quality dashboard (live) — Baldanullah",
  description: "A live operational dashboard for Jakarta's air: PM2.5 now and forecast, alerts against WHO and Indonesian limits, other pollutants, wind, and four years of context.",
};

export default function AirDashboardPage() {
  return (
    <>
      <section className="mx-auto max-w-[1400px] px-5 pt-10 pb-6 md:px-10 md:pt-14">
        <Link href="/skills/analytics/dashboards" className="font-mono text-[11.5px] tracking-[0.14em] text-muted uppercase hover:text-ink">
          ← Dashboards · 03 Operational
        </Link>
        <h1 className="mt-3 text-[2.4rem] leading-[0.95] font-semibold tracking-[-0.05em] sm:text-[3.6rem]">Jakarta air, right now.</h1>
        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-2/75">
          An operational dashboard: status first, then what&apos;s coming, then the alerts. It loads live data in your browser every time you open it, with years of history underneath for context.
        </p>
      </section>
      <AirDashboard />
    </>
  );
}
