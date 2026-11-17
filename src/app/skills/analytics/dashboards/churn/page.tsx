import type { Metadata } from "next";
import Link from "next/link";
import { ChurnDashboard } from "@/components/analytics/dashboards/churn/dashboard";

export const metadata: Metadata = {
  title: "Customer churn dashboard — Telco — Baldanullah",
  description: "Who is leaving and why: churn by contract, tenure and services, survival curves, revenue at risk, highest-risk segments and a what-if on the Telco churn model.",
};

export default function ChurnDashboardPage() {
  return (
    <>
      <section className="mx-auto max-w-[1400px] px-5 pt-10 pb-6 md:px-10 md:pt-14">
        <Link href="/skills/analytics/dashboards" className="font-mono text-[11.5px] tracking-[0.14em] text-muted uppercase hover:text-ink">
          ← Dashboards · 04 Customer analytics
        </Link>
        <h1 className="mt-3 text-[2.4rem] leading-[0.95] font-semibold tracking-[-0.05em] sm:text-[3.6rem]">Who is leaving, and why?</h1>
        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-2/75">
          A retention team&apos;s dashboard on the IBM Telco sample: where churn concentrates, how long customers stay, what goes with leaving, and what an offer might change. Filter or click to dig
          in.
        </p>
      </section>
      <ChurnDashboard />
    </>
  );
}
