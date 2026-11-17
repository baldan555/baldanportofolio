"use client";

import { motion } from "framer-motion";
import { Camera, CameraOff, Delete, Play, Space, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GestureRecognizer, GestureRecognizerResult } from "@mediapipe/tasks-vision";
import model from "@/data/models/sign-language.json";
import { cameraError, loadHandTracker } from "@/lib/mediapipe";
import { normalise, signLogits, softmax, steady, type SignModel } from "@/lib/sign";
import { Segmented, pc } from "./controls";

export const LETTERS = model.letters;
const NET = model.model as SignModel;
const clock = () => performance.now();
const HISTORY = 12; // frames in the majority vote
const LOCK_SHARE = 0.75; // share of recent frames that must agree
const TYPE_MS = 900; // hold a steady letter this long to type it
const WORDS = ["HI", "ASL", "LOVE", "DATA", "CODE", "JAKARTA"];
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];

type Read = { probs: number[]; top: number; locked: number | null; hand: boolean; fps: number; hold: number };
const EMPTY: Read = { probs: LETTERS.map(() => 0), top: -1, locked: null, hand: false, fps: 0, hold: 0 };

function drawHand(canvas: HTMLCanvasElement, w: number, h: number, res: GestureRecognizerResult | null) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  const lm = res?.landmarks?.[0];
  if (!lm) return;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(2, w / 200);
  ctx.beginPath();
  for (const [a, b] of BONES) {
    ctx.moveTo(lm[a].x * w, lm[a].y * h);
    ctx.lineTo(lm[b].x * w, lm[b].y * h);
  }
  ctx.stroke();
  ctx.fillStyle = "#3ee0a1";
  for (const p of lm) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, Math.max(3, w / 150), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The average hand shape for a letter in the training data, as a small skeleton (wrist at the bottom). */
export function HandSketch({ k, size = 64, color = "#0b0b0b" }: { k: number; size?: number; color?: string }) {
  // the data's x is squeezed by a widescreen camera: stretch it back so a knuckle span is ~0.8 of the palm, as on a real hand
  const stretch = 0.8 / model.knuckle_ratio;
  const pts = (model.mean_hand[k] as number[][]).map(([x, y]) => [x * stretch, y]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = 80 / Math.max(x1 - x0, y1 - y0, 1e-6);
  const P = pts.map(([x, y]) => [10 + (x - x0) * s + (80 - (x1 - x0) * s) / 2, 10 + (y - y0) * s + (80 - (y1 - y0) * s) / 2]);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="block">
      {BONES.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke={color} strokeWidth={3} strokeLinecap="round" />
      ))}
      {[4, 8, 12, 16, 20].map((i) => (
        <circle key={i} cx={P[i][0]} cy={P[i][1]} r={4} fill="#eb6834" />
      ))}
    </svg>
  );
}

export function SignDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const tracker = useRef<GestureRecognizer | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const history = useRef<number[]>([]);
  const frames = useRef<number[]>([]);
  const lastUi = useRef(0);
  const held = useRef<{ k: number; since: number; typed: boolean } | null>(null);
  const onType = useRef<(letter: string) => void>(() => {});
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [error, setError] = useState("");
  const [read, setRead] = useState<Read>(EMPTY);
  const [mode, setMode] = useState<"Spell freely" | "Practise words">("Spell freely");
  const [text, setText] = useState("");
  const [word, setWord] = useState(0);
  const [pos, setPos] = useState(0);

  // typing goes through a ref so the camera loop always calls the current mode's handler
  useEffect(() => {
    onType.current = (letter: string) => {
      if (mode === "Spell freely") setText((t) => (t + letter).slice(-40));
      else {
        const target = WORDS[word];
        if (letter === target[pos]) {
          if (pos + 1 >= target.length) {
            setPos(0);
            setWord((w) => (w + 1) % WORDS.length);
          } else setPos(pos + 1);
        }
      }
    };
  }, [mode, word, pos]);

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
      tracker.current?.close();
    },
    [stop],
  );

  const start = async () => {
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("The camera needs a secure (https) page and a browser that supports it.");
      return;
    }
    try {
      setStatus("loading");
      tracker.current ??= await loadHandTracker();
      const tr = tracker.current;
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play();
      setStatus("running");
      let lastTime = -1;
      const loop = () => {
        if (v.readyState >= 2 && v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          const t = clock();
          const res = tr.recognizeForVideo(v, t);
          const lm = res.landmarks?.[0];
          frames.current = [...frames.current.filter((x) => t - x < 1000), t];
          drawHand(overlay.current!, v.videoWidth, v.videoHeight, res);
          let probs = EMPTY.probs;
          let top = -1;
          let locked: number | null = null;
          let hold = 0;
          if (lm) {
            // landmarks are divided by the frame's width: rescale x to the widescreen units of the training data
            probs = softmax(signLogits(NET, normalise(lm, v.videoWidth / v.videoHeight / model.data_aspect)));
            top = probs.indexOf(Math.max(...probs));
            history.current = [...history.current.slice(-(HISTORY - 1)), top];
            const st = steady(history.current);
            if (history.current.length >= HISTORY && st.share >= LOCK_SHARE) locked = st.k;
            if (locked !== null) {
              if (!held.current || held.current.k !== locked) held.current = { k: locked, since: t, typed: false };
              hold = Math.min(1, (t - held.current.since) / TYPE_MS);
              if (!held.current.typed && hold >= 1) {
                held.current.typed = true;
                onType.current(LETTERS[locked]);
              }
            } else held.current = null;
          } else {
            history.current = [];
            held.current = null;
          }
          if (t - lastUi.current > 80) {
            lastUi.current = t;
            setRead({ probs, top, locked, hand: !!lm, fps: frames.current.length, hold: held.current?.typed ? 1 : hold });
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

  const top3 = read.top >= 0 ? read.probs.map((p, k) => ({ k, p })).sort((a, b) => b.p - a.p).slice(0, 3) : [];
  const target = WORDS[word];

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Segmented label="" value={mode} options={["Spell freely", "Practise words"]} onChange={setMode} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
            <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            {status !== "running" && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                <div>
                  <Camera className="mx-auto h-8 w-8 opacity-80" />
                  <p className="mt-3 text-[15px] font-semibold">{status === "loading" ? "Loading hand tracking…" : "Turn on your camera"}</p>
                  <p className="mx-auto mt-1 max-w-[320px] text-[12.5px] text-white/65">Video stays on this device. Hold one hand up, palm towards the camera, and make a letter.</p>
                  {status !== "loading" && (
                    <button type="button" onClick={start} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-medium text-ink">
                      <Play className="h-4 w-4" /> Start camera
                    </button>
                  )}
                  {error && <p className="mt-3 text-[12.5px] text-[#ffb4a8]">{error}</p>}
                </div>
              </div>
            )}
            {status === "running" && !read.hand && <p className="absolute inset-x-0 top-3 text-center text-[13px] text-white">Show one hand to the camera</p>}
          </div>
          {status === "running" && (
            <div className="flex items-center gap-2 text-[12px]">
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
              <span className="ml-auto font-mono text-muted">{read.fps} fps</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl bg-white p-5">
            <div className="grid h-24 w-24 place-items-center rounded-2xl bg-cream">
              <motion.span key={read.locked ?? -1} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[3.6rem] leading-none font-semibold">
                {read.locked !== null ? LETTERS[read.locked] : "–"}
              </motion.span>
            </div>
            <div>
              <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">{read.locked !== null ? "Holding steady" : read.hand ? "Reading…" : "Waiting for a hand"}</p>
              <div className="mt-2 space-y-1.5">
                {top3.map(({ k, p }) => (
                  <div key={k} className="flex items-center gap-2 text-[12.5px]">
                    <span className="w-4 font-semibold">{LETTERS[k]}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                      <div className="h-full rounded-full bg-ink" style={{ width: pc(p * 100) }} />
                    </div>
                    <span className="w-10 text-right font-mono text-ink-2/70">{(p * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/[0.06]">
                <div className="h-full rounded-full bg-[#1baf7a] transition-[width] duration-75" style={{ width: pc(read.hold * 100) }} />
              </div>
              <p className="mt-1 text-[11px] text-ink-2/55">Hold a letter for {TYPE_MS / 1000} s to type it</p>
            </div>
          </div>

          {mode === "Spell freely" ? (
            <div className="rounded-2xl bg-white p-5">
              <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">You spelled</p>
              <p className="mt-2 min-h-[2.4em] font-mono text-[1.7rem] leading-tight tracking-[0.08em] break-all">
                {text || <span className="text-ink/25">HELLO</span>}
                <span className="ml-0.5 inline-block h-[1em] w-[3px] animate-pulse bg-ink align-middle" />
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                <button type="button" onClick={() => setText((t) => (t + " ").slice(-40))} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5">
                  <Space className="h-3.5 w-3.5" /> Space
                </button>
                <button type="button" onClick={() => setText((t) => t.slice(0, -1))} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5">
                  <Delete className="h-3.5 w-3.5" /> Delete
                </button>
                <button type="button" onClick={() => setText("")} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-5">
              <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">
                Spell this word · {word + 1} / {WORDS.length}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {target.split("").map((ch, i) => (
                  <div key={i} className={`grid h-14 w-12 place-items-center rounded-xl border-2 text-[1.6rem] font-semibold ${i < pos ? "border-[#1baf7a] bg-[#1baf7a]/10 text-[#138a60]" : i === pos ? "border-ink" : "border-ink/10 text-ink/30"}`}>
                    {ch}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <HandSketch k={LETTERS.indexOf(target[pos])} size={72} />
                <p className="text-[12.5px] text-ink-2/70">
                  Next: <b>{target[pos]}</b>. The sketch is the average hand shape for this letter in the training data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPos(0);
                  setWord((w) => (w + 1) % WORDS.length);
                }}
                className="mt-3 rounded-full border border-ink/10 px-3 py-1.5 text-[12px]"
              >
                Skip word
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
