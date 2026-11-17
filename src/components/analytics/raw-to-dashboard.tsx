"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import p from "@/data/retail-profile.json";
import d from "@/data/retail-dashboard.json";
import { monthOf } from "@/lib/months";
import { InsideSection, Scrolly, type Step } from "../explainers/scrolly";

/**
 * One case study from raw rows to a finished dashboard, as a single canvas: 360 squares stand for the 541,909 raw
 * rows of the UCI Online Retail file. They light up when problems are found, fall away when cleaned, fly into a star
 * schema, stack into monthly revenue and end up as a tile of the dashboard. Every count is from the real data.
 */

const W = 640;
const H = 440;
const COLS = 24;
const ROWS = 15;
const N = COLS * ROWS;
const INK = "#0b0b0b";
const BLUE = "#2a78d6";
const HOT = "#eb6834";
const MUTED = "rgba(11,11,11,0.55)";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const r1 = (v: number) => Math.round(v * 10) / 10;
const n0 = (v: number) => v.toLocaleString("en-US");
const gbp = (v: number) => (v >= 1e6 ? `£${(v / 1e6).toFixed(2)}m` : `£${Math.round(v / 1e3)}k`);

/* ---------------------------------------------------------------- real counts → squares */
const F = p.funnel.map((s) => s.rows);
const REMOVED = { dup: F[0] - F[1], cancel: F[1] - F[2], zero: F[2] - F[3], fee: F[4] - F[5] };
const REMOVED_ROWS = F[0] - F[5];
/** Largest-remainder rounding: integer counts that add up to `total`. */
function allot(weights: number[], total: number) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map(Math.floor);
  const order = raw.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f);
  const missing = total - out.reduce((a, b) => a + b, 0);
  for (let k = 0; k < missing; k++) out[order[k].i] += 1;
  return out;
}
const nRemoved = Math.round((N * REMOVED_ROWS) / F[0]);
const removedSplit = allot(Object.values(REMOVED), nRemoved);
const nMissing = Math.round((N * p.cases.missing_customer.rows) / F[0]);
const MONTHLY = d.monthly;
const nKept = N - nRemoved;
const perMonth = allot(
  MONTHLY.map((m) => m.revenue),
  nKept,
);
const perSquare = d.totals.revenue / nKept;

type Kind = "ok" | "missing" | "dup" | "cancel" | "zero" | "fee";
// deterministic shuffle so problem rows are scattered through the sheet
const order = Array.from({ length: N }, (_, i) => i);
let seed = 7;
for (let i = N - 1; i > 0; i--) {
  seed = (seed * 16807) % 2147483647;
  const j = seed % (i + 1);
  [order[i], order[j]] = [order[j], order[i]];
}
const kinds: Kind[] = [
  ...(["dup", "cancel", "zero", "fee"] as Kind[]).flatMap((k, i) => Array(removedSplit[i]).fill(k)),
  ...Array(nMissing).fill("missing"),
  ...Array(N - nRemoved - nMissing).fill("ok"),
];
/** Each square: its kind, its place in the raw sheet, and (if kept) its month and slot in that month's stack. */
const SQ = (() => {
  const monthOfKept: number[] = perMonth.flatMap((c, m) => Array(c).fill(m));
  const slot = new Array(MONTHLY.length).fill(0);
  let kept = 0;
  return kinds.map((kind, k) => {
    const removed = kind === "dup" || kind === "cancel" || kind === "zero" || kind === "fee";
    const keptIndex = removed ? -1 : kept++;
    const month = removed ? -1 : monthOfKept[keptIndex];
    const j = removed ? -1 : slot[month]++;
    return { kind, cell: order[k], removed, keptIndex, month, j };
  });
})();

const COLOR: Record<Kind, string> = { ok: "#a9c6ea", missing: "#c9c2b4", dup: "#e0a800", cancel: "#d93a3a", zero: "#8f3f97", fee: "#0f766e" };
const LABEL: Record<Exclude<Kind, "ok">, string> = { dup: "duplicates", cancel: "cancellations", zero: "zero price or qty", fee: "postage & fees", missing: "no customer ID (kept)" };
const COUNT: Record<Exclude<Kind, "ok">, number> = { dup: REMOVED.dup, cancel: p.cases.cancellations.rows, zero: REMOVED.zero, fee: REMOVED.fee, missing: p.cases.missing_customer.rows };

/* ---------------------------------------------------------------- where every square goes, step by step */
type Box = { x: number; y: number; w: number; h: number; fill: string; o: number; rx: number };
const COLX = (m: number) => 50 + m * 44;
const BASE = 396;
/** Chart → dashboard tile: the monthly columns shrink into the trend tile. */
const TILE = { x0: 22, y0: 290, s: 0.64 };
function place(i: number, step: number): Box {
  const q = SQ[i];
  const col = q.cell % COLS;
  const row = Math.floor(q.cell / COLS);
  const grid = { x: r1(44 + col * 23.1), y: r1(78 + row * 21.6), w: 20, h: 18.5, rx: 2.5 };
  if (step <= 0) return { ...grid, fill: "#e4ded2", o: 1 };
  if (step === 1) return { ...grid, fill: COLOR[q.kind], o: 1 };
  if (q.removed) return { ...grid, y: grid.y + 120, fill: COLOR[q.kind], o: 0 };
  if (step === 2) return { ...grid, fill: q.kind === "missing" ? COLOR.missing : COLOR.ok, o: 1 };
  if (step === 3) {
    const k = q.keptIndex;
    return { x: r1(232 + (k % 19) * 9.4), y: r1(150 + Math.floor(k / 19) * 9.4), w: 8, h: 8, rx: 1.5, fill: q.kind === "missing" ? "#7fa7d9" : BLUE, o: 0.9 };
  }
  const partial = MONTHLY[q.month].partial;
  const stack = { x: r1(COLX(q.month) + (q.j % 2) * 15.5), y: r1(BASE - (Math.floor(q.j / 2) + 1) * 11), w: 14, h: 9.5, rx: 1.5 };
  const fill = step >= 7 && ["2011-09", "2011-10", "2011-11"].includes(MONTHLY[q.month].month) ? HOT : partial ? "#a9c6ea" : BLUE;
  if (step === 4) return { ...stack, fill, o: 1 };
  const solid = { x: stack.x, y: stack.y, w: 15.5, h: 11, rx: 0 };
  if (step === 5) return { ...solid, fill, o: 1 };
  return { x: r1(TILE.x0 + (solid.x - 50) * TILE.s), y: r1(TILE.y0 - (BASE - solid.y) * TILE.s), w: r1(solid.w * TILE.s), h: r1(solid.h * TILE.s), rx: 0, fill, o: 1 };
}

const ease = [0.22, 1, 0.36, 1] as const;
function Square({ i, step, still }: { i: number; step: number; still: boolean }) {
  const b = place(i, step);
  if (still) return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.rx} fill={b.fill} opacity={b.o} />;
  const delay = ((i * 37) % 60) * 0.009;
  return <motion.rect initial={false} animate={{ x: b.x, y: b.y, width: b.w, height: b.h, fill: b.fill, opacity: b.o }} transition={{ duration: 0.9, ease, delay }} rx={b.rx} />;
}

const T = ({
  x,
  y,
  s = 10,
  c = MUTED,
  a = "start",
  w,
  m = false,
  children,
}: {
  x: number;
  y: number;
  s?: number;
  c?: string;
  a?: "start" | "middle" | "end";
  w?: number;
  m?: boolean;
  children: React.ReactNode;
}) => (
  <text x={r1(x)} y={r1(y)} fontSize={s} fill={c} textAnchor={a} fontWeight={w} fontFamily={m ? MONO : FONT}>
    {children}
  </text>
);
function Fade({ on, still, children }: { on: boolean; still: boolean; children: React.ReactNode }) {
  if (still) return on ? <g>{children}</g> : null;
  return (
    <motion.g initial={false} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: 0.5, ease, delay: on ? 0.35 : 0 }} style={{ pointerEvents: "none" }}>
      {children}
    </motion.g>
  );
}

/* ---------------------------------------------------------------- the dashboard around the squares */
const FULL = MONTHLY.filter((m) => !m.partial);
const NOV = FULL[FULL.length - 1];
const OCT = FULL[FULL.length - 2];
const SEP = FULL.find((m) => m.month === "2011-09")!;
const AUG = FULL.find((m) => m.month === "2011-08")!;
const pct = (a: number, b: number) => `${a >= b ? "+" : "−"}${Math.abs((a / b - 1) * 100).toFixed(0)}%`;
const title = (s: string) => s.toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
function Dashboard({ step, still }: { step: number; still: boolean }) {
  const outside = d.countries.slice(1, 6);
  const omax = outside[0].revenue;
  const prods = d.products.slice(0, 5);
  const pmax = prods[0].revenue;
  const hmax = Math.max(...d.weekday_hour.orders.flat());
  const ukShare = Math.round((d.countries[0].revenue / d.totals.revenue) * 100);
  const kpis = [
    ["Net revenue", gbp(d.totals.revenue)],
    ["Orders", n0(d.totals.orders)],
    ["Customers", n0(d.totals.customers)],
    ["Countries", String(d.totals.countries)],
  ];
  return (
    <Fade on={step >= 6} still={still}>
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={16} fill="#f7f5f0" />
      <T x={14} y={24} s={13} c={INK} w={800}>
        {"Online Retail · sales overview"}
      </T>
      <T x={W - 14} y={24} s={9} a="end">
        {`${d.period.first} → ${d.period.last}`}
      </T>
      {kpis.map(([k, v], i) => (
        <g key={k}>
          <rect x={8 + i * 158} y={36} width={152} height={56} rx={10} fill="#fff" stroke="rgba(11,11,11,0.08)" />
          <T x={18 + i * 158} y={53} s={8.5} c="rgba(11,11,11,0.6)" w={600}>
            {k}
          </T>
          <T x={18 + i * 158} y={80} s={19} c={INK} w={800}>
            {v}
          </T>
        </g>
      ))}
      <rect x={8} y={100} width={398} height={198} rx={10} fill="#fff" stroke="rgba(11,11,11,0.08)" />
      <T x={18} y={117} s={9.5} c={INK} w={700}>
        {"Net revenue by month"}
      </T>
      {MONTHLY.map((m, k) =>
        k % 2 === 0 || k === MONTHLY.length - 2 ? (
          <T key={m.month} x={TILE.x0 + (COLX(k) - 50 + 15) * TILE.s} y={TILE.y0 + 4} s={7} a="middle">
            {monthOf(m.month).slice(0, 3)}
          </T>
        ) : null,
      )}
      <rect x={414} y={100} width={218} height={198} rx={10} fill="#fff" stroke="rgba(11,11,11,0.08)" />
      <T x={424} y={117} s={9.5} c={INK} w={700}>
        {"Where it sells"}
      </T>
      <T x={424} y={134} s={8.5}>
        {`UK ${ukShare}% · outside the UK:`}
      </T>
      {outside.map((c, i) => (
        <g key={c.country}>
          <T x={496} y={157 + i * 26} s={8} a="end" c={INK}>
            {c.country === "EIRE" ? "Ireland" : c.country}
          </T>
          <rect x={502} y={148 + i * 26} width={r1((c.revenue / omax) * 116)} height={12} rx={2} fill={BLUE} opacity={0.8} />
        </g>
      ))}
      <rect x={8} y={306} width={308} height={126} rx={10} fill="#fff" stroke="rgba(11,11,11,0.08)" />
      <T x={18} y={323} s={9.5} c={INK} w={700}>
        {"Top products"}
      </T>
      {prods.map((q, i) => (
        <g key={q.stock}>
          <T x={18} y={341 + i * 18} s={7.5} c={INK}>
            {title(q.name).slice(0, 30)}
          </T>
          <rect x={160} y={333 + i * 18} width={r1((q.revenue / pmax) * 120)} height={8} rx={2} fill={BLUE} opacity={0.8} />
        </g>
      ))}
      <rect x={324} y={306} width={308} height={126} rx={10} fill="#fff" stroke="rgba(11,11,11,0.08)" />
      <T x={334} y={323} s={9.5} c={INK} w={700}>
        {"When orders come in"}
      </T>
      {d.weekday_hour.orders.map((row, r) => (
        <g key={r}>
          <T x={358} y={341 + r * 12.5} s={7} a="end">
            {d.weekday_hour.days[r]}
          </T>
          {row.map((v, h) => (
            <rect key={h} x={r1(362 + h * 17.4)} y={333 + r * 12.5} width={16} height={11} rx={2} fill={v ? `rgba(42,120,214,${r1(0.12 + (0.88 * v) / hmax)})` : "rgba(11,11,11,0.04)"} />
          ))}
        </g>
      ))}
    </Fade>
  );
}

function Canvas({ step, still = false }: { step: number; still?: boolean }) {
  const pmax = Math.max(...perMonth);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="The Online Retail data turning from raw rows into a dashboard">
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={16} fill="#fbfaf7" stroke="rgba(11,11,11,0.08)" />
      <Dashboard step={step} still={still} />

      {/* 0–2: the sheet */}
      <Fade on={step <= 2} still={still}>
        <T x={44} y={40} s={12} c={INK} w={800}>
          {"online_retail.xlsx"}
        </T>
        <T x={44} y={56} s={9}>
          {`${n0(F[0])} rows × 8 columns · each square ≈ ${n0(Math.round(F[0] / N))} rows`}
        </T>
        {["InvoiceNo", "StockCode", "Description", "Quantity", "InvoiceDate", "UnitPrice", "CustomerID", "Country"].map((c, k) => (
          <T key={c} x={44 + k * 69.3} y={72} s={7.5} m>
            {c}
          </T>
        ))}
      </Fade>
      <Fade on={step === 1} still={still}>
        <rect x={392} y={10} width={240} height={52} rx={10} fill="#fff" stroke="rgba(11,11,11,0.1)" />
        {(Object.keys(LABEL) as Exclude<Kind, "ok">[]).map((k, i) => (
          <g key={k}>
            <rect x={400 + (i % 2) * 116} y={17 + Math.floor(i / 2) * 14} width={9} height={9} rx={2} fill={COLOR[k]} />
            <T x={412 + (i % 2) * 116} y={25 + Math.floor(i / 2) * 14} s={7.5} c={INK}>
              {`${n0(COUNT[k])} ${LABEL[k]}`}
            </T>
          </g>
        ))}
      </Fade>
      <Fade on={step === 2} still={still}>
        <rect x={392} y={12} width={240} height={46} rx={10} fill={INK} />
        <T x={404} y={32} s={15} c="#fff" w={800} m>
          {`${n0(F[0])} → ${n0(F[5])}`}
        </T>
        <T x={404} y={48} s={8.5} c="rgba(255,255,255,0.7)">
          {`−${n0(REMOVED_ROWS)} rows (${((REMOVED_ROWS / F[0]) * 100).toFixed(1)}%), one written rule at a time`}
        </T>
      </Fade>

      {/* 3: the star schema */}
      <Fade on={step === 3} still={still}>
        <rect x={222} y={128} width={196} height={204} rx={12} fill="none" stroke={INK} strokeWidth={1.5} />
        <T x={320} y={120} s={11} a="middle" c={INK} w={800} m>
          {"fct_sales"}
        </T>
        <T x={320} y={348} s={9} a="middle">
          {`${n0(F[5])} clean sales lines`}
        </T>
        {[
          ["dim_product", `${n0(d.totals.products)} products`, 90, 110],
          ["dim_country", `${d.totals.countries} countries`, 550, 110],
          ["dim_date", "one row per day", 90, 330],
          ["dim_customer", `${n0(d.totals.customers)} (counted only)`, 550, 330],
        ].map(([t, s, x, y]) => (
          <g key={t as string}>
            <line x1={x as number} y1={y as number} x2={320} y2={230} stroke="rgba(11,11,11,0.2)" strokeWidth={1.5} strokeDasharray="4 3" />
            <rect x={(x as number) - 66} y={(y as number) - 22} width={132} height={44} rx={9} fill="#fff" stroke={BLUE} />
            <T x={x as number} y={(y as number) - 3} s={10} a="middle" c={BLUE} w={700} m>
              {t as string}
            </T>
            <T x={x as number} y={(y as number) + 12} s={8.5} a="middle">
              {s as string}
            </T>
          </g>
        ))}
      </Fade>

      {/* 4–5: from rows to months */}
      <Fade on={step === 4 || step === 5} still={still}>
        <T x={50} y={40} s={12} c={INK} w={800}>
          {step === 4 ? "Sales lines, grouped by month" : "Net revenue by month"}
        </T>
        <T x={50} y={56} s={9}>
          {`each square ≈ £${n0(Math.round(perSquare / 1000))}k of net revenue (sales minus cancellations)`}
        </T>
        <line x1={44} x2={W - 14} y1={BASE + 0.5} y2={BASE + 0.5} stroke="rgba(11,11,11,0.25)" />
        {MONTHLY.map((m, k) => (
          <T key={m.month} x={COLX(k) + 15} y={BASE + 14} s={8.5} a="middle" c={m.partial ? "rgba(11,11,11,0.35)" : MUTED}>
            {`${monthOf(m.month).slice(0, 3)}${k === 0 || m.month.endsWith("-01") ? ` ’${m.month.slice(2, 4)}` : ""}`}
          </T>
        ))}
      </Fade>
      <Fade on={step === 5} still={still}>
        <path d={`M${COLX(FULL.length - 1) + 15},${BASE - Math.ceil(pmax / 2) * 11 - 8} l0,-18`} stroke={HOT} strokeWidth={1.5} />
        <T x={COLX(FULL.length - 1) + 10} y={BASE - Math.ceil(pmax / 2) * 11 - 30} s={10} a="end" c={HOT} w={800}>
          {`${monthOf(NOV.month, "long")}: ${gbp(NOV.revenue)}, ${pct(NOV.revenue, OCT.revenue)} on October`}
        </T>
        <T x={COLX(MONTHLY.length - 1) + 15} y={BASE + 28} s={7.5} a="middle">
          {"9 days only"}
        </T>
      </Fade>

      {/* the squares themselves */}
      <g>
        {SQ.map((_, i) => (
          <Square key={i} i={i} step={step} still={still} />
        ))}
      </g>

      {/* 7: the answer */}
      <Fade on={step >= 7} still={still}>
        <rect x={16} y={120} width={246} height={40} rx={10} fill={INK} />
        <T x={26} y={137} s={9.5} c="#fff" w={800}>
          {`Sep ${pct(SEP.revenue, AUG.revenue)} on Aug, then up to November`}
        </T>
        <T x={26} y={151} s={8} c="rgba(255,255,255,0.75)">
          {"→ Christmas stock should be in by the end of August"}
        </T>
      </Fade>
    </svg>
  );
}

export function RawToDashboard() {
  const steps: Step[] = [
    {
      t: "It starts as a spreadsheet",
      d: `${n0(F[0])} rows from a UK online gift shop: every product on every invoice for a year. The buying team asks one thing: when do orders peak, and when must Christmas stock be ready?`,
    },
    {
      t: "First, look for trouble",
      d: `${n0(REMOVED.dup)} exact duplicates, ${n0(p.cases.cancellations.rows)} cancellation lines, zero prices and postage lines. And ${n0(p.cases.missing_customer.rows)} rows (a quarter) have no customer ID: kept for revenue, never for customer counts.`,
    },
    {
      t: "Clean it, rule by rule",
      d: `${n0(REMOVED_ROWS)} rows go, ${((REMOVED_ROWS / F[0]) * 100).toFixed(1)}% of the file, each by a written rule that can run again tomorrow. ${n0(F[5])} clean sales lines remain.`,
    },
    {
      t: "Give it a shape",
      d: `A star schema: one table of sales in the middle, joined to ${n0(d.totals.products)} products, ${d.totals.countries} countries, dates and customers. Now every question is a join away.`,
    },
    {
      t: "Add it up",
      d: `Half a million lines collapse into ${MONTHLY.length} months. Revenue is counted net, sales minus cancellations, so one huge order that was cancelled the same day can't fake a record.`,
    },
    {
      t: "Let the shape speak",
      d: `Revenue jumps in September (${pct(SEP.revenue, AUG.revenue)} on August) and peaks in November at ${gbp(NOV.revenue)}, ${pct(NOV.revenue, OCT.revenue)} on October. December stops on the 9th, so it's shown, never compared.`,
    },
    {
      t: "Build the dashboard",
      d: "The monthly chart becomes one tile. Around it: the headline numbers, where it sells, what sells and when orders come in. One screen a buyer can read in a minute.",
    },
    {
      t: "Make the decision",
      d: (
        <>
          Orders climb from September, so Christmas stock should be in by the end of August.{" "}
          <Link href="/skills/analytics/dashboards/sales" className="font-semibold text-ink underline underline-offset-4">
            Open the live dashboard →
          </Link>
        </>
      ),
    },
  ];
  return (
    <InsideSection
      id="journey"
      kicker="One case, start to finish"
      title="From 541,909 raw rows to one dashboard."
      line="Every square is real data from the Online Retail file. Scroll and watch it get checked, cleaned, modelled, added up and turned into the dashboard that answers the question."
    >
      <Scrolly steps={steps}>
        {(step) => (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 pt-3 pb-11 sm:px-5">
            <div className="w-full max-w-[640px] overflow-hidden rounded-[16px]">
              {/* on phones the canvas is shown larger and slides to the part each step is about */}
              <div
                className="w-[140%] transition-transform duration-700 ease-out [transform:translateX(calc(var(--pan)*-28.571%))] md:w-full md:[transform:none]"
                style={{ "--pan": [0.5, 0.5, 0.5, 0.5, 0.6, 0.85, 0, 0][step] ?? 0 } as React.CSSProperties}
              >
                <Canvas step={step} />
              </div>
            </div>
          </div>
        )}
      </Scrolly>
    </InsideSection>
  );
}

export { Canvas as JourneyCanvas };
