"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MiniMe, Person } from "./mini-me";
import { ease } from "./motion";

/* The "How I ship" stage: the mini character acts out each step. Drawn in one 440 × 300 box, ground at y = 282. */

const INK = "var(--ink)";
const pop = (delay: number) => ({ initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: { delay, type: "spring" as const, stiffness: 320, damping: 18 } });

function Bubble({ x, y, w, text, delay, tail = "left" }: { x: number; y: number; w: number; text: string; delay: number; tail?: "left" | "right" }) {
  const tx = tail === "left" ? x + 22 : x + w - 22;
  return (
    <motion.g style={{ originX: tail === "left" ? 0 : 1, originY: 1 }} {...pop(delay)}>
      <rect x={x} y={y} width={w} height={34} rx={12} fill="white" stroke={INK} strokeWidth={2.2} />
      <path d={`M${tx - 7} ${y + 33} L${tx} ${y + 45} L${tx + 7} ${y + 33}`} fill="white" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <path d={`M${tx - 6} ${y + 33} h12`} stroke="white" strokeWidth={3} />
      <text x={x + w / 2} y={y + 22} textAnchor="middle" fontSize="12.5" fontWeight={600} fill={INK} style={{ fontFamily: "var(--font-geist)" }}>
        {text}
      </text>
    </motion.g>
  );
}

/** 01 Listen: a client explains, he takes notes, and they agree what "done" means. */
function ListenScene() {
  return (
    <>
      <Person x={30} y={86} talking />
      <MiniMe x={262} y={86} pose="write" hold="notepad" />
      <Bubble x={22} y={34} w={160} text="Reports take 3 days…" delay={0.2} />
      <Bubble x={238} y={34} w={176} text="What would 'done' be?" delay={1.1} tail="right" />
      <motion.g style={{ originX: 0.5, originY: 0.5 }} {...pop(2)}>
        <rect x={172} y={150} width={96} height={58} rx={4} fill="#fde68a" stroke={INK} strokeWidth={2} transform="rotate(-4 220 179)" />
        <text x={220} y={174} textAnchor="middle" fontSize="11" fill={INK} transform="rotate(-4 220 179)" style={{ fontFamily: "var(--font-caveat)" }}>
          <tspan fontSize="15">goal:</tspan>
        </text>
        <text x={220} y={194} textAnchor="middle" fontSize="15" fill={INK} transform="rotate(-4 220 179)" style={{ fontFamily: "var(--font-caveat)" }}>
          same day ✓
        </text>
      </motion.g>
    </>
  );
}

/** 02 Prototype: a quick sketch on the whiteboard turns into a screen, tried on real numbers. */
function PrototypeScene() {
  const draw = (delay: number) => ({ initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { delay, duration: 0.7, ease } });
  return (
    <>
      {/* whiteboard on legs */}
      <path d="M190 236 L176 282 M390 236 L404 282" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <rect x={160} y={40} width={260} height={196} rx={8} fill="white" stroke={INK} strokeWidth={2.6} />
      <rect x={160} y={226} width={260} height={10} rx={3} fill={INK} opacity={0.12} />
      {/* wireframe being drawn */}
      <motion.rect x={178} y={58} width={224} height={18} rx={4} fill="none" stroke={INK} strokeWidth={2} {...draw(0.2)} />
      <motion.rect x={178} y={86} width={52} height={124} rx={4} fill="none" stroke={INK} strokeWidth={2} {...draw(0.6)} />
      <motion.rect x={240} y={86} width={162} height={56} rx={4} fill="none" stroke={INK} strokeWidth={2} {...draw(1)} />
      <motion.path d="M250 100 h60 M250 112 h90 M250 124 h40" stroke={INK} strokeOpacity={0.4} strokeWidth={2} strokeLinecap="round" {...draw(1.3)} />
      {/* real data, tried early */}
      {[34, 52, 40, 60, 48].map((h, i) => (
        <motion.rect
          key={i}
          x={250 + i * 28}
          width={18}
          rx={2}
          fill={i === 3 ? INK : "rgba(11,11,11,0.18)"}
          initial={{ y: 206, height: 0 }}
          animate={{ y: 206 - h, height: h }}
          transition={{ delay: 1.6 + i * 0.1, duration: 0.5, ease }}
        />
      ))}
      <motion.text x={400} y={164} textAnchor="end" fontSize="13" fill={INK} fillOpacity={0.6} style={{ fontFamily: "var(--font-caveat)" }} {...pop(2.2)}>
        real data ✓
      </motion.text>
      {/* sticky notes */}
      <motion.rect x={352} y={20} width={42} height={36} rx={3} fill="#fde68a" stroke={INK} strokeWidth={1.8} transform="rotate(8 373 38)" {...pop(0.9)} />
      <motion.rect x={140} y={24} width={36} height={32} rx={3} fill="#bfdbfe" stroke={INK} strokeWidth={1.8} transform="rotate(-10 158 40)" {...pop(1.4)} />
      <MiniMe x={30} y={86} pose="sketch" hold="marker" />
    </>
  );
}

/** 03 Ship: countdown, lift-off, and a box of docs for the handover. */
function ShipScene() {
  return (
    <>
      {/* launch pad */}
      <path d="M70 282 L90 262 H150 L170 282" fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <motion.g animate={{ y: [0, 0, -330] }} transition={{ duration: 3, times: [0, 0.35, 1], repeat: Infinity, repeatDelay: 1, ease: "easeIn" }}>
        {/* flame */}
        <motion.path d="M110 252 Q120 290 130 252 Z" fill="#f59e0b" stroke={INK} strokeWidth={2} animate={{ scaleY: [1, 1.5, 0.9, 1.4, 1] }} style={{ originY: 0 }} transition={{ duration: 0.3, repeat: Infinity }} />
        {/* rocket */}
        <path d="M120 120 C140 140 146 180 142 252 H98 C94 180 100 140 120 120 Z" fill="white" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
        <circle cx={120} cy={180} r={11} fill="#bfdbfe" stroke={INK} strokeWidth={2.4} />
        <path d="M98 220 L80 252 H98 Z M142 220 L160 252 H142 Z" fill={INK} />
        <path d="M108 140 Q120 128 132 140" fill="none" stroke={INK} strokeWidth={2} />
      </motion.g>
      {/* smoke puffs */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={100 + i * 20}
          cy={276}
          r={10}
          fill="white"
          stroke={INK}
          strokeWidth={1.6}
          animate={{ scale: [0, 1.6, 2.2], opacity: [0, 0.9, 0] }}
          transition={{ duration: 1.6, delay: 1 + i * 0.15, repeat: Infinity, repeatDelay: 2.4 }}
        />
      ))}
      {/* handover box + live badge */}
      <motion.g {...pop(0.6)}>
        <path d="M200 238 h56 v44 h-56 z" fill="#f1e5c6" stroke={INK} strokeWidth={2.4} />
        <path d="M200 238 l10 -12 h56 l-10 12 M256 238 l10 -12 v44 l-10 12" fill="#f1e5c6" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
        <text x={228} y={265} textAnchor="middle" fontSize="11" fontWeight={700} fill={INK} style={{ fontFamily: "var(--font-geist-mono)" }}>
          docs
        </text>
      </motion.g>
      <motion.g {...pop(1.4)}>
        <rect x={196} y={40} width={110} height={30} rx={15} fill={INK} />
        <circle cx={214} cy={55} r={4} fill="#19a974" />
        <text x={262} y={60} textAnchor="middle" fontSize="12" fontWeight={600} fill="white" style={{ fontFamily: "var(--font-geist-mono)" }}>
          live ✓
        </text>
      </motion.g>
      {/* confetti */}
      {[
        [300, 70, "#f59e0b"],
        [330, 50, "#19a974"],
        [380, 64, "#3b82f6"],
        [410, 90, "#ef4444"],
        [290, 110, "#3b82f6"],
      ].map(([cx, cy, c], i) => (
        <motion.rect
          key={i}
          x={cx as number}
          y={cy as number}
          width={7}
          height={7}
          rx={1.5}
          fill={c as string}
          animate={{ y: [0, 26, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 2.4, delay: i * 0.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <MiniMe x={296} y={86} pose="cheer" mood="open" />
    </>
  );
}

/** 04 Keep improving: the numbers go up, a gear keeps the routine work turning, and he keeps watering. */
function ImproveScene() {
  return (
    <>
      {/* monitor */}
      <rect x={24} y={60} width={210} height={140} rx={10} fill="white" stroke={INK} strokeWidth={2.6} />
      <path d="M110 200 L102 230 H158 L150 200 M90 232 H170" fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
      <path d="M44 176 H214 M44 176 V84" stroke={INK} strokeOpacity={0.2} strokeWidth={1.6} />
      <motion.path
        d="M48 168 C70 160 82 150 100 152 S130 130 150 128 S180 100 210 92"
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
        animate={{ pathLength: [0, 1, 1] }}
        transition={{ duration: 3, times: [0, 0.6, 1], repeat: Infinity, ease: "easeInOut" }}
      />
      {/* an alert that gets fixed */}
      <motion.circle cx={150} cy={128} r={7} animate={{ fill: ["#ef4444", "#ef4444", "#19a974", "#19a974"] }} transition={{ duration: 3, times: [0, 0.45, 0.55, 1], repeat: Infinity }} stroke="white" strokeWidth={2} />
      {/* gear: automated */}
      <motion.g style={{ originX: 0.5, originY: 0.5 }} animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
        <path
          d="M205 52 l4 0 1.5 5 4 1.7 4.6-2.5 2.8 2.8-2.5 4.6 1.7 4 5 1.5 0 4-5 1.5-1.7 4 2.5 4.6-2.8 2.8-4.6-2.5-4 1.7-1.5 5-4 0-1.5-5-4-1.7-4.6 2.5-2.8-2.8 2.5-4.6-1.7-4-5-1.5 0-4 5-1.5 1.7-4-2.5-4.6 2.8-2.8 4.6 2.5 4-1.7z"
          fill="#f1e5c6"
          stroke={INK}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <circle cx={207} cy={71} r={5} fill="white" stroke={INK} strokeWidth={2} />
      </motion.g>
      {/* plant, growing */}
      <path d="M380 282 L376 254 H412 L408 282 Z" fill="#e7a977" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <motion.g style={{ originX: 0.5, originY: 1 }} animate={{ scale: [0.75, 1, 0.75] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M394 254 C394 230 392 214 396 196" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        <path d="M395 228 C380 224 374 212 378 204 C388 206 396 214 395 228 Z" fill="#86efac" stroke={INK} strokeWidth={2.2} />
        <path d="M396 214 C410 208 418 196 414 188 C404 190 396 200 396 214 Z" fill="#86efac" stroke={INK} strokeWidth={2.2} />
        <path d="M396 198 C394 186 398 178 404 174 C406 184 402 194 396 198 Z" fill="#86efac" stroke={INK} strokeWidth={2.2} />
      </motion.g>
      {/* water */}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M${383 + i * 4} 196 q-2 4 0 6 q2 -2 0 -6`}
          fill="#60a5fa"
          animate={{ y: [0, 40], opacity: [0, 1, 0] }}
          transition={{ duration: 1, delay: i * 0.3, repeat: Infinity, ease: "easeIn" }}
        />
      ))}
      <MiniMe x={250} y={86} pose="water" hold="can" />
    </>
  );
}

const SCENES = [ListenScene, PrototypeScene, ShipScene, ImproveScene];

export function ProcessScene({ step }: { step: number }) {
  const Scene = SCENES[Math.max(0, Math.min(SCENES.length - 1, step))];
  return (
    <svg viewBox="0 0 440 300" className="block h-full w-full" role="img" aria-label="An illustration of the current step">
      <path d="M0 282.5 H440" stroke={INK} strokeOpacity={0.15} strokeWidth={1.5} />
      <AnimatePresence mode="wait">
        <motion.g key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.45, ease }}>
          <Scene />
        </motion.g>
      </AnimatePresence>
    </svg>
  );
}
