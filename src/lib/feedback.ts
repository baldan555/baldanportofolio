/**
 * Browser copy of ml/train.py → feedback(): NMF theme mix and the "would not recommend" model.
 * Both mirror scikit-learn's tokenisers exactly (ASCII \w, lowercase), so results match Python.
 */
export type ThemeModel = { vocab: string[]; idf: number[]; scale: number[]; w: string; iters: number };
export type SentimentModel = { vocab: string[]; idf: number[]; scale: number; q: string; b: number };

function decode(b64: string, signed: boolean): Float64Array {
  const bin = atob(b64);
  const out = new Float64Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    const v = bin.charCodeAt(i);
    out[i] = signed ? (v << 24) >> 24 : v;
  }
  return out;
}

/** Theme weights for one text: TF-IDF, then non-negative least squares by multiplicative updates against fixed themes. */
export function createThemer(m: ThemeModel) {
  const index = new Map(m.vocab.map((t, i) => [t, i]));
  const V = m.vocab.length;
  const K = m.scale.length;
  const raw = decode(m.w, false);
  const W = Array.from({ length: K }, (_, k) => Float64Array.from({ length: V }, (_, j) => raw[k * V + j] * m.scale[k]));
  const WWt = W.map((a) => W.map((b) => a.reduce((s, v, j) => s + v * b[j], 0)));

  return function mix(text: string) {
    const counts = new Map<number, number>();
    for (const t of text.toLowerCase().match(/\b[a-z][a-z]+\b/g) ?? []) {
      const j = index.get(t);
      if (j !== undefined) counts.set(j, (counts.get(j) ?? 0) + 1);
    }
    let norm = 0;
    const x = new Map<number, number>();
    for (const [j, c] of counts) {
      const v = c * m.idf[j];
      x.set(j, v);
      norm += v * v;
    }
    norm = Math.sqrt(norm);
    const h = new Array<number>(K).fill(0);
    if (norm === 0) return { h, words: [] as string[] };
    const wx = W.map((row) => {
      let s = 0;
      for (const [j, v] of x) s += row[j] * v;
      return s / norm;
    });
    h.fill(0.1);
    for (let it = 0; it < m.iters; it++) {
      const den = WWt.map((r) => r.reduce((s, v, k) => s + v * h[k], 0) + 1e-9);
      for (let k = 0; k < K; k++) h[k] = (h[k] * wx[k]) / den[k];
    }
    return { h, words: [...counts.keys()].map((j) => m.vocab[j]) };
  };
}

export type Token = { text: string; start: number; end: number; weight: number };

/** Probability the reviewer would NOT recommend, plus each word's push (positive = towards "not recommend"). */
export function createSentiment(m: SentimentModel) {
  const index = new Map(m.vocab.map((t, i) => [t, i]));
  const q = decode(m.q, true);

  return function score(text: string) {
    const lower = text.toLowerCase();
    const toks = [...lower.matchAll(/\b\w\w+\b/g)].map((mt) => ({ t: mt[0], start: mt.index!, end: mt.index! + mt[0].length }));
    const grams: { j: number; owners: number[] }[] = [];
    toks.forEach((tk, i) => {
      const j = index.get(tk.t);
      if (j !== undefined) grams.push({ j, owners: [i] });
      if (i + 1 < toks.length) {
        const j2 = index.get(`${tk.t} ${toks[i + 1].t}`);
        if (j2 !== undefined) grams.push({ j: j2, owners: [i, i + 1] });
      }
    });
    const counts = new Map<number, number>();
    for (const g of grams) counts.set(g.j, (counts.get(g.j) ?? 0) + 1);
    let norm = 0;
    const x = new Map<number, number>();
    for (const [j, c] of counts) {
      const v = (1 + Math.log(c)) * m.idf[j];
      x.set(j, v);
      norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    let z = 0;
    for (const [j, v] of x) z += (v * q[j] * m.scale) / norm;
    z += m.b;
    const p = 1 / (1 + Math.exp(-z));

    // each n-gram occurrence gets its share of the n-gram's contribution, split over the words it spans
    const weights = new Array<number>(toks.length).fill(0);
    for (const g of grams) {
      const contrib = (x.get(g.j)! * q[g.j] * m.scale) / norm / counts.get(g.j)!;
      for (const o of g.owners) weights[o] += contrib / g.owners.length;
    }
    const tokens: Token[] = toks.map((tk, i) => ({ text: text.slice(tk.start, tk.end), start: tk.start, end: tk.end, weight: weights[i] }));
    return { p, tokens, sameLength: lower.length === text.length };
  };
}
