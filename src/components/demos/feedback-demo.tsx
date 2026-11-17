"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/feedback-themes.json";
import { createSentiment, createThemer, type SentimentModel, type ThemeModel } from "@/lib/feedback";
import { pc } from "./controls";

export type ReviewSample = (typeof model.samples)[number];
export const THEME_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948", "#4fb3c8", "#8a6d3b"];
export const THEMES = model.themes.map((t) => t.name);

const themer = createThemer(model.theme_model as ThemeModel);
const sentiment = createSentiment(model.sentiment_model as SentimentModel);

/** Written for the demo, not taken from the dataset. */
const EXAMPLES = [
  "Beautiful color but the fabric is thin and see-through. Sending it back.",
  "Runs very small, I had to size up twice. The print is lovely though.",
  "So comfortable and soft, I get compliments every time I wear it.",
  "Perfect summer dress, great length, light and airy.",
  "These jeans fit true to size and the stretch holds up all day.",
  "The skirt sits nicely at the waist and works for the office.",
];

export function FeedbackDemo({ preset }: { preset?: ReviewSample | null }) {
  const [text, setText] = useState(preset ? `${preset.title ? `${preset.title}. ` : ""}${preset.text}` : EXAMPLES[0]);
  const mix = useMemo(() => themer(preset && text === `${preset.title ? `${preset.title}. ` : ""}${preset.text}` ? preset.text : text), [text, preset]);
  const sent = useMemo(() => sentiment(text), [text]);
  const total = mix.h.reduce((a, b) => a + b, 0);
  const shares = mix.h.map((v) => (total > 0 ? v / total : 0));
  const order = shares.map((_, i) => i).sort((a, b) => shares[b] - shares[a]);
  const maxW = Math.max(1e-6, ...sent.tokens.map((t) => Math.abs(t.weight)));
  const p = sent.p;
  const verdict = p >= 0.5 ? "Sounds unhappy" : p >= 0.25 ? "Mixed" : "Sounds happy";

  // rebuild the text with highlighted words (only when lowercasing kept every character position)
  const pieces: { s: string; w?: number }[] = [];
  if (sent.sameLength) {
    let at = 0;
    for (const t of sent.tokens) {
      if (t.start > at) pieces.push({ s: text.slice(at, t.start) });
      pieces.push({ s: t.text, w: t.weight });
      at = t.end;
    }
    if (at < text.length) pieces.push({ s: text.slice(at) });
  } else pieces.push({ s: text });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 sm:p-6">
        <label className="block">
          <span className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">A customer review</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={800}
            placeholder="Write a review of a piece of clothing…"
            className="mt-2 w-full resize-none rounded-xl border border-ink/10 px-3.5 py-3 text-[14.5px] leading-relaxed outline-none focus:border-ink/40"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              className={`rounded-full border px-2.5 py-1 text-left text-[12px] transition-colors ${text === ex ? "border-ink bg-ink text-white" : "border-ink/10 hover:border-ink/40 hover:bg-cream/60"}`}
            >
              {ex.length > 46 ? `${ex.slice(0, 44)}…` : ex}
            </button>
          ))}
        </div>
        <div className="border-t border-line pt-4">
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">What decided the tone</p>
          <p className="mt-2 text-[15px] leading-[2]">
            {pieces.map((pc_, i) =>
              pc_.w === undefined ? (
                <span key={i}>{pc_.s}</span>
              ) : (
                <span
                  key={i}
                  className="rounded px-0.5"
                  style={{ background: pc_.w > 0 ? `rgba(235,104,52,${((Math.abs(pc_.w) / maxW) * 0.5).toFixed(3)})` : `rgba(42,120,214,${((Math.abs(pc_.w) / maxW) * 0.5).toFixed(3)})` }}
                  title={`${pc_.w >= 0 ? "+" : ""}${pc_.w.toFixed(3)}`}
                >
                  {pc_.s}
                </span>
              ),
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-[11.5px] text-ink-2/70">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(235,104,52,0.5)" }} /> towards &ldquo;wouldn&apos;t recommend&rdquo;
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(42,120,214,0.5)" }} /> towards &ldquo;would recommend&rdquo;
            </span>
          </div>
        </div>
        {preset && (
          <p className="rounded-xl bg-cream px-3.5 py-2.5 text-[12.5px]">
            The reviewer gave <b>{preset.rating}★</b> and {preset.recommended ? "recommended it" : <b>did not recommend it</b>}. {preset.kind === "mistake" ? "The words read as happy, but the box says otherwise: labels in real data are not always consistent." : null}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-5 rounded-2xl bg-white p-5 sm:p-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Tone</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-[2.6rem] leading-none font-semibold tracking-[-0.045em]">{verdict}</span>
          </div>
          <p className="mt-2 text-[13px] text-ink-2/75">{(p * 100).toFixed(0)}% chance this reviewer would not recommend the item</p>
          <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-[#2a78d6]/30 via-ink/10 to-[#eb6834]/40">
            <motion.span className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-[3px] border-ink bg-white shadow" initial={false} animate={{ left: pc(p * 100) }} transition={{ type: "spring", stiffness: 170, damping: 22 }} />
          </div>
        </div>

        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Themes in this review</p>
          {total === 0 ? (
            <p className="mt-3 text-[13px] text-muted">No theme words recognised yet. Try mentioning size, fabric, colour, comfort, length…</p>
          ) : (
            <>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full">
                {order
                  .filter((k) => shares[k] > 0.005)
                  .map((k) => (
                    <motion.span key={k} className="h-full" style={{ background: THEME_COLORS[k] }} initial={false} animate={{ width: pc(shares[k] * 100) }} title={`${THEMES[k]} ${(shares[k] * 100).toFixed(0)}%`} />
                  ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {order.slice(0, 4).map((k) =>
                  shares[k] > 0.005 ? (
                    <li key={k} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: THEME_COLORS[k] }} />
                        {THEMES[k]}
                      </span>
                      <span className="font-mono">{(shares[k] * 100).toFixed(0)}%</span>
                    </li>
                  ) : null,
                )}
              </ul>
              <p className="mt-3 text-[11.5px] text-muted">
                Theme words found: {mix.words.slice(0, 12).join(", ")}
                {mix.words.length > 12 ? "…" : ""}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
