"use client";

import { Camera, CameraOff, Eraser, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GestureRecognizer, GestureRecognizerResult } from "@mediapipe/tasks-vision";
import { cameraError, loadHandTracker } from "@/lib/mediapipe";
import { INDEX_TIP, OneEuro, PINCH, THUMB_TIP, cursorPoint, nextPinch, pinchRatio, toArea } from "@/lib/virtual-mouse";
import { pc } from "./controls";

const clock = () => performance.now();
const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6"];
const CLICK_MS = 450;
const CLICK_MOVE = 24;

/* ------------------------------------------------------------------ hand preview */

function drawHand(canvas: HTMLCanvasElement, w: number, h: number, res: GestureRecognizerResult | null, edges: { start: number; end: number }[], pinched: boolean) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  const lm = res?.landmarks?.[0];
  if (!lm) return;
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = Math.max(2, w / 220);
  ctx.beginPath();
  for (const { start, end } of edges) {
    ctx.moveTo(lm[start].x * w, lm[start].y * h);
    ctx.lineTo(lm[end].x * w, lm[end].y * h);
  }
  ctx.stroke();
  ctx.strokeStyle = pinched ? "#3ee0a1" : "#ffd166";
  ctx.lineWidth = Math.max(3, w / 160);
  ctx.beginPath();
  ctx.moveTo(lm[THUMB_TIP].x * w, lm[THUMB_TIP].y * h);
  ctx.lineTo(lm[INDEX_TIP].x * w, lm[INDEX_TIP].y * h);
  ctx.stroke();
  for (const i of [THUMB_TIP, INDEX_TIP]) {
    ctx.fillStyle = pinched ? "#3ee0a1" : "#ffd166";
    ctx.beginPath();
    ctx.arc(lm[i].x * w, lm[i].y * h, Math.max(5, w / 90), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Synthetic pointer / mouse events, so ordinary page widgets react to the hand cursor. */
function fire(el: Element, type: string, x: number, y: number, down: boolean) {
  const init = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 77, pointerType: "mouse", isPrimary: true, button: 0, buttons: down ? 1 : 0 };
  el.dispatchEvent(type === "click" ? new MouseEvent("click", init) : new PointerEvent(type, init));
}

/* ------------------------------------------------------------------ demo */

export function VirtualMouseDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const tracker = useRef<GestureRecognizer | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const fx = useRef(new OneEuro());
  const fy = useRef(new OneEuro());
  const pinched = useRef(false);
  const down = useRef<{ el: Element; x: number; y: number; t: number } | null>(null);
  const hover = useRef<Element | null>(null);
  const frames = useRef<number[]>([]);
  const lastUi = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [error, setError] = useState("");
  const [info, setInfo] = useState({ hand: false, ratio: 1, pinched: false, fps: 0 });

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    if (cursor.current) cursor.current.style.opacity = "0";
  }, []);
  useEffect(
    () => () => {
      stop();
      tracker.current?.close();
    },
    [stop],
  );

  /** Move the cursor and turn pinch changes into pointerdown / move / up and click, inside the playground only. */
  const drive = (x: number, y: number, isPinched: boolean, t: number) => {
    const box = area.current!.getBoundingClientRect();
    const cx = box.left + x;
    const cy = box.top + y;
    const c = cursor.current!;
    c.style.opacity = "1";
    c.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    c.dataset.pinched = String(isPinched);
    const under = document.elementFromPoint(cx, cy);
    const el = under && area.current!.contains(under) ? under : null;
    if (el !== hover.current) {
      if (hover.current) fire(hover.current, "pointerout", cx, cy, isPinched);
      if (el) fire(el, "pointerover", cx, cy, isPinched);
      hover.current = el;
    }
    const was = pinched.current;
    if (isPinched && !was && el) {
      down.current = { el, x: cx, y: cy, t };
      fire(el, "pointerdown", cx, cy, true);
    } else if (!isPinched && was && down.current) {
      const d = down.current;
      fire(d.el, "pointerup", cx, cy, false);
      if (el && t - d.t < CLICK_MS && Math.hypot(cx - d.x, cy - d.y) < CLICK_MOVE) fire(el, "click", cx, cy, false);
      down.current = null;
    } else {
      const target = down.current?.el ?? el;
      if (target) fire(target, "pointermove", cx, cy, isPinched);
    }
    pinched.current = isPinched;
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
      tracker.current ??= await loadHandTracker();
      const tr = tracker.current;
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play();
      const { GestureRecognizer: GR } = await import("@mediapipe/tasks-vision");
      setStatus("running");
      fx.current.reset();
      fy.current.reset();
      let lastTime = -1;
      const loop = () => {
        if (v.readyState >= 2 && v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          const t = clock();
          const res = tr.recognizeForVideo(v, t);
          const lm = res.landmarks?.[0];
          frames.current = [...frames.current.filter((x) => t - x < 1000), t];
          let ratio = 1;
          if (lm) {
            ratio = pinchRatio(lm);
            const isPinched = nextPinch(pinched.current, ratio);
            const box = area.current!.getBoundingClientRect();
            const p = toArea(cursorPoint(lm), box.width, box.height);
            drive(fx.current.filter(p.x, t), fy.current.filter(p.y, t), isPinched, t);
          } else {
            if (cursor.current) cursor.current.style.opacity = "0.25";
            if (pinched.current && down.current) {
              fire(down.current.el, "pointerup", 0, 0, false);
              down.current = null;
            }
            pinched.current = false;
          }
          drawHand(overlay.current!, v.videoWidth, v.videoHeight, res, GR.HAND_CONNECTIONS, pinched.current);
          if (t - lastUi.current > 100) {
            lastUi.current = t;
            setInfo({ hand: !!lm, ratio, pinched: pinched.current, fps: frames.current.length });
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
            <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            {status !== "running" && (
              <div className="absolute inset-0 grid place-items-center p-3 text-center text-white">
                <div>
                  <Camera className="mx-auto h-6 w-6 opacity-80" />
                  {status === "loading" ? (
                    <p className="mt-2 text-[12.5px]">Loading hand tracking…</p>
                  ) : (
                    <button type="button" onClick={start} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-medium text-ink">
                      <Play className="h-3.5 w-3.5" /> Start camera
                    </button>
                  )}
                  {error && <p className="mt-2 text-[11.5px] text-[#ffb4a8]">{error}</p>}
                </div>
              </div>
            )}
          </div>
          {status === "running" && (
            <div className="space-y-1.5 rounded-xl bg-white px-3 py-2.5 text-[12px]">
              <div className="flex justify-between">
                <span>{info.hand ? (info.pinched ? "🤏 Pinched: pressing" : "☝️ Hand found: moving") : "No hand in view"}</span>
                <span className="font-mono text-muted">{info.fps} fps</span>
              </div>
              <div className="relative h-2 rounded-full bg-ink/[0.06]">
                <div className="h-full rounded-full transition-[width] duration-100" style={{ width: pc(Math.min(1, info.ratio / 0.8) * 100), background: info.pinched ? "#1baf7a" : "#0b0b0b" }} />
                <span className="absolute -top-1 h-4 w-[2px] bg-[#1baf7a]" style={{ left: pc((PINCH.down / 0.8) * 100) }} title="pinch below" />
                <span className="absolute -top-1 h-4 w-[2px] bg-ink/40" style={{ left: pc((PINCH.up / 0.8) * 100) }} title="release above" />
              </div>
              <p className="text-[11px] text-ink-2/60">Finger gap ÷ palm length: pinch below the green tick, release above the grey one.</p>
              <button
                type="button"
                onClick={() => {
                  stop();
                  setStatus("idle");
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1 text-[11.5px]"
              >
                <CameraOff className="h-3.5 w-3.5" /> Stop
              </button>
            </div>
          )}
        </div>
        <div className="space-y-2 text-[13px] leading-relaxed text-ink-2/75">
          <p>
            <b className="text-ink">How to use it.</b> Hold one hand up, palm towards the camera, about an arm&apos;s length away. The cursor sits between your thumb and index fingertip.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>Move:</b> move your hand; the middle of the camera view covers the whole playground.
            </li>
            <li>
              <b>Click:</b> pinch thumb and index together and let go quickly.
            </li>
            <li>
              <b>Drag:</b> pinch, move, then release; it works on the slider, the sticker and the drawing pad.
            </li>
          </ul>
          <p className="text-[12px] text-ink-2/60">Browsers don&apos;t let a web page move your computer&apos;s real mouse, so the hand cursor works inside the playground below. Your mouse works there too.</p>
        </div>
      </div>

      <div ref={area} className="relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-4 select-none">
        <Playground />
        <div
          ref={cursor}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 z-20 -mt-4 -ml-4 h-8 w-8 rounded-full border-[3px] border-ink bg-ink/10 opacity-0 transition-[width,height,margin,background] duration-100 data-[pinched=true]:-mt-3 data-[pinched=true]:-ml-3 data-[pinched=true]:h-6 data-[pinched=true]:w-6 data-[pinched=true]:border-[#1baf7a] data-[pinched=true]:bg-[#1baf7a]/40"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ playground: ordinary widgets, driven by pointer events */

function Playground() {
  const [color, setColor] = useState(COLORS[0]);
  const [clicks, setClicks] = useState(0);
  const [size, setSize] = useState(0.5);
  const [sticker, setSticker] = useState({ x: 40, y: 40 });
  const [bubbles, setBubbles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [run, setRun] = useState<{ start: number; done?: number } | null>(null);
  const [now, setNow] = useState(0);
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const sliding = useRef(false);
  const pad = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!run || run.done) return;
    const id = setInterval(() => setNow(clock()), 100);
    return () => clearInterval(id);
  }, [run]);

  const local = (e: React.PointerEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  };
  const startBubbles = () => {
    const r = board.current!.getBoundingClientRect();
    setBubbles(Array.from({ length: 8 }, (_, i) => ({ id: i, x: 30 + Math.random() * (r.width - 60), y: 30 + Math.random() * (r.height - 60) })));
    const t = clock();
    setRun({ start: t });
    setNow(t);
  };
  const pop = (id: number) => {
    setBubbles((bs) => {
      const left = bs.filter((b) => b.id !== id);
      if (!left.length) setRun((r) => (r ? { ...r, done: clock() } : r));
      return left;
    });
  };
  const line = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const c = pad.current!;
    const ctx = c.getContext("2d")!;
    const k = c.width / c.getBoundingClientRect().width;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 * k;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(from.x * k, from.y * k);
    ctx.lineTo(to.x * k, to.y * k);
    ctx.stroke();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-medium">Colour</span>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setColor(c);
              setClicks((n) => n + 1);
            }}
            className={`h-9 w-9 rounded-full border-[3px] transition ${color === c ? "border-ink" : "border-white hover:border-ink/30"}`}
            style={{ background: c }}
            aria-label={`Colour ${c}`}
          />
        ))}
        <span className="ml-1 font-mono text-[12px] text-muted">{clicks} clicks</span>
        <div className="ml-auto flex min-w-[220px] flex-1 items-center gap-2 sm:flex-none">
          <span className="text-[12.5px] font-medium">Size</span>
          <div
            className="relative h-9 flex-1 cursor-pointer"
            onPointerDown={(e) => {
              sliding.current = true;
              const p = local(e, e.currentTarget);
              setSize(Math.max(0, Math.min(1, p.x / p.w)));
            }}
            onPointerMove={(e) => {
              if (!sliding.current || !e.buttons) return;
              const p = local(e, e.currentTarget);
              setSize(Math.max(0, Math.min(1, p.x / p.w)));
            }}
            onPointerUp={() => (sliding.current = false)}
            onPointerLeave={() => (sliding.current = false)}
          >
            <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-ink/10" />
            <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ width: pc(size * 100), background: color }} />
            <div className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow" style={{ left: pc(size * 100), background: color }} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.6fr_1fr]">
        <div
          ref={board}
          className="relative h-[300px] overflow-hidden rounded-xl bg-cream/60"
          onPointerMove={(e) => {
            if (!drag.current || !e.buttons) return;
            const p = local(e, e.currentTarget);
            setSticker({ x: Math.max(0, Math.min(p.w - 60, p.x - drag.current.dx)), y: Math.max(0, Math.min(p.h - 60, p.y - drag.current.dy)) });
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <p className="absolute top-2 left-3 text-[11.5px] text-ink-2/55">Drag the sticker · pop the bubbles</p>
          <div
            className="absolute grid h-[60px] w-[60px] cursor-grab place-items-center rounded-2xl text-[1.8rem] shadow-md active:cursor-grabbing"
            style={{ left: sticker.x, top: sticker.y, background: color, transform: `scale(${(0.7 + size * 0.6).toFixed(2)})` }}
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              drag.current = { dx: (e.clientX - r.left) / (0.7 + size * 0.6), dy: (e.clientY - r.top) / (0.7 + size * 0.6) };
            }}
          >
            ✋
          </div>
          {bubbles.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => pop(b.id)}
              className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white text-[1.1rem] shadow"
              style={{ left: b.x, top: b.y, background: `${color}cc` }}
              aria-label="Bubble"
            >
              ●
            </button>
          ))}
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {run && <span className="rounded-full bg-white px-3 py-1 font-mono text-[12px]">{run.done ? `✓ ${((run.done - run.start) / 1000).toFixed(1)} s` : `${bubbles.length} left · ${((now - run.start) / 1000).toFixed(1)} s`}</span>}
            <button type="button" onClick={startBubbles} className="rounded-full bg-ink px-4 py-1.5 text-[12.5px] font-medium text-white">
              {run ? "Again" : "Pop 8 bubbles"}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <canvas
            ref={pad}
            width={600}
            height={480}
            className="block aspect-[5/4] w-full cursor-crosshair rounded-xl border border-ink/10 bg-white"
            onPointerDown={(e) => {
              drawing.current = local(e, e.currentTarget);
              line(drawing.current, drawing.current);
            }}
            onPointerMove={(e) => {
              if (!drawing.current || !e.buttons) return;
              const p = local(e, e.currentTarget);
              line(drawing.current, p);
              drawing.current = p;
            }}
            onPointerUp={() => (drawing.current = null)}
            onPointerLeave={() => (drawing.current = null)}
          />
          <button
            type="button"
            onClick={() => {
              const c = pad.current!;
              c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1 text-[12px]"
          >
            <Eraser className="h-3.5 w-3.5" /> Clear drawing
          </button>
        </div>
      </div>
    </div>
  );
}
