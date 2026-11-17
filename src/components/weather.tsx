"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Cloud, CloudFog, CloudLightning, CloudRain, Sun, Moon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "storm";
export type Weather = { kind: WeatherKind; temp: number | null; isDay: boolean; label: string; wind: number; live: boolean };

const LAT = -5.1477; // Makassar
const LON = 119.4327;

function fromCode(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: "clear", label: "Clear sky" };
  if (code <= 2) return { kind: "cloudy", label: "Partly cloudy" };
  if (code === 3) return { kind: "cloudy", label: "Overcast" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Foggy" };
  if (code >= 51 && code <= 57) return { kind: "rain", label: "Drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { kind: "rain", label: "Rain" };
  if (code >= 95) return { kind: "storm", label: "Thunderstorm" };
  return { kind: "cloudy", label: "Cloudy" };
}

const fallback: Weather = { kind: "cloudy", temp: null, isDay: true, label: "Cloudy", wind: 8, live: false };

/** Live Makassar weather from Open-Meteo (free, no key). Falls back to "cloudy". */
export function useMakassarWeather() {
  const [w, setW] = useState<Weather>(fallback);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=Asia%2FMakassar`,
      { signal: ctrl.signal },
    )
      .then((r) => r.json())
      .then((d) => {
        const c = d?.current;
        if (!c) return;
        const m = fromCode(c.weather_code);
        setW({ ...m, temp: Math.round(c.temperature_2m), isDay: c.is_day === 1, wind: c.wind_speed_10m ?? 8, live: true });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);
  return w;
}

/* ------------------------------------------------------------------ */

const skies: Record<WeatherKind, { day: string; night: string }> = {
  clear: {
    day: "linear-gradient(180deg,#c9def2 0%,#e3ecf5 42%,#fbfbf9 92%)",
    night: "linear-gradient(180deg,#c3c8d8 0%,#e1e3ea 45%,#fbfbf9 92%)",
  },
  cloudy: {
    day: "linear-gradient(180deg,#d9e1ea 0%,#e9edf1 45%,#fbfbf9 92%)",
    night: "linear-gradient(180deg,#c9ccd6 0%,#e4e5ea 45%,#fbfbf9 92%)",
  },
  fog: {
    day: "linear-gradient(180deg,#e2e3e2 0%,#eeeeec 45%,#fbfbf9 92%)",
    night: "linear-gradient(180deg,#d3d4d8 0%,#e8e8ea 45%,#fbfbf9 92%)",
  },
  rain: {
    day: "linear-gradient(180deg,#c2cad3 0%,#dce0e5 45%,#fbfbf9 92%)",
    night: "linear-gradient(180deg,#b5bac6 0%,#d8dae1 45%,#fbfbf9 92%)",
  },
  storm: {
    day: "linear-gradient(180deg,#a9b1ba 0%,#cfd4d9 45%,#fbfbf9 92%)",
    night: "linear-gradient(180deg,#9da2b0 0%,#c9ccd5 45%,#fbfbf9 92%)",
  },
};

// Deterministic pseudo-random so server and client render the same clouds.
function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const cloudCount: Record<WeatherKind, number> = { clear: 4, cloudy: 9, fog: 6, rain: 10, storm: 11 };

export function WeatherSky({ weather }: { weather: Weather }) {
  const reduce = useReducedMotion();
  const kinds: WeatherKind[] = ["clear", "cloudy", "fog", "rain", "storm"];

  const clouds = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        top: Math.round(4 + seeded(i + 1) * 46),
        w: Math.round(260 + seeded(i + 11) * 340),
        h: Math.round(70 + seeded(i + 21) * 90),
        dur: Math.round(70 + seeded(i + 31) * 90),
        delay: -Math.round(seeded(i + 41) * 160),
        o: Math.round((0.55 + seeded(i + 51) * 0.4) * 100) / 100,
        x: Math.round(seeded(i + 61) * 100),
      })),
    [],
  );

  const dark = weather.kind === "storm" ? "#b9c0c7" : weather.kind === "rain" ? "#e3e7eb" : "#ffffff";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* sky gradients cross-fade between conditions */}
      {kinds.map((k) => (
        <div
          key={k}
          className="absolute inset-0 transition-opacity duration-[1500ms]"
          style={{ background: weather.isDay ? skies[k].day : skies[k].night, opacity: weather.kind === k ? 1 : 0 }}
        />
      ))}

      {/* sun / moon glow */}
      <div
        className="absolute top-[6%] right-[14%] h-56 w-56 rounded-full blur-3xl transition-opacity duration-[1500ms]"
        style={{
          background: weather.isDay ? "radial-gradient(circle,#fff7e0 0%,rgba(255,247,224,0) 70%)" : "radial-gradient(circle,#ffffff 0%,rgba(255,255,255,0) 70%)",
          opacity: weather.kind === "clear" ? 1 : weather.kind === "cloudy" ? 0.55 : 0.2,
        }}
      />

      {/* drifting blurred clouds */}
      {clouds.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full transition-[opacity,background-color] duration-[1500ms]"
          style={{
            top: `${c.top}%`,
            left: 0,
            width: c.w,
            height: c.h,
            filter: "blur(26px)",
            backgroundColor: dark,
            opacity: i < cloudCount[weather.kind] ? c.o : 0,
            animation: reduce ? undefined : `drift ${c.dur}s linear ${c.delay}s infinite`,
            transform: reduce ? `translateX(${c.x}vw)` : undefined,
          }}
        />
      ))}

      {/* fog bands */}
      <div
        className="absolute inset-x-0 top-[35%] h-[40%] bg-white blur-3xl transition-opacity duration-[1500ms]"
        style={{ opacity: weather.kind === "fog" ? 0.75 : 0 }}
      />

      <Precipitation weather={weather} />

      {/* storm flashes */}
      {weather.kind === "storm" && !reduce && (
        <motion.div
          className="absolute inset-0 bg-white"
          animate={{ opacity: [0, 0, 0.7, 0, 0.45, 0] }}
          transition={{ duration: 9, times: [0, 0.82, 0.84, 0.86, 0.88, 0.92], repeat: Infinity }}
        />
      )}

      {/* soft horizon so the sky melts into the page */}
      <svg className="absolute inset-x-0 bottom-[14%] h-[22%] w-full opacity-60" viewBox="0 0 1440 200" preserveAspectRatio="none">
        <path d="M0 140 C180 90 300 120 460 96 C620 72 760 128 920 104 C1080 80 1240 112 1440 88 V200 H0 Z" fill="#ffffff" fillOpacity="0.55" />
        <path d="M0 170 C220 130 380 160 560 140 C760 118 900 168 1100 146 C1260 128 1360 150 1440 140 V200 H0 Z" fill="#ffffff" fillOpacity="0.8" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Canvas: rain streaks, or floating motes that scatter from the cursor */

type P = { x: number; y: number; z: number; vx: number; vy: number; r: number };

function Precipitation({ weather }: { weather: Weather }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const kindRef = useRef(weather.kind);
  const windRef = useRef(weather.wind);
  useEffect(() => {
    kindRef.current = weather.kind;
    windRef.current = weather.wind;
  }, [weather.kind, weather.wind]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;
    const mouse = { x: -9999, y: -9999 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const make = (randomY = true): P => ({
      x: Math.random() * w,
      y: randomY ? Math.random() * h : -20,
      z: 0.3 + Math.random() * 0.7,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.05 - Math.random() * 0.2,
      r: 0.8 + Math.random() * 1.8,
    });
    const parts: P[] = Array.from({ length: 220 }, () => make());

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running) loop();
    });
    io.observe(canvas);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const kind = kindRef.current;
      const raining = kind === "rain" || kind === "storm";
      const count = kind === "storm" ? 220 : kind === "rain" ? 150 : kind === "fog" ? 50 : kind === "clear" ? 70 : 110;
      const slant = Math.min(windRef.current, 30) / 30; // 0..1

      for (let i = 0; i < count; i++) {
        const p = parts[i];
        if (raining) {
          const len = 10 + p.z * 18;
          const speed = 7 + p.z * 11;
          p.y += speed;
          p.x += slant * 2.2 * p.z;
          if (p.y > h + 20) {
            p.y = -20 - Math.random() * 60;
            p.x = Math.random() * (w + 100) - 50;
          }
          ctx.strokeStyle = `rgba(70,82,96,${0.12 + p.z * 0.22})`;
          ctx.lineWidth = p.z > 0.85 ? 1.4 : 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - slant * 4 * p.z, p.y - len);
          ctx.stroke();
        } else {
          // floating motes, pushed away from the cursor
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const f = (1 - Math.sqrt(d2) / 120) * 0.9;
            p.vx += (dx / (Math.sqrt(d2) + 0.01)) * f;
            p.vy += (dy / (Math.sqrt(d2) + 0.01)) * f;
          }
          p.vx *= 0.94;
          p.vy = p.vy * 0.94 + (-0.12 - p.z * 0.1) * 0.06;
          p.x += p.vx + slant * 0.25;
          p.y += p.vy;
          if (p.y < -10) Object.assign(p, make(false), { y: h + 10 });
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          ctx.fillStyle = `rgba(96,116,140,${0.2 + p.z * 0.4})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * p.z + 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = () => {
      if (!running) return;
      draw();
      raf = requestAnimationFrame(loop);
    };
    if (reduce) draw();
    else loop();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduce]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" style={{ filter: "blur(0.4px)" }} />;
}

/* ------------------------------------------------------------------ */

const icons = { clear: Sun, cloudy: Cloud, fog: CloudFog, rain: CloudRain, storm: CloudLightning };
const order: (WeatherKind | "live")[] = ["live", "clear", "cloudy", "rain", "storm", "fog"];
const labels: Record<WeatherKind, string> = { clear: "Clear sky", cloudy: "Cloudy", fog: "Foggy", rain: "Rain", storm: "Thunderstorm" };

/** Live weather pill. Click to preview other skies; cycles back to live. */
export function useWeatherControl() {
  const live = useMakassarWeather();
  const [mode, setMode] = useState<WeatherKind | "live">("live");
  const weather: Weather = mode === "live" ? live : { ...live, kind: mode, label: labels[mode], live: false };
  const next = () => setMode((m) => order[(order.indexOf(m) + 1) % order.length]);
  return { weather, live, mode, next };
}

export function WeatherChip({ weather, mode, onNext }: { weather: Weather; mode: WeatherKind | "live"; onNext: () => void }) {
  const Icon = !weather.isDay && weather.kind === "clear" ? Moon : icons[weather.kind];
  return (
    <button
      onClick={onNext}
      data-cursor="Change"
      className="group inline-flex items-center gap-2.5 rounded-full border border-white/70 bg-white/55 py-2 pr-4 pl-2.5 text-[12.5px] text-ink-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:bg-white/80"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={weather.kind + String(weather.isDay)}
          initial={{ opacity: 0, rotate: -40, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 40, scale: 0.6 }}
          className="grid h-7 w-7 place-items-center rounded-full bg-white"
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </motion.span>
      </AnimatePresence>
      <span className="font-medium text-ink">Makassar</span>
      {weather.temp !== null && <span className="font-mono">{weather.temp}°</span>}
      <span className="text-muted">{weather.label}</span>
      <span className="ml-1 inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-wider text-muted uppercase">
        {mode === "live" && weather.live ? (
          <>
            <span className="relative flex h-1.5 w-1.5 text-live">
              <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
            </span>
            live
          </>
        ) : (
          "preview"
        )}
      </span>
    </button>
  );
}
