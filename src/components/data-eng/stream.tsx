"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FONT, GRID, INK, MONO, MUTED, PAL, fmt, nice, r1 } from "@/components/analytics/charts/kit";
import { Card } from "@/components/analytics/dashboards/sales/tiles";
import { useWidth } from "./use-width";

/*
 * A small streaming pipeline that runs in the visitor's browser on Wikimedia's public recentchange stream
 * (server-sent events, no key): parse → filter → privacy map → 10-second event-time windows with a watermark,
 * plus a side output for late events. Only counts are kept; titles, usernames and comments are dropped on arrival.
 */
const SOURCE = "https://stream.wikimedia.org/v2/stream/recentchange";
const DOCS = "https://wikitech.wikimedia.org/wiki/Event_Platform/EventStreams_HTTP_Service";
const WIN = 10; // seconds per tumbling event-time window
const SHOW = 30; // windows on screen: the last five minutes
const RUN_FOR = 120; // seconds of streaming before it pauses itself (the stream is busy, so it uses data)
const LATENESS = [0, 2, 5, 10];
const ORANGE = "#eb6834";
const GREEN = "#1baf7a";
const RED = "#c8413f";
const BLUE = PAL[0];
const TYPES = ["edit", "new", "categorize", "log"] as const;
type Kind = (typeof TYPES)[number] | "other";
const KIND_COLOR: Record<Kind, string> = { edit: INK, new: GREEN, categorize: BLUE, log: "#c29a00", other: "#8a8a8a" };
const KIND_NOTE: Record<Kind, string> = { edit: "edit", new: "new page", categorize: "category", log: "log action", other: "other" };
/** Wikipedias in languages of Indonesia, by database name without the "wiki" suffix. */
const INDO: [string, string][] = [
  ["id", "Indonesian"],
  ["jv", "Javanese"],
  ["su", "Sundanese"],
  ["min", "Minangkabau"],
  ["ban", "Balinese"],
  ["bjn", "Banjar"],
  ["ace", "Acehnese"],
  ["bug", "Buginese"],
  ["mad", "Madurese"],
  ["gor", "Gorontalo"],
  ["map_bms", "Banyumasan"],
  ["bbc", "Batak Toba"],
  ["btm", "Batak Mandailing"],
  ["nia", "Nias"],
];
const INDO_CODES = new Set(INDO.map(([c]) => c));
const LAG_BUCKETS: [number, number, string][] = [
  [0, 1, "<1"],
  [1, 2, "1–2"],
  [2, 3, "2–3"],
  [3, 5, "3–5"],
  [5, 10, "5–10"],
  [10, 30, "10–30"],
  [30, Infinity, "30+"],
];
const enc = new TextEncoder();

/* ------------------------------------------------------------------ the engine (plain objects, no React) */
type Win = { start: number; human: number; bot: number; late: number; added: number; removed: number; sites: Map<string, number> };
type Rec = { site: string; kind: Kind; bot: boolean; delta: number | null; lag: number };
type Raw = { timestamp?: unknown; wiki?: unknown; server_name?: unknown; type?: unknown; bot?: unknown; meta?: { domain?: unknown }; length?: { old?: number | null; new?: number | null } };

function engine() {
  return {
    received: 0,
    bytes: 0,
    bad: 0,
    canary: 0,
    kept: 0,
    late: 0,
    ooo: 0,
    fieldsIn: 0,
    maxT: 0, // newest event time seen (seconds)
    wins: new Map<number, Win>(),
    lags: [] as number[], // the last 500 lags, seconds
    recent: [] as Rec[],
    cross: { human: {} as Partial<Record<Kind, number>>, bot: {} as Partial<Record<Kind, number>> },
    indo: {} as Record<string, number>,
    indoLast: 0,
    perSec: [] as [number, number][],
  };
}
type Engine = ReturnType<typeof engine>;

/** One event through the pipeline. */
function ingest(E: Engine, data: string, lateness: number) {
  E.received += 1;
  E.bytes += enc.encode(data).length;
  // parse
  let e: Raw;
  try {
    e = JSON.parse(data) as Raw;
  } catch {
    E.bad += 1;
    return;
  }
  // filter: Wikimedia sends canary test events; anything without an event time or wiki is malformed
  if (e.meta?.domain === "canary") {
    E.canary += 1;
    return;
  }
  const t = e.timestamp;
  if (typeof t !== "number" || typeof e.wiki !== "string") {
    E.bad += 1;
    return;
  }
  // privacy map: keep five fields, drop the rest (titles, usernames, comments …)
  E.fieldsIn = Math.max(E.fieldsIn, Object.keys(e).length);
  const now = Date.now() / 1000;
  const len = e.length;
  const rec: Rec = {
    site: String(e.server_name ?? e.wiki).replace(/\.org$/, ""),
    kind: (TYPES as readonly string[]).includes(e.type as string) ? (e.type as Kind) : "other",
    bot: e.bot === true,
    delta: len && typeof len.new === "number" ? len.new - (len.old ?? 0) : null,
    lag: Math.max(0, now - t),
  };
  E.kept += 1;
  E.lags.push(rec.lag);
  if (E.lags.length > 500) E.lags.shift();
  if (t < E.maxT) E.ooo += 1;
  // window by event time; a window is closed once the watermark (newest event time − allowed lateness) passes its end
  const ws = Math.floor(t / WIN) * WIN;
  if (E.maxT > 0 && ws + WIN <= E.maxT - lateness) {
    E.late += 1; // side output: counted, never changes a closed window
    const w = E.wins.get(ws);
    if (w) w.late += 1;
  } else {
    let w = E.wins.get(ws);
    if (!w) {
      w = { start: ws, human: 0, bot: 0, late: 0, added: 0, removed: 0, sites: new Map() };
      E.wins.set(ws, w);
    }
    if (rec.bot) w.bot += 1;
    else w.human += 1;
    if (rec.delta != null) {
      if (rec.delta >= 0) w.added += rec.delta;
      else w.removed -= rec.delta;
    }
    w.sites.set(rec.site, (w.sites.get(rec.site) ?? 0) + 1);
  }
  if (t > E.maxT) {
    E.maxT = t;
    const oldest = (Math.floor(t / WIN) - SHOW * 2) * WIN;
    for (const k of E.wins.keys()) if (k < oldest) E.wins.delete(k);
  }
  // running totals
  const side = rec.bot ? E.cross.bot : E.cross.human;
  side[rec.kind] = (side[rec.kind] ?? 0) + 1;
  const m = /^(.+)wiki$/.exec(e.wiki);
  if (m && INDO_CODES.has(m[1])) {
    E.indo[m[1]] = (E.indo[m[1]] ?? 0) + 1;
    E.indoLast = now;
  }
  E.recent.unshift(rec);
  if (E.recent.length > 6) E.recent.pop();
  const sec = Math.floor(now);
  const last = E.perSec[E.perSec.length - 1];
  if (last && last[0] === sec) last[1] += 1;
  else {
    E.perSec.push([sec, 1]);
    if (E.perSec.length > 10) E.perSec.shift();
  }
}

/** A plain snapshot for React, taken twice a second. */
function snapshot(E: Engine, lateness: number) {
  const now = Date.now() / 1000;
  const wm = E.maxT ? E.maxT - lateness : 0;
  const last = E.maxT ? Math.floor(E.maxT / WIN) * WIN : 0;
  const windows = Array.from({ length: SHOW }, (_, k) => {
    const start = last - (SHOW - 1 - k) * WIN;
    const w = E.wins.get(start);
    return { start, human: w?.human ?? 0, bot: w?.bot ?? 0, late: w?.late ?? 0, added: w?.added ?? 0, removed: w?.removed ?? 0, open: start + WIN > wm };
  });
  const sites = new Map<string, number>();
  for (const w of E.wins.values()) if (w.start > last - 60) for (const [s, n] of w.sites) sites.set(s, (sites.get(s) ?? 0) + n);
  const ranked = [...sites.entries()].sort((a, b) => b[1] - a[1]);
  const lags = [...E.lags].sort((a, b) => a - b);
  const q = (p: number) => (lags.length ? lags[Math.min(lags.length - 1, Math.floor(lags.length * p))] : 0);
  const sec = Math.floor(now);
  const rate = E.perSec.filter(([s]) => s < sec && s >= sec - 5).reduce((a, [, n]) => a + n, 0) / 5;
  return {
    received: E.received,
    bytes: E.bytes,
    dropped: E.bad + E.canary,
    kept: E.kept,
    late: E.late,
    ooo: E.ooo,
    fieldsIn: E.fieldsIn,
    wm,
    windows,
    top: ranked.slice(0, 8),
    active: ranked.length,
    idN: sites.get("id.wikipedia") ?? 0,
    p50: q(0.5),
    p95: q(0.95),
    hist: LAG_BUCKETS.map(([a, b, label]) => ({ label, n: lags.filter((v) => v >= a && v < b).length })),
    nLags: lags.length,
    cross: { human: { ...E.cross.human }, bot: { ...E.cross.bot } },
    indo: { ...E.indo },
    indoAgo: E.indoLast ? now - E.indoLast : null,
    recent: [...E.recent],
    rate,
  };
}
type Snap = ReturnType<typeof snapshot>;
type Status = "idle" | "connecting" | "live" | "reconnecting" | "paused" | "error";

/* ------------------------------------------------------------------ formatting */
const n0 = (v: number) => v.toLocaleString("en-US");
const mb = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const utc = (t: number) => (t ? `${new Date(t * 1000).toISOString().slice(11, 19)} UTC` : "–");
const size = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(1)} MB` : a >= 1e3 ? `${Math.round(a / 1e3)} KB` : `${a} B`;
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${s}`;
};
const pctOf = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(a / b < 0.1 ? 1 : 0)}%` : "0%");

/* ------------------------------------------------------------------ pieces */
function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, [string, string]> = {
    idle: ["not connected", "rgba(255,255,255,0.35)"],
    connecting: ["connecting…", "#c29a00"],
    live: ["live", GREEN],
    reconnecting: ["reconnecting…", "#c29a00"],
    paused: ["paused", "rgba(255,255,255,0.5)"],
    error: ["unavailable", RED],
  };
  const [label, color] = map[status];
  return (
    <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-mono text-[11px]">
      <span className={`h-2 w-2 rounded-full ${status === "live" ? "animate-pulse" : ""}`} style={{ background: color }} />
      {label}
    </span>
  );
}

function Kpi({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] px-3 py-2.5">
      <p className="text-[11px] text-white/50">{k}</p>
      <p className="mt-0.5 text-[1.35rem] leading-tight font-semibold tracking-[-0.02em] tabular-nums">{v}</p>
    </div>
  );
}

function Op({ i, t, d, v, live, accent }: { i: number; t: string; d: string; v: string; live: boolean; accent?: string }) {
  return (
    <div className={`relative flex flex-col rounded-[18px] border bg-white p-3 ${accent ? "" : "border-line"}`} style={accent ? { borderColor: accent } : undefined}>
      {live && <span className="absolute top-3 right-3 h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accent ?? GREEN }} />}
      <span className="font-mono text-[10.5px] text-muted">0{i}</span>
      <p className="mt-1 text-[13.5px] leading-tight font-semibold" style={{ color: accent }}>
        {t}
      </p>
      <p className="mt-1 flex-1 text-[11.5px] leading-snug text-ink-2/60">{d}</p>
      <p className="mt-2 font-mono text-[11px] leading-snug tabular-nums">{v}</p>
    </div>
  );
}

function WindowChart({ s }: { s: Snap | null }) {
  const [ref, w] = useWidth(640);
  const H = 214,
    L = 34,
    R = 8,
    T = 24,
    B = 22;
  const pw = w - L - R,
    ph = H - T - B,
    bw = pw / SHOW;
  const wins = s?.windows ?? [];
  const max = nice(Math.max(20, ...wins.map((x) => x.human + x.bot)));
  const y = (v: number) => r1(T + ph - (v / max) * ph);
  const x0 = wins.length ? wins[0].start : 0;
  const wmX = s && s.wm ? r1(L + ((s.wm - x0) / (SHOW * WIN)) * pw) : null;
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="block h-auto max-w-full" role="img" aria-label="Events per ten-second window, people and bots">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={w - R} y1={y(max * f)} y2={y(max * f)} stroke={GRID} />
            <text x={L - 6} y={y(max * f) + 3} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={MONO}>
              {fmt(max * f)}
            </text>
          </g>
        ))}
        {wins.map((x, k) => {
          const bx = r1(L + k * bw + 1),
            bwi = r1(Math.max(1, bw - 2));
          const op = x.open ? 0.32 : 1;
          return (
            <g key={x.start}>
              {x.human > 0 && <rect x={bx} y={y(x.human)} width={bwi} height={r1(T + ph - y(x.human))} fill={INK} fillOpacity={op} rx={1.5} />}
              {x.bot > 0 && <rect x={bx} y={y(x.human + x.bot)} width={bwi} height={r1(y(x.human) - y(x.human + x.bot))} fill={BLUE} fillOpacity={op} rx={1.5} />}
              {x.open && x.human + x.bot > 0 && <rect x={bx} y={y(x.human + x.bot)} width={bwi} height={r1(T + ph - y(x.human + x.bot))} fill="none" stroke={INK} strokeOpacity={0.45} strokeDasharray="3 2" rx={1.5} />}
              {x.late > 0 && (
                <g>
                  <circle cx={r1(bx + bwi / 2)} cy={r1(y(x.human + x.bot) - 7)} r={3.2} fill={ORANGE} />
                  {bw >= 16 && (
                    <text x={r1(bx + bwi / 2)} y={r1(y(x.human + x.bot) - 13)} textAnchor="middle" fontSize={9} fill={ORANGE} fontWeight={700} fontFamily={MONO}>
                      {x.late}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
        {wmX != null && wmX >= L && wmX <= w - R && (
          <g>
            <line x1={wmX} x2={wmX} y1={T - 10} y2={T + ph} stroke={ORANGE} strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={wmX - 4} y={T - 13} textAnchor="end" fontSize={10} fill={ORANGE} fontWeight={700} fontFamily={FONT}>
              watermark
            </text>
          </g>
        )}
        {[0, 6, 12, 18, 24].map((k) => (
          <text key={k} x={r1(L + k * bw)} y={H - 6} fontSize={10} fill={MUTED} fontFamily={FONT}>
            −{5 - k / 6} min
          </text>
        ))}
        <text x={w - R} y={H - 6} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
          newest
        </text>
        {!s && (
          <text x={w / 2} y={T + ph / 2} textAnchor="middle" fontSize={13} fill={MUTED} fontFamily={FONT}>
            Press start: windows fill as edits arrive.
          </text>
        )}
      </svg>
    </div>
  );
}

function BytesChart({ s }: { s: Snap | null }) {
  const [ref, w] = useWidth(560);
  const H = 150,
    L = 44,
    R = 8,
    T = 8,
    B = 8;
  const pw = w - L - R,
    half = (H - T - B) / 2,
    mid = T + half,
    bw = pw / SHOW;
  const wins = s?.windows ?? [];
  const max = nice(Math.max(5000, ...wins.map((x) => Math.max(x.added, x.removed))));
  const h = (v: number) => r1((v / max) * half);
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="block h-auto max-w-full" role="img" aria-label="Bytes added and removed per ten-second window">
        <line x1={L} x2={w - R} y1={mid} y2={mid} stroke={INK} strokeOpacity={0.25} />
        <text x={L - 6} y={T + 9} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={MONO}>
          {size(max)}
        </text>
        <text x={L - 6} y={H - B} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={MONO}>
          {size(-max)}
        </text>
        {wins.map((x, k) => {
          const bx = r1(L + k * bw + 1),
            bwi = r1(Math.max(1, bw - 2)),
            op = x.open ? 0.35 : 1;
          return (
            <g key={x.start}>
              {x.added > 0 && <rect x={bx} y={r1(mid - h(x.added))} width={bwi} height={h(x.added)} fill={GREEN} fillOpacity={op} rx={1.5} />}
              {x.removed > 0 && <rect x={bx} y={mid} width={bwi} height={h(x.removed)} fill={RED} fillOpacity={op} rx={1.5} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="grid min-h-[120px] place-items-center rounded-xl bg-cream/50 px-4 text-center text-[12.5px] text-ink-2/55">{children}</p>;
}

/* ------------------------------------------------------------------ the lab */
export function WikiStream() {
  const [status, setStatus] = useState<Status>("idle");
  const [note, setNote] = useState("");
  const [lateness, setLateness] = useState(2);
  const [snap, setSnap] = useState<Snap | null>(null);
  const [left, setLeft] = useState(RUN_FOR);
  const es = useRef<EventSource | null>(null);
  const eng = useRef<Engine | null>(null);
  const lat = useRef(2);
  const budget = useRef(RUN_FOR * 1000);
  const statusRef = useRef<Status>("idle");

  const set = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);
  const pause = useCallback(
    (why: string) => {
      es.current?.close();
      es.current = null;
      set("paused");
      setNote(why);
      if (eng.current) setSnap(snapshot(eng.current, lat.current));
    },
    [set],
  );
  const start = () => {
    if (es.current) return;
    if (!eng.current) eng.current = engine();
    budget.current = RUN_FOR * 1000;
    setLeft(RUN_FOR);
    setNote("");
    set("connecting");
    const src = new EventSource(SOURCE);
    es.current = src;
    src.onopen = () => set("live");
    src.onmessage = (m: MessageEvent<string>) => {
      if (eng.current) ingest(eng.current, m.data, lat.current);
    };
    src.onerror = () => {
      if (src.readyState === EventSource.CLOSED) {
        es.current = null;
        set("error");
        setNote("The stream could not be reached. Try again in a moment.");
      } else set("reconnecting");
    };
  };
  const clear = () => {
    eng.current = null;
    setSnap(null);
    setNote("");
    set("idle");
  };
  const pick = (v: number) => {
    lat.current = v;
    setLateness(v);
  };

  // twice a second: publish a snapshot and count down to the automatic pause
  useEffect(() => {
    if (status !== "live" && status !== "connecting" && status !== "reconnecting") return;
    const id = window.setInterval(() => {
      if (statusRef.current === "live") {
        budget.current -= 500;
        setLeft(Math.max(0, Math.ceil(budget.current / 1000)));
        if (budget.current <= 0) {
          pause(`Paused itself after ${RUN_FOR / 60} minutes to save your data. Resume for ${RUN_FOR / 60} more.`);
          return;
        }
      }
      if (eng.current) setSnap(snapshot(eng.current, lat.current));
    }, 500);
    return () => window.clearInterval(id);
  }, [status, pause]);

  // pause when the tab goes to the background, and close the connection when leaving the page
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && es.current) pause("Paused while this tab was in the background.");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      es.current?.close();
      es.current = null;
    };
  }, [pause]);

  const s = snap;
  const running = status === "live" || status === "connecting" || status === "reconnecting";
  const openN = s ? s.windows.filter((x) => x.open && x.human + x.bot > 0).length : 0;
  const closedN = s ? s.windows.filter((x) => !x.open && x.human + x.bot > 0).length : 0;
  const humanN = s ? Object.values(s.cross.human).reduce((a, b) => a + (b ?? 0), 0) : 0;
  const botN = s ? Object.values(s.cross.bot).reduce((a, b) => a + (b ?? 0), 0) : 0;
  const shown = s ? s.windows.filter((x) => x.human + x.bot > 0) : [];
  const added = shown.reduce((a, x) => a + x.added, 0);
  const removed = shown.reduce((a, x) => a + x.removed, 0);
  const topMax = s?.top[0]?.[1] ?? 1;
  const histMax = s ? Math.max(1, ...s.hist.map((h) => h.n)) : 1;
  const sites = s ? (s.top.some(([k]) => k === "id.wikipedia") ? s.top : [...s.top, ["id.wikipedia", s.idN] as [string, number]]) : [];

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      {/* controls */}
      <section className="rounded-[24px] bg-ink p-5 text-white sm:p-6 lg:col-span-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.16em] text-white/50 uppercase">Wikimedia EventStreams · recentchange</p>
            <p className="mt-1 max-w-xl text-[1.6rem] leading-tight font-semibold tracking-[-0.03em] sm:text-[2rem]">Every change on every Wikimedia wiki, as it happens.</p>
            <StatusPill status={status} />
          </div>
          <div className="flex flex-wrap gap-2">
            {running ? (
              <button type="button" onClick={() => pause("Paused.")} className="rounded-full bg-white/15 px-5 py-2.5 text-[14px] font-semibold transition hover:bg-white/25">
                Pause
              </button>
            ) : (
              <button type="button" onClick={start} className="rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:bg-white/85">
                {status === "idle" ? "Start the stream" : "Resume"}
              </button>
            )}
            {(status === "paused" || status === "error") && s && (
              <button type="button" onClick={clear} className="rounded-full px-4 py-2.5 text-[14px] text-white/70 ring-1 ring-white/20 transition hover:text-white">
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi k="events processed" v={n0(s?.kept ?? 0)} />
          <Kpi k="events per second" v={s && running ? s.rate.toFixed(1) : "–"} />
          <Kpi k="event data received" v={mb(s?.bytes ?? 0)} />
          <Kpi k={running ? "pauses itself in" : "runs for"} v={clock(running ? left : RUN_FOR)} />
        </div>
        <p className="mt-3 text-[12.5px] text-white/60">{note || "Connects only when you press start, and pauses itself after two minutes or when you switch tabs: the stream is busy, so it uses data."}</p>
      </section>

      {/* operators */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-12 lg:grid-cols-6">
        <Op i={1} t="Source" d="Server-sent events over HTTPS, one JSON event per change" v={s ? `${n0(s.received)} events · ${mb(s.bytes)}` : "waiting"} live={status === "live"} />
        <Op i={2} t="Parse & filter" d="Parse JSON; drop malformed events and Wikimedia's canary test events" v={s ? `${n0(s.kept)} kept · ${n0(s.dropped)} dropped` : "waiting"} live={status === "live"} />
        <Op i={3} t="Privacy map" d={`Keep 5 of up to ${s?.fieldsIn || 25} fields; titles, usernames and comments are dropped`} v="wiki · type · bot · size · time" live={status === "live"} />
        <Op i={4} t="Window" d={`${WIN}-second tumbling windows by event time, ${lateness} s allowed lateness`} v={`watermark ${utc(s?.wm ?? 0)}`} live={status === "live"} />
        <Op i={5} t="Late → side output" d="Events for a window that already closed: counted apart, never rewrite a number" v={s ? `${n0(s.late)} late (${pctOf(s.late, s.kept)})` : "waiting"} live={status === "live"} accent={ORANGE} />
        <Op i={6} t="Aggregate → sink" d="Counts, bytes and busiest wikis per window, drawn below" v={s ? `${openN} open · ${closedN} closed` : "waiting"} live={status === "live"} />
      </section>

      {/* windows */}
      <Card
        className="lg:col-span-8"
        title="Changes per 10-second window"
        sub="By event time (when the change happened), people and bots stacked, last five minutes. Faded bars are windows still open."
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold">Allowed lateness</span>
          <div className="flex items-center gap-1 rounded-full bg-cream p-0.5" role="group" aria-label="Allowed lateness">
            {LATENESS.map((v) => (
              <button key={v} type="button" onClick={() => pick(v)} aria-pressed={lateness === v} className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition ${lateness === v ? "bg-ink text-white" : "text-ink/60 hover:text-ink"}`}>
                {v} s
              </button>
            ))}
          </div>
        </div>
        <WindowChart s={s} />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-2/65">
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm" style={{ background: INK }} /> people
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm" style={{ background: BLUE }} /> bots
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: ORANGE }} /> late events for that window
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-2/65">
          The watermark trails the newest event time by the allowed lateness. When it passes the end of a window, that window closes and its numbers are final; anything that turns up later for it goes to the side output. More lateness means fewer late events, but every number is published later.
        </p>
      </Card>

      {/* freshness */}
      <Card className="lg:col-span-4" title="Freshness" sub={`Seconds from the change to your screen, last ${s?.nLags || 500} events`}>
        {s && s.nLags ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-cream/60 px-3 py-2">
                <p className="text-[11px] text-ink-2/55">median</p>
                <p className="text-[1.3rem] font-semibold tabular-nums">{s.p50 < 1 ? "under 1" : s.p50.toFixed(1)} s</p>
              </div>
              <div className="rounded-xl bg-cream/60 px-3 py-2">
                <p className="text-[11px] text-ink-2/55">95th percentile</p>
                <p className="text-[1.3rem] font-semibold tabular-nums">{s.p95 < 1 ? "under 1" : s.p95.toFixed(1)} s</p>
              </div>
            </div>
            <div className="mt-3 flex h-24 items-end gap-1">
              {s.hist.map((h, i) => (
                <div key={h.label} className="flex h-full flex-1 flex-col justify-end">
                  <span className="mb-0.5 text-center font-mono text-[9.5px] text-ink-2/55">{h.n || ""}</span>
                  <div className="rounded-t-[4px]" style={{ height: `${h.n ? Math.max(3, (h.n / histMax) * 78) : 0}%`, background: i >= 3 ? ORANGE : INK }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-1 border-t border-line pt-1">
              {s.hist.map((h) => (
                <span key={h.label} className="flex-1 text-center font-mono text-[9.5px] text-ink-2/55">
                  {h.label}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] leading-snug text-ink-2/60">
              {pctOf(s.ooo, s.kept)} arrived after a newer change (out of order), but only {pctOf(s.late, s.kept)} were later than the watermark allows. Change times are whole seconds and measured against your device clock, so read these as approximate.
            </p>
          </>
        ) : (
          <Empty>Waiting for events.</Empty>
        )}
      </Card>

      {/* busiest wikis */}
      <Card className="lg:col-span-5" title="Busiest wikis, last 60 seconds" sub={s ? `${n0(s.active)} wikis active · id.wikipedia always shown` : "By event time, from the windows above"}>
        {s && s.top.length ? (
          <div className="space-y-1">
            {sites.map(([k, n]) => (
              <div key={k} className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-2 text-[12px]">
                <span className={`truncate font-mono text-[11px] ${k === "id.wikipedia" ? "font-bold" : ""}`} style={{ color: k === "id.wikipedia" ? ORANGE : undefined }}>
                  {k}
                </span>
                <span className="h-3 rounded-[3px] bg-cream/70">
                  <span className="block h-full rounded-[3px] transition-[width] duration-500" style={{ width: `${(n / topMax) * 100}%`, background: k === "id.wikipedia" ? ORANGE : INK }} />
                </span>
                <span className="w-9 text-right font-mono text-[11px] tabular-nums">{n0(n)}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>The busiest wikis show up here.</Empty>
        )}
      </Card>

      {/* people vs bots */}
      <Card className="lg:col-span-4" title="Who changes what" sub={s && s.kept ? `Since start · bots made ${pctOf(botN, humanN + botN)} of changes` : "Since start, people and bots by kind of change"}>
        {s && s.kept ? (
          <div className="space-y-3">
            {(
              [
                ["People", s.cross.human, humanN],
                ["Bots", s.cross.bot, botN],
              ] as const
            ).map(([label, row, total]) => (
              <div key={label}>
                <div className="flex justify-between text-[12px]">
                  <span className="font-semibold">{label}</span>
                  <span className="font-mono text-[11px] text-ink-2/60">{n0(total)}</span>
                </div>
                <div className="mt-1 flex h-4 overflow-hidden rounded-[4px] bg-cream/70">
                  {(["edit", "new", "categorize", "log", "other"] as Kind[]).map((k) => (
                    <span key={k} className="h-full transition-[width] duration-500" style={{ width: `${((row[k] ?? 0) / Math.max(1, humanN + botN)) * 100}%`, background: KIND_COLOR[k] }} title={`${KIND_NOTE[k]}: ${row[k] ?? 0}`} />
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[11px] text-ink-2/65">
              {(["edit", "new", "categorize", "log"] as Kind[]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-sm" style={{ background: KIND_COLOR[k] }} />
                  {KIND_NOTE[k]}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <Empty>People and bots, by kind of change.</Empty>
        )}
      </Card>

      {/* Indonesia */}
      <Card className="lg:col-span-3" title="Languages of Indonesia" sub={s?.indoAgo != null ? `Last change ${Math.round(s.indoAgo)} s ago` : "Changes on these Wikipedias since start"}>
        <div className="grid grid-cols-2 gap-1">
          {INDO.map(([c, name]) => {
            const n = s?.indo[c] ?? 0;
            return (
              <div key={c} className={`flex items-center justify-between rounded-lg px-2 py-1 text-[11.5px] ${n ? "bg-[#eb6834]/10" : "bg-cream/50 text-ink/35"}`}>
                <span className="truncate">{name}</span>
                <span className="ml-1 font-mono text-[10.5px] tabular-nums">{n}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* bytes */}
      <Card className="lg:col-span-7" title="Bytes added and removed" sub={s && shown.length ? `Page size changes per window · on screen: ${size(added)} added, ${size(-removed)} removed, net ${size(added - removed)}` : "Page size changes per window, same windows as above"}>
        <BytesChart s={s} />
      </Card>

      {/* records */}
      <Card className="lg:col-span-5" title="What the pipeline keeps" sub="The newest records after the privacy map: five fields, nothing that names a page or a person">
        {s && s.recent.length ? (
          <div className="space-y-1 font-mono text-[11px]">
            {s.recent.map((r, i) => (
              <div key={`${s.kept}-${i}`} className="flex items-center gap-2 rounded-lg bg-cream/50 px-2 py-1">
                <span className="min-w-0 flex-1 truncate">{r.site}</span>
                <span style={{ color: KIND_COLOR[r.kind] }}>{r.kind}</span>
                <span className="w-10 text-ink-2/60">{r.bot ? "bot" : "person"}</span>
                <span className="w-14 text-right" style={{ color: r.delta == null ? undefined : r.delta >= 0 ? GREEN : RED }}>
                  {r.delta == null ? "–" : size(r.delta)}
                </span>
                <span className="w-10 text-right text-ink-2/60">{r.lag.toFixed(0)} s</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Records appear here as they pass the privacy step.</Empty>
        )}
      </Card>

      <p className="text-[11.5px] leading-relaxed text-ink-2/55 lg:col-span-12">
        Source:{" "}
        <a href={DOCS} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Wikimedia EventStreams
        </a>{" "}
        (public, no key), the <span className="font-mono">recentchange</span> stream of every Wikimedia wiki, read straight from your browser. Only counts are computed and nothing is stored or sent anywhere.
      </p>
    </div>
  );
}
