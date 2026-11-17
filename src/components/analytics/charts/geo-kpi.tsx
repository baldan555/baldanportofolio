import { kpis, provinces, revenueByCity, targetShare } from "@/data/chart-demo";
import { INK, MUTED, PAL, Svg, Text, arc, lin, path, r1 } from "./kit";

export function TileMap() {
  const max = Math.max(...provinces.map((p) => p.stores));
  const cell = 24;
  return (
    <Svg label="Tile map of Indonesia: one square per province, shaded by number of stores">
      {provinces.map((p) => (
        <g key={p.code}>
          <rect
            x={14 + p.col * cell}
            y={22 + p.row * cell}
            width={cell - 2}
            height={cell - 2}
            rx={4}
            fill={p.stores ? `rgba(42,120,214,${r1((0.12 + 0.88 * (p.stores / max)) * 10) / 10})` : "rgba(11,11,11,0.06)"}
          >
            <title>{`${p.name}: ${p.stores} stores`}</title>
          </rect>
          <text
            x={14 + p.col * cell + (cell - 2) / 2}
            y={22 + p.row * cell + cell / 2 + 2}
            fontSize={6.5}
            textAnchor="middle"
            fill={p.stores / max > 0.5 ? "#fff" : INK}
            fontFamily="ui-monospace, monospace"
          >
            {p.code}
          </text>
        </g>
      ))}
      <Text x={14} y={14} size={9} color={MUTED}>
        Each square is a province, roughly where it lies. Darker = more stores.
      </Text>
    </Svg>
  );
}

export function KpiCards() {
  return (
    <Svg label="KPI cards: headline numbers with change and a small trend">
      {kpis.map((k, i) => {
        const x0 = 8 + (i % 2) * 176;
        const y0 = 8 + Math.floor(i / 2) * 104;
        const lo = Math.min(...k.series);
        const hi = Math.max(...k.series);
        const x = lin(0, 11, x0 + 14, x0 + 154);
        const y = lin(lo, hi, y0 + 88, y0 + 64);
        const up = k.delta >= 0;
        return (
          <g key={k.label}>
            <rect x={x0} y={y0} width={168} height={96} rx={12} fill="#fff" stroke="rgba(11,11,11,0.1)" />
            <Text x={x0 + 14} y={y0 + 20} size={9.5}>
              {k.label}
            </Text>
            <Text x={x0 + 14} y={y0 + 44} size={18} color={INK} weight={700}>
              {k.value}
            </Text>
            <Text x={x0 + 154} y={y0 + 20} size={9.5} anchor="end" mono color={up ? PAL[2] : PAL[1]}>
              {up ? "▲" : "▼"} {Math.abs(Math.round(k.delta * 100))}%
            </Text>
            <path d={path(k.series.map((v, j) => [x(j), y(v)]))} fill="none" stroke={up ? PAL[2] : PAL[1]} strokeWidth={1.6} />
          </g>
        );
      })}
    </Svg>
  );
}

export function Gauge() {
  const a0 = -Math.PI * 0.75;
  const a1 = Math.PI * 0.75;
  const at = a0 + (a1 - a0) * targetShare;
  return (
    <Svg label="Gauge: progress to the yearly target">
      <path d={arc(180, 130, 70, 92, a0, a1)} fill="rgba(11,11,11,0.07)" />
      <path d={arc(180, 130, 70, 92, a0, at)} fill={PAL[0]} />
      <Text x={180} y={132} size={30} anchor="middle" color={INK} weight={700}>
        {Math.round(targetShare * 100)}%
      </Text>
      <Text x={180} y={152} size={10} anchor="middle">
        of this year&apos;s revenue target
      </Text>
      <Text x={180} y={210} size={9} anchor="middle" color={MUTED}>
        One number, one goal. A bar with a target line says the same in less space.
      </Text>
    </Svg>
  );
}

export function HeatTable() {
  const rows = revenueByCity.slice(0, 6);
  const max = rows[0].value;
  const cols = ["Revenue", "Growth", "Margin"];
  const extra = rows.map((r, i) => ({ growth: [0.21, 0.14, 0.18, 0.06, -0.03, 0.11][i], margin: [0.17, 0.15, 0.19, 0.12, 0.09, 0.16][i], ...r }));
  return (
    <Svg label="Table with conditional formatting: numbers shaded by size">
      {cols.map((c, j) => (
        <Text key={c} x={150 + j * 72} y={16} anchor="end" size={9} weight={700} color={INK}>
          {c}
        </Text>
      ))}
      {extra.map((r, i) => (
        <g key={r.label}>
          <Text x={12} y={42 + i * 29} size={10.5} color={INK}>
            {r.label}
          </Text>
          <rect x={92} y={28 + i * 29} width={62} height={22} rx={4} fill={`rgba(42,120,214,${r1((r.value / max) * 0.5 * 10) / 10})`} />
          <Text x={150} y={43 + i * 29} anchor="end" size={10} mono color={INK}>
            {Math.round(r.value).toLocaleString("en-US")}
          </Text>
          <rect x={164} y={28 + i * 29} width={62} height={22} rx={4} fill={r.growth >= 0 ? `rgba(27,175,122,${r1(r.growth * 3 * 10) / 10})` : "rgba(235,104,52,0.35)"} />
          <Text x={222} y={43 + i * 29} anchor="end" size={10} mono color={INK}>
            {r.growth >= 0 ? "+" : "−"}
            {Math.abs(Math.round(r.growth * 100))}%
          </Text>
          <rect x={236} y={28 + i * 29} width={62} height={22} rx={4} fill={`rgba(98,80,214,${r1(r.margin * 2.5 * 10) / 10})`} />
          <Text x={294} y={43 + i * 29} anchor="end" size={10} mono color={INK}>
            {Math.round(r.margin * 100)}%
          </Text>
        </g>
      ))}
    </Svg>
  );
}
