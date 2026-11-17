"use client";

import { Camera, CameraOff, Play, RefreshCcw, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { DEFAULTS, EYE_A, EYE_B, MOUTH, ear, fatigueLevel, freshState, mar, median, step, type Settings, type State } from "@/lib/drowsiness";
import { cameraError, loadFaceLandmarker } from "@/lib/mediapipe";
import { Segmented, Slider, pc } from "./controls";

const clock = () => performance.now();
const CALIBRATE_MS = 2000;
const LEVEL_COLOR = { Awake: "#1baf7a", Tired: "#eda100", Drowsy: "#e34948" } as const;

type View = { ear: number; mar: number; threshold: number; closed: boolean; closedMs: number; perclos: number | null; blinkRate: number; yawns: number; longest: number; yawning: boolean; alarm: boolean; spark: number[]; face: boolean; fps: number };
const EMPTY_VIEW: View = { ear: 0, mar: 0, threshold: 0, closed: false, closedMs: 0, perclos: null, blinkRate: 0, yawns: 0, longest: 0, yawning: false, alarm: false, spark: [], face: false, fps: 0 };

function beep(c: AudioContext) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.27);
}

/** A pulsing warning tone with the Web Audio API (no sound files). Stable across renders. */
function useAlarm() {
  const ctx = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const unlock = useCallback(() => {
    ctx.current ??= new AudioContext();
    void ctx.current.resume();
  }, []);
  const set = useCallback((on: boolean) => {
    if (on && !timer.current && ctx.current) {
      const c = ctx.current;
      beep(c);
      timer.current = setInterval(() => beep(c), 400);
    } else if (!on && timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => () => set(false), [set]);
  return useMemo(() => ({ unlock, set }), [unlock, set]);
}

/** Eye and mouth points over the mirrored video: green when open, red when closed. */
function drawEyes(canvas: HTMLCanvasElement, w: number, h: number, res: FaceLandmarkerResult | null, closed: boolean) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  const pts = res?.faceLandmarks?.[0];
  if (!pts) return;
  const r = Math.max(2, w / 220);
  for (const [idx, color] of [
    [EYE_A, closed ? "#ff5a4d" : "#3ee0a1"],
    [EYE_B, closed ? "#ff5a4d" : "#3ee0a1"],
    [Object.values(MOUTH), "rgba(255,255,255,0.8)"],
  ] as [number[], string][]) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, w / 500);
    if (idx.length === 6) {
      ctx.beginPath();
      [0, 1, 2, 3, 4, 5, 0].forEach((k, n) => (n ? ctx.lineTo(pts[idx[k]].x * w, pts[idx[k]].y * h) : ctx.moveTo(pts[idx[k]].x * w, pts[idx[k]].y * h)));
      ctx.stroke();
    }
    for (const i of idx) {
      ctx.beginPath();
      ctx.arc(pts[i].x * w, pts[i].y * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function DrowsinessDemo() {
  const [mode, setMode] = useState<"Camera" | "Simulate">("Camera");
  const [cfg, setCfg] = useState<Settings>(DEFAULTS);
  const [sound, setSound] = useState(true);
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Segmented label="" value={mode} options={["Camera", "Simulate"]} display={(m) => (m === "Camera" ? "Use my camera" : "No camera: simulate")} onChange={setMode} />
      </div>
      {mode === "Camera" ? <CameraMode cfg={cfg} sound={sound} /> : <SimulateMode cfg={cfg} sound={sound} />}
      <div className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Slider label="Alarm after eyes closed for" value={cfg.alarmMs / 1000} min={0.5} max={3} step={0.1} unit=" s" onChange={(v) => setCfg({ ...cfg, alarmMs: Math.round(v * 1000) })} />
        <Slider label="Closed below (share of your open-eye EAR)" value={Math.round(cfg.closedRatio * 100)} min={50} max={90} unit="%" onChange={(v) => setCfg({ ...cfg, closedRatio: v / 100 })} />
        <button type="button" onClick={() => setSound((v) => !v)} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ink/10 px-3.5 py-2 text-[12.5px]" aria-pressed={sound}>
          {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} Alarm sound {sound ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ dashboard shared by both modes */

function Dashboard({ v, cfg, calibrating }: { v: View; cfg: Settings; calibrating?: boolean }) {
  const level = fatigueLevel(v.closedMs, v.perclos, v.yawns, cfg.alarmMs);
  const W = 420;
  const H = 110;
  const max = Math.max(0.45, ...v.spark);
  const y = (e: number) => H - 8 - (e / max) * (H - 16);
  const path = v.spark.map((e, i) => `${i ? "L" : "M"}${((i / Math.max(1, v.spark.length - 1)) * W).toFixed(1)},${y(e).toFixed(1)}`).join("");
  return (
    <div className="space-y-3">
      <div className={`rounded-2xl p-5 transition-colors ${v.alarm ? "animate-pulse bg-[#e34948] text-white" : "bg-white"}`}>
        <p className={`font-mono text-[10.5px] tracking-wide uppercase ${v.alarm ? "text-white/70" : "text-muted"}`}>Driver status</p>
        <p className="mt-1 text-[2rem] leading-none font-semibold tracking-[-0.04em]" style={v.alarm ? undefined : { color: LEVEL_COLOR[level] }}>
          {calibrating ? "Calibrating…" : v.alarm ? "⚠️ Wake up!" : !v.face ? "No face" : v.closed ? `Eyes closed ${(v.closedMs / 1000).toFixed(1)} s` : level === "Awake" ? "✅ Awake" : level === "Tired" ? "😪 Getting tired" : "⚠️ Drowsy"}
        </p>
        {!calibrating && v.face && (
          <div className={`mt-3 h-2 overflow-hidden rounded-full ${v.alarm ? "bg-white/25" : "bg-ink/[0.06]"}`}>
            <div className="h-full rounded-full transition-[width] duration-75" style={{ width: pc(Math.min(1, v.closedMs / cfg.alarmMs) * 100), background: v.alarm ? "#fff" : "#e34948" }} />
          </div>
        )}
        {!calibrating && v.face && <p className={`mt-1 text-[11.5px] ${v.alarm ? "text-white/80" : "text-ink-2/60"}`}>Alarm when the bar fills: eyes closed for {(cfg.alarmMs / 1000).toFixed(1)} s</p>}
      </div>
      <div className="rounded-2xl bg-white p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold">Eye aspect ratio, last seconds</p>
          <p className="font-mono text-[12px]">
            EAR {v.ear.toFixed(3)} <span className="text-muted">/ closed below {v.threshold.toFixed(3)}</span>
          </p>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
          <rect x={0} y={y(v.threshold)} width={W} height={H - y(v.threshold)} fill="rgba(227,73,72,0.08)" />
          <line x1={0} x2={W} y1={y(v.threshold)} y2={y(v.threshold)} stroke="#e34948" strokeDasharray="4 4" />
          <text x={4} y={y(v.threshold) - 4} fontSize={10.5} fill="#c03a2b">
            closed
          </text>
          {path && <path d={path} fill="none" stroke="#0b0b0b" strokeWidth={2} strokeLinejoin="round" />}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: "Blinks / min", v: v.blinkRate ? v.blinkRate.toFixed(0) : "–" },
          { l: "PERCLOS (1 min)", v: v.perclos === null ? "…" : `${(v.perclos * 100).toFixed(0)}%` },
          { l: "Yawns (5 min)", v: String(v.yawns) + (v.yawning ? " …" : "") },
          { l: "Longest closure", v: `${(v.longest / 1000).toFixed(1)} s` },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-white px-4 py-3">
            <p className="text-[1.4rem] leading-none font-semibold tracking-[-0.03em]">{s.v}</p>
            <p className="mt-1 font-mono text-[10px] text-muted uppercase">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function toView(st: State, r: ReturnType<typeof step>, earNow: number, marNow: number, face: boolean, fps: number): View {
  const now = st.history.at(-1)?.t ?? 0;
  return {
    ear: earNow,
    mar: marNow,
    threshold: r.threshold,
    closed: r.closed,
    closedMs: r.closedMs,
    perclos: r.perclos,
    blinkRate: r.blinkRate,
    yawns: st.yawns.length,
    longest: st.longest,
    yawning: r.yawning,
    alarm: st.alarm,
    spark: st.history.filter((p) => now - p.t < 12_000).map((p) => p.ear),
    face,
    fps,
  };
}

/* ------------------------------------------------------------------ camera */

function CameraMode({ cfg, sound }: { cfg: Settings; sound: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const landmarker = useRef<FaceLandmarker | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const state = useRef<State>(freshState());
  const baseline = useRef(0);
  const calib = useRef<{ until: number; ears: number[] } | null>(null);
  const frames = useRef<number[]>([]);
  const lastUi = useRef(0);
  const cfgRef = useRef(cfg);
  const soundRef = useRef(sound);
  const alarm = useAlarm();
  const [status, setStatus] = useState<"idle" | "loading" | "calibrating" | "running" | "error">("idle");
  const [error, setError] = useState("");
  const [view, setView] = useState<View>(EMPTY_VIEW);
  const [openEar, setOpenEar] = useState(0);
  useEffect(() => {
    cfgRef.current = cfg;
    soundRef.current = sound;
    if (!sound) alarm.set(false);
  }, [cfg, sound, alarm]);

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    alarm.set(false);
  }, [alarm]);
  useEffect(
    () => () => {
      stop();
      landmarker.current?.close();
    },
    [stop],
  );

  const calibrate = () => {
    calib.current = { until: clock() + CALIBRATE_MS, ears: [] };
    state.current = freshState();
    setStatus("calibrating");
  };

  const start = async () => {
    setError("");
    alarm.unlock(); // browsers only allow sound after a click
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("The camera needs a secure (https) page and a browser that supports it.");
      return;
    }
    try {
      setStatus("loading");
      landmarker.current ??= await loadFaceLandmarker(false);
      const lm = landmarker.current;
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play();
      calibrate();
      let lastTime = -1;
      const loop = () => {
        if (v.readyState >= 2 && v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          const now = clock();
          const res = lm.detectForVideo(v, now);
          const pts = res.faceLandmarks?.[0];
          frames.current = [...frames.current.filter((t) => now - t < 1000), now];
          let earNow = 0;
          let marNow = 0;
          if (pts) {
            const w = v.videoWidth;
            const h = v.videoHeight;
            earNow = (ear(pts, EYE_A, w, h) + ear(pts, EYE_B, w, h)) / 2;
            marNow = mar(pts, w, h);
          }
          const c = calib.current;
          if (c) {
            if (pts) c.ears.push(earNow);
            if (now >= c.until && c.ears.length >= 10) {
              baseline.current = median(c.ears);
              setOpenEar(baseline.current);
              calib.current = null;
              setStatus("running");
            }
          }
          let closed = false;
          if (!c && pts && baseline.current) {
            const r = step(state.current, now, earNow, marNow, baseline.current, cfgRef.current);
            state.current = r.state;
            closed = r.closed;
            alarm.set(soundRef.current && r.state.alarm);
            if (now - lastUi.current > 50) {
              lastUi.current = now;
              setView(toView(r.state, r, earNow, marNow, true, frames.current.length));
            }
          } else if (now - lastUi.current > 100) {
            lastUi.current = now;
            alarm.set(false);
            setView((prev) => ({ ...prev, face: !!pts, ear: earNow, fps: frames.current.length }));
          }
          drawEyes(overlay.current!, v.videoWidth, v.videoHeight, res, closed);
        }
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      stop();
      setStatus("error");
      setError(cameraError(e).replace(" Try a photo instead.", "").replace(", or use a photo", ""));
    }
  };

  const live = status === "running" || status === "calibrating";
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink ${view.alarm ? "ring-8 ring-[#e34948]" : ""}`}>
          <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
          <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover" />
          {!live && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
              <div>
                <Camera className="mx-auto h-8 w-8 opacity-80" />
                <p className="mt-3 text-[15px] font-semibold">{status === "loading" ? "Loading the face model…" : "Turn on your camera"}</p>
                <p className="mx-auto mt-1 max-w-[320px] text-[12.5px] text-white/65">Video stays on this device. Sit as you would at the wheel or your desk, face the camera.</p>
                {status !== "loading" && (
                  <button type="button" onClick={start} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-medium text-ink">
                    <Play className="h-4 w-4" /> Start camera
                  </button>
                )}
                {error && <p className="mt-3 text-[12.5px] text-[#ffb4a8]">{error}</p>}
              </div>
            </div>
          )}
          {status === "calibrating" && (
            <div className="absolute inset-x-0 bottom-0 bg-ink/70 px-4 py-3 text-center text-white">
              <p className="text-[13px] font-semibold">Keep your eyes open and look at the camera…</p>
              <p className="text-[11.5px] text-white/70">Measuring your open-eye EAR</p>
            </div>
          )}
          {status === "running" && !view.face && <p className="absolute inset-x-0 top-3 text-center text-[13px] text-white">No face found: move into the frame</p>}
        </div>
        {live && (
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <button type="button" onClick={calibrate} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5">
              <RefreshCcw className="h-3.5 w-3.5" /> Recalibrate
            </button>
            <button
              type="button"
              onClick={() => {
                stop();
                setStatus("idle");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5"
            >
              <CameraOff className="h-3.5 w-3.5" /> Stop
            </button>
            <span className="ml-auto font-mono text-muted">
              {view.fps} fps · open-eye EAR {openEar ? openEar.toFixed(3) : "–"}
            </span>
          </div>
        )}
      </div>
      <Dashboard v={view} cfg={cfg} calibrating={status === "calibrating"} />
    </div>
  );
}

/* ------------------------------------------------------------------ no camera: the same logic driven by a slider */

const SIM_BASELINE = 0.3;

function SimulateMode({ cfg, sound }: { cfg: Settings; sound: boolean }) {
  const [open, setOpen] = useState(1);
  const [yawn, setYawn] = useState(false);
  const [view, setView] = useState<View>(EMPTY_VIEW);
  const state = useRef<State>(freshState());
  const input = useRef({ open, yawn, cfg, sound });
  const alarm = useAlarm();
  useEffect(() => {
    input.current = { open, yawn, cfg, sound };
  }, [open, yawn, cfg, sound]);
  useEffect(() => {
    const id = setInterval(() => {
      const t = clock();
      const { open: o, yawn: y, cfg: c, sound: snd } = input.current;
      const earNow = SIM_BASELINE * o;
      const r = step(state.current, t, earNow, y ? 0.8 : 0.1, SIM_BASELINE, c);
      state.current = r.state;
      alarm.set(snd && r.state.alarm);
      setView(toView(r.state, r, earNow, y ? 0.8 : 0.1, true, 0));
    }, 50);
    return () => {
      clearInterval(id);
      alarm.set(false);
    };
  }, [alarm]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl bg-white p-5" onPointerDown={alarm.unlock}>
        <p className="text-[13px] text-ink-2/70">
          <b className="text-ink">No camera? Play the driver.</b> Close the eye with the slider and hold it there: the same detector code runs on these numbers, with an open-eye EAR of {SIM_BASELINE}.
        </p>
        <EyeDiagram open={open} />
        <Slider label="Eye openness" value={Math.round(open * 100)} min={0} max={100} unit="%" onChange={(v) => setOpen(v / 100)} />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={yawn} onChange={(e) => setYawn(e.target.checked)} className="accent-[#0b0b0b]" /> Mouth wide open (yawn); untick after a second or two to count it
        </label>
      </div>
      <Dashboard v={view} cfg={cfg} />
    </div>
  );
}

/** The six EAR points on a drawn eye, moving with the openness. */
export function EyeDiagram({ open, size = 300 }: { open: number; size?: number }) {
  const cx = 150;
  const cy = 60;
  const lid = 34 * open;
  const p = {
    p1: [62, cy],
    p2: [118, cy - lid],
    p3: [182, cy - lid],
    p4: [238, cy],
    p5: [182, cy + lid * 0.8],
    p6: [118, cy + lid * 0.8],
  } as Record<string, [number, number]>;
  const earV = ((p.p2[1] - p.p6[1]) ** 2) ** 0.5 + ((p.p3[1] - p.p5[1]) ** 2) ** 0.5;
  const value = earV / (2 * (p.p4[0] - p.p1[0]));
  return (
    <svg viewBox="0 0 300 130" width="100%" style={{ maxWidth: size }} className="mx-auto block">
      <path d={`M${p.p1[0]},${cy} C${p.p2[0]},${p.p2[1] - 8} ${p.p3[0]},${p.p3[1] - 8} ${p.p4[0]},${cy} C${p.p5[0]},${p.p5[1] + 6} ${p.p6[0]},${p.p6[1] + 6} ${p.p1[0]},${cy} Z`} fill="#fff" stroke="#0b0b0b" strokeWidth={3} />
      {open > 0.15 && <circle cx={cx} cy={cy} r={Math.min(18, lid * 0.75)} fill="#0b0b0b" />}
      <line x1={p.p2[0]} y1={p.p2[1]} x2={p.p6[0]} y2={p.p6[1]} stroke="#2a78d6" strokeWidth={2} strokeDasharray="3 3" />
      <line x1={p.p3[0]} y1={p.p3[1]} x2={p.p5[0]} y2={p.p5[1]} stroke="#2a78d6" strokeWidth={2} strokeDasharray="3 3" />
      <line x1={p.p1[0]} y1={cy} x2={p.p4[0]} y2={cy} stroke="#eb6834" strokeWidth={2} strokeDasharray="3 3" />
      {Object.entries(p).map(([k, [x, y]]) => (
        <g key={k}>
          <circle cx={x} cy={y} r={5} fill="#eb6834" stroke="#fff" strokeWidth={2} />
          <text x={x + (k === "p1" ? -22 : k === "p4" ? 8 : -6)} y={y + (k === "p2" || k === "p3" ? -10 : k === "p5" || k === "p6" ? 18 : 4)} fontSize={11} fontFamily="var(--font-geist-mono)" fill="#5f5f5a">
            {k}
          </text>
        </g>
      ))}
      <text x={150} y={124} textAnchor="middle" fontSize={12.5} fontFamily="var(--font-geist-mono)" fill="#0b0b0b">
        EAR = (|p2−p6| + |p3−p5|) / (2·|p1−p4|) = {value.toFixed(3)}
      </text>
    </svg>
  );
}
