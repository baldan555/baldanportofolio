"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ARCHS, INCIDENTS, STATUS, VERDICT, archById, type ArchId, type IncidentId, type Status } from "@/data/web-archs";
import { ArchCanvas } from "./arch-canvas";

/* The same four bad days, in every architecture: which parts go down, slow down, scale out or redeploy, what
 * customers notice and why. Below, all 24 outcomes at a glance. */
export function BreakIt() {
  const [id, setId] = useState<ArchId>("monolith");
  const [inc, setInc] = useState<IncidentId>("crash");
  const arch = archById(id);
  const o = arch.incidents[inc];
  const v = VERDICT[o.verdict];
  const used = [...new Set(Object.values(o.status))] as Status[];
  return (
    <div className="space-y-3">
      <div className="grid gap-2 rounded-[22px] border border-line bg-white p-3 md:grid-cols-[auto_1fr] md:items-center">
        <p className="text-[12px] font-semibold">Architecture</p>
        <div className="flex flex-wrap gap-1.5">
          {ARCHS.map((a) => (
            <button key={a.id} type="button" aria-pressed={a.id === id} onClick={() => setId(a.id)} className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${a.id === id ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}>
              {a.name}
            </button>
          ))}
        </div>
        <p className="text-[12px] font-semibold">What happens</p>
        <div className="flex flex-wrap gap-1.5">
          {INCIDENTS.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === inc} onClick={() => setInc(x.id)} className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${x.id === inc ? "bg-[#eb6834] text-white" : "border border-line text-ink/70 hover:border-ink"}`}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-[24px] border border-line bg-white p-3">
          <div className="overflow-x-auto rounded-[16px] bg-[#fbfaf7]">
            <div className="min-w-[560px] pt-2">
              <ArchCanvas arch={arch} status={o.status} />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 px-1">
            {used.map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[11.5px] text-ink-2/65">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[s].color }} />
                {STATUS[s].label}
              </span>
            ))}
          </div>
        </div>
        <motion.div key={`${id}-${inc}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex min-w-0 flex-col rounded-[24px] p-5" style={{ background: v.bg }}>
          <p className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] text-white uppercase" style={{ background: v.color }}>
              {v.label}
            </span>
            <span className="text-[12px] text-ink-2/60">
              {arch.name} · {INCIDENTS.find((x) => x.id === inc)?.label.toLowerCase()}
            </span>
          </p>
          <p className="mt-4 font-mono text-[10.5px] tracking-[0.14em] text-ink-2/50 uppercase">What customers see</p>
          <p className="mt-1 text-[1.25rem] leading-snug font-semibold tracking-[-0.02em]" style={{ color: v.color }}>
            {o.users}
          </p>
          <p className="mt-4 font-mono text-[10.5px] tracking-[0.14em] text-ink-2/50 uppercase">Why</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2/80">{o.why}</p>
        </motion.div>
      </div>
      <div className="overflow-x-auto rounded-[22px] border border-line bg-white">
        <table className="w-full min-w-[680px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-2.5 text-left font-mono text-[10.5px] font-normal text-ink-2/50 uppercase">all 24 outcomes</th>
              {INCIDENTS.map((x) => (
                <th key={x.id} className={`px-3 py-2.5 text-left font-semibold ${x.id === inc ? "text-[#eb6834]" : ""}`}>
                  {x.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ARCHS.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className={`px-4 py-1.5 font-semibold ${a.id === id ? "" : "text-ink-2/70"}`}>{a.name}</td>
                {INCIDENTS.map((x) => {
                  const vv = VERDICT[a.incidents[x.id].verdict];
                  const on = a.id === id && x.id === inc;
                  return (
                    <td key={x.id} className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setId(a.id);
                          setInc(x.id);
                        }}
                        aria-label={`${a.name}, ${x.label}: ${vv.label}`}
                        className={`w-full rounded-full px-2.5 py-1 text-left text-[11.5px] font-semibold transition ${on ? "ring-2 ring-ink" : "hover:ring-1 hover:ring-ink/30"}`}
                        style={{ background: vv.bg, color: vv.color }}
                      >
                        {vv.label}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">A teaching model, not a benchmark: real outcomes depend on how each system is built. Safeguards (several copies, timeouts, queues, caches) change many of these cells, and each architecture has its own set.</p>
    </div>
  );
}
