"use client";

import { motion } from "framer-motion";
import { ImageUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import model from "@/data/models/hand-gestures.json";
import { createGestureNet, decodeRgb, type GestureCnn, type Tensor } from "@/lib/cnn";
import { pc, Segmented, Slider } from "./controls";

export type GestureSample = (typeof model.samples)[number];
const net = createGestureNet(model.model as GestureCnn);
const N = model.input; // 64
export const GESTURES = ["Rock", "Paper", "Scissors"];
export const GESTURE_EMOJI = ["✊", "✋", "✌️"];

/** Rotate (degrees, white fill), mirror, change brightness and optionally swap the white background for stripes. */
function transform(src: Float64Array, deg: number, flip: boolean, bright: number, busy: boolean): Float64Array {
  let img = src;
  if (busy) {
    // background = near-white pixels connected to the border (same rule as training)
    const bg = new Uint8Array(N * N);
    const stack: number[] = [];
    const white = (p: number) => Math.min(img[p * 3], img[p * 3 + 1], img[p * 3 + 2]) > 0.88;
    const mark = (p: number) => {
      if (!bg[p] && white(p)) {
        bg[p] = 1;
        stack.push(p);
      }
    };
    for (let i = 0; i < N; i++) for (const p of [i, (N - 1) * N + i, i * N, i * N + N - 1]) mark(p);
    while (stack.length) {
      const p = stack.pop()!;
      const y = Math.floor(p / N);
      const x = p % N;
      for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const yy = y + dy;
        const xx = x + dx;
        if (yy < 0 || yy >= N || xx < 0 || xx >= N) continue;
        mark(yy * N + xx);
      }
    }
    const out = Float64Array.from(img);
    for (let p = 0; p < N * N; p++)
      if (bg[p]) {
        const y = Math.floor(p / N);
        const x = p % N;
        const s = 0.5 + 0.5 * Math.sin((x + y) * 0.55);
        out[p * 3] = 0.25 + 0.5 * s;
        out[p * 3 + 1] = 0.45 + 0.3 * Math.cos(x * 0.3);
        out[p * 3 + 2] = 0.3 + 0.45 * (1 - s);
      }
    img = out;
  }
  if (deg !== 0 || flip) {
    const out = new Float64Array(N * N * 3).fill(1);
    const a = (-deg * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const m = (N - 1) / 2;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const xs0 = flip ? N - 1 - x : x;
        const sx = c * (xs0 - m) - s * (y - m) + m;
        const sy = s * (xs0 - m) + c * (y - m) + m;
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        if (x0 < 0 || y0 < 0 || x0 + 1 >= N || y0 + 1 >= N) continue;
        const fx = sx - x0;
        const fy = sy - y0;
        for (let ch = 0; ch < 3; ch++) {
          const v = (yy: number, xx: number) => img[(yy * N + xx) * 3 + ch];
          out[(y * N + x) * 3 + ch] = v(y0, x0) * (1 - fx) * (1 - fy) + v(y0, x0 + 1) * fx * (1 - fy) + v(y0 + 1, x0) * (1 - fx) * fy + v(y0 + 1, x0 + 1) * fx * fy;
        }
      }
    img = out;
  }
  if (bright !== 1) img = img.map((v) => Math.min(1, Math.max(0, v * bright)));
  return img;
}

/** Draw the network's input, with an optional heatmap of the class activation map on top. */
function paintView(canvas: HTMLCanvasElement | null, pixels: Float64Array, cam: { data: Float64Array; h: number; w: number } | null) {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  canvas.width = N;
  canvas.height = N;
  const img = ctx.createImageData(N, N);
  let max = 1e-9;
  if (cam) for (const v of cam.data) max = Math.max(max, v);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const p = y * N + x;
      let r = pixels[p * 3] * 255;
      let g = pixels[p * 3 + 1] * 255;
      let b = pixels[p * 3 + 2] * 255;
      if (cam) {
        // bilinear upsample of the coarse map to the image grid
        const fy = ((y + 0.5) / N) * cam.h - 0.5;
        const fx = ((x + 0.5) / N) * cam.w - 0.5;
        const y0 = Math.max(0, Math.min(cam.h - 1, Math.floor(fy)));
        const x0 = Math.max(0, Math.min(cam.w - 1, Math.floor(fx)));
        const y1 = Math.min(cam.h - 1, y0 + 1);
        const x1 = Math.min(cam.w - 1, x0 + 1);
        const ty = Math.max(0, Math.min(1, fy - y0));
        const tx = Math.max(0, Math.min(1, fx - x0));
        const at = (yy: number, xx: number) => cam.data[yy * cam.w + xx];
        const v = Math.max(0, at(y0, x0) * (1 - tx) * (1 - ty) + at(y0, x1) * tx * (1 - ty) + at(y1, x0) * (1 - tx) * ty + at(y1, x1) * tx * ty) / max;
        const a = 0.65 * v;
        r = r * (1 - a) + 235 * a;
        g = g * (1 - a) + 104 * a;
        b = b * (1 - a) + 52 * a;
      }
      img.data[p * 4] = r;
      img.data[p * 4 + 1] = g;
      img.data[p * 4 + 2] = b;
      img.data[p * 4 + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
}

function Maps({ t, count, cols }: { t: Tensor; count: number; cols: number }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  useEffect(() => {
    for (let c = 0; c < count; c++) {
      const cv = refs.current[c];
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx) continue;
      cv.width = t.w;
      cv.height = t.h;
      let max = 1e-9;
      for (let i = 0; i < t.h * t.w; i++) max = Math.max(max, t.data[i * t.c + c]);
      const im = ctx.createImageData(t.w, t.h);
      for (let i = 0; i < t.h * t.w; i++) {
        const v = Math.round((t.data[i * t.c + c] / max) * 255);
        im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
        im.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    }
  }, [t, count]);
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }, (_, c) => (
        <canvas key={c} ref={(el) => void (refs.current[c] = el)} className="aspect-square w-full rounded-[3px] bg-black [image-rendering:pixelated]" />
      ))}
    </div>
  );
}

function Thumb({ s, active, onClick }: { s: GestureSample; active: boolean; onClick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => paintView(ref.current, decodeRgb(s.img), null), [s]);
  const ring = s.kind === "mistake" ? "bg-[#eb6834]" : s.kind === "background" ? "bg-[#2a78d6]" : "bg-ink";
  return (
    <button onClick={onClick} className={`relative rounded-lg p-0.5 transition ${active ? "ring-2 ring-ink" : "ring-1 ring-ink/10 hover:ring-ink/40"}`} title={`${GESTURES[s.label]}${s.kind === "background" ? " · new background" : ""}`}>
      <canvas ref={ref} width={N} height={N} className="block h-12 w-12 rounded-md" />
      <span className={`absolute -right-1 -bottom-1 rounded-full px-1 text-[11px] leading-[16px] ${ring}`}>{GESTURE_EMOJI[s.label]}</span>
    </button>
  );
}

export function GestureDemo() {
  const view = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [sample, setSample] = useState<GestureSample | null>(model.samples[0]);
  const [base, setBase] = useState<Float64Array>(() => decodeRgb(model.samples[0].img));
  const [deg, setDeg] = useState(0);
  const [flip, setFlip] = useState<"Off" | "On">("Off");
  const [bright, setBright] = useState(100);
  const [busy, setBusy] = useState<"Off" | "On">("Off");
  const [heat, setHeat] = useState<"On" | "Off">("On");

  const input = useMemo(() => transform(base, deg, flip === "On", bright / 100, busy === "On"), [base, deg, flip, bright, busy]);
  const out = useMemo(() => net(input, N), [input]);
  const best = out.probs.indexOf(Math.max(...out.probs));
  const untouched = deg === 0 && flip === "Off" && bright === 100 && busy === "Off";

  useEffect(() => paintView(view.current, input, heat === "On" ? out.cam(best) : null), [input, out, best, heat]);

  const reset = () => {
    setDeg(0);
    setFlip("Off");
    setBright(100);
    setBusy("Off");
  };

  const upload = (f: File) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = N;
      c.height = N;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, N, N);
      const d = ctx.getImageData(0, 0, N, N).data;
      const px = new Float64Array(N * N * 3);
      for (let i = 0; i < N * N; i++) for (let ch = 0; ch < 3; ch++) px[i * 3 + ch] = d[i * 4 + ch] / 255;
      URL.revokeObjectURL(url);
      setSample(null);
      reset();
      setBase(px);
    };
    img.src = url;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-2xl bg-white p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_220px] lg:grid-cols-[minmax(0,1.1fr)_240px_200px]">
        {/* inputs (left) */}
        <div className="order-1 flex flex-col gap-4 md:col-span-2 lg:col-span-1">
          <div>
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">Pick a test image</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {model.samples.map((s) => (
                <Thumb
                  key={s.id}
                  s={s}
                  active={sample?.id === s.id}
                  onClick={() => {
                    setSample(s);
                    reset();
                    setBase(decodeRgb(s.img));
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button onClick={() => file.current?.click()} className="flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1 text-[12px] hover:border-ink/40">
                <ImageUp className="h-3.5 w-3.5" /> Use your own photo
              </button>
              <span className="text-[11px] text-muted">stays in your browser · blue = new-background test</span>
              <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
          </div>
          <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
            <Slider label="Rotate (°)" value={deg} min={-45} max={45} step={5} onChange={setDeg} />
            <Slider label="Brightness (%)" value={bright} min={40} max={140} step={5} onChange={setBright} />
            <Segmented<"Off" | "On"> label="Mirror" value={flip} options={["Off", "On"]} onChange={setFlip} />
            <Segmented<"Off" | "On"> label="Busy background" value={busy} options={["Off", "On"]} onChange={setBusy} />
          </div>
        </div>

        {/* what it sees (middle) */}
        <div className="order-2 flex flex-col items-center gap-2">
          <p className="self-start font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">What it sees · 64×64</p>
          <canvas ref={view} width={N} height={N} className="aspect-square w-full max-w-[220px] rounded-xl" />
          <div className="self-stretch">
            <Segmented<"On" | "Off"> label="Show where it looks" value={heat} options={["On", "Off"]} onChange={setHeat} />
          </div>
        </div>

        {/* the network says (right) */}
        <div className="order-3 flex flex-col gap-3 md:col-span-2 lg:col-span-1 lg:border-l lg:border-line lg:pl-5">
          <p className="font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">The network says</p>
          <motion.p key={best} initial={{ opacity: 0.3, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-[2.3rem] leading-none font-semibold tracking-[-0.04em]">
            <span className="text-[2.6rem]">{GESTURE_EMOJI[best]}</span> {GESTURES[best]}
          </motion.p>
          <p className="text-[13px] text-ink-2/75">{(out.probs[best] * 100).toFixed(1)}% sure</p>
          <div className="space-y-1.5">
            {GESTURES.map((g, k) => (
              <div key={g} className="grid grid-cols-[62px_1fr_46px] items-center gap-2 text-[12px]">
                <span>{g}</span>
                <div className="h-2 overflow-hidden rounded-full bg-ink/8">
                  <motion.div className="h-full rounded-full" style={{ background: k === best ? "#eb6834" : "#2a78d6" }} initial={false} animate={{ width: pc(out.probs[k] * 100) }} transition={{ type: "spring", stiffness: 220, damping: 26 }} />
                </div>
                <span className="text-right font-mono text-ink-2/70">{(out.probs[k] * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <p className="mt-auto rounded-xl bg-cream px-3 py-2 text-[11.5px] leading-snug">
            {sample ? (
              <>
                Test image, really <b>{GESTURES[sample.label].toLowerCase()}</b>
                {sample.kind === "background" ? " with a new background" : ""}.{" "}
                {untouched ? (best === sample.label ? "Read correctly." : `Read as ${GESTURES[best].toLowerCase()}.`) : "Changed by you: see if the answer holds."}
              </>
            ) : (
              "Your photo. The network was trained on rendered hands, so real photos with busy backgrounds can fool it."
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.6fr]">
        <div className="rounded-2xl bg-white p-4 sm:p-5">
          <p className="text-[13px] font-semibold">First layer: 16 maps, 64×64</p>
          <p className="mt-0.5 mb-2.5 text-[11.5px] text-ink-2/70">Edges and skin against background.</p>
          <Maps t={out.conv1} count={16} cols={8} />
        </div>
        <div className="rounded-2xl bg-white p-4 sm:p-5">
          <p className="text-[13px] font-semibold">Last layer: 64 maps, 8×8</p>
          <p className="mt-0.5 mb-2.5 text-[11.5px] text-ink-2/70">Each one fires on a part: fingers spread, a closed fist, two fingers up. The heatmap is these maps weighted by how much each votes for the answer.</p>
          <Maps t={out.conv4} count={64} cols={16} />
        </div>
      </div>
    </div>
  );
}
