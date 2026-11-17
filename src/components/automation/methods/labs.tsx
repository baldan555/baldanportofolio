"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lab } from "@/data/auto-methods";
import { useWidth } from "../../data-eng/use-width";

/*
 * Four building blocks you can try: a cron expression explained with its next runs (real dates, in the visitor's
 * time zone), polling against webhooks, retries with and without backoff and jitter, and idempotency keys.
 * The last three are simulations with a seeded random generator, labelled as such.
 */
const OR = "#eb6834";
const GR = "#1baf7a";
const RD = "#c8413f";
const BL = "#2a78d6";
const INK = "#0b0b0b";
const r1 = (v: number) => Math.round(v * 10) / 10;
/** Small seeded random generator (mulberry32), so a simulation is the same until you ask for a new one. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`rounded-full px-3 py-1.5 text-[12px] transition ${on ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}>
      {children}
    </button>
  );
}
function Stat({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2">
      <p className="text-[10.5px] text-ink-2/55">{k}</p>
      <p className="mt-0.5 text-[1.05rem] leading-tight font-semibold tabular-nums" style={{ color: tone }}>
        {v}
      </p>
    </div>
  );
}

/* ================================================================== cron */
type CF = { name: string; min: number; max: number; names?: string[] };
const CFIELDS: CF[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, names: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] },
  { name: "weekday", min: 0, max: 7, names: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] },
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PRESETS: [string, string][] = [
  ["0 7 * * 1-5", "weekdays at 07:00"],
  ["*/15 8-17 * * 1-5", "office hours, every 15 min"],
  ["30 8 * * 1", "Mondays 08:30"],
  ["0 9 1 * *", "1st of the month"],
  ["0 0 1 1 *", "New Year"],
];
function parseField(tok: string, f: CF): Set<number> | string {
  const out = new Set<number>();
  for (const part of tok.toUpperCase().split(",")) {
    const [range, stepS] = part.split("/");
    const step = stepS === undefined ? 1 : Number(stepS);
    if (!Number.isInteger(step) || step < 1) return `bad step “${stepS}” in ${f.name}`;
    const num = (x: string) => {
      const i = f.names?.indexOf(x) ?? -1;
      if (i >= 0) return f.name === "month" ? i + 1 : i;
      return /^\d+$/.test(x) ? Number(x) : NaN;
    };
    let a: number, b: number;
    if (range === "*") [a, b] = [f.min, f.max];
    else if (range.includes("-")) [a, b] = range.split("-").map(num) as [number, number];
    else {
      a = num(range);
      b = stepS === undefined ? a : f.max;
    }
    if (Number.isNaN(a) || Number.isNaN(b) || a < f.min || b > f.max || a > b) return `“${part}” is outside ${f.name} (${f.min}–${f.max})`;
    for (let v = a; v <= b; v += step) out.add(f.name === "weekday" && v === 7 ? 0 : v);
  }
  return out;
}
type Cron = { sets: Set<number>[]; domAny: boolean; dowAny: boolean; toks: string[] };
function parseCron(expr: string): Cron | string {
  const toks = expr.trim().split(/\s+/);
  if (toks.length !== 5) return `A cron expression has 5 fields; this one has ${toks.length}.`;
  const sets: Set<number>[] = [];
  for (let i = 0; i < 5; i++) {
    const r = parseField(toks[i], CFIELDS[i]);
    if (typeof r === "string") return r;
    sets.push(r);
  }
  return { sets, domAny: toks[2] === "*", dowAny: toks[4] === "*", toks };
}
/** The next n times a cron matches, from a moment in the local time zone (skips ahead by month, day and hour). */
function nextRuns(c: Cron, from: number, n = 5) {
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  const out: Date[] = [];
  const [mi, ho, dom, mo, dow] = c.sets;
  const dayOk = (x: Date) => {
    const a = dom.has(x.getDate()),
      b = dow.has(x.getDay());
    if (c.domAny && c.dowAny) return true;
    if (c.domAny) return b;
    if (c.dowAny) return a;
    return a || b;
  };
  for (let guard = 0; out.length < n && guard < 200000; guard++) {
    if (!mo.has(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!dayOk(d)) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!ho.has(d.getHours())) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!mi.has(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1, 0, 0);
      continue;
    }
    out.push(new Date(d));
    d.setMinutes(d.getMinutes() + 1, 0, 0);
  }
  return out;
}
const pad = (v: number) => String(v).padStart(2, "0");
const listOf = (xs: string[]) => (xs.length <= 2 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
function describe(c: Cron) {
  const [mt, ht, , , wt] = c.toks;
  const [mi, ho, dom, mo, dow] = c.sets.map((s) => [...s].sort((a, b) => a - b));
  let time: string;
  if (mi.length === 1 && ho.length === 1) time = `At ${pad(ho[0])}:${pad(mi[0])}`;
  else if (mt === "*" && ht === "*") time = "Every minute";
  else if (mt.startsWith("*/")) time = `Every ${mt.slice(2)} minutes${ht === "*" ? "" : `, during hours ${ho[0]}:00–${ho[ho.length - 1]}:59`}`;
  else if (mi.length === 1 && ht === "*") time = `At minute ${mi[0]} of every hour`;
  else if (mi.length === 1) time = `At minute ${mi[0]} past ${listOf(ho.map((h) => `${pad(h)}:00`))}`;
  else time = `At minutes ${listOf(mi.map(String))} ${ht === "*" ? "of every hour" : `past ${listOf(ho.map((h) => `${h}h`))}`}`;
  const days = wt === "1-5" ? "on weekdays" : dow.length === 7 ? "" : `on ${listOf(dow.map((d) => DAYS[d]))}`;
  const doms = dom.length === 31 ? "" : `on day ${listOf(dom.map(String))} of the month`;
  const day = c.domAny && c.dowAny ? "every day" : c.domAny ? days : c.dowAny ? doms : `${doms} or ${days}`;
  const month = mo.length === 12 ? "" : ` in ${listOf(mo.map((m) => MONTHS[m - 1]))}`;
  return `${time}, ${day}${month}.`;
}
function fromNow(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `in ${h} h ${m % 60} min`;
  return `in ${Math.round(h / 24)} days`;
}

export function CronLab() {
  const [expr, setExpr] = useState("0 7 * * 1-5");
  const [now, setNow] = useState<number | null>(null);
  const [tz, setTz] = useState("");
  useEffect(() => {
    const read = () => setNow(Date.now());
    const t = window.setTimeout(() => {
      read();
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }, 0);
    const id = window.setInterval(read, 30000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, []);
  const c = parseCron(expr);
  const runs = typeof c === "string" || now == null ? [] : nextRuns(c, now);
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(([e, label]) => (
          <Chip key={e} on={expr === e} onClick={() => setExpr(e)}>
            {label}
          </Chip>
        ))}
      </div>
      <input value={expr} onChange={(e) => setExpr(e.target.value)} spellCheck={false} aria-label="Cron expression" className="w-full rounded-2xl border border-line bg-white px-4 py-3 font-mono text-[1.35rem] tracking-[0.08em] outline-none focus:border-ink" />
      {typeof c === "string" ? (
        <p className="rounded-xl bg-[#fdf0ee] px-3 py-2 text-[13px] text-[#a3302e]">{c}</p>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {CFIELDS.map((f, i) => (
              <div key={f.name} className="rounded-xl bg-cream/60 px-2 py-2 text-center">
                <p className="font-mono text-[14px] font-semibold">{c.toks[i]}</p>
                <p className="text-[10px] leading-tight text-ink-2/55">{f.name}</p>
              </div>
            ))}
          </div>
          <p className="text-[15px] leading-snug font-semibold">{describe(c)}</p>
          <div className="rounded-2xl border border-line bg-white p-3">
            <p className="text-[11.5px] font-semibold text-ink-2/60">Next runs{tz ? `, in your time zone (${tz})` : ""}</p>
            <ol className="mt-1.5 space-y-1">
              {runs.map((d) => (
                <li key={d.getTime()} className="flex justify-between gap-3 font-mono text-[12.5px]">
                  <span>{fmt.format(d)}</span>
                  <span className="text-ink-2/50">{now != null ? fromNow(d.getTime() - now) : ""}</span>
                </li>
              ))}
              {now != null && runs.length === 0 && <li className="text-[12.5px] text-ink-2/60">No matching time in the next few years.</li>}
            </ol>
          </div>
        </>
      )}
      <p className="text-[11.5px] leading-snug text-ink-2/55">Edit the expression freely: numbers, *, ranges (1-5), lists (1,15), steps (*/10) and names (MON, JAN). When both day fields are set, cron runs on either, a classic surprise.</p>
    </div>
  );
}

/* ================================================================== polling vs webhooks */
export function PollingLab() {
  const [every, setEvery] = useState(5);
  const [perDay, setPerDay] = useState(24);
  const [seed, setSeed] = useState(7);
  const [ref, w] = useWidth(560);
  const sim = useMemo(() => {
    const r = rng(seed);
    const events = Array.from({ length: perDay }, () => r() * 1440).sort((a, b) => a - b);
    const delays = events.map((t) => Math.ceil(t / every) * every - t);
    const polls = Math.floor(1440 / every);
    const useful = new Set(events.map((t) => Math.ceil(t / every))).size;
    return { events, delays, polls, useful };
  }, [every, perDay, seed]);
  const avg = sim.delays.reduce((a, b) => a + b, 0) / Math.max(1, sim.delays.length);
  const WIN = 180; // minutes shown: 06:00–09:00
  const W0 = 360;
  const L = 74,
    R = 10,
    H = 120;
  const X = (m: number) => r1(L + ((m - W0) / WIN) * (w - L - R));
  const shown = sim.events.filter((t) => t >= W0 && t < W0 + WIN);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] font-semibold">Poll every</span>
        {[1, 5, 15, 30, 60].map((m) => (
          <Chip key={m} on={every === m} onClick={() => setEvery(m)}>
            {m} min
          </Chip>
        ))}
      </div>
      <label className="block text-[12px] font-semibold">
        <span className="flex justify-between">
          Events per day <span className="font-mono">{perDay}</span>
        </span>
        <input type="range" min={2} max={200} value={perDay} onChange={(e) => setPerDay(Number(e.target.value))} className="mt-1 w-full" style={{ accentColor: OR }} />
      </label>
      <div ref={ref} className="rounded-2xl bg-[#fbfaf7] p-2">
        <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="block h-auto max-w-full" role="img" aria-label="Three hours of events, polls and webhook deliveries">
          {[0, 60, 120, 180].map((m) => (
            <text key={m} x={X(W0 + m)} y={H - 4} fontSize={9.5} textAnchor={m === 0 ? "start" : m === 180 ? "end" : "middle"} fill="rgba(11,11,11,0.45)" fontFamily="ui-monospace, monospace">
              {pad(6 + m / 60)}:00
            </text>
          ))}
          <text x={0} y={34} fontSize={11} fontWeight={700} fontFamily="ui-sans-serif, system-ui">
            Polling
          </text>
          <text x={0} y={82} fontSize={11} fontWeight={700} fontFamily="ui-sans-serif, system-ui">
            Webhook
          </text>
          <line x1={L} x2={w - R} y1={30} y2={30} stroke="rgba(11,11,11,0.12)" />
          <line x1={L} x2={w - R} y1={78} y2={78} stroke="rgba(11,11,11,0.12)" />
          {Array.from({ length: Math.floor(WIN / every) + 1 }, (_, k) => W0 + k * every).map((t) => (
            <line key={t} x1={X(t)} x2={X(t)} y1={22} y2={38} stroke="rgba(11,11,11,0.25)" strokeWidth={every <= 1 ? 0.6 : 1.2} />
          ))}
          {shown.map((t) => {
            const d = Math.ceil(t / every) * every;
            return (
              <g key={t}>
                <path d={`M${X(t)},18 Q${(X(t) + X(d)) / 2},6 ${X(d)},18`} fill="none" stroke={OR} strokeWidth={1.2} opacity={0.7} />
                <circle cx={X(t)} cy={30} r={4} fill={OR} />
                <rect x={X(d) - 1.5} y={20} width={3} height={20} fill={GR} />
                <circle cx={X(t)} cy={78} r={4} fill={OR} />
                <rect x={X(t) - 1.5} y={68} width={3} height={20} fill={GR} />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat k="Polling: requests a day" v={sim.polls.toLocaleString("en-US")} />
        <Stat k="…that found nothing" v={`${(sim.polls - sim.useful).toLocaleString("en-US")} (${Math.round(((sim.polls - sim.useful) / sim.polls) * 100)}%)`} tone={RD} />
        <Stat k="Polling: average delay" v={avg < 1 ? `${Math.round(avg * 60)} s` : `${r1(avg)} min`} />
        <Stat k="Webhook: requests · delay" v={`${perDay} · instant`} tone={GR} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] leading-snug text-ink-2/55">Simulated: {perDay} events at random times over a day; 06:00–09:00 shown. Orange dots are events, grey ticks are polls, green marks are when the workflow finds out.</p>
        <button type="button" onClick={() => setSeed((s) => s + 1)} className="shrink-0 rounded-full border border-line px-3 py-1 text-[12px] hover:border-ink">
          New day
        </button>
      </div>
    </div>
  );
}

/* ================================================================== retries */
type Policy = "none" | "fixed" | "expo" | "jitter";
const POLICIES: [Policy, string][] = [
  ["none", "No retry"],
  ["fixed", "Every 1 s"],
  ["expo", "Backoff 2, 4, 8, 16 s"],
  ["jitter", "Backoff + jitter"],
];
const JOBS = 24;
const SPAN = 40;
function simulate(policy: Policy, max: number, outage: number, fail: number, seed: number) {
  const r = rng(seed);
  const jobs = Array.from({ length: JOBS }, () => {
    let t = r() * 0.4;
    const tries: { t: number; ok: boolean }[] = [];
    const limit = policy === "none" ? 1 : max;
    for (let k = 1; k <= limit; k++) {
      const ok = t >= outage && r() >= fail;
      tries.push({ t, ok });
      if (ok) break;
      const base = 2 * 2 ** (k - 1); // 2, 4, 8, 16 s
      t += policy === "fixed" ? 1 : policy === "expo" ? base : r() * base * 2; // full jitter: anywhere from 0 to twice the wait
    }
    return tries;
  });
  const buckets = Array.from({ length: SPAN }, () => 0);
  // retries only (not each job's first try, which all land at once by design), so herds show up
  for (const j of jobs) j.forEach((a, k) => k > 0 && a.t < SPAN && (buckets[Math.floor(a.t)] += 1));
  const done = jobs.filter((j) => j[j.length - 1].ok);
  return { jobs, buckets, ok: done.length, calls: jobs.reduce((a, j) => a + j.length, 0), peak: Math.max(...buckets), finish: done.length ? done.map((j) => j[j.length - 1].t).sort((a, b) => a - b)[Math.floor(done.length / 2)] : null };
}
export function RetryLab() {
  const [policy, setPolicy] = useState<Policy>("expo");
  const [max, setMax] = useState(5);
  const [outage, setOutage] = useState(6);
  const [fail, setFail] = useState(20);
  const [seed, setSeed] = useState(3);
  const [ref, w] = useWidth(560);
  const sim = useMemo(() => simulate(policy, max, outage, fail / 100, seed), [policy, max, outage, fail, seed]);
  const L = 8,
    R = 8,
    ROW = 6,
    TOP = 6,
    HB = 60;
  const H = TOP + JOBS * ROW + 14 + HB + 16;
  const X = (t: number) => r1(L + (Math.min(t, SPAN) / SPAN) * (w - L - R));
  const bw = (w - L - R) / SPAN;
  const bmax = Math.max(4, sim.peak);
  const y0 = TOP + JOBS * ROW + 14;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {POLICIES.map(([k, label]) => (
          <Chip key={k} on={policy === k} onClick={() => setPolicy(k)}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["Service down for", outage, 0, 15, 1, `${outage} s`, setOutage],
            ["Then fails at random", fail, 0, 60, 5, `${fail}%`, setFail],
            ["Attempts per job", max, 1, 7, 1, String(max), setMax],
          ] as const
        ).map(([label, v, mn, mx, st, show, set]) => (
          <label key={label} className="block text-[12px] font-semibold">
            <span className="flex justify-between">
              {label} <span className="font-mono">{show}</span>
            </span>
            <input type="range" min={mn} max={mx} step={st} value={v} disabled={label === "Attempts per job" && policy === "none"} onChange={(e) => set(Number(e.target.value))} className="mt-1 w-full" style={{ accentColor: OR }} />
          </label>
        ))}
      </div>
      <div ref={ref} className="rounded-2xl bg-[#fbfaf7] p-2">
        <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="block h-auto max-w-full" role="img" aria-label="Attempts of 24 jobs over 40 seconds, and calls per second">
          <rect x={X(0)} y={0} width={X(outage) - X(0)} height={y0 - 8} fill="rgba(200,65,63,0.08)" />
          {outage > 0 && (
            <text x={X(outage) - 4} y={TOP + 8} fontSize={9.5} textAnchor="end" fill={RD} fontFamily="ui-sans-serif, system-ui" fontWeight={700}>
              service down
            </text>
          )}
          {sim.jobs.map((j, i) => (
            <g key={i}>
              <line x1={X(j[0].t)} x2={X(j[j.length - 1].t)} y1={TOP + i * ROW + 3} y2={TOP + i * ROW + 3} stroke="rgba(11,11,11,0.15)" />
              {j.map((a, k) => (a.t < SPAN ? <circle key={k} cx={X(a.t)} cy={TOP + i * ROW + 3} r={2.4} fill={a.ok ? GR : RD} /> : null))}
            </g>
          ))}
          {sim.buckets.map((b, i) => (
            <rect key={i} x={L + i * bw + 0.5} y={y0 + HB - (b / bmax) * HB} width={Math.max(1, bw - 1)} height={(b / bmax) * HB} fill={b === sim.peak && b > 0 ? OR : "rgba(11,11,11,0.35)"} />
          ))}
          <text x={L} y={y0 - 2} fontSize={9.5} fill="rgba(11,11,11,0.5)" fontFamily="ui-sans-serif, system-ui">
            retries per second (biggest spike {sim.peak})
          </text>
          {[0, 10, 20, 30, 40].map((t) => (
            <text key={t} x={X(t)} y={H - 3} fontSize={9.5} textAnchor={t === 0 ? "start" : t === 40 ? "end" : "middle"} fill="rgba(11,11,11,0.45)" fontFamily="ui-monospace, monospace">
              {t} s
            </text>
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat k="Jobs that succeeded" v={`${sim.ok} of ${JOBS}`} tone={sim.ok === JOBS ? GR : sim.ok < JOBS / 2 ? RD : undefined} />
        <Stat k="Calls to the service" v={String(sim.calls)} />
        <Stat k="Biggest retry spike" v={`${sim.peak} in 1 s`} tone={sim.peak > JOBS * 0.7 ? RD : sim.peak > 0 && sim.peak <= JOBS * 0.35 ? GR : undefined} />
        <Stat k="Half done by" v={sim.finish == null ? "—" : `${r1(sim.finish)} s`} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] leading-snug text-ink-2/55">Simulated: {JOBS} jobs start at once. Red dots are failed attempts, green is success. Without jitter, every job retries in the same second, hammering a service that&apos;s trying to recover; retrying every second gives up before it&apos;s back.</p>
        <button type="button" onClick={() => setSeed((s) => s + 1)} className="shrink-0 rounded-full border border-line px-3 py-1 text-[12px] hover:border-ink">
          New run
        </button>
      </div>
    </div>
  );
}

/* ================================================================== idempotency */
type Line = { k: number; who: "client" | "server"; text: string; tone?: "bad" | "ok" };
export function IdemLab() {
  const [useKey, setUseKey] = useState(false);
  const [ledger, setLedger] = useState<{ n: number; key: string }[]>([]);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [log, setLog] = useState<Line[]>([]);
  const [seq, setSeq] = useState(0);
  const [bought, setBought] = useState(0);
  const pay = (lost: boolean) => {
    let n = seq;
    let led = [...ledger];
    const sn = { ...seen };
    const lines: Line[] = [];
    const add = (who: Line["who"], text: string, tone?: Line["tone"]) => {
      n += 1;
      lines.push({ k: n, who, text, tone });
    };
    const key = `pay-${bought + 1}`;
    const send = (attempt: number) => {
      add("client", `POST /charges Rp 150,000${useKey ? ` · key ${key}` : ""}${attempt > 1 ? " (retry)" : ""}`);
      if (useKey && sn[key] != null) {
        add("server", `key ${key} seen before: returning the stored result, no new charge`, "ok");
        return;
      }
      led = [...led, { n: led.length + 1, key: useKey ? key : "—" }];
      if (useKey) sn[key] = led.length;
      add("server", `charged Rp 150,000 (charge #${led.length})`, attempt > 1 && !useKey ? "bad" : undefined);
    };
    send(1);
    if (lost) {
      add("client", "…no reply: the connection dropped. Did it go through? Retry.", "bad");
      send(2);
    } else add("client", "200 OK: paid", "ok");
    setSeq(n);
    setBought((b) => b + 1);
    setLedger(led);
    setSeen(sn);
    setLog((l) => [...lines.reverse(), ...l].slice(0, 9));
  };
  const total = ledger.length * 150000;
  const intended = bought;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-full bg-cream/70 px-3 py-1.5 text-[12.5px] font-semibold">
          <input type="checkbox" checked={useKey} onChange={(e) => setUseKey(e.target.checked)} style={{ accentColor: OR }} />
          Send an idempotency key
        </label>
        <button type="button" onClick={() => pay(false)} className="rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white">
          Pay Rp 150,000
        </button>
        <button type="button" onClick={() => pay(true)} className="rounded-full bg-[#eb6834] px-3 py-1.5 text-[12.5px] font-semibold text-white">
          Pay, but the reply gets lost
        </button>
        <button
          type="button"
          onClick={() => {
            setLedger([]);
            setSeen({});
            setLog([]);
            setBought(0);
          }}
          className="rounded-full border border-line px-3 py-1.5 text-[12.5px] hover:border-ink"
        >
          Reset
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ol className="min-h-[180px] space-y-1 rounded-2xl bg-[#fbfaf7] p-2.5">
          {log.length === 0 && <li className="p-2 text-[12.5px] text-ink-2/55">Press a button. Try “reply gets lost” with the key off, then on.</li>}
          {log.map((l) => (
            <li key={l.k} className="flex gap-2 rounded-lg px-2 py-1 text-[12px] leading-snug" style={{ background: l.tone === "bad" ? "#fdf0ee" : l.tone === "ok" ? "#eaf8f1" : "#ffffff" }}>
              <span className="w-12 shrink-0 font-mono text-[10.5px] font-bold" style={{ color: l.who === "client" ? BL : INK }}>
                {l.who}
              </span>
              <span style={{ color: l.tone === "bad" ? "#a3302e" : l.tone === "ok" ? "#0f6e4c" : undefined }}>{l.text}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col rounded-2xl bg-ink p-3 text-white">
          <p className="text-[11px] text-white/50">Customer was charged</p>
          <p className="text-[1.6rem] leading-tight font-semibold tabular-nums" style={{ color: ledger.length > intended ? "#ff8f7a" : "#fff" }}>
            Rp {total.toLocaleString("en-US")}
          </p>
          <p className="mt-0.5 text-[12px] text-white/60">
            for {intended} purchase{intended === 1 ? "" : "s"} · {ledger.length} charge{ledger.length === 1 ? "" : "s"}
          </p>
          {ledger.length > intended && <p className="mt-2 rounded-lg bg-white/10 px-2 py-1.5 text-[12px] text-[#ffb59a]">Charged twice for one purchase: the retry looked like a new payment.</p>}
          <p className="mt-auto pt-2 text-[11px] leading-snug text-white/45">With a key, the server remembers each purchase and answers a repeat with the stored result.</p>
        </div>
      </div>
    </div>
  );
}

export function MethodLab({ lab }: { lab: Lab }) {
  if (lab === "cron") return <CronLab />;
  if (lab === "polling") return <PollingLab />;
  if (lab === "retry") return <RetryLab />;
  return <IdemLab />;
}
