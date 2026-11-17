"use client";

import Link from "next/link";
import { useState } from "react";
import type { WebTool } from "@/data/web-tools";
import type { Logo } from "./logos";

/**
 * "Anatomy of a modern app": the layers every web, SaaS or mobile product is made of, as a stack you can click.
 * Requests flow down from the person to the data and back; side services plug in from the right.
 */
type L = { id: string; name: string; what: string; without: string; tools: string[]; side?: boolean; concepts: string };
const LAYERS: L[] = [
  { id: "ui", name: "Interface", what: "The screens people see and touch: pages, forms, buttons, the phone app.", without: "Nothing to use; or a different look on every page.", tools: ["react", "next", "vue", "tailwind", "rn", "flutter"], concepts: "interface" },
  { id: "api", name: "API", what: "The contract between screens and server: which requests exist and what they return.", without: "Every screen talks to the database directly, and one change breaks them all.", tools: ["next", "express", "fastapi", "laravel", "go"], concepts: "api" },
  { id: "logic", name: "Business logic", what: "The rules: prices, permissions, workflows, what happens after an order.", without: "Rules copied into many places, slowly disagreeing.", tools: ["fastapi", "nest", "django", "spring"], concepts: "logic" },
  { id: "data", name: "Data", what: "Where things are remembered: the database, files, caches.", without: "Everything is forgotten on refresh.", tools: ["postgres", "mysql", "mongodb", "redis", "prisma", "firestore"], concepts: "data" },
  { id: "infra", name: "Infrastructure", what: "Where it runs and how it ships: servers, containers, CDN, deploys.", without: "It works on one laptop only.", tools: ["docker", "cloudrun", "vercel", "cloudflare", "gha"], concepts: "infra" },
  { id: "auth", name: "Auth", what: "Who you are and what you may do: logins, sessions, roles.", without: "Anyone can see anyone's data.", tools: ["authjs", "clerk", "auth0"], side: true, concepts: "auth" },
  { id: "pay", name: "Payments", what: "Plans, checkout, invoices, refunds.", without: "No way to get paid, or a spreadsheet of who owes what.", tools: ["stripe", "xendit", "midtrans"], side: true, concepts: "saas" },
  { id: "notify", name: "Notifications", what: "Email, push and chat messages that bring people back.", without: "People miss what matters.", tools: ["firestore", "expo"], side: true, concepts: "mobile" },
  { id: "observe", name: "Observability", what: "Logs, errors and usage: knowing it broke before users tell you.", without: "You find out from an angry message.", tools: ["sentry", "gha"], side: true, concepts: "observe" },
];
const INK = "#0b0b0b";
const ORANGE = "#eb6834";

export function Anatomy({ tools, logos }: { tools: WebTool[]; logos: Record<string, Logo> }) {
  const [on, setOn] = useState("api");
  const byId = new Map(tools.map((t) => [t.id, t]));
  const L = LAYERS.find((l) => l.id === on) as L;
  const main = LAYERS.filter((l) => !l.side);
  const side = LAYERS.filter((l) => l.side);
  return (
    <section id="anatomy" className="mx-auto mt-28 max-w-[1240px] scroll-mt-32 px-5 md:px-10">
      <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">Anatomy of a modern app</p>
      <h2 className="max-w-3xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">Five layers and a few services.</h2>
      <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2/70">Every product here, from a landing page to a banking app, is some version of this stack. Click a layer.</p>
      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="relative rounded-[28px] border border-line bg-cream/50 p-4 sm:p-6">
          <svg viewBox="0 0 560 420" className="h-auto w-full" role="img" aria-label="The layers of an app, from interface to infrastructure, with side services">
            {/* person */}
            <circle cx={196} cy={22} r={9} fill={INK} />
            <path d="M180,46 a16,14 0 0 1 32,0" fill={INK} />
            <path d="M196,52 V70" stroke="rgba(11,11,11,0.25)" strokeWidth={1.5} strokeDasharray="3 3" />
            {main.map((l, i) => {
              const y = 74 + i * 66;
              const active = l.id === on;
              return (
                <g key={l.id} onClick={() => setOn(l.id)} style={{ cursor: "pointer" }} role="button" aria-label={l.name}>
                  <path d={`M${40 + i * 6},${y + 10} L${352 - i * 6},${y + 10} L${352 - i * 6},${y + 52} L${40 + i * 6},${y + 52} Z`} fill="rgba(11,11,11,0.06)" transform="translate(6 6)" />
                  <rect x={40 + i * 6} y={y + 10} width={312 - i * 12} height={42} rx={12} fill={active ? INK : "#fff"} stroke={active ? INK : "rgba(11,11,11,0.15)"} style={{ transition: "fill .3s" }} />
                  <text x={58 + i * 6} y={y + 36} fontSize={14} fontWeight={800} fill={active ? "#fff" : INK} fontFamily="ui-sans-serif, system-ui, sans-serif">
                    {l.name}
                  </text>
                  <text x={340 - i * 6} y={y + 36} fontSize={10} textAnchor="end" fill={active ? "rgba(255,255,255,0.6)" : "rgba(11,11,11,0.45)"} fontFamily="ui-monospace, monospace">
                    {`0${i + 1}`}
                  </text>
                </g>
              );
            })}
            {/* request down, response up */}
            {[0, 1, 2].map((k) => (
              <circle key={k} r={4} fill={ORANGE} opacity={0.9}>
                <animateMotion dur="3s" begin={`-${k}s`} repeatCount="indefinite" path="M150,66 V396" />
              </circle>
            ))}
            {[0, 1, 2].map((k) => (
              <circle key={k} r={4} fill="#1baf7a" opacity={0.9}>
                <animateMotion dur="3s" begin={`-${k + 0.5}s`} repeatCount="indefinite" path="M242,396 V66" />
              </circle>
            ))}
            <text x={140} y={412} fontSize={9} textAnchor="end" fill={ORANGE} fontFamily="ui-monospace, monospace">
              request ↓
            </text>
            <text x={252} y={412} fontSize={9} fill="#1baf7a" fontFamily="ui-monospace, monospace">
              ↑ response
            </text>
            {/* side services */}
            {side.map((l, i) => {
              const y = 92 + i * 76;
              const active = l.id === on;
              return (
                <g key={l.id} onClick={() => setOn(l.id)} style={{ cursor: "pointer" }} role="button" aria-label={l.name}>
                  <path d={`M352,${y + 22} H392`} stroke="rgba(11,11,11,0.25)" strokeDasharray="3 3" />
                  <rect x={392} y={y} width={148} height={44} rx={22} fill={active ? ORANGE : "#fff"} stroke={active ? ORANGE : "rgba(11,11,11,0.15)"} />
                  <text x={466} y={y + 27} fontSize={12.5} textAnchor="middle" fontWeight={800} fill={active ? "#fff" : INK} fontFamily="ui-sans-serif, system-ui, sans-serif">
                    {l.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex flex-col rounded-[28px] bg-ink p-6 text-white sm:p-7">
          <p className="font-mono text-[11px] tracking-[0.16em] text-white/45 uppercase">{L.side ? "A service that plugs in" : "A layer of the stack"}</p>
          <p className="mt-2 text-[2rem] leading-none font-semibold tracking-[-0.04em]">{L.name}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-white/80">{L.what}</p>
          <div className="mt-4 rounded-2xl bg-white/[0.07] p-4">
            <p className="text-[11.5px] font-semibold text-[#ff9b72]">Without it</p>
            <p className="mt-1 text-[14px] leading-snug text-white/75">{L.without}</p>
          </div>
          <p className="mt-5 text-[11.5px] font-semibold text-white/55">Tools for this</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {L.tools.map((id) => {
              const t = byId.get(id);
              if (!t) return null;
              const logo = t.icon ? logos[t.icon] : undefined;
              return (
                <span key={id} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12.5px] text-ink">
                  {logo ? (
                    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden>
                      <path d={logo.path} fill={`#${logo.hex}`} />
                    </svg>
                  ) : (
                    <span className="font-mono text-[9px] font-bold" style={{ color: t.color }}>
                      {t.mono}
                    </span>
                  )}
                  {t.name}
                  {t.mine && <span className="rounded-full bg-[#eb6834]/15 px-1.5 font-mono text-[9px] text-[#eb6834]">I use</span>}
                </span>
              );
            })}
          </div>
          <Link href={`/skills/web-mobile/concepts#${L.concepts}`} className="mt-5 inline-flex items-center gap-1 self-start rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-ink transition hover:bg-white/85">
            Concepts for this layer →
          </Link>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
            {LAYERS.map((l) => (
              <button key={l.id} type="button" onClick={() => setOn(l.id)} aria-pressed={on === l.id} className={`rounded-full px-2.5 py-1 text-[11.5px] transition ${on === l.id ? "bg-white text-ink" : "bg-white/10 text-white/70 hover:text-white"}`}>
                {l.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
