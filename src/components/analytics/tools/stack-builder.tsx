"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { buildStack, PRESETS, QUESTIONS, STAGES, type Answers, type StackPick } from "@/data/analytics-tools";
import { Badge, Section, type ToolView } from "./shared";

type QId = keyof Answers;

/** For every question, try the neighbouring answers and report which picks would change: the "what if" panel. */
function whatIfs(a: Answers, now: StackPick[]) {
  const out: { q: string; opt: string; changes: { stage: string; from: string | null; to: string | null }[]; next: Answers }[] = [];
  for (const q of QUESTIONS) {
    const cur = a[q.id as QId];
    for (const o of [cur + 1, cur - 1]) {
      if (o < 0 || o >= q.opts.length) continue;
      const next = { ...a, [q.id]: o } as Answers;
      const changes = buildStack(next)
        .picks.map((pk, i) => ({ stage: pk.stage, from: now[i].tool, to: pk.tool }))
        .filter((c) => c.from !== c.to);
      if (changes.length) {
        out.push({ q: q.q, opt: q.opts[o], changes, next });
        break;
      }
    }
  }
  return out;
}

function Node({ pk, t, i }: { pk: StackPick; t?: ToolView; i: number }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
        0{i + 1} · {pk.stage}
      </span>
      <div className="relative mt-2 grid h-[76px] w-[76px] place-items-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={pk.tool ?? "none"}
            initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            exit={{ rotateY: -90, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`grid h-[76px] w-[76px] place-items-center rounded-[22px] ${t ? "bg-white shadow-[0_10px_30px_-12px_rgba(11,11,11,0.35)]" : "border-2 border-dashed border-ink/15"}`}
          >
            {t ? <Badge t={t} size={48} /> : <span className="font-mono text-[10px] text-ink/35">skip</span>}
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={pk.tool ?? "none"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-2 text-[13px] leading-tight font-semibold"
        >
          {t ? t.name : "Not needed yet"}
        </motion.span>
      </AnimatePresence>
      {t && !t.mine && <span className="mt-0.5 font-mono text-[9px] text-muted">landscape</span>}
    </div>
  );
}

export function StackBuilder({ tools }: { tools: ToolView[] }) {
  const [a, setA] = useState<Answers>(PRESETS[2].a);
  const [preset, setPreset] = useState(2);
  const { picks, cost, learn } = buildStack(a);
  const byId = (id: string | null) => (id ? tools.find((t) => t.id === id) : undefined);
  const chosen = picks.filter((p) => p.tool);
  const mineCount = new Set(chosen.filter((p) => byId(p.tool)?.mine).map((p) => p.tool)).size;
  const distinct = new Set(chosen.map((p) => p.tool)).size;
  const ifs = whatIfs(a, picks);

  const set = (id: QId, v: number) => {
    const next = { ...a, [id]: v } as Answers;
    setA(next);
    setPreset(PRESETS.findIndex((p) => QUESTIONS.every((q) => p.a[q.id as QId] === next[q.id as QId])));
  };

  return (
    <Section
      id="builder"
      kicker="Which tool, when"
      title="The best tool depends on the job. Build the stack for yours."
      line="Pick a scenario or answer seven questions. You get a tool for every step with the reason, an alternative, the cost level and the skills to learn, plus what would change if your answers did."
    >
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {PRESETS.map((p, i) => (
          <button
            key={p.name}
            type="button"
            onClick={() => {
              setA(p.a);
              setPreset(i);
            }}
            className={`rounded-2xl border p-3 text-left transition ${preset === i ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/40"}`}
          >
            <span className="block text-[13.5px] font-semibold">{p.name}</span>
            <span className={`mt-0.5 block text-[11.5px] leading-snug ${preset === i ? "text-white/60" : "text-ink-2/55"}`}>{p.who}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
        <div className="space-y-4 rounded-[28px] bg-cream p-5 sm:p-6">
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{preset >= 0 ? `Scenario: ${PRESETS[preset].name}` : "Your own answers"}</p>
          {QUESTIONS.map((q, qi) => (
            <div key={q.id}>
              <p className="text-[13.5px] font-semibold">
                <span className="mr-1.5 font-mono text-[11px] text-muted">{qi + 1}</span>
                {q.q}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {q.opts.map((o, i) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => set(q.id as QId, i)}
                    className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${a[q.id as QId] === i ? "border-ink bg-ink text-white" : "border-ink/10 bg-white hover:border-ink/30"}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative rounded-[28px] border border-line bg-white p-5 sm:p-6">
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Suggested stack</p>
            <div className="relative mt-4 grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-4 xl:grid-cols-7">
              {/* the pipe the data flows through, on wide screens */}
              <div className="pointer-events-none absolute top-[62px] right-[7%] left-[7%] hidden h-[2px] bg-ink/10 xl:block">
                {[0, 1, 2].map((k) => (
                  <motion.span
                    key={k}
                    className="absolute -top-[3px] block h-2 w-2 rounded-full bg-[#eb6834]"
                    animate={{ left: ["0%", "100%"] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "linear", delay: k * 1.5 }}
                  />
                ))}
              </div>
              {picks.map((pk, i) => (
                <Node key={pk.stage} pk={pk} t={byId(pk.tool)} i={i} />
              ))}
            </div>
            <div className="mt-6 grid gap-2 border-t border-line pt-4 sm:grid-cols-3">
              <div>
                <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">Cost level</p>
                <p className="mt-0.5 text-[14px] font-semibold">{cost}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">Skills to learn</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {learn.map((l) => (
                    <span key={l} className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[12px]">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">From my stack</p>
                <p className="mt-0.5 text-[14px] font-semibold">
                  {mineCount} of {distinct} tools
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {picks.map((pk, i) => {
              const t = byId(pk.tool);
              const alt = pk.alt && pk.alt !== pk.tool ? byId(pk.alt) : undefined;
              return (
                <motion.div
                  key={`${pk.stage}-${pk.tool}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="rounded-2xl border border-line bg-white p-3"
                >
                  <p className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                    {STAGES[i].id} · {t ? t.name : "skip"}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-2/80">{pk.why}</p>
                  {alt && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-2/55">
                      or <Badge t={alt} size={18} /> {alt.name}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>

          {ifs.length > 0 && (
            <div className="rounded-[24px] bg-cream p-4 sm:p-5">
              <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">What would change if…</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {ifs.slice(0, 6).map((w) => (
                  <button
                    key={w.q}
                    type="button"
                    onClick={() => {
                      setA(w.next);
                      setPreset(PRESETS.findIndex((p) => QUESTIONS.every((q) => p.a[q.id as QId] === w.next[q.id as QId])));
                    }}
                    className="rounded-2xl bg-white p-3 text-left transition hover:shadow-sm"
                  >
                    <span className="block text-[12.5px]">
                      <span className="text-ink-2/55">{w.q}</span> <span className="font-semibold">{w.opt}</span>
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {w.changes.map((c) => (
                        <span key={c.stage} className="rounded-full bg-ink/[0.05] px-2 py-0.5 font-mono text-[10.5px]">
                          {c.stage}: <span className="text-ink/40 line-through">{byId(c.from)?.name ?? "skip"}</span> → <span className="font-semibold">{byId(c.to)?.name ?? "skip"}</span>
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-2/50">Click one to try it. These are rules of thumb written down from experience, not a ranking.</p>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
