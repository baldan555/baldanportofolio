"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/*
 * Live Core Web Vitals of this page, measured in the visitor's browser with PerformanceObserver (the same signals
 * Google's web-vitals library reads), plus two experiments that make them worse for real: a delayed layout shift and
 * a click that blocks the main thread. Nothing is sent anywhere.
 */
const GR = "#1baf7a";
const AM = "#c29a00";
const RD = "#c8413f";
const INK = "#0b0b0b";
type Key = "lcp" | "inp" | "cls" | "fcp" | "ttfb";
const META: Record<Key, { name: string; long: string; unit: "ms" | ""; good: number; poor: number; what: string }> = {
  lcp: { name: "LCP", long: "Largest Contentful Paint", unit: "ms", good: 2500, poor: 4000, what: "when the biggest thing on screen finished painting" },
  inp: { name: "INP", long: "Interaction to Next Paint", unit: "ms", good: 200, poor: 500, what: "how long the page takes to react to your clicks and taps" },
  cls: { name: "CLS", long: "Cumulative Layout Shift", unit: "", good: 0.1, poor: 0.25, what: "how much things jump around while you read" },
  fcp: { name: "FCP", long: "First Contentful Paint", unit: "ms", good: 1800, poor: 3000, what: "when the first text or image appeared" },
  ttfb: { name: "TTFB", long: "Time to First Byte", unit: "ms", good: 800, poor: 1800, what: "how long the server took to start answering" },
};
const rating = (k: Key, v: number) => (v <= META[k].good ? "good" : v <= META[k].poor ? "needs improvement" : "poor");
const color = (k: Key, v: number) => (v <= META[k].good ? GR : v <= META[k].poor ? AM : RD);
const fmt = (k: Key, v: number) => (k === "cls" ? v.toFixed(3) : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`);

/** Burn the main thread for `ms` (a stand-in for heavy JavaScript in a click handler). */
function blockMainThread(ms: number) {
  const end = performance.now() + ms;
  let x = 0;
  while (performance.now() < end) x += Math.sqrt(x + 1);
  return x;
}

type State = Record<Key, number | null> & { interactions: number; last: number | null; support: Record<"lcp" | "cls" | "inp", boolean> };
function useVitals() {
  const [s, setS] = useState<State>({ lcp: null, inp: null, cls: null, fcp: null, ttfb: null, interactions: 0, last: null, support: { lcp: true, cls: true, inp: true } });
  useEffect(() => {
    const types = (typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes) || [];
    const support = { lcp: types.includes("largest-contentful-paint"), cls: types.includes("layout-shift"), inp: types.includes("event") };
    const live = { lcp: null as number | null, fcp: null as number | null, cls: 0, inp: null as number | null, interactions: 0, last: null as number | null };
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const ttfb = nav ? nav.responseStart : null;
    const push = () => setS({ lcp: live.lcp, fcp: live.fcp, cls: support.cls ? live.cls : null, inp: live.inp, ttfb, interactions: live.interactions, last: live.last, support });
    const obs: PerformanceObserver[] = [];
    const watch = (type: string, cb: (list: PerformanceObserverEntryList) => void, extra: Record<string, unknown> = {}) => {
      try {
        const o = new PerformanceObserver((l) => {
          cb(l);
          push();
        });
        o.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
        obs.push(o);
      } catch {
        /* not supported in this browser */
      }
    };
    watch("paint", (l) => {
      for (const e of l.getEntries()) if (e.name === "first-contentful-paint") live.fcp = e.startTime;
    });
    watch("largest-contentful-paint", (l) => {
      const e = l.getEntries();
      if (e.length) live.lcp = e[e.length - 1].startTime;
    });
    // CLS: the biggest "session window" of shifts (gaps under 1 s, windows under 5 s), ignoring shifts right after input
    let win = 0,
      first = 0,
      lastT = 0;
    watch("layout-shift", (l) => {
      for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (e.hadRecentInput) continue;
        if (win && e.startTime - lastT < 1000 && e.startTime - first < 5000) win += e.value;
        else {
          win = e.value;
          first = e.startTime;
        }
        lastT = e.startTime;
        live.cls = Math.max(live.cls, win);
      }
    });
    // INP: the slowest interaction (98th percentile once there are many)
    const byId = new Map<number, number>();
    watch(
      "event",
      (l) => {
        for (const e of l.getEntries() as (PerformanceEntry & { interactionId?: number })[]) {
          if (!e.interactionId) continue;
          byId.set(e.interactionId, Math.max(byId.get(e.interactionId) ?? 0, e.duration));
          live.last = e.duration;
        }
        const d = [...byId.values()].sort((a, b) => b - a);
        live.interactions = d.length;
        live.inp = d.length ? d[Math.min(d.length - 1, Math.floor(d.length / 50))] : null;
      },
      { durationThreshold: 16 },
    );
    const id = window.setTimeout(push, 0);
    return () => {
      window.clearTimeout(id);
      obs.forEach((o) => o.disconnect());
    };
  }, []);
  return s;
}

function Gauge({ k, v, supported }: { k: Key; v: number | null; supported: boolean }) {
  const m = META[k];
  const max = m.poor * 1.6;
  const ang = (x: number) => Math.PI * (1 - Math.min(1, x / max));
  const pt = (x: number, r: number) => [Math.round((60 + Math.cos(ang(x)) * r) * 10) / 10, Math.round((62 - Math.sin(ang(x)) * r) * 10) / 10];
  const arc = (a: number, b: number) => {
    const [x0, y0] = pt(a, 48),
      [x1, y1] = pt(b, 48);
    return `M${x0},${y0} A48,48 0 0 1 ${x1},${y1}`;
  };
  const c = v == null ? "rgba(11,11,11,0.25)" : color(k, v);
  const [nx, ny] = pt(v ?? 0, 40);
  return (
    <div className="flex flex-col rounded-[20px] border border-line bg-white p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold">{m.name}</p>
        <p className="truncate text-[10.5px] text-ink-2/50">{m.long}</p>
      </div>
      <svg viewBox="0 0 120 72" className="mt-1 h-auto w-full" aria-hidden>
        <path d={arc(0, m.good)} stroke={GR} strokeWidth={9} fill="none" strokeLinecap="butt" opacity={0.85} />
        <path d={arc(m.good, m.poor)} stroke={AM} strokeWidth={9} fill="none" opacity={0.85} />
        <path d={arc(m.poor, max)} stroke={RD} strokeWidth={9} fill="none" opacity={0.85} />
        {v != null && (
          <motion.line x1={60} y1={62} initial={false} animate={{ x2: nx, y2: ny }} transition={{ type: "spring", stiffness: 120, damping: 14 }} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        )}
        <circle cx={60} cy={62} r={4} fill={INK} />
      </svg>
      <p className="mt-1 text-[1.5rem] leading-none font-semibold tracking-[-0.03em] tabular-nums" style={{ color: c }}>
        {!supported ? "n/a" : v == null ? (k === "inp" ? "click!" : "…") : fmt(k, v)}
      </p>
      <p className="mt-1 text-[11px] font-semibold" style={{ color: c }}>
        {!supported ? "not measured by this browser" : v == null ? (k === "inp" ? "no interaction yet" : "not reported yet") : rating(k, v)}
      </p>
      <p className="mt-1.5 flex-1 text-[11.5px] leading-snug text-ink-2/60">{m.what}</p>
      <p className="mt-2 font-mono text-[10px] text-ink-2/45">
        good ≤ {fmt(k, m.good)} · poor &gt; {fmt(k, m.poor)}
      </p>
    </div>
  );
}

export function VitalsLab() {
  const v = useVitals();
  const [banners, setBanners] = useState(0);
  const [pending, setPending] = useState(false);
  const [frozen, setFrozen] = useState(0);
  const [fast, setFast] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  const jump = () => {
    setPending(true);
    // the shift must come >500 ms after the click, otherwise browsers treat it as expected and don't count it
    timer.current = window.setTimeout(() => {
      setBanners((b) => b + 1);
      setPending(false);
    }, 900);
  };
  const freeze = () => {
    blockMainThread(300);
    setFrozen((f) => f + 1);
  };
  const order: Key[] = ["lcp", "inp", "cls", "fcp", "ttfb"];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        {order.map((k) => (
          <Gauge key={k} k={k} v={v[k]} supported={k === "lcp" ? v.support.lcp : k === "cls" ? v.support.cls : k === "inp" ? v.support.inp : true} />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[24px] bg-ink p-5 text-white">
          <p className="font-mono text-[11px] tracking-[0.16em] text-white/45 uppercase">Break it on purpose</p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-[14px] font-semibold">Make the layout jump</p>
              <p className="mt-0.5 text-[12.5px] text-white/65">A banner appears a second later and pushes the cards on the right down, like a late-loading ad. Watch CLS.</p>
              <button type="button" onClick={jump} disabled={pending} className="mt-2 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-ink disabled:opacity-50">
                {pending ? "Wait for it…" : "Insert a late banner"}
              </button>
            </div>
            <div>
              <p className="text-[14px] font-semibold">Freeze the page</p>
              <p className="mt-0.5 text-[12.5px] text-white/65">This button runs 300 ms of heavy JavaScript before the page can repaint. Compare it with the fast one, and watch INP.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={freeze} className="rounded-full bg-[#c8413f] px-3.5 py-1.5 text-[12.5px] font-semibold text-white">
                  Slow button {frozen ? `(${frozen})` : ""}
                </button>
                <button type="button" onClick={() => setFast((f) => f + 1)} className="rounded-full bg-white/15 px-3.5 py-1.5 text-[12.5px] font-semibold text-white">
                  Fast button {fast ? `(${fast})` : ""}
                </button>
              </div>
              <p className="mt-2 font-mono text-[11px] text-white/60">
                {v.last != null ? `your last interaction took ${Math.round(v.last)} ms · ${v.interactions} measured` : v.support.inp ? "click anything to measure an interaction" : "this browser doesn't report interactions"}
              </p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[24px] border border-line bg-cream/50 p-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Test stage</p>
          <AnimatePresence initial={false}>
            {Array.from({ length: banners }, (_, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex h-[72px] items-center justify-center rounded-2xl bg-[#eb6834] text-[13px] font-semibold text-white">
                Late banner #{i + 1}: everything below just moved
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {["Article", "Product", "Price", "Reviews"].map((t) => (
              <div key={t} className="rounded-2xl bg-white p-3">
                <p className="text-[13px] font-semibold">{t}</p>
                <div className="mt-2 h-2 w-4/5 rounded-full bg-ink/10" />
                <div className="mt-1.5 h-2 w-3/5 rounded-full bg-ink/10" />
              </div>
            ))}
          </div>
          {banners > 0 && (
            <button type="button" onClick={() => setBanners(0)} className="mt-3 text-[12px] font-semibold text-ink/60 underline underline-offset-4">
              Remove the banners
            </button>
          )}
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        Measured in your browser with the same signals Google&apos;s web-vitals library uses; thresholds are Google&apos;s. Values are for this page visit only and can&apos;t be reset without reloading. Safari and Firefox don&apos;t report every metric, so some may show n/a.
      </p>
    </div>
  );
}
