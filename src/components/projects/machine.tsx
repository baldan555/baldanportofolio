"use client";

import { useMemo, useState } from "react";
import model from "@/data/models/manufacturing-defects.json";
import { BarChart, ChartCard, ConfusionMatrix, DataTable, Histogram, INK, LineChart, S1, S2 } from "../charts";
import { MachineDemo, type MachineSample } from "../demos/machine-demo";
import { DatasetCard, Pill, SampleTable, SectionTitle, type ColumnDoc } from "../skills/sections";
import { DemoHeader, Section } from "./telco";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

// Validated categorical order (dataviz reference palette). OK runs stay neutral grey.
const MODE_COLOR: Record<string, string> = { HDF: "#2a78d6", PWF: "#eb6834", OSF: "#1baf7a", TWF: "#eda100", RNF: "#e87ba4", Other: "#6250d6", OK: "rgba(11,11,11,0.16)" };
const MODE_NAME: Record<string, string> = {
  HDF: "Heat dissipation",
  PWF: "Power",
  OSF: "Overstrain",
  TWF: "Tool wear",
  RNF: "Random",
  Other: "Other",
  OK: "No failure",
};

const columns: ColumnDoc[] = [
  { name: "UDI", type: "id", meaning: "Row number" },
  { name: "Product ID", type: "id", meaning: "Serial number with the quality variant letter" },
  { name: "Type", type: "category", meaning: "Product quality: L (60%), M (30%), H (10%)", used: true },
  { name: "Air temperature [K]", type: "number", meaning: "Ambient temperature", used: true },
  { name: "Process temperature [K]", type: "number", meaning: "Temperature of the process", used: true },
  { name: "Rotational speed [rpm]", type: "number", meaning: "Spindle speed", used: true },
  { name: "Torque [Nm]", type: "number", meaning: "Load on the tool", used: true },
  { name: "Tool wear [min]", type: "number", meaning: "Minutes the tool has been used", used: true },
  { name: "Machine failure", type: "target", meaning: "Run ended in a failure: the thing we predict", used: true },
  { name: "TWF · HDF · PWF · OSF · RNF", type: "flags", meaning: "Which failure mode happened. Left out: they reveal the answer" },
];

const physics = model.comparison.filter((c) => c.features === "physics");
const rawc = model.comparison.filter((c) => c.features === "raw");
const treeRaw = rawc.find((c) => c.model.startsWith("Decision"))!;
const treePhys = physics.find((c) => c.model.startsWith("Decision"))!;
const gbPhys = physics.find((c) => c.model.startsWith("Gradient"))!;

export function MachineBody() {
  const [sel, setSel] = useState<MachineSample | null>(null);
  const types = model.eda.fail_by_type.slice().sort((a, b) => "LMH".indexOf(a.label) - "LMH".indexOf(b.label));
  const modes = Object.entries(model.eda.modes).sort((a, b) => b[1] - a[1]);
  const tq = model.eda.torque_hist;
  const wr = model.eda.wear_hist;
  const cm = model.metrics.confusion;

  return (
    <>
      <Section id="data">
        <SectionTitle
          kicker="The data"
          title={`${model.dataset.rows.toLocaleString("en-US")} machine runs, ${model.dataset.failures} failures.`}
          line={`Only ${pct1(model.dataset.failure_rate)} of runs fail. A model that always says “fine” would be ${pct1(1 - model.dataset.failure_rate)} accurate and useless.`}
        />
        <DatasetCard
          name={model.dataset.name}
          source={model.dataset.source}
          sourceLabel="Dataset on UCI"
          description="A synthetic dataset that mirrors real predictive-maintenance data, published by Stephan Matzka (HTW Berlin) in 2020. Its documentation explains how each failure mode was generated, which lets us check the model against the physics."
          facts={[
            { label: "runs", value: model.dataset.rows.toLocaleString("en-US") },
            { label: "failure rate", value: pct1(model.dataset.failure_rate) },
            { label: "failure modes", value: "5" },
            { label: "physics features", value: String(model.dataset.features_physics.length) },
          ]}
          columns={columns}
        />
      </Section>

      <Section id="explore">
        <SectionTitle kicker="Explore the data" title="Failures follow physics." line="The documentation says how each failure mode happens. The data agrees almost perfectly." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Speed × torque, coloured by failure mode"
            takeaway="Power failures sit outside the two curves (3,500 W and 9,000 W). Normal runs (grey) live between them."
            legend={["PWF", "HDF", "OSF", "TWF", "RNF", "Other", "OK"].map((m) => ({ label: m === "Other" ? "Failure, no mode flag" : MODE_NAME[m], color: MODE_COLOR[m] }))}
            className="md:col-span-2"
          >
            <PowerScatter />
          </ChartCard>
          <ChartCard
            title="Documented rule vs the data"
            takeaway="How many failures of each mode satisfy the rule in the dataset's documentation."
            className="md:col-span-2"
          >
            <DataTable
              data={{
                columns: ["Mode", "Documented rule", "Failures", "Match the rule"],
                rows: Object.entries(model.rule_checks).map(([k, v]) => [
                  `${k} · ${MODE_NAME[k]}`,
                  v.rule,
                  v.rows,
                  v.match === null ? "no pattern (random)" : `${v.match}/${v.rows} (${pct(v.match / v.rows)})`,
                ]),
              }}
            />
          </ChartCard>
          <ChartCard
            title="Failures by mode"
            takeaway={`Heat dissipation is the most common (${model.eda.modes.HDF}). A run can have more than one mode.`}
            table={{ columns: ["Mode", "Failures"], rows: modes.map(([m, n]) => [`${m} · ${MODE_NAME[m]}`, n]) }}
          >
            <BarChart data={modes.map(([m, n]) => ({ label: MODE_NAME[m], value: n }))} />
          </ChartCard>
          <ChartCard
            title="Failure rate by product quality"
            takeaway={`L ${pct1(types[0].rate)} · M ${pct1(types[1].rate)} · H ${pct1(types[2].rate)}. Lower quality fails a bit more, partly through overstrain.`}
            table={{ columns: ["Type", "Failure rate", "Runs"], rows: types.map((t) => [t.label, pct1(t.rate), t.n]) }}
          >
            <BarChart data={types.map((t) => ({ label: `Type ${t.label}`, value: t.rate, n: t.n }))} format={pct1} />
          </ChartCard>
          <ChartCard
            title="Torque: OK vs failure"
            takeaway={`At 45 Nm or more: ${pct(tq.series.Failure.reduce((a, v, i) => (tq.bins[i] >= 45 ? a + v : a), 0))} of failures vs ${pct(tq.series.OK.reduce((a, v, i) => (tq.bins[i] >= 45 ? a + v : a), 0))} of normal runs, plus a small cluster below 15 Nm.`}
            legend={[
              { label: "OK", color: S1, shape: "square" },
              { label: "Failure", color: S2, shape: "square" },
            ]}
            table={{ columns: ["Torque (Nm)", "OK", "Failure"], rows: tq.series.OK.map((v, i) => [`${tq.bins[i]}–${tq.bins[i + 1]}`, pct1(v), pct1(tq.series.Failure[i])]) }}
          >
            <Histogram
              bins={tq.bins}
              series={[
                { name: "OK", color: S1, values: tq.series.OK },
                { name: "Failure", color: S2, values: tq.series.Failure },
              ]}
              format={pct}
            />
          </ChartCard>
          <ChartCard
            title="Tool wear: OK vs failure"
            takeaway="Failures climb once a tool passes about 200 minutes."
            legend={[
              { label: "OK", color: S1, shape: "square" },
              { label: "Failure", color: S2, shape: "square" },
            ]}
            table={{ columns: ["Tool wear (min)", "OK", "Failure"], rows: wr.series.OK.map((v, i) => [`${wr.bins[i]}–${wr.bins[i + 1]}`, pct1(v), pct1(wr.series.Failure[i])]) }}
          >
            <Histogram
              bins={wr.bins}
              series={[
                { name: "OK", color: S1, values: wr.series.OK },
                { name: "Failure", color: S2, values: wr.series.Failure },
              ]}
              format={pct}
            />
          </ChartCard>
        </div>
      </Section>

      <Section id="try">
        <SectionTitle kicker="Try it" title="Load a run, push the machine." line="Runs from the test set, one per failure mode where possible. Move a slider and watch the tree take a different path." />
        <SampleTable
          rows={model.samples}
          selected={sel?.id}
          onSelect={setSel}
          columns={[
            { key: "id", label: "Run" },
            { key: "type", label: "Type" },
            { key: "air", label: "Air K", align: "right" },
            { key: "process", label: "Process K", align: "right" },
            { key: "speed", label: "rpm", align: "right", render: (r) => r.speed.toLocaleString("en-US") },
            { key: "torque", label: "Nm", align: "right" },
            { key: "wear", label: "Wear min", align: "right" },
            { key: "predicted", label: "Model says", align: "right", render: (r) => pct(r.predicted) },
            {
              key: "actual",
              label: "Outcome",
              render: (r) => <Pill yes={r.actual === "Failure"}>{r.actual === "Failure" ? `failure · ${r.mode ?? "?"}` : "OK"}</Pill>,
            },
          ]}
        />
        <div className="mt-4 rounded-[28px] bg-cream p-4 sm:p-8">
          <DemoHeader />
          <MachineDemo key={sel?.id ?? "default"} preset={sel} />
        </div>
      </Section>

      <Section id="results">
        <SectionTitle
          kicker="How well it works"
          title="Three features did more than a bigger model."
          line={`On ${model.split.test.toLocaleString("en-US")} unseen runs (${model.split.test_failures} failures). A depth-5 tree goes from F1 ${treeRaw.f1.toFixed(2)} to ${treePhys.f1.toFixed(2)} once it gets the physics features, level with boosting (${gbPhys.f1.toFixed(2)}).`}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="F1 score: raw sensors vs physics features"
            takeaway="Same models, same split. Only the features change."
            legend={[
              { label: "Raw sensors", color: S1, shape: "square" },
              { label: "+ physics features", color: S2, shape: "square" },
            ]}
            table={{ columns: ["Model", "Features", "F1", "Recall", "Precision", "Avg precision"], rows: model.comparison.map((c) => [c.model, c.features, c.f1.toFixed(3), pct1(c.recall), pct1(c.precision), c.ap.toFixed(3)]) }}
          >
            <GroupedBars
              groups={rawc.map((c) => c.model.replace(" (depth 5)", ""))}
              series={[
                { name: "Raw sensors", color: S1, values: rawc.map((c) => c.f1) },
                { name: "+ physics", color: S2, values: physics.map((c) => c.f1) },
              ]}
            />
          </ChartCard>
          <ChartCard
            title="Precision–recall curves"
            takeaway={`Higher and further right is better. Random guessing sits at ${pct1(model.eval.base_rate)} precision.`}
            legend={[
              { label: "Tree · physics", color: INK, shape: "line" },
              { label: "Boosting · physics", color: S2, shape: "line" },
              { label: "Tree · raw", color: S1, shape: "line" },
            ]}
          >
            <LineChart
              series={[
                { name: "Tree · physics", color: INK, points: model.eval.pr["Tree · physics features"] as [number, number][] },
                { name: "Boosting · physics", color: S2, points: model.eval.pr["Boosting · physics features"] as [number, number][], dashed: true },
                { name: "Tree · raw", color: S1, points: model.eval.pr["Tree · raw features"] as [number, number][] },
              ]}
              xDomain={[0, 1]}
              yDomain={[0, 1]}
              xFormat={(v) => v.toFixed(2)}
              yFormat={(v) => v.toFixed(1)}
              xLabel="Recall"
              yLabel="Precision"
            />
          </ChartCard>
          <ChartCard title="Confusion matrix (tree, 50% threshold)" takeaway={`Catches ${cm.tp} of ${cm.tp + cm.fn} failures with ${cm.fp} false alarm${cm.fp === 1 ? "" : "s"}.`}>
            <ConfusionMatrix {...cm} positive="Failure" negative="OK" />
          </ChartCard>
          <ChartCard
            title="What the tree uses"
            takeaway={`The three engineered features carry ${pct(model.importance.filter((f) => ["strain", "power", "temp_diff"].includes(f.feature)).reduce((a, f) => a + f.importance, 0))} of the importance.`}
            table={{ columns: ["Feature", "Importance"], rows: model.importance.map((f) => [f.feature, pct1(f.importance)]) }}
          >
            <BarChart data={model.importance.slice(0, 6).map((f) => ({ label: f.feature.replace("_", " "), value: f.importance }))} format={pct} />
          </ChartCard>
          <ChartCard
            title={`The whole model, drawn: depth ${model.tree.depth}, ${model.tree.leaves} leaves`}
            takeaway={`The first split, wear × torque ≤ ${Math.round(model.tree.nodes[0].t as number).toLocaleString("en-US")}, rediscovers the documented 11,000 overstrain limit on its own. Leaves are coloured by failure share; hover any dot.`}
            className="md:col-span-2"
          >
            <TreeDiagram />
          </ChartCard>
        </div>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Scatter with iso-power curves                                         */
/* ------------------------------------------------------------------ */

function PowerScatter() {
  const W = 860;
  const H = 360;
  const M = { l: 48, r: 14, t: 12, b: 38 };
  const [x0, x1] = [1100, 2950];
  const [y0, y1] = [0, 80];
  const sx = (v: number) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b);
  const curve = (P: number) => {
    let d = "";
    for (let s = x0; s <= x1; s += 25) {
      const tq = (P * 60) / (2 * Math.PI * s);
      if (tq < y0 || tq > y1) continue;
      d += `${d ? "L" : "M"}${sx(s).toFixed(1)},${sy(tq).toFixed(1)}`;
    }
    return d;
  };
  const pts = model.eda.scatter as [number, number, string][];
  const ordered = [...pts.filter((p) => p[2] === "OK"), ...pts.filter((p) => p[2] !== "OK")];
  const [tip, setTip] = useState<{ x: number; y: number; p: [number, number, string] } | null>(null);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
        {[0, 20, 40, 60, 80].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="rgba(11,11,11,0.07)" />
            <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
              {v}
            </text>
          </g>
        ))}
        {[1200, 1500, 1800, 2100, 2400, 2700].map((v) => (
          <text key={v} x={sx(v)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
            {v.toLocaleString("en-US")}
          </text>
        ))}
        <text x={(W + M.l) / 2} y={H - 4} textAnchor="middle" fontSize="11.5" fill="#5f5f5a">
          Rotational speed (rpm)
        </text>
        <text x={14} y={(H - M.b) / 2} textAnchor="middle" fontSize="11.5" fill="#5f5f5a" transform={`rotate(-90 14 ${(H - M.b) / 2})`}>
          Torque (Nm)
        </text>
        {ordered.map((p, i) => (
          <circle
            key={i}
            cx={sx(p[0])}
            cy={sy(p[1])}
            r={p[2] === "OK" ? 2.6 : 4.5}
            fill={MODE_COLOR[p[2]] ?? MODE_COLOR.Other}
            stroke={p[2] === "OK" ? "none" : "#fff"}
            strokeWidth={1.2}
            onMouseEnter={() => setTip({ x: sx(p[0]), y: sy(p[1]), p })}
          />
        ))}
        {[3500, 9000].map((P) => (
          <g key={P}>
            <path d={curve(P)} fill="none" stroke={INK} strokeWidth={1.6} strokeDasharray="6 4" />
          </g>
        ))}
        <text x={sx(2750)} y={sy((3500 * 60) / (2 * Math.PI * 2750)) - 8} textAnchor="middle" fontSize="11" fill={INK} fontWeight={600}>
          3,500 W
        </text>
        <text x={sx(2600)} y={sy((9000 * 60) / (2 * Math.PI * 2600)) - 8} textAnchor="middle" fontSize="11" fill={INK} fontWeight={600}>
          9,000 W
        </text>
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] whitespace-nowrap text-white"
          style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%`, transform: `translate(${tip.x > W * 0.7 ? "calc(-100% - 10px)" : "10px"}, -50%)` }}
        >
          {tip.p[0].toLocaleString("en-US")} rpm · {tip.p[1]} Nm · {Math.round((tip.p[1] * tip.p[0] * 2 * Math.PI) / 60).toLocaleString("en-US")} W
          <br />
          <span className="text-white/70">{MODE_NAME[tip.p[2]] ?? tip.p[2]}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grouped bars (2 series × n groups)                                    */
/* ------------------------------------------------------------------ */

function GroupedBars({ groups, series }: { groups: string[]; series: { name: string; color: string; values: number[] }[] }) {
  const W = 420;
  const H = 230;
  const M = { l: 40, r: 8, t: 18, b: 34 };
  const gw = (W - M.l - M.r) / groups.length;
  const bw = Math.min(34, (gw * 0.7) / series.length);
  const y = (v: number) => H - M.b - v * (H - M.t - M.b);
  const [tip, setTip] = useState<string | null>(null);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={M.l} x2={W - M.r} y1={y(f)} y2={y(f)} stroke="rgba(11,11,11,0.07)" />
            <text x={M.l - 6} y={y(f) + 4} textAnchor="end" fontSize="10.5" fill="#8a8a85" fontFamily="var(--font-geist-mono)">
              {f.toFixed(1)}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const cx = M.l + gi * gw + gw / 2;
          return (
            <g key={g}>
              {series.map((s, si) => {
                const v = s.values[gi];
                const x = cx - (bw * series.length + 2 * (series.length - 1)) / 2 + si * (bw + 2);
                return (
                  <g key={s.name} onMouseEnter={() => setTip(`${g} · ${s.name}: F1 ${v.toFixed(3)}`)}>
                    <rect x={x} y={y(v)} width={bw} height={H - M.b - y(v)} rx={4} fill={s.color} />
                    <text x={x + bw / 2} y={y(v) - 5} textAnchor="middle" fontSize="10.5" fill={INK} fontWeight={600}>
                      {v.toFixed(2)}
                    </text>
                  </g>
                );
              })}
              <text x={cx} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill="#5f5f5a">
                {g}
              </text>
            </g>
          );
        })}
      </svg>
      {tip && <p className="absolute top-0 right-0 rounded-md bg-ink px-2 py-1 text-[11px] text-white">{tip}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tree diagram                                                          */
/* ------------------------------------------------------------------ */

const LABEL: Record<string, string> = { temp_diff: "temp diff", power: "power", strain: "wear×torque", type_L: "type L", type_M: "type M", type_H: "type H" };

function TreeDiagram() {
  const nodes = model.tree.nodes;
  const layout = useMemo(() => {
    const pos: { x: number; depth: number }[] = new Array(nodes.length);
    let leaf = 0;
    const place = (i: number, d: number): number => {
      const n = nodes[i];
      if (n.l === -1) {
        pos[i] = { x: leaf++, depth: d };
        return pos[i].x;
      }
      const a = place(n.l, d + 1);
      const b = place(n.r, d + 1);
      pos[i] = { x: (a + b) / 2, depth: d };
      return pos[i].x;
    };
    place(0, 0);
    return { pos, leaves: leaf };
  }, [nodes]);

  const W = 860;
  const H = 300;
  const M = { l: 16, r: 16, t: 20, b: 20 };
  const sx = (x: number) => M.l + (x / Math.max(1, layout.leaves - 1)) * (W - M.l - M.r);
  const sy = (d: number) => M.t + (d / model.tree.depth) * (H - M.t - M.b);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const shade = (p: number) => `rgba(235,104,52,${0.15 + 0.85 * p})`;

  return (
    <div className="relative overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[620px]" onMouseLeave={() => setTip(null)}>
        {nodes.map((n, i) =>
          n.l === -1
            ? null
            : [n.l, n.r].map((c) => (
                <line key={`${i}-${c}`} x1={sx(layout.pos[i].x)} y1={sy(layout.pos[i].depth)} x2={sx(layout.pos[c].x)} y2={sy(layout.pos[c].depth)} stroke="rgba(11,11,11,0.25)" strokeWidth={1.4} />
              )),
        )}
        {nodes.map((n, i) => {
          const leaf = n.l === -1;
          const cx = sx(layout.pos[i].x);
          const cy = sy(layout.pos[i].depth);
          const unit = n.f === "power" ? " W" : n.f === "temp_diff" ? " K" : n.f === "speed" ? " rpm" : n.f === "torque" ? " Nm" : n.f === "wear" ? " min" : "";
          const rule = leaf
            ? `Leaf · ${n.n.toLocaleString("en-US")} training runs · ${(n.p * 100).toFixed(1)}% failed`
            : (n.f as string).startsWith("type_")
              ? `${LABEL[n.f as string]}? (right = yes) · ${n.n.toLocaleString("en-US")} runs`
              : `${LABEL[n.f as string] ?? n.f} ≤ ${Math.round((n.t as number) * 10) / 10}${unit} ? (left = yes) · ${n.n.toLocaleString("en-US")} runs`;
          return (
            <g key={i} onMouseEnter={() => setTip({ x: cx, y: cy, text: rule })}>
              <circle cx={cx} cy={cy} r={leaf ? 7 : 5.5} fill={leaf ? shade(n.p) : INK} stroke="#fff" strokeWidth={2} />
              {!leaf && layout.pos[i].depth <= 1 && (
                <text x={cx} y={cy - 10} textAnchor="middle" fontSize="11" fill={INK} fontWeight={600}>
                  {(n.f as string).startsWith("type_") ? `${LABEL[n.f as string]}? (right = yes)` : `${LABEL[n.f as string] ?? n.f} ≤ ${Math.round(n.t as number).toLocaleString("en-US")}${unit}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] whitespace-nowrap text-white"
          style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%`, transform: `translate(${tip.x > W * 0.6 ? "calc(-100% - 12px)" : "12px"}, -50%)` }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
