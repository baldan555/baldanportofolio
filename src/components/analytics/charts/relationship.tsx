import { CITIES, METRICS, correlations, stores, totalByMonth } from "@/data/chart-demo";
import { H, INK, M, MUTED, PAL, Svg, Text, W, YGrid, lin, path, r1 } from "./kit";

const xw = lin(0, 16, M.l, W - M.r);
const ys = lin(1, 5, H - M.b, M.t);
const xTicks = (
  <g>
    {[0, 4, 8, 12, 16].map((v) => (
      <Text key={v} x={xw(v)} y={H - M.b + 14} anchor="middle" size={9}>
        {v} min
      </Text>
    ))}
  </g>
);

export function Scatter() {
  // least-squares trend line
  const mx = stores.reduce((s, d) => s + d.wait, 0) / stores.length;
  const my = stores.reduce((s, d) => s + d.satisfaction, 0) / stores.length;
  const b = stores.reduce((s, d) => s + (d.wait - mx) * (d.satisfaction - my), 0) / stores.reduce((s, d) => s + (d.wait - mx) ** 2, 0);
  const a = my - b * mx;
  return (
    <Svg label="Scatter plot: waiting time against satisfaction per store">
      <YGrid y={ys} max={5} min={1} ticks={4} />
      {stores.map((d) => (
        <circle key={d.id} cx={xw(d.wait)} cy={ys(d.satisfaction)} r={3.5} fill={PAL[0]} opacity={0.7} />
      ))}
      <line x1={xw(0)} x2={xw(16)} y1={ys(a)} y2={ys(a + b * 16)} stroke={PAL[1]} strokeWidth={2} strokeDasharray="5 4" />
      {xTicks}
    </Svg>
  );
}

export function Bubble() {
  const maxSeats = Math.max(...stores.map((s) => s.seats));
  return (
    <Svg label="Bubble chart: waiting time, satisfaction, and store size as bubble area">
      <YGrid y={ys} max={5} min={1} ticks={4} />
      {[...stores]
        .sort((p, q) => q.seats - p.seats)
        .map((d) => (
          <circle key={d.id} cx={xw(d.wait)} cy={ys(d.satisfaction)} r={r1(3 + 9 * Math.sqrt(d.seats / maxSeats))} fill={PAL[CITIES.indexOf(d.city) % 4]} opacity={0.45} stroke="#fff" />
        ))}
      {xTicks}
      <Text x={W - M.r} y={M.t + 4} anchor="end" size={8.5} color={MUTED}>
        bubble area = seats
      </Text>
    </Svg>
  );
}

export function CorrHeatmap() {
  const cell = 40;
  const x0 = 120;
  const y0 = 16;
  return (
    <Svg label="Correlation heatmap between store metrics">
      {METRICS.map((m, i) => (
        <g key={m}>
          <Text x={x0 - 6} y={y0 + i * cell + cell / 2 + 3} anchor="end" size={10} color={INK}>
            {m}
          </Text>
          <Text x={x0 + i * cell + cell / 2} y={y0 + METRICS.length * cell + 13} anchor="middle" size={9}>
            {m.slice(0, 5)}
          </Text>
          {METRICS.map((_, j) => {
            const v = correlations[i][j];
            return (
              <g key={j}>
                <rect
                  x={x0 + j * cell}
                  y={y0 + i * cell}
                  width={cell - 2}
                  height={cell - 2}
                  rx={4}
                  fill={v >= 0 ? `rgba(235,104,52,${r1(Math.abs(v) * 10) / 10})` : `rgba(42,120,214,${r1(Math.abs(v) * 10) / 10})`}
                />
                <Text x={x0 + j * cell + cell / 2 - 1} y={y0 + i * cell + cell / 2 + 3} anchor="middle" size={9} mono color={Math.abs(v) > 0.6 ? "#fff" : INK}>
                  {v.toFixed(2)}
                </Text>
              </g>
            );
          })}
        </g>
      ))}
      <Text x={300} y={60} size={9} color={PAL[1]}>
        ■ move together
      </Text>
      <Text x={300} y={76} size={9} color={PAL[0]}>
        ■ opposite
      </Text>
    </Svg>
  );
}

export function ConnectedScatter() {
  // revenue vs marketing spend, month by month, joined in time order
  const spend = totalByMonth.slice(12).map((v, i) => r1(40 + i * 3 + (i % 3) * 4));
  const rev = totalByMonth.slice(12);
  const x = lin(35, 90, M.l, W - M.r);
  const y = lin(Math.min(...rev) * 0.95, Math.max(...rev) * 1.03, H - M.b, M.t);
  const pts = spend.map((s, i) => [x(s), y(rev[i])] as [number, number]);
  return (
    <Svg label="Connected scatter: marketing spend against revenue, month by month">
      <path d={path(pts)} fill="none" stroke="rgba(11,11,11,0.3)" strokeWidth={1.5} />
      {pts.map(([px, py], i) => (
        <g key={i}>
          <circle cx={px} cy={py} r={4} fill={PAL[3]} opacity={0.3 + (0.7 * i) / 11} />
          {(i === 0 || i === 11) && (
            <Text x={px + 6} y={py - 6} size={9} color={INK}>
              {i === 0 ? "Jan" : "Dec"}
            </Text>
          )}
        </g>
      ))}
      <Text x={W - M.r} y={H - 8} anchor="end" size={9}>
        marketing spend (million Rp) →
      </Text>
      <Text x={M.l} y={M.t + 4} size={9}>
        ↑ revenue
      </Text>
    </Svg>
  );
}
