/**
 * Browser copies of the CNNs trained in ml/train.py (mnist(), rps()).
 * Keras layout (NHWC, kernels [kh, kw, cin, cout]), int8 weights with one scale per output unit.
 */
export type QLayer = { shape: number[]; scale: number[]; b: number[]; q: string };
export type DigitCnn = { conv1: QLayer; conv2: QLayer; dense1: QLayer; out: QLayer };
export type Tensor = { data: Float64Array; h: number; w: number; c: number };

export function dequant(l: QLayer): Float64Array {
  const bin = atob(l.q);
  const out = l.shape[l.shape.length - 1];
  const w = new Float64Array(bin.length);
  for (let i = 0; i < bin.length; i++) w[i] = ((bin.charCodeAt(i) << 24) >> 24) * l.scale[i % out];
  return w;
}

/** Valid 3×3 convolution, stride 1, then ReLU. */
function conv(x: Tensor, w: Float64Array, b: number[], cout: number): Tensor {
  const H = x.h - 2;
  const W = x.w - 2;
  const C = x.c;
  const out = new Float64Array(H * W * cout);
  for (let y = 0; y < H; y++)
    for (let xx = 0; xx < W; xx++)
      for (let co = 0; co < cout; co++) {
        let s = 0;
        for (let i = 0; i < 3; i++)
          for (let j = 0; j < 3; j++) {
            let t = 0;
            const base = ((y + i) * x.w + (xx + j)) * C;
            const wb = (i * 3 + j) * C;
            for (let ci = 0; ci < C; ci++) t += x.data[base + ci] * w[(wb + ci) * cout + co];
            s += t;
          }
        out[(y * W + xx) * cout + co] = Math.max(0, s + b[co]);
      }
  return { data: out, h: H, w: W, c: cout };
}

/** "Same" 3×3 convolution (zero padding of 1), stride 1, then ReLU: output keeps the input's height and width. */
export function convSame(x: Tensor, w: Float64Array, b: number[], cout: number): Tensor {
  const H = x.h;
  const W = x.w;
  const C = x.c;
  const out = new Float64Array(H * W * cout);
  for (let y = 0; y < H; y++)
    for (let xx = 0; xx < W; xx++)
      for (let co = 0; co < cout; co++) {
        let s = 0;
        for (let i = 0; i < 3; i++) {
          const yy = y + i - 1;
          for (let j = 0; j < 3; j++) {
            const xj = xx + j - 1;
            let t = 0;
            if (yy >= 0 && yy < H && xj >= 0 && xj < W) {
              const base = (yy * W + xj) * C;
              const wb = (i * 3 + j) * C;
              for (let ci = 0; ci < C; ci++) t += x.data[base + ci] * w[(wb + ci) * cout + co];
            }
            s += t;
          }
        }
        out[(y * W + xx) * cout + co] = Math.max(0, s + b[co]);
      }
  return { data: out, h: H, w: W, c: cout };
}

/** 2×2 max-pool, stride 2 (odd edges dropped, as in Keras). */
export function pool(x: Tensor): Tensor {
  const H = Math.floor(x.h / 2);
  const W = Math.floor(x.w / 2);
  const out = new Float64Array(H * W * x.c);
  for (let y = 0; y < H; y++)
    for (let xx = 0; xx < W; xx++)
      for (let c = 0; c < x.c; c++) {
        let m = -Infinity;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) m = Math.max(m, x.data[((2 * y + i) * x.w + 2 * xx + j) * x.c + c]);
        out[(y * W + xx) * x.c + c] = m;
      }
  return { data: out, h: H, w: W, c: x.c };
}

export function dense(x: Float64Array, w: Float64Array, b: number[], nout: number, relu: boolean): Float64Array {
  const out = new Float64Array(nout);
  for (let o = 0; o < nout; o++) {
    let s = 0;
    for (let i = 0; i < x.length; i++) s += x[i] * w[i * nout + o];
    out[o] = relu ? Math.max(0, s + b[o]) : s + b[o];
  }
  return out;
}

export function createDigitNet(m: DigitCnn) {
  const W1 = dequant(m.conv1);
  const W2 = dequant(m.conv2);
  const W3 = dequant(m.dense1);
  const W4 = dequant(m.out);
  const c1 = m.conv1.shape[3];
  const c2 = m.conv2.shape[3];
  const d1 = m.dense1.shape[1];
  const d2 = m.out.shape[1];

  /** `pixels`: 784 values in 0–1, row by row. Returns class probabilities and every intermediate activation. */
  function run(pixels: ArrayLike<number>) {
    const input: Tensor = { data: Float64Array.from(pixels), h: 28, w: 28, c: 1 };
    const a1 = conv(input, W1, m.conv1.b, c1);
    const p1 = pool(a1);
    const a2 = conv(p1, W2, m.conv2.b, c2);
    const p2 = pool(a2);
    const h = dense(p2.data, W3, m.dense1.b, d1, true);
    const logits = dense(h, W4, m.out.b, d2, false);
    const top = Math.max(...logits);
    const e = Array.from(logits, (v) => Math.exp(v - top));
    const sum = e.reduce((s, v) => s + v, 0);
    return { probs: e.map((v) => v / sum), logits: Array.from(logits), conv1: a1, pool1: p1, conv2: a2, pool2: p2, hidden: h };
  }
  /** Dequantised weights, for explaining which connections carried a prediction. */
  return Object.assign(run, { weights: { conv2: W2, dense1: W3, out: W4 }, dims: { c1, c2, d1, d2 } });
}

export type DigitNet = ReturnType<typeof createDigitNet>;
export type DigitRun = ReturnType<DigitNet>;

/** Decode a base64 28×28 uint8 image into 0–1 floats (rounded to float32, exactly as the Python side feeds the network). */
export function decodeImage(b64: string): Float64Array {
  const bin = atob(b64);
  const out = new Float64Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = Math.fround(bin.charCodeAt(i) / 255);
  return out;
}

/* ------------------------------------------------------------------ */
/* Hand-gesture CNN: 4 same-padded conv blocks → global average pool → 3 classes */
/* ------------------------------------------------------------------ */
export type GestureCnn = { conv1: QLayer; conv2: QLayer; conv3: QLayer; conv4: QLayer; out: QLayer };

export function createGestureNet(m: GestureCnn) {
  const W = { c1: dequant(m.conv1), c2: dequant(m.conv2), c3: dequant(m.conv3), c4: dequant(m.conv4), out: dequant(m.out) };
  const ch = [m.conv1.shape[3], m.conv2.shape[3], m.conv3.shape[3], m.conv4.shape[3]];
  const K = m.out.shape[1];

  /** `pixels`: size×size×3 values in 0–1 (RGB, row by row). Returns probabilities, feature maps and class activation maps. */
  return function run(pixels: ArrayLike<number>, size: number) {
    const input: Tensor = { data: Float64Array.from(pixels), h: size, w: size, c: 3 };
    const a1 = convSame(input, W.c1, m.conv1.b, ch[0]);
    const a2 = convSame(pool(a1), W.c2, m.conv2.b, ch[1]);
    const a3 = convSame(pool(a2), W.c3, m.conv3.b, ch[2]);
    const a4 = convSame(pool(a3), W.c4, m.conv4.b, ch[3]);
    const n = a4.h * a4.w;
    const gap = new Float64Array(ch[3]);
    for (let c = 0; c < ch[3]; c++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += a4.data[i * ch[3] + c];
      gap[c] = s / n;
    }
    const logits = dense(gap, W.out, m.out.b, K, false);
    const top = Math.max(...logits);
    const e = Array.from(logits, (v) => Math.exp(v - top));
    const sum = e.reduce((s, v) => s + v, 0);
    /** Class activation map for class k: how much each location of the last feature maps votes for k. */
    const cam = (k: number) => {
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let c = 0; c < ch[3]; c++) s += a4.data[i * ch[3] + c] * W.out[c * K + k];
        out[i] = s;
      }
      return { data: out, h: a4.h, w: a4.w };
    };
    return { probs: e.map((v) => v / sum), logits: Array.from(logits), conv1: a1, conv4: a4, cam };
  };
}

/** Decode a base64 uint8 RGB image into 0–1 floats rounded to float32 (as Python feeds the network). */
export const decodeRgb = decodeImage;
