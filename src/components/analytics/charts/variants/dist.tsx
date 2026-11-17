import { CHANNELS, daily, orderValues } from "@/data/chart-demo";
import { H, INK, Legend, M, MUTED, PAL, Svg, Text, W, YGrid, band, lin, nice, offsets, path, r1 } from "../kit";
import { defs } from "../types";
import { band2, bins, kde, mean, quant, sd } from "./base";

const LO = 15;
const HI = 160;
const STEP = 5;
const NB = (HI - LO) / STEP;
const ch = orderValues;
const counts = ch.map((c) => bins(c.values, LO, STEP, NB));
const jit = (i: number) => (((i * 9301 + 49297) % 233280) / 233280 - 0.5) * 2;
const xAxis = (x: (v: number) => number, y = H - M.b + 14) =>
  [20, 40, 60, 80, 100, 120, 140, 160].map((v) => (
    <Text key={v} x={x(v)} y={y} anchor="middle" size={8.5}>
      {`${v}k`}
    </Text>
  ));

/* ---------------------------------------------------------------- histograms */
function StackedHist() {
  const tot = Array.from({ length: NB }, (_, i) => counts.reduce((s, c) => s + c[i], 0));
  const max = nice(Math.max(...tot));
  const y = lin(0, max, H - M.b, M.t + 12);
  const x = lin(LO, HI, M.l, W - M.r);
  return (
    <Svg label="Stacked histogram: order values split by channel">
      <YGrid y={y} max={max} />
      <Legend items={CHANNELS.map((c, i) => ({ label: c, color: PAL[i] }))} x={M.l + 4} />
      {Array.from({ length: NB }, (_, i) => {
        const o = offsets(counts.map((c) => c[i]));
        return counts.map((c, k) => <rect key={`${i}${k}`} x={x(LO + i * STEP) + 0.5} y={y(o[k + 1])} width={r1(x(LO + STEP) - x(LO) - 1)} height={r1(y(o[k]) - y(o[k + 1]))} fill={PAL[k]} />);
      })}
      {xAxis(x)}
    </Svg>
  );
}
function OverlapHist() {
  const two = [0, 2];
  const max = nice(Math.max(...two.flatMap((k) => counts[k])));
  const y = lin(0, max, H - M.b, M.t + 12);
  const x = lin(LO, HI, M.l, W - M.r);
  return (
    <Svg label="Overlapping histograms: dine-in and delivery order values, see-through so both shapes show">
      <YGrid y={y} max={max} />
      <Legend items={two.map((k) => ({ label: CHANNELS[k], color: PAL[k] }))} x={M.l + 4} />
      {two.map((k) =>
        counts[k].map((c, i) => <rect key={`${k}${i}`} x={x(LO + i * STEP) + 0.5} y={y(c)} width={r1(x(LO + STEP) - x(LO) - 1)} height={r1(H - M.b - y(c))} fill={PAL[k]} opacity={0.45} />),
      )}
      {xAxis(x)}
    </Svg>
  );
}
function Mirror() {
  const max = nice(Math.max(...counts[0], ...counts[2]));
  const mid = 112;
  const x = lin(LO, HI, M.l, W - M.r);
  const up = lin(0, max, mid, 14);
  const down = lin(0, max, mid, 206);
  return (
    <Svg label="Mirrored histogram: dine-in above the line, delivery below, same scale">
      {counts[0].map((c, i) => (
        <rect key={`u${i}`} x={x(LO + i * STEP) + 0.5} y={up(c)} width={r1(x(LO + STEP) - x(LO) - 1)} height={r1(mid - up(c))} fill={PAL[0]} />
      ))}
      {counts[2].map((c, i) => (
        <rect key={`d${i}`} x={x(LO + i * STEP) + 0.5} y={mid} width={r1(x(LO + STEP) - x(LO) - 1)} height={r1(down(c) - mid)} fill={PAL[2]} />
      ))}
      <line x1={M.l} x2={W - M.r} y1={mid} y2={mid} stroke={INK} />
      <Text x={W - M.r} y={24} anchor="end" size={9} color={PAL[0]} weight={700}>
        {"Dine-in ↑"}
      </Text>
      <Text x={W - M.r} y={204} anchor="end" size={9} color={PAL[2]} weight={700}>
        {"Delivery ↓"}
      </Text>
      {[20, 40, 60, 80, 100, 120, 140, 160].map((v) => (
        <Text key={v} x={x(v)} y={mid + 11} anchor="middle" size={7.5} color={MUTED}>
          {`${v}k`}
        </Text>
      ))}
    </Svg>
  );
}
function DotHist() {
  const v = ch[1].values;
  const step = 2;
  const nb = 30;
  const c = bins(v, 18, step, nb);
  const x = lin(18, 18 + step * nb, M.l, W - M.r);
  const r = r1((x(18 + step) - x(18)) / 2 - 0.4);
  return (
    <Svg label="Dot histogram: every takeaway order is a dot, stacked in its value bin">
      {c.map((n, i) =>
        Array.from({ length: n }, (_, k) => <circle key={`${i}${k}`} cx={r1((x(18 + i * step) + x(18 + (i + 1) * step)) / 2)} cy={r1(H - M.b - r - k * (2 * r + 0.6))} r={r} fill={PAL[1]} />),
      )}
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke={MUTED} />
      {[20, 30, 40, 50, 60, 70].map((t) => (
        <Text key={t} x={x(t)} y={H - M.b + 14} anchor="middle" size={8.5}>
          {`${t}k`}
        </Text>
      ))}
      <Text x={M.l} y={14} size={8.5}>
        {`${v.length} takeaway orders, one dot each`}
      </Text>
    </Svg>
  );
}
function CumHist() {
  const all = ch.flatMap((c) => c.values);
  const c = bins(all, LO, STEP, NB);
  const cum = offsets(c).slice(1);
  const max = all.length;
  const y = lin(0, max, H - M.b, M.t);
  const x = lin(LO, HI, M.l, W - M.r);
  return (
    <Svg label="Cumulative histogram: how many orders are at or below each value">
      <YGrid y={y} max={max} ticks={4} format={(v) => `${Math.round((v / max) * 100)}%`} />
      {cum.map((n, i) => (
        <rect key={i} x={x(LO + i * STEP) + 0.5} y={y(n)} width={r1(x(LO + STEP) - x(LO) - 1)} height={r1(H - M.b - y(n))} fill={PAL[6]} opacity={0.8} />
      ))}
      <line x1={M.l} x2={W - M.r} y1={y(max / 2)} y2={y(max / 2)} stroke={INK} strokeDasharray="3 3" />
      <Text x={M.l + 4} y={y(max / 2) - 4} size={8.5} color={INK}>
        {`half of orders are under ${Math.round(quant(all, 0.5))}k`}
      </Text>
      {xAxis(x)}
    </Svg>
  );
}
function FreqPoly() {
  const max = nice(Math.max(...counts.flat()));
  const y = lin(0, max, H - M.b, M.t + 12);
  const x = lin(LO, HI, M.l, W - M.r);
  return (
    <Svg label="Frequency polygons: the histogram of each channel drawn as a line, so several fit on one chart">
      <YGrid y={y} max={max} />
      <Legend items={CHANNELS.map((c, i) => ({ label: c, color: PAL[i] }))} x={M.l + 4} />
      {counts.map((c, k) => (
        <path key={k} d={path(c.map((n, i) => [x(LO + (i + 0.5) * STEP), y(n)]))} fill="none" stroke={PAL[k]} strokeWidth={2} strokeLinejoin="round" />
      ))}
      {xAxis(x)}
    </Svg>
  );
}
function HistMeanMedian() {
  const v = ch[2].values;
  const c = bins(v, LO, STEP, NB);
  const max = nice(Math.max(...c));
  const y = lin(0, max, H - M.b, M.t + 12);
  const x = lin(LO, HI, M.l, W - M.r);
  const m = mean(v);
  const md = quant(v, 0.5);
  return (
    <Svg label="Histogram with the mean and the median marked: in skewed data the mean is pulled towards the long tail">
      <YGrid y={y} max={max} />
      {c.map((n, i) => (
        <rect key={i} x={x(LO + i * STEP) + 0.5} y={y(n)} width={r1(x(LO + STEP) - x(LO) - 1)} height={r1(H - M.b - y(n))} fill="rgba(27,175,122,0.55)" />
      ))}
      {[
        [md, "median", INK, -4],
        [m, "mean", PAL[1], 4],
      ].map(([val, t, col, dx]) => (
        <g key={t as string}>
          <line x1={x(val as number)} x2={x(val as number)} y1={M.t + 12} y2={H - M.b} stroke={col as string} strokeWidth={2} />
          <Text x={x(val as number) + (dx as number)} y={M.t + 8} anchor={(dx as number) < 0 ? "end" : "start"} size={8.5} color={col as string} weight={700}>
            {`${t} ${Math.round(val as number)}k`}
          </Text>
        </g>
      ))}
      {xAxis(x)}
    </Svg>
  );
}

/* ---------------------------------------------------------------- box & violin */
const stats = ch.map((c) => ({
  label: c.label,
  q1: quant(c.values, 0.25),
  q2: quant(c.values, 0.5),
  q3: quant(c.values, 0.75),
  lo: quant(c.values, 0.05),
  hi: quant(c.values, 0.95),
  m: mean(c.values),
  s: sd(c.values),
  n: c.values.length,
}));
function HBox() {
  const x = lin(LO, HI, 80, W - 14);
  const b = band(3, 10, H - 24, 0.5);
  return (
    <Svg label="Horizontal box plots: order values per channel, whiskers from the 5th to the 95th percentile">
      {stats.map((s, i) => (
        <g key={s.label}>
          <Text x={72} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
            {s.label}
          </Text>
          <line x1={x(s.lo)} x2={x(s.hi)} y1={b.mid(i)} y2={b.mid(i)} stroke={INK} />
          <rect x={x(s.q1)} y={b.at(i)} width={r1(x(s.q3) - x(s.q1))} height={b.bw} rx={3} fill={PAL[i]} opacity={0.3} stroke={PAL[i]} />
          <line x1={x(s.q2)} x2={x(s.q2)} y1={b.at(i)} y2={b.at(i) + b.bw} stroke={PAL[i]} strokeWidth={2.5} />
        </g>
      ))}
      {xAxis(x, H - 8)}
    </Svg>
  );
}
function BoxStrip() {
  const x = lin(LO, HI, 80, W - 14);
  const b = band(3, 10, H - 24, 0.4);
  return (
    <Svg label="Box plots with every order drawn as a jittered dot behind them">
      {ch.map((c, i) => (
        <g key={c.label}>
          <Text x={72} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
            {c.label}
          </Text>
          {c.values.map((v, k) => (
            <circle key={k} cx={x(Math.min(HI, v))} cy={r1(b.mid(i) + jit(k + i * 200) * b.bw * 0.45)} r={1.6} fill={PAL[i]} opacity={0.35} />
          ))}
          <rect x={x(stats[i].q1)} y={b.at(i) + 4} width={r1(x(stats[i].q3) - x(stats[i].q1))} height={b.bw - 8} rx={3} fill="none" stroke={INK} strokeWidth={1.4} />
          <line x1={x(stats[i].q2)} x2={x(stats[i].q2)} y1={b.at(i) + 4} y2={b.at(i) + b.bw - 4} stroke={INK} strokeWidth={2.2} />
        </g>
      ))}
      {xAxis(x, H - 8)}
    </Svg>
  );
}
function Raincloud() {
  const x = lin(LO, HI, 80, W - 14);
  const rowH = (H - 24) / 3;
  return (
    <Svg label="Raincloud plot: a half violin (cloud), a slim box and the raw dots (rain) for each channel">
      {ch.map((c, i) => {
        const top = 6 + i * rowH;
        const d = kde(c.values, LO, HI, 6);
        const dmax = Math.max(...d.map((p) => p[1]));
        const cloudBase = top + rowH * 0.48;
        const cloud = `M${x(LO)},${cloudBase} ${d.map(([v, den]) => `L${x(v)},${r1(cloudBase - (den / dmax) * rowH * 0.42)}`).join(" ")} L${x(HI)},${cloudBase} Z`;
        return (
          <g key={c.label}>
            <Text x={72} y={cloudBase + 3} anchor="end" size={9.5} color={INK}>
              {c.label}
            </Text>
            <path d={cloud} fill={PAL[i]} opacity={0.55} />
            <rect x={x(stats[i].q1)} y={cloudBase + 3} width={r1(x(stats[i].q3) - x(stats[i].q1))} height={5} rx={2} fill={INK} />
            <circle cx={x(stats[i].q2)} cy={cloudBase + 5.5} r={3} fill="#fff" stroke={INK} />
            {c.values.map((v, k) => (
              <circle key={k} cx={x(Math.min(HI, v))} cy={r1(cloudBase + 14 + Math.abs(jit(k + i * 77)) * rowH * 0.3)} r={1.4} fill={PAL[i]} opacity={0.5} />
            ))}
          </g>
        );
      })}
      {xAxis(x, H - 6)}
    </Svg>
  );
}
function ErrorBars() {
  const y = lin(20, 100, H - M.b, M.t);
  const b = band(3, M.l, W - M.r, 0.5);
  return (
    <Svg label="Mean with a 95% confidence interval for each channel: where the true average probably lies">
      <YGrid y={y} max={100} min={20} format={(v) => `${v}k`} />
      {stats.map((s, i) => {
        const e = (1.96 * s.s) / Math.sqrt(s.n);
        return (
          <g key={s.label}>
            <line x1={b.mid(i)} x2={b.mid(i)} y1={y(s.m - e)} y2={y(s.m + e)} stroke={PAL[i]} strokeWidth={2.5} />
            <line x1={b.mid(i) - 8} x2={b.mid(i) + 8} y1={y(s.m + e)} y2={y(s.m + e)} stroke={PAL[i]} strokeWidth={2.5} />
            <line x1={b.mid(i) - 8} x2={b.mid(i) + 8} y1={y(s.m - e)} y2={y(s.m - e)} stroke={PAL[i]} strokeWidth={2.5} />
            <circle cx={b.mid(i)} cy={y(s.m)} r={5.5} fill={PAL[i]} />
            <Text x={b.mid(i) + 12} y={y(s.m) + 3} size={8.5} mono color={INK}>
              {`${s.m.toFixed(1)}k ± ${e.toFixed(1)}`}
            </Text>
            <Text x={b.mid(i)} y={H - M.b + 14} anchor="middle" size={9}>
              {s.label}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
const weekdays = daily.filter((_, d) => d % 7 < 5);
const weekends = daily.filter((_, d) => d % 7 >= 5);
function SplitViolin() {
  const lo = 300;
  const hi = 1100;
  const y = lin(lo, hi, H - M.b, M.t);
  const dl = kde(weekdays, lo, hi, 50);
  const dr = kde(weekends, lo, hi, 50);
  const dmax = Math.max(...dl.map((p) => p[1]), ...dr.map((p) => p[1]));
  const cx = 180;
  const w = 110;
  return (
    <Svg label="Split violin: weekday daily orders on the left half, weekend on the right">
      <YGrid y={y} max={hi} min={lo} />
      <path d={`M${cx},${y(lo)} ${dl.map(([v, d]) => `L${r1(cx - (d / dmax) * w)},${y(v)}`).join(" ")} L${cx},${y(hi)} Z`} fill={PAL[0]} opacity={0.6} />
      <path d={`M${cx},${y(lo)} ${dr.map(([v, d]) => `L${r1(cx + (d / dmax) * w)},${y(v)}`).join(" ")} L${cx},${y(hi)} Z`} fill={PAL[1]} opacity={0.6} />
      <line x1={cx} x2={cx} y1={M.t} y2={H - M.b} stroke={INK} />
      <Text x={cx - 10} y={H - M.b + 14} anchor="end" size={9} color={PAL[0]} weight={700}>
        {"Weekdays"}
      </Text>
      <Text x={cx + 10} y={H - M.b + 14} size={9} color={PAL[1]} weight={700}>
        {"Weekends"}
      </Text>
    </Svg>
  );
}
function GradientInterval() {
  const x = lin(LO, HI, 80, W - 14);
  const b = band(3, 10, H - 24, 0.55);
  const levels: [number, number, number][] = [
    [0.025, 0.975, 0.2],
    [0.1, 0.9, 0.4],
    [0.25, 0.75, 0.75],
  ];
  return (
    <Svg label="Gradient interval: nested bands for the middle 50%, 80% and 95% of order values">
      {ch.map((c, i) => (
        <g key={c.label}>
          <Text x={72} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
            {c.label}
          </Text>
          {levels.map(([a, z, op]) => (
            <rect key={a} x={x(quant(c.values, a))} y={b.at(i)} width={r1(x(quant(c.values, z)) - x(quant(c.values, a)))} height={b.bw} fill={PAL[i]} opacity={op} />
          ))}
          <line x1={x(stats[i].q2)} x2={x(stats[i].q2)} y1={b.at(i) - 3} y2={b.at(i) + b.bw + 3} stroke={INK} strokeWidth={2} />
        </g>
      ))}
      <Text x={W - 14} y={10} anchor="end" size={8}>
        {"light → dark: 95% · 80% · 50%"}
      </Text>
      {xAxis(x, H - 8)}
    </Svg>
  );
}

/* ---------------------------------------------------------------- points */
function Strip() {
  const x = lin(LO, HI, 80, W - 14);
  const b = band(3, 10, H - 24, 0.3);
  return (
    <Svg label="Strip plot: every order as a small dot, jittered up and down so they don't hide each other">
      {ch.map((c, i) => (
        <g key={c.label}>
          <Text x={72} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
            {c.label}
          </Text>
          {c.values.map((v, k) => (
            <circle key={k} cx={x(Math.min(HI, v))} cy={r1(b.mid(i) + jit(k * 3 + i) * b.bw * 0.48)} r={2} fill={PAL[i]} opacity={0.55} />
          ))}
        </g>
      ))}
      {xAxis(x, H - 8)}
    </Svg>
  );
}
function Rug() {
  const v = ch[0].values;
  const d = kde(v, LO, HI, 6);
  const dmax = Math.max(...d.map((p) => p[1]));
  const x = lin(LO, HI, M.l, W - M.r);
  const y = lin(0, dmax, H - M.b - 16, M.t);
  return (
    <Svg label="Density curve with a rug: a tick on the axis for every single order">
      <path d={`${path(d.map(([a, b]) => [x(a), y(b)]))} L${x(HI)},${y(0)} L${x(LO)},${y(0)} Z`} fill="rgba(42,120,214,0.2)" stroke={PAL[0]} strokeWidth={2} />
      {v.map((val, k) => (
        <line key={k} x1={x(Math.min(HI, val))} x2={x(Math.min(HI, val))} y1={H - M.b - 12} y2={H - M.b - 2} stroke={PAL[0]} opacity={0.4} />
      ))}
      {xAxis(x)}
    </Svg>
  );
}
function QuantileDots() {
  const v = ch[2].values;
  const qs = Array.from({ length: 20 }, (_, i) => quant(v, (i + 0.5) / 20));
  const x = lin(LO, HI, M.l, W - M.r);
  const r = 7;
  const stacked = qs.map((q, i) => {
    const binX = Math.round((x(q) - M.l) / (2 * r + 1));
    const below = qs.slice(0, i).filter((p) => Math.round((x(p) - M.l) / (2 * r + 1)) === binX).length;
    return { cx: r1(M.l + binX * (2 * r + 1) + r), cy: r1(H - M.b - r - below * (2 * r + 1)) };
  });
  return (
    <Svg label="Quantile dot plot: 20 dots, each one is 5% of delivery orders, so 'how likely' becomes 'how many dots'">
      {stacked.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={r} fill={i < 2 ? PAL[1] : PAL[2]} />
      ))}
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke={MUTED} />
      {xAxis(x)}
      <Text x={M.l} y={16} size={8.5}>
        {"each dot = 5% of delivery orders · orange = cheapest 10%"}
      </Text>
    </Svg>
  );
}
/** Inverse of the standard normal CDF (Acklam's approximation). */
function probit(p: number): number {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) return -probit(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
function QQ() {
  const v = [...ch[0].values].sort((a, b) => a - b);
  const m = mean(v);
  const s = sd(v);
  const theo = v.map((_, i) => m + s * probit((i + 0.5) / v.length));
  const lo = Math.min(...v, ...theo);
  const hi = Math.max(...v, ...theo);
  const x = lin(lo, hi, M.l, W - M.r);
  const y = lin(lo, hi, H - M.b, M.t);
  return (
    <Svg label="Q–Q plot: real order values against what a normal distribution would give; the bend at the top shows a long right tail">
      <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} stroke={MUTED} strokeDasharray="4 3" />
      {v.map((val, i) => (
        <circle key={i} cx={x(theo[i])} cy={y(val)} r={2.2} fill={PAL[0]} opacity={0.65} />
      ))}
      <Text x={M.l} y={M.t + 6} size={8.5}>
        {"actual ↑"}
      </Text>
      <Text x={W - M.r} y={H - M.b + 14} anchor="end" size={8.5}>
        {"if it were normal →"}
      </Text>
    </Svg>
  );
}

/* ---------------------------------------------------------------- curves */
function Bandwidths() {
  const v = ch[0].values;
  const x = lin(LO, HI, M.l, W - M.r);
  const sets = [2, 6, 16].map((h) => ({ h, d: kde(v, LO, HI, h, 80) }));
  const dmax = Math.max(...sets.flatMap((s) => s.d.map((p) => p[1])));
  const y = lin(0, dmax, H - M.b, M.t + 12);
  return (
    <Svg label="The same data smoothed three ways: too little smoothing is noisy, too much hides the shape">
      <Legend
        items={[
          { label: "narrow", color: PAL[4] },
          { label: "medium", color: PAL[0] },
          { label: "wide", color: PAL[5] },
        ]}
        x={M.l + 4}
      />
      {sets.map((s, k) => (
        <path key={s.h} d={path(s.d.map(([a, b]) => [x(a), y(b)]))} fill="none" stroke={[PAL[4], PAL[0], PAL[5]][k]} strokeWidth={k === 1 ? 2.4 : 1.6} />
      ))}
      {xAxis(x)}
    </Svg>
  );
}
function Tail() {
  const v = ch[2].values;
  const d = kde(v, LO, HI, 6, 80);
  const p90 = quant(v, 0.9);
  const dmax = Math.max(...d.map((p) => p[1]));
  const x = lin(LO, HI, M.l, W - M.r);
  const y = lin(0, dmax, H - M.b, M.t + 10);
  const tail = d.filter(([a]) => a >= p90);
  return (
    <Svg label="Density with the top 10% shaded: the biggest delivery orders">
      <path d={`${path(d.map(([a, b]) => [x(a), y(b)]))} L${x(HI)},${y(0)} L${x(LO)},${y(0)} Z`} fill="rgba(27,175,122,0.18)" stroke={PAL[2]} strokeWidth={2} />
      <path
        d={band2(
          tail.map(([a, b]) => [x(a), y(b)]),
          tail.map(([a]) => [x(a), y(0)]),
        )}
        fill={PAL[1]}
        opacity={0.6}
      />
      <line x1={x(p90)} x2={x(p90)} y1={M.t + 10} y2={H - M.b} stroke={PAL[1]} strokeDasharray="3 3" />
      <Text x={x(p90) + 4} y={M.t + 14} size={8.5} color={PAL[1]} weight={700}>
        {`top 10%: over ${Math.round(p90)}k`}
      </Text>
      {xAxis(x)}
    </Svg>
  );
}
function WeekdayRidges() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const lo = 300;
  const hi = 1100;
  const x = lin(lo, hi, 50, W - 12);
  const rh = 24;
  return (
    <Svg label="Ridgeline by weekday: the distribution of daily orders for each day of the week">
      {days.map((dname, k) => {
        const v = daily.filter((_, d) => d % 7 === k);
        const d = kde(v, lo, hi, 60, 60);
        const dmax = 0.006;
        const base = 40 + k * rh;
        return (
          <g key={dname}>
            <path
              d={`M${x(lo)},${base} ${d.map(([a, b]) => `L${x(a)},${r1(base - Math.min(1.6, b / dmax) * rh)}`).join(" ")} L${x(hi)},${base} Z`}
              fill={k >= 5 ? PAL[1] : PAL[0]}
              opacity={0.75}
              stroke="#fff"
            />
            <Text x={44} y={base - 2} anchor="end" size={8.5} color={INK}>
              {dname}
            </Text>
          </g>
        );
      })}
      {[400, 600, 800, 1000].map((t) => (
        <Text key={t} x={x(t)} y={H - 4} anchor="middle" size={8} mono>
          {t}
        </Text>
      ))}
    </Svg>
  );
}

export const DIST_VARIANTS = [
  ...defs("Distribution", "Histograms", [
    ["ds-stacked", "Stacked histogram", "One distribution split into groups.", "Comparing the shape of the upper groups.", StackedHist],
    ["ds-overlap", "Overlapping histograms", "Two groups' shapes on the same axis.", "Three or more groups: it goes muddy.", OverlapHist],
    ["ds-mirror", "Mirrored histogram", "Two groups compared shape to shape.", "Groups of very different size: normalise first.", Mirror],
    ["ds-dothist", "Dot histogram", "Small datasets where each observation counts.", "Thousands of points.", DotHist],
    ["ds-cumhist", "Cumulative histogram", "“What share is below this value?”", "Seeing peaks: they flatten out.", CumHist],
    ["ds-freqpoly", "Frequency polygons", "Several distributions on one chart.", "Few data points: lines suggest detail that isn't there.", FreqPoly],
    ["ds-meanmedian", "Histogram with mean & median", "Explaining why the average misleads in skewed data.", "Symmetric data: the lines just overlap.", HistMeanMedian],
  ]),
  ...defs("Distribution", "Box & violin", [
    ["ds-hbox", "Horizontal box plots", "Comparing groups with long names.", "Hiding two-peaked shapes.", HBox],
    ["ds-boxstrip", "Box plot with points", "Summary plus the raw data, so nothing hides.", "Thousands of points per group.", BoxStrip],
    ["ds-raincloud", "Raincloud plot", "Shape, summary and raw points in one view.", "Small charts: three layers get cramped.", Raincloud],
    ["ds-errorbar", "Mean with 95% interval", "Comparing averages and their uncertainty.", "Describing the spread of individual values.", ErrorBars],
    ["ds-split", "Split violin", "Two groups' shapes back to back.", "More than two groups.", SplitViolin],
    ["ds-gradient", "Gradient interval", "Uncertainty or spread as nested bands.", "Audiences who need one number.", GradientInterval],
  ]),
  ...defs("Distribution", "Points", [
    ["ds-strip", "Strip plot", "Every value visible, a few hundred per group.", "Very large data.", Strip],
    ["ds-rug", "Density with rug", "A smooth shape with the real data underneath.", "Big datasets: the rug turns solid.", Rug],
    ["ds-quantdots", "Quantile dot plot", "Explaining likelihood with countable dots.", "Precise percentiles.", QuantileDots],
    ["ds-qq", "Q–Q plot", "Checking whether data follows a normal distribution.", "Non-technical audiences.", QQ],
  ]),
  ...defs("Distribution", "Curves", [
    ["ds-bandwidth", "Smoothing compared", "Teaching how smoothing changes a density.", "Final reports: pick one bandwidth.", Bandwidths],
    ["ds-tail", "Density with shaded tail", "Highlighting the extreme part of a distribution.", "When the tail cut-off is arbitrary.", Tail],
    ["ds-ridges7", "Ridgeline by weekday", "Comparing a distribution across ordered groups.", "Precise heights.", WeekdayRidges],
  ]),
];
