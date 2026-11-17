"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/insurance-fraud.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { Drivers, RAISES, RiskMeter, Segmented, Select, Slider } from "./controls";

export type ClaimSample = (typeof model.samples)[number];
type TreeNode = (typeof model.tree.nodes)[number];
type Split = { kind: string; col: string; value?: string; t?: number };

export const LABEL: Record<string, string> = {
  months_as_customer: "Months as customer",
  umbrella_limit: "Umbrella limit",
  injury_claim: "Injury claim",
  property_claim: "Property claim",
  vehicle_claim: "Vehicle claim",
  number_of_vehicles_involved: "Vehicles involved",
  bodily_injuries: "Bodily injuries",
  witnesses: "Witnesses",
  incident_severity: "Incident severity",
  incident_type: "Incident type",
  collision_type: "Collision type",
  authorities_contacted: "Authorities contacted",
  property_damage: "Property damage",
  police_report_available: "Police report",
};

export function describeSplit(s: Split, yes: boolean) {
  if (s.kind === "cat") return `${LABEL[s.col] ?? s.col} ${yes ? "is" : "is not"} “${s.value}”`;
  return `${LABEL[s.col] ?? s.col} ${yes ? ">" : "≤"} ${Number(s.t).toLocaleString("en-US")}`;
}

/** Walk the exported depth-3 tree. Categorical splits go right when the value matches; numeric go left when x <= t. */
export function walkTree(x: Record<string, number | string>) {
  const nodes = model.tree.nodes as TreeNode[];
  const path: { text: string }[] = [];
  let i = 0;
  while (nodes[i].l !== -1) {
    const s = nodes[i].split as Split;
    const right = s.kind === "cat" ? x[s.col] === s.value : Number(x[s.col]) > (s.t as number);
    path.push({ text: describeSplit(s, right) });
    i = right ? nodes[i].r : nodes[i].l;
  }
  return { p: nodes[i].p, n: nodes[i].n, path };
}

const UMBRELLA = ["0", "2000000", "3000000", "4000000", "5000000", "6000000", "7000000", "8000000", "9000000", "10000000"];

/** Remount with a new `key` to load a different preset row. */
export function InsuranceDemo({ preset }: { preset?: ClaimSample | null }) {
  const md = model.medians;
  const o = model.options;
  const [sev, setSev] = useState(preset?.incident_severity ?? "Minor Damage");
  const [type, setType] = useState(preset?.incident_type ?? "Single Vehicle Collision");
  const [coll, setColl] = useState(preset?.collision_type ?? "Rear Collision");
  const [auth, setAuth] = useState(preset?.authorities_contacted ?? "Police");
  const [prop, setProp] = useState(preset?.property_damage ?? "Unknown");
  const [police, setPolice] = useState(preset?.police_report_available ?? "Unknown");
  const [witnesses, setWitnesses] = useState(preset?.witnesses ?? 1);
  const [injuries, setInjuries] = useState(preset?.bodily_injuries ?? 1);
  const [vehicles, setVehicles] = useState(preset?.number_of_vehicles_involved ?? 1);
  const [injury, setInjury] = useState(preset?.injury_claim ?? md.injury_claim);
  const [property, setProperty] = useState(preset?.property_claim ?? md.property_claim);
  const [vehicle, setVehicle] = useState(preset?.vehicle_claim ?? md.vehicle_claim);
  const [months, setMonths] = useState(preset?.months_as_customer ?? md.months_as_customer);
  const [umbrella, setUmbrella] = useState(String(preset?.umbrella_limit ?? 0));

  const x = useMemo(
    () => ({
      months_as_customer: months,
      umbrella_limit: Number(umbrella),
      injury_claim: injury,
      property_claim: property,
      vehicle_claim: vehicle,
      number_of_vehicles_involved: vehicles,
      bodily_injuries: injuries,
      witnesses,
      incident_severity: sev,
      incident_type: type,
      collision_type: coll,
      authorities_contacted: auth,
      property_damage: prop,
      police_report_available: police,
    }),
    [months, umbrella, injury, property, vehicle, vehicles, injuries, witnesses, sev, type, coll, auth, prop, police],
  );
  const res = useMemo(() => predict(model.model as LogRegModel, x), [x]);
  const tree = useMemo(() => walkTree(x), [x]);
  const R = model.ranges;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">The claim</p>
        <Segmented label="Incident severity" value={sev} options={o.incident_severity} onChange={setSev} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Incident type" value={type} options={o.incident_type} onChange={setType} />
          <Select label="Collision type" value={coll} options={o.collision_type} onChange={setColl} />
          <Select label="Authorities contacted" value={auth} options={o.authorities_contacted} onChange={setAuth} />
          <Select label="Umbrella limit" value={umbrella} options={UMBRELLA} onChange={setUmbrella} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Segmented label="Property damage" value={prop} options={o.property_damage} onChange={setProp} />
          <Segmented label="Police report" value={police} options={o.police_report_available} onChange={setPolice} />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Slider label="Witnesses" value={witnesses} min={0} max={3} onChange={setWitnesses} />
          <Slider label="Bodily injuries" value={injuries} min={0} max={2} onChange={setInjuries} />
          <Slider label="Vehicles" value={vehicles} min={1} max={4} onChange={setVehicles} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Slider label="Injury claim" value={injury} min={0} max={R.injury_claim[1]} step={10} unit=" $" onChange={setInjury} />
          <Slider label="Property claim" value={property} min={0} max={R.property_claim[1]} step={10} unit=" $" onChange={setProperty} />
          <Slider label="Vehicle claim" value={vehicle} min={R.vehicle_claim[0]} max={R.vehicle_claim[1]} step={10} unit=" $" onChange={setVehicle} />
          <Slider label="Months as customer" value={months} min={0} max={R.months_as_customer[1]} onChange={setMonths} />
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl bg-white p-5 sm:p-6">
        <RiskMeter probability={res.probability} label="Fraud score" />
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Investigator checklist (3 questions)</p>
          <ol className="relative mt-3 space-y-2 border-l-2 border-ink/10 pl-5">
            {tree.path.map((s, i) => (
              <motion.li key={`${i}-${s.text}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="relative text-[13px]">
                <span className="absolute top-1.5 -left-[27px] h-3 w-3 rounded-full border-2 border-white bg-ink" />
                {s.text}
              </motion.li>
            ))}
            <li className="relative text-[13px]">
              <span className="absolute top-1 -left-[29px] h-4 w-4 rounded-full border-2 border-white" style={{ background: tree.p >= 0.5 ? RAISES : "#0b0b0b" }} />
              <b>{tree.p >= 0.5 ? "Send to investigation" : "Fast-track"}</b> · {Math.round(tree.p * 100)}% of {tree.n} similar claims were fraud
            </li>
          </ol>
        </div>
        {preset && (
          <p className="rounded-xl bg-cream px-3 py-2 text-[12.5px]">
            Loaded claim <b className="font-mono">{preset.id}</b>. Recorded outcome: <b>{preset.actual === "Fraud" ? "fraud" : "legitimate"}</b>.
          </p>
        )}
        <Drivers items={res.contributions} labels={LABEL} max={5} />
      </div>
    </div>
  );
}
