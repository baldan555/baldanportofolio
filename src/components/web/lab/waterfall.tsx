"use client";

import { useEffect, useState } from "react";
import { KINDS, KIND_COLOR, KIND_LABEL, kindOf, size, type Kind } from "../timing";

/*
 * Every file this page loaded, as a network waterfall, read from the visitor's own Resource Timing entries.
 * Cross-origin files only expose their phases when the server allows it (Timing-Allow-Origin); others show one bar.
 */
type Row = {
  id: number;
  name: string;
  short: string;
  host: string;
  kind: Kind;
  start: number;
  end: number;
  req: number;
  resp: number;
  dns: number;
  connect: number;
  transfer: number;
  body: number;
  decoded: number;
  cached: boolean;
  proto: string;
  blocking?: string;
  detailed: boolean;
};
function readRows(): Row[] {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const all: PerformanceResourceTiming[] = nav ? [nav as unknown as PerformanceResourceTiming, ...res] : res;
  return all.map((r, id) => {
    const u = new URL(r.name, location.href);
    const file = u.pathname.split("/").filter(Boolean).pop() ?? u.host;
    const isNav = id === 0 && !!nav;
    return {
      id,
      name: r.name,
      short: isNav ? `${u.pathname} (this page)` : file.length > 38 ? `${file.slice(0, 18)}…${file.slice(-16)}` : file,
      host: u.host,
      kind: isNav ? "html" : kindOf(r),
      start: r.startTime,
      end: r.responseEnd,
      req: r.requestStart,
      resp: r.responseStart,
      dns: r.domainLookupEnd - r.domainLookupStart,
      connect: r.connectEnd - r.connectStart,
      transfer: r.transferSize,
      body: r.encodedBodySize,
      decoded: r.decodedBodySize,
      cached: r.transferSize === 0 && r.encodedBodySize > 0,
      proto: r.nextHopProtocol,
      blocking: (r as PerformanceResourceTiming & { renderBlockingStatus?: string }).renderBlockingStatus,
      detailed: r.requestStart > 0,
    };
  });
}

export function Waterfall() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [slow, setSlow] = useState(false);
  const [sel, setSel] = useState(0);
  const [local, setLocal] = useState(false);
  const load = () => {
    setRows(readRows());
    setLocal(["localhost", "127.0.0.1"].includes(location.hostname));
  };
  useEffect(() => {
    const go = () => window.setTimeout(load, 400);
    if (document.readyState === "complete") {
      const id = go();
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, []);
  const shown = rows.filter((r) => filter === "all" || r.kind === filter).sort((a, b) => (slow ? b.end - b.start - (a.end - a.start) : a.start - b.start));
  const maxEnd = Math.max(1, ...rows.map((r) => r.end));
  const x = (t: number) => `${(t / maxEnd) * 100}%`;
  const ticks = Array.from({ length: 5 }, (_, i) => (maxEnd / 4) * i);
  const s = rows.find((r) => r.id === sel) ?? rows[0];
  const bytes = rows.reduce((a, r) => a + r.transfer, 0);
  const slowest = rows.length ? rows.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a)) : null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [String(rows.length || "…"), "files, including this page"],
          [rows.length ? size(bytes) : "…", "transferred over the network"],
          [String(rows.filter((r) => r.cached).length), "straight from your cache"],
          [slowest ? `${Math.round(slowest.end - slowest.start)} ms` : "…", slowest ? `slowest: ${slowest.short}` : "slowest file"],
        ].map(([v, k]) => (
          <div key={k} className="rounded-2xl border border-line bg-white px-3 py-2.5">
            <p className="text-[1.4rem] leading-none font-semibold tabular-nums">{v}</p>
            <p className="mt-1 truncate text-[11.5px] text-ink-2/55">{k}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {[["all", "All"] as const, ...KINDS.map((k) => [k, KIND_LABEL[k]] as const)].map(([k, label]) => {
          const n = k === "all" ? rows.length : rows.filter((r) => r.kind === k).length;
          if (!n) return null;
          return (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition ${filter === k ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:border-ink"}`}>
              {k !== "all" && <i className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k] }} />}
              {label} <span className="font-mono text-[10.5px] opacity-60">{n}</span>
            </button>
          );
        })}
        <button type="button" onClick={() => setSlow((v) => !v)} aria-pressed={slow} className={`ml-auto rounded-full px-3 py-1.5 text-[12px] ${slow ? "bg-[#eb6834] text-white" : "border border-line bg-white"}`}>
          {slow ? "Slowest first" : "In loading order"}
        </button>
        <button type="button" onClick={load} className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] hover:border-ink">
          Refresh
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[20px] border border-line bg-white">
          <div className="grid grid-cols-[minmax(0,11rem)_1fr] gap-2 border-b border-line px-3 py-1.5 font-mono text-[10px] text-ink-2/50">
            <span>file</span>
            <span className="relative h-3">
              {ticks.map((t, i) => (
                <span key={i} className="absolute -translate-x-1/2" style={{ left: x(t) }}>
                  {Math.round(t)}
                </span>
              ))}
            </span>
          </div>
          <div data-lenis-prevent className="h-[440px] overflow-y-auto">
            {shown.map((r) => {
              const before = r.detailed ? Math.max(0, r.req - r.start) : 0;
              const wait = r.detailed ? Math.max(0, r.resp - r.req) : 0;
              const down = r.detailed ? Math.max(0, r.end - r.resp) : r.end - r.start;
              const total = Math.max(0.0001, before + wait + down);
              return (
                <button key={r.id} type="button" onClick={() => setSel(r.id)} className={`grid w-full grid-cols-[minmax(0,11rem)_1fr] items-center gap-2 px-3 py-[3px] text-left transition ${sel === r.id ? "bg-cream" : "hover:bg-cream/50"}`}>
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px]">
                    <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[r.kind] }} />
                    <span className="truncate">{r.short}</span>
                  </span>
                  <span className="relative h-3.5">
                    {ticks.slice(1).map((t, i) => (
                      <span key={i} className="absolute top-0 h-full w-px bg-ink/5" style={{ left: x(t) }} />
                    ))}
                    <span className="absolute top-[3px] flex h-2 overflow-hidden rounded-full" style={{ left: x(r.start), width: `max(3px, ${((r.end - r.start) / maxEnd) * 100}%)`, opacity: r.cached ? 0.45 : 1 }}>
                      {r.detailed ? (
                        <>
                          <span style={{ width: `${(before / total) * 100}%`, background: "#cfc8bb" }} />
                          <span style={{ width: `${(wait / total) * 100}%`, background: "#c29a00" }} />
                          <span style={{ width: `${(down / total) * 100}%`, background: KIND_COLOR[r.kind] }} />
                        </>
                      ) : (
                        <span className="w-full" style={{ background: `repeating-linear-gradient(45deg, ${KIND_COLOR[r.kind]}, ${KIND_COLOR[r.kind]} 3px, transparent 3px, transparent 5px)` }} />
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
            {!rows.length && <p className="px-3 py-8 text-center text-[12.5px] text-ink-2/55">Reading this page&apos;s files…</p>}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line px-3 py-2 text-[10.5px] text-ink-2/60">
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-3 rounded-sm bg-[#cfc8bb]" /> queue, DNS, connect
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-3 rounded-sm bg-[#c29a00]" /> waiting for the server
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-3 rounded-sm bg-ink" /> downloading (colour = file type)
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-3 rounded-sm" style={{ background: "repeating-linear-gradient(45deg,#0b0b0b,#0b0b0b 2px,transparent 2px,transparent 4px)" }} /> phases hidden by the other server
            </span>
          </div>
        </div>
        <aside className="lg:sticky lg:top-36 lg:self-start">
          {s ? (
            <div className="rounded-[20px] bg-ink p-4 text-white">
              <p className="font-mono text-[10.5px] tracking-[0.14em] text-white/45 uppercase">{KIND_LABEL[s.kind]}</p>
              <p className="mt-1 text-[1.1rem] leading-snug font-semibold break-all">{s.short}</p>
              <p className="mt-0.5 font-mono text-[10.5px] break-all text-white/45">{s.host}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                {[
                  ["started at", `${Math.round(s.start)} ms`],
                  ["took", `${Math.round(s.end - s.start)} ms`],
                  ["waiting for server", s.detailed ? `${Math.round(Math.max(0, s.resp - s.req))} ms` : "hidden"],
                  ["downloading", s.detailed ? `${Math.round(Math.max(0, s.end - s.resp))} ms` : "hidden"],
                  ["over the network", s.cached ? "0 B (cache)" : s.transfer ? size(s.transfer) : "hidden"],
                  ["unpacked size", s.decoded ? size(s.decoded) : "hidden"],
                  ["protocol", s.proto || "—"],
                  ["render-blocking", s.blocking ?? "not reported"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.07] px-2.5 py-2">
                    <p className="text-[10.5px] text-white/45">{k}</p>
                    <p className="mt-0.5 font-mono text-[12px]">{v}</p>
                  </div>
                ))}
              </div>
              {s.body > 0 && s.decoded > s.body && <p className="mt-2 text-[11.5px] text-white/60">Compressed {Math.round((1 - s.body / s.decoded) * 100)}% on the way (gzip or Brotli).</p>}
            </div>
          ) : (
            <div className="rounded-[20px] bg-cream/60 p-6 text-center text-[12.5px] text-ink-2/55">Select a file.</div>
          )}
        </aside>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        Read from your browser&apos;s Resource Timing after the page loaded; the time axis is milliseconds since you opened it. Files from other servers hide their phases unless those servers allow it.
        {local ? " You're on a local development server: files are bigger and unminified compared with the live site." : ""}
      </p>
    </div>
  );
}
