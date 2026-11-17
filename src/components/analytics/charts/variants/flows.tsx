import { MONTHS, burndown, campaigns, cohorts, funnel, gantt, journey, kpis, milestones, monthly, provinces, revenueByCity, revenueLastYear, targetShare, targets, tierFlow } from "@/data/chart-demo";
import { H, INK, M, MUTED, PAL, Svg, Text, W, YGrid, arc, band, fmt, lin, path, r1 } from "../kit";
import { defs } from "../types";
import { BAD, GOOD, div, polar, seq, smooth, sum, useSvgId } from "./base";

/* ---------------------------------------------------------------- funnels */
function FunnelBars() {
  const x = lin(0, funnel[0].value, 110, W - 50);
  const b = band(funnel.length, 10, H - 10, 0.35);
  return (
    <Svg label="Funnel as bars, with the conversion from each step to the next">
      {funnel.map((f, i) => (
        <g key={f.label}>
          <Text x={104} y={b.mid(i) + 3} anchor="end" size={9} color={INK}>
            {f.label}
          </Text>
          <rect x={110} y={b.at(i)} width={r1(x(f.value) - 110)} height={b.bw} rx={3} fill={PAL[0]} opacity={1 - i * 0.12} />
          <Text x={x(f.value) + 4} y={b.mid(i) + 3} size={8.5} mono>
            {fmt(f.value)}
          </Text>
          {i > 0 && (
            <Text x={W - 6} y={b.at(i) - 1} anchor="end" size={8} color={PAL[1]} weight={700}>
              {`↓ ${Math.round((f.value / funnel[i - 1].value) * 100)}%`}
            </Text>
          )}
        </g>
      ))}
    </Svg>
  );
}
function DropOff() {
  const id = useSvgId("hatch");
  const x = lin(0, funnel[0].value, 110, W - 14);
  const b = band(funnel.length, 10, H - 10, 0.35);
  return (
    <Svg label="Drop-off funnel: what each step keeps in colour, what it loses in grey">
      {funnel.map((f, i) => {
        const prev = i ? funnel[i - 1].value : f.value;
        return (
          <g key={f.label}>
            <Text x={104} y={b.mid(i) + 3} anchor="end" size={9} color={INK}>
              {f.label}
            </Text>
            <rect x={110} y={b.at(i)} width={r1(x(f.value) - 110)} height={b.bw} rx={2} fill={PAL[2]} />
            {i > 0 && <rect x={x(f.value)} y={b.at(i)} width={r1(x(prev) - x(f.value))} height={b.bw} fill={`url(#${id})`} />}
            {i > 0 && (
              <Text x={x(prev) + 4 > W - 50 ? x(prev) - 4 : x(prev) + 4} y={b.mid(i) + 3} anchor={x(prev) + 4 > W - 50 ? "end" : "start"} size={8} color={BAD}>
                {`−${fmt(prev - f.value)}`}
              </Text>
            )}
          </g>
        );
      })}
      <defs>
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="rgba(227,73,72,0.08)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(227,73,72,0.45)" strokeWidth="2" />
        </pattern>
      </defs>
    </Svg>
  );
}
function VFunnel() {
  const y = lin(0, funnel[0].value, H - M.b, M.t + 4);
  const b = band(funnel.length, M.l, W - M.r, 0.4);
  return (
    <Svg label="Vertical funnel: falling columns with the conversion rate on the arrows between them">
      <YGrid y={y} max={50000} />
      {funnel.map((f, i) => (
        <g key={f.label}>
          <rect x={b.at(i)} y={y(f.value)} width={b.bw} height={r1(H - M.b - y(f.value))} rx={3} fill={PAL[3]} opacity={1 - i * 0.13} />
          <Text x={b.mid(i)} y={H - M.b + 13} anchor="middle" size={7.5}>
            {f.label.split(" ").slice(-1)[0]}
          </Text>
          {i > 0 && (
            <Text x={r1(b.at(i) - (b.step - b.bw) / 2)} y={y(funnel[i - 1].value) - 4} anchor="middle" size={8} color={PAL[1]} weight={700}>
              {`${Math.round((f.value / funnel[i - 1].value) * 100)}%→`}
            </Text>
          )}
        </g>
      ))}
    </Svg>
  );
}

/* ---------------------------------------------------------------- flows */
function Alluvial() {
  const { stages, tiers, links } = tierFlow;
  const x = [30, 170, 310];
  const nodeW = 14;
  const total = sum(links.map((l) => l[3]));
  const scale = (H - 40) / total;
  // size of each tier at each stage, from the links
  const size = stages.map((_, s) => tiers.map((_, t) => sum(links.filter((l) => l[s] === t).map((l) => l[3]))));
  const tops = size.map((col) => col.reduce<number[]>((acc, v, i) => [...acc, acc[i] + v * scale + 6], [14]));
  // allocate positions deterministically: walk links in order per stage
  const pos = stages.map(() => tiers.map(() => 0));
  const ribbon = links.map((l) => {
    const ys = [0, 1, 2].map((s) => {
      const t = l[s];
      const y = tops[s][t] + pos[s][t] * scale;
      pos[s][t] += l[3];
      return y;
    });
    return { l, ys };
  });
  const colors = [PAL[5], "#8a8a8a", "#b06a35", "rgba(11,11,11,0.25)"];
  return (
    <Svg label="Alluvial diagram: how loyalty-tier members moved between January, June and December">
      {ribbon.map(({ l, ys }, k) => {
        const h = l[3] * scale;
        return (
          <g key={k}>
            {[0, 1].map((s) => (
              <path
                key={s}
                d={`M${x[s] + nodeW},${r1(ys[s])} C${x[s] + 80},${r1(ys[s])} ${x[s + 1] - 66},${r1(ys[s + 1])} ${x[s + 1]},${r1(ys[s + 1])} L${x[s + 1]},${r1(ys[s + 1] + h)} C${x[s + 1] - 66},${r1(ys[s + 1] + h)} ${x[s] + 80},${r1(ys[s] + h)} ${x[s] + nodeW},${r1(ys[s] + h)} Z`}
                fill={colors[l[0]]}
                opacity={0.35}
              />
            ))}
          </g>
        );
      })}
      {stages.map((st, s) => (
        <g key={st}>
          <Text x={x[s] + 7} y={10} anchor="middle" size={8.5} color={INK} weight={700}>
            {st}
          </Text>
          {tiers.map((t, k) =>
            size[s][k] ? (
              <g key={t}>
                <rect x={x[s]} y={r1(tops[s][k])} width={nodeW} height={r1(size[s][k] * scale)} rx={2} fill={colors[k]} />
                {s < 2 && (
                  <Text x={s === 0 ? x[s] - 3 : x[s] + nodeW + 3} y={r1(tops[s][k] + (size[s][k] * scale) / 2 + 3)} anchor={s === 0 ? "end" : "start"} size={7.5} color={INK}>
                    {t}
                  </Text>
                )}
              </g>
            ) : null,
          )}
        </g>
      ))}
    </Svg>
  );
}
function Journey() {
  const x = lin(0, journey.length - 1, 40, W - 30);
  const y = lin(1, 5, H - 40, 20);
  return (
    <Svg label="Customer journey: satisfaction at each step from finding the shop to coming back">
      <rect x={20} y={y(3)} width={W - 40} height={r1(H - 40 - y(3))} fill="rgba(227,73,72,0.06)" />
      <path d={smooth(journey.map((j, i) => [x(i), y(j.value)]))} fill="none" stroke={INK} strokeWidth={2} />
      {journey.map((j, i) => (
        <g key={j.label}>
          <circle cx={x(i)} cy={y(j.value)} r={9} fill={j.value < 3.2 ? BAD : j.value > 4 ? GOOD : PAL[5]} stroke="#fff" strokeWidth={2} />
          <Text x={x(i)} y={y(j.value) + 3} anchor="middle" size={7} color="#fff" weight={700}>
            {j.value.toFixed(1)}
          </Text>
          <Text x={x(i)} y={H - 22} anchor="middle" size={8.5} color={INK}>
            {j.label}
          </Text>
          <Text x={x(i)} y={H - 10} anchor="middle" size={7.5}>
            {`step ${i + 1}`}
          </Text>
        </g>
      ))}
      <Text x={24} y={y(3) + 12} size={8} color={BAD}>
        {"pain zone"}
      </Text>
    </Svg>
  );
}
function Swimlane() {
  const lanes = ["Customer", "Barista", "Rider"];
  const steps: [number, number, string][] = [
    [0, 0, "Orders in app"],
    [1, 1, "Makes drink"],
    [1, 2, "Packs order"],
    [2, 3, "Picks up"],
    [2, 4, "Delivers"],
    [0, 5, "Rates"],
  ];
  const lh = (H - 12) / 3;
  const x = (i: number) => 100 + i * 47;
  const cy = (l: number) => r1(6 + l * lh + lh / 2);
  return (
    <Svg label="Swimlane diagram: who does each step of a delivery order, in order">
      {lanes.map((l, i) => (
        <g key={l}>
          <rect x={6} y={6 + i * lh} width={W - 12} height={r1(lh - 3)} rx={6} fill={i % 2 ? "rgba(11,11,11,0.025)" : "rgba(11,11,11,0.05)"} />
          <Text x={14} y={cy(i) + 3} size={9} color={INK} weight={700}>
            {l}
          </Text>
        </g>
      ))}
      {steps.slice(1).map(([l, i], k) => {
        const [pl, pi] = steps[k];
        return <path key={k} d={`M${x(pi) + 23},${cy(pl)} C${x(pi) + 38},${cy(pl)} ${x(i) - 18},${cy(l)} ${x(i) - 23},${cy(l)}`} fill="none" stroke={MUTED} strokeWidth={1.4} />;
      })}
      {steps.map(([l, i, t]) => (
        <g key={t}>
          <rect x={x(i) - 23} y={cy(l) - 16} width={46} height={32} rx={6} fill={PAL[l]} />
          {t.split(" ").map((w, k, arr) => (
            <Text key={w} x={x(i)} y={r1(cy(l) + 3 + (k - (arr.length - 1) / 2) * 8.5)} anchor="middle" size={7.5} color="#fff" weight={600}>
              {w}
            </Text>
          ))}
        </g>
      ))}
    </Svg>
  );
}

/* ---------------------------------------------------------------- timelines */
function Milestones() {
  const x = lin(0, 11, 30, W - 30);
  return (
    <Svg label="Milestone timeline: the chain's big moments in one year">
      <line x1={20} x2={W - 20} y1={110} y2={110} stroke={INK} strokeWidth={2} />
      {MONTHS.map((m, i) => (
        <g key={m}>
          <line x1={x(i)} x2={x(i)} y1={106} y2={114} stroke={INK} />
          <Text x={x(i)} y={128} anchor="middle" size={8}>
            {m.slice(0, 1)}
          </Text>
        </g>
      ))}
      {milestones.map((ms, k) => {
        const up = k % 2 === 0;
        return (
          <g key={ms.label}>
            <line x1={x(ms.m)} x2={x(ms.m)} y1={110} y2={up ? 60 : 160} stroke={PAL[k % PAL.length]} strokeWidth={1.5} />
            <circle cx={x(ms.m)} cy={110} r={6} fill={PAL[k % PAL.length]} stroke="#fff" strokeWidth={2} />
            <Text x={x(ms.m)} y={up ? 52 : 174} anchor="middle" size={9} color={INK} weight={600}>
              {ms.label}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function Campaigns() {
  const x = lin(0, 12, 100, W - 10);
  const b = band(campaigns.length, 30, H - 10, 0.35);
  return (
    <Svg label="Campaign timeline: floating bars for when each campaign ran, overlaps visible">
      {MONTHS.map((m, i) => (
        <g key={m}>
          <line x1={x(i)} x2={x(i)} y1={20} y2={H - 6} stroke="rgba(11,11,11,0.06)" />
          <Text x={x(i + 0.5)} y={16} anchor="middle" size={8}>
            {m.slice(0, 1)}
          </Text>
        </g>
      ))}
      {campaigns.map((c, i) => (
        <g key={c.label}>
          <Text x={94} y={b.mid(i) + 3} anchor="end" size={9} color={INK}>
            {c.label}
          </Text>
          <rect x={x(c.start)} y={b.at(i)} width={r1(x(c.end) - x(c.start))} height={b.bw} rx={b.bw / 2} fill={PAL[i]} />
        </g>
      ))}
    </Svg>
  );
}
function Burndown() {
  const x = lin(0, 14, M.l, W - M.r);
  const y = lin(0, 60, H - M.b, M.t);
  const actual = burndown.filter((d) => d.actual !== null);
  return (
    <Svg label="Burndown chart: tasks left each week, planned line against the actual progress">
      <YGrid y={y} max={60} />
      <path d={path(burndown.map((d) => [x(d.week), y(d.plan)]))} fill="none" stroke={MUTED} strokeDasharray="5 3" strokeWidth={1.5} />
      <path d={path(actual.map((d) => [x(d.week), y(d.actual!)]))} fill="none" stroke={PAL[1]} strokeWidth={2.4} />
      {actual.map((d) => (
        <circle key={d.week} cx={x(d.week)} cy={y(d.actual!)} r={2.6} fill={PAL[1]} />
      ))}
      <line x1={x(11)} x2={x(11)} y1={M.t} y2={H - M.b} stroke={INK} strokeDasharray="2 2" />
      <Text x={x(11) + 4} y={M.t + 8} size={8.5} color={INK}>
        {"today"}
      </Text>
      <Text x={x(2)} y={y(burndown[2].plan) - 8} size={8.5}>
        {"plan"}
      </Text>
      {Array.from({ length: 8 }, (_, i) => (
        <Text key={i} x={x(i * 2)} y={H - M.b + 13} anchor="middle" size={8}>
          {`w${i * 2}`}
        </Text>
      ))}
    </Svg>
  );
}
function GanttProgress() {
  const x = lin(0, 14, 90, W - 10);
  const b = band(gantt.length, 22, H - 6, 0.3);
  const today = 9;
  return (
    <Svg label="Gantt with progress: each task's bar filled as far as it's done, with a today line">
      {gantt.map((t, i) => {
        const done = Math.max(0, Math.min(1, (today - t.start) / (t.end - t.start)));
        return (
          <g key={t.label}>
            <Text x={84} y={b.mid(i) + 3} anchor="end" size={9} color={INK}>
              {t.label}
            </Text>
            <rect x={x(t.start)} y={b.at(i)} width={r1(x(t.end) - x(t.start))} height={b.bw} rx={3} fill="rgba(42,120,214,0.2)" />
            <rect x={x(t.start)} y={b.at(i)} width={r1((x(t.end) - x(t.start)) * done)} height={b.bw} rx={3} fill={done >= 1 ? GOOD : PAL[0]} />
            <Text x={x(t.end) + 3} y={b.mid(i) + 3} size={7.5} mono>
              {`${Math.round(done * 100)}%`}
            </Text>
          </g>
        );
      })}
      <line x1={x(today)} x2={x(today)} y1={14} y2={H - 4} stroke={BAD} strokeWidth={1.5} />
      <Text x={x(today)} y={11} anchor="middle" size={8.5} color={BAD} weight={700}>
        {"today"}
      </Text>
    </Svg>
  );
}

/* ---------------------------------------------------------------- geography */
const CELL = 24;
const OX = 14;
const OY = 30;
const pmax = Math.max(...provinces.map((p) => p.stores));
const at = (p: { col: number; row: number }) => ({ x: OX + p.col * CELL, y: OY + p.row * CELL });
function Hex() {
  const R = 13;
  const w = R * Math.sqrt(3);
  return (
    <Svg label="Hex tile map: one hexagon per province, shaded by number of stores">
      {provinces.map((p) => {
        const cx = r1(20 + p.col * w + (p.row % 2 ? w / 2 : 0));
        const cy = r1(34 + p.row * R * 1.5);
        const d =
          Array.from({ length: 6 }, (_, k) => polar(cx, cy, R - 0.8, (k * Math.PI) / 3 + Math.PI / 6))
            .map((q, k) => `${k ? "L" : "M"}${q[0]},${q[1]}`)
            .join(" ") + " Z";
        return (
          <g key={p.code}>
            <path d={d} fill={p.stores ? seq(0.1 + (0.9 * p.stores) / pmax) : "rgba(11,11,11,0.06)"} />
            <Text x={cx} y={cy + 2.5} anchor="middle" size={6} color={p.stores / pmax > 0.5 ? "#fff" : INK} mono>
              {p.code}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
const CLASSES = [0, 3, 8, 20, 99];
const CLASS_COLORS = ["#f1f1f1", "#bcd6f2", "#5e9be0", "#1f5fae", "#0d2f5c"];
const classOf = (v: number) => (v === 0 ? 0 : CLASSES.findIndex((c, i) => v > c && v <= CLASSES[i + 1]) + 1);
function Classed() {
  return (
    <Svg label="Choropleth with classes: provinces grouped into four bands of store counts, with a legend">
      {provinces.map((p) => {
        const { x, y } = at(p);
        return <rect key={p.code} x={x} y={y} width={CELL - 2} height={CELL - 2} rx={4} fill={CLASS_COLORS[Math.min(4, classOf(p.stores))]} />;
      })}
      {["none", "1–3", "4–8", "9–20", "21+"].map((l, i) => (
        <g key={l}>
          <rect x={14 + i * 52} y={8} width={12} height={10} rx={2} fill={CLASS_COLORS[i]} stroke="rgba(11,11,11,0.1)" />
          <Text x={30 + i * 52} y={16} size={8.5}>
            {l}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function Bubbles() {
  return (
    <Svg label="Bubble map: a circle on each province, sized by number of stores">
      {provinces.map((p) => {
        const { x, y } = at(p);
        return <rect key={p.code} x={x} y={y} width={CELL - 2} height={CELL - 2} rx={4} fill="rgba(11,11,11,0.05)" />;
      })}
      {provinces
        .filter((p) => p.stores)
        .map((p) => {
          const { x, y } = at(p);
          return <circle key={p.code} cx={x + 11} cy={y + 11} r={r1(2 + Math.sqrt(p.stores / pmax) * 15)} fill={PAL[1]} opacity={0.55} stroke={PAL[1]} />;
        })}
      <Text x={14} y={16} size={8.5}>
        {"circle area = stores"}
      </Text>
    </Svg>
  );
}
function Dots() {
  return (
    <Svg label="Dot density map: one dot for every store inside its province square">
      {provinces.map((p) => {
        const { x, y } = at(p);
        return (
          <g key={p.code}>
            <rect x={x} y={y} width={CELL - 2} height={CELL - 2} rx={4} fill="rgba(11,11,11,0.04)" />
            {Array.from({ length: p.stores }, (_, k) => (
              <circle key={k} cx={r1(x + 3 + (k % 6) * 3.3)} cy={r1(y + 3 + Math.floor(k / 6) * 3.3)} r={1.2} fill={PAL[0]} />
            ))}
          </g>
        );
      })}
      <Text x={14} y={16} size={8.5}>
        {"● = 1 store"}
      </Text>
    </Svg>
  );
}
function Spikes() {
  return (
    <Svg label="Spike map: a spike rising from each province, height by number of stores">
      {provinces.map((p) => {
        const { x, y } = at(p);
        return <rect key={p.code} x={x} y={y} width={CELL - 2} height={CELL - 2} rx={4} fill="rgba(11,11,11,0.05)" />;
      })}
      {[...provinces]
        .sort((a, b) => a.row - b.row)
        .filter((p) => p.stores)
        .map((p) => {
          const { x, y } = at(p);
          const h = r1((p.stores / pmax) * 60);
          return <path key={p.code} d={`M${x + 5},${y + 18} L${x + 11},${r1(y + 18 - h)} L${x + 17},${y + 18} Z`} fill={PAL[4]} opacity={0.75} stroke="#fff" strokeWidth={0.6} />;
        })}
    </Svg>
  );
}
function FlowMap() {
  const hub = provinces.find((p) => p.code === "JKT")!;
  const h = at(hub);
  const dest = ["SUT", "SSL", "BAL", "JTM", "KTM", "PAP", "ACE", "SLU"].map((c) => provinces.find((p) => p.code === c)!);
  return (
    <Svg label="Flow map: curved lines from the Jakarta roastery to the provinces it ships to">
      {provinces.map((p) => {
        const { x, y } = at(p);
        return <rect key={p.code} x={x} y={y} width={CELL - 2} height={CELL - 2} rx={4} fill={p.code === "JKT" ? INK : "rgba(11,11,11,0.05)"} />;
      })}
      {dest.map((p, k) => {
        const d = at(p);
        const mx = (h.x + d.x) / 2;
        const my = Math.min(h.y, d.y) - 30;
        return (
          <path key={p.code} d={`M${h.x + 11},${h.y + 11} Q${mx},${my} ${d.x + 11},${d.y + 11}`} fill="none" stroke={PAL[k % PAL.length]} strokeWidth={1.2 + (p.stores / pmax) * 3} opacity={0.75} />
        );
      })}
      <Text x={h.x + 11} y={h.y + 38} anchor="middle" size={8} color={INK} weight={700}>
        {"Roastery"}
      </Text>
    </Svg>
  );
}
function Cartogram() {
  return (
    <Svg label="Grid cartogram: each province's square scaled by its number of stores">
      {provinces.map((p) => {
        const { x, y } = at(p);
        const s = r1(4 + Math.sqrt(p.stores / pmax) * (CELL - 4));
        return (
          <g key={p.code}>
            <rect x={r1(x + (CELL - 2 - s) / 2)} y={r1(y + (CELL - 2 - s) / 2)} width={s} height={s} rx={2} fill={p.stores ? PAL[6] : "rgba(11,11,11,0.1)"} opacity={0.85} />
          </g>
        );
      })}
    </Svg>
  );
}
function MapRank() {
  const top = [...provinces].sort((a, b) => b.stores - a.stores).slice(0, 7);
  const cell = 13;
  const x = lin(0, top[0].stores, 260, W - 30);
  return (
    <Svg label="Map plus ranking: a mini tile map beside a bar list of the provinces with the most stores">
      {provinces.map((p) => (
        <rect key={p.code} x={8 + p.col * cell} y={50 + p.row * cell} width={cell - 1.5} height={cell - 1.5} rx={2} fill={top.includes(p) ? PAL[0] : "rgba(11,11,11,0.08)"} />
      ))}
      {top.map((p, i) => (
        <g key={p.code}>
          <Text x={254} y={30 + i * 24} anchor="end" size={8.5} color={INK}>
            {p.name.length > 12 ? p.code : p.name}
          </Text>
          <rect x={260} y={21 + i * 24} width={r1(x(p.stores) - 260)} height={12} rx={2} fill={PAL[0]} />
          <Text x={x(p.stores) + 3} y={30 + i * 24} size={8} mono>
            {p.stores}
          </Text>
        </g>
      ))}
    </Svg>
  );
}

/* ---------------------------------------------------------------- KPI cards & gauges */
const rev = kpis[0];
function BigNumber() {
  const s = rev.series;
  const x = lin(0, s.length - 1, 30, W - 30);
  const y = lin(Math.min(...s) * 0.95, Math.max(...s), 196, 140);
  return (
    <Svg label="Big number: this year's revenue, its change on last year and a small trend">
      <Text x={30} y={40} size={10}>
        {rev.label}
      </Text>
      <Text x={30} y={90} size={42} weight={800} color={INK}>
        {rev.value}
      </Text>
      <rect x={30} y={102} width={78} height={20} rx={10} fill="rgba(27,175,122,0.15)" />
      <Text x={69} y={116} anchor="middle" size={10} color="#138a60" weight={700}>
        {`▲ ${Math.round(rev.delta * 100)}%`}
      </Text>
      <Text x={116} y={116} size={9}>
        {"vs last year"}
      </Text>
      <path d={`${smooth(s.map((v, i) => [x(i), y(v)]))} L${x(s.length - 1)},200 L${x(0)},200 Z`} fill="rgba(42,120,214,0.12)" />
      <path d={smooth(s.map((v, i) => [x(i), y(v)]))} fill="none" stroke={PAL[0]} strokeWidth={2} />
    </Svg>
  );
}
function Needle() {
  const zones = [
    [0, 0.6, BAD],
    [0.6, 0.85, PAL[5]],
    [0.85, 1, GOOD],
  ] as const;
  const a = (v: number) => -Math.PI / 2 + v * Math.PI;
  const [nx, ny] = polar(180, 160, 92, a(targetShare));
  return (
    <Svg label="Speedometer gauge with red, amber and green zones and a needle at the current value">
      {zones.map(([s, e, c]) => (
        <path key={s} d={arc(180, 160, 84, 110, a(s), a(e))} fill={c} opacity={0.85} />
      ))}
      <line x1={180} y1={160} x2={nx} y2={ny} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <circle cx={180} cy={160} r={7} fill={INK} />
      <Text x={180} y={196} anchor="middle" size={20} weight={700} color={INK}>
        {`${Math.round(targetShare * 100)}%`}
      </Text>
      <Text x={180} y={210} anchor="middle" size={8.5}>
        {"of yearly target"}
      </Text>
      <Text x={66} y={172} anchor="middle" size={8} mono>
        {"0%"}
      </Text>
      <Text x={294} y={172} anchor="middle" size={8} mono>
        {"100%"}
      </Text>
    </Svg>
  );
}
function BulletRows() {
  const rows = targets.slice(0, 5);
  const b = band(rows.length, 10, H - 10, 0.45);
  return (
    <Svg label="Bullet KPI rows: each city's revenue against its target, with poor / ok / good bands">
      {rows.map((t, i) => {
        const max = Math.max(t.value, t.target) * 1.15;
        const x = lin(0, max, 90, W - 40);
        return (
          <g key={t.label}>
            <Text x={84} y={b.mid(i) + 3} anchor="end" size={9} color={INK}>
              {t.label}
            </Text>
            <rect x={90} y={b.at(i) - 3} width={r1(x(max) - 90)} height={b.bw + 6} fill="rgba(11,11,11,0.06)" />
            <rect x={90} y={b.at(i) - 3} width={r1(x(t.ok) - 90)} height={b.bw + 6} fill="rgba(11,11,11,0.1)" />
            <rect x={90} y={b.at(i) - 3} width={r1(x(t.poor) - 90)} height={b.bw + 6} fill="rgba(11,11,11,0.16)" />
            <rect x={90} y={b.at(i) + 3} width={r1(x(t.value) - 90)} height={b.bw - 6} fill={INK} />
            <line x1={x(t.target)} x2={x(t.target)} y1={b.at(i) - 5} y2={b.at(i) + b.bw + 5} stroke={PAL[1]} strokeWidth={2.5} />
            <Text x={x(max) + 4} y={b.mid(i) + 3} size={8} mono color={t.value >= t.target ? "#138a60" : BAD}>
              {`${Math.round((t.value / t.target) * 100)}%`}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function Rings() {
  const items = [
    { label: "Revenue", v: targetShare, c: PAL[1] },
    { label: "New members", v: 0.64, c: PAL[2] },
    { label: "App orders", v: 0.91, c: PAL[0] },
  ];
  return (
    <Svg label="Activity rings: three goals as concentric rings, each closing as it's reached (example values)">
      {items.map((it, i) => {
        const rr = 92 - i * 22;
        return (
          <g key={it.label}>
            <circle cx={120} cy={112} r={rr - 9} fill="none" stroke={it.c} strokeOpacity={0.15} strokeWidth={18} />
            <path d={arc(120, 112, rr - 18, rr, 0, Math.PI * 2 * it.v)} fill={it.c} />
            <Text x={240} y={80 + i * 30} size={10} color={it.c} weight={700}>
              {`${Math.round(it.v * 100)}%`}
            </Text>
            <Text x={276} y={80 + i * 30} size={9} color={INK}>
              {it.label}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function Thermo() {
  const y = lin(0, 1, 190, 30);
  return (
    <Svg label="Thermometer: how close the year is to its revenue goal">
      <rect x={160} y={24} width={40} height={170} rx={20} fill="#fff" stroke="rgba(11,11,11,0.2)" />
      <circle cx={180} cy={196} r={24} fill={PAL[1]} />
      <rect x={168} y={y(targetShare)} width={24} height={r1(196 - y(targetShare))} rx={12} fill={PAL[1]} />
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={204} x2={212} y1={y(v)} y2={y(v)} stroke={MUTED} />
          <Text x={216} y={y(v) + 3} size={8.5} mono>
            {`${v * 100}%`}
          </Text>
        </g>
      ))}
      <Text x={150} y={y(targetShare) + 4} anchor="end" size={14} weight={700} color={PAL[1]}>
        {`${Math.round(targetShare * 100)}%`}
      </Text>
    </Svg>
  );
}
function Stepper() {
  const steps = ["Location", "Lease", "Fit-out", "Hiring", "Soft open", "Launch"];
  const done = 3;
  const x = lin(0, steps.length - 1, 34, W - 34);
  return (
    <Svg label="Milestone stepper: six steps to open a store, three done, one in progress">
      <line x1={x(0)} x2={x(steps.length - 1)} y1={100} y2={100} stroke="rgba(11,11,11,0.12)" strokeWidth={4} />
      <line x1={x(0)} x2={x(done)} y1={100} y2={100} stroke={GOOD} strokeWidth={4} />
      {steps.map((s, i) => (
        <g key={s}>
          <circle cx={x(i)} cy={100} r={13} fill={i < done ? GOOD : i === done ? "#fff" : "rgba(11,11,11,0.06)"} stroke={i === done ? GOOD : "none"} strokeWidth={3} />
          <Text x={x(i)} y={104} anchor="middle" size={10} color={i < done ? "#fff" : INK} weight={700}>
            {i < done ? "✓" : String(i + 1)}
          </Text>
          <Text x={x(i)} y={130} anchor="middle" size={8.5} color={i <= done ? INK : MUTED}>
            {s}
          </Text>
        </g>
      ))}
      <Text x={x(done)} y={78} anchor="middle" size={8.5} color="#138a60" weight={700}>
        {"in progress"}
      </Text>
    </Svg>
  );
}
function Tiles() {
  const items = [
    { k: "Revenue", v: "Rp 4.1 bn", d: "+18%", good: true },
    { k: "Orders", v: "1.26 m", d: "+11%", good: true },
    { k: "Avg ticket", v: "Rp 32.6k", d: "+6%", good: true },
    { k: "Satisfaction", v: "4.4", d: "−2%", good: false },
    { k: "Stores", v: String(provinces.reduce((s, p) => s + p.stores, 0)), d: "+9", good: true },
    { k: "Delivery share", v: "27%", d: "+8 pts", good: true },
  ];
  const cw = (W - 24) / 3;
  return (
    <Svg label="Number tiles: six headline numbers in a grid, each with its change">
      {items.map((it, i) => {
        const x = 8 + (i % 3) * (cw + 4);
        const y = 10 + Math.floor(i / 3) * 104;
        return (
          <g key={it.k}>
            <rect x={r1(x)} y={y} width={r1(cw)} height={98} rx={12} fill={i === 0 ? INK : "rgba(11,11,11,0.04)"} />
            <Text x={x + 12} y={y + 22} size={9} color={i === 0 ? "rgba(255,255,255,0.6)" : MUTED}>
              {it.k}
            </Text>
            <Text x={x + 12} y={y + 56} size={18} weight={700} color={i === 0 ? "#fff" : INK}>
              {it.v}
            </Text>
            <Text x={x + 12} y={y + 80} size={9} weight={700} color={it.good ? "#1baf7a" : BAD}>
              {it.d}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}

/* ---------------------------------------------------------------- tables */
const cityRows = revenueByCity.slice(0, 6).map((c) => {
  const series = monthly.find((m) => m.city === c.label)!.values.slice(12);
  const ly = revenueLastYear.find((r) => r.label === c.label)!;
  return { label: c.label, value: c.value, series, change: c.value / ly.a - 1 };
});
function SparkTable() {
  const rh = (H - 30) / cityRows.length;
  return (
    <Svg label="Table with sparklines: each city's revenue, change and twelve-month trend in one row">
      {["City", "Revenue", "Change", "12 months"].map((h, i) => (
        <Text key={h} x={[10, 150, 214, 270][i]} y={16} anchor={i === 1 ? "end" : "start"} size={8.5} weight={700}>
          {h}
        </Text>
      ))}
      {cityRows.map((c, i) => {
        const y0 = 24 + i * rh;
        const sx = lin(0, 11, 270, W - 10);
        const sy = lin(Math.min(...c.series), Math.max(...c.series), y0 + rh - 6, y0 + 5);
        return (
          <g key={c.label}>
            <line x1={8} x2={W - 8} y1={y0} y2={y0} stroke="rgba(11,11,11,0.07)" />
            <Text x={10} y={y0 + rh / 2 + 3} size={9.5} color={INK}>
              {c.label}
            </Text>
            <Text x={150} y={y0 + rh / 2 + 3} anchor="end" size={9.5} mono color={INK}>
              {fmt(c.value)}
            </Text>
            <Text x={214} y={y0 + rh / 2 + 3} size={9} mono color="#138a60">
              {`+${Math.round(c.change * 100)}%`}
            </Text>
            <path d={path(c.series.map((v, k) => [sx(k), sy(v)]))} fill="none" stroke={PAL[0]} strokeWidth={1.4} />
            <circle cx={sx(11)} cy={sy(c.series[11])} r={2} fill={PAL[0]} />
          </g>
        );
      })}
    </Svg>
  );
}
function BarTable() {
  const rh = (H - 30) / cityRows.length;
  const x = lin(0, cityRows[0].value, 160, W - 60);
  return (
    <Svg label="Table with bars in the cells: the number and a bar for its size, side by side">
      {["City", "Revenue"].map((h, i) => (
        <Text key={h} x={[10, 100][i]} y={16} size={8.5} weight={700}>
          {h}
        </Text>
      ))}
      {cityRows.map((c, i) => {
        const y0 = 24 + i * rh;
        return (
          <g key={c.label}>
            <rect x={6} y={y0} width={W - 12} height={r1(rh - 2)} rx={4} fill={i % 2 ? "transparent" : "rgba(11,11,11,0.03)"} />
            <Text x={10} y={y0 + rh / 2 + 3} size={9.5} color={INK}>
              {c.label}
            </Text>
            <Text x={100} y={y0 + rh / 2 + 3} size={9.5} mono color={INK}>
              {fmt(c.value)}
            </Text>
            <rect x={160} y={r1(y0 + rh / 2 - 5)} width={r1(x(c.value) - 160)} height={10} rx={2} fill={PAL[0]} opacity={0.75} />
          </g>
        );
      })}
    </Svg>
  );
}
function Traffic() {
  const rows = targets.slice(0, 5);
  const rh = (H - 30) / rows.length;
  return (
    <Svg label="Status table: a traffic light per city for revenue, satisfaction and speed (example statuses)">
      {["City", "Revenue", "Satisfaction", "Speed"].map((h, i) => (
        <Text key={h} x={[10, 140, 210, 290][i]} y={16} anchor={i ? "middle" : "start"} size={8.5} weight={700}>
          {h}
        </Text>
      ))}
      {rows.map((t, i) => {
        const y0 = 24 + i * rh;
        const st = [t.value >= t.target ? 2 : t.value >= t.ok ? 1 : 0, (i * 2 + 1) % 3, (i + 2) % 3];
        return (
          <g key={t.label}>
            <line x1={8} x2={W - 8} y1={y0} y2={y0} stroke="rgba(11,11,11,0.07)" />
            <Text x={10} y={y0 + rh / 2 + 3} size={9.5} color={INK}>
              {t.label}
            </Text>
            {st.map((s, k) => (
              <circle key={k} cx={[140, 210, 290][k]} cy={r1(y0 + rh / 2)} r={7} fill={[BAD, PAL[5], GOOD][s]} />
            ))}
          </g>
        );
      })}
    </Svg>
  );
}
function Cohort() {
  const cw = (W - 86) / 8;
  const ch = (H - 26) / cohorts.length;
  return (
    <Svg label="Cohort retention table: of customers who joined each month, the share still ordering n months later">
      {Array.from({ length: 8 }, (_, n) => (
        <Text key={n} x={r1(82 + n * cw + cw / 2)} y={14} anchor="middle" size={8}>
          {`M${n}`}
        </Text>
      ))}
      {cohorts.map((c, i) => (
        <g key={c.label}>
          <Text x={76} y={r1(20 + i * ch + ch / 2 + 3)} anchor="end" size={8.5} color={INK}>
            {c.label}
          </Text>
          {c.values.map((v, n) => (
            <g key={n}>
              <rect x={r1(82 + n * cw)} y={r1(20 + i * ch)} width={r1(cw - 2)} height={r1(ch - 2)} rx={2} fill={seq(v)} />
              <Text x={r1(82 + n * cw + cw / 2)} y={r1(20 + i * ch + ch / 2 + 3)} anchor="middle" size={7} mono color={v > 0.5 ? "#fff" : INK}>
                {`${Math.round(v * 100)}`}
              </Text>
            </g>
          ))}
        </g>
      ))}
    </Svg>
  );
}
function Leaderboard() {
  const rows = revenueByCity.slice(0, 5);
  const medal = ["#d4a017", "#a8a9ad", "#b06a35"];
  return (
    <Svg label="Leaderboard: the top cities with medals for the first three">
      {rows.map((c, i) => {
        const y0 = 14 + i * 40;
        return (
          <g key={c.label}>
            <rect x={10} y={y0} width={W - 20} height={34} rx={10} fill={i === 0 ? "rgba(212,160,23,0.12)" : "rgba(11,11,11,0.035)"} />
            <circle cx={32} cy={y0 + 17} r={11} fill={medal[i] ?? "rgba(11,11,11,0.12)"} />
            <Text x={32} y={y0 + 21} anchor="middle" size={10} color={i < 3 ? "#fff" : INK} weight={700}>
              {i + 1}
            </Text>
            <Text x={54} y={y0 + 21} size={11} color={INK} weight={600}>
              {c.label}
            </Text>
            <Text x={W - 22} y={y0 + 21} anchor="end" size={11} mono color={INK} weight={700}>
              {fmt(c.value)}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}
function DeltaTable() {
  const rows = [...revenueLastYear].sort((a, b) => b.b / b.a - a.b / a.a).slice(0, 6);
  const rh = (H - 30) / rows.length;
  return (
    <Svg label="Change table: last year, this year and the change with an arrow and colour">
      {["City", "Last year", "This year", "Change"].map((h, i) => (
        <Text key={h} x={[10, 160, 240, W - 12][i]} y={16} anchor={i ? "end" : "start"} size={8.5} weight={700}>
          {h}
        </Text>
      ))}
      {rows.map((r, i) => {
        const y0 = 24 + i * rh;
        const ch = r.b / r.a - 1;
        return (
          <g key={r.label}>
            <line x1={8} x2={W - 8} y1={y0} y2={y0} stroke="rgba(11,11,11,0.07)" />
            <Text x={10} y={y0 + rh / 2 + 3} size={9.5} color={INK}>
              {r.label}
            </Text>
            <Text x={160} y={y0 + rh / 2 + 3} anchor="end" size={9} mono>
              {fmt(r.a)}
            </Text>
            <Text x={240} y={y0 + rh / 2 + 3} anchor="end" size={9} mono color={INK}>
              {fmt(r.b)}
            </Text>
            <rect x={W - 74} y={r1(y0 + rh / 2 - 8)} width={62} height={16} rx={8} fill={div(Math.min(1, ch * 3))} />
            <Text x={W - 18} y={y0 + rh / 2 + 3} anchor="end" size={9} mono color="#0d5c3f" weight={700}>
              {`▲ ${(ch * 100).toFixed(1)}%`}
            </Text>
          </g>
        );
      })}
    </Svg>
  );
}

export const FLOW_VARIANTS = [
  ...defs("Flow & process", "Funnels", [
    ["fl-bars", "Funnel bars with conversion", "Funnels where the step-to-step rate matters.", "Steps that aren't a sequence.", FunnelBars],
    ["fl-dropoff", "Drop-off funnel", "Showing what is lost at each step.", "Many steps: the hatching gets busy.", DropOff],
    ["fl-vertical", "Vertical funnel", "Funnels in a dashboard row.", "Long step names.", VFunnel],
  ]),
  ...defs("Flow & process", "Flows", [
    ["fl-alluvial", "Alluvial diagram", "How members move between categories over time.", "Many categories or stages.", Alluvial],
    ["fl-journey", "Customer journey", "Where an experience feels good or painful.", "Steps measured on different scales.", Journey],
    ["fl-swimlane", "Swimlane process", "Who does what, in which order.", "Showing quantities.", Swimlane],
  ]),
  ...defs("Flow & process", "Timelines", [
    ["fl-milestones", "Milestone timeline", "A story of key moments over time.", "Precise durations.", Milestones],
    ["fl-campaigns", "Campaign timeline", "When things ran and how they overlap.", "Many short events.", Campaigns],
    ["fl-burndown", "Burndown chart", "Is the project on track against plan?", "Work that keeps changing size.", Burndown],
    ["fl-ganttprog", "Gantt with progress", "Status of each task against today.", "Long task lists without grouping.", GanttProgress],
  ]),
  ...defs("Geography", "Tile maps", [
    ["geo-hex", "Hex tile map", "Equal-size regions with a softer, map-like look.", "Readers expecting real shapes.", Hex],
    ["geo-classed", "Classed choropleth", "Grouping regions into a few clear bands.", "When class breaks hide real differences.", Classed],
    ["geo-cartogram", "Grid cartogram", "Region importance shown as square size.", "When location precision matters.", Cartogram],
    ["geo-rank", "Map plus ranking", "Where the top regions are and how they rank.", "Too many regions in the list.", MapRank],
  ]),
  ...defs("Geography", "Symbol maps", [
    ["geo-bubble", "Bubble map", "Counts per region as circle area.", "Overlapping bubbles in dense areas.", Bubbles],
    ["geo-dots", "Dot density map", "Showing that each dot is a real thing.", "Large counts: dots merge.", Dots],
    ["geo-spike", "Spike map", "Big differences between regions, dramatically.", "Spikes hiding regions behind them.", Spikes],
    ["geo-flow", "Flow map", "Shipments or movement from a hub.", "Many crossing flows.", FlowMap],
  ]),
  ...defs("KPIs & tables", "Cards & gauges", [
    ["kp-big", "Big number with trend", "The one number a page must say, with context.", "Without comparison: a number alone means little.", BigNumber],
    ["kp-needle", "Speedometer gauge", "One value against red/amber/green zones.", "Several values: bullets use less space.", Needle],
    ["kp-bullets", "Bullet KPI rows", "Many actual-vs-target values in little space.", "Audiences who haven't seen bullets: add a legend.", BulletRows],
    ["kp-rings", "Activity rings", "Two or three goals, playfully.", "Precise comparison between rings.", Rings],
    ["kp-thermo", "Thermometer goal", "Fundraising-style progress, very clear.", "Values that pass the goal by a lot.", Thermo],
    ["kp-stepper", "Milestone stepper", "Progress through ordered stages.", "Stages of very different length.", Stepper],
    ["kp-tiles", "Number tiles", "A headline row of KPIs, each with its change.", "Too many tiles: pick the five that matter.", Tiles],
  ]),
  ...defs("KPIs & tables", "Tables", [
    ["kp-spark", "Table with sparklines", "Exact numbers plus the trend behind each.", "Very wide tables.", SparkTable],
    ["kp-bartable", "Table with bars", "Numbers that need to be scanned for size.", "Negative values without a centre line.", BarTable],
    ["kp-traffic", "Status table", "Many items × a few health checks.", "Colour-blind readers: add icons or text.", Traffic],
    ["kp-cohort", "Cohort retention table", "How long new customers keep coming back.", "Few customers per cohort.", Cohort],
    ["kp-leader", "Leaderboard", "Ranking with a sense of competition.", "When the gaps matter more than ranks.", Leaderboard],
    ["kp-delta", "Change table", "Before, after and change in one view.", "Mixed directions without colour meaning.", DeltaTable],
  ]),
];
