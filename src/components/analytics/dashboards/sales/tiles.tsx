"use client";

import { useState } from "react";
import geo from "@/data/geo-shapes.json";
import { INK, PAL, autoTicks, nice, r1 } from "../../charts/kit";
import { seq } from "../../charts/variants/base";
import { FULL_IDX, MONTHS, PARTIAL, S, gbp, kpis, mapValues, metricsOf, monthName, monthYear, num, pct, productsOf, scopeName, type Period, type Sel } from "./data";

const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const GOOD = "#138a60";
const BAD = "#c8413f";
const HOT = PAL[1];
const T = ({
  x,
  y,
  s = 10,
  c = "rgba(11,11,11,0.55)",
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

export function Card({
  title,
  sub,
  right,
  children,
  className = "",
  dark = false,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section className={`flex min-w-0 flex-col rounded-[20px] border p-3 sm:p-4 ${dark ? "border-ink bg-ink text-white" : "border-line bg-white"} ${className}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] leading-tight font-semibold tracking-[-0.01em]">{title}</h3>
          {sub && <p className={`mt-0.5 text-[11.5px] leading-snug ${dark ? "text-white/55" : "text-ink-2/55"}`}>{sub}</p>}
        </div>
        {right}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------- KPIs */
function Spark({ v, color, points = false }: { v: number[]; color: string; points?: boolean }) {
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const p = v.map((val, i) => [r1((i / (v.length - 1)) * 100), r1(26 - ((val - lo) / (hi - lo || 1)) * 24)]);
  return (
    <svg viewBox="0 0 100 28" className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={p.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ")} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      {points && p.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.2} fill={color} />)}
    </svg>
  );
}
export function Kpis({ sel }: { sel: Sel }) {
  const { cards } = kpis(sel);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => {
        const good = c.change === null ? null : c.change * c.good >= 0;
        const color = good === null ? "rgba(11,11,11,0.35)" : good ? GOOD : BAD;
        const change = c.key === "cancel" && c.change !== null ? `${c.change > 0 ? "+" : c.change < 0 ? "−" : ""}${Math.abs(c.change * 100).toFixed(1)} pts` : pct(c.change, 1);
        return (
          <div key={c.key} className="rounded-[18px] border border-line bg-white p-3" title={c.help}>
            <div className="flex items-center justify-between gap-1">
              <p className="truncate text-[11.5px] font-semibold text-ink-2/60">{c.label}</p>
              <span className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold" style={{ color, background: good === null ? "rgba(11,11,11,0.05)" : `${color}1f` }}>
                {change}
              </span>
            </div>
            <p className="mt-1 text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{c.value}</p>
            <div className="mt-2">
              <Spark v={c.series} color={good === false ? BAD : PAL[0]} points={c.points} />
            </div>
            <p className="mt-0.5 truncate text-[10px] text-ink-2/40">{c.help}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- trend */
export function Trend({ sel, onPick }: { sel: Sel; onPick: (p: Period) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const m = metricsOf(sel.scope);
  const max = nice(Math.max(...m.gross) * 1.04);
  const W = 640;
  const H = 230;
  const y = (v: number) => r1(H - 26 - (v / max) * (H - 50));
  const step = (W - 50) / MONTHS.length;
  const x = (i: number) => r1(44 + i * step);
  const nt = autoTicks(max);
  const ticks = Array.from({ length: nt + 1 }, (_, k) => (k * max) / nt);
  const shown = hover ?? (sel.period === "year" ? null : sel.period);
  return (
    <Card
      title={`Net revenue by month · ${scopeName(sel.scope)}`}
      sub={
        shown !== null
          ? `${monthYear(MONTHS[shown])}: ${gbp(m.revenue[shown])} net, ${gbp(m.gross[shown])} before cancellations${shown === PARTIAL ? " · only 9 days of data" : ""}`
          : "Click a month to filter the whole dashboard"
      }
      className="lg:col-span-8"
      right={
        <div className="flex shrink-0 items-center gap-2 text-[10.5px] text-ink-2/55">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#2a78d6]" /> net
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm border border-ink/40" /> gross
          </span>
        </div>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Monthly net revenue; click a month to filter">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={40} x2={W - 4} y1={y(t)} y2={y(t)} stroke="rgba(11,11,11,0.07)" />
            <T x={36} y={y(t) + 3} s={9} a="end" m>
              {gbp(t)}
            </T>
          </g>
        ))}
        {MONTHS.map((mo, i) => {
          const on = sel.period === i;
          const partial = i === PARTIAL;
          return (
            <g key={mo} onClick={() => onPick(on ? "year" : i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <rect x={x(i)} y={8} width={r1(step - 4)} height={H - 34} fill={hover === i ? "rgba(11,11,11,0.03)" : "transparent"} />
              <rect x={x(i)} y={y(m.gross[i])} width={r1(step - 8)} height={r1(H - 26 - y(m.gross[i]))} rx={3} fill="none" stroke="rgba(11,11,11,0.25)" strokeDasharray={partial ? "3 2" : undefined} />
              <rect
                x={x(i)}
                y={y(m.revenue[i])}
                width={r1(step - 8)}
                height={r1(H - 26 - y(m.revenue[i]))}
                rx={3}
                fill={on ? HOT : partial ? "rgba(42,120,214,0.35)" : PAL[0]}
                opacity={sel.period === "year" || on ? 1 : 0.55}
              />
              <T x={x(i) + (step - 8) / 2} y={H - 10} s={9} a="middle" c={on ? INK : "rgba(11,11,11,0.5)"} w={on ? 700 : 400}>
                {i === 0 || mo.endsWith("-01") ? `${monthName(mo)} ’${mo.slice(2, 4)}` : monthName(mo)}
              </T>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- map + countries */
const world = geo.world;
const EUROPE = ["GBR", "IRL", "FRA", "DEU", "NLD", "BEL", "CHE", "ESP", "PRT", "ITA", "AUT", "DNK", "NOR", "SWE", "FIN", "POL", "CZE", "GRC"];
const eu = world.countries.filter((c) => EUROPE.includes(c.iso));
const EB = { x0: Math.min(...eu.map((c) => c.cx)) - 14, x1: Math.max(...eu.map((c) => c.cx)) + 12, y0: Math.min(...eu.map((c) => c.cy)) - 10, y1: Math.max(...eu.map((c) => c.cy)) + 12 };
export function MapTile({ sel, onScope }: { sel: Sel; onScope: (s: string) => void }) {
  const [zoom, setZoom] = useState<"europe" | "world">("europe");
  const [hover, setHover] = useState<string | null>(null);
  const vals = mapValues(sel.period);
  const byIso = new Map(vals.map((v) => [v.iso, v]));
  const lmax = Math.log10(Math.max(...vals.map((v) => v.revenue), 10));
  const lmin = 2;
  const color = (v: number) => (v > 0 ? seq(0.12 + 0.88 * Math.max(0, (Math.log10(v) - lmin) / (lmax - lmin))) : "#ece8e0");
  const k = zoom === "europe" ? Math.min(world.w / (EB.x1 - EB.x0), world.h / (EB.y1 - EB.y0)) : 1;
  const tx = zoom === "europe" ? -EB.x0 * k + (world.w - (EB.x1 - EB.x0) * k) / 2 : 0;
  const ty = zoom === "europe" ? -EB.y0 * k + (world.h - (EB.y1 - EB.y0) * k) / 2 : 0;
  const h = hover ? byIso.get(hover) : null;
  const hName = hover ? (h?.name ?? world.countries.find((c) => c.iso === hover)?.name) : null;
  return (
    <Card
      title="Where it sells"
      sub={hName ? `${hName}: ${h ? gbp(h.revenue) : "no orders"}${h?.scope ? " · click to filter" : ""}` : "Net revenue by country, log colour scale. Click a highlighted country to filter."}
      className="lg:col-span-7"
      right={
        <div className="flex shrink-0 rounded-full border border-ink/10 p-0.5 text-[11px]">
          {(["europe", "world"] as const).map((z) => (
            <button key={z} type="button" onClick={() => setZoom(z)} className={`rounded-full px-2.5 py-0.5 capitalize ${zoom === z ? "bg-ink text-white" : "text-ink/60"}`}>
              {z}
            </button>
          ))}
        </div>
      }
    >
      <div className="overflow-hidden rounded-xl bg-[#f3f7fb]">
        <svg viewBox={`0 0 ${world.w} ${world.h}`} className="h-auto w-full" role="img" aria-label="Map of net revenue by country">
          <g style={{ transform: `translate(${r1(tx)}px, ${r1(ty)}px) scale(${r1(k * 100) / 100})`, transformOrigin: "0 0", transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1)" }}>
            {world.countries.map((c) => {
              const v = byIso.get(c.iso);
              const scoped = v?.scope && v.scope === sel.scope;
              return (
                <path
                  key={c.iso + c.name}
                  d={c.d}
                  fill={v ? color(v.revenue) : "#e4e1db"}
                  stroke={scoped ? HOT : "#fff"}
                  strokeWidth={scoped ? 2 : 0.6}
                  vectorEffect="non-scaling-stroke"
                  onMouseEnter={() => setHover(c.iso)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => v?.scope && onScope(v.scope === sel.scope ? "All" : v.scope)}
                  style={{ cursor: v?.scope ? "pointer" : "default" }}
                />
              );
            })}
          </g>
        </svg>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10.5px] text-ink-2/55">
        <span>less</span>
        <span className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${seq(0.12)}, ${seq(1)})` }} />
        <span>more (log scale)</span>
        <span className="ml-auto">Countries without a shape at this scale (Singapore, Hong Kong, Malta…) are left out.</span>
      </div>
    </Card>
  );
}
export function Countries({ sel, onScope }: { sel: Sel; onScope: (s: string) => void }) {
  const scopes = S.scopes.slice(1);
  const vals = scopes.map((s) => {
    const m = metricsOf(s);
    return { s, v: sel.period === "year" ? FULL_IDX.reduce((a, i) => a + m.revenue[i], 0) : m.revenue[sel.period] };
  });
  const all = sel.period === "year" ? FULL_IDX.reduce((a, i) => a + metricsOf("All").revenue[i], 0) : metricsOf("All").revenue[sel.period];
  const uk = vals[0];
  const rest = vals.slice(1).sort((a, b) => b.v - a.v);
  const max = Math.max(...rest.map((r) => r.v), 1);
  return (
    <Card title="Top countries" sub={`The UK is ${Math.round((uk.v / all) * 100)}% of net revenue; the rest ranked below. Click to filter.`} className="lg:col-span-5">
      <button
        type="button"
        onClick={() => onScope(sel.scope === uk.s ? "All" : uk.s)}
        className={`mb-2 flex w-full items-center gap-2 rounded-xl p-2 text-left transition ${sel.scope === uk.s ? "bg-[#eb6834]/10 ring-1 ring-[#eb6834]" : "bg-ink/[0.03] hover:bg-ink/[0.06]"}`}
      >
        <span className="w-24 shrink-0 text-[12px] font-semibold">United Kingdom</span>
        <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-ink/10">
          <span className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${Math.round((uk.v / all) * 1000) / 10}%` }} />
        </span>
        <span className="w-14 shrink-0 text-right font-mono text-[11px]">{gbp(uk.v)}</span>
      </button>
      <div className="space-y-1">
        {rest.map((r) => {
          const on = sel.scope === r.s;
          return (
            <button
              key={r.s}
              type="button"
              onClick={() => onScope(on ? "All" : r.s)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition ${on ? "bg-[#eb6834]/10" : "hover:bg-ink/[0.04]"}`}
            >
              <span className="w-24 shrink-0 truncate text-[12px]">{scopeName(r.s)}</span>
              <span className="relative h-2.5 flex-1">
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.round((r.v / max) * 1000) / 10}%`, background: on ? HOT : PAL[0] }} />
              </span>
              <span className="w-14 shrink-0 text-right font-mono text-[11px] text-ink-2/70">{gbp(r.v)}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- products, timing, cancellations */
export function Products({ sel }: { sel: Sel }) {
  const list = productsOf(sel).slice(0, 8);
  const max = Math.max(...list.map((p) => p.revenue), 1);
  return (
    <Card title="Top products" sub={`By net revenue · ${scopeName(sel.scope)} · ${sel.period === "year" ? "12 months" : monthYear(MONTHS[sel.period], "short")}`} className="lg:col-span-5">
      <div className="space-y-1.5">
        {list.map((p, i) => (
          <div key={p.name + i}>
            <div className="flex justify-between gap-2 text-[11.5px]">
              <span className="truncate">{p.name}</span>
              <span className="shrink-0 font-mono text-[10.5px] text-ink-2/60">{gbp(p.revenue)}</span>
            </div>
            <div className="mt-0.5 h-2 rounded-full bg-ink/[0.05]">
              <div className="h-full rounded-full" style={{ width: `${Math.max(1, Math.round((p.revenue / max) * 1000) / 10)}%`, background: i === 0 ? HOT : PAL[0] }} />
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-[12px] text-muted">No sales in this selection.</p>}
      </div>
    </Card>
  );
}
export function Timing({ sel }: { sel: Sel }) {
  const g = S.heat.by[sel.scope as keyof typeof S.heat.by];
  const max = Math.max(...g.flat(), 1);
  const busiest = g.flatMap((row, d) => row.map((v, h) => ({ v, d, h }))).sort((a, b) => b.v - a.v)[0];
  return (
    <Card title="When orders come in" sub={`Orders by weekday and hour, 12 months · busiest: ${S.heat.days[busiest.d]} ${S.heat.hours[busiest.h]}:00`} className="lg:col-span-4">
      <svg viewBox="0 0 300 150" className="h-auto w-full" role="img" aria-label="Heatmap of orders by weekday and hour">
        {g.map((row, d) => (
          <g key={d}>
            <T x={26} y={14 + d * 17.5 + 11} s={9} a="end">
              {S.heat.days[d]}
            </T>
            {row.map((v, h) => (
              <rect key={h} x={r1(30 + h * 17.9)} y={r1(14 + d * 17.5)} width={16.4} height={15.5} rx={2.5} fill={v ? seq(0.08 + (0.92 * v) / max) : "rgba(11,11,11,0.04)"}>
                <title>{`${S.heat.days[d]} ${S.heat.hours[h]}:00 · ${v} orders`}</title>
              </rect>
            ))}
          </g>
        ))}
        {S.heat.hours.map((hr, h) =>
          h % 2 === 0 ? (
            <T key={hr} x={30 + h * 17.9 + 8} y={10} s={8} a="middle" m>
              {hr}
            </T>
          ) : null,
        )}
      </svg>
      <p className="mt-1 text-[10.5px] text-ink-2/50">Empty row: the shop took no orders on Saturdays.</p>
    </Card>
  );
}
export function Cancels({ sel, onPick }: { sel: Sel; onPick: (p: Period) => void }) {
  const m = metricsOf(sel.scope);
  const rate = FULL_IDX.map((i) => m.cancelled[i] / (m.orders[i] + m.cancelled[i]));
  const avg = rate.reduce((a, b) => a + b, 0) / rate.length;
  const max = Math.max(...rate, avg) * 1.25;
  const x = (k: number) => r1(24 + (k / (rate.length - 1)) * 250);
  const y = (v: number) => r1(118 - (v / max) * 100);
  return (
    <Card title="Cancellations" sub={`Share of invoices cancelled · average ${(avg * 100).toFixed(1)}%`} className="lg:col-span-3">
      <svg viewBox="0 0 290 140" className="h-auto w-full" role="img" aria-label="Monthly cancellation rate">
        {[0, max / 2, max].map((t) => (
          <g key={t}>
            <line x1={20} x2={280} y1={y(t)} y2={y(t)} stroke="rgba(11,11,11,0.06)" />
            <T x={18} y={y(t) + 3} s={8} a="end" m>
              {`${Math.round(t * 100)}%`}
            </T>
          </g>
        ))}
        <line x1={20} x2={280} y1={y(avg)} y2={y(avg)} stroke="rgba(11,11,11,0.3)" strokeDasharray="4 3" />
        <path d={rate.map((v, k) => `${k ? "L" : "M"}${x(k)},${y(v)}`).join(" ")} fill="none" stroke={BAD} strokeWidth={2} />
        {rate.map((v, k) => {
          const i = FULL_IDX[k];
          const on = sel.period === i;
          return (
            <g key={i} onClick={() => onPick(on ? "year" : i)} style={{ cursor: "pointer" }}>
              <circle cx={x(k)} cy={y(v)} r={on ? 5 : 3} fill={on ? HOT : BAD} stroke="#fff" strokeWidth={1.5} />
              <circle cx={x(k)} cy={y(v)} r={10} fill="transparent">
                <title>{`${monthYear(MONTHS[i], "short")}: ${(v * 100).toFixed(1)}%`}</title>
              </circle>
              {(k % 3 === 0 || on) && (
                <T x={x(k)} y={134} s={8.5} a="middle" c={on ? INK : "rgba(11,11,11,0.5)"} w={on ? 700 : 400}>
                  {monthName(MONTHS[i])}
                </T>
              )}
            </g>
          );
        })}
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- customers */
export function Cohorts({ sel }: { sel: Sel }) {
  const rows = S.cohorts;
  const cw = 34;
  const dim = sel.scope !== "All";
  return (
    <Card title="Do customers come back?" sub="Of customers whose first order was in each month, the share who ordered again n months later · all countries" className="lg:col-span-7">
      <div className={`overflow-x-auto ${dim ? "opacity-50" : ""}`}>
        <svg viewBox={`-14 0 ${74 + 12 * cw} ${20 + rows.length * 19}`} className="h-auto w-full min-w-[460px]" role="img" aria-label="Cohort retention table">
          {Array.from({ length: 12 }, (_, n) => (
            <T key={n} x={60 + n * cw + cw / 2} y={12} s={8.5} a="middle" m>
              {`M${n}`}
            </T>
          ))}
          {rows.map((c, r) => (
            <g key={c.cohort}>
              <T x={54} y={20 + r * 19 + 12} s={8.5} a="end">
                {`${monthName(c.cohort)} ’${c.cohort.slice(2, 4)} · ${c.size}`}
              </T>
              {c.retention.map((v, n) => (
                <g key={n}>
                  <rect x={60 + n * cw} y={20 + r * 19} width={cw - 2} height={17} rx={2.5} fill={n === 0 ? INK : seq(Math.min(1, v / 0.5))} />
                  <T x={60 + n * cw + cw / 2 - 1} y={20 + r * 19 + 12} s={8} a="middle" c={n === 0 || v > 0.3 ? "#fff" : INK} m>
                    {n === 0 ? "100" : Math.round(v * 100)}
                  </T>
                </g>
              ))}
            </g>
          ))}
        </svg>
      </div>
      <p className="mt-1 text-[10.5px] text-ink-2/50">The Dec ’10 row also holds everyone who was already a customer when the data starts.</p>
      {dim && <p className="mt-1 text-[11px] text-[#c2410c]">Not filtered by country: shown for all customers.</p>}
    </Card>
  );
}
const SEG_HELP: Record<string, string> = {
  Champions: "bought recently and often",
  Loyal: "regular, fairly recent",
  "At risk": "used to buy often, quiet for months",
  Hibernating: "one or two orders, long ago",
  "Need attention": "a few orders, cooling off",
  "New / promising": "first orders, very recent",
};
const SEG_COL: Record<string, string> = { Champions: PAL[2], Loyal: PAL[0], "At risk": PAL[1], Hibernating: "#8a8a8a", "Need attention": PAL[5], "New / promising": PAL[3] };
export function Segments({ sel }: { sel: Sel }) {
  const seg = S.segments;
  const tc = seg.reduce((s, x) => s + x.customers, 0);
  const tr = seg.reduce((s, x) => s + x.revenue, 0);
  return (
    <Card title="Customer segments (RFM)" sub="By how recently and how often customers bought, at the end of the data · all countries" className="lg:col-span-5">
      <div className={sel.scope !== "All" ? "opacity-50" : ""}>
        <div className="mb-1 grid grid-cols-[1fr_70px_70px] gap-2 text-[10px] text-muted">
          <span />
          <span className="text-right">customers</span>
          <span className="text-right">revenue</span>
        </div>
        {seg.map((s) => (
          <div key={s.segment} className="grid grid-cols-[1fr_70px_70px] items-center gap-2 border-t border-line py-1.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SEG_COL[s.segment] }} />
                {s.segment}
              </p>
              <p className="truncate text-[10.5px] text-ink-2/50">{SEG_HELP[s.segment]}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[11px]">{num(s.customers)}</p>
              <div className="ml-auto h-1.5 rounded-full" style={{ width: `${Math.round((s.customers / tc) * 100)}%`, background: SEG_COL[s.segment], opacity: 0.5 }} />
            </div>
            <div className="text-right">
              <p className="font-mono text-[11px]">{Math.round((s.revenue / tr) * 100)}%</p>
              <div className="ml-auto h-1.5 rounded-full" style={{ width: `${Math.round((s.revenue / tr) * 100)}%`, background: SEG_COL[s.segment] }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
