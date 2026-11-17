"use client";

import { useState } from "react";
import type { Flow, FNode } from "@/data/web-flows";
import { FlowCard } from "../concepts/flow";

/* Four ways to build a mobile app, each as an animated flow of how code becomes pixels, a comparison table and a
 * four-question picker. The comparison is a rule of thumb, stated as such on the page. */
const n = (id: string, x: number, y: number, label: string, icon: FNode["icon"], sub?: string, tone?: FNode["tone"]): FNode => ({ id, x, y, label, icon, sub, tone });
type WayId = "native" | "rn" | "flutter" | "pwa";
const WAYS: { id: WayId; name: string; tools: string; flow: Flow }[] = [
  {
    id: "native",
    name: "Native",
    tools: "Swift (iOS) and Kotlin (Android)",
    flow: {
      nodes: [n("code", 52, 75, "Swift · Kotlin", "code", "two codebases"), n("cmp", 162, 75, "Compiler", "box", "Xcode · Android Studio", "dark"), n("ui", 272, 75, "Native UI", "phone", "UIKit · Compose")],
      steps: [
        { from: "code", to: "cmp", tag: "build", say: "Each platform gets its own app, written in its own language.", tone: "req" },
        { from: "cmp", to: "ui", tag: "machine code", say: "Compiled straight to the phone's processor, using the platform's own buttons and lists.", tone: "ok" },
        { from: "ui", to: "ui", tag: "full speed", say: "Every new phone feature is available on day one.", tone: "data" },
      ],
    },
  },
  {
    id: "rn",
    name: "React Native",
    tools: "React + TypeScript, usually with Expo",
    flow: {
      nodes: [n("js", 54, 75, "React (TS)", "code", "one codebase"), n("jsi", 162, 75, "JSI bridge", "box", "talks to native", "dark"), n("ios", 272, 32, "iOS views", "phone", "real UIView"), n("and", 272, 118, "Android views", "phone", "real android.view")],
      steps: [
        { from: "js", to: "jsi", tag: "<View />", say: "You write React components in TypeScript.", tone: "req" },
        { from: "jsi", to: "ios", tag: "UIView", say: "They become real native views on iOS…", tone: "data" },
        { from: "jsi", to: "and", tag: "android.view", say: "…and on Android, from the same code.", tone: "ok" },
      ],
    },
  },
  {
    id: "flutter",
    name: "Flutter",
    tools: "Dart",
    flow: {
      nodes: [n("dart", 54, 75, "Dart widgets", "code", "one codebase"), n("eng", 162, 75, "Flutter engine", "box", "Impeller", "dark"), n("px", 272, 75, "Pixels", "phone", "drawn by Flutter")],
      steps: [
        { from: "dart", to: "eng", tag: "widget tree", say: "You describe the screen as a tree of Dart widgets.", tone: "req" },
        { from: "eng", to: "px", tag: "paint", say: "Flutter draws every pixel itself instead of using the platform's views.", tone: "ok" },
        { from: "px", to: "px", tag: "same everywhere", say: "So it looks identical on every phone, down to the pixel.", tone: "data" },
      ],
    },
  },
  {
    id: "pwa",
    name: "Installable web app",
    tools: "HTML, CSS, JavaScript (a PWA)",
    flow: {
      nodes: [n("web", 54, 75, "Web app", "code", "HTML · CSS · JS"), n("sw", 164, 30, "Service worker", "shield", "offline cache"), n("br", 164, 120, "Browser engine", "browser", undefined, "dark"), n("home", 274, 75, "Home screen", "phone", "installed icon")],
      steps: [
        { from: "web", to: "br", tag: "open URL", say: "It starts as a website, no store needed.", tone: "req" },
        { from: "web", to: "sw", tag: "cache files", say: "A service worker keeps its files, so it can open offline.", tone: "data" },
        { from: "br", to: "home", tag: "install", say: "Add it to the home screen and it opens full-screen, like an app.", tone: "ok" },
        { from: "sw", to: "home", tag: "works offline", say: "Updates ship the moment you deploy, for everyone.", tone: "ok" },
      ],
    },
  },
];
const ROWS: [string, Record<WayId, string>][] = [
  ["Performance", { native: "best", rn: "very good", flutter: "very good", pwa: "good" }],
  ["Code shared by iOS and Android", { native: "none: two apps", rn: "most of it", flutter: "most of it", pwa: "all: one web app" }],
  ["Device features", { native: "everything, first", rn: "nearly all (+ native modules)", flutter: "nearly all (+ plugins)", pwa: "limited, especially on iOS" }],
  ["In the app stores", { native: "yes", rn: "yes", flutter: "yes", pwa: "optional" }],
  ["Shipping an update", { native: "store review", rn: "store review, or over-the-air for JS", flutter: "store review", pwa: "instant on deploy" }],
  ["Team you need", { native: "iOS + Android developers", rn: "React / TypeScript developers", flutter: "Dart developers", pwa: "web developers" }],
];
const QS: { q: string; yes: Partial<Record<WayId, number>>; no: Partial<Record<WayId, number>> }[] = [
  { q: "Do you need the deepest device features or top performance (AR, heavy animation, long background work)?", yes: { native: 3, flutter: 1 }, no: { pwa: 1, rn: 1 } },
  { q: "One small team for both iOS and Android?", yes: { rn: 2, flutter: 2, pwa: 2 }, no: { native: 2 } },
  { q: "Must it be in the App Store and Google Play?", yes: { native: 1, rn: 1, flutter: 1 }, no: { pwa: 3 } },
  { q: "Does your team already build web apps with React?", yes: { rn: 2, pwa: 1 }, no: { flutter: 1, native: 1 } },
];

export function WaysToBuild() {
  const [ans, setAns] = useState<(boolean | null)[]>(QS.map(() => null));
  const score: Record<WayId, number> = { native: 0, rn: 0, flutter: 0, pwa: 0 };
  ans.forEach((a, i) => {
    if (a == null) return;
    for (const [k, v] of Object.entries(a ? QS[i].yes : QS[i].no) as [WayId, number][]) score[k] += v;
  });
  const answered = ans.filter((a) => a != null).length;
  const best = (Object.keys(score) as WayId[]).sort((a, b) => score[b] - score[a])[0];
  const W = WAYS.find((w) => w.id === best) as (typeof WAYS)[number];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {WAYS.map((w, i) => (
          <article key={w.id} className={`flex flex-col rounded-[22px] border bg-white p-3 transition ${answered && best === w.id ? "border-[#eb6834] shadow-[0_0_0_2px_rgba(235,104,52,0.25)]" : "border-line"}`}>
            <p className="px-1 font-mono text-[11px] text-muted">0{i + 1}</p>
            <h3 className="px-1 text-[1.2rem] font-semibold tracking-[-0.02em]">{w.name}</h3>
            <p className="px-1 text-[12px] text-ink-2/55">{w.tools}</p>
            <div className="mt-2">
              <FlowCard flow={w.flow} />
            </div>
          </article>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[22px] border border-line bg-white">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-2.5 text-left font-mono text-[10.5px] font-normal text-ink-2/50 uppercase">rule of thumb</th>
              {WAYS.map((w) => (
                <th key={w.id} className={`px-3 py-2.5 text-left font-semibold ${answered && best === w.id ? "text-[#eb6834]" : ""}`}>
                  {w.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([k, v]) => (
              <tr key={k} className="border-b border-line last:border-0">
                <td className="px-4 py-2 text-ink-2/60">{k}</td>
                {WAYS.map((w) => (
                  <td key={w.id} className="px-3 py-2">
                    {v[w.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          {QS.map((q, i) => (
            <div key={q.q} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white px-4 py-3">
              <p className="max-w-xl text-[13px] font-medium">{q.q}</p>
              <div className="flex gap-1">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" aria-pressed={ans[i] === v} onClick={() => setAns((a) => a.map((x, j) => (j === i ? (x === v ? null : v) : x)))} className={`rounded-full px-3.5 py-1.5 text-[12.5px] ${ans[i] === v ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}>
                    {v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col rounded-[22px] bg-ink p-5 text-white">
          <p className="font-mono text-[11px] tracking-[0.16em] text-white/45 uppercase">{answered ? `Your fit · ${answered} of ${QS.length} answered` : "Your fit"}</p>
          {answered ? (
            <>
              <p className="mt-2 text-[2rem] leading-none font-semibold tracking-[-0.04em]">{W.name}</p>
              <p className="mt-1 text-[13px] text-white/65">{W.tools}</p>
              <div className="mt-4 space-y-1.5">
                {WAYS.map((w) => (
                  <div key={w.id} className="grid grid-cols-[8rem_1fr_1.5rem] items-center gap-2 text-[11.5px]">
                    <span className="truncate text-white/70">{w.name}</span>
                    <span className="h-2 rounded-full bg-white/10">
                      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${(score[w.id] / Math.max(1, score[best])) * 100}%`, background: w.id === best ? "#eb6834" : "rgba(255,255,255,0.45)" }} />
                    </span>
                    <span className="text-right font-mono text-white/50">{score[w.id]}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-[1.3rem] leading-snug font-semibold">Answer a question or two and the best fit lights up above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
