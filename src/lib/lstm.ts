/**
 * Browser copy of the Keras LSTM forecasters (ml/train.py → live_forecasts()).
 * Keras layout: kernel [inputDim, 4·units], recurrent [units, 4·units], bias [4·units], gate order i, f, c, o,
 * sigmoid gates and tanh cell. The last hidden state goes through one Dense layer that outputs every horizon step.
 */
export type LstmModel = {
  units: number;
  inputDim: number;
  horizon: number;
  kernel: number[];
  recurrent: number[];
  bias: number[];
  dense: { w: number[]; b: number[] };
};

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** `seq`: timesteps × features. Returns `horizon` outputs (the model's own scale; callers turn them into values). */
export function lstmRun(m: LstmModel, seq: number[][]): number[] {
  const U = m.units;
  const G = 4 * U;
  let h = new Array<number>(U).fill(0);
  let c = new Array<number>(U).fill(0);
  const z = new Array<number>(G);
  for (const x of seq) {
    for (let g = 0; g < G; g++) {
      let s = 0;
      for (let i = 0; i < m.inputDim; i++) s += x[i] * m.kernel[i * G + g];
      let r = 0;
      for (let j = 0; j < U; j++) r += h[j] * m.recurrent[j * G + g];
      z[g] = s + r + m.bias[g];
    }
    const hn = new Array<number>(U);
    const cn = new Array<number>(U);
    for (let u = 0; u < U; u++) {
      const ig = sigmoid(z[u]);
      const fg = sigmoid(z[U + u]);
      const cc = Math.tanh(z[2 * U + u]);
      const og = sigmoid(z[3 * U + u]);
      cn[u] = fg * c[u] + ig * cc;
      hn[u] = og * Math.tanh(cn[u]);
    }
    h = hn;
    c = cn;
  }
  const out = new Array<number>(m.horizon);
  for (let k = 0; k < m.horizon; k++) {
    let s = m.dense.b[k];
    for (let u = 0; u < U; u++) s += h[u] * m.dense.w[u * m.horizon + k];
    out[k] = s;
  }
  return out;
}
