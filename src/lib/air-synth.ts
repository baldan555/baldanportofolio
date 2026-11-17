/**
 * Air Synth: music from hand landmarks. Scales and chords, reading the hands (which is which, raised fingers,
 * thumb-to-finger taps) and a small Web Audio synthesizer: no samples, no libraries.
 */
export type P = { x: number; y: number; z?: number };

/* ------------------------------------------------------------------ music */

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const SCALES: Record<string, number[]> = {
  Pentatonic: [0, 2, 4, 7, 9], // no clashing notes: the friendliest scale to play by waving
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Blues: [0, 3, 5, 6, 7, 10],
};
export const midiToFreq = (m: number) => 440 * 2 ** ((m - 69) / 12);
export const noteName = (m: number) => `${NOTE_NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;

/** Every note of a scale over some octaves from a root (MIDI numbers, low to high), ending on the top root. */
export function scaleNotes(root: number, scale: number[], octaves: number) {
  const out: number[] = [];
  for (let o = 0; o < octaves; o++) for (const s of scale) out.push(root + 12 * o + s);
  out.push(root + 12 * octaves);
  return out;
}

/** The band of the frame used for pitch: hands rarely reach the very top or bottom edge. */
export const BAND = { top: 0.1, bottom: 0.9 };

/** Hand height → position along the notes (0 = lowest, n−1 = highest). `y` is 0 at the top of the frame. */
export function heightToPos(y: number, n: number, top = BAND.top, bottom = BAND.bottom) {
  const u = Math.max(0, Math.min(1, (bottom - y) / (bottom - top)));
  return u * (n - 1);
}

/**
 * Snap a position to a note, but only leave the current note once the hand is clearly past the halfway line:
 * without this margin a hand resting on a boundary flickers between two notes.
 */
export function stickyIndex(prev: number, pos: number, margin = 0.18) {
  if (prev < 0 || Math.abs(pos - prev) > 0.5 + margin) return Math.round(pos);
  return prev;
}

/** Fractional note for glide mode: slides smoothly between the scale's notes instead of stepping. */
export function glideNote(pos: number, notes: number[]) {
  const i = Math.max(0, Math.min(notes.length - 2, Math.floor(pos)));
  return notes[i] + (notes[i + 1] - notes[i]) * (pos - i);
}

/** Five chords in C; the number of raised left-hand fingers picks one (1 = C … 5 = Dm). */
export const CHORDS = [
  { name: "C", roman: "I", notes: [60, 64, 67, 72] },
  { name: "F", roman: "IV", notes: [60, 65, 69, 72] },
  { name: "G", roman: "V", notes: [59, 62, 67, 71] },
  { name: "Am", roman: "vi", notes: [60, 64, 69, 72] },
  { name: "Dm", roman: "ii", notes: [62, 65, 69, 74] },
];
/** Bass note under each chord, an octave or two below. */
export const BASS = [48, 41, 43, 45, 38];

/* ------------------------------------------------------------------ hands */

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const palm = (lm: P[]) => Math.max(1e-6, dist(lm[0], lm[9])); // wrist → middle knuckle
export const TIPS = [8, 12, 16, 20]; // index, middle, ring, pinky
const PIPS = [6, 10, 14, 18];
export const FINGER_NAMES = ["index", "middle", "ring", "pinky"];

/** Where a hand is on screen, mirrored like a selfie (0 = left edge, 1 = right edge). */
export const screenX = (lm: P[]) => 1 - (lm[0].x + lm[9].x) / 2;

/**
 * Which hand is which, by where it is on the mirrored screen rather than by the model's left/right label:
 * the hand further right plays (pitch or notes), the other controls (volume or chord). One hand alone counts
 * as the playing hand on the right half of the screen and the control hand on the left half.
 */
export function splitHands(hands: P[][]): { play?: P[]; control?: P[] } {
  if (hands.length >= 2) {
    const [a, b] = [...hands].sort((h1, h2) => screenX(h1) - screenX(h2));
    return { control: a, play: b };
  }
  if (hands.length === 1) return screenX(hands[0]) >= 0.5 ? { play: hands[0] } : { control: hands[0] };
  return {};
}

/**
 * Which fingers are raised: [thumb, index, middle, ring, pinky]. A finger is up when its tip is farther from the
 * wrist than its middle joint (works at any hand angle); the thumb when its tip is away from the index knuckle.
 */
export function extended(lm: P[]) {
  const thumb = dist(lm[4], lm[5]) / palm(lm) > 0.55; // tuned on real hands: see scripts/check-air-synth.mjs
  return [thumb, ...TIPS.map((t, i) => dist(lm[t], lm[0]) > dist(lm[PIPS[i]], lm[0]) * 1.12)];
}

/** Raised fingers, 0–5. */
export const fingersUp = (lm: P[]) => extended(lm).filter(Boolean).length;

/** A fist: all four fingers folded (the thumb can be anywhere). */
export const isFist = (lm: P[]) => !extended(lm).slice(1).some(Boolean);

/** Thumb-to-fingertip gap ÷ palm length for the index, middle, ring and pinky (the same at any distance from the camera). */
export function tapRatios(lm: P[]) {
  return TIPS.map((t) => dist(lm[4], lm[t]) / palm(lm));
}

export const TAP = { on: 0.26, off: 0.4 };

/**
 * Which finger is touching the thumb (0–3), or −1. A finger already touching stays on until it clearly opens
 * (two thresholds); a new touch must be the closest finger, because the thumb can only meet one fingertip at a time.
 */
export function tappedFinger(prev: number, ratios: number[], on = TAP.on, off = TAP.off) {
  if (prev >= 0 && ratios[prev] < off) return prev;
  let best = -1;
  for (let i = 0; i < ratios.length; i++) if (ratios[i] < on && (best < 0 || ratios[i] < ratios[best])) best = i;
  return best;
}

/** A value must be seen this many frames in a row before it is accepted (stops chords flickering mid-gesture). */
export function settle(state: { value: number; cand: number; n: number }, v: number, frames = 4) {
  if (v === state.cand) state.n++;
  else {
    state.cand = v;
    state.n = 1;
  }
  if (state.n >= frames) state.value = v;
  return state.value;
}

/* ------------------------------------------------------------------ sound */

export type Wave = "sine" | "triangle" | "sawtooth" | "square";

/**
 * A small synthesizer built from Web Audio nodes: one gliding lead voice for the theremin (with vibrato),
 * four plucked voices for chord notes, a bass voice, a low-pass "tone" filter, a generated reverb and a limiter.
 */
export function createSynth() {
  const ctx = new AudioContext();
  const now = () => ctx.currentTime;

  const filter = ctx.createBiquadFilter(); // everything passes through one low-pass: the Tone control
  filter.type = "lowpass";
  filter.frequency.value = 2600;
  filter.Q.value = 0.8;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const limiter = ctx.createDynamicsCompressor(); // keeps four notes plus bass from clipping
  limiter.threshold.value = -14;
  limiter.ratio.value = 10;
  const analyser = ctx.createAnalyser(); // read by the oscilloscope
  analyser.fftSize = 2048;

  // reverb: a 1.8 s burst of decaying stereo noise used as the room's impulse response
  const reverb = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 1.8);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  reverb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.3;

  filter.connect(master);
  filter.connect(reverb).connect(wet).connect(master);
  master.connect(limiter).connect(analyser).connect(ctx.destination);

  const voice = (type: Wave) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(filter);
    osc.start();
    return { osc, gain };
  };

  // lead: vibrato is a slow oscillator added to the lead's detune, in cents
  const lead = voice("triangle");
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.5;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0;
  lfo.connect(lfoDepth).connect(lead.osc.detune);
  lfo.start();

  const plucks = [0, 1, 2, 3].map(() => voice("triangle"));
  const bass = voice("sine");

  return {
    ctx,
    analyser,
    resume: () => ctx.resume(),
    setWave(w: Wave) {
      lead.osc.type = w;
      for (const p of plucks) p.osc.type = w;
    },
    /** Theremin: glide to a frequency at a volume (0–1); `glide` is the time constant in seconds. */
    lead(freq: number, volume: number, glide = 0.03) {
      lead.osc.frequency.setTargetAtTime(freq, now(), glide);
      lead.gain.gain.setTargetAtTime(volume * 0.45, now(), 0.04);
    },
    /** Vibrato depth 0–1 (up to ±60 cents, just over half a semitone). */
    vibrato(amount: number) {
      lfoDepth.gain.setTargetAtTime(amount * 60, now(), 0.08);
    },
    /** Tone 0–1: low-pass cutoff from a dark 300 Hz to a bright 7 kHz, on a log scale like the ear. */
    tone(amount: number) {
      filter.frequency.setTargetAtTime(300 * (7000 / 300) ** amount, now(), 0.05);
    },
    /** Pluck chord voice i: a fast attack, then it settles to a quieter sustain while the finger stays down. */
    pluck(i: number, midi: number) {
      const g = plucks[i].gain.gain;
      plucks[i].osc.frequency.setValueAtTime(midiToFreq(midi), now());
      g.cancelScheduledValues(now());
      g.setTargetAtTime(0.26, now(), 0.006);
      g.setTargetAtTime(0.1, now() + 0.06, 0.4);
    },
    /** Move a ringing voice to a new note (when the chord changes under it). */
    retune(i: number, midi: number) {
      plucks[i].osc.frequency.setTargetAtTime(midiToFreq(midi), now(), 0.02);
    },
    release(i: number) {
      const g = plucks[i].gain.gain;
      g.cancelScheduledValues(now());
      g.setTargetAtTime(0, now(), 0.3);
    },
    /** Soft bass under the chord, or null to fade it out. */
    bass(midi: number | null) {
      if (midi === null) bass.gain.gain.setTargetAtTime(0, now(), 0.2);
      else {
        bass.osc.frequency.setTargetAtTime(midiToFreq(midi), now(), 0.03);
        bass.gain.gain.setTargetAtTime(0.22, now(), 0.08);
      }
    },
    silence() {
      lead.gain.gain.setTargetAtTime(0, now(), 0.06);
      for (const p of plucks) p.gain.gain.setTargetAtTime(0, now(), 0.2);
      bass.gain.gain.setTargetAtTime(0, now(), 0.2);
    },
    close: () => {
      if (ctx.state !== "closed") void ctx.close();
    },
  };
}

export type Synth = ReturnType<typeof createSynth>;
