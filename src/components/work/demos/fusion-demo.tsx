"use client";

import { useMemo, useState } from "react";

/* The Fusion SO Import Generator's planning rules (app/generator.py), on a tiny made-up master:
 * - SHIP TO must match a SHIP_TO site (dealer code), SOLD TO a BILL_TO customer number, or the row is skipped with an error;
 * - each material maps to an order type; unknown material = error for that cell;
 * - one order per (ID Mobo, Ship To, Sold To, order type), each with one line per material;
 * - Source Transaction Identifier = <circle><YYYYMMDD><3-digit sequence>;
 *   Source Transaction Number = <order-type code><SS code 4><circle code><9-digit running number>. */

const SHIP_TO = new Set(["DLR011", "DLR021", "DLR031"]);
const SOLD_TO = new Set(["1040037", "1040074", "1040111"]);
const MATERIALS: Record<string, { name: string; type: string; code: string }> = {
  "9100000101": { name: "SP 5GB", type: "ZDPR", code: "21" },
  "9100000102": { name: "SP 10GB", type: "ZDPR", code: "21" },
  "9100000201": { name: "Voucher 3GB", type: "ZDVC", code: "12" },
};
const COLS = ["9100000101", "9100000102", "9100000201", "9100009999"];
const RUN_DATE = "20261115"; // YYYYMMDD used in the generated identifiers

type Row = { mobo: string; sold: string; ship: string; qty: (number | null)[] };
const START: Row[] = [
  { mobo: "MOBO70101", sold: "1040037", ship: "DLR011", qty: [300, 50, 100, null] },
  { mobo: "MOBO70102", sold: "1040074", ship: "DLR021", qty: [150, null, null, null] },
  { mobo: "MOBO70103", sold: "1040111", ship: "DLR031", qty: [null, 200, 80, null] },
];

export function FusionDemo() {
  const [rows, setRows] = useState<Row[]>(START);
  // a fixed run date, like the rest of the made-up data: reading the clock while rendering breaks the static prerender
  const ymd = RUN_DATE;

  const { orders, errors } = useMemo(() => {
    const errors: string[] = [];
    const map = new Map<string, { mobo: string; ship: string; type: string; code: string; lines: string[] }>();
    rows.forEach((r, i) => {
      const at = `Row ${i + 12}`;
      if (!SHIP_TO.has(r.ship)) return void errors.push(`${at}: Ship To '${r.ship}' not found in the customer master (SHIP_TO).`);
      if (!SOLD_TO.has(r.sold)) return void errors.push(`${at}: Sold To '${r.sold}' not found in the customer master (BILL_TO).`);
      r.qty.forEach((q, j) => {
        if (!q) return;
        const m = MATERIALS[COLS[j]];
        if (!m) return void errors.push(`${at}: material ${COLS[j]} isn't configured for IM3.`);
        const key = `${r.mobo}|${r.ship}|${r.sold}|${m.type}`;
        const o = map.get(key) ?? { mobo: r.mobo, ship: r.ship, type: m.type, code: m.code, lines: [] };
        o.lines.push(`${m.name} × ${q}`);
        map.set(key, o);
      });
    });
    const counters: Record<string, number> = {};
    const orders = [...map.values()].map((o, i) => {
      counters[o.code] = (counters[o.code] ?? 0) + 1;
      return { ...o, id: `Kalisumapa${ymd}${String(i + 1).padStart(3, "0")}`, number: `${o.code}44${String(counters[o.code]).padStart(9, "0")}` };
    });
    return { orders, errors };
  }, [rows, ymd]);

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const setQty = (i: number, j: number, v: string) => set(i, { qty: rows[i].qty.map((q, k) => (k === j ? (v === "" ? null : Math.max(0, +v || 0)) : q)) });

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-[22px] border border-line bg-white">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="font-mono text-[11px] tracking-[0.06em] text-ink/50 uppercase">
              <th className="px-3 py-3 text-left font-medium">MPC ID Mobo</th>
              <th className="px-3 py-3 text-left font-medium">Sold To</th>
              <th className="px-3 py-3 text-left font-medium">Ship To</th>
              {COLS.map((c) => (
                <th key={c} className="px-3 py-3 text-right font-medium">
                  {c}
                  <span className="block text-[10px] normal-case text-ink/40">{MATERIALS[c]?.name ?? "not configured"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.mobo} className="border-t border-line">
                <td className="px-3 py-2 font-mono">{r.mobo}</td>
                <td className="px-3 py-2">
                  <input value={r.sold} onChange={(e) => set(i, { sold: e.target.value.trim() })} className="w-24 rounded-lg bg-[#f6f6fd] px-2 py-1 font-mono" aria-label={`Sold To row ${i + 1}`} />
                </td>
                <td className="px-3 py-2">
                  <input value={r.ship} onChange={(e) => set(i, { ship: e.target.value.trim().toUpperCase() })} className="w-24 rounded-lg bg-[#f6f6fd] px-2 py-1 font-mono" aria-label={`Ship To row ${i + 1}`} />
                </td>
                {r.qty.map((q, j) => (
                  <td key={j} className="px-3 py-2 text-right">
                    <input inputMode="numeric" value={q ?? ""} onChange={(e) => setQty(i, j, e.target.value)} className="w-16 rounded-lg bg-[#f6f6fd] px-2 py-1 text-right tabular-nums" aria-label={`Quantity row ${i + 1} ${COLS[j]}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line px-3 py-2.5 font-mono text-[11px] text-ink/50">Try: change a Ship To to DLR991, or type a quantity under 9100009999.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[22px] bg-ink p-5 text-white">
          <p className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">Orders to be created · {orders.length}</p>
          <div className="mt-3 flex flex-col gap-2">
            {orders.map((o) => (
              <div key={o.id} className="rounded-xl bg-white/[0.07] p-3 font-mono text-[12px]">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-white">{o.id}</span>
                  <span className="rounded-full bg-gradient-to-r from-[#8b7cf6] to-[#e56bb5] px-2 text-[11px]">{o.type}</span>
                </div>
                <p className="mt-1 text-white/55">
                  {o.number} · {o.mobo} → {o.ship}
                </p>
                <p className="mt-1 text-white/80">{o.lines.join(" · ")}</p>
              </div>
            ))}
            {!orders.length && <p className="text-[13px] text-white/55">Nothing valid to generate.</p>}
          </div>
        </div>
        <div className="rounded-[22px] border border-line bg-white p-5">
          <p className="font-mono text-[11px] tracking-[0.14em] text-[#c0264b] uppercase">Errors (skipped) · {errors.length}</p>
          <ul className="mt-3 flex flex-col gap-2 text-[13px] text-ink-2/80">
            {errors.map((e) => (
              <li key={e} className="rounded-xl bg-[#fde8ee] px-3 py-2">
                {e}
              </li>
            ))}
            {!errors.length && <li className="text-ink/50">None. Every row matched the master.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
