"use client";

import { useState } from "react";

/* The interview-start GPS check from lib/gps-validate.ts, in its order: accuracy limit, fake location, then the
 * assignment area with a margin equal to the fix's own accuracy (never more than 100 m). */

const R = 300; // assignment radius, metres
const SCALE = 0.3; // px per metre in the drawing
const C = { x: 150, y: 130 };

export function AreaCheck() {
  const [d, setD] = useState(360);
  const [acc, setAcc] = useState(40);
  const [maxAcc, setMaxAcc] = useState<number | null>(50);
  const [mode, setMode] = useState<"WARN" | "BLOCK">("BLOCK");
  const [mocked, setMocked] = useState(false);

  const margin = Math.min(100, acc);
  let result: { ok: boolean; code: string; msg: string };
  if (maxAcc != null && acc > maxAcc) {
    result = { ok: false, code: "LOW_ACCURACY", msg: `GPS accuracy still low (±${acc} m, limit ${maxAcc} m). Wait a moment in the open, then try again.` };
  } else if (mocked) {
    result = { ok: false, code: "MOCKED", msg: "Fake location detected. Turn off the location-faking app and try again." };
  } else if (d > R + margin) {
    result =
      mode === "BLOCK"
        ? { ok: false, code: "OUTSIDE_AREA", msg: "You're outside the assignment area. Move closer, then try again." }
        : { ok: true, code: "WARN", msg: "Outside the assignment area: the interview goes ahead, flagged for review." };
  } else if (d > R) {
    result = { ok: true, code: "OK", msg: `Inside, thanks to the ${margin} m margin: the fix itself could be off by that much.` };
  } else {
    result = { ok: true, code: "OK", msg: "Inside the assignment area. The interview starts, and its position goes to the office's live map." };
  }

  const ang = (-25 * Math.PI) / 180;
  const p = { x: C.x + d * SCALE * Math.cos(ang), y: C.y + d * SCALE * Math.sin(ang) };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1fr]">
      <div className="rounded-[26px] border border-[#2088e4]/15 bg-gradient-to-br from-[#f3f9ff] to-[#e3f0fc] p-4">
        <svg viewBox="0 0 330 260" className="block h-auto w-full" role="img" aria-label={`A point ${d} m from the centre of a ${R} m assignment area, GPS accuracy ±${acc} m`}>
          <circle cx={C.x} cy={C.y} r={(R + margin) * SCALE} fill="none" stroke="#2088e4" strokeOpacity="0.35" strokeDasharray="4 4" />
          <circle cx={C.x} cy={C.y} r={R * SCALE} fill="#2088e4" fillOpacity="0.1" stroke="#2088e4" strokeWidth="1.5" />
          <text x={C.x} y={C.y + 4} textAnchor="middle" fontSize="10" fill="#1a5fa8">
            assignment · {R} m
          </text>
          <circle cx={p.x} cy={p.y} r={Math.max(3, acc * SCALE)} fill={result.ok ? "#19a974" : "#d9284a"} fillOpacity="0.15" />
          <circle cx={p.x} cy={p.y} r="5" fill={result.ok ? "#19a974" : "#d9284a"} stroke="#fff" strokeWidth="2" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#0f1f33">
            you · ±{acc} m
          </text>
          <text x="10" y="252" fontSize="9" fill="#0f1f33" fillOpacity="0.5">
            dashed ring = area + margin ({margin} m)
          </text>
        </svg>
      </div>
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="flex justify-between text-[13.5px] font-semibold">
            Distance from the area&apos;s centre <span className="font-mono font-normal text-ink/60">{d} m</span>
          </span>
          <input type="range" min={0} max={560} step={10} value={d} onChange={(e) => setD(Number(e.target.value))} className="mt-2 w-full accent-[#2088e4]" />
        </label>
        <label className="block">
          <span className="flex justify-between text-[13.5px] font-semibold">
            GPS accuracy <span className="font-mono font-normal text-ink/60">±{acc} m</span>
          </span>
          <input type="range" min={3} max={150} step={1} value={acc} onChange={(e) => setAcc(Number(e.target.value))} className="mt-2 w-full accent-[#2088e4]" />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => setMaxAcc((v) => (v == null ? 50 : null))} className="rounded-2xl border border-line bg-white px-3 py-2 text-left text-[12.5px]">
            <span className="block text-ink/50">Accuracy limit</span>
            <span className="font-semibold">{maxAcc == null ? "any" : `${maxAcc} m`}</span>
          </button>
          <button type="button" onClick={() => setMode((m) => (m === "BLOCK" ? "WARN" : "BLOCK"))} className="rounded-2xl border border-line bg-white px-3 py-2 text-left text-[12.5px]">
            <span className="block text-ink/50">Outside the area</span>
            <span className="font-semibold">{mode === "BLOCK" ? "block" : "warn"}</span>
          </button>
          <button type="button" onClick={() => setMocked((v) => !v)} aria-pressed={mocked} className={`rounded-2xl border px-3 py-2 text-left text-[12.5px] ${mocked ? "border-[#d9284a] bg-[#fde5ea]" : "border-line bg-white"}`}>
            <span className="block text-ink/50">Fake-GPS app</span>
            <span className="font-semibold">{mocked ? "on" : "off"}</span>
          </button>
        </div>
        <div className={`rounded-2xl px-4 py-3 ${result.ok ? (result.code === "WARN" ? "bg-[#fff2df] text-[#9a5b00]" : "bg-[#e3f9ec] text-[#11733a]") : "bg-[#fde5ea] text-[#b0173a]"}`} aria-live="polite">
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase">{result.ok ? (result.code === "WARN" ? "starts · flagged" : "starts") : `blocked · ${result.code}`}</p>
          <p className="mt-1 text-[14px] font-medium">{result.msg}</p>
        </div>
        <p className="text-[12px] text-ink/45">The office sets these per survey. Tap the three boxes to change them.</p>
      </div>
    </div>
  );
}
