import type { ReactNode } from "react";
import { HOURS, MONTHS, WEEKDAYS, beans, daily, events, hourlyByDay, hourlyWeekday, kpis, monthly, totalByMonth } from "@/data/chart-demo";
import { H, INK, Legend, M, MUTED, PAL, Svg, Text, W, XLabels, YGrid, arc, band, fmt, lin, nice, offsets, path, r1 } from "../kit";
import { defs } from "../types";
import { BAD, GOOD, SOFT, band2, linreg, mean, polar, sd, seq, smooth, stepPath, sum, useSvgId } from "./base";

/* ---------------------------------------------------------------- data */
const T = totalByMonth;
const thisYear = T.slice(12);
const lastYear = T.slice(0, 12);
const m24 = Array.from({ length: 24 }, (_, i) => MONTHS[i % 12]);
const mo = MONTHS.map((m) => m.slice(0, 1));

type S = { x: (i: number) => number; y: (v: number) => number };
/** A time-series frame: grid, month labels and whatever is drawn inside. */
function TS({
  label,
  n,
  max,
  min = 0,
  right = 0,
  top = 0,
  labels,
  every = 1,
  yfmt = fmt,
  children,
}: {
  label: string;
  n: number;
  max: number;
  min?: number;
  right?: number;
  top?: number;
  labels: string[];
  every?: number;
  yfmt?: (v: number) => string;
  children: (s: S) => ReactNode;
}) {
  const y = lin(min, max, H - M.b, M.t + top);
  const x = lin(0, n - 1, M.l + 4, W - M.r - right);
  return (
    <Svg label={label}>
      <YGrid y={y} max={max} min={min} x1={W - M.r - right} format={yfmt} />
      {children({ x, y })}
      <XLabels labels={labels} x={x} every={every} />
    </Svg>
  );
}
const pts = (v: number[], s: S) => v.map((val, i) => [s.x(i), s.y(val)] as [number, number]);
const maxT = nice(Math.max(...T));

/* ---------------------------------------------------------------- lines */
const LnMarkers = () => (
  <TS label="Line with a marker on every month" n={12} max={nice(Math.max(...thisYear))} labels={mo}>
    {(s) => (
      <g>
        <path d={path(pts(thisYear, s))} fill="none" stroke={PAL[0]} strokeWidth={2} />
        {thisYear.map((v, i) => (
          <circle key={i} cx={s.x(i)} cy={s.y(v)} r={3.5} fill="#fff" stroke={PAL[0]} strokeWidth={2} />
        ))}
      </g>
    )}
  </TS>
);
const LnSmooth = () => (
  <TS label="Smooth curved line through two years of months" n={24} max={maxT} labels={m24} every={3}>
    {(s) => <path d={smooth(pts(T, s))} fill="none" stroke={PAL[3]} strokeWidth={2.5} />}
  </TS>
);
const cityMax = nice(Math.max(...monthly.flatMap((c) => c.values)));
const LnHighlight = () => (
  <TS label="Eight city lines in grey with one highlighted" n={24} max={cityMax} labels={m24} every={4} right={52}>
    {(s) => (
      <g>
        {monthly.map((c, k) => (
          <path key={c.city} d={path(pts(c.values, s))} fill="none" stroke={k === 1 ? PAL[1] : "rgba(11,11,11,0.16)"} strokeWidth={k === 1 ? 2.8 : 1.4} />
        ))}
        <Text x={s.x(23) + 5} y={s.y(monthly[1].values[23]) + 3} size={9} color={PAL[1]} weight={700}>
          {monthly[1].city}
        </Text>
      </g>
    )}
  </TS>
);
const iMax = T.indexOf(Math.max(...T));
const iMin = T.indexOf(Math.min(...T));
const LnMinMax = () => (
  <TS label="Line with the highest and lowest point called out" n={24} max={maxT} labels={m24} every={3} top={8}>
    {(s) => (
      <g>
        <path d={path(pts(T, s))} fill="none" stroke={INK} strokeWidth={1.8} />
        {[
          [iMax, "high", GOOD],
          [iMin, "low", BAD],
        ].map(([i, t, c]) => (
          <g key={t as string}>
            <circle cx={s.x(i as number)} cy={s.y(T[i as number])} r={4.5} fill={c as string} />
            <Text
              x={s.x(i as number) + (s.x(i as number) > W - 60 ? -8 : 0)}
              y={s.y(T[i as number]) + (t === "high" ? -9 : 15)}
              anchor={s.x(i as number) > W - 60 ? "end" : "middle"}
              size={8.5}
              color={c as string}
              weight={700}
            >
              {`${t} ${fmt(T[i as number])}`}
            </Text>
          </g>
        ))}
      </g>
    )}
  </TS>
);
const avg = mean(thisYear);
const goal = 1900;
const LnRef = () => (
  <TS label="Line with an average line and a target line" n={12} max={nice(Math.max(...thisYear, goal))} labels={mo}>
    {(s) => (
      <g>
        <line x1={M.l} x2={W - M.r} y1={s.y(avg)} y2={s.y(avg)} stroke={MUTED} strokeDasharray="3 3" />
        <line x1={M.l} x2={W - M.r} y1={s.y(goal)} y2={s.y(goal)} stroke={GOOD} strokeDasharray="6 3" strokeWidth={1.5} />
        <Text x={M.l + 6} y={s.y(avg) - 4} size={8.5}>
          {"average"}
        </Text>
        <Text x={M.l + 6} y={s.y(goal) - 4} size={8.5} color={GOOD}>
          {"target"}
        </Text>
        <path d={path(pts(thisYear, s))} fill="none" stroke={PAL[0]} strokeWidth={2.2} />
      </g>
    )}
  </TS>
);
const LnBand = () => (
  <TS label="Line running through a shaded normal range" n={24} max={maxT} labels={m24} every={3}>
    {(s) => (
      <g>
        <rect x={M.l} y={s.y(1700)} width={W - M.r - M.l} height={r1(s.y(1200) - s.y(1700))} fill="rgba(27,175,122,0.12)" />
        <Text x={W - M.r - 4} y={s.y(1700) + 11} anchor="end" size={8.5} color="#138a60">
          {"normal range"}
        </Text>
        <path d={path(pts(T, s))} fill="none" stroke={INK} strokeWidth={1.8} />
        {T.map((v, i) => (v > 1700 || v < 1200 ? <circle key={i} cx={s.x(i)} cy={s.y(v)} r={3} fill={PAL[1]} /> : null))}
      </g>
    )}
  </TS>
);
/* a simple linear trend + seasonal-free forecast, with a band that widens with the horizon */
const idx = T.map((_, i) => i);
const fit = linreg(idx, T);
const resid = sd(T.map((v, i) => v - (fit.a + fit.b * i)));
const ahead = 6;
const fc = Array.from({ length: ahead + 1 }, (_, h) => ({ i: 23 + h, v: fit.a + fit.b * (23 + h), e: 1.96 * resid * Math.sqrt(1 + h / 3) }));
const LnForecast = () => (
  <TS
    label="Actual line, a dashed trend forecast for six months and a widening uncertainty band"
    n={30}
    max={nice(Math.max(...T, ...fc.map((f) => f.v + f.e)))}
    labels={[...m24, ...MONTHS.slice(0, 6)]}
    every={4}
  >
    {(s) => (
      <g>
        <path
          d={band2(
            fc.map((f) => [s.x(f.i), s.y(f.v + f.e)]),
            fc.map((f) => [s.x(f.i), s.y(f.v - f.e)]),
          )}
          fill="rgba(98,80,214,0.15)"
        />
        <path d={path(pts(T, s))} fill="none" stroke={INK} strokeWidth={1.8} />
        <path d={path(fc.map((f) => [s.x(f.i), s.y(f.v)]))} fill="none" stroke={PAL[3]} strokeWidth={2} strokeDasharray="5 3" />
        <line x1={s.x(23)} x2={s.x(23)} y1={M.t} y2={H - M.b} stroke={SOFT} />
        <Text x={s.x(23) + 4} y={M.t + 8} size={8.5} color={PAL[3]}>
          {"forecast (example)"}
        </Text>
      </g>
    )}
  </TS>
);
const LnYoY = () => (
  <TS label="This year and last year as two lines on the same months" n={12} max={nice(Math.max(...T))} labels={mo} right={46}>
    {(s) => (
      <g>
        <path d={path(pts(lastYear, s))} fill="none" stroke="rgba(11,11,11,0.3)" strokeWidth={2} />
        <path d={path(pts(thisYear, s))} fill="none" stroke={PAL[0]} strokeWidth={2.5} />
        <Text x={s.x(11) + 5} y={s.y(thisYear[11]) + 3} size={9} color={PAL[0]} weight={700}>
          {"this year"}
        </Text>
        <Text x={s.x(11) + 5} y={s.y(lastYear[11]) + 3} size={9}>
          {"last year"}
        </Text>
      </g>
    )}
  </TS>
);
const four = monthly.slice(0, 4).map((c) => ({ city: c.city, idx: c.values.map((v) => r1((v / c.values[0]) * 100)) }));
export const LnIndex = () => (
  <TS label="Indexed lines: every city rebased to 100 in the first month" n={24} min={80} max={Math.ceil(Math.max(...four.flatMap((c) => c.idx)) / 20) * 20} labels={m24} every={4} right={52}>
    {(s) => (
      <g>
        <line x1={M.l} x2={W - M.r - 52} y1={s.y(100)} y2={s.y(100)} stroke={INK} strokeDasharray="2 2" />
        {four.map((c, k) => (
          <g key={c.city}>
            <path d={path(pts(c.idx, s))} fill="none" stroke={PAL[k]} strokeWidth={1.8} />
            <Text x={s.x(23) + 5} y={s.y(c.idx[23]) + 3 + (k === 2 ? 6 : k === 3 ? -6 : 0)} size={8.5} color={PAL[k]}>
              {c.city}
            </Text>
          </g>
        ))}
      </g>
    )}
  </TS>
);
const cumThis = offsets(thisYear).slice(1);
const cumLast = offsets(lastYear).slice(1);
const LnCumulative = () => (
  <TS label="Cumulative lines: running revenue this year against last year" n={12} max={nice(cumThis[11])} labels={mo} right={40}>
    {(s) => (
      <g>
        <path d={path(pts(cumLast, s))} fill="none" stroke="rgba(11,11,11,0.3)" strokeWidth={2} />
        <path d={path(pts(cumThis, s))} fill="none" stroke={PAL[2]} strokeWidth={2.5} />
        <Text x={s.x(11) + 4} y={s.y(cumThis[11]) + 3} size={8.5} color={PAL[2]} weight={700}>
          {fmt(cumThis[11])}
        </Text>
        <Text x={s.x(11) + 4} y={s.y(cumLast[11]) + 3} size={8.5}>
          {fmt(cumLast[11])}
        </Text>
      </g>
    )}
  </TS>
);
const days = daily.slice(0, 120);
const ma7 = days.map((_, i) => (i < 6 ? null : mean(days.slice(i - 6, i + 1))));
const LnMovingAvg = () => (
  <TS label="Noisy daily orders in grey with a smooth seven-day average on top" n={120} max={nice(Math.max(...days))} labels={days.map((_, i) => (i % 30 === 0 ? `day ${i + 1}` : ""))}>
    {(s) => (
      <g>
        <path d={path(pts(days, s))} fill="none" stroke="rgba(11,11,11,0.22)" strokeWidth={1} />
        <path d={path(ma7.map((v, i) => [s.x(i), s.y(v ?? days[i])] as [number, number]).slice(6))} fill="none" stroke={PAL[1]} strokeWidth={2.4} />
        <Text x={W - M.r} y={M.t + 6} anchor="end" size={8.5} color={PAL[1]}>
          {"7-day average"}
        </Text>
      </g>
    )}
  </TS>
);
const sat = kpis[3].series;
export function LnDual() {
  const y1 = lin(0, nice(Math.max(...thisYear)), H - M.b, M.t);
  const y2 = lin(4.2, 4.7, H - M.b, M.t);
  const x = lin(0, 11, M.l + 4, W - 44);
  return (
    <Svg label="Dual-axis line chart: revenue on the left axis, satisfaction on the right. Use with care: two scales can suggest links that aren't there">
      <YGrid y={y1} max={nice(Math.max(...thisYear))} x1={W - 44} />
      {[4.2, 4.45, 4.7].map((v) => (
        <Text key={v} x={W - 40} y={y2(v) + 3} size={8.5} mono color={PAL[1]}>
          {v.toFixed(2)}
        </Text>
      ))}
      <path d={path(thisYear.map((v, i) => [x(i), y1(v)]))} fill="none" stroke={PAL[0]} strokeWidth={2.2} />
      <path d={path(sat.map((v, i) => [x(i), y2(v)]))} fill="none" stroke={PAL[1]} strokeWidth={2.2} strokeDasharray="5 3" />
      <Legend
        items={[
          { label: "Revenue (left)", color: PAL[0] },
          { label: "Satisfaction (right)", color: PAL[1] },
        ]}
        x={M.l + 4}
      />
      <XLabels labels={mo} x={x} />
    </Svg>
  );
}
/* ranks of six cities per quarter, computed from the monthly numbers */
const six = monthly.slice(0, 6);
const quarterly = six.map((c) => Array.from({ length: 8 }, (_, q) => sum(c.values.slice(q * 3, q * 3 + 3))));
// rank by growth on the previous quarter, so positions actually change
const qGrowth = quarterly.map((q) => q.slice(1).map((v, i) => v / q[i] - 1));
const ranks = six.map((_, k) => Array.from({ length: 7 }, (_, q) => 1 + qGrowth.filter((other) => other[q] > qGrowth[k][q]).length));
function LnBump() {
  const x = lin(0, 6, 70, W - 70);
  const y = lin(1, 6, 20, H - 26);
  return (
    <Svg label="Bump chart: each city's rank by growth on the previous quarter, so overtaking is easy to see">
      {six.map((c, k) => (
        <g key={c.city}>
          <path d={path(ranks[k].map((r, q) => [x(q), y(r)]))} fill="none" stroke={PAL[k]} strokeWidth={3} strokeLinejoin="round" opacity={0.85} />
          {ranks[k].map((r, q) => (
            <circle key={q} cx={x(q)} cy={y(r)} r={5} fill={PAL[k]} stroke="#fff" strokeWidth={1.5} />
          ))}
          <Text x={64} y={y(ranks[k][0]) + 3} anchor="end" size={8.5} color={PAL[k]}>
            {c.city}
          </Text>
          <Text x={W - 64} y={y(ranks[k][6]) + 3} size={8.5} color={PAL[k]}>
            {`#${ranks[k][6]} ${c.city.slice(0, 4)}`}
          </Text>
        </g>
      ))}
      {Array.from({ length: 7 }, (_, q) => (
        <Text key={q} x={x(q)} y={H - 8} anchor="middle" size={8.5}>
          {`Q${((q + 1) % 4) + 1}`}
        </Text>
      ))}
    </Svg>
  );
}
function LnMultiples() {
  const cw = (W - 16) / 4;
  const ch = (H - 12) / 2;
  return (
    <Svg label="Small-multiple lines: one panel per city, each with its own scale">
      {monthly.map((c, k) => {
        const ox = 8 + (k % 4) * cw;
        const oy = 6 + Math.floor(k / 4) * ch;
        const y = lin(Math.min(...c.values) * 0.9, Math.max(...c.values) * 1.05, oy + ch - 10, oy + 20);
        const x = lin(0, 23, ox + 6, ox + cw - 10);
        const last = c.values[23] / c.values[0] - 1;
        return (
          <g key={c.city}>
            <rect x={ox} y={oy} width={r1(cw - 4)} height={r1(ch - 4)} rx={6} fill="rgba(11,11,11,0.025)" />
            <Text x={ox + 6} y={oy + 12} size={8.5} color={INK} weight={600}>
              {c.city}
            </Text>
            <Text x={ox + cw - 10} y={oy + 12} anchor="end" size={7.5} mono color={GOOD}>
              {`+${Math.round(last * 100)}%`}
            </Text>
            <path d={path(c.values.map((v, i) => [x(i), y(v)]))} fill="none" stroke={PAL[k % PAL.length]} strokeWidth={1.6} />
          </g>
        );
      })}
    </Svg>
  );
}
function LnHorizon() {
  const rows = monthly.slice(0, 5);
  const rh = (H - 16) / rows.length;
  const x = lin(0, 23, 70, W - 10);
  return (
    <Svg label="Horizon chart: each city's deviation from its own average, folded into darker bands to save height">
      {rows.map((c, k) => {
        const m = mean(c.values);
        const dev = c.values.map((v) => v / m - 1);
        const top = 8 + k * rh;
        const scale = (v: number) => r1(top + rh - 2 - Math.min(1, Math.abs(v) / 0.15) * (rh - 4));
        const scale2 = (v: number) => r1(top + rh - 2 - Math.min(1, Math.max(0, Math.abs(v) - 0.15) / 0.15) * (rh - 4));
        const pos = dev.map((v) => Math.max(0, v));
        const neg = dev.map((v) => Math.min(0, v));
        const base = top + rh - 2;
        const area = (vals: number[], f: (v: number) => number) => `M${x(0)},${base} ${vals.map((v, i) => `L${x(i)},${f(v)}`).join(" ")} L${x(23)},${base} Z`;
        return (
          <g key={c.city}>
            <Text x={64} y={top + rh / 2 + 3} anchor="end" size={8.5} color={INK}>
              {c.city}
            </Text>
            <path d={area(pos, scale)} fill="rgba(42,120,214,0.35)" />
            <path d={area(pos, scale2)} fill="rgba(20,69,127,0.85)" />
            <path d={area(neg, scale)} fill="rgba(227,73,72,0.35)" />
            <path d={area(neg, scale2)} fill="rgba(200,65,63,0.85)" />
          </g>
        );
      })}
    </Svg>
  );
}
const LnEvents = () => (
  <TS label="Line with vertical markers for events that might explain the changes" n={24} max={maxT} labels={m24} every={3} top={16}>
    {(s) => (
      <g>
        {events.map((e) => (
          <g key={e.label}>
            <line x1={s.x(e.m)} x2={s.x(e.m)} y1={M.t + 16} y2={H - M.b} stroke={PAL[3]} strokeDasharray="3 3" />
            <Text x={s.x(e.m)} y={M.t + (events.indexOf(e) % 2 ? 2 : 11)} anchor="middle" size={8} color={PAL[3]}>
              {e.label}
            </Text>
          </g>
        ))}
        <path d={path(pts(T, s))} fill="none" stroke={INK} strokeWidth={1.8} />
      </g>
    )}
  </TS>
);
const LnDifference = () => (
  <TS label="Difference chart: the gap between this year and last year is filled" n={12} max={nice(Math.max(...T))} min={1000} labels={mo}>
    {(s) => (
      <g>
        <path d={band2(pts(thisYear, s), pts(lastYear, s))} fill="rgba(27,175,122,0.25)" />
        <path d={path(pts(lastYear, s))} fill="none" stroke="rgba(11,11,11,0.35)" strokeWidth={1.6} />
        <path d={path(pts(thisYear, s))} fill="none" stroke={GOOD} strokeWidth={2.2} />
        <Text x={s.x(6)} y={s.y((thisYear[6] + lastYear[6]) / 2) + 3} anchor="middle" size={8.5} color="#138a60" weight={700}>
          {"growth"}
        </Text>
      </g>
    )}
  </TS>
);
const monthOf = (d: number) => Math.min(11, Math.floor(d / 30.34));
const rng = MONTHS.map((_, k) => {
  const v = daily.filter((_, d) => monthOf(d) === k);
  return { lo: Math.min(...v), hi: Math.max(...v), avg: mean(v) };
});
const LnRange = () => (
  <TS label="Range area: quietest to busiest day of each month, with the monthly average as a line" n={12} max={nice(Math.max(...rng.map((r) => r.hi)))} labels={mo}>
    {(s) => (
      <g>
        <path
          d={band2(
            rng.map((r, i) => [s.x(i), s.y(r.hi)]),
            rng.map((r, i) => [s.x(i), s.y(r.lo)]),
          )}
          fill="rgba(42,120,214,0.18)"
        />
        <path d={path(rng.map((r, i) => [s.x(i), s.y(r.avg)]))} fill="none" stroke={PAL[0]} strokeWidth={2.2} />
      </g>
    )}
  </TS>
);
const growth = T.slice(1).map((v, i) => r1((v / T[i] - 1) * 100));
const gmax = nice(Math.max(...growth.map(Math.abs)));
function LnGrowth() {
  const id = useSvgId("g");
  return (
    <TS label="Growth-rate line around zero: positive months in green, negative in red" n={23} max={gmax} min={-gmax} labels={m24.slice(1)} every={3} yfmt={(v) => `${v}%`}>
      {(s) => {
        const p = pts(growth, s);
        return (
          <g>
            <defs>
              <clipPath id={`${id}u`}>
                <rect x={0} y={0} width={W} height={s.y(0)} />
              </clipPath>
              <clipPath id={`${id}d`}>
                <rect x={0} y={s.y(0)} width={W} height={H} />
              </clipPath>
            </defs>
            <path d={`${path(p)} L${p[p.length - 1][0]},${s.y(0)} L${p[0][0]},${s.y(0)} Z`} fill="rgba(27,175,122,0.3)" clipPath={`url(#${id}u)`} />
            <path d={`${path(p)} L${p[p.length - 1][0]},${s.y(0)} L${p[0][0]},${s.y(0)} Z`} fill="rgba(227,73,72,0.3)" clipPath={`url(#${id}d)`} />
            <line x1={M.l} x2={W - M.r} y1={s.y(0)} y2={s.y(0)} stroke={INK} />
            <path d={path(p)} fill="none" stroke={INK} strokeWidth={1.4} />
          </g>
        );
      }}
    </TS>
  );
}
function LnRadial() {
  const max = Math.max(...T);
  const rr = (v: number) => r1(20 + (v / max) * 82);
  const ring = (v: number[]) => `${v.map((val, i) => `${i ? "L" : "M"}${polar(180, 112, rr(val), (i / 12) * Math.PI * 2).join(",")}`).join(" ")} Z`;
  return (
    <Svg label="Radial line: two years of months drawn around a circle">
      {[0.5, 0.75, 1].map((f) => (
        <circle key={f} cx={180} cy={112} r={rr(max * f)} fill="none" stroke="rgba(11,11,11,0.08)" />
      ))}
      <path d={ring(lastYear)} fill="rgba(11,11,11,0.05)" stroke="rgba(11,11,11,0.35)" strokeWidth={1.5} />
      <path d={ring(thisYear)} fill="rgba(42,120,214,0.12)" stroke={PAL[0]} strokeWidth={2} />
      {MONTHS.map((m, i) => {
        const [x, y] = polar(180, 112, 110, (i / 12) * Math.PI * 2);
        return (
          <Text key={m} x={x} y={y + 3} anchor="middle" size={8}>
            {m.slice(0, 1)}
          </Text>
        );
      })}
      <Legend
        items={[
          { label: "This year", color: PAL[0] },
          { label: "Last year", color: "rgba(11,11,11,0.35)" },
        ]}
        x={6}
      />
    </Svg>
  );
}
const LnLabels = () => (
  <TS label="Line with the value written at every point instead of an axis" n={12} max={nice(Math.max(...thisYear)) * 1.08} min={1000} labels={mo} top={6}>
    {(s) => (
      <g>
        <path d={path(pts(thisYear, s))} fill="none" stroke={PAL[6]} strokeWidth={2} />
        {thisYear.map((v, i) => (
          <g key={i}>
            <circle cx={s.x(i)} cy={s.y(v)} r={2.5} fill={PAL[6]} />
            <Text x={s.x(i)} y={s.y(v) - 7} anchor="middle" size={7.5} mono color={INK}>
              {fmt(v)}
            </Text>
          </g>
        ))}
      </g>
    )}
  </TS>
);
const spread = Array.from({ length: 24 }, (_, i) => {
  const v = monthly.map((c) => c.values[i]);
  return { lo: Math.min(...v), hi: Math.max(...v), avg: mean(v) };
});
const LnAvgSpread = () => (
  <TS label="Average city with the band from the smallest to the biggest city" n={24} max={cityMax} labels={m24} every={3}>
    {(s) => (
      <g>
        <path
          d={band2(
            spread.map((r, i) => [s.x(i), s.y(r.hi)]),
            spread.map((r, i) => [s.x(i), s.y(r.lo)]),
          )}
          fill="rgba(11,11,11,0.07)"
        />
        <path d={path(spread.map((r, i) => [s.x(i), s.y(r.avg)]))} fill="none" stroke={INK} strokeWidth={2.2} />
        <Text x={W - M.r} y={s.y(spread[23].hi) - 4} anchor="end" size={8.5}>
          {"biggest city"}
        </Text>
        <Text x={W - M.r} y={s.y(spread[23].avg) - 5} anchor="end" size={8.5} color={INK}>
          {"average"}
        </Text>
      </g>
    )}
  </TS>
);

/* ---------------------------------------------------------------- areas */
function ArGradient() {
  const id = useSvgId("ag");
  return (
    <TS label="Area chart with a gradient fading to the axis" n={24} max={maxT} labels={m24} every={3}>
      {(s) => {
        const p = pts(T, s);
        return (
          <g>
            <defs>
              <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={PAL[3]} stopOpacity={0.45} />
                <stop offset="1" stopColor={PAL[3]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={`${smooth(p)} L${p[23][0]},${s.y(0)} L${p[0][0]},${s.y(0)} Z`} fill={`url(#${id})`} />
            <path d={smooth(p)} fill="none" stroke={PAL[3]} strokeWidth={2.2} />
          </g>
        );
      }}
    </TS>
  );
}
const top4 = monthly.slice(0, 4);
const shares = Array.from({ length: 24 }, (_, i) => {
  const tot = sum(monthly.map((c) => c.values[i]));
  const parts = top4.map((c) => c.values[i] / tot);
  return [...parts, 1 - sum(parts)];
});
const Ar100 = () => (
  <TS label="100% stacked area: each city's share of the chain over time" n={24} max={1} labels={m24} every={4} yfmt={(v) => `${Math.round(v * 100)}%`} right={58}>
    {(s) => (
      <g>
        {[0, 1, 2, 3, 4].map((k) => {
          const lo = shares.map((sh) => sum(sh.slice(0, k)));
          const hi = shares.map((sh) => sum(sh.slice(0, k + 1)));
          return (
            <g key={k}>
              <path
                d={band2(
                  hi.map((v, i) => [s.x(i), s.y(v)]),
                  lo.map((v, i) => [s.x(i), s.y(v)]),
                )}
                fill={k < 4 ? PAL[k] : "rgba(11,11,11,0.15)"}
                opacity={0.85}
              />
              <Text x={s.x(23) + 4} y={s.y((lo[23] + hi[23]) / 2) + 3} size={8} color={k < 4 ? PAL[k] : MUTED}>
                {k < 4 ? top4[k].city : "Others"}
              </Text>
            </g>
          );
        })}
      </g>
    )}
  </TS>
);
function ArStream() {
  const series = monthly.slice(0, 6);
  const tot = Array.from({ length: 24 }, (_, i) => sum(series.map((c) => c.values[i])));
  const max = Math.max(...tot);
  const x = lin(0, 23, 10, W - 10);
  const y = lin(-max / 2 - 60, max / 2 + 60, H - 22, 8);
  return (
    <Svg label="Streamgraph: stacked city layers flowing around a centre line">
      {series.map((c, k) => {
        const lo = tot.map((t, i) => -t / 2 + sum(series.slice(0, k).map((s) => s.values[i])));
        const hi = lo.map((v, i) => v + c.values[i]);
        return (
          <path
            key={c.city}
            d={`${smooth(hi.map((v, i) => [x(i), y(v)]))} L${[...lo]
              .map((v, i) => [x(i), y(v)] as [number, number])
              .reverse()
              .map(([a, b]) => `${a},${b}`)
              .join(" L")} Z`}
            fill={PAL[k]}
            opacity={0.85}
          />
        );
      })}
      <XLabels labels={m24} x={x} every={4} y={H - 6} />
    </Svg>
  );
}
const ArOverlap = () => (
  <TS label="Overlapping transparent areas for three cities" n={24} max={nice(Math.max(...monthly.slice(1, 4).flatMap((c) => c.values)))} labels={m24} every={4} right={50}>
    {(s) => (
      <g>
        {monthly.slice(1, 4).map((c, k) => {
          const p = pts(c.values, s);
          return (
            <g key={c.city}>
              <path d={`${path(p)} L${p[23][0]},${s.y(0)} L${p[0][0]},${s.y(0)} Z`} fill={PAL[k + 1]} opacity={0.22} />
              <path d={path(p)} fill="none" stroke={PAL[k + 1]} strokeWidth={1.6} />
              <Text x={s.x(23) + 4} y={s.y(c.values[23]) + 3 + (k - 1) * 5} size={8.5} color={PAL[k + 1]}>
                {c.city}
              </Text>
            </g>
          );
        })}
      </g>
    )}
  </TS>
);
const ArStep = () => (
  <TS label="Step area: the value holds until the next month" n={12} max={nice(Math.max(...thisYear))} labels={mo}>
    {(s) => {
      const p = pts(thisYear, s);
      return (
        <g>
          <path d={`${stepPath(p)} H${s.x(11)} V${s.y(0)} H${p[0][0]} Z`} fill="rgba(194,154,0,0.25)" />
          <path d={stepPath(p)} fill="none" stroke={PAL[5]} strokeWidth={2} />
        </g>
      );
    }}
  </TS>
);
function ArMultiples() {
  const cw = (W - 16) / 4;
  const ch = (H - 12) / 2;
  return (
    <Svg label="Small-multiple areas on a shared scale, so the big cities look big">
      {monthly.map((c, k) => {
        const ox = 8 + (k % 4) * cw;
        const oy = 6 + Math.floor(k / 4) * ch;
        const y = lin(0, cityMax, oy + ch - 10, oy + 18);
        const x = lin(0, 23, ox + 6, ox + cw - 10);
        const p = c.values.map((v, i) => [x(i), y(v)] as [number, number]);
        return (
          <g key={c.city}>
            <Text x={ox + 6} y={oy + 12} size={8.5} color={INK} weight={600}>
              {c.city}
            </Text>
            <path d={`${path(p)} L${x(23)},${y(0)} L${x(0)},${y(0)} Z`} fill={PAL[k % PAL.length]} opacity={0.75} />
            <line x1={x(0)} x2={x(23)} y1={y(0)} y2={y(0)} stroke={SOFT} />
          </g>
        );
      })}
    </Svg>
  );
}

/* ---------------------------------------------------------------- financial */
function Candles({ ohlc, volume = false, bands = false }: { ohlc: boolean; volume?: boolean; bands?: boolean }) {
  const lo = Math.floor(Math.min(...beans.map((b) => b.low)) - 1);
  const hi = Math.ceil(Math.max(...beans.map((b) => b.high)) + 1);
  const y = lin(lo, hi, volume ? H - 70 : H - M.b, M.t);
  const b = band(beans.length, M.l, W - M.r, 0.3);
  const vy = lin(0, 100, H - M.b, H - 62);
  const ma = beans.map((_, i) => (i < 4 ? null : mean(beans.slice(i - 4, i + 1).map((d) => d.close))));
  const sdv = beans.map((_, i) => (i < 4 ? null : sd(beans.slice(i - 4, i + 1).map((d) => d.close))));
  const idxs = beans.map((_, i) => i).filter((i) => i >= 4);
  return (
    <Svg
      label={
        bands
          ? "Price with a five-day moving average and bands two standard deviations wide"
          : ohlc
            ? "OHLC bars: open, high, low and close per day"
            : volume
              ? "Candlesticks with volume bars underneath"
              : "Candlestick chart of daily prices"
      }
    >
      <YGrid y={y} max={hi} min={lo} ticks={4} format={(v) => String(Math.round(v))} />
      {bands && (
        <g>
          <path
            d={band2(
              idxs.map((i) => [b.mid(i), y(ma[i]! + 2 * sdv[i]!)]),
              idxs.map((i) => [b.mid(i), y(ma[i]! - 2 * sdv[i]!)]),
            )}
            fill="rgba(98,80,214,0.12)"
          />
          <path d={path(idxs.map((i) => [b.mid(i), y(ma[i]!)]))} fill="none" stroke={PAL[3]} strokeWidth={1.8} />
          <path d={path(beans.map((d, i) => [b.mid(i), y(d.close)]))} fill="none" stroke={INK} strokeWidth={1.2} />
        </g>
      )}
      {!bands &&
        beans.map((d, i) => {
          const up = d.close >= d.open;
          const c = up ? GOOD : BAD;
          return (
            <g key={d.day}>
              <line x1={b.mid(i)} x2={b.mid(i)} y1={y(d.high)} y2={y(d.low)} stroke={c} strokeWidth={1.2} />
              {ohlc ? (
                <g stroke={c} strokeWidth={1.6}>
                  <line x1={b.at(i)} x2={b.mid(i)} y1={y(d.open)} y2={y(d.open)} />
                  <line x1={b.mid(i)} x2={b.at(i) + b.bw} y1={y(d.close)} y2={y(d.close)} />
                </g>
              ) : (
                <rect x={b.at(i)} y={Math.min(y(d.open), y(d.close))} width={b.bw} height={Math.max(1, r1(Math.abs(y(d.open) - y(d.close))))} fill={up ? "#fff" : c} stroke={c} />
              )}
              {volume && <rect x={b.at(i)} y={vy(d.volume)} width={b.bw} height={r1(H - M.b - vy(d.volume))} fill={c} opacity={0.4} />}
            </g>
          );
        })}
      <XLabels labels={beans.map((d) => (d.day % 5 === 1 ? `d${d.day}` : ""))} x={b.mid} />
    </Svg>
  );
}
const start = beans[0].open;
function FnBaseline() {
  const id = useSvgId("b");
  return (
    <TS
      label="Baseline chart: green while the price is above where it started, red below"
      n={30}
      min={Math.floor(Math.min(...beans.map((b) => b.close)) - 1)}
      max={Math.ceil(Math.max(...beans.map((b) => b.close)) + 1)}
      labels={beans.map((d) => (d.day % 5 === 1 ? `d${d.day}` : ""))}
      yfmt={(v) => String(Math.round(v))}
    >
      {(s) => {
        const p = pts(
          beans.map((b) => b.close),
          s,
        );
        const area = `${path(p)} L${p[29][0]},${s.y(start)} L${p[0][0]},${s.y(start)} Z`;
        return (
          <g>
            <defs>
              <clipPath id={`${id}u`}>
                <rect x={0} y={0} width={W} height={s.y(start)} />
              </clipPath>
              <clipPath id={`${id}d`}>
                <rect x={0} y={s.y(start)} width={W} height={H} />
              </clipPath>
            </defs>
            <path d={area} fill="rgba(27,175,122,0.3)" clipPath={`url(#${id}u)`} />
            <path d={area} fill="rgba(227,73,72,0.3)" clipPath={`url(#${id}d)`} />
            <line x1={M.l} x2={W - M.r} y1={s.y(start)} y2={s.y(start)} stroke={INK} strokeDasharray="3 3" />
            <path d={path(p)} fill="none" stroke={INK} strokeWidth={1.5} />
          </g>
        );
      }}
    </TS>
  );
}

/* ---------------------------------------------------------------- calendar & cycles */
const hmax = Math.max(...hourlyByDay.flatMap((d) => d.values));
function WeekHour({ bubbles = false }: { bubbles?: boolean }) {
  const cw = (W - 40) / HOURS.length;
  const ch = (H - 34) / 7;
  return (
    <Svg label={bubbles ? "Punchcard: a bubble for every weekday and hour, sized by orders" : "Heatmap of orders by weekday and hour of the day"}>
      {hourlyByDay.map((d, r) => (
        <g key={d.day}>
          <Text x={30} y={r1(8 + r * ch + ch / 2 + 3)} anchor="end" size={8.5} color={INK}>
            {d.day}
          </Text>
          {d.values.map((v, c) =>
            bubbles ? (
              <circle key={c} cx={r1(36 + c * cw + cw / 2)} cy={r1(8 + r * ch + ch / 2)} r={r1(Math.sqrt(v / hmax) * (Math.min(cw, ch) / 2 - 0.5))} fill={PAL[0]} opacity={0.8} />
            ) : (
              <rect key={c} x={r1(36 + c * cw)} y={r1(8 + r * ch)} width={r1(cw - 1.5)} height={r1(ch - 1.5)} rx={2} fill={seq(v / hmax)} />
            ),
          )}
        </g>
      ))}
      {HOURS.map((h, c) =>
        c % 2 === 0 ? (
          <Text key={h} x={r1(36 + c * cw + cw / 2)} y={H - 12} anchor="middle" size={8} mono>
            {h}
          </Text>
        ) : null,
      )}
    </Svg>
  );
}
function Spiral() {
  const dmax = Math.max(...daily);
  return (
    <Svg label="Spiral chart: a year of daily orders wound outwards, about 52 days per turn">
      {daily.map((v, d) => {
        const a = (d / 52) * Math.PI * 2;
        const rr = 18 + d * 0.24;
        const [x, y] = polar(180, 112, rr, a);
        return <circle key={d} cx={x} cy={y} r={r1(1 + (v / dmax) * 3.2)} fill={seq(v / dmax)} />;
      })}
      <Text x={10} y={14} size={8.5}>
        {"one turn ≈ 52 days · centre = January"}
      </Text>
    </Svg>
  );
}
function Stripes() {
  const lo = Math.min(...T);
  const hi = Math.max(...T);
  const w = (W - 20) / 24;
  return (
    <Svg label="Heat stripes: one coloured stripe per month, darker = more revenue, no axes at all">
      {T.map((v, i) => (
        <rect key={i} x={r1(10 + i * w)} y={20} width={r1(w + 0.5)} height={H - 50} fill={seq((v - lo) / (hi - lo))} />
      ))}
      <Text x={10} y={14} size={8.5}>
        {"24 months of revenue, one stripe each"}
      </Text>
      <Text x={10} y={H - 14} size={8.5}>
        {"Jan, year 1"}
      </Text>
      <Text x={W - 10} y={H - 14} anchor="end" size={8.5}>
        {"Dec, year 2"}
      </Text>
    </Svg>
  );
}
function Clock() {
  const max = Math.max(...hourlyWeekday);
  return (
    <Svg label="24-hour clock chart: orders per hour as bars around a clock face">
      <circle cx={180} cy={108} r={34} fill="none" stroke="rgba(11,11,11,0.1)" />
      {Array.from({ length: 24 }, (_, h) => {
        const k = HOURS.indexOf(h);
        const v = k >= 0 ? hourlyWeekday[k] : 0;
        const a0 = (h / 24) * Math.PI * 2 + 0.03;
        const a1 = ((h + 1) / 24) * Math.PI * 2 - 0.03;
        const [lx, ly] = polar(180, 108, 101, (a0 + a1) / 2);
        return (
          <g key={h}>
            {v > 0 && <path d={arc(180, 108, 36, r1(36 + (v / max) * 54), a0, a1)} fill={v / max > 0.7 ? PAL[1] : PAL[0]} opacity={0.85} />}
            {h % 3 === 0 && (
              <Text x={lx} y={ly + 3} anchor="middle" size={8} mono>
                {`${h}h`}
              </Text>
            )}
          </g>
        );
      })}
      <Text x={180} y={111} anchor="middle" size={8.5} color={INK}>
        {"weekday"}
      </Text>
    </Svg>
  );
}
function MonthGrid() {
  const dec = daily.slice(334, 364);
  const dmax = Math.max(...dec);
  const cw = 44;
  const ch = 32;
  return (
    <Svg label="Calendar month: the last thirty days, one cell per day with the number of orders">
      {WEEKDAYS.map((d, c) => (
        <Text key={d} x={r1(28 + c * cw + cw / 2)} y={14} anchor="middle" size={8.5}>
          {d}
        </Text>
      ))}
      {dec.map((v, i) => {
        const c = (i + 334) % 7;
        const r = Math.floor((i + ((334 % 7) - 0)) / 7);
        return (
          <g key={i}>
            <rect x={28 + c * cw} y={20 + r * ch} width={cw - 3} height={ch - 3} rx={5} fill={seq((v / dmax) * 0.9)} />
            <Text x={31 + c * cw} y={30 + r * ch} size={7.5} color={v / dmax > 0.7 ? "#fff" : MUTED}>
              {i + 1}
            </Text>
            <Text x={r1(28 + c * cw + cw - 6)} y={r1(20 + r * ch + ch - 7)} anchor="end" size={8} mono color={v / dmax > 0.7 ? "#fff" : INK}>
              {v}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function CyclePlot() {
  const max = nice(Math.max(...T));
  const y = lin(1000, max, H - M.b, M.t);
  const b = band(12, M.l, W - M.r, 0.2);
  return (
    <Svg label="Cycle plot: for each month, a short line from last year to this year, with the month's average">
      <YGrid y={y} max={max} min={1000} />
      {MONTHS.map((m, i) => {
        const a = lastYear[i];
        const c = thisYear[i];
        return (
          <g key={m}>
            <line x1={b.at(i)} x2={b.at(i) + b.bw} y1={y((a + c) / 2)} y2={y((a + c) / 2)} stroke={SOFT} />
            <line x1={b.at(i)} x2={b.at(i) + b.bw} y1={y(a)} y2={y(c)} stroke={PAL[0]} strokeWidth={2} />
            <circle cx={b.at(i) + b.bw} cy={y(c)} r={2.5} fill={PAL[0]} />
          </g>
        );
      })}
      <XLabels labels={mo} x={b.mid} />
    </Svg>
  );
}

export const LINE_VARIANTS = [
  ...defs("Trend", "Lines", [
    ["ln-markers", "Line with markers", "Few points where each period matters.", "Hundreds of points: markers become clutter.", LnMarkers],
    ["ln-smooth", "Smooth line", "A gentle overall shape for presentations.", "When the curve invents peaks between real points.", LnSmooth],
    ["ln-highlight", "Highlight one line", "Many series, one story: grey out the rest.", "When readers need every series.", LnHighlight],
    ["ln-minmax", "Line with min / max", "Calling out records without labelling everything.", "Noisy data where one spike isn't the story.", LnMinMax],
    ["ln-ref", "Average and target lines", "Context: is this good or bad?", "Too many reference lines.", LnRef],
    ["ln-band", "Line in a normal range", "Monitoring: points outside the band are flagged.", "When 'normal' isn't defined.", LnBand],
    ["ln-forecast", "Forecast with uncertainty", "Showing where things may go, honestly.", "Hiding how uncertain the forecast is.", LnForecast],
    ["ln-yoy", "This year vs last year", "Seasonal comparison on the same calendar.", "More than three years: use a cycle plot.", LnYoY],
    ["ln-index", "Indexed lines (=100)", "Comparing growth of series of very different size.", "When absolute levels matter.", LnIndex],
    ["ln-cumulative", "Cumulative lines", "Progress through the year against last year.", "Seeing monthly swings.", LnCumulative],
    ["ln-moving", "Moving average", "Noisy daily data: show the trend under the noise.", "Short series: the average lags.", LnMovingAvg],
    ["ln-dual", "Dual-axis line", "Two related measures with different units, carefully.", "Suggesting causation: scales can be tuned to fake a link.", LnDual],
    ["ln-bump", "Bump chart", "Rankings over time and who overtakes whom.", "When the gaps between ranks matter.", LnBump],
    ["ln-multiples", "Small-multiple lines", "Many series, each easy to read on its own.", "Comparing levels across panels with different scales.", LnMultiples],
    ["ln-horizon", "Horizon chart", "Many time series in very little height.", "Readers new to it: needs a legend.", LnHorizon],
    ["ln-events", "Line with events", "Linking changes to things that happened.", "Implying an event caused a change without evidence.", LnEvents],
    ["ln-difference", "Difference chart", "The gap between two lines as an area.", "Lines that cross often: the colours flip-flop.", LnDifference],
    ["ln-range", "Range band with average", "Typical value and its spread over time.", "When readers will think the band is a forecast.", LnRange],
    ["ln-growth", "Growth-rate line", "Speeding up vs slowing down.", "When the level itself matters more.", LnGrowth],
    ["ln-radial", "Radial line", "Seasonal cycles where December meets January.", "Precise comparison.", LnRadial],
    ["ln-labels", "Directly labelled line", "Small charts in reports: numbers without an axis.", "Long series.", LnLabels],
    ["ln-spread", "Average with spread", "One typical line plus the range around it.", "When individual series matter.", LnAvgSpread],
  ]),
  ...defs("Trend", "Areas", [
    ["ar-gradient", "Gradient area", "A hero chart for one series.", "Several overlapping series.", ArGradient],
    ["ar-100", "100% stacked area", "Shares shifting over time.", "When the total changes a lot and matters.", Ar100],
    ["ar-stream", "Streamgraph", "Many series rising and falling, as an overview.", "Reading exact values.", ArStream],
    ["ar-overlap", "Overlapping areas", "Two or three series, each with volume.", "More series: the overlaps go muddy.", ArOverlap],
    ["ar-step", "Step area", "Values that hold until they change.", "Smoothly changing measures.", ArStep],
    ["ar-multiples", "Small-multiple areas", "Comparing size and shape across many series.", "Very similar series.", ArMultiples],
  ]),
  ...defs("Trend", "Financial", [
    ["fn-candles", "Candlestick", "Daily price ranges and direction (open → close).", "Data without open/high/low/close.", () => <Candles ohlc={false} />],
    ["fn-ohlc", "OHLC bars", "The same information as candles, more compact.", "General audiences.", () => <Candles ohlc />],
    ["fn-volume", "Candles with volume", "Price movement with how much was traded.", "Small charts: two panels get cramped.", () => <Candles ohlc={false} volume />],
    ["fn-bands", "Moving average with bands", "Seeing when a price is unusually high or low.", "Treating the bands as a prediction.", () => <Candles ohlc={false} bands />],
    ["fn-baseline", "Baseline chart", "Above or below a starting point at a glance.", "When the starting point is arbitrary.", FnBaseline],
  ]),
  ...defs("Trend", "Calendar & cycles", [
    ["cy-weekhour", "Weekday × hour heatmap", "Finding the busy times in a week.", "Precise values.", () => <WeekHour />],
    ["cy-punchcard", "Punchcard", "The same grid with bubbles: sizes pop more than shades.", "Many small values: bubbles vanish.", () => <WeekHour bubbles />],
    ["cy-spiral", "Spiral chart", "Long daily series with a repeating cycle.", "Analysis: it's hard to compare turns.", Spiral],
    ["cy-stripes", "Heat stripes", "The long-term pattern, with no numbers at all.", "Anything needing values.", Stripes],
    ["cy-clock", "24-hour clock chart", "Patterns over the hours of a day.", "Comparing distant hours precisely.", Clock],
    ["cy-month", "Calendar month", "Daily numbers in the layout people already know.", "More than a few months.", MonthGrid],
    ["cy-cycle", "Cycle plot", "Seasonality and growth for every month at once.", "Audiences new to it.", CyclePlot],
  ]),
];
