import type { ReactNode } from "react";
import {
  MONTHS,
  PRODUCTS,
  CHANNELS,
  QUARTERS,
  HOURS,
  channelQuarter,
  cityProduct,
  daily,
  monthly,
  productTotals,
  revenueByCity,
  revenueLastYear,
  totalByMonth,
  hourlyWeekday,
} from "@/data/chart-demo";
import { H, INK, Legend, M, PAL, Svg, Text, W, XLabels, YGrid, band, fmt, lin, nice, offsets, path, r1 } from "../kit";
import { defs } from "../types";
import { BAD, GOOD, SOFT, mean, sd, smooth, sum, useSvgId } from "./base";

/* ---------------------------------------------------------------- data */
const thisYear = MONTHS.map((m, i) => ({ label: m, value: totalByMonth[12 + i] }));
const lastYear = totalByMonth.slice(0, 12);
const target = lastYear.map((v) => Math.round(v * 1.18));
const growth = thisYear.map((d, i) => ({ label: d.label, value: r1((d.value / totalByMonth[11 + i] - 1) * 100) }));
const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, k) => {
  const v = daily.filter((_, i) => i % 7 === k);
  return { label: d, value: Math.round(mean(v)), sd: Math.round(sd(v)) };
});
const monthOf = (d: number) => Math.min(11, Math.floor(d / 30.34));
const ranges = MONTHS.map((m, k) => {
  const v = daily.filter((_, d) => monthOf(d) === k);
  return { label: m, lo: Math.min(...v), hi: Math.max(...v), avg: Math.round(mean(v)) };
});
const mo = (s: string) => s.slice(0, 1);

type S = { y: (v: number) => number; b: ReturnType<typeof band>; base: number };
/** Vertical bars with an optional overlay; the base of most column variants. */
function Cols({
  label,
  data,
  max,
  min,
  pad = 0.3,
  color = () => PAL[0],
  rx = 3,
  top = 0,
  xl = (s) => s,
  every = 1,
  ticks,
  yfmt = fmt,
  under,
  over,
  hideBars = false,
  right = 0,
}: {
  label: string;
  data: { label: string; value: number }[];
  max?: number;
  min?: number;
  pad?: number;
  color?: (i: number, v: number) => string;
  rx?: number;
  top?: number;
  xl?: (s: string) => string;
  every?: number;
  ticks?: number;
  yfmt?: (v: number) => string;
  under?: (s: S) => ReactNode;
  over?: (s: S) => ReactNode;
  hideBars?: boolean;
  right?: number;
}) {
  const vals = data.map((d) => d.value);
  const hi = max ?? nice(Math.max(...vals));
  const lo = min ?? (Math.min(...vals) < 0 ? -nice(-Math.min(...vals)) : 0);
  const y = lin(lo, hi, H - M.b, M.t + top);
  const b = band(data.length, M.l, W - M.r - right, pad);
  const base = y(Math.max(lo, 0));
  const s = { y, b, base };
  return (
    <Svg label={label}>
      <YGrid y={y} max={hi} min={lo} ticks={ticks} format={yfmt} x1={W - M.r - right} />
      {under?.(s)}
      {!hideBars &&
        data.map((d, i) => (
          <rect key={d.label + i} x={b.at(i)} y={Math.min(y(d.value), base)} width={b.bw} height={r1(Math.abs(base - y(d.value)))} rx={Math.min(rx, b.bw / 2)} fill={color(i, d.value)} />
        ))}
      {over?.(s)}
      <XLabels labels={data.map((d) => xl(d.label))} x={b.mid} every={every} />
    </Svg>
  );
}

/* ---------------------------------------------------------------- columns */
const sortedMonths = [...thisYear].sort((a, b) => b.value - a.value);
const ColSorted = () => <Cols label="Columns sorted from the biggest month to the smallest" data={sortedMonths} xl={mo} />;
const ColLabels = () => (
  <Cols
    label="Columns with the value printed on top"
    data={thisYear}
    top={10}
    xl={mo}
    over={({ y, b }) =>
      thisYear.map((d, i) => (
        <Text key={d.label} x={b.mid(i)} y={y(d.value) - 4} anchor="middle" size={7.5} mono color={INK}>
          {fmt(d.value)}
        </Text>
      ))
    }
  />
);
const ColPill = () => (
  <Cols
    label="Rounded pill columns on light tracks"
    data={thisYear}
    pad={0.45}
    rx={99}
    xl={mo}
    under={({ y, b, base }) =>
      thisYear.map((d, i) => (
        <rect
          key={d.label}
          x={b.at(i)}
          y={y(nice(Math.max(...thisYear.map((t) => t.value))))}
          width={b.bw}
          height={r1(base - y(nice(Math.max(...thisYear.map((t) => t.value)))))}
          rx={b.bw / 2}
          fill="rgba(11,11,11,0.05)"
        />
      ))
    }
  />
);
const peak = thisYear.reduce((a, b, i, arr) => (b.value > arr[a].value ? i : a), 0);
export const ColHighlight = () => (
  <Cols
    label="One column highlighted in colour, the rest in grey"
    data={thisYear}
    xl={mo}
    color={(i) => (i === peak ? PAL[1] : SOFT)}
    top={14}
    over={({ y, b }) => (
      <Text x={b.mid(peak) - 6} y={y(thisYear[peak].value) - 6} anchor="end" size={9} color={PAL[1]} weight={700}>
        {`${MONTHS[peak]}: year-end peak, ${fmt(thisYear[peak].value)}`}
      </Text>
    )}
  />
);
function ColGradient() {
  const id = useSvgId("cg");
  return (
    <Cols
      label="Columns filled with a vertical gradient"
      data={thisYear}
      xl={mo}
      color={() => `url(#${id})`}
      under={() => (
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6250d6" />
            <stop offset="1" stopColor="#2a78d6" stopOpacity={0.35} />
          </linearGradient>
        </defs>
      )}
    />
  );
}
const avg = Math.round(mean(thisYear.map((d) => d.value)));
const ColAverage = () => (
  <Cols
    label="Columns with a dashed average line"
    data={thisYear}
    xl={mo}
    color={(i, v) => (v >= avg ? PAL[0] : "rgba(42,120,214,0.4)")}
    over={({ y }) => (
      <g>
        <line x1={M.l} x2={W - M.r} y1={y(avg)} y2={y(avg)} stroke={INK} strokeDasharray="4 3" />
        <Text x={M.l + 4} y={y(avg) - 5} size={8.5} color={INK}>
          {`average ${fmt(avg)}`}
        </Text>
      </g>
    )}
  />
);
const ColTarget = () => (
  <Cols
    label="Columns with a target tick for each month: green when the target is reached"
    data={thisYear}
    xl={mo}
    max={nice(Math.max(...target, ...thisYear.map((d) => d.value)))}
    color={(i, v) => (v >= target[i] ? GOOD : PAL[1])}
    over={({ y, b }) => thisYear.map((d, i) => <line key={d.label} x1={b.at(i) - 2} x2={b.at(i) + b.bw + 2} y1={y(target[i])} y2={y(target[i])} stroke={INK} strokeWidth={2} />)}
  />
);
const ColDiverging = () => (
  <Cols
    label="Columns above and below zero: growth on the month before"
    data={growth}
    xl={mo}
    yfmt={(v) => `${v}%`}
    color={(i, v) => (v >= 0 ? GOOD : BAD)}
    over={({ base }) => <line x1={M.l} x2={W - M.r} y1={base} y2={base} stroke={INK} />}
  />
);
const ColError = () => (
  <Cols
    label="Average daily orders by weekday, with error bars of one standard deviation"
    data={weekday}
    pad={0.45}
    max={nice(Math.max(...weekday.map((d) => d.value + d.sd)))}
    color={(i) => (i >= 5 ? PAL[3] : PAL[0])}
    over={({ y, b }) =>
      weekday.map((d, i) => (
        <g key={d.label} stroke={INK} strokeWidth={1.2}>
          <line x1={b.mid(i)} x2={b.mid(i)} y1={y(d.value - d.sd)} y2={y(d.value + d.sd)} />
          <line x1={b.mid(i) - 5} x2={b.mid(i) + 5} y1={y(d.value + d.sd)} y2={y(d.value + d.sd)} />
          <line x1={b.mid(i) - 5} x2={b.mid(i) + 5} y1={y(d.value - d.sd)} y2={y(d.value - d.sd)} />
        </g>
      ))
    }
  />
);
const q1 = daily.slice(0, 91).map((v, i) => ({ label: String(i), value: v }));
const ColNeedle = () => (
  <Cols
    label="Ninety thin columns, one per day: weekends stand out"
    data={q1}
    pad={0.35}
    rx={0}
    color={(i) => (i % 7 >= 5 ? PAL[1] : "rgba(42,120,214,0.55)")}
    xl={(s) => (Number(s) % 30 === 0 ? `day ${Number(s) + 1}` : "")}
  />
);
const ColInside = () => (
  <Cols
    label="Columns with the city name written inside each bar"
    data={revenueByCity}
    pad={0.18}
    xl={() => ""}
    color={(i) => (i ? "rgba(42,120,214,0.75)" : PAL[0])}
    over={({ y, b, base }) =>
      revenueByCity.map((d, i) => {
        const text = `${d.label} · ${fmt(d.value)}`;
        const fits = base - y(d.value) > text.length * 5.4 + 10;
        return (
          <text
            key={d.label}
            transform={`translate(${r1(b.mid(i) + 3)},${r1(fits ? base - 6 : y(d.value) - 4)}) rotate(-90)`}
            fontSize={9.5}
            fill={fits ? "#fff" : INK}
            fontWeight={600}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {text}
          </text>
        );
      })
    }
  />
);
const ColLastYear = () => (
  <Cols
    label="This year as columns, last year as a line on the same axis"
    data={thisYear}
    xl={mo}
    top={12}
    color={() => "rgba(42,120,214,0.75)"}
    over={({ y, b }) => (
      <g>
        <path d={path(lastYear.map((v, i) => [b.mid(i), y(v)]))} fill="none" stroke={INK} strokeWidth={1.8} />
        {lastYear.map((v, i) => (
          <circle key={i} cx={b.mid(i)} cy={y(v)} r={2.2} fill={INK} />
        ))}
        <Legend
          items={[
            { label: "This year", color: "rgba(42,120,214,0.75)" },
            { label: "Last year", color: INK },
          ]}
          x={M.l + 4}
          y={10}
        />
      </g>
    )}
  />
);
const prodSorted = [...productTotals].sort((a, b) => b.value - a.value);
const prodCum = offsets(prodSorted.map((p) => p.value)).slice(1);
const prodSum = sum(prodSorted.map((p) => p.value));
export const ColPareto = () => (
  <Cols
    label="Pareto chart: products sorted by revenue, with the cumulative share as a line"
    data={prodSorted}
    xl={(s) => s.slice(0, 9)}
    right={22}
    color={() => PAL[0]}
    over={({ b }) => {
      const yp = lin(0, 1, H - M.b, M.t);
      return (
        <g>
          <path d={path(prodCum.map((c, i) => [b.mid(i), yp(c / prodSum)]))} fill="none" stroke={PAL[1]} strokeWidth={2} />
          {prodCum.map((c, i) => (
            <g key={i}>
              <circle cx={b.mid(i)} cy={yp(c / prodSum)} r={3} fill={PAL[1]} />
              <Text x={b.mid(i)} y={yp(c / prodSum) - 6} anchor="middle" size={8} color={PAL[1]} mono>
                {`${Math.round((c / prodSum) * 100)}%`}
              </Text>
            </g>
          ))}
          {[0, 50, 100].map((v) => (
            <Text key={v} x={W - M.r - 18} y={yp(v / 100) + 3} size={8} mono color={PAL[1]}>
              {`${v}%`}
            </Text>
          ))}
        </g>
      );
    }}
  />
);
const hours = HOURS.map((h, i) => ({ label: String(h), value: hourlyWeekday[i] }));
const ColTouching = () => (
  <Cols
    label="Touching columns for consecutive hours: orders on an average weekday"
    data={hours}
    pad={0.04}
    rx={0}
    color={(i, v) => (v > 60 ? PAL[1] : PAL[0])}
    xl={(s) => (Number(s) % 3 === 1 ? `${s}:00` : "")}
  />
);
const ColOverlap = () => (
  <Cols
    label="Overlapping columns: a wide light target bar behind a narrow actual bar"
    data={thisYear}
    xl={mo}
    hideBars
    max={nice(Math.max(...target))}
    over={({ y, b, base }) =>
      thisYear.map((d, i) => (
        <g key={d.label}>
          <rect x={b.at(i)} y={y(target[i])} width={b.bw} height={r1(base - y(target[i]))} rx={2} fill="rgba(11,11,11,0.1)" />
          <rect x={r1(b.at(i) + b.bw * 0.25)} y={y(d.value)} width={r1(b.bw * 0.5)} height={r1(base - y(d.value))} rx={2} fill={d.value >= target[i] ? GOOD : PAL[0]} />
        </g>
      ))
    }
  />
);
const ColRange = () => (
  <Cols
    label="Floating columns from the quietest to the busiest day of each month, with the average marked"
    data={ranges.map((r) => ({ label: r.label, value: r.hi }))}
    xl={mo}
    hideBars
    max={nice(Math.max(...ranges.map((r) => r.hi)))}
    over={({ y, b }) =>
      ranges.map((r, i) => (
        <g key={r.label}>
          <rect x={b.at(i)} y={y(r.hi)} width={b.bw} height={r1(y(r.lo) - y(r.hi))} rx={4} fill="rgba(98,80,214,0.3)" />
          <line x1={b.at(i)} x2={b.at(i) + b.bw} y1={y(r.avg)} y2={y(r.avg)} stroke={PAL[3]} strokeWidth={2.2} />
        </g>
      ))
    }
  />
);
const top5 = revenueByCity.slice(0, 5);
const per = 500;
function Cup({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g>
      <rect x={r1(x)} y={r1(y)} width={r1(s)} height={r1(s * 0.8)} rx={r1(s * 0.18)} fill={color} />
      <circle cx={r1(x + s)} cy={r1(y + s * 0.35)} r={r1(s * 0.2)} fill="none" stroke={color} strokeWidth={1.4} />
    </g>
  );
}
const ColPictogram = () => (
  <Svg label="Pictogram columns: each cup stands for 500 million rupiah">
    <Text x={M.l} y={14} size={9}>
      {"each cup = Rp 500 m"}
    </Text>
    {top5.map((c, i) => {
      const n = Math.round(c.value / per);
      return (
        <g key={c.label}>
          {Array.from({ length: n }, (_, k) => (
            <Cup key={k} x={M.l + 2 + i * 62} y={H - M.b - 16 - k * 15.5} s={15} color={PAL[i]} />
          ))}
          <Text x={M.l + 14 + i * 62} y={H - M.b + 14} anchor="middle" size={9}>
            {c.label.slice(0, 9)}
          </Text>
        </g>
      );
    })}
  </Svg>
);
function ColMultiples() {
  const max = nice(Math.max(...monthly.flatMap((c) => c.values.slice(12))));
  const cw = (W - 16) / 4;
  const ch = (H - 12) / 2;
  return (
    <Svg label="Small multiples: twelve months of revenue for each of eight cities, on a shared scale">
      {monthly.map((c, k) => {
        const ox = 8 + (k % 4) * cw;
        const oy = 6 + Math.floor(k / 4) * ch;
        const y = lin(0, max, oy + ch - 8, oy + 18);
        const b = band(12, ox + 4, ox + cw - 6, 0.25);
        return (
          <g key={c.city}>
            <rect x={ox} y={oy} width={r1(cw - 4)} height={r1(ch - 4)} rx={6} fill="rgba(11,11,11,0.025)" />
            <Text x={ox + 6} y={oy + 12} size={8.5} color={INK} weight={600}>
              {c.city}
            </Text>
            {c.values.slice(12).map((v, i) => (
              <rect key={i} x={b.at(i)} y={y(v)} width={b.bw} height={r1(oy + ch - 8 - y(v))} fill={PAL[k % PAL.length]} />
            ))}
          </g>
        );
      })}
    </Svg>
  );
}
const low = thisYear.reduce((a, b, i, arr) => (b.value < arr[a].value ? i : a), 0);
const ColAnnotated = () => (
  <Cols
    label="Annotated columns: the story written next to the highest and lowest month"
    data={thisYear}
    xl={mo}
    top={26}
    color={(i) => (i === peak || i === low ? INK : "rgba(11,11,11,0.25)")}
    over={({ y, b }) => (
      <g>
        <path d={`M${b.mid(low)},${y(thisYear[low].value) - 3} L${b.mid(low)},${M.t + 16}`} stroke={INK} strokeDasharray="2 2" />
        <Text x={b.mid(low) + 4} y={M.t + 14} size={8.5} color={INK}>
          {`${MONTHS[low]}: slowest month`}
        </Text>
        <path d={`M${b.mid(peak)},${y(thisYear[peak].value) - 3} L${b.mid(peak)},${M.t + 30}`} stroke={INK} strokeDasharray="2 2" />
        <Text x={b.mid(peak) - 4} y={M.t + 28} size={8.5} color={INK} anchor="end">
          {`${MONTHS[peak]}: holiday rush`}
        </Text>
      </g>
    )}
  />
);
const ColSkyline = () => (
  <Cols
    label="Skyline: the columns drawn as one stepped outline"
    data={thisYear}
    xl={mo}
    hideBars
    pad={0}
    over={({ y, b, base }) => {
      const d = `M${b.at(0)},${base} ${thisYear.map((t, i) => `L${b.at(i)},${y(t.value)} L${r1(b.at(i) + b.step)},${y(t.value)}`).join(" ")} L${r1(b.at(11) + b.step)},${base} Z`;
      return (
        <g>
          <path d={d} fill="rgba(15,118,110,0.15)" stroke={PAL[6]} strokeWidth={2} strokeLinejoin="round" />
        </g>
      );
    }}
  />
);
const variance = revenueLastYear.map((c) => ({ label: c.label, value: Math.round(c.b - c.a) })).sort((a, b) => b.value - a.value);
const ColVariance = () => (
  <Cols
    label="Variance columns: how much more each city earned than last year"
    data={variance}
    xl={(s) => s.slice(0, 5)}
    top={10}
    color={(i, v) => (v >= 0 ? GOOD : BAD)}
    over={({ y, b }) =>
      variance.map((d, i) => (
        <Text key={d.label} x={b.mid(i)} y={y(d.value) - 4} anchor="middle" size={8} mono color={INK}>
          {`+${fmt(d.value)}`}
        </Text>
      ))
    }
  />
);
const running = offsets(thisYear.map((d) => d.value)).slice(1);
const annualTarget = sum(target);
const ColCumulative = () => (
  <Cols
    label="Running total by month, climbing towards the annual target"
    data={thisYear.map((d, i) => ({ label: d.label, value: running[i] }))}
    xl={mo}
    max={nice(Math.max(annualTarget, running[11]))}
    color={(i) => (i === 11 ? PAL[0] : "rgba(42,120,214,0.45)")}
    over={({ y }) => (
      <g>
        <line x1={M.l} x2={W - M.r} y1={y(annualTarget)} y2={y(annualTarget)} stroke={PAL[1]} strokeDasharray="5 3" strokeWidth={1.5} />
        <Text x={M.l + 4} y={y(annualTarget) - 4} size={8.5} color={PAL[1]}>
          {`annual target ${fmt(annualTarget)}`}
        </Text>
      </g>
    )}
  />
);
const ColSmoothTop = () => (
  <Cols
    label="Columns with a smooth trend curve over the tops"
    data={thisYear}
    xl={mo}
    color={() => "rgba(42,120,214,0.35)"}
    over={({ y, b }) => <path d={smooth(thisYear.map((d, i) => [b.mid(i), y(d.value)]))} fill="none" stroke={PAL[0]} strokeWidth={2.5} />}
  />
);

/* ---------------------------------------------------------------- stacked & grouped */
const CH = [PAL[0], PAL[1], PAL[2]];
function Grouped3() {
  const max = nice(Math.max(...channelQuarter.flatMap((q) => q.parts)));
  const y = lin(0, max, H - M.b, M.t + 12);
  const b = band(4, M.l, W - M.r, 0.25);
  const w = r1(b.bw / 3 - 1);
  return (
    <Svg label="Grouped columns with three series: orders per channel and quarter">
      <YGrid y={y} max={max} />
      <Legend items={CHANNELS.map((c, i) => ({ label: c, color: CH[i] }))} x={M.l + 4} />
      {channelQuarter.map((q, i) => q.parts.map((v, k) => <rect key={`${i}${k}`} x={r1(b.at(i) + k * (w + 1.5))} y={y(v)} width={w} height={r1(H - M.b - y(v))} rx={2} fill={CH[k]} />))}
      <XLabels labels={QUARTERS} x={b.mid} />
    </Svg>
  );
}
function StackedTotals() {
  const totals = channelQuarter.map((q) => sum(q.parts));
  const max = nice(Math.max(...totals) * 1.08);
  const y = lin(0, max, H - M.b, M.t + 12);
  const b = band(4, M.l, W - M.r, 0.35);
  return (
    <Svg label="Stacked columns with segment values and a total on top">
      <YGrid y={y} max={max} />
      <Legend items={CHANNELS.map((c, i) => ({ label: c, color: CH[i] }))} x={M.l + 4} />
      {channelQuarter.map((q, i) => {
        const o = offsets(q.parts);
        return (
          <g key={q.label}>
            {q.parts.map((v, k) => (
              <g key={k}>
                <rect x={b.at(i)} y={y(o[k + 1])} width={b.bw} height={r1(y(o[k]) - y(o[k + 1]))} fill={CH[k]} stroke="#fff" />
                <Text x={b.mid(i)} y={r1((y(o[k]) + y(o[k + 1])) / 2 + 3)} anchor="middle" size={8.5} color="#fff" mono>
                  {Math.round(v)}
                </Text>
              </g>
            ))}
            <Text x={b.mid(i)} y={y(totals[i]) - 5} anchor="middle" size={9.5} color={INK} weight={700} mono>
              {Math.round(totals[i])}
            </Text>
          </g>
        );
      })}
      <XLabels labels={QUARTERS} x={b.mid} />
    </Svg>
  );
}
function StackedFocus() {
  const totals = channelQuarter.map((q) => sum(q.parts));
  const max = nice(Math.max(...totals));
  const y = lin(0, max, H - M.b, M.t + 12);
  const b = band(4, M.l, W - M.r, 0.35);
  return (
    <Svg label="Stacked columns with only the delivery segment in colour, at the bottom so it shares the baseline">
      <YGrid y={y} max={max} />
      <Text x={M.l + 4} y={10} size={9} color={PAL[2]} weight={700}>
        {"Delivery, moved to the baseline"}
      </Text>
      {channelQuarter.map((q, i) => {
        const parts = [q.parts[2], q.parts[0], q.parts[1]];
        const o = offsets(parts);
        return parts.map((v, k) => (
          <rect
            key={`${i}${k}`}
            x={b.at(i)}
            y={y(o[k + 1])}
            width={b.bw}
            height={r1(y(o[k]) - y(o[k + 1]))}
            fill={k ? (k === 1 ? "rgba(11,11,11,0.2)" : "rgba(11,11,11,0.1)") : PAL[2]}
            stroke="#fff"
          />
        ));
      })}
      <XLabels labels={QUARTERS} x={b.mid} />
    </Svg>
  );
}
function NestedBars() {
  const totals = channelQuarter.map((q) => sum(q.parts));
  const max = nice(Math.max(...totals));
  const y = lin(0, max, H - M.b, M.t + 12);
  const b = band(4, M.l, W - M.r, 0.2);
  const w = r1(b.bw / 3 - 4);
  return (
    <Svg label="Nested bars: a wide total bar with one thin bar per channel inside">
      <YGrid y={y} max={max} />
      <Legend items={[{ label: "Total", color: "rgba(11,11,11,0.12)" }, ...CHANNELS.map((c, i) => ({ label: c, color: CH[i] }))]} x={M.l + 4} />
      {channelQuarter.map((q, i) => (
        <g key={q.label}>
          <rect x={b.at(i)} y={y(totals[i])} width={b.bw} height={r1(H - M.b - y(totals[i]))} rx={3} fill="rgba(11,11,11,0.1)" />
          {q.parts.map((v, k) => (
            <rect key={k} x={r1(b.at(i) + 4 + k * (w + 4))} y={y(v)} width={w} height={r1(H - M.b - y(v))} rx={2} fill={CH[k]} />
          ))}
        </g>
      ))}
      <XLabels labels={QUARTERS} x={b.mid} />
    </Svg>
  );
}
function ProductMultiples() {
  const cities = cityProduct.slice(0, 6);
  const max = nice(Math.max(...cities.flatMap((c) => c.parts)));
  const left = 58;
  const pw = (W - left - 6) / 5;
  const b = band(cities.length, 34, H - 10, 0.3);
  return (
    <Svg label="Small multiples: one bar panel per product, cities on the same scale">
      {cities.map((c, i) => (
        <Text key={c.label} x={left - 6} y={b.mid(i) + 3} anchor="end" size={8.5} color={INK}>
          {c.label}
        </Text>
      ))}
      {PRODUCTS.map((p, k) => {
        const ox = left + k * pw;
        const x = lin(0, max, ox + 2, ox + pw - 6);
        return (
          <g key={p}>
            <rect x={ox} y={20} width={r1(pw - 4)} height={H - 26} rx={5} fill="rgba(11,11,11,0.025)" />
            <Text x={ox + 3} y={30} size={8} color={PAL[k]} weight={700}>
              {p}
            </Text>
            {cities.map((c, i) => (
              <rect key={c.label} x={ox + 2} y={b.at(i)} width={r1(x(c.parts[k]) - ox - 2)} height={b.bw} rx={1.5} fill={PAL[k]} />
            ))}
          </g>
        );
      })}
    </Svg>
  );
}

export const COLUMN_VARIANTS = [
  ...defs("Comparison", "Columns", [
    ["col-sorted", "Sorted columns", "Ranking periods or categories from biggest to smallest.", "Time order matters: keep months in calendar order.", ColSorted],
    ["col-labels", "Columns with value labels", "When readers need the exact numbers, not just the shape.", "Dense charts: labels collide; drop the axis instead of crowding.", ColLabels],
    ["col-pill", "Pill columns on tracks", "Friendly dashboards and progress-style comparisons.", "Precise reading: rounded tops blur where the value ends.", ColPill],
    ["col-highlight", "Highlighted column", "Pointing at the one bar the story is about.", "When every bar matters equally.", ColHighlight],
    ["col-gradient", "Gradient columns", "A decorative touch for a hero chart.", "When colour already encodes data: gradients confuse it.", ColGradient],
    ["col-average", "Columns with an average line", "Showing which periods are above or below normal.", "Skewed data: a median may be fairer.", ColAverage],
    ["col-target", "Columns with target ticks", "Actual vs a target that changes per period.", "Too many periods: the ticks become noise.", ColTarget],
    ["col-diverging", "Positive / negative columns", "Growth rates, profit and loss: values around zero.", "When all values are positive.", ColDiverging],
    ["col-error", "Columns with error bars", "Averages with their spread or uncertainty.", "Audiences who will read the bar top as the only truth.", ColError],
    ["col-needle", "Needle columns", "Many periods (days) where the pattern matters more than each value.", "Comparing two specific days.", ColNeedle],
    ["col-inside", "Labels inside columns", "Long category names in a vertical layout.", "Short bars: the text won't fit.", ColInside],
    ["col-lastyear", "Columns with last year's line", "This period vs the same period last year, on one axis.", "Two different units: never mix them on one axis.", ColLastYear],
    ["col-pareto", "Pareto chart", "Finding the few items that make most of the total (80/20).", "Unordered or time data.", ColPareto],
    ["col-touching", "Touching columns", "Consecutive ranges such as hours or bins.", "Separate categories: gaps tell readers they're distinct.", ColTouching],
    ["col-overlap", "Overlapping columns", "Actual in front of target or budget, one per period.", "More than two series.", ColOverlap],
    ["col-range", "Floating range columns", "Low–high spans per period, like quiet vs busy days.", "When the start isn't meaningful to readers.", ColRange],
    ["col-pictogram", "Pictogram columns", "General audiences: countable icons feel concrete.", "Precise values or many categories.", ColPictogram],
    ["col-multiples", "Small-multiple columns", "Many series compared at once, each in its own panel.", "When panels need different scales: say so clearly.", ColMultiples],
    ["col-annotated", "Annotated columns", "Explaining the peaks and dips in plain words.", "Annotations that only repeat the numbers.", ColAnnotated],
    ["col-skyline", "Skyline outline", "A light, continuous look for evenly spaced periods.", "Categories without an order.", ColSkyline],
    ["col-variance", "Variance columns", "How much each item changed, sorted by the change.", "When the levels themselves matter more than the change.", ColVariance],
    ["col-cumulative", "Running-total columns", "Progress through the year towards an annual goal.", "Seeing month-to-month swings: use plain columns.", ColCumulative],
    ["col-trendcurve", "Columns with a trend curve", "Showing the overall direction on top of exact periods.", "Too few bars: the curve overstates the pattern.", ColSmoothTop],
  ]),
  ...defs("Comparison", "Stacked & grouped", [
    ["sg-grouped3", "Grouped columns (3 series)", "Comparing three series within each category.", "Four or more series: use small multiples.", Grouped3],
    ["sg-totals", "Stacked with totals", "Totals and parts, with the numbers printed.", "Many tiny segments.", StackedTotals],
    ["sg-focus", "Stacked, one segment in focus", "One part's trend, moved to the baseline so it's readable.", "When every part matters equally.", StackedFocus],
    ["sg-nested", "Nested bars", "Parts shown against their total in the same column.", "More than three parts.", NestedBars],
    ["sg-multiples", "Small-multiple bars", "One panel per series instead of a busy grouped chart.", "Readers comparing across panels precisely.", ProductMultiples],
  ]),
];
