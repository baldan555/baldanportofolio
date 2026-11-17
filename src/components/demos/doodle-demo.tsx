"use client";

import { motion } from "framer-motion";
import { Eraser, Play, RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import model from "@/data/models/doodle-duel.json";
import { createDigitNet, type DigitCnn } from "@/lib/cnn";
import { Segmented, pc } from "./controls";

export const CATS = model.categories;
export const EMOJI: Record<string, string> = {
  apple: "🍎", banana: "🍌", bicycle: "🚲", bird: "🐦", book: "📖", butterfly: "🦋", cake: "🎂", car: "🚗", cat: "🐱", clock: "🕒",
  cloud: "☁️", "coffee cup": "☕", dog: "🐶", fish: "🐟", flower: "🌸", guitar: "🎸", hamburger: "🍔", house: "🏠", "ice cream": "🍦", key: "🔑",
  "light bulb": "💡", moon: "🌙", mountain: "⛰️", pizza: "🍕", rainbow: "🌈", star: "⭐", sun: "☀️", tree: "🌳", umbrella: "☂️", airplane: "✈️",
};
const ROUNDS = 6;
const ROUND_MS = 20_000;
const WIN_P = 0.25; // the target must be the top guess with at least this probability
const LINE = 14; // stroke width in the 280-px working canvas (1.4 px at 28×28): matches the dataset's ink density and share of fully dark pixels
const clock = () => performance.now();
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const article = (s: string) => (/^[aeiou]/.test(s) ? "an" : "a");

type Stroke = [number, number][];
let netCache: ReturnType<typeof createDigitNet> | null = null;
const net = () => (netCache ??= createDigitNet(model.model as DigitCnn));

let work: HTMLCanvasElement | null = null;
/** Frame the strokes like the Quick, Draw! bitmaps: longest side 26 px, centred in 28×28, same stroke width; area-average down. */
export function rasterize(strokes: Stroke[]): Float64Array | null {
  const pts = strokes.flat();
  if (!pts.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const s = 260 / Math.max(x1 - x0, y1 - y0, 1);
  const ox = 140 - ((x0 + x1) / 2) * s;
  const oy = 140 - ((y0 + y1) / 2) * s;
  work ??= Object.assign(document.createElement("canvas"), { width: 280, height: 280 });
  const ctx = work.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, 280, 280);
  ctx.lineWidth = LINE;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000";
  for (const st of strokes) {
    ctx.beginPath();
    st.forEach(([x, y], i) => (i ? ctx.lineTo(x * s + ox, y * s + oy) : ctx.moveTo(x * s + ox, y * s + oy)));
    if (st.length === 1) ctx.lineTo(st[0][0] * s + ox + 0.5, st[0][1] * s + oy);
    ctx.stroke();
  }
  const d = ctx.getImageData(0, 0, 280, 280).data;
  const out = new Float64Array(784);
  for (let y = 0; y < 280; y++) for (let x = 0; x < 280; x++) out[((y / 10) | 0) * 28 + ((x / 10) | 0)] += d[(y * 280 + x) * 4 + 3];
  for (let i = 0; i < 784; i++) out[i] = Math.round(out[i] / 100) / 255; // whole 0–255 levels, like the dataset's uint8 pixels
  return out;
}

function paint28(c: HTMLCanvasElement | null, px: ArrayLike<number> | null) {
  const ctx = c?.getContext("2d");
  if (!c || !ctx) return;
  const img = ctx.createImageData(28, 28);
  for (let i = 0; i < 784; i++) {
    const v = 255 - Math.round((px?.[i] ?? 0) * 255);
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
}

/* ------------------------------------------------------------------ drawing pad */

function DrawPad({ onChange, resetKey, disabled, canvasRef }: { onChange: (s: Stroke[]) => void; resetKey: number; disabled?: boolean; canvasRef?: React.RefObject<HTMLCanvasElement | null> }) {
  const own = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? own;
  const strokes = useRef<Stroke[]>([]);
  const down = useRef(false);

  useEffect(() => {
    strokes.current = [];
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
    }
  }, [resetKey, ref]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const seg = (a: [number, number], b: [number, number], c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d")!;
    const k = c.width / c.getBoundingClientRect().width;
    ctx.strokeStyle = "#0b0b0b";
    ctx.lineWidth = 6 * k;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a[0] * k, a[1] * k);
    ctx.lineTo(b[0] * k + (a === b ? 0.1 : 0), b[1] * k);
    ctx.stroke();
  };

  return (
    <canvas
      ref={ref}
      width={840}
      height={840}
      aria-label="Drawing pad"
      className={`block aspect-square w-full touch-none rounded-2xl border border-ink/10 bg-white ${disabled ? "pointer-events-none opacity-60" : "cursor-crosshair"}`}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId); // keeps the stroke going if the finger leaves the pad
        } catch {
          /* some browsers refuse capture for synthetic or already-ended pointers */
        }
        down.current = true;
        const p = pos(e);
        strokes.current.push([p]);
        seg(p, p, e.currentTarget);
        onChange(strokes.current);
      }}
      onPointerMove={(e) => {
        if (!down.current) return;
        const st = strokes.current.at(-1)!;
        const p = pos(e);
        const last = st.at(-1)!;
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
        st.push(p);
        seg(last, p, e.currentTarget);
        onChange(strokes.current);
      }}
      onPointerUp={() => {
        down.current = false;
        onChange(strokes.current);
      }}
      onPointerCancel={() => (down.current = false)}
    />
  );
}

/** Runs the network at most once per animation frame while drawing. */
function useGuesser(onResult: (probs: number[] | null, px: Float64Array | null) => void) {
  const pending = useRef<Stroke[] | null>(null);
  const raf = useRef(0);
  const cb = useRef(onResult);
  useEffect(() => {
    cb.current = onResult;
  });
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return useCallback((s: Stroke[]) => {
    pending.current = s;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const px = rasterize(pending.current ?? []);
      cb.current(px ? net()(px).probs : null, px);
    });
  }, []);
}

const ranked = (probs: number[]) => probs.map((p, i) => ({ i, p })).sort((a, b) => b.p - a.p);

/* ------------------------------------------------------------------ the game */

export function DoodleDemo() {
  const [tab, setTab] = useState<"Play" | "Free draw">("Play");
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Segmented label="" value={tab} options={["Play", "Free draw"]} onChange={setTab} />
      </div>
      {tab === "Play" ? <Game /> : <FreeDraw />}
    </div>
  );
}

type Round = { target: number; ok: boolean; ms: number; guess: number; img: string };

function Game() {
  const [phase, setPhase] = useState<"intro" | "play" | "result" | "summary">("intro");
  const [order, setOrder] = useState<number[]>([]);
  const [ri, setRi] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [probs, setProbs] = useState<number[] | null>(null);
  const [px, setPx] = useState<Float64Array | null>(null);
  const [left, setLeft] = useState(ROUND_MS);
  const [resetKey, setResetKey] = useState(0);
  const [voice, setVoice] = useState(false);
  const start = useRef(0);
  const padRef = useRef<HTMLCanvasElement>(null);
  const eye = useRef<HTMLCanvasElement>(null);
  const spoken = useRef({ text: "", at: 0 });
  const done = useRef(false); // one result per round, even if a frame or the clock fires twice
  const target = order[ri];

  const say = useCallback(
    (text: string, force = false) => {
      if (!voice || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const now = clock();
      if (!force && (text === spoken.current.text || now - spoken.current.at < 1400)) return;
      spoken.current = { text, at: now };
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    },
    [voice],
  );

  const finish = useCallback(
    (ok: boolean, p: number[] | null) => {
      if (done.current) return;
      done.current = true;
      const guess = p ? ranked(p)[0].i : -1;
      const img = padRef.current?.toDataURL("image/png") ?? "";
      setRounds((rs) => [...rs, { target, ok, ms: Math.min(ROUND_MS, clock() - start.current), guess, img }]);
      setPhase("result");
      say(ok ? `Oh, I know! It's ${article(CATS[target])} ${CATS[target]}!` : `Sorry, I couldn't guess it.`, true);
    },
    [target, say],
  );

  const guess = useGuesser((p, image) => {
    setProbs(p);
    setPx(image);
    if (phase !== "play" || !p) return;
    const top = ranked(p);
    if (top[0].i === target && top[0].p >= WIN_P) finish(true, p);
    else if (top[0].p > 0.2) say(`I see ${CATS[top[0].i]}`);
  });

  useEffect(() => paint28(eye.current, px), [px]);

  // round clock
  useEffect(() => {
    if (phase !== "play") return;
    const id = setInterval(() => {
      const ms = ROUND_MS - (clock() - start.current);
      setLeft(Math.max(0, ms));
      if (ms <= 0) finish(false, probs);
    }, 100);
    return () => clearInterval(id);
  }, [phase, finish, probs]);

  // short pause on the result, then the next round
  useEffect(() => {
    if (phase !== "result") return;
    const id = setTimeout(() => {
      if (ri + 1 >= ROUNDS) setPhase("summary");
      else {
        setRi(ri + 1);
        setProbs(null);
        setPx(null);
        setResetKey((k) => k + 1);
        setLeft(ROUND_MS);
        start.current = clock();
        done.current = false;
        setPhase("play");
      }
    }, 1900);
    return () => clearTimeout(id);
  }, [phase, ri]);

  const begin = () => {
    const pool = CATS.map((_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setOrder(pool.slice(0, ROUNDS));
    setRounds([]);
    setRi(0);
    setProbs(null);
    setPx(null);
    setResetKey((k) => k + 1);
    setLeft(ROUND_MS);
    start.current = clock();
    done.current = false;
    setPhase("play");
  };

  if (phase === "intro") {
    return (
      <div className="rounded-2xl bg-white p-6 text-center sm:p-10">
        <p className="text-[2.2rem] leading-none">✏️ 🤖</p>
        <p className="mt-4 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em]">Draw it. The network has to guess it.</p>
        <p className="mx-auto mt-2 max-w-[520px] text-[14px] leading-relaxed text-ink-2/70">
          {ROUNDS} rounds, {ROUND_MS / 1000} seconds each. It guesses while you draw, so speed beats art. It knows {CATS.length} things:
        </p>
        <div className="mx-auto mt-4 flex max-w-[640px] flex-wrap justify-center gap-1.5">
          {CATS.map((c) => (
            <span key={c} className="rounded-full bg-cream px-2.5 py-1 text-[12px]">
              {EMOJI[c]} {c}
            </span>
          ))}
        </div>
        <button type="button" onClick={begin} className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white transition hover:opacity-90">
          <Play className="h-4 w-4" /> Start the duel
        </button>
      </div>
    );
  }

  if (phase === "summary") {
    const won = rounds.filter((r) => r.ok);
    const avg = won.length ? won.reduce((a, r) => a + r.ms, 0) / won.length / 1000 : 0;
    return (
      <div className="space-y-4 rounded-2xl bg-white p-5 sm:p-8">
        <div className="text-center">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Result</p>
          <p className="mt-1 text-[2.4rem] leading-none font-semibold tracking-[-0.04em]">
            {won.length} / {ROUNDS} guessed
          </p>
          <p className="mt-2 text-[13.5px] text-ink-2/70">{won.length ? `Average ${avg.toFixed(1)} s to recognise your drawing.` : "The network didn't get any this time. Try simpler, bigger shapes."}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rounds.map((r, i) => (
            <div key={i} className={`rounded-2xl border p-3 ${r.ok ? "border-[#1baf7a]/40 bg-[#1baf7a]/5" : "border-ink/10 bg-cream/40"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.img} alt={`Your drawing of ${CATS[r.target]}`} className="aspect-square w-full rounded-xl border border-ink/5 bg-white" />
              <p className="mt-2 text-[13.5px] font-semibold">
                {EMOJI[CATS[r.target]]} {cap(CATS[r.target])}
              </p>
              <p className="text-[12px] text-ink-2/70">{r.ok ? `✓ guessed in ${(r.ms / 1000).toFixed(1)} s` : `✗ it thought: ${r.guess >= 0 ? CATS[r.guess] : "nothing yet"}`}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <button type="button" onClick={begin} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white">
            <RotateCcw className="h-4 w-4" /> Play again
          </button>
        </div>
      </div>
    );
  }

  const top = probs ? ranked(probs) : null;
  const last = rounds.at(-1);
  const talk =
    phase === "result" && last
      ? last.ok
        ? `Oh, I know! It's ${article(CATS[last.target])} ${CATS[last.target]}!`
        : `Sorry, I couldn't guess it${last.guess >= 0 ? `. I thought: ${CATS[last.guess]}` : ""}.`
      : !top
        ? "Start drawing…"
        : top[0].p < 0.2
          ? "Hmm… not sure yet"
          : top[1].p > top[0].p * 0.6
            ? `${cap(CATS[top[0].i])}? Or ${CATS[top[1].i]}?`
            : `I see ${CATS[top[0].i]}…`;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
          <div>
            <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">
              Round {ri + 1} / {ROUNDS} · draw
            </p>
            <p className="text-[1.35rem] leading-tight font-semibold tracking-[-0.02em]">
              {EMOJI[CATS[target]]} {article(CATS[target])} {CATS[target]}
            </p>
          </div>
          <p className={`font-mono text-[1.6rem] font-semibold tabular-nums ${left < 5000 ? "text-[#e34948]" : ""}`}>{Math.ceil(left / 1000)}s</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
          <div className="h-full rounded-full bg-ink transition-[width] duration-100" style={{ width: pc((left / ROUND_MS) * 100) }} />
        </div>
        <DrawPad onChange={guess} resetKey={resetKey} disabled={phase !== "play"} canvasRef={padRef} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setResetKey((k) => k + 1); setProbs(null); setPx(null); }} disabled={phase !== "play"} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[12.5px] disabled:opacity-50">
            <Eraser className="h-3.5 w-3.5" /> Clear
          </button>
          <button type="button" onClick={() => finish(false, probs)} disabled={phase !== "play"} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[12.5px] disabled:opacity-50">
            <SkipForward className="h-3.5 w-3.5" /> Skip
          </button>
          <button type="button" onClick={() => setVoice((v) => !v)} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[12.5px]" aria-pressed={voice}>
            {voice ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />} Voice {voice ? "on" : "off"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative rounded-2xl bg-ink p-5 text-white">
          <p className="font-mono text-[10.5px] tracking-wide text-white/50 uppercase">The network says</p>
          <motion.p key={talk} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-1 min-h-[2.2em] text-[1.45rem] leading-tight font-semibold tracking-[-0.02em]">
            {talk}
          </motion.p>
          {phase === "result" && last && <p className="mt-1 text-[13px] text-white/60">{last.ok ? `${(last.ms / 1000).toFixed(1)} seconds` : "Next round coming…"}</p>}
        </div>
        <Guesses probs={probs} highlight={target} />
        <Eye eye={eye} />
      </div>
    </div>
  );
}

function Guesses({ probs, highlight }: { probs: number[] | null; highlight?: number }) {
  const top = probs ? ranked(probs).slice(0, 5) : [];
  return (
    <div className="rounded-2xl bg-white p-5">
      <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">Top guesses</p>
      <div className="mt-3 space-y-2">
        {top.length === 0 && <p className="text-[13px] text-ink-2/60">Nothing drawn yet.</p>}
        {top.map(({ i, p }) => (
          <div key={i}>
            <div className="flex justify-between text-[13px]">
              <span className={i === highlight ? "font-semibold" : ""}>
                {EMOJI[CATS[i]]} {CATS[i]}
              </span>
              <span className="font-mono text-ink-2/70">{(p * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
              <motion.div className="h-full rounded-full" style={{ background: i === highlight ? "#1baf7a" : "#0b0b0b" }} animate={{ width: pc(p * 100) }} transition={{ duration: 0.2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Eye({ eye }: { eye: React.RefObject<HTMLCanvasElement | null> }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4">
      <canvas ref={eye} width={28} height={28} className="h-20 w-20 shrink-0 rounded-lg border border-ink/10 [image-rendering:pixelated]" />
      <p className="text-[12.5px] leading-snug text-ink-2/70">
        <b className="text-ink">What the network sees.</b> Your strokes are cropped, scaled so the longest side fills 26 of 28 pixels and centred, exactly how the {Math.round(model.split.train / 1000)}k training doodles were prepared.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ free drawing */

function FreeDraw() {
  const [probs, setProbs] = useState<number[] | null>(null);
  const [px, setPx] = useState<Float64Array | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const eye = useRef<HTMLCanvasElement>(null);
  const guess = useGuesser((p, image) => {
    setProbs(p);
    setPx(image);
  });
  useEffect(() => paint28(eye.current, px), [px]);
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-3">
        <DrawPad onChange={guess} resetKey={resetKey} />
        <button type="button" onClick={() => { setResetKey((k) => k + 1); setProbs(null); setPx(null); }} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[12.5px]">
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
      <div className="space-y-3">
        <Guesses probs={probs} />
        <Eye eye={eye} />
        <p className="rounded-2xl bg-white p-4 text-[12.5px] leading-snug text-ink-2/70">
          It can only answer with one of its {CATS.length} things, so a drawing of anything else still gets the closest match. Try a sun with and without rays, or turn a cat into a dog.
        </p>
      </div>
    </div>
  );
}
