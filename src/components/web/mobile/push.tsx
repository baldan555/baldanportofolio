"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { BatteryFull, Bell, ChevronLeft, Package, Signal, Snowflake, Zap } from "lucide-react";
import { FLOWS } from "@/data/web-flows";
import { FlowCard } from "../concepts/flow";

/*
 * Push notifications and the app lifecycle, simulated on a phone mock: the app moves between not running,
 * foreground, background and suspended, and a push behaves differently in each. The callbacks each platform fires
 * are listed for every transition. Below, two real things: a local notification from this page and the
 * visibility events this very tab fires.
 */
type Life = "off" | "fg" | "bg" | "susp";
type Kind = "alert" | "silent";
const OR = "#eb6834";
const GR = "#1baf7a";
const NODES: Record<Life, { x: number; y: number; name: string; sub: string }> = {
  off: { x: 95, y: 45, name: "Not running", sub: "no memory used" },
  fg: { x: 305, y: 45, name: "Foreground", sub: "on screen" },
  bg: { x: 305, y: 195, name: "Background", sub: "running, briefly" },
  susp: { x: 95, y: 195, name: "Suspended", sub: "frozen in memory" },
};
type EdgeId = "open" | "home" | "back" | "later" | "resume" | "swipe" | "killed";
const EDGES: { id: EdgeId; label: string; a: [number, number]; b: [number, number]; t?: number }[] = [
  { id: "open", label: "open", a: [157, 45], b: [243, 45] },
  { id: "home", label: "home", a: [335, 67], b: [335, 173] },
  { id: "back", label: "back", a: [275, 173], b: [275, 67] },
  { id: "later", label: "time passes", a: [243, 195], b: [157, 195] },
  { id: "resume", label: "resume", a: [140, 173], b: [260, 67], t: 0.7 },
  { id: "swipe", label: "swipe away", a: [260, 173], b: [140, 67], t: 0.3 },
  { id: "killed", label: "killed", a: [95, 173], b: [95, 67] },
];
const HOOKS: Record<EdgeId, { lesson: string; rows: [string, string][] }> = {
  open: {
    lesson: "A cold start: the app loads from nothing, the slowest way in. Keep startup light.",
    rows: [["iOS", "didFinishLaunching → sceneDidBecomeActive"], ["Android", "onCreate → onStart → onResume"], ["React Native", "JS bundle loads → AppState “active”"], ["Flutter", "main() → AppLifecycleState.resumed"], ["Web", "load → pageshow"]],
  },
  home: {
    lesson: "Save anything unsaved now: this may be the last moment your code runs before the app is killed.",
    rows: [["iOS", "sceneWillResignActive → sceneDidEnterBackground"], ["Android", "onPause → onStop"], ["React Native", "AppState “background”"], ["Flutter", "inactive → hidden → paused"], ["Web", "visibilitychange → hidden"]],
  },
  back: {
    lesson: "A warm start: everything is still in memory, so it's instant. Refresh data that may be stale.",
    rows: [["iOS", "sceneWillEnterForeground → sceneDidBecomeActive"], ["Android", "onRestart → onStart → onResume"], ["React Native", "AppState “active”"], ["Flutter", "AppLifecycleState.resumed"], ["Web", "visibilitychange → visible"]],
  },
  later: {
    lesson: "The system freezes the app to save battery. No callback, no code: timers and sockets simply stop.",
    rows: [["iOS", "(no callback: frozen)"], ["Android", "(no callback: process cached)"], ["React Native", "(nothing: JavaScript paused)"], ["Flutter", "(nothing)"], ["Web", "freeze (Chromium)"]],
  },
  resume: {
    lesson: "Back from frozen with memory intact. Reconnect sockets and refresh: the world moved on while it slept.",
    rows: [["iOS", "sceneWillEnterForeground → sceneDidBecomeActive"], ["Android", "onRestart → onStart → onResume"], ["React Native", "AppState “active”"], ["Flutter", "AppLifecycleState.resumed"], ["Web", "resume → visibilitychange → visible"]],
  },
  swipe: {
    lesson: "Swiped away in the app switcher: the process ends. Don't count on a goodbye callback.",
    rows: [["iOS", "(usually none)"], ["Android", "onDestroy, not guaranteed"], ["React Native", "(nothing reliable)"], ["Flutter", "detached, not guaranteed"], ["Web", "pagehide, sometimes"]],
  },
  killed: {
    lesson: "Killed while frozen, to free memory or by a swipe. No code runs at all, which is why you save on the way to the background.",
    rows: [["iOS", "(none)"], ["Android", "(none: process killed)"], ["React Native", "(none)"], ["Flutter", "(none)"], ["Web", "(none: tab discarded)"]],
  },
};
type Outcome = { title: string; text: string; tone: "ok" | "info" | "bad" };
function outcome(life: Life, kind: Kind, byUser: boolean): Outcome {
  if (kind === "alert") {
    if (life === "fg") return { tone: "info", title: "Handed to the app", text: "The app is open, so the system passes the message to your code instead of showing a banner. The app decides what to do: here, a small in-app toast." };
    return { tone: "ok", title: "Shown by the system", text: `The phone shows the banner itself; your app doesn't have to be running. ${life === "off" ? "Tap it and the app cold-starts straight on the order." : "Tap it and the app comes back on the order."}` };
  }
  if (life === "fg") return { tone: "ok", title: "Data only, nothing shown", text: "The open app receives the data and quietly updates the order list." };
  if (life !== "off") return { tone: "info", title: "Woken for a few seconds", text: "The system wakes the app briefly to fetch new data, then freezes it again. It may delay or skip this to save battery." };
  if (byUser) return { tone: "bad", title: "Probably not delivered", text: "On iPhone, silent pushes don't reach an app the user swiped away. Android usually still delivers it, unless the phone maker blocks background starts." };
  return { tone: "info", title: "May launch in the background", text: "The system can start the app in the background for a few seconds to handle it, but it may delay or skip it to save battery." };
}
const stamp = () => `+${(performance.now() / 1000).toFixed(1)} s`;

function Phone({ life, screen, splash, banner, toast, wake, shipped, onBanner, onBack }: { life: Life; screen: "list" | "order"; splash: boolean; banner: boolean; toast: boolean; wake: boolean; shipped: boolean; onBanner: () => void; onBack: () => void }) {
  const orders: [string, string, string][] = [
    ["#1234", "Coffee beans 5 kg", shipped ? "On its way" : "Packed"],
    ["#1233", "Paper cups ×500", "Delivered"],
    ["#1229", "Fresh milk 12 L", "Delivered"],
  ];
  return (
    <div className="relative mx-auto h-[400px] w-[205px] overflow-hidden rounded-[36px] border-[7px] border-ink bg-[#f2efe9] shadow-[0_24px_50px_-28px_rgba(11,11,11,0.65)]">
      <div className="flex items-center justify-between px-4 pt-2 text-[10px] font-semibold">
        <span>09:41</span>
        <span className="mx-auto h-4 w-16 rounded-full bg-ink" />
        <span className="flex gap-0.5">
          <Signal className="h-3 w-3" />
          <BatteryFull className="h-3 w-3" />
        </span>
      </div>
      {life === "fg" ? (
        splash ? (
          <div className="absolute inset-0 grid place-items-center" style={{ background: OR }}>
            <div className="text-center text-white">
              <Package className="mx-auto h-10 w-10" />
              <p className="mt-1 text-[15px] font-bold">Kirim</p>
              <p className="text-[10px] opacity-75">cold start…</p>
            </div>
          </div>
        ) : screen === "order" ? (
          <div className="px-3 pt-3">
            <button type="button" onClick={onBack} className="flex items-center text-[11px] text-ink/60">
              <ChevronLeft className="h-3.5 w-3.5" /> Orders
            </button>
            <p className="mt-2 font-mono text-[10px] text-ink/50">ORDER #1234</p>
            <p className="text-[17px] leading-tight font-semibold">Coffee beans 5 kg</p>
            <div className="mt-3 rounded-2xl bg-white p-3">
              <p className="text-[12px] font-semibold" style={{ color: GR }}>
                On its way
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-cream">
                <motion.div initial={{ width: "20%" }} animate={{ width: "72%" }} transition={{ duration: 1.2 }} className="h-full rounded-full" style={{ background: GR }} />
              </div>
              <p className="mt-1.5 text-[10.5px] text-ink/55">Driver about 4 min away</p>
            </div>
            <p className="mt-3 text-[10.5px] leading-snug text-ink/50">Opened from the notification: a deep link took you straight to this screen.</p>
          </div>
        ) : (
          <div className="px-3 pt-3">
            <p className="text-[17px] font-semibold">Kirim</p>
            <p className="text-[10.5px] text-ink/50">Your orders</p>
            <div className="mt-2 space-y-1.5">
              {orders.map(([id, what, st]) => (
                <motion.div key={id + st} initial={{ backgroundColor: st === "On its way" ? "#eaf8f1" : "#ffffff" }} animate={{ backgroundColor: "#ffffff" }} transition={{ duration: 1.6 }} className="rounded-xl px-2.5 py-2">
                  <p className="flex justify-between text-[11px] font-semibold">
                    {id} <span style={{ color: st === "Delivered" ? "rgba(11,11,11,0.4)" : st === "On its way" ? GR : OR }}>{st}</span>
                  </p>
                  <p className="text-[10.5px] text-ink/55">{what}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="grid grid-cols-4 gap-x-2 gap-y-3 px-3 pt-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="text-center">
              {i === 5 ? (
                <div className="relative">
                  <div className="mx-auto grid h-9 w-9 place-items-center rounded-[11px] text-white" style={{ background: OR, opacity: life === "off" ? 1 : 0.95 }}>
                    <Package className="h-4.5 w-4.5" />
                  </div>
                  {life === "susp" && <Snowflake className="absolute -top-1 right-0 h-3.5 w-3.5 rounded-full bg-white p-0.5 text-[#3b82c4]" />}
                  {wake && <motion.span initial={{ scale: 0.8, opacity: 1 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 1, repeat: 2 }} className="absolute inset-0 mx-auto h-9 w-9 rounded-[11px] border-2" style={{ borderColor: GR }} />}
                  <p className="mt-0.5 text-[8.5px] font-semibold">Kirim</p>
                </div>
              ) : (
                <>
                  <div className="mx-auto h-9 w-9 rounded-[11px] bg-ink/[0.09]" />
                  <p className="mx-auto mt-1 h-1 w-6 rounded bg-ink/10" />
                </>
              )}
            </div>
          ))}
          <p className="col-span-4 mt-2 text-center text-[10px] text-ink/50">{life === "off" ? "Kirim is not running" : life === "bg" ? "Kirim is in the background" : "Kirim is suspended (frozen)"}</p>
        </div>
      )}
      <AnimatePresence>
        {banner && (
          <motion.button type="button" onClick={onBanner} initial={{ y: -90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -90, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className="absolute inset-x-2 top-7 rounded-2xl bg-white/95 p-2.5 text-left shadow-[0_10px_30px_-12px_rgba(11,11,11,0.45)] backdrop-blur">
            <p className="flex items-center gap-1.5 text-[9.5px] text-ink/55">
              <span className="grid h-4 w-4 place-items-center rounded-[5px] text-white" style={{ background: OR }}>
                <Package className="h-2.5 w-2.5" />
              </span>
              KIRIM · now
            </p>
            <p className="mt-1 text-[11.5px] font-semibold">Order #1234 is on its way</p>
            <p className="text-[10.5px] text-ink/60">Tap to track your driver</p>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="absolute inset-x-3 bottom-5 rounded-full bg-ink px-3 py-2 text-center text-[10.5px] text-white">
            In-app: order #1234 is on its way
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-1.5 mx-auto h-1 w-16 rounded-full bg-ink/70" />
    </div>
  );
}

function Machine({ life, last, run }: { life: Life; last: EdgeId | null; run: number }) {
  const mk = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 400 240" className="mx-auto block h-auto w-full max-w-[540px]" role="img" aria-label="App lifecycle state machine">
      <defs>
        <marker id={`${mk}a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="rgba(11,11,11,0.35)" />
        </marker>
        <marker id={`${mk}b`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={OR} />
        </marker>
      </defs>
      {EDGES.map((e) => {
        const on = e.id === last;
        return <line key={e.id} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke={on ? OR : "rgba(11,11,11,0.22)"} strokeWidth={on ? 2.2 : 1.3} markerEnd={`url(#${mk}${on ? "b" : "a"})`} />;
      })}
      {(Object.keys(NODES) as Life[]).map((k) => {
        const nd = NODES[k];
        const on = k === life;
        return (
          <g key={k}>
            <rect x={nd.x - 62} y={nd.y - 22} width={124} height={44} rx={13} fill={on ? "#0b0b0b" : "#fff"} stroke={on ? "#0b0b0b" : "rgba(11,11,11,0.18)"} />
            <text x={nd.x} y={nd.y - 2} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={on ? "#fff" : "#0b0b0b"} fontFamily="ui-sans-serif, system-ui">
              {nd.name}
            </text>
            <text x={nd.x} y={nd.y + 12} textAnchor="middle" fontSize={9.5} fill={on ? "rgba(255,255,255,0.6)" : "rgba(11,11,11,0.5)"} fontFamily="ui-sans-serif, system-ui">
              {nd.sub}
            </text>
          </g>
        );
      })}
      {EDGES.map((e) => {
        const t = e.t ?? 0.5;
        const x = e.a[0] + (e.b[0] - e.a[0]) * t;
        const y = e.a[1] + (e.b[1] - e.a[1]) * t;
        const w = e.label.length * 5.9 + 14;
        const on = e.id === last;
        return (
          <g key={e.id}>
            <rect x={x - w / 2} y={y - 9} width={w} height={18} rx={9} fill={on ? OR : "#fbfaf7"} stroke={on ? OR : "rgba(11,11,11,0.15)"} />
            <text x={x} y={y + 3.7} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={on ? "#fff" : "rgba(11,11,11,0.65)"} fontFamily="ui-sans-serif, system-ui">
              {e.label}
            </text>
          </g>
        );
      })}
      {last &&
        (() => {
          const e = EDGES.find((x) => x.id === last) as (typeof EDGES)[number];
          return <motion.circle key={run} r={5} fill={OR} stroke="#fff" strokeWidth={1.5} initial={{ cx: e.a[0], cy: e.a[1], opacity: 1 }} animate={{ cx: e.b[0], cy: e.b[1], opacity: [1, 1, 0] }} transition={{ duration: 0.9, ease: "easeInOut" }} />;
        })()}
    </svg>
  );
}

export function PushLifecycle() {
  const [life, setLife] = useState<Life>("off");
  const [last, setLast] = useState<EdgeId | null>(null);
  const [run, setRun] = useState(0);
  const [byUser, setByUser] = useState(false);
  const [screen, setScreen] = useState<"list" | "order">("list");
  const [splash, setSplash] = useState(false);
  const [banner, setBanner] = useState(false);
  const [toast, setToast] = useState(false);
  const [wake, setWake] = useState(false);
  const [shipped, setShipped] = useState(false);
  const [res, setRes] = useState<Outcome | null>(null);
  const timers = useRef<Record<string, number>>({});
  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach((id) => window.clearTimeout(id));
  }, []);
  const after = (key: string, ms: number, fn: () => void) => {
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(fn, ms);
  };
  const go = (to: Life, edge: EdgeId, opts: { user?: boolean; screen?: "list" | "order" } = {}) => {
    setLife(to);
    setLast(edge);
    setRun((r) => r + 1);
    window.clearTimeout(timers.current.suspend);
    if (to === "off") setByUser(Boolean(opts.user));
    if (to === "fg") {
      setScreen(opts.screen ?? "list");
      if (edge === "open") {
        setSplash(true);
        after("splash", 900, () => setSplash(false));
      }
    }
    if (to === "bg")
      after("suspend", 4000, () => {
        setLife("susp");
        setLast("later");
        setRun((r) => r + 1);
      });
  };
  const send = (kind: Kind) => {
    const o = outcome(life, kind, byUser);
    setRes(o);
    if (kind === "alert") {
      setShipped(true);
      if (life === "fg") {
        setToast(true);
        after("toast", 2800, () => setToast(false));
      } else {
        setBanner(true);
        after("banner", 8000, () => setBanner(false));
      }
    } else if (life === "fg") setShipped(true);
    else if (o.tone !== "bad") {
      setShipped(true);
      setWake(true);
      after("wake", 2600, () => setWake(false));
    }
  };
  const tapBanner = () => {
    setBanner(false);
    if (life === "off") go("fg", "open", { screen: "order" });
    else if (life === "bg") go("fg", "back", { screen: "order" });
    else if (life === "susp") go("fg", "resume", { screen: "order" });
  };
  const reset = () => {
    Object.values(timers.current).forEach((id) => window.clearTimeout(id));
    setLife("off");
    setLast(null);
    setByUser(false);
    setScreen("list");
    setSplash(false);
    setBanner(false);
    setToast(false);
    setWake(false);
    setShipped(false);
    setRes(null);
  };
  type Move = { label: string; to: Life; edge: EdgeId; user?: boolean };
  const moves: Move[] =
    life === "off"
      ? [{ label: "Open the app", to: "fg", edge: "open" }]
      : life === "fg"
        ? [{ label: "Go to the home screen", to: "bg", edge: "home" }]
        : life === "bg"
          ? [
              { label: "Switch back", to: "fg", edge: "back" },
              { label: "Swipe it away", to: "off", edge: "swipe", user: true },
            ]
          : [
              { label: "Switch back", to: "fg", edge: "resume" },
              { label: "Phone needs memory", to: "off", edge: "killed" },
              { label: "Swipe it away", to: "off", edge: "killed", user: true },
            ];
  const hook = last ? HOOKS[last] : null;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col items-center gap-3 rounded-[26px] bg-[#fbfaf7] p-4">
          <Phone life={life} screen={screen} splash={splash} banner={banner} toast={toast} wake={wake} shipped={shipped} onBanner={tapBanner} onBack={() => setScreen("list")} />
          <div className="w-full max-w-[320px] rounded-2xl border border-line bg-white p-3">
            <p className="text-[11px] font-semibold">Your server sends a push:</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => send("alert")} className="flex items-center justify-center gap-1.5 rounded-xl bg-ink px-2 py-2 text-[11.5px] font-semibold text-white">
                <Bell className="h-3.5 w-3.5" /> Notification
              </button>
              <button type="button" onClick={() => send("silent")} className="flex items-center justify-center gap-1.5 rounded-xl border border-ink px-2 py-2 text-[11.5px] font-semibold">
                <Zap className="h-3.5 w-3.5" /> Silent data
              </button>
            </div>
            {res && (
                <motion.div key={res.title + life} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-xl px-2.5 py-2 text-[11.5px] leading-snug" style={{ background: res.tone === "bad" ? "#fdf0ee" : res.tone === "ok" ? "#eaf8f1" : "#f6f3ee" }}>
                  <p className="font-semibold" style={{ color: res.tone === "bad" ? "#a3302e" : res.tone === "ok" ? "#0f6e4c" : undefined }}>
                    {res.title}
                  </p>
                  <p className="text-ink-2/70">{res.text}</p>
                </motion.div>
              )}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="rounded-[22px] border border-line bg-white p-3">
            <div className="flex flex-wrap items-center gap-1.5 px-1">
              <p className="mr-auto text-[12px] font-semibold">The app&apos;s lifecycle</p>
              {moves.map(({ label, to, edge, user }) => (
                <button key={label} type="button" onClick={() => go(to, edge, { user })} className="rounded-full bg-cream px-3 py-1.5 text-[11.5px] font-semibold hover:bg-ink hover:text-white">
                  {label}
                </button>
              ))}
              <button type="button" onClick={reset} className="rounded-full border border-line px-3 py-1.5 text-[11.5px] hover:border-ink">
                Reset
              </button>
            </div>
            <div className="mt-2">
              <Machine life={life} last={last} run={run} />
            </div>
          </div>
          <div className="rounded-[22px] bg-ink p-4 text-white">
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-white/45 uppercase">{last ? `What your code hears · ${EDGES.find((e) => e.id === last)?.label}` : "What your code hears"}</p>
            {hook ? (
              <>
                <p className="mt-1.5 text-[13.5px] leading-snug font-semibold">{hook.lesson}</p>
                <dl className="mt-3 grid gap-1">
                  {hook.rows.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-2 text-[11.5px]">
                      <dt className="text-white/50">{k}</dt>
                      <dd className="font-mono break-words text-white/85">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="mt-1.5 text-[13.5px] leading-snug font-semibold">Open the app, send it to the background, wait, and send pushes in each state. Each move shows the callbacks every platform fires.</p>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[22px] border border-line bg-white p-3">
          <p className="px-1 text-[12px] font-semibold">How a push travels</p>
          <p className="px-1 text-[11.5px] text-ink-2/55">Your server never talks to the phone directly: Apple and Google keep the one connection open.</p>
          <div className="mt-2">
            <FlowCard flow={FLOWS.push} />
          </div>
        </div>
        <ThisTab />
      </div>
    </div>
  );
}

async function localNotification(): Promise<"shown" | "denied" | "unsupported" | "sw-only"> {
  if (!("Notification" in window)) return "unsupported";
  let p = Notification.permission;
  if (p === "default") p = await Notification.requestPermission();
  if (p !== "granted") return "denied";
  const title = "Order #1234 is on its way";
  const opts = { body: "A local notification from this page. A real push comes from a server, even with the app closed.", tag: "portfolio-demo" };
  try {
    new Notification(title, opts);
    return "shown";
  } catch {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg) return "sw-only";
    await reg.showNotification(title, opts);
    return "shown";
  }
}
const NOTE: Record<Awaited<ReturnType<typeof localNotification>>, string> = {
  shown: "Sent. Check your notifications: this one came from the page itself, no server involved.",
  denied: "Notifications are blocked for this site. You can allow them again from the padlock next to the address bar.",
  unsupported: "This browser has no notifications for web pages here. On iPhone they only work for web apps added to the home screen.",
  "sw-only": "This browser only shows notifications from a service worker (Chrome on Android works this way), and this page doesn't install one.",
};

/** Real events from this tab: switch tabs or minimise the window and come back. */
function ThisTab() {
  const [log, setLog] = useState<{ k: number; t: string; ev: string }[]>([]);
  const [hides, setHides] = useState(0);
  const [perm, setPerm] = useState("…");
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    let k = 0;
    const add = (ev: string) => {
      k += 1;
      const e = { k, t: stamp(), ev };
      setLog((l) => [e, ...l].slice(0, 7));
    };
    const onVis = () => {
      add(`visibilitychange → ${document.visibilityState}`);
      if (document.visibilityState === "hidden") setHides((h) => h + 1);
    };
    const subs: [EventTarget, string, () => void][] = [
      [document, "visibilitychange", onVis],
      [document, "freeze", () => add("freeze")],
      [document, "resume", () => add("resume")],
      [window, "online", () => add("online")],
      [window, "offline", () => add("offline")],
    ];
    subs.forEach(([t, e, f]) => t.addEventListener(e, f));
    const t0 = window.setTimeout(() => {
      add(`watching · tab is ${document.visibilityState}`);
      setPerm("Notification" in window ? Notification.permission : "unsupported");
    }, 0);
    return () => {
      window.clearTimeout(t0);
      subs.forEach(([t, e, f]) => t.removeEventListener(e, f));
    };
  }, []);
  const tryIt = async () => {
    const r = await localNotification();
    setNote(NOTE[r]);
    setPerm("Notification" in window ? Notification.permission : "unsupported");
  };
  return (
    <div className="flex flex-col rounded-[22px] border border-line bg-white p-3">
      <p className="px-1 text-[12px] font-semibold">Real, in this browser</p>
      <p className="px-1 text-[11.5px] text-ink-2/55">Switch to another tab or minimise the window, then come back. A web page has a lifecycle too.</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-cream/60 px-3 py-2">
          <p className="text-[10.5px] text-ink-2/55">Times you left this tab</p>
          <p className="text-[1.4rem] leading-tight font-semibold tabular-nums">{hides}</p>
        </div>
        <div className="rounded-xl bg-cream/60 px-3 py-2">
          <p className="text-[10.5px] text-ink-2/55">Notification permission</p>
          <p className="text-[1.05rem] leading-tight font-semibold">{perm}</p>
        </div>
      </div>
      <ol className="mt-2 min-h-[118px] space-y-0.5 rounded-xl bg-[#fbfaf7] p-2 font-mono text-[10.5px]">
        {log.map((l) => (
          <li key={l.k} className="flex gap-2">
            <span className="w-14 shrink-0 text-ink-2/45">{l.t}</span>
            <span>{l.ev}</span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={tryIt} className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#eb6834] px-3 py-2 text-[12px] font-semibold text-white">
        <Bell className="h-3.5 w-3.5" /> Send me a real local notification
      </button>
      {note && <p className="mt-1.5 text-[11.5px] leading-snug text-ink-2/65">{note}</p>}
    </div>
  );
}
