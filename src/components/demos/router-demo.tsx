"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/complaint-router.json";
import { createRouter, type RouterModel } from "@/lib/text-router";
import { pc, Slider } from "./controls";

export type QuerySample = (typeof model.samples)[number];

export const TEAM_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const TEAMS = model.teams.map((t) => t.name);
export const LABELS = model.labels;
export const teamOf = (intent: number) => model.model.team[intent];

const predict = createRouter(model.model as RouterModel);

/** Written for the demo, not taken from the dataset. The last one is misspelled on purpose. */
const EXAMPLES = [
  "I ordered my card two weeks ago and it still hasn't arrived",
  "The ATM kept my card, what should I do?",
  "Why was I charged twice for the same coffee?",
  "How long does a transfer to Germany usually take?",
  "My top up from my credit card failed",
  "I'd like to close my account for good",
  "my cash withdrawl was declined",
];

/** Type a customer message; the model routes it to a team, shows its top intents and which words decided it. */
export function RouterDemo({ preset }: { preset?: QuerySample | null }) {
  const [text, setText] = useState(preset?.text ?? EXAMPLES[0]);
  const [threshold, setThreshold] = useState(0.6);
  const out = useMemo(() => (text.trim() ? predict(text) : null), [text]);

  const best = out?.order[0] ?? 0;
  const p = out ? out.probs[best] : 0;
  const team = teamOf(best);
  const auto = p >= threshold;
  const at = model.confidence.reduce((acc, c) => (c.t <= threshold + 1e-9 ? c : acc), model.confidence[0]);
  const shown = text.split(/\s+/).filter(Boolean);
  const maxW = out ? Math.max(1e-6, ...out.words.map((w) => Math.abs(w.weight))) : 1;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- input ---------- */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 sm:p-6">
        <label className="block">
          <span className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Customer message</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder="Type a banking question or complaint…"
            className="mt-2 w-full resize-none rounded-xl border border-ink/10 bg-white px-3.5 py-3 text-[15px] leading-relaxed outline-none focus:border-ink/40"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              className={`rounded-full border px-2.5 py-1 text-left text-[12px] transition-colors ${text === ex ? "border-ink bg-ink text-white" : "border-ink/10 hover:border-ink/40 hover:bg-cream/60"}`}
            >
              {ex}
            </button>
          ))}
        </div>

        {out && (
          <div className="border-t border-line pt-4">
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">What the model read</p>
            <p className="mt-2 text-[16px] leading-[2.1]">
              {shown.map((w, i) => {
                const wt = out.words[i]?.weight ?? 0;
                const a = Math.min(1, Math.abs(wt) / maxW);
                return (
                  <span key={i}>
                    <span
                      className="rounded-md px-1 py-0.5 transition-colors"
                      style={{ background: wt >= 0 ? `rgba(42,120,214,${(a * 0.45).toFixed(3)})` : `rgba(235,104,52,${(a * 0.45).toFixed(3)})` }}
                      title={`${wt >= 0 ? "+" : ""}${wt.toFixed(3)}`}
                    >
                      {w}
                    </span>{" "}
                  </span>
                );
              })}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-2/70">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(42,120,214,0.45)" }} /> points to “{LABELS[best]}”
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(235,104,52,0.45)" }} /> points elsewhere
              </span>
              <span className="text-muted">
                {out.known}/{out.grams} letter chunks known to the model
              </span>
            </div>
          </div>
        )}

        {preset && (
          <p className="rounded-xl bg-cream px-3.5 py-2.5 text-[12.5px]">
            Labelled in the dataset as <b>{LABELS[preset.actual]}</b> ({TEAMS[teamOf(preset.actual)]}).{" "}
            {preset.text === text ? (
              best === preset.actual ? (
                "The model agrees."
              ) : teamOf(best) === teamOf(preset.actual) ? (
                "Different intent, but the same team: it still lands on the right desk."
              ) : (
                "The model sends it to a different team."
              )
            ) : (
              <span className="text-muted">You edited the text.</span>
            )}
          </p>
        )}
      </div>

      {/* ---------- output ---------- */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 sm:p-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Route to</p>
          {/* keyed so a new team fades in; no exit animation, so the heading never lags behind the result */}
          <motion.div key={out ? team : "none"} initial={{ opacity: 0.3, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-2 flex items-center gap-3">
            <span className="h-9 w-2 rounded-full" style={{ background: out ? TEAM_COLORS[team] : "#ddd" }} />
            <span className="text-[2.1rem] leading-none font-semibold tracking-[-0.04em]">{out ? TEAMS[team] : "—"}</span>
          </motion.div>
          {out && (
            <p className="mt-2 text-[13px] text-ink-2/75">
              Intent: <b>{LABELS[best]}</b> · {(p * 100).toFixed(0)}% sure
            </p>
          )}
        </div>

        {out && (
          <div className="space-y-2">
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Top 3 intents</p>
            {out.order.slice(0, 3).map((k) => (
              <div key={k}>
                <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="truncate">
                    {LABELS[k]} <span className="text-muted">· {TEAMS[teamOf(k)]}</span>
                  </span>
                  <span className="font-mono">{(out.probs[k] * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8">
                  <motion.div className="h-full rounded-full" style={{ background: TEAM_COLORS[teamOf(k)] }} initial={false} animate={{ width: pc(out.probs[k] * 100) }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto rounded-xl bg-cream/70 p-4">
          <Slider label="Auto-route when the model is at least" value={Math.round(threshold * 100)} min={30} max={95} step={5} onChange={(v) => setThreshold(v / 100)} unit="%" />
          <p className="mt-3 text-[13px]">
            {out ? (
              auto ? (
                <>
                  <b>Auto-routed</b> to {TEAMS[team]}.
                </>
              ) : (
                <>
                  <b>Sent to a human</b> for triage: the model isn&apos;t sure enough.
                </>
              )
            ) : (
              "Type something to route it."
            )}
          </p>
          <p className="mt-1 text-[12px] text-ink-2/70">
            On the test set at this setting, {(at.coverage * 100).toFixed(0)}% of messages are auto-routed and {(at.team_acc * 100).toFixed(1)}% of those reach the right team.
          </p>
        </div>
      </div>
    </div>
  );
}
