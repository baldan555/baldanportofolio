"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

const INK = "var(--ink)";
const SW = 3.2;
const JACKET = "#f1e5c6"; // cream brocade
const JACKET_LINE = "#c7ad72";
export const SKIN = "#fdddc1"; // light cream
export const SKIN_SHADE = "#f9b3a3"; // pink blush
const CHIN_SHADOW = "#e6c1a3";
/** Head shapes in the portrait's head space (face box x 138–262, y 120–298); mini-me.tsx scales the same shapes down. */
export const FACE = "M138 196 C138 150 166 120 200 120 C234 120 262 150 262 196 C262 226 262 248 254 266 C244 286 224 298 200 298 C176 298 156 286 146 266 C138 248 138 226 138 196 Z";
/** Thick, wavy hair swept up and to the right: a flick out on the left, a curl and two flicks on the right, a wavy fringe on the left. */
export const HAIR = "M116 207 C108 200 104 192 103 182 C98 172 97 160 100 150 C102 142 106 137 112 133 L106 123 C116 123 126 119 134 115 C142 106 152 98 164 94 C176 90 188 88 196 86 Q200 80 207 77 C222 71 240 73 250 81 C258 87 262 95 262 104 C270 118 282 124 286 134 C291 144 292 151 293 158 C296 166 300 174 302 180 C296 184 292 186 290 188 C288 196 284 204 282 206 L278 216 C272 214 266 214 261 214 C258 206 256 198 254 190 C250 180 246 174 240 168 C234 162 224 158 215 157 C208 157 204 159 200 162 C192 168 182 176 170 180 C160 184 150 186 145 190 C140 196 138 206 136 217 C130 216 122 213 116 207 Z";
/** Grey waves through the hair (stroked white, low opacity). */
export const HAIR_STRANDS = "M198 86 C206 81 214 79 222 79 M158 111 Q166 106 176 105 M151 134 C166 134 178 128 188 121 C198 114 208 111 218 110 M139 161 C144 168 150 172 164 168 M155 162 C170 160 190 156 206 147 C214 143 222 138 230 135 M255 146 C261 152 266 162 270 177";
/** The small curl dropping onto the forehead (thin, stroked). */
export const HAIR_CURL = "M203 160 C209 156 219 157 224 163 C227 168 224 172 216 172";
/** The curl hooking out on the right side (thick, stroked). */
export const HAIR_LOCK = "M266 110 C280 108 291 118 289 130 C288 137 281 138 280 132";
const EYES = "M160 211 Q174 199 188 211 Q174 219 160 211 Z M214 211 Q228 199 242 211 Q228 219 214 211 Z";

/**
 * Line-art portrait of Baldan: thick wavy hair swept up and to the right, light
 * cream skin, a broad face with a rounded-square jaw, thick angled brows, no
 * glasses, cream brocade jacket with a mandarin collar. Head, face and pupils follow the cursor with layered parallax (face
 * moves more than the skull → reads as a head turn). Blinks on its own; click
 * it and it smiles with its eyes.
 */
export function Character({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 110, damping: 16, mass: 0.7 });
  const sy = useSpring(my, { stiffness: 110, damping: 16, mass: 0.7 });
  const [happy, setHappy] = useState(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.4;
      mx.set(Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.45))));
      my.set(Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.5))));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  const headX = useTransform(sx, (v) => v * 8);
  const headY = useTransform(sy, (v) => v * 5);
  const headR = useTransform(sx, (v) => v * 4);
  const hairX = useTransform(sx, (v) => v * 3);
  const earX = useTransform(sx, (v) => v * -3);
  const faceX = useTransform(sx, (v) => v * 12);
  const faceY = useTransform(sy, (v) => v * 8);
  const pupilX = useTransform(sx, (v) => v * 4);
  const pupilY = useTransform(sy, (v) => v * 3);
  const bodyX = useTransform(sx, (v) => v * 2);

  const poke = () => {
    setHappy(true);
    setTimeout(() => setHappy(false), 1300);
  };

  const brocade = `brocade-${uid}`;

  return (
    <div ref={ref} className={className} data-cursor="Hi!" onClick={poke}>
      <svg viewBox="0 0 400 460" className="h-full w-full overflow-visible" role="img" aria-label="Illustration of Baldan">
        <defs>
          {/* soft brocade motif for the jacket */}
          <pattern id={brocade} width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
            <path d="M3 15 C3 7 13 7 13 15 C13 22 21 22 21 15 C21 10 26 9 28 12" fill="none" stroke={JACKET_LINE} strokeWidth="1.3" strokeLinecap="round" opacity="0.75" />
            <path d="M15 2 C18 5 18 8 15 10 C12 8 12 5 15 2 Z" fill={JACKET_LINE} opacity="0.45" />
            <circle cx="26" cy="26" r="1.4" fill={JACKET_LINE} opacity="0.6" />
          </pattern>
        </defs>

        {/* ---------------- body ---------------- */}
        <motion.g style={{ x: bodyX }} animate={{ y: [0, 2, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          {/* jacket */}
          <path d="M54 462 C58 392 104 356 160 344 L240 344 C296 356 342 392 346 462 Z" fill={JACKET} />
          <path d="M54 462 C58 392 104 356 160 344 L240 344 C296 356 342 392 346 462 Z" fill={`url(#${brocade})`} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          {/* sleeve seams */}
          <path d="M112 380 C120 410 122 436 120 462" fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
          <path d="M288 380 C280 410 278 436 280 462" fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />

          {/* neck */}
          <path d="M170 282 L170 346 Q200 362 230 346 L230 282" fill={SKIN} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          {/* shadow under the jaw */}
          <path d="M170 302 C182 322 218 322 230 302 L230 320 C216 334 184 334 170 320 Z" fill={CHIN_SHADOW} />

          {/* grey tee peeking through the opening */}
          <path d="M196 352 L212 352 L210 378 L198 378 Z" fill="#c9c9c6" stroke={INK} strokeWidth="2" strokeLinejoin="round" />

          {/* mandarin collar */}
          <path d="M160 346 L166 320 Q182 342 200 352 L200 372 Q178 366 160 346 Z" fill={JACKET} />
          <path d="M160 346 L166 320 Q182 342 200 352 L200 372 Q178 366 160 346 Z" fill={`url(#${brocade})`} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M240 346 L234 320 Q218 342 208 352 L208 372 Q222 366 240 346 Z" fill={JACKET} />
          <path d="M240 346 L234 320 Q218 342 208 352 L208 372 Q222 366 240 346 Z" fill={`url(#${brocade})`} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />

          {/* front opening + ornamental button */}
          <path d="M208 372 L210 462" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
          <circle cx="209" cy="402" r="8.5" fill="white" stroke={INK} strokeWidth="2.4" />
          <circle cx="209" cy="402" r="4.2" fill={INK} />
          <circle cx="209" cy="402" r="1.4" fill={JACKET} />
        </motion.g>

        {/* ---------------- head ---------------- */}
        <g transform="translate(0 24)">
          <motion.g style={{ x: headX, y: headY, rotate: headR, originX: 0.5, originY: 1 }}>
            {/* ears */}
            <motion.g style={{ x: earX }}>
              <ellipse cx="128" cy="228" rx="12" ry="20" fill={SKIN} stroke={INK} strokeWidth={SW} />
              <path d="M131 218 Q121 228 129 240" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
              <ellipse cx="272" cy="228" rx="12" ry="20" fill={SKIN} stroke={INK} strokeWidth={SW} />
              <path d="M269 218 Q279 228 271 240" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
            </motion.g>

            {/* face: broad, full cheeks, a rounded-square jaw */}
            <path d={FACE} fill={SKIN} stroke={INK} strokeWidth={SW} />

            <motion.g style={{ x: faceX, y: faceY }}>
              {/* thick brows, angled down toward the nose */}
              <motion.path d="M157 193 Q180 184 193 198" fill="none" stroke={INK} strokeWidth={6.5} strokeLinecap="round" animate={{ y: happy ? -4 : 0 }} />
              <motion.path d="M209 198 Q222 184 245 193" fill="none" stroke={INK} strokeWidth={6.5} strokeLinecap="round" animate={{ y: happy ? -4 : 0 }} />

              {/* eyes */}
              {happy ? (
                <g>
                  <path d="M161 213 Q174 201 187 213" fill="none" stroke={INK} strokeWidth={3.6} strokeLinecap="round" />
                  <path d="M215 213 Q228 201 241 213" fill="none" stroke={INK} strokeWidth={3.6} strokeLinecap="round" />
                </g>
              ) : (
                <motion.g
                  style={{ originY: 0.5 }}
                  animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
                  transition={{ duration: 4.8, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}
                >
                  <defs>
                    <clipPath id={`eyes-${uid}`}>
                      <path d={EYES} />
                    </clipPath>
                  </defs>
                  <path d={EYES} fill="white" />
                  <g clipPath={`url(#eyes-${uid})`}>
                    <motion.g style={{ x: pupilX, y: pupilY }}>
                      <circle cx="174" cy="210.5" r="5.4" fill={INK} />
                      <circle cx="228" cy="210.5" r="5.4" fill={INK} />
                      <circle cx="176" cy="208.6" r="1.5" fill="white" />
                      <circle cx="230" cy="208.6" r="1.5" fill="white" />
                    </motion.g>
                  </g>
                  <path d={EYES} fill="none" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
                  <path d="M158 211.5 Q174 197 190 210 M212 210 Q228 197 244 211.5" fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
                </motion.g>
              )}

              {/* nose */}
              <path d="M204 219 Q208 228 210 233 Q213 239 205 240 Q197 241 192 234" fill="none" stroke={INK} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />

              {/* closed smile, a short lower-lip line */}
              <motion.path
                fill={happy ? INK : "none"}
                stroke={INK}
                strokeWidth={SW}
                strokeLinecap="round"
                animate={{ d: happy ? "M180 249 Q198 276 217 249 Z" : "M180 251 Q198 266 217 251" }}
                transition={{ duration: 0.25 }}
              />
              <path d="M191 263 Q197 267 204 264" fill="none" stroke={INK} strokeOpacity={0.6} strokeWidth={2.2} strokeLinecap="round" />

              {/* pink blush */}
              <ellipse cx="160" cy="238" rx="11" ry="6" fill={SKIN_SHADE} opacity={0.6} />
              <ellipse cx="240" cy="240" rx="11" ry="6" fill={SKIN_SHADE} opacity={0.6} />
            </motion.g>

            {/* thick wavy hair, swept up and to the right */}
            <motion.g style={{ x: hairX }}>
              <path d={HAIR} fill={INK} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
              <path d={HAIR_LOCK} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
              <path d={HAIR_STRANDS} fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round" />
              <path d={HAIR_CURL} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
            </motion.g>
          </motion.g>
        </g>
      </svg>
    </div>
  );
}
