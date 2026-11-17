"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { createDigitNet, dequant, type DigitCnn, type DigitRun, type Tensor } from "@/lib/cnn";
import { InsideSection, Picker, Scrolly, type Step } from "./scrolly";

const UP = "#eb6834";
const BLUE = "#2a78d6";
const tr = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };
const r2 = (v: number) => Math.round(v * 100) / 100;

/** One channel of a feature map (or the input) as a little picture: dark = strong. Drawn on the client only. */
function FeatureMap({ t, ch = 0, px, upto, className = "" }: { t: Tensor; ch?: number; px: number; upto?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = t.w;
    c.height = t.h;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(t.w, t.h);
    let max = 1e-9;
    for (let i = 0; i < t.w * t.h; i++) max = Math.max(max, t.data[i * t.c + ch]);
    const limit = upto ?? t.w * t.h;
    for (let i = 0; i < t.w * t.h; i++) {
      const v = i < limit ? 1 - t.data[i * t.c + ch] / max : 1;
      img.data[i * 4] = Math.round(243 * v + 11 * (1 - v));
      img.data[i * 4 + 1] = Math.round(237 * v + 11 * (1 - v));
      img.data[i * 4 + 2] = Math.round(225 * v + 11 * (1 - v));
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [t, ch, upto]);
  return <canvas ref={ref} className={`rounded-[3px] [image-rendering:pixelated] ${className}`} style={{ width: px, height: px }} />;
}

function Panel({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 10 }}
      transition={tr}
      className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4 pb-10 sm:px-8 ${on ? "" : "pointer-events-none"}`}
    >
      {children}
    </motion.div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <p className="mb-2 self-start font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{children}</p>;

export function Visual({
  step,
  run,
  input,
  filters,
  classes,
  label,
  history,
}: {
  step: number;
  run: DigitRun;
  input: Tensor;
  filters: Float64Array;
  classes: string[];
  label?: string;
  history: { accuracy: number[]; val_accuracy: number[] };
}) {
  const c1 = run.conv1.c;
  // the filter that reacts most to this picture
  const best = useMemo(() => {
    let k = 0;
    let top = -1;
    for (let c = 0; c < c1; c++) {
      let s = 0;
      for (let i = 0; i < run.conv1.w * run.conv1.h; i++) s += run.conv1.data[i * c1 + c];
      if (s > top) [top, k] = [s, c];
    }
    return k;
  }, [run, c1]);
  const kernel = Array.from({ length: 9 }, (_, i) => filters[i * c1 + best]);
  const kmax = Math.max(...kernel.map(Math.abs), 1e-9);

  // step 2: slide the filter row by row
  const [row, setRow] = useState(0);
  useEffect(() => {
    if (step !== 1) return;
    let r = 0;
    const id = setInterval(() => {
      r = (r + 1) % (run.conv1.h + 6);
      setRow(Math.min(r, run.conv1.h));
    }, 90);
    return () => clearInterval(id);
  }, [step, run.conv1.h]);
  const cell = 7; // px per input pixel in step 2
  const order = run.probs.map((_, i) => i).sort((a, b) => run.probs[b] - run.probs[a]);
  const maps2 = Math.min(run.conv2.c, 32);
  const hid = run.hidden;
  const hmax = Math.max(...hid, 1e-9);
  const epochs = history.val_accuracy.length;
  const accLo = Math.min(...history.accuracy, ...history.val_accuracy);

  // a 6×6 patch around the ink for step 1
  const patch = useMemo(() => {
    let bx = 11;
    let by = 11;
    let s = -1;
    for (let y = 3; y < 22; y++)
      for (let x = 3; x < 22; x++) {
        let t = 0;
        for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) t += input.data[(y + i) * 28 + x + j];
        if (t > s) [s, bx, by] = [t, x, y];
      }
    return { x: bx, y: by };
  }, [input]);

  return (
    <div className="relative min-h-0 flex-1">
      {/* 1: an image is numbers */}
      <Panel on={step === 0}>
        <div className="flex items-center gap-5">
          <div className="relative">
            <FeatureMap t={input} px={168} />
            <div className="absolute border-2 border-[#eb6834]" style={{ left: patch.x * 6, top: patch.y * 6, width: 36, height: 36 }} />
          </div>
          <div className="grid grid-cols-6 gap-px rounded-md bg-ink/10 p-px">
            {Array.from({ length: 36 }, (_, i) => {
              const v = input.data[(patch.y + Math.floor(i / 6)) * 28 + patch.x + (i % 6)];
              return (
                <span key={i} className="grid h-7 w-7 place-items-center font-mono text-[9.5px]" style={{ background: `rgba(11,11,11,${r2(v)})`, color: v > 0.5 ? "#fff" : "#0b0b0b" }}>
                  {Math.round(v * 255)}
                </span>
              );
            })}
          </div>
        </div>
        <p className="mt-3 text-[12px] text-ink-2/60">28 × 28 = 784 numbers, 0 (paper) to 255 (ink). That is all the network gets.</p>
      </Panel>

      {/* 2: one filter slides */}
      <Panel on={step === 1}>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="relative">
            <FeatureMap t={input} px={28 * cell} />
            <div className="absolute border-2 border-[#eb6834] transition-[top] duration-75" style={{ left: 0, top: Math.min(row, 25) * cell, width: 28 * cell, height: 3 * cell }} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="grid grid-cols-3 gap-0.5">
              {kernel.map((w, i) => (
                <span
                  key={i}
                  className="grid h-9 w-9 place-items-center rounded font-mono text-[9.5px] text-white"
                  style={{ background: w >= 0 ? `rgba(235,104,52,${r2(0.25 + (0.75 * w) / kmax)})` : `rgba(42,120,214,${r2(0.25 + (0.75 * -w) / kmax)})` }}
                >
                  {w.toFixed(2)}
                </span>
              ))}
            </div>
            <span className="font-mono text-[10px] text-muted">
              filter {best + 1} of {c1}
            </span>
            <span className="text-[18px]">→</span>
          </div>
          <FeatureMap t={run.conv1} ch={best} px={26 * 6} upto={row * run.conv1.w} />
        </div>
        <p className="mt-3 max-w-md text-center text-[12px] text-ink-2/60">At every position: 9 pixels × 9 weights, added up. Dark where the picture matches the filter&apos;s pattern.</p>
      </Panel>

      {/* 3: all first-layer maps */}
      <Panel on={step === 2}>
        <Label>
          {c1} filters → {c1} feature maps ({run.conv1.w} × {run.conv1.h})
        </Label>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: c1 }, (_, c) => (
            <FeatureMap key={c} t={run.conv1} ch={c} px={c1 > 16 ? 40 : 52} className={c === best ? "ring-2 ring-[#eb6834]" : ""} />
          ))}
        </div>
      </Panel>

      {/* 4: pooling */}
      <Panel on={step === 3}>
        <Label>
          max-pool: {run.conv1.w} × {run.conv1.h} → {run.pool1.w} × {run.pool1.h}
        </Label>
        <div className="flex items-center gap-5">
          <FeatureMap t={run.conv1} ch={best} px={156} />
          <span className="text-[22px]">→</span>
          <FeatureMap t={run.pool1} ch={best} px={156} />
        </div>
        <p className="mt-3 max-w-md text-center text-[12px] text-ink-2/60">
          Each 2 × 2 block keeps only its strongest value: a quarter of the numbers, the same pattern, and a stroke can shift a pixel without changing much.
        </p>
      </Panel>

      {/* 5: second layer */}
      <Panel on={step === 4}>
        <Label>
          layer 2: {run.conv2.c} filters, each looking at all {c1} maps at once{run.conv2.c > maps2 ? ` (first ${maps2} shown)` : ""}
        </Label>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: maps2 }, (_, c) => (
            <FeatureMap key={c} t={run.conv2} ch={c} px={38} />
          ))}
        </div>
        <p className="mt-3 max-w-md text-center text-[12px] text-ink-2/60">
          These combine strokes into parts: corners, loops, crossings. Then another pool: {run.pool2.w} × {run.pool2.h} × {run.pool2.c} = {run.pool2.w * run.pool2.h * run.pool2.c} numbers.
        </p>
      </Panel>

      {/* 6: dense neurons */}
      <Panel on={step === 5}>
        <Label>
          {run.pool2.data.length} numbers → {hid.length} neurons → {classes.length} answers
        </Label>
        <div className="flex items-center gap-4">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${hid.length > 64 ? 16 : 8}, minmax(0, 1fr))` }}>
            {Array.from(hid).map((v, i) => (
              <motion.span key={i} className="h-4 w-4 rounded-full border border-ink/10" initial={false} animate={{ background: `rgba(11,11,11,${r2(v / hmax)})` }} transition={tr} />
            ))}
          </div>
          <span className="text-[22px]">→</span>
          <div className="flex flex-col gap-1">
            {order.slice(0, 6).map((k) => (
              <span key={k} className="flex items-center gap-2 text-[12px]">
                <span className="h-4 w-4 rounded-full border border-ink/20" style={{ background: `rgba(235,104,52,${r2(run.probs[k])})` }} />
                {classes[k]}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-3 max-w-md text-center text-[12px] text-ink-2/60">Each dot is one neuron: a weighted sum of everything before it, then “keep it if positive” (ReLU). Darker = more active.</p>
      </Panel>

      {/* 7: softmax */}
      <Panel on={step === 6}>
        <Label>softmax: scores → chances that add up to 100%</Label>
        <div className="w-full max-w-md space-y-1.5">
          {order.slice(0, 5).map((k, i) => (
            <div key={k} className="grid grid-cols-[96px_1fr_48px] items-center gap-2 text-[13px]">
              <span className={i === 0 ? "font-semibold" : ""}>{classes[k]}</span>
              <div className="h-3.5 rounded-full bg-ink/[0.06]">
                <motion.div className="h-full rounded-full" initial={false} animate={{ width: `${r2(run.probs[k] * 100)}%`, background: i === 0 ? UP : "rgba(11,11,11,0.35)" }} transition={tr} />
              </div>
              <span className="text-right font-mono">{(run.probs[k] * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        {label && (
          <p className="mt-3 text-[12.5px]">
            The right answer: <b>{label}</b>
          </p>
        )}
      </Panel>

      {/* 8: training */}
      <Panel on={step === 7}>
        <Label>accuracy after each pass over the training data</Label>
        <svg viewBox="0 0 420 220" className="w-full max-w-[460px]">
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={40} x2={410} y1={20 + f * 170} y2={20 + f * 170} stroke="rgba(11,11,11,0.08)" />
          ))}
          {(["accuracy", "val_accuracy"] as const).map((k) => (
            <path
              key={k}
              d={history[k].map((v, i) => `${i ? "L" : "M"}${(40 + (i / Math.max(1, epochs - 1)) * 370).toFixed(1)},${(190 - ((v - accLo) / (1 - accLo)) * 170).toFixed(1)}`).join(" ")}
              fill="none"
              stroke={k === "accuracy" ? "rgba(11,11,11,0.4)" : UP}
              strokeWidth={2.5}
            />
          ))}
          <text x={36} y={24} fontSize={10} textAnchor="end" fill="rgba(11,11,11,0.5)" fontFamily="ui-monospace, monospace">
            100%
          </text>
          <text x={36} y={194} fontSize={10} textAnchor="end" fill="rgba(11,11,11,0.5)" fontFamily="ui-monospace, monospace">
            {Math.round(accLo * 100)}%
          </text>
          <text x={225} y={214} fontSize={10} textAnchor="middle" fill="rgba(11,11,11,0.5)" fontFamily="ui-monospace, monospace">
            {epochs} EPOCHS
          </text>
        </svg>
        <p className="mt-1 text-[12px] text-ink-2/60">
          <span style={{ color: UP }}>■</span> held-out validation images · <span className="text-ink/40">■</span> training images
        </p>
      </Panel>

      {/* 9: why convolution */}
      <Panel on={step === 8}>
        <div className="grid w-full max-w-md grid-cols-2 gap-2">
          {[
            ["Same filter everywhere", "A stroke detector learned in one corner works in every corner."],
            ["Few weights", "A filter has 9 weights per input map, however big the picture."],
            ["Layers build up", "Edges → parts → whole objects, from one layer to the next."],
            ["Nothing hand-made", "Every filter here was learned from examples, none designed by me."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-white p-3">
              <p className="text-[13px] font-semibold">{t}</p>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-2/70">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-2/60">
          <span style={{ color: BLUE }}>■</span> blue weights subtract, <span style={{ color: UP }}>■</span> orange add.
        </p>
      </Panel>
    </div>
  );
}

export type CnnRow = { id: string; pixels: Float64Array; label?: string; tag: string };

export function CnnExplainer({
  title,
  line,
  model,
  rows,
  classes,
  entity,
  history,
  trained,
  bytes,
}: {
  title: string;
  line?: string;
  model: DigitCnn;
  rows: CnnRow[];
  classes: string[];
  entity: string;
  history: { accuracy: number[]; val_accuracy: number[] };
  /** "55,000 training images" */
  trained: string;
  /** size of the shipped 8-bit weights */
  bytes: number;
}) {
  const net = useMemo(() => createDigitNet(model), [model]);
  const filters = useMemo(() => dequant(model.conv1), [model]);
  const [pick, setPick] = useState(0);
  const row = rows[pick];
  const input = useMemo<Tensor>(() => ({ data: row.pixels, h: 28, w: 28, c: 1 }), [row]);
  const run = useMemo(() => net(row.pixels), [net, row]);
  const params = [model.conv1, model.conv2, model.dense1, model.out].reduce((s, l) => s + l.shape.reduce((a, b) => a * b, 1) + l.b.length, 0);
  const top = run.probs.indexOf(Math.max(...run.probs));

  const steps: Step[] = [
    { t: "A picture is just numbers", d: `This ${entity} is 784 numbers, one per pixel. The network never sees “a shape”, only these.` },
    {
      t: "A filter slides across",
      d: "A filter is a 3 × 3 grid of learned weights. It slides over every position; where the pixels match its pattern, the output lights up. That output is a feature map.",
    },
    {
      t: `${run.conv1.c} filters, ${run.conv1.c} views`,
      d: "The first layer has many filters, each tuned to a different stroke: edges at different angles, ends, thick lines. Each gives its own map of where that stroke appears.",
    },
    { t: "Pooling keeps the strongest", d: "Shrinking each map by keeping the biggest value in every 2 × 2 block halves the size and makes the network forgive small shifts." },
    { t: "Filters on top of filters", d: `The second layer's ${run.conv2.c} filters read all the first-layer maps together, so they respond to combinations: loops, corners, crossings.` },
    {
      t: "Then ordinary neurons",
      d: `The last maps are flattened into ${run.pool2.data.length} numbers and fed to ${run.hidden.length} neurons, each the same weighted-sum-and-squash you saw in the Machine Learning projects, then to ${classes.length} output neurons, one per answer.`,
    },
    { t: "The answer", d: `Softmax turns the ${classes.length} output scores into chances. Top guess: ${classes[top]} at ${(run.probs[top] * 100).toFixed(1)}%.` },
    {
      t: "How it learned",
      d: `All ${params.toLocaleString("en-US")} weights started random. Training showed it ${trained} in small batches; after each batch, backpropagation worked out how every weight should change to make the right answers more likely, and nudged it a little.`,
    },
    {
      t: "Why a convolutional network",
      d: `Filters reuse the same few weights at every position, so the whole network fits in ${Math.round(bytes / 1024)} KB as 8-bit numbers and runs in your browser.`,
    },
  ];

  return (
    <InsideSection title={title} line={line}>
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label={entity} rows={rows} value={pick} onChange={setPick} tag={(r) => r.tag} />
            <div className="flex min-h-0 flex-1 flex-col">
              <Visual step={step} run={run} input={input} filters={filters} classes={classes} label={row.label} history={history} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
