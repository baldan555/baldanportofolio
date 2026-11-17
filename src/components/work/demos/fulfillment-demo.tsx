"use client";

import { useState } from "react";

/* Fulfillment Manpower's rules (src/lib/metrics.ts, dates.ts, config.ts), on one made-up MC:
 * quota = number of seats; fulfillment = active / quota against a 95% target (bar green ≥ 95%, amber ≥ 85%, red below);
 * vacant days = days since the resign date; > 14 days warn (yellow), > 30 days critical (red);
 * resigning a seat empties it and starts the clock today; filling it clears the clock. */

type Seat = { id: string; role: string; person: string | null; days: number };
const START: Seat[] = [
  { id: "DSE-01", role: "DSE", person: "Seat holder A", days: 0 },
  { id: "DSE-02", role: "DSE", person: null, days: 9 },
  { id: "DSE-03", role: "DSE", person: "Seat holder B", days: 0 },
  { id: "DSF-01", role: "DSF", person: "Seat holder C", days: 0 },
  { id: "DSF-02", role: "DSF", person: null, days: 22 },
  { id: "AE-01", role: "AE", person: "Seat holder D", days: 0 },
  { id: "PRM-01", role: "Promotor", person: null, days: 41 },
  { id: "PRM-02", role: "Promotor", person: "Seat holder E", days: 0 },
];
const level = (d: number) => (d > 30 ? "critical" : d > 14 ? "warn" : "ok");
const BADGE = { critical: "bg-[#fde8e8] text-[#b91c1c]", warn: "bg-[#fef3c7] text-[#a16207]", ok: "bg-[#eef2f7] text-[#475569]" };

export function FulfillmentDemo() {
  const [seats, setSeats] = useState(START);
  const quota = seats.length;
  const active = seats.filter((s) => s.person).length;
  const vacant = seats.filter((s) => !s.person);
  const rate = quota ? active / quota : 0;
  const avg = vacant.length ? vacant.reduce((a, s) => a + s.days, 0) / vacant.length : 0;
  const critical = vacant.filter((s) => level(s.days) === "critical").length;
  const bar = rate >= 0.95 ? "bg-[#16a34a]" : rate >= 0.85 ? "bg-[#d97706]" : "bg-[#dc2626]";

  const update = (id: string, patch: Partial<Seat>) => setSeats((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Quota", quota],
          ["Active", active],
          ["Vacant", vacant.length],
          ["Avg vacant days", `${avg.toFixed(1)} d`],
          ["Critical > 30 d", critical],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-white p-4">
            <p className="font-mono text-[10.5px] tracking-[0.1em] text-ink/50 uppercase">{k}</p>
            <p className={`mt-1 text-[22px] font-semibold ${k === "Critical > 30 d" && critical ? "text-[#b91c1c]" : ""}`}>{v}</p>
          </div>
        ))}
        <div className="col-span-2 rounded-2xl border border-line bg-white p-4 sm:col-span-1">
          <p className="font-mono text-[10.5px] tracking-[0.1em] text-ink/50 uppercase">Fulfillment</p>
          <p className="mt-1 text-[22px] font-semibold">{(rate * 100).toFixed(1)}%</p>
          <div className="relative mt-2 h-2 rounded-full bg-ink/10">
            <div className={`h-2 rounded-full transition-all ${bar}`} style={{ width: `${rate * 100}%` }} />
            <span className="absolute -top-1 h-4 w-0.5 bg-ink/60" style={{ left: "95%" }} title="target 95%" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-line bg-white">
        {seats.map((s) => {
          const lv = level(s.days);
          return (
            <div key={s.id} className="grid grid-cols-1 items-center gap-3 border-b border-line px-5 py-3 last:border-0 sm:grid-cols-[110px_1fr_auto]">
              <div>
                <p className="font-mono text-[12.5px] font-semibold">{s.id}</p>
                <p className="text-[12px] text-ink/50">{s.role}</p>
              </div>
              {s.person ? (
                <p className="text-[14px]">{s.person}</p>
              ) : (
                <label className="flex items-center gap-3">
                  <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[11.5px] font-semibold ${BADGE[lv]}`}>VACANT · {s.days} d</span>
                  <input type="range" min={0} max={60} value={s.days} onChange={(e) => update(s.id, { days: +e.target.value })} className="w-full accent-[#0b5cad]" aria-label={`Days ${s.id} has been vacant`} />
                </label>
              )}
              <button
                type="button"
                onClick={() => update(s.id, s.person ? { person: null, days: 0 } : { person: "New hire", days: 0 })}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium ${s.person ? "border border-line text-ink/70 hover:text-ink" : "bg-[#0b5cad] text-white hover:bg-[#0a4f96]"}`}
              >
                {s.person ? "Resign" : "Fill"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
