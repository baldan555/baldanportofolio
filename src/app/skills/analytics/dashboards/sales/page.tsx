import type { Metadata } from "next";
import Link from "next/link";
import { SalesDashboard } from "@/components/analytics/dashboards/sales/dashboard";

export const metadata: Metadata = {
  title: "Sales dashboard — Online Retail — Baldanullah",
  description:
    "An interactive sales dashboard on the real UCI Online Retail data: KPIs, trend, map, products, timing, cancellations, cohorts and RFM segments, with a written memo and the model behind it.",
};

export default function SalesDashboardPage() {
  return (
    <>
      <section className="mx-auto max-w-[1400px] px-5 pt-10 pb-6 md:px-10 md:pt-14">
        <Link href="/skills/analytics/dashboards" className="font-mono text-[11.5px] tracking-[0.14em] text-muted uppercase hover:text-ink">
          ← Dashboards · 01 Strategic
        </Link>
        <h1 className="mt-3 text-[2.4rem] leading-[0.95] font-semibold tracking-[-0.05em] sm:text-[3.6rem]">Online Retail: sales overview</h1>
        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-2/75">
          A monthly review for a sales manager, on the real transactions of a UK online gift shop. Filter by country and month, or click the charts: every tile and the memo follow.
        </p>
      </section>
      <SalesDashboard />
    </>
  );
}
