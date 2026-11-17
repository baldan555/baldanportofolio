"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/feedback-themes.json";
import { createSentiment, createThemer, type SentimentModel, type ThemeModel } from "@/lib/feedback";
import { InsideSection, Picker, Scrolly, type Step } from "../scrolly";

const mix = createThemer(model.theme_model as ThemeModel);
const tone = createSentiment(model.sentiment_model as SentimentModel);
const THEMES = model.themes;
const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6", "#d6497b", "#c29a00", "#0f766e", "#64748b", "#a855f7", "#e34948"];
const UP = "#eb6834";
const BLUE = "#2a78d6";
/** Rounded for inline styles, so server HTML and the browser agree (hydration). */
const r2 = (v: number) => Math.round(v * 100) / 100;
const tr = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

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

/** The tone model reads the title and the review together, like the demo; the theme model reads the review only. */
export function Visual({ step, text, title }: { step: number; text: string; title?: string }) {
  const full = title ? `${title}. ${text}` : text;
  const m = useMemo(() => mix(text), [text]);
  const t = useMemo(() => tone(full), [full]);
  const known = new Set(m.words);
  const total = m.h.reduce((s, v) => s + v, 0) || 1;
  const order = m.h.map((_, k) => k).sort((a, b) => m.h[b] - m.h[a]);
  const maxW = Math.max(...t.tokens.map((k) => Math.abs(k.weight)), 1e-6);
  const words = text.split(/(\s+)/);

  return (
    <div className="relative min-h-0 flex-1">
      <Panel on={step === 0 || step === 1}>
        <p className="mb-2 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{step === 0 ? "A real review" : "Words the theme model knows"}</p>
        <div className="rounded-3xl bg-white px-5 py-4 text-[16px] leading-relaxed shadow-sm">
          {words.map((w, i) => {
            const k = w.toLowerCase().replace(/[^a-z]/g, "");
            const hit = step === 1 && known.has(k);
            return (
              <span key={i} className={`rounded transition-colors ${hit ? "bg-ink px-0.5 text-white" : step === 1 && k ? "text-ink/35" : ""}`}>
                {w}
              </span>
            );
          })}
        </div>
      </Panel>

      <Panel on={step === 2}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
          {THEMES.length} themes found in {model.dataset.with_text.toLocaleString("en-US")} reviews, no labels given
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
          {THEMES.map((th, k) => (
            <div key={th.name} className="rounded-xl bg-white px-3 py-2">
              <p className="text-[12px] font-semibold" style={{ color: COLORS[k] }}>
                {th.name}
              </p>
              <p className="truncate font-mono text-[10.5px] text-muted">
                {th.top
                  .slice(0, 5)
                  .map((w) => w[0])
                  .join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel on={step === 3}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">This review as a mix of themes</p>
        <div className="mb-4 flex h-6 overflow-hidden rounded-full bg-ink/[0.06]">
          {order.map((k) => (
            <motion.div key={k} initial={false} animate={{ width: step === 3 ? `${r2((m.h[k] / total) * 100)}%` : "0%" }} transition={tr} style={{ background: COLORS[k] }} />
          ))}
        </div>
        <div className="space-y-1.5">
          {order.slice(0, 4).map((k) => (
            <div key={k} className="grid grid-cols-[1fr_52px] text-[13px]">
              <span>
                <span style={{ color: COLORS[k] }}>■</span> {THEMES[k].name}
              </span>
              <span className="text-right font-mono">{Math.round((m.h[k] / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel on={step === 4}>
        <p className="mb-2 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">A separate neuron for tone</p>
        <div className="rounded-3xl bg-white px-5 py-4 text-[15.5px] leading-relaxed shadow-sm">
          {t.tokens.length
            ? (() => {
                const out: React.ReactNode[] = [];
                let at = 0;
                t.tokens.forEach((k, i) => {
                  out.push(full.slice(at, k.start));
                  const a = r2(Math.min(0.85, Math.abs(k.weight) / maxW));
                  out.push(
                    <span key={i} className="rounded px-0.5" style={{ background: k.weight > 0 ? `rgba(235,104,52,${a})` : `rgba(42,120,214,${a})`, color: a > 0.55 ? "#fff" : undefined }}>
                      {k.text}
                    </span>,
                  );
                  at = k.end;
                });
                out.push(full.slice(at));
                return out;
              })()
            : full}
        </div>
        <p className="mt-4 text-[30px] leading-none font-semibold">{(t.p * 100).toFixed(t.p < 0.1 ? 1 : 0)}%</p>
        <p className="text-[12.5px] text-ink-2/60">
          chance this reviewer would <b>not</b> recommend it · <span style={{ color: UP }}>■</span> towards not · <span style={{ color: BLUE }}>■</span> towards recommend
        </p>
      </Panel>

      <Panel on={step === 5}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Every theme: share of reviews · how many would not recommend</p>
        <div className="space-y-1.5">
          {[...THEMES]
            .map((th, k) => ({ ...th, k }))
            .sort((a, b) => b.not_rec - a.not_rec)
            .map((th) => (
              <div key={th.name} className="grid grid-cols-[1fr_120px_40px] items-center gap-2 text-[12px] sm:grid-cols-[1fr_170px_40px]">
                <span className="truncate">
                  <span style={{ color: COLORS[th.k] }}>■</span> {th.name} <span className="text-muted">· {Math.round(th.share * 100)}%</span>
                </span>
                <div className="h-2.5 rounded-full bg-ink/[0.06]">
                  <motion.div className="h-full rounded-full bg-ink/70" initial={false} animate={{ width: step === 5 ? `${r2(th.not_rec * 200)}%` : "0%" }} transition={tr} />
                </div>
                <span className="text-right font-mono">{Math.round(th.not_rec * 100)}%</span>
              </div>
            ))}
        </div>
      </Panel>
    </div>
  );
}

export function Inside() {
  const rows = model.samples.slice(0, 5);
  const [pick, setPick] = useState(0);
  const s = rows[pick];

  const steps: Step[] = [
    { t: "Start with one review", d: "A real customer review from a clothing shop. Nobody tagged what it's about; the model has to find out." },
    {
      t: "Keep the words that matter",
      d: `The theme model keeps ${model.theme_model.vocab.length.toLocaleString("en-US")} common words and weighs rare ones more (TF-IDF). Filler words like “the” and “and” are dropped.`,
    },
    {
      t: `${THEMES.length} themes, found on their own`,
      d: `Non-negative matrix factorisation (NMF) splits thousands of reviews into ${THEMES.length} word groups that tend to appear together. I only named them afterwards.`,
    },
    { t: "Each review is a mix", d: "For a new review, the model finds how much of each theme it takes to rebuild its words. Most reviews lean on two or three themes." },
    { t: "Tone is a separate neuron", d: "A logistic-regression neuron over words and word pairs scores the chance the reviewer would not recommend the item." },
    { t: "Themes × tone", d: "Put together across every review, themes show which complaints drive people away: the useful answer for a shop." },
  ];

  return (
    <InsideSection title="Themes nobody tagged." line="One model finds what reviews talk about, another reads their tone. Scroll through a real review.">
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label="Review" rows={rows} value={pick} onChange={setPick} tag={(r) => `${r.rating}★`} />
            <div className="flex min-h-0 flex-1 flex-col">
              <Visual step={step} text={s.text} title={s.title} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
