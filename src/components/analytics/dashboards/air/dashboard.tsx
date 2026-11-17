"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { INK, PAL, nice, r1 } from "../../charts/kit";
import { Card } from "../sales/tiles";
import { MONTH_SHORT } from "@/lib/months";
import { AIR, CATS, ID_24H, WHO_24H, catOf, dayLabel, f1, fetchLive, hh, mean, runs, snapshot, type Series } from "./data";

const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
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
const at = (v: (number | null)[], i: number) => (i >= 0 && i < v.length ? v[i] : null);

/* ---------------------------------------------------------------- status */
function Status({ s }: { s: Series }) {
  const now = at(s.pm25, s.now);
  const avg = mean(s.pm25.slice(Math.max(0, s.now - 23), s.now + 1));
  const c = catOf(avg);
  const future = s.live ? s.pm25.slice(s.now + 1, s.now + 25) : [];
  const fx = future.map((v, k) => ({ v, k })).filter((x): x is { v: number; k: number } => x.v != null);
  const peak = fx.length ? fx.reduce((a, b) => (b.v > a.v ? b : a)) : null;
  const low = fx.length ? fx.reduce((a, b) => (b.v < a.v ? b : a)) : null;
  return (
    <section className="grid gap-4 rounded-[24px] p-5 text-white sm:p-7 md:grid-cols-[1.2fr_1fr] lg:col-span-12" style={{ background: `linear-gradient(135deg, ${c.color}, #0b0b0b 140%)` }}>
      <div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-white/70 uppercase">
          Jakarta · {dayLabel(s.time[s.now])} {hh(s.time[s.now])} WIB · {s.live ? `live, fetched ${s.fetchedAt}` : "saved data"}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="text-[4rem] leading-none font-semibold tracking-[-0.05em] tabular-nums sm:text-[5.5rem]">{f1(now)}</p>
          <p className="pb-2 text-[14px] text-white/80">µg/m³ PM2.5 this hour</p>
        </div>
        <p className="mt-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-[13px] font-semibold">
          24-hour average {f1(avg)} · {c.name}
        </p>
        <p className="mt-3 max-w-xl text-[14px] leading-snug text-white/85">{c.advice}</p>
      </div>
      <div className="grid content-start gap-2 text-[13px]">
        <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
          <p className="text-white/60">Against the 24-hour limits</p>
          <p className="mt-0.5">
            <span className="font-semibold">{f1(avg / WHO_24H)}×</span> the WHO guideline ({WHO_24H}) · <span className="font-semibold">{f1(avg / ID_24H)}×</span> Indonesia&apos;s standard ({ID_24H})
          </p>
        </div>
        <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
          <p className="text-white/60">Next 24 hours (CAMS forecast)</p>
          <p className="mt-0.5">
            {peak && low ? (
              <>
                peak <span className="font-semibold">{f1(peak.v)}</span> at {hh(s.time[s.now + 1 + peak.k])}, cleanest <span className="font-semibold">{f1(low.v)}</span> at{" "}
                {hh(s.time[s.now + 1 + low.k])}
              </>
            ) : (
              "Available when the live data loads."
            )}
          </p>
        </div>
        <p className="text-[11px] text-white/60">Category from the US EPA PM2.5 scale (2024 breakpoints); guidance simplified.</p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- KPIs */
function Kpis({ s }: { s: Series }) {
  const last7 = s.pm25.slice(Math.max(0, s.now - 167), s.now + 1);
  const over = last7.filter((v) => v != null && v > ID_24H).length;
  const next = s.live ? s.pm25.slice(s.now + 1, s.now + 25).filter((v): v is number => v != null) : [];
  const cards = [
    { k: "PM10 now", v: f1(at(s.pm10, s.now)), u: "µg/m³", note: "coarser dust and particles" },
    { k: "NO₂ now", v: f1(at(s.no2, s.now)), u: "µg/m³", note: "mostly traffic" },
    { k: "Ozone now", v: f1(at(s.o3, s.now)), u: "µg/m³", note: "peaks on sunny afternoons" },
    { k: "Hours over 55, 7 days", v: String(over), u: `of ${last7.length}`, note: "hourly PM2.5 above Indonesia's 24-h level" },
    { k: "Forecast peak, 24 h", v: next.length ? f1(Math.max(...next)) : "—", u: "µg/m³", note: "CAMS model" },
    { k: "Wind now", v: f1(at(s.wind, s.now)), u: "km/h", note: "wind usually clears the air" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 lg:col-span-12">
      {cards.map((c) => (
        <div key={c.k} className="rounded-[18px] border border-line bg-white p-3">
          <p className="truncate text-[11.5px] font-semibold text-ink-2/60">{c.k}</p>
          <p className="mt-1 text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
            {c.v} <span className="text-[11px] font-normal text-ink-2/50">{c.u}</span>
          </p>
          <p className="mt-1 truncate text-[10.5px] text-ink-2/45">{c.note}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- timeline */
function Timeline({ s }: { s: Series }) {
  const [hover, setHover] = useState<number | null>(null);
  const from = Math.max(0, s.now - 7 * 24);
  const to = Math.min(s.time.length - 1, s.now + 72);
  const n = to - from;
  const W = 680;
  const H = 260;
  const vals = s.pm25.slice(from, to + 1).filter((v): v is number => v != null);
  const ymax = Math.max(80, nice(Math.max(...vals, ...s.lstm) * 1.08));
  const x = (i: number) => r1(40 + ((i - from) / n) * (W - 50));
  const y = (v: number) => r1(H - 40 - (Math.min(v, ymax) / ymax) * (H - 60));
  const line = (a: number, b: number) =>
    s.pm25
      .slice(a, b + 1)
      .map((v, k) => (v == null ? null : `${x(a + k)},${y(v)}`))
      .filter(Boolean)
      .map((p, k) => `${k ? "L" : "M"}${p}`)
      .join(" ");
  const rainMax = Math.max(4, ...s.rain.slice(from, to + 1).map((v) => v ?? 0));
  const hv = hover ?? s.now;
  const lstmAt = (i: number) => (i > s.now && i - s.now - 1 < s.lstm.length ? s.lstm[i - s.now - 1] : null);
  return (
    <Card
      title="PM2.5, hour by hour"
      sub={`${dayLabel(s.time[hv])} ${hh(s.time[hv])}: ${f1(at(s.pm25, hv))} µg/m³${hv > s.now ? " (CAMS forecast)" : ""}${lstmAt(hv) != null ? ` · LSTM ${f1(lstmAt(hv))}` : ""}${at(s.rain, hv) ? ` · rain ${f1(at(s.rain, hv))} mm` : ""}`}
      className="lg:col-span-8"
      right={
        <div className="hidden shrink-0 flex-col items-end gap-0.5 text-[10.5px] text-ink-2/55 sm:flex">
          <span>— model history · - - CAMS forecast</span>
          <span>··· my LSTM (24 h) · bars: rain</span>
        </div>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Hourly PM2.5 for the past week and the next three days" onMouseLeave={() => setHover(null)}>
        {CATS.slice(0, 4).map((c, k) => {
          const lo = k ? CATS[k - 1].max : 0;
          if (lo >= ymax) return null;
          return <rect key={c.name} x={40} y={y(Math.min(c.max, ymax))} width={W - 50} height={r1(y(lo) - y(Math.min(c.max, ymax)))} fill={c.color} opacity={0.08} />;
        })}
        {[WHO_24H, ID_24H].map((v, k) => (
          <g key={v}>
            <line x1={40} x2={W - 10} y1={y(v)} y2={y(v)} stroke={k ? "#d93a3a" : "#2fa84f"} strokeDasharray="4 3" />
            <T x={W - 12} y={y(v) - 3} s={8.5} a="end" c={k ? "#d93a3a" : "#2fa84f"}>
              {k ? `Indonesia 24-h standard ${ID_24H}` : `WHO 24-h guideline ${WHO_24H}`}
            </T>
          </g>
        ))}
        {[0, ymax / 2, ymax].map((v) => (
          <T key={v} x={34} y={y(v) + 3} s={8.5} a="end" m>
            {Math.round(v)}
          </T>
        ))}
        {s.rain
          .slice(from, to + 1)
          .map((v, k) => (v ? <rect key={k} x={x(from + k)} y={r1(H - 40 - (v / rainMax) * 30)} width={r1((W - 50) / n)} height={r1((v / rainMax) * 30)} fill="#2a78d6" opacity={0.35} /> : null))}
        <path d={line(from, s.now)} fill="none" stroke={INK} strokeWidth={1.6} />
        {s.live && <path d={line(s.now, to)} fill="none" stroke={INK} strokeWidth={1.6} strokeDasharray="5 4" opacity={0.6} />}
        {s.lstm.length > 0 && (
          <path d={s.lstm.map((v, k) => `${k ? "L" : "M"}${x(s.now + 1 + k)},${y(v)}`).join(" ")} fill="none" stroke={PAL[3]} strokeWidth={2} strokeDasharray="1.5 3" strokeLinecap="round" />
        )}
        <line x1={x(s.now)} x2={x(s.now)} y1={14} y2={H - 40} stroke={INK} />
        <T x={x(s.now) > W - 40 ? x(s.now) - 4 : x(s.now) + 4} y={22} s={9} c={INK} w={700} a={x(s.now) > W - 40 ? "end" : "start"}>
          {"now"}
        </T>
        {s.time.slice(from, to + 1).map((t, k) =>
          t.endsWith("T00:00") ? (
            <g key={t}>
              <line x1={x(from + k)} x2={x(from + k)} y1={H - 40} y2={H - 34} stroke="rgba(11,11,11,0.3)" />
              <T x={x(from + k) + 3} y={H - 24} s={8.5}>
                {dayLabel(t)}
              </T>
            </g>
          ) : null,
        )}
        <circle cx={x(hv)} cy={at(s.pm25, hv) != null ? y(at(s.pm25, hv) as number) : 0} r={at(s.pm25, hv) != null ? 4 : 0} fill={catOf(at(s.pm25, hv) ?? 0).color} stroke="#fff" strokeWidth={1.5} />
        <rect
          x={40}
          y={10}
          width={W - 50}
          height={H - 50}
          fill="transparent"
          onMouseMove={(e) => {
            const box = (e.currentTarget as SVGRectElement).getBoundingClientRect();
            const i = from + Math.round(((e.clientX - box.left) / box.width) * n);
            setHover(Math.max(from, Math.min(to, i)));
          }}
        />
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- alerts */
function Alerts({ s }: { s: Series }) {
  const items: { tone: "bad" | "warn" | "ok" | "info"; t: string }[] = [];
  if (s.live) {
    const ahead = runs(s.pm25, s.now + 1, Math.min(s.time.length - 1, s.now + 72), (v) => v > ID_24H);
    if (ahead.length)
      ahead.slice(0, 3).forEach(([a, b]) => {
        const peak = Math.max(...(s.pm25.slice(a, b + 1).filter((v) => v != null) as number[]));
        items.push({ tone: "bad", t: `Forecast over ${ID_24H}: ${dayLabel(s.time[a])} ${hh(s.time[a])}–${hh(s.time[b])}, peak ${f1(peak)} µg/m³.` });
      });
    else items.push({ tone: "ok", t: `No hour over ${ID_24H} µg/m³ in the CAMS forecast for the next 3 days.` });
  }
  const back = runs(s.pm25, Math.max(0, s.now - 167), s.now, (v) => v > ID_24H);
  const hours = back.reduce((a, [p, q]) => a + q - p + 1, 0);
  const longest = back.reduce((a, [p, q]) => (q - p > a[1] - a[0] ? [p, q] : a), [0, -1] as [number, number]);
  items.push({
    tone: hours ? "warn" : "ok",
    t: hours
      ? `Past 7 days: ${hours} hours over ${ID_24H}; longest stretch ${longest[1] - longest[0] + 1} h, from ${dayLabel(s.time[longest[0]])} ${hh(s.time[longest[0]])}.`
      : `Past 7 days: no hour over ${ID_24H}.`,
  });
  const day = s.pm25.slice(Math.max(0, s.now - 23), s.now + 1);
  const minV = Math.min(...(day.filter((v) => v != null) as number[]));
  const minI = Math.max(0, s.now - 23) + day.indexOf(minV);
  items.push({ tone: "info", t: `Cleanest hour in the last 24: ${hh(s.time[minI])}, ${f1(minV)} µg/m³.` });
  if (s.live && s.lstm.length) {
    const cams = s.pm25.slice(s.now + 1, s.now + 1 + s.lstm.length);
    const gap = mean(cams.map((v, k) => (v == null ? null : Math.abs(v - s.lstm[k]))));
    items.push({ tone: "info", t: `The two forecasts differ by ${f1(gap)} µg/m³ per hour on average over the next day.` });
  }
  items.push({
    tone: s.live ? "ok" : "warn",
    t: s.live ? `Live data fetched at ${s.fetchedAt} WIB.` : `Showing saved data up to ${dayLabel(s.time[s.now])} ${hh(s.time[s.now])}; live data could not be loaded yet.`,
  });
  const tone = { bad: "#d93a3a", warn: "#f08a24", ok: "#2fa84f", info: "#2a78d6" };
  return (
    <Card title="Alerts" sub="Checked against the thresholds on every load" className="lg:col-span-4">
      <ul className="space-y-2">
        {items.map((it, k) => (
          <li key={k} className="flex gap-2 rounded-xl bg-ink/[0.03] p-2.5 text-[12.5px] leading-snug">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: tone[it.tone] }} />
            <span>{it.t}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------------------------------------------------------- daily rhythm, last 14 days */
function Rhythm({ s }: { s: Series }) {
  const days = Array.from(new Set(s.time.slice(0, s.now + 1).map((t) => t.slice(0, 10)))).slice(-14);
  const idx = new Map(s.time.map((t, i) => [t, i]));
  const cw = 22;
  const ch = 14;
  return (
    <Card title="The daily rhythm" sub="Last 14 days, one cell per hour, coloured by the EPA category" className="lg:col-span-6">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${50 + 24 * cw} ${18 + days.length * ch}`} className="h-auto w-full min-w-[420px]" role="img" aria-label="Heatmap of PM2.5 by day and hour">
          {Array.from({ length: 24 }, (_, h) =>
            h % 3 === 0 ? (
              <T key={h} x={50 + h * cw + cw / 2} y={11} s={8.5} a="middle" m>
                {String(h).padStart(2, "0")}
              </T>
            ) : null,
          )}
          {days.map((d, r) => (
            <g key={d}>
              <T x={44} y={18 + r * ch + 10} s={8.5} a="end">
                {dayLabel(`${d}T00:00`)}
              </T>
              {Array.from({ length: 24 }, (_, h) => {
                const i = idx.get(`${d}T${String(h).padStart(2, "0")}:00`);
                const v = i != null && i <= s.now ? s.pm25[i] : null;
                return (
                  <rect
                    key={h}
                    x={50 + h * cw}
                    y={18 + r * ch}
                    width={cw - 1.5}
                    height={ch - 1.5}
                    rx={2}
                    fill={v == null ? "rgba(11,11,11,0.04)" : catOf(v).color}
                    opacity={v == null ? 1 : 0.35 + 0.65 * Math.min(1, v / 120)}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[10.5px] text-ink-2/60">
        {CATS.slice(0, 5).map((c) => (
          <span key={c.name} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: c.color }} />
            {c.name}
          </span>
        ))}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- other pollutants and wind */
function Pollutants({ s }: { s: Series }) {
  const from = Math.max(0, s.now - 72);
  const to = Math.min(s.time.length - 1, s.now + 24);
  const list: [string, (number | null)[], string][] = [
    ["PM10", s.pm10, PAL[5]],
    ["NO₂", s.no2, PAL[1]],
    ["Ozone", s.o3, PAL[0]],
    ["CO", s.co, PAL[6]],
  ];
  return (
    <Card title="Other pollutants" sub="Past 3 days and the next day, µg/m³ (dashed = forecast)" className="lg:col-span-6">
      {!s.live ? (
        <p className="text-[12.5px] text-ink-2/55">Shown when the live data loads (the saved snapshot only keeps PM2.5).</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {list.map(([name, v, col]) => {
            const seg = v.slice(from, to + 1);
            const nums = seg.filter((x): x is number => x != null);
            const lo = Math.min(...nums);
            const hi = Math.max(...nums);
            const px = (k: number) => r1((k / (seg.length - 1)) * 200);
            const py = (x: number) => r1(54 - ((x - lo) / (hi - lo || 1)) * 46);
            const pts = (a: number, b: number) =>
              seg
                .slice(a, b + 1)
                .map((x, k) => (x == null ? null : `${px(a + k)},${py(x)}`))
                .filter(Boolean)
                .map((p, k) => `${k ? "L" : "M"}${p}`)
                .join(" ");
            const cut = s.now - from;
            return (
              <div key={name} className="rounded-xl bg-ink/[0.03] p-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold">{name}</span>
                  <span className="font-mono text-[11px]">{f1(at(v, s.now))}</span>
                </div>
                <svg viewBox="0 0 200 60" className="mt-1 h-auto w-full" aria-hidden>
                  <path d={pts(0, cut)} fill="none" stroke={col} strokeWidth={1.6} />
                  <path d={pts(cut, seg.length - 1)} fill="none" stroke={col} strokeWidth={1.6} strokeDasharray="4 3" opacity={0.6} />
                  <line x1={px(cut)} x2={px(cut)} y1={4} y2={58} stroke="rgba(11,11,11,0.25)" />
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
function Wind({ s }: { s: Series }) {
  const pairs = s.time.slice(0, s.now + 1).flatMap((_, i) => (s.wind[i] != null && s.pm25[i] != null ? [[s.wind[i] as number, s.pm25[i] as number]] : []));
  if (pairs.length < 24)
    return (
      <Card title="Does wind clear the air?" sub="Hourly wind speed against PM2.5" className="lg:col-span-4">
        <p className="text-[12.5px] text-ink-2/55">Shown when the live weather loads.</p>
      </Card>
    );
  const xs = pairs.map((p) => p[0]);
  const ys = pairs.map((p) => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  const r = xs.reduce((a, v, i) => a + (v - mx) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((a, v) => a + (v - mx) ** 2, 0) * ys.reduce((a, v) => a + (v - my) ** 2, 0));
  const xmax = nice(Math.max(...xs));
  const ymax = nice(Math.max(...ys));
  return (
    <Card
      title="Does wind clear the air?"
      sub={`Each dot is one hour of the last 14 days · correlation r = ${r.toFixed(2)}${r < -0.2 ? ": windier hours tend to be cleaner" : ""}`}
      className="lg:col-span-4"
    >
      <svg viewBox="0 0 300 200" className="h-auto w-full" role="img" aria-label="Scatter of wind speed and PM2.5">
        {pairs.map(([w, p], k) => (
          <circle key={k} cx={r1(34 + (w / xmax) * 256)} cy={r1(176 - (p / ymax) * 164)} r={2} fill={catOf(p).color} opacity={0.55} />
        ))}
        <line x1={30} x2={292} y1={176} y2={176} stroke="rgba(11,11,11,0.2)" />
        <T x={292} y={192} s={8.5} a="end">
          {`wind, km/h (0–${xmax}) →`}
        </T>
        <T x={4} y={12} s={8.5}>
          {`PM2.5 ↑ (0–${ymax})`}
        </T>
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- long-term context (saved history) */
function LongTerm() {
  const m = AIR.monthly;
  const W = 680;
  const H = 210;
  const ymax = nice(Math.max(...m.map((x) => x.p90)));
  const bw = (W - 50) / m.length;
  const y = (v: number) => r1(H - 26 - (v / ymax) * (H - 44));
  return (
    <Card title="Every month since August 2022" sub="Monthly average (bar) and the level 10% of hours exceed (tick), from the saved hourly history" className="lg:col-span-8">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Monthly PM2.5 averages since August 2022">
        {[0, ymax / 2, ymax].map((v) => (
          <g key={v}>
            <line x1={40} x2={W - 6} y1={y(v)} y2={y(v)} stroke="rgba(11,11,11,0.07)" />
            <T x={34} y={y(v) + 3} s={8.5} a="end" m>
              {Math.round(v)}
            </T>
          </g>
        ))}
        {m.map((x, k) => (
          <g key={x.month}>
            <rect x={r1(42 + k * bw)} y={y(x.mean)} width={r1(bw - 2)} height={r1(H - 26 - y(x.mean))} rx={1.5} fill={catOf(x.mean).color} opacity={0.75}>
              <title>{`${MONTH_SHORT[Number(x.month.slice(5)) - 1]} ${x.month.slice(0, 4)}: average ${x.mean}, 90th percentile ${x.p90}`}</title>
            </rect>
            <line x1={r1(42 + k * bw)} x2={r1(42 + k * bw + bw - 2)} y1={y(x.p90)} y2={y(x.p90)} stroke={INK} strokeWidth={1.2} />
            {x.month.endsWith("-01") && (
              <T x={42 + k * bw} y={H - 10} s={8.5}>
                {x.month.slice(0, 4)}
              </T>
            )}
          </g>
        ))}
        {[
          [5, "WHO annual guideline 5", "#2fa84f"],
          [15, "Indonesia annual standard 15", "#d93a3a"],
        ].map(([v, l, c]) => (
          <g key={v as number}>
            <line x1={40} x2={W - 6} y1={y(v as number)} y2={y(v as number)} stroke={c as string} strokeDasharray="4 3" />
            <T x={v === 5 ? 44 : W - 8} y={y(v as number) - 3} s={8.5} a={v === 5 ? "start" : "end"} c={c as string}>
              {l as string}
            </T>
          </g>
        ))}
      </svg>
    </Card>
  );
}
function Years() {
  return (
    <Card title="Days over the limits" sub="By daily average, from the saved history" className="lg:col-span-4">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10.5px] text-muted">
            <th className="pb-1 font-normal">Year</th>
            <th className="pb-1 text-right font-normal">Days</th>
            <th className="pb-1 text-right font-normal">Average</th>
            <th className="pb-1 text-right font-normal">&gt; WHO 15</th>
            <th className="pb-1 text-right font-normal">&gt; ID 55</th>
          </tr>
        </thead>
        <tbody>
          {AIR.years.map((y) => (
            <tr key={y.year} className="border-t border-line">
              <td className="py-1.5">{y.year}</td>
              <td className="py-1.5 text-right font-mono">{y.days}</td>
              <td className="py-1.5 text-right font-mono">{y.mean}</td>
              <td className="py-1.5 text-right font-mono">{Math.round((y.over_who / y.days) * 100)}%</td>
              <td className="py-1.5 text-right font-mono">{Math.round((y.over_id / y.days) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10.5px] text-ink-2/50">2022 starts on 4 August and the last year stops at the saved history&apos;s end, so those years are partial.</p>
    </Card>
  );
}
function Calendar() {
  const d = AIR.daily;
  const first = new Date(`${d[0].date}T00:00:00Z`).getUTCDay();
  const offset = (first + 6) % 7; // Monday = 0
  const cell = 11;
  const weeks = Math.ceil((d.length + offset) / 7);
  return (
    <Card title="The last 365 days" sub="One square per day, coloured by its daily average (EPA category)" className="lg:col-span-8">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${24 + weeks * cell} ${18 + 7 * cell}`} className="h-auto w-full min-w-[520px]" role="img" aria-label="Calendar of daily PM2.5 averages">
          {["M", "", "W", "", "F", "", "S"].map((l, k) => (
            <T key={k} x={2} y={18 + k * cell + 8} s={7.5}>
              {l}
            </T>
          ))}
          {d.map((x, k) => {
            const p = k + offset;
            const col = Math.floor(p / 7);
            return (
              <g key={x.date}>
                {x.date.endsWith("-01") && (
                  <T x={14 + col * cell} y={10} s={7.5}>
                    {MONTH_SHORT[Number(x.date.slice(5, 7)) - 1]}
                  </T>
                )}
                <rect x={14 + col * cell} y={18 + (p % 7) * cell} width={cell - 1.5} height={cell - 1.5} rx={2} fill={catOf(x.mean).color} opacity={0.8}>
                  <title>{`${x.date}: ${x.mean} µg/m³`}</title>
                </rect>
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
}
function HourMonth() {
  const g = AIR.hour_month;
  const max = Math.max(...g.flat());
  return (
    <Card title="Typical hour and month" sub="Average PM2.5 for each hour of the day in each month, all years" className="lg:col-span-4">
      <svg viewBox="0 0 300 186" className="h-auto w-full" role="img" aria-label="Average PM2.5 by hour and month">
        {g.map((row, mI) => (
          <g key={mI}>
            <T x={22} y={14 + mI * 14 + 10} s={8} a="end">
              {MONTH_SHORT[mI]}
            </T>
            {row.map((v, h) => (
              <rect key={h} x={r1(26 + h * 11.2)} y={14 + mI * 14} width={10.4} height={12.6} rx={1.5} fill={catOf(v).color} opacity={0.3 + 0.7 * (v / max)} />
            ))}
          </g>
        ))}
        {[0, 6, 12, 18].map((h) => (
          <T key={h} x={26 + h * 11.2} y={10} s={8} m>
            {String(h).padStart(2, "0")}
          </T>
        ))}
      </svg>
    </Card>
  );
}

/* ---------------------------------------------------------------- memo and method */
function Memo({ s }: { s: Series }) {
  const avg = mean(s.pm25.slice(Math.max(0, s.now - 23), s.now + 1));
  const week = mean(s.pm25.slice(Math.max(0, s.now - 167), s.now + 1));
  const prevWeek = mean(s.pm25.slice(Math.max(0, s.now - 335), Math.max(0, s.now - 167)));
  const y = AIR.years.filter((x) => x.days >= 360);
  const lastFull = y[y.length - 1];
  const hm = AIR.hour_month.flat();
  const worst = hm.indexOf(Math.max(...hm));
  const best = hm.indexOf(Math.min(...hm));
  const lines = [
    `The last 24 hours averaged ${f1(avg)} µg/m³: ${catOf(avg).name.toLowerCase()}, ${f1(avg / WHO_24H)} times the WHO guideline.`,
    Number.isFinite(prevWeek) ? `This week's average is ${f1(week)}, ${week > prevWeek ? "higher" : "lower"} than the week before (${f1(prevWeek)}).` : `This week's average is ${f1(week)}.`,
    lastFull ? `In ${lastFull.year}, ${lastFull.over_who} of ${lastFull.days} days were above the WHO 24-hour guideline and ${lastFull.over_id} above Indonesia's standard.` : "",
    `Over the years, the dirtiest typical hour is ${String(worst % 24).padStart(2, "0")}:00 in ${MONTH_SHORT[Math.floor(worst / 24)]}, the cleanest ${String(best % 24).padStart(2, "0")}:00 in ${MONTH_SHORT[Math.floor(best / 24)]}.`,
    "These are model estimates for a grid cell around central Jakarta, not readings from a street sensor: good for patterns and warnings, not for one street.",
  ].filter(Boolean);
  return (
    <Card title="What the air says" sub="Written from the same numbers as the tiles" className="lg:col-span-8" dark>
      <ul className="space-y-2.5">
        {lines.map((l, k) => (
          <li key={k} className="flex gap-2 text-[13px] leading-snug text-white/90">
            <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f08a24]" />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
function Behind({ s }: { s: Series }) {
  const items: [string, string][] = [
    [
      "Where the numbers come from",
      "The CAMS global atmospheric composition model (Copernicus), served by Open-Meteo's free Air Quality API. Each value is a modelled estimate for a grid cell around central Jakarta, not a street-level sensor.",
    ],
    ["How it stays live", "Your browser asks Open-Meteo directly each time the page opens: no key, no server of mine. If that fails, a saved 14-day snapshot is shown and labelled."],
    [
      "Thresholds",
      `WHO 2021 guideline: ${WHO_24H} µg/m³ for a 24-hour mean, 5 for a year. Indonesia's ambient standard (PP 22/2021): ${ID_24H} for 24 hours, 15 for a year. Categories: US EPA PM2.5 scale, 2024 breakpoints.`,
    ],
    ["Two forecasts", "Dashed: CAMS, a physics-based model. Dotted: my LSTM from the Live Forecast project, trained on this same series since 2022, predicting the next 24 hours from the last 72."],
    ["Long-term context", `${AIR.hours.toLocaleString("en-US")} saved hours from ${AIR.range[0].slice(0, 10)} to ${AIR.range[1].slice(0, 10)}, aggregated by ml/air_dashboard.py.`],
    ["Credits", "Air quality data: Open-Meteo.com (CC BY 4.0), generated using Copernicus Atmosphere Monitoring Service information. Weather: Open-Meteo.com (CC BY 4.0)."],
  ];
  return (
    <section className="rounded-[24px] border border-line bg-cream/60 p-4 sm:p-6 lg:col-span-12">
      <h3 className="text-[18px] font-semibold tracking-[-0.02em]">Behind the dashboard</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white p-3">
            <p className="text-[13px] font-semibold">{k}</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-2/75">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-2/70">
        The LSTM and how it was trained:{" "}
        <Link href="/skills/deep-learning/live-forecasts" className="font-semibold text-ink underline underline-offset-2">
          Live Forecast project
        </Link>
        . {s.live ? "" : "Live data not loaded yet."}
      </p>
    </section>
  );
}

export function AirDashboard() {
  const [s, setS] = useState<Series>(() => snapshot());
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchLive()
      .then((d) => alive && setS(d))
      .catch(() => {
        if (!alive) return;
        setS(snapshot(true));
        setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="mx-auto max-w-[1400px] px-3 sm:px-5 md:px-10">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${s.live ? "bg-[#1baf7a]/12 text-[#138a60]" : "bg-ink/5 text-ink/60"}`}>
          <span className={`h-2 w-2 rounded-full ${s.live ? "animate-pulse bg-[#1baf7a]" : "bg-ink/30"}`} />
          {s.live ? `Live · fetched ${s.fetchedAt} WIB` : failed ? "Offline · showing saved data" : "Loading live data… showing saved data"}
        </span>
        <span className="text-ink-2/55">Open-Meteo Air Quality API · CAMS model · CC BY 4.0</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-12">
        <Status s={s} />
        <Kpis s={s} />
        <Timeline s={s} />
        <Alerts s={s} />
        <Rhythm s={s} />
        <Pollutants s={s} />
        <Wind s={s} />
        <LongTerm />
        <Calendar />
        <HourMonth />
        <Years />
        <Memo s={s} />
        <Behind s={s} />
      </div>
    </div>
  );
}
