"use client";

import { motion } from "framer-motion";
import { Camera, CameraOff, ImageUp, Loader2, ScanSearch, SwitchCamera } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Detection, ObjectDetector } from "@mediapipe/tasks-vision";
import { cameraError, visionFileset, withGpuFallback } from "@/lib/mediapipe";
import { Slider } from "./controls";

/** The 80 COCO objects the model knows, grouped for the filter. */
export const OBJECT_GROUPS: Record<string, string[]> = {
  People: ["person"],
  Vehicles: ["bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat"],
  Electronics: ["tv", "laptop", "mouse", "remote", "keyboard", "cell phone"],
  "Food & kitchen": ["bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake"],
  Home: ["chair", "couch", "potted plant", "bed", "dining table", "toilet", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"],
  Animals: ["bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe"],
  "Bags & sport": ["backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket"],
  "Street": ["traffic light", "fire hydrant", "stop sign", "parking meter", "bench"],
};
const GROUP_OF: Record<string, string> = Object.fromEntries(Object.entries(OBJECT_GROUPS).flatMap(([g, list]) => list.map((o) => [o, g])));
const GROUP_COLOR: Record<string, string> = {
  People: "#eb6834",
  Vehicles: "#2a78d6",
  Electronics: "#6250d6",
  "Food & kitchen": "#1baf7a",
  Home: "#eda100",
  Animals: "#e87ba4",
  "Bags & sport": "#008300",
  Street: "#e34948",
};
const FILTERS = ["All", ...Object.keys(OBJECT_GROUPS)];
const clock = () => performance.now();

type Status = "idle" | "loading" | "running" | "error";
type Found = { name: string; score: number; box: { x: number; y: number; w: number; h: number } };

async function loadDetector(): Promise<ObjectDetector> {
  const [{ ObjectDetector }, vision] = await Promise.all([import("@mediapipe/tasks-vision"), visionFileset()]);
  return withGpuFallback((delegate) =>
    ObjectDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/mediapipe/efficientdet_lite0.tflite", delegate },
      runningMode: "VIDEO",
      scoreThreshold: 0.2, // the slider filters above this, so it can move without reloading the model
      maxResults: 25,
    }),
  );
}

function toFound(dets: Detection[]): Found[] {
  return dets
    .map((d) => {
      const c = d.categories?.[0];
      const b = d.boundingBox;
      return c && b ? { name: c.categoryName, score: c.score, box: { x: b.originX, y: b.originY, w: b.width, h: b.height } } : null;
    })
    .filter((f): f is Found => !!f && f.name !== "???");
}

/** Draw boxes and labels. When the video is shown mirrored, boxes are mirrored by coordinates so the text stays readable. */
function drawBoxes(canvas: HTMLCanvasElement, w: number, h: number, found: Found[], mirror: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.clearRect(0, 0, w, h);
  const s = Math.max(w, h) / 640;
  ctx.font = `600 ${Math.round(13 * s)}px var(--font-geist-sans), system-ui, sans-serif`;
  for (const f of found) {
    const color = GROUP_COLOR[GROUP_OF[f.name]] ?? "#0b0b0b";
    const x = mirror ? w - f.box.x - f.box.w : f.box.x;
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = color;
    ctx.strokeRect(x, f.box.y, f.box.w, f.box.h);
    const label = `${f.name} ${Math.round(f.score * 100)}%`;
    const tw = ctx.measureText(label).width + 10 * s;
    const th = 20 * s;
    const ty = f.box.y > th ? f.box.y - th : f.box.y;
    ctx.fillStyle = color;
    ctx.fillRect(x - 1.5 * s, ty, tw, th);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x + 4 * s, ty + th - 6 * s);
  }
}

export function ObjectDetectionDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const detector = useRef<ObjectDetector | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const lastFound = useRef<Found[]>([]);
  const frames = useRef<number[]>([]);
  const lastUi = useRef(0);
  const settings = useRef({ threshold: 0.5, filter: "All" });

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [source, setSource] = useState<"camera" | "photo" | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [threshold, setThreshold] = useState(50);
  const [filter, setFilter] = useState("All");
  const [found, setFound] = useState<Found[]>([]);
  const [perf, setPerf] = useState<{ fps: number; ms: number } | null>(null);

  const visible = useCallback((list: Found[]) => list.filter((f) => f.score >= settings.current.threshold && (settings.current.filter === "All" || GROUP_OF[f.name] === settings.current.filter)), []);

  const stopCamera = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  useEffect(
    () => () => {
      stopCamera();
      detector.current?.close();
    },
    [stopCamera],
  );

  // re-draw a still photo when the slider or filter changes (the camera loop redraws on its own)
  const redrawPhoto = useCallback(() => {
    const img = photo.current;
    if (source !== "photo" || !img || !overlay.current) return;
    const vis = visible(lastFound.current);
    drawBoxes(overlay.current, img.naturalWidth, img.naturalHeight, vis, false);
    setFound(vis);
  }, [source, visible]);

  useEffect(() => {
    settings.current = { threshold: threshold / 100, filter };
    redrawPhoto();
  }, [threshold, filter, redrawPhoto]);

  const ensureModel = async () => {
    if (detector.current) return detector.current;
    setStatus("loading");
    detector.current = await loadDetector();
    return detector.current;
  };

  const startCamera = async (face: "user" | "environment" = facing) => {
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("The camera needs a secure (https) page and a browser that supports it.");
      return;
    }
    try {
      stopCamera();
      const det = await ensureModel();
      setStatus("loading");
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: face }, audio: false });
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play();
      setFacing(face);
      setSource("camera");
      setStatus("running");
      const mirror = face === "user";
      let lastTime = -1;
      const loop = () => {
        if (v.readyState >= 2 && v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          const t0 = clock();
          const res = det.detectForVideo(v, t0);
          const ms = clock() - t0;
          lastFound.current = toFound(res.detections);
          const vis = visible(lastFound.current);
          drawBoxes(overlay.current!, v.videoWidth, v.videoHeight, vis, mirror);
          const now = clock();
          frames.current = [...frames.current.filter((t) => now - t < 1000), now];
          if (now - lastUi.current > 150) {
            lastUi.current = now;
            setFound(vis);
            setPerf({ fps: frames.current.length, ms });
          }
        }
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      stopCamera();
      setStatus("error");
      setError(cameraError(e));
    }
  };

  const loadPhoto = async (f: File) => {
    stopCamera();
    setError("");
    try {
      const det = await ensureModel();
      const img = photo.current!;
      const url = URL.createObjectURL(f);
      img.src = url;
      await img.decode();
      const t0 = clock();
      const res = det.detectForVideo(img, t0);
      const ms = clock() - t0;
      URL.revokeObjectURL(url);
      lastFound.current = toFound(res.detections);
      setSource("photo");
      setStatus("running");
      setPerf({ fps: 0, ms });
      const vis = visible(lastFound.current);
      drawBoxes(overlay.current!, img.naturalWidth, img.naturalHeight, vis, false);
      setFound(vis);
    } catch {
      setStatus("error");
      setError("Couldn't read that photo or load the model in this browser.");
    }
  };

  // count per object, strongest first
  const counts = Object.entries(
    found.reduce<Record<string, { n: number; best: number }>>((acc, f) => {
      acc[f.name] = { n: (acc[f.name]?.n ?? 0) + 1, best: Math.max(acc[f.name]?.best ?? 0, f.score) };
      return acc;
    }, {}),
  ).sort((a, b) => b[1].n - a[1].n || b[1].best - a[1].best);
  const people = found.filter((f) => f.name === "person").length;
  const cam = source === "camera";
  const fit = cam ? "object-cover" : "object-contain";

  return (
    <div className="grid gap-4 rounded-2xl bg-white p-4 sm:p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      {/* camera / photo (left) */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-ink">
          <video ref={video} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${cam ? "" : "hidden"}`} style={{ transform: cam && facing === "user" ? "scaleX(-1)" : undefined }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={photo} alt="Your photo" className={`absolute inset-0 h-full w-full bg-black object-contain ${source === "photo" ? "" : "hidden"}`} />
          <canvas ref={overlay} className={`absolute inset-0 h-full w-full ${fit}`} />
          {status !== "running" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
              {status === "loading" ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin" />
                  <p className="text-[13px] text-white/80">Loading the detector (7 MB, once)…</p>
                </>
              ) : (
                <>
                  <ScanSearch className="h-9 w-9 text-white/70" />
                  <p className="max-w-xs text-[14px] text-white/85">{status === "error" ? error : "Turn on your camera and point it at your desk, a cup, your phone or yourself."}</p>
                </>
              )}
            </div>
          )}
          {status === "running" && perf && (
            <div className="absolute top-2.5 left-2.5 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[10.5px] text-white">
              {cam ? `${perf.fps} fps · ` : ""}
              {perf.ms.toFixed(0)} ms per frame
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cam && status === "running" ? (
            <>
              <button
                onClick={() => {
                  stopCamera();
                  setSource(null);
                  setFound([]);
                  setPerf(null);
                  setStatus("idle");
                }}
                className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] text-white"
              >
                <CameraOff className="h-3.5 w-3.5" /> Stop camera
              </button>
              <button onClick={() => startCamera(facing === "user" ? "environment" : "user")} className="flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5 text-[12.5px] hover:border-ink/40">
                <SwitchCamera className="h-3.5 w-3.5" /> {facing === "user" ? "Back camera" : "Front camera"}
              </button>
            </>
          ) : (
            <button onClick={() => startCamera()} disabled={status === "loading"} className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] text-white disabled:opacity-50">
              <Camera className="h-3.5 w-3.5" /> Start camera
            </button>
          )}
          <button onClick={() => file.current?.click()} disabled={status === "loading"} className="flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5 text-[12.5px] hover:border-ink/40 disabled:opacity-50">
            <ImageUp className="h-3.5 w-3.5" /> Use a photo
          </button>
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadPhoto(e.target.files[0])} />
        </div>
        <p className="text-[11px] text-muted">Video and photos are processed on your device; nothing is uploaded or recorded.</p>
      </div>

      {/* controls + what it sees (right) */}
      <div className="flex flex-col gap-4 lg:border-l lg:border-line lg:pl-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-cream/70 px-4 py-3">
            <p className="text-[1.9rem] leading-none font-semibold tracking-[-0.04em]">{found.length}</p>
            <p className="mt-1 text-[11.5px] text-ink-2/70">objects in view</p>
          </div>
          <div className="rounded-xl bg-cream/70 px-4 py-3">
            <p className="text-[1.9rem] leading-none font-semibold tracking-[-0.04em]">{people}</p>
            <p className="mt-1 text-[11.5px] text-ink-2/70">{people === 1 ? "person" : "people"}</p>
          </div>
        </div>
        <Slider label="Show boxes above (% sure)" value={threshold} min={20} max={90} step={5} unit="%" onChange={setThreshold} />
        <div>
          <p className="text-[13.5px] font-medium">Only show</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {FILTERS.map((g) => (
              <button
                key={g}
                onClick={() => setFilter(g)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors ${filter === g ? "border-ink bg-ink text-white" : "border-ink/10 hover:border-ink/40"}`}
              >
                {g !== "All" && <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOR[g] }} />}
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-[120px] flex-1">
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">In this frame</p>
          {counts.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-muted">{status === "running" ? "Nothing above the threshold. Lower it, or show it something from the list below." : "Start the camera or pick a photo."}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {counts.slice(0, 8).map(([name, c]) => (
                <motion.li key={name} layout className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLOR[GROUP_OF[name]] ?? "#0b0b0b" }} />
                    {name}
                    {c.n > 1 && <span className="font-mono text-[11px] text-muted">×{c.n}</span>}
                  </span>
                  <span className="font-mono text-[11.5px] text-ink-2/70">{Math.round(c.best * 100)}%</span>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
