import { PRODUCTS, cityProduct, revenueByCity, revenueLastYear, targets } from "@/data/chart-demo";
import { H, INK, Legend, M, MUTED, PAL, Svg, Text, W, XLabels, YGrid, band, fmt, lin, nice, r1 } from "./kit";

const top6 = revenueByCity.slice(0, 6);

export function BarH() {
  const max = nice(top6[0].value);
  const x = lin(0, max, 86, W - M.r - 26);
  const b = band(top6.length, M.t, H - 10, 0.3);
  return (
    <Svg label="Horizontal bar chart of revenue by city">
      {top6.map((d, i) => (
        <g key={d.label}>
          <Text x={80} y={b.mid(i) + 3} anchor="end" size={10} color={INK}>
            {d.label}
          </Text>
          <rect x={86} y={b.at(i)} width={x(d.value) - 86} height={b.bw} rx={3} fill={i === 0 ? PAL[0] : "rgba(42,120,214,0.45)"} />
          <Text x={x(d.value) + 4} y={b.mid(i) + 3} size={9} mono>
            {fmt(d.value)}
          </Text>
        </g>
      ))}
    </Svg>
  );
}

export function Column() {
  const max = nice(top6[0].value);
  const y = lin(0, max, H - M.b, M.t);
  const b = band(top6.length, M.l, W - M.r);
  return (
    <Svg label="Column chart of revenue by city">
      <YGrid y={y} max={max} />
      {top6.map((d, i) => (
        <rect key={d.label} x={b.at(i)} y={y(d.value)} width={b.bw} height={H - M.b - y(d.value)} rx={3} fill={PAL[0]} />
      ))}
      <XLabels labels={top6.map((d) => d.label.slice(0, 6))} x={b.mid} />
    </Svg>
  );
}

export function Grouped() {
  const rows = revenueLastYear.slice(0, 5);
  const max = nice(Math.max(...rows.map((r) => r.b)));
  const y = lin(0, max, H - M.b, M.t + 10);
  const b = band(rows.length, M.l, W - M.r, 0.3);
  return (
    <Svg label="Grouped column chart: last year and this year by city">
      <YGrid y={y} max={max} />
      <Legend
        items={[
          { label: "Last year", color: "rgba(11,11,11,0.3)" },
          { label: "This year", color: PAL[0] },
        ]}
        x={W - 160}
      />
      {rows.map((r, i) => (
        <g key={r.label}>
          <rect x={b.at(i)} y={y(r.a)} width={r1(b.bw / 2 - 1)} height={H - M.b - y(r.a)} rx={2} fill="rgba(11,11,11,0.3)" />
          <rect x={r1(b.at(i) + b.bw / 2 + 1)} y={y(r.b)} width={r1(b.bw / 2 - 1)} height={H - M.b - y(r.b)} rx={2} fill={PAL[0]} />
        </g>
      ))}
      <XLabels labels={rows.map((r) => r.label.slice(0, 6))} x={b.mid} />
    </Svg>
  );
}

function stackedCols(share: boolean) {
  const rows = cityProduct;
  const totals = rows.map((r) => r.parts.reduce((a, b) => a + b, 0));
  const max = share ? 1 : nice(Math.max(...totals));
  const y = lin(0, max, H - M.b, M.t + 12);
  const b = band(rows.length, M.l, W - M.r, 0.3);
  return (
    <Svg label={share ? "100% stacked columns: product mix per city" : "Stacked columns: revenue per city split by product"}>
      <YGrid y={y} max={max} format={share ? (v) => `${Math.round(v * 100)}%` : fmt} />
      <Legend items={PRODUCTS.map((p, i) => ({ label: p, color: PAL[i] }))} x={M.l} y={8} />
      {rows.map((r, i) => {
        let acc = 0;
        return (
          <g key={r.label}>
            {r.parts.map((p, k) => {
              const v = share ? p / totals[i] : p;
              const y0 = y(acc);
              acc += v;
              return <rect key={k} x={b.at(i)} y={y(acc)} width={b.bw} height={r1(y0 - y(acc))} fill={PAL[k]} />;
            })}
          </g>
        );
      })}
      <XLabels labels={rows.map((r) => r.label.slice(0, 6))} x={b.mid} />
    </Svg>
  );
}
export const Stacked = () => stackedCols(false);
export const Stacked100 = () => stackedCols(true);

export function Lollipop() {
  const max = nice(top6[0].value);
  const x = lin(0, max, 86, W - M.r - 10);
  const b = band(top6.length, M.t, H - 10, 0);
  return (
    <Svg label="Lollipop chart of revenue by city">
      {top6.map((d, i) => (
        <g key={d.label}>
          <Text x={80} y={b.mid(i) + 3} anchor="end" size={10} color={INK}>
            {d.label}
          </Text>
          <line x1={86} x2={x(d.value)} y1={b.mid(i)} y2={b.mid(i)} stroke="rgba(42,120,214,0.5)" strokeWidth={2} />
          <circle cx={x(d.value)} cy={b.mid(i)} r={6} fill={PAL[0]} />
        </g>
      ))}
    </Svg>
  );
}

export function DotPlot() {
  const rows = revenueLastYear.slice(0, 6);
  const max = nice(Math.max(...rows.map((r) => r.b)));
  const x = lin(0, max, 86, W - M.r - 10);
  const b = band(rows.length, M.t + 12, H - 10, 0);
  return (
    <Svg label="Dot plot: last year and this year per city">
      <Legend
        items={[
          { label: "Last year", color: "rgba(11,11,11,0.35)" },
          { label: "This year", color: PAL[1] },
        ]}
        x={86}
        y={8}
      />
      {rows.map((r, i) => (
        <g key={r.label}>
          <Text x={80} y={b.mid(i) + 3} anchor="end" size={10} color={INK}>
            {r.label}
          </Text>
          <line x1={86} x2={W - M.r - 10} y1={b.mid(i)} y2={b.mid(i)} stroke="rgba(11,11,11,0.07)" />
          <circle cx={x(r.a)} cy={b.mid(i)} r={5} fill="rgba(11,11,11,0.35)" />
          <circle cx={x(r.b)} cy={b.mid(i)} r={5} fill={PAL[1]} />
        </g>
      ))}
    </Svg>
  );
}

export function Dumbbell() {
  const rows = revenueLastYear.slice(0, 6);
  const max = nice(Math.max(...rows.map((r) => r.b)));
  const x = lin(0, max, 86, W - M.r - 30);
  const b = band(rows.length, M.t, H - 10, 0);
  return (
    <Svg label="Dumbbell chart: change from last year to this year per city">
      {rows.map((r, i) => (
        <g key={r.label}>
          <Text x={80} y={b.mid(i) + 3} anchor="end" size={10} color={INK}>
            {r.label}
          </Text>
          <line x1={x(r.a)} x2={x(r.b)} y1={b.mid(i)} y2={b.mid(i)} stroke={PAL[2]} strokeWidth={4} opacity={0.5} />
          <circle cx={x(r.a)} cy={b.mid(i)} r={5} fill="rgba(11,11,11,0.35)" />
          <circle cx={x(r.b)} cy={b.mid(i)} r={5} fill={PAL[2]} />
          <Text x={x(r.b) + 8} y={b.mid(i) + 3} size={9} mono color={PAL[2]}>
            +{Math.round((r.b / r.a - 1) * 100)}%
          </Text>
        </g>
      ))}
    </Svg>
  );
}

export function Slope() {
  const rows = revenueLastYear.slice(0, 6);
  // a slope chart zooms in on the range of the values: the angles carry the story
  const lo = Math.min(...rows.map((r) => Math.min(r.a, r.b)));
  const hi = Math.max(...rows.map((r) => Math.max(r.a, r.b)));
  const y = lin(lo * 0.95, hi * 1.02, H - 16, 24);
  return (
    <Svg label="Slope chart: each city from last year to this year">
      <Text x={110} y={12} anchor="middle" size={9} mono>
        LAST YEAR
      </Text>
      <Text x={250} y={12} anchor="middle" size={9} mono>
        THIS YEAR
      </Text>
      {rows.map((r, i) => (
        <g key={r.label}>
          <line x1={110} x2={250} y1={y(r.a)} y2={y(r.b)} stroke={PAL[i]} strokeWidth={2} />
          <circle cx={110} cy={y(r.a)} r={3.5} fill={PAL[i]} />
          <circle cx={250} cy={y(r.b)} r={3.5} fill={PAL[i]} />
          <Text x={256} y={y(r.b) + 3} size={9} color={PAL[i]}>
            {r.label}
          </Text>
        </g>
      ))}
    </Svg>
  );
}

export function Bullet() {
  const b = band(targets.length, M.t, H - 6, 0.35);
  const max = nice(Math.max(...targets.map((t) => Math.max(t.value, t.target))) * 1.05);
  const x = lin(0, max, 86, W - M.r);
  return (
    <Svg label="Bullet chart: revenue against target per city">
      {targets.map((t, i) => (
        <g key={t.label}>
          <Text x={80} y={b.mid(i) + 3} anchor="end" size={10} color={INK}>
            {t.label}
          </Text>
          <rect x={86} y={b.at(i)} width={x(max) - 86} height={b.bw} fill="rgba(11,11,11,0.06)" />
          <rect x={86} y={b.at(i)} width={x(t.ok) - 86} height={b.bw} fill="rgba(11,11,11,0.1)" />
          <rect x={86} y={b.at(i)} width={x(t.poor) - 86} height={b.bw} fill="rgba(11,11,11,0.16)" />
          <rect x={86} y={r1(b.at(i) + b.bw * 0.3)} width={x(t.value) - 86} height={r1(b.bw * 0.4)} fill={INK} />
          <line x1={x(t.target)} x2={x(t.target)} y1={b.at(i) - 2} y2={b.at(i) + b.bw + 2} stroke={PAL[1]} strokeWidth={2.5} />
        </g>
      ))}
      <Text x={W - M.r} y={H - 2} anchor="end" size={8.5} color={MUTED}>
        bar = actual · orange tick = target · shades = poor / ok / good
      </Text>
    </Svg>
  );
}
