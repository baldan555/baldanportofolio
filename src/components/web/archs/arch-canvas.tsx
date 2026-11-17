"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { DOMAIN, HOME, STATUS, Z, type EdgeKind, type Kind, type Place, type Status } from "@/data/web-archs";
import type { FTone } from "@/data/web-flows";
import { Glyph, TONE } from "../concepts/flow";

/*
 * One canvas for every architecture. Parts keep their identity across architectures, so switching animates each box
 * to its new place, size and style: the monolith's modules fly out into services, shrink into functions, or fold
 * into a provider. A journey hop sends a labelled packet; an incident paints each part's status.
 */
export const CW = 640;
export const CH = 340;
const INK = "#0b0b0b";
const SANS = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const MORPH = { duration: 0.85, ease: [0.65, 0, 0.35, 1] as [number, number, number, number] };
const r1 = (v: number) => Math.round(v * 10) / 10;

type Style = { fill: string; stroke: string; sw: number; dash?: string; text: string; sub: string };
const BASE: Record<Kind, Style> = {
  client: { fill: "#ffffff", stroke: "rgba(11,11,11,0.25)", sw: 1.2, text: INK, sub: "rgba(11,11,11,0.55)" },
  infra: { fill: INK, stroke: INK, sw: 1.2, text: "#ffffff", sub: "rgba(255,255,255,0.6)" },
  container: { fill: "#f4f1eb", stroke: "rgba(11,11,11,0.25)", sw: 1.4, text: INK, sub: "rgba(11,11,11,0.5)" },
  module: { fill: "#ffffff", stroke: "rgba(11,11,11,0.16)", sw: 1.1, text: INK, sub: "rgba(11,11,11,0.55)" },
  bounded: { fill: "#ffffff", stroke: INK, sw: 2, text: INK, sub: "rgba(11,11,11,0.55)" },
  service: { fill: "#ffffff", stroke: "rgba(11,11,11,0.45)", sw: 1.5, text: INK, sub: "rgba(11,11,11,0.55)" },
  fn: { fill: "#ffffff", stroke: "rgba(11,11,11,0.5)", sw: 1.3, dash: "5 3", text: INK, sub: "rgba(11,11,11,0.55)" },
  page: { fill: "#eaf8f1", stroke: "rgba(27,175,122,0.6)", sw: 1.2, text: "#0f6e4c", sub: "rgba(15,110,76,0.7)" },
  db: { fill: "#ffffff", stroke: "rgba(11,11,11,0.32)", sw: 1.3, text: INK, sub: "rgba(11,11,11,0.55)" },
  bus: { fill: "#eaf2fb", stroke: "rgba(42,120,214,0.55)", sw: 1.3, text: "#1d5aa6", sub: "rgba(29,90,166,0.7)" },
  ext: { fill: "#ffffff", stroke: "rgba(11,11,11,0.45)", sw: 1.3, dash: "1.5 3", text: INK, sub: "rgba(11,11,11,0.55)" },
  table: { fill: "#ffffff", stroke: INK, sw: 1.5, text: INK, sub: "rgba(11,11,11,0.55)" },
};
/** Anything drawn on this canvas: parts keyed by id (the id is what morphs), and lines between them. */
export type DEdge = { from: string; to: string; kind: EdgeKind; d?: string };
export type Drawing = { id: string; name: string; parts: Partial<Record<string, Place>>; edges: DEdge[] };
export type CanvasHop = { from: string; to: string; tag: string; net: boolean; tone?: FTone };
/** Per drawing set: drawing order, part colours, where a part starts before it first appears, container fills. */
export type Spec = { z: string[]; domain: Partial<Record<string, string>>; home: Partial<Record<string, Place>>; fills?: Partial<Record<string, string>> };
export const ARCH_SPEC: Spec = { z: Z, domain: DOMAIN, home: HOME, fills: { box: "#f4f1eb", cdn: "#eef7f2", baas: "#f2f0fa" } };
const STRIPED: Kind[] = ["module", "bounded", "service", "fn"];

function styleOf(id: string, p: Place, spec: Spec): Style {
  const s = { ...BASE[p.kind] };
  const dom = spec.domain[id];
  if (p.kind === "container") s.fill = spec.fills?.[id] ?? s.fill;
  if ((p.kind === "bounded" || p.kind === "table") && dom) s.stroke = dom;
  if (p.kind === "db" && dom) {
    s.fill = `${dom}14`;
    s.stroke = dom;
  }
  return s;
}

/* ------------------------------------------------------------------ geometry */
const center = (p: Place) => [p.x + p.w / 2, p.y + p.h / 2];
/** Where the line from p's centre towards (tx, ty) leaves p's box. */
function clip(p: Place, tx: number, ty: number) {
  const [cx, cy] = center(p);
  const dx = tx - cx,
    dy = ty - cy;
  const t = Math.min(dx ? p.w / 2 / Math.abs(dx) : Infinity, dy ? p.h / 2 / Math.abs(dy) : Infinity, 1);
  return [cx + dx * t, cy + dy * t];
}
/** A part inside another (a module in its app) is reached at its own edge, not the container's. */
function segment(a: Place, b: Place) {
  const [ax, ay] = center(a),
    [bx, by] = center(b);
  const inside = (o: Place, i: Place) => i.x >= o.x && i.y >= o.y && i.x + i.w <= o.x + o.w && i.y + i.h <= o.y + o.h;
  const s = inside(a, b) ? [ax, ay] : clip(a, bx, by);
  const e = inside(b, a) ? [bx, by] : clip(b, ax, ay);
  return [s, e] as const;
}
function edgePath(e: DEdge, a: Place, b: Place) {
  if (e.d) return e.d;
  const [[x0, y0], [x1, y1]] = segment(a, b);
  if (e.kind !== "call") return `M${r1(x0)},${r1(y0)} L${r1(x1)},${r1(y1)}`;
  const mx = (x0 + x1) / 2,
    my = (y0 + y1) / 2,
    len = Math.hypot(x1 - x0, y1 - y0) || 1;
  return `M${r1(x0)},${r1(y0)} Q${r1(mx - ((y1 - y0) / len) * 16)},${r1(my + ((x1 - x0) / len) * 16)} ${r1(x1)},${r1(y1)}`;
}
const EDGE: Record<EdgeKind, { stroke: string; w: number; dash?: string; marker?: string }> = {
  sync: { stroke: "rgba(11,11,11,0.38)", w: 1.4, marker: "k" },
  api: { stroke: "rgba(11,11,11,0.55)", w: 1.5, marker: "k" },
  call: { stroke: "rgba(11,11,11,0.36)", w: 1.2, dash: "2 3" },
  async: { stroke: "#2a78d6", w: 1.4, dash: "5 4", marker: "b" },
  data: { stroke: "#1baf7a", w: 1.4, dash: "5 4", marker: "g" },
};

/* ------------------------------------------------------------------ a part */
function Part({ id, p, status, mini, spec }: { id: string; p: Place | undefined; status?: Status; mini?: boolean; spec: Spec }) {
  const home = (p ?? spec.home[id]) as Place;
  const shown = !!p;
  const q = p ?? home;
  const s = styleOf(id, q, spec);
  const dom = spec.domain[id];
  const tall = q.h > q.w * 2;
  const chip = q.w < 60 && !tall;
  const isBox = q.kind === "container";
  // big boxes (containers, a database holding tables) keep their label in the top-left corner
  const top = isBox || (!tall && q.h > 80);
  const striped = STRIPED.includes(q.kind) && !!dom;
  const tx = striped ? 16 : 12;
  const st = status ? STATUS[status] : null;
  const bw = st ? st.label.length * 5.6 + 14 : 0;
  const centered = q.kind === "client" || q.kind === "infra" || q.kind === "table" || chip || tall;
  return (
    <motion.g initial={p ? false : { x: home.x, y: home.y, opacity: 0 }} animate={shown ? { x: q.x, y: q.y, opacity: 1 } : { opacity: 0 }} transition={MORPH} style={{ pointerEvents: "none" }}>
      {/* extra copies when scaled out */}
      {[10, 5].map((o) => (
        <motion.rect key={o} x={o} y={o} rx={isBox ? 16 : 10} initial={false} animate={{ width: q.w, height: q.h, opacity: status === "scaled" ? 1 : 0 }} transition={MORPH} fill="#ffffff" stroke={STATUS.scaled.color} strokeOpacity={0.55} strokeWidth={1.2} />
      ))}
      <motion.rect initial={false} animate={{ width: q.w, height: q.h }} transition={MORPH} rx={isBox ? 16 : chip ? 8 : 10} fill={s.fill} stroke={s.stroke} strokeWidth={mini ? s.sw * 1.6 : s.sw} strokeDasharray={s.dash} />
      {striped && <motion.rect x={4} y={7} width={4} rx={2} initial={false} animate={{ height: Math.max(0, q.h - 14) }} transition={MORPH} fill={dom} />}
      {q.schemas &&
        ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6"].map((c, i) => (
          <rect key={c} x={10 + i * ((q.w - 20) / 4)} y={q.h - 22} width={(q.w - 20) / 4 - 3} height={12} rx={3} fill={c} opacity={0.75} />
        ))}
      {/* status overlay */}
      <motion.rect
        initial={false}
        animate={{ width: q.w, height: q.h, opacity: status && status !== "scaled" ? 1 : 0 }}
        transition={{ duration: 0.35 }}
        rx={isBox ? 16 : 10}
        fill={status === "down" ? "rgba(200,65,63,0.12)" : status === "slow" ? "rgba(194,154,0,0.13)" : "rgba(235,104,52,0.06)"}
        stroke={st?.color ?? "transparent"}
        strokeWidth={2.2}
        strokeDasharray={status === "deploy" ? "6 4" : undefined}
      />
      {!mini && (
        <>
          {q.icon && (q.kind === "client" || tall) && <Glyph icon={q.icon} x={q.w / 2 - 8} y={tall ? 12 : 9} color={s.text} />}
          {q.icon && centered && top && q.kind === "infra" && <Glyph icon={q.icon} x={q.w / 2 - 8} y={q.h / 2 + 4} color={s.sub} />}
          {q.icon && !centered && q.w >= 90 && <Glyph icon={q.icon} x={q.w - 26} y={top ? 12 : q.h / 2 - 8} color={s.sub} />}
          <text
            x={centered ? q.w / 2 : tx}
            y={top ? 22 : q.kind === "client" ? 40 : tall ? 46 : chip ? q.h / 2 + 4 : q.sub ? q.h / 2 - 2 : q.h / 2 + 4.5}
            textAnchor={centered ? "middle" : "start"}
            fontSize={chip ? 10 : q.kind === "table" ? 11 : q.kind === "infra" ? 12 : 12.5}
            fontWeight={750}
            fill={chip && dom ? dom : s.text}
            fontFamily={SANS}
          >
            {q.label}
          </text>
          {q.sub && !chip && q.kind !== "table" && (
            <text x={centered ? q.w / 2 : tx} y={top ? 37 : q.kind === "client" ? 52 : tall ? 59 : q.h / 2 + 12} textAnchor={centered ? "middle" : "start"} fontSize={9.5} fill={s.sub} fontFamily={SANS}>
              {q.sub}
            </text>
          )}
          <motion.g initial={false} animate={{ opacity: st ? 1 : 0 }} transition={{ duration: 0.3 }}>
            <rect x={q.w - bw + 6} y={-9} width={bw} height={17} rx={8.5} fill={st?.color ?? "transparent"} />
            <text x={q.w - bw / 2 + 6} y={3} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#fff" fontFamily={SANS}>
              {st?.label ?? ""}
            </text>
          </motion.g>
        </>
      )}
    </motion.g>
  );
}

/* ------------------------------------------------------------------ the canvas */
export function ArchCanvas({ arch, hop, run = 0, status, mini, spec = ARCH_SPEC }: { arch: Drawing; hop?: CanvasHop | null; run?: number; status?: Partial<Record<string, Status>>; mini?: boolean; spec?: Spec }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const parts = arch.parts;
  const a = hop ? parts[hop.from] : undefined;
  const b = hop ? parts[hop.to] : undefined;
  const seg = a && b ? segment(a, b) : null;
  const color = hop ? TONE[hop.tone ?? "req"] : INK;
  const tw = hop ? Math.round(hop.tag.length * 5.9 + 16) : 0;
  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="block h-auto w-full" role="img" aria-label={`${arch.name}: ${Object.values(parts).map((p) => p?.label).join(", ")}`}>
      <defs>
        <pattern id={`${uid}d`} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" fill="rgba(11,11,11,0.08)" />
        </pattern>
        {(
          [
            ["k", "rgba(11,11,11,0.5)"],
            ["b", "#2a78d6"],
            ["g", "#1baf7a"],
          ] as const
        ).map(([k, c]) => (
          <marker key={k} id={`${uid}${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={c} />
          </marker>
        ))}
      </defs>
      {!mini && <rect width={CW} height={CH} fill={`url(#${uid}d)`} />}
      {/* containers first, then the lines, then everything else on top */}
      {spec.z.filter((id) => (parts[id] ?? spec.home[id])?.kind === "container").map((id) => (
        <Part key={id} id={id} p={parts[id]} status={status?.[id]} mini={mini} spec={spec} />
      ))}
      {/* lines fade in after the boxes have moved (a CSS animation, so the server-rendered drawing is complete) */}
      <style>{"@keyframes archEdgeIn{from{opacity:0}to{opacity:1}}"}</style>
      <g key={arch.id} style={mini ? undefined : { animation: "archEdgeIn .4s ease .6s both" }}>
        {arch.edges.map((e) => {
          const pa = parts[e.from],
            pb = parts[e.to];
          if (!pa || !pb) return null;
          const k = EDGE[e.kind];
          return <path key={`${e.from}>${e.to}`} d={edgePath(e, pa, pb)} fill="none" stroke={k.stroke} strokeWidth={mini ? k.w * 1.5 : k.w} strokeDasharray={k.dash} markerEnd={k.marker && !mini ? `url(#${uid}${k.marker})` : undefined} />;
        })}
      </g>
      {spec.z.filter((id) => (parts[id] ?? spec.home[id])?.kind !== "container").map((id) => (
        <Part key={id} id={id} p={parts[id]} status={status?.[id]} mini={mini} spec={spec} />
      ))}
      {/* the hop: active line, pulse on the receiver, travelling packet */}
      {hop && seg && b && (
        <g key={`${arch.id}-${run}-${hop.from}-${hop.to}-${hop.tag}`}>
          <path d={`M${r1(seg[0][0])},${r1(seg[0][1])} L${r1(seg[1][0])},${r1(seg[1][1])}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray={hop.net ? "6 4" : "2 3"} opacity={0.9}>
            <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.8s" repeatCount="indefinite" />
          </path>
          <motion.rect x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} rx={13} fill="none" stroke={color} strokeWidth={2.2} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.35] }} transition={{ delay: 0.8, duration: 0.9 }} />
          <motion.g initial={{ x: seg[0][0], y: seg[0][1], opacity: 0 }} animate={{ x: seg[1][0], y: seg[1][1], opacity: [0, 1, 1, 0.92] }} transition={{ duration: 0.95, ease: "easeInOut" }}>
            <rect x={-tw / 2} y={-9} width={tw} height={18} rx={9} fill={hop.net ? color : "#ffffff"} stroke={color} strokeWidth={1.4} strokeDasharray={hop.net ? undefined : "3 2"} />
            <text y={3.6} textAnchor="middle" fontSize={10} fontWeight={700} fill={hop.net ? "#fff" : color} fontFamily={MONO}>
              {hop.tag}
            </text>
          </motion.g>
        </g>
      )}
    </svg>
  );
}
