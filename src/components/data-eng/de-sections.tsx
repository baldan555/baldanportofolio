import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/*
 * The overview's closing sections: four rules every pipeline here follows, each with a small looping animation
 * (plain SVG/SMIL, no JavaScript), and the explore cards with animated thumbnails.
 */
const INK = "#0b0b0b";
const ORANGE = "#eb6834";
const GREEN = "#1baf7a";
const RED = "#c8413f";
const LINE = "rgba(11,11,11,0.18)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

function Replayable() {
  return (
    <svg viewBox="0 0 240 110" className="h-auto w-full" aria-hidden>
      <path d="M22,22 h34 l12,12 v52 h-46 z" fill="#fff" stroke={INK} strokeWidth={1.4} />
      <path d="M56,22 v12 h12" fill="none" stroke={INK} strokeWidth={1.4} />
      <text x={45} y={100} fontSize={9} textAnchor="middle" fontFamily={MONO} fill="rgba(11,11,11,0.6)">
        bronze
      </text>
      <rect x={150} y={22} width={68} height={64} rx={6} fill="#fff" stroke={INK} strokeWidth={1.4} />
      <text x={184} y={100} fontSize={9} textAnchor="middle" fontFamily={MONO} fill="rgba(11,11,11,0.6)">
        silver
      </text>
      {[0, 1, 2, 3].map((r) => (
        <rect key={r} x={158} y={32 + r * 13} width={52} height={8} rx={2} fill={GREEN}>
          <animate attributeName="fill" values={`${GREEN};${RED};${RED};${GREEN};${GREEN}`} keyTimes="0;0.15;0.45;0.75;1" dur="4s" begin={`${r * 0.08}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;1;0.25;1;1" keyTimes="0;0.15;0.45;0.75;1" dur="4s" begin={`${r * 0.08}s`} repeatCount="indefinite" />
        </rect>
      ))}
      <line x1={74} y1={54} x2={146} y2={54} stroke={LINE} strokeWidth={1.4} strokeDasharray="3 3" />
      {[0, 1, 2].map((i) => (
        <circle key={i} r={3.2} cy={54} fill={ORANGE} opacity={0}>
          <animate attributeName="cx" values="74;74;146;146" keyTimes="0;0.45;0.72;1" dur="4s" begin={`${i * 0.08}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.44;0.46;0.72;0.74" dur="4s" begin={`${i * 0.08}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

function Idempotent() {
  return (
    <svg viewBox="0 0 240 110" className="h-auto w-full" aria-hidden>
      {["run 1", "run 2"].map((t, i) => (
        <g key={t}>
          <rect x={14} y={24 + i * 40} width={52} height={24} rx={12} fill={INK} />
          <text x={40} y={40 + i * 40} fontSize={9.5} textAnchor="middle" fill="#fff" fontFamily={MONO}>
            {t}
          </text>
          <path d={`M66,${36 + i * 40} C110,${36 + i * 40} 110,55 146,55`} fill="none" stroke={LINE} strokeWidth={1.4} />
          <circle r={3.2} fill={i ? ORANGE : GREEN}>
            <animateMotion dur="2.4s" begin={`${i * 1.2}s`} repeatCount="indefinite" path={`M66,${36 + i * 40} C110,${36 + i * 40} 110,55 146,55`} />
          </circle>
        </g>
      ))}
      <rect x={146} y={20} width={80} height={70} rx={8} fill="#fff" stroke={INK} strokeWidth={1.4} />
      <text x={186} y={52} fontSize={18} textAnchor="middle" fontWeight={800} fill={INK}>
        24
      </text>
      <text x={186} y={66} fontSize={8.5} textAnchor="middle" fill="rgba(11,11,11,0.55)" fontFamily={MONO}>
        rows each run
      </text>
      <text x={186} y={82} fontSize={9} textAnchor="middle" fill={GREEN} fontWeight={800}>
        MERGE ✓
      </text>
    </svg>
  );
}

function Tested() {
  return (
    <svg viewBox="0 0 240 110" className="h-auto w-full" aria-hidden>
      <line x1={10} y1={46} x2={230} y2={46} stroke={LINE} strokeWidth={1.4} />
      <rect x={112} y={22} width={16} height={48} rx={4} fill={INK} />
      <text x={120} y={16} fontSize={8.5} textAnchor="middle" fill="rgba(11,11,11,0.6)" fontFamily={MONO}>
        checks
      </text>
      <rect x={96} y={84} width={48} height={18} rx={5} fill="#fff" stroke={RED} strokeDasharray="3 2" />
      <text x={120} y={96} fontSize={8} textAnchor="middle" fill={RED} fontFamily={MONO}>
        quarantine
      </text>
      {[0, 1, 2].map((i) => (
        <circle key={i} r={4} cy={46} fill={GREEN}>
          <animate attributeName="cx" values="10;230" dur="3s" begin={`${i}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle r={4} fill={RED}>
        <animate attributeName="cx" values="10;104;104;120" keyTimes="0;0.35;0.5;1" dur="3s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="46;46;46;93" keyTimes="0;0.35;0.5;1" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function Observable() {
  const d = "M10,60 L40,60 L50,40 L60,78 L70,60 L100,60 L110,34 L120,82 L130,60 L160,60 L230,60";
  return (
    <svg viewBox="0 0 240 110" className="h-auto w-full" aria-hidden>
      <path d={d} fill="none" stroke={LINE} strokeWidth={1.4} />
      <path d={d} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="320" strokeDashoffset="320" strokeLinejoin="round">
        <animate attributeName="stroke-dashoffset" values="320;0;0" keyTimes="0;0.7;1" dur="4s" repeatCount="indefinite" />
      </path>
      <rect x={150} y={14} width={80} height={22} rx={11} fill="#fff" stroke={LINE} />
      <text x={190} y={29} fontSize={8.5} textAnchor="middle" fontFamily={MONO} fill={INK}>
        freshness ✓
      </text>
      <g transform="translate(196,74)">
        <path d="M-8,6 h16 l-2,-3 v-6 a6,6 0 0 0 -12,0 v6 z" fill="rgba(11,11,11,0.15)">
          <animate attributeName="fill" values={`rgba(11,11,11,0.15);rgba(11,11,11,0.15);${ORANGE};rgba(11,11,11,0.15)`} keyTimes="0;0.72;0.8;1" dur="4s" repeatCount="indefinite" />
        </path>
        <circle cx={0} cy={9} r={2} fill="rgba(11,11,11,0.3)" />
      </g>
      <text x={150} y={100} fontSize={8} fontFamily={MONO} fill="rgba(11,11,11,0.55)">
        flat line → alert
      </text>
    </svg>
  );
}

const RULES = [
  { t: "Replayable", d: "Raw data is kept untouched, so any table can be rebuilt after a bug without asking the source again.", Art: Replayable, href: "/skills/data-engineering/simulator", link: "Replay from bronze in the simulator" },
  { t: "Idempotent", d: "Run a job twice and get the same table: loads MERGE on a key instead of appending.", Art: Idempotent, href: "/skills/data-engineering/simulator", link: "Duplicates, absorbed" },
  { t: "Tested", d: "Checks run before anything is published. A failing batch is held back, never half-published.", Art: Tested, href: "/skills/data-engineering/lab#quality", link: "Live checks on three APIs" },
  { t: "Observable", d: "Freshness and volume are watched on every run, and someone hears about it when they drift.", Art: Observable, href: "/skills/data-engineering/lab#quality", link: "Break the data, watch it caught" },
];

export function DeRules() {
  return (
    <section id="rules" className="mx-auto mt-28 max-w-[1240px] scroll-mt-8 px-5 md:px-10">
      <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">How I build them</p>
      <h2 className="max-w-3xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">Four rules every pipeline here follows.</h2>
      <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2/70">What separates a script that worked once from a pipeline that can run every hour for years.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RULES.map(({ t, d, Art, href, link }, i) => (
          <article key={t} className="group flex flex-col rounded-[24px] border border-line bg-white p-4 transition hover:-translate-y-1 hover:border-ink/30">
            <div className="rounded-[18px] bg-cream/60 p-2">
              <Art />
            </div>
            <p className="mt-4 font-mono text-[11px] text-muted">0{i + 1}</p>
            <h3 className="mt-0.5 text-[1.3rem] leading-tight font-semibold tracking-[-0.02em]">{t}</h3>
            <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-ink-2/70">{d}</p>
            <Link href={href} className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold underline-offset-4 group-hover:underline">
              {link} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ explore, with animated thumbnails */
function ThumbLab() {
  return (
    <svg viewBox="0 0 200 70" className="h-auto w-full" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={8 + i * 19} y={20} width={14} height={30} rx={3} fill="rgba(255,255,255,0.15)">
          <animate attributeName="height" values="8;30;14;24;8" dur="2.4s" begin={`-${i * 0.24}s`} repeatCount="indefinite" />
          <animate attributeName="y" values="42;20;36;26;42" dur="2.4s" begin={`-${i * 0.24}s`} repeatCount="indefinite" />
        </rect>
      ))}
      <line x1={0} x2={200} y1={56} y2={56} stroke="rgba(255,255,255,0.2)" />
      <circle r={3} cy={62} fill={ORANGE}>
        <animate attributeName="cx" values="0;200" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
function ThumbSim() {
  return (
    <svg viewBox="0 0 200 70" className="h-auto w-full" aria-hidden>
      <path d="M8,35 H86 M114,35 H192" stroke="rgba(255,255,255,0.3)" strokeWidth={8} strokeLinecap="round" />
      <path d="M92,22 l6,10 l-6,4 l8,12" fill="none" stroke={ORANGE} strokeWidth={2}>
        <animate attributeName="opacity" values="1;0.2;1" dur="0.9s" repeatCount="indefinite" />
      </path>
      <circle r={4} cy={35} fill="#fff">
        <animate attributeName="cx" values="8;82;82" keyTimes="0;0.6;1" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle r={4} cy={35} fill={GREEN}>
        <animate attributeName="cx" values="118;192" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
function ThumbArch() {
  const nodes = [
    [20, 35],
    [80, 15],
    [80, 55],
    [140, 35],
    [185, 35],
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
    [3, 4],
  ];
  return (
    <svg viewBox="0 0 200 70" className="h-auto w-full" aria-hidden>
      {edges.map(([a, b]) => {
        const d = `M${nodes[a][0]},${nodes[a][1]} L${nodes[b][0]},${nodes[b][1]}`;
        return (
          <g key={`${a}-${b}`}>
            <path d={d} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
            <circle r={2.5} fill="#fff">
              <animateMotion dur="1.6s" begin={`-${a * 0.3}s`} repeatCount="indefinite" path={d} />
            </circle>
          </g>
        );
      })}
      {nodes.map(([x, y], i) => (
        <rect key={i} x={x - 9} y={y - 7} width={18} height={14} rx={4} fill={i === 3 ? ORANGE : "#fff"} />
      ))}
    </svg>
  );
}

const EXPLORE = [
  { href: "/skills/data-engineering/lab", n: "01", t: "Pipeline lab", d: "Wikipedia edits processed live as a stream, live data-quality checks, and every pipeline that feeds this site, measured.", Thumb: ThumbLab },
  { href: "/skills/data-engineering/simulator", n: "02", t: "Incident simulator", d: "Break a pipeline on purpose (API down, schema change, duplicates, late data) and compare a naive copy with a guarded one, hour by hour.", Thumb: ThumbSim },
  { href: "/skills/data-engineering/architectures", n: "03", t: "Architectures", d: "Batch, streaming, lakehouse, CDC and reverse ETL, animated end to end with one record followed through each, plus the real setup of this site.", Thumb: ThumbArch },
];

export function DeExplore() {
  return (
    <section id="explore" className="mx-auto max-w-[1240px] scroll-mt-8 px-5 pt-28 md:px-10">
      <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">Explore</p>
      <h2 className="max-w-3xl text-[2.4rem] leading-[1] font-semibold tracking-[-0.045em] sm:text-[3.4rem]">Pipelines you can watch run.</h2>
      <div className="mt-10 grid gap-3 md:grid-cols-3">
        {EXPLORE.map(({ href, n, t, d, Thumb }) => (
          <Link key={t} href={href} className="group flex h-full flex-col rounded-[24px] bg-ink p-6 text-white transition hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <span className="font-mono text-[12px] text-white/50">{n}</span>
              <ArrowUpRight className="h-5 w-5 transition group-hover:rotate-45" />
            </div>
            <div className="mt-6 rounded-[16px] bg-white/[0.06] p-3">
              <Thumb />
            </div>
            <p className="mt-6 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">{t}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-white/65">{d}</p>
          </Link>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-cream px-6 py-5 text-ink/60">
        <p className="text-[15px]">
          <span className="mr-3 font-mono text-[12px] text-ink/40">04</span>
          <span className="font-semibold text-ink/70">Work case</span> · pipelines and master data from real work, anonymised.
        </p>
        <span className="rounded-full bg-white px-3 py-1 font-mono text-[11px]">coming next</span>
      </div>
    </section>
  );
}
