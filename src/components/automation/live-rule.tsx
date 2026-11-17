"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Filter, Play, Pause, Zap } from "lucide-react";

/*
 * A real event-triggered automation, running in the visitor's browser: WHEN anything changes on any Wikimedia site
 * (the public EventStreams feed, no key) IF it is an article edit on a Wikipedia in the chosen languages AND it is a
 * new page or a big change THEN post an alert here. Titles, usernames and comments are dropped on arrival; only language, type, size,
 * the bot flag and the time are kept. It pauses itself, since the feed is busy.
 */
const SOURCE = "https://stream.wikimedia.org/v2/stream/recentchange";
const DOCS = "https://wikitech.wikimedia.org/wiki/Event_Platform/EventStreams_HTTP_Service";
const RUN_FOR = 90;
const INDO: Record<string, string> = { id: "Indonesian", jv: "Javanese", su: "Sundanese", min: "Minangkabau", ban: "Balinese", bjn: "Banjar", ace: "Acehnese", bug: "Buginese", mad: "Madurese", gor: "Gorontalo", map_bms: "Banyumasan", bbc: "Batak Toba", btm: "Batak Mandailing", nia: "Nias" };
const GR = "#1baf7a";
const OR = "#eb6834";
type Scope = "any" | "indo" | "en";
const SCOPES: [Scope, string][] = [
  ["any", "any language"],
  ["indo", "languages of Indonesia"],
  ["en", "English"],
];
const inScope = (code: string, s: Scope) => (s === "any" ? true : s === "en" ? code === "en" : !!INDO[code]);
let names: Intl.DisplayNames | null = null;
/** "tr" → "Turkish"; falls back to the wiki code (some wikis, like "simple" or "map_bms", aren't language tags). */
function langName(code: string) {
  if (INDO[code]) return INDO[code];
  try {
    names ??= new Intl.DisplayNames(["en"], { type: "language" });
    const n = names.of(code.replace(/_/g, "-"));
    return n && n !== code ? n : code;
  } catch {
    return code;
  }
}
type Alert = { k: number; lang: string; kind: "new page" | "big change"; delta: number; bot: boolean; t: string };
type Raw = { type?: unknown; wiki?: unknown; server_name?: unknown; bot?: unknown; timestamp?: unknown; length?: { old?: number | null; new?: number | null } };
const hhmmss = (sec: number) => new Date(sec * 1000).toLocaleTimeString("en-GB", { hour12: false });
const n0 = (v: number) => v.toLocaleString("en-US");

export function LiveRule() {
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "error">("idle");
  const [left, setLeft] = useState(RUN_FOR);
  const [min, setMin] = useState(3000);
  const [scope, setScope] = useState<Scope>("any");
  const [stats, setStats] = useState({ seen: 0, scope: 0, fired: 0, rate: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const c = useRef({ seen: 0, scope: 0, fired: 0, k: 0, lastSeen: 0 });
  const minRef = useRef(min);
  const scopeRef = useRef(scope);
  const queue = useRef<Alert[]>([]);
  useEffect(() => {
    minRef.current = min;
    scopeRef.current = scope;
  }, [min, scope]);
  useEffect(() => {
    if (status !== "running") return;
    const es = new EventSource(SOURCE);
    es.onmessage = (m) => {
      let d: Raw;
      try {
        d = JSON.parse(m.data) as Raw;
      } catch {
        return;
      }
      c.current.seen += 1;
      if (d.type !== "edit" && d.type !== "new") return;
      if (typeof d.server_name !== "string" || !d.server_name.endsWith(".wikipedia.org")) return;
      const code = typeof d.wiki === "string" ? d.wiki.replace(/wiki$/, "") : "";
      if (!inScope(code, scopeRef.current)) return;
      c.current.scope += 1;
      const delta = (d.length?.new ?? 0) - (d.length?.old ?? 0);
      const isNew = d.type === "new";
      if (!isNew && Math.abs(delta) < minRef.current) return;
      c.current.fired += 1;
      c.current.k += 1;
      queue.current.push({ k: c.current.k, lang: langName(code), kind: isNew ? "new page" : "big change", delta, bot: d.bot === true, t: typeof d.timestamp === "number" ? hhmmss(d.timestamp) : "" });
    };
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) setStatus("error");
    };
    const tick = window.setInterval(() => {
      const cur = c.current;
      setStats({ seen: cur.seen, scope: cur.scope, fired: cur.fired, rate: (cur.seen - cur.lastSeen) * 2 });
      cur.lastSeen = cur.seen;
      if (queue.current.length) {
        const add = queue.current.splice(0);
        setAlerts((a) => [...add.reverse(), ...a].slice(0, 6));
      }
    }, 500);
    const timer = window.setInterval(() => setLeft((l) => (l <= 1 ? 0 : l - 1)), 1000);
    return () => {
      es.close();
      window.clearInterval(tick);
      window.clearInterval(timer);
    };
  }, [status]);
  useEffect(() => {
    if (left === 0 && status === "running") {
      const t = window.setTimeout(() => setStatus("paused"), 0);
      return () => window.clearTimeout(t);
    }
  }, [left, status]);
  const start = () => {
    if (left === 0) setLeft(RUN_FOR);
    setStatus("running");
  };
  const blocks: { icon: ReactNode; k: string; text: ReactNode; n: number; tone: string }[] = [
    { icon: <Zap className="h-3.5 w-3.5" />, k: "When", text: "anything changes on any Wikimedia site", n: stats.seen, tone: "#2a78d6" },
    { icon: <Filter className="h-3.5 w-3.5" />, k: "If", text: `it's an article edit on a Wikipedia in ${SCOPES.find(([k]) => k === scope)?.[1]}`, n: stats.scope, tone: "#6250d6" },
    {
      icon: <Filter className="h-3.5 w-3.5" />,
      k: "And",
      text: (
        <>
          it&apos;s a new page, or ≥ <span className="font-mono">{n0(min)}</span> bytes changed
        </>
      ),
      n: stats.fired,
      tone: "#c29a00",
    },
    { icon: <Bell className="h-3.5 w-3.5" />, k: "Then", text: "post an alert below", n: stats.fired, tone: OR },
  ];
  return (
    <div className="rounded-[26px] bg-ink p-4 text-white sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-[12px] font-semibold">
          <span className={`h-2 w-2 rounded-full ${status === "running" ? "animate-pulse" : ""}`} style={{ background: status === "running" ? GR : status === "error" ? "#c8413f" : "rgba(255,255,255,0.35)" }} />
          {status === "running" ? `Running · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left` : status === "paused" ? "Paused" : status === "error" ? "The feed is unavailable right now" : "Ready"}
        </span>
        <span className="font-mono text-[11px] text-white/45">{status === "running" ? `${stats.rate} changes/s across Wikimedia` : "a real automation, in your browser"}</span>
        <button type="button" onClick={status === "running" ? () => setStatus("paused") : start} className="ml-auto flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-ink">
          {status === "running" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {status === "running" ? "Pause" : status === "idle" ? "Start the automation" : "Run again"}
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {blocks.map((b, i) => (
          <div key={b.k} className="relative rounded-2xl bg-white/[0.06] p-3">
            <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase" style={{ color: b.tone }}>
              {b.icon} {b.k}
            </p>
            <p className="mt-1 min-h-[2.6em] text-[13px] leading-snug text-white/85">{b.text}</p>
            {i !== 3 && <p className="mt-1 text-[1.35rem] leading-none font-semibold tabular-nums">{n0(b.n)}</p>}
            {i === 3 && <p className="mt-1 text-[1.35rem] leading-none font-semibold tabular-nums" style={{ color: OR }}>{n0(b.n)} alerts</p>}
            {i < 3 && <span className="absolute top-1/2 -right-2 z-10 hidden h-4 w-4 -translate-y-1/2 place-items-center rounded-full bg-ink text-[10px] text-white/60 lg:grid">→</span>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white/70">
        <span className="font-semibold text-white">Change the rule while it runs:</span>
        <label className="flex items-center gap-2">
          Wikipedias in
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="rounded-lg bg-white/10 px-2 py-1 text-white outline-none">
            {SCOPES.map(([k, label]) => (
              <option key={k} value={k} className="text-ink">
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          changes of at least
          <input type="range" min={500} max={10000} step={500} value={min} onChange={(e) => setMin(Number(e.target.value))} className="w-36" style={{ accentColor: OR }} />
          <span className="font-mono text-white">{n0(min)} bytes</span>
        </label>
      </div>
      <div className="mt-3 min-h-[148px] rounded-2xl bg-white/[0.04] p-2">
        {alerts.length === 0 ? (
          <p className="p-3 text-[12.5px] text-white/45">{status === "idle" ? "Press start: alerts appear here as real changes match the rule, usually within seconds. The languages of Indonesia are much quieter, so expect long waits with that filter." : "Waiting for a change that matches…"}</p>
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {alerts.map((a) => (
                <motion.li key={a.k} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-xl bg-white/[0.06] px-3 py-1.5 text-[12.5px]">
                  <Bell className="h-3.5 w-3.5 shrink-0" style={{ color: OR }} />
                  <span className="font-semibold">{a.lang} Wikipedia</span>
                  <span className="text-white/70">{a.kind}</span>
                  <span className="font-mono" style={{ color: a.delta >= 0 ? GR : "#ff8f7a" }}>
                    {a.delta >= 0 ? "+" : "−"}
                    {n0(Math.abs(a.delta))} bytes
                  </span>
                  {a.bot && <span className="rounded-full bg-white/10 px-1.5 text-[10.5px] text-white/60">bot</span>}
                  <span className="ml-auto font-mono text-[11px] text-white/40">{a.t}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-white/45">
        Real changes from Wikimedia&apos;s public{" "}
        <a href={DOCS} target="_blank" rel="noreferrer" className="underline">
          EventStreams
        </a>{" "}
        feed, read directly by your browser. Page titles, usernames and comments are dropped on arrival; nothing is stored. Pauses itself after {RUN_FOR} seconds.
      </p>
    </div>
  );
}
