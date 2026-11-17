"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { FACE, HAIR, HAIR_CURL, HAIR_LOCK, HAIR_STRANDS, SKIN, SKIN_SHADE } from "./character";

/* A full-body, pocket-size version of the hero portrait (character.tsx): same wavy swept-up hair, broad face, light cream skin and cream brocade
 * jacket, drawn as an SVG <g> so scenes can place him (and what he holds) inside their own drawing.
 * Local box: 120 × 200, feet at y ≈ 196. */

const INK = "var(--ink)";
const JACKET = "#f1e5c6";
const JACKET_LINE = "#c7ad72";

export type Pose = "stand" | "wave" | "write" | "sketch" | "cheer" | "water" | "type" | "inspect" | "point" | "think" | "walk";
export type Hold = "notepad" | "marker" | "can" | "laptop" | "magnifier" | "cap" | null;

/** Arm paths from the shoulders (40,98) and (80,98) to the hands, per pose. */
const ARMS: Record<Exclude<Pose, "walk">, { l: string; lh: [number, number]; r: string; rh: [number, number] }> = {
  stand: { l: "M40 98 Q33 120 36 140", lh: [36, 141], r: "M80 98 Q87 120 84 140", rh: [84, 141] },
  wave: { l: "M40 98 Q33 120 36 140", lh: [36, 141], r: "M80 98 Q98 92 100 70", rh: [100, 68] },
  write: { l: "M40 98 Q42 124 56 124", lh: [57, 124], r: "M80 98 Q86 118 74 120", rh: [73, 120] },
  sketch: { l: "M40 98 Q33 120 36 140", lh: [36, 141], r: "M80 98 Q100 92 110 74", rh: [111, 72] },
  cheer: { l: "M40 98 Q26 80 30 60", lh: [30, 58], r: "M80 98 Q94 80 90 60", rh: [90, 58] },
  water: { l: "M40 98 Q33 120 36 140", lh: [36, 141], r: "M80 98 Q96 110 104 114", rh: [105, 114] },
  type: { l: "M40 98 Q38 122 50 132", lh: [50, 133], r: "M80 98 Q82 122 70 132", rh: [70, 133] },
  inspect: { l: "M40 98 Q33 120 36 140", lh: [36, 141], r: "M80 98 Q98 106 102 92", rh: [103, 90] },
  point: { l: "M40 98 Q33 120 36 140", lh: [36, 141], r: "M80 98 Q98 98 112 90", rh: [113, 89] },
  think: { l: "M40 98 Q44 122 64 116", lh: [65, 116], r: "M80 98 Q88 112 68 80", rh: [67, 79] },
};

function Arm({ d, hand }: { d: string; hand: [number, number] }) {
  return (
    <g>
      <path d={d} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
      <path d={d} fill="none" stroke={JACKET} strokeWidth={7} strokeLinecap="round" />
      <circle cx={hand[0]} cy={hand[1]} r={4.6} fill={SKIN} stroke={INK} strokeWidth={2.2} />
    </g>
  );
}

function HeldThing({ hold, at }: { hold: Hold; at: [number, number] }) {
  const [x, y] = at;
  if (hold === "notepad")
    return (
      <g transform={`rotate(-8 ${x - 6} ${y - 8})`}>
        <rect x={x - 18} y={y - 20} width={22} height={17} rx={2} fill="white" stroke={INK} strokeWidth={2} />
        <path d={`M${x - 15} ${y - 14} h14 M${x - 15} ${y - 10} h11 M${x - 15} ${y - 6} h8`} stroke={INK} strokeOpacity={0.4} strokeWidth={1.4} />
      </g>
    );
  if (hold === "marker") return <path d={`M${x} ${y} l7 -7`} stroke={INK} strokeWidth={4} strokeLinecap="round" />;
  if (hold === "can")
    return (
      <g>
        <path d={`M${x - 2} ${y - 4} h18 l-2 16 h-14 z`} fill="#dbe7ee" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <path d={`M${x + 16} ${y} l12 -6`} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
        <path d={`M${x + 1} ${y - 4} q6 -8 12 0`} fill="none" stroke={INK} strokeWidth={2} />
      </g>
    );
  if (hold === "laptop")
    return (
      <g>
        <path d={`M${x - 24} ${y - 4} h44 l-4 -22 h-36 z`} fill="white" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <path d={`M${x - 28} ${y - 4} h52`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <circle cx={x - 2} cy={y - 15} r={2} fill={INK} fillOpacity={0.35} />
      </g>
    );
  if (hold === "magnifier")
    return (
      <g>
        <path d={`M${x} ${y} l5 -6`} stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
        <circle cx={x + 10} cy={y - 13} r={8.5} fill="white" fillOpacity={0.6} stroke={INK} strokeWidth={2.4} />
      </g>
    );
  return null;
}

export function MiniMe({ pose = "stand", hold = null, x = 0, y = 0, scale = 1, flip = false, mood = "smile" }: { pose?: Pose; hold?: Hold; x?: number; y?: number; scale?: number; flip?: boolean; mood?: "smile" | "open" }) {
  const uid = useId().replace(/:/g, "");
  const brocade = `mini-brocade-${uid}`;
  const walking = pose === "walk";
  const arms = walking ? ARMS.stand : ARMS[pose];
  const handFor: [number, number] = arms.rh;

  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})${flip ? " translate(-120 0)" : ""}`}>
      <defs>
        <pattern id={brocade} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(10)">
          <circle cx="3" cy="3" r="1.1" fill={JACKET_LINE} opacity="0.7" />
          <path d="M7 9 q2 -3 4 0" fill="none" stroke={JACKET_LINE} strokeWidth="0.9" opacity="0.6" />
        </pattern>
      </defs>

      {/* shadow */}
      <ellipse cx="60" cy="196" rx="30" ry="4" fill={INK} opacity="0.08" />

      {/* legs */}
      <motion.g style={{ originX: 0.5, originY: 0 }} animate={walking ? { rotate: [14, -14, 14] } : { rotate: 0 }} transition={walking ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}>
        <path d="M45 146 L43 186 L55 186 L57 146 Z" fill={INK} />
        <path d="M41 186 h16 q3 7 -4 7 h-11 q-3 0 -1 -7 z" fill={INK} />
      </motion.g>
      <motion.g style={{ originX: 0.5, originY: 0 }} animate={walking ? { rotate: [-14, 14, -14] } : { rotate: 0 }} transition={walking ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}>
        <path d="M63 146 L65 186 L77 186 L75 146 Z" fill={INK} />
        <path d="M63 186 h16 q3 7 -4 7 h-11 q-3 0 -1 -7 z" fill={INK} />
      </motion.g>

      {/* body bobs a little: alive, never static */}
      <motion.g animate={{ y: walking ? [0, -2, 0] : [0, 1.2, 0] }} transition={{ duration: walking ? 0.4 : 3, repeat: Infinity, ease: "easeInOut" }}>
        {/* back arm (left) */}
        {walking ? (
          <motion.g style={{ originX: 0.9, originY: 0.05 }} animate={{ rotate: [-18, 18, -18] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}>
            <Arm d={ARMS.stand.l} hand={ARMS.stand.lh} />
          </motion.g>
        ) : (
          <Arm d={arms.l} hand={arms.lh} />
        )}

        {/* jacket */}
        <path d="M34 150 C33 116 40 92 60 88 C80 92 87 116 86 150 Z" fill={JACKET} />
        <path d="M34 150 C33 116 40 92 60 88 C80 92 87 116 86 150 Z" fill={`url(#${brocade})`} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
        {/* neck + tee + mandarin collar */}
        <path d="M54 76 L54 90 Q60 94 66 90 L66 76" fill={SKIN} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
        <path d="M58 90 L64 90 L63 98 L59 98 Z" fill="#c9c9c6" stroke={INK} strokeWidth={1.6} />
        <path d="M48 92 L51 85 Q56 91 60 92 L60 99 Q53 98 48 92 Z" fill={JACKET} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <path d="M72 92 L69 85 Q64 91 62 92 L62 99 Q67 98 72 92 Z" fill={JACKET} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <path d="M61 99 L61 150" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        <circle cx="61" cy="114" r="3.2" fill="white" stroke={INK} strokeWidth={1.8} />

        {/* head */}
        <g>
          {/* the portrait's head shapes, scaled from its face box (138–262 × 120–298) onto this one (37–83 × 27–80) */}
          <ellipse cx="33.3" cy="59" rx="4.4" ry="6" fill={SKIN} stroke={INK} strokeWidth={2.2} />
          <ellipse cx="86.7" cy="59" rx="4.4" ry="6" fill={SKIN} stroke={INK} strokeWidth={2.2} />
          <path d={FACE} transform="translate(37 27) scale(0.371 0.298) translate(-138 -120)" fill={SKIN} stroke={INK} strokeWidth={7.5} />
          <ellipse cx="45" cy="64.5" rx="3.8" ry="2.1" fill={SKIN_SHADE} opacity={0.6} />
          <ellipse cx="75" cy="65" rx="3.8" ry="2.1" fill={SKIN_SHADE} opacity={0.6} />
          {/* brows */}
          <path d="M44.5 49 Q53 46.5 57.5 50.5" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
          <path d="M62.9 50.5 Q67.4 46.5 75.9 49" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
          {/* eyes, blinking */}
          <motion.g style={{ originY: 0.5 }} animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 4.2, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}>
            <circle cx="50.8" cy="55" r="2.3" fill={INK} />
            <circle cx="69.6" cy="55" r="2.3" fill={INK} />
          </motion.g>
          {/* nose, mouth */}
          <path d="M61 60 Q62.5 63.5 63 65.5 Q64.5 67.5 62 68 Q60 68.8 58 68 Q55.6 67.5 57 65.5" fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          {mood === "open" ? (
            <path d="M54 70.5 Q60 78 66.5 70 Z" fill={INK} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
          ) : (
            <path d="M54 71 Q60.5 75.5 66.5 70" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          )}
          {/* wavy swept-up hair */}
          <g transform="translate(37 27) scale(0.371 0.298) translate(-138 -120)">
            <path d={HAIR} fill={INK} stroke={INK} strokeWidth={5.5} strokeLinejoin="round" />
            <path d={HAIR_LOCK} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
            <path d={HAIR_STRANDS} fill="none" stroke="white" strokeOpacity="0.45" strokeWidth={3.4} strokeLinecap="round" />
            <path d={HAIR_CURL} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          </g>
          {hold === "cap" && (
            // sits on top of the thick hair, with a light edge so it doesn't melt into it
            <g>
              <path d="M46 20 L46 29 Q60 35 74 29 L74 20" fill={INK} stroke="#f4efe4" strokeWidth={1.4} strokeLinejoin="round" />
              <path d="M32 17 L60 5 L88 17 L60 28 Z" fill={INK} stroke="#f4efe4" strokeWidth={1.4} strokeLinejoin="round" />
              <motion.path d="M86 18 L88 33" stroke="#e8b84b" strokeWidth={2.2} strokeLinecap="round" style={{ originY: 0 }} animate={{ rotate: [-8, 10, -8] }} transition={{ duration: 1.6, repeat: Infinity }} />
            </g>
          )}
        </g>

        {/* front arm (right) + what it holds */}
        {walking ? (
          <motion.g style={{ originX: 0.1, originY: 0.05 }} animate={{ rotate: [18, -18, 18] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}>
            <Arm d={ARMS.stand.r} hand={ARMS.stand.rh} />
          </motion.g>
        ) : pose === "wave" ? (
          <motion.g style={{ originX: 0, originY: 1 }} animate={{ rotate: [-6, 8, -6] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}>
            <Arm d={arms.r} hand={arms.rh} />
          </motion.g>
        ) : pose === "sketch" ? (
          <motion.g style={{ originX: 0, originY: 1 }} animate={{ rotate: [-4, 4, -2, 4, -4], y: [0, -2, 1, -1, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
            <Arm d={arms.r} hand={arms.rh} />
            <HeldThing hold={hold} at={handFor} />
          </motion.g>
        ) : (
          <g>
            <Arm d={arms.r} hand={arms.rh} />
            {hold !== "cap" && <HeldThing hold={hold} at={pose === "write" ? arms.lh : handFor} />}
          </g>
        )}
      </motion.g>
    </g>
  );
}

/** A second, simpler person (the people he builds for): grey shirt, short hair, no glasses. Same local box as MiniMe. */
export function Person({ x = 0, y = 0, scale = 1, talking = false }: { x?: number; y?: number; scale?: number; talking?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="60" cy="196" rx="30" ry="4" fill={INK} opacity="0.08" />
      <path d="M45 146 L44 188 L56 188 L57 146 Z M63 146 L64 188 L76 188 L75 146 Z" fill="#5b6470" />
      <path d="M42 188 h15 q2 6 -4 6 h-10 q-3 0 -1 -6 z M63 188 h15 q2 6 -4 6 h-10 q-3 0 -1 -6 z" fill={INK} />
      <motion.g animate={{ y: [0, 1.2, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M40 98 Q32 120 36 140" fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
        <path d="M40 98 Q32 120 36 140" fill="none" stroke="#cfd5dc" strokeWidth={7} strokeLinecap="round" />
        <path d="M34 150 C33 116 40 92 60 88 C80 92 87 116 86 150 Z" fill="#cfd5dc" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
        <path d="M54 76 L54 90 Q60 94 66 90 L66 76" fill="white" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
        <path d="M39 54 C39 34 48 27 60 27 C72 27 81 34 81 54 C81 70 73 80 60 81 C47 80 39 70 39 54 Z" fill="white" stroke={INK} strokeWidth={2.6} />
        <path d="M39 50 C38 34 48 25 60 25 C73 25 82 34 81 50 C76 40 68 36 60 36 C52 36 44 40 39 50 Z" fill="#6b4f3a" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <motion.g style={{ originY: 0.5 }} animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 5, times: [0, 0.88, 0.91, 0.94, 1], repeat: Infinity, delay: 0.7 }}>
          <circle cx="52" cy="55" r="2.3" fill={INK} />
          <circle cx="68" cy="55" r="2.3" fill={INK} />
        </motion.g>
        <path d="M60 58 Q58 64 61 65" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
        <motion.path fill={INK} animate={{ d: talking ? ["M54 70 Q60 74 66 70 Q60 72 54 70 Z", "M54 69 Q60 78 66 69 Q60 71 54 69 Z", "M54 70 Q60 74 66 70 Q60 72 54 70 Z"] : "M54 70 Q60 74 66 70 Q60 72 54 70 Z" }} transition={{ duration: 0.5, repeat: talking ? Infinity : 0 }} stroke={INK} strokeWidth={1.6} />
        {/* gesturing arm */}
        <motion.g style={{ originX: 0, originY: 0 }} animate={talking ? { rotate: [0, -12, 0] } : { rotate: 0 }} transition={{ duration: 1.2, repeat: talking ? Infinity : 0, ease: "easeInOut" }}>
          <path d="M80 98 Q96 106 100 92" fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
          <path d="M80 98 Q96 106 100 92" fill="none" stroke="#cfd5dc" strokeWidth={7} strokeLinecap="round" />
          <circle cx="100" cy="90" r="4.6" fill="white" stroke={INK} strokeWidth={2.2} />
        </motion.g>
      </motion.g>
    </g>
  );
}
