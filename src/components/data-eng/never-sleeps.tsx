"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import P from "@/data/de-pipeline.json";
import { MONTH_LONG, MONTH_SHORT } from "@/lib/months";
import { InsideSection, Scrolly, type Step } from "../explainers/scrolly";

/**
 * The Jakarta PM2.5 pipeline as one canvas. Each of the 355 tiles is 120 real hourly slots (5 days) of the raw file
 * (ml/de_profile.py → src/data/de-pipeline.json). They fall out of the sky into five yearly requests, land as one raw
 * file, get scanned by the checks, lose the empty and forecast hours, roll up into a trend, shrink into the pages
 * that use them and finally circle a live reading fetched while you scroll.
 */

const W = 640;
const H = 440;
const INK = "#0b0b0b";
const ORANGE = "#eb6834";
const GREEN = "#1baf7a";
const AMBER = "#c29a00";
const RED = "#c8413f";
const EMPTY = "#dcd6ca";
const MUTED = "rgba(11,11,11,0.55)";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const r1 = (v: number) => Math.round(v * 10) / 10;
const n0 = (v: number) => v.toLocaleString("en-US");
const kb = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

/* ---------------------------------------------------------------- real tiles */
type Tile = { i: number; v: number | null; empty: number; fut: number; date: string; year: string; lane: number; j: number; k: number };
const RAW = P.tiles.list as unknown as [number | null, number, number, string][];
const YEARS = P.years;
const TILES: Tile[] = (() => {
  const inYear = new Map<string, number>();
  let kept = 0;
  return RAW.map(([v, empty, fut, date], i) => {
    const year = date.slice(0, 4);
    const j = inYear.get(year) ?? 0;
    inYear.set(year, j + 1);
    return { i, v, empty, fut, date, year, lane: YEARS.indexOf(year), j, k: v == null ? -1 : kept++ };
  });
})();
const KEPT = TILES.filter((t) => t.v != null).length;
const EMPTY_TILES = TILES.filter((t) => t.v == null);
const FUTURE_TILE = TILES.find((t) => t.fut > 0);
const EMPTY_HOURS = TILES.reduce((a, t) => a + t.empty, 0);
const FUTURE_HOURS = TILES.reduce((a, t) => a + t.fut, 0);
const FIRST_DATA = TILES.find((t) => t.v != null) as Tile;
const [WORST_M, WORST_V] = P.months.worst as unknown as [string, number];

/** PM2.5 colour ramp, light blue (clean) to deep red. */
const STOPS: [number, [number, number, number]][] = [
  [10, [205, 224, 243]],
  [30, [127, 176, 220]],
  [45, [243, 205, 122]],
  [60, [241, 154, 74]],
  [80, [224, 90, 47]],
  [105, [168, 50, 42]],
];
function ramp(v: number) {
  if (v <= STOPS[0][0]) return rgb(STOPS[0][1]);
  for (let s = 1; s < STOPS.length; s++) {
    const [v1, c1] = STOPS[s];
    const [v0, c0] = STOPS[s - 1];
    if (v <= v1) {
      const f = (v - v0) / (v1 - v0);
      return rgb([0, 1, 2].map((k) => c0[k] + (c1[k] - c0[k]) * f) as [number, number, number]);
    }
  }
  return rgb(STOPS[STOPS.length - 1][1]);
}
const rgb = (c: [number, number, number]) => `rgb(${c.map((x) => Math.round(x)).join(",")})`;

/* ---------------------------------------------------------------- where every tile goes */
type Box = { x: number; y: number; w: number; h: number; fill: string; o: number; rx: number };
// a deterministic cloud for the first step
const CLOUD = (() => {
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return TILES.map(() => {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    return { x: r1(320 + Math.cos(a) * r * 262 - 4), y: r1(150 + Math.sin(a) * r * 84 - 4) };
  });
})();
const LANE_Y = (l: number) => 104 + l * 56;
const GRID = (i: number) => ({ x: r1(26 + (i % 30) * 19.6), y: r1(96 + Math.floor(i / 30) * 19.6) });
const TABLE = (k: number) => ({ x: r1(30 + (k % 24) * 16), y: r1(100 + Math.floor(k / 24) * 16) });
const BAR_X = (k: number) => r1(44 + k * (560 / KEPT));
const BASE = 372;
const BAR_H = (v: number) => r1((v / 110) * 262);
const RING = { cx: 320, cy: 226, r: 160 };

function place(t: Tile, step: number): Box {
  const fill = t.v == null ? EMPTY : ramp(t.v);
  if (step <= 0) return { ...CLOUD[t.i], w: 8, h: 8, rx: 4, fill: "#c6d3e3", o: 0.9 };
  if (step === 1) return { x: r1(118 + t.j * 6.3), y: LANE_Y(t.lane), w: 5.2, h: 24, rx: 1.5, fill, o: 1 };
  const g = GRID(t.i);
  if (step <= 3) return { ...g, w: 17, h: 17, rx: 3, fill, o: 1 };
  if (t.v == null) return { ...g, y: g.y + 60, w: 17, h: 17, rx: 3, fill, o: 0 };
  if (step === 4) return { ...TABLE(t.k), w: 14, h: 14, rx: 2.5, fill, o: 1 };
  if (step === 5) return { x: BAR_X(t.k), y: r1(BASE - BAR_H(t.v)), w: 1.5, h: BAR_H(t.v), rx: 0, fill, o: 1 };
  if (step === 6) {
    const h = r1((t.v / 110) * 118);
    return { x: r1(42 + t.k * (252 / KEPT)), y: r1(300 - h), w: 0.7, h, rx: 0, fill, o: 1 };
  }
  const a = -Math.PI / 2 + (t.k / KEPT) * Math.PI * 2;
  return { x: r1(RING.cx + Math.cos(a) * RING.r - 4.5), y: r1(RING.cy + Math.sin(a) * RING.r - 4.5), w: 9, h: 9, rx: 4.5, fill, o: 1 };
}

const ease = [0.22, 1, 0.36, 1] as const;
function TileRect({ t, step, still }: { t: Tile; step: number; still: boolean }) {
  const b = place(t, step);
  if (still) return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.rx} fill={b.fill} opacity={b.o} />;
  // tiles leave in time order, so the data visibly flows from old to new
  const delay = step === 1 || step === 5 || step === 7 ? (t.i / RAW.length) * 0.5 : ((t.i * 37) % 60) * 0.008;
  return <motion.rect initial={false} animate={{ x: b.x, y: b.y, width: b.w, height: b.h, fill: b.fill, opacity: b.o, rx: b.rx }} transition={{ duration: 0.9, ease, delay }} />;
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
function Fade({ on, still, delay = 0.35, children }: { on: boolean; still: boolean; delay?: number; children: React.ReactNode }) {
  if (still) return on ? <g>{children}</g> : null;
  return (
    <motion.g initial={false} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: 0.5, ease, delay: on ? delay : 0 }} style={{ pointerEvents: "none" }}>
      {children}
    </motion.g>
  );
}

const day = (d: string) => `${Number(d.slice(8, 10))} ${MONTH_SHORT[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const yearStarts = YEARS.map((y) => TILES.find((t) => t.year === y) as Tile);
const worstTile = TILES.filter((t) => t.date.startsWith(WORST_M) && t.v != null).reduce((a, b) => ((b.v as number) > (a.v as number) ? b : a));
const last60 = P.gold.daily_last60;

export type Live = { v: number; time: string; live: boolean } | null;

function Canvas({ step, still = false, live }: { step: number; still?: boolean; live: Live }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="The Jakarta PM2.5 data moving through the pipeline, from the API to the pages">
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={16} fill="#fbfaf7" stroke="rgba(11,11,11,0.08)" />

      {/* 0 · the sky over Jakarta */}
      <Fade on={step === 0} still={still} delay={0.1}>
        <T x={24} y={34} s={12} c={INK} w={800}>
          {"The air above Jakarta, estimated every hour"}
        </T>
        <T x={24} y={50} s={9}>
          {"CAMS atmospheric model · published by Open-Meteo · −6.2°, 106.85°"}
        </T>
        {/* skyline with Monas */}
        <path
          d="M24,300 h40 v-34 h22 v20 h18 v-46 h26 v46 h14 v-28 h30 v28 h20 v-60 h24 v60 h16 v-22 h18 v22 h22 v-38 h28 v38 h10 l6,-4 v-58 l4,-10 l4,10 v58 l6,4 h18 v-30 h26 v30 h20 v-52 h22 v52 h16 v-26 h30 v26 h18 v-40 h24 v40 h24"
          fill="none"
          stroke="rgba(11,11,11,0.28)"
          strokeWidth={1.4}
        />
        <circle cx={322} cy={223} r={3.5} fill={ORANGE} />
        <line x1={24} x2={616} y1={300.5} y2={300.5} stroke="rgba(11,11,11,0.28)" />
        <rect x={24} y={322} width={592} height={92} rx={12} fill={INK} />
        <T x={40} y={346} s={9} c="rgba(255,255,255,0.5)" m>
          {"one request per year, no key needed"}
        </T>
        <T x={40} y={368} s={11.5} c="#fff" m>
          {"GET air-quality-api.open-meteo.com/v1/air-quality"}
        </T>
        <T x={40} y={388} s={10} c="rgba(255,255,255,0.75)" m>
          {"?latitude=-6.2&longitude=106.85&hourly=pm2_5"}
        </T>
        <T x={40} y={404} s={10} c="rgba(255,255,255,0.75)" m>
          {"&timezone=Asia/Jakarta&start_date=YYYY-01-01&end_date=YYYY-12-31"}
        </T>
      </Fade>

      {/* 1 · five yearly requests */}
      <Fade on={step === 1} still={still} delay={0.1}>
        <T x={24} y={34} s={12} c={INK} w={800}>
          {`${P.requests} requests · ${n0(P.raw.slots)} hourly slots`}
        </T>
        <T x={24} y={50} s={9}>
          {"each bar = 5 days of hours, coloured by PM2.5 · grey = the API sent empty values"}
        </T>
        <rect x={392} y={66} width={224} height={24} rx={12} fill="#fff" stroke="rgba(11,11,11,0.12)" />
        <T x={504} y={82} s={8.5} a="middle" c={INK} m>
          {"4 tries · waits grow · longer after 429"}
        </T>
        {YEARS.map((y, l) => (
          <g key={y}>
            <rect x={110} y={LANE_Y(l) - 5} width={482} height={34} rx={17} fill="#fff" stroke="rgba(11,11,11,0.1)" />
            <T x={24} y={LANE_Y(l) + 11} s={12} c={INK} w={800} m>
              {y}
            </T>
            <T x={24} y={LANE_Y(l) + 24} s={8} m>
              {`${n0((P.per_year as Record<string, number>)[y])} slots`}
            </T>
            <T x={600} y={LANE_Y(l) + 16} s={8.5} c={GREEN} w={700} m>
              {"200 OK"}
            </T>
          </g>
        ))}
      </Fade>

      {/* 2–3 · the raw file */}
      <Fade on={step === 2 || step === 3} still={still} delay={0.1}>
        <T x={24} y={34} s={12} c={INK} w={800} m>
          {"ml/data/raw/live/pm25_jakarta.json"}
        </T>
        <T x={24} y={50} s={9}>
          {`${kb(P.raw.bytes)} · ${n0(P.raw.slots)} hourly slots · each square = 5 days · landed exactly as it came`}
        </T>
      </Fade>
      <Fade on={step === 2} still={still}>
        <rect x={24} y={352} width={592} height={66} rx={12} fill={INK} />
        <T x={38} y={372} s={9} c="rgba(255,255,255,0.5)" m>
          {"the real raw file, around the first value"}
        </T>
        <T x={38} y={390} s={10} c="#fff" m>
          {`"time":  [${P.raw.sample
            .slice(0, 4)
            .map(([t]) => `"${String(t).slice(5)}"`)
            .join(", ")}, …]`}
        </T>
        <T x={38} y={406} s={10} c="#fff" m>
          {`"pm2_5": [${P.raw.sample
            .slice(0, 4)
            .map(([, v]) => (v == null ? "null" : String(v)))
            .join(", ")}, …]`}
        </T>
      </Fade>
      <Fade on={step === 3} still={still}>
        {FUTURE_TILE &&
          (() => {
            const g = GRID(FUTURE_TILE.i);
            return (
              <g>
                <rect x={g.x - 1.5} y={g.y - 1.5} width={20} height={20} rx={4} fill="none" stroke={RED} strokeWidth={2} />
                <path d={`M${g.x + 20},${g.y + 9} l14,-10 h14`} fill="none" stroke={RED} strokeWidth={1.2} />
                <T x={g.x + 50} y={g.y + 2} s={8.5} c={RED} w={700}>
                  {`${FUTURE_HOURS} forecast hours`}
                </T>
              </g>
            );
          })()}
        <rect x={24} y={348} width={592} height={78} rx={12} fill={INK} />
        {P.checks.map((c, i) => (
          <g key={c.name}>
            <T x={40 + (i % 4) * 146} y={370 + Math.floor(i / 4) * 30} s={10} c={c.ok ? GREEN : RED} w={800}>
              {c.ok ? "✓" : "✗"}
            </T>
            <T x={53 + (i % 4) * 146} y={370 + Math.floor(i / 4) * 30} s={9.5} c="#fff" w={700}>
              {c.name}
            </T>
            <T x={53 + (i % 4) * 146} y={382 + Math.floor(i / 4) * 30} s={7.5} c="rgba(255,255,255,0.55)" m>
              {c.detail.length > 26 ? `${c.detail.slice(0, 25)}…` : c.detail}
            </T>
          </g>
        ))}
      </Fade>

      {/* 4 · silver */}
      <Fade on={step === 4} still={still}>
        <T x={24} y={34} s={12} c={INK} w={800}>
          {"Silver: only the hours that are real"}
        </T>
        <T x={24} y={50} s={9}>
          {`−${n0(EMPTY_HOURS)} empty · −${FUTURE_HOURS} forecast → ${n0(P.silver.rows)} hours, one typed row each`}
        </T>
        <T x={30} y={330} s={9} m>
          {`${KEPT} squares · ${day(P.silver.first.slice(0, 10))} → ${day(P.silver.last.slice(0, 10))}`}
        </T>
        <rect x={430} y={92} width={186} height={176} rx={12} fill="#fff" stroke="rgba(11,11,11,0.12)" />
        <T x={444} y={114} s={10} c={INK} w={800} m>
          {"silver.pm25_hourly"}
        </T>
        <T x={444} y={134} s={8} m>
          {"hour (Asia/Jakarta)"}
        </T>
        <T x={604} y={134} s={8} a="end" m>
          {"pm2_5"}
        </T>
        {P.silver.preview.map(([t, v], i) => (
          <g key={String(t)}>
            <line x1={444} x2={604} y1={142 + i * 22} y2={142 + i * 22} stroke="rgba(11,11,11,0.08)" />
            <T x={444} y={157 + i * 22} s={9} c={INK} m>
              {String(t).slice(5)}
            </T>
            <T x={604} y={157 + i * 22} s={9} a="end" c={INK} w={700} m>
              {Number(v).toFixed(1)}
            </T>
          </g>
        ))}
        <T x={444} y={260} s={8}>
          {"the newest rows, real"}
        </T>
      </Fade>

      {/* 5 · gold */}
      <Fade on={step === 5} still={still}>
        <T x={24} y={34} s={12} c={INK} w={800}>
          {`Gold: ${n0(P.gold.days)} daily and ${P.gold.months} monthly averages`}
        </T>
        <T x={24} y={50} s={9}>
          {"every bar is the average of 5 days, oldest on the left"}
        </T>
        <line x1={40} x2={610} y1={BASE + 0.5} y2={BASE + 0.5} stroke="rgba(11,11,11,0.3)" />
        {[
          [15, "WHO 24-h guideline 15"],
          [55, "Indonesia 24-h standard 55"],
        ].map(([v, label]) => (
          <g key={label}>
            <line x1={40} x2={610} y1={r1(BASE - BAR_H(v as number))} y2={r1(BASE - BAR_H(v as number))} stroke={v === 15 ? GREEN : ORANGE} strokeDasharray="4 3" />
          </g>
        ))}
        {yearStarts
          .filter((t) => t.k >= 0 || t.year > FIRST_DATA.year)
          .map((t) => {
            const k = t.k >= 0 ? t.k : 0;
            return (
              <T key={t.year} x={BAR_X(k)} y={BASE + 15} s={8.5} m>
                {t.year}
              </T>
            );
          })}
        <T x={BAR_X(FIRST_DATA.k)} y={BASE + 15} s={8.5} m>
          {FIRST_DATA.year}
        </T>
        <path d={`M${BAR_X(worstTile.k) + 1},${r1(BASE - BAR_H(worstTile.v as number)) - 6} l0,-22`} stroke={INK} strokeWidth={1.2} />
        <T x={BAR_X(worstTile.k) + 4} y={r1(BASE - BAR_H(worstTile.v as number)) - 32} s={9.5} c={INK} w={800}>
          {`${MONTH_LONG[Number(WORST_M.slice(5)) - 1]} ${WORST_M.slice(0, 4)}: ${WORST_V} µg/m³`}
        </T>
        <T x={BAR_X(worstTile.k) + 4} y={r1(BASE - BAR_H(worstTile.v as number)) - 20} s={8}>
          {"the worst month on record"}
        </T>
      </Fade>

      {/* 6 · serve */}
      <Fade on={step === 6} still={still}>
        <T x={24} y={34} s={12} c={INK} w={800}>
          {"Served small, to the pages that use it"}
        </T>
        <T x={24} y={50} s={9}>
          {`pages read a few kilobytes, never the ${kb(P.raw.bytes)} raw file`}
        </T>
        {P.serve.files.map((f, i) => (
          <g key={f.file}>
            <rect x={24 + i * 300} y={110} width={292} height={236} rx={14} fill="#fff" stroke="rgba(11,11,11,0.12)" />
            <T x={40 + i * 300} y={134} s={11} c={INK} w={800}>
              {f.used_by}
            </T>
            <T x={40 + i * 300} y={150} s={8.5} m>
              {`${f.file.split("/").pop()} · ${kb(f.bytes)}`}
            </T>
          </g>
        ))}
        <line x1={40} x2={300} y1={300.5} y2={300.5} stroke="rgba(11,11,11,0.25)" />
        <T x={40} y={326} s={8.5}>
          {"the whole history, as the air dashboard shows it"}
        </T>
        <path
          d={last60.map((v, i) => `${i ? "L" : "M"}${r1(340 + i * (260 / (last60.length - 1)))},${r1(290 - (v / Math.max(...last60)) * 110)}`).join(" ")}
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <circle cx={600} cy={r1(290 - (last60[last60.length - 1] / Math.max(...last60)) * 110)} r={3.5} fill={ORANGE} />
        <T x={340} y={326} s={8.5}>
          {`the last ${last60.length} days, which the LSTM learns from`}
        </T>
      </Fade>

      {/* 7 · never sleeps */}
      <Fade on={step >= 7} still={still}>
        {[
          ["extract", 0],
          ["check", 1],
          ["load", 2],
          ["serve", 3],
        ].map(([label, q]) => {
          const a = -Math.PI / 2 + ((q as number) / 4) * Math.PI * 2 + Math.PI / 4;
          const x = RING.cx + Math.cos(a) * (RING.r + 34),
            y = RING.cy + Math.sin(a) * (RING.r + 30);
          return (
            <g key={label as string}>
              <rect x={r1(x - 34)} y={r1(y - 12)} width={68} height={24} rx={12} fill={INK} />
              <T x={x} y={y + 4} s={9.5} a="middle" c="#fff" w={700} m>
                {label as string}
              </T>
            </g>
          );
        })}
        <circle cx={RING.cx} cy={RING.cy} r={104} fill="#fff" stroke="rgba(11,11,11,0.1)" />
        {!still && (
          <g className="animate-spin" style={{ transformOrigin: `${RING.cx}px ${RING.cy}px`, transformBox: "view-box", animationDuration: "8s" }}>
            <line x1={RING.cx} y1={RING.cy - 108} x2={RING.cx} y2={RING.cy - 136} stroke={ORANGE} strokeWidth={2.5} strokeLinecap="round" />
          </g>
        )}
        <T x={RING.cx} y={RING.cy - 46} s={9} a="middle" m>
          {live ? (live.live ? "Jakarta right now · live" : "newest saved hour") : "fetching the newest hour…"}
        </T>
        <T x={RING.cx} y={RING.cy + 6} s={44} a="middle" c={INK} w={800}>
          {live ? live.v.toFixed(1) : "–"}
        </T>
        <T x={RING.cx} y={RING.cy + 26} s={10} a="middle">
          {live ? `µg/m³ PM2.5 · ${live.time}` : "µg/m³ PM2.5"}
        </T>
        <T x={RING.cx} y={RING.cy + 50} s={8.5} a="middle" c={ORANGE} w={700}>
          {"every hour: extract → check → load → serve"}
        </T>
        <T x={24} y={34} s={12} c={INK} w={800}>
          {"A pipeline that never sleeps"}
        </T>
        <T x={24} y={50} s={9}>
          {`${KEPT} squares of history around one fresh hour`}
        </T>
      </Fade>

      <g>
        {TILES.map((t) => (
          <TileRect key={t.i} t={t} step={step} still={still} />
        ))}
      </g>

      {/* labels that sit on top of the tiles */}
      <Fade on={step === 2 || step === 3} still={still} delay={0.5}>
        {yearStarts.map((t) => {
          const g = GRID(t.i);
          return (
            <g key={t.year}>
              <rect x={g.x - 2.4} y={g.y - 1} width={1.8} height={19} fill={INK} />
              <rect x={g.x - 2.4} y={g.y - 13} width={30} height={12} rx={6} fill={INK} />
              <T x={g.x + 12.6} y={g.y - 4} s={8} a="middle" c="#fff" w={700} m>
                {t.year}
              </T>
            </g>
          );
        })}
      </Fade>
      <Fade on={step === 3} still={still} delay={0.5}>
        {EMPTY_TILES.map((t) => {
          const g = GRID(t.i);
          return <rect key={t.i} x={g.x - 1} y={g.y - 1} width={19} height={19} rx={3.5} fill="none" stroke={AMBER} strokeWidth={1.4} />;
        })}
        <rect x={326} y={60} width={290} height={26} rx={13} fill="#fff" stroke={AMBER} />
        <T x={340} y={77} s={9} c={AMBER} w={800}>
          {`${n0(EMPTY_HOURS)} empty hours: expected`}
        </T>
        <T x={478} y={77} s={8.5}>
          {`history starts ${day(FIRST_DATA.date)}`}
        </T>
        <path d={`M356,86 V${GRID(0).y - 2}`} fill="none" stroke={AMBER} strokeWidth={1.2} />
        {!still && <motion.rect y={92} width={3} height={240} fill={ORANGE} opacity={0.75} initial={{ x: 22 }} animate={{ x: [22, 612] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />}
      </Fade>
      <Fade on={step === 5} still={still} delay={0.5}>
        {[
          [15, "WHO 24-h guideline 15", GREEN],
          [55, "Indonesia 24-h standard 55", ORANGE],
        ].map(([v, label, c]) => (
          <text key={label as string} x={610} y={r1(BASE - BAR_H(v as number)) - 4} fontSize={8.5} fill={c as string} textAnchor="end" fontWeight={800} fontFamily={FONT} stroke="#fbfaf7" strokeWidth={3} paintOrder="stroke">
            {label as string}
          </text>
        ))}
      </Fade>
    </svg>
  );
}

/** Fetch the newest hour from the same API the pipeline uses; fall back to the newest saved hour. */
const LAST = P.silver.preview[P.silver.preview.length - 1] as unknown as [string, number];
const FALLBACK = { v: LAST[1], time: `${LAST[0].slice(5)} WIB (saved)`, live: false };
function useLive(): Live {
  const [live, setLive] = useState<Live>(null);
  useEffect(() => {
    let alive = true;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-6.2&longitude=106.85&current=pm2_5&timezone=Asia%2FJakarta", { signal: ctl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { current?: { time?: string; pm2_5?: number } }) => {
        if (!alive) return;
        const v = j.current?.pm2_5;
        const t = j.current?.time;
        setLive(typeof v === "number" && typeof t === "string" ? { v, time: `${t.slice(11, 16)} WIB`, live: true } : FALLBACK);
      })
      .catch(() => alive && setLive(FALLBACK))
      .finally(() => clearTimeout(timer));
    return () => {
      alive = false;
      ctl.abort();
    };
  }, []);
  return live;
}

export function NeverSleeps() {
  const live = useLive();
  const failed = P.checks.filter((c) => !c.ok).length;
  const steps: Step[] = [
    { t: "It starts in the sky", d: "Every hour the CAMS atmospheric model estimates the air over Jakarta, and Open-Meteo publishes it as a free API: one PM2.5 number per hour. Each dot here will become five days of those hours." },
    {
      t: "Ask for it, one year at a time",
      d: `${P.requests} requests, ${YEARS[0]} to ${YEARS[YEARS.length - 1]}, ${n0(P.raw.slots)} hourly slots. The extract step expects failure: four tries, longer waits each time, much longer if the API says slow down.`,
    },
    { t: "Land it untouched", d: `${kb(P.raw.bytes)} of raw JSON, stored exactly as it came: the bronze layer. Every later step can be rebuilt from this file without asking the API again.` },
    {
      t: "Check before you trust",
      d: `Seven checks scan every load, and today ${failed ? `${failed} fail` : "all pass"}. The grey block is not an error: the API's history only starts on ${day(FIRST_DATA.date)}. The last day is a forecast, so it is set aside.`,
    },
    { t: "Keep only what's true", d: `Empty and future hours leave. ${n0(P.silver.rows)} real hours remain, one typed row each in Jakarta time. Nothing filled in, nothing guessed: the silver layer.` },
    {
      t: "Shape it for questions",
      d: `The hours roll up into ${n0(P.gold.days)} daily and ${P.gold.months} monthly averages. The worst month was ${MONTH_LONG[Number(WORST_M.slice(5)) - 1]} ${WORST_M.slice(0, 4)}, averaging ${WORST_V} µg/m³; the WHO 24-hour guideline is 15.`,
    },
    {
      t: "Serve it small",
      d: (
        <>
          The air dashboard reads {kb(P.serve.files[0].bytes)}, the forecasting model {kb(P.serve.files[1].bytes)}. Pages never touch the raw file, so they load fast.{" "}
          <Link href="/skills/analytics/dashboards/air" className="font-semibold text-ink underline underline-offset-4">
            Open the air dashboard →
          </Link>
        </>
      ),
    },
    { t: "And never sleep", d: "On a scheduler the loop runs every hour: extract, check, load, serve, with an alert when a check fails or the data goes stale. In the middle: the newest hour, fetched from the same API as you read." },
  ];
  return (
    <InsideSection
      id="pipeline"
      kicker="A pipeline that never sleeps"
      title={`${n0(P.raw.slots)} hours of Jakarta air, from the sky to this page.`}
      line="The real pipeline behind this site's air pages, as one picture. Every square is five days of real hourly data. Scroll and watch it get fetched, landed, checked, cleaned, summarised and served."
    >
      <Scrolly steps={steps}>
        {(step) => (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 pt-3 pb-11 sm:px-5">
            <div className="w-full max-w-[640px] overflow-hidden rounded-[16px]">
              {/* on phones the canvas is shown larger and slides to the part each step is about */}
              <div
                className="w-[140%] transition-transform duration-700 ease-out [transform:translateX(calc(var(--pan)*-28.571%))] md:w-full md:[transform:none]"
                style={{ "--pan": [0.5, 0.35, 0.5, 0.5, 0.3, 0.75, 0.25, 0.5][step] ?? 0.5 } as React.CSSProperties}
              >
                <Canvas step={step} live={live} />
              </div>
            </div>
          </div>
        )}
      </Scrolly>
    </InsideSection>
  );
}

export { Canvas as NeverSleepsCanvas };
