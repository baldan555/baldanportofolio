"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type Cell = string | number | null;
export type TRow = { id: string; cells: Cell[] };
export type TableStep = { columns: string[]; before: TRow[]; after: TRow[]; afterColumns?: string[]; labels?: [string, string] };

const show = (v: Cell) => (v === null ? "null" : typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : v);

/**
 * Before → after for a table: rows that will be removed turn red and leave, new rows arrive green, cells that change
 * turn orange. Plays on its own while on screen; the two buttons pin a side.
 */
export function TableAnim({ columns, before, after, afterColumns, labels = ["Before", "After"] }: TableStep) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px" });
  const [phase, setPhase] = useState<0 | 1>(0);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (!inView || pinned) return;
    const id = setInterval(() => setPhase((p) => (p ? 0 : 1)), 2600);
    return () => clearInterval(id);
  }, [inView, pinned]);

  const afterIds = new Set(after.map((r) => r.id));
  const beforeMap = new Map(before.map((r) => [r.id, r]));
  const rows = phase ? after : before;
  const cols = phase ? (afterColumns ?? columns) : columns;
  const newCols = new Set(afterColumns ? afterColumns.filter((c) => !columns.includes(c)) : []);

  return (
    <div ref={ref} className="text-[11px]">
      <div className="mb-1.5 flex gap-1">
        {labels.map((l, i) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              setPinned(true);
              setPhase(i as 0 | 1);
            }}
            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-[0.08em] uppercase transition-colors ${phase === i ? "bg-ink text-white" : "bg-ink/5 text-ink/50 hover:text-ink"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  className={`border-b border-line px-1.5 py-1 text-left font-mono text-[9.5px] font-semibold whitespace-nowrap ${phase && newCols.has(c) ? "bg-[#1baf7a]/15 text-[#138a60]" : "text-ink/60"}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((r) => {
                const leaving = !phase && !afterIds.has(r.id);
                const arriving = phase && !beforeMap.has(r.id);
                const prev = beforeMap.get(r.id);
                return (
                  <motion.tr
                    key={r.id}
                    layout
                    initial={{ opacity: 0, backgroundColor: "rgba(27,175,122,0.18)" }}
                    animate={{ opacity: 1, backgroundColor: leaving ? "rgba(227,73,72,0.12)" : arriving ? "rgba(27,175,122,0.14)" : "rgba(255,255,255,0)" }}
                    exit={{ opacity: 0, backgroundColor: "rgba(227,73,72,0.2)" }}
                    transition={{ duration: 0.45 }}
                    className={`border-b border-line/60 last:border-0 ${leaving ? "text-[#c2410c] line-through" : ""}`}
                  >
                    {r.cells.map((v, j) => {
                      const changed = phase && prev && prev.cells[j] !== undefined && prev.cells[j] !== v && (afterColumns ?? columns)[j] === columns[j];
                      return (
                        <td
                          key={j}
                          className={`px-1.5 py-1 whitespace-nowrap ${typeof v === "number" ? "text-right font-mono" : ""} ${v === null ? "text-ink/30 italic" : ""} ${changed ? "bg-[#eb6834]/15 font-semibold text-[#c2410c]" : ""}`}
                        >
                          {show(v)}
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
