"use client";

import { motion } from "framer-motion";
import { Camera, CameraOff, Play, RefreshCcw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { averageShapes, headPose, moodProbs, smooth, MOODS, type Mood, type Shapes } from "@/lib/face-mood";
import { cameraError, loadFaceLandmarker } from "@/lib/mediapipe";
import { Segmented, pc } from "./controls";

export const MOOD_EMOJI: Record<Mood, string> = { happy: "😄", surprised: "😮", sad: "😢", angry: "😠", neutral: "😐" };
export const MOOD_COLOR: Record<Mood, string> = { happy: "#1baf7a", surprised: "#eda100", sad: "#2a78d6", angry: "#e34948", neutral: "#8a8a85" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const clock = () => performance.now();
const CALIBRATE_MS = 1500;

type Pose = { yaw: number; pitch: number; roll: number };
type Reading = { shapes: Shapes; pose: Pose; probs: Record<Mood, number>; top: Mood; ev: ReturnType<typeof moodProbs>["ev"]; face: boolean; fps: number; ms: number };
type Status = "idle" | "loading" | "calibrating" | "running" | "error";


const toShapes = (res: FaceLandmarkerResult): Shapes | null => {
  const cats = res.faceBlendshapes?.[0]?.categories;
  if (!cats?.length) return null;
  return Object.fromEntries(cats.map((c) => [c.categoryName, c.score]));
};

/** Thin white contours (eyes, brows, lips, face oval) over the mirrored video. */
function drawContours(canvas: HTMLCanvasElement, w: number, h: number, res: FaceLandmarkerResult | null, edges: { start: number; end: number }[]) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  const pts = res?.faceLandmarks?.[0];
  if (!pts) return;
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = Math.max(1, w / 400);
  ctx.beginPath();
  for (const { start, end } of edges) {
    ctx.moveTo(pts[start].x * w, pts[start].y * h);
    ctx.lineTo(pts[end].x * w, pts[end].y * h);
  }
  ctx.stroke();
}

/* ------------------------------------------------------------------ avatar */

/**
 * An original cartoon face driven by the blendshapes, mirrored like a selfie.
 * MediaPipe names sides from the camera's point of view, so "Left" shapes move the avatar's right side on screen.
 */
export function Avatar({ s, pose, size = 220 }: { s: Shapes; pose: Pose; size?: number }) {
  const g = (n: string) => s[n] ?? 0;
  const dx = Math.max(-16, Math.min(16, -pose.yaw * 0.8));
  const dy = Math.max(-10, Math.min(10, pose.pitch * 0.5));
  const roll = Math.max(-25, Math.min(25, -pose.roll));
  const smile = (g("mouthSmileLeft") + g("mouthSmileRight")) / 2;
  const frown = (g("mouthFrownLeft") + g("mouthFrownRight")) / 2;
  const jaw = g("jawOpen");
  const pucker = g("mouthPucker");
  const browUp = g("browInnerUp");
  const eye = (side: "L" | "R") => {
    const k = side === "L" ? "Right" : "Left"; // screen-left eye follows MediaPipe's "Right" shapes
    const blink = g(`eyeBlink${k}`);
    const wide = g(`eyeWide${k}`);
    const down = g(`browDown${k}`);
    const outer = g(`browOuterUp${k}`);
    const cx = (side === "L" ? 70 : 130) + dx;
    const cy = 96 + dy;
    const ry = Math.max(1.5, 12 * (1 - blink) + wide * 4);
    const sgn = side === "L" ? 1 : -1; // inner end of the brow points to the nose
    const inner = 74 + dy - browUp * 14 + down * 9;
    const outerY = 72 + dy - outer * 12 - browUp * 4 + down * 2;
    return (
      <g key={side}>
        <path d={`M${cx - 15 * sgn},${outerY} Q${cx},${(inner + outerY) / 2 - 5} ${cx + 15 * sgn},${inner}`} stroke="#0b0b0b" strokeWidth={5} fill="none" strokeLinecap="round" />
        {ry < 3 ? (
          <path d={`M${cx - 12},${cy} Q${cx},${cy + 5} ${cx + 12},${cy}`} stroke="#0b0b0b" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        ) : (
          <>
            <ellipse cx={cx} cy={cy} rx={12} ry={ry} fill="#fff" stroke="#0b0b0b" strokeWidth={3} />
            <circle cx={cx + dx * 0.2} cy={cy + dy * 0.15} r={Math.min(5.5, ry * 0.55)} fill="#0b0b0b" />
          </>
        )}
      </g>
    );
  };
  const mx = 100 + dx;
  const my = 142 + dy;
  const half = 20 + smile * 9 - pucker * 9 + (g("mouthStretchLeft") + g("mouthStretchRight")) * 4;
  const lift = smile * 12 - frown * 14;
  const open = jaw * 30;
  const top = my - 2 - smile * 3;
  const mouth = `M${mx - half},${my - lift} Q${mx},${top + (open ? -2 : smile * 10 - frown * 6)} ${mx + half},${my - lift} Q${mx},${my + open + smile * 8 - frown * 2} ${mx - half},${my - lift} Z`;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="block">
      <g transform={`rotate(${roll.toFixed(1)} 100 110)`}>
        <circle cx={100} cy={108} r={80} fill="#f6e7cf" stroke="#0b0b0b" strokeWidth={4} />
        <ellipse cx={58 + dx} cy={128 + dy} rx={13} ry={8} fill="#eb6834" opacity={Math.min(0.55, (g("cheekSquintLeft") + g("cheekSquintRight")) * 0.6 + smile * 0.25)} />
        <ellipse cx={142 + dx} cy={128 + dy} rx={13} ry={8} fill="#eb6834" opacity={Math.min(0.55, (g("cheekSquintLeft") + g("cheekSquintRight")) * 0.6 + smile * 0.25)} />
        {eye("L")}
        {eye("R")}
        <path d={`M${100 + dx * 1.1},${108 + dy} q-4,10 2,12`} stroke="#0b0b0b" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
        <path d={mouth} fill={open > 5 ? "#0b0b0b" : "none"} stroke="#0b0b0b" strokeWidth={4} strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ mood readout */

function MoodPanel({ r }: { r: Reading }) {
  const ranked = [...MOODS].sort((a, b) => r.probs[b] - r.probs[a]);
  const why = r.top === "neutral" ? null : r.ev[r.top as Exclude<Mood, "neutral">].parts.filter((p) => p.v > 0.05).sort((a, b) => b.share - a.share);
  return (
    <div className="rounded-2xl bg-white p-5">
      <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">Your expression reads as</p>
      <motion.p key={r.top} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-[2rem] leading-none font-semibold tracking-[-0.04em]" style={{ color: MOOD_COLOR[r.top] }}>
        {MOOD_EMOJI[r.top]} {cap(r.top)}
      </motion.p>
      <div className="mt-4 space-y-2">
        {ranked.map((m) => (
          <div key={m}>
            <div className="flex justify-between text-[12.5px]">
              <span>
                {MOOD_EMOJI[m]} {cap(m)}
              </span>
              <span className="font-mono text-ink-2/70">{(r.probs[m] * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
              <motion.div className="h-full rounded-full" style={{ background: MOOD_COLOR[m] }} animate={{ width: pc(r.probs[m] * 100) }} transition={{ duration: 0.2 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[12px] font-semibold">Why</p>
        {why?.length ? (
          <ul className="mt-1.5 space-y-1">
            {why.map((p) => (
              <li key={p.au + p.label} className="flex items-center justify-between gap-2 text-[12px] text-ink-2/75">
                <span>
                  {p.label} <span className="font-mono text-[10.5px] text-muted">{p.au}</span>
                </span>
                <span className="font-mono">{p.v.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[12px] text-ink-2/65">No action unit moved much from your relaxed face.</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ demo */

const EMPTY: Reading = { shapes: {}, pose: { yaw: 0, pitch: 0, roll: 0 }, ...moodProbs({}), face: false, fps: 0, ms: 0 };

export function FaceMoodDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const landmarker = useRef<FaceLandmarker | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const smoothed = useRef<Shapes | null>(null);
  const baseline = useRef<Shapes>({});
  const calib = useRef<{ until: number; frames: Shapes[] } | null>(null);
  const frames = useRef<number[]>([]);
  const lastUi = useRef(0);
  const readingRef = useRef<Reading>(EMPTY);

  const [tab, setTab] = useState<"Mood mirror" | "Copy the mood">("Mood mirror");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [reading, setReading] = useState<Reading>(EMPTY);
  const [calibLeft, setCalibLeft] = useState(0);

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  useEffect(
    () => () => {
      stop();
      landmarker.current?.close();
    },
    [stop],
  );

  const recalibrate = () => {
    calib.current = { until: clock() + CALIBRATE_MS, frames: [] };
    setStatus("calibrating");
  };

  const start = async () => {
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("The camera needs a secure (https) page and a browser that supports it.");
      return;
    }
    try {
      setStatus("loading");
      landmarker.current ??= await loadFaceLandmarker();
      const lm = landmarker.current;
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play();
      const { FaceLandmarker: FL } = await import("@mediapipe/tasks-vision");
      const edges = [...FL.FACE_LANDMARKS_LIPS, ...FL.FACE_LANDMARKS_LEFT_EYE, ...FL.FACE_LANDMARKS_RIGHT_EYE, ...FL.FACE_LANDMARKS_LEFT_EYEBROW, ...FL.FACE_LANDMARKS_RIGHT_EYEBROW, ...FL.FACE_LANDMARKS_FACE_OVAL];
      smoothed.current = null;
      recalibrate();
      let lastTime = -1;
      const loop = () => {
        if (v.readyState >= 2 && v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          const t0 = clock();
          const res = lm.detectForVideo(v, t0);
          const ms = clock() - t0;
          drawContours(overlay.current!, v.videoWidth, v.videoHeight, res, edges);
          const raw = toShapes(res);
          const now = clock();
          frames.current = [...frames.current.filter((t) => now - t < 1000), now];
          if (raw) smoothed.current = smooth(smoothed.current, raw);
          const c = calib.current;
          if (c) {
            if (raw) c.frames.push(raw);
            if (now >= c.until && c.frames.length >= 5) {
              baseline.current = averageShapes(c.frames);
              calib.current = null;
              setStatus("running");
            }
          }
          const s = smoothed.current ?? {};
          const m = moodProbs(s, baseline.current);
          readingRef.current = { shapes: s, pose: headPose(res.facialTransformationMatrixes?.[0]?.data), probs: m.probs, top: m.top, ev: m.ev, face: !!raw, fps: frames.current.length, ms };
          if (now - lastUi.current > 50) {
            lastUi.current = now;
            setReading(readingRef.current);
            setCalibLeft(c ? Math.max(0, c.until - now) : 0);
          }
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
    <div className="space-y-4">
      <div className="flex justify-center">
        <Segmented label="" value={tab} options={["Mood mirror", "Copy the mood"]} onChange={setTab} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
            <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            {!live && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                <div>
                  <Camera className="mx-auto h-8 w-8 opacity-80" />
                  <p className="mt-3 text-[15px] font-semibold">{status === "loading" ? "Loading the face model…" : "Turn on your camera"}</p>
                  <p className="mx-auto mt-1 max-w-[320px] text-[12.5px] text-white/65">Video stays on this device: it is processed in your browser and never uploaded or recorded.</p>
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
                <p className="text-[13px] font-semibold">Relax your face and look at the camera…</p>
                <div className="mx-auto mt-2 h-1 w-40 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white" style={{ width: pc((1 - calibLeft / CALIBRATE_MS) * 100) }} />
                </div>
              </div>
            )}
            {status === "running" && !reading.face && <p className="absolute inset-x-0 top-3 text-center text-[13px] text-white">No face found: move into the frame</p>}
          </div>
          {live && (
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <button type="button" onClick={recalibrate} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5">
                <RefreshCcw className="h-3.5 w-3.5" /> Recalibrate relaxed face
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
                {reading.fps} fps · {reading.ms.toFixed(0)} ms
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {tab === "Mood mirror" ? (
            live ? (
              <div className="grid gap-3 sm:grid-cols-[auto_1fr] lg:grid-cols-1 xl:grid-cols-[auto_1fr]">
                <div className="grid place-items-center rounded-2xl bg-cream/70 p-3">
                  <Avatar s={reading.shapes} pose={reading.pose} />
                </div>
                <MoodPanel r={reading} />
              </div>
            ) : (
              <Sliders />
            )
          ) : (
            <Challenge readingRef={readingRef} live={status === "running"} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ no camera: drive the same rules with sliders */

const SLIDERS: { key: string; label: string; shapes: string[] }[] = [
  { key: "smile", label: "Smile", shapes: ["mouthSmileLeft", "mouthSmileRight", "cheekSquintLeft", "cheekSquintRight"] },
  { key: "brows", label: "Raise brows", shapes: ["browInnerUp", "browOuterUpLeft", "browOuterUpRight", "eyeWideLeft", "eyeWideRight"] },
  { key: "jaw", label: "Open mouth", shapes: ["jawOpen"] },
  { key: "frown", label: "Frown", shapes: ["mouthFrownLeft", "mouthFrownRight", "mouthShrugLower"] },
  { key: "scowl", label: "Lower brows", shapes: ["browDownLeft", "browDownRight", "noseSneerLeft", "noseSneerRight", "mouthPressLeft", "mouthPressRight"] },
];

function Sliders() {
  const [v, setV] = useState<Record<string, number>>({ smile: 0.6, brows: 0, jaw: 0.1, frown: 0, scowl: 0 });
  const s: Shapes = {};
  for (const sl of SLIDERS) for (const n of sl.shapes) s[n] = Math.max(s[n] ?? 0, n.startsWith("cheek") || n.startsWith("eyeWide") || n.startsWith("nose") || n.startsWith("mouthPress") || n === "mouthShrugLower" ? v[sl.key] * 0.5 : v[sl.key]);
  const m = moodProbs(s);
  const r: Reading = { shapes: s, pose: { yaw: 0, pitch: 0, roll: 0 }, probs: m.probs, top: m.top, ev: m.ev, face: true, fps: 0, ms: 0 };
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-4">
        <p className="text-[12.5px] text-ink-2/70">
          <b className="text-ink">No camera? Make faces with sliders.</b> They drive the same mood rules and avatar the camera would.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SLIDERS.map((sl) => (
            <label key={sl.key} className="block text-[12.5px]">
              <span className="flex justify-between">
                <span>{sl.label}</span>
                <span className="font-mono text-muted">{v[sl.key].toFixed(2)}</span>
              </span>
              <input type="range" min={0} max={1} step={0.01} value={v[sl.key]} onChange={(e) => setV({ ...v, [sl.key]: Number(e.target.value) })} className="mt-1 w-full accent-[#0b0b0b]" />
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[auto_1fr] lg:grid-cols-1 xl:grid-cols-[auto_1fr]">
        <div className="grid place-items-center rounded-2xl bg-cream/70 p-3">
          <Avatar s={s} pose={r.pose} size={190} />
        </div>
        <MoodPanel r={r} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Copy the mood */

const ORDER: Mood[] = ["happy", "surprised", "angry", "sad"];
const PROMPT_MS = 8000;
const HOLD_MS = 700;
const HOLD_P = 0.5;
type Result = { mood: Mood; ok: boolean; ms: number; shapes: Shapes; pose: Pose };

function Challenge({ readingRef, live }: { readingRef: React.RefObject<Reading>; live: boolean }) {
  const [phase, setPhase] = useState<"intro" | "prompt" | "between" | "done">("intro");
  const [queue, setQueue] = useState<Mood[]>([]);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [left, setLeft] = useState(PROMPT_MS);
  const [hold, setHold] = useState(0);
  const [now, setNow] = useState<Reading | null>(null);
  const t0 = useRef(0);
  const holdStart = useRef<number | null>(null);
  const target = queue[i];

  const begin = () => {
    const q = [...ORDER];
    for (let k = q.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [q[k], q[j]] = [q[j], q[k]];
    }
    setQueue([...q, "neutral"]);
    setResults([]);
    setI(0);
    t0.current = clock();
    holdStart.current = null;
    setLeft(PROMPT_MS);
    setPhase("prompt");
  };

  useEffect(() => {
    if (phase !== "prompt") return;
    const id = setInterval(() => {
      const r = readingRef.current;
      setNow(r);
      const tNow = clock();
      const elapsed = tNow - t0.current;
      const match = r.face && r.top === target && r.probs[target] >= HOLD_P;
      if (match) holdStart.current ??= tNow;
      else holdStart.current = null;
      const held = holdStart.current ? tNow - holdStart.current : 0;
      setHold(Math.min(1, held / HOLD_MS));
      setLeft(Math.max(0, PROMPT_MS - elapsed));
      if (held >= HOLD_MS || elapsed >= PROMPT_MS) {
        const ok = held >= HOLD_MS;
        setResults((rs) => [...rs, { mood: target, ok, ms: ok ? elapsed : PROMPT_MS, shapes: { ...r.shapes }, pose: { ...r.pose } }]);
        setPhase("between");
      }
    }, 80);
    return () => clearInterval(id);
  }, [phase, target, readingRef]);

  useEffect(() => {
    if (phase !== "between") return;
    const id = setTimeout(() => {
      if (i + 1 >= queue.length) setPhase("done");
      else {
        setI(i + 1);
        t0.current = clock();
        holdStart.current = null;
        setHold(0);
        setLeft(PROMPT_MS);
        setPhase("prompt");
      }
    }, 1300);
    return () => clearTimeout(id);
  }, [phase, i, queue.length]);

  if (!live) {
    return (
      <div className="grid min-h-[300px] place-items-center rounded-2xl bg-white p-6 text-center">
        <div>
          <p className="text-[2rem]">😄 😮 😠 😢 😐</p>
          <p className="mt-3 text-[1.2rem] font-semibold tracking-[-0.02em]">Copy the mood</p>
          <p className="mx-auto mt-1 max-w-[360px] text-[13px] text-ink-2/70">Five expressions, eight seconds each. Turn on your camera on the left, let it learn your relaxed face, then start.</p>
        </div>
      </div>
    );
  }

  if (phase === "intro" || phase === "done") {
    const won = results.filter((r) => r.ok);
    return (
      <div className="space-y-3 rounded-2xl bg-white p-5 text-center">
        {phase === "done" ? (
          <>
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Result</p>
            <p className="text-[2.2rem] leading-none font-semibold tracking-[-0.04em]">
              {won.length} / {results.length} moods
            </p>
            <p className="text-[13px] text-ink-2/70">{won.length ? `Average ${(won.reduce((a, r) => a + r.ms, 0) / won.length / 1000).toFixed(1)} s per expression.` : "None held long enough this time. Exaggerate a little!"}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {results.map((r, k) => (
                <div key={k} className={`rounded-xl border p-1.5 ${r.ok ? "border-[#1baf7a]/40 bg-[#1baf7a]/5" : "border-ink/10 bg-cream/40"}`}>
                  <div className="grid place-items-center">
                    <Avatar s={r.shapes} pose={r.pose} size={86} />
                  </div>
                  <p className="text-[12px] font-semibold">
                    {MOOD_EMOJI[r.mood]} {cap(r.mood)}
                  </p>
                  <p className="text-[11px] text-ink-2/65">{r.ok ? `✓ ${(r.ms / 1000).toFixed(1)} s` : "✗ time out"}</p>
                </div>
              ))}
            </div>
            <p className="text-[11.5px] text-ink-2/55">The recap shows the avatar in your pose, not a photo of you.</p>
          </>
        ) : (
          <>
            <p className="text-[2rem]">😄 😮 😠 😢 😐</p>
            <p className="text-[1.3rem] font-semibold tracking-[-0.02em]">Copy the mood</p>
            <p className="mx-auto max-w-[380px] text-[13px] text-ink-2/70">Make each expression and hold it until the bar fills. Big, clear faces work best.</p>
          </>
        )}
        <button type="button" onClick={begin} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[13.5px] font-medium text-white">
          {phase === "done" ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />} {phase === "done" ? "Try again" : "Start"}
        </button>
      </div>
    );
  }

  const last = results.at(-1);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">
            {i + 1} / {queue.length} · make this face
          </p>
          <p className={`font-mono text-[1.3rem] font-semibold tabular-nums ${left < 3000 ? "text-[#e34948]" : ""}`}>{Math.ceil(left / 1000)}s</p>
        </div>
        <p className="mt-1 text-[2.2rem] leading-none font-semibold tracking-[-0.04em]" style={{ color: MOOD_COLOR[target] }}>
          {MOOD_EMOJI[target]} {target === "neutral" ? "Poker face" : cap(target)}
        </p>
        <div className="mt-4">
          <p className="text-[11.5px] text-ink-2/65">{phase === "between" && last ? (last.ok ? "✓ Got it!" : "✗ Time's up") : "Hold it…"}</p>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink/[0.06]">
            <div className="h-full rounded-full transition-[width] duration-75" style={{ width: pc((phase === "between" && last?.ok ? 1 : hold) * 100), background: MOOD_COLOR[target] }} />
          </div>
        </div>
      </div>
      {now && (
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="grid place-items-center rounded-2xl bg-cream/70 p-2">
            <Avatar s={now.shapes} pose={now.pose} size={150} />
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">It reads</p>
            <p className="mt-1 text-[1.5rem] font-semibold tracking-[-0.03em]" style={{ color: MOOD_COLOR[now.top] }}>
              {MOOD_EMOJI[now.top]} {cap(now.top)} <span className="font-mono text-[13px] text-ink-2/60">{(now.probs[now.top] * 100).toFixed(0)}%</span>
            </p>
            <p className="mt-2 text-[12px] text-ink-2/65">
              {cap(target)}: {(now.probs[target] * 100).toFixed(0)}% (needs {HOLD_P * 100}% for {HOLD_MS / 1000} s)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
