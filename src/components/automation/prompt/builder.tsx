"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { Workflow } from "@/lib/workflow/engine";
import { EXAMPLES, validateWorkflow } from "@/lib/workflow/ai";
import { WorkflowLab } from "../lab/workflow-lab";

/*
 * Prompt → automation. The visitor describes a task; this site's server route asks a model on OpenRouter to write a
 * Workflow (one forced tool call), validates it, and the page opens it in the Workflow lab, where it runs for real on
 * public data with simulated messages. When live generation is off, five ready examples show the same result.
 */
type Model = { id: string; name: string; inM: number | null; outM: number | null };
type Info = { configured: boolean; models: Model[]; limits: { perHour: number; maxPrompt: number } };
type Result = { workflow: Workflow; explanation: string; warnings: string[]; model?: string; usage?: { prompt_tokens: number | null; completion_tokens: number | null }; cost?: number | null; ms?: number; raw?: string; example: boolean };
const clock = () => performance.now();
const usd = (v: number) => (v < 0.001 ? `$${v.toFixed(5)}` : `$${v.toFixed(4)}`);

function message(j: { error?: string; retryAfter?: number; status?: number; detail?: string; maxPrompt?: number }, perHour: number) {
  switch (j.error) {
    case "rate_limited":
      return `You've used this hour's ${perHour} generations. Try again in about ${Math.max(1, Math.ceil((j.retryAfter ?? 60) / 60))} min, or try the examples.`;
    case "bad_prompt":
      return `Describe the task in 5 to ${j.maxPrompt ?? 400} characters.`;
    case "timeout":
      return "The model took too long to answer. Please try again.";
    case "bad_workflow":
      return `The model's answer couldn't be turned into a workflow (${j.detail}). Try describing it differently.`;
    case "model_error":
      return `The model provider returned an error${j.status ? ` (${j.status})` : ""}. ${j.detail ?? ""}`.trim();
    case "not_configured":
      return "Live generation isn't switched on on this site yet. The examples below show what it produces.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function PromptBuilder() {
  const [info, setInfo] = useState<Info | "error" | null>(null);
  const [prompt, setPrompt] = useState(EXAMPLES[0].prompt);
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [gen, setGen] = useState(0);
  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/automation/plan", { signal: ctl.signal })
      .then((r) => r.json())
      .then((j: Info) => {
        setInfo(j);
        if (j.models[0]) setModel(j.models[0].id);
        if (!j.configured) {
          // example mode: open the first example straight away
          const v = validateWorkflow(EXAMPLES[0].raw);
          if (v.ok) {
            setResult({ workflow: v.workflow, explanation: EXAMPLES[0].explanation, warnings: v.warnings, example: true });
            setGen((g) => g + 1);
          }
        }
      })
      .catch((e: Error) => e.name !== "AbortError" && setInfo("error"));
    return () => ctl.abort();
  }, []);
  useEffect(() => {
    if (!busy) return;
    const t0 = clock();
    const id = window.setInterval(() => setSecs(Math.round((clock() - t0) / 100) / 10), 100);
    return () => window.clearInterval(id);
  }, [busy]);
  const live = info && info !== "error" && info.configured;
  const perHour = info && info !== "error" ? info.limits.perHour : 8;
  const maxPrompt = info && info !== "error" ? info.limits.maxPrompt : 400;
  const showExample = (i: number) => {
    const ex = EXAMPLES[i];
    setPrompt(ex.prompt);
    setErr(null);
    if (live) return;
    const v = validateWorkflow(ex.raw);
    if (v.ok) {
      setResult({ workflow: v.workflow, explanation: ex.explanation, warnings: v.warnings, example: true });
      setGen((g) => g + 1);
    }
  };
  const go = async () => {
    setBusy(true);
    setErr(null);
    setSecs(0);
    try {
      const r = await fetch("/api/automation/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, model }) });
      const j = await r.json();
      if (!r.ok) {
        setErr(message(j, perHour));
        if (j.error === "not_configured") setInfo((x) => (x && x !== "error" ? { ...x, configured: false } : x));
      } else {
        setResult({ ...(j as Omit<Result, "example">), example: false });
        setGen((g) => g + 1);
      }
    } catch {
      setErr("The request didn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  const m = info && info !== "error" ? info.models.find((x) => x.id === (result?.model ?? model)) : undefined;
  return (
    <div className="space-y-4">
      <div className="rounded-[26px] bg-ink p-4 text-white sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold">
            <span className="h-2 w-2 rounded-full" style={{ background: info == null ? "rgba(255,255,255,0.35)" : live ? "#1baf7a" : "#e0b400" }} />
            {info == null ? "Checking…" : live ? "Live: a real model writes the workflow" : "Example mode: live generation is off"}
          </span>
          {live && info.models.length > 0 && (
            <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model" className="ml-auto max-w-full rounded-lg bg-white/10 px-2 py-1 text-[12px] text-white outline-none">
              {info.models.map((x) => (
                <option key={x.id} value={x.id} className="text-ink">
                  {x.name}
                  {x.inM != null ? ` · $${x.inM} / $${x.outM} per 1M tokens` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-white/80">Describe a task you&apos;d like automated</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, maxPrompt))}
            rows={3}
            readOnly={!live}
            placeholder="Every morning at 7, check… If…, send…"
            className="mt-2 w-full rounded-2xl bg-white/[0.08] px-4 py-3 text-[15px] leading-snug text-white outline-none placeholder:text-white/35 focus:bg-white/[0.12]"
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-white/40">
            {prompt.length}/{maxPrompt}
          </span>
          {live ? (
            <button type="button" onClick={go} disabled={busy || prompt.trim().length < 5} className="ml-auto flex items-center gap-2 rounded-full bg-[#eb6834] px-5 py-2 text-[13.5px] font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? `Writing the workflow… ${secs.toFixed(1)} s` : "Build the automation"}
            </button>
          ) : (
            <span className="ml-auto text-[12px] text-white/55">Pick an example below to see the result.</span>
          )}
        </div>
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-[11.5px] text-white/50">{live ? "Or start from an example:" : "Examples:"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex, i) => (
              <button key={ex.prompt} type="button" onClick={() => showExample(i)} className={`rounded-full px-3 py-1.5 text-left text-[12px] transition ${prompt === ex.prompt ? "bg-white text-ink" : "bg-white/[0.08] text-white/75 hover:text-white"}`}>
                {ex.prompt.length > 60 ? `${ex.prompt.slice(0, 58)}…` : ex.prompt}
              </button>
            ))}
          </div>
        </div>
        {err && <p className="mt-3 rounded-xl bg-[#c8413f]/20 px-3 py-2 text-[13px] text-[#ffc9bd]">{err}</p>}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="rounded-[22px] border border-line bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase" style={{ background: result.example ? "#fbf5dd" : "#eaf8f1", color: result.example ? "#8a6d00" : "#0f6e4c" }}>
                {result.example ? "example, not generated live" : "generated just now"}
              </span>
              {!result.example && (
                <span className="font-mono text-[11px] text-ink-2/55">
                  {m?.name ?? result.model} · {result.usage?.prompt_tokens ?? "?"} in / {result.usage?.completion_tokens ?? "?"} out tokens{result.cost != null ? ` · ${usd(result.cost)}` : ""} · {((result.ms ?? 0) / 1000).toFixed(1)} s
                </span>
              )}
            </div>
            <p className="mt-2 text-[1.15rem] leading-snug font-semibold tracking-[-0.01em]">{result.explanation || result.workflow.name}</p>
            {result.warnings.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {result.warnings.map((w) => (
                  <li key={w} className="text-[12px] text-[#8a6d00]">
                    ⚠ {w}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[12.5px] text-ink-2/60">Below is the workflow it built: press Run workflow to run it for real, or edit any step first.</p>
          </div>
          <WorkflowLab key={gen} initial={result.workflow} />
          {result.raw && (
            <details className="rounded-[18px] border border-line bg-white p-3">
              <summary className="cursor-pointer text-[12.5px] font-semibold">The model&apos;s raw answer (the create_workflow tool call)</summary>
              <pre className="mt-2 max-h-[360px] overflow-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-white/85">{result.raw}</pre>
            </details>
          )}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Your key stays private", "The model is called from this site's server; the API key is never sent to the browser."],
            ["Limited and checked", `Prompts up to ${maxPrompt} characters, a few generations per visitor per hour (${perHour}), and a cap on tokens per answer.`],
            ["Only known steps", "The model can only use the engine's step types; everything it returns is validated before it reaches the page."],
            ["Nothing is really sent", "Data comes from public APIs; messages, sheet rows and business systems are simulated."],
          ] as const
        ).map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-line bg-white p-3.5">
            <p className="text-[13.5px] font-semibold">{t}</p>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-2/65">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
