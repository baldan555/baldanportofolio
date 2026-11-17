"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { InsideSection, Picker, Scrolly, type Step } from "./scrolly";

const UP = "#eb6834";
const INK = "#0b0b0b";
const MUTED = "rgba(11,11,11,0.45)";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** A tree node: a yes/no question (null at a leaf), its children, and the training examples that reached it. */
export type TreeNode = {
  q: string | null;
  yes: ((x: Record<string, number | string>) => boolean) | null;
  l: number;
  r: number;
  p: number;
  n: number;
};
export type TreeRow = {
  id: string;
  x: Record<string, number | string>;
  actual: string;
  facts: { label: string; value: string; computed?: boolean }[];
};

const W = 640;
const H = 440;
const pct = (p: number) => `${(p * 100).toFixed(p < 0.1 && p > 0 ? 1 : 0)}%`;

/** Lay the tree out: leaves evenly across, parents above the middle of their children. */
function layout(nodes: TreeNode[]) {
  const pos: { x: number; y: number; d: number }[] = [];
  let leaf = 0;
  let depth = 0;
  const walk = (i: number, d: number) => {
    depth = Math.max(depth, d);
    const nd = nodes[i];
    if (nd.l < 0) pos[i] = { x: leaf++, y: d, d };
    else {
      walk(nd.r, d + 1); // "yes" on the left reads more naturally top-down
      walk(nd.l, d + 1);
      pos[i] = { x: (pos[nd.l].x + pos[nd.r].x) / 2, y: d, d };
    }
  };
  walk(0, 0);
  const sx = (W - 60) / Math.max(1, leaf);
  const sy = (H - 120) / Math.max(1, depth);
  return {
    pts: pos.map((p) => ({
      x: 30 + (p.x + 0.5) * sx,
      y: 46 + p.y * sy,
      d: p.d,
    })),
    depth,
    leaves: leaf,
  };
}

function pathOf(nodes: TreeNode[], x: TreeRow["x"]) {
  const path = [0];
  let i = 0;
  while (nodes[i].l >= 0) {
    i = nodes[i].yes!(x) ? nodes[i].r : nodes[i].l;
    path.push(i);
  }
  return path;
}

export function Visual({ step, nodes, row, event }: { step: number; nodes: TreeNode[]; row: TreeRow; event: string }) {
  const { pts } = useMemo(() => layout(nodes), [nodes]);
  const path = useMemo(() => pathOf(nodes, row.x), [nodes, row]);
  const onPath = new Set(path);
  const leaf = path[path.length - 1];
  const tr = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
  const showPath = step >= 3 && step <= 4;
  const walking = step >= 3;
  const root = nodes[0];
  const kids = [nodes[root.r], nodes[root.l]];
  const fill = (p: number) => `color-mix(in srgb, ${UP} ${Math.round(Math.sqrt(p) * 100)}%, white)`;
  const asked = step === 2 ? [0] : showPath ? path.slice(0, -1) : [];

  return (
    <div className="relative min-h-0 flex-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="A decision tree: one example follows yes/no questions down to a leaf">
        {/* branches */}
        {nodes.map((nd, i) =>
          nd.l < 0
            ? null
            : [nd.r, nd.l].map((c, side) => {
                const hot = showPath && onPath.has(i) && onPath.has(c);
                return (
                  <g key={`${i}-${c}`}>
                    <motion.line
                      x1={pts[i].x}
                      y1={pts[i].y}
                      x2={pts[c].x}
                      y2={pts[c].y}
                      initial={false}
                      animate={{
                        stroke: hot ? INK : "rgba(11,11,11,0.18)",
                        strokeWidth: hot ? 3.5 : 1.2,
                        opacity: step >= 1 ? 1 : 0.4,
                      }}
                      transition={tr}
                    />
                    {(i === 0 || hot) && step >= 2 && (
                      <text x={(pts[i].x + pts[c].x) / 2 + (side ? 8 : -8)} y={(pts[i].y + pts[c].y) / 2} fontSize={10} fontFamily={MONO} fill={MUTED} textAnchor={side ? "start" : "end"}>
                        {side ? "no" : "yes"}
                      </text>
                    )}
                  </g>
                );
              }),
        )}
        {/* nodes, coloured by how often the event happened among training examples there */}
        {nodes.map((nd, i) => {
          const isLeaf = nd.l < 0;
          const hot = (showPath || step >= 5) && i === leaf;
          return (
            <g key={i}>
              <motion.circle
                cx={pts[i].x}
                cy={pts[i].y}
                initial={false}
                animate={{ r: hot ? 17 : isLeaf ? 11 : 9 }}
                fill={step >= 1 ? fill(nd.p) : "#fff"}
                stroke={hot ? INK : "rgba(11,11,11,0.35)"}
                strokeWidth={hot ? 2.5 : 1}
                transition={tr}
              />
              {isLeaf && step >= 4 && (
                <text x={pts[i].x} y={pts[i].y + 26} fontSize={10} fontFamily={MONO} textAnchor="middle" fill={i === leaf ? INK : MUTED} fontWeight={i === leaf ? 700 : 400}>
                  {pct(nd.p)}
                </text>
              )}
            </g>
          );
        })}
        {/* the questions being asked */}
        {asked.map((i) => {
          const yes = nodes[i].yes!(row.x);
          const left = pts[i].x > W / 2;
          return (
            <g key={`q${i}`}>
              <rect x={left ? pts[i].x - 14 - 236 : pts[i].x + 14} y={pts[i].y - 13} width={236} height={26} rx={7} fill="#fff" stroke="rgba(11,11,11,0.12)" />
              <text x={left ? pts[i].x - 20 : pts[i].x + 20} y={pts[i].y + 4} fontSize={11} fontFamily={FONT} fill={INK} textAnchor={left ? "end" : "start"}>
                {(nodes[i].q ?? "").slice(0, 36)}?{" "}
                <tspan fontWeight={700} fill={yes ? UP : INK}>
                  {yes ? "yes" : "no"}
                </tspan>
              </text>
            </g>
          );
        })}
        {/* the example travelling down */}
        {walking && step < 5 && (
          <motion.circle
            key={`${row.id}-${step}`}
            r={6}
            fill={INK}
            initial={{ cx: pts[0].x, cy: pts[0].y }}
            animate={{
              cx: path.map((i) => pts[i].x),
              cy: path.map((i) => pts[i].y),
            }}
            transition={{ duration: 0.55 * path.length, ease: "easeInOut" }}
          />
        )}
        {/* step 6: what the first question did to the training data */}
        {step === 5 && (
          <g>
            {[root, ...kids].map((nd, k) => {
              const x = k === 0 ? pts[0].x : k === 1 ? pts[root.r].x : pts[root.l].x;
              const y = k === 0 ? pts[0].y : pts[root.r].y;
              return (
                <g key={k}>
                  <rect x={x - 62} y={y + 18} width={124} height={40} rx={8} fill="#fff" stroke="rgba(11,11,11,0.15)" />
                  <text x={x} y={y + 34} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
                    {nd.n.toLocaleString("en-US")} examples
                  </text>
                  <text x={x} y={y + 50} fontSize={12.5} fontFamily={FONT} textAnchor="middle" fill={INK} fontWeight={700}>
                    {pct(nd.p)} {event}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        {step >= 4 && step !== 5 && (
          <text x={W / 2} y={H - 14} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
            LEAF % = SHARE OF TRAINING EXAMPLES THERE THAT HAD A {event.toUpperCase()}
          </text>
        )}
      </svg>
      {/* the example's facts */}
      <motion.div
        initial={false}
        animate={{ opacity: step <= 1 ? 1 : 0, y: step <= 1 ? 0 : -8 }}
        transition={tr}
        className="pointer-events-none absolute top-2 left-1/2 w-[min(330px,92%)] -translate-x-1/2 rounded-2xl border border-line bg-white/95 p-3 shadow-sm"
      >
        <p className="mb-1.5 font-mono text-[10px] tracking-[0.14em] text-muted uppercase">{row.id}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {row.facts.map((f) => (
            <p key={f.label} className={`text-[11.5px] ${f.computed && step === 1 ? "font-semibold text-[#c2410c]" : ""}`}>
              <span className="text-muted">{f.label}</span> {f.value}
            </p>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function TreeExplainer({
  id,
  title,
  line,
  nodes,
  rows,
  entity,
  event,
  second,
  grownNote,
}: {
  id?: string;
  title: string;
  line?: string;
  nodes: TreeNode[];
  rows: TreeRow[];
  entity: string;
  /** what the leaf percentages count: "failure", "fraud" */
  event: string;
  /** step 2: e.g. which facts are computed from others */
  second: Step;
  /** step 7 text: why the tree stops where it does */
  grownNote: string;
}) {
  const [pick, setPick] = useState(0);
  const row = rows[pick];
  const path = useMemo(() => pathOf(nodes, row.x), [nodes, row]);
  const leaf = nodes[path[path.length - 1]];
  const root = nodes[0];
  const yesKid = nodes[root.r];
  const noKid = nodes[root.l];
  const depth = useMemo(() => layout(nodes).depth, [nodes]);

  const steps: Step[] = [
    {
      t: `Start with one ${entity}`,
      d: `A real ${entity} from the test data. A tree doesn't add anything up: it asks questions.`,
    },
    second,
    {
      t: "Ask the first question",
      d: `Every ${entity} starts at the top: “${root.q}?” This one answers ${root.yes!(row.x) ? "yes" : "no"}.`,
    },
    {
      t: "Follow the answers down",
      d: `Each answer picks a branch and the next question. This ${entity} needs ${path.length - 1} questions to reach the bottom.`,
    },
    {
      t: "The leaf is the prediction",
      d: `In training, ${pct(leaf.p)} of the ${leaf.n.toLocaleString("en-US")} examples that ended in this leaf had a ${event}. That share is the prediction. In reality: ${row.actual}.`,
    },
    {
      t: "How the questions were chosen",
      d: `Training tries many questions and keeps the one that best separates ${event}s from the rest. The first one splits ${root.n.toLocaleString("en-US")} examples (${pct(root.p)} ${event}) into ${pct(yesKid.p)} and ${pct(noKid.p)}.`,
    },
    { t: `Why it stops at ${depth} levels`, d: grownNote },
  ];

  return (
    <InsideSection id={id} title={title} line={line}>
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label={entity} rows={rows} value={pick} onChange={setPick} tag={(r) => r.actual} />
            <div className="flex min-h-0 flex-1 flex-col px-2 pb-9 sm:px-4">
              <Visual step={step} nodes={nodes} row={row} event={event} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
