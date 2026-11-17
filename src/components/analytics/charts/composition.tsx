import { CITIES, PRODUCTS, bridge, cityProduct, hierarchy, productTotals } from "@/data/chart-demo";
import { H, INK, M, MUTED, PAL, Svg, Text, W, YGrid, arc, band, fmt, lin, nice, offsets, r1 } from "./kit";

const total = productTotals.reduce((s, p) => s + p.value, 0);
const sorted = [...productTotals].sort((a, b) => b.value - a.value);

function PieLike({ inner }: { inner: number }) {
  const angle = offsets(sorted.map((p) => (p.value / total) * Math.PI * 2));
  return (
    <Svg label={inner ? "Donut chart of revenue share by product" : "Pie chart of revenue share by product"}>
      {sorted.map((p, i) => {
        return (
          <g key={p.label}>
            <path d={arc(110, 110, inner, 86, angle[i], angle[i + 1])} fill={PAL[i]} stroke="#fff" strokeWidth={1.5} />
            <Text x={226} y={60 + i * 26} size={11} color={INK}>
              {p.label}
            </Text>
            <Text x={340} y={60 + i * 26} size={11} anchor="end" mono color={PAL[i]} weight={700}>
              {Math.round((p.value / total) * 100)}%
            </Text>
            <rect x={212} y={51 + i * 26} width={9} height={9} rx={2} fill={PAL[i]} />
          </g>
        );
      })}
      {inner > 0 && (
        <>
          <Text x={110} y={108} size={18} anchor="middle" color={INK} weight={700}>
            {fmt(total)}
          </Text>
          <Text x={110} y={124} size={9} anchor="middle">
            million Rp
          </Text>
        </>
      )}
    </Svg>
  );
}
export const Pie = () => <PieLike inner={0} />;
export const Donut = () => <PieLike inner={52} />;

type Item = { label: string; value: number; color: string; group?: string };
/** Squarified treemap layout (Bruls et al.), returns rectangles. */
export function squarify(items: Item[], x: number, y: number, w: number, h: number) {
  const out: (Item & { x: number; y: number; w: number; h: number })[] = [];
  const sum = items.reduce((s, i) => s + i.value, 0);
  const scale = (w * h) / sum;
  let rest = items.map((i) => ({ ...i, area: i.value * scale }));
  let bx = x;
  let by = y;
  let bw = w;
  let bh = h;
  while (rest.length) {
    const short = Math.min(bw, bh);
    let row: typeof rest = [];
    let worst = Infinity;
    for (const it of rest) {
      const trial = [...row, it];
      const s = trial.reduce((a, b) => a + b.area, 0);
      const mx = Math.max(...trial.map((t) => t.area));
      const mn = Math.min(...trial.map((t) => t.area));
      const wr = Math.max((short * short * mx) / (s * s), (s * s) / (short * short * mn));
      if (wr > worst) break;
      worst = wr;
      row = trial;
    }
    const s = row.reduce((a, b) => a + b.area, 0);
    const thick = s / short;
    let off = 0;
    for (const it of row) {
      const len = it.area / thick;
      if (bw >= bh) out.push({ ...it, x: bx, y: by + off, w: thick, h: len });
      else out.push({ ...it, x: bx + off, y: by, w: len, h: thick });
      off += len;
    }
    if (bw >= bh) {
      bx += thick;
      bw -= thick;
    } else {
      by += thick;
      bh -= thick;
    }
    rest = rest.slice(row.length);
  }
  return out;
}

export function Treemap() {
  const items: Item[] = hierarchy.flatMap((g, gi) => g.children.map((c) => ({ label: c.label, value: c.value, color: PAL[gi], group: g.label }))).sort((a, b) => b.value - a.value);
  const rects = squarify(items, 6, 6, W - 12, H - 12);
  return (
    <Svg label="Treemap: product revenue, coloured by category">
      {rects.map((r) => (
        <g key={r.label}>
          <rect x={r1(r.x)} y={r1(r.y)} width={r1(r.w - 2)} height={r1(r.h - 2)} rx={4} fill={r.color} opacity={0.85} />
          {r.w > 50 && r.h > 26 && (
            <>
              <Text x={r.x + 6} y={r.y + 15} size={10} color="#fff" weight={700}>
                {r.label}
              </Text>
              <Text x={r.x + 6} y={r.y + 27} size={9} color="rgba(255,255,255,0.8)" mono>
                {r.value}
              </Text>
            </>
          )}
        </g>
      ))}
    </Svg>
  );
}

export function Sunburst() {
  const sum = hierarchy.reduce((s, g) => s + g.children.reduce((a, c) => a + c.value, 0), 0);
  const turn = (v: number) => (v / sum) * Math.PI * 2;
  const outer = offsets(hierarchy.map((g) => turn(g.children.reduce((s, c) => s + c.value, 0))));
  return (
    <Svg label="Sunburst: categories inside, products outside">
      {hierarchy.map((g, gi) => {
        const inner = offsets(g.children.map((c) => turn(c.value))).map((v) => v + outer[gi]);
        return (
          <g key={g.label}>
            <path d={arc(180, 110, 26, 60, outer[gi], outer[gi + 1])} fill={PAL[gi]} stroke="#fff" strokeWidth={1.5} />
            {g.children.map((c, ci) => (
              <path key={c.label} d={arc(180, 110, 62, 100, inner[ci], inner[ci + 1])} fill={PAL[gi]} opacity={0.45 + 0.13 * (3 - ci)} stroke="#fff" strokeWidth={1.5} />
            ))}
          </g>
        );
      })}
      {hierarchy.map((g, gi) => (
        <g key={g.label}>
          <rect x={10} y={20 + gi * 20} width={9} height={9} rx={2} fill={PAL[gi]} />
          <Text x={24} y={28 + gi * 20} size={10} color={INK}>
            {g.label}
          </Text>
        </g>
      ))}
    </Svg>
  );
}

export function Waterfall() {
  const max = nice(bridge[0].value);
  const y = lin(0, max, H - M.b, M.t);
  const b = band(bridge.length, M.l, W - M.r, 0.2);
  // the running level after each bar: totals reset it, steps move it
  const level = bridge.reduce<number[]>((acc, d) => [...acc, d.kind === "total" ? d.value : acc[acc.length - 1] + d.value], []);
  return (
    <Svg label="Waterfall: from revenue to profit, cost by cost">
      <YGrid y={y} max={max} />
      {bridge.map((d, i) => {
        const top = d.kind === "total" ? d.value : level[i - 1];
        const bottom = d.kind === "total" ? 0 : level[i];
        const color = d.kind === "total" ? INK : PAL[1];
        return (
          <g key={d.label}>
            <rect x={b.at(i)} y={y(top)} width={b.bw} height={r1(y(bottom) - y(top))} rx={2} fill={color} opacity={d.kind === "total" ? 0.85 : 0.75} />
            <Text x={b.mid(i)} y={y(top) - 4} anchor="middle" size={8.5} mono>
              {d.value > 0 ? fmt(d.value) : `−${fmt(-d.value)}`}
            </Text>
            <Text x={b.mid(i)} y={H - M.b + 13} anchor="middle" size={7.5}>
              {d.label.split(" ")[0]}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}

export function Waffle() {
  // 100 squares: one per percent of revenue
  const cells: number[] = [];
  sorted.forEach((p, i) => {
    const n = Math.round((p.value / total) * 100);
    for (let k = 0; k < n && cells.length < 100; k++) cells.push(i);
  });
  while (cells.length < 100) cells.push(sorted.length - 1);
  return (
    <Svg label="Waffle chart: each square is 1% of revenue">
      {cells.map((c, k) => (
        <rect key={k} x={20 + (k % 10) * 17} y={20 + Math.floor(k / 10) * 17} width={15} height={15} rx={2.5} fill={PAL[c]} />
      ))}
      {sorted.map((p, i) => (
        <g key={p.label}>
          <rect x={212} y={48 + i * 26} width={9} height={9} rx={2} fill={PAL[i]} />
          <Text x={226} y={57 + i * 26} size={11} color={INK}>
            {p.label} · {Math.round((p.value / total) * 100)}
          </Text>
        </g>
      ))}
    </Svg>
  );
}

export function Marimekko() {
  // column width = city size, segments = product mix: two dimensions of share at once
  const rows = cityProduct;
  const totals = rows.map((r) => r.parts.reduce((a, b) => a + b, 0));
  const grand = totals.reduce((a, b) => a + b, 0);
  const width = W - M.r - M.l;
  const xs = offsets(totals.map((t) => (t / grand) * width)).map((v) => v + M.l);
  return (
    <Svg label="Marimekko: column width is the city's share, segments are the product mix">
      {rows.map((r, i) => {
        const w = xs[i + 1] - xs[i];
        const x0 = xs[i];
        const hs = r.parts.map((p) => (p / totals[i]) * (H - M.b - M.t));
        const ys = offsets(hs);
        return (
          <g key={r.label}>
            {r.parts.map((p, k) => (
              <rect key={k} x={r1(x0)} y={r1(H - M.b - ys[k + 1])} width={r1(w - 1.5)} height={r1(hs[k] - 1)} fill={PAL[k]} />
            ))}
            <Text x={x0 + w / 2} y={H - M.b + 13} anchor="middle" size={8}>
              {w > 30 ? r.label.slice(0, 7) : ""}
            </Text>
          </g>
        );
      })}
      <Text x={M.l - 4} y={M.t + 8} anchor="end" size={8}>
        100%
      </Text>
      <Text x={M.l - 4} y={H - M.b} anchor="end" size={8}>
        0%
      </Text>
      <Text x={W - M.r} y={M.t - 3} anchor="end" size={8} color={MUTED}>
        {PRODUCTS.length} products · {CITIES.length > 6 ? 6 : CITIES.length} cities
      </Text>
    </Svg>
  );
}
