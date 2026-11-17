/**
 * Hand → cursor for the Virtual Mouse demo, from MediaPipe's 21 hand landmarks (normalised 0–1).
 * The cursor is the midpoint of the thumb and index fingertips (it barely moves while pinching, so clicks land where
 * you aim), smoothed with a One Euro filter; a pinch is the fingertip gap relative to the hand's size, with hysteresis.
 */
export type P = { x: number; y: number };
export const THUMB_TIP = 4;
export const INDEX_TIP = 8;
export const WRIST = 0;
export const MIDDLE_MCP = 9;

const d = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

/** Fingertip gap over palm length: about 0 when pinched, 0.6+ when the hand is open; independent of distance to camera. */
export const pinchRatio = (lm: P[]) => d(lm[THUMB_TIP], lm[INDEX_TIP]) / Math.max(1e-6, d(lm[WRIST], lm[MIDDLE_MCP]));

/** Mirrored (selfie) cursor point in 0–1 frame coordinates. */
export const cursorPoint = (lm: P[]): P => ({ x: 1 - (lm[THUMB_TIP].x + lm[INDEX_TIP].x) / 2, y: (lm[THUMB_TIP].y + lm[INDEX_TIP].y) / 2 });

/** Map the comfortable middle of the camera frame to the whole target area, so you don't have to reach the edges. */
export const BOX = { x0: 0.2, x1: 0.8, y0: 0.15, y1: 0.75 };
export function toArea(p: P, w: number, h: number, box = BOX): P {
  const u = Math.max(0, Math.min(1, (p.x - box.x0) / (box.x1 - box.x0)));
  const v = Math.max(0, Math.min(1, (p.y - box.y0) / (box.y1 - box.y0)));
  return { x: u * w, y: v * h };
}

/** Pinch with hysteresis: closes below `down`, opens only above `up`, so it doesn't flicker at the boundary. */
export const PINCH = { down: 0.28, up: 0.42 };
export function nextPinch(pinched: boolean, ratio: number) {
  return pinched ? ratio < PINCH.up : ratio < PINCH.down;
}

/**
 * One Euro filter (Casiez, Roussel & Vogel, 2012): smooths hard when the hand is still (no jitter)
 * and lightly when it moves fast (no lag). One instance per axis.
 */
export class OneEuro {
  private x: number | null = null;
  private dx = 0;
  private t: number | null = null;
  constructor(
    private minCutoff = 1.2,
    private beta = 0.02,
    private dCutoff = 1,
  ) {}
  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  filter(value: number, tMs: number) {
    if (this.x === null || this.t === null) {
      this.x = value;
      this.t = tMs;
      return value;
    }
    const dt = Math.max(1e-3, (tMs - this.t) / 1000);
    this.t = tMs;
    const rawDx = (value - this.x) / dt;
    this.dx += this.alpha(this.dCutoff, dt) * (rawDx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += this.alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
  reset() {
    this.x = null;
    this.t = null;
    this.dx = 0;
  }
}
