import { CHANNELS, bridge, channelQuarter, cityChannel, hierarchy, productTotals, revenueLastYear, targetShare, tiers } from "@/data/chart-demo";
import { H, INK, Legend, M, MUTED, PAL, Svg, Text, W, YGrid, arc, band, fmt, lin, nice, offsets, r1 } from "../kit";
import { defs } from "../types";
import { BAD, GOOD, polar, sum } from "./base";

const prods = [...productTotals].sort((a, b) => b.value - a.value);
const ptot = sum(prods.map((p) => p.value));
const ang = offsets(prods.map((p) => (p.value / ptot) * Math.PI * 2));
const pc = (v: number) => `${Math.round(v * 100)}%`;

/* ---------------------------------------------------------------- pies & donuts */
export function Semi() {
  const a = offsets(prods.map((p) => (p.value / ptot) * Math.PI)).map((v) => v - Math.PI / 2);
  return (
    <Svg label="Half donut: product shares on a semicircle, total underneath">
      {prods.map((p, i) => {
        const [lx, ly] = polar(180, 160, 128, (a[i] + a[i + 1]) / 2);
        return (
          <g key={p.label}>
            <path d={arc(180, 160, 70, 115, a[i], a[i + 1])} fill={PAL[i]} stroke="#fff" strokeWidth={1.5} />
            <Text x={lx} y={ly + 3} anchor={lx < 175 ? "end" : lx > 185 ? "start" : "middle"} size={8.5} color={INK}>
              {`${p.label} ${pc(p.value / ptot)}`}
            </Text>
          </g>
        );
      })}
      <Text x={180} y={152} anchor="middle" size={17} weight={700} color={INK}>
        {fmt(ptot)}
      </Text>
      <Text x={180} y={168} anchor="middle" size={8.5}>
        {"million Rp"}
      </Text>
    </Svg>
  );
}
export function Exploded() {
  return (
    <Svg label="Pie with the biggest slice pulled out for emphasis">
      {prods.map((p, i) => {
        const mid = (ang[i] + ang[i + 1]) / 2;
        const [dx, dy] = i === 0 ? polar(0, 0, 12, mid) : [0, 0];
        const [lx, ly] = polar(150 + dx, 112 + dy, 62, mid);
        return (
          <g key={p.label} transform={`translate(${dx},${dy})`}>
            <path d={arc(150, 112, 0, 92, ang[i], ang[i + 1])} fill={i === 0 ? PAL[1] : "rgba(11,11,11,0.12)"} stroke="#fff" strokeWidth={1.5} />
            <Text x={lx - dx} y={ly - dy + 3} anchor="middle" size={8.5} color={i === 0 ? "#fff" : INK} weight={i === 0 ? 700 : 400}>
              {pc(p.value / ptot)}
            </Text>
          </g>
        );
      })}
      <Text x={262} y={100} size={12} color={PAL[1]} weight={700}>
        {prods[0].label}
      </Text>
      <Text x={262} y={116} size={9}>
        {"is the biggest seller"}
      </Text>
    </Svg>
  );
}
function Leader() {
  return (
    <Svg label="Donut with labels outside, joined to each slice by a leader line">
      {prods.map((p, i) => {
        const mid = (ang[i] + ang[i + 1]) / 2;
        const [x1, y1] = polar(180, 112, 80, mid);
        const [x2, y2] = polar(180, 112, 94, mid);
        const right = x2 >= 180;
        const x3 = right ? x2 + 16 : x2 - 16;
        return (
          <g key={p.label}>
            <path d={arc(180, 112, 52, 80, ang[i], ang[i + 1])} fill={PAL[i]} stroke="#fff" strokeWidth={1.5} />
            <path d={`M${x1},${y1} L${x2},${y2} L${x3},${y2}`} fill="none" stroke={MUTED} />
            <Text x={right ? x3 + 3 : x3 - 3} y={y2 + 3} anchor={right ? "start" : "end"} size={8.5} color={INK}>
              {`${p.label} ${pc(p.value / ptot)}`}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function Nested() {
  const ring = (parts: number[], r0: number, r: number) => {
    const s = sum(parts);
    const a = offsets(parts.map((v) => (v / s) * Math.PI * 2));
    return parts.map((v, k) => <path key={k} d={arc(150, 112, r0, r, a[k], a[k + 1])} fill={PAL[k]} opacity={r0 > 60 ? 1 : 0.55} stroke="#fff" strokeWidth={1.5} />);
  };
  return (
    <Svg label="Nested donut: channel mix in the first quarter (inner ring) and the last quarter (outer ring)">
      {ring(channelQuarter[0].parts, 36, 62)}
      {ring(channelQuarter[3].parts, 66, 94)}
      {CHANNELS.map((c, i) => (
        <g key={c}>
          <rect x={262} y={44 + i * 15} width={9} height={9} rx={2} fill={PAL[i]} />
          <Text x={275} y={52 + i * 15} size={9} color={INK}>
            {c}
          </Text>
        </g>
      ))}
      <Text x={262} y={106} size={8.5}>
        {"inner ring: Q1"}
      </Text>
      <Text x={262} y={120} size={8.5}>
        {"outer ring: Q4"}
      </Text>
      <Text x={262} y={140} size={8.5} color={PAL[2]} weight={700}>
        {`Delivery ${pc(channelQuarter[0].parts[2] / sum(channelQuarter[0].parts))} → ${pc(channelQuarter[3].parts[2] / sum(channelQuarter[3].parts))}`}
      </Text>
    </Svg>
  );
}
export function Inside() {
  return (
    <Svg label="Pie with the percentage written inside each slice">
      {prods.map((p, i) => {
        const [lx, ly] = polar(130, 112, 62, (ang[i] + ang[i + 1]) / 2);
        return (
          <g key={p.label}>
            <path d={arc(130, 112, 0, 98, ang[i], ang[i + 1])} fill={PAL[i]} stroke="#fff" strokeWidth={2} />
            <Text x={lx} y={ly + 4} anchor="middle" size={11} color="#fff" weight={700}>
              {pc(p.value / ptot)}
            </Text>
          </g>
        );
      })}
      {prods.map((p, i) => (
        <g key={p.label}>
          <rect x={250} y={56 + i * 22} width={9} height={9} rx={2} fill={PAL[i]} />
          <Text x={264} y={64 + i * 22} size={9.5} color={INK}>
            {p.label}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function PieMultiples() {
  return (
    <Svg label="Small-multiple pies: the channel mix of each city">
      <Legend items={CHANNELS.map((c, i) => ({ label: c, color: PAL[i] }))} x={10} />
      {cityChannel.map((c, k) => {
        const cx = 46 + (k % 4) * 88;
        const cy = 64 + Math.floor(k / 4) * 92;
        const a = offsets(c.parts.map((v) => v * Math.PI * 2));
        return (
          <g key={c.label}>
            {c.parts.map((v, j) => (
              <path key={j} d={arc(cx, cy, 0, 30, a[j], a[j + 1])} fill={PAL[j]} stroke="#fff" />
            ))}
            <Text x={cx} y={cy + 44} anchor="middle" size={8.5} color={INK}>
              {c.label}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
export function Polar() {
  const max = prods[0].value;
  const step = (Math.PI * 2) / prods.length;
  return (
    <Svg label="Polar area chart: equal angles, radius grows with each product's revenue">
      {[0.5, 1].map((f) => (
        <circle key={f} cx={150} cy={112} r={r1(96 * Math.sqrt(f))} fill="none" stroke="rgba(11,11,11,0.08)" />
      ))}
      {prods.map((p, i) => {
        const rr = r1(96 * Math.sqrt(p.value / max));
        const [lx, ly] = polar(150, 112, rr + 10, (i + 0.5) * step);
        return (
          <g key={p.label}>
            <path d={arc(150, 112, 0, rr, i * step, (i + 1) * step)} fill={PAL[i]} opacity={0.85} stroke="#fff" strokeWidth={1.5} />
            <Text x={lx} y={ly + 3} anchor="middle" size={8} color={INK}>
              {p.label}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function Parliament() {
  const seats = 100;
  const raw = revenueLastYear.map((c) => c.b);
  const tot = sum(raw);
  const alloc = raw.map((v) => Math.floor((v / tot) * seats));
  const rest = seats - sum(alloc);
  const order = raw.map((v, i) => ({ i, f: (v / tot) * seats - alloc[i] })).sort((a, b) => b.f - a.f);
  order.slice(0, rest).forEach((o) => (alloc[o.i] += 1));
  // seats on rows of a half circle, filled from left to right by angle
  const rows = 6;
  const pos: { x: number; y: number; a: number }[] = [];
  const radii = Array.from({ length: rows }, (_, r) => 50 + r * 15);
  const counts = radii.map((rr) => Math.round((rr / sum(radii)) * seats));
  counts[rows - 1] += seats - sum(counts);
  radii.forEach((rr, r) =>
    Array.from({ length: counts[r] }, (_, k) => {
      const a = -Math.PI / 2 + (Math.PI * (k + 0.5)) / counts[r];
      const [x, y] = polar(180, 170, rr, a);
      pos.push({ x, y, a });
    }),
  );
  pos.sort((p, q) => p.a - q.a);
  const owner = offsets(alloc);
  return (
    <Svg label="Parliament chart: 100 seats shared out by each city's revenue">
      {pos.map((p, k) => {
        const c = owner.findIndex((o, i) => k >= o && k < owner[i + 1]);
        return <circle key={k} cx={p.x} cy={p.y} r={5} fill={PAL[c % PAL.length]} />;
      })}
      <Text x={180} y={164} anchor="middle" size={16} weight={700} color={INK}>
        {"100"}
      </Text>
      <Text x={180} y={180} anchor="middle" size={8.5}>
        {"seats ∝ revenue"}
      </Text>
      {revenueLastYear.slice(0, 4).map((c, i) => (
        <Text key={c.label} x={10 + i * 88} y={206} size={8.5} color={PAL[i]}>
          {`${c.label} ${alloc[i]}`}
        </Text>
      ))}
    </Svg>
  );
}

/* ---------------------------------------------------------------- squares & units */
function WaffleMultiples() {
  return (
    <Svg label="Small-multiple waffles: delivery's share of orders in each city, one square per percent">
      {cityChannel.map((c, k) => {
        const ox = 12 + (k % 4) * 88;
        const oy = 10 + Math.floor(k / 4) * 104;
        const n = Math.round(c.parts[2] * 100);
        return (
          <g key={c.label}>
            {Array.from({ length: 100 }, (_, i) => (
              <rect key={i} x={ox + (i % 10) * 7} y={oy + Math.floor(i / 10) * 7} width={6} height={6} rx={1} fill={i < n ? PAL[2] : "rgba(11,11,11,0.08)"} />
            ))}
            <Text x={ox} y={oy + 84} size={8.5} color={INK}>
              {c.label}
            </Text>
            <Text x={ox + 68} y={oy + 84} anchor="end" size={8.5} mono color={PAL[2]}>
              {`${n}%`}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function Cup({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <path d={`M${x},${y} h18 l-2,20 h-14 Z`} fill={color} />
      <rect x={x - 1} y={y - 4} width={20} height={4} rx={1.5} fill={color} />
    </g>
  );
}
function Pictogram() {
  const q = channelQuarter[3].parts;
  const s = sum(q);
  const n = q.map((v) => Math.round((v / s) * 20));
  const owner = offsets(n);
  return (
    <Svg label="Pictogram: 20 cups, each one is 5% of orders, coloured by channel">
      {Array.from({ length: 20 }, (_, i) => {
        const c = owner.findIndex((o, k) => i >= o && i < owner[k + 1]);
        return <Cup key={i} x={22 + (i % 10) * 32} y={44 + Math.floor(i / 10) * 44} color={PAL[Math.max(0, c)]} />;
      })}
      {CHANNELS.map((c, i) => (
        <Text key={c} x={22 + i * 110} y={160} size={10} color={PAL[i]} weight={700}>
          {`${c} ${n[i] * 5}%`}
        </Text>
      ))}
      <Text x={22} y={190} size={8.5}>
        {"each cup = 5% of last quarter's orders"}
      </Text>
    </Svg>
  );
}
function Units() {
  const per = 1000;
  const n = tiers.map((t) => Math.round(t.value / per));
  const owner = offsets(n);
  const total = sum(n);
  const cols = 16;
  return (
    <Svg label="Unit chart: one dot for every thousand customers, coloured by loyalty tier">
      {Array.from({ length: total }, (_, i) => {
        const c = owner.findIndex((o, k) => i >= o && i < owner[k + 1]);
        return <circle key={i} cx={24 + (i % cols) * 15} cy={34 + Math.floor(i / cols) * 15} r={5.5} fill={["#c29a00", "#8a8a8a", "#b06a35", PAL[0]][c]} />;
      })}
      {tiers.map((t, i) => (
        <Text key={t.label} x={270} y={46 + i * 22} size={9.5} color={["#c29a00", "#8a8a8a", "#b06a35", PAL[0]][i]} weight={700}>
          {`${t.label} ${fmt(t.value)}`}
        </Text>
      ))}
      <Text x={24} y={16} size={8.5}>
        {"● = 1,000 customers"}
      </Text>
    </Svg>
  );
}
export function ShareBar() {
  const x = lin(0, ptot, 14, W - 14);
  const o = offsets(prods.map((p) => p.value));
  return (
    <Svg label="One 100% bar: the whole product mix in a single strip">
      {prods.map((p, i) => (
        <g key={p.label}>
          <rect x={x(o[i])} y={86} width={r1(x(o[i + 1]) - x(o[i]))} height={40} fill={PAL[i]} stroke="#fff" strokeWidth={2} />
          <Text x={x(o[i]) + 4} y={i % 2 ? 146 : 78} size={9} color={PAL[i]} weight={700}>
            {p.label}
          </Text>
          <Text x={x(o[i]) + 4} y={110} size={10} color="#fff" weight={700} mono>
            {pc(p.value / ptot)}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function Pyramid() {
  const rows = tiers;
  const h = 40;
  return (
    <Svg label="Pyramid: loyalty tiers from the few gold members at the top to the many new customers at the base">
      {rows.map((r, i) => {
        const wTop = 30 + i * 70;
        const wBot = 30 + (i + 1) * 70;
        const y0 = 20 + i * (h + 4);
        return (
          <g key={r.label}>
            <path
              d={`M${180 - wTop / 2},${y0} L${180 + wTop / 2},${y0} L${180 + wBot / 2},${y0 + h} L${180 - wBot / 2},${y0 + h} Z`}
              fill={["#c29a00", "#8a8a8a", "#b06a35", PAL[0]][i]}
              opacity={0.9}
            />
            <Text x={180} y={y0 + h / 2 + 4} anchor="middle" size={9.5} color="#fff" weight={700}>
              {r.label}
            </Text>
            <Text x={180 + wBot / 2 + 8} y={y0 + h / 2 + 4} size={9} mono color={INK}>
              {`${fmt(r.value)} · ${Math.round((r.value / sum(rows.map((t) => t.value))) * 100)}%`}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}

/* ---------------------------------------------------------------- hierarchies */
const cats = hierarchy.map((c, i) => ({ ...c, total: sum(c.children.map((ch) => ch.value)), color: PAL[i] }));
const htot = sum(cats.map((c) => c.total));
function NestedTreemap() {
  // categories as columns sized by total, products stacked inside
  const x = lin(0, htot, 8, W - 8);
  const o = offsets(cats.map((c) => c.total));
  return (
    <Svg label="Nested treemap: categories with a header, their products as boxes inside">
      {cats.map((c, i) => {
        const y = lin(0, c.total, 24, H - 8);
        const oo = offsets(c.children.map((ch) => ch.value));
        return (
          <g key={c.label}>
            <rect x={x(o[i])} y={6} width={r1(x(o[i + 1]) - x(o[i]) - 2)} height={H - 12} rx={4} fill={c.color} opacity={0.18} />
            <Text x={x(o[i]) + 5} y={18} size={9} color={c.color} weight={700}>
              {`${c.label} ${Math.round((c.total / htot) * 100)}%`}
            </Text>
            {c.children.map((ch, k) => (
              <g key={ch.label}>
                <rect x={x(o[i]) + 3} y={y(oo[k])} width={r1(x(o[i + 1]) - x(o[i]) - 8)} height={r1(y(oo[k + 1]) - y(oo[k]) - 3)} rx={3} fill={c.color} opacity={0.9 - k * 0.15} />
                {y(oo[k + 1]) - y(oo[k]) > 16 && x(o[i + 1]) - x(o[i]) > ch.label.length * 5 + 14 && (
                  <Text x={x(o[i]) + 8} y={y(oo[k]) + 13} size={8.5} color="#fff" weight={600}>
                    {ch.label}
                  </Text>
                )}
              </g>
            ))}
          </g>
        );
      })}
    </Svg>
  );
}
/** Greedy circle packing: place each circle at the first free spot on a spiral around the first one. */
export function pack(rs: number[]) {
  const placed: { x: number; y: number; r: number }[] = [];
  rs.forEach((r, i) => {
    if (!i) return placed.push({ x: 0, y: 0, r });
    for (let d = 0; d < 400; d += 0.5) {
      let ok = false;
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2 + i;
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + 1)) {
          placed.push({ x, y, r });
          ok = true;
          break;
        }
      }
      if (ok) break;
    }
  });
  // re-centre on the middle of the bounding box, so the enclosing circle hugs the group
  const cx = (Math.min(...placed.map((p) => p.x - p.r)) + Math.max(...placed.map((p) => p.x + p.r))) / 2;
  const cy = (Math.min(...placed.map((p) => p.y - p.r)) + Math.max(...placed.map((p) => p.y + p.r))) / 2;
  const centred = placed.map((p) => ({ ...p, x: p.x - cx, y: p.y - cy }));
  const R = Math.max(...centred.map((p) => Math.hypot(p.x, p.y) + p.r));
  return { placed: centred, R };
}
function CirclePack() {
  const k = 0.42;
  const groups = cats.map((c) => {
    const inner = pack(c.children.map((ch) => Math.sqrt(ch.value) * k));
    return { c, inner, R: inner.R + 4 };
  });
  const outer = pack(groups.map((g) => g.R));
  // fit the bounding box of all category circles into the chart and centre it
  const minX = Math.min(...outer.placed.map((p) => p.x - p.r));
  const maxX = Math.max(...outer.placed.map((p) => p.x + p.r));
  const minY = Math.min(...outer.placed.map((p) => p.y - p.r));
  const maxY = Math.max(...outer.placed.map((p) => p.y + p.r));
  const scale = Math.min(320 / (maxX - minX), 190 / (maxY - minY));
  const ox = 180 - ((minX + maxX) / 2) * scale;
  const oy = 116 - ((minY + maxY) / 2) * scale;
  return (
    <Svg label="Circle packing: products as circles inside their category circle, area by revenue">
      {groups.map((g, i) => {
        const cx = ox + outer.placed[i].x * scale;
        const cy = oy + outer.placed[i].y * scale;
        return (
          <g key={g.c.label}>
            <circle cx={r1(cx)} cy={r1(cy)} r={r1(g.R * scale)} fill={g.c.color} opacity={0.15} />
            {g.inner.placed.map((p, j) => (
              <g key={j}>
                <circle cx={r1(cx + p.x * scale)} cy={r1(cy + p.y * scale)} r={r1(p.r * scale)} fill={g.c.color} opacity={0.85} />
                {p.r * scale > 13 && (
                  <Text x={cx + p.x * scale} y={cy + p.y * scale + 3} anchor="middle" size={7.5} color="#fff" weight={600}>
                    {g.c.children[j].label.split(" ")[0]}
                  </Text>
                )}
              </g>
            ))}
            <Text x={cx} y={r1(cy + g.R * scale - 6)} anchor="middle" size={8.5} color={g.c.color} weight={700}>
              {g.c.label}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function Icicle() {
  const x = lin(0, htot, 10, W - 10);
  const o = offsets(cats.map((c) => c.total));
  return (
    <Svg label="Icicle chart: the whole on top, categories below, products at the bottom, widths by revenue">
      <rect x={x(0)} y={14} width={r1(x(htot) - x(0))} height={44} rx={4} fill={INK} />
      <Text x={x(0) + 8} y={40} size={10} color="#fff" weight={700}>
        {`All products · ${fmt(htot)}`}
      </Text>
      {cats.map((c, i) => {
        const oo = offsets(c.children.map((ch) => ch.value)).map((v) => v + o[i]);
        return (
          <g key={c.label}>
            <rect x={x(o[i])} y={62} width={r1(x(o[i + 1]) - x(o[i]) - 2)} height={50} rx={4} fill={c.color} />
            <Text x={x(o[i]) + 6} y={90} size={9} color="#fff" weight={700}>
              {c.label}
            </Text>
            {c.children.map((ch, k) => (
              <g key={ch.label}>
                <rect x={x(oo[k])} y={116} width={r1(x(oo[k + 1]) - x(oo[k]) - 2)} height={90} rx={3} fill={c.color} opacity={0.75 - k * 0.12} />
                {x(oo[k + 1]) - x(oo[k]) > 22 && (
                  <text transform={`translate(${r1(x(oo[k]) + 12)},${200}) rotate(-90)`} fontSize={8.5} fill="#fff" fontFamily="ui-sans-serif, system-ui, sans-serif">
                    {ch.label}
                  </text>
                )}
              </g>
            ))}
          </g>
        );
      })}
    </Svg>
  );
}
function IndentedTree() {
  const rows: { label: string; value: number; depth: number; color: string }[] = cats.flatMap((c) => [
    { label: c.label, value: c.total, depth: 0, color: c.color },
    ...c.children.map((ch) => ({ label: ch.label, value: ch.value, depth: 1, color: c.color })),
  ]);
  const x = lin(0, htot, 120, W - 40);
  const rh = (H - 8) / rows.length;
  return (
    <Svg label="Indented tree with bars: the hierarchy as an outline, each row with its revenue bar">
      {rows.map((r, i) => (
        <g key={r.label}>
          <Text x={10 + r.depth * 14} y={r1(6 + i * rh + rh / 2 + 3)} size={r.depth ? 8.5 : 9.5} color={r.depth ? INK : r.color} weight={r.depth ? 400 : 700}>
            {`${r.depth ? "└ " : ""}${r.label}`}
          </Text>
          <rect x={120} y={r1(6 + i * rh + 3)} width={r1(x(r.value) - 120)} height={r1(rh - 6)} rx={2} fill={r.color} opacity={r.depth ? 0.55 : 1} />
          <Text x={x(r.value) + 4} y={r1(6 + i * rh + rh / 2 + 3)} size={8} mono>
            {fmt(r.value)}
          </Text>
        </g>
      ))}
    </Svg>
  );
}

/* ---------------------------------------------------------------- bridges */
function VarianceBridge() {
  const rows = [...revenueLastYear].sort((a, b) => b.b - b.a - (a.b - a.a));
  const lastT = sum(rows.map((r) => r.a));
  const thisT = sum(rows.map((r) => r.b));
  const steps = rows.map((r) => r.b - r.a);
  const o = offsets(steps).map((v) => v + lastT);
  const lo = Math.floor((lastT * 0.9) / 1000) * 1000;
  const y = lin(lo, nice(thisT), H - M.b, M.t);
  const b = band(steps.length + 2, M.l, W - M.r, 0.25);
  return (
    <Svg label="Variance bridge: from last year's revenue to this year's, one city's growth at a time (the axis starts above zero, as bridges may)">
      <YGrid y={y} max={nice(thisT)} min={lo} />
      <rect x={b.at(0)} y={y(lastT)} width={b.bw} height={r1(H - M.b - y(lastT))} fill="rgba(11,11,11,0.35)" />
      {steps.map((s, i) => (
        <rect key={i} x={b.at(i + 1)} y={y(o[i + 1])} width={b.bw} height={r1(y(o[i]) - y(o[i + 1]))} fill={s >= 0 ? GOOD : BAD} />
      ))}
      <rect x={b.at(steps.length + 1)} y={y(thisT)} width={b.bw} height={r1(H - M.b - y(thisT))} fill={INK} />
      {["Last yr", ...rows.map((r) => r.label.slice(0, 3)), "This yr"].map((l, i) => (
        <Text key={l} x={b.mid(i)} y={H - M.b + 13} anchor="middle" size={7.5}>
          {l}
        </Text>
      ))}
    </Svg>
  );
}
function Subtotals() {
  const rev = bridge[0].value;
  const beans = bridge[1].value;
  const gross = rev + beans;
  const steps = [
    { label: "Revenue", v: rev, total: true },
    { label: "Beans", v: beans },
    { label: "Gross", v: gross, total: true, sub: true },
    ...bridge.slice(2, -1).map((b) => ({ label: b.label.split(" ")[0], v: b.value })),
    { label: "Profit", v: bridge[bridge.length - 1].value, total: true },
  ];
  const y = lin(0, nice(rev), H - M.b, M.t);
  const b = band(steps.length, M.l, W - M.r, 0.25);
  const levels = steps.reduce<number[]>((acc, s, i) => [...acc, s.total ? s.v : acc[i] + s.v], [0]).slice(1);
  return (
    <Svg label="Waterfall with a subtotal: revenue, minus bean costs, gives gross margin; minus the rest gives profit">
      <YGrid y={y} max={nice(rev)} />
      {steps.map((s, i) => {
        const from = s.total ? 0 : levels[i - 1];
        const to = levels[i];
        return (
          <g key={s.label}>
            <rect x={b.at(i)} y={y(Math.max(from, to))} width={b.bw} height={r1(Math.abs(y(from) - y(to)))} fill={s.total ? ("sub" in s && s.sub ? PAL[0] : INK) : BAD} opacity={s.total ? 1 : 0.8} />
            <Text x={b.mid(i)} y={y(Math.max(from, to)) - 4} anchor="middle" size={7.5} mono color={INK}>
              {s.total ? fmt(s.v) : `−${fmt(-s.v)}`}
            </Text>
            <Text x={b.mid(i)} y={H - M.b + 13} anchor="middle" size={7.5}>
              {s.label}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function Ring() {
  return (
    <Svg label="Progress ring: one share of a goal, with the number in the middle">
      <circle cx={180} cy={110} r={78} fill="none" stroke="rgba(11,11,11,0.07)" strokeWidth={18} />
      <path d={arc(180, 110, 69, 87, 0, Math.PI * 2 * targetShare)} fill={PAL[2]} />
      <Text x={180} y={112} anchor="middle" size={30} weight={700} color={INK}>
        {pc(targetShare)}
      </Text>
      <Text x={180} y={130} anchor="middle" size={9}>
        {"of the yearly target"}
      </Text>
    </Svg>
  );
}

export const PART_VARIANTS = [
  ...defs("Composition", "Pies & donuts", [
    ["pt-semi", "Half donut", "Dashboards with little height; a share and a total.", "Many slices.", Semi],
    ["pt-exploded", "Pulled-out slice", "Pointing at one part of a whole.", "Pulling out several slices.", Exploded],
    ["pt-leader", "Donut with leader lines", "Labels that don't fit inside slices.", "More than about six slices.", Leader],
    ["pt-nested", "Nested donut", "Mix at two moments (inner vs outer ring).", "Precise comparison between rings.", Nested],
    ["pt-inside", "Pie with inside labels", "Few, big slices with the share printed.", "Thin slices: the text won't fit.", Inside],
    ["pt-pies", "Small-multiple pies", "Comparing the same 2–3 part mix across groups.", "More parts: use 100% bars.", PieMultiples],
    ["pt-polar", "Polar area", "Parts with equal angles, size in the radius.", "Readers who read it as a pie.", Polar],
    ["pt-ring", "Progress ring", "One share of a goal, big and clear.", "Several values: rings are hard to compare.", Ring],
    ["pt-parliament", "Parliament chart", "Seats or shares of a fixed number of units.", "Shares that don't come in whole units.", Parliament],
  ]),
  ...defs("Composition", "Squares & units", [
    ["pt-waffles", "Small-multiple waffles", "One share per group, as countable squares.", "Shares below 1%.", WaffleMultiples],
    ["pt-pictogram", "Pictogram", "Shares people can count, with friendly icons.", "Precise values.", Pictogram],
    ["pt-units", "Unit chart", "Showing that each dot is real people or things.", "Huge numbers: each dot must stand for many.", Units],
    ["pt-sharebar", "Single 100% bar", "A whole mix in one strip, easy on space.", "Many tiny parts.", ShareBar],
    ["pt-pyramid", "Pyramid", "Tiers where the top is small and the base is wide.", "Data without a natural hierarchy.", Pyramid],
  ]),
  ...defs("Composition", "Hierarchies", [
    ["pt-ntreemap", "Nested treemap", "Categories and their items, all visible at once.", "Deep hierarchies.", NestedTreemap],
    ["pt-pack", "Circle packing", "A friendly overview of groups and members.", "Comparing sizes: circles waste space and hide precision.", CirclePack],
    ["pt-icicle", "Icicle chart", "Hierarchies read top to bottom, widths by size.", "Many tiny leaves.", Icicle],
    ["pt-tree", "Indented tree with bars", "Hierarchies that need exact values, like a report.", "Huge trees: collapse levels.", IndentedTree],
  ]),
  ...defs("Composition", "Bridges", [
    ["pt-variance", "Variance bridge", "Explaining the change between two totals by contributor.", "Contributions that overlap.", VarianceBridge],
    ["pt-subtotal", "Waterfall with subtotals", "Profit and loss with intermediate totals.", "Too many steps.", Subtotals],
  ]),
];
