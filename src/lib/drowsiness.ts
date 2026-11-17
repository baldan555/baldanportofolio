/**
 * Drowsiness signals from MediaPipe's face landmarks (478 points, normalised 0–1).
 * EAR (eye aspect ratio, Soukupová & Čech 2016): vertical eyelid distances over the eye's width; it drops towards 0
 * when the eye closes. MAR does the same for the mouth, to catch yawns. Thresholds are set per person from a short
 * calibration with eyes open, because resting eye shapes differ a lot between people.
 */
export type Pt = { x: number; y: number; z?: number };

// p1..p6 in the order of the EAR formula: corner, top, top, corner, bottom, bottom (MediaPipe face mesh indices)
export const EYE_A = [33, 160, 158, 133, 153, 144]; // one eye
export const EYE_B = [362, 385, 387, 263, 373, 380]; // the other
export const MOUTH = { left: 61, right: 291, top: 13, bottom: 14, top2: 81, bottom2: 178, top3: 311, bottom3: 402 };

/** Distance in pixels, so a non-square video doesn't distort the ratios. */
const dist = (a: Pt, b: Pt, w: number, h: number) => Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);

export function ear(pts: Pt[], idx: number[], w: number, h: number) {
  const [p1, p2, p3, p4, p5, p6] = idx.map((i) => pts[i]);
  return (dist(p2, p6, w, h) + dist(p3, p5, w, h)) / (2 * dist(p1, p4, w, h));
}

/** Mouth aspect ratio: mean inner-lip opening over mouth width. */
export function mar(pts: Pt[], w: number, h: number) {
  const m = MOUTH;
  const open = (dist(pts[m.top], pts[m.bottom], w, h) + dist(pts[m.top2], pts[m.bottom2], w, h) + dist(pts[m.top3], pts[m.bottom3], w, h)) / 3;
  return open / dist(pts[m.left], pts[m.right], w, h);
}

export const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export const PERCLOS_MIN_MS = 20_000;

export type Settings = { closedRatio: number; alarmMs: number; yawnMar: number; yawnMs: number; blinkMaxMs: number };
export const DEFAULTS: Settings = { closedRatio: 0.7, alarmMs: 1500, yawnMar: 0.55, yawnMs: 1200, blinkMaxMs: 400 };

export type State = {
  closedSince: number | null; // eyes below threshold since (ms)
  mouthSince: number | null;
  blinks: number[]; // timestamps of short closures
  yawns: number[];
  longest: number;
  history: { t: number; ear: number; closed: boolean }[]; // last 60 s
  alarm: boolean;
};
export const freshState = (): State => ({ closedSince: null, mouthSince: null, blinks: [], yawns: [], longest: 0, history: [], alarm: false });

/**
 * One frame of the detector. `baseline` is the visitor's open-eye EAR from calibration.
 * Returns the updated state plus what to show: closed for how long, blink rate, PERCLOS (share of the last minute
 * with eyes closed) and the alarm flag.
 */
export function step(s: State, t: number, earNow: number, marNow: number, baseline: number, cfg: Settings = DEFAULTS) {
  const threshold = baseline * cfg.closedRatio;
  const closed = earNow < threshold;
  let { closedSince, mouthSince, longest, alarm } = s;
  const blinks = s.blinks.filter((b) => t - b < 60_000);
  const yawns = s.yawns.filter((y) => t - y < 300_000);
  if (closed) closedSince ??= t;
  else if (closedSince !== null) {
    const dur = t - closedSince;
    if (dur <= cfg.blinkMaxMs) blinks.push(t);
    longest = Math.max(longest, dur);
    closedSince = null;
  }
  const closedMs = closedSince === null ? 0 : t - closedSince;
  alarm = closedMs >= cfg.alarmMs;
  if (marNow > cfg.yawnMar) mouthSince ??= t;
  else {
    if (mouthSince !== null && t - mouthSince >= cfg.yawnMs) yawns.push(t);
    mouthSince = null;
  }
  const history = [...s.history.filter((p) => t - p.t < 60_000), { t, ear: earNow, closed }];
  const span = history.length > 1 ? history.at(-1)!.t - history[0].t : 0;
  // PERCLOS: time-weighted share of the window with the eyes closed
  let closedTime = 0;
  for (let i = 1; i < history.length; i++) if (history[i - 1].closed) closedTime += history[i].t - history[i - 1].t;
  // only meaningful once there is enough history: a few seconds with one long closure would read as 50%+
  const perclos = span >= PERCLOS_MIN_MS ? closedTime / span : null;
  const next: State = { closedSince, mouthSince, blinks, yawns, longest: Math.max(longest, closedMs), history, alarm };
  return { state: next, closed, closedMs, threshold, perclos, blinkRate: blinks.length * (60_000 / Math.max(10_000, Math.min(60_000, span))), yawning: mouthSince !== null };
}

/** A plain fatigue level for the dashboard: long closures dominate, then PERCLOS, frequent yawns and few blinks. */
export function fatigueLevel(closedMs: number, perclos: number | null, yawns5min: number, alarmMs: number): "Awake" | "Tired" | "Drowsy" {
  const p = perclos ?? 0;
  if (closedMs >= alarmMs || p > 0.3) return "Drowsy";
  if (p > 0.15 || yawns5min >= 3 || closedMs >= alarmMs * 0.5) return "Tired";
  return "Awake";
}
