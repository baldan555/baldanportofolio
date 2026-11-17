"use client";

import { Check, Minus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CUSTS, DASH, DIMS, num, pct } from "./data";
import { parseCsv } from "./raw-data";
import { Bars, C, Chips, Insight, Panel, Tile } from "./ui";

/* 09 Customer voice: what the surveys add. Behaviour and the model say what happens and to whom; only asking says why. */

const V = DASH.voice;
const camp = (id: string) => DASH.campaigns.find((x) => x.id === id)!;
const grp = (k: string) => V.byGroup.find((g) => g.k === k)!;
const drv = (k: string) => V.drivers.find((d) => d.k === k)!;
const STATED_COLORS = [C.red, C.orange, "#e0a12f", C.violet, "#a99cf2", C.blue, C.teal, C.grey];
const ratio = (a: number, b: number) => (b ? a / b : 0).toFixed(1);

/* ---------------------------------------------------------------- the opener: why ask at all */
export function VoiceIntro() {
  const steps = [
    { h: "What happened", p: "usage, billing, requests", src: "behaviour" },
    { h: "Who is next", p: "the churn model", src: "model" },
    { h: "Why", p: "what customers tell us", src: "survey", on: true },
    { h: "What works", p: "campaigns with control groups", src: "experiment" },
  ];
  const answered = V.program.reduce((a, p) => a + p.answered, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-[24px] bg-ink p-5 text-white md:p-7">
        <p className="font-mono text-[11px] tracking-[0.16em] text-white/45 uppercase">Why the survey matters</p>
        <p className="mt-2 max-w-3xl text-[1.55rem] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[2rem]">
          Behaviour shows what customers do. Only asking them shows why they leave.
        </p>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-white/65">
          Usage and billing can say a customer stopped paying; they can&apos;t say whether it was money, a slow evening connection or a router that never got signal by the window. Fix the wrong cause
          and the money is wasted. The survey closes that gap, and it checks every other conclusion on this page.
        </p>
        <ol className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.h} className={s.on ? "spotlight rounded-2xl p-[2px]" : ""}>
              <div className={`flex h-full flex-col rounded-[14px] p-3.5 ${s.on ? "bg-white text-ink" : "border border-white/12 bg-white/[0.04]"}`}>
                <span className={`font-mono text-[10.5px] uppercase ${s.on ? "text-ink/50" : "text-white/40"}`}>
                  0{i + 1} · {s.src}
                </span>
                <span className="mt-1 text-[16px] font-semibold">{s.h}</span>
                <span className={`text-[12.5px] ${s.on ? "text-ink/65" : "text-white/55"}`}>{s.p}</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12.5px] text-white/55">Decisions are safest where all four point the same way. The board at the end of this section shows where they do.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Surveys sent" value={num(V.invites)} note="4 moments in the customer's life" />
        <Tile label="Answered" value={num(answered)} note={`${pct((answered / V.invites) * 100)} answer rate`} />
        <Tile label="Comments coded" value={num(V.comments)} note="into 11 themes" />
        <Tile label="NPS, last 6 months" value={V.npsNow != null ? `${V.npsNow > 0 ? "+" : ""}${Math.round(V.npsNow)}` : "–"} note={`${num(V.nAnswersNow)} answers`} />
        <Tile label="Exit surveys answered" value={num(V.exitN)} note="why leavers say they left" />
        <Tile label="Detractors vs promoters" value={`${ratio(grp("Detractor").v, grp("Promoter").v)}×`} note="as likely to leave in 90 days" tone="bad" />
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {V.program.map((p) => (
          <div key={p.k} className="rounded-2xl border border-line bg-white p-3 text-[12.5px]">
            <p className="font-semibold">{p.k}</p>
            <p className="text-ink/55">
              {num(p.sent)} sent · {num(p.answered)} answered ({pct(p.rate, 0)})
            </p>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
              <span className="block h-full rounded-full" style={{ width: `${p.rate}%`, background: C.ink }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- said vs logged */
export function SaidVsLogged() {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <Panel title="What the system logged vs what leavers told us" sub={`Exit survey, ${num(V.exitN)} leavers who answered. Each bar is one reason in the CRM; the colours are what those customers said themselves.`}>
      <div className="flex flex-col gap-2.5">
        {V.said.map((r) => (
          <div key={r.k} className="grid grid-cols-[minmax(0,130px)_1fr] items-center gap-3 text-[12.5px] sm:grid-cols-[170px_1fr]">
            <span className="truncate">
              <b className="font-semibold">{r.k}</b> <span className="font-mono text-[11px] text-ink/45">n={r.n}</span>
            </span>
            <span className="flex h-5 overflow-hidden rounded-md">
              {r.parts.map((v, j) =>
                v > 0 ? (
                  <span
                    key={j}
                    onMouseEnter={() => setHover(j)}
                    onMouseLeave={() => setHover(null)}
                    title={`${V.stated[j]}: ${pct(v)}`}
                    className="flex items-center justify-center font-mono text-[10px] text-white transition-opacity"
                    style={{ width: `${v}%`, background: STATED_COLORS[j], opacity: hover === null || hover === j ? 1 : 0.25 }}
                  >
                    {v >= 12 ? Math.round(v) : ""}
                  </span>
                ) : null,
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px]">
        {V.stated.map((s, j) => (
          <span key={s} className="flex items-center gap-1.5" onMouseEnter={() => setHover(j)} onMouseLeave={() => setHover(null)}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATED_COLORS[j] }} />
            {s}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink/45">Red and orange: the service itself. Violet: money. Blue, teal, grey: life changes and competition.</p>
      <Insight>
        The CRM says {num(V.involN)} of these leavers simply didn&apos;t pay. Asked, <b>{pct(V.involService, 0)}</b> of them blamed the service (slow evenings, weak signal, the router), not money ({pct(V.involMoney, 0)}).
        &quot;Low use, not needed&quot; hides the same thing: {pct(V.lowUseService, 0)} of those {V.lowUseN} pointed at the service. A payment reminder can&apos;t fix a connection.
      </Insight>
    </Panel>
  );
}

/* ---------------------------------------------------------------- silence is a signal */
export function SilentRisk() {
  const items = V.byGroup.map((g) => ({ k: g.k === "No answer" ? "Didn't answer" : `${g.k}s`, v: g.v, n: g.n, color: g.k === "Promoter" ? C.green : g.k === "Passive" ? C.gold : g.k === "Detractor" ? C.red : C.grey }));
  return (
    <Panel title="Unhappy customers leave; silent ones too" sub="Share who left within 90 days of a regular survey, by how they answered (surveys with 90 days observed)">
      <Bars items={items} fmt={(v) => pct(v)} note={(it) => `n=${num(it.n ?? 0)}`} />
      <Insight>
        Detractors leave {ratio(grp("Detractor").v, grp("Promoter").v)}× as often as promoters ({pct(grp("Detractor").v)} vs {pct(grp("Promoter").v)}). And the {num(grp("No answer").n)} times nobody answered,{" "}
        {pct(grp("No answer").v)} left: nearer the detractors than the promoters. Silence is a warning sign, so the survey never replaces behaviour; the two work together.
      </Insight>
    </Panel>
  );
}

/* ---------------------------------------------------------------- key drivers: importance vs performance */
function useWidth(initial: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function Drivers() {
  const [ref, W] = useWidth(520);
  const H = 280;
  const L = 44;
  const R = 16;
  const top = 14;
  const bottom = H - 34;
  const x = (v: number) => L + (v / 0.8) * (W - L - R);
  const y = (v: number) => bottom - ((v - 30) / 40) * (bottom - top);
  const value = drv("Value for money");
  const attr = (k: string) => V.byAttr.find((a) => a.k === k);
  const CUT = 55; // satisfied share that counts as "doing fine"
  return (
    <Panel title="What drives the score, and how we do on it" sub="Across: how strongly a rating moves with the recommend score (correlation). Up: share satisfied (4-5 out of 5).">
      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Importance versus satisfaction for four service attributes">
          <rect x={x(0.4)} y={top} width={x(0.8) - x(0.4)} height={y(CUT) - top} fill={C.green} opacity={0.05} />
          <rect x={x(0.4)} y={y(CUT)} width={x(0.8) - x(0.4)} height={bottom - y(CUT)} fill={C.red} opacity={0.07} />
          <line x1={x(0.4)} x2={x(0.4)} y1={top} y2={bottom} stroke="rgba(11,11,11,0.15)" strokeDasharray="4 3" />
          <line x1={L} x2={W - R} y1={y(CUT)} y2={y(CUT)} stroke="rgba(11,11,11,0.15)" strokeDasharray="4 3" />
          {[30, 40, 50, 60, 70].map((t) => (
            <text key={t} x={L - 6} y={y(t) + 3} fontSize={10.5} textAnchor="end" fill="rgba(11,11,11,0.5)">
              {t}%
            </text>
          ))}
          {[0, 0.2, 0.4, 0.6, 0.8].map((t) => (
            <text key={t} x={x(t)} y={bottom + 16} fontSize={10.5} textAnchor={t === 0 ? "start" : t === 0.8 ? "end" : "middle"} fill="rgba(11,11,11,0.5)">
              {t.toFixed(1)}
            </text>
          ))}
          <text x={W - R - 4} y={bottom - 6} fontSize={11} fontWeight={700} textAnchor="end" fill={C.red}>
            Fix first
          </text>
          <text x={W - R - 4} y={top + 14} fontSize={11} fontWeight={700} textAnchor="end" fill={C.green}>
            Keep it up
          </text>
          <text x={L + 6} y={bottom - 6} fontSize={11} fontWeight={700} fill="rgba(11,11,11,0.4)">
            Watch
          </text>
          {V.drivers.map((d) => {
            const cx = x(d.importance);
            const cy = y(d.satisfied);
            const right = cx > W * 0.62;
            return (
              <g key={d.k}>
                <circle cx={cx} cy={cy} r={7} fill={d.satisfied < CUT && d.importance >= 0.4 ? C.red : C.ink} />
                <text x={right ? cx - 11 : cx + 11} y={cy - 7} fontSize={12} fontWeight={600} textAnchor={right ? "end" : "start"} fill={C.ink}>
                  {d.k}
                </text>
                <text x={right ? cx - 11 : cx + 11} y={cy + 8} fontSize={10.5} textAnchor={right ? "end" : "start"} fill="rgba(11,11,11,0.55)">
                  {`r ${d.importance.toFixed(2)} · ${pct(d.satisfied, 0)} satisfied`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11.5px]">
        {V.byAttr.map((a) => (
          <div key={a.k} className="rounded-xl bg-ink/[0.035] p-2">
            <p className="font-semibold">{a.k}</p>
            <p className="text-ink/60">
              left in 90 days: <b style={{ color: C.red }}>{pct(a.low)}</b> if rated 1-2, <b style={{ color: C.green }}>{pct(a.high)}</b> if 4-5
            </p>
          </div>
        ))}
      </div>
      <Insight>
        Signal indoors and speed at busy hours move the score most, and speed sits in &quot;fix first&quot;. Price barely moves the score (r {value.importance.toFixed(2)}), though it has the fewest
        satisfied ({pct(value.satisfied, 0)}). Yet people who rate value 1-2 leave {ratio(attr("Value for money")?.low ?? 0, attr("Value for money")?.high ?? 1)}× as often, and{" "}
        {pct(V.valueInvol, 0)} of those leavers simply stop paying ({pct(V.otherInvol, 0)} for everyone else): price is a payment problem, not a satisfaction problem. That is why the discount only works
        for customers who pay on time.
      </Insight>
    </Panel>
  );
}

/* ---------------------------------------------------------------- where it hurts */
export function WhereItHurts() {
  const sp = V.cut.speedBySitu;
  const sg = V.cut.signalByChannel;
  const online = sg.find((x) => x.k === "Online")!;
  const agent = sg.find((x) => x.k === "Partner agent")!;
  const field = sg.find((x) => x.k === "Field sales")!;
  return (
    <Panel title="Where it hurts" sub="Share rating 1-2 out of 5, regular surveys. The recommend score (NPS) next to each group.">
      <p className="mb-2 text-[12px] font-semibold text-ink/60">Unhappy with speed at busy hours, by line</p>
      <Bars items={sp.map((r) => ({ k: r.k, v: r.v, n: r.nps ?? 0, color: r.k === "4G in a metro" ? C.red : r.k === "5G" ? C.green : C.grey }))} fmt={(v) => pct(v, 0)} note={(it) => `NPS ${Math.round(it.n ?? 0)}`} max={60} />
      <p className="mt-4 mb-2 text-[12px] font-semibold text-ink/60">Unhappy with signal indoors, by how they were sold</p>
      <Bars items={sg.map((r) => ({ k: r.k, v: r.v, n: r.nps ?? 0, color: r.v > 15 ? C.orange : C.grey }))} fmt={(v) => pct(v, 0)} note={(it) => `NPS ${Math.round(it.n ?? 0)}`} max={60} />
      <Insight>
        {pct(sp[0].v, 0)} of metro 4G customers are unhappy with evening speed, against {pct(sp[2].v, 0)} on 5G: congestion, which a 5G move fixes. Online and agent sales leave {pct(online.v, 0)} and{" "}
        {pct(agent.v, 0)} unhappy with indoor signal, against {pct(field.v, 0)} for field sales, who check the signal at the address before selling. That one step is missing.
      </Insight>
    </Panel>
  );
}

/* ---------------------------------------------------------------- what they write */
export function Comments() {
  const [theme, setTheme] = useState("Weak signal indoors");
  const quotes = V.quotes.filter((q) => q.theme === theme);
  const complaints = V.themes.filter((t) => t.det > 0).sort((a, b) => b.det - a.det);
  return (
    <Panel title="In their own words" sub={`${num(V.comments)} comments, coded into themes. Bars: detractors' comments by theme. Click a theme to read real lines (as written, with a translation).`}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-1.5">
          {complaints.map((t) => {
            const on = t.k === theme;
            const max = complaints[0].det;
            return (
              <button key={t.k} type="button" onClick={() => setTheme(t.k)} className={`grid grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-2 rounded-lg px-2 py-1 text-left text-[12.5px] ${on ? "bg-ink text-white" : "hover:bg-ink/[0.04]"}`}>
                <span className="truncate">{t.k}</span>
                <span className={`h-2.5 overflow-hidden rounded-full ${on ? "bg-white/20" : "bg-ink/[0.06]"}`}>
                  <span className="block h-full rounded-full" style={{ width: `${(t.det / max) * 100}%`, background: on ? "#fff" : C.red }} />
                </span>
                <span className="font-mono text-[11.5px]">{t.det}</span>
              </button>
            );
          })}
          <div className="mt-2 flex flex-wrap gap-1">
            {V.themes
              .filter((t) => t.det === 0 || t.k === "Works well" || t.k === "5G is faster")
              .map((t) => (
                <button key={t.k} type="button" onClick={() => setTheme(t.k)} className={`rounded-full border px-2.5 py-0.5 text-[11.5px] ${theme === t.k ? "border-ink bg-ink text-white" : "border-line text-ink/70"}`}>
                  {t.k} · {t.all}
                </button>
              ))}
          </div>
        </div>
        <div className="grid content-start gap-2 sm:grid-cols-2">
          {quotes.map((q) => (
            <figure key={q.id + q.text} className="flex flex-col rounded-2xl border border-line bg-cream/40 p-3">
              <blockquote className="text-[13.5px] leading-snug font-medium">“{q.text}”</blockquote>
              <figcaption className="mt-1 text-[12px] leading-snug text-ink/60">{q.en}</figcaption>
              <p className="mt-auto pt-2 font-mono text-[10.5px] text-ink/45">
                {q.type} · NPS {q.nps ?? "–"} · {q.plan} · {q.area} · {q.channel}
              </p>
            </figure>
          ))}
        </div>
      </div>
      <Insight>
        Comments carry what a score can&apos;t: &quot;nobody checked the signal at my house&quot; points straight at the sales process. In a real pipeline the coding is done by keyword rules or an LLM,
        then spot-checked by a person; the raw comments stay in the surveys table for anyone to re-read.
      </Insight>
    </Panel>
  );
}

/* ---------------------------------------------------------------- the welcome call, explained */
export function WelcomeExplained() {
  const c1 = camp("C1");
  return (
    <Panel title="Why the welcome call didn't work" sub="The campaign results say it did nothing. The onboarding survey says why.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line p-3">
          <p className="font-mono text-[10.5px] text-ink/45 uppercase">What the call offered</p>
          <p className="mt-1 text-[15px] font-semibold">{c1.offer}</p>
          <p className="mt-2 text-[12.5px] text-ink/60">
            Measured effect: <b>{c1.diff > 0 ? "+" : ""}{c1.diff} pts</b> (95% range {c1.lo} to +{c1.hi}). No proven effect.
          </p>
        </div>
        <div className="rounded-2xl border border-line p-3">
          <p className="mb-2 font-mono text-[10.5px] text-ink/45 uppercase">What unhappy new customers wrote</p>
          <Bars items={V.newComplaints.slice(0, 4).map((x) => ({ k: x.k, v: x.v, color: x.k === "Weak signal indoors" ? C.orange : x.k === "Slow at busy hours" ? C.red : C.grey }))} fmt={(v) => pct(v, 0)} />
        </div>
      </div>
      <Insight>
        New customers who are unhappy after month one write about weak indoor signal ({pct(V.newComplaints[0].v, 0)}) and slow evenings, not about setting up. Tips on a call can&apos;t move a router to
        where the signal is. Redesign it as a signal check with router placement (or an outdoor antenna), then test it against a control group again.
      </Insight>
    </Panel>
  );
}

/* ---------------------------------------------------------------- after a repair */
export function AfterRepair() {
  const [ok, late] = V.supportSla;
  return (
    <Panel title="After a repair" sub="Survey sent when a relocation or device fault is closed">
      <div className="grid grid-cols-2 gap-2">
        {[ok, late].map((r, i) => (
          <div key={r.k} className="rounded-2xl border border-line p-3">
            <p className="text-[12px] font-semibold text-ink/60">{r.k}</p>
            <p className="mt-1 text-[28px] leading-none font-semibold tabular-nums" style={{ color: i ? C.red : C.green }}>
              {r.v.toFixed(1)}
              <span className="text-[14px] text-ink/40"> / 5</span>
            </p>
            <p className="mt-1 text-[11.5px] text-ink/55">
              NPS {r.nps != null ? Math.round(r.nps) : "–"} · n={r.n}
            </p>
          </div>
        ))}
      </div>
      <Insight>Same customers, same kind of problem: only the speed of the fix differs, and the support rating halves. It agrees with the churn numbers in the lifecycle section.</Insight>
    </Panel>
  );
}

/* ---------------------------------------------------------------- does it sharpen the model? */
export function ModelWithVoice() {
  const u = V.uplift;
  const rows = [
    { k: "Behaviour only", auc: u.auc_behaviour, top: u.top20_behaviour, color: C.ink },
    { k: "Survey answers only", auc: u.auc_survey, top: u.top20_survey, color: C.orange },
    { k: "Both together", auc: u.auc_both, top: u.top20_both, color: C.green },
  ];
  return (
    <Panel title="Does a survey answer sharpen the model?" sub={`${num(u.n)} survey answers linked to the same month's behaviour; who left in the next 2 months (${u.leavers}). Cross-validated, 5 folds × 10.`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[12px] font-semibold text-ink/60">Ranking quality (AUC)</p>
          <Bars items={rows.map((r) => ({ k: r.k, v: r.auc, color: r.color }))} fmt={(v) => v.toFixed(3)} max={1} />
        </div>
        <div>
          <p className="mb-2 text-[12px] font-semibold text-ink/60">Leavers caught in the riskiest 20%</p>
          <Bars items={rows.map((r) => ({ k: r.k, v: r.top, color: r.color }))} fmt={(v) => pct(v, 0)} max={100} />
        </div>
      </div>
      <Insight>
        Four questions alone rank customers well above chance (AUC {u.auc_survey.toFixed(2)}; a coin flip is 0.5), but months of behaviour rank better ({u.auc_behaviour.toFixed(2)}), and adding the answers{" "}
        {u.top20_both - u.top20_behaviour >= 2 ? `catches a few more leavers (${pct(u.top20_behaviour, 0)} → ${pct(u.top20_both, 0)} in the top 20%)` : "changes almost nothing"}. An honest result: the
        survey isn&apos;t the tool for finding who will leave; behaviour already does that. Its value is the why, which changes what we do for them.
      </Insight>
    </Panel>
  );
}

/* ---------------------------------------------------------------- the decision board */
type Ev = { s: "yes" | "no" | "mixed" | "none"; t: string };
export function DecisionBoard() {
  const c2 = camp("C2");
  const c5 = camp("C5");
  const c1 = camp("C1");
  const band = (k: string) => DASH.saveByBand.find((b) => b.k === k)!;
  const early = (k: string) => DASH.early.channel.find((x) => x.k === k)!;
  const sp = V.cut.speedBySitu;
  const sg = V.cut.signalByChannel;
  const reloc = DASH.lifecycle.types[0] as { leftInside?: number; leftBreach?: number };
  const value = drv("Value for money");
  const rows: { d: string; b: Ev; v: Ev; x: Ev; verdict: string; tone: "go" | "narrow" | "test" | "redo" }[] = [
    {
      d: "Move covered 4G homes to 5G",
      b: { s: "yes", t: `Covered 4G lines churn ${pct(DASH.fiveg.churn4gCovered, 1)} a month, 5G ${pct(DASH.fiveg.churn5g, 1)}` },
      v: { s: "yes", t: `${pct(sp[0].v, 0)} of metro 4G unhappy with evening speed; NPS ${Math.round(sp[2].nps ?? 0)} on 5G` },
      x: { s: "yes", t: `Upgrade campaign +${c5.diff} pts against its control group` },
      verdict: "Go: all three agree",
      tone: "go",
    },
    {
      d: "Fix relocations and faults within target",
      b: { s: "yes", t: `A late relocation fix loses ${pct(reloc.leftBreach ?? 0)} in 60 days vs ${pct(reloc.leftInside ?? 0)}` },
      v: { s: "yes", t: `Support rated ${V.supportSla[1].v.toFixed(1)}/5 after a late fix, ${V.supportSla[0].v.toFixed(1)} on time` },
      x: { s: "none", t: "Not an experiment: a service standard to track" },
      verdict: "Go, and track it weekly",
      tone: "go",
    },
    {
      d: "Signal check before selling online and via agents",
      b: { s: "yes", t: `${pct(early("Online").v)} of online sales leave within 3 months vs ${pct(early("Field sales").v)} field sales` },
      v: { s: "yes", t: `${pct(sg.find((x) => x.k === "Online")!.v, 0)} of online customers unhappy with indoor signal vs ${pct(sg.find((x) => x.k === "Field sales")!.v, 0)}` },
      x: { s: "none", t: "Not tested yet" },
      verdict: "Pilot it with a control group",
      tone: "test",
    },
    {
      d: "Save offer (20% off) for everyone at risk",
      b: { s: "yes", t: "Risk segments leave 2-3× as often as healthy customers" },
      v: { s: "no", t: `Price barely moves the score (r ${value.importance.toFixed(2)}); low value ratings end in non-payment` },
      x: { s: "mixed", t: `On-time payers +${band("Paid on time").diff} pts; late 2+ times ${band("Late 2+ times").diff} pts` },
      verdict: "Narrow it to on-time payers",
      tone: "narrow",
    },
    {
      d: "Welcome call with setup tips",
      b: { s: "yes", t: `${pct(DASH.early.overall)} of new customers leave within 3 months` },
      v: { s: "no", t: `Unhappy new customers write about signal (${pct(V.newComplaints[0].v, 0)}) and evenings, not setup` },
      x: { s: "no", t: `${c1.diff > 0 ? "+" : ""}${c1.diff} pts: no proven effect` },
      verdict: "Redesign around signal, re-test",
      tone: "redo",
    },
    {
      d: "Rebuy reminders before the package expires",
      b: { s: "yes", t: "Late rebuys repeat: habit drives the next one" },
      v: { s: "mixed", t: `${pct(V.involService, 0)} of 'didn't pay' leavers blamed the service, which a reminder can't fix` },
      x: { s: "yes", t: `+${c2.diff} pts on-time rebuys, at Rp 400 a message` },
      verdict: "Keep: cheap and it works",
      tone: "go",
    },
  ];
  const icon = (e: Ev) => {
    const I = e.s === "yes" ? Check : e.s === "no" ? X : Minus;
    const color = e.s === "yes" ? C.green : e.s === "no" ? C.red : e.s === "mixed" ? C.gold : "rgba(11,11,11,0.35)";
    return (
      <span className="flex items-start gap-1.5">
        <I className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color }} strokeWidth={3} />
        <span>{e.t}</span>
      </span>
    );
  };
  const tone = { go: [C.green, "#e6f4ee"], narrow: [C.gold, "#fbf3dc"], test: [C.blue, "#e7f0fb"], redo: [C.red, "#fbe9e8"] } as const;
  return (
    <Panel title="Decision board: three kinds of evidence, one call each" sub="✓ supports it · ✗ argues against · – mixed or not tested. The survey column is where several decisions changed.">
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((r) => (
          <li key={r.d} className="rounded-2xl border border-line p-3 text-[12.5px]">
            <p className="font-semibold">{r.d}</p>
            <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold" style={{ color: tone[r.tone][0], background: tone[r.tone][1] }}>
              {r.verdict}
            </span>
            <dl className="mt-2 grid grid-cols-[78px_1fr] gap-x-2 gap-y-1.5 text-ink-2/80">
              <dt className="text-ink/45">Behaviour</dt>
              <dd>{icon(r.b)}</dd>
              <dt style={{ color: C.orange }}>Survey</dt>
              <dd>{icon(r.v)}</dd>
              <dt className="text-ink/45">Experiment</dt>
              <dd>{icon(r.x)}</dd>
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-[12.5px]">
          <thead className="text-[11px] text-ink/50">
            <tr>
              <th className="py-2 pr-3 font-medium">Decision</th>
              <th className="py-2 pr-3 font-medium">Behaviour</th>
              <th className="py-2 pr-3 font-medium" style={{ color: C.orange }}>
                Survey
              </th>
              <th className="py-2 pr-3 font-medium">Experiment</th>
              <th className="py-2 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.d} className="border-t border-line align-top">
                <td className="py-2.5 pr-3 font-semibold">{r.d}</td>
                <td className="py-2.5 pr-3 text-ink-2/80">{icon(r.b)}</td>
                <td className="bg-[#eb6834]/[0.05] py-2.5 pr-3 text-ink-2/80">{icon(r.v)}</td>
                <td className="py-2.5 pr-3 text-ink-2/80">{icon(r.x)}</td>
                <td className="py-2.5">
                  <span className="inline-block rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap" style={{ color: tone[r.tone][0], background: tone[r.tone][1] }}>
                    {r.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Insight>
        Without the survey, the discount would go to everyone at risk and the welcome call would just be dropped. With it, the discount is narrowed, the welcome call is rebuilt around the real problem, and a
        new action appears that no dashboard suggested: checking the signal before an online sale.
      </Insight>
    </Panel>
  );
}

/* ---------------------------------------------------------------- read it with care */
export function SurveyCaveats() {
  const items = [
    ["Who answers", `About 1 in 4 to 1 in 3 answer, and engaged customers answer most. The quiet ones, who leave most, are heard least: always read answers next to behaviour.`],
    ["Small groups", `Some splits rest on few answers (e.g. ${V.lowUseN} 'low use' leavers). The page shows n next to every split.`],
    ["Said is not always why", "People give the easiest reason. Exit answers are checked against what usage, billing and tickets show."],
    ["Ask at the right moments", "After month one, every quarter, after a repair, at exit: when the experience is fresh and a fix is still possible."],
  ];
  return (
    <Panel title="Reading surveys with care">
      <div className="grid gap-2 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([h, p]) => (
          <div key={h} className="rounded-2xl bg-ink/[0.035] p-3">
            <p className="font-semibold">{h}</p>
            <p className="mt-1 text-ink-2/70">{p}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- the whole section */
export function Voice() {
  return (
    <div className="flex flex-col gap-3">
      <VoiceIntro />
      <div className="grid gap-3 lg:grid-cols-2">
        <SaidVsLogged />
        <div className="flex flex-col gap-3">
          <SilentRisk />
          <AfterRepair />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Drivers />
        <WhereItHurts />
      </div>
      <Comments />
      <div className="grid gap-3 lg:grid-cols-2">
        <WelcomeExplained />
        <ModelWithVoice />
      </div>
      <DecisionBoard />
      <SurveyCaveats />
    </div>
  );
}

/* ================================================================ playground: survey explorer on the raw file */
type Row = { type: string; ans: boolean; nps: number | null; speed: number | null; signal: number | null; value: number | null; support: number | null; theme: string; text: string; en: string; id: string; ch: number; area: number; month: string };
const n0 = (v: string) => (v === "" ? null : Number(v));

export function SurveyExplorer() {
  const channels = DIMS.channels;
  const areas = DIMS.areas;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("All");
  const [ch, setCh] = useState(-1);
  const [area, setArea] = useState(-1);
  const [g, setG] = useState("All");
  const [theme, setTheme] = useState("All");
  const [more, setMore] = useState(6);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // fetch the raw survey file once the explorer scrolls near the screen
    const el = box.current;
    if (!el) return;
    let done = false;
    const io = new IntersectionObserver(
      (es) => {
        if (done || !es.some((e) => e.isIntersecting)) return;
        done = true;
        fetch("/data/fwa/surveys.csv")
          .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
          .then((t) => parseCsv(t.trim()))
          .then((all) => {
            const h = all[0];
            const at = (name: string) => h.indexOf(name);
            const I = { id: at("customer_id"), type: at("survey_type"), month: at("survey_month"), ans: at("responded"), nps: at("nps"), sp: at("sat_speed_peak"), sg: at("sat_indoor_signal"), va: at("sat_value"), su: at("sat_support"), th: at("theme"), tx: at("comment"), en: at("comment_en") };
            setRows(
              all.slice(1).map((r) => {
                const ci = Number(r[I.id].slice(4)) - 1;
                return { id: r[I.id], type: r[I.type], month: r[I.month], ans: r[I.ans] === "Y", nps: n0(r[I.nps]), speed: n0(r[I.sp]), signal: n0(r[I.sg]), value: n0(r[I.va]), support: n0(r[I.su]), theme: r[I.th], text: r[I.tx], en: r[I.en], ch: CUSTS[ci]?.channel ?? -1, area: CUSTS[ci]?.area ?? -1 };
              }),
            );
          })
          .catch((e: Error) => setError(e.message));
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const view = useMemo(() => {
    if (!rows) return null;
    const sent = rows.filter((r) => (type === "All" || r.type === type) && (ch < 0 || r.ch === ch) && (area < 0 || r.area === area));
    const ans = sent.filter((r) => r.ans && (g === "All" || (g === "Promoters" ? (r.nps ?? 0) >= 9 : g === "Passives" ? (r.nps ?? 0) >= 7 && (r.nps ?? 0) <= 8 : (r.nps ?? 10) <= 6)));
    const npsList = ans.map((r) => r.nps).filter((v): v is number => v != null);
    const score = npsList.length ? ((npsList.filter((v) => v >= 9).length - npsList.filter((v) => v <= 6).length) / npsList.length) * 100 : null;
    const mean = (k: "speed" | "signal" | "value" | "support") => {
      const v = ans.map((r) => r[k]).filter((x): x is number => x != null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    const themes = new Map<string, number>();
    for (const r of ans) if (r.theme) themes.set(r.theme, (themes.get(r.theme) ?? 0) + 1);
    const lines = ans.filter((r) => r.text && (theme === "All" || r.theme === theme));
    return { sent: sent.length, ans, score, means: { speed: mean("speed"), signal: mean("signal"), value: mean("value"), support: mean("support") }, themes: [...themes].sort((a, b) => b[1] - a[1]), lines };
  }, [rows, type, ch, area, g, theme]);

  return (
    <Panel title="Survey explorer" sub="Every survey answer from the raw file, cut any way you like. Pick a theme to read what those customers wrote.">
      <div ref={box} className="flex flex-col gap-2">
        <Chips value={type} onChange={setType} options={["All", "Onboarding", "Relationship", "After service request", "Exit"].map((v) => ({ v, l: v }))} size="xs" />
        <div className="flex flex-wrap gap-2">
          <select value={ch} onChange={(e) => setCh(+e.target.value)} className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-[12.5px]" aria-label="Sales channel">
            <option value={-1}>All channels</option>
            {channels.map((c, i) => (
              <option key={c} value={i}>
                {c}
              </option>
            ))}
          </select>
          <select value={area} onChange={(e) => setArea(+e.target.value)} className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-[12.5px]" aria-label="Area">
            <option value={-1}>All areas</option>
            {areas.map((a, i) => (
              <option key={a} value={i}>
                {a}
              </option>
            ))}
          </select>
          <Chips value={g} onChange={setG} options={["All", "Promoters", "Passives", "Detractors"].map((v) => ({ v, l: v }))} size="xs" />
        </div>
      </div>
      {!view ? (
        <p className="mt-4 text-[12.5px] text-ink/50">{error ? `Couldn't load the survey file: ${error}` : "Loading the survey file…"}</p>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="min-w-0">
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Answers" value={num(view.ans.length)} note={`of ${num(view.sent)} sent`} />
              <Tile label="NPS" value={view.score == null ? "–" : `${view.score > 0 ? "+" : ""}${Math.round(view.score)}`} tone={view.score != null && view.score < 0 ? "bad" : undefined} />
              <Tile label="Comments" value={num(view.ans.filter((r) => r.text).length)} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["Busy-hour speed", view.means.speed],
                  ["Indoor signal", view.means.signal],
                  ["Value", view.means.value],
                  ["Support", view.means.support],
                ] as const
              ).map(([l, v]) => (
                <div key={l} className="rounded-xl bg-ink/[0.035] p-2 text-[11.5px]">
                  <p className="text-ink/55">{l}</p>
                  <p className="font-mono text-[15px] font-semibold" style={{ color: v == null ? undefined : v < 3 ? C.red : v >= 3.8 ? C.green : C.ink }}>
                    {v == null ? "–" : v.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 mb-1.5 text-[11.5px] font-semibold text-ink/55">Themes (click to read)</p>
            <div className="flex flex-col gap-1">
              {view.themes.slice(0, 8).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setTheme(theme === k ? "All" : k)} className={`grid grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-2 rounded-lg px-2 py-0.5 text-left text-[12px] ${theme === k ? "bg-ink text-white" : "hover:bg-ink/[0.04]"}`}>
                  <span className="truncate">{k}</span>
                  <span className={`h-2 overflow-hidden rounded-full ${theme === k ? "bg-white/20" : "bg-ink/[0.06]"}`}>
                    <span className="block h-full rounded-full" style={{ width: `${(v / view.themes[0][1]) * 100}%`, background: theme === k ? "#fff" : k === "Works well" || k === "5G is faster" ? C.green : C.red }} />
                  </span>
                  <span className="font-mono text-[11px]">{v}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-[11.5px] font-semibold text-ink/55">
              {theme === "All" ? "Latest comments" : theme} · {num(view.lines.length)}
            </p>
            <ul className="flex flex-col gap-1.5">
              {view.lines
                .slice(-more)
                .reverse()
                .map((r, i) => (
                  <li key={r.id + r.month + i} className="rounded-xl border border-line p-2.5 text-[12.5px]">
                    <p className="font-medium">“{r.text}”</p>
                    <p className="text-[11.5px] text-ink/55">{r.en}</p>
                    <p className="mt-1 font-mono text-[10.5px] text-ink/40">
                      {r.id} · {r.type} · {r.month} · NPS {r.nps ?? "–"}
                    </p>
                  </li>
                ))}
            </ul>
            {view.lines.length > more && (
              <button type="button" onClick={() => setMore((m) => m + 10)} className="mt-2 rounded-full border border-line px-3 py-1 text-[12px]">
                Show more
              </button>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
