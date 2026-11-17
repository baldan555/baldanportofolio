"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { INK, MONO, PAL, Text, r1 } from "../charts/kit";
import { seq } from "../charts/variants/base";
import { InsideSection, Scrolly, type Step } from "../../explainers/scrolly";
import { FULL, LAST, MONTH, MONTH_YEAR, PREV, R, days, delta, gbp, num, pct, ukShare } from "./data";
import { dayOf } from "@/lib/months";

const CW = 640;
const CH = 440;
const GOOD = "#138a60";
const BAD = "#c8413f";
const tr = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };
const title = (s: string) => s.toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
type Country = "All" | "Germany";
const I = FULL.length - 1;

/** KPI values for the selected country (Germany's from its own monthly aggregates). */
function kpis(country: Country) {
  const g = R.country_month.Germany;
  const cur = country === "All" ? { revenue: LAST.revenue, orders: LAST.orders, customers: LAST.customers } : { revenue: g.revenue[I], orders: g.orders[I], customers: g.customers[I] };
  const prev = country === "All" ? { revenue: PREV.revenue, orders: PREV.orders, customers: PREV.customers } : { revenue: g.revenue[I - 1], orders: g.orders[I - 1], customers: g.customers[I - 1] };
  const series = country === "All" ? FULL.map((m) => m.revenue) : g.revenue.slice(0, FULL.length);
  return [
    { label: "Revenue (net)", formula: "SUM(qty × price) − cancelled", v: cur.revenue, p: prev.revenue, f: gbp, series },
    { label: "Orders", formula: "COUNT(DISTINCT invoice)", v: cur.orders, p: prev.orders, f: num, series: country === "All" ? FULL.map((m) => m.orders) : g.orders.slice(0, FULL.length) },
    {
      label: "Average order",
      formula: "revenue ÷ orders",
      v: cur.revenue / cur.orders,
      p: prev.revenue / prev.orders,
      f: (v: number) => `£${Math.round(v)}`,
      series: series.map((s, i) => s / (country === "All" ? FULL[i].orders : g.orders[i] || 1)),
    },
    {
      label: "Customers",
      formula: "COUNT(DISTINCT customer)",
      v: cur.customers,
      p: prev.customers,
      f: num,
      series: country === "All" ? FULL.map((m) => m.customers) : g.customers.slice(0, FULL.length),
    },
  ];
}

const Fade = ({ on, children, delay = 0 }: { on: boolean; children: React.ReactNode; delay?: number }) => (
  <motion.g initial={false} animate={{ opacity: on ? 1 : 0 }} transition={{ ...tr, delay: on ? delay : 0 }} style={{ pointerEvents: on ? "auto" : "none" }}>
    {children}
  </motion.g>
);
function Tile({ x, y, w, h, label, dim = false, chip }: { x: number; y: number; w: number; h: number; label: string; dim?: boolean; chip?: string }) {
  return (
    <g opacity={dim ? 0.45 : 1}>
      <rect x={x} y={y} width={w} height={h} rx={10} fill="#fff" stroke="rgba(11,11,11,0.08)" />
      <Text x={x + 10} y={y + 16} size={9} color={INK} weight={700}>
        {label}
      </Text>
      {chip && (
        <g>
          <rect x={x + w - chip.length * 5.4 - 18} y={y + 6} width={chip.length * 5.4 + 12} height={14} rx={7} fill={PAL[3]} opacity={0.14} />
          <Text x={x + w - 12} y={y + 16} anchor="end" size={8} color={PAL[3]} weight={700}>
            {chip}
          </Text>
        </g>
      )}
    </g>
  );
}
function Spark({ x, y, w, h, v, color }: { x: number; y: number; w: number; h: number; v: number[]; color: string }) {
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const d = v.map((val, i) => `${i ? "L" : "M"}${r1(x + (i / (v.length - 1)) * w)},${r1(y + h - ((val - lo) / (hi - lo || 1)) * h)}`).join(" ");
  return <path d={d} fill="none" stroke={color} strokeWidth={1.4} />;
}

function DashCanvas({ step, country }: { step: number; country: Country }) {
  const k = kpis(country);
  const mode = step < 3 ? "def" : step < 5 ? "bare" : "context";
  const charts = step >= 3;
  const filtered = country !== "All";
  // trend
  const trend = country === "All" ? FULL.map((m) => m.revenue) : R.country_month.Germany.revenue.slice(0, FULL.length);
  const tmax = Math.max(...trend) * 1.12;
  const tx = (i: number) => r1(30 + (i / (trend.length - 1)) * 360);
  const ty = (v: number) => r1(244 - (v / tmax) * 108);
  const tline = trend.map((v, i) => `${i ? "L" : "M"}${tx(i)},${ty(v)}`).join(" ");
  // where
  const outside = R.countries.slice(1, 6);
  const wmax = outside[0].revenue;
  // products
  const prods = (country === "All" ? R.products : R.products_by_country.Germany).slice(0, 5);
  const pmax = prods[0].revenue;
  // heat
  const hmax = Math.max(...R.weekday_hour.orders.flat());
  const cohorts = R.cohorts.slice(0, 6);
  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="h-auto w-full" role="img" aria-label="A sales dashboard being assembled step by step from the real Online Retail data">
      <rect x={0.5} y={0.5} width={CW - 1} height={CH - 1} rx={16} fill="#f7f5f0" stroke="rgba(11,11,11,0.08)" />

      {/* step 0: the empty canvas and the questions it must answer */}
      <Fade on={step === 0}>
        {[
          [8, 40, 624, 60],
          [8, 106, 400, 150],
          [414, 106, 218, 150],
          [8, 262, 210, 150],
          [224, 262, 210, 150],
          [440, 262, 192, 150],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx={10} fill="none" stroke="rgba(11,11,11,0.12)" strokeDasharray="5 5" />
        ))}
        <rect x={150} y={120} width={340} height={210} rx={14} fill="#fff" stroke="rgba(11,11,11,0.1)" />
        <circle cx={180} cy={150} r={14} fill={INK} />
        <Text x={180} y={154} anchor="middle" size={10} color="#fff" weight={700}>
          {"SM"}
        </Text>
        <Text x={202} y={147} size={10.5} color={INK} weight={700}>
          {"Sales manager"}
        </Text>
        <Text x={202} y={161} size={8.5}>
          {"monthly review, 10 minutes"}
        </Text>
        {["Are we growing?", "Where do sales come from?", "Do customers come back?"].map((q, i) => (
          <g key={q}>
            <rect x={170} y={182 + i * 44} width={300} height={34} rx={9} fill={PAL[i]} opacity={0.12} />
            <Text x={184} y={203 + i * 44} size={12} color={INK} weight={600}>
              {`${i + 1}. ${q}`}
            </Text>
          </g>
        ))}
      </Fade>

      {/* header */}
      <Fade on={step >= 1}>
        <Text x={14} y={24} size={13} color={INK} weight={800}>
          {"Sales overview"}
        </Text>
        <Text x={124} y={24} size={9.5}>
          {MONTH_YEAR(LAST.month)}
        </Text>
        {[
          [`Country: ${country}`, 470, filtered],
          [`Month: ${MONTH(LAST.month)} ${LAST.month.slice(0, 4)}`, 560, false],
        ].map(([t, x, on]) => (
          <g key={x as number}>
            <rect x={x as number} y={10} width={84} height={18} rx={9} fill={on ? PAL[1] : "#fff"} stroke={on ? PAL[1] : "rgba(11,11,11,0.15)"} />
            <Text x={(x as number) + 42} y={22.5} anchor="middle" size={8.5} color={on ? "#fff" : INK} weight={600}>
              {t as string}
            </Text>
          </g>
        ))}
      </Fade>

      {/* KPI row */}
      <Fade on={step >= 1}>
        {k.map((c, i) => {
          const x = 8 + i * 158;
          const dlt = delta(c.v, c.p);
          return (
            <g key={c.label}>
              <rect x={x} y={40} width={152} height={60} rx={10} fill="#fff" stroke="rgba(11,11,11,0.08)" />
              <Text x={x + 10} y={56} size={8.5} color="rgba(11,11,11,0.6)" weight={600}>
                {c.label}
              </Text>
              <Fade on={mode === "def"}>
                <text x={x + 10} y={80} fontSize={8.5} fill={PAL[3]} fontFamily={MONO}>
                  {c.formula}
                </text>
              </Fade>
              <Fade on={mode !== "def"}>
                <Text x={x + 10} y={84} size={18} color={INK} weight={800}>
                  {c.f(c.v)}
                </Text>
              </Fade>
              <Fade on={mode === "context"}>
                <rect x={x + 96} y={46} width={48} height={15} rx={7.5} fill={dlt >= 0 ? GOOD : BAD} opacity={0.14} />
                <Text x={x + 120} y={56.5} anchor="middle" size={8} color={dlt >= 0 ? GOOD : BAD} weight={700}>
                  {pct(dlt)}
                </Text>
                <Spark x={x + 100} y={72} w={44} h={18} v={c.series} color={dlt >= 0 ? GOOD : BAD} />
              </Fade>
            </g>
          );
        })}
      </Fade>

      {/* charts */}
      <Fade on={charts} delay={0.05}>
        <Tile x={8} y={106} w={400} h={150} label={step === 3 ? "Are we growing?" : `Revenue by month${filtered ? " · Germany" : ""}`} chip={step === 3 ? "line" : undefined} />
        <path d={`${tline} L${tx(trend.length - 1)},244 L${tx(0)},244 Z`} fill={filtered ? "rgba(235,104,52,0.12)" : "rgba(42,120,214,0.12)"} />
        <path d={tline} fill="none" stroke={filtered ? PAL[1] : PAL[0]} strokeWidth={2} />
        {FULL.map((m, i) => (
          <Text key={m.month} x={tx(i)} y={252} anchor="middle" size={7}>
            {MONTH(m.month).slice(0, 1)}
          </Text>
        ))}
        <Fade on={mode === "context"}>
          <circle cx={tx(I)} cy={ty(trend[I])} r={4} fill={filtered ? PAL[1] : PAL[0]} stroke="#fff" strokeWidth={1.5} />
          <Text x={tx(I) - 8} y={ty(trend[I]) - 6} anchor="end" size={8.5} color={INK} weight={700}>
            {`${MONTH(LAST.month)}: ${gbp(trend[I])} (${pct(delta(trend[I], trend[I - 1]))} vs ${MONTH(PREV.month)})`}
          </Text>
        </Fade>

        <Tile x={414} y={106} w={218} h={150} label={step === 3 ? "Where do sales come from?" : "Where it sells"} chip={step === 3 ? "bars" : undefined} />
        <Text x={424} y={138} size={9}>
          {`UK: ${Math.round(ukShare * 100)}% of revenue. Outside the UK:`}
        </Text>
        {outside.map((c, i) => {
          const hot = c.country === "Germany" && filtered;
          return (
            <g key={c.country}>
              <Text x={490} y={157 + i * 19} anchor="end" size={8} color={INK}>
                {c.country === "EIRE" ? "Ireland" : c.country}
              </Text>
              <rect x={496} y={149 + i * 19} width={r1((c.revenue / wmax) * 110)} height={11} rx={2} fill={hot ? PAL[1] : PAL[0]} opacity={filtered && !hot ? 0.3 : 0.85} />
            </g>
          );
        })}

        <Tile x={8} y={262} w={210} h={150} label={step === 3 ? "What sells?" : `Top products${filtered ? " · Germany" : ""}`} chip={step === 3 ? "bars" : undefined} />
        {prods.map((p, i) => (
          <g key={p.stock}>
            <Text x={18} y={290 + i * 24} size={7.5} color={INK}>
              {title(p.name).slice(0, 34)}
            </Text>
            <rect x={18} y={294 + i * 24} width={r1((p.revenue / pmax) * 150)} height={7} rx={2} fill={filtered ? PAL[1] : PAL[0]} opacity={0.85} />
            <Text x={r1(22 + (p.revenue / pmax) * 150)} y={301 + i * 24} size={7} mono>
              {gbp(p.revenue)}
            </Text>
          </g>
        ))}

        <Tile x={224} y={262} w={210} h={150} label={step === 3 ? "When do people order?" : "Orders by weekday and hour"} chip={step === 3 ? "heatmap" : undefined} dim={filtered} />
        {R.weekday_hour.orders.map((row, r) => (
          <g key={r}>
            <Text x={250} y={293 + r * 15} anchor="end" size={7}>
              {R.weekday_hour.days[r]}
            </Text>
            {row.map((v, c) => (
              <rect key={c} x={r1(254 + c * 11.4)} y={285 + r * 15} width={10.4} height={13} rx={2} fill={v ? seq(0.1 + (0.9 * v) / hmax) : "rgba(11,11,11,0.04)"} opacity={filtered ? 0.45 : 1} />
            ))}
          </g>
        ))}
        <Text x={254} y={404} size={7}>
          {"6h → 20h · no orders on Saturdays in this shop"}
        </Text>

        <Tile x={440} y={262} w={192} h={150} label={step === 3 ? "Do customers come back?" : "Customers still buying"} chip={step === 3 ? "cohort" : undefined} dim={filtered} />
        {cohorts.map((c, r) => (
          <g key={c.cohort}>
            <Text x={474} y={293 + r * 17} anchor="end" size={7}>
              {MONTH(c.cohort)}
            </Text>
            {c.retention.slice(0, 6).map((v, m) => (
              <g key={m}>
                <rect x={478 + m * 25} y={284 + r * 17} width={23} height={15} rx={2} fill={seq(v)} opacity={filtered ? 0.45 : 1} />
                <Text x={489.5 + m * 25} y={294.5 + r * 17} anchor="middle" size={6.5} color={v > 0.5 ? "#fff" : INK} mono>
                  {Math.round(v * 100)}
                </Text>
              </g>
            ))}
          </g>
        ))}
        <Text x={478} y={404} size={7}>
          {"% still ordering, months 0 → 5"}
        </Text>
      </Fade>

      {/* step 2: the model underneath */}
      <Fade on={step === 2}>
        <rect x={6} y={104} width={628} height={310} rx={12} fill="rgba(247,245,240,0.92)" />
        {[
          ["dim_date", `${days} days`, 120, 150],
          ["dim_product", `${num(R.totals.products)} products`, 520, 150],
          ["dim_country", `${R.totals.countries} countries`, 120, 360],
          ["dim_customer", `${num(R.totals.customers)} (counted)`, 520, 360],
        ].map(([n, s, x, y]) => (
          <g key={n as string}>
            <line x1={x as number} y1={y as number} x2={320} y2={258} stroke="rgba(11,11,11,0.25)" strokeWidth={1.5} />
            <rect x={(x as number) - 66} y={(y as number) - 22} width={132} height={44} rx={9} fill="#fff" stroke={PAL[0]} />
            <text x={x as number} y={(y as number) - 3} fontSize={10} textAnchor="middle" fill={PAL[0]} fontFamily={MONO} fontWeight={700}>
              {n as string}
            </text>
            <Text x={x as number} y={(y as number) + 12} anchor="middle" size={8.5}>
              {s as string}
            </Text>
          </g>
        ))}
        <rect x={236} y={226} width={168} height={64} rx={11} fill={INK} />
        <text x={320} y={252} fontSize={11.5} textAnchor="middle" fill="#fff" fontFamily={MONO} fontWeight={700}>
          {"fct_sales"}
        </text>
        <Text x={320} y={270} anchor="middle" size={9} color="rgba(255,255,255,0.75)">
          {`${num(R.totals.rows)} clean lines`}
        </Text>
      </Fade>

      {/* step 4: grid and reading order */}
      <Fade on={step === 4}>
        {Array.from({ length: 12 }, (_, c) => (
          <rect key={c} x={r1(8 + c * 52.3)} y={36} width={48} height={378} fill={PAL[4]} opacity={0.05} />
        ))}
        <path d="M60,70 L560,70 L120,180 L520,180 L110,330 L540,330" fill="none" stroke={PAL[4]} strokeWidth={2} strokeDasharray="6 4" opacity={0.45} />
        {[
          [620, 52, "1"],
          [394, 118, "2"],
          [618, 118, "3"],
          [204, 274, "4"],
        ].map(([x, y, n]) => (
          <g key={n as string}>
            <circle cx={x as number} cy={y as number} r={11} fill={PAL[4]} />
            <Text x={x as number} y={(y as number) + 4} anchor="middle" size={11} color="#fff" weight={800}>
              {n as string}
            </Text>
          </g>
        ))}
      </Fade>

      {/* step 6: someone clicks Germany */}
      <Fade on={step === 6}>
        <motion.g initial={false} animate={{ x: filtered ? 0 : 30, y: filtered ? 0 : 40, opacity: 1 }} transition={tr}>
          <circle cx={540} cy={192} r={filtered ? 12 : 0} fill="none" stroke={PAL[1]} strokeWidth={2} opacity={0.6} />
          <path d="M536,188 l0,16 l4,-4 l4,8 l3,-1.5 l-4,-8 l6,0 Z" fill={INK} stroke="#fff" strokeWidth={1} />
        </motion.g>
      </Fade>

      {/* step 7: kept fresh */}
      <Fade on={step >= 7}>
        <rect x={8} y={418} width={624} height={18} rx={9} fill="rgba(27,175,122,0.12)" />
        <circle cx={20} cy={427} r={3.5} fill={GOOD} />
        <Text x={30} y={430.5} size={8.5} color={GOOD} weight={600}>
          {`Data up to ${dayOf(R.period.last)} · ${num(R.totals.rows)} clean rows · loads, tests and refreshes on a schedule`}
        </Text>
      </Fade>
    </svg>
  );
}

function Visual({ step }: { step: number }) {
  const [germany, setGermany] = useState(false);
  useEffect(() => {
    if (step !== 6) return;
    const id = setInterval(() => setGermany((g) => !g), 2200);
    return () => clearInterval(id);
  }, [step]);
  // on phones the canvas is shown at 150% width and slides to the part each step is about
  const pan = [0.5, 0, 0.5, 0, 0.5, 0, 1, 0][step] ?? 0;
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 pt-3 pb-11 sm:px-5">
      <div className="w-full max-w-[640px] overflow-hidden rounded-[16px]">
        <div
          className="w-[150%] transition-transform duration-700 ease-out [transform:translateX(calc(var(--pan)*-33.333%))] md:w-full md:[transform:none]"
          style={{ "--pan": pan } as React.CSSProperties}
        >
          <DashCanvas step={step} country={step === 6 && germany ? "Germany" : "All"} />
        </div>
      </div>
    </div>
  );
}

export function DashboardStory() {
  const g = R.country_month.Germany;
  const gross = R.totals.gross_revenue;
  const steps: Step[] = [
    {
      t: "Start with a question, not a chart",
      d: "A dashboard is a tool for a decision. Here: a sales manager's monthly review, with three questions. Are we growing? Where do sales come from? Do customers come back?",
    },
    {
      t: "Define every number",
      d: `Revenue, orders, average order, customers: each written down as a formula before anything is drawn. Even “revenue” needs a rule: before cancellations it's ${gbp(gross)} for the year, after them ${gbp(R.totals.revenue)}. This dashboard uses net.`,
    },
    {
      t: "Build the model underneath",
      d: `One fact table of ${num(R.totals.rows)} clean sales lines, joined to dates, products, countries and customers (counted, never shown). Every tile reads the same tables, so the numbers always agree.`,
    },
    { t: "One question, one chart", d: "Growing? A line over time. Where? Ranked bars. What sells? Bars again. When? A weekday-by-hour heatmap. Coming back? A cohort table." },
    { t: "Lay it out for the eye", d: "The most important numbers top left, the trend next, details lower down, all on a 12-column grid. People scan a screen like a page: in a Z." },
    {
      t: "Give every number a comparison",
      d: `${gbp(LAST.revenue)} means little alone. ${pct(delta(LAST.revenue, PREV.revenue))} on ${MONTH(PREV.month, "long")} does: ${MONTH(LAST.month, "long")} was the best month of the year, even though the average order slipped ${Math.abs(delta(LAST.revenue / LAST.orders, PREV.revenue / PREV.orders) * 100).toFixed(0)}%.`,
    },
    {
      t: "Let people ask the next question",
      d: `Click a country and the tiles follow. Germany: ${gbp(g.revenue[I])} in ${MONTH(LAST.month, "long")}, ${pct(delta(g.revenue[I], g.revenue[I - 1]))} on ${MONTH(PREV.month, "long")}, and after the same cake stand come snack boxes and lunch boxes. Tiles that ignore the filter fade, so nobody is misled.`,
    },
    {
      t: "Keep it fresh and trustworthy",
      d: "A scheduled pipeline reloads the data, runs the tests and refreshes the tiles, and the dashboard says how fresh it is. A stale dashboard is worse than none.",
    },
  ];
  return (
    <InsideSection
      id="build"
      kicker="From a question to a dashboard"
      title="How a dashboard is built, one decision at a time."
      line="Scroll and watch the real Online Retail sales dashboard put itself together: question, numbers, model, charts, layout, context, interaction, refresh."
    >
      <Scrolly steps={steps}>{(step) => <Visual step={step} />}</Scrolly>
    </InsideSection>
  );
}

export { DashCanvas };
