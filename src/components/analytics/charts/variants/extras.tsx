import { ASPECTS, CHANNELS, MONTHS, baskets, churn, cityChannel, daily, featureImportance, hierarchy, orderValues, ratings, revenueByCity, sets, stores } from "@/data/chart-demo";
import { H, INK, M, MUTED, PAL, Svg, Text, W, YGrid, band, fmt, lin, offsets, path, r1 } from "../kit";
import { defs } from "../types";
import { BAD, GOOD, mean, polar, sd, seq, sum } from "./base";
import { pack } from "./parts";

/* ---------------------------------------------------------------- sets */
const A = sets.only.A + sets.AB + sets.AC + sets.ABC;
const C = sets.only.C + sets.AC + sets.BC + sets.ABC;
const AC = sets.AC + sets.ABC;
/** Overlap area of two circles at distance d. */
function lens(r1_: number, r2: number, d: number) {
  if (d >= r1_ + r2) return 0;
  if (d <= Math.abs(r1_ - r2)) return Math.PI * Math.min(r1_, r2) ** 2;
  const a = r1_ * r1_ * Math.acos((d * d + r1_ * r1_ - r2 * r2) / (2 * d * r1_));
  const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1_ * r1_) / (2 * d * r2));
  const c = 0.5 * Math.sqrt((-d + r1_ + r2) * (d + r1_ - r2) * (d - r1_ + r2) * (d + r1_ + r2));
  return a + b - c;
}
function Venn2() {
  const k = 78 / Math.sqrt(A / Math.PI);
  const ra = Math.sqrt(A / Math.PI) * k;
  const rc = Math.sqrt(C / Math.PI) * k;
  const target = AC * k * k;
  let lo = Math.abs(ra - rc);
  let hi = ra + rc;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (lens(ra, rc, mid) > target) lo = mid;
    else hi = mid;
  }
  const d = (lo + hi) / 2;
  const cx = (W - d) / 2 - (ra - rc) / 2;
  return (
    <Svg label="Area-proportional Venn diagram: customers who bought coffee, food, or both">
      <circle cx={r1(cx)} cy={112} r={r1(ra)} fill={PAL[0]} opacity={0.35} />
      <circle cx={r1(cx + d)} cy={112} r={r1(rc)} fill={PAL[1]} opacity={0.35} />
      <Text x={cx - ra * 0.45} y={112} anchor="middle" size={11} color={INK} weight={700}>
        {fmt(A - AC)}
      </Text>
      <Text x={cx + d + rc * 0.45} y={112} anchor="middle" size={11} color={INK} weight={700}>
        {fmt(C - AC)}
      </Text>
      <Text x={cx + (ra + d - rc) / 2} y={112} anchor="middle" size={11} color={INK} weight={700}>
        {fmt(AC)}
      </Text>
      <Text x={cx - ra * 0.45} y={128} anchor="middle" size={8.5}>
        {"coffee only"}
      </Text>
      <Text x={cx + d + rc * 0.45} y={128} anchor="middle" size={8.5}>
        {"food only"}
      </Text>
      <Text x={cx + (ra + d - rc) / 2} y={128} anchor="middle" size={8.5}>
        {"both"}
      </Text>
      <Text x={10} y={14} size={8.5}>
        {"Circle areas match the number of customers"}
      </Text>
    </Svg>
  );
}
function Venn3() {
  const R = 64;
  const c = [
    [150, 88],
    [210, 88],
    [180, 140],
  ];
  const names = [sets.A, sets.B, sets.C];
  const regions: [number, number, number][] = [
    [sets.only.A, 120, 76],
    [sets.only.B, 240, 76],
    [sets.only.C, 180, 172],
    [sets.AB, 180, 66],
    [sets.AC, 148, 128],
    [sets.BC, 212, 128],
    [sets.ABC, 180, 107],
  ];
  return (
    <Svg label="Three-set Venn diagram: customers by coffee, tea and food, with the count in every overlap">
      {c.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={R} fill={PAL[i]} opacity={0.25} stroke={PAL[i]} />
          <Text x={i === 2 ? x : i ? x + 52 : x - 52} y={i === 2 ? y + R + 12 : y - R + 6} anchor={i === 2 ? "middle" : i ? "start" : "end"} size={9.5} color={PAL[i]} weight={700}>
            {names[i]}
          </Text>
        </g>
      ))}
      {regions.map(([v, x, y], i) => (
        <Text key={i} x={x} y={y} anchor="middle" size={9.5} color={INK} weight={i === 6 ? 800 : 600}>
          {fmt(v)}
        </Text>
      ))}
    </Svg>
  );
}
function UpSet() {
  const combos: { m: boolean[]; v: number }[] = (
    [
      [[1, 0, 0], sets.only.A],
      [[0, 1, 0], sets.only.B],
      [[0, 0, 1], sets.only.C],
      [[1, 1, 0], sets.AB],
      [[1, 0, 1], sets.AC],
      [[0, 1, 1], sets.BC],
      [[1, 1, 1], sets.ABC],
    ] as [number[], number][]
  )
    .map(([m, v]) => ({ m: m.map(Boolean), v }))
    .sort((a, b) => b.v - a.v);
  const names = [sets.A, sets.B, sets.C];
  const sizes = names.map((_, k) => sum(combos.filter((c) => c.m[k]).map((c) => c.v)));
  const left = 110;
  const b = band(combos.length, left, W - 10, 0.35);
  const y = lin(0, Math.max(...combos.map((c) => c.v)), 130, 14);
  const rowY = (k: number) => 150 + k * 22;
  const sx = lin(0, Math.max(...sizes), left - 46, 20);
  return (
    <Svg label="UpSet plot: every combination of coffee, tea and food as a bar, with dots showing which sets are in it">
      {combos.map((c, i) => (
        <g key={i}>
          <rect x={b.at(i)} y={y(c.v)} width={b.bw} height={r1(130 - y(c.v))} fill={INK} />
          <Text x={b.mid(i)} y={y(c.v) - 3} anchor="middle" size={7.5} mono>
            {fmt(c.v)}
          </Text>
          {names.map((_, k) => (
            <circle key={k} cx={b.mid(i)} cy={rowY(k)} r={4.5} fill={c.m[k] ? INK : "rgba(11,11,11,0.12)"} />
          ))}
          {c.m.filter(Boolean).length > 1 && <line x1={b.mid(i)} x2={b.mid(i)} y1={rowY(c.m.indexOf(true))} y2={rowY(c.m.lastIndexOf(true))} stroke={INK} strokeWidth={2} />}
        </g>
      ))}
      {names.map((n, k) => (
        <g key={n}>
          <rect x={sx(sizes[k])} y={rowY(k) - 5} width={r1(left - 46 - sx(sizes[k]))} height={10} fill={PAL[k]} />
          <Text x={left - 6} y={rowY(k) + 3} anchor="end" size={8.5} color={INK}>
            {n}
          </Text>
        </g>
      ))}
    </Svg>
  );
}

/* ---------------------------------------------------------------- hierarchies */
type TNode = { label: string; value: number; children?: TNode[] };
const TREE: TNode = {
  label: "Menu",
  value: sum(hierarchy.flatMap((c) => c.children.map((x) => x.value))),
  children: hierarchy.map((c) => ({ label: c.label, value: sum(c.children.map((x) => x.value)), children: c.children })),
};
const LEAVES = hierarchy.flatMap((c) => c.children);
function TreeDiagram() {
  const xs = [26, 120, 210];
  const step = (H - 20) / LEAVES.length;
  const leafY = (label: string) => r1(10 + (LEAVES.findIndex((l) => l.label === label) + 0.5) * step);
  const catY = (c: TNode) => r1(mean(c.children!.map((l) => leafY(l.label))));
  const rootY = r1(mean(TREE.children!.map(catY)));
  return (
    <Svg label="Tree diagram: the menu split into categories and products, node size by revenue">
      {TREE.children!.map((c, i) => (
        <g key={c.label}>
          <path d={`M${xs[0]},${rootY} C${xs[0] + 50},${rootY} ${xs[1] - 50},${catY(c)} ${xs[1]},${catY(c)}`} fill="none" stroke="rgba(11,11,11,0.25)" />
          {c.children!.map((l) => (
            <path key={l.label} d={`M${xs[1]},${catY(c)} C${xs[1] + 45},${catY(c)} ${xs[2] - 45},${leafY(l.label)} ${xs[2]},${leafY(l.label)}`} fill="none" stroke="rgba(11,11,11,0.2)" />
          ))}
          <circle cx={xs[1]} cy={catY(c)} r={r1(4 + Math.sqrt(c.value / TREE.value) * 8)} fill={PAL[i]} />
          <Text x={xs[1]} y={catY(c) - 12} anchor="middle" size={9} color={PAL[i]} weight={700}>
            {c.label}
          </Text>
          {c.children!.map((l) => (
            <g key={l.label}>
              <circle cx={xs[2]} cy={leafY(l.label)} r={r1(2 + Math.sqrt(l.value / TREE.value) * 7)} fill={PAL[i]} opacity={0.7} />
              <Text x={xs[2] + 12} y={leafY(l.label) + 3} size={8.5} color={INK}>
                {`${l.label} · ${fmt(l.value)}`}
              </Text>
            </g>
          ))}
        </g>
      ))}
      <circle cx={xs[0]} cy={rootY} r={8} fill={INK} />
      <Text x={xs[0]} y={rootY + 20} anchor="middle" size={9} color={INK} weight={700}>
        {TREE.label}
      </Text>
    </Svg>
  );
}
function RadialTree() {
  const n = LEAVES.length;
  const ang = (label: string) => ((LEAVES.findIndex((l) => l.label === label) + 0.5) / n) * Math.PI * 2;
  const cat = (c: TNode) => mean(c.children!.map((l) => ang(l.label)));
  return (
    <Svg label="Radial tree: the same menu hierarchy laid out in a circle, root in the middle">
      {TREE.children!.map((c, i) => {
        const [cx, cy] = polar(180, 112, 44, cat(c));
        return (
          <g key={c.label}>
            <line x1={180} y1={112} x2={cx} y2={cy} stroke="rgba(11,11,11,0.3)" />
            {c.children!.map((l) => {
              const [lx, ly] = polar(180, 112, 88, ang(l.label));
              const [tx, ty] = polar(180, 112, 98, ang(l.label));
              return (
                <g key={l.label}>
                  <line x1={cx} y1={cy} x2={lx} y2={ly} stroke="rgba(11,11,11,0.2)" />
                  <circle cx={lx} cy={ly} r={4} fill={PAL[i]} opacity={0.75} />
                  <Text x={tx} y={ty + 3} anchor={tx < 175 ? "end" : tx > 185 ? "start" : "middle"} size={8} color={INK}>
                    {l.label}
                  </Text>
                </g>
              );
            })}
            <circle cx={cx} cy={cy} r={6} fill={PAL[i]} />
          </g>
        );
      })}
      <circle cx={180} cy={112} r={7} fill={INK} />
    </Svg>
  );
}
/* average-linkage clustering of cities by their six ratings */
type Cl = { members: number[]; h: number; kids?: [Cl, Cl] };
const dist = (a: number[], b: number[]) => Math.sqrt(sum(a.map((v, i) => (v - b[i]) ** 2)));
const DENDRO = (() => {
  let cl: Cl[] = ratings.map((_, i) => ({ members: [i], h: 0 }));
  while (cl.length > 1) {
    let best = { i: 0, j: 1, d: Infinity };
    for (let i = 0; i < cl.length; i++)
      for (let j = i + 1; j < cl.length; j++) {
        const d = mean(cl[i].members.flatMap((a) => cl[j].members.map((b) => dist(ratings[a].values, ratings[b].values))));
        if (d < best.d) best = { i, j, d };
      }
    const merged: Cl = { members: [...cl[best.i].members, ...cl[best.j].members], h: best.d, kids: [cl[best.i], cl[best.j]] };
    cl = [...cl.filter((_, k) => k !== best.i && k !== best.j), merged];
  }
  return cl[0];
})();
function Dendrogram() {
  const order = DENDRO.members;
  const step = (H - 30) / order.length;
  const x = lin(0, DENDRO.h * 1.05, 92, W - 14);
  const yOf = (c: Cl): number => (c.kids ? (yOf(c.kids[0]) + yOf(c.kids[1])) / 2 : 10 + (order.indexOf(c.members[0]) + 0.5) * step);
  const lines: string[] = [];
  const walk = (c: Cl) => {
    if (!c.kids) return;
    const [a, b] = c.kids;
    lines.push(`M${x(a.h)},${r1(yOf(a))} H${x(c.h)} V${r1(yOf(b))} H${x(b.h)}`);
    walk(a);
    walk(b);
  };
  walk(DENDRO);
  return (
    <Svg label={`Dendrogram: cities grouped by how similar their ratings are (${ASPECTS.length} aspects), joined earlier when more alike`}>
      {lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={PAL[3]} strokeWidth={1.6} />
      ))}
      {order.map((m, i) => (
        <Text key={m} x={86} y={r1(10 + (i + 0.5) * step + 3)} anchor="end" size={9} color={INK}>
          {ratings[m].label}
        </Text>
      ))}
      <Text x={W - 14} y={H - 6} anchor="end" size={8}>
        {"distance between rating profiles →"}
      </Text>
    </Svg>
  );
}
function PackedBubbles() {
  const k = 0.55;
  const p = pack(revenueByCity.map((c) => Math.sqrt(c.value) * k));
  const minX = Math.min(...p.placed.map((q) => q.x - q.r));
  const maxX = Math.max(...p.placed.map((q) => q.x + q.r));
  const minY = Math.min(...p.placed.map((q) => q.y - q.r));
  const maxY = Math.max(...p.placed.map((q) => q.y + q.r));
  const s = Math.min(330 / (maxX - minX), 200 / (maxY - minY));
  return (
    <Svg label="Packed bubbles: one bubble per city, area by revenue, packed together without a hierarchy">
      {p.placed.map((q, i) => {
        const cx = 180 + (q.x - (minX + maxX) / 2) * s;
        const cy = 112 + (q.y - (minY + maxY) / 2) * s;
        return (
          <g key={i}>
            <circle cx={r1(cx)} cy={r1(cy)} r={r1(q.r * s)} fill={PAL[i % PAL.length]} opacity={0.85} />
            {q.r * s > 16 && (
              <Text x={cx} y={cy + 3} anchor="middle" size={q.r * s > 30 ? 10 : 8} color="#fff" weight={700}>
                {revenueByCity[i].label}
              </Text>
            )}
          </g>
        );
      })}
    </Svg>
  );
}

/* ---------------------------------------------------------------- distribution & trend extras */
function StemLeaf() {
  const v = orderValues[1].values.slice(0, 45).map(Math.round);
  const stems = Array.from(new Set(v.map((x) => Math.floor(x / 10)))).sort((a, b) => a - b);
  return (
    <Svg label="Stem-and-leaf plot: each takeaway order value split into tens (stem) and units (leaf), so the shape and every value show">
      <Text x={14} y={16} size={8.5}>
        {"45 takeaway orders (thousand Rp) · 4 | 2 = 42k"}
      </Text>
      {stems.map((s, i) => {
        const leaves = v
          .filter((x) => Math.floor(x / 10) === s)
          .map((x) => x % 10)
          .sort((a, b) => a - b);
        const y = 40 + i * ((H - 50) / stems.length);
        return (
          <g key={s}>
            <Text x={40} y={y} anchor="end" size={11} mono color={INK} weight={700}>
              {s}
            </Text>
            <line x1={46} x2={46} y1={y - 11} y2={y + 4} stroke={INK} />
            <Text x={54} y={y} size={9.5} mono color={PAL[1]}>
              {leaves.join(" ")}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function Lorenz() {
  const rev = stores.map((s) => s.revenue).sort((a, b) => a - b);
  const total = sum(rev);
  const cum = offsets(rev).map((c) => c / total);
  const x = lin(0, 1, M.l, W - M.r - 90);
  const y = lin(0, 1, H - M.b, M.t);
  const area = sum(cum.slice(1).map((c, i) => (c + cum[i]) / 2 / rev.length));
  const gini = 1 - 2 * area;
  const pts = cum.map((c, i) => [x(i / rev.length), y(c)] as [number, number]);
  return (
    <Svg label="Lorenz curve: how evenly revenue is spread across stores; the further from the diagonal, the more unequal">
      <YGrid y={y} max={1} format={(v) => `${Math.round(v * 100)}%`} x1={W - M.r - 90} />
      <path d={`${path(pts)} L${x(1)},${y(0)} Z`} fill="rgba(98,80,214,0.12)" />
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke={MUTED} strokeDasharray="4 3" />
      <path d={path(pts)} fill="none" stroke={PAL[3]} strokeWidth={2.2} />
      <Text x={W - M.r - 84} y={60} size={10} color={PAL[3]} weight={700}>
        {`Gini ${gini.toFixed(2)}`}
      </Text>
      <Text x={W - M.r - 84} y={76} size={8.5}>
        {"0 = all stores equal"}
      </Text>
      <Text x={W - M.r - 84} y={90} size={8.5}>
        {"1 = one store has all"}
      </Text>
      <Text x={x(1)} y={H - M.b + 13} anchor="end" size={8.5}>
        {"share of stores →"}
      </Text>
    </Svg>
  );
}
function Control() {
  const v = daily.filter((_, d) => d % 7 < 5).slice(0, 60);
  const m = mean(v);
  const s = sd(v);
  const lims = [m - 3 * s, m - 2 * s, m, m + 2 * s, m + 3 * s];
  const y = lin(Math.floor((m - 3.6 * s) / 50) * 50, Math.ceil((m + 3.6 * s) / 50) * 50, H - M.b, M.t);
  const x = lin(0, v.length - 1, M.l, W - M.r - 34);
  return (
    <Svg label="Control chart: weekday orders with the average and control limits three standard deviations away; points outside need a look">
      {lims.map((l, i) => (
        <g key={i}>
          <line x1={M.l} x2={W - M.r - 34} y1={y(l)} y2={y(l)} stroke={i === 2 ? INK : i % 4 === 0 ? BAD : "rgba(194,154,0,0.8)"} strokeDasharray={i === 2 ? undefined : "4 3"} />
          <Text x={W - M.r - 30} y={y(l) + 3} size={7.5} mono color={i === 2 ? INK : i % 4 === 0 ? BAD : "#8a6d00"}>
            {["−3σ", "−2σ", "mean", "+2σ", "+3σ"][i]}
          </Text>
        </g>
      ))}
      <path d={path(v.map((val, i) => [x(i), y(val)]))} fill="none" stroke={PAL[0]} strokeWidth={1.4} />
      {v.map((val, i) => (
        <circle key={i} cx={x(i)} cy={y(val)} r={Math.abs(val - m) > 2 * s ? 3.5 : 2} fill={Math.abs(val - m) > 3 * s ? BAD : Math.abs(val - m) > 2 * s ? "#c29a00" : PAL[0]} />
      ))}
      <Text x={M.l} y={H - M.b + 13} size={8}>
        {"60 weekdays →"}
      </Text>
    </Svg>
  );
}
/* density contours of baskets: kernel density on a grid, then marching squares */
const GX = 36;
const GY = 26;
const bx = lin(0, 9, M.l, W - M.r);
const by = lin(0, 260, H - M.b, M.t);
const grid = Array.from({ length: GY + 1 }, (_, j) =>
  Array.from({ length: GX + 1 }, (_, i) => {
    const px = (i / GX) * 9;
    const py = (j / GY) * 260;
    return sum(
      baskets.map((b) => {
        const u = (px - b.items) / 1.1;
        const w = (py - b.value) / 28;
        return Math.abs(u) < 1 && Math.abs(w) < 1 ? (1 - u * u) * (1 - w * w) : 0;
      }),
    );
  }),
);
const GMAX = Math.max(...grid.flat());
function segments(level: number) {
  const out: string[] = [];
  const P = (i: number, j: number) => [bx((i / GX) * 9), by((j / GY) * 260)];
  for (let j = 0; j < GY; j++)
    for (let i = 0; i < GX; i++) {
      const v = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]];
      const c = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
      const pts: number[][] = [];
      for (let e = 0; e < 4; e++) {
        const a = v[e];
        const b = v[(e + 1) % 4];
        if (a < level !== b < level) {
          const t = (level - a) / (b - a);
          pts.push([c[e][0] + (c[(e + 1) % 4][0] - c[e][0]) * t, c[e][1] + (c[(e + 1) % 4][1] - c[e][1]) * t]);
        }
      }
      for (let k = 0; k + 1 < pts.length; k += 2) out.push(`M${r1(pts[k][0])},${r1(pts[k][1])} L${r1(pts[k + 1][0])},${r1(pts[k + 1][1])}`);
    }
  return out.join(" ");
}
const LEVELS = [0.1, 0.25, 0.45, 0.65, 0.85].map((f) => ({ f, d: segments(f * GMAX) }));
function Contour() {
  return (
    <Svg label="Contour plot: lines of equal density, like a height map, where baskets are most common">
      <YGrid y={by} max={260} ticks={4} format={(v) => `${v}k`} />
      {baskets.map((b, i) => (
        <circle key={i} cx={bx(b.items)} cy={by(b.value)} r={1.2} fill={INK} opacity={0.18} />
      ))}
      {LEVELS.map((l) => (
        <path key={l.f} d={l.d} fill="none" stroke={seq(0.3 + l.f * 0.7)} strokeWidth={1.6} strokeLinecap="round" />
      ))}
      <Text x={W - M.r} y={H - M.b + 13} anchor="end" size={8.5}>
        {"items in basket →"}
      </Text>
    </Svg>
  );
}

/* ---------------------------------------------------------------- model evaluation */
const ranked = [...churn].sort((a, b) => b.score - a.score);
const P = churn.filter((c) => c.left).length;
const N = churn.length - P;
const roc = ranked.reduce<[number, number][]>(
  (acc, c) => {
    const [fp, tp] = acc[acc.length - 1];
    return [...acc, c.left ? [fp, tp + 1 / P] : [fp + 1 / N, tp]];
  },
  [[0, 0]],
);
const AUC = sum(roc.slice(1).map(([fp, tp], i) => (fp - roc[i][0]) * ((tp + roc[i][1]) / 2)));
function Roc() {
  const x = lin(0, 1, M.l + 20, W - 120);
  const y = lin(0, 1, H - M.b, M.t);
  return (
    <Svg label="ROC curve: how well a made-up churn model separates leavers from stayers at every threshold">
      <YGrid y={y} max={1} format={(v) => v.toFixed(1)} x0={M.l + 20} x1={W - 120} />
      <path d={`${path(roc.map(([a, b]) => [x(a), y(b)]))} L${x(1)},${y(0)} Z`} fill="rgba(42,120,214,0.12)" />
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke={MUTED} strokeDasharray="4 3" />
      <path d={path(roc.map(([a, b]) => [x(a), y(b)]))} fill="none" stroke={PAL[0]} strokeWidth={2.2} />
      <Text x={W - 112} y={70} size={13} color={PAL[0]} weight={800}>
        {`AUC ${AUC.toFixed(2)}`}
      </Text>
      <Text x={W - 112} y={86} size={8.5}>
        {"0.5 = coin flip"}
      </Text>
      <Text x={W - 112} y={99} size={8.5}>
        {"1.0 = perfect"}
      </Text>
      <Text x={x(1)} y={H - M.b + 13} anchor="end" size={8}>
        {"false positive rate →"}
      </Text>
    </Svg>
  );
}
const TP = churn.filter((c) => c.left && c.score >= 0.5).length;
const FP = churn.filter((c) => !c.left && c.score >= 0.5).length;
const FN = P - TP;
const TN = N - FP;
function Confusion() {
  const cells = [
    [TP, "caught leavers", GOOD],
    [FN, "missed leavers", BAD],
    [FP, "false alarms", BAD],
    [TN, "correct stayers", GOOD],
  ] as const;
  const max = Math.max(TP, FP, FN, TN);
  return (
    <Svg label="Confusion matrix at a 50% threshold: what the churn model got right and wrong">
      <Text x={150} y={20} anchor="middle" size={8.5}>
        {"predicted: leaves"}
      </Text>
      <Text x={240} y={20} anchor="middle" size={8.5}>
        {"predicted: stays"}
      </Text>
      {["actually left", "actually stayed"].map((t, r) => (
        <Text key={t} x={100} y={r * 86 + 74} anchor="end" size={8.5}>
          {t}
        </Text>
      ))}
      {cells.map(([v, t, c], i) => {
        const r = i < 2 ? 0 : 1;
        const col = i === 0 || i === 2 ? 0 : 1;
        return (
          <g key={t}>
            <rect x={108 + col * 90} y={28 + r * 86} width={86} height={82} rx={8} fill={c} opacity={0.12 + (0.6 * v) / max} />
            <Text x={151 + col * 90} y={70 + r * 86} anchor="middle" size={18} weight={800} color={INK}>
              {v}
            </Text>
            <Text x={151 + col * 90} y={86 + r * 86} anchor="middle" size={8}>
              {t}
            </Text>
          </g>
        );
      })}
      <Text x={10} y={H - 8} size={8.5} color={INK}>
        {`precision ${Math.round((TP / (TP + FP)) * 100)}% · recall ${Math.round((TP / P) * 100)}% · accuracy ${Math.round(((TP + TN) / churn.length) * 100)}%`}
      </Text>
    </Svg>
  );
}
function Gains() {
  const n = churn.length;
  const caught = offsets(ranked.map((c) => (c.left ? 1 : 0))).map((c) => c / P);
  const x = lin(0, 1, M.l, W - M.r);
  const y = lin(0, 1, H - M.b, M.t);
  const at20 = caught[Math.round(n * 0.2)];
  return (
    <Svg label="Cumulative gains chart: contacting the customers the model ranks riskiest first catches leavers much faster than random">
      <YGrid y={y} max={1} format={(v) => `${Math.round(v * 100)}%`} />
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke={MUTED} strokeDasharray="4 3" />
      <path d={path(caught.map((c, i) => [x(i / n), y(c)]))} fill="none" stroke={PAL[2]} strokeWidth={2.4} />
      <line x1={x(0.2)} x2={x(0.2)} y1={y(0)} y2={y(at20)} stroke={INK} strokeDasharray="2 2" />
      <circle cx={x(0.2)} cy={y(at20)} r={4} fill={PAL[2]} />
      <Text x={x(0.2) + 6} y={y(at20) + 12} size={8.5} color={INK}>
        {`contact the top 20% → catch ${Math.round(at20 * 100)}% of leavers (lift ${(at20 / 0.2).toFixed(1)}×)`}
      </Text>
      <Text x={W - M.r} y={H - M.b + 13} anchor="end" size={8}>
        {"share of customers contacted →"}
      </Text>
    </Svg>
  );
}
function Importance() {
  const x = lin(0, 0.35, 130, W - 36);
  const b = band(featureImportance.length, 10, H - 10, 0.3);
  return (
    <Svg label="Feature importance: which inputs the churn model leans on most (example values)">
      {featureImportance.map((f, i) => (
        <g key={f.label}>
          <Text x={124} y={b.mid(i) + 3} anchor="end" size={9} color={INK}>
            {f.label}
          </Text>
          <rect x={130} y={b.at(i)} width={r1(x(f.value) - 130)} height={b.bw} rx={2} fill={i === 0 ? PAL[3] : "rgba(98,80,214,0.5)"} />
          <Text x={x(f.value) + 4} y={b.mid(i) + 3} size={8} mono>
            {f.value.toFixed(2)}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function Calibration() {
  const bins = Array.from({ length: 10 }, (_, k) => {
    const inBin = churn.filter((c) => c.score >= k / 10 && c.score < (k + 1) / 10);
    return { p: mean(inBin.map((c) => c.score)), a: inBin.length ? inBin.filter((c) => c.left).length / inBin.length : null, n: inBin.length };
  }).filter((b) => b.n >= 5);
  const x = lin(0, 1, M.l, W - M.r);
  const y = lin(0, 1, H - M.b, M.t);
  return (
    <Svg label="Calibration plot: when the model says 70%, do about 70% of those customers really leave?">
      <YGrid y={y} max={1} format={(v) => `${Math.round(v * 100)}%`} />
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke={MUTED} strokeDasharray="4 3" />
      <path d={path(bins.map((b) => [x(b.p), y(b.a!)]))} fill="none" stroke={PAL[1]} strokeWidth={2} />
      {bins.map((b, i) => (
        <circle key={i} cx={x(b.p)} cy={y(b.a!)} r={r1(2.5 + Math.sqrt(b.n) / 3)} fill={PAL[1]} opacity={0.8} />
      ))}
      <Text x={x(0.02)} y={M.t + 8} size={8.5}>
        {"actual share that left ↑"}
      </Text>
      <Text x={W - M.r} y={H - M.b + 13} anchor="end" size={8}>
        {"predicted probability →"}
      </Text>
    </Svg>
  );
}

/* ---------------------------------------------------------------- ternary & circle timeline */
function Ternary() {
  const A0: [number, number] = [24, 196];
  const B0: [number, number] = [244, 196];
  const C0: [number, number] = [134, 6];
  const at = (a: number, b: number, c: number): [number, number] => [r1(a * A0[0] + b * B0[0] + c * C0[0]), r1(a * A0[1] + b * B0[1] + c * C0[1])];
  const grid = [0.2, 0.4, 0.6, 0.8];
  return (
    <Svg label="Ternary plot: each city's channel mix as one point inside a triangle, the three shares always add to 100%">
      <path d={`M${A0} L${B0} L${C0} Z`} fill="rgba(11,11,11,0.025)" stroke={MUTED} />
      {grid.map((g) => (
        <g key={g} stroke="rgba(11,11,11,0.08)">
          <path d={`M${at(g, 1 - g, 0)} L${at(g, 0, 1 - g)}`} />
          <path d={`M${at(1 - g, g, 0)} L${at(0, g, 1 - g)}`} />
          <path d={`M${at(1 - g, 0, g)} L${at(0, 1 - g, g)}`} />
        </g>
      ))}
      {cityChannel.map((c, i) => {
        const [x, y] = at(c.parts[0], c.parts[1], c.parts[2]);
        return (
          <g key={c.label}>
            <circle cx={x} cy={y} r={4.5} fill={PAL[i % PAL.length]} stroke="#fff" />
            <circle cx={262} cy={40 + i * 18} r={4.5} fill={PAL[i % PAL.length]} />
            <Text x={271} y={43 + i * 18} size={8} color={INK}>
              {c.label}
            </Text>
          </g>
        );
      })}
      <Text x={A0[0] + 20} y={A0[1] + 12} anchor="middle" size={9} color={PAL[0]} weight={700}>
        {`100% ${CHANNELS[0]}`}
      </Text>
      <Text x={B0[0] - 10} y={B0[1] + 12} anchor="middle" size={9} color={PAL[1]} weight={700}>
        {`100% ${CHANNELS[1]}`}
      </Text>
      <Text x={C0[0] + 8} y={C0[1] + 8} size={9} color={PAL[2]} weight={700}>
        {`100% ${CHANNELS[2]}`}
      </Text>
    </Svg>
  );
}
const MOMENTS: { lane: number; m: number; size: number; label?: string }[] = [
  { lane: 0, m: 2, size: 18, label: "Ramadan" },
  { lane: 0, m: 7, size: 9 },
  { lane: 0, m: 11, size: 22, label: "Year-end" },
  { lane: 0, m: 14, size: 20 },
  { lane: 0, m: 23, size: 26 },
  { lane: 1, m: 1, size: 8 },
  { lane: 1, m: 5, size: 14, label: "Gula aren" },
  { lane: 1, m: 14, size: 16, label: "New menu" },
  { lane: 1, m: 19, size: 7 },
  { lane: 2, m: 3, size: 10 },
  { lane: 2, m: 9, size: 12 },
  { lane: 2, m: 16, size: 15, label: "Bali" },
  { lane: 2, m: 21, size: 11 },
  { lane: 3, m: 8, size: 9 },
  { lane: 3, m: 20, size: 24, label: "App launch" },
];
function CircleTimeline() {
  const lanes = ["Promotions", "Menu", "New stores", "App"];
  const x = lin(0, 23, 90, W - 18);
  const lh = (H - 30) / lanes.length;
  return (
    <Svg label="Circle timeline: moments over two years, one row per kind, circle size by how many extra orders they brought (made-up)">
      {lanes.map((l, i) => (
        <g key={l}>
          <line x1={90} x2={W - 18} y1={r1(14 + i * lh + lh / 2)} y2={r1(14 + i * lh + lh / 2)} stroke="rgba(11,11,11,0.1)" />
          <Text x={82} y={r1(14 + i * lh + lh / 2 + 3)} anchor="end" size={9} color={INK}>
            {l}
          </Text>
        </g>
      ))}
      {MOMENTS.map((e, k) => {
        const cy = r1(14 + e.lane * lh + lh / 2);
        const rr = r1(Math.sqrt(e.size) * 2.4);
        return (
          <g key={k}>
            <circle cx={x(e.m)} cy={cy} r={rr} fill={PAL[e.lane]} opacity={0.55} stroke={PAL[e.lane]} />
            {e.label && (
              <Text x={x(e.m)} y={r1(cy - rr - 3)} anchor="middle" size={7.5} color={INK}>
                {e.label}
              </Text>
            )}
          </g>
        );
      })}
      {[0, 6, 12, 18, 23].map((m) => (
        <Text key={m} x={x(m)} y={H - 4} anchor="middle" size={8}>
          {`${MONTHS[m % 12]} ${m < 12 ? "Y1" : "Y2"}`}
        </Text>
      ))}
    </Svg>
  );
}

export const EXTRA_VARIANTS = [
  ...defs("Relationship", "Multivariate", [["rl-ternary", "Ternary plot", "Three shares that always add to 100%, per item.", "Audiences new to it: label the corners clearly.", Ternary]]),
  ...defs("Flow & process", "Timelines", [["fl-circles", "Circle timeline", "Events over time with a size for their impact.", "Many overlapping events in one lane.", CircleTimeline]]),
  ...defs("Relationship", "Sets", [
    ["set-venn2", "Venn diagram (area-true)", "Two groups and their overlap, sized honestly.", "More than three sets.", Venn2],
    ["set-venn3", "Venn diagram (3 sets)", "Every overlap of three groups, with counts.", "Comparing region sizes: circles here aren't to scale.", Venn3],
    ["set-upset", "UpSet plot", "Many sets and combinations, readable as bars.", "Audiences who've never seen one: explain the dots.", UpSet],
  ]),
  ...defs("Relationship", "Model evaluation", [
    ["ml-roc", "ROC curve", "How well a classifier ranks positives above negatives.", "Very imbalanced data: add a precision–recall view.", Roc],
    ["ml-confusion", "Confusion matrix", "What a classifier gets right and wrong at one threshold.", "Forgetting that the threshold can be moved.", Confusion],
    ["ml-gains", "Cumulative gains (lift)", "How much better than random a ranked list is.", "Models that aren't used to rank people or items.", Gains],
    ["ml-importance", "Feature importance", "Which inputs a model relies on.", "Reading importance as cause and effect.", Importance],
    ["ml-calibration", "Calibration plot", "Whether predicted probabilities can be trusted as probabilities.", "Few predictions per bin.", Calibration],
  ]),
  ...defs("Relationship", "Matrices", [["rl-contour", "Contour plot", "Density of a 2D cloud as lines of equal height.", "Sparse data: contours invent shapes.", Contour]]),
  ...defs("Composition", "Hierarchies", [
    ["pt-treediagram", "Tree diagram", "Parent–child structure with sizes on the nodes.", "Hundreds of leaves.", TreeDiagram],
    ["pt-radialtree", "Radial tree", "A hierarchy in a compact circle.", "Reading values: it shows structure only.", RadialTree],
    ["pt-dendrogram", "Dendrogram", "Which items are most alike, from clustering.", "Treating the cut point as obvious: it's a choice.", Dendrogram],
  ]),
  ...defs("Composition", "Squares & units", [["pt-bubbles", "Packed bubbles", "Sizes of many items at a glance, playfully.", "Precise comparison.", PackedBubbles]]),
  ...defs("Distribution", "Points", [["ds-stemleaf", "Stem-and-leaf plot", "Small datasets where shape and every value matter.", "Large datasets.", StemLeaf]]),
  ...defs("Distribution", "Curves", [["ds-lorenz", "Lorenz curve", "How unequally something is shared (with the Gini index).", "Groups of very different size without weighting.", Lorenz]]),
  ...defs("Trend", "Lines", [["ln-control", "Control chart", "Spotting unusual days against normal variation.", "Data with strong seasonality: remove it first.", Control]]),
];
