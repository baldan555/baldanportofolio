"use client";

import { motion } from "framer-motion";
import { MiniMe } from "./mini-me";

/* Small scenes for the Journey cards: the mini character in each role. Each is drawn in a 300 × 150 box, ground at y = 144;
 * the character is scaled to 0.66 (about 130 tall). */

const INK = "var(--ink)";
export type JourneyScene = "bots" | "fraud" | "pipes" | "neural" | "graduate" | "media";

const S = 0.66;
const groundY = 144 - 196 * S; // where MiniMe's feet land on the ground line

/** Now: portals and bots for a sales team; he types, a small robot ticks the tasks off. */
function Bots() {
  return (
    <>
      <rect x={100} y={18} width={110} height={84} rx={7} fill="white" stroke={INK} strokeWidth={2} />
      <path d="M100 30 h110" stroke={INK} strokeOpacity={0.15} strokeWidth={2} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={110} y={38 + i * 15} width={66} height={8} rx={2} fill={INK} opacity={0.1} />
          <motion.circle cx={194} cy={42 + i * 15} r={5} fill={INK} animate={{ scale: [0, 0, 1, 1], opacity: [0, 0, 1, 1] }} transition={{ duration: 3.2, times: [0, 0.15 + i * 0.18, 0.2 + i * 0.18, 1], repeat: Infinity }} />
        </g>
      ))}
      {/* robot */}
      <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M252 66 v-10" stroke={INK} strokeWidth={2} />
        <motion.circle cx={252} cy={54} r={3.5} animate={{ fill: ["#19a974", "#f59e0b", "#19a974"] }} transition={{ duration: 1.6, repeat: Infinity }} />
        <rect x={234} y={66} width={36} height={28} rx={8} fill="white" stroke={INK} strokeWidth={2.2} />
        <circle cx={245} cy={80} r={3} fill={INK} />
        <circle cx={259} cy={80} r={3} fill={INK} />
        <rect x={238} y={98} width={28} height={30} rx={6} fill="#dbe7ee" stroke={INK} strokeWidth={2.2} />
        <motion.path d="M238 106 l-14 -8" stroke={INK} strokeWidth={4} strokeLinecap="round" style={{ originX: 1, originY: 0 }} animate={{ rotate: [0, -18, 0] }} transition={{ duration: 0.8, repeat: Infinity }} />
        <path d="M244 128 v14 M260 128 v14" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      </motion.g>
      <MiniMe x={6} y={groundY} scale={S} pose="type" hold="laptop" />
    </>
  );
}

/** Data analyst: a dashboard, a suspicious spike, caught. */
function Fraud() {
  return (
    <>
      <rect x={14} y={16} width={160} height={96} rx={7} fill="white" stroke={INK} strokeWidth={2} />
      <path d="M26 96 C46 92 56 84 70 86 S92 78 104 80 L114 40 L124 82 S150 74 162 70" fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <motion.circle cx={114} cy={40} r={6} fill="#ef4444" animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.1, repeat: Infinity }} />
      {/* shield: caught */}
      <motion.g animate={{ scale: [0.8, 1, 0.8] }} style={{ originX: 0.5, originY: 0.5 }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M150 104 l16 -6 l16 6 v10 c0 12 -8 18 -16 22 c-8 -4 -16 -10 -16 -22 z" fill="#86efac" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <path d="M159 114 l5 5 l9 -10" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
      <MiniMe x={184} y={groundY} scale={S} pose="inspect" hold="magnifier" flip />
    </>
  );
}

/** Big data analyst: data flowing through pipes into one tank, and a forecast. */
function Pipes() {
  return (
    <>
      {[20, 52, 84].map((y, i) => (
        <g key={i}>
          <ellipse cx={104} cy={y} rx={12} ry={5} fill="white" stroke={INK} strokeWidth={2} />
          <path d={`M92 ${y} v12 a12 5 0 0 0 24 0 v-12`} fill="white" stroke={INK} strokeWidth={2} />
          <path d={`M116 ${y + 6} H146 V68 H160`} fill="none" stroke={INK} strokeOpacity={0.25} strokeWidth={5} strokeLinejoin="round" />
          <motion.path d={`M116 ${y + 6} H146 V68 H160`} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="4 8" animate={{ strokeDashoffset: [24, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
        </g>
      ))}
      <rect x={160} y={44} width={50} height={56} rx={8} fill="white" stroke={INK} strokeWidth={2.2} />
      <motion.rect x={163} width={44} rx={5} fill="#bfdbfe" animate={{ y: [86, 60, 86], height: [11, 37, 11] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
      {/* forecast */}
      <path d="M220 118 C232 110 240 114 252 102 S272 96 280 88" fill="none" stroke={INK} strokeWidth={2.4} />
      <motion.path d="M280 88 C286 84 292 76 298 70" fill="none" stroke={INK} strokeWidth={2.4} strokeDasharray="4 4" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.8, repeat: Infinity }} />
      <MiniMe x={-6} y={groundY} scale={S} pose="point" />
    </>
  );
}

/** ML cohort: a small network lighting up, and an idea. */
function Neural() {
  const layers = [
    [30, 70, 110],
    [40, 75, 100],
    [55, 90],
  ];
  const xs = [30, 90, 150];
  const nodes = layers.flatMap((ys, li) => ys.map((y) => [xs[li], y] as const));
  return (
    <>
      {layers.slice(0, -1).flatMap((ys, li) =>
        ys.flatMap((y1) => layers[li + 1].map((y2) => <path key={`${li}-${y1}-${y2}`} d={`M${xs[li]} ${y1} L${xs[li + 1]} ${y2}`} stroke={INK} strokeOpacity={0.18} strokeWidth={1.6} />)),
      )}
      {nodes.map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={8} stroke={INK} strokeWidth={2} animate={{ fill: ["#ffffff", "#fde68a", "#ffffff"] }} transition={{ duration: 1.8, delay: (x / 150) * 0.9, repeat: Infinity }} />
      ))}
      {/* the idea */}
      <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }}>
        <circle cx={250} cy={18} r={11} fill="#fde68a" stroke={INK} strokeWidth={2} />
        <path d="M245 30 h10 M246 34 h8" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        <path d="M250 1 v-4 M236 8 l-3 -3 M264 8 l3 -3" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      </motion.g>
      <MiniMe x={196} y={groundY + 8} scale={S * 0.94} pose="think" />
    </>
  );
}

/** Graduation: cap on, arms up, a diploma. */
function Graduate() {
  return (
    <>
      {[
        [40, 30, "#f59e0b"],
        [70, 14, "#3b82f6"],
        [230, 22, "#19a974"],
        [262, 40, "#ef4444"],
        [210, 60, "#3b82f6"],
        [24, 70, "#19a974"],
      ].map(([cx, cy, c], i) => (
        <motion.rect key={i} x={cx as number} y={cy as number} width={6} height={6} rx={1.2} fill={c as string} animate={{ y: [0, 18, 0], rotate: [0, 180, 360] }} transition={{ duration: 2.2, delay: i * 0.2, repeat: Infinity }} />
      ))}
      <motion.g animate={{ rotate: [-4, 4, -4] }} style={{ originX: 0.5, originY: 0.5 }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>
        <rect x={210} y={84} width={70} height={40} rx={5} fill="white" stroke={INK} strokeWidth={2} />
        <circle cx={268} cy={116} r={7} fill="#ef4444" stroke={INK} strokeWidth={1.6} />
        <text x={236} y={110} textAnchor="middle" fontSize="16" fontWeight={700} fill={INK} style={{ fontFamily: "var(--font-geist-mono)" }}>
          3.76
        </text>
      </motion.g>
      <MiniMe x={110} y={groundY} scale={S} pose="cheer" hold="cap" mood="open" />
    </>
  );
}

/** Media analytics: a web page, its audience growing. */
function Media() {
  return (
    <>
      <rect x={120} y={14} width={168} height={104} rx={7} fill="white" stroke={INK} strokeWidth={2} />
      <path d="M120 28 h168" stroke={INK} strokeOpacity={0.15} strokeWidth={2} />
      <rect x={132} y={38} width={60} height={34} rx={4} fill={INK} opacity={0.12} />
      <path d="M132 82 h60 M132 92 h48 M132 102 h54" stroke={INK} strokeOpacity={0.25} strokeWidth={3} strokeLinecap="round" />
      {[22, 38, 30, 50].map((h, i) => (
        <motion.rect key={i} x={206 + i * 18} width={12} rx={2} fill={i === 3 ? INK : "rgba(11,11,11,0.2)"} animate={{ y: [108, 108 - h, 108 - h, 108], height: [0, h, h, 0] }} transition={{ duration: 3.4, times: [0, 0.3, 0.85, 1], delay: i * 0.12, repeat: Infinity }} />
      ))}
      <MiniMe x={6} y={groundY} scale={S} pose="point" />
    </>
  );
}

const SCENES: Record<JourneyScene, () => React.JSX.Element> = { bots: Bots, fraud: Fraud, pipes: Pipes, neural: Neural, graduate: Graduate, media: Media };

export function JourneyVignette({ scene }: { scene: JourneyScene }) {
  const Scene = SCENES[scene];
  return (
    <svg viewBox="0 0 300 150" className="block h-auto w-full" aria-hidden>
      <path d="M0 144.5 H300" stroke={INK} strokeOpacity={0.12} strokeWidth={1.5} />
      <Scene />
    </svg>
  );
}

/** The mini character walking along the Journey's progress rail. */
export function RailWalker() {
  return (
    <svg viewBox="-4 -4 128 208" className="h-14 w-auto overflow-visible" aria-hidden>
      <MiniMe pose="walk" />
    </svg>
  );
}
