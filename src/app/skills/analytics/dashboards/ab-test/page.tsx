import type { Metadata } from "next";
import Link from "next/link";
import { AbDashboard } from "@/components/analytics/dashboards/ab/dashboard";

export const metadata: Metadata = {
  title: "A/B test dashboard — e-mail campaign — Baldanullah",
  description: "An experiment readout on the real Hillstrom e-mail test (64,000 customers): verdict, lift with confidence intervals, trust checks, segments, impact and power.",
};

export default function AbTestPage() {
  return (
    <>
      <section className="mx-auto max-w-[1400px] px-5 pt-10 pb-6 md:px-10 md:pt-14">
        <Link href="/skills/analytics/dashboards" className="font-mono text-[11.5px] tracking-[0.14em] text-muted uppercase hover:text-ink">
          ← Dashboards · 02 Experiment
        </Link>
        <h1 className="mt-3 text-[2.4rem] leading-[0.95] font-semibold tracking-[-0.05em] sm:text-[3.6rem]">E-mail test: should we send it?</h1>
        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-2/75">
          A real randomised test: 64,000 customers got a men&apos;s e-mail, a women&apos;s e-mail, or nothing. This readout gives the verdict first, then the evidence, the checks that make it
          trustworthy, and what it would mean at scale.
        </p>
      </section>
      <AbDashboard />
    </>
  );
}
