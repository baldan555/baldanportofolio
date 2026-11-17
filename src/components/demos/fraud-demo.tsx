"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/bank-fraud.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { Drivers, Slider } from "./controls";

export type TxSample = (typeof model.samples)[number];

const S2 = "#eb6834";
const TOTAL = model.split.test_frauds;

/** Analyst queue: how many frauds does reviewing the top N alerts catch? `selected` explains one transaction. */
export function FraudDemo({ selected }: { selected?: TxSample | null }) {
  const [n, setN] = useState(100);
  const q = model.queue;
  const qrf = model.queue_rf;
  const at = q.reduce((best, d) => (d.n <= n ? d : best), q[0]);
  const atRf = qrf.reduce((best, d) => (d.n <= n ? d : best), qrf[0]);
  const precision = at.caught / at.n;

  const W = 420;
  const H = 250;
  const M = { l: 40, r: 10, t: 12, b: 34 };
  const sx = (v: number) => M.l + (Math.log10(v) / 3) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - (v / TOTAL) * (H - M.t - M.b);
  const path = (arr: { n: number; caught: number }[]) => arr.map((d, i) => `${i ? "L" : "M"}${sx(d.n).toFixed(1)},${sy(d.caught).toFixed(1)}`).join("");

  const explain = useMemo(() => {
    if (!selected) return null;
    const input: Record<string, number> = { log_amount: Math.log1p(selected.amount) };
    for (const k of Object.keys(model.model.numeric)) if (k.startsWith("V")) input[k] = selected[k as keyof TxSample] as number;
    const out = predict(model.model as LogRegModel, input);
    return {
      p: out.probability,
      contributions: out.contributions.map((c) => (c.feature === "log_amount" ? { ...c, feature: "Amount", value: selected.amount.toLocaleString("en-US") } : { ...c, value: Number(c.value).toFixed(2) })),
    };
  }, [selected]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-5 rounded-2xl bg-white p-5 sm:p-6">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">The analyst queue · last {model.split.test_hours} hours</p>
          <p className="text-[13.5px] text-ink-2/75">
            {model.split.test.toLocaleString("en-US")} transactions came in, {TOTAL} of them fraud. The model sorts them by score. How many can the team check?
          </p>
          <Slider label="Alerts reviewed" value={n} min={10} max={1000} step={10} onChange={setN} />
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: `${at.caught}/${TOTAL}`, l: "frauds caught" },
              { v: String(TOTAL - at.caught), l: "frauds missed" },
              { v: `${Math.round(precision * 100)}%`, l: "of alerts are fraud" },
              { v: `${(at.n / Math.max(1, at.caught)).toFixed(1)}`, l: "alerts per fraud found" },
            ].map((s) => (
              <motion.div key={s.l + s.v} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className="rounded-xl bg-cream/70 px-4 py-3">
                <p className="text-[1.7rem] leading-none font-semibold tracking-[-0.04em]">{s.v}</p>
                <p className="mt-1.5 text-[11.5px] text-ink-2/70">{s.l}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-[12px] text-muted">
            Reviewing {at.n.toLocaleString("en-US")} random transactions would find about {((at.n * TOTAL) / model.split.test).toFixed(1)} frauds. The random forest would catch {atRf.caught}.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] font-semibold">Frauds caught vs alerts reviewed</p>
            <div className="flex gap-3 text-[11.5px] text-ink-2/70">
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-4 bg-ink" /> logistic
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-4" style={{ background: S2 }} /> random forest
              </span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={M.l} x2={W - M.r} y1={sy(TOTAL * f)} y2={sy(TOTAL * f)} stroke="rgba(11,11,11,0.07)" />
                <text x={M.l - 6} y={sy(TOTAL * f) + 4} textAnchor="end" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
                  {Math.round(TOTAL * f)}
                </text>
              </g>
            ))}
            {[1, 10, 100, 1000].map((v) => (
              <text key={v} x={sx(v)} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
                {v}
              </text>
            ))}
            <text x={(W + M.l) / 2} y={H - 2} textAnchor="middle" fontSize="10.5" fill="#5f5f5a">
              alerts reviewed (log scale)
            </text>
            <path d={path(qrf)} fill="none" stroke={S2} strokeWidth={1.8} strokeDasharray="6 4" />
            <path d={path(q)} fill="none" stroke="#0b0b0b" strokeWidth={2.2} />
            <line x1={sx(at.n)} x2={sx(at.n)} y1={M.t} y2={H - M.b} stroke="#0b0b0b" strokeOpacity={0.35} />
            <circle cx={sx(at.n)} cy={sy(at.caught)} r={6} fill="#2a78d6" stroke="#fff" strokeWidth={2.5} />
            <text x={sx(at.n) + 9} y={sy(at.caught) + 4} fontSize="11.5" fontWeight={600} fill="#0b0b0b">
              {at.caught}
            </text>
          </svg>
        </div>
      </div>

      {selected && explain && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 rounded-2xl bg-white p-5 sm:p-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Transaction {selected.id}</p>
            <p className="mt-3 text-[2.6rem] leading-none font-semibold tracking-[-0.04em]">#{selected.rank.toLocaleString("en-US")}</p>
            <p className="mt-1 text-[13px] text-muted">position in the queue (score {explain.p >= 0.9999 ? "> 0.9999" : explain.p.toFixed(4)})</p>
            <p className="mt-4 rounded-xl bg-cream px-3 py-2 text-[12.5px]">
              {selected.rank <= n ? (
                <>
                  Inside today&apos;s {n.toLocaleString("en-US")} reviews. It was <b>{selected.actual === "Fraud" ? "fraud: caught" : "legitimate: a false alarm"}</b>.
                </>
              ) : (
                <>
                  Outside today&apos;s {n.toLocaleString("en-US")} reviews. It was <b>{selected.actual === "Fraud" ? "fraud: missed" : "legitimate: correctly left alone"}</b>.
                </>
              )}
            </p>
          </div>
          <div>
            <Drivers items={explain.contributions} labels={{}} max={6} upLabel="looks like fraud" downLabel="looks normal" />
            <p className="mt-2 text-[11.5px] text-muted">V1–V28 are anonymised (PCA) signals: the bank never released what they mean.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
