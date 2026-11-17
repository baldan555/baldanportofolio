/**
 * Reads a facial expression from MediaPipe's 52 face blendshapes.
 * The blendshape network is Google's (Face Landmarker); the mood rules below are mine, built on the Facial Action
 * Coding System (FACS): each expression is a weighted mix of the action units that define it, measured against
 * the visitor's own relaxed face (calibration), so a naturally curved mouth or high brows don't count as a mood.
 */
export type Shapes = Record<string, number>;
export const MOODS = ["happy", "surprised", "sad", "angry", "neutral"] as const;
export type Mood = (typeof MOODS)[number];

type Part = { shapes: string[]; gain: number; w: number; au: string; label: string; minus?: string[] };
export const RULES: Record<Exclude<Mood, "neutral">, Part[]> = {
  happy: [
    { shapes: ["mouthSmileLeft", "mouthSmileRight"], gain: 1.4, w: 1, au: "AU12", label: "Lip corners pulled up" },
    { shapes: ["cheekSquintLeft", "cheekSquintRight"], gain: 2, w: 0.45, au: "AU6", label: "Cheeks raised" },
  ],
  surprised: [
    { shapes: ["browInnerUp"], gain: 1.6, w: 0.6, au: "AU1", label: "Inner brows raised" },
    { shapes: ["browOuterUpLeft", "browOuterUpRight"], gain: 1.8, w: 0.5, au: "AU2", label: "Outer brows raised" },
    { shapes: ["jawOpen"], gain: 1.7, w: 0.7, au: "AU26", label: "Jaw dropped" },
    { shapes: ["eyeWideLeft", "eyeWideRight"], gain: 2.2, w: 0.4, au: "AU5", label: "Eyes widened" },
  ],
  sad: [
    { shapes: ["mouthFrownLeft", "mouthFrownRight"], gain: 3, w: 1, au: "AU15", label: "Lip corners pulled down" },
    { shapes: ["browInnerUp"], minus: ["browOuterUpLeft", "browOuterUpRight"], gain: 2, w: 0.5, au: "AU1", label: "Inner brows up, outer not" },
    { shapes: ["mouthShrugLower"], gain: 2, w: 0.35, au: "AU17", label: "Chin pushed up" },
  ],
  angry: [
    { shapes: ["browDownLeft", "browDownRight"], gain: 2, w: 1, au: "AU4", label: "Brows lowered" },
    { shapes: ["noseSneerLeft", "noseSneerRight"], gain: 2.4, w: 0.45, au: "AU9", label: "Nose wrinkled" },
    { shapes: ["mouthPressLeft", "mouthPressRight"], gain: 2.4, w: 0.4, au: "AU24", label: "Lips pressed" },
    { shapes: ["eyeSquintLeft", "eyeSquintRight"], gain: 2, w: 0.3, au: "AU7", label: "Eyelids tightened" },
  ],
};

const SHARP = 7; // how decisively the evidence turns into probabilities
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Evidence (0–1) for each expression and how much each action unit contributed. */
export function evidence(s: Shapes, baseline: Shapes = {}) {
  const at = (n: string) => Math.max(0, (s[n] ?? 0) - (baseline[n] ?? 0));
  const mean = (ns: string[]) => ns.reduce((a, n) => a + at(n), 0) / ns.length;
  const out = {} as Record<Exclude<Mood, "neutral">, { e: number; parts: { au: string; label: string; v: number; share: number }[] }>;
  for (const [mood, parts] of Object.entries(RULES) as [Exclude<Mood, "neutral">, Part[]][]) {
    const wsum = parts.reduce((a, p) => a + p.w, 0);
    const vals = parts.map((p) => clamp01((mean(p.shapes) - (p.minus ? mean(p.minus) : 0)) * p.gain));
    const e = parts.reduce((a, p, i) => a + p.w * vals[i], 0) / wsum;
    out[mood] = { e, parts: parts.map((p, i) => ({ au: p.au, label: p.label, v: vals[i], share: (p.w * vals[i]) / wsum })) };
  }
  return out;
}

/** Probabilities over the five moods. Neutral wins when no expression has much evidence. */
export function moodProbs(s: Shapes, baseline: Shapes = {}) {
  const ev = evidence(s, baseline);
  const strongest = Math.max(...Object.values(ev).map((x) => x.e));
  const score: Record<Mood, number> = { happy: ev.happy.e, surprised: ev.surprised.e, sad: ev.sad.e, angry: ev.angry.e, neutral: clamp01(0.45 - strongest) };
  const ex = MOODS.map((m) => Math.exp(SHARP * score[m]));
  const sum = ex.reduce((a, v) => a + v, 0);
  const probs = Object.fromEntries(MOODS.map((m, i) => [m, ex[i] / sum])) as Record<Mood, number>;
  const top = MOODS.reduce((a, m) => (probs[m] > probs[a] ? m : a), "neutral" as Mood);
  return { probs, top, ev };
}

/** Exponential smoothing of blendshapes between frames, so the reading doesn't flicker. */
export function smooth(prev: Shapes | null, next: Shapes, alpha = 0.35): Shapes {
  if (!prev) return { ...next };
  const out: Shapes = {};
  for (const k of Object.keys(next)) out[k] = prev[k] === undefined ? next[k] : prev[k] + alpha * (next[k] - prev[k]);
  return out;
}

/** Average of several frames of blendshapes: the visitor's relaxed face. */
export function averageShapes(frames: Shapes[]): Shapes {
  const out: Shapes = {};
  for (const f of frames) for (const [k, v] of Object.entries(f)) out[k] = (out[k] ?? 0) + v / frames.length;
  return out;
}

/** Head yaw / pitch / roll in degrees from MediaPipe's 4×4 facial transformation matrix (column-major). */
export function headPose(m: ArrayLike<number> | undefined) {
  if (!m || m.length < 16) return { yaw: 0, pitch: 0, roll: 0 };
  const deg = 180 / Math.PI;
  return { yaw: Math.asin(Math.max(-1, Math.min(1, -m[2]))) * deg, pitch: Math.atan2(m[6], m[10]) * deg, roll: Math.atan2(m[1], m[0]) * deg };
}
