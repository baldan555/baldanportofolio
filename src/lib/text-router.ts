/**
 * Browser copy of the trained text router (ml/train.py → complaints()).
 * Mirrors scikit-learn exactly: char_wb n-grams → counts → 1 + ln(tf) → × idf → L2 norm → int8 logistic weights.
 */
export type RouterModel = {
  ngram: number[];
  vocab: string[];
  idf: number[];
  classes: string[];
  team: number[];
  scale: number[];
  b: number[];
  /** int8 weights, row-major [class][n-gram], base64 */
  q: string;
};

export type RouterOutput = {
  probs: number[];
  /** class indices, most likely first */
  order: number[];
  /** each typed word and how much it pushed towards `explained` (positive) or away (negative) */
  words: { word: string; weight: number }[];
  explained: number;
  /** n-grams in the text, and how many the model knows */
  grams: number;
  known: number;
};

function decodeInt8(b64: string): Int8Array {
  const bin = atob(b64);
  const out = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = (bin.charCodeAt(i) << 24) >> 24;
  return out;
}

/** scikit-learn's char_wb analyzer: lowercase, split on whitespace, pad each word with spaces, n-grams inside the word. */
export function charWbNgrams(text: string, min: number, max: number): { word: string; grams: string[] }[] {
  const words = text.toLowerCase().replace(/\s\s+/g, " ").split(/\s+/).filter(Boolean);
  return words.map((w) => {
    const c = Array.from(` ${w} `);
    const grams: string[] = [];
    for (let n = min; n <= max; n++) {
      let offset = 0;
      grams.push(c.slice(0, n).join(""));
      while (offset + n < c.length) {
        offset++;
        grams.push(c.slice(offset, offset + n).join(""));
      }
      if (offset === 0) break; // a short word is counted once
    }
    return { word: w, grams };
  });
}

export function createRouter(m: RouterModel) {
  const index = new Map(m.vocab.map((g, i) => [g, i]));
  const q = decodeInt8(m.q);
  const V = m.vocab.length;
  const K = m.classes.length;
  const weight = (k: number, j: number) => q[k * V + j] * m.scale[k];

  return function predict(text: string, explain?: number): RouterOutput {
    const words = charWbNgrams(text, m.ngram[0], m.ngram[1]);
    const counts = new Map<number, number>();
    let grams = 0;
    for (const w of words)
      for (const g of w.grams) {
        grams++;
        const j = index.get(g);
        if (j !== undefined) counts.set(j, (counts.get(j) ?? 0) + 1);
      }

    const x = new Map<number, number>();
    let norm = 0;
    for (const [j, c] of counts) {
      const v = (1 + Math.log(c)) * m.idf[j];
      x.set(j, v);
      norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [j, v] of x) x.set(j, v / norm);

    const logits = new Array<number>(K);
    for (let k = 0; k < K; k++) {
      let s = 0;
      for (const [j, v] of x) s += v * weight(k, j);
      logits[k] = s + m.b[k];
    }
    const top = Math.max(...logits);
    const e = logits.map((l) => Math.exp(l - top));
    const sum = e.reduce((a, b) => a + b, 0);
    const probs = e.map((v) => v / sum);
    const order = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);

    // split each n-gram's contribution evenly over its occurrences, then add it up per word
    const c = explain ?? order[0];
    const wordsOut = words.map((w) => {
      let s = 0;
      for (const g of w.grams) {
        const j = index.get(g);
        if (j !== undefined) s += (x.get(j)! * weight(c, j)) / counts.get(j)!;
      }
      return { word: w.word, weight: s };
    });

    return { probs, order, words: wordsOut, explained: c, grams, known: [...counts.values()].reduce((a, b) => a + b, 0) };
  };
}
