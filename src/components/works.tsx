"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowUpRight, Check, MapPin } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRef } from "react";
import automationShot from "@/assets/works/automation/fusion-preview.webp";
import budgetShot from "@/assets/works/budgettower/dashboard.webp";
import dashboardsShot from "@/assets/works/dashboards/kpi-tv.webp";
import embedhubShot from "@/assets/works/embedhub/admin.webp";
import fulfillmentShot from "@/assets/works/fulfillment/dashboard.webp";
import inventoryShot from "@/assets/works/inventory/dashboard.webp";
import gatherinsightShot from "@/assets/works/gatherinsight.webp";
import portalShot from "@/assets/works/portal/menu.webp";
import protrackHome from "@/assets/works/protrack/home.webp";
import tickmateShot from "@/assets/works/tickmate/board.webp";
import protrackInside from "@/assets/works/protrack/inside.webp";
import protrackLogin from "@/assets/works/protrack/login.webp";
import { works, type Work } from "@/data/profile";
import { ease, Kicker, SplitWords } from "./motion";

/** Real screenshots, shown instead of the drawn visual: a web product in a browser frame, a field app as phones. */
type Shot =
  /** `label` goes in the address bar of an internal app that has no public URL */
  | { kind: "browser"; src: StaticImageData; alt: string; label?: string }
  | { kind: "phones"; srcs: [StaticImageData, StaticImageData, StaticImageData]; alt: string };

const SHOTS: Record<string, Shot> = {
  gatherinsight: {
    kind: "browser",
    src: gatherinsightShot,
    alt: "GatherInsight landing page: “Every data point comes with its proof”, with an AI check that flags an interviewer's answer the voice recording contradicts",
  },
  portals: {
    kind: "browser",
    src: portalShot,
    label: "portal channel operation · internal",
    alt: "Portal Channel Operation main menu on demo data: six work areas (Partner, Distribution, Tools, Data & References, PNL, PSTR) beside a sidebar with access management and the activity log",
  },
  embedhub: {
    kind: "browser",
    src: embedhubShot,
    label: "embed hub · internal",
    alt: "Embed Hub admin menu on demo content: menus created by the admin, embedded sheets uploaded by data owners, and counts of menus, data and users",
  },
  tickmate: {
    kind: "browser",
    src: tickmateShot,
    label: "tickmate · internal helpdesk",
    alt: "TickMate complaint tickets on demo data: status tabs (open, in progress, waiting for info, solved, rejected), filters by brand, category, severity, system, assignee and region, and the ticket list with severity, region and days open",
  },
  budgettower: {
    kind: "browser",
    src: budgetShot,
    label: "budget tower · marketing",
    alt: "Budget Tower dashboard on demo data: total budget, committed, realized and remaining; SC/SR, purchase order and goods receipt progress; budget progress per quarter and the incremental revenue",
  },
  inventory: {
    kind: "browser",
    src: inventoryShot,
    label: "inventory · internal app",
    alt: "InvenTory dashboard on demo data: total receipts and value, categories and item types, events, receipts waiting for review and approved, and the trend of purchase value by date",
  },
  automation: {
    kind: "browser",
    src: automationShot,
    label: "fusion so import · internal",
    alt: "Fusion SO Import Generator preview on demo data: 14 orders and 50 lines ready, 2 rows skipped with the reason (a dealer code missing from the customer master, a material not configured), the orders to be created, and the history of earlier batches",
  },
  dashboards: {
    kind: "browser",
    src: dashboardsShot,
    label: "d-1 kpi dashboard · office tv",
    alt: "D-1 KPI TV dashboard on demo data: gold top bar with five pages, an IOH / IM3 / 3ID brand switch, scorecards for outlets, sell-in, RGU, secondary, OSA and stock, and a table of every region, area and branch with MTD, LMTD, target, achievement and growth",
  },
  fulfillment: {
    kind: "browser",
    src: fulfillmentShot,
    label: "fulfillment · internal app",
    alt: "Fulfillment Manpower dashboard on demo data: quota, active, fulfillment rate against target, vacant slots, average and critical vacant days, fulfillment per region and role, the longest vacancies and resignation reasons",
  },
  protrack: {
    kind: "phones",
    srcs: [protrackLogin, protrackHome, protrackInside],
    alt: "PROTRACK on a phone: the login screen, the promoter's home with today's visits, and an outlet check-in inside the 500 m radius",
  },
};

/** Card colours. "cream" is the site default; a product with its own brand gets its colours (sampled from its site). */
const THEMES = {
  cream: {
    card: "bg-cream",
    badge: "bg-ink text-white",
    tag: "border-ink/15",
    rule: "border-ink/15",
    panel: "bg-cream-2",
    cta: "bg-ink text-white hover:bg-ink/85",
    ghost: "border border-ink/20 bg-white/60 text-ink hover:bg-white",
  },
  blue: {
    card: "bg-gradient-to-br from-[#f3f9ff] to-[#dcecfc]",
    badge: "bg-[#2088e4] text-white",
    tag: "border-[#2088e4]/30 text-[#1a5fa8]",
    rule: "border-[#2088e4]/25",
    panel: "bg-gradient-to-br from-white to-[#e3f0fc]",
    cta: "bg-[#2088e4] text-white shadow-[0_4px_0_#98c4f7] hover:bg-[#1a78cc]",
    ghost: "border border-[#2088e4]/35 bg-white/70 text-[#1a5fa8] hover:bg-white",
  },
  // Portal Channel Operation: Indosat red, magenta and orange on the portal's light grey
  ioh: {
    card: "bg-gradient-to-br from-[#fafbfc] to-[#eceef2]",
    badge: "bg-gradient-to-br from-[#E4002B] via-[#D50057] to-[#F7941D] text-white",
    tag: "border-[#E4002B]/25 text-[#b8002a]",
    rule: "border-[#E4002B]/20",
    panel: "bg-gradient-to-br from-white to-[#f0f2f5]",
    cta: "bg-[#E4002B] text-white shadow-[0_8px_20px_-10px_rgba(228,0,43,0.7)] hover:bg-[#c80026]",
    ghost: "border border-[#E4002B]/30 bg-white/70 text-[#b8002a] hover:bg-white",
  },
  // Embed Hub: graphite and near-black buttons, its blue-to-indigo logo as the accent
  graphite: {
    card: "bg-gradient-to-br from-[#f8f8f9] to-[#e7e7eb]",
    badge: "bg-gradient-to-br from-[#3b82f6] to-[#6366f1] text-white",
    tag: "border-[#2563eb]/25 text-[#1d4ed8]",
    rule: "border-[#111113]/15",
    panel: "bg-gradient-to-br from-white to-[#f1f1f3]",
    cta: "bg-[#111113] text-white hover:bg-black",
    ghost: "border border-[#111113]/20 bg-white/70 text-[#111113] hover:bg-white",
  },
  // TickMate: slate surfaces and its royal-blue buttons
  ticket: {
    card: "bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0]",
    badge: "bg-[#155dfc] text-white",
    tag: "border-[#155dfc]/25 text-[#1447e6]",
    rule: "border-[#0f172a]/12",
    panel: "bg-gradient-to-br from-white to-[#f1f5f9]",
    cta: "bg-[#155dfc] text-white shadow-[0_8px_20px_-10px_rgba(21,93,252,0.7)] hover:bg-[#1447e6]",
    ghost: "border border-[#155dfc]/30 bg-white/70 text-[#1447e6] hover:bg-white",
  },
  // Budget Tower: its blue-to-indigo logo, with the green of "realized"
  tower: {
    card: "bg-gradient-to-br from-[#fafafa] to-[#e9e9f3]",
    badge: "bg-gradient-to-br from-[#2a63d6] to-[#4a3aa7] text-white",
    tag: "border-[#4a3aa7]/25 text-[#3d3090]",
    rule: "border-[#4a3aa7]/18",
    panel: "bg-gradient-to-br from-white to-[#f2f3f5]",
    cta: "bg-gradient-to-br from-[#2a63d6] to-[#4a3aa7] text-white shadow-[0_8px_20px_-10px_rgba(74,58,167,0.7)] hover:brightness-110",
    ghost: "border border-[#4a3aa7]/30 bg-white/70 text-[#3d3090] hover:bg-white",
  },
  // InvenTory: its near-black title bar on a cool off-white page
  receipt: {
    card: "bg-gradient-to-br from-[#f8fafc] to-[#e8ecf1]",
    badge: "bg-[#0f172b] text-white",
    tag: "border-[#0f172b]/20 text-[#334155]",
    rule: "border-[#0f172b]/15",
    panel: "bg-gradient-to-br from-white to-[#f1f5f9]",
    cta: "bg-[#0f172b] text-white hover:bg-black",
    ghost: "border border-[#0f172b]/20 bg-white/70 text-[#0f172b] hover:bg-white",
  },
  // Fusion SO Import: the app's soft pastel look, lavender with a pink-to-violet gradient on its buttons
  lavender: {
    card: "bg-gradient-to-br from-[#fbf7fd] to-[#ebe8fb]",
    badge: "bg-gradient-to-br from-[#8b7cf6] to-[#e56bb5] text-white",
    tag: "border-[#7c6cf0]/30 text-[#5b4bd6]",
    rule: "border-[#7c6cf0]/20",
    panel: "bg-gradient-to-br from-white to-[#f1f2fa]",
    cta: "bg-gradient-to-br from-[#8b7cf6] to-[#e56bb5] text-white shadow-[0_8px_20px_-10px_rgba(124,108,240,0.75)] hover:brightness-105",
    ghost: "border border-[#7c6cf0]/30 bg-white/70 text-[#5b4bd6] hover:bg-white",
  },
  // D-1 KPI TV dashboard: its old-gold top bar on the warm cream page
  gold: {
    card: "bg-gradient-to-br from-[#f8f5ec] to-[#ebe3cf]",
    badge: "bg-gradient-to-br from-[#6b4e05] to-[#a07a10] text-white",
    tag: "border-[#94700a]/30 text-[#7a5a08]",
    rule: "border-[#94700a]/20",
    panel: "bg-gradient-to-br from-white to-[#f1ede2]",
    cta: "bg-[#7a5a08] text-white shadow-[0_8px_20px_-10px_rgba(107,78,5,0.7)] hover:bg-[#6b4e05]",
    ghost: "border border-[#94700a]/30 bg-white/70 text-[#7a5a08] hover:bg-white",
  },
  // Fulfillment Manpower: the app's own cobalt on slate
  navy: {
    card: "bg-gradient-to-br from-[#f5f7fb] to-[#dde5f0]",
    badge: "bg-[#0b5cad] text-white",
    tag: "border-[#0b5cad]/25 text-[#0b4a8a]",
    rule: "border-[#0b5cad]/20",
    panel: "bg-gradient-to-br from-white to-[#e4ebf5]",
    cta: "bg-[#0b5cad] text-white shadow-[0_8px_20px_-10px_rgba(11,92,173,0.7)] hover:bg-[#0a4f96]",
    ghost: "border border-[#0b5cad]/30 bg-white/70 text-[#0b4a8a] hover:bg-white",
  },
  // PROTRACK: IM3 magenta and gold, from the app's own stylesheet
  magenta: {
    card: "bg-gradient-to-br from-[#fffaf0] to-[#fce4f0]",
    badge: "bg-gradient-to-br from-[#ffc107] to-[#d5006f] text-white",
    tag: "border-[#d5006f]/25 text-[#a80058]",
    rule: "border-[#d5006f]/20",
    panel: "bg-gradient-to-br from-[#fff6da] via-[#fdeef4] to-[#f9d3e6]",
    cta: "bg-gradient-to-r from-[#ffb000] to-[#d5006f] text-white shadow-[0_10px_24px_-10px_rgba(213,0,111,0.7)] hover:brightness-105",
    ghost: "border border-[#d5006f]/30 bg-white/70 text-[#a80058] hover:bg-white",
  },
} as const;

/** Black stage, cream cards that pin and stack like slides in a deck. */
export function Works() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <section id="work" className="relative rounded-t-[36px] bg-ink text-white">
      <div className="mx-auto max-w-[1240px] px-5 pt-28 pb-10 md:px-10 md:pt-36">
        <p className="mb-6 font-mono text-[12px] tracking-[0.2em] text-white/45 uppercase">
          <Kicker text="( 03 )  Selected work" dark />
        </p>
        <h2 className="text-[4.2rem] leading-[0.9] font-semibold tracking-[-0.06em] sm:text-[7rem] lg:text-[9.5rem]">
          <SplitWords text="Works." />
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease, delay: 0.3 }}
          className="mt-6 max-w-md text-[17px] text-white/55"
        >
          Products, apps and bots that left the notebook and went to work.
        </motion.p>
      </div>

      <div ref={ref} className="relative">
        {works.map((w, i) => (
          <WorkCard
            key={w.slug}
            work={w}
            index={i}
            progress={scrollYProgress}
            range={[i / works.length, 1]}
            targetScale={1 - (works.length - i) * Math.min(0.045, 0.36 / works.length)}
          />
        ))}
      </div>
      <div className="h-[20vh]" />
    </section>
  );
}

function WorkCard({
  work,
  index,
  progress,
  range,
  targetScale,
}: {
  work: Work;
  index: number;
  progress: MotionValue<number>;
  range: [number, number];
  targetScale: number;
}) {
  const scale = useTransform(progress, range, [1, targetScale]);
  // Only darken once the next card starts sliding over this one.
  const isLast = index === works.length - 1;
  const dimStart = Math.min(0.999, (index + 1) / works.length);
  const dim = useTransform(progress, [dimStart, 1], isLast ? [0, 0] : [0, 0.4]);
  const t = THEMES[work.theme ?? "cream"];
  const shot = SHOTS[work.slug];
  const host = work.url ? new URL(work.url).host : "";
  const name = work.title.split(":")[0];

  return (
    <div className="sticky top-0 flex h-[100svh] items-center justify-center px-3 md:px-10">
      <motion.article
        style={{ scale, top: `calc(-4vh + ${index * 22}px)` }}
        className={`relative w-full max-w-[1180px] origin-top overflow-hidden rounded-[30px] text-ink shadow-[0_-20px_60px_-30px_rgba(0,0,0,0.6)] ${t.card}`}
      >
        <motion.div style={{ opacity: dim }} className="pointer-events-none absolute inset-0 z-10 bg-ink" />
        <div className="grid gap-6 p-6 sm:p-9 md:grid-cols-[1.05fr_1fr] md:gap-10 md:p-12">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 font-mono text-[12px] text-ink/50">
              <span className={`rounded-full px-2.5 py-1 ${t.badge}`}>0{index + 1}</span>
              <span>{work.org}</span>
              <span>·</span>
              <span className="whitespace-nowrap">{work.year}</span>
            </div>
            <h3 className="mt-6 text-[1.9rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.5rem] lg:text-[2.9rem]">
              {work.title}
            </h3>
            <p className="mt-4 max-w-md text-[16px] text-ink/60">{work.line}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {work.tags.map((tag) => (
                <span key={tag} className={`rounded-full border px-3 py-1 font-mono text-[11.5px] ${t.tag}`}>
                  #{tag}
                </span>
              ))}
            </div>
            {work.url || work.case ? (
              // live product first; a case page on this site is the second button (or the only one)
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {work.url && (
                  <a
                    href={work.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="Visit"
                    className={`inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold transition ${t.cta}`}
                  >
                    Visit {name}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
                {work.case && (
                  <Link
                    href={work.case}
                    data-cursor="Open"
                    className={`inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold transition ${work.url ? t.ghost : t.cta}`}
                  >
                    {work.caseLabel ?? `How ${name} works`}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            ) : null}
            <div className="mt-auto hidden gap-5 pt-10 md:grid md:grid-cols-3">
              {work.points.map((p) => (
                <div key={p.h} className={`border-t pt-3 ${t.rule}`}>
                  <p className="text-[14px] font-semibold">{p.h}</p>
                  <p className="mt-1 text-[13px] leading-snug text-ink/55">{p.p}</p>
                </div>
              ))}
            </div>
          </div>

          {/* a screenshot panel sizes to its frame on phones; drawn visuals keep the 4:3 box */}
          <div className={`relative overflow-hidden rounded-[22px] md:min-h-[400px] ${shot?.kind === "browser" ? "" : "aspect-[4/3] md:aspect-auto"} ${t.panel}`}>
            {shot?.kind === "browser" ? (
              <ShotVisual shot={shot} url={work.url} host={host || shot.label || ""} theme={work.theme ?? "blue"} />
            ) : shot?.kind === "phones" && (work.case || work.url) ? (
              <PhoneShots shot={shot} href={(work.case || work.url)!} label={`How ${work.title.split(":")[0]} works`} />
            ) : (
              <>
                <div className="absolute inset-0 [background-image:radial-gradient(rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
                <WorkVisual kind={work.visual} />
              </>
            )}
            {/* on a screenshot panel the role sits in the top row, opposite the "live site" chip */}
            <span className={`pointer-events-none absolute right-4 rounded-full bg-white/85 px-3 py-1 font-mono text-[11px] backdrop-blur ${shot ? "top-4" : "bottom-4"}`}>
              {work.role}
            </span>
          </div>
        </div>
      </motion.article>
    </div>
  );
}

/** Each product's own backdrop, drawn from its UI: GatherInsight's diagonal stripes are its signature and stay its alone. */
function Backdrop({ theme }: { theme: string }) {
  const svg = "absolute inset-0 h-full w-full";
  if (theme === "ioh") {
    // Portal Channel Operation: the three overlapping circles of the IOH logo, and the quarter circles in its cards' corners
    const circles: [number, number, string][] = [
      [318, 72, "#E4002B"],
      [362, 96, "#D50057"],
      [336, 140, "#F7941D"],
    ];
    return (
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={svg} aria-hidden>
        {circles.map(([cx, cy, c], i) => (
          <motion.circle key={i} cx={cx} cy={cy} r={86} fill={c} fillOpacity={0.09} variants={{ hidden: { scale: 0.6, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { duration: 0.9, delay: i * 0.12, ease } } }} style={{ originX: 0.5, originY: 0.5 }} />
        ))}
        <motion.circle cx={0} cy={300} r={84} fill="#00A79D" fillOpacity={0.07} variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.9, delay: 0.4 } } }} />
        <motion.circle cx={44} cy={18} r={30} fill="#E4002B" fillOpacity={0.06} variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.9, delay: 0.5 } } }} />
      </svg>
    );
  }
  if (theme === "graphite") {
    // Embed Hub: a quiet data grid with the blue-to-indigo glow of its logo
    return (
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={svg} aria-hidden>
        <defs>
          <pattern id="eh-dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="#111113" fillOpacity="0.12" />
          </pattern>
          <radialGradient id="eh-glow" cx="0.85" cy="0.12" r="0.75">
            <stop offset="0" stopColor="#6366f1" stopOpacity="0.28" />
            <stop offset="0.45" stopColor="#3b82f6" stopOpacity="0.1" />
            <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill="url(#eh-dots)" />
        <motion.rect width="400" height="300" fill="url(#eh-glow)" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 1.2 } } }} />
      </svg>
    );
  }
  if (theme === "navy") {
    // Fulfillment Manpower: a faint heatmap of slots, mostly filled, a few vacant (amber) and critical (red), like its fulfillment table
    const cols = 11;
    const rows = 8;
    const tone = (i: number) => (i % 23 === 7 ? "#d97706" : i % 31 === 12 ? "#dc2626" : i % 5 === 0 ? "#0b5cad" : "#94a8c6");
    return (
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={svg} aria-hidden>
        {Array.from({ length: cols * rows }, (_, i) => {
          const x = 8 + (i % cols) * 36;
          const y = 8 + Math.floor(i / cols) * 36;
          return (
            <motion.rect
              key={i}
              x={x}
              y={y}
              width={28}
              height={28}
              rx={6}
              fill={tone(i)}
              variants={{ hidden: { opacity: 0 }, show: { opacity: tone(i) === "#94a8c6" ? 0.14 : 0.2, transition: { duration: 0.5, delay: (i % cols) * 0.03 + Math.floor(i / cols) * 0.02 } } }}
            />
          );
        })}
      </svg>
    );
  }
  if (theme === "ticket") {
    // TickMate: rows of its ticket list, a severity dot and a status badge in each
    const pills = ["#e9effd", "#fbf0e5", "#e5d8fb", "#e7f6ed", "#e9effd", "#e7f6ed"];
    const edges = ["#155dfc", "#d97706", "#7c3aed", "#16a34a", "#155dfc", "#16a34a"];
    const dots = ["#fb2c36", "#f97316", "#64748b", "#fb2c36", "#ca8a04", "#64748b"];
    return (
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={svg} aria-hidden>
        {pills.map((fill, i) => {
          const y = 54 + i * 46;
          const x = i % 2 ? 96 : 120;
          return (
            <motion.g key={i} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, delay: i * 0.07, ease } } }}>
              <rect x={0} y={y - 13} width={400} height={30} fill="#0f172a" fillOpacity={0.025} />
              <circle cx={x} cy={y + 2} r={4} fill={dots[i]} fillOpacity={0.6} />
              <rect x={x + 12} y={y - 6} width={58} height={16} rx={8} fill={fill} stroke={edges[i]} strokeOpacity={0.35} />
              <rect x={x + 82} y={y - 1} width={70 + (i % 3) * 18} height={6} rx={3} fill="#0f172a" fillOpacity={0.07} />
            </motion.g>
          );
        })}
      </svg>
    );
  }
  if (theme === "tower") {
    // Budget Tower: its quarterly progress bars (realized green, committed blue, remaining indigo) and the burn line behind them
    const quarters = [[0.42, 0.22], [0.28, 0.12], [0.22, 0.12], [0.06, 0.32]];
    return (
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={svg} aria-hidden>
        <motion.path d="M20 250 C90 236 150 214 220 180 C280 152 330 132 390 120" fill="none" stroke="#2a63d6" strokeOpacity={0.22} strokeWidth={3} variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 1.3, ease } } }} />
        <motion.path d="M20 262 L390 88" fill="none" stroke="#14171f" strokeOpacity={0.14} strokeWidth={2} strokeDasharray="6 6" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.8, delay: 0.3 } } }} />
        {quarters.map(([realized, committed], i) => {
          const y = 30 + i * 18;
          const w = 220;
          return (
            <motion.g key={i} style={{ originX: 0 }} variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.8, delay: 0.1 + i * 0.08, ease } } }}>
              <rect x={90} y={y} width={w} height={7} rx={3.5} fill="#4a3aa7" fillOpacity={0.22} />
              <rect x={90} y={y} width={w * (realized + committed)} height={7} rx={3.5} fill="#2a63d6" fillOpacity={0.3} />
              <rect x={90} y={y} width={w * realized} height={7} rx={3.5} fill="#0ca30c" fillOpacity={0.35} />
            </motion.g>
          );
        })}
      </svg>
    );
  }
  if (theme === "receipt") {
    // InvenTory: the panel as a receipt: torn top and bottom edges, dotted item lines, a heavier total line
    const zig = (y: number, dir: 1 | -1) => `l0 ${0} ` + Array.from({ length: 50 }, (_, k) => `l8 ${k % 2 ? -6 * dir : 6 * dir}`).join(" ");
    return (
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={svg} aria-hidden>
        <motion.g variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.8 } } }}>
          <path d={`M0 0 L400 0 L400 10 L0 10 Z`} fill="#ffffff" fillOpacity={0.7} />
          <path d={`M0 10 ${zig(10, 1)} L400 10 Z`} fill="#ffffff" fillOpacity={0.7} />
          <path d={`M0 300 L0 290 ${zig(290, -1)} L400 300 Z`} fill="#ffffff" fillOpacity={0.7} />
        </motion.g>
        {Array.from({ length: 10 }, (_, i) => {
          const y = 44 + i * 22;
          const total = i === 9;
          return (
            <motion.line
              key={i}
              x1={14}
              x2={386}
              y1={y}
              y2={y}
              stroke="#0f172b"
              strokeOpacity={total ? 0.22 : 0.12}
              strokeWidth={total ? 2 : 1.4}
              strokeDasharray={total ? undefined : "2 6"}
              strokeLinecap="round"
              variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.9, delay: i * 0.05, ease } } }}
            />
          );
        })}
      </svg>
    );
  }
  if (theme === "lavender") {
    // Fusion SO Import: the soft pink-lavender-blue glow of its banner and the rounded bars of its activity card
    const bars = [18, 30, 12, 36, 24, 40, 16, 28, 34];
    return (
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={svg} aria-hidden>
        <defs>
          {[
            ["fu-pink", "#f8b4d6"],
            ["fu-lav", "#c9b8ff"],
            ["fu-blue", "#a9cbff"],
          ].map(([id, c]) => (
            <radialGradient key={id} id={id}>
              <stop offset="0" stopColor={c} stopOpacity="0.55" />
              <stop offset="1" stopColor={c} stopOpacity="0" />
            </radialGradient>
          ))}
          <linearGradient id="fu-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e56bb5" />
            <stop offset="1" stopColor="#8b7cf6" />
          </linearGradient>
        </defs>
        {[
          ["fu-pink", 70, 60, 150],
          ["fu-lav", 300, 120, 170],
          ["fu-blue", 230, 280, 150],
        ].map(([id, cx, cy, r], i) => (
          <motion.circle key={id} cx={cx} cy={cy} r={r} fill={`url(#${id})`} variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 1.2, delay: i * 0.15 } } }} />
        ))}
        {bars.map((h, i) => (
          <motion.rect
            key={i}
            x={110 + i * 20}
            y={294 - h}
            width={11}
            height={h}
            rx={5.5}
            fill="url(#fu-bar)"
            fillOpacity={0.35}
            style={{ originY: 1 }}
            variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.6, delay: 0.3 + i * 0.05, ease } } }}
          />
        ))}
      </svg>
    );
  }
  if (theme === "gold") {
    // D-1 KPI TV dashboard: its gold top bar, the table's banded rows and the achievement ring
    return (
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={svg} aria-hidden>
        <motion.rect width={400} height={30} fill="#a07a10" fillOpacity={0.14} variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.7 } } }} />
        {Array.from({ length: 11 }, (_, i) => (
          <motion.rect
            key={i}
            x={0}
            y={44 + i * 24}
            width={400}
            height={12}
            fill="#94700a"
            fillOpacity={i % 4 === 0 ? 0.09 : 0.04}
            style={{ originX: 0 }}
            variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.8, delay: i * 0.04, ease } } }}
          />
        ))}
        <circle cx={352} cy={252} r={66} fill="none" stroke="#c98100" strokeOpacity={0.08} strokeWidth={16} />
        <motion.circle
          cx={352}
          cy={252}
          r={66}
          fill="none"
          stroke="#c98100"
          strokeOpacity={0.24}
          strokeWidth={16}
          strokeLinecap="round"
          transform="rotate(-90 352 252)"
          variants={{ hidden: { pathLength: 0 }, show: { pathLength: 0.93, transition: { duration: 1.2, delay: 0.3, ease } } }}
        />
      </svg>
    );
  }
  // GatherInsight: its three diagonal stripes
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={svg} aria-hidden>
      {[200, 275, 350].map((x, i) => (
        <motion.line
          key={x}
          x1={x - 150}
          y1={330}
          x2={x + 60}
          y2={-30}
          stroke="#d3e6fa"
          strokeWidth={44}
          strokeLinecap="round"
          variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 1.1, delay: i * 0.12, ease } } }}
        />
      ))}
    </svg>
  );
}

/** Frame colours per card theme: borders and address bar. */
const FRAMES = {
  blue: { border: "border-[#2088e4]/15", bar: "bg-[#f6faff] border-[#2088e4]/10", dot: "bg-[#2088e4]/20", text: "text-[#1a5fa8]", shadow: "shadow-[0_24px_60px_-28px_rgba(20,70,140,0.55)]" },
  ioh: { border: "border-[#E4002B]/12", bar: "bg-[#fafbfc] border-[#E4002B]/10", dot: "bg-[#E4002B]/25", text: "text-[#b8002a]", shadow: "shadow-[0_24px_60px_-28px_rgba(120,0,30,0.45)]" },
  graphite: { border: "border-[#111113]/10", bar: "bg-[#f7f7f8] border-[#111113]/8", dot: "bg-[#6366f1]/25", text: "text-[#1d4ed8]", shadow: "shadow-[0_24px_60px_-28px_rgba(17,17,19,0.45)]" },
  ticket: { border: "border-[#0f172a]/10", bar: "bg-[#f8fafc] border-[#0f172a]/8", dot: "bg-[#155dfc]/25", text: "text-[#1447e6]", shadow: "shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]" },
  tower: { border: "border-[#4a3aa7]/12", bar: "bg-[#fafafa] border-[#4a3aa7]/10", dot: "bg-[#2a63d6]/25", text: "text-[#3d3090]", shadow: "shadow-[0_24px_60px_-28px_rgba(61,48,144,0.45)]" },
  receipt: { border: "border-[#0f172b]/12", bar: "bg-[#f8fafc] border-[#0f172b]/10", dot: "bg-[#0f172b]/25", text: "text-[#334155]", shadow: "shadow-[0_24px_60px_-28px_rgba(15,23,43,0.5)]" },
  lavender: { border: "border-[#7c6cf0]/15", bar: "bg-[#fafaff] border-[#7c6cf0]/10", dot: "bg-[#e56bb5]/30", text: "text-[#5b4bd6]", shadow: "shadow-[0_24px_60px_-28px_rgba(91,75,214,0.45)]" },
  gold: { border: "border-[#94700a]/15", bar: "bg-[#f8f5ec] border-[#94700a]/12", dot: "bg-[#d9ae32]/40", text: "text-[#7a5a08]", shadow: "shadow-[0_24px_60px_-28px_rgba(64,46,4,0.5)]" },
  navy: { border: "border-[#0b5cad]/15", bar: "bg-[#f3f6fa] border-[#0b5cad]/10", dot: "bg-[#0b5cad]/20", text: "text-[#0b4a8a]", shadow: "shadow-[0_24px_60px_-28px_rgba(11,60,120,0.55)]" },
} as const;

/** A real screenshot in a browser frame on the product's own backdrop (diagonal stripes in its colour). With a live site the whole
 * panel opens it; an internal app shows the same frame, marked as running on demo data. */
function ShotVisual({ shot, url, host, theme }: { shot: Extract<Shot, { kind: "browser" }>; url?: string; host: string; theme: string }) {
  const f = FRAMES[theme as keyof typeof FRAMES] ?? FRAMES.blue;
  const Wrap = url ? motion.a : motion.div;
  const linkProps = url ? { href: url, target: "_blank", rel: "noopener noreferrer", "aria-label": `Open ${host} in a new tab`, "data-cursor": "Visit" } : {};
  return (
    <Wrap
      {...linkProps}
      className="group relative flex h-full items-center justify-center px-4 pt-14 pb-5 sm:px-7 sm:pb-8"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-20%" }}
    >
      <Backdrop theme={theme} />

      <span className={`absolute top-4 left-4 z-[1] inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 font-mono text-[11px] shadow-sm backdrop-blur ${f.text}`}>
        {url ? (
          <>
            <span className="relative flex h-1.5 w-1.5 text-live">
              <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
            </span>
            live site
          </>
        ) : (
          "real app · demo data"
        )}
      </span>

      <div className="relative w-full">
        <motion.div
          className={`w-full overflow-hidden rounded-xl border bg-white transition duration-500 ${f.border} ${f.shadow} ${url ? "group-hover:-translate-y-1.5" : ""}`}
          variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease } } }}
        >
          <div className={`flex items-center gap-1.5 border-b px-3 py-2 ${f.bar}`}>
            <span className={`h-2 w-2 rounded-full ${f.dot}`} />
            <span className={`h-2 w-2 rounded-full ${f.dot}`} />
            <span className={`h-2 w-2 rounded-full ${f.dot}`} />
            <span className={`ml-2 flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md bg-white px-2 py-0.5 font-mono text-[10px] opacity-80 ${f.text}`}>
              <span className="truncate">{host}</span>
              {url && <ArrowUpRight className="h-3 w-3 shrink-0 transition duration-300 group-hover:rotate-45" />}
            </span>
          </div>
          <Image src={shot.src} alt={shot.alt} placeholder="blur" sizes="(min-width: 1180px) 520px, (min-width: 768px) 45vw, 90vw" className="block h-auto w-full" />
        </motion.div>
      </div>
    </Wrap>
  );
}

/** Three phone screenshots fanned out and bleeding off the bottom; the panel opens the case page. */
function PhoneShots({ shot, href, label }: { shot: Extract<Shot, { kind: "phones" }>; href: string; label: string }) {
  const pose = [
    { cls: "z-0 w-[33%] -mr-[7%] mt-[14%] -rotate-[8deg]", delay: 0.35 },
    { cls: "z-10 w-[38%]", delay: 0.2 },
    { cls: "z-0 w-[33%] -ml-[7%] mt-[14%] rotate-[8deg]", delay: 0.5 },
  ];
  return (
    <Link href={href} aria-label={label} data-cursor="Open" className="group absolute inset-0 block">
      <span className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 font-mono text-[11px] text-[#a80058] shadow-sm backdrop-blur">
        real app · demo data
      </span>
      <motion.div
        className="absolute inset-x-3 top-14 flex items-start justify-center sm:inset-x-8"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-20%" }}
      >
        {shot.srcs.map((src, i) => (
          <motion.div
            key={i}
            className={`relative shrink-0 ${pose[i].cls}`}
            variants={{ hidden: { opacity: 0, y: 60 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, delay: pose[i].delay, ease } } }}
          >
            <div className="overflow-hidden rounded-[22px] border-[4px] border-[#211a24] bg-[#211a24] shadow-[0_24px_50px_-24px_rgba(120,0,60,0.6)] transition duration-500 group-hover:-translate-y-2 sm:rounded-[28px] sm:border-[5px]">
              <Image
                src={src}
                alt={i === 1 ? shot.alt : ""}
                placeholder="blur"
                sizes="(min-width: 1180px) 200px, (min-width: 768px) 17vw, 34vw"
                className="block h-auto w-full rounded-[18px] sm:rounded-[23px]"
              />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </Link>
  );
}

function WorkVisual({ kind }: { kind: Work["visual"] }) {
  const inView = { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "-20%" } } as const;

  if (kind === "saas") {
    // GatherInsight-style: map with survey points + a side list
    const pins = [
      [22, 30], [38, 52], [55, 28], [64, 62], [78, 40], [30, 72], [48, 40], [70, 22],
    ];
    return (
      <motion.div className="absolute inset-5 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.4)] sm:inset-8" {...inView}>
        <div className="flex items-center gap-1.5 border-b border-ink/[0.06] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-ink/15" />
          <span className="h-2 w-2 rounded-full bg-ink/15" />
          <span className="h-2 w-2 rounded-full bg-ink/15" />
          <span className="ml-2 font-mono text-[10px] text-ink/45">fieldwork · map</span>
        </div>
        <div className="relative h-full bg-cream/50">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <path d="M0 35 C30 30 50 45 100 38 M0 70 C25 66 60 78 100 68 M28 0 C30 40 24 70 30 100 M66 0 C62 30 70 70 64 100" stroke="#0b0b0b" strokeOpacity="0.1" strokeWidth="3" fill="none" />
            <motion.path
              d="M18 80 L40 58 L62 66 L82 34"
              stroke="#0b0b0b"
              strokeWidth="0.8"
              strokeDasharray="2 2"
              fill="none"
              variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 1.4, delay: 0.6 } } }}
            />
          </svg>
          {pins.map(([x, y], i) => (
            <motion.span
              key={i}
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow"
              style={{ left: `${x}%`, top: `${y}%` }}
              variants={{ hidden: { scale: 0 }, show: { scale: 1, transition: { delay: 0.2 + i * 0.07, type: "spring", stiffness: 400, damping: 16 } } }}
            />
          ))}
          <motion.div
            className="absolute top-3 right-3 w-[42%] rounded-xl border border-ink/10 bg-white p-2.5 shadow-sm"
            variants={{ hidden: { opacity: 0, x: 16 }, show: { opacity: 1, x: 0, transition: { delay: 0.8, duration: 0.5, ease } } }}
          >
            <p className="text-[10px] font-semibold">Interview #847</p>
            <p className="mt-1 font-mono text-[9px] text-ink/50">audio · gps · photo</p>
            <div className="mt-2 flex gap-1">
              {["proof", "proof", "proof"].map((t, i) => (
                <span key={i} className="rounded bg-ink px-1.5 py-0.5 font-mono text-[8.5px] text-white">
                  ✓ {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (kind === "phone") {
    return (
      <motion.div className="absolute inset-0 flex items-center justify-center" {...inView}>
        <motion.div
          className="relative h-[78%] w-[44%] max-w-[200px] rounded-[28px] border-[6px] border-ink bg-white p-2.5"
          variants={{ hidden: { y: 40, opacity: 0, rotate: -4 }, show: { y: 0, opacity: 1, rotate: -4, transition: { duration: 0.8, ease } } }}
        >
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/80" />
          <p className="text-[10px] font-semibold">PROTRACK</p>
          <div className="relative mt-1.5 h-[46%] overflow-hidden rounded-xl bg-cream">
            <svg viewBox="0 0 100 80" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <path d="M0 28 H100 M0 56 H100 M34 0 V80 M68 0 V80" stroke="#0b0b0b" strokeOpacity="0.12" strokeWidth="5" />
            </svg>
            <motion.div className="absolute top-[24%] left-[44%]" variants={{ hidden: { y: -24, opacity: 0 }, show: { y: 0, opacity: 1, transition: { delay: 0.6, type: "spring" } } }}>
              <MapPin className="h-6 w-6 fill-ink text-white" strokeWidth={1.5} />
            </motion.div>
          </div>
          <motion.div
            className="mt-2 flex items-center gap-1 rounded-md bg-ink px-1.5 py-1 text-[8.5px] font-medium text-white"
            variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { delay: 0.9 } } }}
          >
            <Check className="h-2.5 w-2.5" strokeWidth={3} /> GPS verified
          </motion.div>
          <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl bg-ink py-2 text-center text-[10px] font-semibold text-white">Check in</div>
        </motion.div>
        <motion.div
          className="absolute right-[8%] bottom-[16%] rounded-xl border border-ink/10 bg-white px-3 py-2 shadow-sm"
          variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { delay: 1.1, duration: 0.5 } } }}
        >
          <p className="font-mono text-[9.5px] text-ink/50">mock GPS</p>
          <p className="text-[11px] font-semibold line-through">rejected</p>
        </motion.div>
      </motion.div>
    );
  }

  if (kind === "portal") {
    // a portal shell with modules + a complaint ticket travelling across the board
    const modules = ["Partners", "Stock", "Payouts", "Tools", "Tickets"];
    return (
      <motion.div className="absolute inset-5 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.4)] sm:inset-8" {...inView}>
        <div className="flex items-center gap-1.5 border-b border-ink/[0.06] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-ink/15" />
          <span className="h-2 w-2 rounded-full bg-ink/15" />
          <span className="h-2 w-2 rounded-full bg-ink/15" />
          <span className="ml-2 font-mono text-[10px] text-ink/45">portal / channel operation</span>
        </div>
        <div className="flex h-full">
          <div className="w-[30%] border-r border-ink/[0.06] p-2.5">
            {modules.map((m, i) => (
              <motion.div
                key={m}
                className={`mb-1 rounded-md px-2 py-1 text-[10.5px] font-medium ${i === 4 ? "bg-ink text-white" : ""}`}
                variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { delay: 0.2 + i * 0.07 } } }}
              >
                {m}
              </motion.div>
            ))}
          </div>
          <div className="relative flex-1 p-3">
            <p className="text-[11px] font-semibold">TickMate · complaints</p>
            <div className="relative mt-2 grid h-[55%] grid-cols-3 gap-1.5">
              {["Open", "In progress", "Solved"].map((c) => (
                <div key={c} className="rounded-md bg-cream/70 p-1.5">
                  <p className="font-mono text-[8.5px] text-ink/50">{c}</p>
                  <div className="mt-1 h-5 rounded bg-white" />
                  <div className="mt-1 h-5 rounded bg-white" />
                </div>
              ))}
              <motion.div
                className="absolute top-14 h-6 w-[30%] rounded bg-ink px-1.5 py-1 font-mono text-[8.5px] text-white shadow"
                variants={{ hidden: { left: "1%", opacity: 0 }, show: { left: ["1%", "35%", "69%"], opacity: 1, transition: { duration: 2.4, delay: 0.8, ease: "easeInOut" } } }}
              >
                #T-208 ✓
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (kind === "automation") {
    const nodes = ["BigQuery", "Excel", "Outlook", "WhatsApp"];
    return (
      <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6" {...inView}>
        <div className="flex w-full max-w-[380px] items-center justify-between">
          {nodes.map((n, i) => (
            <div key={n} className="flex items-center">
              <motion.div
                className={`grid h-14 w-14 place-items-center rounded-2xl text-center font-mono text-[9.5px] leading-tight sm:h-16 sm:w-16 ${i === nodes.length - 1 ? "bg-ink text-white" : "border border-ink/15 bg-white"}`}
                variants={{ hidden: { scale: 0.5, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { delay: i * 0.25, type: "spring", stiffness: 300, damping: 18 } } }}
              >
                {n}
              </motion.div>
              {i < nodes.length - 1 && (
                <motion.span
                  className="mx-1 h-px w-4 origin-left bg-ink sm:w-8"
                  variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { delay: i * 0.25 + 0.15, duration: 0.3 } } }}
                />
              )}
            </div>
          ))}
        </div>
        <motion.div
          className="w-full max-w-[380px] rounded-xl border border-ink/10 bg-white p-3 font-mono text-[10.5px] leading-relaxed text-ink/70"
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { delay: 1.1 } } }}
        >
          <p>✓ approve purchase orders</p>
          <p>✓ download SO PDFs</p>
          <p>✓ update SalesHub users</p>
          <p className="text-ink">→ report sent on WhatsApp</p>
        </motion.div>
      </motion.div>
    );
  }

  if (kind === "quadrant") {
    const rnd = (n: number) => {
      const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    const pts = Array.from({ length: 26 }, (_, i) => ({ x: Math.round(8 + rnd(i) * 84), y: Math.round(8 + rnd(i + 40) * 84) }));
    return (
      <motion.div className="absolute inset-6 sm:inset-9" {...inView}>
        <div className="relative h-full w-full">
          <motion.span className="absolute top-0 bottom-0 left-1/2 w-px origin-top bg-ink/30" variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.7 } } }} />
          <motion.span className="absolute right-0 left-0 top-1/2 h-px origin-left bg-ink/30" variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.7 } } }} />
          <span className="absolute top-1 right-1 font-mono text-[10px] text-ink/50">stars</span>
          <span className="absolute bottom-1 left-1 font-mono text-[10px] text-ink/50">at risk</span>
          <span className="absolute bottom-1 right-1 font-mono text-[10px] text-ink/50">capability →</span>
          <span className="absolute top-1 left-1 font-mono text-[10px] text-ink/50">↑ willingness</span>
          {pts.map((p, i) => (
            <motion.span
              key={i}
              className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${p.x > 50 && p.y < 50 ? "bg-ink" : "border border-ink/50 bg-white"}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              variants={{ hidden: { scale: 0 }, show: { scale: 1, transition: { delay: 0.5 + i * 0.03, type: "spring", stiffness: 400, damping: 16 } } }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  // forecast
  return (
    <motion.svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full p-6" {...inView}>
      {[60, 120, 180, 240].map((y) => (
        <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="#0b0b0b" strokeOpacity="0.08" />
      ))}
      <motion.path
        d="M10 230 C40 220 60 236 90 210 S140 190 170 196 S220 160 250 150"
        fill="none"
        stroke="#0b0b0b"
        strokeWidth="3"
        strokeLinecap="round"
        variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 1.4, ease: "easeInOut" } } }}
      />
      <motion.path
        d="M250 150 C280 140 300 110 330 104 S370 80 390 70"
        fill="none"
        stroke="#0b0b0b"
        strokeWidth="3"
        strokeDasharray="7 8"
        strokeLinecap="round"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 1.4 } } }}
      />
      <line x1="250" x2="250" y1="30" y2="280" stroke="#0b0b0b" strokeOpacity="0.25" strokeDasharray="3 5" />
      <text x="258" y="44" fontSize="12" fontFamily="var(--font-geist-mono)" fill="#0b0b0b" fillOpacity="0.55">
        forecast →
      </text>
    </motion.svg>
  );
}
