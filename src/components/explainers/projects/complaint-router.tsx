"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import model from "@/data/models/complaint-router.json";
import { charWbNgrams, createRouter, type RouterModel } from "@/lib/text-router";
import { InsideSection, Picker, Scrolly, type Step } from "../scrolly";

const M = model.model as RouterModel;
const predict = createRouter(M);
const index = new Map(M.vocab.map((g, i) => [g, i]));
const LABELS = model.labels;
const TEAMS = model.teams.map((t) => t.name);
const UP = "#eb6834";
const BLUE = "#2a78d6";
/** Rounded for inline styles, so server HTML and the browser agree (hydration). */
const r2 = (v: number) => Math.round(v * 100) / 100;
const tr = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };
const show = (g: string) => g.replace(/ /g, "␣");

function Panel({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 10 }}
      transition={tr}
      className={`absolute inset-0 flex flex-col justify-center overflow-hidden px-5 pb-10 sm:px-8 ${on ? "" : "pointer-events-none"}`}
    >
      {children}
    </motion.div>
  );
}

/** TF-IDF weight of every n-gram in the text, exactly as the model sees it (1 + ln count, × idf, then L2-normalised). */
function tfidf(text: string) {
  const words = charWbNgrams(text, M.ngram[0], M.ngram[1]);
  const counts = new Map<string, number>();
  for (const w of words) for (const g of w.grams) counts.set(g, (counts.get(g) ?? 0) + 1);
  const known = [...counts].filter(([g]) => index.has(g)).map(([g, c]) => ({ g, v: (1 + Math.log(c)) * M.idf[index.get(g)!] }));
  const norm = Math.sqrt(known.reduce((s, k) => s + k.v * k.v, 0)) || 1;
  return { words, all: [...counts.keys()], known: known.map((k) => ({ g: k.g, v: k.v / norm })).sort((a, b) => b.v - a.v) };
}

export function Visual({ step, text, actual }: { step: number; text: string; actual: number }) {
  const out = useMemo(() => predict(text), [text]);
  const tf = useMemo(() => tfidf(text), [text]);
  const best = out.order[0];
  const longest = [...tf.words].sort((a, b) => b.word.length - a.word.length)[0];
  // step 2: slide a 3-letter window along the longest word
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (step !== 1) return;
    const id = setInterval(() => setPos((p) => (p + 1) % Math.max(1, longest.word.length)), 450);
    return () => clearInterval(id);
  }, [step, longest.word.length]);
  const padded = ` ${longest.word} `;
  const maxV = tf.known[0]?.v ?? 1;
  const maxW = Math.max(...out.words.map((w) => Math.abs(w.weight)), 1e-6);

  return (
    <div className="relative min-h-0 flex-1">
      <Panel on={step === 0}>
        <div className="max-w-[90%] self-start rounded-3xl rounded-bl-md bg-white px-5 py-4 text-[18px] leading-snug shadow-sm">{text}</div>
        <p className="mt-3 text-[12px] text-ink-2/60">A real message from the test set. The model has never seen it.</p>
      </Panel>

      <Panel on={step === 1}>
        <p className="mb-2 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Pieces of 2 to 5 letters, inside each word</p>
        <div className="mb-4 flex font-mono text-[26px] tracking-[0.12em]">
          {Array.from(padded).map((ch, i) => (
            <span key={i} className={`rounded px-0.5 transition-colors ${i >= pos && i < pos + 3 ? "bg-[#eb6834] text-white" : ""}`}>
              {ch === " " ? "␣" : ch}
            </span>
          ))}
        </div>
        <div className="flex max-h-[45%] flex-wrap gap-1 overflow-hidden">
          {tf.all.slice(0, 90).map((g) => (
            <span key={g} className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] ${index.has(g) ? "bg-white text-ink" : "bg-white/40 text-ink/30"}`}>
              {show(g)}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-2/60">
          {out.grams} pieces; {out.known} of them are in the model&apos;s vocabulary of {M.vocab.length.toLocaleString("en-US")} (faded ones are not). Typos still share most pieces with the right
          word.
        </p>
      </Panel>

      <Panel on={step === 2}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Each piece&apos;s weight (TF-IDF): rare pieces count more</p>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {tf.known.slice(0, 30).map((k) => (
            <span key={k.g} className="font-mono" style={{ fontSize: r2(11 + (k.v / maxV) * 11), opacity: r2(0.35 + (0.65 * k.v) / maxV) }}>
              {show(k.g)}
            </span>
          ))}
        </div>
      </Panel>

      <Panel on={step === 3 || step === 4}>
        <p className="mb-2 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{LABELS.length} neurons, one per intent</p>
        <div className="mb-4 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1">
          {LABELS.map((_, k) => (
            <motion.span
              key={k}
              className="aspect-square rounded-full"
              initial={false}
              animate={{ background: k === best && step === 4 ? UP : `rgba(11,11,11,${r2(0.08 + 0.9 * Math.sqrt(out.probs[k]))})` }}
              transition={tr}
            />
          ))}
        </div>
        <div className="space-y-1.5">
          {out.order.slice(0, 4).map((k, i) => (
            <div key={k} className="grid grid-cols-[1fr_110px_44px] items-center gap-2 text-[12.5px] sm:grid-cols-[1fr_160px_44px]">
              <span className={`truncate ${i === 0 && step === 4 ? "font-semibold" : ""}`}>
                {LABELS[k]}
                {k === actual ? " ✓" : ""}
              </span>
              <div className="h-2.5 rounded-full bg-ink/[0.06]">
                <motion.div
                  className="h-full rounded-full"
                  initial={false}
                  animate={{ width: `${r2(out.probs[k] * 100)}%`, background: i === 0 && step === 4 ? UP : "rgba(11,11,11,0.4)" }}
                  transition={tr}
                />
              </div>
              <span className="text-right font-mono">{(out.probs[k] * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <motion.p initial={false} animate={{ opacity: step === 4 ? 1 : 0 }} transition={tr} className="mt-3 text-[12.5px]">
          The person who labelled it said: <b>{LABELS[actual]}</b>
        </motion.p>
      </Panel>

      <Panel on={step === 5}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Every intent belongs to one team</p>
        <div className="grid grid-cols-2 gap-2">
          {TEAMS.map((t, i) => {
            const mine = M.team[best] === i;
            const truth = M.team[actual] === i;
            return (
              <motion.div
                key={t}
                initial={false}
                animate={{ background: mine ? "#0b0b0b" : "#ffffff", color: mine ? "#fff" : "#0b0b0b" }}
                transition={tr}
                className="rounded-xl border border-line px-3 py-2 text-[12.5px]"
              >
                {t}
                {truth && <span className={mine ? "text-white/70" : "text-[#138a60]"}> · right team</span>}
              </motion.div>
            );
          })}
        </div>
      </Panel>

      <Panel on={step === 6}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Which words pushed towards “{LABELS[best]}”</p>
        <div className="flex flex-wrap gap-1.5">
          {out.words.map((w, i) => (
            <span
              key={i}
              className="rounded-lg px-2 py-1 text-[15px]"
              style={{
                background: w.weight >= 0 ? `rgba(235,104,52,${r2((0.85 * w.weight) / maxW)})` : `rgba(42,120,214,${r2((0.85 * -w.weight) / maxW)})`,
                color: Math.abs(w.weight) / maxW > 0.55 ? "#fff" : "#0b0b0b",
              }}
            >
              {w.word}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-2/60">
          <span style={{ color: UP }}>■</span> towards this intent · <span style={{ color: BLUE }}>■</span> away from it
        </p>
      </Panel>
    </div>
  );
}

export function Inside() {
  const rows = model.samples.slice(0, 6);
  const [pick, setPick] = useState(0);
  const s = rows[pick];
  const out = useMemo(() => predict(s.text), [s]);
  const best = out.order[0];

  const steps: Step[] = [
    { t: "A customer writes in", d: "One real message from the BANKING77 test set. The job: pick which of 77 intents it is, and send it to the right team." },
    {
      t: "Cut the text into pieces",
      d: "The model doesn't read words. It slides a window of 2 to 5 letters along each word and counts the pieces, so “withdrawl” still looks a lot like “withdrawal”.",
    },
    { t: "Weigh the pieces", d: "Pieces that appear in almost every message (like “␣a”) say little; rare ones say a lot. TF-IDF scales each count by how rare the piece is." },
    {
      t: `${LABELS.length} neurons, one per intent`,
      d: `Each intent has its own logistic-regression neuron: every piece's weight times that intent's learned weight, summed. The darker the dot, the stronger the score.`,
    },
    { t: "Softmax picks the winner", d: `The scores are turned into chances that add up to 100%. Top pick: “${LABELS[best]}” at ${(out.probs[best] * 100).toFixed(0)}%.` },
    { t: "Route to a team", d: `The ${LABELS.length} intents map onto ${TEAMS.length} support teams, so even a near-miss intent often lands with the right people.` },
    { t: "Which words decided it", d: "Splitting each piece's push back onto the word it came from shows what the model relied on. Useful to spot when it is right for the wrong reason." },
  ];

  return (
    <InsideSection title="77 neurons read a message." line="Text becomes letter pieces, pieces become weighted numbers, and one small neuron per intent votes. Scroll through a real customer message.">
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label="Message" rows={rows} value={pick} onChange={setPick} tag={(r) => (r.correct ? "right" : "wrong")} />
            <div className="flex min-h-0 flex-1 flex-col">
              <Visual step={step} text={s.text} actual={s.actual} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
