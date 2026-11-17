"use client";

import { motion } from "framer-motion";
import { Eraser } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import model from "@/data/models/handwritten-digits.json";
import { createDigitNet, decodeImage, type DigitCnn, type Tensor } from "@/lib/cnn";
import { pc } from "./controls";
import { NeuronView } from "./neuron-view";

export type DigitSample = (typeof model.samples)[number];
const net = createDigitNet(model.model as DigitCnn);
const SIZE = 280; // drawing resolution; shown smaller on screen

/** Paint a single-channel h×w array into a canvas, white ink on black. */
export function paintGray(canvas: HTMLCanvasElement | null, data: ArrayLike<number>, h: number, w: number, max = 1, stride = 1, offset = 0) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = w;
  canvas.height = h;
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < h * w; i++) {
    const v = Math.max(0, Math.min(255, Math.round((data[i * stride + offset] / max) * 255)));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** MNIST-style preprocessing: crop the ink, scale its longer side to 20 px, centre by centre of mass in 28×28. */
function preprocess(src: HTMLCanvasElement): Float64Array | null {
  const ctx = src.getContext("2d")!;
  const { data } = ctx.getImageData(0, 0, src.width, src.height);
  let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1;
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++)
      if (data[(y * src.width + x) * 4] > 20) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return null;
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const s = 20 / Math.max(bw, bh);
  const tw = Math.max(1, Math.round(bw * s));
  const th = Math.max(1, Math.round(bh * s));
  const tmp = document.createElement("canvas");
  tmp.width = tw;
  tmp.height = th;
  const tctx = tmp.getContext("2d")!;
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(src, x0, y0, bw, bh, 0, 0, tw, th);
  const small = tctx.getImageData(0, 0, tw, th).data;
  let mx = 0, my = 0, mass = 0;
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++) {
      const v = small[(y * tw + x) * 4];
      mass += v;
      mx += x * v;
      my += y * v;
    }
  const ox = Math.round(14 - (mass ? mx / mass : tw / 2));
  const oy = Math.round(14 - (mass ? my / mass : th / 2));
  const out = new Float64Array(784);
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++) {
      const X = x + ox;
      const Y = y + oy;
      if (X >= 0 && X < 28 && Y >= 0 && Y < 28) out[Y * 28 + X] = small[(y * tw + x) * 4] / 255;
    }
  return out;
}

function FeatureMaps({ t, count, cols }: { t: Tensor; count: number; cols: number }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  useEffect(() => {
    for (let c = 0; c < count; c++) {
      let max = 1e-9;
      for (let i = 0; i < t.h * t.w; i++) max = Math.max(max, t.data[i * t.c + c]);
      paintGray(refs.current[c], t.data, t.h, t.w, max, t.c, c);
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

export function DigitsDemo() {
  const board = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<[number, number] | null>(null);
  const frame = useRef<number | null>(null);
  const [input, setInput] = useState<Float64Array | null>(() => decodeImage(model.samples[3].img));
  const [sample, setSample] = useState<DigitSample | null>(model.samples[3]);

  const out = useMemo(() => (input ? net(input) : null), [input]);
  const best = out ? out.probs.indexOf(Math.max(...out.probs)) : null;
  const ranked = out ? out.probs.map((p, d) => [p, d] as const).sort((a, b) => b[0] - a[0]) : [];

  const clearBoard = useCallback(() => {
    const ctx = board.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, SIZE, SIZE);
  }, []);

  // paint a chosen test image onto the board; clearing is left to the handlers, so a fresh stroke is never wiped
  useEffect(() => {
    if (!sample || !board.current) return;
    clearBoard();
    const tmp = document.createElement("canvas");
    paintGray(tmp, decodeImage(sample.img), 28, 28);
    const ctx = board.current.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, SIZE, SIZE);
  }, [sample, clearBoard]);

  const update = useCallback(() => {
    if (board.current) setInput(preprocess(board.current));
  }, []);
  // re-run the network while drawing, at most once per animation frame
  const scheduleUpdate = () => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      update();
    });
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * SIZE, ((e.clientY - r.top) / r.height) * SIZE];
  };
  const stroke = (to: [number, number]) => {
    const ctx = board.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const from = last.current ?? to;
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
    last.current = to;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-2xl bg-white p-4 sm:p-5 md:grid-cols-[200px_1fr] lg:grid-cols-[200px_1fr_180px]">
        {/* draw (left) */}
        <div className="order-1 flex flex-col items-center gap-2.5">
          <p className="self-start font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">Draw 0–9</p>
          <canvas
            ref={board}
            width={SIZE}
            height={SIZE}
            data-cursor="Draw"
            className="aspect-square w-full max-w-[200px] cursor-crosshair touch-none rounded-xl bg-black"
            onPointerDown={(e) => {
              if (sample) {
                setSample(null);
                clearBoard();
              }
              drawing.current = true;
              last.current = null;
              e.currentTarget.setPointerCapture(e.pointerId);
              stroke(pos(e));
              scheduleUpdate();
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              stroke(pos(e));
              scheduleUpdate();
            }}
            onPointerUp={() => {
              drawing.current = false;
              last.current = null;
              update();
            }}
          />
          <button
            onClick={() => {
              setSample(null);
              clearBoard();
              setInput(null);
            }}
            className="flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1 text-[12px] hover:border-ink/40"
          >
            <Eraser className="h-3.5 w-3.5" /> Clear
          </button>
        </div>

        {/* the network, live (middle) */}
        <div className="order-3 md:col-span-2 lg:order-2 lg:col-span-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">Inside the network, live</p>
            <p className="hidden text-[11px] text-ink-2/60 sm:block">brighter = more active · wires = strongest contributions</p>
          </div>
          <NeuronView run={out} net={net} pixels={input} />
        </div>

        {/* the network says (right) */}
        <div className="order-2 flex flex-col gap-3 lg:order-3 lg:border-l lg:border-line lg:pl-5">
          <p className="font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">The network says</p>
          <div className="flex items-end gap-3">
            <motion.span key={best ?? "none"} initial={{ opacity: 0.3, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[4.5rem] leading-[0.85] font-semibold tracking-[-0.05em]">
              {best ?? "–"}
            </motion.span>
            <span className="pb-1 text-[13px] text-ink-2/75">{out && best !== null ? `${(out.probs[best] * 100).toFixed(1)}% sure` : "draw something"}</span>
          </div>
          <div className="space-y-1.5">
            {ranked.slice(0, 3).map(([p, d], i) => (
              <div key={d} className="grid grid-cols-[12px_1fr_44px] items-center gap-2 text-[12px]">
                <span className="font-mono">{d}</span>
                <div className="h-2 overflow-hidden rounded-full bg-ink/8">
                  <motion.div className="h-full rounded-full" style={{ background: i === 0 ? "#eb6834" : "#2a78d6" }} initial={false} animate={{ width: pc(p * 100) }} transition={{ type: "spring", stiffness: 220, damping: 26 }} />
                </div>
                <span className="text-right font-mono text-ink-2/70">{(p * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          {sample && (
            <p className="mt-auto rounded-xl bg-cream px-3 py-2 text-[11.5px] leading-snug">
              Test image {sample.id}, labelled <b>{sample.label}</b>.{" "}
              {sample.kind === "mistake" ? `A real mistake: the network reads a ${sample.pred}.` : best === sample.label ? "Read correctly." : `Read as ${best}.`}
            </p>
          )}
        </div>
      </div>

      {out && (
        <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl bg-white p-4 sm:p-5">
            <p className="text-[13px] font-semibold">Filters 1: 16 maps, 26×26</p>
            <p className="mt-0.5 mb-2.5 text-[11.5px] text-ink-2/70">Edges, corners and stroke ends.</p>
            <FeatureMaps t={out.conv1} count={16} cols={8} />
          </div>
          <div className="rounded-2xl bg-white p-4 sm:p-5">
            <p className="text-[13px] font-semibold">Filters 2: 32 maps, 11×11</p>
            <p className="mt-0.5 mb-2.5 text-[11.5px] text-ink-2/70">Loops, crossings, the bar of a 7, the tail of a 9.</p>
            <FeatureMaps t={out.conv2} count={32} cols={16} />
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 sm:p-5">
        <p className="font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">Or pick a real test image</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {model.samples.map((s) => (
            <SampleThumb
              key={s.id}
              s={s}
              active={sample?.id === s.id}
              onClick={() => {
                setSample(s);
                setInput(decodeImage(s.img));
              }}
            />
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-muted">One random test image per digit, then the six mistakes the network was most sure about (orange).</p>
      </div>
    </div>
  );
}

function SampleThumb({ s, active, onClick }: { s: DigitSample; active: boolean; onClick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => paintGray(ref.current, decodeImage(s.img), 28, 28), [s]);
  return (
    <button onClick={onClick} className={`relative rounded-lg p-0.5 transition ${active ? "ring-2 ring-ink" : "ring-1 ring-ink/10 hover:ring-ink/40"}`} title={`Labelled ${s.label}`}>
      <canvas ref={ref} width={28} height={28} className="block h-11 w-11 rounded-md [image-rendering:pixelated]" />
      <span className={`absolute -right-1 -bottom-1 rounded-full px-1.5 font-mono text-[10px] text-white ${s.kind === "mistake" ? "bg-[#eb6834]" : "bg-ink"}`}>{s.label}</span>
    </button>
  );
}
