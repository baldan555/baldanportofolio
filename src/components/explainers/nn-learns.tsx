"use client";

import { motion } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";
import { InsideSection, Scrolly, type Step } from "./scrolly";

/*
 * "How a neural network learns", trained live: four tanh neurons learn Jakarta's typical PM2.5 for each hour of the
 * day (real medians), by backpropagation with Adam. Training runs in the browser after the page loads.
 */

const HID = 4;
const EPOCHS = 2000;
const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6"];
const UP = "#eb6834";
const BLUE = "#2a78d6";
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
const r1 = (v: number) => Math.round(v * 10) / 10;

type Net = { w: number[]; b: number[]; v: number[]; c: number };
type Frame = { epoch: number; net: Net; loss: number };
const xOf = (h: number) => (h - 11.5) / 6.92; // hour → input scaled to roughly −1.7…1.7
const neuron = (n: Net, j: number, x: number) => n.v[j] * Math.tanh(n.w[j] * x + n.b[j]);
const out = (n: Net, x: number) => n.c + n.w.reduce((s, _, j) => s + neuron(n, j, x), 0);

/** Backpropagation with Adam on the 24 hourly values (scaled). Keeps snapshots for the animation. */
export function train(y: number[]): { frames: Frame[]; my: number; sy: number } {
  const N = y.length;
  const my = y.reduce((a, b) => a + b, 0) / N;
  const sy = Math.sqrt(y.reduce((a, b) => a + (b - my) ** 2, 0) / N);
  const ys = y.map((v) => (v - my) / sy);
  const xs = y.map((_, h) => xOf(h));
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1; // fixed start, same every visit
  const n: Net = { w: Array.from({ length: HID }, () => rnd() * 2), b: Array.from({ length: HID }, () => rnd()), v: Array.from({ length: HID }, () => rnd() * 0.5), c: 0 };
  const loss = () => xs.reduce((s, x, i) => s + (out(n, x) - ys[i]) ** 2, 0) / N;
  const keys = ["w", "b", "v"] as const;
  const m = { w: Array(HID).fill(0), b: Array(HID).fill(0), v: Array(HID).fill(0) };
  const v2 = { w: Array(HID).fill(0), b: Array(HID).fill(0), v: Array(HID).fill(0) };
  let mc = 0;
  let vc = 0;
  const lr = 0.03;
  const snap = new Set([0, ...Array.from({ length: 70 }, (_, k) => Math.round(Math.exp((k / 69) * Math.log(EPOCHS))))]);
  const frames: Frame[] = [{ epoch: 0, net: structuredClone(n), loss: loss() }];
  for (let t = 1; t <= EPOCHS; t++) {
    const g = { w: Array(HID).fill(0), b: Array(HID).fill(0), v: Array(HID).fill(0) };
    let gc = 0;
    xs.forEach((x, i) => {
      const e = (2 / N) * (out(n, x) - ys[i]); // the output's error…
      gc += e;
      for (let j = 0; j < HID; j++) {
        const a = Math.tanh(n.w[j] * x + n.b[j]);
        g.v[j] += e * a;
        const back = e * n.v[j] * (1 - a * a); // …passed back through the output weight and the neuron's slope
        g.w[j] += back * x;
        g.b[j] += back;
      }
    });
    for (const k of keys)
      for (let j = 0; j < HID; j++) {
        m[k][j] = 0.9 * m[k][j] + 0.1 * g[k][j];
        v2[k][j] = 0.999 * v2[k][j] + 0.001 * g[k][j] ** 2;
        n[k][j] -= (lr * (m[k][j] / (1 - 0.9 ** t))) / (Math.sqrt(v2[k][j] / (1 - 0.999 ** t)) + 1e-8);
      }
    mc = 0.9 * mc + 0.1 * gc;
    vc = 0.999 * vc + 0.001 * gc ** 2;
    n.c -= (lr * (mc / (1 - 0.9 ** t))) / (Math.sqrt(vc / (1 - 0.999 ** t)) + 1e-8);
    if (snap.has(t)) frames.push({ epoch: t, net: structuredClone(n), loss: loss() });
  }
  return { frames, my, sy };
}

const W = 640;
const H = 440;
const X0 = 60;
const X1 = 610;

export function Visual({ step, byHour, week, run }: { step: number; byHour: number[]; week: { time: string[]; value: number[] }; run: ReturnType<typeof train> | null }) {
  const [k, setK] = useState(0); // animation frame for steps 3 and 6
  const clip = `nnclip${useId().replace(/:/g, "")}`;
  useEffect(() => {
    if (step !== 2 && step !== 5) return;
    let i = 0;
    const len = step === 2 ? 60 : (run?.frames.length ?? 1) + 12;
    const id = setInterval(
      () => {
        i = (i + 1) % len;
        setK(i);
      },
      step === 2 ? 70 : 110,
    );
    return () => clearInterval(id);
  }, [step, run]);

  const weekView = step === 6;
  const lo = weekView ? 0 : 25;
  const hi = weekView ? Math.max(...week.value) * 1.05 : 75;
  const x = (h: number) => r1(X0 + (h / 23) * (X1 - X0));
  const y = (v: number) => r1(395 - ((v - lo) / (hi - lo)) * 345);
  // the straight line from least squares (what the Machine Learning page's recipe gives)
  const mean = byHour.reduce((a, b) => a + b, 0) / 24;
  const sxy = byHour.reduce((s, v, h) => s + (h - 11.5) * (v - mean), 0);
  const sxx = byHour.reduce((s, _, h) => s + (h - 11.5) ** 2, 0);
  const lw = sxy / sxx;
  const lb = mean - lw * 11.5;
  const lineMae = byHour.reduce((s, v, h) => s + Math.abs(lw * h + lb - v), 0) / 24;

  const frames = run?.frames ?? [];
  const fr = step < 4 ? frames[frames.length - 1] : step === 4 ? frames[0] : step === 5 ? frames[Math.min(k, frames.length - 1)] : frames[frames.length - 1];
  const toV = (s: number) => (run ? s * run.sy + run.my : s);
  const hours = Array.from({ length: 47 }, (_, i) => i / 2);
  const curve = (f: (h: number) => number) => hours.map((h, i) => `${i ? "L" : "M"}${x(h)},${y(f(h))}`).join(" ");
  const netMae = fr ? byHour.reduce((s, v, h) => s + Math.abs(toV(out(fr.net, xOf(h))) - v), 0) / 24 : 0;
  const hrs = week.time.map((t) => Number(t.slice(11, 13)));
  const weekMae = (f: (h: number) => number) => week.value.reduce((s, v, i) => s + Math.abs(f(hrs[i]) - v), 0) / week.value.length;

  // step 3: one neuron's S-curve, steepness and position changing
  const demoW = 1 + 2.5 * Math.abs(Math.sin((k / 60) * Math.PI));
  const demoS = Math.sin((k / 60) * 2 * Math.PI) * 6 + 11.5;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="A small neural network learning the daily rhythm of air pollution">
      {/* axes */}
      <line x1={X0} x2={X1} y1={395} y2={395} stroke="rgba(11,11,11,0.25)" />
      {[0, 6, 12, 18, 23].map((h) => (
        <text key={h} x={x(h)} y={412} fontSize={10} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          {String(h).padStart(2, "0")}:00
        </text>
      ))}
      <text x={X0} y={34} fontSize={10.5} fontFamily={MONO} fill={MUTED}>
        {weekView ? "LAST WEEK, HOUR BY HOUR (µg/m³)" : "TYPICAL PM2.5 IN JAKARTA BY HOUR OF DAY (µg/m³)"}
      </text>
      {[lo, (lo + hi) / 2, hi].map((v) => (
        <text key={v} x={X0 - 8} y={y(v) + 3} fontSize={10} fontFamily={MONO} textAnchor="end" fill={MUTED}>
          {Math.round(v)}
        </text>
      ))}

      {/* the week's real hours */}
      {weekView && week.value.map((v, i) => <circle key={i} cx={x(hrs[i])} cy={y(v)} r={2.4} fill="rgba(11,11,11,0.3)" />)}

      {/* the 24 typical values */}
      {!weekView && byHour.map((v, h) => <circle key={h} cx={x(h)} cy={y(v)} r={5} fill={INK} />)}

      {/* straight line */}
      <motion.g initial={false} animate={{ opacity: step === 1 || weekView ? 1 : 0 }} transition={tr}>
        <line x1={x(0)} y1={y(lb)} x2={x(23)} y2={y(lw * 23 + lb)} stroke={MUTED} strokeWidth={2.5} strokeDasharray="7 5" />
        {step === 1 && byHour.map((v, h) => <line key={h} x1={x(h)} x2={x(h)} y1={y(v)} y2={y(lw * h + lb)} stroke={UP} strokeWidth={1.5} opacity={0.6} />)}
        {step === 1 && (
          <text x={X1} y={60} fontSize={12.5} fontFamily={FONT} textAnchor="end" fill={INK}>
            straight line: average miss{" "}
            <tspan fill={UP} fontWeight={700}>
              {lineMae.toFixed(1)} µg/m³
            </tspan>
          </text>
        )}
      </motion.g>

      {/* one neuron */}
      {step === 2 && (
        <g>
          <path d={curve((h) => 50 + 18 * Math.tanh(demoW * xOf(h) - demoW * xOf(demoS)))} fill="none" stroke={BLUE} strokeWidth={3.5} />
          <text x={X1} y={60} fontSize={12.5} fontFamily={MONO} textAnchor="end" fill={BLUE}>
            weight {demoW.toFixed(1)} (steepness) · bend at {Math.round(demoS)}:00 (bias)
          </text>
        </g>
      )}

      {/* the network: each neuron's part, and their sum */}
      {fr && step >= 3 && step <= 5 && (
        <g>
          <clipPath id={clip}>
            <rect x={X0} y={44} width={X1 - X0} height={351} />
          </clipPath>
          <g clipPath={`url(#${clip})`}>
            {fr.net.w.map((_, j) => (
              <path key={j} d={curve((h) => toV(fr.net.c + neuron(fr.net, j, xOf(h))))} fill="none" stroke={COLORS[j]} strokeWidth={1.6} opacity={0.75} />
            ))}
          </g>
          <path d={curve((h) => toV(out(fr.net, xOf(h))))} fill="none" stroke={INK} strokeWidth={3.5} />
          <text x={X1} y={434} fontSize={12.5} fontFamily={FONT} textAnchor="end" fill={INK}>
            {step === 5 ? `epoch ${fr.epoch} of ${EPOCHS} · ` : ""}network: average miss <tspan fontWeight={700}>{netMae.toFixed(1)} µg/m³</tspan>
          </text>
          {/* mini diagram: 1 → 4 → 1, line thickness = weight size */}
          <g transform="translate(76, 50)">
            <circle cx={0} cy={27} r={7} fill="#fff" stroke={INK} />
            {fr.net.w.map((_, j) => (
              <g key={j}>
                <line x1={7} y1={27} x2={44} y2={j * 18} stroke={COLORS[j]} strokeWidth={Math.min(4, 0.6 + Math.abs(fr.net.w[j]))} />
                <line x1={52} y1={j * 18} x2={89} y2={27} stroke={COLORS[j]} strokeWidth={Math.min(4, 0.6 + Math.abs(fr.net.v[j]) * 2)} />
                <circle cx={48} cy={j * 18} r={6} fill={COLORS[j]} />
              </g>
            ))}
            <circle cx={96} cy={27} r={7} fill="#fff" stroke={INK} />
            <text x={0} y={46} fontSize={8.5} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
              HOUR
            </text>
            <text x={96} y={46} fontSize={8.5} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
              PM2.5
            </text>
          </g>
        </g>
      )}
      {step === 5 && frames.length > 1 && (
        <g transform="translate(206, 46)">
          <rect width={130} height={62} rx={10} fill="#fff" stroke="rgba(11,11,11,0.1)" />
          <text x={10} y={15} fontSize={9} fontFamily={MONO} fill={MUTED}>
            LOSS (LOG SCALE)
          </text>
          <path
            d={frames
              .slice(0, Math.min(k, frames.length - 1) + 1)
              .map(
                (f, i) =>
                  `${i ? "L" : "M"}${r1(10 + (Math.log(f.epoch + 1) / Math.log(EPOCHS + 1)) * 110)},${r1(54 - ((Math.log(frames[0].loss) - Math.log(f.loss)) / (Math.log(frames[0].loss) - Math.log(frames[frames.length - 1].loss))) * 32)}`,
              )
              .join(" ")}
            fill="none"
            stroke={UP}
            strokeWidth={2}
          />
        </g>
      )}

      {/* a real week */}
      {weekView && fr && (
        <g>
          <path d={curve((h) => toV(out(fr.net, xOf(h))))} fill="none" stroke={INK} strokeWidth={3.5} />
          <text x={X1} y={60} fontSize={12} fontFamily={FONT} textAnchor="end" fill={INK}>
            network <tspan fontWeight={700}>{weekMae((h) => toV(out(fr.net, xOf(h)))).toFixed(1)}</tspan> · straight line {weekMae((h) => lw * h + lb).toFixed(1)} · one number all day{" "}
            {weekMae(() => mean).toFixed(1)}
          </text>
          <text x={X1} y={78} fontSize={10.5} fontFamily={MONO} textAnchor="end" fill={MUTED}>
            AVERAGE MISS PER HOUR, µg/m³
          </text>
        </g>
      )}
      {!run && step >= 3 && (
        <text x={W / 2} y={220} fontSize={13} fontFamily={FONT} textAnchor="middle" fill={MUTED}>
          Training in your browser…
        </text>
      )}
    </svg>
  );
}

export function Scale({ sizes }: { sizes: { name: string; params: number }[] }) {
  const rows = [{ name: "This little network", params: 3 * HID + 1 }, ...sizes]; // 4 input weights, 4 biases, 4 output weights, 1 output bias
  const max = Math.log10(Math.max(...rows.map((r) => r.params)));
  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 pb-10 sm:px-8">
      <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Weights to learn (log scale)</p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.name} className="grid grid-cols-[140px_1fr_76px] items-center gap-2 text-[12.5px] sm:grid-cols-[170px_1fr_76px]">
            <span className={i === 0 ? "font-semibold" : ""}>{r.name}</span>
            <div className="h-3 rounded-full bg-ink/[0.06]">
              <div className="h-full rounded-full" style={{ width: `${Math.round((Math.log10(r.params) / max) * 1000) / 10}%`, background: i === 0 ? UP : "rgba(11,11,11,0.45)" }} />
            </div>
            <span className="text-right font-mono">{r.params.toLocaleString("en-US")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowNnLearns({ byHour, hours, week, sizes }: { byHour: number[]; hours: number; week: { time: string[]; value: number[] }; sizes: { name: string; params: number }[] }) {
  const [run, setRun] = useState<ReturnType<typeof train> | null>(null);
  useEffect(() => {
    // trained after the page has loaded, in the browser only
    const id = setTimeout(() => setRun(train(byHour)), 0);
    return () => clearTimeout(id);
  }, [byHour]);
  const last = run?.frames[run.frames.length - 1];
  const fitMae = useMemo(() => (run && last ? byHour.reduce((s, v, h) => s + Math.abs(out(last.net, xOf(h)) * run.sy + run.my - v), 0) / 24 : null), [run, last, byHour]);
  const biggest = sizes.reduce((a, b) => (b.params > a.params ? b : a), sizes[0]);

  const steps: Step[] = [
    {
      t: "A pattern with bends",
      d: `Each dot is Jakarta's typical air pollution at that hour: the median of ${hours.toLocaleString("en-US")} hours. It peaks with the morning traffic, dips in the afternoon and climbs again at night.`,
    },
    { t: "A straight line can't bend", d: "The recipe from the Machine Learning page, a line with two knobs, does its best and still misses the shape completely." },
    { t: "One neuron can bend once", d: "A neuron adds up its inputs and passes the sum through an S-shaped curve (tanh). Its weight sets how steep the S is; its bias sets where the bend sits." },
    { t: "Four neurons, added up", d: "Each coloured curve is one neuron's S, scaled by its output weight. Added together (black), four bends are enough to draw the daily rhythm." },
    { t: "They start random", d: "Before training, every weight is a small random number, so the black curve is just a guess." },
    {
      t: "Backpropagation",
      d: `For each hour, the error at the output is sent backwards: through each output weight, through each neuron's slope, to each input weight. Every weight then moves a little against its share of the error. ${EPOCHS.toLocaleString("en-US")} rounds later${fitMae !== null ? ` it misses the 24 values by ${fitMae.toFixed(1)} µg/m³ on average` : ""}.`,
    },
    { t: "A real week is messier", d: "Last week's hours scatter around the typical day: rain, holidays, wind. The learned daily curve still follows them better than a line or a single number." },
    {
      t: "Same idea, bigger",
      d: `The networks on this page have more inputs, more neurons and special layers (filters, memory), but learn exactly this way. The largest, the ${biggest.name}, has ${biggest.params.toLocaleString("en-US")} weights.`,
    },
  ];

  return (
    <InsideSection
      id="learn"
      kicker="How a neural network learns"
      title="Neurons, bends, and errors flowing backwards."
      line="Before the projects: a tiny network trained live in your browser on real Jakarta air data, step by step."
    >
      <Scrolly steps={steps}>
        {(step) => <div className="relative min-h-0 flex-1 px-2 pt-3 pb-9 sm:px-4">{step <= 6 ? <Visual step={step} byHour={byHour} week={week} run={run} /> : <Scale sizes={sizes} />}</div>}
      </Scrolly>
    </InsideSection>
  );
}
