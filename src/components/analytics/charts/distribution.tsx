import { CHANNELS, orderValues } from "@/data/chart-demo";
import { H, INK, Legend, M, MUTED, PAL, Svg, Text, W, XLabels, YGrid, band, lin, nice, path, r1 } from "./kit";

const all = orderValues.flatMap((c) => c.values);
const LO = 15;
const HI = 160;
const quant = (v: number[], q: number) => {
  const s = [...v].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i - Math.floor(i));
};
/** Kernel density with the Epanechnikov kernel (polynomial, so identical on server and browser). */
const kde = (v: number[], h = 6, steps = 48) =>
  Array.from({ length: steps + 1 }, (_, k) => {
    const x = LO + ((HI - LO) * k) / steps;
    const d = v.reduce((s, p) => {
      const u = (x - p) / h;
      return s + (Math.abs(u) < 1 ? 0.75 * (1 - u * u) : 0);
    }, 0);
    return [x, d / (v.length * h)] as [number, number];
  });

export function Histogram() {
  const bins = Array.from({ length: (HI - LO) / 5 }, (_, i) => LO + i * 5);
  const counts = bins.map((b) => all.filter((v) => v >= b && v < b + 5).length);
  const max = nice(Math.max(...counts));
  const y = lin(0, max, H - M.b, M.t);
  const x = lin(LO, HI, M.l, W - M.r);
  return (
    <Svg label="Histogram of order values">
      <YGrid y={y} max={max} />
      {bins.map((b, i) => (
        <rect key={b} x={x(b) + 0.5} y={y(counts[i])} width={r1(x(b + 5) - x(b) - 1)} height={H - M.b - y(counts[i])} fill={PAL[0]} />
      ))}
      {[20, 40, 60, 80, 100, 120, 140, 160].map((v) => (
        <Text key={v} x={x(v)} y={H - M.b + 14} anchor="middle" size={9}>
          {v}k
        </Text>
      ))}
    </Svg>
  );
}

export function BoxPlot() {
  const b = band(3, M.l, W - M.r, 0.55);
  const y = lin(0, HI, H - M.b, M.t);
  return (
    <Svg label="Box plot of order values by channel">
      <YGrid y={y} max={HI} min={0} ticks={4} format={(v) => `${Math.round(v)}k`} />
      {orderValues.map((c, i) => {
        const [q1, q2, q3] = [0.25, 0.5, 0.75].map((q) => quant(c.values, q));
        const iqr = q3 - q1;
        const lo = Math.min(...c.values.filter((v) => v >= q1 - 1.5 * iqr));
        const hi = Math.max(...c.values.filter((v) => v <= q3 + 1.5 * iqr));
        const outliers = c.values.filter((v) => v > hi || v < lo);
        const cx = b.mid(i);
        return (
          <g key={c.label}>
            <line x1={cx} x2={cx} y1={y(lo)} y2={y(hi)} stroke={INK} />
            <rect x={b.at(i)} y={y(q3)} width={b.bw} height={r1(y(q1) - y(q3))} fill="rgba(42,120,214,0.2)" stroke={PAL[0]} />
            <line x1={b.at(i)} x2={b.at(i) + b.bw} y1={y(q2)} y2={y(q2)} stroke={INK} strokeWidth={2.5} />
            {outliers.map((o, k) => (
              <circle key={k} cx={cx} cy={y(o)} r={2} fill="none" stroke={MUTED} />
            ))}
          </g>
        );
      })}
      <XLabels labels={CHANNELS} x={b.mid} />
    </Svg>
  );
}

export function Violin() {
  const b = band(3, M.l, W - M.r, 0.2);
  const y = lin(0, HI, H - M.b, M.t);
  const dens = orderValues.map((c) => kde(c.values));
  const dmax = Math.max(...dens.flatMap((d) => d.map((p) => p[1])));
  return (
    <Svg label="Violin plot: the shape of order values per channel">
      <YGrid y={y} max={HI} min={0} ticks={4} format={(v) => `${Math.round(v)}k`} />
      {dens.map((d, i) => {
        const cx = b.mid(i);
        const w = (v: number) => (v / dmax) * (b.bw / 2);
        const right = d.map(([v, p]) => [cx + w(p), y(v)] as [number, number]);
        const left = d.map(([v, p]) => [cx - w(p), y(v)] as [number, number]).reverse();
        return <path key={i} d={`${path(right)} ${path(left).replace("M", "L")} Z`} fill={PAL[i]} opacity={0.6} />;
      })}
      <XLabels labels={CHANNELS} x={b.mid} />
    </Svg>
  );
}

export function Beeswarm() {
  const x = lin(LO, HI, M.l + 40, W - M.r);
  const rowsY = [55, 115, 175];
  return (
    <Svg label="Beeswarm: every order as a dot, per channel">
      {orderValues.map((c, i) => {
        // stack dots that would overlap: simple column binning
        const used = new Map<number, number>();
        return (
          <g key={c.label}>
            <Text x={M.l + 34} y={rowsY[i] + 3} anchor="end" size={10} color={INK}>
              {c.label}
            </Text>
            {[...c.values]
              .sort((a, b) => a - b)
              .slice(0, 120)
              .map((v, k) => {
                const col = Math.round(x(v) / 5);
                const n = used.get(col) ?? 0;
                used.set(col, n + 1);
                const off = (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 4.2;
                return <circle key={k} cx={r1(col * 5)} cy={r1(rowsY[i] + off)} r={2} fill={PAL[i]} />;
              })}
          </g>
        );
      })}
      {[20, 40, 60, 80, 100, 120, 140, 160].map((v) => (
        <Text key={v} x={x(v)} y={H - 6} anchor="middle" size={9}>
          {v}k
        </Text>
      ))}
    </Svg>
  );
}

export function Density() {
  const dens = orderValues.map((c) => kde(c.values));
  const dmax = Math.max(...dens.flatMap((d) => d.map((p) => p[1])));
  const x = lin(LO, HI, M.l, W - M.r);
  const y = lin(0, dmax * 1.1, H - M.b, M.t + 12);
  return (
    <Svg label="Density curves of order values per channel">
      <Legend items={CHANNELS.map((c, i) => ({ label: c, color: PAL[i] }))} y={8} />
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="rgba(11,11,11,0.2)" />
      {dens.map((d, i) => (
        <g key={i}>
          <path d={`${path(d.map(([v, p]) => [x(v), y(p)]))} L${x(HI)},${y(0)} L${x(LO)},${y(0)} Z`} fill={PAL[i]} opacity={0.15} />
          <path d={path(d.map(([v, p]) => [x(v), y(p)]))} fill="none" stroke={PAL[i]} strokeWidth={2} />
        </g>
      ))}
      {[20, 40, 60, 80, 100, 120, 140, 160].map((v) => (
        <Text key={v} x={x(v)} y={H - M.b + 14} anchor="middle" size={9}>
          {v}k
        </Text>
      ))}
    </Svg>
  );
}

export function Ecdf() {
  const x = lin(LO, HI, M.l, W - M.r);
  const y = lin(0, 1, H - M.b, M.t + 12);
  return (
    <Svg label="Cumulative distribution (ECDF) of order values per channel">
      <YGrid y={y} max={1} format={(v) => `${Math.round(v * 100)}%`} />
      <Legend items={CHANNELS.map((c, i) => ({ label: c, color: PAL[i] }))} y={8} />
      {orderValues.map((c, i) => {
        const s = [...c.values].sort((a, b) => a - b);
        const pts: [number, number][] = [];
        s.forEach((v, k) => {
          pts.push([x(v), y(k / s.length)]);
          pts.push([x(v), y((k + 1) / s.length)]);
        });
        return <path key={i} d={path(pts)} fill="none" stroke={PAL[i]} strokeWidth={2} />;
      })}
      {[20, 40, 60, 80, 100, 120, 140, 160].map((v) => (
        <Text key={v} x={x(v)} y={H - M.b + 14} anchor="middle" size={9}>
          {v}k
        </Text>
      ))}
    </Svg>
  );
}

export function Ridgeline() {
  // one ridge per channel, plus all orders together
  const ridges = [
    { label: "Delivery", v: orderValues[2].values },
    { label: "Takeaway", v: orderValues[1].values },
    { label: "Dine-in", v: orderValues[0].values },
    { label: "All orders", v: all },
  ];
  const x = lin(LO, HI, M.l + 40, W - M.r);
  const dens = ridges.map((r) => kde(r.v));
  const dmax = Math.max(...dens.flatMap((d) => d.map((p) => p[1])));
  return (
    <Svg label="Ridgeline: overlapping density curves, one per group">
      {dens.map((d, i) => {
        const base = 70 + i * 40;
        const y = (p: number) => r1(base - (p / dmax) * 60);
        return (
          <g key={i}>
            <path d={`${path(d.map(([v, p]) => [x(v), y(p)]))} L${x(HI)},${base} L${x(LO)},${base} Z`} fill={PAL[i]} opacity={0.55} stroke="#fff" />
            <Text x={M.l + 34} y={base - 3} anchor="end" size={9} color={INK}>
              {ridges[i].label}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
