"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import model from "@/data/models/mall-segments.json";
import { Slider } from "./controls";

// Validated categorical order (dataviz reference palette, light). Fixed order, never cycled.
const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];

const W = 600;
const H = 400;
const M = { l: 46, r: 14, t: 14, b: 40 };
const X0 = 10;
const X1 = 140;
const Y0 = 0;
const Y1 = 100;
const sx = (v: number) => M.l + ((v - X0) / (X1 - X0)) * (W - M.l - M.r);
const sy = (v: number) => H - M.b - ((v - Y0) / (Y1 - Y0)) * (H - M.t - M.b);
const ix = (px: number) => X0 + ((px - M.l) / (W - M.l - M.r)) * (X1 - X0);
const iy = (py: number) => Y0 + ((H - M.b - py) / (H - M.t - M.b)) * (Y1 - Y0);

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const incMed = median(model.points.map((p) => p[0]));
const scMed = median(model.points.map((p) => p[1]));
// Same naming rule as ml/train.py
const nameOf = (c: number[]) => {
  const inc = c[0] > incMed * 1.15 ? "High income" : c[0] < incMed * 0.85 ? "Low income" : "Mid income";
  const sp = c[1] > scMed * 1.2 ? "big spenders" : c[1] < scMed * 0.8 ? "careful spenders" : "average spenders";
  return `${inc}, ${sp}`;
};

export type MallSample = (typeof model.samples)[number];

/** Remount with a new `key` to load a different preset row. */
export function ClusterDemo({ preset }: { preset?: MallSample | null }) {
  const [k, setK] = useState(model.best_k);
  const [hover, setHover] = useState<number | null>(null);
  const [guest, setGuest] = useState<{ x: number; y: number; id?: string } | null>(preset ? { x: preset.income, y: preset.score, id: preset.id } : null);
  const svg = useRef<SVGSVGElement>(null);

  const run = model.runs[String(k) as keyof typeof model.runs];
  const groups = useMemo(
    () =>
      run.centroids.map((c, i) => ({
        id: i,
        centroid: c,
        name: nameOf(c),
        size: run.labels.filter((l) => l === i).length,
      })),
    [run],
  );

  const assigned = useMemo(() => {
    if (!guest) return null;
    let best = 0;
    let bd = Infinity;
    run.centroids.forEach((c, i) => {
      const d = (c[0] - guest.x) ** 2 + (c[1] - guest.y) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return groups[best];
  }, [guest, run, groups]);

  const place = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    const x = Math.round(Math.max(X0, Math.min(X1, ix(px))));
    const y = Math.round(Math.max(Y0, Math.min(Y1, iy(py))));
    setGuest({ x, y });
  };

  const hp = hover !== null ? model.points[hover] : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-2xl bg-white p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] font-semibold">Spending score vs annual income</p>
          <p className="font-hand text-[19px] text-ink-2/70">click to add a customer</p>
        </div>
        <div className="relative">
          <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair select-none" onClick={place} data-cursor="Add">
            {/* grid + axes */}
            {[0, 25, 50, 75, 100].map((v) => (
              <g key={`y${v}`}>
                <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="#0b0b0b" strokeOpacity="0.06" />
                <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
                  {v}
                </text>
              </g>
            ))}
            {[20, 40, 60, 80, 100, 120, 140].map((v) => (
              <text key={`x${v}`} x={sx(v)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
                {v}
              </text>
            ))}
            <text x={(W + M.l) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#5f5f5a">
              Annual income (k$)
            </text>
            <text x={12} y={(H - M.b) / 2} textAnchor="middle" fontSize="11" fill="#5f5f5a" transform={`rotate(-90 12 ${(H - M.b) / 2})`}>
              Spending score
            </text>

            {/* points */}
            {model.points.map(([x, y], i) => (
              <motion.circle
                key={i}
                cx={sx(x)}
                cy={sy(y)}
                r={hover === i ? 7 : 5}
                stroke="#ffffff"
                strokeWidth={2}
                initial={false}
                animate={{ fill: PALETTE[run.labels[i]] }}
                transition={{ duration: 0.4, delay: (i % 20) * 0.006 }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
            ))}

            {/* centroids */}
            {run.centroids.map((c, i) => (
              <motion.g key={`c${k}-${i}`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18, delay: i * 0.05 }} style={{ originX: 0.5, originY: 0.5 }}>
                <circle cx={sx(c[0])} cy={sy(c[1])} r={11} fill="#ffffff" stroke={PALETTE[i]} strokeWidth={3} />
                <path d={`M${sx(c[0]) - 4} ${sy(c[1])} H${sx(c[0]) + 4} M${sx(c[0])} ${sy(c[1]) - 4} V${sy(c[1]) + 4}`} stroke="#0b0b0b" strokeWidth={1.6} />
              </motion.g>
            ))}

            {/* the visitor's customer */}
            <AnimatePresence>
              {guest && assigned && (
                <motion.g key={`${guest.x}-${guest.y}`} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ originX: 0.5, originY: 0.5 }}>
                  <line x1={sx(guest.x)} y1={sy(guest.y)} x2={sx(assigned.centroid[0])} y2={sy(assigned.centroid[1])} stroke="#0b0b0b" strokeDasharray="4 4" strokeWidth={1.4} />
                  <rect x={sx(guest.x) - 8} y={sy(guest.y) - 8} width={16} height={16} rx={3} fill="#0b0b0b" stroke="#ffffff" strokeWidth={2} transform={`rotate(45 ${sx(guest.x)} ${sy(guest.y)})`} />
                </motion.g>
              )}
            </AnimatePresence>
          </svg>

          {hp && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] whitespace-nowrap text-white"
              style={{ left: `${(sx(hp[0]) / W) * 100}%`, top: `${(sy(hp[1]) / H) * 100}%` }}
            >
              Income {hp[0]}k · score {hp[1]}
              <br />
              <span className="text-white/70">{groups[run.labels[hover!]].name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-white p-5">
          <Slider label="Number of segments (k)" value={k} min={2} max={8} onChange={(v) => setK(v)} />
          <div className="mt-4 flex h-16 items-end gap-1.5">
            {model.elbow.map((e) => {
              const maxS = Math.max(...model.elbow.map((x) => x.silhouette));
              return (
                <button
                  key={e.k}
                  type="button"
                  onClick={() => setK(e.k)}
                  className="group flex flex-1 flex-col items-center gap-1"
                  title={`k=${e.k}: silhouette ${e.silhouette.toFixed(3)}`}
                >
                  <span
                    className={`w-full rounded-t-[4px] transition-colors ${e.k === k ? "bg-ink" : "bg-ink/15 group-hover:bg-ink/30"}`}
                    style={{ height: `${(e.silhouette / maxS) * 44}px` }}
                  />
                  <span className="font-mono text-[10px] text-muted">{e.k}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-muted">
            Silhouette per k · best is k = {model.best_k}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Segments</p>
          <ul className="mt-3 space-y-2">
            {groups.map((g) => (
              <li key={g.id} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] ${assigned?.id === g.id ? "bg-cream" : ""}`}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: PALETTE[g.id] }} />
                <span className="flex-1">{g.name}</span>
                <span className="font-mono text-[12px] text-muted">{g.size}</span>
              </li>
            ))}
          </ul>
          <AnimatePresence mode="wait">
            {guest && assigned ? (
              <motion.p key={`${guest.x}-${guest.y}-${k}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-ink px-3 py-2.5 text-[13px] text-white">
                {guest.id ? `Customer #${guest.id}` : "Your customer"} ({guest.x}k, score {guest.y}) belongs to <b>{assigned.name}</b>.
              </motion.p>
            ) : (
              <p className="mt-4 text-[12.5px] text-muted">Click anywhere on the chart to drop a new customer.</p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
