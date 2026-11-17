import geo from "@/data/geo-shapes.json";
import { CHANNELS, beanOrigins, cityChannel, provinceGrowth, provinces, revenueByCity } from "@/data/chart-demo";
import { H, INK, MUTED, PAL, Svg, Text, W, arc, fmt, offsets, r1 } from "../kit";
import { defs } from "../types";
import { clipHalf, div, isolines, mix, polar, seq, sum, useSvgId } from "./base";

const idn = geo.idn;
const world = geo.world;
const OY = Math.round((H - idn.h) / 2) + 6;
const stores = (codes: string[]) => sum(codes.map((c) => provinces.find((p) => p.code === c)?.stores ?? 0));
const growth = (codes: string[]) => provinceGrowth[codes[0]] ?? 0;
const PROV = idn.provinces.map((p) => ({ ...p, stores: stores(p.codes), growth: growth(p.codes) }));
const SMAX = Math.max(...PROV.map((p) => p.stores));
const LAND = "#e6e1d8";
const EDGE = "#ffffff";
const CREDIT = "Boundaries: OCHA via HDX / geoBoundaries (CC BY 3.0 IGO)";
const WCREDIT = "Boundaries: Natural Earth (public domain)";

function Credit({ world: w = false }: { world?: boolean }) {
  return (
    <Text x={W - 4} y={H - 3} anchor="end" size={6.5} color="rgba(11,11,11,0.38)">
      {w ? WCREDIT : CREDIT}
    </Text>
  );
}
/** The provinces of Indonesia, filled by a function of each province. */
function Provinces({ fill, stroke = EDGE, width = 0.5 }: { fill: (p: (typeof PROV)[number]) => string; stroke?: string; width?: number }) {
  return (
    <g transform={`translate(0,${OY})`}>
      {PROV.map((p) => (
        <path key={p.name} d={p.d} fill={fill(p)} stroke={stroke} strokeWidth={width} strokeLinejoin="round">
          <title>{`${p.name}: ${p.stores} stores`}</title>
        </path>
      ))}
    </g>
  );
}
function GradientLegend({ from, to, lo, hi, label }: { from: string; to: string; lo: string; hi: string; label: string }) {
  const id = useSvgId("lg");
  return (
    <g>
      <defs>
        <linearGradient id={id}>
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <Text x={10} y={14} size={8.5} color={INK}>
        {label}
      </Text>
      <rect x={10} y={19} width={110} height={7} rx={3.5} fill={`url(#${id})`} />
      <Text x={10} y={36} size={7.5} mono>
        {lo}
      </Text>
      <Text x={120} y={36} size={7.5} mono anchor="end">
        {hi}
      </Text>
    </g>
  );
}

/* ---------------------------------------------------------------- province maps */
const Choropleth = () => (
  <Svg label="Choropleth map of Indonesia: each province shaded by its number of stores">
    <Provinces fill={(p) => (p.stores ? seq(0.1 + (0.9 * p.stores) / SMAX) : "#f1efe9")} />
    <GradientLegend from={seq(0.1)} to={seq(1)} lo="0" hi={String(SMAX)} label="Stores per province" />
    <Credit />
  </Svg>
);
const BREAKS = [0, 3, 8, 15, 25, 99];
const CLASS = ["#f1efe9", "#cfe0f5", "#8ab6e8", "#3d7fcf", "#1a4f94", "#0b2a55"];
const classOf = (v: number) => (v === 0 ? 0 : BREAKS.findIndex((b, i) => v > b && v <= BREAKS[i + 1]) + 1);
const Classed = () => (
  <Svg label="Classed choropleth: provinces grouped into five bands of store counts">
    <Provinces fill={(p) => CLASS[Math.min(5, classOf(p.stores))]} />
    {["0", "1–3", "4–8", "9–15", "16–25", "26+"].map((l, i) => (
      <g key={l}>
        <rect x={10 + i * 44} y={8} width={12} height={10} rx={2} fill={CLASS[i]} stroke="rgba(11,11,11,0.12)" />
        <Text x={25 + i * 44} y={16.5} size={8}>
          {l}
        </Text>
      </g>
    ))}
    <Credit />
  </Svg>
);
const gAvg = sum(PROV.map((p) => p.growth)) / PROV.length;
const Diverging = () => (
  <Svg label="Diverging choropleth: store growth above the national average in green, below in red">
    <Provinces fill={(p) => div(Math.max(-1, Math.min(1, (p.growth - gAvg) / 12)))} stroke="rgba(11,11,11,0.15)" />
    <GradientLegend from="#c8413f" to="#138a60" lo="below avg" hi="above avg" label={`Store growth vs average (${gAvg.toFixed(0)}%)`} />
    <Credit />
  </Svg>
);
const cityRev = (name: string) => revenueByCity.find((c) => c.label === name)?.value ?? 0;
const RMAX = Math.max(...revenueByCity.map((c) => c.value));
/** Where each city's name goes relative to its bubble, so the Java cities don't collide. */
const LABEL_AT: Record<string, [number, number, "start" | "middle" | "end"]> = {
  Jakarta: [-20, -12, "end"],
  Surabaya: [14, -10, "start"],
  Medan: [0, -14, "middle"],
  Makassar: [12, -8, "start"],
  Denpasar: [10, 14, "start"],
};
const BubbleMap = () => (
  <Svg label="Bubble map: a circle on each city, its area showing revenue">
    <Provinces fill={() => LAND} />
    <g transform={`translate(0,${OY})`}>
      {[...idn.cities]
        .sort((a, b) => cityRev(b.name) - cityRev(a.name))
        .map((c) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r={r1(3 + Math.sqrt(cityRev(c.name) / RMAX) * 16)} fill={PAL[1]} opacity={0.5} stroke={PAL[1]} />
            {LABEL_AT[c.name] && (
              <Text x={c.x + LABEL_AT[c.name][0]} y={c.y + LABEL_AT[c.name][1]} anchor={LABEL_AT[c.name][2]} size={7.5} color={INK} weight={600}>
                {c.name}
              </Text>
            )}
          </g>
        ))}
    </g>
    <Text x={10} y={14} size={8.5} color={INK}>
      {"Revenue by city (circle area)"}
    </Text>
    <Credit />
  </Svg>
);
const DotMap = () => (
  <Svg label="Dot map: every store as one dot, placed inside its province">
    <Provinces fill={() => LAND} />
    <g transform={`translate(0,${OY})`}>
      {idn.dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={1.3} fill={PAL[0]} opacity={0.8} />
      ))}
    </g>
    <Text x={10} y={14} size={8.5} color={INK}>
      {`● = 1 store · ${idn.dots.length} stores`}
    </Text>
    <Credit />
  </Svg>
);
function HeatMap() {
  const blur = useSvgId("blur");
  const clip = useSvgId("land");
  return (
    <Svg label="Heat map: store density glowing where stores cluster, clipped to land">
      <defs>
        <filter id={blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <clipPath id={clip}>
          {PROV.map((p) => (
            <path key={p.name} d={p.d} transform={`translate(0,${OY})`} />
          ))}
        </clipPath>
      </defs>
      <Provinces fill={() => "#efe9df"} />
      <g clipPath={`url(#${clip})`}>
        <g transform={`translate(0,${OY})`} filter={`url(#${blur})`}>
          {idn.dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={5} fill="#e8590c" opacity={0.22} />
          ))}
        </g>
      </g>
      <Text x={10} y={14} size={8.5} color={INK}>
        {"Where stores cluster"}
      </Text>
      <Credit />
    </Svg>
  );
}
function HexMap() {
  const R = 5.5;
  const hw = R * Math.sqrt(3);
  const cells = new Map<string, { x: number; y: number; n: number }>();
  for (const d of idn.dots) {
    const row = Math.round(d.y / (R * 1.5));
    const off = row % 2 ? hw / 2 : 0;
    const col = Math.round((d.x - off) / hw);
    const key = `${col},${row}`;
    const c = cells.get(key) ?? { x: r1(col * hw + off), y: r1(row * R * 1.5), n: 0 };
    cells.set(key, { ...c, n: c.n + 1 });
  }
  const max = Math.max(...[...cells.values()].map((c) => c.n));
  const hex = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, k) => polar(cx, cy, R - 0.4, (k * Math.PI) / 3))
      .map((q, k) => `${k ? "L" : "M"}${q[0]},${q[1]}`)
      .join(" ") + " Z";
  return (
    <Svg label="Hexbin map: stores counted into hexagons laid over the map">
      <Provinces fill={() => "#efe9df"} />
      <g transform={`translate(0,${OY})`}>
        {[...cells.values()].map((c) => (
          <path key={`${c.x},${c.y}`} d={hex(c.x, c.y)} fill={seq(0.25 + (0.75 * c.n) / max)} opacity={0.9} />
        ))}
      </g>
      <Text x={10} y={14} size={8.5} color={INK}>
        {"Stores per hexagon"}
      </Text>
      <Credit />
    </Svg>
  );
}
const SpikeMap = () => (
  <Svg label="Spike map: a spike rising from each province, height by number of stores">
    <Provinces fill={() => LAND} />
    <g transform={`translate(0,${OY})`}>
      {[...PROV]
        .sort((a, b) => a.cy - b.cy)
        .filter((p) => p.stores)
        .map((p) => {
          const h = r1(4 + (p.stores / SMAX) * 70);
          return <path key={p.name} d={`M${r1(p.cx - 3.5)},${p.cy} L${p.cx},${r1(p.cy - h)} L${r1(p.cx + 3.5)},${p.cy} Z`} fill={PAL[4]} opacity={0.8} stroke="#fff" strokeWidth={0.5} />;
        })}
    </g>
    <Text x={10} y={14} size={8.5} color={INK}>
      {"Stores per province (spike height)"}
    </Text>
    <Credit />
  </Svg>
);
const hub = idn.cities.find((c) => c.name === "Jakarta")!;
const FlowMap = () => (
  <Svg label="Flow map: deliveries from the Jakarta roastery to every city, line width by revenue">
    <Provinces fill={() => LAND} />
    <g transform={`translate(0,${OY})`}>
      {idn.cities
        .filter((c) => c.name !== "Jakarta")
        .map((c, k) => {
          const mx = (hub.x + c.x) / 2;
          const my = Math.min(hub.y, c.y) - 18 - Math.abs(c.x - hub.x) * 0.12;
          return (
            <path
              key={c.name}
              d={`M${hub.x},${hub.y} Q${r1(mx)},${r1(my)} ${c.x},${c.y}`}
              fill="none"
              stroke={PAL[k % PAL.length]}
              strokeWidth={r1(1 + (cityRev(c.name) / RMAX) * 5)}
              opacity={0.8}
              strokeLinecap="round"
            />
          );
        })}
      {idn.cities.map((c) => (
        <circle key={c.name} cx={c.x} cy={c.y} r={c.name === "Jakarta" ? 4 : 2.5} fill={c.name === "Jakarta" ? INK : "#fff"} stroke={INK} />
      ))}
      <Text x={hub.x - 6} y={hub.y + 12} anchor="end" size={8} color={INK} weight={700}>
        {"Roastery"}
      </Text>
    </g>
    <Credit />
  </Svg>
);
const PieMap = () => (
  <Svg label="Pie map: the channel mix of each city drawn as a small pie on its location">
    <Provinces fill={() => LAND} />
    <g transform={`translate(0,${OY})`}>
      {idn.cities.map((c) => {
        const mixC = cityChannel.find((x) => x.label === c.name)!.parts;
        const a = offsets(mixC.map((v) => v * Math.PI * 2));
        return (
          <g key={c.name}>
            {mixC.map((v, k) => (
              <path key={k} d={arc(c.x, c.y, 0, 7.5, a[k], a[k + 1])} fill={PAL[k]} stroke="#fff" strokeWidth={0.6} />
            ))}
          </g>
        );
      })}
    </g>
    {CHANNELS.map((c, i) => (
      <g key={c}>
        <rect x={10 + i * 70} y={8} width={9} height={9} rx={2} fill={PAL[i]} />
        <Text x={23 + i * 70} y={16} size={8}>
          {c}
        </Text>
      </g>
    ))}
    <Credit />
  </Svg>
);
const top6 = [...PROV].sort((a, b) => b.stores - a.stores).slice(0, 6);
const labelled = [...top6].sort((a, b) => a.cx - b.cx);
const LabelMap = () => (
  <Svg label="Choropleth with callouts: the six provinces with the most stores labelled below the map">
    <Provinces fill={(p) => (top6.includes(p) ? seq(0.35 + (0.65 * p.stores) / SMAX) : "#ebe6dd")} />
    {labelled.map((p, i) => {
      const lx = 22 + i * 56;
      const ly = OY + idn.h + 8;
      return (
        <g key={p.name}>
          <path d={`M${p.cx},${r1(p.cy + OY)} L${lx},${ly - 8}`} stroke={MUTED} strokeWidth={0.7} fill="none" />
          <Text x={lx} y={ly + 1} anchor="middle" size={7.5} color={INK} weight={600}>
            {p.name.replace("DKI ", "").replace("DI ", "")}
          </Text>
          <Text x={lx} y={ly + 10} anchor="middle" size={7.5} mono>
            {p.stores}
          </Text>
        </g>
      );
    })}
    <Text x={10} y={14} size={8.5} color={INK}>
      {"Top six provinces by stores"}
    </Text>
  </Svg>
);
/** Bounding box of an SVG path made only of M/L commands. */
function bbox(d: string) {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
const bali = PROV.find((p) => p.codes.includes("BAL"))!;
const bb = bbox(bali.d);
function Locator() {
  const box = { x: 250, y: 10, w: 100, h: 60 };
  const k = Math.min((box.w - 10) / (bb.x1 - bb.x0), (box.h - 10) / (bb.y1 - bb.y0));
  const tx = box.x + (box.w - (bb.x1 - bb.x0) * k) / 2 - bb.x0 * k;
  const ty = box.y + (box.h - (bb.y1 - bb.y0) * k) / 2 - bb.y0 * k;
  return (
    <Svg label="Locator map: Bali highlighted on the national map, with a zoomed inset">
      <Provinces fill={(p) => (p === bali ? PAL[1] : LAND)} />
      <rect x={r1(bb.x0 - 3)} y={r1(bb.y0 + OY - 3)} width={r1(bb.x1 - bb.x0 + 6)} height={r1(bb.y1 - bb.y0 + 6)} fill="none" stroke={INK} strokeWidth={0.8} />
      <path d={`M${r1(bb.x1 + 3)},${r1(bb.y0 + OY - 3)} L${box.x},${box.y + box.h}`} stroke={INK} strokeWidth={0.6} />
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={6} fill="#fff" stroke={INK} strokeWidth={0.8} />
      <path d={bali.d} transform={`translate(${r1(tx)},${r1(ty)}) scale(${r1(k * 10) / 10})`} fill={PAL[1]} />
      <Text x={box.x + 6} y={box.y + 12} size={8} color={INK} weight={700}>
        {`Bali · ${bali.stores} stores`}
      </Text>
      <Credit />
    </Svg>
  );
}
const ISLANDS: [string, string[], string][] = [
  ["Sumatra", ["ACE", "SUT", "RIA", "KRI", "SUB", "JAM", "BEN", "SUS", "BBL", "LAM"], PAL[0]],
  ["Java", ["BAN", "JKT", "JBR", "JTG", "YOG", "JTM"], PAL[1]],
  ["Kalimantan", ["KBR", "KTG", "KSL", "KTM", "KUT"], PAL[2]],
  ["Sulawesi", ["GOR", "SLU", "STG", "SBR", "SSL", "SGR"], PAL[3]],
  ["Bali & Nusa Tenggara", ["BAL", "NTB", "NTT"], PAL[4]],
  ["Maluku", ["MUT", "MAL"], PAL[5]],
  ["Papua", ["PAP", "PBR"], PAL[6]],
];
const islandOf = (codes: string[]) => ISLANDS.find(([, cs]) => cs.includes(codes[0]))!;
const IslandMap = () => (
  <Svg label="Categorical map: provinces coloured by island group, with stores per group">
    <Provinces fill={(p) => islandOf(p.codes)[2]} />
    {ISLANDS.map(([name, cs, col], i) => (
      <g key={name}>
        <rect x={10 + (i % 4) * 88} y={i < 4 ? 6 : 18} width={8} height={8} rx={2} fill={col} />
        <Text x={21 + (i % 4) * 88} y={i < 4 ? 13 : 25} size={7.5}>
          {`${name} ${sum(PROV.filter((p) => cs.includes(p.codes[0])).map((p) => p.stores))}`}
        </Text>
      </g>
    ))}
    <Credit />
  </Svg>
);
const BIV = [
  ["#e8e8e8", "#b5c0da", "#6c83b5"],
  ["#b8d6be", "#90b2b3", "#567994"],
  ["#73ae80", "#5a9178", "#2a5a5b"],
];
const terc = (v: number, all: number[]) => {
  const s = [...all].sort((a, b) => a - b);
  return v <= s[Math.floor(s.length / 3)] ? 0 : v <= s[Math.floor((2 * s.length) / 3)] ? 1 : 2;
};
const Bivariate = () => (
  <Svg label="Bivariate choropleth: colour mixes two measures at once, stores (blue) and growth (green)">
    <Provinces
      fill={(p) =>
        BIV[
          terc(
            p.growth,
            PROV.map((q) => q.growth),
          )
        ][
          terc(
            p.stores,
            PROV.map((q) => q.stores),
          )
        ]
      }
    />
    <g transform="translate(14,8)">
      {BIV.map((row, g) => row.map((c, s) => <rect key={`${g}${s}`} x={s * 10} y={(2 - g) * 10} width={10} height={10} fill={c} />))}
      <Text x={34} y={28} size={7.5}>
        {"stores →"}
      </Text>
      <Text x={34} y={8} size={7.5}>
        {"↑ growth"}
      </Text>
    </g>
    <Credit />
  </Svg>
);

function LandClip({ id }: { id: string }) {
  return (
    <clipPath id={id}>
      {PROV.map((p) => (
        <path key={p.name} d={p.d} transform={`translate(0,${OY})`} />
      ))}
    </clipPath>
  );
}
/* nearest-city regions: each city's Voronoi cell, cut to the land */
const CELLS = idn.cities.map((c) =>
  idn.cities.reduce<[number, number][]>(
    (poly, o) => (o === c ? poly : clipHalf(poly, [c.x, c.y], [o.x, o.y])),
    [
      [0, 0],
      [W, 0],
      [W, idn.h],
      [0, idn.h],
    ],
  ),
);
function VoronoiMap() {
  const clip = useSvgId("vor");
  return (
    <Svg label="Voronoi map: the land split into areas closest to each city, like service areas for each city's stores">
      <defs>
        <LandClip id={clip} />
      </defs>
      <Provinces fill={() => LAND} />
      <g clipPath={`url(#${clip})`}>
        <g transform={`translate(0,${OY})`}>
          {CELLS.map((poly, i) => (
            <path key={i} d={`M${poly.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" L")} Z`} fill={PAL[i % PAL.length]} opacity={0.55} stroke="#fff" strokeWidth={1} />
          ))}
        </g>
      </g>
      <g transform={`translate(0,${OY})`}>
        {idn.cities.map((c) => (
          <circle key={c.name} cx={c.x} cy={c.y} r={2.5} fill={INK} stroke="#fff" />
        ))}
      </g>
      <Text x={10} y={14} size={8.5} color={INK}>
        {"Nearest city, for every point of land"}
      </Text>
      <Credit />
    </Svg>
  );
}
/* store density as contour lines on the map */
const CGX = 72;
const CGY = Math.round((CGX * idn.h) / W);
const CGRID = Array.from({ length: CGY + 1 }, (_, j) =>
  Array.from({ length: CGX + 1 }, (_, i) => {
    const px = (i / CGX) * W;
    const py = (j / CGY) * idn.h;
    return sum(
      idn.dots.map((d) => {
        const u = (px - d.x) / 22;
        const v = (py - d.y) / 22;
        const q = u * u + v * v;
        return q < 1 ? (1 - q) ** 2 : 0;
      }),
    );
  }),
);
const CMAX = Math.max(...CGRID.flat());
const CLEVELS = [0.02, 0.05, 0.1, 0.2, 0.4, 0.7].map((f) => ({ f, d: isolines(CGRID, f * CMAX, (i, j) => [(i / CGX) * W, (j / CGY) * idn.h]) }));
function ContourMap() {
  return (
    <Svg label="Contour map: lines of equal store density drawn over the islands, like a weather map">
      <Provinces fill={() => "#e6e1d8"} />
      <g transform={`translate(0,${OY})`}>
        {CLEVELS.map((l, i) => (
          <path key={l.f} d={l.d} fill="none" stroke={mix("#f0a868", "#7a2408", i / (CLEVELS.length - 1))} strokeWidth={1.3} strokeLinecap="round" />
        ))}
      </g>
      <Text x={10} y={14} size={8.5} color={INK}>
        {"Store density (darker line = denser)"}
      </Text>
      <Credit />
    </Svg>
  );
}

/* ---------------------------------------------------------------- world maps */
const WOY = Math.round((H - world.h) / 2) - 4;
const ORIG = new Map(beanOrigins.map((o) => [o.iso, o]));
const TMAX = Math.max(...beanOrigins.map((o) => o.tonnes));
function World({ fill }: { fill: (iso: string) => string }) {
  return (
    <g transform={`translate(0,${WOY})`}>
      <path d={world.outline} fill="#f3f7fb" stroke="rgba(11,11,11,0.12)" strokeWidth={0.6} />
      {world.graticule.map((g, i) => (
        <path key={i} d={g} fill="none" stroke="rgba(11,11,11,0.06)" strokeWidth={0.5} />
      ))}
      {world.countries.map((c) => (
        <path key={c.iso + c.name} d={c.d} fill={fill(c.iso)} stroke="#fff" strokeWidth={0.3}>
          <title>{ORIG.has(c.iso) ? `${c.name}: ${ORIG.get(c.iso)!.tonnes} t` : c.name}</title>
        </path>
      ))}
    </g>
  );
}
const WorldChoropleth = () => (
  <Svg label="World choropleth: where the green coffee beans come from, shaded by tonnes bought">
    <World fill={(iso) => (ORIG.has(iso) ? mix("#f6d9b8", "#7a3b0c", ORIG.get(iso)!.tonnes / TMAX) : "#e4e1db")} />
    <Text x={8} y={12} size={8.5} color={INK}>
      {"Beans bought by origin (tonnes, made-up)"}
    </Text>
    <Credit world />
  </Svg>
);
const centre = (iso: string) => world.countries.find((c) => c.iso === iso)!;
const WorldBubbles = () => (
  <Svg label="World bubble map: a circle on each origin country, area by tonnes">
    <World fill={() => "#e4e1db"} />
    <g transform={`translate(0,${WOY})`}>
      {beanOrigins.map((o) => {
        const c = centre(o.iso);
        return <circle key={o.iso} cx={c.cx} cy={c.cy} r={r1(2 + Math.sqrt(o.tonnes / TMAX) * 12)} fill="#a0521b" opacity={0.55} stroke="#7a3b0c" />;
      })}
    </g>
    <Credit world />
  </Svg>
);
const WorldFlows = () => (
  <Svg label="World flow map: shipments from each origin to the Jakarta roastery, width by tonnes">
    <World fill={(iso) => (ORIG.has(iso) ? "#d9c7b2" : "#e4e1db")} />
    <g transform={`translate(0,${WOY})`}>
      {beanOrigins
        .filter((o) => o.iso !== "IDN")
        .map((o, k) => {
          const c = centre(o.iso);
          const [jx, jy] = world.jakarta;
          const mx = (c.cx + jx) / 2;
          const my = Math.min(c.cy, jy) - 14 - Math.abs(jx - c.cx) * 0.12;
          return (
            <path
              key={o.iso}
              d={`M${c.cx},${c.cy} Q${r1(mx)},${r1(my)} ${jx},${jy}`}
              fill="none"
              stroke={PAL[k % PAL.length]}
              strokeWidth={r1(0.6 + (o.tonnes / TMAX) * 3.4)}
              opacity={0.75}
              strokeLinecap="round"
            />
          );
        })}
      <circle cx={world.jakarta[0]} cy={world.jakarta[1]} r={3.5} fill={INK} />
    </g>
    <Text x={8} y={12} size={8.5} color={INK}>
      {"Shipments to Jakarta (line width = tonnes)"}
    </Text>
    <Credit world />
  </Svg>
);
const WorldBars = () => (
  <Svg label="Map plus bars: origin countries highlighted on the world map with a ranked list beside it">
    <g transform="scale(0.62) translate(0,40)">
      <World fill={(iso) => (ORIG.has(iso) ? "#a0521b" : "#e4e1db")} />
    </g>
    {[...beanOrigins]
      .sort((a, b) => b.tonnes - a.tonnes)
      .slice(0, 8)
      .map((o, i) => (
        <g key={o.iso}>
          <Text x={292} y={24 + i * 23} anchor="end" size={8} color={INK}>
            {o.name.length > 10 ? o.iso : o.name}
          </Text>
          <rect x={296} y={16 + i * 23} width={r1((o.tonnes / TMAX) * 58)} height={10} rx={2} fill="#a0521b" />
          <Text x={298} y={36 + i * 23 - 2} size={6.5} mono>
            {`${fmt(o.tonnes)} t`}
          </Text>
        </g>
      ))}
    <Credit world />
  </Svg>
);

export const MAP_VARIANTS = [
  ...defs("Geography", "Province maps", [
    ["map-choropleth", "Choropleth map", "A rate or count per region, on the real map.", "Big regions dominate by area, not by value: consider a tile map.", Choropleth],
    ["map-classed", "Classed choropleth", "Readable bands instead of a smooth ramp.", "When class breaks are chosen to tell a story.", Classed],
    ["map-diverging", "Diverging choropleth", "Above or below a national figure.", "No meaningful midpoint.", Diverging],
    ["map-bivariate", "Bivariate choropleth", "Two measures per region in one map.", "General audiences without a legend explanation.", Bivariate],
    ["map-islands", "Categorical map", "Groups of regions (islands, sales areas).", "More than about seven categories.", IslandMap],
    ["map-bubbles", "Bubble map", "Amounts at places, not spread over areas.", "Overlapping bubbles in dense places.", BubbleMap],
    ["map-dots", "Dot map", "Every item at its location, so clusters show.", "Exact positions that are private.", DotMap],
    ["map-heat", "Heat map (density)", "Where things cluster, as a glow.", "Exact counts: it's a blur by design.", HeatMap],
    ["map-hexbin", "Hexbin map", "Counting points in equal-size cells.", "Few points: show them directly.", HexMap],
    ["map-spikes", "Spike map", "Big contrasts between regions, dramatically.", "Tall spikes hiding regions behind them.", SpikeMap],
    ["map-flows", "Flow map", "Movement from a hub to places.", "Many crossing flows.", FlowMap],
    ["map-pies", "Pie map", "A small mix (2–3 parts) at each location.", "Many parts or crowded locations.", PieMap],
    ["map-labels", "Map with callouts", "Naming the regions that matter without clutter.", "Labelling every region.", LabelMap],
    ["map-locator", "Locator map with inset", "Showing where a small place is, and zooming into it.", "When the whole map is the story.", Locator],
    ["map-voronoi", "Voronoi map", "Nearest-place areas: service or delivery zones.", "Ignoring roads and water: real travel isn't straight lines.", VoronoiMap],
    ["map-contour", "Contour map", "A smooth surface (density, temperature) as lines of equal value.", "Few data points: the lines invent detail.", ContourMap],
  ]),
  ...defs("Geography", "World maps", [
    ["world-choropleth", "World choropleth", "Values per country on a world map.", "Small countries vanish; big ones dominate.", WorldChoropleth],
    ["world-bubbles", "World bubble map", "Amounts per country without area bias.", "Overlapping bubbles in Europe or the Caribbean.", WorldBubbles],
    ["world-flows", "World flow map", "Trade or travel between countries and a hub.", "Precise volumes.", WorldFlows],
    ["world-bars", "Map with ranked bars", "Where, plus exact amounts, side by side.", "When location doesn't matter: just use bars.", WorldBars],
  ]),
];
