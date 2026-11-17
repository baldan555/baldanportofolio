"use client";

import { OneEuro, PINCH, nextPinch, pinchRatio } from "@/lib/virtual-mouse";
import { BLUE, FONT, HANDS, HandExplainer, HandFigure, INK, MONO, MUTED, UP, at, r1, type Hand } from "../hand";

const xy = (h: Hand) => h.map(([x, y]) => ({ x, y }));

/** An example pinch: the gap closes, wobbles near the line, opens. Shows why there are two thresholds. */
const RATIO = Array.from({ length: 90 }, (_, i) => {
  const base = i < 25 ? 0.75 - i * 0.018 : i < 60 ? 0.3 + 0.05 * Math.sin(i * 0.9) : 0.3 + (i - 60) * 0.017;
  return Math.max(0.1, base);
});
const STATE = RATIO.reduce<boolean[]>((acc, r) => [...acc, nextPinch(acc.length ? acc[acc.length - 1] : false, r)], []);
const SINGLE = RATIO.map((r) => r < PINCH.down); // one threshold only
const flips = (s: boolean[]) => s.filter((v, i) => i > 0 && v !== s[i - 1]).length;

/** Example cursor path with jitter, before and after the One Euro filter (same filter as the demo). */
const PATH = (() => {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  const f = new OneEuro();
  return Array.from({ length: 120 }, (_, i) => {
    const t = i * 33;
    const truth = i < 40 ? 120 : i < 75 ? 120 + (i - 40) * 7 : 365;
    const raw = truth + rand() * 26;
    return { raw, smooth: f.filter(raw, t) };
  });
})();

export function render(step: number, hand: Hand) {
  if (step === 2) {
    const [tx, ty] = at(hand, 4, 320, 360, 100);
    const [ix, iy] = at(hand, 8, 320, 360, 100);
    const mx = r1((tx + ix) / 2);
    const my = r1((ty + iy) / 2);
    return (
      <g>
        <HandFigure hand={hand} x={320} y={360} s={100} hi={[4, 8]} />
        <line x1={tx} y1={ty} x2={ix} y2={iy} stroke={UP} strokeWidth={2} strokeDasharray="4 3" />
        <circle cx={mx} cy={my} r={12} fill="none" stroke={INK} strokeWidth={3} />
        <circle cx={mx} cy={my} r={3} fill={INK} />
        <text x={mx + 18} y={my + 4} fontSize={12} fontFamily={FONT} fill={INK} fontWeight={600}>
          cursor
        </text>
      </g>
    );
  }
  if (step === 3) {
    const pair: [string, Hand][] = [
      ["open", HANDS.L],
      ["pinched", HANDS.F],
    ];
    return (
      <g>
        {pair.map(([name, h], k) => {
          const x = 180 + k * 280;
          const r = pinchRatio(xy(h));
          const [tx, ty] = at(h, 4, x, 330, 86);
          const [ix, iy] = at(h, 8, x, 330, 86);
          const [mx, my] = at(h, 9, x, 330, 86);
          return (
            <g key={name}>
              <HandFigure hand={h} x={x} y={330} s={86} hi={[4, 8]} />
              <line x1={tx} y1={ty} x2={ix} y2={iy} stroke={UP} strokeWidth={3} />
              <line x1={x} y1={330} x2={mx} y2={my} stroke={BLUE} strokeWidth={3} strokeDasharray="5 3" />
              <text x={x} y={372} fontSize={13} fontFamily={FONT} textAnchor="middle" fill={INK} fontWeight={700}>
                {r.toFixed(2)} {r < PINCH.down ? "→ pinched" : "→ open"}
              </text>
              <text x={x} y={392} fontSize={10.5} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
                {name.toUpperCase()} · AVERAGE “{k ? "F" : "L"}” HAND
              </text>
            </g>
          );
        })}
        <text x={320} y={40} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={MUTED}>
          <tspan fill={UP}>THUMB–INDEX GAP</tspan> ÷ <tspan fill={BLUE}>PALM LENGTH</tspan>
        </text>
      </g>
    );
  }
  if (step === 4) {
    const x = (i: number) => r1(60 + (i / (RATIO.length - 1)) * 540);
    const y = (v: number) => r1(330 - (v / 0.8) * 260);
    return (
      <g>
        <text x={60} y={40} fontSize={11} fontFamily={MONO} fill={MUTED}>
          GAP ÷ PALM OVER AN EXAMPLE PINCH
        </text>
        {STATE.map((s, i) => (s ? <rect key={i} x={x(i)} y={70} width={6.2} height={260} fill={UP} opacity={0.12} /> : null))}
        <line x1={60} x2={600} y1={y(PINCH.down)} y2={y(PINCH.down)} stroke={UP} strokeDasharray="5 4" />
        <line x1={60} x2={600} y1={y(PINCH.up)} y2={y(PINCH.up)} stroke={MUTED} strokeDasharray="5 4" />
        <text x={604} y={y(PINCH.down) + 4} fontSize={10} fontFamily={MONO} fill={UP}>
          {PINCH.down} close
        </text>
        <text x={604} y={y(PINCH.up) + 4} fontSize={10} fontFamily={MONO} fill={MUTED}>
          {PINCH.up} open
        </text>
        <path d={RATIO.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")} fill="none" stroke={INK} strokeWidth={2} />
        <text x={60} y={370} fontSize={12} fontFamily={FONT} fill={INK}>
          Two thresholds: the pinch changes state {flips(STATE)} times. With only the {PINCH.down} line: {flips(SINGLE)} times, a stutter of clicks.
        </text>
      </g>
    );
  }
  if (step === 5) {
    const x = (i: number) => r1(60 + (i / (PATH.length - 1)) * 540);
    return (
      <g>
        <text x={60} y={40} fontSize={11} fontFamily={MONO} fill={MUTED}>
          CURSOR POSITION: STILL, A QUICK MOVE, STILL (EXAMPLE JITTER)
        </text>
        <path d={PATH.map((p, i) => `${i ? "L" : "M"}${x(i)},${r1(400 - p.raw)}`).join(" ")} fill="none" stroke="rgba(11,11,11,0.3)" strokeWidth={1.4} />
        <path d={PATH.map((p, i) => `${i ? "L" : "M"}${x(i)},${r1(400 - p.smooth)}`).join(" ")} fill="none" stroke={UP} strokeWidth={2.6} />
        <text x={60} y={420} fontSize={11.5} fontFamily={FONT} fill={INK}>
          <tspan fill="rgba(11,11,11,0.5)">grey: raw</tspan> · <tspan fill={UP}>orange: One Euro filter</tspan>, calm when still, quick when moving
        </text>
      </g>
    );
  }
  // step 6: events
  const ev = ["pointerdown", "pointermove", "pointermove", "pointerup", "click"];
  return (
    <g>
      <text x={60} y={60} fontSize={11} fontFamily={MONO} fill={MUTED}>
        WHAT THE PAGE RECEIVES
      </text>
      {ev.map((e, i) => (
        <g key={i} transform={`translate(${60 + i * 112}, 150)`}>
          <rect width={100} height={56} rx={10} fill={e === "click" ? INK : "#fff"} stroke="rgba(11,11,11,0.15)" />
          <text x={50} y={33} fontSize={11.5} fontFamily={MONO} textAnchor="middle" fill={e === "click" ? "#fff" : INK}>
            {e}
          </text>
          <text x={50} y={78} fontSize={10.5} fontFamily={FONT} textAnchor="middle" fill={MUTED}>
            {["pinch closes", "hand moves", "hand moves", "pinch opens", "short and still"][i]}
          </text>
        </g>
      ))}
      <text x={60} y={300} fontSize={12} fontFamily={FONT} fill={INK}>
        Ordinary pointer events, so the page&apos;s buttons, sliders and drawing pad react as if a mouse did it.
      </text>
    </g>
  );
}

export function Inside() {
  return (
    <HandExplainer
      title="From a hand to a click."
      line="Two pretrained networks from Google find the hand and its 21 points; everything after that is plain geometry I wrote. Scroll through the pipeline."
      picks={[
        { id: "L", hand: HANDS.L, tag: "open" },
        { id: "F", hand: HANDS.F, tag: "pinched" },
        { id: "B", hand: HANDS.B, tag: "flat" },
      ]}
      steps={[
        {
          t: "The cursor sits between two fingertips",
          d: "Halfway between the thumb tip (4) and index tip (8), mirrored like a selfie. When you pinch, both tips meet in the middle, so the click lands where you aimed.",
        },
        { t: "A pinch is a ratio", d: "The gap between the tips divided by the palm's length: the same number near the camera or far away. These two are the dataset's average “L” and “F” hands." },
        { t: "Two thresholds, not one", d: `Close below ${PINCH.down}, open only above ${PINCH.up}. A hand hovering near a single line would click on and off.` },
        { t: "Smooth the jitter", d: "Landmarks shake by a few pixels every frame. A One Euro filter smooths hard when the hand is still and barely at all when it moves fast." },
        { t: "Turn it into real events", d: "A pinch becomes pointerdown, moving becomes pointermove, opening becomes pointerup, and a short, still pinch also sends a click." },
      ]}
      render={render}
    />
  );
}
