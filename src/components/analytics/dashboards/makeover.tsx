"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { INK, PAL, Text, arc, offsets, r1 } from "../charts/kit";
import { Section } from "../tools/shared";
import { FULL, LAST, MONTH, PREV, R, delta, gbp, num, pct } from "./data";

const FIXES = [
  { id: "bars", t: "Sorted bars instead of pies", d: "Lengths on one baseline are easy to compare; slices of 2% are not." },
  { id: "color", t: "One colour, one highlight", d: "Colour should mean something. Here it marks the one thing to look at." },
  { id: "compare", t: "Compare every number", d: "Each KPI gets its change on last month, the trend gets a note." },
  { id: "order", t: "Most important first", d: "KPIs on top, the trend next, details at the bottom." },
  { id: "clean", t: "Remove decoration", d: "No heavy borders, shadows, gradients or crowded gridlines." },
] as const;
type Fix = (typeof FIXES)[number]["id"];

const RAINBOW = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6"];
const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
const title = (s: string) => s.toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function Box({ w, h, label, clean }: { w: number; h: number; label: string; clean: boolean }) {
  return (
    <g>
      {!clean && <rect x={4} y={4} width={w} height={h} rx={2} fill="rgba(11,11,11,0.25)" />}
      <rect x={0} y={0} width={w} height={h} rx={clean ? 10 : 2} fill={clean ? "#fff" : "url(#mk-bg)"} stroke={clean ? "rgba(11,11,11,0.08)" : INK} strokeWidth={clean ? 1 : 2.5} />
      <Text x={10} y={16} size={clean ? 9 : 10} color={INK} weight={clean ? 700 : 800}>
        {clean ? label : label.toUpperCase()}
      </Text>
    </g>
  );
}

function Board({ on }: { on: Record<Fix, boolean> }) {
  const clean = on.clean;
  const kp = [
    { label: "Revenue (net)", v: gbp(LAST.revenue), d: delta(LAST.revenue, PREV.revenue) },
    { label: "Orders", v: num(LAST.orders), d: delta(LAST.orders, PREV.orders) },
    { label: "Average order", v: `£${Math.round(LAST.revenue / LAST.orders)}`, d: delta(LAST.revenue / LAST.orders, PREV.revenue / PREV.orders) },
    { label: "Customers", v: num(LAST.customers), d: delta(LAST.customers, PREV.customers) },
  ];
  // positions: [x, y] for KPI row, trend, countries, products — bad layout vs good layout
  const pos = on.order ? { k: [8, 30], t: [8, 102], c: [414, 102], p: [8, 260] } : { k: [8, 330], t: [232, 172], c: [8, 172], p: [8, 30] };
  const trend = FULL.map((m) => m.revenue);
  const tmax = Math.max(...trend) * 1.15;
  const tx = (i: number) => r1(20 + (i / (trend.length - 1)) * (on.order ? 370 : 360));
  const ty = (v: number) => r1(142 - (v / tmax) * 110);
  const tline = trend.map((v, i) => `${i ? "L" : "M"}${tx(i)},${ty(v)}`).join(" ");
  const top6 = R.countries.slice(0, 6);
  const csum = top6.reduce((s, c) => s + c.revenue, 0);
  const ang = offsets(top6.map((c) => (c.revenue / csum) * Math.PI * 2));
  const prods = R.products.slice(0, 6);
  const shuffled = [prods[3], prods[0], prods[5], prods[1], prods[4], prods[2]];
  const plist = on.bars ? prods : shuffled;
  const pmax = prods[0].revenue;
  const col = (i: number, hot: boolean) => (on.color ? (hot ? PAL[1] : PAL[0]) : RAINBOW[i % RAINBOW.length]);
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" role="img" aria-label="A sales dashboard that improves as each design fix is switched on">
      <defs>
        <linearGradient id="mk-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff4c2" />
          <stop offset="1" stopColor="#d6ecff" />
        </linearGradient>
        <linearGradient id="mk-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff00aa" stopOpacity={0.6} />
          <stop offset="1" stopColor="#00e5ff" stopOpacity={0.6} />
        </linearGradient>
      </defs>
      <rect x={0.5} y={0.5} width={639} height={399} rx={16} fill={clean ? "#f7f5f0" : "#e9e2ff"} stroke="rgba(11,11,11,0.08)" />
      <Text x={14} y={20} size={12} color={INK} weight={800}>
        {clean ? "Sales overview · November 2011" : "★ SALES DASHBOARD ★"}
      </Text>

      {/* KPIs */}
      <motion.g initial={false} animate={{ x: pos.k[0], y: pos.k[1] }} transition={tr}>
        {kp.map((k, i) => (
          <g key={k.label} transform={`translate(${i * 158},0)`}>
            <Box w={150} h={62} label={k.label} clean={clean} />
            <Text x={10} y={46} size={18} color={on.color ? INK : RAINBOW[i + 3]} weight={800}>
              {k.v}
            </Text>
            {on.compare && (
              <g>
                <rect x={92} y={34} width={50} height={16} rx={8} fill={k.d >= 0 ? "#138a60" : "#c8413f"} opacity={0.14} />
                <Text x={117} y={45} anchor="middle" size={8.5} color={k.d >= 0 ? "#138a60" : "#c8413f"} weight={700}>
                  {pct(k.d)}
                </Text>
                <Text x={92} y={58} size={6.5}>
                  {`vs ${MONTH(PREV.month)}`}
                </Text>
              </g>
            )}
          </g>
        ))}
      </motion.g>

      {/* trend */}
      <motion.g initial={false} animate={{ x: pos.t[0], y: pos.t[1] }} transition={tr}>
        <Box w={on.order ? 400 : 400} h={152} label="Revenue by month" clean={clean} />
        {!clean && [40, 60, 80, 100, 120, 140].map((y) => <line key={y} x1={10} x2={390} y1={y} y2={y} stroke="rgba(11,11,11,0.35)" />)}
        <path d={`${tline} L${tx(trend.length - 1)},142 L${tx(0)},142 Z`} fill={on.color ? "rgba(42,120,214,0.12)" : "url(#mk-area)"} />
        <path d={tline} fill="none" stroke={on.color ? PAL[0] : "#ff00aa"} strokeWidth={on.color ? 2 : 4} />
        {on.compare && (
          <g>
            <circle cx={tx(trend.length - 1)} cy={ty(trend[trend.length - 1])} r={4} fill={on.color ? PAL[1] : "#000"} />
            <Text x={tx(trend.length - 1) - 8} y={ty(trend[trend.length - 1]) + 2} anchor="end" size={8.5} color={INK} weight={700}>
              {`best month: ${gbp(LAST.revenue)}`}
            </Text>
          </g>
        )}
      </motion.g>

      {/* countries */}
      <motion.g initial={false} animate={{ x: pos.c[0], y: pos.c[1] }} transition={tr}>
        <Box w={218} h={152} label="Revenue by country" clean={clean} />
        {on.bars
          ? R.countries.slice(1, 6).map((c, i) => (
              <g key={c.country}>
                <Text x={74} y={50 + i * 20} anchor="end" size={8} color={INK}>
                  {c.country === "EIRE" ? "Ireland" : c.country}
                </Text>
                <rect x={80} y={42 + i * 20} width={r1((c.revenue / R.countries[1].revenue) * 120)} height={11} rx={2} fill={col(i, i === 0)} />
              </g>
            ))
          : top6.map((c, i) => <path key={c.country} d={arc(80, 88, 0, 52, ang[i], ang[i + 1])} fill={RAINBOW[i]} stroke="#fff" />)}
        {on.bars ? (
          <Text x={10} y={32} size={8}>
            {`UK ${Math.round((R.countries[0].revenue / R.totals.revenue) * 100)}% of revenue; the rest, ranked:`}
          </Text>
        ) : (
          top6.map((c, i) => (
            <g key={c.country}>
              <rect x={144} y={36 + i * 15} width={8} height={8} fill={RAINBOW[i]} />
              <Text x={156} y={43 + i * 15} size={7}>
                {c.country === "United Kingdom" ? "UK" : c.country}
              </Text>
            </g>
          ))
        )}
      </motion.g>

      {/* products */}
      <motion.g initial={false} animate={{ x: pos.p[0], y: pos.p[1] }} transition={tr}>
        <Box w={624} h={132} label="Top products (net revenue)" clean={clean} />
        {plist.map((p, i) => (
          <g key={p.stock}>
            <Text x={210} y={36 + i * 16} anchor="end" size={8} color={INK}>
              {title(p.name).slice(0, 34)}
            </Text>
            <rect x={216} y={28 + i * 16} width={r1((p.revenue / pmax) * 330)} height={11} rx={on.clean ? 2 : 0} fill={col(i, on.bars ? i === 0 : p === prods[0])} />
            {!clean && <rect x={r1(216 + (p.revenue / pmax) * 330)} y={31 + i * 16} width={4} height={11} fill="rgba(11,11,11,0.3)" />}
            <Text x={r1(222 + (p.revenue / pmax) * 330)} y={37 + i * 16} size={7.5} mono>
              {gbp(p.revenue)}
            </Text>
          </g>
        ))}
      </motion.g>
    </svg>
  );
}

export function DashboardMakeover() {
  const [on, setOn] = useState<Record<Fix, boolean>>({ bars: false, color: false, compare: false, order: false, clean: false });
  const count = Object.values(on).filter(Boolean).length;
  const setAll = (v: boolean) => setOn({ bars: v, color: v, compare: v, order: v, clean: v });
  return (
    <Section
      id="makeover"
      kicker="Dashboard makeover"
      title="Same data, five fixes, a different dashboard."
      line="The dashboard below shows real numbers but breaks the usual rules. Switch the fixes on one by one and watch what each one changes."
    >
      <div className="grid gap-5 rounded-[28px] bg-cream p-4 sm:p-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.6fr)]">
        <div className="flex flex-col gap-2">
          {FIXES.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setOn((o) => ({ ...o, [f.id]: !o[f.id] }))}
              className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${on[f.id] ? "border-[#138a60] bg-white" : "border-transparent bg-white/60 hover:bg-white"}`}
              aria-pressed={on[f.id]}
            >
              <span className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${on[f.id] ? "bg-[#138a60]" : "bg-ink/15"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on[f.id] ? "left-[18px]" : "left-0.5"}`} />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold">
                  <span className="mr-1 font-mono text-[11px] text-muted">{i + 1}</span>
                  {f.t}
                </span>
                <span className="block text-[12px] leading-snug text-ink-2/65">{f.d}</span>
              </span>
            </button>
          ))}
          <div className="mt-1 flex items-center gap-2">
            <button type="button" onClick={() => setAll(true)} className="rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] text-white">
              Apply all
            </button>
            <button type="button" onClick={() => setAll(false)} className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-[12.5px]">
              Reset
            </button>
            <span className="ml-auto font-mono text-[11px] text-muted">{count} / 5 fixes</span>
          </div>
          <div className="h-2 rounded-full bg-ink/10">
            <motion.div className="h-full rounded-full bg-[#138a60]" initial={false} animate={{ width: `${count * 20}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
        <div className="rounded-2xl bg-white p-2 sm:p-3">
          <Board on={on} />
          <p className="mt-1 px-1 text-[11px] text-ink-2/50">Real Online Retail numbers for {MONTH(LAST.month, "long")} 2011, net of cancellations.</p>
        </div>
      </div>
    </Section>
  );
}

export { Board };
