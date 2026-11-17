"use client";

import { useRef, useState } from "react";
import { useWidth } from "../../data-eng/use-width";

/*
 * Responsive playground: a small shop page built with real CSS container queries (Tailwind's @container variants),
 * inside a frame whose width you drag. The layout switches exactly where the CSS says, and the active rules light up.
 */
const RULES = [
  { at: 512, name: "@lg · 512 px", cls: "@lg:grid-cols-2", what: "products in 2 columns" },
  { at: 672, name: "@2xl · 672 px", cls: "@2xl:flex  @2xl:hidden", what: "menu links appear, the ☰ button hides" },
  { at: 768, name: "@3xl · 768 px", cls: "@3xl:grid-cols-3  @3xl:text-[34px]", what: "3 columns and a bigger headline" },
  { at: 896, name: "@4xl · 896 px", cls: "@4xl:grid-cols-[170px_1fr]  @4xl:block", what: "a filter sidebar appears" },
];
const PRESETS: [string, number][] = [
  ["Small phone", 360],
  ["iPhone", 390],
  ["Tablet", 768],
  ["Laptop", 1024],
];
const PRODUCTS = [
  ["Kopi Toraja", "Rp 85.000", "#a9c6ea"],
  ["Kopi Gayo", "Rp 92.000", "#f3cd7a"],
  ["Kopi Kintamani", "Rp 78.000", "#c7e6d5"],
  ["Cold brew", "Rp 45.000", "#f5c1a8"],
  ["Drip bag ×10", "Rp 60.000", "#d9d0f5"],
  ["Grinder", "Rp 350.000", "#e4ded2"],
];

export function ResponsiveLab() {
  const [ref, box] = useWidth(1000);
  const [want, setWant] = useState(390);
  const drag = useRef<{ x: number; w: number } | null>(null);
  const max = Math.max(300, box);
  const w = Math.min(max, Math.max(300, want));
  const active = RULES.filter((r) => w >= r.at);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map(([label, px]) => (
          <button key={label} type="button" onClick={() => setWant(px)} aria-pressed={w === Math.min(max, px)} className={`rounded-full px-3 py-1.5 text-[12px] ${w === Math.min(max, px) ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink"}`}>
            {label} <span className="font-mono text-[10.5px] opacity-60">{px}</span>
          </button>
        ))}
        <input type="range" min={300} max={max} value={w} onChange={(e) => setWant(Number(e.target.value))} aria-label="Width" className="min-w-[140px] flex-1 accent-[#eb6834]" />
        <span className="rounded-full bg-ink px-3 py-1 font-mono text-[12px] text-white tabular-nums">{w} px</span>
      </div>

      <div ref={ref} className="rounded-[24px] bg-[repeating-linear-gradient(45deg,#f4f1eb,#f4f1eb_8px,#efebe3_8px,#efebe3_16px)] p-3">
        <div className="relative" style={{ width: w, maxWidth: "100%" }}>
          {/* the page under test: every layout change below is a real container query */}
          <div className="@container overflow-hidden rounded-xl bg-white ring-1 ring-line shadow-[0_10px_30px_-18px_rgba(11,11,11,0.4)]">
            <header className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                <span className="h-4 w-4 rounded-md bg-[#eb6834]" /> Toko Kopi
              </span>
              <nav className="hidden gap-3 text-[12px] text-ink/70 @2xl:flex">
                <span>Shop</span>
                <span>Deals</span>
                <span>About</span>
                <span className="font-semibold text-ink">Cart (2)</span>
              </nav>
              <span className="rounded-md border border-line px-1.5 text-[13px] @2xl:hidden">☰</span>
            </header>
            <div className="grid @4xl:grid-cols-[170px_1fr]">
              <aside className="hidden border-r border-line p-3 @4xl:block">
                <p className="text-[11px] font-semibold">Filter</p>
                {["Single origin", "Blends", "Equipment", "Under Rp 100k"].map((f) => (
                  <label key={f} className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink/70">
                    <span className="h-3 w-3 rounded border border-line" /> {f}
                  </label>
                ))}
              </aside>
              <main className="p-3">
                <h3 className="text-[22px] leading-tight font-semibold tracking-[-0.03em] @3xl:text-[34px]">Fresh Indonesian coffee, delivered.</h3>
                <p className="mt-1 text-[12px] text-ink/60">Roasted this week in Makassar.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 @lg:grid-cols-2 @3xl:grid-cols-3">
                  {PRODUCTS.map(([n, p, c]) => (
                    <div key={n} className="flex items-center gap-2 rounded-lg border border-line p-2 @lg:block">
                      <div className="h-10 w-10 shrink-0 rounded-md @lg:h-16 @lg:w-full" style={{ background: c }} />
                      <div className="@lg:mt-1.5">
                        <p className="text-[12px] font-semibold">{n}</p>
                        <p className="font-mono text-[11px] text-ink/60">{p}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </main>
            </div>
          </div>
          {/* drag handle */}
          <button
            type="button"
            aria-label="Drag to resize"
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, w };
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current) setWant(drag.current.w + (e.clientX - drag.current.x));
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            className="absolute top-1/2 -right-2.5 grid h-14 w-5 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-full bg-ink text-[10px] text-white shadow"
          >
            ⋮
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[20px] border border-line bg-white p-3">
          <p className="text-[12px] font-semibold">Breakpoints in this page&apos;s CSS</p>
          <div className="mt-2 space-y-1.5">
            {RULES.map((r) => {
              const on = w >= r.at;
              return (
                <div key={r.at} className={`flex items-start gap-2 rounded-xl px-2.5 py-1.5 transition ${on ? "bg-[#eaf8f1]" : "bg-cream/50"}`}>
                  <span className="mt-[1px] text-[12px] font-bold" style={{ color: on ? "#1baf7a" : "rgba(11,11,11,0.3)" }}>
                    {on ? "✓" : "○"}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] font-semibold">{r.name}</span>
                    <span className="block text-[11.5px] text-ink-2/65">{r.what}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-[20px] bg-ink p-3 text-white">
          <p className="text-[12px] font-semibold">The classes doing it</p>
          <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed">
            <span className="text-white/45">{"<div class=\"@container\">"}</span>
            {"\n"}
            {RULES.map((r) => (
              <span key={r.at} style={{ color: w >= r.at ? "#7ee2b0" : "rgba(255,255,255,0.4)" }}>
                {`  ${r.cls}\n`}
              </span>
            ))}
          </pre>
          <p className="mt-2 text-[11.5px] text-white/60">
            {active.length ? `${active.length} of ${RULES.length} rules active at ${w} px.` : `At ${w} px only the mobile-first defaults apply.`} Container queries respond to the box, not the window, so the same component adapts wherever it&apos;s placed.
          </p>
        </div>
      </div>
      <p className="text-[11.5px] text-ink-2/55">Drag the black handle or use the slider. On a phone the frame can only shrink to your screen; open this on a laptop to see every layout.</p>
    </div>
  );
}
