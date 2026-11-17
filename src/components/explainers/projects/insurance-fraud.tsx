"use client";

import model from "@/data/models/insurance-fraud.json";
import type { LogRegModel } from "@/lib/logreg";
import { NeuronExplainer, spread } from "../neuron";
import { TreeExplainer, type TreeNode, type TreeRow } from "../tree";

export const rows = spread(model.samples, (s) => s.predicted).map((s) => ({
  id: s.id,
  input: {
    months_as_customer: s.months_as_customer,
    umbrella_limit: s.umbrella_limit,
    injury_claim: s.injury_claim,
    property_claim: s.property_claim,
    vehicle_claim: s.vehicle_claim,
    number_of_vehicles_involved: s.number_of_vehicles_involved,
    bodily_injuries: s.bodily_injuries,
    witnesses: s.witnesses,
    incident_severity: s.incident_severity,
    incident_type: s.incident_type,
    collision_type: s.collision_type,
    authorities_contacted: s.authorities_contacted,
    property_damage: s.property_damage,
    police_report_available: s.police_report_available,
  },
  actual: s.actual === "Fraud" ? "fraud" : "legit",
  event: s.actual === "Fraud",
  predicted: s.predicted,
}));

const labels = {
  months_as_customer: "Months as customer",
  umbrella_limit: "Umbrella limit ($)",
  injury_claim: "Injury claim ($)",
  property_claim: "Property claim ($)",
  vehicle_claim: "Vehicle claim ($)",
  number_of_vehicles_involved: "Vehicles involved",
  police_report_available: "Police report",
};

const LABEL: Record<string, string> = {
  months_as_customer: "Months as customer",
  umbrella_limit: "Umbrella limit",
  injury_claim: "Injury claim",
  property_claim: "Property claim",
  vehicle_claim: "Vehicle claim",
  number_of_vehicles_involved: "Vehicles involved",
  bodily_injuries: "Bodily injuries",
  witnesses: "Witnesses",
  incident_severity: "Severity",
  incident_type: "Incident type",
  collision_type: "Collision",
  authorities_contacted: "Authorities",
  property_damage: "Property damage",
  police_report_available: "Police report",
};
type Split = { kind: string; col: string; value?: string; t?: number } | null;
// the 3-question checklist: categories go right ("yes") when they match, numbers when they are above the cut
const nodes: TreeNode[] = model.tree.nodes.map((nd) => {
  const s = nd.split as Split;
  return {
    q: s ? (s.kind === "cat" ? `${LABEL[s.col]} is “${s.value}”` : `${LABEL[s.col]} > ${Number(s.t).toLocaleString("en-US")}`) : null,
    yes: s ? (x) => (s.kind === "cat" ? x[s.col] === s.value : Number(x[s.col]) > (s.t as number)) : null,
    l: nd.l,
    r: nd.r,
    p: nd.p,
    n: nd.n,
  };
});
const treeRows: TreeRow[] = rows.map((r) => ({
  id: r.id,
  x: r.input as Record<string, number | string>,
  actual: r.actual,
  facts: ["incident_severity", "collision_type", "authorities_contacted", "vehicle_claim", "property_claim", "witnesses"].map((k) => ({
    label: LABEL[k],
    value:
      typeof (r.input as Record<string, number | string>)[k] === "number"
        ? Number((r.input as Record<string, number | string>)[k]).toLocaleString("en-US")
        : String((r.input as Record<string, number | string>)[k]),
  })),
}));

export function Inside() {
  return (
    <>
      <NeuronExplainer
        title="One claim, one neuron."
        line="Logistic regression is a single artificial neuron. Scroll to watch it score one real insurance claim with the model's real weights."
        model={model.model as LogRegModel}
        rows={rows}
        entity="claim"
        out={{
          kind: "chance",
          event: "fraud",
          threshold: 0.5,
          flag: "investigate",
          pass: "pay out",
        }}
        trained={`${model.dataset.rows.toLocaleString("en-US")} past claims`}
        labels={labels}
      />
      <TreeExplainer
        id="inside-tree"
        title="Then a three-question checklist."
        line="Next to the score, a small decision tree gives investigators a checklist they can follow by hand and explain to a customer."
        nodes={nodes}
        rows={treeRows}
        entity="claim"
        event="fraud"
        second={{
          t: "Only three questions",
          d: "The tree was kept to three levels on purpose: short enough to print on one page and apply without a computer.",
        }}
        grownNote="More levels would fit the 1,000 training claims more closely and turn the checklist into a maze nobody can apply. Three levels keep most of what the tree finds."
      />
    </>
  );
}
