/**
 * ASL fingerspelling from MediaPipe's 21 hand landmarks: the browser copy of ml/train.py → asl().
 * Normalise exactly as in training (wrist at the origin, divided by palm length), then a small dense network.
 */
export type Layer = { shape: number[]; w: number[]; b: number[] };
export type SignModel = { d1: Layer; d2: Layer; out: Layer };
export type Pt = { x: number; y: number; z: number };

/**
 * 21 points → 63 numbers: wrist moved to (0, 0, 0), everything divided by the wrist-to-middle-knuckle length (x, y only).
 * `xScale` puts x in the training data's units: landmarks are divided by the frame's width, so a 4:3 webcam gives wider
 * hands than the widescreen camera the data came from; pass (videoWidth / videoHeight) / dataAspect. Training uses 1.
 */
export function normalise(pts: Pt[], xScale = 1): number[] {
  const o = pts[0];
  const palm = Math.max(1e-6, Math.hypot((pts[9].x - o.x) * xScale, pts[9].y - o.y));
  return pts.flatMap((p) => [((p.x - o.x) * xScale) / palm, (p.y - o.y) / palm, (p.z - o.z) / palm]);
}

function dense(x: number[], l: Layer, relu: boolean) {
  const [nin, nout] = l.shape;
  const out = l.b.slice();
  for (let i = 0; i < nin; i++) {
    const xi = x[i];
    if (!xi) continue;
    for (let j = 0; j < nout; j++) out[j] += xi * l.w[i * nout + j];
  }
  return relu ? out.map((v) => Math.max(0, v)) : out;
}

/** Logits for every letter, exactly as the NumPy reference in ml/train.py. */
export function signLogits(m: SignModel, features: number[]) {
  return dense(dense(dense(features, m.d1, true), m.d2, true), m.out, false);
}

export function softmax(z: number[]) {
  const mx = Math.max(...z);
  const e = z.map((v) => Math.exp(v - mx));
  const s = e.reduce((a, v) => a + v, 0);
  return e.map((v) => v / s);
}

/** Majority letter over recent frames, with its share; used to type a letter only once it is held steady. */
export function steady(history: number[]): { k: number; share: number } {
  const counts = new Map<number, number>();
  for (const k of history) counts.set(k, (counts.get(k) ?? 0) + 1);
  let best = -1;
  let n = 0;
  for (const [k, c] of counts) if (c > n) [best, n] = [k, c];
  return { k: best, share: history.length ? n / history.length : 0 };
}
