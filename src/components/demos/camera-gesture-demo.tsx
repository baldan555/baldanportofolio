"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, CameraOff, Hand, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GestureRecognizer, GestureRecognizerResult } from "@mediapipe/tasks-vision";
import { cameraError, visionFileset, withGpuFallback } from "@/lib/mediapipe";

/** MediaPipe's canned gestures, in plain words. */
export const GESTURE_INFO: Record<string, { emoji: string; label: string }> = {
  Closed_Fist: { emoji: "✊", label: "Closed fist" },
  Open_Palm: { emoji: "✋", label: "Open palm" },
  Victory: { emoji: "✌️", label: "Victory" },
  Thumb_Up: { emoji: "👍", label: "Thumb up" },
  Thumb_Down: { emoji: "👎", label: "Thumb down" },
  Pointing_Up: { emoji: "☝️", label: "Pointing up" },
  ILoveYou: { emoji: "🤟", label: "I love you" },
  None: { emoji: "🖐️", label: "Hand, no gesture" },
};
const RPS: Record<string, "rock" | "paper" | "scissors"> = { Closed_Fist: "rock", Open_Palm: "paper", Victory: "scissors" };
const RPS_EMOJI = { rock: "✊", paper: "✋", scissors: "✌️" };
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" } as const;
const SAMPLES = ["rock", "paper", "scissors"] as const;
const TIPS = new Set([4, 8, 12, 16, 20]);
/** Timestamps for MediaPipe and frame timing; only ever called from event handlers and the camera loop. */
const clock = () => performance.now();

type Status = "idle" | "loading" | "running" | "error";
type Seen = { name: string; score: number; hand: string | null; fps: number; ms: number } | null;
type Round = { you: keyof typeof RPS_EMOJI | null; cpu: keyof typeof RPS_EMOJI; result: "win" | "lose" | "draw" | "none" };

/** Lazily load MediaPipe's gesture recognizer (self-hosted, GPU first, CPU fallback). */
async function loadRecognizer(): Promise<GestureRecognizer> {
  const [{ GestureRecognizer }, vision] = await Promise.all([import("@mediapipe/tasks-vision"), visionFileset()]);
  return withGpuFallback((delegate) =>
    GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/mediapipe/gesture_recognizer.task", delegate },
      runningMode: "VIDEO",
      numHands: 1,
    }),
  );
}

function drawHand(canvas: HTMLCanvasElement, w: number, h: number, res: GestureRecognizerResult | null, connections: { start: number; end: number }[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.clearRect(0, 0, w, h);
  const lm = res?.landmarks?.[0];
  if (!lm) return;
  const s = Math.max(w, h) / 640;
  ctx.lineCap = "round";
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? "#ffffff" : "rgba(11,11,11,0.55)";
    ctx.lineWidth = (pass ? 3 : 6) * s;
    ctx.beginPath();
    for (const c of connections) {
      ctx.moveTo(lm[c.start].x * w, lm[c.start].y * h);
      ctx.lineTo(lm[c.end].x * w, lm[c.end].y * h);
    }
    ctx.stroke();
  }
  lm.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, (TIPS.has(i) ? 7 : 4.5) * s, 0, Math.PI * 2);
    ctx.fillStyle = TIPS.has(i) ? "#eb6834" : "#2a78d6";
    ctx.fill();
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  });
}

/** Most frequent gesture over the last frames, so a single noisy frame doesn't flip the answer. */
function stable(history: string[]) {
  const counts = new Map<string, number>();
  for (const g of history) counts.set(g, (counts.get(g) ?? 0) + 1);
  let best = "";
  let n = 0;
  for (const [g, c] of counts) if (c > n) [best, n] = [g, c];
  return n >= Math.ceil(history.length * 0.6) ? best : "";
}

export function CameraGestureDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const still = useRef<HTMLImageElement>(null);
  const recognizer = useRef<GestureRecognizer | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const history = useRef<string[]>([]);
  const lastUi = useRef(0);
  const frames = useRef<number[]>([]);
  const stableRef = useRef("");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [source, setSource] = useState<"camera" | (typeof SAMPLES)[number] | null>(null);
  const [seen, setSeen] = useState<Seen>(null);
  const [locked, setLocked] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [score, setScore] = useState({ you: 0, cpu: 0, draw: 0 });

  const stopLoop = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  };
  const stopCamera = useCallback(() => {
    stopLoop();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  useEffect(
    () => () => {
      stopCamera();
      recognizer.current?.close();
    },
    [stopCamera],
  );

  const ensureModel = async () => {
    if (recognizer.current) return recognizer.current;
    setStatus("loading");
    recognizer.current = await loadRecognizer();
    return recognizer.current;
  };

  const handle = (res: GestureRecognizerResult, ms: number) => {
    const g = res.gestures?.[0]?.[0];
    const name = g?.categoryName ?? (res.landmarks?.length ? "None" : "");
    history.current = [...history.current.slice(-9), name];
    const now = clock();
    frames.current = [...frames.current.filter((t) => now - t < 1000), now];
    stableRef.current = stable(history.current);
    if (now - lastUi.current > 80) {
      lastUi.current = now;
      // MediaPipe assumes a mirrored selfie image; our frames are not mirrored, so swap the hand label
      const raw = res.handedness?.[0]?.[0]?.categoryName ?? null;
      const hand = raw === "Left" ? "Right" : raw === "Right" ? "Left" : null;
      setSeen(name ? { name, score: g?.score ?? 0, hand, fps: frames.current.length, ms } : null);
      setLocked(stableRef.current);
    }
  };

  const startCamera = async () => {
    setError("");
    setRound(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("The camera needs a secure (https) page and a browser that supports it.");
      return;
    }
    try {
      const rec = await ensureModel();
      setStatus("loading");
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play();
      setSource("camera");
      setStatus("running");
      history.current = [];
      let lastTime = -1;
      const { GestureRecognizer: GR } = await import("@mediapipe/tasks-vision");
      const loop = () => {
        if (v.readyState >= 2 && v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          const t0 = clock();
          const res = rec.recognizeForVideo(v, t0);
          const ms = clock() - t0;
          drawHand(overlay.current!, v.videoWidth, v.videoHeight, res, GR.HAND_CONNECTIONS);
          handle(res, ms);
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

  const trySample = async (name: (typeof SAMPLES)[number]) => {
    stopCamera();
    setError("");
    setRound(null);
    try {
      const rec = await ensureModel();
      const img = still.current!;
      img.src = `/mediapipe/samples/${name}.png`;
      await img.decode();
      const { GestureRecognizer: GR } = await import("@mediapipe/tasks-vision");
      history.current = [];
      let res: GestureRecognizerResult | null = null;
      let ms = 0;
      // video mode wants increasing timestamps; a few frames let the tracker settle on a still image
      for (let i = 0; i < 4; i++) {
        const t0 = clock();
        res = rec.recognizeForVideo(img, t0 + i);
        ms = clock() - t0;
        handle(res, ms);
      }
      lastUi.current = 0;
      handle(res!, ms);
      drawHand(overlay.current!, img.naturalWidth, img.naturalHeight, res, GR.HAND_CONNECTIONS);
      setSource(name);
      setStatus("running");
    } catch {
      setStatus("error");
      setError("Couldn't load the hand model in this browser.");
    }
  };

  const play = () => {
    if (count !== null) return;
    setRound(null);
    let n = 3;
    setCount(n);
    const tick = setInterval(() => {
      n -= 1;
      if (n > 0) return setCount(n);
      clearInterval(tick);
      setCount(null);
      const you = RPS[stableRef.current] ?? null;
      const pick = new Uint32Array(1);
      crypto.getRandomValues(pick);
      const cpu = (["rock", "paper", "scissors"] as const)[pick[0] % 3];
      const result: Round["result"] = !you ? "none" : you === cpu ? "draw" : BEATS[you] === cpu ? "win" : "lose";
      setRound({ you, cpu, result });
      if (result !== "none") setScore((s) => ({ you: s.you + (result === "win" ? 1 : 0), cpu: s.cpu + (result === "lose" ? 1 : 0), draw: s.draw + (result === "draw" ? 1 : 0) }));
    }, 700);
  };

  const info = locked ? GESTURE_INFO[locked] : null;
  const sampleNote =
    source && source !== "camera" && seen
      ? seen.name === "None"
        ? "The tracker finds the hand and its 21 points, but MediaPipe's gesture model learned from real hands facing a camera. These rendered, side-on hands read as 'no gesture': domain shift again. Your camera will do better."
        : "A rendered hand from the dataset, read by the same model your camera uses."
      : null;
  const live = seen?.name ? GESTURE_INFO[seen.name] : null;
  const cam = source === "camera";

  return (
    <div className="grid gap-4 rounded-2xl bg-white p-4 sm:p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {/* camera / image (left) */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-ink">
          <div className="absolute inset-0" style={{ transform: cam ? "scaleX(-1)" : undefined }}>
            <video ref={video} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${cam ? "" : "hidden"}`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={still} alt="Sample hand" className={`absolute inset-0 h-full w-full bg-white object-contain ${source && !cam ? "" : "hidden"}`} />
            <canvas ref={overlay} className={`absolute inset-0 h-full w-full ${cam ? "object-cover" : "object-contain"}`} style={{ objectFit: cam ? "cover" : "contain" }} />
          </div>
          {status !== "running" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
              {status === "loading" ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin" />
                  <p className="text-[13px] text-white/80">Loading the hand model (8 MB, once)…</p>
                </>
              ) : (
                <>
                  <Hand className="h-9 w-9 text-white/70" />
                  <p className="max-w-xs text-[14px] text-white/85">{status === "error" ? error : "Turn on your camera and make a fist, an open palm or a victory sign."}</p>
                </>
              )}
            </div>
          )}
          <AnimatePresence>
            {count !== null && (
              <motion.div key={count} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center text-[7rem] font-semibold text-white [text-shadow:0_4px_24px_rgba(0,0,0,.5)]">
                {count}
              </motion.div>
            )}
          </AnimatePresence>
          {status === "running" && seen && (
            <div className="absolute top-2.5 left-2.5 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[10.5px] text-white">
              {cam ? `${seen.fps} fps · ` : ""}
              {seen.ms.toFixed(0)} ms per frame
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cam && status === "running" ? (
            <button
              onClick={() => {
                stopCamera();
                setSource(null);
                setSeen(null);
                setLocked("");
                setStatus("idle");
              }}
              className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] text-white"
            >
              <CameraOff className="h-3.5 w-3.5" /> Stop camera
            </button>
          ) : (
            <button onClick={startCamera} disabled={status === "loading"} className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] text-white disabled:opacity-50">
              <Camera className="h-3.5 w-3.5" /> Start camera
            </button>
          )}
          <span className="text-[11.5px] text-muted">or try a sample:</span>
          {SAMPLES.map((s) => (
            <button key={s} onClick={() => trySample(s)} disabled={status === "loading"} className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${source === s ? "border-ink bg-ink text-white" : "border-ink/10 hover:border-ink/40"}`}>
              {RPS_EMOJI[s]} {s}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted">The video is processed on your device and never uploaded or recorded. Sample hands: Laurence Moroney, CC BY 2.0.</p>
      </div>

      {/* gesture + game (right) */}
      <div className="flex flex-col gap-4 lg:border-l lg:border-line lg:pl-5">
        <div>
          <p className="font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">Gesture</p>
          {/* keyed, no exit animation: the label always matches the latest answer */}
          <motion.div key={locked || "none"} initial={{ opacity: 0.4, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }} className="mt-1 flex items-center gap-3">
              <span className="text-[3.6rem] leading-none">{info?.emoji ?? "·"}</span>
              <div>
                <p className="text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">{info?.label ?? (status === "running" ? "Show me your hand" : "Waiting")}</p>
                {seen && live && (
                  <p className="text-[12px] text-ink-2/70">
                    this frame: {live.label} · {(seen.score * 100).toFixed(0)}%{seen.hand ? ` · ${seen.hand.toLowerCase()} hand` : ""}
                  </p>
                )}
              </div>
          </motion.div>
          {sampleNote && <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-[11.5px] leading-snug">{sampleNote}</p>}
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 lg:grid-cols-4">
          {Object.entries(GESTURE_INFO)
            .filter(([k]) => k !== "None")
            .map(([k, v]) => (
              <div key={k} className={`rounded-xl px-1 py-2 text-center transition-colors ${locked === k ? "bg-ink text-white" : "bg-cream/60"}`}>
                <p className="text-[1.3rem] leading-none">{v.emoji}</p>
                <p className="mt-1 text-[9.5px] leading-tight">{v.label}</p>
              </div>
            ))}
        </div>

        <div className="mt-auto rounded-xl bg-cream p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-semibold">Rock, paper, scissors</p>
            <p className="font-mono text-[11.5px]">
              you {score.you} · cpu {score.cpu} · draw {score.draw}
            </p>
          </div>
          <p className="mt-1 text-[11.5px] text-ink-2/70">Hold ✊, ✋ or ✌️ at the camera and press play. Your move is read on &ldquo;shoot&rdquo;.</p>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={play} disabled={status !== "running" || count !== null} className="rounded-full bg-[#eb6834] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-40">
              {count !== null ? "…" : "Play"}
            </button>
            {round && (
                <motion.p key={`${round.you}-${round.cpu}-${score.you + score.cpu + score.draw}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[13px]">
                  {round.result === "none" ? (
                    "Didn't catch a rock, paper or scissors. Try again."
                  ) : (
                    <>
                      You {RPS_EMOJI[round.you!]} vs {RPS_EMOJI[round.cpu]} computer: <b>{round.result === "win" ? "you win" : round.result === "lose" ? "computer wins" : "draw"}</b>
                    </>
                  )}
                </motion.p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
