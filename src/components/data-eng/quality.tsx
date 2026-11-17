"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { INK, r1 } from "@/components/analytics/charts/kit";
import { MONTH_SHORT } from "@/lib/months";

/*
 * Live data-quality checks: three public APIs are fetched from the visitor's browser and eight checks run on each
 * (freshness, volume, schema, uniqueness, grain, completeness, validity, anomaly). A fault can be injected into the
 * fetched copy to watch the checks catch it; the APIs themselves are never changed.
 */
const HOUR = 3_600_000;
const DAY = 86_400_000;
const GREEN = "#1baf7a";
const AMBER = "#c29a00";
const RED = "#c8413f";
type FeedId = "air" | "fx" | "views";
type Row = { t: number; v: number | null };
type Parsed = { rows: Row[]; schema: { ok: boolean; detail: string } };
type Feed = Parsed & { id: FeedId; ms: number; bytes: number; status: number; error?: string };
type Verdict = "pass" | "warn" | "fail" | "skip";
type Check = { name: string; rule: string; verdict: Verdict; detail: string };
type Fault = "none" | "stale" | "drift" | "dups" | "gaps" | "spike";

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const ymd = (ms: number) => isoDay(ms).replaceAll("-", "");
const dayLabel = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
};
const hourLabel = (ms: number) => `${new Date(ms + 7 * HOUR).toISOString().slice(11, 16)} WIB`;
const n0 = (v: number) => Math.round(v).toLocaleString("en-US");
const age = (ms: number) => (ms < HOUR ? `${Math.max(0, Math.round(ms / 60000))} min` : ms < 2 * DAY ? `${Math.round(ms / HOUR)} h` : `${ms % DAY ? (ms / DAY).toFixed(1) : ms / DAY} days`);
const short = (v: number) => (v >= 1e6 ? `${r1(v / 1e6)}M` : n0(v));

/* ------------------------------------------------------------------ the three feeds */
type AirJson = { hourly?: { time?: unknown; pm2_5?: unknown }; hourly_units?: { pm2_5?: unknown }; current?: { time?: unknown } };
type FxJson = { base?: unknown; rates?: unknown };
type ViewsJson = { items?: unknown };

const FEEDS: Record<
  FeedId,
  {
    name: string;
    what: string;
    host: string;
    unit: string;
    grain: "hour" | "day" | "business";
    fresh: [number, number];
    minRows: number;
    nulls: number;
    range: [number, number];
    jump?: number;
    fmt: (v: number) => string;
    when: (t: number) => string;
    url: (now: number) => string;
    parse: (j: unknown, now: number) => Parsed;
    drift: string;
  }
> = {
  air: {
    name: "Jakarta PM2.5",
    what: "Open-Meteo Air Quality (CAMS), hourly",
    host: "air-quality-api.open-meteo.com",
    unit: "µg/m³",
    grain: "hour",
    fresh: [2 * HOUR, 6 * HOUR],
    minRows: 48,
    nulls: 0.05,
    range: [0, 1000],
    fmt: (v) => v.toFixed(1),
    when: hourLabel,
    url: () => "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-6.2&longitude=106.85&timezone=Asia%2FJakarta&past_days=2&forecast_days=1&hourly=pm2_5&current=pm2_5",
    parse: (raw) => {
      const j = raw as AirJson;
      const time = j.hourly?.time,
        vals = j.hourly?.pm2_5;
      if (!Array.isArray(time) || !Array.isArray(vals)) return { rows: [], schema: { ok: false, detail: "hourly.time or hourly.pm2_5 missing" } };
      const toMs = (s: unknown) => Date.parse(`${String(s)}:00+07:00`);
      // keep the hours up to the API's current hour: later ones are forecasts, not data yet
      const cur = typeof j.current?.time === "string" ? toMs(j.current.time) : Infinity;
      const rows = time.map((t, i) => ({ t: toMs(t), v: typeof vals[i] === "number" ? (vals[i] as number) : null })).filter((r) => r.t <= cur);
      const ok = time.length === vals.length && /g\/m³$/.test(String(j.hourly_units?.pm2_5));
      return { rows, schema: { ok, detail: ok ? `time + pm2_5, ${time.length} each, µg/m³` : "arrays differ in length or the unit changed" } };
    },
    drift: 'pm2_5 missing, found "pm25"',
  },
  fx: {
    name: "USD → IDR",
    what: "Frankfurter (ECB rates), business days",
    host: "api.frankfurter.dev",
    unit: "IDR",
    grain: "business",
    fresh: [4 * DAY, 7 * DAY],
    minRows: 15,
    nulls: 0,
    range: [10_000, 30_000],
    jump: 0.05,
    fmt: (v) => n0(v),
    when: dayLabel,
    url: (now) => `https://api.frankfurter.dev/v1/${isoDay(now - 30 * DAY)}..?base=USD&symbols=IDR`,
    parse: (raw) => {
      const j = raw as FxJson;
      if (!j.rates || typeof j.rates !== "object") return { rows: [], schema: { ok: false, detail: "rates missing" } };
      const entries = Object.entries(j.rates as Record<string, { IDR?: unknown } | null>).sort(([a], [b]) => (a < b ? -1 : 1));
      const rows = entries.map(([d, r]) => ({ t: Date.parse(`${d}T00:00:00Z`), v: typeof r?.IDR === "number" ? r.IDR : null }));
      const ok = j.base === "USD" && entries.every(([d, r]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && typeof r?.IDR === "number");
      return { rows, schema: { ok, detail: ok ? "base USD, rates{date: {IDR}}" : "base changed or IDR missing" } };
    },
    drift: 'rates.IDR missing, found "idr"',
  },
  views: {
    name: "id.wikipedia views",
    what: "Wikimedia Pageviews API, daily, people only",
    host: "wikimedia.org/api/rest_v1",
    unit: "views",
    grain: "day",
    fresh: [2 * DAY, 4 * DAY],
    minRows: 29,
    nulls: 0,
    range: [100_000, 50_000_000],
    fmt: (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : n0(v)),
    when: dayLabel,
    url: (now) => `https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/id.wikipedia/all-access/user/daily/${ymd(now - 31 * DAY)}00/${ymd(now)}00`,
    parse: (raw) => {
      const j = raw as ViewsJson;
      if (!Array.isArray(j.items)) return { rows: [], schema: { ok: false, detail: "items missing" } };
      const items = j.items as { timestamp?: unknown; views?: unknown }[];
      const rows = items.map((it) => {
        const s = String(it.timestamp ?? "");
        return { t: Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8))), v: typeof it.views === "number" ? it.views : null };
      });
      const ok = items.every((it) => typeof it.timestamp === "string" && it.timestamp.length === 10 && typeof it.views === "number");
      return { rows, schema: { ok, detail: ok ? "items[{timestamp, views}]" : "timestamp or views changed" } };
    },
    drift: 'views missing, found "view_count"',
  },
};
const IDS: FeedId[] = ["air", "fx", "views"];

async function load(id: FeedId, now: number): Promise<Feed> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12_000);
  const t0 = performance.now();
  try {
    const r = await fetch(FEEDS[id].url(now), { signal: ctl.signal, cache: "no-store" });
    const text = await r.text();
    const ms = Math.round(performance.now() - t0);
    const bytes = new TextEncoder().encode(text).length;
    if (!r.ok) return { id, rows: [], schema: { ok: false, detail: `HTTP ${r.status}` }, ms, bytes, status: r.status, error: `HTTP ${r.status}` };
    return { id, ...FEEDS[id].parse(JSON.parse(text), now), ms, bytes, status: r.status };
  } catch (e) {
    return { id, rows: [], schema: { ok: false, detail: "no response" }, ms: Math.round(performance.now() - t0), bytes: 0, status: 0, error: e instanceof Error && e.name === "AbortError" ? "timed out" : "request failed" };
  } finally {
    clearTimeout(timer);
  }
}

/** A copy of the feed with one fault injected, to see which checks catch it. */
function inject(f: Feed, fault: Fault): Feed {
  if (fault === "none" || f.error) return f;
  const rows = f.rows.map((r) => ({ ...r }));
  if (fault === "stale") return { ...f, rows: rows.map((r) => ({ ...r, t: r.t - 7 * DAY })) };
  if (fault === "drift") return { ...f, rows: rows.map((r) => ({ ...r, v: null })), schema: { ok: false, detail: FEEDS[f.id].drift } };
  if (fault === "dups") return { ...f, rows: [...rows, ...rows.slice(-6).map((r) => ({ ...r }))] };
  if (fault === "gaps") {
    const a = Math.floor(rows.length * 0.4),
      b = Math.floor(rows.length * 0.65);
    return { ...f, rows: [...rows.slice(0, a), ...rows.slice(b)] };
  }
  const i = rows.map((r) => r.v != null).lastIndexOf(true);
  if (i >= 0) rows[i].v = (rows[i].v as number) * 25;
  return { ...f, rows };
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

/** The eight checks. */
function run(f: Feed, now: number): Check[] {
  const C = FEEDS[f.id];
  const step = C.grain === "hour" ? HOUR : DAY;
  if (f.error) {
    return [
      { name: "Freshness", rule: "the source answers at all", verdict: "fail", detail: f.error },
      ...["Volume", "Schema", "Uniqueness", "Grain", "Completeness", "Validity", "Anomaly"].map((name) => ({ name, rule: "needs data", verdict: "skip" as Verdict, detail: "not run" })),
    ];
  }
  const rows = f.rows;
  const vals = rows.map((r) => r.v).filter((v): v is number => v != null);
  const withV = rows.filter((r) => r.v != null);
  const latest = withV.length ? Math.max(...withV.map((r) => r.t)) : null;
  // freshness: time since the newest value's period ended
  const ageMs = latest == null ? Infinity : now - (latest + (C.grain === "hour" ? 0 : DAY));
  const fresh: Verdict = ageMs <= C.fresh[0] ? "pass" : ageMs <= C.fresh[1] ? "warn" : "fail";
  // uniqueness and order
  const ts = rows.map((r) => r.t);
  const dups = ts.length - new Set(ts).size;
  const unordered = ts.slice(1).filter((t, i) => t < ts[i]).length;
  // grain
  const uniq = [...new Set(ts)].sort((a, b) => a - b);
  const diffs = uniq.slice(1).map((t, i) => t - uniq[i]);
  let grain: Check;
  if (C.grain === "business") {
    const weekend = uniq.filter((t) => [0, 6].includes(new Date(t).getUTCDay())).length;
    const longest = diffs.length ? Math.max(...diffs) / DAY : 0;
    grain = { name: "Grain", rule: "business days only, no gap over 4 days (weekends and holidays have no rate)", verdict: weekend === 0 && longest <= 4 ? "pass" : "fail", detail: `${weekend} weekend dates · longest gap ${Math.round(longest)} d` };
  } else {
    const missing = diffs.reduce((a, d) => a + Math.max(0, Math.round(d / step) - 1), 0);
    grain = { name: "Grain", rule: `one row per ${C.grain}, none skipped`, verdict: missing === 0 ? "pass" : "fail", detail: `${missing} missing ${C.grain}s` };
  }
  // completeness
  const nulls = rows.length - vals.length;
  const share = rows.length ? nulls / rows.length : 1;
  // validity
  const out = vals.filter((v) => v < C.range[0] || v > C.range[1]).length;
  const jumps = C.jump ? withV.slice(1).filter((r, i) => Math.abs((r.v as number) / (withV[i].v as number) - 1) > (C.jump as number)).length : 0;
  // anomaly: the newest value against the rest, robust z-score (median and MAD)
  const last = withV.length ? (withV[withV.length - 1].v as number) : null;
  const rest = vals.slice(0, -1);
  const m = median(rest);
  const mad = median(rest.map((v) => Math.abs(v - m)));
  const z = last == null || !mad ? 0 : (0.6745 * (last - m)) / mad;
  return [
    {
      name: "Freshness",
      rule: `newest value at most ${age(C.fresh[0])} old`,
      verdict: fresh,
      detail: latest == null ? "no values" : `${age(ageMs)} old · ${C.when(latest)}`,
    },
    { name: "Volume", rule: `at least ${C.minRows} rows`, verdict: rows.length >= C.minRows ? "pass" : rows.length >= C.minRows * 0.8 ? "warn" : "fail", detail: `${rows.length} rows` },
    { name: "Schema", rule: "expected fields and types", verdict: f.schema.ok ? "pass" : "fail", detail: f.schema.detail },
    { name: "Uniqueness", rule: "each period once, in order", verdict: dups === 0 && unordered === 0 ? "pass" : "fail", detail: `${dups} duplicates · ${unordered} out of order` },
    grain,
    { name: "Completeness", rule: C.nulls ? `empty values at most ${Math.round(C.nulls * 100)}%` : "no empty values", verdict: share <= C.nulls ? "pass" : "fail", detail: `${nulls} empty of ${rows.length}` },
    {
      name: "Validity",
      rule: `${short(C.range[0])} to ${short(C.range[1])} ${C.unit}${C.jump ? `, moves under ${C.jump * 100}% a day` : ""}`,
      verdict: vals.length && out === 0 && jumps === 0 ? "pass" : "fail",
      detail: vals.length ? `${C.fmt(Math.min(...vals))} to ${C.fmt(Math.max(...vals))}${out ? ` · ${out} out of range` : ""}${jumps ? ` · ${jumps} jumps` : ""}` : "no values",
    },
    { name: "Anomaly", rule: "newest value within 3.5 robust z of the rest (warns, never blocks)", verdict: Math.abs(z) <= 3.5 ? "pass" : "warn", detail: last == null ? "no values" : `${C.fmt(last)} · z ${z.toFixed(1)}` },
  ];
}

/* ------------------------------------------------------------------ view */
const MARK: Record<Verdict, [string, string]> = { pass: ["✓", GREEN], warn: ["!", AMBER], fail: ["✗", RED], skip: ["–", "rgba(11,11,11,0.3)"] };
const FAULTS: { id: Fault; label: string; note: string }[] = [
  { id: "none", label: "No fault", note: "The data exactly as the APIs sent it." },
  { id: "stale", label: "Stale feed", note: "Every timestamp a week older, as if the source stopped updating." },
  { id: "drift", label: "Schema drift", note: "The value field renamed upstream, so every value comes through empty." },
  { id: "dups", label: "Duplicates", note: "The last six rows delivered twice, as after a retried load." },
  { id: "gaps", label: "Missing rows", note: "A quarter of the rows in the middle lost." },
  { id: "spike", label: "Spike", note: "The newest value multiplied by 25, a unit or parsing bug." },
];

function Spark({ f }: { f: Feed }) {
  const pts = f.rows.filter((r) => r.v != null) as { t: number; v: number }[];
  if (pts.length < 2) return <div className="grid h-[56px] place-items-center rounded-lg bg-cream/50 text-[11px] text-ink-2/50">no values to draw</div>;
  const lo = Math.min(...pts.map((p) => p.v)),
    hi = Math.max(...pts.map((p) => p.v));
  const x = (i: number) => r1(4 + (i / (pts.length - 1)) * 292),
    y = (v: number) => r1(52 - ((v - lo) / (hi - lo || 1)) * 46);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join(" ");
  return (
    <svg viewBox="0 0 300 56" className="h-auto w-full" aria-hidden>
      <path d={d} fill="none" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].v)} r={3} fill="#eb6834" />
    </svg>
  );
}

export function QualityMonitor() {
  const [feeds, setFeeds] = useState<Feed[] | null>(null);
  const [ranAt, setRanAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState<Fault>("none");

  const refresh = useCallback(async () => {
    setBusy(true);
    const now = Date.now();
    const got = await Promise.all(IDS.map((id) => load(id, now)));
    setFeeds(got);
    setRanAt(Date.now());
    setBusy(false);
  }, []);

  useEffect(() => {
    let alive = true;
    const now = Date.now();
    Promise.all(IDS.map((id) => load(id, now))).then((got) => {
      if (!alive) return;
      setFeeds(got);
      setRanAt(Date.now());
    });
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => (feeds && ranAt ? feeds.map((f) => ({ f: inject(f, fault), checks: run(inject(f, fault), ranAt) })) : null), [feeds, ranAt, fault]);
  const all = results ? results.flatMap((r) => r.checks) : [];
  const count = (v: Verdict) => all.filter((c) => c.verdict === v).length;
  const ran = all.filter((c) => c.verdict !== "skip").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] bg-ink p-5 text-white sm:p-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-white/50 uppercase">{results ? `run at ${new Date(ranAt as number).toLocaleTimeString("en-GB")} · your clock` : "running the checks…"}</p>
          <p className="mt-1 text-[2rem] leading-tight font-semibold tracking-[-0.03em] tabular-nums sm:text-[2.6rem]">{results ? `${count("pass")} of ${ran} checks pass` : "Checking three live APIs"}</p>
          {results && (
            <p className="mt-1 text-[13px] text-white/65">
              <span style={{ color: count("warn") ? "#f0c24b" : undefined }}>{count("warn")} warnings</span> · <span style={{ color: count("fail") ? "#ff8a80" : undefined }}>{count("fail")} failed</span>
              {count("skip") ? ` · ${count("skip")} not run` : ""}
            </p>
          )}
        </div>
        <button type="button" onClick={refresh} disabled={busy || !results} className="rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:bg-white/85 disabled:opacity-50">
          {busy ? "Running…" : "Run again"}
        </button>
      </div>

      <div className="rounded-[20px] border border-line bg-white p-3 sm:p-4">
        <p className="text-[12px] font-semibold">Break the data on purpose</p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Inject a fault">
          {FAULTS.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={fault === x.id}
              onClick={() => setFault(x.id)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${fault === x.id ? (x.id === "none" ? "bg-ink text-white" : "bg-[#c8413f] text-white") : "bg-cream/70 text-ink/70 hover:text-ink"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-ink-2/60">{FAULTS.find((x) => x.id === fault)?.note} Only this page&apos;s copy is changed.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {IDS.map((id, k) => {
          const C = FEEDS[id];
          const r = results?.[k];
          return (
            <section key={id} className="flex min-w-0 flex-col rounded-[20px] border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[15px] leading-tight font-semibold">{C.name}</h3>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2/55">{C.what}</p>
                </div>
                {r && (
                  <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10.5px]" style={{ background: r.f.error ? "#c8413f1a" : "#1baf7a1a", color: r.f.error ? RED : GREEN }}>
                    {r.f.error ? r.f.error : `HTTP ${r.f.status}`}
                  </span>
                )}
              </div>
              <p className="mt-2 font-mono text-[10.5px] text-ink-2/55">{r ? `${C.host} · ${r.f.ms} ms · ${(r.f.bytes / 1024).toFixed(1)} KB · ${r.f.rows.length} rows` : C.host}</p>
              <div className="mt-2">{r ? <Spark f={r.f} /> : <div className="h-[56px] animate-pulse rounded-lg bg-cream/60" />}</div>
              <ul className="mt-3 space-y-1">
                {(r ? r.checks : Array.from({ length: 8 }, () => null)).map((c, i) => (
                  <li key={c ? c.name : i} className="flex items-start gap-2 rounded-lg bg-cream/40 px-2.5 py-1.5">
                    {c ? (
                      <>
                        <span className="mt-[1px] w-3 shrink-0 text-center text-[12px] font-bold" style={{ color: MARK[c.verdict][1] }}>
                          {MARK[c.verdict][0]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                            <span className="text-[12.5px] font-semibold">{c.name}</span>
                            <span className="font-mono text-[10.5px] text-ink-2/70">{c.detail}</span>
                          </span>
                          <span className="block text-[11px] leading-snug text-ink-2/50">{c.rule}</span>
                        </span>
                      </>
                    ) : (
                      <span className="h-8 w-full animate-pulse" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        Sources, fetched by your browser when this page opens:{" "}
        <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Open-Meteo
        </a>{" "}
        (CC BY 4.0, CAMS data from Copernicus),{" "}
        <a href="https://frankfurter.dev" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Frankfurter
        </a>{" "}
        (European Central Bank reference rates) and the{" "}
        <a href="https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Wikimedia Pageviews API
        </a>
        .
      </p>
    </div>
  );
}
