// Runs a logistic-regression model exported by ml/train.py (StandardScaler + OneHot + LR).

export type LogRegModel = {
  intercept: number;
  numeric: Record<string, { mean: number; scale: number; coef: number }>;
  categorical: Record<string, Record<string, number>>;
};

export type Contribution = { feature: string; value: string; effect: number };

export function predict(model: LogRegModel, input: Record<string, number | string>) {
  const contributions: Contribution[] = [];
  let logit = model.intercept;

  for (const [f, p] of Object.entries(model.numeric)) {
    const x = Number(input[f]);
    const effect = p.coef * ((x - p.mean) / p.scale);
    logit += effect;
    contributions.push({ feature: f, value: String(x), effect });
  }
  for (const [f, cats] of Object.entries(model.categorical)) {
    const v = String(input[f]);
    const effect = cats[v] ?? 0;
    logit += effect;
    contributions.push({ feature: f, value: v, effect });
  }

  const probability = 1 / (1 + Math.exp(-logit));
  return { probability, logit, contributions: contributions.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)) };
}
