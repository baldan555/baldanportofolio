"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { BatteryCharging, Languages, MapPin, Monitor, Rotate3d, Share2, Sun, Vibrate, Wifi } from "lucide-react";

/*
 * What a phone (or this browser) tells a web app, read live on this page. Values are read after the page loads or
 * when you tap, shown here, and never sent or stored anywhere.
 */
const GR = "#1baf7a";
const OR = "#eb6834";
type Conn = { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean; addEventListener?: (e: string, f: () => void) => void; removeEventListener?: (e: string, f: () => void) => void };
type Battery = { level: number; charging: boolean; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void };
type Nav = Navigator & { connection?: Conn; getBattery?: () => Promise<Battery> };
type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
const nav = () => navigator as Nav;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Id = "screen" | "locale" | "network" | "battery" | "location" | "motion" | "vibrate" | "share" | "wake";
const SUPPORT: [Id, string, () => boolean][] = [
  ["screen", "Screen", () => true],
  ["locale", "Language & time", () => true],
  ["network", "Connection details", () => "connection" in navigator],
  ["battery", "Battery", () => "getBattery" in navigator],
  ["location", "Location", () => "geolocation" in navigator],
  ["motion", "Motion sensors", () => "DeviceOrientationEvent" in window],
  ["vibrate", "Vibration", () => "vibrate" in navigator],
  ["share", "Share sheet", () => "share" in navigator],
  ["wake", "Keep screen on", () => "wakeLock" in navigator],
];

function readScreen() {
  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
    sw: window.screen.width,
    sh: window.screen.height,
    dpr: Math.round(window.devicePixelRatio * 100) / 100,
    touch: navigator.maxTouchPoints,
    coarse: window.matchMedia("(pointer: coarse)").matches,
    orient: window.screen.orientation?.type ?? "unknown",
    dark: window.matchMedia("(prefers-color-scheme: dark)").matches,
    reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}
function readLocale() {
  const lang = navigator.language;
  return {
    lang,
    langs: (navigator.languages ?? [lang]).slice(0, 3).join(", "),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    now: new Intl.DateTimeFormat(lang, { dateStyle: "full", timeStyle: "short" }).format(new Date()),
    num: new Intl.NumberFormat(lang).format(1234567.89),
    idr: new Intl.NumberFormat(lang, { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(150000),
  };
}
function readNet() {
  const c = nav().connection;
  return { online: navigator.onLine, type: c?.effectiveType, down: c?.downlink, rtt: c?.rtt, save: c?.saveData };
}

function Card({ icon, title, use, status, children, className = "" }: { icon: ReactNode; title: string; use: string; status: "live" | "tap" | "na" | "…"; children: ReactNode; className?: string }) {
  const pill = status === "live" ? ["live", "#eaf8f1", "#0f6e4c"] : status === "tap" ? ["on tap", "#fff3ec", "#b34a1f"] : status === "na" ? ["not in this browser", "#f1efea", "rgba(11,11,11,0.5)"] : ["…", "#f1efea", "rgba(11,11,11,0.5)"];
  return (
    <article className={`flex min-w-0 flex-col rounded-[22px] border border-line bg-white p-4 ${className}`}>
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cream">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center justify-between gap-x-2 text-[14.5px] font-semibold tracking-[-0.01em]">
            {title}
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: pill[1], color: pill[2] }}>
              {pill[0]}
            </span>
          </p>
          <p className="text-[11.5px] leading-snug text-ink-2/55">{use}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </article>
  );
}
function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="space-y-1">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 text-[12px]">
          <dt className="shrink-0 text-ink-2/55">{k}</dt>
          <dd className="min-w-0 text-right font-medium break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
function Btn({ onClick, children, on }: { onClick: () => void; children: ReactNode; on?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`mt-auto w-full rounded-xl px-3 py-2 text-[12px] font-semibold transition ${on ? "bg-[#1baf7a] text-white" : "bg-ink text-white hover:bg-ink/85"}`}>
      {children}
    </button>
  );
}
const Note = ({ children }: { children: ReactNode }) => <p className="mt-2 text-[11.5px] leading-snug text-ink-2/60">{children}</p>;

function MotionCard({ supported }: { supported: boolean | null }) {
  const [tilt, setTilt] = useState({ b: 0, g: 0, a: null as number | null });
  const [src, setSrc] = useState<"none" | "sensor" | "drag">("none");
  const [msg, setMsg] = useState<string | null>(null);
  const base = useRef<number | null>(null);
  const got = useRef(false);
  const [dragging, setDragging] = useState(false);
  const off = useRef<(() => void) | null>(null);
  useEffect(() => () => off.current?.(), []);
  const listen = () => {
    const on = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      got.current = true;
      if (base.current == null) base.current = e.beta;
      setSrc("sensor");
      setTilt({ b: e.beta - base.current, g: e.gamma, a: e.alpha });
    };
    window.addEventListener("deviceorientation", on);
    off.current = () => window.removeEventListener("deviceorientation", on);
    window.setTimeout(() => {
      if (!got.current) setMsg("No motion readings here (laptops and desktops have no sensor). Drag the phone instead.");
    }, 1500);
  };
  const start = async () => {
    off.current?.();
    base.current = null;
    got.current = false;
    setMsg(null);
    const C = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
    if (!C) return setMsg("This browser has no motion sensor API. Drag the phone instead.");
    if (typeof C.requestPermission === "function") {
      try {
        if ((await C.requestPermission()) !== "granted") return setMsg("Motion access was declined. Drag the phone instead.");
      } catch {
        return setMsg("Motion access needs a tap on this button (and HTTPS). Drag the phone instead.");
      }
    }
    listen();
  };
  const move = (e: RPointerEvent<HTMLDivElement>, force = false) => {
    if (!dragging && !force) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ b: ((e.clientY - r.top) / r.height - 0.5) * -70, g: ((e.clientX - r.left) / r.width - 0.5) * 70, a: null });
  };
  const rx = clamp(-tilt.b, -45, 45);
  const ry = clamp(tilt.g, -45, 45);
  return (
    <Card icon={<Rotate3d className="h-4.5 w-4.5" />} title="Motion sensors" use="Games, step counters, rotating maps, shake-to-undo." status={src === "sensor" ? "live" : supported === false ? "na" : "tap"}>
      <div
        className="grid h-[150px] cursor-grab touch-none place-items-center rounded-2xl bg-[#fbfaf7] select-none active:cursor-grabbing"
        style={{ perspective: 520 }}
        onPointerDown={(e) => {
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          if (src !== "sensor") setSrc("drag");
          move(e, true);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          setDragging(false);
          if (src !== "sensor") setTilt({ b: 0, g: 0, a: null });
        }}
      >
        <div className="relative h-[118px] w-[62px] rounded-[14px] border-[4px] border-ink bg-white shadow-[0_18px_30px_-16px_rgba(11,11,11,0.6)]" style={{ transform: `rotateX(${rx}deg) rotateY(${ry}deg)`, transition: dragging || src === "sensor" ? "transform 60ms linear" : "transform 400ms cubic-bezier(.2,.8,.2,1)" }}>
          <div className="absolute inset-x-0 top-1 mx-auto h-1 w-5 rounded-full bg-ink" />
          <div className="absolute top-1/2 left-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/20" />
          <span className="absolute top-1/2 left-1/2 h-3.5 w-3.5 rounded-full" style={{ background: OR, transform: `translate(calc(-50% + ${(ry / 45) * 16}px), calc(-50% + ${(-rx / 45) * 30}px))` }} />
        </div>
      </div>
      <div className="mt-2">
        <Rows
          rows={[
            ["Tilt front/back", `${Math.round(tilt.b)}°`],
            ["Tilt left/right", `${Math.round(tilt.g)}°`],
            ["Compass heading", tilt.a == null ? "–" : `${Math.round(tilt.a)}°`],
          ]}
        />
      </div>
      {msg && <Note>{msg}</Note>}
      <div className="mt-3">
        <Btn onClick={start} on={src === "sensor"}>
          {src === "sensor" ? "Reading the sensor: tilt your phone" : "Use my phone's motion sensor"}
        </Btn>
      </div>
    </Card>
  );
}

export function DeviceApis() {
  const [ok, setOk] = useState<Record<Id, boolean> | null>(null);
  const [scr, setScr] = useState<ReturnType<typeof readScreen> | null>(null);
  const [loc, setLoc] = useState<ReturnType<typeof readLocale> | null>(null);
  const [net, setNet] = useState<ReturnType<typeof readNet> | null>(null);
  const [bat, setBat] = useState<{ level: number; charging: boolean } | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lon: number; acc: number } | string | null>(null);
  const [buzz, setBuzz] = useState<string | null>(null);
  const [share, setShare] = useState<string | null>(null);
  const [wake, setWake] = useState<{ on: boolean; msg?: string }>({ on: false });
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const shake = useAnimationControls();
  useEffect(() => {
    const upScreen = () => setScr(readScreen());
    const upNet = () => setNet(readNet());
    let battery: Battery | null = null;
    const upBat = () => battery && setBat({ level: battery.level, charging: battery.charging });
    const t = window.setTimeout(() => {
      setOk(Object.fromEntries(SUPPORT.map(([id, , f]) => [id, f()])) as Record<Id, boolean>);
      upScreen();
      setLoc(readLocale());
      upNet();
      nav()
        .getBattery?.()
        .then((b) => {
          battery = b;
          upBat();
          b.addEventListener("levelchange", upBat);
          b.addEventListener("chargingchange", upBat);
        })
        .catch(() => undefined);
    }, 0);
    const conn = nav().connection;
    window.addEventListener("resize", upScreen);
    window.addEventListener("online", upNet);
    window.addEventListener("offline", upNet);
    conn?.addEventListener?.("change", upNet);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", upScreen);
      window.removeEventListener("online", upNet);
      window.removeEventListener("offline", upNet);
      conn?.removeEventListener?.("change", upNet);
      battery?.removeEventListener("levelchange", upBat);
      battery?.removeEventListener("chargingchange", upBat);
      sentinel.current?.release().catch(() => undefined);
    };
  }, []);
  const locate = () => {
    if (!("geolocation" in navigator)) return setGeo("This browser has no location API.");
    setGeo("Asking…");
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100, acc: Math.round(p.coords.accuracy) }),
      (e) => setGeo(e.code === 1 ? "You said no (or the site is blocked). Apps must keep working without it." : e.code === 3 ? "It took too long to get a fix. Try again near a window." : "Your position isn't available right now."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };
  const vibrate = () => {
    shake.start({ x: [0, -5, 5, -5, 5, -3, 3, 0], transition: { duration: 0.6 } });
    if (!("vibrate" in navigator)) return setBuzz("Web pages can't vibrate here: iPhones and most desktop browsers don't allow it.");
    const sent = navigator.vibrate([120, 60, 120, 60, 260]);
    setBuzz(sent ? "Pattern sent: buzz, buzz, buzzzz. You'll feel it on an Android phone; laptops have no motor." : "The browser refused, usually because the page hasn't been tapped yet.");
  };
  const doShare = async () => {
    const url = window.location.href;
    const n: Partial<Navigator> = navigator;
    if (n.share) {
      try {
        await navigator.share({ title: "Mobile lab", text: "How mobile apps work, hands-on", url });
        return setShare("Shared through your system's share sheet.");
      } catch (e) {
        return setShare((e as Error).name === "AbortError" ? "Share sheet closed without sharing." : "Sharing failed here.");
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShare("No share sheet in this browser, so the link was copied instead.");
    } catch {
      setShare("No share sheet here, and copying was blocked.");
    }
  };
  const toggleWake = async () => {
    if (sentinel.current) {
      await sentinel.current.release().catch(() => undefined);
      return;
    }
    if (!("wakeLock" in navigator)) return setWake({ on: false, msg: "This browser can't keep the screen on for a page." });
    try {
      const s = await navigator.wakeLock.request("screen");
      sentinel.current = s;
      setWake({ on: true, msg: "Your screen won't dim or lock while this tab is visible. Switching tabs releases it automatically." });
      s.addEventListener("release", () => {
        sentinel.current = null;
        setWake({ on: false, msg: "Released: the screen can sleep again." });
      });
    } catch {
      setWake({ on: false, msg: "The browser refused (battery saver, or the page isn't visible)." });
    }
  };
  const st = (id: Id, live = true): "live" | "tap" | "na" | "…" => (ok == null ? "…" : !ok[id] ? "na" : live ? "live" : "tap");
  const count = ok ? Object.values(ok).filter(Boolean).length : null;
  const ic = "h-4.5 w-4.5";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[22px] bg-ink px-4 py-3 text-white">
        <p className="mr-2 text-[13px]">
          <span className="text-[1.5rem] font-semibold tabular-nums">{count ?? "–"}</span>
          <span className="text-white/60"> of {SUPPORT.length} available in this browser</span>
        </p>
        {SUPPORT.map(([id, label]) => (
          <span key={id} className="flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ok == null ? "rgba(255,255,255,0.3)" : ok[id] ? GR : "#c8413f" }} />
            {label}
          </span>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Card icon={<Monitor className={ic} />} title="Screen & input" use="Layouts that fit, sharp images, big touch targets for fingers." status={st("screen")}>
          {scr && (
            <Rows
              rows={[
                ["Visible area", `${scr.vw} × ${scr.vh} px`],
                ["Whole screen", `${scr.sw} × ${scr.sh} px`],
                ["Pixel density", `${scr.dpr}× → ${Math.round(scr.sw * scr.dpr)} × ${Math.round(scr.sh * scr.dpr)} real pixels`],
                ["Pointing with", scr.coarse ? `a finger (${scr.touch} touch points)` : scr.touch ? `mouse, plus ${scr.touch} touch points` : "a mouse or trackpad"],
                ["Orientation", scr.orient.replace("-primary", "").replace("-secondary", " (flipped)")],
                ["You prefer", `${scr.dark ? "dark" : "light"} mode, ${scr.reduce ? "less motion" : "full motion"}`],
              ]}
            />
          )}
        </Card>
        <Card icon={<Languages className={ic} />} title="Language & time" use="Dates, numbers and money in the user's own format." status={st("locale")}>
          {loc && (
            <Rows
              rows={[
                ["Languages", loc.langs],
                ["Time zone", loc.tz],
                ["Now, your way", loc.now],
                ["1234567.89", loc.num],
                ["Rp 150,000", loc.idr],
              ]}
            />
          )}
        </Card>
        <Card icon={<Wifi className={ic} />} title="Network" use="Go offline-first, send smaller images on slow links." status={net ? "live" : "…"}>
          {net && (
            <>
              <Rows
                rows={[
                  ["Status", <span key="s" style={{ color: net.online ? GR : "#c8413f" }}>{net.online ? "online" : "offline"}</span>],
                  ["Connection feels like", net.type ? net.type.toUpperCase() : "–"],
                  ["Estimated speed", net.down != null ? `${net.down} Mbps` : "–"],
                  ["Round trip", net.rtt != null ? `${net.rtt} ms` : "–"],
                  ["Data saver", net.save == null ? "–" : net.save ? "on" : "off"],
                ]}
              />
              {!ok?.network && <Note>Speed details are a Chromium feature; Safari and Firefox only say online or offline.</Note>}
              <Note>Switch your Wi-Fi off and on: the status changes live.</Note>
            </>
          )}
        </Card>
        <Card icon={<BatteryCharging className={ic} />} title="Battery" use="Pause heavy work when the battery is low." status={st("battery")}>
          {bat ? (
            <>
              <div className="flex items-center gap-3">
                <div className="relative h-9 flex-1 rounded-lg border-2 border-ink p-0.5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${bat.level * 100}%` }} transition={{ duration: 0.8 }} className="h-full rounded-[4px]" style={{ background: bat.level < 0.2 ? "#c8413f" : GR }} />
                  <span className="absolute top-1/2 -right-1.5 h-3 w-1 -translate-y-1/2 rounded-r bg-ink" />
                </div>
                <p className="w-14 text-right text-[1.3rem] font-semibold tabular-nums">{Math.round(bat.level * 100)}%</p>
              </div>
              <Note>{bat.charging ? "Charging right now." : "Running on battery."} Browsers round this on purpose, so it can&apos;t be used to track you.</Note>
            </>
          ) : (
            ok && !ok.battery && <Note>Safari and Firefox removed this API because the exact level could be used to recognise you across sites. Native apps still get it.</Note>
          )}
        </Card>
        <Card icon={<MapPin className={ic} />} title="Location" use="Delivery tracking, nearby stores, check-ins at a visit." status={st("location", false)}>
          {geo && typeof geo === "object" ? (
            <Rows
              rows={[
                ["Latitude", geo.lat.toFixed(2)],
                ["Longitude", geo.lon.toFixed(2)],
                ["Accuracy", `± ${geo.acc.toLocaleString()} m`],
                ["Equator", `about ${Math.round(Math.abs(geo.lat) * 111.2).toLocaleString()} km ${geo.lat >= 0 ? "north" : "south"} of it`],
              ]}
            />
          ) : (
            <Note>{geo ?? "Your browser asks you first. Shown here rounded to about 1 km, never sent or stored."}</Note>
          )}
          <div className="mt-3 flex flex-1 flex-col">
            <Btn onClick={locate}>Where am I?</Btn>
          </div>
        </Card>
        <MotionCard supported={ok ? ok.motion : null} />
        <Card icon={<Vibrate className={ic} />} title="Vibration" use="A buzz to confirm a scan or warn of an error." status={st("vibrate", false)}>
          <motion.div animate={shake} className="mx-auto grid h-[72px] w-[44px] place-items-center rounded-[11px] border-[3px] border-ink bg-white">
            <Vibrate className="h-4 w-4" style={{ color: OR }} />
          </motion.div>
          {buzz && <Note>{buzz}</Note>}
          <div className="mt-3 flex flex-1 flex-col">
            <Btn onClick={vibrate}>Buzz my phone</Btn>
          </div>
        </Card>
        <Card icon={<Share2 className={ic} />} title="Share sheet" use="Send a link to WhatsApp, email or any app, with the system's own sheet." status={st("share", false)}>
          <Note>{share ?? "Opens the same share sheet native apps use, with this page's link. You pick where it goes, or cancel."}</Note>
          <div className="mt-3 flex flex-1 flex-col">
            <Btn onClick={doShare}>Share this page</Btn>
          </div>
        </Card>
        <Card icon={<Sun className={ic} />} title="Keep screen on" use="Recipes, navigation, a driver's delivery list." status={wake.on ? "live" : st("wake", false)}>
          <Note>{wake.msg ?? "Stops the screen from dimming while this page is open. Released automatically when you leave."}</Note>
          <div className="mt-3 flex flex-1 flex-col">
            <Btn onClick={toggleWake} on={wake.on}>
              {wake.on ? "Screen is kept on · tap to release" : "Keep my screen on"}
            </Btn>
          </div>
        </Card>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">Everything here is read by your browser on this page only: nothing is sent or stored. Native apps get more (contacts, Bluetooth, NFC, background location, health data), each behind its own permission prompt; web pages get a careful subset, and Safari offers the fewest.</p>
    </div>
  );
}
