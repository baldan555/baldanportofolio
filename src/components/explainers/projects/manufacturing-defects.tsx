"use client";

import model from "@/data/models/manufacturing-defects.json";
import { TreeExplainer, type TreeNode, type TreeRow } from "../tree";

const LABEL: Record<string, string> = {
  air: "Air temperature",
  process: "Process temperature",
  speed: "Speed",
  torque: "Torque",
  wear: "Tool wear",
  temp_diff: "Temperature difference",
  power: "Power",
  strain: "Tool wear × torque",
  type_L: "Type L",
  type_M: "Type M",
  type_H: "Type H",
};
const UNIT: Record<string, string> = {
  air: " K",
  process: " K",
  speed: " rpm",
  torque: " Nm",
  wear: " min",
  temp_diff: " K",
  power: " W",
  strain: " min·Nm",
};
const num = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });

const tree = (f: string) => model.comparison.find((c) => c.model.startsWith("Decision") && c.features === f)!.f1;
export const nodes: TreeNode[] = model.tree.nodes.map((nd) => ({
  q: nd.f ? (nd.f.startsWith("type_") ? `Is it ${LABEL[nd.f]}` : `${LABEL[nd.f]} > ${num(nd.t as number)}${UNIT[nd.f] ?? ""}`) : null,
  yes: nd.f ? (x) => Number(x[nd.f as string]) > (nd.t as number) : null,
  l: nd.l,
  r: nd.r,
  p: nd.p,
  n: nd.n,
}));

/** The same physics features as the training script and the demo. */
function features(s: (typeof model.samples)[number]) {
  const temp_diff = s.process - s.air;
  const power = (s.torque * s.speed * 2 * Math.PI) / 60;
  const strain = s.wear * s.torque;
  return {
    air: s.air,
    process: s.process,
    speed: s.speed,
    torque: s.torque,
    wear: s.wear,
    temp_diff,
    power,
    strain,
    type_L: +(s.type === "L"),
    type_M: +(s.type === "M"),
    type_H: +(s.type === "H"),
  };
}

// a mix of failures (different causes) and healthy runs
const fails = model.samples.filter((s) => s.actual === "Failure");
const fine = model.samples.filter((s) => s.actual !== "Failure");
const picked = [...fails.slice(0, 3), ...fine.slice(0, 2)];
export const rows: TreeRow[] = picked.map((s) => {
  const x = features(s);
  return {
    id: s.id,
    x,
    actual: s.actual === "Failure" ? `failed (${s.mode})` : "ran fine",
    facts: [
      { label: "Type", value: s.type },
      { label: "Speed", value: `${num(s.speed)} rpm` },
      { label: "Air", value: `${num(s.air)} K` },
      { label: "Torque", value: `${num(s.torque)} Nm` },
      { label: "Process", value: `${num(s.process)} K` },
      { label: "Tool wear", value: `${s.wear} min` },
      { label: "Temp. diff", value: `${num(x.temp_diff)} K`, computed: true },
      {
        label: "Power",
        value: `${num(Math.round(x.power))} W`,
        computed: true,
      },
      {
        label: "Wear × torque",
        value: `${num(Math.round(x.strain))}`,
        computed: true,
      },
    ],
  };
});

export function Inside() {
  return (
    <TreeExplainer
      title="One machine, one tree."
      line={`A decision tree is a flowchart learned from data: ${model.tree.leaves} leaves, ${model.tree.depth} questions at most. Scroll to drop one real machine reading through it.`}
      nodes={nodes}
      rows={rows}
      entity="machine"
      event="failure"
      second={{
        t: "Three facts are computed",
        d: `Temperature difference, power and tool wear × torque come from physics, not from the sensors directly. They made the same tree far better: F1 from ${tree("raw").toFixed(2)} to ${tree("physics").toFixed(2)} on the test set.`,
      }}
      grownNote="A deeper tree could memorise the training machines, noise included, and do worse on new ones. Five levels catch the failure rules and stay readable enough to check by hand."
    />
  );
}
