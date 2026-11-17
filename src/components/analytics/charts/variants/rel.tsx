import { ASPECTS, CITIES, baskets, cityMatrix, network, ratings, stores } from "@/data/chart-demo";
import { H, INK, Legend, M, MUTED, PAL, Svg, Text, W, YGrid, band, lin, path, r1 } from "../kit";
import { defs } from "../types";
import { BAD, GOOD, bins, div, linreg, mean, polar, sd, seq, sum } from "./base";

const wait = stores.map((s) => s.wait);
const satis = stores.map((s) => s.satisfaction);
const fit = linreg(wait, satis);
const corr = (a: number[], b: number[]) => {
  const ma = mean(a);
  const mb = mean(b);
  return sum(a.map((v, i) => (v - ma) * (b[i] - mb))) / Math.sqrt(sum(a.map((v) => (v - ma) ** 2)) * sum(b.map((v) => (v - mb) ** 2)));
};
const r = corr(wait, satis);
const JAVA = ["Jakarta", "Surabaya", "Bandung", "Yogyakarta", "Semarang"];
const sx = lin(0, 16, M.l, W - M.r);
const sy = lin(1, 5, H - M.b, M.t);
const axes = (xl: string, yl: string) => (
  <g>
    <YGrid y={sy} max={5} min={1} ticks={4} />
    {[0, 4, 8, 12, 16].map((v) => (
      <Text key={v} x={sx(v)} y={H - M.b + 13} anchor="middle" size={8.5}>
        {v}
      </Text>
    ))}
    <Text x={W - M.r} y={H - M.b - 5} anchor="end" size={8.5}>
      {xl}
    </Text>
    <Text x={M.l + 4} y={M.t + 4} size={8.5}>
      {yl}
    </Text>
  </g>
);

/* ---------------------------------------------------------------- scatter */
const Trend = () => (
  <Svg label="Scatter with a fitted trend line: longer waits, lower satisfaction">
    {axes("wait (min) →", "satisfaction ↑")}
    {stores.map((s) => (
      <circle key={s.id} cx={sx(s.wait)} cy={sy(s.satisfaction)} r={3.5} fill={PAL[0]} opacity={0.6} />
    ))}
    <line x1={sx(0)} y1={sy(fit.a)} x2={sx(16)} y2={sy(fit.a + fit.b * 16)} stroke={PAL[1]} strokeWidth={2.2} />
    <Text x={sx(10)} y={sy(fit.a + fit.b * 10) - 8} size={9} color={PAL[1]} weight={700}>
      {`r = ${r.toFixed(2)}`}
    </Text>
  </Svg>
);
const Groups = () => (
  <Svg label="Scatter coloured by group: stores on Java and elsewhere">
    {axes("wait (min) →", "satisfaction ↑")}
    <Legend
      items={[
        { label: "Java", color: PAL[0] },
        { label: "Outside Java", color: PAL[1] },
      ]}
      x={W - 150}
      y={M.t + 2}
    />
    {stores.map((s) => (
      <circle key={s.id} cx={sx(s.wait)} cy={sy(s.satisfaction)} r={3.8} fill={JAVA.includes(s.city) ? PAL[0] : PAL[1]} opacity={0.7} />
    ))}
  </Svg>
);
const rev = stores.map((s) => s.revenue);
const qx = lin(Math.min(...rev) * 0.9, Math.max(...rev) * 1.05, M.l, W - M.r);
function Quadrant() {
  const mx = mean(rev);
  const my = mean(satis);
  return (
    <Svg label="Quadrant chart: stores split by average revenue and average satisfaction into four groups">
      <rect x={qx(mx)} y={M.t} width={r1(W - M.r - qx(mx))} height={r1(sy(my) - M.t)} fill="rgba(27,175,122,0.08)" />
      <rect x={M.l} y={sy(my)} width={r1(qx(mx) - M.l)} height={r1(H - M.b - sy(my))} fill="rgba(227,73,72,0.07)" />
      <line x1={qx(mx)} x2={qx(mx)} y1={M.t} y2={H - M.b} stroke={MUTED} strokeDasharray="3 3" />
      <line x1={M.l} x2={W - M.r} y1={sy(my)} y2={sy(my)} stroke={MUTED} strokeDasharray="3 3" />
      {stores.map((s) => (
        <circle key={s.id} cx={qx(s.revenue)} cy={sy(s.satisfaction)} r={3.5} fill={s.revenue >= mx ? (s.satisfaction >= my ? GOOD : PAL[1]) : s.satisfaction >= my ? PAL[0] : BAD} opacity={0.75} />
      ))}
      {[
        ["Stars", W - M.r - 4, M.t + 10, "end"],
        ["Loved, small", M.l + 4, M.t + 10, "start"],
        ["Busy, unhappy", W - M.r - 4, H - M.b - 6, "end"],
        ["Needs help", M.l + 4, H - M.b - 6, "start"],
      ].map(([t, x, y, a]) => (
        <Text key={t as string} x={x as number} y={y as number} anchor={a as "start" | "end"} size={9} color={INK} weight={700}>
          {t as string}
        </Text>
      ))}
    </Svg>
  );
}
const cityAvg = CITIES.map((c) => {
  const s = stores.filter((x) => x.city === c);
  return { label: c, wait: mean(s.map((x) => x.wait)), sat: mean(s.map((x) => x.satisfaction)) };
});
function Labelled() {
  const x = lin(4, 12, M.l, W - M.r - 30);
  const y = lin(3, 4.6, H - M.b, M.t);
  return (
    <Svg label="Labelled scatter: one point per city, named directly next to the dot">
      <YGrid y={y} max={4.6} min={3} ticks={4} format={(v) => v.toFixed(1)} />
      {cityAvg.map((c, i) => (
        <g key={c.label}>
          <circle cx={x(c.wait)} cy={y(c.sat)} r={5} fill={PAL[i % PAL.length]} />
          <Text x={x(c.wait) + 8} y={y(c.sat) + 3} size={8.5} color={INK}>
            {c.label}
          </Text>
        </g>
      ))}
      <Text x={W - M.r} y={H - M.b + 13} anchor="end" size={8.5}>
        {"average wait (min) →"}
      </Text>
    </Svg>
  );
}
function Marginal() {
  const x = lin(0, 16, M.l, W - 60);
  const y = lin(1, 5, H - M.b, 50);
  const hx = bins(wait, 0, 1, 16);
  const hy = bins(satis, 1, 0.25, 16);
  const mxh = Math.max(...hx);
  const myh = Math.max(...hy);
  return (
    <Svg label="Scatter with marginal histograms: the distribution of each variable along its edge">
      {hx.map((c, i) => (
        <rect key={`x${i}`} x={x(i) + 0.5} y={r1(44 - (c / mxh) * 32)} width={r1(x(1) - x(0) - 1)} height={r1((c / mxh) * 32)} fill={PAL[0]} opacity={0.6} />
      ))}
      {hy.map((c, i) => (
        <rect key={`y${i}`} x={W - 54} y={y(1 + (i + 1) * 0.25) + 0.5} width={r1((c / myh) * 40)} height={r1(y(1) - y(1.25) - 1)} fill={PAL[1]} opacity={0.6} />
      ))}
      {stores.map((s) => (
        <circle key={s.id} cx={x(s.wait)} cy={y(s.satisfaction)} r={3} fill={INK} opacity={0.55} />
      ))}
      <line x1={M.l} x2={W - 60} y1={H - M.b} y2={H - M.b} stroke={MUTED} />
      <line x1={M.l} x2={M.l} y1={50} y2={H - M.b} stroke={MUTED} />
      <Text x={M.l} y={H - M.b + 13} size={8.5}>
        {"wait →"}
      </Text>
    </Svg>
  );
}
const bx = lin(0, 9, M.l, W - M.r);
const by = lin(0, 260, H - M.b, M.t);
function Hexbin() {
  const R = 9;
  const hw = R * Math.sqrt(3);
  const cells = new Map<string, { cx: number; cy: number; n: number }>();
  baskets.forEach((b) => {
    const px = bx(b.items);
    const py = by(b.value);
    const row = Math.round((py - M.t) / (R * 1.5));
    const off = row % 2 ? hw / 2 : 0;
    const col = Math.round((px - M.l - off) / hw);
    const key = `${col},${row}`;
    const c = cells.get(key) ?? { cx: r1(M.l + col * hw + off), cy: r1(M.t + row * R * 1.5), n: 0 };
    c.n += 1;
    cells.set(key, c);
  });
  const max = Math.max(...[...cells.values()].map((c) => c.n));
  const hex = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, k) => polar(cx, cy, R - 0.6, (k * Math.PI) / 3))
      .map((p, k) => `${k ? "L" : "M"}${p[0]},${p[1]}`)
      .join(" ") + " Z";
  return (
    <Svg label="Hexbin: 420 baskets counted into hexagons, darker = more baskets">
      <YGrid y={by} max={260} ticks={4} format={(v) => `${v}k`} />
      {[...cells.values()].map((c) => (
        <path key={`${c.cx},${c.cy}`} d={hex(c.cx, c.cy)} fill={seq(0.15 + (0.85 * c.n) / max)} />
      ))}
      <Text x={W - M.r} y={H - M.b + 13} anchor="end" size={8.5}>
        {"items in basket →"}
      </Text>
    </Svg>
  );
}
function Ellipses() {
  const xs = baskets.map((b) => b.items);
  const ys = baskets.map((b) => b.value);
  const mx = mean(xs);
  const my = mean(ys);
  const sxx = sd(xs);
  const syy = sd(ys);
  const c = corr(xs, ys);
  // ellipse of a 2D normal: rotate unit circle by the covariance structure
  const ell = (k: number) =>
    Array.from({ length: 49 }, (_, t) => {
      const a = (t / 48) * Math.PI * 2;
      const u = Math.cos(a);
      const v = Math.sin(a);
      const px = mx + k * sxx * u;
      const py = my + k * syy * (c * u + Math.sqrt(1 - c * c) * v);
      return [bx(px), by(py)] as [number, number];
    });
  return (
    <Svg label="Scatter with density ellipses: where one and two standard deviations of baskets fall">
      <YGrid y={by} max={260} ticks={4} format={(v) => `${v}k`} />
      {baskets.map((b, i) => (
        <circle key={i} cx={bx(b.items)} cy={by(b.value)} r={1.8} fill={PAL[3]} opacity={0.35} />
      ))}
      {[1, 2].map((k) => (
        <path key={k} d={`${path(ell(k))} Z`} fill="none" stroke={PAL[3]} strokeWidth={k === 1 ? 2.2 : 1.4} strokeDasharray={k === 2 ? "4 3" : undefined} />
      ))}
      <Text x={W - M.r} y={H - M.b + 13} anchor="end" size={8.5}>
        {"items in basket →"}
      </Text>
    </Svg>
  );
}
function Residuals() {
  const res = stores.map((s) => s.satisfaction - (fit.a + fit.b * s.wait));
  const y = lin(-1, 1, H - M.b, M.t);
  return (
    <Svg label="Residual plot: what the trend line misses for each store; no pattern means the line fits">
      <YGrid y={y} max={1} min={-1} ticks={4} format={(v) => v.toFixed(1)} />
      <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} stroke={INK} />
      {stores.map((s, i) => (
        <g key={s.id}>
          <line x1={sx(s.wait)} x2={sx(s.wait)} y1={y(0)} y2={y(res[i])} stroke={res[i] > 0 ? GOOD : BAD} opacity={0.5} />
          <circle cx={sx(s.wait)} cy={y(res[i])} r={3} fill={res[i] > 0 ? GOOD : BAD} />
        </g>
      ))}
      <Text x={W - M.r} y={H - M.b + 13} anchor="end" size={8.5}>
        {"wait (min) →"}
      </Text>
    </Svg>
  );
}

/* ---------------------------------------------------------------- matrices */
function Bin2D() {
  const nx = 9;
  const ny = 13;
  const grid = Array.from({ length: ny }, (_, j) =>
    Array.from({ length: nx }, (_, i) => baskets.filter((b) => b.items >= i + 0.5 && b.items < i + 1.5 && b.value >= j * 20 && b.value < (j + 1) * 20).length),
  );
  const max = Math.max(...grid.flat());
  const cw = (W - M.l - M.r) / nx;
  const ch = (H - M.t - M.b) / ny;
  return (
    <Svg label="2D histogram: baskets counted in a grid of item counts and order values">
      {grid.map((row, j) =>
        row.map((n, i) => (n ? <rect key={`${i}${j}`} x={r1(M.l + i * cw)} y={r1(H - M.b - (j + 1) * ch)} width={r1(cw - 1)} height={r1(ch - 1)} fill={seq(0.1 + (0.9 * n) / max)} /> : null)),
      )}
      {Array.from({ length: nx }, (_, i) => (
        <Text key={i} x={r1(M.l + (i + 0.5) * cw)} y={H - M.b + 13} anchor="middle" size={8.5}>
          {i + 1}
        </Text>
      ))}
      {[0, 100, 200].map((v) => (
        <Text key={v} x={M.l - 5} y={r1(H - M.b - (v / 20) * ch + 3)} anchor="end" size={8.5} mono>
          {`${v}k`}
        </Text>
      ))}
    </Svg>
  );
}
const MET = [
  { k: "wait", label: "Wait", v: wait },
  { k: "sat", label: "Satisfaction", v: satis },
  { k: "rev", label: "Revenue", v: rev },
];
function Splom() {
  const n = MET.length;
  const size = (H - 12) / n;
  const ox = (W - size * n) / 2;
  return (
    <Svg label="Scatter-plot matrix: every pair of three store measures, histograms on the diagonal">
      {MET.map((a, i) =>
        MET.map((b, j) => {
          const x0 = ox + j * size;
          const y0 = 6 + i * size;
          const fx = lin(Math.min(...b.v), Math.max(...b.v), x0 + 4, x0 + size - 4);
          const fy = lin(Math.min(...a.v), Math.max(...a.v), y0 + size - 4, y0 + 4);
          return (
            <g key={`${i}${j}`}>
              <rect x={r1(x0)} y={r1(y0)} width={r1(size - 3)} height={r1(size - 3)} rx={4} fill="rgba(11,11,11,0.03)" />
              {i === j ? (
                <g>
                  {bins(a.v, Math.min(...a.v), (Math.max(...a.v) - Math.min(...a.v)) / 8 + 1e-9, 8).map((c, k, arr) => (
                    <rect
                      key={k}
                      x={r1(x0 + 4 + (k * (size - 11)) / 8)}
                      y={r1(y0 + size - 4 - (c / Math.max(...arr)) * (size - 22))}
                      width={r1((size - 11) / 8 - 1)}
                      height={r1((c / Math.max(...arr)) * (size - 22))}
                      fill={PAL[i]}
                      opacity={0.7}
                    />
                  ))}
                  <Text x={x0 + 5} y={y0 + 11} size={8} color={INK} weight={700}>
                    {a.label}
                  </Text>
                </g>
              ) : (
                a.v.map((v, k) => <circle key={k} cx={fx(b.v[k])} cy={fy(v)} r={1.6} fill={INK} opacity={0.45} />)
              )}
            </g>
          );
        }),
      )}
    </Svg>
  );
}
function Adjacency() {
  const { labels, m } = cityMatrix;
  const max = Math.max(...m.flat());
  const cell = 26;
  const ox = 90;
  return (
    <Svg label="Adjacency matrix: how many customers ordered in both cities, darker = more">
      {labels.map((l, i) => (
        <g key={l}>
          <Text x={ox - 6} y={r1(24 + i * cell + cell / 2 + 3)} anchor="end" size={8.5} color={INK}>
            {l}
          </Text>
          <text transform={`translate(${r1(ox + i * cell + cell / 2 + 3)},${20}) rotate(-45)`} fontSize={8} fill={MUTED} fontFamily="ui-sans-serif, system-ui, sans-serif">
            {l.slice(0, 5)}
          </text>
          {m[i].map((v, j) => (
            <rect key={j} x={ox + j * cell} y={24 + i * cell} width={cell - 2} height={cell - 2} rx={3} fill={i === j ? "rgba(11,11,11,0.04)" : seq(v / max)} />
          ))}
        </g>
      ))}
    </Svg>
  );
}
function CorrBars() {
  const rows = [
    { label: "Wait time", v: corr(wait, satis) },
    { label: "Revenue", v: corr(rev, satis) },
    {
      label: "Seats",
      v: corr(
        stores.map((s) => s.seats),
        satis,
      ),
    },
  ];
  const x = lin(-1, 1, 100, W - 20);
  const b = band(rows.length, 30, H - 20, 0.45);
  return (
    <Svg label="Correlation bars: how strongly each measure moves with satisfaction, from −1 to +1">
      <Text x={x(0)} y={16} anchor="middle" size={8.5}>
        {"correlation with satisfaction"}
      </Text>
      {rows.map((row, i) => (
        <g key={row.label}>
          <Text x={94} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
            {row.label}
          </Text>
          <rect x={Math.min(x(0), x(row.v))} y={b.at(i)} width={r1(Math.abs(x(row.v) - x(0)))} height={b.bw} rx={3} fill={div(row.v)} stroke={row.v < 0 ? BAD : GOOD} />
          <Text x={row.v < 0 ? x(row.v) - 4 : x(row.v) + 4} y={b.mid(i) + 3} anchor={row.v < 0 ? "end" : "start"} size={8.5} mono>
            {row.v.toFixed(2)}
          </Text>
        </g>
      ))}
      <line x1={x(0)} x2={x(0)} y1={24} y2={H - 14} stroke={INK} />
      {[-1, -0.5, 0, 0.5, 1].map((v) => (
        <Text key={v} x={x(v)} y={H - 4} anchor="middle" size={8} mono>
          {v}
        </Text>
      ))}
    </Svg>
  );
}

/* ---------------------------------------------------------------- multivariate */
function Parallel() {
  const dims = [
    { label: "Wait", v: wait },
    { label: "Seats", v: stores.map((s) => s.seats) },
    { label: "Revenue", v: rev },
    { label: "Satisfaction", v: satis },
  ];
  const x = lin(0, dims.length - 1, 40, W - 40);
  const ys = dims.map((d) => lin(Math.min(...d.v), Math.max(...d.v), H - 24, 24));
  return (
    <Svg label="Parallel coordinates: each store is a line across four measures, coloured by satisfaction">
      {stores.map((s, k) => (
        <path key={s.id} d={path(dims.map((d, i) => [x(i), ys[i](d.v[k])]))} fill="none" stroke={div((s.satisfaction - 3.5) / 1.5)} strokeWidth={1.2} opacity={0.75} />
      ))}
      {dims.map((d, i) => (
        <g key={d.label}>
          <line x1={x(i)} x2={x(i)} y1={24} y2={H - 24} stroke={INK} />
          <Text x={x(i)} y={16} anchor="middle" size={9} color={INK} weight={700}>
            {d.label}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function radarPath(cx: number, cy: number, R: number, v: number[]) {
  return `${v.map((val, i) => `${i ? "L" : "M"}${polar(cx, cy, (R * (val - 1)) / 4, (i / v.length) * Math.PI * 2).join(",")}`).join(" ")} Z`;
}
function Radar() {
  const two = [ratings[0], ratings[3]];
  return (
    <Svg label="Radar chart: two cities rated on six aspects">
      {[2, 3, 4, 5].map((lv) => (
        <path
          key={lv}
          d={radarPath(
            170,
            114,
            88,
            ASPECTS.map(() => lv),
          )}
          fill="none"
          stroke="rgba(11,11,11,0.1)"
        />
      ))}
      {ASPECTS.map((a, i) => {
        const [x, y] = polar(170, 114, 100, (i / ASPECTS.length) * Math.PI * 2);
        return (
          <Text key={a} x={x} y={y + 3} anchor={x < 165 ? "end" : x > 175 ? "start" : "middle"} size={8.5}>
            {a}
          </Text>
        );
      })}
      {two.map((c, k) => (
        <path key={c.label} d={radarPath(170, 114, 88, c.values)} fill={PAL[k]} fillOpacity={0.15} stroke={PAL[k]} strokeWidth={2} />
      ))}
      <Legend items={two.map((c, k) => ({ label: c.label, color: PAL[k] }))} x={10} />
    </Svg>
  );
}
function Radars() {
  return (
    <Svg label="Small-multiple radars: every city's six ratings, one small radar each">
      {ratings.map((c, k) => {
        const cx = 46 + (k % 4) * 88;
        const cy = 56 + Math.floor(k / 4) * 98;
        return (
          <g key={c.label}>
            <path
              d={radarPath(
                cx,
                cy,
                36,
                ASPECTS.map(() => 5),
              )}
              fill="rgba(11,11,11,0.03)"
              stroke="rgba(11,11,11,0.1)"
            />
            <path d={radarPath(cx, cy, 36, c.values)} fill={PAL[k % PAL.length]} fillOpacity={0.3} stroke={PAL[k % PAL.length]} strokeWidth={1.5} />
            <Text x={cx} y={cy + 46} anchor="middle" size={8.5} color={INK}>
              {c.label}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function RatingHeat() {
  const cw = (W - 86) / ASPECTS.length;
  const ch = (H - 30) / ratings.length;
  return (
    <Svg label="Heatmap of ratings: cities down the side, aspects across the top, with the score in each cell">
      {ASPECTS.map((a, j) => (
        <Text key={a} x={r1(80 + j * cw + cw / 2)} y={14} anchor="middle" size={8}>
          {a}
        </Text>
      ))}
      {ratings.map((c, i) => (
        <g key={c.label}>
          <Text x={74} y={r1(22 + i * ch + ch / 2 + 3)} anchor="end" size={8.5} color={INK}>
            {c.label}
          </Text>
          {c.values.map((v, j) => (
            <g key={j}>
              <rect x={r1(80 + j * cw)} y={r1(22 + i * ch)} width={r1(cw - 2)} height={r1(ch - 2)} rx={3} fill={div((v - 3.8) / 1.2)} />
              <Text x={r1(80 + j * cw + cw / 2)} y={r1(22 + i * ch + ch / 2 + 3)} anchor="middle" size={8} mono color={INK}>
                {v.toFixed(1)}
              </Text>
            </g>
          ))}
        </g>
      ))}
    </Svg>
  );
}

/* ---------------------------------------------------------------- networks */
const NODE_POS: [number, number][] = [
  [180, 110],
  [100, 70],
  [260, 70],
  [40, 40],
  [320, 150],
  [60, 120],
  [130, 180],
  [330, 40],
  [250, 190],
  [300, 110],
  [40, 190],
];
function Network() {
  return (
    <Svg label="Network graph: the roastery supplies two warehouses, which supply the city stores">
      {network.links.map(([a, b], i) => (
        <line key={i} x1={NODE_POS[a][0]} y1={NODE_POS[a][1]} x2={NODE_POS[b][0]} y2={NODE_POS[b][1]} stroke="rgba(11,11,11,0.25)" strokeWidth={network.nodes[a].kind === 0 ? 3 : 1.4} />
      ))}
      {network.nodes.map((n, i) => (
        <g key={n.id}>
          <circle cx={NODE_POS[i][0]} cy={NODE_POS[i][1]} r={[14, 10, 6][n.kind]} fill={[INK, PAL[1], PAL[0]][n.kind]} stroke="#fff" strokeWidth={2} />
          <Text x={NODE_POS[i][0]} y={NODE_POS[i][1] + [26, 21, 16][n.kind]} anchor="middle" size={8} color={INK}>
            {n.id}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function Chord() {
  const { labels, m } = cityMatrix;
  const tot = m.map((row) => sum(row));
  const all = sum(tot);
  const gap = 0.06;
  const span = Math.PI * 2 - gap * labels.length;
  const starts = tot.reduce<number[]>((acc, t, i) => [...acc, acc[i] + (t / all) * span + gap], [0]);
  const cx = 180;
  const cy = 112;
  const R = 88;
  // position of the slice of group i reserved for group j
  const sub = (i: number, j: number) => {
    const before = sum(m[i].slice(0, j));
    const a0 = starts[i] + (before / all) * span;
    return [a0, a0 + (m[i][j] / all) * span];
  };
  return (
    <Svg label="Chord diagram: ribbons show how many customers ordered in both cities">
      {labels.map((l, i) => {
        const a0 = starts[i];
        const a1 = starts[i] + (tot[i] / all) * span;
        const [lx, ly] = polar(cx, cy, R + 14, (a0 + a1) / 2);
        const p0 = polar(cx, cy, R, a0);
        const p1 = polar(cx, cy, R, a1);
        const q0 = polar(cx, cy, R + 7, a0);
        const q1 = polar(cx, cy, R + 7, a1);
        const large = a1 - a0 > Math.PI ? 1 : 0;
        return (
          <g key={l}>
            <path d={`M${p0} A${R},${R} 0 ${large} 1 ${p1} L${q1} A${R + 7},${R + 7} 0 ${large} 0 ${q0} Z`} fill={PAL[i]} />
            <Text x={lx} y={ly + 3} anchor={lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle"} size={8} color={INK}>
              {l}
            </Text>
          </g>
        );
      })}
      {labels.map((_, i) =>
        labels.map((__, j) => {
          if (j <= i) return null;
          const [a0, a1] = sub(i, j);
          const [b0, b1] = sub(j, i);
          const A0 = polar(cx, cy, R, a0);
          const A1 = polar(cx, cy, R, a1);
          const B0 = polar(cx, cy, R, b0);
          const B1 = polar(cx, cy, R, b1);
          return <path key={`${i}${j}`} d={`M${A0} A${R},${R} 0 0 1 ${A1} Q${cx},${cy} ${B0} A${R},${R} 0 0 1 ${B1} Q${cx},${cy} ${A0} Z`} fill={PAL[i]} opacity={0.35} />;
        }),
      )}
    </Svg>
  );
}
function ArcDiagram() {
  const { labels, m } = cityMatrix;
  const x = lin(0, labels.length - 1, 40, W - 40);
  const base = 170;
  const max = Math.max(...m.flat());
  return (
    <Svg label="Arc diagram: cities on a line, arcs between them as thick as the customers they share">
      {labels.map((_, i) =>
        labels.map((__, j) => {
          if (j <= i) return null;
          const v = m[i][j];
          const rr = (x(j) - x(i)) / 2;
          return <path key={`${i}${j}`} d={`M${x(i)},${base} A${r1(rr)},${r1(rr)} 0 0 1 ${x(j)},${base}`} fill="none" stroke={PAL[i]} strokeWidth={r1(0.6 + (v / max) * 6)} opacity={0.5} />;
        }),
      )}
      {labels.map((l, i) => (
        <g key={l}>
          <circle cx={x(i)} cy={base} r={5} fill={PAL[i]} />
          <Text x={x(i)} y={base + 18} anchor="middle" size={8.5} color={INK}>
            {l}
          </Text>
        </g>
      ))}
    </Svg>
  );
}

export const REL_VARIANTS = [
  ...defs("Relationship", "Scatter", [
    ["rl-trend", "Scatter with trend line", "Showing the direction and strength of a relationship.", "Curved relationships: a straight line misleads.", Trend],
    ["rl-groups", "Scatter by group", "Whether groups behave differently.", "More than 4–5 groups: colours blur.", Groups],
    ["rl-quadrant", "Quadrant chart", "Sorting items into four action groups.", "When the split lines are arbitrary and unstated.", Quadrant],
    ["rl-labelled", "Labelled scatter", "Few points that readers know by name.", "Dozens of points: labels collide.", Labelled],
    ["rl-marginal", "Scatter with marginals", "Relationship and each variable's distribution together.", "Small charts.", Marginal],
    ["rl-hexbin", "Hexbin", "Thousands of points that would overlap.", "Small data: show the points.", Hexbin],
    ["rl-ellipses", "Density ellipses", "Summarising a cloud of points and its spread.", "Clusters or curved shapes.", Ellipses],
    ["rl-residuals", "Residual plot", "Checking whether a fitted line is good enough.", "Non-technical audiences.", Residuals],
  ]),
  ...defs("Relationship", "Matrices", [
    ["rl-bin2d", "2D histogram", "Where most observations cluster on two axes.", "Small datasets.", Bin2D],
    ["rl-splom", "Scatter-plot matrix", "Exploring all pairs of a few variables at once.", "More than 5 variables.", Splom],
    ["rl-adjacency", "Adjacency matrix", "Connections between many items without spaghetti.", "Readers who expect a network picture.", Adjacency],
    ["rl-corrbars", "Correlation bars", "Which drivers move with an outcome most.", "Reading correlation as cause.", CorrBars],
  ]),
  ...defs("Relationship", "Multivariate", [
    ["rl-parallel", "Parallel coordinates", "Many measures per item, finding patterns and outliers.", "Many lines without colour or highlight.", Parallel],
    ["rl-radar", "Radar chart", "Profiles of two or three items across the same aspects.", "Precise comparison: shape depends on axis order.", Radar],
    ["rl-radars", "Small-multiple radars", "Many profiles side by side.", "When numbers matter: use a heat table.", Radars],
    ["rl-heat", "Ratings heatmap", "Many items × many aspects, with exact scores.", "Very large grids.", RatingHeat],
  ]),
  ...defs("Relationship", "Networks", [
    ["rl-network", "Network graph", "Who connects to whom, and the hubs.", "Dense networks: it becomes a hairball.", Network],
    ["rl-chord", "Chord diagram", "Flows or overlaps between a handful of groups.", "Many groups or precise values.", Chord],
    ["rl-arc", "Arc diagram", "Connections between items in a meaningful order.", "Many crossing arcs.", ArcDiagram],
  ]),
];
