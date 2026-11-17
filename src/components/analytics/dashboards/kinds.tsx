import Link from "next/link";
import { INK, PAL } from "../charts/kit";
import { Section } from "../tools/shared";

const LINE = "rgba(11,11,11,0.1)";
const Frame = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 240 150" className="h-auto w-full" role="img" aria-hidden>
    <rect x={0.5} y={0.5} width={239} height={149} rx={12} fill="#fff" stroke={LINE} />
    {children}
  </svg>
);

/** Small drawn previews of each kind of dashboard (illustrations, no data). */
const Strategic = () => (
  <Frame>
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <rect x={10 + i * 75} y={10} width={69} height={36} rx={6} fill="rgba(11,11,11,0.04)" />
        <rect x={16 + i * 75} y={17} width={26} height={4} rx={2} fill="rgba(11,11,11,0.25)" />
        <rect x={16 + i * 75} y={27} width={40} height={10} rx={2} fill={INK} />
      </g>
    ))}
    <rect x={10} y={54} width={220} height={86} rx={6} fill="rgba(11,11,11,0.03)" />
    <path d="M20,124 L50,116 L80,120 L110,108 L140,110 L170,96 L200,84 L220,66" fill="none" stroke={PAL[0]} strokeWidth={2.5} />
    <circle cx={220} cy={66} r={4} fill={PAL[0]} />
  </Frame>
);
const Experiment = () => (
  <Frame>
    <rect x={10} y={10} width={100} height={18} rx={9} fill="rgba(27,175,122,0.15)" />
    <rect x={20} y={16} width={70} height={6} rx={3} fill="#138a60" />
    {[
      [50, 70, "rgba(11,11,11,0.25)"],
      [120, 52, PAL[0]],
      [190, 60, PAL[3]],
    ].map(([x, top, c]) => (
      <g key={x as number}>
        <rect x={(x as number) - 18} y={top as number} width={36} height={136 - (top as number)} rx={4} fill={c as string} opacity={0.85} />
        <line x1={x as number} x2={x as number} y1={(top as number) - 10} y2={(top as number) + 10} stroke={INK} strokeWidth={1.5} />
        <line x1={(x as number) - 6} x2={(x as number) + 6} y1={(top as number) - 10} y2={(top as number) - 10} stroke={INK} strokeWidth={1.5} />
        <line x1={(x as number) - 6} x2={(x as number) + 6} y1={(top as number) + 10} y2={(top as number) + 10} stroke={INK} strokeWidth={1.5} />
      </g>
    ))}
  </Frame>
);
const Operational = () => (
  <Frame>
    <path d="M30,74 A50,50 0 0 1 130,74" fill="none" stroke="rgba(11,11,11,0.08)" strokeWidth={14} />
    <path d="M30,74 A50,50 0 0 1 104,30" fill="none" stroke="#e0a800" strokeWidth={14} />
    <rect x={150} y={14} width={78} height={24} rx={12} fill="rgba(200,65,63,0.12)" />
    <circle cx={164} cy={26} r={4} fill="#c8413f">
      <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
    </circle>
    <rect x={174} y={23} width={44} height={6} rx={3} fill="#c8413f" opacity={0.7} />
    <rect x={10} y={92} width={220} height={48} rx={6} fill="rgba(11,11,11,0.03)" />
    <path d="M18,128 L40,120 L62,124 L84,110 L106,116 L128,104 L150,112 L172,98 L194,106 L216,100" fill="none" stroke={PAL[1]} strokeWidth={2} />
    <line x1={10} x2={230} y1={108} y2={108} stroke="#c8413f" strokeDasharray="4 3" />
  </Frame>
);
const Customer = () => (
  <Frame>
    {Array.from({ length: 6 }, (_, r) =>
      Array.from({ length: 6 - r }, (_, c) => <rect key={`${r}${c}`} x={12 + c * 19} y={12 + r * 19} width={17} height={17} rx={3} fill={PAL[0]} opacity={c === 0 ? 1 : 0.65 - c * 0.08} />),
    )}
    {[70, 54, 40, 30, 22].map((w, i) => (
      <rect key={i} x={140} y={14 + i * 22} width={w + 20} height={14} rx={3} fill={i === 3 ? "#c8413f" : PAL[2]} opacity={0.85} />
    ))}
  </Frame>
);

const KINDS = [
  {
    type: "Strategic",
    Thumb: Strategic,
    q: "How are we doing, and where should we look?",
    reader: "Management",
    refresh: "Monthly",
    style: "Few numbers, big and compared; a trend; little detail.",
    ex: [{ ours: "Online Retail sales", data: "541,909 real transactions, 38 countries", href: "/skills/analytics/dashboards/sales" }],
  },
  {
    type: "Experiment",
    Thumb: Experiment,
    q: "Did the change work, and should we roll it out?",
    reader: "Product and marketing teams",
    refresh: "Once per test",
    style: "Groups side by side, lift with uncertainty, a clear verdict.",
    ex: [{ ours: "Email campaign A/B test", data: "Hillstrom: 64,000 real customers, 3 groups", href: "/skills/analytics/dashboards/ab-test" }],
  },
  {
    type: "Operational",
    Thumb: Operational,
    q: "Is everything OK right now?",
    reader: "People acting today",
    refresh: "Daily or live",
    style: "Status against thresholds, alerts first, the latest values.",
    ex: [{ ours: "Jakarta air quality", data: "Live PM2.5 from Open-Meteo (CC BY 4.0)", href: "/skills/analytics/dashboards/air" }],
  },
  {
    type: "Customer analytics",
    Thumb: Customer,
    q: "Who is leaving, and why?",
    reader: "CRM and retention teams",
    refresh: "Weekly",
    style: "Segments, cohorts and drivers; more exploration.",
    ex: [
      { ours: "Telco customer churn", data: "7,043 customers (IBM sample data)", href: "/skills/analytics/dashboards/churn" },
      { ours: "FWA home-internet base health", data: "4,702 customers, 22 months, 7 raw tables incl. surveys (synthetic)", href: "/skills/analytics/dashboards/fwa" },
    ],
  },
];

export function DashboardKinds() {
  return (
    <Section
      id="kinds"
      kicker="Four kinds of dashboards"
      title="Not every dashboard does the same job."
      line="Who reads it and how often decide almost everything: how many numbers, how much detail, how often it refreshes. Below are the working examples: three on real public data, one on an IBM sample with fictional customers, and one on synthetic FWA data built so every raw row can be shown."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KINDS.map((k, i) => (
          <article key={k.type} className="flex flex-col rounded-[24px] border border-line bg-white p-4">
            <div className="rounded-2xl bg-cream/60 p-2">
              <k.Thumb />
            </div>
            <p className="mt-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">0{i + 1} · dashboard type</p>
            <h3 className="mt-1 text-[19px] leading-tight font-semibold tracking-[-0.02em]">{k.type}</h3>
            <p className="mt-1 text-[13.5px] leading-snug text-ink-2/80">“{k.q}”</p>
            <dl className="mt-3 grid grid-cols-[72px_1fr] gap-x-2 gap-y-1 text-[12px]">
              <dt className="text-muted">Reader</dt>
              <dd>{k.reader}</dd>
              <dt className="text-muted">Refresh</dt>
              <dd>{k.refresh}</dd>
              <dt className="text-muted">Design</dt>
              <dd className="leading-snug">{k.style}</dd>
            </dl>
            <div className="mt-auto pt-4">
              <p className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{k.ex.length > 1 ? `Our examples · ${k.ex.length}` : "Our example"}</p>
              <div className="mt-1.5 flex flex-col gap-2">
                {k.ex.map((e) => (
                  <div key={e.href} className="rounded-2xl bg-ink/[0.04] p-3">
                    <p className="text-[14px] font-semibold">{e.ours}</p>
                    <p className="text-[12px] text-ink-2/60">{e.data}</p>
                    <Link href={e.href} className="mt-2 inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-white hover:bg-ink/85">
                      Open the dashboard →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
