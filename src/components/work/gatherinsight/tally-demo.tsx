"use client";

import { Undo2 } from "lucide-react";
import { useState } from "react";

/* The Mobility counter's engine (lib/geo/tally.ts) in miniature: every tap is an event, an undo is a CORRECTION event
 * pointing at the tap it cancels, and totals and 15-minute bins are always computed from the events.
 * Bins sit on the clock: a 06:07 start reports 06:00–06:15, observed for 8 of its 15 minutes. */

const CLASSES = [
  { k: "MC", h: "motorcycle" },
  { k: "LV", h: "car, pickup" },
  { k: "HV", h: "bus, truck" },
  { k: "UM", h: "bicycle, cart" },
] as const;
type Cls = (typeof CLASSES)[number]["k"];
type Ev = { id: number; kind: "TAP" | "CORRECTION"; cls: Cls; dir: "A" | "B"; at: number; corrects?: number };

const START = 6 * 3600 + 7 * 60; // 06:07:00, seconds since midnight
const BIN = 15 * 60;
const hhmm = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
const hhmmss = (s: number) => `${hhmm(s)}:${String(s % 60).padStart(2, "0")}`;
/** seconds between two simulated vehicles */
const gap = () => 6 + Math.round(Math.random() * 10);

export function TallyDemo() {
  // events and the clock change together, so quick taps never read a stale time
  const [{ events, clock }, setTally] = useState<{ events: Ev[]; clock: number }>({ events: [], clock: START });
  const [dir, setDir] = useState<"A" | "B">("A");

  const cancelled = new Set(events.filter((e) => e.kind === "CORRECTION").map((e) => e.corrects));
  const live = events.filter((e) => e.kind === "TAP" && !cancelled.has(e.id));
  const total = (c: Cls) => live.filter((e) => e.cls === c).length;

  const tap = (cls: Cls) => {
    const step = gap();
    setTally((t) => ({ clock: t.clock + step, events: [...t.events, { id: t.events.length + 1, kind: "TAP", cls, dir, at: t.clock + step }] }));
  };
  // the newest tap that hasn't been cancelled yet
  const undo = () =>
    setTally((t) => {
      const gone = new Set(t.events.filter((e) => e.kind === "CORRECTION").map((e) => e.corrects));
      const last = [...t.events].reverse().find((e) => e.kind === "TAP" && !gone.has(e.id));
      return last ? { ...t, events: [...t.events, { id: t.events.length + 1, kind: "CORRECTION", cls: last.cls, dir: last.dir, at: t.clock, corrects: last.id }] } : t;
    });

  const origin = Math.floor(START / BIN) * BIN;
  const lastBin = Math.floor(clock / BIN) * BIN;
  const bins: { from: number; observed: number; n: number }[] = [];
  for (let b = origin; b <= lastBin; b += BIN) {
    const observed = Math.min(clock, b + BIN) - Math.max(START, b);
    bins.push({ from: b, observed: Math.max(0, observed), n: live.filter((e) => e.at >= b && e.at < b + BIN).length });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="rounded-[26px] border border-[#2088e4]/15 bg-gradient-to-br from-[#f3f9ff] to-[#e3f0fc] p-4">
        <div className="rounded-2xl bg-[#0f1f33] px-4 py-2.5 text-white">
          <p className="font-mono text-[18px] font-bold">{hhmmss(clock)}</p>
          <p className="font-mono text-[11px] text-white/55">started 06:07 · interval 15 min</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["A", "B"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDir(d)}
              aria-pressed={dir === d}
              className={`rounded-full py-1.5 text-[13px] font-semibold transition ${dir === d ? "bg-[#2088e4] text-white" : "border border-[#2088e4]/30 bg-white text-[#1a5fa8]"}`}
            >
              Direction {d} · {live.filter((e) => e.dir === d).length}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {CLASSES.map((c) => (
            <button
              key={c.k}
              type="button"
              onClick={() => tap(c.k)}
              className="flex h-24 flex-col justify-between rounded-2xl border border-[#2088e4]/15 bg-white p-3 text-left transition active:scale-[0.97] active:bg-[#f3f9ff]"
            >
              <span className="text-[17px] font-extrabold">{c.k}</span>
              <span className="font-mono text-[24px] leading-none font-bold text-[#1a5fa8]">{total(c.k)}</span>
              <span className="text-[11px] text-ink/45">{c.h}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={undo} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink/15 bg-white py-2 text-[13px] font-semibold text-ink/70">
            <Undo2 className="h-4 w-4" /> Undo
          </button>
          <button type="button" onClick={() => setTally((t) => ({ ...t, clock: t.clock + 5 * 60 }))} className="rounded-xl border border-ink/15 bg-white py-2 text-[13px] font-semibold text-ink/70">
            +5 minutes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[22px] border border-line bg-white p-4">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Event log · saved before the screen updates</p>
          {events.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-ink/50">Tap a vehicle class.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-1 font-mono text-[12px]">
              {events
                .slice(-8)
                .reverse()
                .map((e) => (
                  <li key={e.id} className={e.kind === "CORRECTION" ? "text-[#b0173a]" : cancelled.has(e.id) ? "text-ink/35 line-through" : "text-ink/75"}>
                    {hhmmss(e.at)} {e.kind === "TAP" ? `TAP ${e.cls} dir ${e.dir}` : `CORRECTION of #${e.corrects}`}
                  </li>
                ))}
            </ol>
          )}
          <p className="mt-3 text-[12px] text-ink/45">Undo never deletes. The office sees every correction, and too many is a review flag.</p>
        </div>
        <div className="rounded-[22px] border border-line bg-white p-4">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">15-minute bins · computed from events</p>
          <table className="mt-3 w-full text-[13px]">
            <tbody>
              {bins.map((b) => (
                <tr key={b.from} className="border-t border-line first:border-t-0">
                  <td className="py-1.5 font-mono">
                    {hhmm(b.from)}–{hhmm(b.from + BIN)}
                  </td>
                  <td className="py-1.5 text-right font-semibold">{b.n}</td>
                  <td className="py-1.5 pl-3 text-right text-[11.5px] text-ink/50">
                    {b.from + BIN > clock ? `running · ${Math.floor(b.observed / 60)}:${String(b.observed % 60).padStart(2, "0")}` : b.observed >= BIN ? "full" : `${Math.round(b.observed / 60)} of 15 min`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-ink/45">Bins sit on the clock, so counts from different sites line up. A partly watched bin says so instead of looking quiet.</p>
        </div>
      </div>
    </div>
  );
}
