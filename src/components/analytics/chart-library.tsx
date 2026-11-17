"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLenis } from "lenis/react";
import { ChevronLeft, ChevronRight, Grid3x3, LayoutList, Search, Shuffle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { monthly, productTotals, revenueByCity } from "@/data/chart-demo";
import { CHARTS, FAMILIES, GROUPS, type ChartDef, type Group } from "./charts/catalog";
import { Donut, Pie, Waffle, squarify } from "./charts/composition";
import { H, INK, M, MUTED, PAL, Svg, Text, W, XLabels, YGrid, arc, band, fmt, lin, nice, offsets, path, r1 } from "./charts/kit";
import { ColHighlight, ColPareto } from "./charts/variants/columns";
import { LnDual, LnIndex } from "./charts/variants/lines";
import { Exploded, Inside, Polar, Semi, ShareBar } from "./charts/variants/parts";

/* ------------------------------------------------------------------ same data, different chart */

const products = [...productTotals].sort((a, b) => b.value - a.value);
const ptotal = products.reduce((s, p) => s + p.value, 0);

function ProductBars() {
  const x = lin(0, nice(products[0].value), 90, W - M.r - 30);
  const b = band(products.length, 12, H - 12, 0.3);
  return (
    <Svg label="Sorted bars of revenue share by product">
      {products.map((p, i) => (
        <g key={p.label}>
          <Text x={84} y={b.mid(i) + 3} anchor="end" size={10.5} color={INK}>
            {p.label}
          </Text>
          <rect x={90} y={b.at(i)} width={x(p.value) - 90} height={b.bw} rx={3} fill={PAL[i]} />
          <Text x={x(p.value) + 5} y={b.mid(i) + 3} size={10} mono>
            {Math.round((p.value / ptotal) * 100)}%
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function ProductTreemap() {
  const rects = squarify(
    products.map((p, i) => ({ label: p.label, value: p.value, color: PAL[i] })),
    6,
    6,
    W - 12,
    H - 12,
  );
  return (
    <Svg label="Treemap of revenue share by product">
      {rects.map((r) => (
        <g key={r.label}>
          <rect x={r1(r.x)} y={r1(r.y)} width={r1(r.w - 2)} height={r1(r.h - 2)} rx={4} fill={r.color} opacity={0.85} />
          <Text x={r.x + 6} y={r.y + 16} size={10.5} color="#fff" weight={700}>
            {r.label}
          </Text>
          <Text x={r.x + 6} y={r.y + 29} size={9.5} color="rgba(255,255,255,0.85)" mono>
            {Math.round((r.value / ptotal) * 100)}%
          </Text>
        </g>
      ))}
    </Svg>
  );
}

const VIEWS = [
  { id: "Sorted bar", C: ProductBars, note: "Easiest to read: lengths on one baseline, sorted. The safe default for shares." },
  { id: "Pareto", C: ColPareto, note: "Sorted columns plus the running share: how many products make most of the revenue." },
  { id: "Single bar", C: ShareBar, note: "The whole mix in one strip. Compact, but only the first segment shares a baseline." },
  { id: "Pie", C: Pie, note: "Shows “one big part” at a glance, but similar slices (Latte vs Americano) are hard to tell apart." },
  { id: "Pie, labelled", C: Inside, note: "Printing the shares inside fixes the reading problem, as long as the slices are big enough." },
  { id: "Pulled-out slice", C: Exploded, note: "Grey for the rest, colour for the one slice the sentence is about." },
  { id: "Donut", C: Donut, note: "Same as the pie, with room for the total. Angles are still harder to compare than lengths." },
  { id: "Half donut", C: Semi, note: "Half the height, labels around the edge. Good for a dashboard header." },
  { id: "Polar area", C: Polar, note: "Equal angles, the radius carries the value. Eye-catching, but areas are hard to compare." },
  { id: "Waffle", C: Waffle, note: "Countable squares feel concrete for general audiences: “36 out of 100”." },
  { id: "Treemap", C: ProductTreemap, note: "Fits many parts in a small space; areas are harder to compare than lengths." },
];

/* ------------------------------------------------------------------ bad → better */

function TruncatedBad() {
  const rows = revenueByCity.slice(1, 3);
  const lo = Math.floor(Math.min(...rows.map((r) => r.value)) * 0.97);
  const hi = Math.ceil(Math.max(...rows.map((r) => r.value)) * 1.01);
  const y = lin(lo, hi, H - M.b, M.t);
  const b = band(2, M.l + 40, W - M.r - 40, 0.4);
  return (
    <Svg label="Bad: the axis starts far above zero, so a small gap looks huge">
      <YGrid y={y} max={hi} min={lo} ticks={3} />
      {rows.map((r, i) => (
        <rect key={r.label} x={b.at(i)} y={y(r.value)} width={b.bw} height={H - M.b - y(r.value)} fill="#e34948" opacity={0.8} />
      ))}
      <XLabels labels={rows.map((r) => r.label)} x={b.mid} />
    </Svg>
  );
}
function TruncatedGood() {
  const rows = revenueByCity.slice(1, 3);
  const max = nice(Math.max(...rows.map((r) => r.value)));
  const y = lin(0, max, H - M.b, M.t);
  const b = band(2, M.l + 40, W - M.r - 40, 0.4);
  return (
    <Svg label="Better: bars start at zero, so lengths are honest">
      <YGrid y={y} max={max} ticks={3} />
      {rows.map((r, i) => (
        <rect key={r.label} x={b.at(i)} y={y(r.value)} width={b.bw} height={H - M.b - y(r.value)} fill={PAL[2]} />
      ))}
      <XLabels labels={rows.map((r) => r.label)} x={b.mid} />
      <Text x={W - M.r} y={M.t + 4} anchor="end" size={9} color={MUTED}>
        gap: {Math.round((rows[0].value / rows[1].value - 1) * 100)}%
      </Text>
    </Svg>
  );
}
function ManyPie() {
  const total = revenueByCity.reduce((s, r) => s + r.value, 0);
  const angle = offsets(revenueByCity.map((r) => (r.value / total) * Math.PI * 2));
  return (
    <Svg label="Bad: a pie with eight similar slices">
      {revenueByCity.map((r, i) => (
        <path key={r.label} d={arc(180, 110, 0, 90, angle[i], angle[i + 1])} fill={PAL[i % PAL.length]} stroke="#fff" />
      ))}
    </Svg>
  );
}
function ManyBar() {
  const x = lin(0, nice(revenueByCity[0].value), 80, W - M.r - 30);
  const b = band(revenueByCity.length, 6, H - 6, 0.25);
  return (
    <Svg label="Better: a sorted bar chart, every city readable">
      {revenueByCity.map((r, i) => (
        <g key={r.label}>
          <Text x={74} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
            {r.label}
          </Text>
          <rect x={80} y={b.at(i)} width={x(r.value) - 80} height={b.bw} rx={2} fill={PAL[0]} />
          <Text x={x(r.value) + 4} y={b.mid(i) + 3} size={8.5} mono>
            {fmt(r.value)}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function Spaghetti({ highlight }: { highlight: boolean }) {
  const max = nice(Math.max(...monthly.flatMap((c) => c.values)));
  const y = lin(0, max, H - M.b, M.t);
  const x = lin(0, 23, M.l, W - M.r - 50);
  return (
    <Svg label={highlight ? "Better: one city highlighted, the rest in grey" : "Bad: eight coloured lines tangled together"}>
      <YGrid y={y} max={max} x1={W - M.r - 50} ticks={3} />
      {monthly.map((c, k) => {
        const hot = highlight && k === 4;
        return (
          <g key={c.city}>
            <path d={path(c.values.map((v, i) => [x(i), y(v)]))} fill="none" stroke={highlight ? (hot ? PAL[1] : "rgba(11,11,11,0.18)") : PAL[k % PAL.length]} strokeWidth={hot ? 3 : 1.6} />
            {hot && (
              <Text x={x(23) + 5} y={y(c.values[23]) + 3} size={9.5} color={PAL[1]} weight={700}>
                {c.city}
              </Text>
            )}
          </g>
        );
      })}
    </Svg>
  );
}
function Rainbow() {
  const months = monthly[0].values.slice(12);
  const max = nice(Math.max(...months));
  const y = lin(0, max, H - M.b, M.t);
  const b = band(12, M.l, W - M.r);
  const hues = ["#ff0000", "#ff8000", "#ffd000", "#80ff00", "#00ff80", "#00ffff", "#0080ff", "#4000ff", "#a000ff", "#ff00ff", "#ff0080", "#804000"];
  return (
    <Svg label="Bad: a different bright colour for every column, which means nothing">
      <YGrid y={y} max={max} />
      {months.map((v, i) => (
        <rect key={i} x={b.at(i)} y={y(v)} width={b.bw} height={r1(H - M.b - y(v))} fill={hues[i]} />
      ))}
    </Svg>
  );
}

const FIXES = [
  {
    bad: TruncatedBad,
    good: TruncatedGood,
    t: "A cut-off axis",
    d: "Starting bars far above zero turns a small gap into a dramatic one. Bars must start at zero; lines may zoom in, if the axis says so.",
  },
  { bad: ManyPie, good: ManyBar, t: "Too many slices", d: "Eight similar slices can't be ranked by eye. A sorted bar chart shows the order and the values." },
  {
    bad: () => <Spaghetti highlight={false} />,
    good: () => <Spaghetti highlight />,
    t: "Spaghetti lines",
    d: "Eight colours compete for attention. Grey out the context and colour the one line the story is about.",
  },
  { bad: Rainbow, good: ColHighlight, t: "Rainbow colours", d: "A colour per bar suggests twelve categories when there is one. Use one colour, and spend contrast on the bar that matters." },
  {
    bad: LnDual,
    good: LnIndex,
    t: "Two axes, one chart",
    d: "With two scales you can make any two lines look related by stretching one axis. Indexing every series to 100 puts them on one honest scale.",
  },
];

/* ------------------------------------------------------------------ the wall */

type View = "wall" | "cards";

function Lightbox({ list, index, onClose, onGo }: { list: ChartDef[]; index: number; onClose: () => void; onGo: (i: number) => void }) {
  const c = list[index];
  const lenis = useLenis();
  const siblings = CHARTS.filter((x) => x.family === c.family && x.group === c.group);
  useEffect(() => {
    lenis?.stop();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = prev;
    };
  }, [lenis]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onGo((index + 1) % list.length);
      if (e.key === "ArrowLeft") onGo((index - 1 + list.length) % list.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, list.length, onClose, onGo]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={c.name}
    >
      <motion.div
        initial={{ y: 30, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 30, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[920px] overflow-y-auto rounded-t-[28px] bg-white p-4 sm:rounded-[28px] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
              {c.group} · {c.family} · {index + 1} / {list.length}
            </p>
            <h3 className="mt-1 text-[22px] leading-tight font-semibold tracking-[-0.02em] sm:text-[26px]">{c.name}</h3>
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" aria-label="Previous chart" onClick={() => onGo((index - 1 + list.length) % list.length)} className="rounded-full border border-line p-2 hover:border-ink">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Next chart" onClick={() => onGo((index + 1) % list.length)} className="rounded-full border border-line p-2 hover:border-ink">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded-full bg-ink p-2 text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl bg-cream/60 p-2 sm:p-3"
            >
              <c.C />
            </motion.div>
          </AnimatePresence>
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-[#1baf7a]/[0.08] p-3">
              <p className="font-mono text-[10px] tracking-[0.14em] text-[#138a60] uppercase">Use it for</p>
              <p className="mt-1 text-[14px] leading-snug">{c.use}</p>
            </div>
            <div className="rounded-2xl bg-[#eb6834]/[0.08] p-3">
              <p className="font-mono text-[10px] tracking-[0.14em] text-[#c2410c] uppercase">Avoid when</p>
              <p className="mt-1 text-[14px] leading-snug">{c.avoid}</p>
            </div>
            <p className="text-[11.5px] text-ink-2/50">Made-up “Kopi Senja” example data. Keys ← → to browse, Esc to close.</p>
          </div>
        </div>
        <p className="mt-5 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
          More {c.family.toLowerCase()} · {siblings.length}
        </p>
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {siblings.map((s) => {
            const at = list.indexOf(s);
            return (
              <button
                key={s.id}
                type="button"
                disabled={at < 0}
                onClick={() => onGo(at)}
                title={s.name}
                className={`w-[120px] shrink-0 rounded-xl border p-1 text-left transition ${s.id === c.id ? "border-ink" : "border-line hover:border-ink/40"} disabled:opacity-30`}
              >
                <div className="pointer-events-none">
                  <s.C />
                </div>
                <span className="mt-0.5 block truncate px-0.5 text-[10px]">{s.name}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Tile({ c, view, onOpen }: { c: ChartDef; view: View; onOpen: () => void }) {
  if (view === "wall")
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group flex flex-col rounded-2xl border border-line bg-white p-1.5 text-left transition hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_10px_30px_-14px_rgba(11,11,11,0.35)]"
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 160px" }}
      >
        <div className="pointer-events-none rounded-xl bg-cream/50 p-1">
          <c.C />
        </div>
        <span className="mt-1.5 truncate px-1 pb-0.5 text-[12px] font-semibold tracking-[-0.01em]">{c.name}</span>
      </button>
    );
  return (
    <article className="flex flex-col rounded-[22px] border border-line bg-white p-4" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 380px" }}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{c.name}</h3>
        <span className="font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-muted uppercase">{c.family}</span>
      </div>
      <button type="button" onClick={onOpen} className="mt-2 rounded-xl bg-cream/50 p-1.5 text-left" aria-label={`Open ${c.name}`}>
        <div className="pointer-events-none">
          <c.C />
        </div>
      </button>
      <p className="mt-3 text-[12.5px] leading-snug">
        <span className="font-semibold text-[#138a60]">Use: </span>
        {c.use}
      </p>
      <p className="mt-1 text-[12.5px] leading-snug text-ink-2/70">
        <span className="font-semibold text-[#c2410c]">Avoid: </span>
        {c.avoid}
      </p>
    </article>
  );
}

export function ChartLibrary() {
  const [group, setGroup] = useState<Group | "All">("All");
  const [family, setFamily] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("wall");
  const [open, setOpen] = useState<number | null>(null);
  const [vi, setVi] = useState(0);
  const V = VIEWS[vi];

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CHARTS.filter((c) => (group === "All" || c.group === group) && (!family || c.family === family) && (!needle || `${c.name} ${c.family} ${c.group} ${c.use}`.toLowerCase().includes(needle)));
  }, [group, family, q]);
  // sections: one per family, in catalogue order
  const sections = useMemo(() => {
    const out: { group: Group; family: string; items: ChartDef[] }[] = [];
    for (const g of GROUPS)
      for (const f of FAMILIES[g]) {
        const items = shown.filter((c) => c.group === g && c.family === f);
        if (items.length) out.push({ group: g, family: f, items });
      }
    return out;
  }, [shown]);
  const familyCount = GROUPS.reduce((s, g) => s + FAMILIES[g].length, 0);

  return (
    <>
      <section className="mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [CHARTS.length, "charts, all drawn from scratch"],
            [familyCount, "families, like every kind of bar"],
            [GROUPS.length, "questions they answer"],
            [CHARTS.filter((c) => c.family === "Columns" || c.family === "Horizontal bars").length, "ways to draw a bar alone"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-2xl bg-cream px-4 py-3">
              <p className="text-[30px] leading-none font-semibold tracking-[-0.04em]">{n}</p>
              <p className="mt-1 text-[12.5px] text-ink-2/65">{l}</p>
            </div>
          ))}
        </div>

        <div className="z-30 -mx-5 mt-6 bg-bg/90 px-5 py-3 backdrop-blur md:sticky md:top-[7.6rem] md:-mx-10 md:px-10">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1.5 focus-within:border-ink sm:max-w-[340px]">
              <Search className="h-4 w-4 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${CHARTS.length} charts: radar, target, survey…`}
                className="w-full bg-transparent text-[13px] outline-none"
              />
              {q && (
                <button type="button" aria-label="Clear search" onClick={() => setQ("")}>
                  <X className="h-3.5 w-3.5 text-muted" />
                </button>
              )}
            </label>
            <div className="flex rounded-full border border-ink/10 bg-white p-0.5">
              {(
                [
                  ["wall", Grid3x3, "Wall"],
                  ["cards", LayoutList, "Cards"],
                ] as const
              ).map(([k, Icon, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setView(k)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] transition-colors ${view === k ? "bg-ink text-white" : "text-ink/60 hover:text-ink"}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {l}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => shown.length && setOpen(Math.floor(Math.random() * shown.length))}
              className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[12.5px] hover:border-ink/30"
            >
              <Shuffle className="h-3.5 w-3.5" /> Surprise me
            </button>
            <span className="ml-auto font-mono text-[11px] text-muted">
              {shown.length} of {CHARTS.length}
            </span>
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {(["All", ...GROUPS] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGroup(g);
                  setFamily(null);
                }}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${group === g ? "border-ink bg-ink text-white" : "border-ink/10 bg-white hover:border-ink/30"}`}
              >
                {g}
                <span className={group === g ? "text-white/60" : "text-muted"}> {g === "All" ? CHARTS.length : CHARTS.filter((c) => c.group === g).length}</span>
              </button>
            ))}
          </div>
          {group !== "All" && (
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
              {FAMILIES[group].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFamily(family === f ? null : f)}
                  className={`rounded-full px-3 py-1 text-[12px] whitespace-nowrap transition-colors ${family === f ? "bg-[#2a78d6] text-white" : "bg-ink/[0.05] text-ink/70 hover:bg-ink/10"}`}
                >
                  {f} <span className={family === f ? "text-white/70" : "text-muted"}>{CHARTS.filter((c) => c.group === group && c.family === f).length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {sections.length === 0 && <p className="mt-10 text-center text-[14px] text-muted">No chart matches “{q}”. Try “bar”, “time” or “share”.</p>}
        {sections.map((s) => (
          <div key={`${s.group}-${s.family}`} className="mt-8">
            <div className="mb-3 flex items-baseline gap-3 border-b border-line pb-2">
              <h2 className="text-[20px] font-semibold tracking-[-0.02em]">{s.family}</h2>
              <span className="font-mono text-[11px] text-muted">
                {s.group} · {s.items.length}
              </span>
            </div>
            <div className={view === "wall" ? "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid gap-3 md:grid-cols-2 lg:grid-cols-3"}>
              {s.items.map((c) => (
                <Tile key={c.id} c={c} view={view} onOpen={() => setOpen(shown.indexOf(c))} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <AnimatePresence>{open !== null && shown[open] && <Lightbox list={shown} index={open} onClose={() => setOpen(null)} onGo={setOpen} />}</AnimatePresence>

      <section className="mx-auto mt-28 max-w-[1240px] px-5 md:px-10">
        <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">Same data, different chart</p>
        <h2 className="max-w-3xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">The data doesn&apos;t change. How easy it is to read does.</h2>
        <div className="mt-8 grid gap-6 rounded-[28px] bg-cream p-5 sm:p-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[14px] text-ink-2/75">Revenue share of five products, drawn {VIEWS.length} ways.</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {VIEWS.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVi(i)}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${vi === i ? "border-ink bg-ink text-white" : "border-ink/10 bg-white hover:border-ink/30"}`}
                >
                  {v.id}
                </button>
              ))}
            </div>
            <p className="mt-5 text-[15px] leading-relaxed">{V.note}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <V.C />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-[1240px] px-5 md:px-10">
        <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">Bad chart → better chart</p>
        <h2 className="max-w-3xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">{FIXES.length} common mistakes, fixed.</h2>
        <div className="mt-8 space-y-4">
          {FIXES.map((f) => (
            <div key={f.t} className="grid gap-4 rounded-[24px] border border-line bg-white p-4 sm:p-6 lg:grid-cols-[0.7fr_1fr_1fr]">
              <div>
                <p className="text-[18px] font-semibold tracking-[-0.02em]">{f.t}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2/75">{f.d}</p>
              </div>
              <div>
                <p className="mb-1 font-mono text-[10.5px] tracking-[0.14em] text-[#e34948] uppercase">✗ Misleading</p>
                <div className="rounded-xl bg-[#e34948]/[0.04] p-1.5">
                  <f.bad />
                </div>
              </div>
              <div>
                <p className="mb-1 font-mono text-[10.5px] tracking-[0.14em] text-[#138a60] uppercase">✓ Better</p>
                <div className="rounded-xl bg-[#1baf7a]/[0.06] p-1.5">
                  <f.good />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
