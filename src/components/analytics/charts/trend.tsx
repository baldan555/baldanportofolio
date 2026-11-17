import { MONTHS, daily, kpis, monthly, totalByMonth } from "@/data/chart-demo";
import { H, INK, Legend, M, MUTED, PAL, Svg, Text, W, XLabels, YGrid, lin, nice, path, r1 } from "./kit";

const months24 = Array.from({ length: 24 }, (_, i) => `${MONTHS[i % 12]}`);

export function LineChart() {
  const max = nice(Math.max(...totalByMonth));
  const y = lin(0, max, H - M.b, M.t);
  const x = lin(0, 23, M.l, W - M.r);
  return (
    <Svg label="Line chart of total monthly revenue over two years">
      <YGrid y={y} max={max} />
      <path d={path(totalByMonth.map((v, i) => [x(i), y(v)]))} fill="none" stroke={PAL[0]} strokeWidth={2.5} />
      <circle cx={x(23)} cy={y(totalByMonth[23])} r={4} fill={PAL[0]} />
      <XLabels labels={months24} x={x} every={3} />
    </Svg>
  );
}

export function MultiLine() {
  const cities = monthly.slice(0, 4);
  const max = nice(Math.max(...cities.flatMap((c) => c.values)));
  const y = lin(0, max, H - M.b, M.t + 10);
  const x = lin(0, 23, M.l, W - M.r - 52);
  return (
    <Svg label="Multi-line chart: monthly revenue for four cities">
      <YGrid y={y} max={max} x1={W - M.r - 52} />
      {cities.map((c, k) => (
        <g key={c.city}>
          <path d={path(c.values.map((v, i) => [x(i), y(v)]))} fill="none" stroke={PAL[k]} strokeWidth={2} />
          <Text x={x(23) + 5} y={y(c.values[23]) + 3} size={9} color={PAL[k]}>
            {c.city}
          </Text>
        </g>
      ))}
      <XLabels labels={months24} x={x} every={4} />
    </Svg>
  );
}

export function AreaChart() {
  const max = nice(Math.max(...totalByMonth));
  const y = lin(0, max, H - M.b, M.t);
  const x = lin(0, 23, M.l, W - M.r);
  const top = totalByMonth.map((v, i) => [x(i), y(v)] as [number, number]);
  return (
    <Svg label="Area chart of total monthly revenue">
      <YGrid y={y} max={max} />
      <path d={`${path(top)} L${x(23)},${y(0)} L${x(0)},${y(0)} Z`} fill="rgba(42,120,214,0.18)" />
      <path d={path(top)} fill="none" stroke={PAL[0]} strokeWidth={2} />
      <XLabels labels={months24} x={x} every={3} />
    </Svg>
  );
}

export function StackedArea() {
  const cities = monthly.slice(0, 4);
  const sums = Array.from({ length: 24 }, (_, i) => cities.reduce((s, c) => s + c.values[i], 0));
  const max = nice(Math.max(...sums));
  const y = lin(0, max, H - M.b, M.t + 12);
  const x = lin(0, 23, M.l, W - M.r);
  const base = new Array(24).fill(0);
  return (
    <Svg label="Stacked area chart: revenue by city adding up to the total">
      <YGrid y={y} max={max} />
      <Legend items={cities.map((c, k) => ({ label: c.city, color: PAL[k] }))} y={8} />
      {cities.map((c, k) => {
        const lower = base.map((b, i) => [x(i), y(b)] as [number, number]);
        c.values.forEach((v, i) => (base[i] += v));
        const upper = base.map((b, i) => [x(i), y(b)] as [number, number]);
        return <path key={c.city} d={`${path(upper)} ${path([...lower].reverse()).replace("M", "L")} Z`} fill={PAL[k]} opacity={0.75} />;
      })}
      <XLabels labels={months24} x={x} every={3} />
    </Svg>
  );
}

export function Sparklines() {
  return (
    <Svg label="Sparklines: a small trend line per metric">
      {kpis.map((k, row) => {
        const lo = Math.min(...k.series);
        const hi = Math.max(...k.series);
        const x = lin(0, k.series.length - 1, 170, 300);
        const y = lin(lo, hi, 28 + row * 50, 8 + row * 50);
        return (
          <g key={k.label}>
            <Text x={16} y={22 + row * 50} size={11} color={INK}>
              {k.label}
            </Text>
            <Text x={150} y={22 + row * 50} size={11} anchor="end" color={INK} weight={700}>
              {k.value}
            </Text>
            <path d={path(k.series.map((v, i) => [x(i), y(v)]))} fill="none" stroke={k.delta >= 0 ? PAL[2] : PAL[1]} strokeWidth={1.8} />
            <Text x={344} y={22 + row * 50} size={10} anchor="end" mono color={k.delta >= 0 ? PAL[2] : PAL[1]}>
              {k.delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(k.delta * 100))}%
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}

export function StepLine() {
  // price of a kopi susu in rupiah: changes happen on a date and then hold
  const price = [18, 18, 18, 20, 20, 20, 20, 22, 22, 22, 22, 22, 22, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25].map((v) => v * 1000);
  const y = lin(15000, 26000, H - M.b, M.t);
  const x = lin(0, 23, M.l, W - M.r);
  const pts: [number, number][] = [];
  price.forEach((v, i) => {
    if (i) pts.push([x(i), y(price[i - 1])]);
    pts.push([x(i), y(v)]);
  });
  return (
    <Svg label="Step chart: the menu price changes on set dates and then holds">
      <YGrid y={y} max={26000} min={15000} ticks={4} format={(v) => `${Math.round(v / 1000)}k`} />
      <path d={path(pts)} fill="none" stroke={PAL[3]} strokeWidth={2.5} />
      <XLabels labels={months24} x={x} every={3} />
    </Svg>
  );
}

export function Calendar() {
  const max = Math.max(...daily);
  const min = Math.min(...daily);
  const cell = 6.2;
  return (
    <Svg label="Calendar heatmap: orders per day over a year" h={124}>
      {["Mon", "Wed", "Fri", "Sun"].map((d, i) => (
        <Text key={d} x={30} y={42 + i * 2 * cell + 5} size={8} anchor="end">
          {d}
        </Text>
      ))}
      {daily.map((v, d) => {
        const wk = Math.floor(d / 7);
        const dow = d % 7;
        const t = (v - min) / (max - min);
        return <rect key={d} x={r1(34 + wk * cell)} y={r1(38 + dow * cell)} width={cell - 1.2} height={cell - 1.2} rx={1} fill={`rgba(42,120,214,${r1((0.1 + 0.9 * t * t) * 10) / 10})`} />;
      })}
      {MONTHS.map((m, i) => (
        <Text key={m} x={34 + i * 4.33 * cell} y={32} size={8}>
          {m}
        </Text>
      ))}
      <Text x={34} y={112} size={9} color={MUTED}>
        Weekends are darker; the year ends busier.
      </Text>
    </Svg>
  );
}
