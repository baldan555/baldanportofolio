"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { InsideSection, Scrolly, type Step } from "../explainers/scrolly";
import { KINDS, KIND_COLOR, KIND_LABEL, ms, msOr, size, usePageTiming, type Kind, type Timing } from "./timing";

/**
 * What happens between a click and a page, as one canvas. 96 tiles stand for the bytes of this very page, split by
 * file type in the proportions the visitor's browser measured (Resource Timing). They sit on a server, cross the
 * network after DNS and the handshake, arrive grouped by type, assemble into a page, light up when JavaScript takes
 * over, and finally shrink into a phone app that only asks for data. The strip on top is the visitor's real load.
 */

const W = 640;
const H = 440;
const N = 96;
const INK = "#0b0b0b";
const ORANGE = "#eb6834";
const GREEN = "#1baf7a";
const MUTED = "rgba(11,11,11,0.55)";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const r1 = (v: number) => Math.round(v * 10) / 10;

/* ---------------------------------------------------------------- tiles ← measured bytes */
const DEFAULT_BYTES: Record<Kind, number> = { html: 6, css: 8, font: 8, js: 50, img: 14, data: 4, other: 6 };
function tileKinds(bytes: Record<Kind, number>): Kind[] {
  const live = KINDS.filter((k) => bytes[k] > 0);
  const base = Object.fromEntries(KINDS.map((k) => [k, live.includes(k) ? 1 : 0])) as Record<Kind, number>;
  const rest = N - live.length;
  const sum = live.reduce((a, k) => a + bytes[k], 0) || 1;
  const raw = live.map((k) => (bytes[k] / sum) * rest);
  const fl = raw.map(Math.floor);
  const order = raw.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f);
  const missing = rest - fl.reduce((a, b) => a + b, 0);
  for (let j = 0; j < missing; j++) fl[order[j].i] += 1;
  live.forEach((k, i) => (base[k] += fl[i]));
  return KINDS.flatMap((k) => Array(base[k]).fill(k) as Kind[]);
}

/* ---------------------------------------------------------------- the page wireframe (96 slots) */
type Role = "nav" | "head" | "text" | "img" | "btn" | "card" | "foot";
type Slot = { x: number; y: number; w: number; h: number; role: Role };
const SLOTS: Slot[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ x: 36 + i * 49.5, y: 106, w: 47, h: 12, role: "nav" as Role })),
  ...Array.from({ length: 8 }, (_, i) => ({ x: 36 + i * 25, y: 130, w: 23, h: 18, role: "head" as Role })),
  ...Array.from({ length: 24 }, (_, i) => ({ x: 36 + (i % 8) * 24.5, y: 158 + Math.floor(i / 8) * 11, w: 22, h: 6, role: "text" as Role })),
  ...Array.from({ length: 16 }, (_, i) => ({ x: 250 + (i % 4) * 44.5, y: 130 + Math.floor(i / 4) * 17, w: 42, h: 15, role: "img" as Role })),
  ...Array.from({ length: 8 }, (_, i) => ({ x: 36 + Math.floor(i / 4) * 96 + (i % 4) * 21, y: 200, w: 19, h: 14, role: "btn" as Role })),
  ...Array.from({ length: 24 }, (_, i) => {
    const c = Math.floor(i / 8),
      j = i % 8;
    return { x: 36 + c * 132 + (j % 2) * 62, y: 230 + Math.floor(j / 2) * 26, w: 60, h: 22, role: "card" as Role };
  }),
  ...Array.from({ length: 8 }, (_, i) => ({ x: 36 + i * 49.5, y: 346, w: 47, h: 10, role: "foot" as Role })),
];
const PREFER: Record<Kind, Role[]> = {
  img: ["img", "card", "text"],
  font: ["head", "text", "nav"],
  css: ["nav", "foot", "text"],
  data: ["card", "btn", "text"],
  js: ["btn", "card", "foot", "text"],
  html: ["text", "head", "card"],
  other: ["foot", "nav", "text"],
};
function slotsFor(kinds: Kind[]) {
  const taken = new Array(SLOTS.length).fill(false);
  const out = new Array(kinds.length).fill(-1);
  for (const k of ["img", "font", "css", "data", "js", "html", "other"] as Kind[]) {
    kinds.forEach((kk, i) => {
      if (kk !== k) return;
      let s = -1;
      for (const role of PREFER[k]) {
        s = SLOTS.findIndex((sl, j) => !taken[j] && sl.role === role);
        if (s >= 0) break;
      }
      if (s < 0) s = taken.findIndex((t) => !t);
      taken[s] = true;
      out[i] = s;
    });
  }
  return out;
}
const PAINT: Record<Role, string> = { nav: INK, head: INK, text: "#cfc8bb", img: "#a9c6ea", btn: "#d6d0c4", card: "#ebe5da", foot: "#cfc8bb" };

/* ---------------------------------------------------------------- where each tile goes */
type Box = { x: number; y: number; w: number; h: number; fill: string; o: number };
const FRAME = (step: number) => (step <= 3 ? { x: 20, y: 96, w: 210, h: 280 } : { x: 20, y: 64, w: 420, h: 360 });

function bands(kinds: Kind[]) {
  const counts = KINDS.map((k) => kinds.filter((x) => x === k).length);
  let y = 116;
  return KINDS.map((k, i) => {
    const lines = Math.max(1, Math.ceil(counts[i] / 26));
    const b = { k, y, n: counts[i] };
    y += counts[i] ? Math.max(24, lines * 11) + 10 : 0;
    return b;
  });
}

function place(i: number, kind: Kind, idx: number, slot: number, step: number, band: { y: number }): Box {
  const color = KIND_COLOR[kind];
  if (step <= 3) {
    if (step === 3 && kind === "html") return { x: r1(36 + idx * 13), y: 136, w: 10, h: 10, fill: color, o: 1 };
    return { x: r1(507 + (i % 8) * 13.4), y: r1(176 + Math.floor(i / 8) * 12.6), w: 10, h: 10, fill: color, o: 1 };
  }
  if (step === 4) return { x: r1(150 + (idx % 26) * 10.6), y: r1(band.y + Math.floor(idx / 26) * 11), w: 8.5, h: 8.5, fill: color, o: 1 };
  if (step <= 6) {
    const s = SLOTS[slot];
    const live = step === 6 && (kind === "js" || kind === "data");
    return { x: s.x, y: s.y, w: s.w, h: s.h, fill: live ? color : PAINT[s.role], o: 1 };
  }
  // 7: a phone app: code is installed once, only data travels
  const row = Math.floor(i / 16),
    j = i % 16;
  return { x: r1(472 + (j % 8) * 16), y: r1(176 + row * 38 + Math.floor(j / 8) * 13), w: 14, h: 10, fill: kind === "data" ? ORANGE : "#dcd6ca", o: 1 };
}

const ease = [0.22, 1, 0.36, 1] as const;
function TileRect({ b, i, step, still }: { b: Box; i: number; step: number; still: boolean }) {
  if (still) return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={2} fill={b.fill} opacity={b.o} />;
  const delay = step === 4 || step === 3 ? (i / N) * 0.6 : ((i * 37) % 50) * 0.008;
  return <motion.rect initial={false} animate={{ x: b.x, y: b.y, width: b.w, height: b.h, fill: b.fill, opacity: b.o }} transition={{ duration: 0.85, ease, delay }} rx={2} />;
}

const T = ({ x, y, s = 10, c = MUTED, a = "start", w, m = false, children }: { x: number; y: number; s?: number; c?: string; a?: "start" | "middle" | "end"; w?: number; m?: boolean; children: React.ReactNode }) => (
  <text x={r1(x)} y={r1(y)} fontSize={s} fill={c} textAnchor={a} fontWeight={w} fontFamily={m ? MONO : FONT}>
    {children}
  </text>
);
function Fade({ on, still, delay = 0.3, children }: { on: boolean; still: boolean; delay?: number; children: React.ReactNode }) {
  if (still) return on ? <g>{children}</g> : null;
  return (
    <motion.g initial={false} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: 0.45, ease, delay: on ? delay : 0 }} style={{ pointerEvents: "none" }}>
      {children}
    </motion.g>
  );
}

/* ---------------------------------------------------------------- the visitor's real load, as a strip */
const PHASES: { key: keyof Timing; label: string; color: string; step: number }[] = [
  { key: "dns", label: "DNS", color: "#6250d6", step: 1 },
  { key: "connect", label: "Connect", color: "#2a78d6", step: 2 },
  { key: "tls", label: "TLS", color: "#0f766e", step: 2 },
  { key: "wait", label: "Waiting", color: "#c29a00", step: 3 },
  { key: "download", label: "Download", color: GREEN, step: 4 },
  { key: "build", label: "Build", color: ORANGE, step: 5 },
  { key: "ready", label: "Ready", color: "#d6497b", step: 6 },
  { key: "load", label: "Load", color: "#8a8a8a", step: 6 },
];
function Strip({ t, step }: { t: Timing | null; step: number }) {
  const total = t ? PHASES.reduce((a, p) => a + Math.max(0, t[p.key] as number), 0) : 0;
  let x = 24;
  const on = PHASES.filter((p) => p.step === step);
  return (
    <g>
      <T x={24} y={22} s={9} c={INK} w={800}>
        {t ? `Your page load, measured · ${ms(t.total)}` : "Your page load · measuring…"}
      </T>
      <T x={616} y={22} s={9} a="end" c={on.length && t ? on[0].color : MUTED} w={700} m>
        {t && on.length ? on.map((p) => `${p.label} ${ms(t[p.key] as number)}`).join(" · ") : t ? `${t.files} files · ${size(t.bytes)}` : ""}
      </T>
      <rect x={24} y={30} width={592} height={10} rx={5} fill="rgba(11,11,11,0.07)" />
      {t &&
        PHASES.map((p) => {
          const w = Math.max(2, (Math.max(0, t[p.key] as number) / (total || 1)) * 592);
          const seg = (
            <rect key={p.key} x={r1(x)} y={30} width={r1(Math.min(w, 616 - x))} height={10} fill={p.color} opacity={!on.length || on.includes(p) ? 1 : 0.22} style={{ transition: "opacity .4s" }} />
          );
          x += w;
          return seg;
        })}
    </g>
  );
}

type Head = { status: number; statusText: string; headers: [string, string][] } | null;
type Json = { text: string; bytes: number; temp: number | null; wind: number | null; time: string } | null;

function Canvas({ step, still = false, t, head, json, host }: { step: number; still?: boolean; t: Timing | null; head: Head; json: Json; host: string }) {
  const kinds = useMemo(() => tileKinds(t ? (Object.fromEntries(KINDS.map((k) => [k, t.kinds[k].bytes])) as Record<Kind, number>) : DEFAULT_BYTES), [t]);
  const slots = useMemo(() => slotsFor(kinds), [kinds]);
  const bs = useMemo(() => bands(kinds), [kinds]);
  const idx = useMemo(() => {
    const c: Record<string, number> = {};
    return kinds.map((k) => (c[k] = (c[k] ?? -1) + 1));
  }, [kinds]);
  const f = FRAME(step);
  const path = "/skills/web-mobile";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="A page request travelling from a click to a finished page, with this page's real load times">
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={16} fill="#fbfaf7" stroke="rgba(11,11,11,0.08)" />
      <Strip t={t} step={step} />

      {/* the browser window */}
      <motion.g initial={false} animate={{ opacity: step >= 7 ? 0 : 1 }} transition={{ duration: 0.5 }}>
        {still ? (
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={14} fill="#fff" stroke="rgba(11,11,11,0.14)" />
        ) : (
          <motion.rect initial={false} animate={{ x: f.x, y: f.y, width: f.w, height: f.h }} transition={{ duration: 0.8, ease }} rx={14} fill="#fff" stroke="rgba(11,11,11,0.14)" />
        )}
        {[0, 1, 2].map((d) => (
          <motion.circle key={d} initial={false} animate={{ cx: f.x + 14 + d * 10, cy: f.y + 14 }} transition={{ duration: 0.8, ease }} r={3} fill={["#ff5f57", "#febc2e", "#28c840"][d]} />
        ))}
        <motion.rect initial={false} animate={{ x: f.x + 48, y: f.y + 6, width: f.w - 58 }} transition={{ duration: 0.8, ease }} height={16} rx={8} fill="#f1eee8" />
        <motion.text initial={false} animate={{ x: f.x + 58, y: f.y + 17.5 }} transition={{ duration: 0.8, ease }} fontSize={8.5} fill={INK} fontFamily={MONO}>
          {step <= 3 ? path : `${host}${path}`}
        </motion.text>
      </motion.g>

      {/* the server */}
      <Fade on={step <= 3} still={still} delay={0}>
        <rect x={496} y={150} width={128} height={186} rx={14} fill="#fff" stroke="rgba(11,11,11,0.14)" />
        <T x={560} y={168} s={9} a="middle" c={INK} w={800}>
          {"server / CDN"}
        </T>
        <T x={560} y={350} s={8} a="middle" m>
          {"this page, as files"}
        </T>
      </Fade>

      {/* 0 · the click */}
      <Fade on={step === 0} still={still}>
        <T x={36} y={150} s={14} c={INK} w={800}>
          {"Web, SaaS"}
        </T>
        <T x={36} y={168} s={14} c={INK} w={800}>
          {"& Mobile"}
        </T>
        <rect x={36} y={186} width={92} height={22} rx={11} fill={INK} />
        <T x={82} y={201} s={9} a="middle" c="#fff" w={700}>
          {"Open →"}
        </T>
        <path d="M118,200 l0,16 l4,-4 l3,7 l3,-1 l-3,-7 l6,0 z" fill="#fff" stroke={INK} strokeWidth={1.2} />
        <path d="M240,232 C330,232 400,232 490,232" fill="none" stroke="rgba(11,11,11,0.25)" strokeDasharray="4 4" />
        <T x={365} y={222} s={9} a="middle">
          {"one click → one request"}
        </T>
        <T x={365} y={252} s={8.5} a="middle" m>
          {`GET ${path}`}
        </T>
      </Fade>

      {/* 1 · DNS */}
      <Fade on={step === 1} still={still}>
        {["your cache", "resolver", "root & .com", "name server"].map((l, i) => (
          <g key={l}>
            <rect x={242 + i * 62} y={196} width={56} height={34} rx={8} fill="#fff" stroke="#6250d6" />
            <T x={270 + i * 62} y={216} s={7.5} a="middle" c="#6250d6" w={700}>
              {l}
            </T>
          </g>
        ))}
        <path d="M232,213 H490" fill="none" stroke="rgba(98,80,214,0.3)" />
        {!still && (
          <circle r={4} fill="#6250d6">
            <animateMotion dur="2.4s" repeatCount="indefinite" path="M232,213 H490 H232" />
          </circle>
        )}
        <T x={365} y={176} s={10} a="middle" c={INK} w={800}>
          {`${host} → which IP address?`}
        </T>
        <T x={365} y={258} s={9} a="middle" c="#6250d6" w={700} m>
          {t ? `for you: ${ms(t.dns)}${t.dns < 1 ? " (remembered, or localhost)" : ""}` : "measuring…"}
        </T>
      </Fade>

      {/* 2 · TCP + TLS */}
      <Fade on={step === 2} still={still}>
        <line x1={250} x2={250} y1={110} y2={356} stroke="rgba(11,11,11,0.25)" />
        <line x1={482} x2={482} y1={110} y2={356} stroke="rgba(11,11,11,0.25)" />
        <T x={250} y={104} s={8} a="middle" m>
          {"you"}
        </T>
        <T x={482} y={104} s={8} a="middle" m>
          {"server"}
        </T>
        {[
          ["SYN", 1, "#2a78d6"],
          ["SYN-ACK", -1, "#2a78d6"],
          ["ACK", 1, "#2a78d6"],
          ["ClientHello", 1, "#0f766e"],
          ["ServerHello + certificate", -1, "#0f766e"],
          ["Finished · keys agreed", 1, "#0f766e"],
        ].map(([l, dir, c], i) => {
          const y = i < 3 ? 134 + i * 32 : 250 + (i - 3) * 32;
          const x0 = dir === 1 ? 252 : 480,
            x1 = dir === 1 ? 476 : 256;
          return (
            <g key={l as string}>
              <line x1={x0} x2={x1} y1={y} y2={y + 12} stroke={c as string} strokeWidth={1.4} />
              <path d={`M${x1},${y + 12} l${dir === 1 ? -7 : 7},-5 l0,8 z`} fill={c as string} />
              <T x={366} y={y + 2} s={8} a="middle" c={c as string} w={700} m>
                {l as string}
              </T>
            </g>
          );
        })}
        <T x={366} y={122} s={9} a="middle" c="#2a78d6" w={800}>
          {"TCP · agree to talk"}
        </T>
        <T x={366} y={238} s={9} a="middle" c="#0f766e" w={800}>
          {"TLS · agree on encryption keys"}
        </T>
        <T x={366} y={378} s={9} a="middle" c={INK} w={700} m>
          {t ? `for you: connect ${ms(t.connect)} · TLS ${ms(t.tls)} · ${t.protocol}` : "measuring…"}
        </T>
      </Fade>

      {/* 3 · request, first byte */}
      <Fade on={step === 3} still={still}>
        <rect x={240} y={104} width={244} height={72} rx={10} fill="#fff" stroke="rgba(11,11,11,0.15)" />
        <T x={250} y={120} s={7.5} m>
          {"request (simplified)"}
        </T>
        {[`GET ${path}`, `Host: ${host}`, "Accept: text/html", "Accept-Encoding: br, gzip"].map((l, i) => (
          <T key={l} x={250} y={136 + i * 11} s={8.5} c={INK} m>
            {l}
          </T>
        ))}
        <rect x={240} y={200} width={244} height={96} rx={10} fill={INK} />
        <T x={250} y={216} s={7.5} c="rgba(255,255,255,0.5)" m>
          {"response (real, asked again just now)"}
        </T>
        {head ? (
          <>
            <T x={250} y={234} s={10} c="#7ee2b0" w={800} m>
              {`${head.status} ${head.statusText || "OK"}`}
            </T>
            {head.headers.slice(0, 4).map(([k, v], i) => (
              <T key={k} x={250} y={250 + i * 11} s={8} c="rgba(255,255,255,0.85)" m>
                {`${k}: ${v.length > 30 ? `${v.slice(0, 29)}…` : v}`}
              </T>
            ))}
          </>
        ) : (
          <T x={250} y={236} s={9} c="rgba(255,255,255,0.7)" m>
            {"asking…"}
          </T>
        )}
        <T x={362} y={318} s={9} a="middle" c="#c29a00" w={700} m>
          {t ? `first byte for you after ${ms(t.wait)} of waiting` : "measuring…"}
        </T>
      </Fade>

      {/* 4 · the files, grouped */}
      <Fade on={step === 4} still={still}>
        {bs
          .filter((b) => b.n > 0)
          .map((b) => (
            <g key={b.k}>
              <T x={34} y={b.y + 8} s={9} c={INK} w={800}>
                {KIND_LABEL[b.k]}
              </T>
              <T x={34} y={b.y + 19} s={7.5} m>
                {t ? `${t.kinds[b.k].n} file${t.kinds[b.k].n === 1 ? "" : "s"} · ${size(t.kinds[b.k].bytes)}` : "measuring…"}
              </T>
            </g>
          ))}
        <T x={456} y={130} s={10} c={INK} w={800}>
          {t ? `${t.files} files` : "…"}
        </T>
        <T x={456} y={146} s={9}>
          {t ? `${size(t.bytes)} over the network` : ""}
        </T>
        <T x={456} y={162} s={9}>
          {t ? `${t.cached} from your cache` : ""}
        </T>
        <T x={456} y={190} s={8} m>
          {"each square ≈ 1/96 of the bytes"}
        </T>
        {t?.local && (
          <T x={456} y={206} s={8} c={ORANGE} m>
            {"local dev server: bigger, unminified"}
          </T>
        )}
      </Fade>

      {/* 5 · build the page */}
      <Fade on={step === 5} still={still}>
        {["HTML → DOM tree", "CSS → styles", "Layout: where", "Paint: pixels"].map((l, i) => (
          <g key={l}>
            <rect x={454} y={110 + i * 50} width={162} height={32} rx={10} fill="#fff" stroke={i === 3 ? ORANGE : "rgba(11,11,11,0.15)"} />
            <T x={535} y={130 + i * 50} s={9} a="middle" c={INK} w={700}>
              {l}
            </T>
            {i < 3 && <path d={`M535,${144 + i * 50} v14`} stroke="rgba(11,11,11,0.3)" />}
          </g>
        ))}
        <T x={535} y={334} s={9} a="middle" c={ORANGE} w={800} m>
          {t ? `first content after ${msOr(t.fcp)}` : "measuring…"}
        </T>
      </Fade>

      {/* 6 · hydration */}
      <Fade on={step === 6} still={still}>
        <rect x={454} y={110} width={162} height={86} rx={12} fill={INK} />
        <T x={466} y={130} s={9} c="#fff" w={800}>
          {"JavaScript wakes it up"}
        </T>
        <T x={466} y={148} s={8} c="rgba(255,255,255,0.7)">
          {"clicks, menus, animations"}
        </T>
        <T x={466} y={164} s={8} c="rgba(255,255,255,0.7)">
          {"attached to the painted page"}
        </T>
        <T x={466} y={182} s={8} c="#e0a800" w={700}>
          {"amber = interactive now"}
        </T>
        {[
          ["ready (DOMContentLoaded)", t ? ms(t.domReady) : "…"],
          ["largest element painted", t ? msOr(t.lcp) : "…"],
          ["everything loaded", t ? ms(t.total) : "…"],
        ].map(([k, v], i) => (
          <g key={k}>
            <T x={456} y={224 + i * 30} s={8} m>
              {k}
            </T>
            <T x={456} y={238 + i * 30} s={11} c={INK} w={800} m>
              {v}
            </T>
          </g>
        ))}
      </Fade>

      {/* 7 · a phone app */}
      <Fade on={step >= 7} still={still}>
        <rect x={452} y={64} width={164} height={360} rx={26} fill="#fff" stroke={INK} strokeWidth={2} />
        <rect x={512} y={74} width={44} height={8} rx={4} fill={INK} />
        <T x={472} y={112} s={8} m>
          {"Jakarta · now"}
        </T>
        <T x={472} y={140} s={22} c={INK} w={800}>
          {json?.temp != null ? `${json.temp.toFixed(1)}°C` : "…"}
        </T>
        <T x={472} y={158} s={8}>
          {json?.wind != null ? `wind ${json.wind} km/h` : ""}
        </T>
        <rect x={24} y={64} width={410} height={360} rx={14} fill={INK} />
        <T x={40} y={88} s={8.5} c="rgba(255,255,255,0.5)" m>
          {"what the app downloads: real JSON, fetched just now (the part it uses)"}
        </T>
        {(json ? json.text.split("\n").slice(0, 14) : ["fetching…"]).map((l, i) => (
          <T key={i} x={40} y={110 + i * 13} s={9} c="rgba(255,255,255,0.88)" m>
            {l.length > 58 ? `${l.slice(0, 57)}…` : l}
          </T>
        ))}
        {json && t && (
          <g>
            <T x={40} y={326} s={8.5} c="rgba(255,255,255,0.6)">
              {"this page vs. the data an app needs"}
            </T>
            <rect x={40} y={334} width={376} height={14} rx={3} fill="#e0a800" />
            <T x={44} y={344.5} s={8.5} c={INK} w={800} m>
              {`page ${size(t.bytes)}`}
            </T>
            <rect x={40} y={354} width={Math.max(3, r1((json.bytes / t.bytes) * 376))} height={14} rx={3} fill={ORANGE} />
            <T x={48 + Math.max(3, (json.bytes / t.bytes) * 376)} y={364.5} s={8.5} c="#fff" w={800} m>
              {`data ${size(json.bytes)}`}
            </T>
            <T x={40} y={392} s={8} c="rgba(255,255,255,0.55)">
              {"the app's code, layout and images were installed once from the store"}
            </T>
          </g>
        )}
      </Fade>

      <g>
        {kinds.map((k, i) => (
          <TileRect key={i} i={i} b={place(i, k, idx[i], slots[i], step, bs.find((b) => b.k === k) ?? bs[0])} step={step} still={still} />
        ))}
      </g>
    </svg>
  );
}

/** The real response headers of this page (a HEAD request to itself) and a real JSON payload for the app step. */
function useLiveBits() {
  const [head, setHead] = useState<Head>(null);
  const [json, setJson] = useState<Json>(null);
  const [host, setHost] = useState("this site");
  useEffect(() => {
    let alive = true;
    const ctl = new AbortController();
    const id = window.setTimeout(() => {
      if (alive) setHost(location.host);
    }, 0);
    fetch(location.pathname, { method: "HEAD", cache: "no-store", signal: ctl.signal })
      .then((r) => {
        const keep = ["content-type", "cache-control", "content-encoding", "x-powered-by", "vary"];
        const headers = keep.map((k) => [k, r.headers.get(k)] as [string, string | null]).filter((x): x is [string, string] => !!x[1]);
        if (alive) setHead({ status: r.status, statusText: r.statusText, headers });
      })
      .catch(() => alive && setHead({ status: 0, statusText: "no answer", headers: [] }));
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.85&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FJakarta", { signal: ctl.signal, cache: "no-store" })
      .then((r) => r.text())
      .then((text) => {
        const j = JSON.parse(text) as { timezone?: string; current?: { temperature_2m?: number; wind_speed_10m?: number; time?: string } };
        if (!alive) return;
        setJson({ text: JSON.stringify({ timezone: j.timezone, current: j.current }, null, 1), bytes: new TextEncoder().encode(text).length, temp: j.current?.temperature_2m ?? null, wind: j.current?.wind_speed_10m ?? null, time: j.current?.time ?? "" });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      window.clearTimeout(id);
      ctl.abort();
    };
  }, []);
  return { head, json, host };
}

export function ClickToPage() {
  const t = usePageTiming();
  const { head, json, host } = useLiveBits();
  const top = t
    ? KINDS.filter((k) => t.kinds[k].n > 0)
        .sort((a, b) => t.kinds[b].bytes - t.kinds[a].bytes)
        .slice(0, 2)
        .map((k) => `${KIND_LABEL[k]} ${size(t.kinds[k].bytes)}`)
        .join(", ")
    : "";
  const steps: Step[] = [
    {
      t: "You click a link",
      d: t && !t.samePage ? `All of this happens in about a blink. The strip on top is how your first page in this tab (${t.url}) really loaded; open this page directly to measure it.` : "All of this happens in about a blink. The page you are reading is the example, and the strip on top of the picture is how it really loaded for you.",
    },
    { t: "Find the address (DNS)", d: `The browser knows a name, not a location. It asks a chain of servers which IP address the name points to, unless it remembers from last time. For you: ${ms(t?.dns)}.` },
    { t: "Shake hands (TCP + TLS)", d: `Before any data moves, both sides agree to talk (TCP) and to encrypt everything (TLS, the padlock). For you: ${ms(t ? t.connect + t.tls : null)}, over ${t?.protocol ?? "…"}.` },
    { t: "Ask, then wait for the first byte", d: `The browser sends the request; the server finds or builds the page and starts answering. You waited ${ms(t?.wait)} for the first byte. On the right, the real response headers.` },
    { t: "The bytes arrive", d: t ? `Not one file but ${t.files}: ${top} weigh the most. ${t.cached} came straight from your browser's cache.` : "Not one file but dozens, each counted by your browser as it arrived." },
    { t: "Build the page", d: `HTML becomes a tree of elements, CSS decides how each one looks, layout places them, paint draws pixels. You saw the first content after ${t ? msOr(t.fcp) : "…"}.` },
    { t: "Wake it up (hydration)", d: `The page could already be read; now JavaScript attaches the clicks, menus and animations. Ready after ${ms(t?.domReady)}, fully loaded after ${ms(t?.total)}.` },
    { t: "On a phone app, it's lighter", d: json && t ? `A mobile app installs its code once from the store, then asks only for data. Jakarta's weather right now is ${size(json.bytes)} of JSON; this page was ${size(t.bytes)}.` : "A mobile app installs its code once from the store, then asks only for data, a few hundred bytes of JSON." },
  ];
  return (
    <InsideSection
      id="click"
      kicker="Between a click and a page"
      title="What happens in the second after you click."
      line="One request, followed from your click to a finished page and then to a phone app. The timings are real: your browser measured this page as it loaded."
    >
      <Scrolly steps={steps}>
        {(step) => (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 pt-3 pb-11 sm:px-5">
            <div className="w-full max-w-[640px] overflow-hidden rounded-[16px]">
              <div
                className="w-[140%] transition-transform duration-700 ease-out [transform:translateX(calc(var(--pan)*-28.571%))] md:w-full md:[transform:none]"
                style={{ "--pan": [0.5, 0.5, 0.5, 0.5, 0.1, 0.1, 0.25, 0.9][step] ?? 0.5 } as React.CSSProperties}
              >
                <Canvas step={step} t={t} head={head} json={json} host={host} />
              </div>
            </div>
          </div>
        )}
      </Scrolly>
    </InsideSection>
  );
}

export { Canvas as ClickCanvas };
