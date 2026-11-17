"use client";

import { Camera, CameraOff, Play, RefreshCcw, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ObjectDetector } from "@mediapipe/tasks-vision";
import { cameraError, loadObjectDetector } from "@/lib/mediapipe";
import { Tracker, type Det, type Line } from "@/lib/tracker";
import { Segmented, Slider } from "./controls";

export const CLASSES = ["car", "bus", "truck", "motorcycle", "bicycle", "person"] as const;
export const CLASS_COLOR: Record<string, string> = { car: "#2a78d6", bus: "#eda100", truck: "#6250d6", motorcycle: "#eb6834", bicycle: "#1baf7a", person: "#e34948" };
const ICON: Record<string, string> = { car: "🚗", bus: "🚌", truck: "🚚", motorcycle: "🏍️", bicycle: "🚲", person: "🚶" };
// well-known spots, picked from TfL's list (ids are TfL's)
export const FEATURED = [
  { id: "00001.07450", name: "Piccadilly Circus" },
  { id: "00001.08850", name: "Marble Arch" },
  { id: "00001.06515", name: "Hyde Park Corner" },
  { id: "00001.08858", name: "Oxford St / Orchard St" },
  { id: "00001.07361", name: "Euston Rd / Tottenham Court Rd" },
  { id: "00001.03604", name: "Elephant & Castle" },
  { id: "00001.03500", name: "Tower Bridge Approach" },
  { id: "00001.06510", name: "Westminster Bridge Rd" },
];
const clock = () => performance.now();
const CLIP_FPS = 12; // frames analysed per second of clip

type Cam = { id: string; name: string; available: boolean };
type Counts = Record<string, { plus: number; minus: number }>;
const zero = (): Counts => Object.fromEntries(CLASSES.map((c) => [c, { plus: 0, minus: 0 }]));

function drawScene(canvas: HTMLCanvasElement, w: number, h: number, tracker: Tracker, line: Line, flash: number) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  const k = Math.max(1, w / 420);
  ctx.lineWidth = 3 * k;
  ctx.strokeStyle = flash > 0 ? "#3ee0a1" : "rgba(255,255,255,0.9)";
  ctx.setLineDash([10 * k, 6 * k]);
  ctx.beginPath();
  ctx.moveTo(line.x1, line.y1);
  ctx.lineTo(line.x2, line.y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `${11 * k}px ui-monospace, monospace`;
  for (const t of tracker.visible()) {
    const c = CLASS_COLOR[t.cls] ?? "#fff";
    ctx.strokeStyle = c;
    ctx.lineWidth = 2 * k;
    ctx.strokeRect(t.box.x, t.box.y, t.box.w, t.box.h);
    ctx.beginPath();
    t.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    const label = `${t.cls} #${t.id}${t.counted ? " ✓" : ""}`;
    const tw = ctx.measureText(label).width + 6 * k;
    ctx.fillStyle = c;
    ctx.fillRect(t.box.x, t.box.y - 14 * k, tw, 14 * k);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, t.box.x + 3 * k, t.box.y - 3.5 * k);
  }
}

export function TrafficDemo() {
  const [mode, setMode] = useState<"London cameras" | "My camera">("London cameras");
  const [vertical, setVertical] = useState(false);
  const [pos, setPos] = useState(55);
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const detector = useRef<ObjectDetector | null>(null);
  const tracker = useRef(new Tracker());
  const raf = useRef<number | null>(null);
  const vfcId = useRef<number | null>(null);
  const runId = useRef(0);
  const analysed = useRef(0);
  const boxes = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const objectUrl = useRef<string | null>(null);
  const counting = useRef(true);
  const flash = useRef(0);
  const lineRef = useRef({ vertical, pos });
  const lastUi = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [cams, setCams] = useState<Cam[] | null>(null);
  const [credit, setCredit] = useState("Powered by TfL Open Data");
  const [cam, setCam] = useState(FEATURED[0]);
  const [query, setQuery] = useState("");
  const [captured, setCaptured] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>(zero);
  const [inView, setInView] = useState(0);
  const [ms, setMs] = useState(0);
  const [frames, setFrames] = useState({ n: 0, boxes: 0 });
  const [progress, setProgress] = useState(0);
  const [london, setLondon] = useState<{ time: string; hour: number } | null>(null);

  // London's local time, so visitors know when the roads are busy (set on the client only)
  useEffect(() => {
    const tick = () => {
      const time = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
      setLondon({ time, hour: Number(time.slice(0, 2)) });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    lineRef.current = { vertical, pos };
  }, [vertical, pos]);

  useEffect(() => {
    let alive = true;
    fetch("/api/jamcams")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.credit) setCredit(d.credit);
        setCams(d.cameras ?? []);
      })
      .catch(() => alive && setCams([]));
    return () => {
      alive = false;
    };
  }, []);

  const stopAll = useCallback(() => {
    runId.current++; // stops a clip analysis in progress
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (vfcId.current !== null) video.current?.cancelVideoFrameCallback(vfcId.current);
    vfcId.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    const v = video.current;
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.srcObject = null;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }, []);
  useEffect(
    () => () => {
      stopAll();
      detector.current?.close();
    },
    [stopAll],
  );

  /** One frame: detect, track, count, draw. `ts` must increase from frame to frame (MediaPipe video mode). */
  const processFrame = (v: HTMLVideoElement, ts: number) => {
    analysed.current++;
    const t0 = clock();
    const res = detector.current!.detectForVideo(v, ts);
    const took = clock() - t0;
    const dets: Det[] = res.detections.map((d) => ({
      x: d.boundingBox!.originX,
      y: d.boundingBox!.originY,
      w: d.boundingBox!.width,
      h: d.boundingBox!.height,
      cls: d.categories[0].categoryName,
      score: d.categories[0].score,
    }));
    const w = v.videoWidth;
    const h = v.videoHeight;
    const { vertical: vert, pos: p } = lineRef.current;
    const line: Line = vert ? { x1: (w * p) / 100, y1: 0, x2: (w * p) / 100, y2: h } : { x1: 0, y1: (h * p) / 100, x2: w, y2: (h * p) / 100 };
    const crossed = tracker.current.update(dets, counting.current ? line : null);
    if (crossed.length) {
      flash.current = 6;
      setCounts((c) => {
        const n = { ...c };
        for (const x of crossed) {
          const k = x.dir === "+" ? "plus" : "minus";
          n[x.cls] = { ...n[x.cls], [k]: n[x.cls][k] + 1 };
        }
        return n;
      });
    }
    flash.current = Math.max(0, flash.current - 1);
    drawScene(overlay.current!, w, h, tracker.current, line, flash.current);
    boxes.current += dets.length;
    if (t0 - lastUi.current > 120) {
      lastUi.current = t0;
      setInView(tracker.current.visible().length);
      setMs(took);
      setFrames({ n: analysed.current, boxes: boxes.current });
    }
  };

  /** Live camera: every new frame (requestVideoFrameCallback where available, once per decoded frame). */
  const runLoop = (v: HTMLVideoElement) => {
    let lastTime = -1;
    const vfc = typeof v.requestVideoFrameCallback === "function";
    const loop = () => {
      if (v.readyState >= 2 && v.currentTime !== lastTime && !v.paused) {
        lastTime = v.currentTime;
        processFrame(v, clock());
      }
      if (vfc) vfcId.current = v.requestVideoFrameCallback(loop);
      else raf.current = requestAnimationFrame(loop);
    };
    loop();
  };

  /**
   * A clip: step through it frame by frame by seeking, at a fixed rate. Every device then analyses the same frames
   * (playback would skip frames on a slow phone and break the tracking), so the counts are reproducible.
   */
  const analyseClip = async (v: HTMLVideoElement) => {
    const run = ++runId.current;
    v.pause();
    for (let t = 0; t < v.duration; t += 1 / CLIP_FPS) {
      if (run !== runId.current) return; // a newer clip or camera took over
      await new Promise<void>((done) => {
        v.addEventListener("seeked", () => done(), { once: true });
        v.currentTime = t;
      });
      processFrame(v, Math.round(t * 1000) + run * 1e6);
      setProgress(Math.min(1, t / v.duration));
      await new Promise((r) => setTimeout(r, 0)); // let the page repaint between frames
    }
    if (run !== runId.current) return;
    setFrames({ n: analysed.current, boxes: boxes.current });
    setInView(tracker.current.visible().length);
    setProgress(1);
    counting.current = false;
    setStatus("done");
  };

  const ensureDetector = async () => {
    detector.current ??= await loadObjectDetector([...CLASSES], 0.25);
  };

  const reset = () => {
    tracker.current.reset();
    setCounts(zero());
    counting.current = true;
    analysed.current = 0;
    boxes.current = 0;
    setFrames({ n: 0, boxes: 0 });
  };

  /** Fetch the newest clip through this site's own route (same origin, so the pixels can be read), then play and count it once. */
  const playClip = async (c: { id: string; name: string }) => {
    stopAll();
    setCam(c);
    setError("");
    setStatus("loading");
    try {
      await ensureDetector();
      const res = await fetch(`/api/jamcams/${c.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const modified = res.headers.get("X-Clip-Modified");
      setCaptured(modified ? new Date(modified).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }) : null);
      objectUrl.current = URL.createObjectURL(await res.blob());
      const v = video.current!;
      v.srcObject = null;
      v.src = objectUrl.current;
      v.loop = false;
      v.onended = null;
      reset();
      await new Promise<void>((done) => (v.readyState >= 1 ? done() : v.addEventListener("loadedmetadata", () => done(), { once: true })));
      setStatus("playing");
      void analyseClip(v);
    } catch {
      setStatus("error");
      setError("Couldn't load this camera's clip. It may be offline; try another one.");
    }
  };

  const replay = () => {
    reset();
    setStatus("playing");
    void analyseClip(video.current!);
  };

  const startCamera = async () => {
    stopAll();
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("The camera needs a secure (https) page and a browser that supports it.");
      return;
    }
    try {
      setStatus("loading");
      await ensureDetector();
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: { ideal: "environment" } }, audio: false });
      const v = video.current!;
      v.removeAttribute("src");
      v.srcObject = stream.current;
      v.onended = null;
      reset();
      await v.play();
      setCaptured(null);
      setStatus("playing");
      runLoop(v);
    } catch (e) {
      stopAll();
      setStatus("error");
      setError(cameraError(e).replace(" Try a photo instead.", "").replace(", or use a photo", ""));
    }
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (cams ?? []).filter((c) => c.available && (!q || c.name.toLowerCase().includes(q))).slice(0, 60);
  }, [cams, query]);
  const total = CLASSES.reduce((a, c) => a + counts[c].plus + counts[c].minus, 0);
  const dirs = vertical ? ["→", "←"] : ["↓", "↑"];

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Segmented
          label=""
          value={mode}
          options={["London cameras", "My camera"]}
          onChange={(m) => {
            stopAll();
            setStatus("idle");
            setMode(m);
          }}
        />
      </div>

      {mode === "London cameras" && (
        <div className="space-y-2 rounded-2xl bg-white p-4">
          {london && (
            <p className="text-[12.5px] text-ink-2/70">
              It&apos;s <b className="text-ink">{london.time}</b> in London.{" "}
              {london.hour < 6 || london.hour >= 22 ? "Night: roads are quiet and dark, so expect few counts. Rush hours are about 07:00–10:00 and 16:00–19:00 London time." : london.hour < 7 ? "Early morning: traffic is just starting." : "Daytime: the busier junctions should be moving."}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {FEATURED.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => playClip(f)}
                className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${cam.id === f.id && status !== "idle" ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/75 hover:border-ink/30"}`}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 px-3 focus-within:border-ink/40">
              <Search className="h-4 w-4 text-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={cams ? `Search ${cams.filter((c) => c.available).length} live cameras…` : "Loading TfL's camera list…"} className="w-full bg-transparent py-2 text-[13.5px] outline-none" />
            </label>
            {query && (
              <select
                className="max-w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-[13px]"
                value=""
                onChange={(e) => {
                  const c = list.find((x) => x.id === e.target.value);
                  if (c) playClip(c);
                }}
              >
                <option value="">{list.length ? `${list.length} match${list.length > 1 ? "es" : ""}: pick one` : "No matches"}</option>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
            <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-contain" />
            <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
            {(status === "idle" || status === "loading" || status === "error") && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                <div>
                  <Camera className="mx-auto h-8 w-8 opacity-80" />
                  <p className="mt-3 text-[15px] font-semibold">{status === "loading" ? "Loading the detector and the latest clip…" : mode === "London cameras" ? "Pick a London camera above" : "Point your camera at a street"}</p>
                  <p className="mx-auto mt-1 max-w-[340px] text-[12.5px] text-white/65">
                    {mode === "London cameras" ? "Each camera's newest 10-second clip, from TfL's open data. Counting runs in your browser." : "On a phone the back camera is used. Nothing is uploaded or recorded."}
                  </p>
                  {status !== "loading" && (
                    <button type="button" onClick={() => (mode === "London cameras" ? playClip(cam) : startCamera())} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-medium text-ink">
                      <Play className="h-4 w-4" /> {mode === "London cameras" ? `Count ${cam.name}` : "Start camera"}
                    </button>
                  )}
                  {error && <p className="mt-3 text-[12.5px] text-[#ffb4a8]">{error}</p>}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            {mode === "London cameras" && status !== "idle" && (
              <>
                <span className="font-semibold">{cam.name}</span>
                {captured && <span className="text-ink-2/65">· clip captured {captured} London time</span>}
                <button type="button" onClick={replay} disabled={status !== "done"} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1 disabled:opacity-40">
                  <RotateCcw className="h-3.5 w-3.5" /> Count again
                </button>
                <button type="button" onClick={() => playClip(cam)} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1">
                  <RefreshCcw className="h-3.5 w-3.5" /> Newest clip
                </button>
              </>
            )}
            {mode === "My camera" && status === "playing" && (
              <>
                <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset counts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopAll();
                    setStatus("idle");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1"
                >
                  <CameraOff className="h-3.5 w-3.5" /> Stop
                </button>
              </>
            )}
            {status === "playing" && <span className="ml-auto font-mono text-muted">{ms.toFixed(0)} ms / frame</span>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">Crossed the line</p>
              <p className="text-[12px] text-ink-2/60">{inView} in view now</p>
            </div>
            <p className="mt-1 text-[2.4rem] leading-none font-semibold tracking-[-0.04em]">{total}</p>
            <table className="mt-3 w-full text-[13px]">
              <thead>
                <tr className="text-left font-mono text-[10.5px] text-muted uppercase">
                  <th className="py-1 font-medium">Type</th>
                  <th className="py-1 text-right font-medium">{dirs[0]}</th>
                  <th className="py-1 text-right font-medium">{dirs[1]}</th>
                </tr>
              </thead>
              <tbody>
                {CLASSES.map((c) => (
                  <tr key={c} className="border-t border-line">
                    <td className="py-1.5">
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: CLASS_COLOR[c] }} />
                      {ICON[c]} {c}
                    </td>
                    <td className="py-1.5 text-right font-mono">{counts[c].plus}</td>
                    <td className="py-1.5 text-right font-mono">{counts[c].minus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mode === "London cameras" && status === "playing" && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                <div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
            {frames.n > 0 && (
              <p className="mt-2 font-mono text-[11px] text-muted">
                {frames.n} frames analysed{mode === "London cameras" ? ` (${CLIP_FPS} per second of clip)` : ""} · {(frames.boxes / frames.n).toFixed(1)} objects per frame
              </p>
            )}
            {status === "done" && <p className="mt-1 text-[11.5px] text-ink-2/60">Clip finished: these are its counts. TfL publishes a new clip every few minutes.</p>}
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-4">
            <Segmented label="Counting line" value={vertical ? "Vertical" : "Horizontal"} options={["Horizontal", "Vertical"]} onChange={(v) => setVertical(v === "Vertical")} />
            <Slider label="Line position" value={pos} min={10} max={90} unit="%" onChange={setPos} />
            <p className="text-[11.5px] text-ink-2/60">Place the line across the lanes you want to count; each tracked object counts once, with its direction.</p>
          </div>
        </div>
      </div>
      {mode === "London cameras" && (
        <p className="px-1 text-[11.5px] text-ink-2/60">
          {credit}. Clips from Transport for London&apos;s JamCam cameras, relayed by this site so your browser may analyse them; this project is not affiliated with or endorsed by TfL.
        </p>
      )}
    </div>
  );
}
