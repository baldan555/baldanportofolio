"use client";

import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { experiments, stackGraph } from "@/data/profile";
import { ease, Kicker, SplitWords } from "./motion";

type N = SimulationNodeDatum & { id: string; label: string; hub: boolean };
type L = { source: N | string; target: N | string };

/** Force-directed skill graph. Drag nodes; hover to trace connections; the cursor pushes nodes aside. */
export function Stack() {
  return (
    <section id="stack" className="relative overflow-hidden py-28 md:py-36">
      <div className="mx-auto max-w-[1240px] px-5 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-6 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
              <Kicker text="( 06 )  Toolkit" />
            </p>
            <h2 className="text-[3.6rem] leading-[0.92] font-semibold tracking-[-0.055em] sm:text-[6rem]">
              <SplitWords text="My Stack" />
            </h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="font-hand text-[24px] text-ink-2/70"
          >
            drag the dots around ↓
          </motion.p>
        </div>
      </div>

      <Graph />

      <div className="mt-6">
        <p className="mx-auto mb-5 max-w-[1240px] px-5 text-[15px] text-muted md:px-10">
          Plus {experiments.length} experiments in ML & deep learning
        </p>
        <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div className="animate-marquee flex w-max gap-2.5 pr-2.5 [animation-duration:60s]">
            {[...experiments, ...experiments].map((e, i) => (
              <span key={i} className="rounded-full border border-ink/10 bg-white px-4 py-2 text-[14px] whitespace-nowrap">
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Graph() {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 620 });
  const [, setTick] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const mouse = useRef({ x: -9999, y: -9999 });

  const { nodes, links } = useMemo(() => {
    const nodes: N[] = [
      ...stackGraph.hubs.map((h) => ({ id: h.id, label: h.label, hub: true })),
      ...stackGraph.leaves.map((l) => ({ id: l.id, label: l.id, hub: false })),
    ];
    const links: L[] = stackGraph.leaves.flatMap((l) => l.hubs.map((h) => ({ source: l.id, target: h })));
    // hubs connect to each other loosely
    links.push({ source: "web", target: "cloud" }, { source: "mobile", target: "cloud" }, { source: "auto", target: "cloud" }, { source: "data", target: "cloud" });
    return { nodes, links };
  }, []);

  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>();
    const add = (a: string, b: string) => {
      if (!m.has(a)) m.set(a, new Set());
      m.get(a)!.add(b);
    };
    stackGraph.leaves.forEach((l) => l.hubs.forEach((h) => (add(l.id, h), add(h, l.id))));
    return m;
  }, []);

  useEffect(() => {
    const el = wrap.current!;
    const measure = () => {
      const w = el.clientWidth;
      setSize({ w, h: w < 640 ? 620 : 720 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setStarted(true), { threshold: 0.2 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    const { w, h } = size;
    const small = w < 640;
    nodes.forEach((n) => {
      if (n.x === undefined) {
        n.x = w / 2 + (Math.random() - 0.5) * 40;
        n.y = h / 2 + (Math.random() - 0.5) * 40;
      }
    });

    const hubPos: Record<string, [number, number]> = {
      web: [0.24, 0.3],
      mobile: [0.74, 0.24],
      auto: [0.8, 0.72],
      data: [0.28, 0.74],
      cloud: [0.52, 0.5],
    };

    const sim = forceSimulation<N>(nodes)
      .force(
        "link",
        forceLink<N, L & { source: N; target: N }>(links as (L & { source: N; target: N })[])
          .id((d) => d.id)
          .distance((l) => ((l.source as N).hub && (l.target as N).hub ? (small ? 140 : 260) : small ? 62 : 105))
          .strength(0.5),
      )
      .force("charge", forceManyBody<N>().strength((d) => (d.hub ? -520 : -140)))
      .force("collide", forceCollide<N>().radius((d) => (d.hub ? 46 : small ? 26 : 34)))
      .force("x", forceX<N>((d) => (d.hub ? hubPos[d.id][0] * w : w / 2)).strength((d) => (d.hub ? 0.25 : 0.03)))
      .force("y", forceY<N>((d) => (d.hub ? hubPos[d.id][1] * h : h / 2)).strength((d) => (d.hub ? 0.25 : 0.05)))
      .force("cursor", () => {
        const { x: mx, y: my } = mouse.current;
        for (const n of nodes) {
          const dx = (n.x ?? 0) - mx;
          const dy = (n.y ?? 0) - my;
          const d = Math.hypot(dx, dy);
          if (d < 90 && d > 0.1 && n.fx == null) {
            const f = (1 - d / 90) * 2.2;
            n.vx = (n.vx ?? 0) + (dx / d) * f;
            n.vy = (n.vy ?? 0) + (dy / d) * f;
          }
        }
      })
      .force("bounds", () => {
        for (const n of nodes) {
          n.x = Math.max(40, Math.min(w - 40, n.x ?? 0));
          n.y = Math.max(30, Math.min(h - 30, n.y ?? 0));
        }
      })
      .velocityDecay(0.32)
      .stop();

    // Pre-settle the layout so it never opens as a tangled ball, then keep it gently alive.
    sim.tick(260);
    sim.alpha(0.3).alphaTarget(0.015).on("tick", () => setTick((t) => t + 1)).restart();

    // gentle idle wander
    const wander = setInterval(() => {
      const n = nodes[Math.floor(Math.random() * nodes.length)];
      if (n.fx == null) {
        n.vx = (n.vx ?? 0) + (Math.random() - 0.5) * 3;
        n.vy = (n.vy ?? 0) + (Math.random() - 0.5) * 3;
      }
    }, 700);

    // pause when offscreen
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? sim.restart() : sim.stop()));
    io.observe(wrap.current!);

    return () => {
      sim.stop();
      clearInterval(wander);
      io.disconnect();
    };
  }, [started, size, nodes, links]);

  const toLocal = (e: React.PointerEvent | PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * size.w, y: ((e.clientY - r.top) / r.height) * size.h };
  };

  const startDrag = (n: N) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const p = toLocal(ev);
      n.fx = p.x;
      n.fy = p.y;
    };
    const up = () => {
      n.fx = null;
      n.fy = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const lit = (id: string) => !hover || hover === id || neighbors.get(hover)?.has(id);

  return (
    <div ref={wrap} className="relative mx-auto mt-6 max-w-[1400px] px-2">
      <svg
        ref={svg}
        viewBox={`0 0 ${size.w} ${size.h}`}
        className="w-full touch-pan-y select-none"
        style={{ height: size.h }}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") mouse.current = toLocal(e);
        }}
        onPointerLeave={() => (mouse.current = { x: -9999, y: -9999 })}
      >
        {links.map((l, i) => {
          const s = l.source as N;
          const t = l.target as N;
          if (s.x === undefined || t.x === undefined) return null;
          const on = hover && (s.id === hover || t.id === hover);
          return (
            <line
              key={i}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke="#0b0b0b"
              strokeOpacity={on ? 0.7 : hover ? 0.05 : s.hub && t.hub ? 0.25 : 0.14}
              strokeWidth={on ? 1.5 : 1}
              strokeDasharray={s.hub && t.hub ? "4 6" : undefined}
              style={{ transition: "stroke-opacity .25s" }}
            />
          );
        })}
        {nodes.map((n, i) =>
          n.x === undefined ? null : (
            <motion.g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: lit(n.id) ? 1 : 0.18 }}
              transition={{ duration: 0.25, delay: started && !hover ? 0 : 0 }}
              onPointerEnter={() => setHover(n.id)}
              onPointerLeave={() => setHover(null)}
              onPointerDown={startDrag(n)}
              data-cursor="Drag"
              style={{ cursor: "grab" }}
            >
              <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + i * 0.03, duration: 0.6, ease }}>
                {n.hub ? (
                  <>
                    <circle r={hover === n.id ? 13 : 10} fill="#0b0b0b" style={{ transition: "r .2s" }} />
                    <circle r="20" fill="none" stroke="#0b0b0b" strokeOpacity="0.15" />
                    <text y="-30" textAnchor="middle" fontSize={size.w < 640 ? 12 : 14} fontWeight={600} fill="#0b0b0b" className="pointer-events-none">
                      {n.label}
                    </text>
                  </>
                ) : (
                  <>
                    <circle r={hover === n.id ? 7 : 5} fill="white" stroke="#0b0b0b" strokeWidth="1.6" style={{ transition: "r .2s" }} />
                    <text y="-12" textAnchor="middle" fontSize={size.w < 640 ? 10.5 : 12} fill="#2b2b2b" className="pointer-events-none font-mono">
                      {n.label}
                    </text>
                  </>
                )}
              </motion.g>
            </motion.g>
          ),
        )}
      </svg>
    </div>
  );
}
