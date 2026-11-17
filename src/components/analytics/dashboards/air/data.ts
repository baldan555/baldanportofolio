/**
 * Jakarta air quality: live hourly data straight from Open-Meteo's public APIs (no key, called by the visitor's
 * browser), with a saved snapshot as a fallback, plus long-term context computed by ml/air_dashboard.py.
 */
import AIR from "@/data/air-dashboard.json";
import { pmForecastFrom } from "@/lib/live-forecast";

export { AIR };
export const LAT = -6.2;
export const LON = 106.85;
export const WHO_24H = 15; // WHO 2021 guideline, 24-hour mean
export const ID_24H = 55; // Indonesia's ambient standard (PP 22/2021), 24-hour mean

/** US EPA PM2.5 categories (2024 breakpoints, µg/m³, 24-hour basis), with simplified public guidance. */
export const CATS = [
  { max: 9, name: "Good", color: "#2fa84f", advice: "Air quality is satisfactory." },
  { max: 35.4, name: "Moderate", color: "#e0b400", advice: "Unusually sensitive people should consider less prolonged outdoor exertion." },
  { max: 55.4, name: "Unhealthy for sensitive groups", color: "#f08a24", advice: "Children, older adults and people with heart or lung disease should reduce long or heavy outdoor exertion." },
  { max: 125.4, name: "Unhealthy", color: "#d93a3a", advice: "Everyone should reduce long outdoor exertion; sensitive groups should avoid it." },
  { max: 225.4, name: "Very unhealthy", color: "#8f3f97", advice: "Everyone should avoid long outdoor exertion." },
  { max: Infinity, name: "Hazardous", color: "#7e0023", advice: "Everyone should avoid all outdoor exertion." },
];
export const catOf = (v: number) => CATS.find((c) => v <= c.max)!;

export type Series = {
  time: string[];
  pm25: (number | null)[];
  pm10: (number | null)[];
  no2: (number | null)[];
  o3: (number | null)[];
  co: (number | null)[];
  wind: (number | null)[];
  rain: (number | null)[];
  now: number; // index of the current hour; later hours are forecasts
  live: boolean;
  fetchedAt: string | null; // Jakarta clock time of the fetch
  lstm: number[]; // 24 hours after `now`, from the Live Forecast project's LSTM
};

const nulls = (n: number) => Array.from({ length: n }, () => null);
/** Fill gaps forward so the LSTM always gets numbers. */
export const filled = (v: (number | null)[]) => {
  const first = v.find((x) => x != null) ?? 0;
  let last = first;
  return v.map((x) => (x == null ? last : (last = x)));
};
function lstmFor(time: string[], pm: (number | null)[], now: number) {
  try {
    return pmForecastFrom(filled(pm.slice(0, now + 1)), time.slice(0, now + 1), now).map((v) => Math.round(v * 10) / 10);
  } catch {
    return [];
  }
}

/**
 * The saved 14 days, used before the live request answers or when it fails. The LSTM runs only in the browser
 * (withModel = true after mount), so the server and the first browser render print the same SVG.
 */
export function snapshot(withModel = false): Series {
  const s = AIR.snapshot;
  const n = s.time.length;
  return {
    time: s.time,
    pm25: s.pm2_5,
    pm10: nulls(n),
    no2: nulls(n),
    o3: nulls(n),
    co: nulls(n),
    wind: nulls(n),
    rain: nulls(n),
    now: n - 1,
    live: false,
    fetchedAt: null,
    lstm: withModel ? lstmFor(s.time, s.pm2_5, n - 1) : [],
  };
}

async function getJson(url: string, ms = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/** Live: 14 days back and 3 days ahead, hourly, Jakarta time. Weather is optional: the page works without it. */
export async function fetchLive(): Promise<Series> {
  const base = `latitude=${LAT}&longitude=${LON}&timezone=Asia%2FJakarta&past_days=14&forecast_days=3`;
  const [air, wx] = await Promise.all([
    getJson(`https://air-quality-api.open-meteo.com/v1/air-quality?${base}&hourly=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide&current=pm2_5`),
    getJson(`https://api.open-meteo.com/v1/forecast?${base}&hourly=wind_speed_10m,precipitation`).catch(() => null),
  ]);
  const time: string[] = air.hourly.time;
  const nowT: string = air.current?.time ? `${String(air.current.time).slice(0, 13)}:00` : time[time.length - 1];
  let now = time.findIndex((t) => t === nowT);
  if (now < 0) now = time.filter((t) => t <= nowT).length - 1;
  const align = (src: { time: string[] } & Record<string, unknown>, key: string) => {
    if (!src) return nulls(time.length);
    const map = new Map(src.time.map((t, i) => [t, (src[key] as (number | null)[])[i]]));
    return time.map((t) => (map.has(t) ? (map.get(t) as number | null) : null));
  };
  const pm25: (number | null)[] = air.hourly.pm2_5;
  const clock = new Date(Date.now() + 7 * 3600000).toISOString().slice(11, 16);
  return {
    time,
    pm25,
    pm10: air.hourly.pm10,
    no2: air.hourly.nitrogen_dioxide,
    o3: air.hourly.ozone,
    co: air.hourly.carbon_monoxide,
    wind: wx ? align(wx.hourly, "wind_speed_10m") : nulls(time.length),
    rain: wx ? align(wx.hourly, "precipitation") : nulls(time.length),
    now,
    live: true,
    fetchedAt: clock,
    lstm: lstmFor(time, pm25, now),
  };
}

/* ---------------------------------------------------------------- small helpers */
export const mean = (v: (number | null)[]) => {
  const x = v.filter((n): n is number => n != null);
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN;
};
export const hh = (t: string) => t.slice(11, 16);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const dayLabel = (t: string) => `${DAYS[new Date(`${t.slice(0, 10)}T00:00:00Z`).getUTCDay()]} ${Number(t.slice(8, 10))}`;
export const f1 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? "—" : (Math.round(v * 10) / 10).toFixed(1));
/** Consecutive runs of hours where `test` holds: [start, end] indices. */
export function runs(values: (number | null)[], from: number, to: number, test: (v: number) => boolean) {
  const out: [number, number][] = [];
  let s = -1;
  for (let i = from; i <= to; i++) {
    const ok = values[i] != null && test(values[i] as number);
    if (ok && s < 0) s = i;
    if ((!ok || i === to) && s >= 0) {
      out.push([s, ok ? i : i - 1]);
      s = -1;
    }
  }
  return out;
}
