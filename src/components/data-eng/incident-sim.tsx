"use client";

import { useEffect, useMemo, useState } from "react";
import { FONT, GRID, INK, MONO, MUTED, nice, r1 } from "@/components/analytics/charts/kit";
import { MONTH_SHORT } from "@/lib/months";
import { DOWN_FOR, H0, LATE_FOR, affected, damage, hourState, served, simulate, type Incident, type Kind, type Lane, type Stage } from "./incident-engine";
import { KINDS } from "./incident-kinds";
import { useWidth } from "./use-width";

const RED = "#c8413f";
const ORANGE = "#eb6834";
const AMBER = "#c29a00";
const GREEN = "#1baf7a";
const ID_24H = 55; // Indonesia's 24-hour PM2.5 standard (PP 22/2021)
const WINDOW = 48; // hours on each chart

const SCENARIO: Incident[] = [
  { id: 1, kind: "down", at: H0 + 5 },
  { id: 2, kind: "schema", at: H0 + 16 },
  { id: 3, kind: "dups", at: H0 + 28 },
  { id: 4, kind: "late", at: H0 + 38 },
];
const HOW: Record<Kind, { naive: string; guarded: string }> = {
  down: { naive: "Crashes quietly every hour; when the API returns it fetches only the newest hour, so the gap stays.", guarded: "Retries with backoff, alerts on the first failed run, shows “delayed”, then backfills from its watermark." },
  schema: { naive: "Reads the missing field as 0 and publishes it. Fixed forward only after a reader complains.", guarded: "The data contract fails, the batch is quarantined (raw kept), on-call maps the field and replays bronze." },
  dups: { naive: "Appends every row it gets, so the re-sent hours are counted twice in every average.", guarded: "MERGE on the hour key: a row for an hour that exists updates it instead of adding a second one." },
  late: { naive: "Drops the empty hour and never asks again, so those hours are missing for good.", guarded: "Re-reads the last 5 hours every run and merges whatever has arrived; the day is re-aggregated." },
};

const TONE: Record<string, string> = { ok: GREEN, warn: AMBER, fail: RED, info: "#6250d6" };
const STAGE_COLOR: Record<Stage, string> = { ok: GREEN, warn: AMBER, fail: RED, skip: "rgba(11,11,11,0.2)", none: "transparent" };

export function IncidentSimulator({ times, truth }: { times: string[]; truth: number[] }) {
  const END = truth.length - 1;
  const [t, setT] = useState(H0 - 1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [incidents, setIncidents] = useState<Incident[]>(SCENARIO);
  const [nextId, setNextId] = useState(10);

  const hh = (h: number) => times[h].slice(11, 16);
  const day = (h: number) => {
    const [, m, d] = times[h].slice(0, 10).split("-").map(Number);
    return `${d} ${MONTH_SHORT[m - 1]}`;
  };
  const sim = useMemo(() => simulate(truth, incidents, t, (h) => times[h].slice(11, 16)), [truth, incidents, t, times]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setT((x) => Math.min(END, x + 1)), Math.round(700 / speed));
    return () => window.clearInterval(id);
  }, [playing, speed, END]);
  useEffect(() => {
    if (playing && t >= END) {
      const id = window.setTimeout(() => setPlaying(false), 0);
      return () => window.clearTimeout(id);
    }
  }, [playing, t, END]);

  const restart = (withScenario: boolean) => {
    setPlaying(false);
    setT(H0 - 1);
    setIncidents(withScenario ? SCENARIO : []);
  };
  const toggle = () => {
    if (t >= END) {
      setT(H0 - 1); // play the same incidents again from the start
      setPlaying(true);
    } else setPlaying((p) => !p);
  };
  const next = t + 1;
  const blocked = (k: Kind): string | null => {
    if (next > END) return "the replay has ended";
    if (k === "down" && incidents.some((x) => x.kind === "down" && next >= x.at && next < x.at + DOWN_FOR)) return "already down";
    if (k === "schema" && incidents.some((x) => x.kind === "schema" && x.at <= t)) return "already renamed";
    if (k === "dups" && incidents.some((x) => x.kind === "dups" && x.at === next)) return "already queued";
    if (k === "late" && incidents.some((x) => x.kind === "late" && next >= x.at && next < x.at + LATE_FOR)) return "already late";
    return null;
  };
  const inject = (k: Kind) => {
    if (blocked(k)) return;
    // a field can be renamed only once, so a scheduled rename moves to now
    setIncidents((list) => [...list.filter((x) => !(k === "schema" && x.kind === "schema")), { id: nextId, kind: k, at: next }].sort((a, b) => a.at - b.at));
    setNextId((n) => n + 1);
  };

  const started = t >= H0;
  const span = END - H0 + 1;
  const pos = (h: number) => `${(Math.max(0, h - H0 + 0.5) / span) * 100}%`;

  return (
    <div className="space-y-3">
      {/* clock, controls and the timeline */}
      <section className="rounded-[24px] bg-ink p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-white/50 uppercase">Simulated clock · real Jakarta PM2.5 hours</p>
            <p className="mt-1 text-[2.2rem] leading-none font-semibold tracking-[-0.04em] tabular-nums sm:text-[2.8rem]">{started ? `${day(t)} ${hh(t)}` : "Ready"}</p>
            <p className="mt-1.5 text-[13px] text-white/60">{started ? `Run ${t - H0 + 1} of ${span}, one per hour, both copies at once` : `Both copies share ${H0} correct hours of history. Press play.`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={toggle} className="rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:bg-white/85">
              {playing ? "Pause" : t >= END ? "Play again" : started ? "Resume" : "Play"}
            </button>
            {!playing && t < END && (
              <button type="button" onClick={() => setT((x) => Math.min(END, x + 1))} className="rounded-full px-4 py-2.5 text-[14px] text-white/80 ring-1 ring-white/20 transition hover:text-white">
                +1 hour
              </button>
            )}
            <div className="flex rounded-full bg-white/10 p-0.5" role="group" aria-label="Speed">
              {[1, 3].map((s) => (
                <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)} className={`rounded-full px-3 py-1.5 font-mono text-[12px] ${speed === s ? "bg-white text-ink" : "text-white/70"}`}>
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-6 h-12">
          <div className="absolute inset-x-0 top-5 h-1.5 rounded-full bg-white/15" />
          <div className="absolute top-5 left-0 h-1.5 rounded-full bg-white/60" style={{ width: started ? pos(t) : "0%" }} />
          {incidents.map((x) => {
            const [a, b] = affected(x);
            const start = x.kind === "dups" ? x.at : a;
            const len = x.kind === "dups" ? 1 : x.kind === "schema" ? 1 : b - a;
            return (
              <div key={x.id}>
                <span className="absolute top-4 h-3.5 rounded-full" style={{ left: pos(start), width: `max(6px, ${(len / span) * 100}%)`, background: KINDS[x.kind].color, opacity: x.at <= t ? 1 : 0.55 }} />
                <span className="absolute top-[30px] hidden font-mono text-[10px] whitespace-nowrap sm:block" style={{ left: pos(start), color: x.kind === "schema" ? "#a99cf0" : KINDS[x.kind].color }}>
                  {KINDS[x.kind].label}
                </span>
              </div>
            );
          })}
          <input
            type="range"
            min={H0 - 1}
            max={END}
            value={t}
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value));
            }}
            aria-label="Scrub the simulated clock"
            className="absolute inset-x-0 top-2 h-8 w-full cursor-pointer opacity-0"
          />
          <span className="pointer-events-none absolute top-[14px] h-5 w-1 -translate-x-1/2 rounded-full bg-white" style={{ left: started ? pos(t) : "0%" }} />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10.5px] text-white/45">
          <span>
            {day(H0)} {hh(H0)}
          </span>
          <span>drag to rewind or skip ahead</span>
          <span>
            {day(END)} {hh(END)}
          </span>
        </div>
      </section>

      {/* incidents */}
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {(Object.keys(KINDS) as Kind[]).map((k) => {
          const why = blocked(k);
          const mine = incidents.filter((x) => x.kind === k);
          const live = mine.some((x) => {
            const [a, b] = affected(x);
            return t >= a && t < b && x.at <= t;
          });
          const soon = mine.find((x) => x.at > t);
          return (
            <button
              key={k}
              type="button"
              disabled={!!why}
              onClick={() => inject(k)}
              className="group flex flex-col rounded-[18px] border bg-white p-3 text-left transition enabled:hover:-translate-y-0.5 disabled:opacity-60"
              style={{ borderColor: live ? KINDS[k].color : "rgba(11,11,11,0.1)" }}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold" style={{ color: KINDS[k].color }}>
                  {KINDS[k].label}
                </span>
                <span className="font-mono text-[10px] text-ink-2/50">{live ? "happening" : soon ? `at ${hh(soon.at)}` : ""}</span>
              </span>
              <span className="mt-1 flex-1 text-[11.5px] leading-snug text-ink-2/60">{KINDS[k].line}</span>
              <span className="mt-2 font-mono text-[10.5px]" style={{ color: why ? undefined : KINDS[k].color }}>
                {why ?? `inject at ${hh(next)} →`}
              </span>
            </button>
          );
        })}
      </section>

      {/* the two copies */}
      <div className="grid gap-3 lg:grid-cols-2">
        <LaneView L={sim.naive} truth={truth} t={t} hh={hh} incidents={incidents} />
        <LaneView L={sim.guarded} truth={truth} t={t} hh={hh} incidents={incidents} />
      </div>

      <Postmortem naive={sim.naive} guarded={sim.guarded} truth={truth} t={t} hh={hh} day={day} incidents={incidents} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-3xl text-[11.5px] leading-relaxed text-ink-2/55">
          The values are real hourly PM2.5 for Jakarta from{" "}
          <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Open-Meteo
          </a>{" "}
          (CAMS model estimates, CC BY 4.0), {day(0)} to {day(END)} 2026. The API, the incidents and both pipelines are simulated in your browser.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => restart(true)} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[12.5px] transition hover:border-ink">
            Restart the scenario
          </button>
          <button type="button" onClick={() => restart(false)} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[12.5px] transition hover:border-ink">
            Restart with no incidents
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ one copy of the pipeline */
function LaneView({ L, truth, t, hh, incidents }: { L: Lane; truth: number[]; t: number; hh: (h: number) => string; incidents: Incident[] }) {
  const guarded = L.kind === "guarded";
  const at = Math.max(t, H0 - 1);
  const s = served(L, truth, at);
  const from = at - WINDOW + 1;
  let missing = 0,
    wrong = 0,
    twice = 0;
  for (let h = H0; h <= at; h++) {
    const st = hourState(L, truth, h);
    if (st.state === "missing") missing++;
    if (st.state === "wrong") wrong++;
    if (st.state === "dup") twice += st.values.length - 1;
  }
  const delayed = s.newest < at;
  const uniq = new Set(L.rows.filter((r) => r.h > at - 24 && r.h <= at).map((r) => r.h)).size;
  const partial = guarded && uniq < 24;
  const xray: string[] = [];
  if (!guarded && t >= H0) {
    if (delayed) xray.push(`Really from ${hh(s.newest)}: the source is down and nothing says so.`);
    if (s.now === 0) xray.push("0 is the parser's default for a missing field, not a reading.");
    const dayDup = L.rows.filter((r) => r.h > at - 24 && r.h <= at).length - uniq;
    if (dayDup) xray.push(`${dayDup} hours in this average are counted twice.`);
    if (!delayed && uniq < 24) xray.push(`${24 - uniq} of the last 24 hours are missing from this average, and nothing says so.`);
  }
  const verdict = (v: number | null) => (v == null ? "" : v > ID_24H ? "over Indonesia's 24-h standard" : "under Indonesia's 24-h standard");
  const off = s.avg == null ? 0 : s.avg - s.truthAvg;
  const stages = ["Extract", "Validate", "Load", "Serve"];
  const alerts = L.alerts.length;
  return (
    <section className="flex min-w-0 flex-col rounded-[24px] border bg-white p-4 sm:p-5" style={{ borderColor: guarded ? GREEN : "rgba(11,11,11,0.12)" }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase" style={{ color: guarded ? GREEN : RED }}>
            {guarded ? "With guardrails" : "Without guardrails"}
          </p>
          <h3 className="mt-0.5 text-[18px] leading-tight font-semibold tracking-[-0.02em]">{guarded ? "The guarded pipeline" : "The naive pipeline"}</h3>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-2/60">{guarded ? "Fetch since the watermark (re-read 5 h) · 3 retries · data contract · quarantine + bronze · MERGE on hour · alerts" : "Fetch the newest hour · append · missing field = 0 · drop empty values · no checks, no alerts"}</p>
        </div>
      </div>

      {/* stage lights from the latest run */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {stages.map((name, i) => {
          const st = t >= H0 ? L.stages[i] : i === 1 && !guarded ? "none" : "ok";
          return (
            <div key={name} className={`rounded-xl border px-2 py-1.5 ${st === "none" ? "border-dashed border-ink/15" : "border-line"}`}>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: st === "none" ? "rgba(11,11,11,0.12)" : STAGE_COLOR[st] }} />
                <span className={`truncate text-[11.5px] font-semibold ${st === "none" ? "text-ink/35" : ""}`}>{name}</span>
              </div>
              <p className="mt-0.5 truncate font-mono text-[9.5px] text-ink-2/50">{st === "none" ? "no checks" : st === "skip" ? "skipped" : st}</p>
            </div>
          );
        })}
      </div>

      {/* what readers see */}
      <div className="mt-3 rounded-[18px] bg-cream/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] tracking-[0.12em] text-ink-2/50 uppercase">What readers see</p>
          {guarded && (delayed || partial) && t >= H0 && (
            <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white" style={{ background: AMBER }}>
              {delayed ? `Delayed · newest ${hh(s.newest)}` : `Partial · ${24 - uniq} hours not in yet`}
            </span>
          )}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-ink-2/55">PM2.5 now</p>
            <p className="text-[1.9rem] leading-none font-semibold tracking-[-0.03em] tabular-nums" style={{ color: !guarded && (s.now === 0 || delayed) && t >= H0 ? RED : INK }}>
              {s.now == null ? "–" : s.now.toFixed(1)}
            </p>
            <p className="mt-0.5 text-[10.5px] text-ink-2/50">{guarded ? `as of ${hh(s.newest)}` : "µg/m³"}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-2/55">24-hour average</p>
            <p className="text-[1.9rem] leading-none font-semibold tracking-[-0.03em] tabular-nums" style={{ color: partial ? AMBER : Math.abs(off) > 0.5 ? RED : INK }}>
              {s.avg == null ? "–" : s.avg.toFixed(1)}
            </p>
            <p className="mt-0.5 text-[10.5px] text-ink-2/50">{verdict(s.avg)}</p>
          </div>
        </div>
        <p className="mt-2 font-mono text-[10.5px] text-ink-2/60">
          truth {s.truthAvg.toFixed(1)} ({verdict(s.truthAvg).replace("Indonesia's 24-h standard", "standard")}) ·{" "}
          {partial ? (
            <span style={{ color: AMBER }}>partial: {24 - uniq} hours waiting, flagged on the dashboard</span>
          ) : (
            <span style={{ color: Math.abs(off) > 0.5 ? RED : GREEN }}>{Math.abs(off) > 0.5 ? `off by ${off > 0 ? "+" : "−"}${Math.abs(off).toFixed(1)}` : "matches"}</span>
          )}
          {s.rows !== 24 && <span className="text-ink-2/50"> · {s.rows} rows for 24 hours</span>}
        </p>
        {xray.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {xray.map((x) => (
              <li key={x} className="text-[11px] leading-snug" style={{ color: RED }}>
                ⚠ {x}
              </li>
            ))}
          </ul>
        )}
      </div>

      <HourChart L={L} truth={truth} from={from} to={at} hh={hh} incidents={incidents} />

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {[
          [missing, guarded ? "hours waiting" : "hours missing", missing ? (guarded ? AMBER : RED) : INK],
          [wrong, "hours wrong", wrong ? RED : INK],
          [twice, "rows counted twice", twice ? ORANGE : INK],
          [alerts, "alerts sent", alerts ? GREEN : INK],
        ].map(([v, k, c]) => (
          <div key={k as string} className="rounded-xl bg-cream/50 px-2 py-1.5">
            <p className="text-[1.2rem] leading-none font-semibold tabular-nums" style={{ color: c as string }}>
              {v as number}
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-ink-2/55">{k as string}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex-1 rounded-[14px] bg-ink p-3 font-mono text-[10.5px] leading-relaxed text-white/80">
        <p className="mb-1 text-white/40">run log</p>
        {L.log.length ? (
          L.log
            .slice(-5)
            .reverse()
            .map((l, i) => (
              <p key={`${l.t}-${i}`} className={i ? "opacity-60" : ""}>
                <span className="text-white/40">{hh(l.t)}</span> <span style={{ color: TONE[l.tone] }}>●</span> {l.text}
              </p>
            ))
        ) : (
          <p className="text-white/40">waiting for the first run</p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ the last 48 hours as one copy stored them */
function HourChart({ L, truth, from, to, hh, incidents }: { L: Lane; truth: number[]; from: number; to: number; hh: (h: number) => string; incidents: Incident[] }) {
  const [ref, w] = useWidth(520);
  const guarded = L.kind === "guarded";
  const H = 150,
    PL = 30,
    PR = 6,
    PT = 14,
    PB = 20;
  const pw = w - PL - PR,
    ph = H - PT - PB,
    bw = pw / WINDOW;
  const hours = Array.from({ length: WINDOW }, (_, k) => from + k);
  const max = nice(Math.max(...hours.map((h) => truth[h])) * 1.05);
  const y = (v: number) => r1(PT + ph - (Math.min(v, max) / max) * ph);
  const x = (h: number) => r1(PL + (h - from) * bw);
  const line = hours.map((h, k) => `${k ? "L" : "M"}${r1(x(h) + bw / 2)},${y(truth[h])}`).join(" ");
  return (
    <div ref={ref} className="mt-3">
      <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="block h-auto max-w-full" role="img" aria-label={`Last ${WINDOW} hours as the ${L.kind} pipeline stored them, against the true values`}>
        {incidents
          .filter((i) => i.at <= to)
          .map((i) => {
            const [a, b0] = affected(i);
            const b = Math.min(b0, to + 1);
            if (b <= from || a > to) return null;
            const xa = x(Math.max(a, from));
            return <rect key={i.id} x={xa} y={PT - 10} width={r1(Math.max(2, x(b) - xa))} height={ph + 10} fill={KINDS[i.kind].color} fillOpacity={0.08} />;
          })}
        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line x1={PL} x2={w - PR} y1={y(v)} y2={y(v)} stroke={GRID} />
            <text x={PL - 5} y={y(v) + 3} textAnchor="end" fontSize={9.5} fill={MUTED} fontFamily={MONO}>
              {Math.round(v)}
            </text>
          </g>
        ))}
        {hours.map((h) => {
          if (h < 0) return null;
          const st = hourState(L, truth, h);
          const bx = r1(x(h) + 0.5),
            bwi = r1(Math.max(1, bw - 1));
          if (st.state === "missing") {
            const c = guarded ? AMBER : RED;
            return <rect key={h} x={bx} y={PT} width={bwi} height={ph} fill={c} fillOpacity={0.12} stroke={c} strokeOpacity={0.5} strokeDasharray="2 2" />;
          }
          const v = st.values.reduce((a, b) => a + b, 0) / st.values.length;
          if (st.state === "wrong" && v === 0) return <rect key={h} x={bx} y={y(0) - 3} width={bwi} height={3} fill={RED} />;
          const c = st.state === "dup" ? ORANGE : st.state === "wrong" ? RED : INK;
          return (
            <g key={h}>
              <rect x={bx} y={y(v)} width={bwi} height={r1(PT + ph - y(v))} fill={c} fillOpacity={st.state === "ok" ? 0.85 : 1} />
              {st.state === "dup" && <circle cx={r1(bx + bwi / 2)} cy={y(v) - 5} r={2.4} fill={ORANGE} />}
            </g>
          );
        })}
        <path d={line} fill="none" stroke="#2a78d6" strokeWidth={1.3} strokeDasharray="3 2" />
        {hours
          .filter((h) => h >= 0 && times12(hh(h)))
          .map((h) => (
            <text key={h} x={x(h)} y={H - 5} fontSize={9.5} fill={MUTED} fontFamily={FONT}>
              {hh(h)}
            </text>
          ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-ink-2/60">
        <Key c={INK} t="stored hour" />
        <Key c="#2a78d6" t="truth" dashed />
        <Key c={guarded ? AMBER : RED} t={guarded ? "missing, will be filled" : "missing for good"} />
        <Key c={RED} t="wrong (0)" />
        <Key c={ORANGE} t="counted twice" />
      </div>
    </div>
  );
}
const times12 = (hhmm: string) => hhmm === "00:00" || hhmm === "12:00";
function Key({ c, t, dashed = false }: { c: string; t: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <i className="inline-block h-2 w-3 rounded-[2px]" style={dashed ? { borderTop: `2px dashed ${c}`, height: 0 } : { background: c }} />
      {t}
    </span>
  );
}

/* ------------------------------------------------------------------ what each incident cost */
function Postmortem({ naive, guarded, truth, t, hh, day, incidents }: { naive: Lane; guarded: Lane; truth: number[]; t: number; hh: (h: number) => string; day: (h: number) => string; incidents: Incident[] }) {
  const past = incidents.filter((x) => x.at <= t);
  const cell = (L: Lane, x: Incident) => {
    const [a, b] = affected(x);
    const d = damage(L, truth, a, b, t);
    const seen = L.detected.get(x.id);
    const over = t >= b - 1;
    const parts: string[] = [];
    if (d.missing) parts.push(`${d.missing} hour${d.missing > 1 ? "s" : ""} ${L.kind === "guarded" ? "waiting" : "missing"}`);
    if (d.wrong) parts.push(`${d.wrong} hour${d.wrong > 1 ? "s" : ""} wrong`);
    if (d.dup) parts.push(`${d.dup} hour${d.dup > 1 ? "s" : ""} counted twice`);
    const ok = parts.length === 0;
    return (
      <div className="rounded-xl bg-cream/40 px-3 py-2">
        <p className="text-[11.5px]">
          <span className="text-ink-2/55">Noticed </span>
          <span className="font-semibold">{seen == null ? (L.kind === "naive" ? "never" : "not yet") : seen === x.at ? "at once" : `after ${seen - x.at} h`}</span>
          {seen == null && L.kind === "naive" && <span className="text-ink-2/55"> (no alert)</span>}
        </p>
        <p className="mt-0.5 text-[11.5px]" style={{ color: ok ? GREEN : L.kind === "guarded" ? AMBER : RED }}>
          {ok ? (over ? "No damage left" : "No damage so far") : `${parts.join(", ")}${over && L.kind === "naive" ? ", for good" : ""}`}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-ink-2/55">{HOW[x.kind][L.kind]}</p>
      </div>
    );
  };
  return (
    <section className="rounded-[24px] border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[18px] font-semibold tracking-[-0.02em]">Postmortem</h3>
        <p className="text-[12px] text-ink-2/55">Updates as the clock runs. Damage counts the hours each incident touched, as stored right now.</p>
      </div>
      {past.length ? (
        <div className="mt-3 space-y-2">
          <div className="hidden grid-cols-[10rem_1fr_1fr] gap-2 px-1 font-mono text-[10.5px] text-ink-2/50 uppercase md:grid">
            <span>incident</span>
            <span style={{ color: RED }}>without guardrails</span>
            <span style={{ color: GREEN }}>with guardrails</span>
          </div>
          {past.map((x) => (
            <div key={x.id} className="grid gap-2 md:grid-cols-[10rem_1fr_1fr]">
              <div className="px-1 pt-1">
                <p className="text-[14px] font-semibold" style={{ color: KINDS[x.kind].color }}>
                  {KINDS[x.kind].label}
                </p>
                <p className="font-mono text-[10.5px] text-ink-2/55">
                  {day(x.at)} {hh(x.at)}
                </p>
              </div>
              <div>
                <p className="mb-1 font-mono text-[10px] text-ink-2/50 uppercase md:hidden" style={{ color: RED }}>
                  without guardrails
                </p>
                {cell(naive, x)}
              </div>
              <div>
                <p className="mb-1 font-mono text-[10px] text-ink-2/50 uppercase md:hidden" style={{ color: GREEN }}>
                  with guardrails
                </p>
                {cell(guarded, x)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-cream/50 px-4 py-6 text-center text-[12.5px] text-ink-2/55">No incident yet. Press play, or inject one yourself.</p>
      )}
    </section>
  );
}
