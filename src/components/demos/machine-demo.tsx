"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/manufacturing-defects.json";
import { pc, RAISES, RiskMeter, Segmented, Slider } from "./controls";

export type MachineSample = (typeof model.samples)[number];
type Node = (typeof model.tree.nodes)[number];

const FEATURE_LABEL: Record<string, string> = {
  air: "Air temperature",
  process: "Process temperature",
  speed: "Rotational speed",
  torque: "Torque",
  wear: "Tool wear",
  temp_diff: "Temperature difference",
  power: "Power",
  strain: "Tool wear × torque",
  type_L: "Type is L",
  type_M: "Type is M",
  type_H: "Type is H",
};
const UNIT: Record<string, string> = { air: " K", process: " K", speed: " rpm", torque: " Nm", wear: " min", temp_diff: " K", power: " W", strain: " min·Nm" };
const fmt = (f: string, v: number) => (f.startsWith("type_") ? "" : `${Math.round(v * 10) / 10 >= 1000 ? Math.round(v).toLocaleString("en-US") : (Math.round(v * 10) / 10).toString()}${UNIT[f] ?? ""}`);

/** Walk the exported scikit-learn tree: left when x[f] <= threshold. */
function walk(x: Record<string, number>) {
  const nodes = model.tree.nodes as Node[];
  const path: { f: string; t: number; v: number; left: boolean }[] = [];
  let i = 0;
  while (nodes[i].l !== -1) {
    const n = nodes[i];
    const v = x[n.f as string];
    const left = v <= (n.t as number);
    path.push({ f: n.f as string, t: n.t as number, v, left });
    i = left ? n.l : n.r;
  }
  return { p: nodes[i].p, n: nodes[i].n, path };
}

const OSF_LIMIT: Record<string, number> = { L: 11000, M: 12000, H: 13000 };

/** Remount with a new `key` to load a different preset row. */
export function MachineDemo({ preset }: { preset?: MachineSample | null }) {
  const md = model.medians;
  const R = model.ranges;
  const [type, setType] = useState<"L" | "M" | "H">((preset?.type as "L" | "M" | "H") ?? "L");
  const [air, setAir] = useState(preset?.air ?? md.air);
  const [proc, setProc] = useState(preset?.process ?? md.process);
  const [speed, setSpeed] = useState(preset?.speed ?? md.speed);
  const [torque, setTorque] = useState(preset?.torque ?? md.torque);
  const [wear, setWear] = useState(preset?.wear ?? md.wear);

  const x = useMemo(() => {
    const temp_diff = proc - air;
    const power = (torque * speed * 2 * Math.PI) / 60;
    const strain = wear * torque;
    return { air, process: proc, speed, torque, wear, temp_diff, power, strain, type_L: +(type === "L"), type_M: +(type === "M"), type_H: +(type === "H") };
  }, [air, proc, speed, torque, wear, type]);
  const res = useMemo(() => walk(x), [x]);

  const gauges = [
    { name: "Temperature difference", value: x.temp_diff, unit: " K", lo: 6, hi: 13, bad: x.temp_diff < 8.6 && speed < 1380, band: [8.6, 13], note: "heat risk below 8.6 K at < 1380 rpm" },
    { name: "Power", value: x.power, unit: " W", lo: 0, hi: 12000, bad: x.power < 3500 || x.power > 9000, band: [3500, 9000], note: "safe band 3,500–9,000 W" },
    { name: "Tool wear × torque", value: x.strain, unit: " min·Nm", lo: 0, hi: 16000, bad: x.strain > OSF_LIMIT[type], band: [0, OSF_LIMIT[type]], note: `overstrain above ${OSF_LIMIT[type].toLocaleString("en-US")} for type ${type}` },
    { name: "Tool wear", value: wear, unit: " min", lo: 0, hi: 260, bad: wear >= 200, band: [0, 200], note: "tools fail between 200 and 240 min" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Machine sensors</p>
        <Segmented label="Product quality (L = low, M = medium, H = high)" value={type} options={["L", "M", "H"]} onChange={setType} />
        <Slider label="Air temperature" value={air} min={R.air[0]} max={R.air[1]} step={0.1} unit=" K" onChange={setAir} />
        <Slider label="Process temperature" value={proc} min={R.process[0]} max={R.process[1]} step={0.1} unit=" K" onChange={setProc} />
        <Slider label="Rotational speed" value={speed} min={R.speed[0]} max={R.speed[1]} step={1} unit=" rpm" onChange={setSpeed} />
        <Slider label="Torque" value={torque} min={R.torque[0]} max={R.torque[1]} step={0.1} unit=" Nm" onChange={setTorque} />
        <Slider label="Tool wear" value={wear} min={R.wear[0]} max={R.wear[1]} step={1} unit=" min" onChange={setWear} />

        <div className="border-t border-line pt-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Physics features (computed live)</p>
          <div className="mt-3 space-y-3">
            {gauges.map((g) => {
              const pos = Math.max(0, Math.min(1, (g.value - g.lo) / (g.hi - g.lo)));
              const b0 = Math.max(0, (g.band[0] - g.lo) / (g.hi - g.lo));
              const b1 = Math.min(1, (g.band[1] - g.lo) / (g.hi - g.lo));
              return (
                <div key={g.name}>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="font-medium">{g.name}</span>
                    <span className={`font-mono ${g.bad ? "text-[#c4471a]" : ""}`}>
                      {Math.round(g.value).toLocaleString("en-US")}
                      {g.unit}
                    </span>
                  </div>
                  <div className="relative mt-1 h-2 rounded-full bg-ink/[0.07]">
                    <span className="absolute inset-y-0 rounded-full bg-ink/15" style={{ left: `${b0 * 100}%`, width: `${(b1 - b0) * 100}%` }} />
                    <motion.span
                      className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow"
                      style={{ background: g.bad ? RAISES : "#0b0b0b" }}
                      animate={{ left: pc(pos * 100) }}
                      transition={{ type: "spring", stiffness: 220, damping: 24 }}
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">{g.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl bg-white p-5 sm:p-6">
        <RiskMeter probability={res.p} label="Chance this run ends in a failure" />
        <p className="-mt-2 text-[12px] text-muted">
          Share of failures among the {res.n.toLocaleString("en-US")} training runs that landed in the same leaf.
        </p>

        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">How the tree decided</p>
          <ol className="relative mt-3 space-y-2 border-l-2 border-ink/10 pl-5">
            <AnimatePresence initial={false}>
              {res.path.map((s, i) => (
                <motion.li
                  key={`${i}-${s.f}-${s.left}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="relative text-[13px]"
                >
                  <span className="absolute top-1.5 -left-[27px] h-3 w-3 rounded-full border-2 border-white bg-ink" />
                  {s.f.startsWith("type_") ? (
                    <span>
                      {FEATURE_LABEL[s.f]}? <b>{s.left ? "no" : "yes"}</b>
                    </span>
                  ) : (
                    <span>
                      {FEATURE_LABEL[s.f]} <b className="font-mono">{fmt(s.f, s.v)}</b> {s.left ? "≤" : ">"} <span className="font-mono text-ink-2/70">{fmt(s.f, s.t)}</span>
                    </span>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
            <li className="relative text-[13px]">
              <span className="absolute top-1 -left-[29px] h-4 w-4 rounded-full border-2 border-white" style={{ background: res.p >= 0.5 ? RAISES : "#0b0b0b" }} />
              <b>{res.p >= 0.5 ? "Likely failure" : "Likely OK"}</b> · {(res.p * 100).toFixed(1)}% of similar runs failed
            </li>
          </ol>
        </div>

        {preset && (
          <p className="mt-auto rounded-xl bg-cream px-3 py-2 text-[12.5px]">
            Loaded run <b className="font-mono">{preset.id}</b> from the test set. What really happened: <b>{preset.actual === "Failure" ? `failure (${preset.mode ?? "other"})` : "no failure"}</b>.
          </p>
        )}
      </div>
    </div>
  );
}
