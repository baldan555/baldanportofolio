"use client";

import { useRef, useState, type ReactNode } from "react";

/* Palette — dataviz reference instance (light). Two-series comparisons use slots 1 & 2.
   Single-series marks use ink to stay inside the site's black/white language. */
export const S1 = "#2a78d6";
export const S2 = "#eb6834";
export const INK = "#0b0b0b";
const BLUE_RAMP = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"];
const GRID = "rgba(11,11,11,0.07)";
const AXIS_TXT = "#8a8a85";
const mono = "var(--font-geist-mono)";

/* ------------------------------------------------------------------ */
/* Card + table view                                                    */
/* ------------------------------------------------------------------ */

export type TableData = { columns: string[]; rows: (string | number)[][] };

export function ChartCard({
  title,
  takeaway,
  legend,
  table,
  children,
  className = "",
}: {
  title: string;
  takeaway?: string;
  legend?: { label: string; color: string; shape?: "dot" | "line" | "square" }[];
  table?: TableData;
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className={`flex flex-col rounded-2xl border border-line bg-white p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <figcaption className="text-[14.5px] font-semibold">{title}</figcaption>
          {takeaway && <p className="mt-0.5 text-[13px] text-ink-2/60">{takeaway}</p>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-[10.5px] text-muted transition hover:border-ink/30 hover:text-ink"
          >
            {showTable ? "chart" : "table"}
          </button>
        )}
      </div>
      {legend && legend.length > 1 && !showTable && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2/75">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              {l.shape === "line" ? (
                <span className="h-[2px] w-4 rounded" style={{ background: l.color }} />
              ) : l.shape === "square" ? (
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: l.color }} />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
              )}
              {l.label}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex-1">{showTable && table ? <DataTable data={table} /> : children}</div>
    </figure>
  );
}

export function DataTable({ data, maxHeight = 260 }: { data: TableData; maxHeight?: number }) {
  return (
    <div className="overflow-auto rounded-xl border border-line" style={{ maxHeight }}>
      <table className="w-full text-left text-[12.5px]">
        <thead className="sticky top-0 bg-cream">
          <tr>
            {data.columns.map((c) => (
              <th key={c} className="px-3 py-2 font-mono text-[10.5px] font-medium tracking-wide whitespace-nowrap text-ink-2/70 uppercase">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((v, j) => (
                <td key={j} className="px-3 py-1.5 whitespace-nowrap">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

function useTip() {
  const [tip, setTip] = useState<{ x: number; y: number; text: ReactNode } | null>(null);
  return { tip, setTip };
}

function Tip({ tip, W, H }: { tip: { x: number; y: number; text: ReactNode } | null; W: number; H: number }) {
  if (!tip) return null;
  const right = tip.x > W * 0.65;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] leading-snug whitespace-nowrap text-white shadow-lg"
      style={{
        left: `${(tip.x / W) * 100}%`,
        top: `${(tip.y / H) * 100}%`,
        transform: `translate(${right ? "calc(-100% - 10px)" : "10px"}, -50%)`,
      }}
    >
      {tip.text}
    </div>
  );
}

const nice = (max: number) => {
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const m = max / p;
  const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return step * p;
};

/* ------------------------------------------------------------------ */
/* Bar chart (single series)                                            */
/* ------------------------------------------------------------------ */

export function BarChart({
  data,
  format = (v) => String(v),
  max,
  height = 220,
  highlight,
  width = 420,
}: {
  data: { label: string; value: number; n?: number }[];
  format?: (v: number) => string;
  max?: number;
  height?: number;
  highlight?: (d: { label: string; value: number }) => boolean;
  width?: number;
}) {
  const W = width;
  const H = height;
  const M = { l: 40, r: 8, t: 18, b: 34 };
  const top = max ?? nice(Math.max(...data.map((d) => d.value)) * 1.1);
  const bw = (W - M.l - M.r) / data.length;
  const y = (v: number) => H - M.b - (v / top) * (H - M.t - M.b);
  const { tip, setTip } = useTip();
  const maxV = Math.max(...data.map((d) => d.value));
  const minV = Math.min(...data.map((d) => d.value));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={M.l} x2={W - M.r} y1={y(top * f)} y2={y(top * f)} stroke={GRID} />
            <text x={M.l - 6} y={y(top * f) + 4} textAnchor="end" fontSize="10.5" fill={AXIS_TXT} fontFamily={mono}>
              {format(top * f)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const w = Math.min(bw * 0.5, 56);
          const x = M.l + i * bw + (bw - w) / 2;
          const strong = highlight ? highlight(d) : true;
          const labelled = d.value === maxV || d.value === minV;
          return (
            <g
              key={d.label}
              onMouseEnter={() =>
                setTip({
                  x: x + w / 2,
                  y: y(d.value),
                  text: (
                    <>
                      <b>{d.label}</b> · {format(d.value)}
                      {d.n !== undefined && <span className="text-white/65"> · n={d.n.toLocaleString("en-US")}</span>}
                    </>
                  ),
                })
              }
            >
              <rect x={M.l + i * bw} y={M.t} width={bw} height={H - M.t - M.b} fill="transparent" />
              <path
                d={`M${x} ${H - M.b} V${y(d.value) + 4} Q${x} ${y(d.value)} ${x + 4} ${y(d.value)} H${x + w - 4} Q${x + w} ${y(d.value)} ${x + w} ${y(d.value) + 4} V${H - M.b} Z`}
                fill={INK}
                fillOpacity={strong ? 1 : 0.2}
              />
              {labelled && (
                <text x={x + w / 2} y={y(d.value) - 6} textAnchor="middle" fontSize="11" fill={INK} fontWeight={600}>
                  {format(d.value)}
                </text>
              )}
              <text x={x + w / 2} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill="#5f5f5a">
                {d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} W={W} H={H} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Histogram, single series or two groups side by side                 */
/* ------------------------------------------------------------------ */

export function Histogram({
  bins,
  series,
  format = (v) => String(v),
  xFormat = (v) => String(v),
  markers = [],
  height = 220,
  width = 420,
}: {
  bins: number[];
  series: { name: string; color: string; values: number[] }[];
  format?: (v: number) => string;
  xFormat?: (v: number) => string;
  markers?: { at: number; label: string }[];
  height?: number;
  width?: number;
}) {
  const W = width;
  const H = height;
  const M = { l: 40, r: 8, t: 14, b: 30 };
  const n = bins.length - 1;
  const top = nice(Math.max(...series.flatMap((s) => s.values)) * 1.1);
  const bw = (W - M.l - M.r) / n;
  const x = (v: number) => M.l + ((v - bins[0]) / (bins[n] - bins[0])) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (v / top) * (H - M.t - M.b);
  const { tip, setTip } = useTip();
  const gap = 1;
  const sw = (bw - 2 - gap * (series.length - 1)) / series.length;
  const tickEvery = Math.ceil(n / 6);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={M.l} x2={W - M.r} y1={y(top * f)} y2={y(top * f)} stroke={GRID} />
            <text x={M.l - 6} y={y(top * f) + 4} textAnchor="end" fontSize="10.5" fill={AXIS_TXT} fontFamily={mono}>
              {format(top * f)}
            </text>
          </g>
        ))}
        {markers.map((m) => (
          <g key={m.label}>
            <line x1={x(m.at)} x2={x(m.at)} y1={M.t} y2={H - M.b} stroke={S2} strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={x(m.at) + 4} y={M.t + 10} fontSize="10.5" fill={INK}>
              {m.label}
            </text>
          </g>
        ))}
        {Array.from({ length: n }).map((_, i) => (
          <g
            key={i}
            onMouseEnter={() =>
              setTip({
                x: M.l + i * bw + bw / 2,
                y: y(Math.max(...series.map((s) => s.values[i]))),
                text: (
                  <>
                    <b>
                      {xFormat(bins[i])}–{xFormat(bins[i + 1])}
                    </b>
                    {series.map((s) => (
                      <span key={s.name}>
                        <br />
                        {series.length > 1 ? `${s.name}: ` : ""}
                        {format(s.values[i])}
                      </span>
                    ))}
                  </>
                ),
              })
            }
          >
            <rect x={M.l + i * bw} y={M.t} width={bw} height={H - M.t - M.b} fill="transparent" />
            {series.map((s, si) => {
              const v = s.values[i];
              const bx = M.l + i * bw + 1 + si * (sw + gap);
              const by = y(v);
              const h = H - M.b - by;
              return h > 0 ? <rect key={s.name} x={bx} y={by} width={Math.max(1, sw)} height={h} rx={Math.min(3, sw / 2)} fill={s.color} /> : null;
            })}
            {i % tickEvery === 0 && (
              <text x={M.l + i * bw} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill={AXIS_TXT} fontFamily={mono}>
                {xFormat(bins[i])}
              </text>
            )}
          </g>
        ))}
      </svg>
      <Tip tip={tip} W={W} H={H} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Line chart (numeric x), crosshair tooltip                            */
/* ------------------------------------------------------------------ */

export function LineChart({
  series,
  xDomain,
  yDomain,
  xFormat = (v) => String(v),
  yFormat = (v) => String(v),
  xTicks,
  diagonal = false,
  markers = false,
  vline,
  height = 240,
  xLabel,
  yLabel,
  width = 420,
}: {
  series: { name: string; color: string; points: [number, number][]; dashed?: boolean }[];
  xDomain: [number, number];
  yDomain: [number, number];
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
  xTicks?: number[];
  diagonal?: boolean;
  markers?: boolean;
  vline?: { at: number; label: string };
  height?: number;
  xLabel?: string;
  yLabel?: string;
  width?: number;
}) {
  const W = width;
  const H = height;
  const M = { l: 44, r: 10, t: 12, b: xLabel ? 40 : 28 };
  const sx = (v: number) => M.l + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * (H - M.t - M.b);
  const ref = useRef<SVGSVGElement>(null);
  const [hx, setHx] = useState<number | null>(null);
  const ticks = xTicks ?? [0, 0.25, 0.5, 0.75, 1].map((f) => xDomain[0] + f * (xDomain[1] - xDomain[0]));
  const yTicks = [0, 0.5, 1].map((f) => yDomain[0] + f * (yDomain[1] - yDomain[0]));

  const nearest = (pts: [number, number][], x: number) => pts.reduce((a, b) => (Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a));
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const v = xDomain[0] + ((px - M.l) / (W - M.l - M.r)) * (xDomain[1] - xDomain[0]);
    setHx(Math.max(xDomain[0], Math.min(xDomain[1], v)));
  };

  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove} onMouseLeave={() => setHx(null)}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke={GRID} />
            <text x={M.l - 6} y={sy(v) + 4} textAnchor="end" fontSize="10.5" fill={AXIS_TXT} fontFamily={mono}>
              {yFormat(v)}
            </text>
          </g>
        ))}
        {ticks.map((v) => (
          <text key={v} x={sx(v)} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill={AXIS_TXT} fontFamily={mono}>
            {xFormat(v)}
          </text>
        ))}
        {xLabel && (
          <text x={(W + M.l) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#5f5f5a">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text x={10} y={(H - M.b + M.t) / 2} textAnchor="middle" fontSize="11" fill="#5f5f5a" transform={`rotate(-90 10 ${(H - M.b + M.t) / 2})`}>
            {yLabel}
          </text>
        )}
        {diagonal && <line x1={sx(xDomain[0])} y1={sy(yDomain[0])} x2={sx(xDomain[1])} y2={sy(yDomain[1])} stroke={AXIS_TXT} strokeDasharray="4 4" />}
        {vline && (
          <g>
            <line x1={sx(vline.at)} x2={sx(vline.at)} y1={M.t} y2={H - M.b} stroke={INK} strokeOpacity={0.4} strokeDasharray="3 3" />
            <text x={sx(vline.at) + 4} y={M.t + 10} fontSize="10.5" fill={INK}>
              {vline.label}
            </text>
          </g>
        )}
        {series.map((s) => (
          <g key={s.name}>
            <path
              d={s.points.map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join("")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "6 4" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {markers && s.points.map((p, i) => <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />)}
          </g>
        ))}
        {hx !== null && (
          <g pointerEvents="none">
            <line x1={sx(hx)} x2={sx(hx)} y1={M.t} y2={H - M.b} stroke={INK} strokeOpacity={0.3} />
            {series.map((s) => {
              const p = nearest(s.points, hx);
              return <circle key={s.name} cx={sx(p[0])} cy={sy(p[1])} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />;
            })}
          </g>
        )}
      </svg>
      {hx !== null && (
        <Tip
          W={W}
          H={H}
          tip={{
            x: sx(hx),
            y: H / 2,
            text: (
              <>
                {series.map((s, i) => {
                  const p = nearest(s.points, hx);
                  return (
                    <span key={s.name}>
                      {i > 0 && <br />}
                      {i === 0 && (
                        <>
                          <b>{xFormat(p[0])}</b>
                          <br />
                        </>
                      )}
                      {series.length > 1 ? `${s.name}: ` : ""}
                      {yFormat(p[1])}
                    </span>
                  );
                })}
              </>
            ),
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Heatmap (sequential, one hue)                                        */
/* ------------------------------------------------------------------ */

export function Heatmap({
  rows,
  rowLabels,
  colLabels,
  format = (v) => String(v),
  height = 220,
}: {
  rows: number[][];
  rowLabels: string[];
  colLabels: (string | null)[];
  format?: (v: number) => string;
  height?: number;
}) {
  const W = 420;
  const H = height;
  const M = { l: 36, r: 6, t: 6, b: 34 };
  const flat = rows.flat();
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);
  const cw = (W - M.l - M.r) / rows[0].length;
  const ch = (H - M.t - M.b) / rows.length;
  const color = (v: number) => BLUE_RAMP[Math.min(BLUE_RAMP.length - 1, Math.floor(((v - lo) / (hi - lo + 1e-9)) * BLUE_RAMP.length))];
  const { tip, setTip } = useTip();

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
        {rows.map((r, ri) => (
          <g key={ri}>
            <text x={M.l - 6} y={M.t + ri * ch + ch / 2 + 4} textAnchor="end" fontSize="10.5" fill={AXIS_TXT} fontFamily={mono}>
              {rowLabels[ri]}
            </text>
            {r.map((v, ci) => (
              <rect
                key={ci}
                x={M.l + ci * cw + 1}
                y={M.t + ri * ch + 1}
                width={cw - 2}
                height={ch - 2}
                rx={2}
                fill={color(v)}
                onMouseEnter={() =>
                  setTip({
                    x: M.l + ci * cw + cw / 2,
                    y: M.t + ri * ch + ch / 2,
                    text: (
                      <>
                        <b>
                          {rowLabels[ri]} {String(ci).padStart(2, "0")}:00
                        </b>
                        <br />
                        {format(v)}
                      </>
                    ),
                  })
                }
              />
            ))}
          </g>
        ))}
        {colLabels.map((c, ci) =>
          c ? (
            <text key={ci} x={M.l + ci * cw + cw / 2} y={H - M.b + 14} textAnchor="middle" fontSize="10.5" fill={AXIS_TXT} fontFamily={mono}>
              {c}
            </text>
          ) : null,
        )}
        <defs>
          <linearGradient id="heat-legend" x1="0" x2="1">
            {BLUE_RAMP.map((c, i) => (
              <stop key={c} offset={`${(i / (BLUE_RAMP.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        <rect x={W - M.r - 120} y={H - 12} width={80} height={6} rx={3} fill="url(#heat-legend)" />
        <text x={W - M.r - 124} y={H - 6} textAnchor="end" fontSize="10" fill={AXIS_TXT} fontFamily={mono}>
          {format(lo)}
        </text>
        <text x={W - M.r - 36} y={H - 6} fontSize="10" fill={AXIS_TXT} fontFamily={mono}>
          {format(hi)}
        </text>
      </svg>
      <Tip tip={tip} W={W} H={H} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confusion matrix                                                     */
/* ------------------------------------------------------------------ */

export function ConfusionMatrix({ tn, fp, fn, tp, positive = "Positive", negative = "Negative" }: { tn: number; fp: number; fn: number; tp: number; positive?: string; negative?: string }) {
  const total = tn + fp + fn + tp;
  const cell = (v: number, label: string, good: boolean) => {
    const share = v / total;
    return (
      <div
        className="flex flex-col justify-between rounded-xl p-3"
        style={{ background: good ? `rgba(11,11,11,${0.12 + share * 1.3})` : `rgba(235,104,52,${0.1 + share * 1.4})`, color: good && share > 0.35 ? "#fff" : INK }}
        title={`${label}: ${v.toLocaleString("en-US")} (${(share * 100).toFixed(1)}%)`}
      >
        <span className="font-mono text-[10.5px] uppercase opacity-75">{label}</span>
        <span className="mt-3 text-[1.6rem] leading-none font-semibold tracking-[-0.03em]">{v.toLocaleString("en-US")}</span>
      </div>
    );
  };
  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-[12px]">
      <span />
      <span className="text-center font-mono text-[10.5px] text-muted uppercase">Predicted {negative.toLowerCase()}</span>
      <span className="text-center font-mono text-[10.5px] text-muted uppercase">Predicted {positive.toLowerCase()}</span>
      <span className="self-center font-mono text-[10.5px] text-muted uppercase [writing-mode:vertical-rl] rotate-180">Actually {negative.toLowerCase()}</span>
      {cell(tn, "Correct", true)}
      {cell(fp, "False alarm", false)}
      <span className="self-center font-mono text-[10.5px] text-muted uppercase [writing-mode:vertical-rl] rotate-180">Actually {positive.toLowerCase()}</span>
      {cell(fn, "Missed", false)}
      {cell(tp, "Caught", true)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dot strip: one dot per fold, per model                               */
/* ------------------------------------------------------------------ */

export function DotStrip({
  groups,
  domain,
  format = (v) => v.toFixed(2),
  width = 860,
}: {
  groups: { name: string; color: string; values: number[] }[];
  domain: [number, number];
  format?: (v: number) => string;
  width?: number;
}) {
  const W = width;
  const rowH = 46;
  const H = groups.length * rowH + 30;
  const M = { l: 118, r: 12 };
  const sx = (v: number) => M.l + ((v - domain[0]) / (domain[1] - domain[0])) * (W - M.l - M.r);
  const { tip, setTip } = useTip();
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => domain[0] + f * (domain[1] - domain[0]));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={6} y2={H - 24} stroke={GRID} />
            <text x={sx(t)} y={H - 8} textAnchor="middle" fontSize="10.5" fill={AXIS_TXT} fontFamily={mono}>
              {format(t)}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const cy = 10 + gi * rowH + rowH / 2;
          const mean = g.values.reduce((a, b) => a + b, 0) / g.values.length;
          return (
            <g key={g.name}>
              <text x={M.l - 10} y={cy + 4} textAnchor="end" fontSize="11.5" fill={INK}>
                {g.name}
              </text>
              {g.values.map((v, i) => {
                const jitter = (((i * 37) % 17) / 17 - 0.5) * 22;
                return (
                  <circle
                    key={i}
                    cx={sx(v)}
                    cy={cy + jitter}
                    r={4}
                    fill={g.color}
                    fillOpacity={0.55}
                    stroke="#fff"
                    strokeWidth={1}
                    onMouseEnter={() => setTip({ x: sx(v), y: cy + jitter, text: `${g.name} · fold ${i + 1}: ${format(v)}` })}
                  />
                );
              })}
              <line x1={sx(mean)} x2={sx(mean)} y1={cy - 16} y2={cy + 16} stroke={INK} strokeWidth={2.5} />
              <text x={sx(mean)} y={cy - 19} textAnchor="middle" fontSize="10.5" fill={INK} fontWeight={600}>
                {format(mean)}
              </text>
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} W={W} H={H} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grouped bars: n groups × 2–3 series, value labels on top             */
/* ------------------------------------------------------------------ */

export function GroupedBars({
  groups,
  series,
  format = (v) => v.toFixed(2),
  max,
  height = 230,
}: {
  groups: string[];
  series: { name: string; color: string; values: number[] }[];
  format?: (v: number) => string;
  max?: number;
  height?: number;
}) {
  const W = 420;
  const H = height;
  const M = { l: 40, r: 8, t: 18, b: 34 };
  const top = max ?? nice(Math.max(...series.flatMap((s) => s.values)) * 1.15);
  const gw = (W - M.l - M.r) / groups.length;
  const bw = Math.min(34, (gw * 0.72) / series.length);
  const y = (v: number) => H - M.b - (v / top) * (H - M.t - M.b);
  const { tip, setTip } = useTip();
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={M.l} x2={W - M.r} y1={y(top * f)} y2={y(top * f)} stroke={GRID} />
            <text x={M.l - 6} y={y(top * f) + 4} textAnchor="end" fontSize="10.5" fill={AXIS_TXT} fontFamily={mono}>
              {format(top * f)}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const cx = M.l + gi * gw + gw / 2;
          const span = bw * series.length + 2 * (series.length - 1);
          return (
            <g key={g}>
              {series.map((s, si) => {
                const v = s.values[gi];
                const x = cx - span / 2 + si * (bw + 2);
                return (
                  <g key={s.name} onMouseEnter={() => setTip({ x: x + bw / 2, y: y(v), text: `${g} · ${s.name}: ${format(v)}` })}>
                    <rect x={x} y={y(v)} width={bw} height={Math.max(0, H - M.b - y(v))} rx={4} fill={s.color} />
                    <text x={x + bw / 2} y={y(v) - 5} textAnchor="middle" fontSize="10" fill={INK} fontWeight={600}>
                      {format(v)}
                    </text>
                  </g>
                );
              })}
              <text x={cx} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill="#5f5f5a">
                {g}
              </text>
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} W={W} H={H} />
    </div>
  );
}
