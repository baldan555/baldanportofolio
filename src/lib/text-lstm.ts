/**
 * Browser copy of the sentiment networks trained in ml/train.py → sentiment().
 * Same tokenizer, int8 embeddings (one scale per word), a BiLSTM read in both directions (Keras gate order i, f, c, o),
 * max over the words, then a softmax sentiment head and, for English, 28 sigmoid emotion heads.
 */
export type Q = { shape: number[]; scale: number[]; q: string };
export type Dir = { units: number; kernel: Q; recurrent: Q; bias: number[] };
export type Head = { w: Q; b: number[] };
export type TextModel = { kind: string; emb: Q; fwd?: Dir; bwd?: Dir; sent: Head; emo?: Head };
export type TextOut = { sent: number[]; emo?: number[] };

// Same pattern as SENT_TOKEN in ml/train.py; `u` so an emoji counts as one character, as in Python.
const TOKEN = /[a-z0-9]+(?:'[a-z]+)?|[^\sa-z0-9]/gu;
export const tokenize = (text: string, maxlen = 100): string[] => (text.replaceAll("’", "'").toLowerCase().match(TOKEN) ?? []).slice(0, maxlen);

function bytes(b64: string): Int8Array {
  const bin = atob(b64);
  const out = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = (bin.charCodeAt(i) << 24) >> 24;
  return out;
}
/** int8 matrix with one scale per column (output unit). */
function perCol(l: Q): Float64Array {
  const q = bytes(l.q);
  const cols = l.shape[1];
  const w = new Float64Array(q.length);
  for (let i = 0; i < q.length; i++) w[i] = q[i] * l.scale[i % cols];
  return w;
}
/** int8 embedding with one scale per row (word). */
function perRow(l: Q): Float64Array {
  const q = bytes(l.q);
  const cols = l.shape[1];
  const w = new Float64Array(q.length);
  for (let i = 0; i < q.length; i++) w[i] = q[i] * l.scale[Math.floor(i / cols)];
  return w;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function createTextNet(m: TextModel, vocab: string[], maxlen = 100) {
  const index = new Map(vocab.map((w, i) => [w, i + 2] as const)); // 0 = padding, 1 = unknown word
  const D = m.emb.shape[1];
  const E = perRow(m.emb);
  const dirs = m.kind === "bilstm" ? [m.fwd!, m.bwd!].map((d) => ({ U: d.units, k: perCol(d.kernel), r: perCol(d.recurrent), b: d.bias })) : [];
  const head = (h: Head) => ({ w: perCol(h.w), b: h.b, n: h.w.shape[1] });
  const sent = head(m.sent);
  const emo = m.emo ? head(m.emo) : null;

  const ids = (tokens: string[]) => (tokens.length ? tokens.map((t) => index.get(t) ?? 1) : [1]);

  function lstm(xs: Float64Array[], d: (typeof dirs)[number]): Float64Array[] {
    const { U, k, r, b } = d;
    const G = 4 * U;
    let h = new Float64Array(U);
    let c = new Float64Array(U);
    const z = new Float64Array(G);
    const out: Float64Array[] = [];
    for (const x of xs) {
      for (let g = 0; g < G; g++) {
        let s = b[g];
        for (let i = 0; i < D; i++) s += x[i] * k[i * G + g];
        for (let j = 0; j < U; j++) s += h[j] * r[j * G + g];
        z[g] = s;
      }
      const hn = new Float64Array(U);
      const cn = new Float64Array(U);
      for (let u = 0; u < U; u++) {
        cn[u] = sigmoid(z[U + u]) * c[u] + sigmoid(z[u]) * Math.tanh(z[2 * U + u]);
        hn[u] = sigmoid(z[3 * U + u]) * Math.tanh(cn[u]);
      }
      h = hn;
      c = cn;
      out.push(h);
    }
    return out;
  }

  function dense(hv: Float64Array, hd: { w: Float64Array; b: number[]; n: number }) {
    const z = hd.b.slice();
    for (let j = 0; j < hv.length; j++) for (let c = 0; c < hd.n; c++) z[c] += hv[j] * hd.w[j * hd.n + c];
    return z;
  }

  /** Forward pass on one unpadded sentence, exactly as the NumPy reference in ml/train.py. */
  function run(seq: number[]): TextOut {
    const xs = seq.slice(0, maxlen).map((id) => E.subarray(id * D, id * D + D));
    let hv: Float64Array;
    if (m.kind === "bilstm") {
      const f = lstm(xs, dirs[0]);
      const bw = lstm([...xs].reverse(), dirs[1]).reverse();
      const U = dirs[0].U;
      hv = new Float64Array(2 * U).fill(-Infinity);
      for (let t = 0; t < xs.length; t++)
        for (let u = 0; u < U; u++) {
          hv[u] = Math.max(hv[u], f[t][u]);
          hv[U + u] = Math.max(hv[U + u], bw[t][u]);
        }
    } else {
      hv = new Float64Array(D);
      for (const x of xs) for (let i = 0; i < D; i++) hv[i] += x[i] / xs.length;
    }
    const zs = dense(hv, sent);
    const mx = Math.max(...zs);
    const ex = zs.map((v) => Math.exp(v - mx));
    const sum = ex.reduce((a, v) => a + v, 0);
    return { sent: ex.map((v) => v / sum), emo: emo ? dense(hv, emo).map(sigmoid) : undefined };
  }

  /** How much each word moves the predicted class: probability with the word minus probability without it. */
  function explain(seq: number[], cls: number): number[] {
    if (seq.length < 2) return seq.map(() => 0);
    const full = run(seq).sent[cls];
    return seq.map((_, i) => full - run(seq.filter((__, j) => j !== i)).sent[cls]);
  }

  /** The BiLSTM pass of run(), keeping each word's embedding and both directions' states, and which word set each pooled unit. */
  function trace(seq: number[]) {
    const xs = seq.slice(0, maxlen).map((id) => E.subarray(id * D, id * D + D));
    const f = lstm(xs, dirs[0]);
    const bw = lstm([...xs].reverse(), dirs[1]).reverse();
    const U = dirs[0].U;
    const pooled = new Float64Array(2 * U).fill(-Infinity);
    const from = new Array<number>(2 * U).fill(0);
    for (let t = 0; t < xs.length; t++)
      for (let u = 0; u < U; u++) {
        if (f[t][u] > pooled[u]) [pooled[u], from[u]] = [f[t][u], t];
        if (bw[t][u] > pooled[U + u]) [pooled[U + u], from[U + u]] = [bw[t][u], t];
      }
    return { emb: xs, fwd: f, bwd: bw, pooled, from };
  }

  return { ids, run, explain, trace: m.kind === "bilstm" ? trace : null, known: (t: string) => index.has(t) };
}

/* ------------------------------------------------------------------ language guess for the "Auto" switch */

const ID_WORDS = new Set(
  "yang dan di ke dari ini itu tidak tak gak nggak enggak ga dengan untuk saya aku kamu kami kita nya juga sudah udah belum sangat banget tapi tetapi karena kalau jadi bisa ada akan lagi aja saja makanan tempat harga enak pelayanan bagus mantap kecewa buruk murah mahal".split(
    " ",
  ),
);
const EN_WORDS = new Set(
  "the and is are was were to of it this that you i my me we they not no but so very have has had for with be on in at just what if do does did don't can't it's i'm good bad love great really".split(
    " ",
  ),
);

export function guessLanguage(tokens: string[]): "id" | "en" | null {
  let id = 0;
  let en = 0;
  for (const t of tokens) {
    if (ID_WORDS.has(t)) id++;
    if (EN_WORDS.has(t)) en++;
  }
  if (id === en) return null;
  return id > en ? "id" : "en";
}
