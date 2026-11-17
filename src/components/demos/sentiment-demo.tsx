"use client";

import { motion } from "framer-motion";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import model from "@/data/models/bilingual-sentiment.json";
import { createTextNet, guessLanguage, tokenize, type TextModel } from "@/lib/text-lstm";
import { Segmented, pc } from "./controls";

type Lang = "id" | "en";
type Mode = "auto" | Lang;

export const SENT_COLOR: Record<string, string> = { positive: "#1baf7a", neutral: "#8a8a85", negative: "#e34948", ambiguous: "#6250d6" };
const NAME: Record<string, string> = { positive: "Positive", neutral: "Neutral", negative: "Negative", ambiguous: "Ambiguous" };
const LANG_NAME: Record<Lang, string> = { id: "Bahasa Indonesia", en: "English" };
const EXPLAIN_MAX = 60; // longer texts are classified in full, but only the first 60 words get a highlight

type Net = ReturnType<typeof createTextNet>;
type Nets = Record<Lang, Net>;
type Weights = Record<Lang, { model: TextModel; vocab: string[] }> & { maxlen: number };

// The weights (~2 MB) live in public/models and are fetched once, when the demo first renders.
let netsPromise: Promise<Nets> | null = null;
function loadNets(): Promise<Nets> {
  netsPromise ??= fetch("/models/bilingual-sentiment-weights.json")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Weights>;
    })
    .then((w) => ({ id: createTextNet(w.id.model, w.id.vocab, w.maxlen), en: createTextNet(w.en.model, w.en.vocab, w.maxlen) }))
    .catch((e) => {
      netsPromise = null;
      throw e;
    });
  return netsPromise;
}

type Sample = { id: string; text: string; label: string; pred: string; lang: Lang; emotions?: string[] };
const SAMPLES: Sample[] = [...model.id.samples.map((s) => ({ ...s, lang: "id" as Lang })), ...model.en.samples.map((s) => ({ ...s, lang: "en" as Lang }))];

export function SentimentDemo() {
  const [mode, setMode] = useState<Mode>("auto");
  const [text, setText] = useState(SAMPLES[0].text);
  const [sample, setSample] = useState<Sample | null>(SAMPLES[0]);
  const deferred = useDeferredValue(text);
  const [nets, setNets] = useState<Nets | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadNets().then(
      (n) => alive && setNets(n),
      (e: Error) => alive && setLoadError(e.message),
    );
    return () => {
      alive = false;
    };
  }, []);

  const res = useMemo(() => {
    if (!nets) return null;
    const net = (l: Lang) => nets[l];
    const tokens = tokenize(deferred, model.maxlen);
    let lang: Lang;
    let how: string;
    if (mode !== "auto") {
      lang = mode;
      how = "chosen by you";
    } else {
      const g = guessLanguage(tokens);
      if (g) {
        lang = g;
        how = "guessed from common words";
      } else {
        // no telltale words: pick the model that knows more of the words
        const share = (l: Lang) => tokens.filter((t) => net(l).known(t)).length;
        lang = share("en") > share("id") ? "en" : "id";
        how = "guessed from known words";
      }
    }
    const n = net(lang);
    const seq = n.ids(tokens);
    const out = n.run(seq);
    const cls = out.sent.indexOf(Math.max(...out.sent));
    const contrib = tokens.length && tokens.length <= EXPLAIN_MAX ? n.explain(seq, cls) : null;
    return { tokens, lang, how, out, cls, contrib, known: tokens.map((t) => n.known(t)) };
  }, [deferred, mode, nets]);

  if (!res) {
    return (
      <div className="grid min-h-[320px] place-items-center rounded-2xl bg-white p-6 text-center">
        <div>
          <p className="text-[15px] font-semibold">{loadError ? "The models could not be loaded" : "Loading the two models…"}</p>
          <p className="mt-1 text-[12.5px] text-ink-2/65">
            {loadError ? `(${loadError}) Check your connection and reload the page.` : "About 2 MB of 8-bit weights and vocabularies, downloaded once and run on your device."}
          </p>
          {!loadError && <span className="mx-auto mt-4 block h-1.5 w-40 animate-pulse rounded-full bg-ink/10" />}
        </div>
      </div>
    );
  }

  const classes = model[res.lang].classes;
  const label = classes[res.cls];
  const maxC = res.contrib ? Math.max(1e-6, ...res.contrib.map(Math.abs)) : 1;
  const unknown = res.known.filter((k) => !k).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Segmented label="Language" value={mode} options={["auto", "id", "en"] as Mode[]} display={(m) => (m === "auto" ? "Auto" : LANG_NAME[m])} onChange={setMode} />
        <p className="text-[12.5px] text-ink-2/65">
          Reading as <b>{LANG_NAME[res.lang]}</b> · {res.how}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3 rounded-2xl bg-white p-4 sm:p-5">
          <label className="block">
            <span className="text-[13.5px] font-medium">Type a review, a comment, anything</span>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setSample(null);
              }}
              rows={4}
              maxLength={600}
              placeholder="e.g. pelayanannya ramah tapi makanannya kurang enak, or: this made my day, thank you!"
              className="mt-2 w-full resize-y rounded-xl border border-ink/10 bg-cream/40 px-3 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-ink/40"
            />
          </label>
          <div>
            <p className="text-[12px] text-ink-2/60">Real test sentences the models never saw (some they get wrong):</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setText(s.text);
                    setSample(s);
                    setMode("auto");
                  }}
                  className={`max-w-[240px] truncate rounded-full border px-3 py-1 text-left text-[12px] transition-colors ${sample?.id === s.id ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/75 hover:border-ink/30"}`}
                  title={s.text}
                >
                  <span className="mr-1 font-mono text-[10px] opacity-60">{s.lang.toUpperCase()}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
          {res.tokens.length > 0 && (
            <div className="rounded-xl bg-cream/50 p-3">
              <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-2/65">
                <span className="font-medium text-ink">How the model read it</span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `${SENT_COLOR[label]}66` }} /> pushes toward {NAME[label].toLowerCase()}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-ink/15" /> pushes away
                </span>
                {unknown > 0 && <span className="underline decoration-dotted underline-offset-2">dotted: word it never learned ({unknown})</span>}
              </p>
              <p className="flex flex-wrap gap-1 text-[13.5px] leading-relaxed">
                {res.tokens.map((t, i) => {
                  const c = res.contrib?.[i] ?? 0;
                  const a = Math.min(1, Math.abs(c) / maxC);
                  return (
                    <span
                      key={`${i}-${t}`}
                      title={res.contrib ? `${c >= 0 ? "+" : "−"}${Math.abs(c * 100).toFixed(1)} points of ${NAME[label].toLowerCase()}` : undefined}
                      className={`rounded px-1 ${res.known[i] ? "" : "text-ink/50 underline decoration-dotted underline-offset-2"}`}
                      style={{ background: c > 0 ? `${SENT_COLOR[label]}${Math.round(a * 140).toString(16).padStart(2, "0")}` : c < 0 ? `rgba(11,11,11,${(a * 0.18).toFixed(3)})` : undefined }}
                    >
                      {t}
                    </span>
                  );
                })}
              </p>
              {!res.contrib && res.tokens.length > EXPLAIN_MAX && <p className="mt-2 text-[11.5px] text-ink-2/60">Highlights are shown for texts up to {EXPLAIN_MAX} words.</p>}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-5">
            <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">The network says</p>
            <motion.p key={`${res.lang}-${label}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-[2.1rem] leading-none font-semibold tracking-[-0.04em]" style={{ color: SENT_COLOR[label] }}>
              {NAME[label]}
            </motion.p>
            {sample && sample.lang === res.lang && (
              <p className="mt-2 text-[12px] text-ink-2/65">
                Human label: <b style={{ color: SENT_COLOR[sample.label] }}>{NAME[sample.label]}</b>
                {sample.label === label ? " · right" : " · wrong"}
                {sample.emotions?.length ? ` · emotions: ${sample.emotions.join(", ")}` : ""}
              </p>
            )}
            <div className="mt-4 space-y-2">
              {classes.map((c, i) => (
                <div key={c}>
                  <div className="flex justify-between text-[12.5px]">
                    <span>{NAME[c]}</span>
                    <span className="font-mono">{(res.out.sent[i] * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                    <motion.div className="h-full rounded-full" style={{ background: SENT_COLOR[c] }} animate={{ width: pc(res.out.sent[i] * 100) }} transition={{ duration: 0.35 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {res.lang === "en" && res.out.emo && <Emotions probs={res.out.emo} />}
          {res.lang === "id" && (
            <p className="rounded-2xl bg-white p-4 text-[12.5px] leading-snug text-ink-2/70">
              The Indonesian model learned from reviews and opinions (food, places, products, public figures), so it reads opinions best. Emotions are English only: no Indonesian dataset with emotion labels
              and a clear licence was used here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Emotions({ probs }: { probs: number[] }) {
  const emo = model.en.emotions;
  const th = model.en.thresholds;
  // rank by probability; rare emotions have low thresholds, so only the strongest three past their threshold are named
  const order = emo.map((e, i) => ({ e, p: probs[i], t: th[i] })).sort((a, b) => b.p - a.p);
  const shown = order.slice(0, 6);
  const past = order.filter((o) => o.p >= o.t && o.e !== "neutral");
  const hits = past.slice(0, 3);
  return (
    <div className="rounded-2xl bg-white p-5">
      <p className="font-mono text-[10.5px] tracking-wide text-muted uppercase">Emotions (28 possible)</p>
      <p className="mt-1 text-[14px] font-semibold">{hits.length ? hits.map((h) => h.e).join(" · ") : "no clear emotion: neutral"}
        {past.length > 3 && <span className="ml-1.5 text-[12px] font-normal text-ink-2/55">+{past.length - 3} weaker</span>}
      </p>
      <div className="mt-3 space-y-2">
        {shown.map((o) => (
          <div key={o.e}>
            <div className="flex justify-between text-[12px]">
              <span className={o.p >= o.t ? "font-semibold" : "text-ink-2/70"}>{o.e}</span>
              <span className="font-mono text-ink-2/70">{(o.p * 100).toFixed(0)}%</span>
            </div>
            <div className="relative mt-1 h-1.5 rounded-full bg-ink/[0.06]">
              <motion.div className="h-full rounded-full" style={{ background: SENT_COLOR[model.en.groups[o.e as keyof typeof model.en.groups]] ?? "#8a8a85" }} animate={{ width: pc(o.p * 100) }} transition={{ duration: 0.35 }} />
              <span className="absolute top-[-3px] h-3 w-[2px] rounded bg-ink/60" style={{ left: pc(o.t * 100) }} title={`threshold ${o.t}`} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-snug text-ink-2/60">The tick is each emotion&apos;s own threshold, tuned on validation data; past it, the emotion counts as detected. A comment can have several.</p>
    </div>
  );
}
