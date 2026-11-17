"use client";

import { useEffect, useState } from "react";

/*
 * How this page really loaded in the visitor's browser, from the Performance API (Navigation, Resource and Paint
 * Timing, plus Largest Contentful Paint). Nothing is sent anywhere; it is read once the page has finished loading.
 */
export type Kind = "html" | "css" | "font" | "js" | "img" | "data" | "other";
export const KINDS: Kind[] = ["html", "css", "font", "js", "img", "data", "other"];
export const KIND_LABEL: Record<Kind, string> = { html: "HTML", css: "CSS", font: "Fonts", js: "JavaScript", img: "Images", data: "Data (API)", other: "Other" };
export const KIND_COLOR: Record<Kind, string> = { html: "#0b0b0b", css: "#6250d6", font: "#2a78d6", js: "#e0a800", img: "#1baf7a", data: "#eb6834", other: "#9a9a9a" };

export type Timing = {
  url: string;
  samePage: boolean;
  local: boolean;
  protocol: string;
  /** phase durations, ms */
  dns: number;
  connect: number;
  tls: number;
  wait: number;
  download: number;
  build: number;
  ready: number;
  load: number;
  total: number;
  fcp: number | null;
  lcp: number | null;
  domReady: number;
  kinds: Record<Kind, { n: number; bytes: number }>;
  files: number;
  bytes: number;
  cached: number;
};

export function kindOf(r: PerformanceResourceTiming): Kind {
  const path = r.name.split("?")[0].toLowerCase();
  if (r.initiatorType === "fetch" || r.initiatorType === "xmlhttprequest" || r.initiatorType === "beacon") return "data";
  if (/\.(woff2?|ttf|otf)$/.test(path)) return "font";
  if (/\.css$/.test(path) || r.initiatorType === "css") return "css";
  if (/\.m?js$/.test(path) || r.initiatorType === "script") return "js";
  if (r.initiatorType === "img" || r.initiatorType === "image" || /\.(png|jpe?g|gif|webp|avif|svg|ico)$/.test(path)) return "img";
  return "other";
}

function read(lcp: number | null): Timing | null {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav || !nav.loadEventEnd) return null;
  const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const kinds = Object.fromEntries(KINDS.map((k) => [k, { n: 0, bytes: 0 }])) as Timing["kinds"];
  const htmlBytes = nav.transferSize || nav.encodedBodySize;
  kinds.html = { n: 1, bytes: htmlBytes };
  let cached = 0;
  for (const r of res) {
    const k = kindOf(r);
    kinds[k].n += 1;
    kinds[k].bytes += r.transferSize || r.encodedBodySize;
    if (r.transferSize === 0 && r.encodedBodySize > 0) cached += 1;
  }
  const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null;
  const tlsStart = nav.secureConnectionStart > 0 ? nav.secureConnectionStart : nav.connectEnd;
  const here = new URL(nav.name);
  return {
    url: here.pathname,
    samePage: here.pathname === location.pathname,
    local: ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname),
    protocol: nav.nextHopProtocol || "http",
    dns: nav.domainLookupEnd - nav.domainLookupStart,
    connect: tlsStart - nav.connectStart,
    tls: nav.connectEnd - tlsStart,
    wait: nav.responseStart - nav.requestStart,
    download: nav.responseEnd - nav.responseStart,
    build: nav.domInteractive - nav.responseEnd,
    ready: nav.domContentLoadedEventEnd - nav.domInteractive,
    load: nav.loadEventEnd - nav.domContentLoadedEventEnd,
    total: nav.loadEventEnd - nav.startTime,
    domReady: nav.domContentLoadedEventEnd - nav.startTime,
    fcp,
    lcp,
    kinds,
    files: res.length + 1,
    bytes: KINDS.reduce((a, k) => a + kinds[k].bytes, 0),
    cached,
  };
}

/** The visitor's real page-load numbers, once loading has finished (null before that, and on the server). */
export function usePageTiming() {
  const [t, setT] = useState<Timing | null>(null);
  useEffect(() => {
    let lcp: number | null = null;
    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((list) => {
        const e = list.getEntries();
        if (e.length) lcp = e[e.length - 1].startTime;
      });
      po.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      po = null;
    }
    let timer = 0;
    const measure = () => {
      // read a little after load so late files are counted; once more a bit later for lazy ones
      timer = window.setTimeout(() => {
        setT(read(lcp));
        timer = window.setTimeout(() => setT(read(lcp)), 2500);
      }, 300);
    };
    if (document.readyState === "complete") measure();
    else window.addEventListener("load", measure, { once: true });
    return () => {
      window.removeEventListener("load", measure);
      window.clearTimeout(timer);
      po?.disconnect();
    };
  }, []);
  return t;
}

export const ms = (v: number | null | undefined) => (v == null ? "…" : v < 1 ? "under 1 ms" : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`);
/** For paint metrics a browser may not report at all (null once measuring is done). */
export const msOr = (v: number | null | undefined) => (v == null ? "not reported" : ms(v));
export const size = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${Math.round(b / 1e3)} KB` : `${b} B`);
