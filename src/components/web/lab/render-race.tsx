"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/*
 * Four ways to render the same page, raced on one timeline: client-side rendering, server rendering, static pages
 * from a CDN, and streaming server rendering. A simple model (stated on the page), not a measurement: round trips,
 * bandwidth, server time and JavaScript cost decide when each one shows something, shows the content and responds.
 */
type Net = { id: string; label: string; rtt: number; kbps: number };
const NETS: Net[] = [
  { id: "wifi", label: "Fast Wi-Fi", rtt: 25, kbps: 6000 },
  { id: "4g", label: "4G", rtt: 70, kbps: 1500 },
  { id: "3g", label: "Slow 3G", rtt: 400, kbps: 50 },
];
const CPU = 1.0; // ms of parse + hydrate per KB of JavaScript (a mid-range phone)
const HTML_KB = 30;
const SHELL_KB = 4;
const EDGE = 0.35; // a CDN edge is nearby: its round trip is a fraction of the origin's
type Phase = { label: string; from: number; to: number; color: string; row: 0 | 1 };
type Lane = { id: string; name: string; how: string; phases: Phase[]; fcp: number; lcp: number; tti: number; early: "blank" | "spinner" | "skeleton"; fresh: string };
const C = { net: "#cfc8bb", html: "#0b0b0b", server: "#6250d6", data: "#2a78d6", js: "#e0a800", run: "#eb6834" };

function model(n: Net, serverMs: number, jsKB: number): Lane[] {
  const dl = (kb: number, rtt = n.rtt) => rtt + (kb / n.kbps) * 1000;
  const con = 2 * n.rtt; // TCP + TLS handshakes
  const hyd = jsKB * CPU;
  // client-side rendering
  const cShell = con + dl(SHELL_KB);
  const cJs = cShell + dl(jsKB);
  const cRun = cJs + hyd;
  const cData = cRun + n.rtt + serverMs + (5 / n.kbps) * 1000;
  // server rendering
  const sWork = con + n.rtt / 2 + serverMs;
  const sHtml = sWork + n.rtt / 2 + (HTML_KB / n.kbps) * 1000;
  const sJs = sHtml + dl(jsKB);
  // static, from a CDN edge
  const e = n.rtt * EDGE;
  const gCon = 2 * e;
  const gHtml = gCon + dl(HTML_KB, e);
  const gJs = gHtml + dl(jsKB, e);
  // streaming server rendering
  const tShell = con + n.rtt / 2 + 20 + (SHELL_KB / n.kbps) * 1000;
  const tData = con + n.rtt / 2 + serverMs + n.rtt / 2 + (HTML_KB / n.kbps) * 1000;
  const tJs = tShell + dl(jsKB);
  return [
    {
      id: "csr",
      name: "Client-side (SPA)",
      how: "an empty page, then JavaScript builds everything",
      phases: [
        { label: "connect", from: 0, to: con, color: C.net, row: 0 },
        { label: "empty HTML", from: con, to: cShell, color: C.html, row: 0 },
        { label: "fetch data", from: cRun, to: cData, color: C.data, row: 0 },
        { label: "download JS", from: cShell, to: cJs, color: C.js, row: 1 },
        { label: "run JS", from: cJs, to: cRun, color: C.run, row: 1 },
      ],
      fcp: cRun,
      lcp: cData,
      tti: cData,
      early: "spinner",
      fresh: "live",
    },
    {
      id: "ssr",
      name: "Server-rendered",
      how: "the server fetches data and sends finished HTML",
      phases: [
        { label: "connect", from: 0, to: con, color: C.net, row: 0 },
        { label: "server works", from: con, to: sWork, color: C.server, row: 0 },
        { label: "HTML", from: sWork, to: sHtml, color: C.html, row: 0 },
        { label: "download JS", from: sHtml, to: sJs, color: C.js, row: 1 },
        { label: "hydrate", from: sJs, to: sJs + hyd, color: C.run, row: 1 },
      ],
      fcp: sHtml,
      lcp: sHtml,
      tti: sJs + hyd,
      early: "blank",
      fresh: "live",
    },
    {
      id: "ssg",
      name: "Static (pre-built)",
      how: "HTML built at deploy time, served from a nearby CDN",
      phases: [
        { label: "connect (CDN)", from: 0, to: gCon, color: C.net, row: 0 },
        { label: "HTML", from: gCon, to: gHtml, color: C.html, row: 0 },
        { label: "download JS", from: gHtml, to: gJs, color: C.js, row: 1 },
        { label: "hydrate", from: gJs, to: gJs + hyd, color: C.run, row: 1 },
      ],
      fcp: gHtml,
      lcp: gHtml,
      tti: gJs + hyd,
      early: "blank",
      fresh: "as of the last build",
    },
    {
      id: "stream",
      name: "Streaming SSR",
      how: "a skeleton at once, content streams in when the data is ready",
      phases: [
        { label: "connect", from: 0, to: con, color: C.net, row: 0 },
        { label: "shell", from: con, to: tShell, color: C.html, row: 0 },
        { label: "data streams in", from: tShell, to: tData, color: C.server, row: 0 },
        { label: "download JS", from: tShell, to: tJs, color: C.js, row: 1 },
        { label: "hydrate", from: tJs, to: tJs + hyd, color: C.run, row: 1 },
      ],
      fcp: tShell,
      lcp: tData,
      tti: Math.max(tData, tJs + hyd),
      early: "skeleton",
      fresh: "live",
    },
  ];
}

const secs = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`);

/** What the visitor sees in that lane at time t. */
function Frame({ lane, t }: { lane: Lane; t: number }) {
  const state = t < lane.fcp ? "blank" : t < lane.lcp ? lane.early : t < lane.tti ? "content" : "live";
  return (
    <div className="relative h-[86px] overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex h-3 items-center gap-0.5 border-b border-line bg-cream/60 px-1">
        {[0, 1, 2].map((i) => (
          <i key={i} className="h-1 w-1 rounded-full bg-ink/25" />
        ))}
      </div>
      {state === "blank" && <p className="absolute inset-0 top-3 grid place-items-center text-[9.5px] text-ink-2/40">blank</p>}
      {state === "spinner" && (
        <div className="absolute inset-0 top-3 grid place-items-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
        </div>
      )}
      {state === "skeleton" && (
        <div className="space-y-1.5 p-2">
          <div className="h-2.5 w-3/5 animate-pulse rounded bg-ink/10" />
          <div className="h-1.5 w-4/5 animate-pulse rounded bg-ink/10" />
          <div className="h-1.5 w-2/3 animate-pulse rounded bg-ink/10" />
          <div className="h-5 w-full animate-pulse rounded bg-ink/10" />
        </div>
      )}
      {(state === "content" || state === "live") && (
        <div className="space-y-1 p-2">
          <div className="h-2.5 w-3/5 rounded bg-ink" />
          <div className="h-1.5 w-4/5 rounded bg-ink/30" />
          <div className="flex gap-1">
            <div className="h-6 flex-1 rounded bg-[#a9c6ea]" />
            <div className="h-6 flex-1 rounded bg-[#f3cd7a]" />
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded px-1.5 py-[1px] text-[7.5px] font-bold text-white" style={{ background: state === "live" ? "#eb6834" : "rgba(11,11,11,0.25)" }}>
              Buy
            </span>
            <span className="text-[7.5px] text-ink-2/50">{state === "live" ? "clickable" : "not clickable yet"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function RenderRace() {
  const [netId, setNetId] = useState("4g");
  const [serverMs, setServerMs] = useState(400);
  const [jsKB, setJsKB] = useState(400);
  const net = NETS.find((n) => n.id === netId) as Net;
  const lanes = useMemo(() => model(net, serverMs, jsKB), [net, serverMs, jsKB]);
  const maxT = Math.max(...lanes.map((l) => l.tti)) * 1.06;
  const [t, setT] = useState(Infinity);
  const [playing, setPlaying] = useState(false);
  const tick = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    tick.current = window.setInterval(() => setT((x) => Math.min(maxT, (x === Infinity ? 0 : x) + maxT / 120)), 33);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [playing, maxT]);
  useEffect(() => {
    if (!playing || t < maxT) return;
    const id = window.setTimeout(() => setPlaying(false), 0);
    return () => window.clearTimeout(id);
  }, [playing, t, maxT]);
  const now = Math.min(t, maxT);
  const x = (v: number) => `${(Math.min(v, maxT) / maxT) * 100}%`;
  const best = (k: "fcp" | "lcp" | "tti") => Math.min(...lanes.map((l) => l[k]));
  const change = (fn: () => void) => {
    fn();
    setPlaying(false);
    setT(Infinity);
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-[24px] border border-line bg-white p-4 md:grid-cols-3">
        <div>
          <p className="text-[12px] font-semibold">Network</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {NETS.map((n) => (
              <button key={n.id} type="button" aria-pressed={netId === n.id} onClick={() => change(() => setNetId(n.id))} className={`rounded-full px-3 py-1.5 text-[12px] ${netId === n.id ? "bg-ink text-white" : "border border-line text-ink/70 hover:border-ink"}`}>
                {n.label}
              </button>
            ))}
          </div>
          <p className="mt-1 font-mono text-[10.5px] text-ink-2/50">
            round trip {net.rtt} ms · {net.kbps >= 1000 ? `${net.kbps / 1000} MB/s` : `${net.kbps} KB/s`}
          </p>
        </div>
        <label className="text-[12px] font-semibold">
          Server needs for its data: <span className="font-mono">{serverMs} ms</span>
          <input type="range" min={0} max={1500} step={50} value={serverMs} onChange={(e) => change(() => setServerMs(Number(e.target.value)))} className="mt-2 w-full accent-[#6250d6]" />
        </label>
        <label className="text-[12px] font-semibold">
          JavaScript to download: <span className="font-mono">{jsKB} KB</span>
          <input type="range" min={50} max={1500} step={50} value={jsKB} onChange={(e) => change(() => setJsKB(Number(e.target.value)))} className="mt-2 w-full accent-[#e0a800]" />
        </label>
      </div>

      <div className="rounded-[24px] bg-[#fbfaf7] p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setT(0);
              setPlaying(true);
            }}
            className="rounded-full bg-ink px-4 py-1.5 text-[12.5px] font-semibold text-white"
          >
            {playing ? "Racing…" : "Race them"}
          </button>
          <input
            type="range"
            min={0}
            max={Math.round(maxT)}
            value={Math.round(now)}
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value));
            }}
            aria-label="Time"
            className="min-w-[160px] flex-1 accent-[#0b0b0b]"
          />
          <span className="w-16 text-right font-mono text-[12px] tabular-nums">{secs(now)}</span>
        </div>
        <div className="space-y-2.5">
          {lanes.map((l) => (
            <div key={l.id} className="grid gap-3 sm:grid-cols-[150px_1fr]">
              <div>
                <Frame lane={l} t={now} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="text-[13.5px] font-semibold">{l.name}</p>
                  <p className="text-[11px] text-ink-2/55">{l.how}</p>
                </div>
                <div className="relative mt-1.5 h-[34px]">
                  {[0, 1].map((row) => (
                    <div key={row} className="absolute right-0 left-0 h-[13px] rounded-full bg-ink/[0.04]" style={{ top: row * 17 }}>
                      {l.phases
                        .filter((p) => p.row === row)
                        .map((p) => (
                          <span key={p.label} title={`${p.label}: ${secs(p.to - p.from)}`} className="absolute top-0 h-full overflow-hidden rounded-full px-1 text-[8.5px] leading-[13px] whitespace-nowrap text-white" style={{ left: x(p.from), width: `max(2px, calc(${x(p.to)} - ${x(p.from)}))`, background: p.color, color: p.color === C.net ? "#0b0b0b" : "#fff" }}>
                            {p.label}
                          </span>
                        ))}
                    </div>
                  ))}
                  <span className="pointer-events-none absolute -top-1 h-[42px] w-[2px] rounded-full bg-[#eb6834]" style={{ left: x(now) }} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10.5px]">
                  <span style={{ color: l.fcp === best("fcp") ? "#1baf7a" : undefined }}>◆ first paint {secs(l.fcp)}</span>
                  <span style={{ color: l.lcp === best("lcp") ? "#1baf7a" : undefined }}>★ content {secs(l.lcp)}</span>
                  <span style={{ color: l.tti === best("tti") ? "#1baf7a" : undefined }}>✓ clickable {secs(l.tti)}</span>
                  <span className="text-ink-2/50">data: {l.fresh}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-ink-2/60">
          {[
            [C.net, "connecting"],
            [C.html, "HTML"],
            [C.server, "server fetching data"],
            [C.data, "browser fetching data"],
            [C.js, "downloading JavaScript"],
            [C.run, "running JavaScript / hydrating"],
          ].map(([c, l]) => (
            <span key={l} className="inline-flex items-center gap-1">
              <i className="h-2 w-3 rounded-sm" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        A model, not a measurement: two round trips to connect, the HTML is {HTML_KB} KB, JavaScript costs {CPU} ms per KB to run on a mid-range phone, and a CDN edge is {Math.round(EDGE * 100)}% as far away as the server. Green marks the winner of each moment. Try slow 3G with a big bundle, then a slow server: the winner changes. This site is pre-built (static) and fetches live numbers in the browser.
      </p>
    </div>
  );
}
