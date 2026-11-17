"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useWidth } from "../data-eng/use-width";

/**
 * "One app, every screen": the same small app (Jakarta air, live from Open-Meteo) re-arranges itself for a laptop,
 * a tablet, a phone and a watch. Every block is positioned per device and animates to its new place.
 */
type Dev = "laptop" | "tablet" | "phone" | "watch";
const ORDER: Dev[] = ["laptop", "tablet", "phone", "watch"];
const STAGE = { w: 700, h: 480 };
const SCREEN: Record<Dev, { w: number; h: number; r: number; pad: number; label: string; note: string }> = {
  laptop: { w: 600, h: 360, r: 10, pad: 12, label: "Laptop", note: "a web app in the browser: wide, a sidebar, everything at once" },
  tablet: { w: 380, h: 440, r: 18, pad: 14, label: "Tablet", note: "the same web app, re-flowed into a column" },
  phone: { w: 220, h: 430, r: 30, pad: 10, label: "Phone", note: "a mobile app: one column, a tab bar, thumbs first" },
  watch: { w: 170, h: 190, r: 46, pad: 12, label: "Watch", note: "one number at a glance" },
};
type B = { x: number; y: number; w: number; h: number; o: number };
const HIDE = (x: number, y: number): B => ({ x, y, w: 0, h: 0, o: 0 });
const LAYOUT: Record<Dev, Record<string, B>> = {
  laptop: {
    top: { x: 0, y: 0, w: 600, h: 34, o: 1 },
    side: { x: 0, y: 34, w: 118, h: 326, o: 1 },
    k1: { x: 134, y: 50, w: 140, h: 72, o: 1 },
    k2: { x: 286, y: 50, w: 140, h: 72, o: 1 },
    k3: { x: 438, y: 50, w: 146, h: 72, o: 1 },
    chart: { x: 134, y: 136, w: 300, h: 208, o: 1 },
    list: { x: 446, y: 136, w: 138, h: 208, o: 1 },
    tabs: HIDE(300, 360),
    ring: HIDE(300, 180),
  },
  tablet: {
    top: { x: 0, y: 0, w: 380, h: 36, o: 1 },
    side: HIDE(0, 200),
    k1: { x: 14, y: 50, w: 110, h: 66, o: 1 },
    k2: { x: 135, y: 50, w: 110, h: 66, o: 1 },
    k3: { x: 256, y: 50, w: 110, h: 66, o: 1 },
    chart: { x: 14, y: 128, w: 352, h: 164, o: 1 },
    list: { x: 14, y: 304, w: 352, h: 122, o: 1 },
    tabs: HIDE(190, 440),
    ring: HIDE(190, 220),
  },
  phone: {
    top: { x: 0, y: 0, w: 220, h: 42, o: 1 },
    side: HIDE(0, 200),
    k1: { x: 12, y: 52, w: 196, h: 64, o: 1 },
    k2: { x: 12, y: 124, w: 94, h: 52, o: 1 },
    k3: { x: 114, y: 124, w: 94, h: 52, o: 1 },
    chart: { x: 12, y: 184, w: 196, h: 118, o: 1 },
    list: { x: 12, y: 310, w: 196, h: 66, o: 1 },
    tabs: { x: 0, y: 384, w: 220, h: 46, o: 1 },
    ring: HIDE(110, 200),
  },
  watch: {
    top: HIDE(85, 0),
    side: HIDE(0, 95),
    k1: { x: 18, y: 142, w: 134, h: 34, o: 1 },
    k2: HIDE(85, 160),
    k3: HIDE(85, 160),
    chart: HIDE(85, 95),
    list: HIDE(85, 180),
    tabs: HIDE(85, 190),
    ring: { x: 35, y: 18, w: 100, h: 100, o: 1 },
  },
};

type Live = { pm: number | null; temp: number | null; wind: number | null; day: number[]; next: [string, number][]; time: string };
const ease = [0.22, 1, 0.36, 1] as const;

function useAirLive() {
  const [live, setLive] = useState<Live | null>(null);
  useEffect(() => {
    let alive = true;
    const ctl = new AbortController();
    const base = "latitude=-6.2&longitude=106.85&timezone=Asia%2FJakarta";
    Promise.all([
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${base}&hourly=pm2_5&current=pm2_5&past_days=1&forecast_days=2`, { signal: ctl.signal }).then((r) => r.json()),
      fetch(`https://api.open-meteo.com/v1/forecast?${base}&current=temperature_2m,wind_speed_10m`, { signal: ctl.signal }).then((r) => r.json()),
    ])
      .then(([a, w]) => {
        if (!alive) return;
        const time: string[] = a.hourly?.time ?? [];
        const vals: (number | null)[] = a.hourly?.pm2_5 ?? [];
        const nowT = String(a.current?.time ?? "").slice(0, 13);
        const i = Math.max(0, time.findIndex((t) => t.slice(0, 13) === nowT));
        const day = vals.slice(Math.max(0, i - 23), i + 1).filter((v): v is number => v != null);
        const next = time
          .slice(i + 1, i + 5)
          .map((t, k) => [t.slice(11, 16), vals[i + 1 + k]] as [string, number | null])
          .filter((x): x is [string, number] => x[1] != null);
        setLive({ pm: a.current?.pm2_5 ?? null, temp: w.current?.temperature_2m ?? null, wind: w.current?.wind_speed_10m ?? null, day, next, time: nowT.slice(11) ? `${nowT.slice(11)}:00 WIB` : "" });
      })
      .catch(() => alive && setLive({ pm: null, temp: null, wind: null, day: [], next: [], time: "" }));
    return () => {
      alive = false;
      ctl.abort();
    };
  }, []);
  return live;
}

const Bars = ({ v, accent }: { v: number[]; accent?: boolean }) => {
  const max = Math.max(1, ...v);
  return (
    <div className="flex h-full w-full items-end gap-[2px]">
      {(v.length ? v : Array.from({ length: 24 }, () => 0)).map((x, i, a) => (
        <span key={i} className="min-w-0 flex-1 rounded-t-[2px]" style={{ height: `${Math.max(4, Math.round((x / max) * 100))}%`, background: accent && i === a.length - 1 ? "#eb6834" : x > 55 ? "#f19a4a" : "#7fb0dc" }} />
      ))}
    </div>
  );
};

function Block({ id, dev, children, className = "" }: { id: string; dev: Dev; children?: React.ReactNode; className?: string }) {
  const b = LAYOUT[dev][id];
  return (
    <motion.div initial={false} animate={{ left: b.x, top: b.y, width: b.w, height: b.h, opacity: b.o }} transition={{ duration: 0.75, ease }} className={`absolute overflow-hidden ${className}`}>
      {children}
    </motion.div>
  );
}

export function DeviceShowcase() {
  const [dev, setDev] = useState<Dev>("laptop");
  const [hold, setHold] = useState(0);
  const [ref, width] = useWidth(700);
  const live = useAirLive();
  const s = SCREEN[dev];
  const scale = Math.min(1, width / STAGE.w);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setDev((d) => ORDER[(ORDER.indexOf(d) + 1) % ORDER.length]), hold ? 9000 : 3400);
    return () => window.clearTimeout(id);
  }, [dev, hold]);

  const pm = live?.pm;
  const k = (label: string, value: string, unit: string) => (
    <div className="flex h-full flex-col justify-between rounded-[10px] bg-[#f6f3ee] p-2">
      <span className="truncate text-[9px] text-ink/50">{label}</span>
      <span className="truncate text-[17px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
        {value}
        <span className="ml-0.5 text-[9px] font-normal text-ink/45">{unit}</span>
      </span>
    </div>
  );
  return (
    <section id="screens" className="mx-auto mt-12 max-w-[1240px] scroll-mt-32 px-5 md:px-10">
      <div className="grid items-center gap-6 rounded-[28px] border border-line bg-cream/50 p-5 sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">One app, every screen</p>
          <h2 className="mt-2 text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.5rem]">The same product, wherever people are.</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2/70">
            A web app, a SaaS and a mobile app are mostly the same thing delivered three ways: one set of data and rules, many screens. This little app shows Jakarta&apos;s air right now, live, and re-arranges itself for each device.
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Device">
            {ORDER.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dev === d}
                onClick={() => {
                  setDev(d);
                  setHold((h) => h + 1);
                }}
                className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${dev === d ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink"}`}
              >
                {SCREEN[d].label}
              </button>
            ))}
          </div>
          <p className="mt-3 min-h-[2.5em] text-[13px] text-ink-2/60">{s.note}</p>
        </div>

        <div ref={ref} className="relative w-full" style={{ height: STAGE.h * scale }}>
          <div className="absolute top-0 left-1/2 origin-top" style={{ width: STAGE.w, height: STAGE.h, transform: `translateX(-50%) scale(${scale})` }}>
            {/* device body */}
            <motion.div
              initial={false}
              animate={{ width: s.w + s.pad * 2, height: s.h + s.pad * 2, left: (STAGE.w - s.w - s.pad * 2) / 2, top: dev === "laptop" ? 20 : (STAGE.h - s.h - s.pad * 2) / 2, borderRadius: s.r + s.pad }}
              transition={{ duration: 0.75, ease }}
              className="absolute bg-ink shadow-[0_24px_60px_-24px_rgba(11,11,11,0.45)]"
            />
            <motion.div initial={false} animate={{ opacity: dev === "laptop" ? 1 : 0, scaleX: dev === "laptop" ? 1 : 0.4 }} transition={{ duration: 0.6, ease }} className="absolute rounded-b-[14px] bg-[#2a2a2a]" style={{ left: 30, top: 20 + 360 + 24, width: 640, height: 18 }} />
            {/* the screen */}
            <motion.div
              initial={false}
              animate={{ width: s.w, height: s.h, left: (STAGE.w - s.w) / 2, top: dev === "laptop" ? 20 + s.pad : (STAGE.h - s.h) / 2, borderRadius: s.r }}
              transition={{ duration: 0.75, ease }}
              className="absolute overflow-hidden bg-white"
            >
              <Block id="top" dev={dev} className="flex items-center gap-2 border-b border-ink/5 px-3">
                <span className="h-4 w-4 shrink-0 rounded-md bg-ink" />
                <span className="truncate text-[11px] font-semibold">Jakarta Air</span>
                <span className="ml-auto h-4 w-4 shrink-0 rounded-full bg-[#eb6834]/80" />
              </Block>
              <Block id="side" dev={dev} className="space-y-1.5 bg-[#f6f3ee] p-3">
                {["Overview", "Forecast", "Alerts", "Settings"].map((t, i) => (
                  <span key={t} className={`block truncate rounded-md px-2 py-1 text-[10px] ${i === 0 ? "bg-ink text-white" : "text-ink/60"}`}>
                    {t}
                  </span>
                ))}
              </Block>
              <Block id="k1" dev={dev}>
                {k("PM2.5 now", pm != null ? pm.toFixed(1) : "…", "µg/m³")}
              </Block>
              <Block id="k2" dev={dev}>
                {k("Temperature", live?.temp != null ? live.temp.toFixed(1) : "…", "°C")}
              </Block>
              <Block id="k3" dev={dev}>
                {k("Wind", live?.wind != null ? live.wind.toFixed(0) : "…", "km/h")}
              </Block>
              <Block id="chart" dev={dev} className="flex flex-col rounded-[10px] bg-[#f6f3ee] p-2.5">
                <span className="mb-1.5 truncate text-[9px] text-ink/50">PM2.5, last 24 hours</span>
                <div className="min-h-0 flex-1">
                  <Bars v={live?.day ?? []} accent />
                </div>
              </Block>
              <Block id="list" dev={dev} className="rounded-[10px] bg-[#f6f3ee] p-2.5">
                <span className="block truncate text-[9px] text-ink/50">Next hours (CAMS forecast)</span>
                {(live?.next.length ? live.next : ([["…", 0]] as [string, number][])).map(([t, v]) => (
                  <span key={t} className="mt-1 flex justify-between text-[10px] tabular-nums">
                    <span className="text-ink/55">{t}</span>
                    <span className="font-semibold">{v ? v.toFixed(0) : ""}</span>
                  </span>
                ))}
              </Block>
              <Block id="tabs" dev={dev} className="flex items-center justify-around border-t border-ink/5 bg-white">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-5 w-5 rounded-lg ${i === 0 ? "bg-ink" : "bg-ink/15"}`} />
                ))}
              </Block>
              <Block id="ring" dev={dev} className="grid place-items-center">
                <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
                  <circle cx={50} cy={50} r={42} fill="none" stroke="#f1eee8" strokeWidth={10} />
                  <circle cx={50} cy={50} r={42} fill="none" stroke="#eb6834" strokeWidth={10} strokeLinecap="round" strokeDasharray={`${Math.round(Math.min(1, (pm ?? 0) / 100) * 264)} 264`} transform="rotate(-90 50 50)" />
                  <text x={50} y={56} textAnchor="middle" fontSize={20} fontWeight={800} fill="#0b0b0b">
                    {pm != null ? Math.round(pm) : "…"}
                  </text>
                </svg>
              </Block>
            </motion.div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-right text-[11px] text-ink-2/45">
        Live data: Open-Meteo (CAMS air quality and weather, CC BY 4.0){live?.time ? `, ${live.time}` : ""}.
      </p>
    </section>
  );
}
