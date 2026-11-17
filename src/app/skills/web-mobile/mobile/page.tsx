import type { Metadata } from "next";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { DeviceApis } from "@/components/web/mobile/device-apis";
import { PushLifecycle } from "@/components/web/mobile/push";
import { SyncLab } from "@/components/web/mobile/sync-lab";
import { WaysToBuild } from "@/components/web/mobile/ways";
import { Section } from "@/components/web/tools/shared";

export const metadata: Metadata = {
  title: "Mobile lab — Web, SaaS & Mobile — Baldanullah",
  description: "How mobile apps work, hands-on: four ways to build one and a picker, an offline-first sync lab with real conflicts, push notifications across the app lifecycle, and what your phone tells a web page, read live.",
};

const PARTS = [
  { href: "#ways", label: "Ways to build", note: "native, React Native, Flutter or web" },
  { href: "#offline", label: "Offline-first sync", note: "two phones, one conflict" },
  { href: "#push", label: "Push & lifecycle", note: "what happens when the app is closed" },
  { href: "#device", label: "Device APIs", note: "what your phone tells a page, live" },
];

export default function MobileLabPage() {
  return (
    <>
      <Header
        kicker="Web, SaaS & Mobile · Mobile lab"
        title="Apps that live in a pocket."
        line="A phone app works with a weak signal, gets closed and reopened all day, and is woken by messages from far away. Here is how that works, with two phones you can take offline, an app you can push to, and the real sensors of the device you are holding."
      >
        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PARTS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[16px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </Header>
      <Section id="ways" kicker="01 · Ways to build" title="Four ways to turn code into an app." line="Each one gets code onto the screen differently, and that one choice decides speed, cost and who you hire. Watch each pipeline, compare them, then answer four questions.">
        <WaysToBuild />
      </Section>
      <Section id="offline" kicker="02 · Offline-first sync" title="Two phones, one list, no signal." line="Field apps save to the phone first and sync later. That's easy until two people change the same thing while offline. Take the phones offline, edit, bring them back, and pick how the server settles it.">
        <SyncLab />
      </Section>
      <Section id="push" kicker="03 · Push & lifecycle" title="What happens when the app is closed." line="Apps are opened, sent to the background, frozen and killed all day, and a push behaves differently in each state. Move the app through its lifecycle and send it messages.">
        <PushLifecycle />
      </Section>
      <Section id="device" kicker="04 · Device APIs" title="What your phone can tell an app." line="Read live from the device you're using right now. Open this page on your phone for the full set." className="pb-10">
        <DeviceApis />
      </Section>
    </>
  );
}
