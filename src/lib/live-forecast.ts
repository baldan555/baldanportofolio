/**
 * Live data and forecasts for the Live Forecast Lab.
 * Every request goes from the visitor's browser straight to a public API (no key, no server of mine);
 * the LSTMs run in src/lib/lstm.ts with the weights trained in ml/train.py → live_forecasts().
 * Feature building here mirrors the Python exactly; the parity samples in the JSON check it.
 */
import lf from "@/data/models/live-forecasts.json";
import { lstmRun, type LstmModel } from "./lstm";

export type Kind = "pm25" | "fx" | "wiki";
export type Line = { labels: string[]; values: number[] };
export type Check = { labels: string[]; actual: number[]; model: number[]; naive: number[]; mae: number; naiveMae: number };
export type Live = {
  kind: Kind;
  history: Line;
  forecast: Line & { lo?: number[]; hi?: number[] };
  reference?: Line; // PM2.5 only: the CAMS forecast for the same hours
  check: Check | null;
  live: boolean;
  fetchedAt: string;
  title?: string;
};

const PM = lf.pm25;
const FX = lf.fx;
const WK = lf.wiki;
const pmModel = PM.model as LstmModel;
const fxModel = FX.model as LstmModel;
const wkModel = WK.model as LstmModel;
const TAU = 2 * Math.PI;
const DAY = 86_400_000;

const mae = (a: number[], b: number[]) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** Jakarta has no daylight saving: local time is always UTC+7. */
export const jakartaNow = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 13) + ":00";
const addHours = (t: string, k: number) => new Date(Date.parse(t + ":00Z") + k * 3_600_000).toISOString().slice(0, 16);
const clockNow = () => new Date().toISOString();

async function getJson(url: string, ms = 12_000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Fill short gaps (nulls) by carrying the last value forward; leading nulls take the first known value. */
function fill(vals: (number | null)[]): number[] {
  const first = vals.find((v) => v != null) ?? 0;
  let last = first;
  return vals.map((v) => (v == null ? last : (last = v)));
}

/* ------------------------------------------------------------------ PM2.5, Jakarta, hourly */

/** 24 hourly forecasts from the window that ends at `end` (inclusive). */
export function pmForecastFrom(values: number[], times: string[], end: number): number[] {
  const seq: number[][] = [];
  for (let i = end - PM.L + 1; i <= end; i++) {
    const h = Number(times[i].slice(11, 13));
    seq.push([(Math.log1p(values[i]) - PM.mu) / PM.sd, Math.sin((TAU * h) / 24), Math.cos((TAU * h) / 24)]);
  }
  const base = Math.log1p(values[end]);
  return lstmRun(pmModel, seq).map((o) => Math.expm1(base + o));
}

function buildPm(times: string[], values: number[], cams: Line | undefined, live: boolean): Live {
  const end = values.length - 1;
  const H = PM.H;
  const labels = Array.from({ length: H }, (_, k) => addHours(times[end], k + 1));
  let check: Check | null = null;
  if (end - H >= PM.L - 1) {
    const model = pmForecastFrom(values, times, end - H);
    const actual = values.slice(end - H + 1, end + 1);
    const naive = actual.map(() => values[end - H]);
    check = { labels: times.slice(end - H + 1, end + 1), actual, model, naive, mae: mae(model, actual), naiveMae: mae(naive, actual) };
  }
  const reference = cams ? { labels: cams.labels.slice(0, H), values: cams.values.slice(0, H) } : undefined;
  return {
    kind: "pm25",
    history: { labels: times.slice(-PM.L), values: values.slice(-PM.L) },
    forecast: { labels, values: pmForecastFrom(values, times, end) },
    reference,
    check,
    live,
    fetchedAt: live ? clockNow() : PM.snapshot.time.at(-1)!,
  };
}

export async function livePm25(): Promise<Live> {
  const q = `latitude=${PM.lat}&longitude=${PM.lon}&hourly=pm2_5&timezone=Asia%2FJakarta&past_days=7&forecast_days=2`;
  const d = await getJson(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}`);
  const times: string[] = d.hourly.time;
  const vals: (number | null)[] = d.hourly.pm2_5;
  const now = jakartaNow();
  let cut = times.findIndex((t) => t > now);
  if (cut < 0) cut = times.length;
  const past = fill(vals.slice(0, cut));
  const cams = { labels: times.slice(cut), values: fill(vals.slice(cut)) };
  if (past.length < PM.L + PM.H) throw new Error("not enough hours");
  return buildPm(times.slice(0, cut), past, cams, true);
}

export const snapshotPm25 = () => buildPm(PM.snapshot.time, PM.snapshot.value, undefined, false);

/* ------------------------------------------------------------------ USD/IDR, daily (ECB business days) */

/** 5 forecasts (rates) plus an 80% band, from the window that ends at `end`. */
export function fxForecastFrom(values: number[], end: number) {
  const seq: number[][] = [];
  for (let i = end - FX.L + 1; i <= end; i++) seq.push([(Math.log(values[i]) - Math.log(values[i - 1])) / FX.sd]);
  const recent = seq.slice(-FX.vol_window).map((x) => x[0]);
  const m = recent.reduce((a, b) => a + b, 0) / recent.length;
  const vol = Math.max(Math.sqrt(recent.reduce((a, b) => a + (b - m) ** 2, 0) / recent.length), FX.vol_floor);
  const out = lstmRun(fxModel, seq);
  const at = (z: number) => values[end] * Math.exp(z * FX.sd);
  return { mid: out.map(at), lo: out.map((o, k) => at(o + FX.band.lo[k] * vol)), hi: out.map((o, k) => at(o + FX.band.hi[k] * vol)), vol };
}

function nextBusinessDays(day: string, n: number) {
  const out: string[] = [];
  let t = Date.parse(day + "T00:00:00Z");
  while (out.length < n) {
    t += DAY;
    const w = new Date(t).getUTCDay();
    if (w !== 0 && w !== 6) out.push(isoDay(t));
  }
  return out;
}

function buildFx(dates: string[], values: number[], live: boolean): Live {
  const end = values.length - 1;
  const H = FX.H;
  const f = fxForecastFrom(values, end);
  let check: Check | null = null;
  if (end - H >= FX.L) {
    const model = fxForecastFrom(values, end - H).mid;
    const actual = values.slice(end - H + 1, end + 1);
    const naive = actual.map(() => values[end - H]);
    check = { labels: dates.slice(end - H + 1, end + 1), actual, model, naive, mae: mae(model, actual), naiveMae: mae(naive, actual) };
  }
  return {
    kind: "fx",
    history: { labels: dates.slice(-FX.L), values: values.slice(-FX.L) },
    forecast: { labels: nextBusinessDays(dates[end], H), values: f.mid, lo: f.lo, hi: f.hi },
    check,
    live,
    fetchedAt: live ? clockNow() : dates[end],
  };
}

export async function liveFx(): Promise<Live> {
  const d = await getJson(`https://api.frankfurter.dev/v1/${isoDay(Date.now() - 170 * DAY)}..?base=USD&symbols=IDR`);
  const dates = Object.keys(d.rates).sort();
  const values = dates.map((k) => Number(d.rates[k].IDR));
  if (values.length < FX.L + FX.H + 1) throw new Error("not enough days");
  return buildFx(dates, values, true);
}

export const snapshotFx = () => buildFx(FX.snapshot.date, FX.snapshot.value, false);

/* ------------------------------------------------------------------ Indonesian Wikipedia attention, daily */

const SKIP = ["Halaman_Utama", "Istimewa:", "Spesial:", "Special:", "Berkas:", "Wikipedia:", "Kategori:", "Portal:", "Templat:", "Bantuan:", "Pengguna:", "Main_Page", "-"];
const isArticle = (a: string) => !SKIP.some((p) => a.startsWith(p)) && !a.includes(":");
// Adult titles (and bot-driven searches for them) reach the daily top list; never show them. Same list as ml/live_data.py.
const NSFW_PARTS = ["porn", "xnxx", "xhamster", "xvideo", "hentai", "bokep", "onlyfans", "ngentot", "video_viral", "film_dewasa", "brazzers", "chaturbate"];
const NSFW_WORDS = new Set(["xxx", "sex", "seks", "jav", "bugil", "telanjang", "ngewe", "memek", "kontol", "payudara", "vagina", "penis", "masturbasi", "erotis", "redtube", "youporn"]);
export const isSafe = (a: string) => {
  const low = a.toLowerCase();
  return !NSFW_PARTS.some((p) => low.includes(p)) && !low.split(/[_\W]+/u).some((w) => NSFW_WORDS.has(w));
};
const ymd = (day: string) => day.replaceAll("-", "");
export const prettyTitle = (a: string) => a.replaceAll("_", " ");

/** Accepts a title, a title with spaces or a pasted id.wikipedia.org link; returns the API form (underscores). */
export function normaliseTitle(input: string): string {
  let t = input.trim();
  const m = t.match(/wikipedia\.org\/wiki\/([^?#]+)/);
  if (m) t = decodeURIComponent(m[1]);
  t = t.replace(/\s+/g, "_");
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

const WP = "https://id.wikipedia.org/w/api.php?format=json&origin=*&";

/** Turns free text ("timnas sepak bola indonesia") into an article title: the exact page (following redirects)
 *  if there is one, otherwise Wikipedia's own best search hit. null when nothing matches. */
export async function resolveTitle(input: string): Promise<string | null> {
  const t = normaliseTitle(input).replaceAll("_", " ");
  if (!t) return null;
  try {
    const q = await getJson(`${WP}action=query&redirects=1&titles=${encodeURIComponent(t)}`, 8000);
    const page = Object.values(q.query?.pages ?? {})[0] as { title: string; ns: number; missing?: string; invalid?: string } | undefined;
    if (page && page.ns === 0 && !("missing" in page) && !("invalid" in page)) return page.title.replaceAll(" ", "_");
    const s = await getJson(`${WP}action=query&list=search&srnamespace=0&srlimit=1&srsearch=${encodeURIComponent(t)}`, 8000);
    const hit: string | undefined = s.query?.search?.[0]?.title;
    return hit ? hit.replaceAll(" ", "_") : null;
  } catch {
    return normaliseTitle(input); // search unavailable: try the text as a title
  }
}

/** 7 daily forecasts (views) from the window that ends at `end`. Weekday: Monday = 0, as pandas. */
export function wikiForecastFrom(views: number[], dates: string[], end: number): number[] {
  const w = views.slice(end - WK.L + 1, end + 1).map(Math.log1p);
  const mean = w.reduce((a, b) => a + b, 0) / w.length;
  const seq = w.map((v, i) => {
    const dow = (new Date(dates[end - WK.L + 1 + i] + "T00:00:00Z").getUTCDay() + 6) % 7;
    return [v - mean, Math.sin((TAU * dow) / 7), Math.cos((TAU * dow) / 7)];
  });
  return lstmRun(wkModel, seq).map((o) => Math.expm1(w[w.length - 1] + o));
}

function buildWiki(article: string, dates: string[], views: number[], live: boolean): Live {
  const end = views.length - 1;
  const H = WK.H;
  let check: Check | null = null;
  if (end - H >= WK.L - 1) {
    const model = wikiForecastFrom(views, dates, end - H);
    const actual = views.slice(end - H + 1, end + 1);
    const naive = actual.map(() => views[end - H]);
    check = { labels: dates.slice(end - H + 1, end + 1), actual, model, naive, mae: mae(model, actual), naiveMae: mae(naive, actual) };
  }
  const t0 = Date.parse(dates[end] + "T00:00:00Z");
  return {
    kind: "wiki",
    title: article,
    history: { labels: dates.slice(-WK.L), values: views.slice(-WK.L) },
    forecast: { labels: Array.from({ length: H }, (_, k) => isoDay(t0 + (k + 1) * DAY)), values: wikiForecastFrom(views, dates, end) },
    check,
    live,
    fetchedAt: live ? clockNow() : dates[end],
  };
}

/** Articles on yesterday's top list (or the latest list already published). */
export async function wikiTrending(n = 10): Promise<string[]> {
  for (let back = 1; back <= 3; back++) {
    const day = isoDay(Date.now() - back * DAY).replaceAll("-", "/");
    try {
      const d = await getJson(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/id.wikipedia/all-access/${day}`);
      const list = (d.items[0].articles as { article: string }[]).map((a) => a.article).filter((a) => isArticle(a) && isSafe(a));
      if (list.length) return list.slice(0, n);
    } catch {
      /* not published yet: try the day before */
    }
  }
  throw new Error("no top list");
}

export async function liveWiki(article: string): Promise<Live> {
  const start = isoDay(Date.now() - 50 * DAY);
  const end = isoDay(Date.now() - DAY);
  const d = await getJson(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/id.wikipedia/all-access/user/${encodeURIComponent(article)}/daily/${ymd(start)}/${ymd(end)}`);
  const got = new Map<string, number>((d.items as { timestamp: string; views: number }[]).map((it) => [it.timestamp.slice(0, 8), it.views]));
  const lastKey = [...got.keys()].sort().at(-1);
  if (!lastKey) throw new Error("no views");
  const dates: string[] = [];
  for (let t = Date.parse(start + "T00:00:00Z"); isoDay(t) <= `${lastKey.slice(0, 4)}-${lastKey.slice(4, 6)}-${lastKey.slice(6, 8)}`; t += DAY) dates.push(isoDay(t));
  const views = dates.map((day) => got.get(ymd(day)) ?? 0); // a day with no row had no views, as in training
  if (views.length < WK.L + WK.H) throw new Error("too new");
  return buildWiki(article, dates, views, true);
}

export const wikiSnapshotArticles = Object.keys(WK.snapshot.articles);
export function snapshotWiki(article = wikiSnapshotArticles[0]): Live {
  const views = (WK.snapshot.articles as Record<string, number[]>)[article];
  return buildWiki(article, WK.snapshot.date, views, false);
}
