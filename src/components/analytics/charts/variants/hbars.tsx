import type { ReactNode } from "react";
import {
  CHANNELS,
  HOURS,
  LIKERT,
  MONTHS,
  PRODUCTS,
  bridge,
  cityChannel,
  cityProduct,
  hourlyWeekday,
  hourlyWeekend,
  monthly,
  orderValues,
  ratings,
  revenueByCity,
  revenueLastYear,
  survey,
  targets,
  totalByMonth,
} from "@/data/chart-demo";
import { H, INK, Legend, M, PAL, Svg, Text, W, arc, band, fmt, lin, nice, offsets, r1 } from "../kit";
import { defs } from "../types";
import { BAD, GOOD, SOFT, mean, polar, quant, seq, sum, useSvgId } from "./base";

type S = { x: (v: number) => number; b: ReturnType<typeof band>; base: number };
/** Horizontal bars with a label gutter on the left; the base of most bar variants. */
function HB({
  label,
  data,
  left = 86,
  right = 36,
  pad = 0.3,
  color = () => PAL[0],
  rx = 3,
  max,
  min,
  value = (v) => fmt(v),
  top = 8,
  bottom = 8,
  under,
  over,
  hideBars = false,
  names = true,
}: {
  label: string;
  data: { label: string; value: number }[];
  left?: number;
  right?: number;
  pad?: number;
  color?: (i: number, v: number) => string;
  rx?: number;
  max?: number;
  min?: number;
  value?: ((v: number, i: number) => string) | null;
  top?: number;
  bottom?: number;
  under?: (s: S) => ReactNode;
  over?: (s: S) => ReactNode;
  hideBars?: boolean;
  names?: boolean;
}) {
  const vals = data.map((d) => d.value);
  const hi = max ?? nice(Math.max(...vals, 0));
  const lo = min ?? (Math.min(...vals) < 0 ? -nice(-Math.min(...vals)) : 0);
  const x = lin(lo, hi, left, W - right);
  const b = band(data.length, top, H - bottom, pad);
  const base = x(Math.max(lo, 0));
  const s = { x, b, base };
  return (
    <Svg label={label}>
      {under?.(s)}
      {data.map((d, i) => (
        <g key={d.label + i}>
          {names && (
            <Text x={left - 6} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
              {d.label}
            </Text>
          )}
          {!hideBars && <rect x={Math.min(x(d.value), base)} y={b.at(i)} width={r1(Math.abs(x(d.value) - base))} height={b.bw} rx={Math.min(rx, b.bw / 2)} fill={color(i, d.value)} />}
          {value && !hideBars && (
            <Text x={d.value >= 0 ? x(d.value) + 4 : base + 4} y={b.mid(i) + 3} size={8.5} mono>
              {value(d.value, i)}
            </Text>
          )}
        </g>
      ))}
      {over?.(s)}
    </Svg>
  );
}

/* ---------------------------------------------------------------- data */
const cities = revenueByCity;
const avgRating = ratings.map((r) => ({ label: r.label, value: mean(r.values) }));
const chainAvg = mean(avgRating.map((r) => r.value));
const satDev = avgRating.map((r) => ({ label: r.label, value: r1((r.value - chainAvg) * 100) / 100 })).sort((a, b) => b.value - a.value);
const vsTarget = targets.map((t) => ({ label: t.label, value: Math.round((t.value / t.target - 1) * 1000) / 10 })).sort((a, b) => b.value - a.value);
const progress = targets.map((t) => ({ label: t.label, value: Math.min(1.2, t.value / t.target) }));
const chanStats = orderValues.map((c) => ({ label: c.label, p10: quant(c.values, 0.1), p50: quant(c.values, 0.5), p90: quant(c.values, 0.9) }));
const profit = bridge[bridge.length - 1].value;
const tornado = bridge
  .slice(0, -1)
  .map((b) => ({ label: b.label, value: Math.round(Math.abs(b.value) * 0.1) }))
  .sort((a, b) => b.value - a.value);
const ly = [...revenueLastYear].sort((a, b) => b.b - a.b);
const delivery = cities.map((c) => {
  const share = cityChannel.find((x) => x.label === c.label)!.parts[2];
  return { label: c.label, value: c.value, part: Math.round(c.value * share), share };
});
const ytd = monthly.map((c) => ({ label: c.city, value: Math.round(sum(c.values.slice(12))) })).sort((a, b) => b.value - a.value);

/* ---------------------------------------------------------------- horizontal bars */
function HbAbove() {
  const x = lin(0, nice(cities[0].value), 10, W - 40);
  const step = (H - 8) / cities.length;
  return (
    <Svg label="Bars with the label written above each bar, so long names never squeeze the chart">
      {cities.map((c, i) => (
        <g key={c.label}>
          <Text x={10} y={6 + i * step + 9} size={9} color={INK}>
            {c.label}
          </Text>
          <rect x={10} y={r1(6 + i * step + 12)} width={r1(x(c.value) - 10)} height={9} rx={4.5} fill={i ? "rgba(42,120,214,0.6)" : PAL[0]} />
          <Text x={x(c.value) + 4} y={6 + i * step + 20} size={8.5} mono>
            {fmt(c.value)}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
const HbRanked = () => (
  <HB
    label="Ranked bars with a numbered badge for each position"
    data={cities}
    left={100}
    color={(i) => (i < 3 ? PAL[0] : "rgba(42,120,214,0.4)")}
    over={({ b }) =>
      cities.map((c, i) => (
        <g key={c.label}>
          <circle cx={14} cy={b.mid(i)} r={8} fill={i < 3 ? INK : "rgba(11,11,11,0.1)"} />
          <Text x={14} y={b.mid(i) + 3} anchor="middle" size={8.5} color={i < 3 ? "#fff" : INK} weight={700}>
            {i + 1}
          </Text>
        </g>
      ))
    }
  />
);
const HbDiverging = () => (
  <HB
    label="Diverging bars: each city's average rating above or below the chain average"
    data={satDev}
    color={(i, v) => (v >= 0 ? GOOD : BAD)}
    value={(v) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
    max={0.4}
    min={-0.4}
    over={({ base }) => <line x1={base} x2={base} y1={4} y2={H - 4} stroke={INK} />}
  />
);
const HbDeviation = () => (
  <HB
    label="Deviation bars: how far each city is above or below its revenue target"
    data={vsTarget}
    color={(i, v) => (v >= 0 ? GOOD : PAL[1])}
    value={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
    top={24}
    over={({ base }) => (
      <g>
        <line x1={base} x2={base} y1={18} y2={H - 4} stroke={INK} />
        <Text x={base} y={12} anchor="middle" size={8.5} color={INK}>
          {"target"}
        </Text>
      </g>
    )}
  />
);
function HbButterfly() {
  const max = nice(Math.max(...hourlyWeekday, ...hourlyWeekend));
  const mid = W / 2;
  const xl = lin(0, max, mid - 18, 14);
  const xr = lin(0, max, mid + 18, W - 14);
  const b = band(HOURS.length, 22, H - 4, 0.2);
  return (
    <Svg label="Butterfly chart: orders per hour on weekdays (left) and weekends (right)">
      <Text x={mid - 22} y={12} anchor="end" size={9} color={PAL[0]} weight={700}>
        {"Weekday"}
      </Text>
      <Text x={mid + 22} y={12} size={9} color={PAL[1]} weight={700}>
        {"Weekend"}
      </Text>
      {HOURS.map((h, i) => (
        <g key={h}>
          <rect x={xl(hourlyWeekday[i])} y={b.at(i)} width={r1(mid - 18 - xl(hourlyWeekday[i]))} height={b.bw} rx={1.5} fill={PAL[0]} />
          <rect x={mid + 18} y={b.at(i)} width={r1(xr(hourlyWeekend[i]) - mid - 18)} height={b.bw} rx={1.5} fill={PAL[1]} />
          <Text x={mid} y={b.mid(i) + 3} anchor="middle" size={7.5} mono>
            {`${h}h`}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
const HbProgress = () => (
  <HB
    label="Progress bars on pill tracks: share of each city's target reached"
    data={progress}
    pad={0.55}
    rx={99}
    max={1.2}
    color={(i, v) => (v >= 1 ? GOOD : PAL[0])}
    value={(v) => `${Math.round(v * 100)}%`}
    under={({ x, b }) => progress.map((p, i) => <rect key={p.label} x={x(0)} y={b.at(i)} width={r1(x(1.2) - x(0))} height={b.bw} rx={b.bw / 2} fill="rgba(11,11,11,0.06)" />)}
    over={({ x }) => <line x1={x(1)} x2={x(1)} y1={4} y2={H - 4} stroke={INK} strokeDasharray="3 3" />}
  />
);
const HbSegmented = () => (
  <HB
    label="Segmented progress: ten blocks per city, each block is 10% of the target"
    data={progress}
    hideBars
    max={1}
    pad={0.5}
    value={null}
    over={({ x, b }) =>
      progress.map((p, i) => (
        <g key={p.label}>
          {Array.from({ length: 10 }, (_, k) => (
            <rect
              key={k}
              x={r1(x(k / 10) + 1)}
              y={b.at(i)}
              width={r1(x(0.1) - x(0) - 3)}
              height={b.bw}
              rx={2}
              fill={k < Math.round(p.value * 10) ? (p.value >= 1 ? GOOD : PAL[0]) : "rgba(11,11,11,0.08)"}
            />
          ))}
          <Text x={x(1) + 4} y={b.mid(i) + 3} size={8.5} mono>
            {`${Math.round(p.value * 100)}%`}
          </Text>
        </g>
      ))
    }
  />
);
const HbRange = () => (
  <HB
    label="Range bars: the middle 80% of order values per channel, with the median as a dot"
    data={chanStats.map((c) => ({ label: c.label, value: c.p90 }))}
    hideBars
    value={null}
    pad={0.55}
    over={({ x, b }) => (
      <g>
        {chanStats.map((c, i) => (
          <g key={c.label}>
            <rect x={x(c.p10)} y={b.mid(i) - 6} width={r1(x(c.p90) - x(c.p10))} height={12} rx={6} fill="rgba(42,120,214,0.25)" />
            <circle cx={x(c.p50)} cy={b.mid(i)} r={7} fill={PAL[0]} stroke="#fff" strokeWidth={2} />
            <Text x={x(c.p50)} y={b.mid(i) - 11} anchor="middle" size={8} mono color={PAL[0]}>
              {`${Math.round(c.p50)}k`}
            </Text>
            <Text x={x(c.p10) - 4} y={b.mid(i) + 3} anchor="end" size={8} mono>
              {`${Math.round(c.p10)}k`}
            </Text>
            <Text x={x(c.p90) + 4} y={b.mid(i) + 3} size={8} mono>
              {`${Math.round(c.p90)}k`}
            </Text>
          </g>
        ))}
        <Text x={W - 8} y={H - 6} anchor="end" size={8.5}>
          {"10th–90th percentile · dot = median (thousand Rp)"}
        </Text>
      </g>
    )}
  />
);
function HbTornado() {
  const max = nice(tornado[0].value);
  const x = lin(-max, max, 100, W - 20);
  const b = band(tornado.length, 22, H - 6, 0.3);
  return (
    <Svg label="Tornado chart: how much profit moves if each line changes by 10%">
      <Text x={x(-max)} y={12} size={8.5} color={BAD}>
        {"← profit falls"}
      </Text>
      <Text x={W - 20} y={12} anchor="end" size={8.5} color={GOOD}>
        {"profit rises →"}
      </Text>
      <Text x={x(0)} y={H - 1} anchor="middle" size={8} color={INK} weight={700}>
        {`profit ${profit} ± a 10% change in each line`}
      </Text>
      {tornado.map((t, i) => (
        <g key={t.label}>
          <Text x={94} y={b.mid(i) + 3} anchor="end" size={9} color={INK}>
            {t.label}
          </Text>
          <rect x={x(-t.value)} y={b.at(i)} width={r1(x(0) - x(-t.value))} height={b.bw} fill={BAD} opacity={0.85} />
          <rect x={x(0)} y={b.at(i)} width={r1(x(t.value) - x(0))} height={b.bw} fill={GOOD} opacity={0.85} />
          <Text x={x(t.value) + 3} y={b.mid(i) + 3} size={8} mono>
            {`±${t.value}`}
          </Text>
        </g>
      ))}
      <line x1={x(0)} x2={x(0)} y1={18} y2={H - 4} stroke={INK} />
    </Svg>
  );
}
function HbArrows() {
  const id = useSvgId("arrow");
  // log scale: the same percentage change gets the same arrow length, for big and small cities alike
  const lx = lin(Math.log10(1000), Math.log10(6000), 86, W - 50);
  const x = (v: number) => lx(Math.log10(v));
  const b = band(ly.length, 8, H - 8, 0.3);
  return (
    <Svg label="Arrow chart on a log scale: each city's revenue moving from last year to this year">
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill={GOOD} />
        </marker>
      </defs>
      {ly.map((c, i) => (
        <g key={c.label}>
          <Text x={80} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
            {c.label}
          </Text>
          <line x1={x(c.a)} x2={x(c.b)} y1={b.mid(i)} y2={b.mid(i)} stroke={GOOD} strokeWidth={2} markerEnd={`url(#${id})`} />
          <circle cx={x(c.a)} cy={b.mid(i)} r={2.5} fill={SOFT} />
          <Text x={x(c.b) + 6} y={b.mid(i) + 3} size={8} mono>
            {`+${Math.round((c.b / c.a - 1) * 100)}%`}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
const HbSplit = () => (
  <HB
    label="Split bars: total revenue per city with the delivery part shaded darker"
    data={delivery}
    color={() => "rgba(42,120,214,0.3)"}
    value={(v, i) => `${Math.round(delivery[i].share * 100)}% delivery`}
    right={70}
    over={({ x, b }) => delivery.map((d, i) => <rect key={d.label} x={x(0)} y={b.at(i)} width={r1(x(d.part) - x(0))} height={b.bw} rx={3} fill={PAL[0]} />)}
  />
);
const HbRace = () => (
  <HB
    label="One frame of a bar-chart race: year-to-date revenue by city at the end of December"
    data={ytd}
    color={(i) => PAL[i % PAL.length]}
    under={() => (
      <Text x={W - 14} y={H - 14} anchor="end" size={44} color="rgba(11,11,11,0.07)" weight={800}>
        {"DEC"}
      </Text>
    )}
  />
);
const cmax = cities[0].value;
const HbHeat = () => <HB label="Bars coloured by their value as well as their length" data={cities} color={(i, v) => seq(0.25 + (0.75 * v) / cmax)} />;
function HbWaterfall() {
  const o = offsets(bridge.slice(0, -1).map((b) => b.value));
  const max = nice(bridge[0].value);
  const x = lin(0, max, 90, W - 40);
  const b = band(bridge.length, 6, H - 6, 0.28);
  return (
    <Svg label="Horizontal waterfall: from revenue to profit, one cost at a time">
      {bridge.map((s, i) => {
        const total = s.kind === "total";
        const from = total ? 0 : o[i];
        const to = total ? s.value : o[i + 1];
        return (
          <g key={s.label}>
            <Text x={84} y={b.mid(i) + 3} anchor="end" size={9} color={INK}>
              {s.label}
            </Text>
            <rect x={x(Math.min(from, to))} y={b.at(i)} width={r1(Math.abs(x(to) - x(from)))} height={b.bw} rx={2} fill={total ? INK : BAD} opacity={total ? 1 : 0.8} />
            <Text x={x(Math.max(from, to)) + 4} y={b.mid(i) + 3} size={8} mono>
              {total ? fmt(s.value) : `−${fmt(-s.value)}`}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
const HbBadges = () => (
  <HB
    label="Bars that start with a round badge of the city's initials"
    data={cities}
    left={30}
    names={false}
    color={(i) => PAL[i % PAL.length]}
    value={(v, i) => `${cities[i].label} · ${fmt(v)}`}
    right={110}
    over={({ b }) =>
      cities.map((c, i) => (
        <g key={c.label}>
          <circle cx={16} cy={b.mid(i)} r={9} fill={PAL[i % PAL.length]} />
          <Text x={16} y={b.mid(i) + 3} anchor="middle" size={7.5} color="#fff" weight={700}>
            {c.label.slice(0, 2).toUpperCase()}
          </Text>
        </g>
      ))
    }
  />
);
function HbThermo() {
  const x = lin(0, 1.2, 104, W - 30);
  const b = band(progress.length, 10, H - 14, 0.5);
  return (
    <Svg label="Thermometer bars: a tube filling up towards each city's goal">
      {progress.map((p, i) => (
        <g key={p.label}>
          <Text x={r1(x(0) - b.bw - 6)} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
            {p.label}
          </Text>
          <rect x={x(0)} y={b.at(i)} width={r1(x(1.2) - x(0))} height={b.bw} rx={b.bw / 2} fill="#fff" stroke="rgba(11,11,11,0.2)" />
          <circle cx={x(0) - 2} cy={b.mid(i)} r={r1(b.bw * 0.72)} fill={p.value >= 1 ? GOOD : BAD} />
          <rect x={x(0)} y={r1(b.at(i) + 3)} width={r1(x(p.value) - x(0))} height={r1(b.bw - 6)} rx={r1((b.bw - 6) / 2)} fill={p.value >= 1 ? GOOD : BAD} />
          <line x1={x(1)} x2={x(1)} y1={b.at(i) - 2} y2={b.at(i) + b.bw + 2} stroke={INK} />
        </g>
      ))}
      <Text x={x(1)} y={H - 2} anchor="middle" size={8}>
        {"goal"}
      </Text>
    </Svg>
  );
}

/* ---------------------------------------------------------------- stacked & grouped, horizontal */
function HStacked() {
  const totals = cityProduct.map((c) => sum(c.parts));
  const x = lin(0, nice(Math.max(...totals)), 80, W - 14);
  const b = band(cityProduct.length, 24, H - 6, 0.3);
  return (
    <Svg label="Horizontal stacked bars: revenue per city split by product">
      <Legend items={PRODUCTS.map((p, i) => ({ label: p, color: PAL[i] }))} x={10} />
      {cityProduct.map((c, i) => {
        const o = offsets(c.parts);
        return (
          <g key={c.label}>
            <Text x={74} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
              {c.label}
            </Text>
            {c.parts.map((v, k) => (
              <rect key={k} x={x(o[k])} y={b.at(i)} width={r1(x(o[k + 1]) - x(o[k]))} height={b.bw} fill={PAL[k]} stroke="#fff" />
            ))}
          </g>
        );
      })}
    </Svg>
  );
}
function H100() {
  const rows = cityChannel.slice(0, 7);
  const x = lin(0, 1, 80, W - 14);
  const b = band(rows.length, 24, H - 6, 0.25);
  return (
    <Svg label="Horizontal 100% bars: channel mix per city, with percentages">
      <Legend items={CHANNELS.map((c, i) => ({ label: c, color: PAL[i] }))} x={10} />
      {rows.map((c, i) => {
        const o = offsets(c.parts);
        return (
          <g key={c.label}>
            <Text x={74} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
              {c.label}
            </Text>
            {c.parts.map((v, k) => (
              <g key={k}>
                <rect x={x(o[k])} y={b.at(i)} width={r1(x(o[k + 1]) - x(o[k]))} height={b.bw} fill={PAL[k]} stroke="#fff" />
                <Text x={r1((x(o[k]) + x(o[k + 1])) / 2)} y={b.mid(i) + 3} anchor="middle" size={8} color="#fff" mono>
                  {`${Math.round(v * 100)}%`}
                </Text>
              </g>
            ))}
          </g>
        );
      })}
    </Svg>
  );
}
function HGrouped() {
  const rows = ly.slice(0, 6);
  const x = lin(0, nice(Math.max(...rows.map((r) => r.b))), 80, W - 40);
  const b = band(rows.length, 24, H - 6, 0.25);
  const h = r1(b.bw / 2 - 1);
  return (
    <Svg label="Horizontal grouped bars: last year and this year for each city">
      <Legend
        items={[
          { label: "Last year", color: "rgba(11,11,11,0.25)" },
          { label: "This year", color: PAL[0] },
        ]}
        x={10}
      />
      {rows.map((r, i) => (
        <g key={r.label}>
          <Text x={74} y={b.mid(i) + 3} anchor="end" size={9.5} color={INK}>
            {r.label}
          </Text>
          <rect x={x(0)} y={b.at(i)} width={r1(x(r.a) - x(0))} height={h} rx={2} fill="rgba(11,11,11,0.25)" />
          <rect x={x(0)} y={r1(b.at(i) + h + 2)} width={r1(x(r.b) - x(0))} height={h} rx={2} fill={PAL[0]} />
          <Text x={x(r.b) + 4} y={r1(b.at(i) + h * 1.5 + 5)} size={8} mono>
            {fmt(r.b)}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
const LK = ["#c8413f", "#e8a39f", "#d9d9d9", "#8fcfb0", "#138a60"];
function Likert() {
  const x = lin(-0.75, 0.75, 112, W - 10);
  const b = band(survey.length, 26, H - 6, 0.3);
  return (
    <Svg label="Diverging stacked bars for a survey: disagreement to the left, agreement to the right, neutral in the middle">
      {LIKERT.map((l, k) => (
        <g key={l}>
          <rect x={112 + k * 48} y={4} width={8} height={8} rx={2} fill={LK[k]} />
          <Text x={123 + k * 48} y={11} size={7}>
            {["SD", "D", "Neutral", "A", "SA"][k]}
          </Text>
        </g>
      ))}
      {survey.map((q, i) => {
        const start = -(q.parts[0] + q.parts[1] + q.parts[2] / 2);
        const o = offsets(q.parts).map((v) => v + start);
        return (
          <g key={q.label}>
            <Text x={106} y={b.mid(i) + 3} anchor="end" size={8.5} color={INK}>
              {q.label}
            </Text>
            {q.parts.map((v, k) => (
              <rect key={k} x={x(o[k])} y={b.at(i)} width={r1(x(o[k + 1]) - x(o[k]))} height={b.bw} fill={LK[k]} />
            ))}
          </g>
        );
      })}
      <line x1={x(0)} x2={x(0)} y1={20} y2={H - 4} stroke={INK} strokeDasharray="2 2" />
    </Svg>
  );
}

/* ---------------------------------------------------------------- dots & lollipops */
const thisYear = MONTHS.map((m, i) => ({ label: m, value: totalByMonth[12 + i] }));
function VLollipop() {
  const max = nice(Math.max(...thisYear.map((d) => d.value)));
  const y = lin(0, max, H - M.b, M.t);
  const b = band(12, M.l, W - M.r, 0);
  return (
    <Svg label="Vertical lollipops: monthly revenue as a stick with a dot">
      {[0, max / 2, max].map((v) => (
        <g key={v}>
          <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="rgba(11,11,11,0.08)" />
          <Text x={M.l - 5} y={y(v) + 3} anchor="end" size={9} mono>
            {fmt(v)}
          </Text>
        </g>
      ))}
      {thisYear.map((d, i) => (
        <g key={d.label}>
          <line x1={b.mid(i)} x2={b.mid(i)} y1={y(0)} y2={y(d.value)} stroke={PAL[3]} strokeWidth={2} />
          <circle cx={b.mid(i)} cy={y(d.value)} r={5} fill={PAL[3]} />
          <Text x={b.mid(i)} y={H - M.b + 14} anchor="middle" size={9}>
            {d.label.slice(0, 1)}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
const Cleveland = () => (
  <HB
    label="Cleveland dot plot: one dot per city on a light guide line, sorted"
    data={cities}
    hideBars
    value={null}
    min={1000}
    max={nice(cities[0].value)}
    over={({ x, b }) =>
      cities.map((c, i) => (
        <g key={c.label}>
          <line x1={x(1000)} x2={W - 36} y1={b.mid(i)} y2={b.mid(i)} stroke="rgba(11,11,11,0.1)" strokeDasharray="2 3" />
          <circle cx={x(c.value)} cy={b.mid(i)} r={5} fill={PAL[0]} />
          <Text x={x(c.value) + 8} y={b.mid(i) + 3} size={8} mono>
            {fmt(c.value)}
          </Text>
        </g>
      ))
    }
  />
);
const StripDots = () => (
  <HB
    label="Dot strips: the share of each channel in every city, three dots per row"
    data={cityChannel.map((c) => ({ label: c.label, value: Math.max(...c.parts) }))}
    hideBars
    value={null}
    max={0.6}
    top={24}
    over={({ x, b }) => (
      <g>
        <Legend items={CHANNELS.map((c, i) => ({ label: c, color: PAL[i] }))} x={86} y={10} />
        {cityChannel.map((c, i) => (
          <g key={c.label}>
            <line x1={x(Math.min(...c.parts))} x2={x(Math.max(...c.parts))} y1={b.mid(i)} y2={b.mid(i)} stroke="rgba(11,11,11,0.15)" strokeWidth={3} />
            {c.parts.map((v, k) => (
              <circle key={k} cx={x(v)} cy={b.mid(i)} r={4.5} fill={PAL[k]} stroke="#fff" />
            ))}
          </g>
        ))}
        {[0, 0.2, 0.4, 0.6].map((v) => (
          <Text key={v} x={x(v)} y={H - 1} anchor="middle" size={7.5} mono>
            {`${v * 100}%`}
          </Text>
        ))}
      </g>
    )}
  />
);
const mom = thisYear.map((d, i) => ({ label: d.label, value: r1((d.value / totalByMonth[11 + i] - 1) * 100) }));
function DivLollipop() {
  const max = nice(Math.max(...mom.map((d) => Math.abs(d.value))));
  const y = lin(-max, max, H - M.b, M.t);
  const b = band(12, M.l, W - M.r, 0);
  return (
    <Svg label="Diverging lollipops: growth on the previous month, up or down from zero">
      {[-max, 0, max].map((v) => (
        <g key={v}>
          <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke={v ? "rgba(11,11,11,0.08)" : INK} />
          <Text x={M.l - 5} y={y(v) + 3} anchor="end" size={9} mono>
            {`${v}%`}
          </Text>
        </g>
      ))}
      {mom.map((d, i) => (
        <g key={d.label}>
          <line x1={b.mid(i)} x2={b.mid(i)} y1={y(0)} y2={y(d.value)} stroke={d.value >= 0 ? GOOD : BAD} strokeWidth={2} />
          <circle cx={b.mid(i)} cy={y(d.value)} r={4.5} fill={d.value >= 0 ? GOOD : BAD} />
          <Text x={b.mid(i)} y={H - M.b + 14} anchor="middle" size={9}>
            {d.label.slice(0, 1)}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function Circles() {
  const rows = cities.slice(0, 6);
  const rmax = 26;
  return (
    <Svg label="Proportional circles: circle area shows each city's revenue">
      {rows.map((c, i) => {
        const r = r1(rmax * Math.sqrt(c.value / rows[0].value));
        const cx = 34 + i * 58;
        return (
          <g key={c.label}>
            <circle cx={cx} cy={100} r={r} fill={PAL[i]} opacity={0.85} />
            <Text x={cx} y={150} anchor="middle" size={9} color={INK}>
              {c.label}
            </Text>
            <Text x={cx} y={163} anchor="middle" size={8} mono>
              {fmt(c.value)}
            </Text>
          </g>
        );
      })}
      <Text x={10} y={14} size={9}>
        {"Area, not width, is proportional to revenue"}
      </Text>
    </Svg>
  );
}
const DotStrip12 = () => (
  <HB
    label="Dot strips of twelve months per city, with the yearly average as a bar"
    data={monthly.map((c) => ({ label: c.city, value: Math.max(...c.values.slice(12)) }))}
    hideBars
    value={null}
    over={({ x, b }) =>
      monthly.map((c, i) => (
        <g key={c.city}>
          {c.values.slice(12).map((v, k) => (
            <circle key={k} cx={x(v)} cy={b.mid(i)} r={3} fill={PAL[0]} opacity={0.4} />
          ))}
          <line x1={x(mean(c.values.slice(12)))} x2={x(mean(c.values.slice(12)))} y1={b.at(i) - 1} y2={b.at(i) + b.bw + 1} stroke={INK} strokeWidth={2} />
        </g>
      ))
    }
  />
);

/* ---------------------------------------------------------------- radial bars */
function Circular() {
  const max = Math.max(...thisYear.map((d) => d.value));
  const r = lin(0, max, 30, 100);
  return (
    <Svg label="Circular bar chart: one bar per month around a circle">
      {thisYear.map((d, i) => {
        const a0 = (i / 12) * Math.PI * 2 + 0.04;
        const a1 = ((i + 1) / 12) * Math.PI * 2 - 0.04;
        const [lx, ly2] = polar(180, 112, r(d.value) + 9, (a0 + a1) / 2);
        return (
          <g key={d.label}>
            <path d={arc(180, 112, 30, r(d.value), a0, a1)} fill={i === 11 ? PAL[1] : PAL[0]} opacity={i === 11 ? 1 : 0.75} />
            <Text x={lx} y={ly2 + 3} anchor="middle" size={8}>
              {d.label.slice(0, 1)}
            </Text>
          </g>
        );
      })}
      <Text x={180} y={115} anchor="middle" size={9} color={INK} weight={700}>
        {"2025"}
      </Text>
    </Svg>
  );
}
function RadialProgress() {
  return (
    <Svg label="Radial progress bars: concentric rings, each filling towards a city's target">
      {progress.map((p, i) => {
        const rr = 96 - i * 16;
        return (
          <g key={p.label}>
            <path d={arc(130, 110, rr - 11, rr, 0, Math.PI * 1.5)} fill="rgba(11,11,11,0.06)" />
            <path d={arc(130, 110, rr - 11, rr, 0, Math.PI * 1.5 * Math.min(1, p.value))} fill={PAL[i]} />
            <Text x={126} y={r1(110 - rr + 9)} anchor="end" size={8.5} color={INK}>
              {`${p.label} ${Math.round(p.value * 100)}%`}
            </Text>
          </g>
        );
      })}
      <Text x={250} y={110} size={9}>
        {"full ring = target"}
      </Text>
    </Svg>
  );
}
function Rose() {
  const max = Math.max(...thisYear.map((d) => d.value));
  return (
    <Svg label="Nightingale rose: monthly revenue as wedges whose area grows with the value">
      {thisYear.map((d, i) => {
        const rr = r1(100 * Math.sqrt(d.value / max));
        return <path key={d.label} d={arc(180, 112, 0, rr, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2)} fill={PAL[i % 4 === 3 ? 1 : 0]} opacity={0.35 + (0.6 * i) / 11} stroke="#fff" />;
      })}
      {MONTHS.map((m, i) => {
        const [x, y] = polar(180, 112, 108, ((i + 0.5) / 12) * Math.PI * 2);
        return (
          <Text key={m} x={x} y={y + 3} anchor="middle" size={8}>
            {m.slice(0, 1)}
          </Text>
        );
      })}
    </Svg>
  );
}
function RadialStacked() {
  const totals = cityProduct.map((c) => sum(c.parts));
  const r = lin(0, Math.max(...totals), 28, 100);
  const n = cityProduct.length;
  return (
    <Svg label="Radial stacked bars: each city a bar around the circle, split by product">
      {cityProduct.map((c, i) => {
        const o = offsets(c.parts);
        const a0 = (i / n) * Math.PI * 2 + 0.08;
        const a1 = ((i + 1) / n) * Math.PI * 2 - 0.08;
        const [lx, ly2] = polar(180, 112, r(totals[i]) + 10, (a0 + a1) / 2);
        return (
          <g key={c.label}>
            {c.parts.map((v, k) => (
              <path key={k} d={arc(180, 112, r(o[k]), r(o[k + 1]), a0, a1)} fill={PAL[k]} stroke="#fff" strokeWidth={0.8} />
            ))}
            <Text x={lx} y={ly2 + 3} anchor="middle" size={8} color={INK}>
              {c.label.slice(0, 7)}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}

export const HBAR_VARIANTS = [
  ...defs("Comparison", "Horizontal bars", [
    ["hb-above", "Labels above bars", "Long names and narrow screens: the label never squeezes the bar.", "Very many rows: it takes twice the height.", HbAbove],
    ["hb-ranked", "Ranked bars with badges", "Leaderboards: position matters as much as value.", "When ranks hide how close the values are.", HbRanked],
    ["hb-diverging", "Diverging bars", "Above or below an average, a zero or a benchmark.", "When there's no meaningful middle.", HbDiverging],
    ["hb-deviation", "Deviation from target", "How far each item is ahead of or behind plan.", "When the targets themselves are disputed.", HbDeviation],
    ["hb-butterfly", "Butterfly (back to back)", "Two groups compared across the same categories.", "Groups on very different scales.", HbButterfly],
    ["hb-progress", "Progress bars", "Percent of a goal, for several items at once.", "Goals that aren't comparable.", HbProgress],
    ["hb-segmented", "Segmented progress", "A countable, friendly view of progress (blocks of 10%).", "Fine differences: blocks round the value.", HbSegmented],
    ["hb-range", "Range bars", "Typical low–high span per group, with the middle marked.", "When the full distribution matters: use a box plot.", HbRange],
    ["hb-tornado", "Tornado chart", "Which inputs move the result most (sensitivity).", "Inputs that don't move independently.", HbTornado],
    ["hb-arrows", "Arrow chart", "Change from before to after, direction at a glance.", "Many overlapping arrows.", HbArrows],
    ["hb-split", "Split bars", "A highlighted part inside each total.", "More than one part to compare.", HbSplit],
    ["hb-race", "Bar race (one frame)", "Animated rankings over time, frame by frame.", "Precise analysis: the motion is for engagement.", HbRace],
    ["hb-heat", "Heat-coloured bars", "Reinforcing value with colour on a hero chart.", "When colour is needed for another variable.", HbHeat],
    ["hb-waterfall", "Horizontal waterfall", "Step-by-step bridges with long step names.", "Many tiny steps.", HbWaterfall],
    ["hb-badges", "Bars with badges", "Lists where people recognise logos or initials.", "Unfamiliar abbreviations.", HbBadges],
    ["hb-thermo", "Thermometer bars", "Fundraising-style goals with a clear finish line.", "Values that can go far past the goal.", HbThermo],
  ]),
  ...defs("Comparison", "Stacked & grouped", [
    ["sg-hstacked", "Horizontal stacked bars", "Totals and parts with long category names.", "Comparing the middle segments.", HStacked],
    ["sg-h100", "Horizontal 100% bars", "Mix per category, with percentages printed.", "When the totals differ a lot and matter.", H100],
    ["sg-hgrouped", "Horizontal grouped bars", "Two periods per category with long names.", "More than three series.", HGrouped],
    ["sg-likert", "Diverging stacked (survey)", "Agree/disagree scales: sentiment at a glance.", "Ordinal data with no neutral middle.", Likert],
  ]),
  ...defs("Comparison", "Dots & lollipops", [
    ["dl-vlollipop", "Vertical lollipop", "A lighter column chart for many periods.", "Values that don't start from zero.", VLollipop],
    ["dl-cleveland", "Cleveland dot plot", "Precise comparison without heavy bars; the axis may zoom.", "Readers expecting bars from zero.", Cleveland],
    ["dl-strips", "Dot strips", "Several values per row on one shared axis.", "Values that overlap heavily.", StripDots],
    ["dl-diverging", "Diverging lollipop", "Ups and downs around zero, lightly.", "When the bars' area should carry weight.", DivLollipop],
    ["dl-circles", "Proportional circles", "Big differences in size for general audiences.", "Precise comparison: areas are hard to judge.", Circles],
    ["dl-strip12", "Dot strip with average", "Spread and average of each group at once.", "Hundreds of points per row: use a box plot.", DotStrip12],
  ]),
  ...defs("Comparison", "Radial bars", [
    ["rd-circular", "Circular bar chart", "Cyclical periods (months, hours) in an eye-catching layout.", "Precise comparison: outer bars look bigger.", Circular],
    ["rd-progress", "Radial progress rings", "A few progress values in a compact square.", "Comparing rings: outer rings look longer.", RadialProgress],
    ["rd-rose", "Nightingale rose", "Seasonal patterns where area should match value.", "Readers comparing exact values.", Rose],
    ["rd-stacked", "Radial stacked bars", "Totals and parts around a circle, as a visual summary.", "Analysis: use straight stacked bars.", RadialStacked],
  ]),
];
