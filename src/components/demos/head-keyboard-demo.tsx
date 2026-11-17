"use client";

import { Camera, CameraOff, Copy, Keyboard, Play, RefreshCcw, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { EYE_A, EYE_B, ear, median } from "@/lib/drowsiness";
import { headPose } from "@/lib/face-mood";
import {
  BLINK,
  GAZE_TARGETS,
  INSTANT,
  WORDS,
  applyPrediction,
  blinkStep,
  dwellStep,
  gazeMapFrom,
  gazePointer,
  gazeRatios,
  headPointer,
  instantBlinkStep,
  predict,
  scanStep,
  type BlinkState,
  type Calib,
  type Dwell,
  type GazeMap,
  type InstantState,
  type Scan,
} from "@/lib/head-keyboard";
import { cameraError, loadFaceLandmarker } from "@/lib/mediapipe";
import { OneEuro } from "@/lib/virtual-mouse";
import { Segmented, Slider, pc } from "./controls";

type Mode = "Point + blink" | "Point + dwell" | "Blink only";
type PointWith = "Head" | "Eyes";
type BlinkStyle = "Instant" | "Hold";
type Lang = "en" | "id";
type Status = "idle" | "loading" | "calibrating" | "gaze" | "running" | "error";
const clock = () => performance.now();
const CALIBRATE_MS = 1500;
const GAZE_DOT_MS = 1400; // per calibration dot
const GAZE_SETTLE_MS = 450; // ignore the eyes' jump to a new dot
const PRE_BLINK_MS = 120; // an instant click uses where you looked just before the lids moved
const LETTER_ROWS = ["ABCDEFG", "HIJKLMN", "OPQRSTU", "VWXYZ.?"].map((r) => r.split(""));
const ROWS: string[][] = [["pred0", "pred1", "pred2", "speak"], ...LETTER_ROWS, ["space", "back", "clear"]];
const ROW_SIZES = ROWS.map((r) => r.length);

export function HeadKeyboardDemo() {
  const [mode, setMode] = useState<Mode>("Point + blink");
  const [pointWith, setPointWith] = useState<PointWith>("Head");
  const [blinkStyle, setBlinkStyle] = useState<BlinkStyle>("Instant");
  const [lang, setLang] = useState<Lang>("en");
  const [text, setText] = useState("");
  const [range, setRange] = useState(18); // degrees of head turn across the keyboard
  const [dwellMs, setDwellMs] = useState(1200);
  const [scanMs, setScanMs] = useState(1100);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [scan, setScan] = useState<Scan>({ level: "row", row: 0, col: 0, last: 0 });
  const [face, setFace] = useState(false);
  const [typed, setTyped] = useState({ chars: 0, since: 0 });
  const [gazeDot, setGazeDot] = useState<number | null>(null);
  const [hasGaze, setHasGaze] = useState(false);

  const video = useRef<HTMLVideoElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const pointerEl = useRef<HTMLDivElement>(null);
  const keyEls = useRef(new Map<string, HTMLElement>());
  const landmarker = useRef<FaceLandmarker | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const calib = useRef<Calib | null>(null);
  const calibFrames = useRef<{ until: number; yaw: number[]; pitch: number[]; ear: number[] } | null>(null);
  const gazeMap = useRef<GazeMap | null>(null);
  const gazeCal = useRef<{ i: number; start: number; samples: { h: number; v: number }[]; medians: { h: number; v: number }[] } | null>(null);
  const blink = useRef<BlinkState>({ closedSince: null });
  const instant = useRef<InstantState>({ closed: false, lastClick: -1e9 });
  const dwell = useRef<Dwell>({ key: null, since: 0, done: false });
  const scanRef = useRef<Scan>({ level: "row", row: 0, col: 0, last: 0 });
  const pointer = useRef({ x: 0.5, y: 0.5 });
  const history = useRef<{ t: number; x: number; y: number }[]>([]);
  const fx = useRef(new OneEuro(1, 0.03));
  const fy = useRef(new OneEuro(1, 0.03));
  const lastUi = useRef(0);
  type Live = { mode: Mode; pointWith: PointWith; blinkStyle: BlinkStyle; range: number; dwellMs: number; scanMs: number; flipX: boolean; flipY: boolean; press: (k: string) => void };
  // the camera loop reads the latest settings and actions through one ref
  const live = useRef<Live>({ mode, pointWith, blinkStyle, range, dwellMs, scanMs, flipX, flipY, press: () => {} });

  const preds = predict(text, WORDS[lang]);
  const label = (k: string) => (k.startsWith("pred") ? preds[Number(k[4])] ?? "" : k === "space" ? "space" : k === "back" ? "⌫ delete" : k === "clear" ? "clear" : k === "speak" ? "🔊 speak" : k);

  const press = useCallback(
    (k: string) => {
      setTyped((t) => ({ chars: t.chars + 1, since: t.since || clock() }));
      if (k.startsWith("pred")) {
        const w = predict(text, WORDS[lang])[Number(k[4])];
        if (w) setText((t) => applyPrediction(t, w));
      } else if (k === "space") setText((t) => t + " ");
      else if (k === "back") setText((t) => t.slice(0, -1));
      else if (k === "clear") setText("");
      else if (k === "speak") {
        if ("speechSynthesis" in window && text.trim()) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = lang === "id" ? "id-ID" : "en-US";
          window.speechSynthesis.speak(u);
        }
      } else if (k === "." || k === "?") setText((t) => t.replace(/\s+$/, "") + k + " ");
      else setText((t) => t + (t === "" || /[.?]\s$/.test(t) ? k : k.toLowerCase()));
    },
    [text, lang],
  );

  useEffect(() => {
    live.current = { mode, pointWith, blinkStyle, range, dwellMs, scanMs, flipX, flipY, press };
  }, [mode, pointWith, blinkStyle, range, dwellMs, scanMs, flipX, flipY, press]);

  /** Which key is under a point given in 0–1 board coordinates. */
  const keyAt = (x: number, y: number) => {
    const b = board.current?.getBoundingClientRect();
    if (!b) return null;
    const px = b.left + x * b.width;
    const py = b.top + y * b.height;
    for (const [k, el] of keyEls.current) {
      const r = el.getBoundingClientRect();
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) return k;
    }
    return null;
  };

  /** Move the pointer and run dwell / blink / scan selection; shared by the camera and the arrow keys. */
  const drive = (t: number, blinkClick: boolean, blinkProgress: number, clickAt?: { x: number; y: number }) => {
    const L = live.current;
    const p = pointer.current;
    if (pointerEl.current) {
      pointerEl.current.style.left = pc(p.x * 100);
      pointerEl.current.style.top = pc(p.y * 100);
      pointerEl.current.style.opacity = L.mode === "Blink only" ? "0" : "1";
    }
    let prog = 0;
    let hit: string | null = null;
    if (L.mode === "Blink only") {
      const r = scanStep(scanRef.current, t, ROW_SIZES, L.scanMs, blinkClick);
      scanRef.current = r.state;
      if (r.pick) L.press(ROWS[r.pick.row][r.pick.col]);
      prog = blinkProgress;
    } else {
      hit = keyAt(p.x, p.y);
      if (L.mode === "Point + dwell") {
        const r = dwellStep(dwell.current, t, hit, L.dwellMs);
        dwell.current = r.state;
        prog = r.progress;
        if (r.click && hit) L.press(hit);
      } else {
        prog = blinkProgress;
        const target = clickAt ? keyAt(clickAt.x, clickAt.y) : hit;
        if (blinkClick && target) L.press(target);
      }
    }
    if (blinkClick) pointerEl.current?.animate([{ transform: "scale(1.9)", background: "rgba(27,175,122,0.6)" }, { transform: "scale(1)" }], { duration: 300 });
    if (t - lastUi.current > 60 || blinkClick) {
      lastUi.current = t;
      setHover(hit);
      setProgress(prog);
      setScan(scanRef.current);
    }
  };

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    gazeCal.current = null;
    setGazeDot(null);
  }, []);
  useEffect(
    () => () => {
      stop();
      landmarker.current?.close();
    },
    [stop],
  );

  const startGazeCalibration = () => {
    gazeCal.current = { i: 0, start: clock(), samples: [], medians: [] };
    setGazeDot(0);
    setStatus("gaze");
  };
  const recalibrate = () => {
    calibFrames.current = { until: clock() + CALIBRATE_MS, yaw: [], pitch: [], ear: [] };
    setStatus("calibrating");
  };


  const start = async () => {
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("The camera needs a secure (https) page and a browser that supports it. You can still type with the arrow keys and Space.");
      return;
    }
    try {
      setStatus("loading");
      landmarker.current ??= await loadFaceLandmarker(true);
      const lm = landmarker.current;
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play();
      fx.current.reset();
      fy.current.reset();
      recalibrate();
      let lastTime = -1;
      const loop = () => {
        if (v.readyState >= 2 && v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          const t = clock();
          const res = lm.detectForVideo(v, t);
          const pts = res.faceLandmarks?.[0];
          if (pts) step(t, pts, res.facialTransformationMatrixes?.[0]?.data, v.videoWidth, v.videoHeight);
          if (t - lastUi.current > 200) setFace(!!pts);
        }
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (err) {
      stop();
      setStatus("error");
      setError(cameraError(err).replace(" Try a photo instead.", "").replace(", or use a photo", "") + " You can still type with the arrow keys and Space.");
    }
  };

  /** One camera frame: calibrations, pointer from head or eyes (frozen while the eyes are closed), blink detection. */
  const step = (t: number, pts: { x: number; y: number }[], matrix: ArrayLike<number> | undefined, w: number, h: number) => {
    const e = (ear(pts, EYE_A, w, h) + ear(pts, EYE_B, w, h)) / 2;
    const pose = headPose(matrix);
    const cf = calibFrames.current;
    if (cf) {
      cf.yaw.push(pose.yaw);
      cf.pitch.push(pose.pitch);
      cf.ear.push(e);
      if (t >= cf.until && cf.ear.length >= 10) {
        calib.current = { yaw: median(cf.yaw), pitch: median(cf.pitch), ear: median(cf.ear) };
        calibFrames.current = null;
        if (live.current.pointWith === "Eyes") startGazeCalibration();
        else setStatus("running");
      }
      return;
    }
    const c = calib.current;
    if (!c) return;
    const closed = e < c.ear * BLINK.ratio;
    const gz = gazeRatios(pts);
    const gc = gazeCal.current;
    if (gc) {
      // collect where the eyes point while looking at each dot, skipping the jump and any blink
      if (!closed && t - gc.start > GAZE_SETTLE_MS) gc.samples.push(gz);
      if (t - gc.start >= GAZE_DOT_MS) {
        gc.medians.push({ h: median(gc.samples.map((s) => s.h)), v: median(gc.samples.map((s) => s.v)) });
        if (gc.medians.length >= GAZE_TARGETS.length) {
          gazeMap.current = gazeMapFrom(gc.medians);
          gazeCal.current = null;
          setGazeDot(null);
          setHasGaze(true);
          fx.current = new OneEuro(0.6, 0.02); // eyes jitter more than heads: smooth harder
          fy.current = new OneEuro(0.6, 0.02);
          setStatus("running");
        } else {
          gazeCal.current = { ...gc, i: gc.i + 1, start: t, samples: [] };
          setGazeDot(gc.i + 1);
        }
      }
      return;
    }
    const L = live.current;
    if (!closed) {
      const raw = L.pointWith === "Eyes" && gazeMap.current ? gazePointer(gz, gazeMap.current) : headPointer(pose, c, { yaw: L.range, pitch: L.range * 0.65 }, { x: L.flipX, y: L.flipY });
      pointer.current = { x: fx.current.filter(raw.x, t), y: fy.current.filter(raw.y, t) };
      history.current = [...history.current.filter((p) => t - p.t < 400), { t, ...pointer.current }];
    }
    if (L.blinkStyle === "Instant") {
      const b = instantBlinkStep(instant.current, t, e, c.ear);
      instant.current = b.state;
      // lids start moving before the eye counts as closed, dragging an eye pointer: click where it was just before
      const before = history.current.find((p) => t - p.t <= PRE_BLINK_MS + 40) ?? pointer.current;
      drive(t, b.click, b.closed ? 1 : 0, b.click ? before : undefined);
    } else {
      const b = blinkStep(blink.current, t, e, c.ear);
      blink.current = b.state;
      drive(t, b.click, b.progress);
    }
  };

  /** Keyboard fallback (and a switch-access style input): arrows move the pointer, Space acts as the blink. */
  const onKey = (e: React.KeyboardEvent) => {
    const stepSize = 0.06;
    const p = pointer.current;
    const k = e.key;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"].includes(k)) return;
    e.preventDefault();
    if (k === "ArrowLeft") p.x = Math.max(0, p.x - stepSize);
    if (k === "ArrowRight") p.x = Math.min(1, p.x + stepSize);
    if (k === "ArrowUp") p.y = Math.max(0, p.y - stepSize);
    if (k === "ArrowDown") p.y = Math.min(1, p.y + stepSize);
    const select = k === " " || k === "Enter";
    if (live.current.mode === "Point + dwell" && select) {
      const hit = keyAt(p.x, p.y);
      if (hit) press(hit);
    }
    drive(clock(), select, 0);
  };

  // timers below call the latest drive() through a ref
  const driveRef = useRef(drive);
  useEffect(() => {
    driveRef.current = drive;
  });

  // scanning keeps moving when the camera is off (keyboard / switch use): advance it on a timer
  useEffect(() => {
    if (mode !== "Blink only" || status === "running") return;
    const id = setInterval(() => driveRef.current(clock(), false, 0), 100);
    return () => clearInterval(id);
  }, [mode, status]);

  // a clock for the words-per-minute figure (never read the time during render)
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!typed.since) return;
    const id = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(id);
  }, [typed.since]);
  const wpm = typed.since && now > typed.since ? text.trim().split(/\s+/).filter(Boolean).length / Math.max(1 / 60, (now - typed.since) / 60_000) : 0;
  const isLit = (r: number, c: number) => mode === "Blink only" && (scan.level === "row" ? scan.row === r : scan.row === r && scan.col === c);
  const live2 = status === "running" || status === "calibrating" || status === "gaze";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-center gap-4">
        <Segmented label="Select with" value={mode} options={["Point + blink", "Point + dwell", "Blink only"]} onChange={setMode} />
        {mode !== "Blink only" && (
          <Segmented
            label="Point with"
            value={pointWith}
            options={["Head", "Eyes"]}
            display={(p) => (p === "Head" ? "🙂 Head" : "👀 Eyes")}
            onChange={(p) => {
              setPointWith(p);
              // eye pointing needs its own calibration the first time
              if (p === "Eyes" && status === "running" && !hasGaze) startGazeCalibration();
            }}
          />
        )}
        {mode !== "Point + dwell" && <Segmented label="Blink click" value={blinkStyle} options={["Instant", "Hold"]} display={(b) => (b === "Instant" ? "Instant" : `Hold ${BLINK.minMs / 1000} s`)} onChange={setBlinkStyle} />}
        <Segmented label="Word suggestions" value={lang} options={["en", "id"] as Lang[]} display={(l) => (l === "en" ? "English" : "Bahasa Indonesia")} onChange={setLang} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
            <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            {!live2 && (
              <div className="absolute inset-0 grid place-items-center p-4 text-center text-white">
                <div>
                  <Camera className="mx-auto h-7 w-7 opacity-80" />
                  {status === "loading" ? (
                    <p className="mt-2 text-[12.5px]">Loading the face model…</p>
                  ) : (
                    <button type="button" onClick={start} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-medium text-ink">
                      <Play className="h-3.5 w-3.5" /> Start camera
                    </button>
                  )}
                  {error && <p className="mt-2 text-[11.5px] text-[#ffb4a8]">{error}</p>}
                </div>
              </div>
            )}
            {status === "calibrating" && (
              <div className="absolute inset-x-0 bottom-0 bg-ink/75 px-3 py-2.5 text-center text-white">
                <p className="text-[12.5px] font-semibold">Look at the middle of the keyboard, eyes open…</p>
              </div>
            )}
            {status === "gaze" && (
              <div className="absolute inset-x-0 bottom-0 bg-ink/75 px-3 py-2.5 text-center text-white">
                <p className="text-[12.5px] font-semibold">Follow the orange dot on the keyboard with your eyes, keep your head still ({(gazeDot ?? 0) + 1}/5)</p>
              </div>
            )}
            {status === "running" && !face && <p className="absolute inset-x-0 top-2 text-center text-[12px] text-white">No face in view</p>}
          </div>
          {live2 && (
            <div className="flex flex-wrap gap-2 text-[12px]">
              <button type="button" onClick={recalibrate} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5">
                <RefreshCcw className="h-3.5 w-3.5" /> Recalibrate
              </button>
              {pointWith === "Eyes" && mode !== "Blink only" && (
                <button type="button" onClick={startGazeCalibration} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5">
                  👀 Calibrate eyes
                </button>
              )}
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
            </div>
          )}
          <div className="space-y-3 rounded-2xl bg-white p-4">
            {mode !== "Blink only" && pointWith === "Head" && <Slider label="Head turn across the keyboard" value={range} min={8} max={35} unit="°" onChange={setRange} />}
            {mode === "Point + dwell" && <Slider label="Dwell time" value={dwellMs / 1000} min={0.6} max={2.5} step={0.1} unit=" s" onChange={(v) => setDwellMs(Math.round(v * 1000))} />}
            {mode === "Blink only" && <Slider label="Scan speed (per step)" value={scanMs / 1000} min={0.6} max={2.5} step={0.1} unit=" s" onChange={(v) => setScanMs(Math.round(v * 1000))} />}
            {mode !== "Blink only" && pointWith === "Head" && (
              <div className="flex flex-wrap gap-3 text-[12px]">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={flipX} onChange={(e) => setFlipX(e.target.checked)} className="accent-[#0b0b0b]" /> Flip left/right
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={flipY} onChange={(e) => setFlipY(e.target.checked)} className="accent-[#0b0b0b]" /> Flip up/down
                </label>
              </div>
            )}
            <p className="text-[11.5px] leading-snug text-ink-2/60">
              {mode === "Point + dwell"
                ? `Point with your ${pointWith === "Eyes" ? "eyes" : "head"} and hold still on a key.`
                : blinkStyle === "Instant" || mode === "Blink only"
                  ? `Instant: every blink clicks the moment your eyes close (one click per ${INSTANT.refractoryMs / 1000} s at most). Natural blinks click too, so keep suggestions and delete handy.`
                  : `Hold: close both eyes for about ${BLINK.minMs / 1000} s, then open. Normal blinks are ignored.`}
              {pointWith === "Eyes" && mode !== "Blink only" && " Eye pointing works best with your head still, good light and no glasses glare; the pointer freezes while you blink."}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">Your message</p>
              <div className="flex items-center gap-2 text-[11.5px] text-ink-2/60">
                {wpm > 0 && <span className="font-mono">{wpm.toFixed(1)} words / min</span>}
                <button type="button" onClick={() => navigator.clipboard?.writeText(text)} className="inline-flex items-center gap-1 rounded-full border border-ink/10 px-2.5 py-1">
                  <Copy className="h-3 w-3" /> Copy
                </button>
                <button type="button" onClick={() => press("speak")} className="inline-flex items-center gap-1 rounded-full border border-ink/10 px-2.5 py-1">
                  <Volume2 className="h-3 w-3" /> Speak
                </button>
              </div>
            </div>
            <p className="mt-2 min-h-[2.6em] text-[1.6rem] leading-snug font-medium tracking-[-0.01em] break-words">
              {text || <span className="text-ink/25">{lang === "en" ? "I need water" : "Saya mau minum"}</span>}
              <span className="ml-0.5 inline-block h-[1em] w-[3px] animate-pulse bg-ink align-middle" />
            </p>
          </div>

          <div ref={board} tabIndex={0} onKeyDown={onKey} className="relative space-y-2 rounded-2xl bg-white p-3 outline-none focus-visible:ring-2 focus-visible:ring-ink/30" aria-label="On-screen keyboard: arrow keys move, Space selects">
            {ROWS.map((row, r) => (
              <div key={r} className={`flex gap-2 rounded-xl p-0.5 transition-colors ${mode === "Blink only" && scan.level === "row" && scan.row === r ? "bg-[#1baf7a]/20" : ""}`}>
                {row.map((k, c) => {
                  const lit = isLit(r, c) || hover === k;
                  const isPred = k.startsWith("pred");
                  return (
                    <button
                      key={k}
                      ref={(el) => {
                        if (el) keyEls.current.set(k, el);
                        else keyEls.current.delete(k);
                      }}
                      type="button"
                      onClick={() => press(k)}
                      className={`relative h-14 min-w-0 flex-1 truncate rounded-xl border-2 px-1 text-[1.15rem] font-semibold transition-colors sm:h-16 ${k === "space" ? "flex-[3]" : ""} ${isPred ? "border-dashed text-[0.95rem] font-medium" : ""} ${lit ? "border-ink bg-ink text-white" : "border-ink/10 bg-cream/40"}`}
                    >
                      {label(k) || <span className="opacity-30">–</span>}
                      {lit && progress > 0 && mode !== "Blink only" && <span className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-[#1baf7a]" style={{ width: pc(progress * 100) }} />}
                    </button>
                  );
                })}
              </div>
            ))}
            <div ref={pointerEl} aria-hidden className="pointer-events-none absolute z-10 -mt-3 -ml-3 h-6 w-6 rounded-full border-[3px] border-[#eb6834] bg-[#eb6834]/25 opacity-0" style={{ left: "50%", top: "50%" }} />
            {gazeDot !== null && (
              <div className="pointer-events-none absolute inset-0 z-20 rounded-2xl bg-white/70">
                <span
                  className="absolute -mt-4 -ml-4 h-8 w-8 animate-pulse rounded-full bg-[#eb6834] shadow-[0_0_0_8px_rgba(235,104,52,0.25)]"
                  style={{ left: pc(GAZE_TARGETS[gazeDot].x * 100), top: pc(GAZE_TARGETS[gazeDot].y * 100) }}
                />
              </div>
            )}
          </div>
          <p className="flex items-center gap-1.5 px-1 text-[12px] text-ink-2/60">
            <Keyboard className="h-3.5 w-3.5" /> No camera? Click the keyboard, then use the arrow keys to move and Space as the blink. Keys can also be clicked.
          </p>
        </div>
      </div>
    </div>
  );
}
