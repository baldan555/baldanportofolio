"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import bs from "@/data/models/bilingual-sentiment.json";
import { createTextNet, tokenize, type TextModel } from "@/lib/text-lstm";
import { InsideSection, Picker, Scrolly, type Step } from "../scrolly";

type Net = ReturnType<typeof createTextNet>;
type Lang = "id" | "en";
const UP = "#eb6834";
const BLUE = "#2a78d6";
const tr = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };
const r2 = (v: number) => Math.round(v * 100) / 100;

// the weights live in /public (2 MB), fetched once when this section mounts, like the demo
let netsPromise: Promise<Record<Lang, Net>> | null = null;
const loadNets = () =>
  (netsPromise ??= fetch("/models/bilingual-sentiment-weights.json")
    .then((r) => r.json())
    .then((w) => ({ id: createTextNet(w.id.model as TextModel, w.id.vocab, w.maxlen), en: createTextNet(w.en.model as TextModel, w.en.vocab, w.maxlen) })));

const SAMPLES = [
  ...bs.id.samples.filter((s) => ["id-135", "id-17", "id-308"].includes(s.id)).map((s) => ({ ...s, lang: "id" as Lang })),
  ...bs.en.samples.filter((s) => ["en-3", "en-96", "en-300"].includes(s.id)).map((s) => ({ ...s, lang: "en" as Lang })),
];
const EMOTIONS = bs.en.emotions;
const THRESH = bs.en.thresholds as number[];

function Panel({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 10 }}
      transition={tr}
      className={`absolute inset-0 flex flex-col justify-center overflow-hidden px-4 pb-10 sm:px-7 ${on ? "" : "pointer-events-none"}`}
    >
      {children}
    </motion.div>
  );
}

/** A vector as a strip of little cells (first `n` numbers). */
function Strip({ v, n = 16, h = 6 }: { v: ArrayLike<number>; n?: number; h?: number }) {
  let max = 1e-9;
  for (let i = 0; i < Math.min(n, v.length); i++) max = Math.max(max, Math.abs(v[i]));
  return (
    <span className="flex flex-col gap-px">
      {Array.from({ length: Math.min(n, v.length) }, (_, i) => (
        <span key={i} className="w-full rounded-[1px]" style={{ height: h, background: v[i] >= 0 ? `rgba(235,104,52,${r2(Math.abs(v[i]) / max)})` : `rgba(42,120,214,${r2(Math.abs(v[i]) / max)})` }} />
      ))}
    </span>
  );
}

export function Visual({ step, net, text, lang }: { step: number; net: Net; text: string; lang: Lang }) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const ids = useMemo(() => net.ids(tokens), [net, tokens]);
  const out = useMemo(() => net.run(ids), [net, ids]);
  const tc = useMemo(() => net.trace!(ids), [net, ids]);
  const classes = lang === "id" ? bs.id.classes : bs.en.classes;
  const best = out.sent.indexOf(Math.max(...out.sent));
  const why = useMemo(() => (step === 6 ? net.explain(ids, best) : null), [step, net, ids, best]);
  const wmax = why ? Math.max(...why.map(Math.abs), 1e-9) : 1;
  const U = tc.fwd[0]?.length ?? 64;
  const votes = tokens.map((_, t) => tc.from.filter((f) => f === t).length);
  const vmax = Math.max(...votes, 1);
  // steps 3–4 sweep across the sentence
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (step !== 2 && step !== 3) return;
    let k = 0;
    const id = setInterval(() => {
      k = (k + 1) % (tokens.length + 6);
      setPos(Math.min(k, tokens.length - 1));
    }, 260);
    return () => clearInterval(id);
  }, [step, tokens.length]);
  const sweep = step === 3 ? tokens.length - 1 - pos : pos;
  const visible = tokens.slice(0, 18);

  return (
    <div className="relative min-h-0 flex-1">
      <Panel on={step === 0}>
        <div className="rounded-3xl bg-white px-5 py-4 text-[16px] leading-relaxed shadow-sm">{text}</div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tokens.map((t, i) => (
            <span key={i} className={`rounded-lg px-2 py-1 font-mono text-[12px] ${net.known(t) ? "bg-ink text-white" : "bg-white text-ink/40 line-through"}`}>
              {t}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-2/60">Crossed out: not among the {lang === "id" ? "8,000" : "10,000"} words the network knows; it reads them as “unknown”.</p>
      </Panel>

      <Panel on={step >= 1 && step <= 4}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
          {step === 1
            ? "each word → 64 numbers (first 16 shown)"
            : step === 2
              ? "reading left → right: memory after each word"
              : step === 3
                ? "reading right → left: memory after each word"
                : "the strongest signal per unit, and which word gave it"}
        </p>
        <div className="flex items-end gap-1 overflow-hidden">
          {visible.map((t, i) => {
            const lit = (step === 2 && i <= sweep) || (step === 3 && i >= sweep) || step === 1 || step === 4;
            const v = step === 1 ? tc.emb[i] : step === 3 ? tc.bwd[i] : tc.fwd[i];
            return (
              <div key={i} className="flex w-[34px] shrink-0 flex-col items-center gap-1">
                {step === 4 ? (
                  <span className="w-full rounded-sm bg-[#eb6834]" style={{ height: 6 + (votes[i] / vmax) * 90, opacity: r2(0.25 + (0.75 * votes[i]) / vmax) }} />
                ) : (
                  <motion.span className="w-full" initial={false} animate={{ opacity: lit ? 1 : 0.12 }} transition={{ duration: 0.2 }}>
                    <Strip v={v} />
                  </motion.span>
                )}
                <span className={`w-full truncate text-center font-mono text-[10px] ${(step === 2 || step === 3) && i === sweep ? "font-bold text-[#c2410c]" : ""}`}>{t}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-ink-2/60">
          {step === 1
            ? "Words used alike end up with similar numbers: learned from the training sentences, not from a dictionary."
            : step === 4
              ? `For each of ${2 * U} memory units, keep its highest value anywhere in the sentence. Bar height: how many of those maxima came from that word.`
              : `${U} memory units per direction; each column is the memory right after that word.`}
        </p>
      </Panel>

      <Panel on={step === 5}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
          {2 * U} numbers → sentiment{lang === "en" ? " + 28 emotions" : ""}
        </p>
        <div className="space-y-1.5">
          {classes.map((c, i) => (
            <div key={c} className="grid grid-cols-[90px_1fr_46px] items-center gap-2 text-[13px]">
              <span className={i === best ? "font-semibold" : ""}>{c}</span>
              <div className="h-3 rounded-full bg-ink/[0.06]">
                <motion.div className="h-full rounded-full" initial={false} animate={{ width: `${r2(out.sent[i] * 100)}%`, background: i === best ? UP : "rgba(11,11,11,0.35)" }} transition={tr} />
              </div>
              <span className="text-right font-mono">{Math.round(out.sent[i] * 100)}%</span>
            </div>
          ))}
        </div>
        {out.emo && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {out.emo
              .map((p, i) => ({ p, i }))
              .sort((a, b) => b.p - a.p)
              .slice(0, 5)
              .map(({ p, i }) => (
                <span key={i} className={`rounded-full px-2.5 py-1 text-[12px] ${p >= THRESH[i] ? "bg-ink text-white" : "bg-white text-ink/60"}`}>
                  {EMOTIONS[i]} {Math.round(p * 100)}%
                </span>
              ))}
          </div>
        )}
      </Panel>

      <Panel on={step === 6}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Leave one word out: how much does “{classes[best]}” change?</p>
        <div className="flex flex-wrap gap-1.5">
          {tokens.map((t, i) => {
            const w = why?.[i] ?? 0;
            return (
              <span
                key={i}
                className="rounded-lg px-2 py-1 text-[14px]"
                style={{ background: w >= 0 ? `rgba(235,104,52,${r2(Math.abs(w) / wmax)})` : `rgba(42,120,214,${r2(Math.abs(w) / wmax)})`, color: Math.abs(w) / wmax > 0.55 ? "#fff" : undefined }}
              >
                {t}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-ink-2/60">
          <span style={{ color: UP }}>■</span> supports it · <span style={{ color: BLUE }}>■</span> works against it
        </p>
      </Panel>
    </div>
  );
}

export function Inside() {
  const [nets, setNets] = useState<Record<Lang, Net> | null>(null);
  const [pick, setPick] = useState(0);
  useEffect(() => {
    let live = true;
    loadNets().then((n) => live && setNets(n));
    return () => {
      live = false;
    };
  }, []);
  const s = SAMPLES[pick];
  const rows = SAMPLES.map((x) => ({ id: x.id, tag: `${x.lang === "id" ? "ID" : "EN"} · ${x.label}` }));

  const steps: Step[] = [
    { t: "A sentence becomes tokens", d: "Words, numbers and punctuation are split apart and lower-cased. Each language has its own network and its own vocabulary." },
    { t: "Each word becomes a vector", d: "An embedding table turns every word into 64 numbers. Training moves words that are used alike close together." },
    { t: "Read left to right", d: "An LSTM reads the words in order and keeps a memory, like the forecaster on the Live Forecast page, but over words instead of hours." },
    { t: "…and right to left", d: "A second LSTM reads backwards, so every word is seen with what comes after it too: “not” matters before “good”, “banget” after it." },
    { t: "Keep the strongest signal", d: "For every memory unit, the highest value anywhere in the sentence is kept. Long or short, the sentence becomes a fixed list of 128 numbers." },
    {
      t: "Two heads",
      d: "A softmax layer picks positive, neutral or negative (and “ambiguous” in English); in English, a second layer scores 28 emotions independently, each with its own threshold.",
    },
    { t: "Which words mattered", d: "Re-running the network with one word removed at a time shows how much each word moved the answer." },
  ];

  return (
    <InsideSection
      title="Reading a sentence both ways."
      line="A bidirectional LSTM, step by step, on a real sentence from the data, with the network's real weights (loaded from the same file as the demo)."
    >
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label="Sentence" rows={rows} value={pick} onChange={setPick} tag={(r) => r.tag} />
            <div className="flex min-h-0 flex-1 flex-col">
              {nets ? <Visual step={step} net={nets[s.lang]} text={s.text} lang={s.lang} /> : <p className="m-auto text-[13px] text-muted">Loading the network…</p>}
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
