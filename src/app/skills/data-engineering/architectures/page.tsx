import type { Metadata } from "next";
import {
  siAirbyte,
  siApacheairflow,
  siApachekafka,
  siApachespark,
  siGoogleads,
  siGooglebigquery,
  siGooglecloudstorage,
  siGoogledataflow,
  siGooglepubsub,
  siGooglesheets,
  siHubspot,
  siJson,
  siLooker,
  siNextdotjs,
  siPostgresql,
  siPython,
  siRedis,
  siTrino,
  siZendesk,
} from "simple-icons";
import air from "@/data/air-dashboard.json";
import pipe from "@/data/de-pipeline.json";
import { AnalyticsHeader as Header } from "@/components/analytics/subnav";
import { Section } from "@/components/analytics/tools/shared";
import { ArchCompare, ArchPicker } from "@/components/data-eng/arch-extra";
import { ArchGallery, type Logo } from "@/components/data-eng/arch-gallery";
import { archs } from "@/components/data-eng/archs";

export const metadata: Metadata = {
  title: "Architectures — Data Engineering — Baldanullah",
  description: "Batch ELT on GCP, streaming, lakehouse, change data capture and reverse ETL, animated end to end with one record followed through each, plus the real setup of this site.",
};

// logos from simple-icons (CC0), resolved here so only the paths reach the browser
const ICONS = { airbyte: siAirbyte, apacheairflow: siApacheairflow, apachekafka: siApachekafka, apachespark: siApachespark, googleads: siGoogleads, googlebigquery: siGooglebigquery, googlecloudstorage: siGooglecloudstorage, googledataflow: siGoogledataflow, googlepubsub: siGooglepubsub, googlesheets: siGooglesheets, hubspot: siHubspot, json: siJson, looker: siLooker, nextdotjs: siNextdotjs, postgresql: siPostgresql, python: siPython, redis: siRedis, trino: siTrino, zendesk: siZendesk };
const logos: Record<string, Logo> = Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [k, { path: v.path, hex: v.hex }]));

// one real hour for "This site": 14:00 on the last day of the saved snapshot
const times = air.snapshot.time;
const at = times.map((t, i) => [t, i] as const).filter(([t]) => t.endsWith("T14:00")).pop() as readonly [string, number];
const date = at[0].slice(0, 10);
const dayRows = times.map((t, i) => [t, (air.snapshot.pm2_5 as number[])[i]] as const).filter(([t]) => t.startsWith(date));
const daily = air.daily.find((d) => d.date === date)?.mean ?? Math.round((dayRows.reduce((a, [, v]) => a + v, 0) / dayRows.length) * 10) / 10;
const ARCHS = archs({
  hour: at[0],
  pm: (air.snapshot.pm2_5 as number[])[at[1]],
  date,
  dailyMean: daily,
  requests: pipe.requests,
  rawBytes: pipe.raw.bytes,
  rawSlots: pipe.raw.slots,
  airBytes: pipe.serve.files[0].bytes,
  forecastBytes: pipe.serve.files[1].bytes,
});

const PARTS = [
  { href: "#gallery", label: "The gallery", note: "six architectures, one record followed through each" },
  { href: "#compare", label: "Side by side", note: "latency, cost, effort, replay" },
  { href: "#fit", label: "Which one fits?", note: "four questions, one recommendation" },
];

export default function ArchitecturesPage() {
  return (
    <>
      <Header
        kicker="Data Engineering · Architectures"
        title="Six ways to move data, drawn end to end."
        line="The same job, getting data from where it is made to where it is used, solved six ways. Each one is animated the way its data actually moves, with one record followed through every hop. The first is the real setup of this site."
      >
        <div className="mt-8 grid gap-2 sm:grid-cols-3">
          {PARTS.map((s, i) => (
            <a key={s.href} href={s.href} className="group rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <span className="mt-1 block text-[17px] font-semibold tracking-[-0.01em] group-hover:underline">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2/60">{s.note}</span>
            </a>
          ))}
        </div>
      </Header>

      <Section
        id="gallery"
        kicker="01 · The gallery"
        title="Pick an architecture, then follow a record."
        line="Watch how the data moves: in scheduled chunks, as a continuous stream, as change events from a database log, or out of the warehouse into other tools. Then step through one record and see its shape at every hop."
      >
        <ArchGallery archs={ARCHS} logos={logos} />
      </Section>

      <Section id="compare" kicker="02 · Side by side" title="Faster always costs something.">
        <ArchCompare archs={ARCHS} />
      </Section>

      <Section id="fit" kicker="03 · Which one fits?" title="Four questions, one starting point." line="Answer what you know about your data and who needs it. The recommendation explains itself and updates as you change answers." className="pb-10">
        <ArchPicker archs={ARCHS} />
      </Section>
    </>
  );
}
