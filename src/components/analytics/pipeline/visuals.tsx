"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import p from "@/data/retail-profile.json";

const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.5)";
const BLUE = "#2a78d6";
const UP = "#eb6834";
const GREEN = "#1baf7a";
const RED = "#e34948";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const n = (v: number) => v.toLocaleString("en-US");
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Ticks while the visual is on screen (for looping animations). */
function useTick(ms: number, count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px" });
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setT((v) => (v + 1) % count), ms);
    return () => clearInterval(id);
  }, [inView, ms, count]);
  return { ref, t };
}

function Frame({ children, h = 200, label }: { children: ReactNode; h?: number; label: string }) {
  return (
    <svg viewBox={`0 0 360 ${h}`} className="h-auto w-full" role="img" aria-label={label}>
      {children}
    </svg>
  );
}
function T({
  x,
  y,
  children,
  size = 10,
  anchor = "start",
  color = MUTED,
  weight,
  mono,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  color?: string;
  weight?: number;
  mono?: boolean;
}) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={color} fontWeight={weight} fontFamily={mono ? MONO : FONT}>
      {children}
    </text>
  );
}
function Node({ x, y, w = 92, h = 34, label, sub, color = INK, filled = false }: { x: number; y: number; w?: number; h?: number; label: string; sub?: string; color?: string; filled?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={9} fill={filled ? color : "#fff"} stroke={color} strokeWidth={1.5} />
      <T x={x + w / 2} y={y + (sub ? 15 : 21)} anchor="middle" size={10.5} color={filled ? "#fff" : INK} weight={600}>
        {label}
      </T>
      {sub && (
        <T x={x + w / 2} y={y + 27} anchor="middle" size={8.5} color={filled ? "rgba(255,255,255,0.75)" : MUTED} mono>
          {sub}
        </T>
      )}
    </g>
  );
}
const Arrow = ({ x1, y1, x2, y2, color = "rgba(11,11,11,0.35)" }: { x1: number; y1: number; x2: number; y2: number; color?: string }) => (
  <g>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.6} />
    <path d={`M${x2},${y2} l-6,-3.5 l0,7 z`} fill={color} transform={`rotate(${r1((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI)} ${x2} ${y2})`} />
  </g>
);

/* ------------------------------------------------------------------ ingest */

export function BatchStream() {
  const { ref, t } = useTick(160, 40);
  const batchFill = t % 20;
  return (
    <div ref={ref}>
      <Frame label="Batch: data piles up and moves on a schedule. Streaming: every event moves as it happens.">
        <T x={10} y={22} size={11} color={INK} weight={700}>
          Batch
        </T>
        <T x={10} y={36} size={9}>
          collected, then moved every night
        </T>
        <rect x={150} y={18} width={90} height={44} rx={8} fill="rgba(42,120,214,0.08)" stroke={BLUE} />
        <rect x={150} y={18 + 44 - batchFill * 2.2} width={90} height={batchFill * 2.2} rx={8} fill="rgba(42,120,214,0.35)" />
        <T x={195} y={44} anchor="middle" size={9} color={INK}>
          {batchFill === 19 ? "load!" : `${batchFill * 5}%`}
        </T>
        <Arrow x1={245} y1={40} x2={300} y2={40} color={batchFill === 19 ? BLUE : "rgba(11,11,11,0.15)"} />
        <Node x={304} y={24} w={48} h={32} label="DB" />
        <T x={10} y={122} size={11} color={INK} weight={700}>
          Streaming
        </T>
        <T x={10} y={136} size={9}>
          each event moves within seconds
        </T>
        <line x1={150} x2={300} y1={130} y2={130} stroke="rgba(11,11,11,0.15)" strokeWidth={2} />
        {[0, 1, 2, 3, 4].map((k) => (
          <circle key={k} cx={150 + ((((t * 4 + k * 30) % 150) + 150) % 150)} cy={130} r={4} fill={UP} />
        ))}
        <Node x={304} y={114} w={48} h={32} label="DB" />
      </Frame>
    </div>
  );
}

/* ------------------------------------------------------------------ profile & test */

export function Profiling() {
  const rows = p.rows;
  return (
    <div className="space-y-1.5 text-[11px]">
      {p.columns.map((c) => {
        const nullPct = c.nulls / rows;
        return (
          <div key={c.name} className="grid grid-cols-[86px_1fr_70px] items-center gap-2">
            <span className="truncate font-mono text-[10.5px]">{c.name}</span>
            <div className="relative h-3 rounded-full bg-[#1baf7a]/25">
              <div className="absolute top-0 right-0 h-full rounded-r-full bg-[#e34948]/70" style={{ width: `${Math.max(nullPct > 0 ? 1.5 : 0, Math.round(nullPct * 1000) / 10)}%` }} />
            </div>
            <span className="text-right font-mono text-[10px] text-ink/60">{c.nulls ? `${(nullPct * 100).toFixed(1)}% null` : `${n(c.distinct)} distinct`}</span>
          </div>
        );
      })}
      <p className="pt-1 text-[10.5px] text-ink/50">
        Green = filled, red = empty. Quantity runs from {n(Number(p.columns[3].min ?? 0))} to {n(Number(p.columns[3].max ?? 0))}; prices from {n(Number(p.columns[5].min ?? 0))} to{" "}
        {n(Number(p.columns[5].max ?? 0))}.
      </p>
    </div>
  );
}

export function DataTests() {
  const c = p.cases;
  const tests: [string, number][] = [
    ["not_null(InvoiceNo)", 0],
    ["not_null(Description)", c.missing_description.rows],
    ["unique(all columns)", c.duplicates.rows],
    ["Quantity > 0", c.negative_quantity.rows],
    ["UnitPrice > 0", c.zero_price.rows],
    ["Country is not empty", 0],
  ];
  return (
    <div className="space-y-1 text-[11.5px]">
      {tests.map(([name, fail]) => (
        <div key={name} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5">
          <span className="font-mono text-[10.5px]">{name}</span>
          <span className={`font-mono text-[10.5px] font-semibold ${fail ? "text-[#c2410c]" : "text-[#138a60]"}`}>{fail ? `✗ ${n(fail)} rows` : "✓ pass"}</span>
        </div>
      ))}
      <p className="pt-1 text-[10.5px] text-ink/50">Run on the raw file. Failing tests stop the pipeline or send rows to a quarantine table.</p>
    </div>
  );
}

export function Outliers() {
  const q = p.cases.outlier.quantiles;
  const fence = q.q3 + 1.5 * (q.q3 - q.q1);
  const x = (v: number) => r1(30 + (Math.log10(Math.max(1, v)) / Math.log10(100000)) * 300);
  const big = p.cases.outlier.example[0];
  return (
    <Frame h={160} label="Outliers: quantities on a log scale with the IQR fence">
      <line x1={30} x2={330} y1={80} y2={80} stroke="rgba(11,11,11,0.2)" />
      {[1, 10, 100, 1000, 10000, 100000].map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={76} y2={84} stroke="rgba(11,11,11,0.3)" />
          <T x={x(v)} y={98} anchor="middle" size={8.5} mono>
            {v >= 1000 ? `${v / 1000}k` : v}
          </T>
        </g>
      ))}
      <rect x={x(q.q1)} y={66} width={x(q.q3) - x(q.q1)} height={28} rx={4} fill="rgba(42,120,214,0.25)" stroke={BLUE} />
      <line x1={x(q.median)} x2={x(q.median)} y1={66} y2={94} stroke={INK} strokeWidth={2} />
      <line x1={x(fence)} x2={x(fence)} y1={50} y2={110} stroke={UP} strokeDasharray="4 3" />
      <T x={x(fence) + 3} y={48} size={8.5} color={UP}>
        fence {fence}
      </T>
      <circle cx={x(big.quantity)} cy={80} r={6} fill={RED} />
      <T x={x(big.quantity)} y={62} anchor="end" size={8.5} color={RED}>
        {n(big.quantity)} units
      </T>
      <T x={30} y={128} size={9.5} color={INK}>
        Middle half of orders: {q.q1}–{q.q3} units. {n(p.cases.outlier.above_fence)} rows sit past the fence:
      </T>
      <T x={30} y={142} size={9.5} color={INK}>
        most are real bulk orders, so the fence flags, a person decides.
      </T>
    </Frame>
  );
}

/* ------------------------------------------------------------------ transform */

const JOIN_LINES = [
  { id: "l1", code: "85123A", qty: 6 },
  { id: "l2", code: "71053", qty: 6 },
  { id: "l3", code: "99999X", qty: 2 },
];
const JOIN_PRODUCTS = [
  { code: "85123A", name: "White heart T-light" },
  { code: "71053", name: "White metal lantern" },
  { code: "22423", name: "Regency cakestand" },
];
export function Joins() {
  const [mode, setMode] = useState<"INNER" | "LEFT" | "FULL" | "ANTI">("LEFT");
  const names = new Map(JOIN_PRODUCTS.map((pr) => [pr.code, pr.name]));
  const lineCodes = new Set(JOIN_LINES.map((l) => l.code));
  let rows: [string, string | number, string][] = [];
  if (mode === "INNER") rows = JOIN_LINES.filter((l) => names.has(l.code)).map((l) => [l.code, l.qty, names.get(l.code)!]);
  if (mode === "LEFT") rows = JOIN_LINES.map((l) => [l.code, l.qty, names.get(l.code) ?? "null"]);
  if (mode === "FULL")
    rows = [
      ...JOIN_LINES.map((l) => [l.code, l.qty, names.get(l.code) ?? "null"] as [string, number, string]),
      ...JOIN_PRODUCTS.filter((pr) => !lineCodes.has(pr.code)).map((pr) => [pr.code, "null", pr.name] as [string, string, string]),
    ];
  if (mode === "ANTI") rows = JOIN_LINES.filter((l) => !names.has(l.code)).map((l) => [l.code, l.qty, "—"]);
  const fill = { INNER: [false, true, false], LEFT: [true, true, false], FULL: [true, true, true], ANTI: [true, false, false] }[mode];
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {(["INNER", "LEFT", "FULL", "ANTI"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] ${mode === m ? "bg-ink text-white" : "bg-ink/5 text-ink/60"}`}>
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[120px_1fr] items-center gap-3">
        <svg viewBox="0 0 120 80" className="w-full" aria-label={`${mode} join`}>
          <defs>
            <clipPath id="jl">
              <circle cx={45} cy={40} r={30} />
            </clipPath>
          </defs>
          <circle cx={45} cy={40} r={30} fill={fill[0] ? "rgba(42,120,214,0.45)" : "#fff"} stroke={BLUE} />
          <circle cx={75} cy={40} r={30} fill={fill[2] ? "rgba(235,104,52,0.4)" : "#fff"} stroke={UP} fillOpacity={1} />
          <circle cx={75} cy={40} r={30} fill={fill[1] ? "rgba(98,80,214,0.6)" : "#fff"} clipPath="url(#jl)" />
          <circle cx={45} cy={40} r={30} fill="none" stroke={BLUE} />
          <circle cx={75} cy={40} r={30} fill="none" stroke={UP} />
          <T x={30} y={78} anchor="middle" size={8} color={BLUE}>
            lines
          </T>
          <T x={92} y={78} anchor="middle" size={8} color={UP}>
            products
          </T>
        </svg>
        <table className="w-full text-[10.5px]">
          <thead>
            <tr className="text-left font-mono text-[9.5px] text-ink/50">
              <th>code</th>
              <th className="text-right">qty</th>
              <th className="pl-2">name</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r[0]}${r[1]}`} className="border-t border-line/60">
                <td className="font-mono">{r[0]}</td>
                <td className={`text-right font-mono ${r[1] === "null" ? "text-ink/30 italic" : ""}`}>{r[1]}</td>
                <td className={`pl-2 ${r[2] === "null" ? "text-ink/30 italic" : ""}`}>{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[10.5px] text-ink/50">
        {
          {
            INNER: "Only lines whose product exists.",
            LEFT: "Every line; unknown product 99999X gets nulls.",
            FULL: "Everything from both sides, matched where possible.",
            ANTI: "Lines with no matching product: an orphan check.",
          }[mode]
        }
      </p>
    </div>
  );
}

export function WindowFns() {
  const m = p.monthly.slice(-7, -1);
  const rows = m.map((r, i) => ({
    ...r,
    running: m.slice(0, i + 1).reduce((acc, x) => acc + x.orders, 0), // SUM(orders) OVER (ORDER BY month)
    change: i ? r.orders - m[i - 1].orders : null, // orders - LAG(orders)
    rank: [...m].sort((a, b) => b.orders - a.orders).findIndex((x) => x.month === r.month) + 1, // RANK() OVER (ORDER BY orders DESC)
  }));
  const max = Math.max(...m.map((r) => r.orders));
  return (
    <div className="text-[10.5px]">
      <table className="w-full">
        <thead>
          <tr className="text-left font-mono text-[9.5px] text-ink/50">
            <th>month</th>
            <th>orders</th>
            <th className="text-right">running total</th>
            <th className="text-right">vs last (LAG)</th>
            <th className="text-right">rank</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month} className="border-t border-line/60">
              <td className="font-mono">{r.month}</td>
              <td>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 rounded-full bg-[#2a78d6]" style={{ width: `${Math.round((r.orders / max) * 60)}px` }} />
                  <span className="font-mono">{n(r.orders)}</span>
                </div>
              </td>
              <td className="text-right font-mono">{n(r.running)}</td>
              <td className={`text-right font-mono ${r.change === null ? "text-ink/30" : r.change >= 0 ? "text-[#138a60]" : "text-[#c2410c]"}`}>
                {r.change === null ? "null" : `${r.change >= 0 ? "+" : ""}${n(r.change)}`}
              </td>
              <td className="text-right font-mono">{r.rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-[10.5px] text-ink/50">Real cleaned orders. Each row keeps its detail and gains a value computed across neighbouring rows.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ model */

export function Normalise() {
  const { ref, t } = useTick(1800, 3);
  const stages = [
    {
      title: "Flat (1NF)",
      note: "one row per order line; names and countries repeat",
      boxes: [{ x: 110, w: 140, label: "order_lines", cols: "invoice · date · country · code · description · qty · price" }],
    },
    {
      title: "2NF",
      note: "order facts depend on the whole invoice, not each line",
      boxes: [
        { x: 20, w: 140, label: "invoices", cols: "invoice · date · country" },
        { x: 200, w: 140, label: "lines", cols: "invoice · code · description · qty · price" },
      ],
    },
    {
      title: "3NF",
      note: "product facts depend on the product code only",
      boxes: [
        { x: 10, w: 108, label: "invoices", cols: "invoice · date · country" },
        { x: 126, w: 108, label: "lines", cols: "invoice · code · qty · price" },
        { x: 242, w: 108, label: "products", cols: "code · description" },
      ],
    },
  ];
  const s = stages[t];
  return (
    <div ref={ref}>
      <Frame h={150} label={`Normalisation: ${s.title}`}>
        <T x={180} y={18} anchor="middle" size={12} color={INK} weight={700}>
          {s.title}
        </T>
        {s.boxes.map((b) => (
          <motion.g key={`${t}-${b.label}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <rect x={b.x} y={34} width={b.w} height={66} rx={10} fill="#fff" stroke="rgba(11,11,11,0.2)" />
            <rect x={b.x} y={34} width={b.w} height={20} rx={10} fill={INK} />
            <T x={b.x + 8} y={48} size={10} color="#fff" mono weight={700}>
              {b.label}
            </T>
            {b.cols.split(" · ").map((c, i) => (
              <T key={c} x={b.x + 8 + (i % 2) * (b.w / 2 - 4)} y={68 + Math.floor(i / 2) * 12} size={8.5} mono color={INK}>
                {c}
              </T>
            ))}
          </motion.g>
        ))}
        <T x={180} y={124} anchor="middle" size={9.5}>
          {s.note}
        </T>
      </Frame>
    </div>
  );
}

export function Grain() {
  const lines = p.invoice.slice(0, 4);
  return (
    <div className="text-[10.5px]">
      <p className="mb-1.5 font-mono text-[10px] text-ink/50">GRAIN: ONE ROW PER INVOICE LINE</p>
      <div className="rounded-lg border border-line bg-white p-2">
        <p className="font-mono text-[10px] font-semibold">invoice {lines[0].invoice}</p>
        {lines.map((l) => (
          <div key={l.stock} className="mt-1 flex justify-between border-t border-line/60 pt-1">
            <span className="truncate pr-2">{l.description}</span>
            <span className="font-mono">
              {l.quantity} × {l.price}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[10.5px] text-ink/50">Decide the grain first. A shipping fee stored once per invoice on every line would be counted {lines.length} times.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ store & speed */

export function RowVsColumn() {
  const { ref, t } = useTick(1600, 2);
  const cols = ["invoice", "code", "qty", "price", "country"];
  return (
    <div ref={ref}>
      <Frame h={170} label="Row storage reads whole rows; column storage reads only the needed column">
        {["Row store", "Column store"].map((title, k) => (
          <g key={title} transform={`translate(${k * 180}, 0)`}>
            <T x={10} y={16} size={11} color={INK} weight={700}>
              {title}
            </T>
            {Array.from({ length: 5 }, (_, r) =>
              cols.map((c, ci) => {
                const read = k === 0 ? t >= 0 : ci === 2;
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={10 + ci * 30}
                    y={26 + r * 22}
                    width={27}
                    height={18}
                    rx={3}
                    fill={read ? (k === 0 ? "rgba(227,73,72,0.35)" : "rgba(27,175,122,0.55)") : "rgba(11,11,11,0.06)"}
                  />
                );
              }),
            )}
            {cols.map((c, ci) => (
              <T key={c} x={10 + ci * 30 + 13} y={144} anchor="middle" size={7.5} mono>
                {c}
              </T>
            ))}
            <T x={10} y={162} size={9} color={k ? "#138a60" : "#c2410c"}>
              {k ? "SUM(qty) reads 1 of 5 columns" : "SUM(qty) reads every column"}
            </T>
          </g>
        ))}
      </Frame>
    </div>
  );
}

export function BTree() {
  const { ref, t } = useTick(700, 5);
  const depth = Math.min(t, 3);
  return (
    <div ref={ref}>
      <Frame h={170} label="An index finds a row in a few steps instead of scanning every row">
        <T x={10} y={16} size={11} color={INK} weight={700}>
          WHERE invoice_no = &apos;581483&apos;
        </T>
        <Node x={130} y={26} w={100} h={26} label="root" color={depth >= 1 ? UP : INK} filled={depth >= 1} />
        {[60, 200].map((x, i) => (
          <g key={x}>
            <line x1={180} y1={52} x2={x + 50} y2={72} stroke="rgba(11,11,11,0.25)" />
            <Node x={x} y={72} w={100} h={26} label={i ? "500000+" : "< 500000"} color={depth >= 2 && i ? UP : INK} filled={depth >= 2 && i === 1} />
          </g>
        ))}
        {[180, 290].map((x, i) => (
          <g key={x}>
            <line x1={250} y1={98} x2={x + 30} y2={118} stroke="rgba(11,11,11,0.25)" />
            <Node x={x} y={118} w={64} h={26} label={i ? "58…" : "50…"} color={depth >= 3 && i ? UP : INK} filled={depth >= 3 && i === 1} />
          </g>
        ))}
        <T x={10} y={160} size={9.5} color={INK}>
          Index: about 3 page reads. Without it: scan all {n(p.rows)} rows.
        </T>
      </Frame>
    </div>
  );
}

export function Partitions() {
  const m = p.monthly;
  const max = Math.max(...m.map((r) => r.orders));
  return (
    <div className="text-[10.5px]">
      <p className="mb-1.5 font-mono text-[10px] text-ink/50">WHERE month = &apos;2011-11&apos; → 1 of {m.length} partitions read</p>
      <div className="flex h-24 items-end gap-1">
        {m.map((r) => {
          const hit = r.month === "2011-11";
          return (
            <div key={r.month} className="flex h-full flex-1 flex-col justify-end">
              <div className="rounded-t" style={{ height: `${Math.round((r.orders / max) * 100)}%`, background: hit ? GREEN : "rgba(11,11,11,0.12)" }} />
              <span className="mt-0.5 text-center font-mono text-[7.5px] text-ink/50">{r.month.slice(2)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10.5px] text-ink/50">The table is stored month by month, so a one-month query skips the other folders entirely.</p>
    </div>
  );
}

export function MatView() {
  const { ref, t } = useTick(1400, 2);
  const funnelEnd = p.funnel[p.funnel.length - 1].rows;
  return (
    <div ref={ref}>
      <Frame h={150} label="A materialised view stores a query's answer so dashboards read a tiny table">
        <Node x={10} y={20} w={120} h={40} label="fact_sales" sub={`${n(funnelEnd)} rows`} />
        <Node x={10} y={90} w={120} h={40} label="monthly_orders" sub={`${p.monthly.length} rows, stored`} color={GREEN} filled />
        <path d="M70,60 L70,90" stroke="rgba(11,11,11,0.25)" strokeDasharray="4 3" />
        <T x={78} y={78} size={8.5}>
          refreshed nightly
        </T>
        <Node x={250} y={55} w={100} h={40} label="dashboard" />
        <Arrow x1={248} y1={75} x2={t ? 134 : 134} y2={t ? 110 : 40} color={t ? GREEN : RED} />
        <T x={190} y={140} anchor="middle" size={9.5} color={t ? "#138a60" : "#c2410c"}>
          {t ? "reads 13 stored rows: instant" : `scans ${n(funnelEnd)} rows every time`}
        </T>
      </Frame>
    </div>
  );
}

/* ------------------------------------------------------------------ architecture & ops */

export function EtlElt() {
  const { ref, t } = useTick(700, 6);
  const flows = [
    { name: "ETL", order: ["Extract", "Transform", "Load"], note: "transform on a separate server, then load clean data" },
    { name: "ELT", order: ["Extract", "Load", "Transform"], note: "load raw first, transform inside the warehouse with SQL" },
  ];
  return (
    <div ref={ref}>
      <Frame h={160} label="ETL transforms before loading; ELT loads first and transforms in the warehouse">
        {flows.map((f, k) => (
          <g key={f.name} transform={`translate(0, ${k * 76})`}>
            <T x={10} y={30} size={12} color={INK} weight={700}>
              {f.name}
            </T>
            {f.order.map((s, i) => (
              <g key={s}>
                <Node x={60 + i * 100} y={12} w={84} h={30} label={s} color={s === "Transform" ? UP : INK} filled={Math.min(t, 2) === i} />
                {i < 2 && <Arrow x1={144 + i * 100} y1={27} x2={158 + i * 100} y2={27} />}
              </g>
            ))}
            <T x={60} y={58} size={9}>
              {f.note}
            </T>
          </g>
        ))}
      </Frame>
    </div>
  );
}

export function Medallion() {
  const f = p.funnel;
  const tiers = [
    { name: "Bronze", sub: "raw, as received", rows: f[0].rows, color: "#b5793a" },
    { name: "Silver", sub: "cleaned & typed", rows: f[f.length - 1].rows, color: "#8a8f98" },
    { name: "Gold", sub: "business tables", rows: p.monthly.length, color: "#c29a00" },
  ];
  return (
    <Frame h={150} label="Medallion architecture: bronze raw data, silver cleaned data, gold business tables">
      {tiers.map((tier, i) => (
        <g key={tier.name}>
          <rect x={10 + i * 120} y={30} width={100} height={70} rx={12} fill={tier.color} opacity={0.18} stroke={tier.color} />
          <T x={60 + i * 120} y={52} anchor="middle" size={12} color={INK} weight={700}>
            {tier.name}
          </T>
          <T x={60 + i * 120} y={67} anchor="middle" size={8.5}>
            {tier.sub}
          </T>
          <T x={60 + i * 120} y={88} anchor="middle" size={10} color={INK} mono>
            {n(tier.rows)} rows
          </T>
          {i < 2 && <Arrow x1={110 + i * 120} y1={65} x2={128 + i * 120} y2={65} />}
        </g>
      ))}
      <T x={10} y={126} size={9.5} color={INK}>
        Real counts: the raw file, after the cleaning rules, and one gold table (orders per month).
      </T>
    </Frame>
  );
}

export function OltpOlap() {
  return (
    <div className="grid grid-cols-2 gap-2 text-[10.5px]">
      {[
        { t: "OLTP (the app)", q: "INSERT one order line", items: ["many tiny reads & writes", "normalised tables", "row storage, indexes", "must never lose a write"], c: "#2a78d6" },
        { t: "OLAP (analytics)", q: "SUM revenue by month", items: ["few huge reads", "star schema / wide tables", "column storage, partitions", "minutes-old data is fine"], c: "#eb6834" },
      ].map((s) => (
        <div key={s.t} className="rounded-lg border border-line bg-white p-2">
          <p className="font-semibold" style={{ color: s.c }}>
            {s.t}
          </p>
          <p className="mt-0.5 font-mono text-[9.5px] text-ink/50">{s.q}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {s.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Dag() {
  const { ref, t } = useTick(650, 9);
  const nodes = [
    { id: "extract", x: 10, y: 60 },
    { id: "test raw", x: 95, y: 60 },
    { id: "clean", x: 180, y: 25 },
    { id: "products", x: 180, y: 95 },
    { id: "fct_sales", x: 265, y: 60 },
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [1, 3],
    [2, 4],
    [3, 4],
  ];
  const level = [0, 1, 2, 2, 3]; // clean and products run in parallel
  const done = (i: number) => level[i] < t;
  return (
    <div ref={ref}>
      <Frame h={150} label="An orchestration DAG: tasks run in dependency order">
        {edges.map(([a, b]) => (
          <Arrow key={`${a}-${b}`} x1={nodes[a].x + 80} y1={nodes[a].y + 13} x2={nodes[b].x} y2={nodes[b].y + 13} />
        ))}
        {nodes.map((nd, i) => (
          <Node key={nd.id} x={nd.x} y={nd.y} w={80} h={26} label={nd.id} color={done(i) ? GREEN : level[i] === t ? UP : INK} filled={done(i)} />
        ))}
        <T x={10} y={140} size={9.5} color={INK}>
          Each task waits for the ones it depends on; failures retry or stop what depends on them.
        </T>
      </Frame>
    </div>
  );
}

export function Idempotent() {
  const { ref, t } = useTick(1500, 3);
  const runs = t + 1;
  return (
    <div ref={ref} className="grid grid-cols-2 gap-2 text-[10.5px]">
      {[
        { title: "INSERT every run", rows: 7 * runs, ok: false },
        { title: "MERGE / delete-then-insert", rows: 7, ok: true },
      ].map((s) => (
        <div key={s.title} className={`rounded-lg border p-2 ${s.ok ? "border-[#1baf7a]/40 bg-[#1baf7a]/5" : "border-[#e34948]/40 bg-[#e34948]/5"}`}>
          <p className="font-semibold">{s.title}</p>
          <p className="mt-1 font-mono text-[18px] font-semibold">{s.rows}</p>
          <p className="text-ink/60">
            rows for invoice 536365 after {runs} run{runs > 1 ? "s" : ""}
          </p>
        </div>
      ))}
      <p className="col-span-2 text-[10.5px] text-ink/50">Re-running a job (after a failure, or to backfill) must give the same result, not double it.</p>
    </div>
  );
}

export function Acid() {
  const { ref, t } = useTick(1300, 4);
  const crash = t === 2;
  return (
    <div ref={ref} className="text-[10.5px]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {[
          { who: "Warehouse stock", v: t === 0 ? 100 : t === 1 ? 94 : t === 2 ? 94 : 94 },
          { who: "Order lines", v: t === 0 ? 0 : t === 1 ? 6 : 6 },
        ].map((a, i) => (
          <div key={a.who} className={`rounded-lg border bg-white p-2 text-center ${i === 1 ? "col-start-3" : ""}`}>
            <p className="text-ink/60">{a.who}</p>
            <p className="font-mono text-[18px] font-semibold">{crash && i === 1 ? "—" : a.v}</p>
          </div>
        ))}
        <span className="col-start-2 row-start-1 text-center text-[18px]">⇄</span>
      </div>
      <p className={`mt-2 rounded-lg px-2 py-1.5 ${crash ? "bg-[#e34948]/10 text-[#c2410c]" : "bg-[#1baf7a]/10 text-[#138a60]"}`}>
        {t === 0
          ? "BEGIN: take 6 from stock and record the sale"
          : t === 1
            ? "COMMIT: both changes saved together"
            : t === 2
              ? "Crash half-way: ROLLBACK, as if nothing happened"
              : "Atomic, consistent, isolated, durable"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ governance */

export function Lineage() {
  const nodes = [
    { id: "online_retail.xlsx", x: 6, y: 64, c: "#b5793a" },
    { id: "stg_sales", x: 96, y: 30, c: "#8a8f98" },
    { id: "stg_products", x: 96, y: 98, c: "#8a8f98" },
    { id: "fct_sales", x: 186, y: 30, c: INK },
    { id: "dim_product", x: 186, y: 98, c: BLUE },
    { id: "Sales dashboard", x: 276, y: 64, c: UP },
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [4, 3],
    [3, 5],
    [4, 5],
  ];
  return (
    <Frame h={150} label="Lineage: where every table and dashboard comes from">
      {edges.map(([a, b]) => (
        <Arrow key={`${a}-${b}`} x1={nodes[a].x + 80} y1={nodes[a].y + 12} x2={nodes[b].x + (nodes[b].x === nodes[a].x ? 40 : 0)} y2={nodes[b].y + 12} />
      ))}
      {nodes.map((nd) => (
        <g key={nd.id}>
          <rect x={nd.x} y={nd.y} width={80} height={24} rx={7} fill="#fff" stroke={nd.c} strokeWidth={1.5} />
          <T x={nd.x + 40} y={nd.y + 15.5} anchor="middle" size={7.8} mono color={INK}>
            {nd.id}
          </T>
        </g>
      ))}
      <T x={6} y={142} size={9.5} color={INK}>
        If a number on the dashboard looks wrong, lineage shows every step it came through.
      </T>
    </Frame>
  );
}

export function Catalog() {
  const docs: Record<string, string> = {
    InvoiceNo: "Order number; starts with C when cancelled",
    StockCode: "Product code; a few codes are fees",
    Description: "Product name as typed in the shop system",
    Quantity: "Units; negative for returns",
    InvoiceDate: "When the order was placed (UK time)",
    UnitPrice: "Price per unit in pounds",
    CustomerID: "Customer number; empty for guests",
    Country: "Customer's country",
  };
  return (
    <div className="overflow-x-auto text-[10.5px]">
      <table className="w-full">
        <thead>
          <tr className="text-left font-mono text-[9.5px] text-ink/50">
            <th>column</th>
            <th>meaning</th>
            <th className="text-right">empty</th>
          </tr>
        </thead>
        <tbody>
          {p.columns.map((c) => (
            <tr key={c.name} className="border-t border-line/60">
              <td className="pr-2 font-mono">{c.name}</td>
              <td className="pr-2">{docs[c.name]}</td>
              <td className="text-right font-mono">{c.nulls ? `${((c.nulls / p.rows) * 100).toFixed(1)}%` : "0"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RowSecurity() {
  const [who, setWho] = useState<"UK manager" | "France manager">("UK manager");
  const rows = p.pivot.cells.filter((c) => c.month === "2011-11");
  return (
    <div className="text-[10.5px]">
      <div className="mb-2 flex gap-1">
        {(["UK manager", "France manager"] as const).map((w) => (
          <button key={w} type="button" onClick={() => setWho(w)} className={`rounded-full px-2.5 py-0.5 text-[10.5px] ${who === w ? "bg-ink text-white" : "bg-ink/5 text-ink/60"}`}>
            {w}
          </button>
        ))}
      </div>
      <table className="w-full">
        <tbody>
          {rows.map((r) => {
            const visible = who === "UK manager" ? r.country === "United Kingdom" : r.country === "France";
            return (
              <tr key={r.country} className={`border-t border-line/60 ${visible ? "" : "opacity-25"}`}>
                <td>{visible ? r.country : "████████"}</td>
                <td className="text-right font-mono">{visible ? n(r.orders) : "███"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1.5 text-[10.5px] text-ink/50">Same table, same report: each viewer only sees their own rows (orders, Nov 2011).</p>
    </div>
  );
}

export function Contract() {
  const { ref, t } = useTick(1600, 2);
  return (
    <div ref={ref} className="text-[10.5px]">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line bg-white p-2 font-mono text-[10px]">
          <p className="mb-1 font-sans font-semibold">Agreed contract</p>
          <p>invoice_no: text, required</p>
          <p>quantity: integer</p>
          <p>unit_price: decimal ≥ 0</p>
        </div>
        <div className={`rounded-lg border p-2 font-mono text-[10px] ${t ? "border-[#e34948]/50 bg-[#e34948]/5" : "border-line bg-white"}`}>
          <p className="mb-1 font-sans font-semibold">Today&apos;s delivery</p>
          <p>invoice_no: text</p>
          <p className={t ? "font-semibold text-[#c2410c]" : ""}>quantity: {t ? "text ✗" : "integer"}</p>
          <p>unit_price: decimal</p>
        </div>
      </div>
      <p className={`mt-2 rounded-lg px-2 py-1.5 ${t ? "bg-[#e34948]/10 text-[#c2410c]" : "bg-[#1baf7a]/10 text-[#138a60]"}`}>
        {t ? "Breaking change caught at the door: pipeline stops, owner notified" : "Schema matches: load continues"}
      </p>
    </div>
  );
}
