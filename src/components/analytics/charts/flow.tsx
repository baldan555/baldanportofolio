import { funnel, gantt, sankey } from "@/data/chart-demo";
import { H, INK, M, MUTED, PAL, Svg, Text, W, r1 } from "./kit";

export function Funnel() {
  const max = funnel[0].value;
  const rowH = (H - 20) / funnel.length;
  return (
    <Svg label="Funnel: how many app users reach each step">
      {funnel.map((f, i) => {
        const w = (f.value / max) * 230;
        const y = 10 + i * rowH;
        return (
          <g key={f.label}>
            <rect x={r1(240 - w / 2 - 70)} y={r1(y)} width={r1(w)} height={r1(rowH - 6)} rx={4} fill={PAL[0]} opacity={1 - i * 0.14} />
            <Text x={r1(240 - w / 2 - 76)} y={y + rowH / 2} anchor="end" size={9.5} color={INK}>
              {f.label}
            </Text>
            <Text x={r1(240 + w / 2 - 64)} y={y + rowH / 2} size={9} mono>
              {f.value.toLocaleString("en-US")}
              {i ? ` · ${Math.round((f.value / funnel[i - 1].value) * 100)}%` : ""}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}

export function Sankey() {
  const cols = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
  ];
  const xs = [30, 170, 310];
  const nodeW = 12;
  const value = (n: number) =>
    Math.max(
      sankey.links.filter((l) => l[0] === n).reduce((s, l) => s + l[2], 0),
      sankey.links.filter((l) => l[1] === n).reduce((s, l) => s + l[2], 0),
    );
  const total = cols[0].reduce((s, n) => s + value(n), 0);
  const scale = (H - 40) / total;
  const pos: Record<number, { x: number; y: number; h: number; outY: number; inY: number }> = {};
  cols.forEach((col, c) => {
    let y = 10;
    col.forEach((n) => {
      const h = value(n) * scale;
      pos[n] = { x: xs[c], y, h, outY: y, inY: y };
      y += h + 10;
    });
  });
  return (
    <Svg label="Sankey: orders flowing from channel to product to payment method">
      {sankey.links.map(([s, t, v], i) => {
        const w = v * scale;
        const a = pos[s];
        const b = pos[t];
        const y0 = a.outY + w / 2;
        const y1 = b.inY + w / 2;
        a.outY += w;
        b.inY += w;
        const x0 = a.x + nodeW;
        const x1 = b.x;
        const mx = (x0 + x1) / 2;
        return <path key={i} d={`M${x0},${r1(y0)} C${mx},${r1(y0)} ${mx},${r1(y1)} ${x1},${r1(y1)}`} fill="none" stroke={PAL[s < 3 ? s : s - 3]} strokeWidth={r1(Math.max(1, w))} opacity={0.35} />;
      })}
      {sankey.nodes.map((name, n) => {
        const p = pos[n];
        const right = p.x > 200;
        return (
          <g key={name}>
            <rect x={p.x} y={r1(p.y)} width={nodeW} height={r1(p.h)} fill={INK} />
            <Text x={right ? p.x - 4 : p.x + nodeW + 4} y={p.y + p.h / 2 + 3} anchor={right ? "end" : "start"} size={9} color={INK}>
              {name}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}

export function Gantt() {
  const weeks = 15;
  const x = (w: number) => r1(110 + (w / weeks) * (W - M.r - 110));
  const rowH = (H - 30) / gantt.length;
  return (
    <Svg label="Gantt chart: the plan for opening a new store">
      {Array.from({ length: weeks + 1 }, (_, w) =>
        w % 2 === 0 ? (
          <g key={w}>
            <line x1={x(w)} x2={x(w)} y1={8} y2={H - 20} stroke="rgba(11,11,11,0.07)" />
            <Text x={x(w)} y={H - 8} anchor="middle" size={8.5}>
              w{w}
            </Text>
          </g>
        ) : null,
      )}
      {gantt.map((t, i) => (
        <g key={t.label}>
          <Text x={104} y={12 + i * rowH + rowH / 2} anchor="end" size={9.5} color={INK}>
            {t.label}
          </Text>
          <rect x={x(t.start)} y={r1(8 + i * rowH + 4)} width={r1(x(t.end) - x(t.start))} height={r1(rowH - 8)} rx={4} fill={i === gantt.length - 1 ? PAL[1] : PAL[i % 4]} opacity={0.8} />
        </g>
      ))}
      <line x1={x(9)} x2={x(9)} y1={4} y2={H - 20} stroke={PAL[1]} strokeDasharray="4 3" />
      <Text x={x(9) + 3} y={10} size={8.5} color={PAL[1]}>
        today
      </Text>
      <Text x={W - M.r} y={H - 8} anchor="end" size={8} color={MUTED}>
        weeks
      </Text>
    </Svg>
  );
}
