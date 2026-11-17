/**
 * Hands-free typing: head pose moves a pointer, a deliberate blink (or dwelling on a key) selects it, and a
 * scanning mode works with blinks alone. Built on MediaPipe's face landmarks and transformation matrix.
 */
export type Pose = { yaw: number; pitch: number; roll: number };
export type Calib = { yaw: number; pitch: number; ear: number };
export type Range = { yaw: number; pitch: number }; // degrees of head turn that cover the whole keyboard

/** Head turn → pointer in 0–1, around the calibrated neutral pose, mirrored like a selfie. */
export function headPointer(p: Pose, c: Calib, range: Range, flip = { x: false, y: false }) {
  const dx = (p.yaw - c.yaw) / range.yaw;
  const dy = (p.pitch - c.pitch) / range.pitch;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return { x: clamp(0.5 + (flip.x ? dx : -dx) / 2), y: clamp(0.5 + (flip.y ? -dy : dy) / 2) };
}

export const BLINK = { ratio: 0.65, minMs: 450, maxMs: 2500 };
export type BlinkState = { closedSince: number | null };

/**
 * A deliberate blink: both eyes closed (EAR below a share of your open-eye EAR) for at least `minMs` and at most
 * `maxMs`, then opened. Natural blinks (about 0.1–0.3 s) and resting your eyes are ignored. Fires on reopening.
 */
export function blinkStep(s: BlinkState, t: number, earNow: number, openEar: number, cfg = BLINK) {
  const closed = earNow < openEar * cfg.ratio;
  if (closed) {
    const since = s.closedSince ?? t;
    return { state: { closedSince: since }, closed, progress: Math.min(1, (t - since) / cfg.minMs), click: false };
  }
  const dur = s.closedSince === null ? 0 : t - s.closedSince;
  return { state: { closedSince: null }, closed, progress: 0, click: dur >= cfg.minMs && dur <= cfg.maxMs };
}

/**
 * Instant blink click: fires the moment both eyes close (the open → closed edge), with a short refractory time so one
 * blink can't click twice. Fast, but natural blinks click too.
 */
export const INSTANT = { refractoryMs: 350 };
export type InstantState = { closed: boolean; lastClick: number };
export function instantBlinkStep(s: InstantState, t: number, earNow: number, openEar: number, ratio = BLINK.ratio, refractoryMs = INSTANT.refractoryMs) {
  const closed = earNow < openEar * ratio;
  const click = closed && !s.closed && t - s.lastClick >= refractoryMs;
  return { state: { closed, lastClick: click ? t : s.lastClick }, closed, click };
}

/* ------------------------------------------------------------------ eye gaze (webcam, iris landmarks) */

export type Pt = { x: number; y: number };
// iris centres in MediaPipe's 478-point mesh, paired with each eye's corners and lids (same eyes as EYE_A / EYE_B)
const EYES = [
  { iris: 468, c1: 33, c2: 133, top: [160, 158], bottom: [144, 153] },
  { iris: 473, c1: 362, c2: 263, top: [385, 387], bottom: [380, 373] },
];

/**
 * Where the eyes look, as two ratios averaged over both eyes: horizontal = iris position between the eye corners,
 * vertical = iris position between the upper and lower lid. Relative to the eye, so small head movements matter less.
 */
export function gazeRatios(pts: Pt[]) {
  let h = 0;
  let v = 0;
  for (const e of EYES) {
    const i = pts[e.iris];
    const a = pts[e.c1];
    const b = pts[e.c2];
    const top = (pts[e.top[0]].y + pts[e.top[1]].y) / 2;
    const bottom = (pts[e.bottom[0]].y + pts[e.bottom[1]].y) / 2;
    h += (i.x - a.x) / (b.x - a.x || 1e-6);
    v += (i.y - top) / (bottom - top || 1e-6);
  }
  return { h: h / EYES.length, v: v / EYES.length };
}

/** Five calibration targets on the keyboard (centre, left, right, top, bottom), in 0–1 board coordinates. */
export const GAZE_TARGETS = [
  { x: 0.5, y: 0.5 },
  { x: 0.08, y: 0.5 },
  { x: 0.92, y: 0.5 },
  { x: 0.5, y: 0.1 },
  { x: 0.5, y: 0.9 },
];
export type GazeMap = { hL: number; hR: number; vT: number; vB: number };

/** Build the mapping from the median gaze ratios measured while looking at each target. */
export function gazeMapFrom(samples: { h: number; v: number }[]): GazeMap {
  return { hL: samples[1].h, hR: samples[2].h, vT: samples[3].v, vB: samples[4].v };
}

/** Gaze ratios → pointer in 0–1, by linear interpolation between the calibrated targets (direction comes from calibration). */
export function gazePointer(g: { h: number; v: number }, m: GazeMap) {
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const T = GAZE_TARGETS;
  const u = (g.h - m.hL) / (m.hR - m.hL || 1e-6);
  const w = (g.v - m.vT) / (m.vB - m.vT || 1e-6);
  return { x: clamp(T[1].x + u * (T[2].x - T[1].x)), y: clamp(T[3].y + w * (T[4].y - T[3].y)) };
}

export type Dwell = { key: string | null; since: number; done: boolean };
/** Dwell selection: staying on one key for `ms` selects it once; move to another key to select again. */
export function dwellStep(d: Dwell, t: number, key: string | null, ms: number) {
  if (key !== d.key) return { state: { key, since: t, done: false }, progress: 0, click: false };
  if (!key || d.done) return { state: d, progress: d.done ? 1 : 0, click: false };
  const progress = Math.min(1, (t - d.since) / ms);
  return { state: { ...d, done: progress >= 1 }, progress, click: progress >= 1 };
}

/** Row/column scanning for blink-only use: rows light up in turn; a blink picks the row, then keys light up in turn. */
export type Scan = { level: "row" | "key"; row: number; col: number; last: number };
export function scanStep(s: Scan, t: number, rows: number[], stepMs: number, select: boolean): { state: Scan; pick: { row: number; col: number } | null } {
  if (select) {
    if (s.level === "row") return { state: { level: "key", row: s.row, col: 0, last: t }, pick: null };
    return { state: { level: "row", row: 0, col: 0, last: t }, pick: { row: s.row, col: s.col } };
  }
  if (t - s.last < stepMs) return { state: s, pick: null };
  if (s.level === "row") return { state: { ...s, row: (s.row + 1) % rows.length, last: t }, pick: null };
  // after the last key of a row, go back to row scanning, so a missed row costs one pass
  if (s.col + 1 >= rows[s.row]) return { state: { level: "row", row: s.row, col: 0, last: t }, pick: null };
  return { state: { ...s, col: s.col + 1, last: t }, pick: null };
}

/** Word completion from a frequency-ordered list: the first words that start with what you are typing. */
export function predict(text: string, words: string[], n = 3) {
  const m = text.match(/([a-zA-Z']+)$/);
  const prefix = (m?.[1] ?? "").toLowerCase();
  if (!prefix) return words.slice(0, n);
  return words.filter((w) => w.startsWith(prefix) && w !== prefix).slice(0, n);
}

/** Replace the word being typed with a prediction and add a space. */
export function applyPrediction(text: string, word: string) {
  return text.replace(/([a-zA-Z']*)$/, word) + " ";
}

// Common words, most frequent first (hand-made lists for completion; not a language model)
export const WORDS: Record<"en" | "id", string[]> = {
  en: [
    ...new Set(
      "i you the to and a is it yes no please thank thanks help hello hi water food need want am not my me what where when how can do go come here there now later today tomorrow good bad more stop pain tired hungry thirsty cold hot toilet bathroom bed sleep medicine doctor nurse family friend call phone home work love like okay sorry wait again slowly open close light window door turn up down left right music tv read write name time day night morning evening feel happy sad hurt sick better worse breakfast lunch dinner coffee tea milk juice chair sit stand walk outside inside".split(
        " ",
      ),
    ),
  ],
  id: [
    ...new Set(
      "saya kamu aku ya tidak mau bisa tolong terima kasih halo apa di ke dan yang ini itu mana kapan bagaimana minum makan air butuh ingin sudah belum nanti sekarang hari besok pagi siang sore malam baik sakit capek lapar haus dingin panas kamar mandi tidur obat dokter perawat keluarga teman telepon rumah kerja suka cinta maaf tunggu lagi pelan buka tutup lampu jendela pintu nyala mati atas bawah kiri kanan musik televisi baca tulis nama jam senang sedih lebih kurang sarapan kopi teh susu kursi duduk berdiri jalan luar dalam mama papa ibu bapak adik kakak".split(
        " ",
      ),
    ),
  ],
};
