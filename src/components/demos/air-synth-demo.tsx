"use client";

import { Camera, CameraOff, Mouse, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GestureRecognizer } from "@mediapipe/tasks-vision";
import {
  BAND,
  BASS,
  CHORDS,
  FINGER_NAMES,
  SCALES,
  TIPS,
  createSynth,
  fingersUp,
  glideNote,
  heightToPos,
  isFist,
  midiToFreq,
  noteName,
  scaleNotes,
  settle,
  splitHands,
  stickyIndex,
  tapRatios,
  tappedFinger,
  type P,
  type Synth,
  type Wave,
} from "@/lib/air-synth";
import { cameraError, loadHandTracker } from "@/lib/mediapipe";
import { OneEuro } from "@/lib/virtual-mouse";
import { Segmented, Slider, pc } from "./controls";

const clock = () => performance.now();
type Mode = "Theremin" | "Finger chords";
type Sound = "Soft" | "Warm" | "Bright" | "Retro";
type Edge = { start: number; end: number };
type Voice = { m: number; v: number; c: number }; // MIDI note, loudness 0–1, colour slot (−1 lead, 4 bass)

const KEYS = ["C", "D", "E", "F", "G", "A"];
const WAVES: Record<Sound, Wave> = { Soft: "sine", Warm: "triangle", Bright: "sawtooth", Retro: "square" };
const PLAY = "#eb6834";
const CONTROL = "#2a78d6";
const FINGER_COLORS = ["#eb6834", "#1baf7a", "#6250d6", "#d6497b"];
const TONE_KEYS = ["a", "s", "d", "f"];
const TRAIL_MS = 6000;
const LO = 36; // visualizer range, MIDI
const HI = 90;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
/** Root of the key: C4 to F4, or G3 and A3 so the two octaves stay comfortable. */
const rootOf = (k: string) => {
  const off = [0, 2, 4, 5, 7, 9][KEYS.indexOf(k)];
  return 60 + off - (off >= 7 ? 12 : 0);
};

/* ------------------------------------------------------------------ drawing */

function drawHand(ctx: CanvasRenderingContext2D, lm: P[], w: number, h: number, color: string, edges: Edge[]) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, w / 200);
  ctx.beginPath();
  for (const { start, end } of edges) {
    ctx.moveTo((1 - lm[start].x) * w, lm[start].y * h);
    ctx.lineTo((1 - lm[end].x) * w, lm[end].y * h);
  }
  ctx.stroke();
  ctx.fillStyle = color;
  for (const p of lm) {
    ctx.beginPath();
    ctx.arc((1 - p.x) * w, p.y * h, Math.max(2.5, w / 260), 0, Math.PI * 2);
    ctx.fill();
  }
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color = "#fff", align: CanvasTextAlign = "left") {
  ctx.font = `600 ${Math.round(size)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/* ------------------------------------------------------------------ demo */

export function AirSynthDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const scope = useRef<HTMLCanvasElement>(null);
  const tracker = useRef<GestureRecognizer | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const edges = useRef<Edge[]>([]);
  const synth = useRef<Synth | null>(null);
  const raf = useRef<number | null>(null);
  const camOn = useRef(false);
  const padOn = useRef(false);

  // what the hands are doing right now (read by the drawing loop)
  const hands = useRef<{ play?: P[]; control?: P[] }>({});
  const fy = useRef(new OneEuro(1.0, 0.02));
  const noteIdx = useRef(-1);
  const lastFreq = useRef(261.6);
  const lead = useRef({ pos: -1, m: 0, vol: 0, vib: false, muted: false });
  const vibTap = useRef(-1);
  const chord = useRef(0);
  const chordSt = useRef({ value: -1, cand: -1, n: 0 });
  const count = useRef(-1);
  const tapped = useRef(-1);
  const held = useRef(new Set<number>()); // tone pads held with the mouse or keyboard
  const bassOn = useRef(false);
  const pad = useRef<{ x: number; y: number } | null>(null);
  const sounding = useRef<Voice[]>([]);
  const trail = useRef<(Voice & { t: number })[]>([]);
  const wave = useRef(new Float32Array(0));
  const frames = useRef<number[]>([]);
  const lastUi = useRef(0);

  const [mode, setMode] = useState<Mode>("Theremin");
  const [scale, setScale] = useState("Pentatonic");
  const [key, setKey] = useState("C");
  const [snap, setSnap] = useState<"Snap to notes" | "Glide">("Snap to notes");
  const [sound, setSound] = useState<Sound>("Warm");
  const [tone, setTone] = useState(60);
  const [bass, setBass] = useState<"Bass on" | "Bass off">("Bass on");
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [padMode, setPadMode] = useState(false);
  const [error, setError] = useState("");
  const [ui, setUi] = useState({ play: false, control: false, note: "", freq: 0, vol: 0, vib: false, muted: false, chord: 0, count: -1, tapped: -1, held: [] as number[], fps: 0 });

  const notes = useMemo(() => scaleNotes(rootOf(key), SCALES[scale], 2), [key, scale]);
  const shift = rootOf(key) - 60;
  const cfg = useRef({ mode, notes, snap: true, bass: true, shift });
  useEffect(() => {
    cfg.current = { mode, notes, snap: snap === "Snap to notes", bass: bass === "Bass on", shift };
    noteIdx.current = -1;
  }, [mode, notes, snap, bass, shift]);
  useEffect(() => synth.current?.setWave(WAVES[sound]), [sound]);
  useEffect(() => synth.current?.tone(tone / 100), [tone]);

  const chordNotes = (i: number) => CHORDS[i].notes.map((m) => m + cfg.current.shift);

  /* ---------------- sound from intentions (shared by hands, mouse and keys) */

  const playLead = (pos: number | null, vol: number, vib: boolean) => {
    const s = synth.current;
    if (!s) return;
    const c = cfg.current;
    if (pos === null || vol <= 0.001) {
      s.lead(lastFreq.current, 0);
      s.vibrato(0);
      if (pos === null) noteIdx.current = -1;
      lead.current = { ...lead.current, pos: pos ?? -1, vol: 0, vib: false };
      sounding.current = [];
      return;
    }
    noteIdx.current = stickyIndex(noteIdx.current, pos);
    const m = c.snap ? c.notes[noteIdx.current] : glideNote(pos, c.notes);
    lastFreq.current = midiToFreq(m);
    s.lead(lastFreq.current, vol, c.snap ? 0.018 : 0.06);
    s.vibrato(vib ? 1 : 0);
    lead.current = { pos, m, vol, vib, muted: false };
    sounding.current = [{ m, v: vol, c: -1 }];
  };

  /** Chord change: notes already ringing slide to the new chord's tones. */
  const chooseChord = (i: number) => {
    if (i === chord.current) return;
    chord.current = i;
    const s = synth.current;
    if (!s) return;
    const ns = chordNotes(i);
    if (tapped.current >= 0) s.retune(tapped.current, ns[tapped.current]);
    for (const h of held.current) s.retune(h, ns[h]);
    if (bassOn.current) s.bass(BASS[i] + cfg.current.shift);
  };

  const setBassOn = (on: boolean) => {
    if (on === bassOn.current) return;
    bassOn.current = on;
    synth.current?.bass(on ? BASS[chord.current] + cfg.current.shift : null);
  };

  const chordSounding = () => {
    const ns = chordNotes(chord.current);
    const v: Voice[] = [];
    if (tapped.current >= 0) v.push({ m: ns[tapped.current], v: 1, c: tapped.current });
    for (const h of held.current) if (h !== tapped.current) v.push({ m: ns[h], v: 1, c: h });
    if (bassOn.current) v.push({ m: BASS[chord.current] + cfg.current.shift, v: 0.7, c: 4 });
    sounding.current = v;
  };

  /* ---------------- hands */

  const thereminHands = (play: P[] | undefined, control: P[] | undefined, t: number) => {
    let pos: number | null = null;
    if (play) pos = heightToPos(fy.current.filter(play[9].y * 480, t) / 480, cfg.current.notes.length);
    else fy.current.reset();
    let vol = 0.8;
    let vib = false;
    let muted = false;
    if (control) {
      muted = isFist(control);
      vol = muted ? 0 : clamp((0.85 - control[9].y) / 0.55); // palm higher = louder
      vibTap.current = tappedFinger(vibTap.current, tapRatios(control).slice(0, 1)); // thumb on index
      vib = vibTap.current === 0;
    } else vibTap.current = -1;
    playLead(pos, vol, vib);
    lead.current.muted = muted;
  };

  const chordHands = (play: P[] | undefined, control: P[] | undefined) => {
    const s = synth.current!;
    if (control) {
      count.current = fingersUp(control);
      const k = settle(chordSt.current, count.current, 4);
      if (k >= 1) chooseChord(k - 1);
      setBassOn(cfg.current.bass && k >= 1); // a fist silences the bass and keeps the chord
    } else {
      count.current = -1;
      if (!held.current.size) setBassOn(false);
    }
    const f = play ? tappedFinger(tapped.current, tapRatios(play)) : -1;
    if (f !== tapped.current) {
      if (tapped.current >= 0 && !held.current.has(tapped.current)) s.release(tapped.current);
      if (f >= 0) s.pluck(f, chordNotes(chord.current)[f]);
      tapped.current = f;
    }
    chordSounding();
  };

  /* ---------------- the loop: hands → sound, then draw */

  const draw = () => {
    const cv = overlay.current;
    const v = video.current;
    if (!cv) return;
    const w = camOn.current && v?.videoWidth ? v.videoWidth : 640;
    const h = camOn.current && v?.videoHeight ? v.videoHeight : 480;
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    if (!camOn.current && !padOn.current) return;
    const c = cfg.current;
    const fs = w / 42;
    const { play, control } = hands.current;
    if (c.mode === "Theremin") {
      const x0 = camOn.current ? w * 0.5 : 0;
      const n = c.notes.length;
      const yOf = (i: number) => (BAND.bottom - (i / (n - 1)) * (BAND.bottom - BAND.top)) * h;
      const step = (yOf(0) - yOf(1)) / 2;
      const cur = lead.current.vol > 0 ? noteIdx.current : -1;
      for (let i = 0; i < n; i++) {
        const y = yOf(i);
        if (i === cur) {
          ctx.fillStyle = "rgba(235,104,52,0.35)";
          ctx.fillRect(x0, y - step, w - x0, step * 2);
        }
        ctx.strokeStyle = (c.notes[i] - c.notes[0]) % 12 === 0 || i === 0 || i === n - 1 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        label(ctx, noteName(c.notes[i]), w - 8, y, fs * 0.8, i === cur ? "#fff" : "rgba(255,255,255,0.7)", "right");
      }
      if (camOn.current) {
        ctx.setLineDash([6, 8]);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);
        // volume meter on the control side
        const top = h * 0.25;
        const bottom = h * 0.85;
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(14, top, 12, bottom - top);
        ctx.fillStyle = lead.current.muted ? "#ffb4a8" : CONTROL;
        const vh = (bottom - top) * (control ? lead.current.vol : 0);
        ctx.fillRect(14, bottom - vh, 12, vh);
        label(ctx, control ? (lead.current.muted ? "muted" : lead.current.vib ? "vibrato" : "volume") : "volume hand", 34, top - fs * 0.2, fs * 0.75);
        label(ctx, "pitch hand", w - 8, h * 0.05, fs * 0.75, "rgba(255,255,255,0.8)", "right");
      }
      if (control) drawHand(ctx, control, w, h, CONTROL, edges.current);
      if (play) {
        drawHand(ctx, play, w, h, PLAY, edges.current);
        const x = (1 - play[9].x) * w;
        const y = play[9].y * h;
        ctx.fillStyle = PLAY;
        ctx.beginPath();
        ctx.arc(x, y, fs * 0.55, 0, Math.PI * 2);
        ctx.fill();
        if (lead.current.vol > 0) label(ctx, noteName(lead.current.m), x - fs, y, fs * 1.2, "#fff", "right");
      }
      if (pad.current && padOn.current) {
        ctx.fillStyle = PLAY;
        ctx.beginPath();
        ctx.arc(pad.current.x * w, pad.current.y * h, fs * 0.6, 0, Math.PI * 2);
        ctx.fill();
        if (lead.current.vol > 0) label(ctx, noteName(lead.current.m), pad.current.x * w - fs, pad.current.y * h, fs * 1.2, "#fff", "right");
      }
    } else {
      const ns = chordNotes(chord.current);
      if (control) {
        drawHand(ctx, control, w, h, CONTROL, edges.current);
        const x = (1 - control[0].x) * w;
        const y = Math.min(h - fs, control[0].y * h + fs * 1.4);
        label(ctx, `${count.current} → ${count.current >= 1 ? CHORDS[count.current - 1].name : "hold"}`, x, y, fs * 1.1, "#fff", "center");
      }
      if (play) {
        drawHand(ctx, play, w, h, "rgba(255,255,255,0.7)", edges.current);
        TIPS.forEach((tip, i) => {
          const x = (1 - play[tip].x) * w;
          const y = play[tip].y * h;
          const on = tapped.current === i;
          ctx.fillStyle = on ? FINGER_COLORS[i] : "rgba(11,11,11,0.55)";
          ctx.strokeStyle = FINGER_COLORS[i];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, fs * (on ? 0.95 : 0.75), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          label(ctx, noteName(ns[i]).replace(/\d/, ""), x, y, fs * 0.7, "#fff", "center");
        });
      }
      if (!camOn.current) {
        // no camera: four big "fingertips" that light up as the notes play
        ns.forEach((m, i) => {
          const x = w * (0.2 + i * 0.2);
          const on = tapped.current === i || held.current.has(i);
          ctx.fillStyle = on ? FINGER_COLORS[i] : "rgba(255,255,255,0.08)";
          ctx.strokeStyle = FINGER_COLORS[i];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, h * 0.48, fs * (on ? 2.3 : 2), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          label(ctx, noteName(m), x, h * 0.48, fs * 1.1, "#fff", "center");
          label(ctx, FINGER_NAMES[i], x, h * 0.48 + fs * 3.2, fs * 0.75, "rgba(255,255,255,0.6)", "center");
        });
      }
      label(ctx, CHORDS[chord.current].name, 14, h * 0.07, fs * 2, "#fff");
    }
  };

  const drawScope = (t: number) => {
    const cv = scope.current;
    const s = synth.current;
    if (!cv || !s) return;
    const w = cv.width;
    const h = cv.height;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    const yOf = (m: number) => h - ((m - LO) / (HI - LO)) * h;
    ctx.lineWidth = 1;
    for (let m = 36; m <= 84; m += 12) {
      ctx.strokeStyle = "rgba(11,11,11,0.08)";
      ctx.beginPath();
      ctx.moveTo(0, yOf(m));
      ctx.lineTo(w, yOf(m));
      ctx.stroke();
      label(ctx, `C${m / 12 - 1}`, 6, yOf(m) - 9, 16, "rgba(11,11,11,0.35)");
    }
    while (trail.current.length && t - trail.current[0].t > TRAIL_MS) trail.current.shift();
    for (const p of trail.current) {
      ctx.globalAlpha = 0.2 + 0.8 * p.v;
      ctx.fillStyle = p.c < 0 ? "#0b0b0b" : p.c === 4 ? "#8a8a8a" : FINGER_COLORS[p.c];
      ctx.fillRect(w - ((t - p.t) / TRAIL_MS) * w, yOf(p.m) - 3, 4, 6);
    }
    ctx.globalAlpha = 1;
    // oscilloscope: the actual waveform leaving the speakers
    if (wave.current.length !== s.analyser.fftSize) wave.current = new Float32Array(s.analyser.fftSize);
    const buf = wave.current;
    s.analyser.getFloatTimeDomainData(buf);
    let zero = 0; // start on a rising zero crossing so the wave stands still
    for (let i = 1; i < buf.length / 2; i++)
      if (buf[i - 1] < 0 && buf[i] >= 0) {
        zero = i;
        break;
      }
    const span = Math.min(buf.length - zero, 1024);
    ctx.strokeStyle = "rgba(42,120,214,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < span; i++) {
      const x = (i / (span - 1)) * w;
      const y = h / 2 - buf[zero + i] * h * 0.9;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  };

  /** Create the synthesizer on the first click (browsers only allow sound after a gesture) and start the loop. */
  const ensureSynth = () => {
    if (synth.current) {
      void synth.current.resume();
      return synth.current;
    }
    const s = createSynth();
    synth.current = s;
    s.setWave(WAVES[sound]);
    s.tone(tone / 100);
    void s.resume();
    let lastTime = -1;
    const tick = () => {
      const t = clock();
      const v = video.current;
      const tr = tracker.current;
      if (camOn.current && tr && v && v.readyState >= 2 && v.currentTime !== lastTime) {
        lastTime = v.currentTime;
        const res = tr.recognizeForVideo(v, t);
        hands.current = splitHands(res.landmarks ?? []);
        frames.current = [...frames.current.filter((x) => t - x < 1000), t];
        if (cfg.current.mode === "Theremin") thereminHands(hands.current.play, hands.current.control, t);
        else chordHands(hands.current.play, hands.current.control);
      }
      for (const sd of sounding.current) trail.current.push({ ...sd, t });
      draw();
      drawScope(t);
      if (t - lastUi.current > 100) {
        lastUi.current = t;
        const l = lead.current;
        setUi({
          play: !!hands.current.play,
          control: !!hands.current.control,
          note: l.vol > 0 ? noteName(l.m) : "",
          freq: l.vol > 0 ? midiToFreq(l.m) : 0,
          vol: l.vol,
          vib: l.vib,
          muted: l.muted,
          chord: chord.current,
          count: count.current,
          tapped: tapped.current,
          held: [...held.current],
          fps: frames.current.length,
        });
      }
      raf.current = requestAnimationFrame(tick);
    };
    tick();
    return s;
  };

  /* ---------------- lifecycle */

  const stopCamera = useCallback(() => {
    camOn.current = false;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    hands.current = {};
    synth.current?.silence();
    sounding.current = [];
  }, []);

  useEffect(() => {
    // a hidden tab stops the drawing loop: don't leave a note droning
    const onHide = () => document.hidden && synth.current?.silence();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      stopCamera();
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      tracker.current?.close();
      tracker.current = null;
      synth.current?.close();
      synth.current = null;
    };
  }, [stopCamera]);

  useEffect(() => {
    synth.current?.silence();
    tapped.current = -1;
    held.current.clear();
    bassOn.current = false;
    noteIdx.current = -1;
    sounding.current = [];
  }, [mode]);

  const startCamera = async () => {
    setError("");
    ensureSynth();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("The camera needs a secure (https) page and a browser that supports it. You can still play with the mouse.");
      return;
    }
    try {
      setStatus("loading");
      tracker.current ??= await loadHandTracker(2);
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play();
      const { GestureRecognizer: GR } = await import("@mediapipe/tasks-vision");
      edges.current = GR.HAND_CONNECTIONS;
      fy.current.reset();
      padOn.current = false;
      setPadMode(false);
      camOn.current = true;
      setStatus("running");
    } catch (e) {
      stopCamera();
      setStatus("error");
      setError(cameraError(e).replace(" Try a photo instead.", " You can still play with the mouse.").replace(", or use a photo", ""));
    }
  };

  const startPad = () => {
    ensureSynth();
    padOn.current = true;
    setPadMode(true);
  };

  /* ---------------- mouse, touch and keys */

  const padAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    pad.current = { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
    playLead(heightToPos(pad.current.y, cfg.current.notes.length), 0.8, false);
  };
  const padUp = () => {
    pad.current = null;
    playLead(null, 0, false);
  };

  const press = (i: number) => {
    const s = ensureSynth();
    if (held.current.has(i)) return;
    held.current.add(i);
    s.pluck(i, chordNotes(chord.current)[i]);
    if (cfg.current.bass && count.current < 0) setBassOn(true);
    chordSounding();
    setUi((u) => ({ ...u, held: [...held.current] }));
  };
  const release = (i: number) => {
    if (!held.current.delete(i)) return;
    if (tapped.current !== i) synth.current?.release(i);
    if (!held.current.size && count.current < 0) setBassOn(false);
    chordSounding();
    setUi((u) => ({ ...u, held: [...held.current] }));
  };
  const pickChord = (i: number) => {
    ensureSynth();
    chooseChord(i);
    chordSounding();
    setUi((u) => ({ ...u, chord: i }));
  };

  const onKey = (e: React.KeyboardEvent, down: boolean) => {
    if (mode !== "Finger chords" || e.repeat) return;
    const k = e.key.toLowerCase();
    const n = Number(k);
    if (down && n >= 1 && n <= 5) pickChord(n - 1);
    const i = TONE_KEYS.indexOf(k);
    if (i >= 0) {
      e.preventDefault();
      if (down) press(i);
      else release(i);
    }
  };

  const running = status === "running";
  const chordNs = CHORDS[ui.chord].notes.map((m) => m + shift);

  return (
    <div tabIndex={-1} onKeyDown={(e) => onKey(e, true)} onKeyUp={(e) => onKey(e, false)} className="space-y-4 outline-none">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-2">
          <div
            className={`relative aspect-[4/3] touch-none overflow-hidden rounded-2xl bg-ink select-none ${padMode && mode === "Theremin" ? "cursor-pointer" : ""}`}
            onPointerDown={(e) => {
              if (!padMode || mode !== "Theremin") return;
              try {
                e.currentTarget.setPointerCapture(e.pointerId); // keep the note while dragging outside
              } catch {}
              padAt(e);
            }}
            onPointerMove={(e) => padMode && mode === "Theremin" && pad.current && padAt(e)}
            onPointerUp={() => padMode && padUp()}
            onPointerCancel={() => padMode && padUp()}
          >
            <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover opacity-80" />
            <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            {!running && !padMode && (
              <div className="absolute inset-0 grid place-items-center p-4 text-center text-white">
                <div>
                  <Camera className="mx-auto h-7 w-7 opacity-80" />
                  {status === "loading" ? (
                    <p className="mt-2 text-[13px]">Loading hand tracking…</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <button type="button" onClick={startCamera} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-ink">
                        <Play className="h-3.5 w-3.5" /> Start camera and sound
                      </button>
                      <button type="button" onClick={startPad} className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-4 py-2 text-[13px] text-white">
                        <Mouse className="h-3.5 w-3.5" /> Play with the mouse
                      </button>
                    </div>
                  )}
                  {error && <p className="mx-auto mt-2 max-w-sm text-[12px] text-[#ffb4a8]">{error}</p>}
                  <p className="mx-auto mt-3 max-w-xs text-[11.5px] text-white/60">Turn your sound on. Video stays in your browser.</p>
                </div>
              </div>
            )}
            {padMode && mode === "Theremin" && !ui.note && <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-[12px] text-white">Press and drag up and down</p>}
            {padMode && mode === "Finger chords" && (
              <p className="pointer-events-none absolute inset-x-6 bottom-4 text-center text-[12.5px] text-white/80">Use the chord and note buttons below, or keys 1–5 for chords and A S D F for notes.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            {running ? (
              <>
                <span className="rounded-full bg-white px-3 py-1">
                  <span style={{ color: PLAY }}>●</span> {mode === "Theremin" ? "pitch" : "notes"} {ui.play ? "✓" : "–"} · <span style={{ color: CONTROL }}>●</span> {mode === "Theremin" ? "volume" : "chord"} {ui.control ? "✓" : "–"}
                </span>
                <span className="font-mono text-muted">{ui.fps} fps</span>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setStatus("idle");
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1"
                >
                  <CameraOff className="h-3.5 w-3.5" /> Stop camera
                </button>
              </>
            ) : padMode ? (
              <button type="button" onClick={startCamera} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1">
                <Camera className="h-3.5 w-3.5" /> Use the camera instead
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4">
            {mode === "Theremin" ? (
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11.5px] tracking-wide text-muted uppercase">Playing</p>
                  <p className="text-[44px] leading-none font-semibold tabular-nums">{ui.note || "–"}</p>
                  <p className="mt-1 font-mono text-[12px] text-muted">{ui.freq ? `${ui.freq.toFixed(1)} Hz` : ui.muted ? "muted (fist)" : "silent"}</p>
                </div>
                <div className="w-28 space-y-1.5 text-[11.5px]">
                  <div className="flex justify-between">
                    <span>Volume</span>
                    <span className="font-mono">{Math.round(ui.vol * 100)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink/[0.06]">
                    <div className="h-full rounded-full transition-[width] duration-100" style={{ width: pc(ui.vol * 100), background: CONTROL }} />
                  </div>
                  <p className={ui.vib ? "font-medium text-[#138a60]" : "text-ink-2/50"}>{ui.vib ? "〰 vibrato on" : "vibrato off"}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11.5px] tracking-wide text-muted uppercase">Chord</p>
                  <p className="text-[44px] leading-none font-semibold">
                    {CHORDS[ui.chord].name}
                    <span className="ml-2 text-[16px] font-normal text-muted">{CHORDS[ui.chord].roman}</span>
                  </p>
                  <p className="mt-1 text-[12px] text-muted">{ui.count >= 0 ? `${ui.count} finger${ui.count === 1 ? "" : "s"} up${ui.count === 0 ? ": bass off" : ""}` : "show the left hand to pick"}</p>
                </div>
                <div className="flex gap-1.5">
                  {chordNs.map((m, i) => {
                    const on = ui.tapped === i || ui.held.includes(i);
                    return (
                      <span key={i} className="grid h-11 w-11 place-items-center rounded-xl text-[12.5px] font-semibold transition-colors" style={{ background: on ? FINGER_COLORS[i] : "rgba(11,11,11,0.05)", color: on ? "#fff" : FINGER_COLORS[i] }}>
                        {noteName(m).replace(/\d/, "")}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Segmented label="Mode" value={mode} options={["Theremin", "Finger chords"]} onChange={setMode} />
            {mode === "Theremin" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Segmented label="Scale" value={scale} options={Object.keys(SCALES)} onChange={setScale} />
                <Segmented label="Pitch" value={snap} options={["Snap to notes", "Glide"]} onChange={setSnap} />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Segmented label="Key" value={key} options={KEYS} onChange={setKey} />
              <Segmented label="Sound" value={sound} options={["Soft", "Warm", "Bright", "Retro"]} onChange={setSound} />
            </div>
            <div className="grid items-end gap-3 sm:grid-cols-2">
              <Slider label="Tone" value={tone} min={0} max={100} unit="%" onChange={setTone} />
              {mode === "Finger chords" && <Segmented label="Left hand" value={bass} options={["Bass on", "Bass off"]} onChange={setBass} />}
            </div>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-[12.5px] leading-relaxed text-ink-2/75">
            {mode === "Theremin" ? (
              <>
                <li>
                  <b style={{ color: PLAY }}>Right hand</b> (right half of the picture): higher hand, higher note.
                </li>
                <li>
                  <b style={{ color: CONTROL }}>Left hand</b>: raise the palm for louder, make a fist to mute, touch thumb to index for vibrato.
                </li>
                <li>Only one hand? Keep it on the right: it plays at a fixed volume.</li>
              </>
            ) : (
              <>
                <li>
                  <b style={{ color: CONTROL }}>Left hand</b>: hold up 1 to 5 fingers to pick C, F, G, Am or Dm; a fist stops the bass and keeps the chord.
                </li>
                <li>
                  <b style={{ color: PLAY }}>Right hand</b>: tap the thumb to the index, middle, ring or pinky to play the chord&apos;s four notes, low to high.
                </li>
                <li>Try 1 → 4 → 2 → 3 (C, Am, F, G) and tap the fingers in turn.</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {mode === "Finger chords" && (
        <div className="grid gap-3 rounded-2xl bg-white p-3 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-2 text-[12px] text-muted">Left hand: fingers up pick the chord (or click, keys 1–5)</p>
            <div className="flex gap-1.5">
              {CHORDS.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => pickChord(i)}
                  className={`flex-1 rounded-xl border px-2 py-2 text-center transition-colors ${ui.chord === i ? "border-ink bg-ink text-white" : "border-ink/10 hover:border-ink/30"}`}
                >
                  <span className="block text-[15px] font-semibold">{c.name}</span>
                  <span className={`block text-[10.5px] ${ui.chord === i ? "text-white/60" : "text-muted"}`}>{i + 1} up</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[12px] text-muted">Right hand: touch the thumb to a finger (or hold, keys A S D F)</p>
            <div className="flex gap-1.5">
              {chordNs.map((m, i) => {
                const on = ui.tapped === i || ui.held.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onPointerDown={() => press(i)}
                    onPointerUp={() => release(i)}
                    onPointerLeave={() => release(i)}
                    onPointerCancel={() => release(i)}
                    className="flex-1 touch-none rounded-xl border px-2 py-2 text-center transition-colors select-none"
                    style={{ borderColor: FINGER_COLORS[i], background: on ? FINGER_COLORS[i] : "transparent", color: on ? "#fff" : undefined }}
                  >
                    <span className="block text-[15px] font-semibold">{noteName(m)}</span>
                    <span className={`block text-[10.5px] ${on ? "text-white/75" : "text-muted"}`}>
                      {FINGER_NAMES[i]} · {TONE_KEYS[i].toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-3">
        <div className="mb-1 flex items-center justify-between text-[11.5px] text-muted">
          <span>Last 6 seconds of notes · the live waveform</span>
          <span>{mode === "Theremin" ? "black: your melody" : "colours: fingers · grey: bass"}</span>
        </div>
        <canvas ref={scope} width={1200} height={200} className="block h-[110px] w-full sm:h-[130px]" />
      </div>
    </div>
  );
}
