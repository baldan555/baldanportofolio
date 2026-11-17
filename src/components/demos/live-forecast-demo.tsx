"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import lf from "@/data/models/live-forecasts.json";
import {
  liveFx,
  livePm25,
  liveWiki,
  isSafe,
  prettyTitle,
  resolveTitle,
  snapshotFx,
  snapshotPm25,
  snapshotWiki,
  wikiSnapshotArticles,
  wikiTrending,
  type Kind,
  type Live,
} from "@/lib/live-forecast";
import { Segmented } from "./controls";

const S1 = "#2a78d6";
const S2 = "#eb6834";
const INK = "#0b0b0b";
const GRID = "rgba(11,11,11,0.07)";
const AXIS = "#8a8a85";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WHO = lf.pm25.who;

/* ------------------------------------------------------------------ formatting (locale-free, so server and client agree) */

const dayLabel = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;
const weekday = (d: string) => DAYS[new Date(d.slice(0, 10) + "T00:00:00Z").getUTCDay()];
const hourLabel = (t: string) => `${weekday(t)} ${t.slice(11, 16)}`;
const int = (v: number) => Math.round(v).toLocaleString("en-US");
const rupiah = (v: number) => `Rp ${int(v)}`;
const views = (v: number) => int(v);
const pm = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));
/** ISO time → "21:14 WIB" (Jakarta is UTC+7 all year). */
const wib = (iso: string) => `${new Date(Date.parse(iso) + 7 * 3_600_000).toISOString().slice(11, 16)} WIB`;
const signed = (v: number, d = 2) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(d)}%`;

type Fmt = { value: (v: number) => string; tick: (label: string) => string; unit: string };
const FMT: Record<Kind, Fmt> = {
  pm25: { value: pm, tick: hourLabel, unit: "µg/m³" },
  fx: { value: rupiah, tick: dayLabel, unit: "IDR per USD" },
  wiki: { value: views, tick: dayLabel, unit: "views a day" },
};

/* ------------------------------------------------------------------ live loading, cached per page view */

const cache = new Map<string, Promise<Live>>();
function load(key: string, fn: () => Promise<Live>, fresh: boolean) {
  if (fresh || !cache.has(key)) {
    cache.set(
      key,
      fn().catch((e) => {
        cache.delete(key);
        throw e;
      }),
    );
  }
  return cache.get(key)!;
}

type Status = "loading" | "live" | "offline";

function useLive(kind: Kind, article?: string) {
  const [state, setState] = useState<{ data: Live; status: Status; error?: string }>(() => ({
    data: kind === "pm25" ? snapshotPm25() : kind === "fx" ? snapshotFx() : snapshotWiki(),
    status: "loading",
  }));
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    const key = `${kind}:${article ?? ""}`;
    const fn = kind === "pm25" ? livePm25 : kind === "fx" ? liveFx : () => liveWiki(article!);
    load(key, fn, nonce > 0).then(
      (data) => alive && setState({ data, status: "live" }),
      (e: Error) => {
        if (!alive) return;
        setState((s) => {
          // keep the last good picture; for a typed article that failed, say so instead of showing another article
          if (kind === "wiki" && wikiSnapshotArticles.includes(article ?? "")) return { data: snapshotWiki(article), status: "offline" };
          return { ...s, status: s.data.live ? "live" : "offline", error: e.message };
        });
      },
    );
    return () => {
      alive = false;
    };
  }, [kind, article, nonce]);
  const setLoading = useCallback(() => setState((s) => ({ ...s, status: "loading", error: undefined })), []);
  const refresh = useCallback(() => {
    setLoading();
    setNonce((v) => v + 1);
  }, [setLoading]);
  return { ...state, refresh, setLoading };
}

/** Width of the chart's container, so text stays readable on a phone instead of shrinking with the SVG. */
function useWidth(initial: number) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { box, w };
}

/* ------------------------------------------------------------------ demo */

export function LiveForecastDemo() {
  const [kind, setKind] = useState<Kind>("pm25");
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Segmented
          label=""
          value={kind}
          options={["pm25", "fx", "wiki"] as Kind[]}
          display={(k) => ({ pm25: "Jakarta air (PM2.5)", fx: "Rupiah (USD/IDR)", wiki: "Wikipedia attention" })[k]}
          onChange={setKind}
        />
      </div>
      {kind === "pm25" && <PmPanel />}
      {kind === "fx" && <FxPanel />}
      {kind === "wiki" && <WikiPanel />}
    </div>
  );
}

function StatusBar({ status, data, source, onRefresh, error }: { status: Status; data: Live; source: string; onRefresh: () => void; error?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-[12.5px]">
      <p className="flex flex-wrap items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-live" : status === "loading" ? "animate-pulse bg-ink/30" : "bg-[#eda100]"}`} />
        {status === "loading" && <span>Fetching the latest data from {source}…</span>}
        {status === "live" && (
          <span>
            <b>Live</b> · {source} · fetched {wib(data.fetchedAt)}
          </span>
        )}
        {status === "offline" && (
          <span>
            <b>Offline snapshot</b> from training day ({dayLabel(data.fetchedAt)}): {source} could not be reached{error ? ` (${error})` : ""}
          </span>
        )}
      </p>
      <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1 text-[12px] text-ink/70 transition hover:border-ink/30 hover:text-ink">
        <RefreshCw className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`} /> Refresh
      </button>
    </div>
  );
}

function Stat({ value, label, sub, tone }: { value: string; label: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4">
      <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1.5 text-[1.9rem] leading-none font-semibold tracking-[-0.04em]" style={tone ? { color: tone } : undefined}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[12px] leading-snug text-ink-2/65">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ PM2.5 */

function PmPanel() {
  const { data, status, error, refresh } = useLive("pm25");
  const f = data.forecast.values;
  const now = data.history.values.at(-1)!;
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  const peak = f.indexOf(Math.max(...f));
  const cams = data.reference?.values;
  const camsAvg = cams ? cams.reduce((a, b) => a + b, 0) / cams.length : null;
  return (
    <div className="space-y-4">
      <StatusBar status={status} data={data} source="Open-Meteo (CAMS)" onRefresh={refresh} error={error} />
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <ChartBox title={`PM2.5 over Jakarta: the last ${lf.pm25.L} hours and the LSTM's next ${lf.pm25.H}`} d={data} legend={cams ? "cams" : "plain"}>
          <ForecastChart d={data} fmt={FMT.pm25} guide={{ at: WHO, label: `WHO daily guideline · ${WHO}` }} />
        </ChartBox>
        <div className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Stat label="Right now" value={`${pm(now)}`} sub={`µg/m³ · ${(now / WHO).toFixed(1)}× the WHO daily guideline`} />
          <Stat label="LSTM · next 24 h" value={`${pm(avg)}`} tone={S1} sub={`average · peak ${pm(f[peak])} at ${data.forecast.labels[peak].slice(11, 16)}`} />
          <Stat label="CAMS forecast" value={camsAvg == null ? "–" : pm(camsAvg)} tone={S2} sub={camsAvg == null ? "shown when live" : "average, Copernicus' physics model"} />
        </div>
      </div>
      <CheckCard d={data} fmt={FMT.pm25} span="24 hours ago" what="the next 24 hours" naive="“same as then”" />
      <p className="px-1 text-[11.5px] leading-relaxed text-ink-2/60">
        Data: <a className="underline" href={lf.pm25.url} target="_blank" rel="noreferrer">Open-Meteo Air Quality API</a>, built on CAMS (Copernicus Atmosphere Monitoring Service), CC BY 4.0, non-commercial use. The
        &ldquo;actual&rdquo; line is CAMS&apos; own model estimate for the grid cell over Jakarta, not a sensor reading, so this LSTM learns to forecast that estimate.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ USD/IDR */

function FxPanel() {
  const { data, status, error, refresh } = useLive("fx");
  const now = data.history.values.at(-1)!;
  const f = data.forecast;
  const last = f.values.at(-1)!;
  return (
    <div className="space-y-4">
      <StatusBar status={status} data={data} source="ECB via Frankfurter" onRefresh={refresh} error={error} />
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <ChartBox title={`USD/IDR: the last ${lf.fx.L} business days and the next ${lf.fx.H}, with an 80% band`} d={data} legend="band">
          <ForecastChart d={data} fmt={FMT.fx} />
        </ChartBox>
        <div className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Stat label={`Latest · ${dayLabel(data.history.labels.at(-1)!)}`} value={int(now)} sub="rupiah per US dollar (ECB reference rate)" />
          <Stat label={`LSTM · ${dayLabel(f.labels.at(-1)!)}`} value={int(last)} tone={S1} sub={`${signed(((last - now) / now) * 100)} vs latest`} />
          <Stat label="80% band, day 5" value={`±${int((f.hi!.at(-1)! - f.lo!.at(-1)!) / 2)}`} sub={`${int(f.lo!.at(-1)!)} – ${int(f.hi!.at(-1)!)}; wider when the rupiah has been jumpy`} />
        </div>
      </div>
      <CheckCard d={data} fmt={FMT.fx} span="5 business days ago" what="the next 5 business days" naive="“no change”" />
      <p className="px-1 text-[11.5px] leading-relaxed text-ink-2/60">
        Data: European Central Bank euro reference rates, crossed to USD/IDR by the <a className="underline" href={lf.fx.url} target="_blank" rel="noreferrer">Frankfurter API</a>. Published once a working day around 16:00 CET,
        so weekends and ECB holidays have no new point. Not financial advice: the results below show this model does not beat &ldquo;no change&rdquo;.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ Wikipedia */

function WikiPanel() {
  const [article, setArticle] = useState(wikiSnapshotArticles[0]);
  const [trending, setTrending] = useState<string[] | null>(null);
  const [typed, setTyped] = useState("");
  const [finding, setFinding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { data, status, error, refresh, setLoading } = useLive("wiki", article);
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    wikiTrending(10).then(
      (list) => {
        setTrending(list);
        setLoading();
        setArticle(list[0]);
      },
      () => setTrending([]),
    );
  }, [setLoading]);

  const pick = (a: string) => {
    setNote(null);
    if (!a || a === article) return;
    setLoading();
    setArticle(a);
  };
  const chips = trending && trending.length ? trending : wikiSnapshotArticles;
  const shown = data.title ?? article;
  const mismatch = shown !== article; // still showing the previous article while the new one loads, or it failed
  const f = data.forecast.values;
  const last = data.history.values.at(-1)!;
  const week = f.reduce((a, b) => a + b, 0);
  const lastWeek = data.history.values.slice(-7).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <StatusBar status={status} data={data} source="Wikimedia pageviews" onRefresh={refresh} error={error} />
      <div className="rounded-2xl bg-white p-4">
        <p className="text-[12.5px] text-ink-2/70">{trending && trending.length ? "Trending on Indonesian Wikipedia yesterday" : trending ? "Trending list unavailable: articles from training day" : "Loading yesterday's trending list…"}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => pick(a)}
              className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${a === article ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/75 hover:border-ink/30"}`}
            >
              {prettyTitle(a)}
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const q = typed.trim();
            if (!q || finding) return;
            setFinding(true);
            setNote(null);
            const t = await resolveTitle(q);
            setFinding(false);
            if (!t) setNote(`No Indonesian Wikipedia article matches “${q}”.`);
            else if (!isSafe(t)) setNote("That article can't be shown here.");
            else pick(t);
          }}
        >
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 px-3 focus-within:border-ink/40">
            <Search className="h-4 w-4 text-muted" />
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="…or type any topic, e.g. timnas, Raja Ampat, Bali" className="w-full bg-transparent py-2 text-[13.5px] outline-none" />
          </label>
          <button type="submit" disabled={finding} className="rounded-xl bg-ink px-4 text-[13px] text-white disabled:opacity-60">
            {finding ? "Finding…" : "Forecast"}
          </button>
        </form>
        {mismatch && status !== "loading" && error && <p className="mt-2 text-[12.5px] text-[#c03a2b]">Couldn&apos;t load &ldquo;{prettyTitle(article)}&rdquo; ({error === "too new" ? "it has fewer than 5 weeks of history" : error === "no views" ? "no views recorded yet" : error}). Still showing the previous article.</p>}
        {note && <p className="mt-2 text-[12.5px] text-[#c03a2b]">{note}</p>}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <ChartBox
          title={
            <>
              Daily views of{" "}
              <a className="underline decoration-ink/30 underline-offset-2 hover:decoration-ink" href={`https://id.wikipedia.org/wiki/${encodeURIComponent(shown)}`} target="_blank" rel="noreferrer">
                {prettyTitle(shown)}
                <ArrowUpRight className="ml-0.5 inline h-3.5 w-3.5" />
              </a>
              : the last {lf.wiki.L} days and the next {lf.wiki.H}
            </>
          }
          d={data}
          legend="plain"
        >
          <ForecastChart d={data} fmt={FMT.wiki} />
        </ChartBox>
        <div className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Stat label={`Latest day · ${dayLabel(data.history.labels.at(-1)!)}`} value={views(last)} sub="human views, all devices" />
          <Stat label="LSTM · next 7 days" value={views(week)} tone={S1} sub={`${signed(((week - lastWeek) / Math.max(lastWeek, 1)) * 100, 0)} vs the last 7 days`} />
          <Stat label="Tomorrow" value={views(f[0])} tone={S1} sub={f[0] < last ? "attention fading" : "attention holding or rising"} />
        </div>
      </div>
      <CheckCard d={data} fmt={FMT.wiki} span="7 days ago" what="the next 7 days" naive="“same as that day”" />
      <p className="px-1 text-[11.5px] leading-relaxed text-ink-2/60">
        Data: Wikimedia Foundation <a className="underline" href={lf.wiki.url} target="_blank" rel="noreferrer">pageviews API</a>, human traffic only (bots and spiders excluded by Wikimedia), all devices. Daily totals are
        published a few hours after midnight UTC, so &ldquo;latest day&rdquo; is usually yesterday. Adult titles, which often reach the top list through automated traffic, are filtered out.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ charts */

function ChartBox({ title, d, legend, children }: { title: React.ReactNode; d: Live; legend: "plain" | "cams" | "band"; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-semibold">{title}</p>
        <div className="flex flex-wrap gap-4 text-[11.5px] text-ink-2/70">
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 bg-ink" /> {d.kind === "pm25" ? "CAMS estimate" : "actual"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 border-t-2 border-dashed" style={{ borderColor: S1 }} /> LSTM forecast
          </span>
          {legend === "cams" && (
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4" style={{ background: S2 }} /> CAMS forecast
            </span>
          )}
          {legend === "band" && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-[3px]" style={{ background: "rgba(42,120,214,0.18)" }} /> 80% band
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function niceTicks(lo: number, hi: number, n = 4) {
  const raw = (hi - lo) / n;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw)!;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

function ForecastChart({ d, fmt, guide }: { d: Live; fmt: Fmt; guide?: { at: number; label: string } }) {
  const { box, w } = useWidth(760);
  const W = Math.max(300, w);
  const H = W < 520 ? 240 : 290;
  const M = { l: d.kind === "fx" ? 58 : 46, r: 12, t: 16, b: 30 };
  const hist = d.history.values;
  const fc = d.forecast.values;
  const nH = hist.length;
  const n = nH + fc.length;
  const labels = [...d.history.labels, ...d.forecast.labels];
  const ref = d.reference ? d.forecast.labels.map((l) => d.reference!.values[d.reference!.labels.indexOf(l)]) : null;
  const all = [...hist, ...fc, ...(d.forecast.lo ?? []), ...(d.forecast.hi ?? []), ...(ref?.filter((v) => v != null) ?? [])];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (guide) hi = Math.max(hi, guide.at);
  const pad = (hi - lo) * 0.1 || 1;
  lo = d.kind === "fx" ? lo - pad : 0; // air and views start at zero, so the WHO line and real proportions show
  hi += pad;
  const sx = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);
  const path = (pts: [number, number][]) => pts.map(([i, v], k) => `${k ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
  const fcPts: [number, number][] = [[nH - 1, hist[nH - 1]], ...fc.map((v, k) => [nH + k, v] as [number, number])];
  const band =
    d.forecast.lo && d.forecast.hi
      ? path([[nH - 1, hist[nH - 1]], ...d.forecast.hi.map((v, k) => [nH + k, v] as [number, number])]) +
        d.forecast.lo
          .map((v, k) => [nH + k, v] as [number, number])
          .reverse()
          .map(([i, v]) => `L${sx(i).toFixed(1)},${sy(v).toFixed(1)}`)
          .join("") +
        `L${sx(nH - 1).toFixed(1)},${sy(hist[nH - 1]).toFixed(1)}Z`
      : null;
  const step = Math.max(1, Math.round(n / (W < 520 ? 3 : 6)));
  const xt = Array.from({ length: n }, (_, i) => i).filter((i) => (n - 1 - i) % step === 0);
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1)))));
  };
  const key = `${d.kind}-${d.title ?? ""}-${d.fetchedAt}`;

  return (
    <div ref={box} className="relative">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <rect x={sx(nH - 1)} y={M.t} width={sx(n - 1) - sx(nH - 1)} height={H - M.t - M.b} fill="#f6f1e7" />
        {niceTicks(lo, hi).map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke={GRID} />
            <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill={AXIS} fontFamily="var(--font-geist-mono)">
              {Number.isInteger(v) || v >= 10 ? int(v) : String(v)}
            </text>
          </g>
        ))}
        {xt.map((i) => (
          <text key={i} x={sx(i)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill={AXIS} fontFamily="var(--font-geist-mono)">
            {fmt.tick(labels[i])}
          </text>
        ))}
        {guide && guide.at <= hi && (
          <g>
            <line x1={M.l} x2={W - M.r} y1={sy(guide.at)} y2={sy(guide.at)} stroke="#1baf7a" strokeDasharray="2 4" strokeWidth={1.5} />
            <text x={M.l + 6} y={sy(guide.at) - 6} fontSize="10.5" fill="#138a60">
              {guide.label}
            </text>
          </g>
        )}
        <line x1={sx(nH - 1)} x2={sx(nH - 1)} y1={M.t} y2={H - M.b} stroke={INK} strokeOpacity={0.35} strokeDasharray="3 3" />
        <text x={sx(nH - 1) + 6} y={M.t + 13} fontSize="11" fill="#5f5f5a">
          {d.live ? "now" : "snapshot"} → forecast
        </text>
        {band && <path d={band} fill="rgba(42,120,214,0.16)" />}
        <motion.path key={`h-${key}`} d={path(hist.map((v, i) => [i, v]))} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: "easeOut" }} />
        {ref && (
          <path
            d={path([[nH - 1, hist[nH - 1]], ...ref.map((v, k) => [nH + k, v] as [number, number]).filter(([, v]) => v != null)])}
            fill="none"
            stroke={S2}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}
        <motion.path key={`f-${key}`} d={path(fcPts)} fill="none" stroke={S1} strokeWidth={2.5} strokeDasharray="6 4" strokeLinejoin="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.7 }} />
        {fc.map((v, k) => (fc.length <= 10 ? <circle key={k} cx={sx(nH + k)} cy={sy(v)} r={3.5} fill={S1} stroke="#fff" strokeWidth={1.5} /> : null))}
        <circle cx={sx(nH - 1)} cy={sy(hist[nH - 1])} r={4.5} fill={INK} stroke="#fff" strokeWidth={2} />
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={sx(hover)} x2={sx(hover)} y1={M.t} y2={H - M.b} stroke={INK} strokeOpacity={0.25} />
            {hover < nH ? (
              <circle cx={sx(hover)} cy={sy(hist[hover])} r={4.5} fill={INK} stroke="#fff" strokeWidth={2} />
            ) : (
              <circle cx={sx(hover)} cy={sy(fc[hover - nH])} r={4.5} fill={S1} stroke="#fff" strokeWidth={2} />
            )}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] leading-snug text-white shadow-lg"
          style={{ left: `${Math.round((sx(hover) / W) * 1000) / 10}%`, transform: sx(hover) > W * 0.6 ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
        >
          <b>{d.kind === "pm25" ? hourLabel(labels[hover]) : `${weekday(labels[hover])} ${dayLabel(labels[hover])}`}</b>
          <br />
          {hover < nH ? (
            <>
              {d.kind === "pm25" ? "CAMS estimate" : "actual"}: {fmt.value(hist[hover])}
            </>
          ) : (
            <>
              LSTM: {fmt.value(fc[hover - nH])}
              {ref && ref[hover - nH] != null && (
                <>
                  <br />
                  CAMS: {fmt.value(ref[hover - nH])}
                </>
              )}
              {d.forecast.lo && (
                <>
                  <br />
                  80%: {fmt.value(d.forecast.lo[hover - nH])} – {fmt.value(d.forecast.hi![hover - nH])}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** "Check yesterday": the forecast the model made one horizon ago, against what then happened. */
function CheckCard({ d, fmt, span, what, naive }: { d: Live; fmt: Fmt; span: string; what: string; naive: string }) {
  const c = d.check;
  if (!c) return null;
  const won = c.mae < c.naiveMae;
  const W = 520;
  const H = 150;
  const M = { l: 8, r: 8, t: 10, b: 22 };
  const all = [...c.actual, ...c.model, ...c.naive];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.12 || 1;
  const sx = (i: number) => M.l + (i / (c.actual.length - 1)) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - M.t - M.b);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
  const n = c.labels.length;
  const ticks = n > 10 ? [0, Math.floor(n / 2), n - 1] : c.labels.map((_, i) => i);
  return (
    <div className="grid gap-4 rounded-2xl bg-white p-4 sm:p-5 md:grid-cols-[1fr_300px]">
      <div>
        <p className="text-[14px] font-semibold">
          Check: the forecast made {span}, against what happened
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
          <path d={path(c.naive)} fill="none" stroke={S2} strokeWidth={1.8} strokeDasharray="4 4" />
          <path d={path(c.model)} fill="none" stroke={S1} strokeWidth={2.2} />
          <path d={path(c.actual)} fill="none" stroke={INK} strokeWidth={2.2} />
          {ticks.map((i) => (
            <text key={i} x={sx(i)} y={H - 5} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="11" fill={AXIS} fontFamily="var(--font-geist-mono)">
              {fmt.tick(c.labels[i])}
            </text>
          ))}
        </svg>
        <div className="mt-1 flex flex-wrap gap-4 text-[11.5px] text-ink-2/70">
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 bg-ink" /> what happened
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4" style={{ background: S1 }} /> LSTM, {span}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 border-t-2 border-dashed" style={{ borderColor: S2 }} /> {naive}
          </span>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-cream/70 px-4 py-3">
            <p className="text-[1.5rem] leading-none font-semibold tracking-[-0.03em]" style={{ color: S1 }}>
              {fmt.value(c.mae)}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted uppercase">LSTM avg miss</p>
          </div>
          <div className="rounded-xl bg-cream/70 px-4 py-3">
            <p className="text-[1.5rem] leading-none font-semibold tracking-[-0.03em]" style={{ color: S2 }}>
              {fmt.value(c.naiveMae)}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted uppercase">{naive.replaceAll("“", "").replaceAll("”", "")} miss</p>
          </div>
        </div>
        <p className="text-[12.5px] leading-snug text-ink-2/75">
          {won ? <b>The LSTM was closer this time.</b> : <b>The simple guess was closer this time.</b>} One window is luck either way; the test results below average{" "}
          {d.kind === "pm25" ? lf.pm25.split.test.toLocaleString("en-US") : d.kind === "fx" ? lf.fx.split.test.toLocaleString("en-US") : lf.wiki.split.test.toLocaleString("en-US")} windows over {what}.
        </p>
      </div>
    </div>
  );
}
