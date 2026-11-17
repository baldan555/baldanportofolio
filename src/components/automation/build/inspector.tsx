"use client";

import { useEffect, useState } from "react";
import { CITIES } from "@/lib/workflow/engine";

/*
 * Tool calling, turn by turn, in the exact JSON of three APIs: the OpenAI-compatible format (used by OpenRouter and
 * many others), Anthropic's Messages API and Google's Gemini API. The tools really run: exchange rates from the ECB
 * (via Frankfurter) and forecasts from Open-Meteo, fetched by your browser. The model's replies are written from
 * those real results, as stand-ins until the live demo is connected; the shapes are what the real APIs use.
 */
type Provider = "openai" | "anthropic" | "gemini";
type Call = { id: string; name: "get_fx_rate" | "get_weather"; args: Record<string, string | number> };
type Ask = { id: string; q: string; calls: Call[]; intro: string; answer: (r: Record<string, unknown>[]) => string };
const SYS = "You answer questions about exchange rates and the weather in Indonesian cities. Use the tools; never guess numbers.";
const CITY_NAMES = Object.keys(CITIES);
const TOOLS = [
  {
    name: "get_fx_rate",
    description: "Today's European Central Bank reference rate between two currencies. Returns { base, target, rate, date }.",
    parameters: { type: "object", properties: { base: { type: "string", description: "ISO 4217 code to convert from, e.g. USD" }, target: { type: "string", description: "ISO 4217 code to convert to, e.g. IDR" } }, required: ["base", "target"] },
  },
  {
    name: "get_weather",
    description: "Current temperature and the highest rain chance over the next 6 hours for one city. Returns { city, temp_now, rain_chance_next_6h }.",
    parameters: { type: "object", properties: { city: { type: "string", enum: CITY_NAMES, description: "One of the supported cities" } }, required: ["city"] },
  },
];
const n0 = (v: number) => Math.round(v).toLocaleString("en-US");
const ASKS: Ask[] = [
  {
    id: "fx",
    q: "What's 250 US dollars in rupiah today?",
    calls: [{ id: "1", name: "get_fx_rate", args: { base: "USD", target: "IDR" } }],
    intro: "I'll check today's rate.",
    answer: ([r]) => `250 US dollars is about Rp ${n0(250 * Number(r.rate))} at today's ECB reference rate (Rp ${n0(Number(r.rate))} per dollar, published ${r.date}).`,
  },
  {
    id: "rain",
    q: "Should the drivers in Makassar pack rain covers this afternoon?",
    calls: [{ id: "1", name: "get_weather", args: { city: "Makassar" } }],
    intro: "Let me look at the forecast for Makassar.",
    answer: ([r]) => (Number(r.rain_chance_next_6h) >= 40 ? `Yes: there's up to a ${r.rain_chance_next_6h}% chance of rain in Makassar over the next 6 hours. It's ${r.temp_now}°C now.` : `Probably not needed: the rain chance in Makassar stays at or below ${r.rain_chance_next_6h}% over the next 6 hours. It's ${r.temp_now}°C now.`),
  },
  {
    id: "both",
    q: "Compare the weather in Jakarta and Medan right now.",
    calls: [
      { id: "1", name: "get_weather", args: { city: "Jakarta" } },
      { id: "2", name: "get_weather", args: { city: "Medan" } },
    ],
    intro: "I'll check both cities at once.",
    answer: (rs) => rs.map((r) => `${r.city}: ${r.temp_now}°C now, up to ${r.rain_chance_next_6h}% chance of rain in the next 6 hours.`).join(" "),
  },
];

async function runTool(c: Call): Promise<{ url: string; result: Record<string, unknown> }> {
  if (c.name === "get_fx_rate") {
    const url = `https://api.frankfurter.dev/v1/latest?base=${c.args.base}&symbols=${c.args.target}`;
    const j = (await (await fetch(url)).json()) as { date: string; rates: Record<string, number> };
    return { url, result: { base: c.args.base, target: c.args.target, rate: j.rates[String(c.args.target)], date: j.date } };
  }
  const [lat, lon] = CITIES[String(c.args.city)];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&current=temperature_2m&forecast_days=2&timezone=Asia%2FJakarta`;
  const j = (await (await fetch(url)).json()) as { current: { time: string; temperature_2m: number }; hourly: { time: string[]; precipitation_probability: (number | null)[] } };
  const start = Math.max(0, j.hourly.time.findIndex((t) => t >= j.current.time.slice(0, 13)));
  const rain = Math.max(0, ...j.hourly.precipitation_probability.slice(start, start + 6).map((v) => v ?? 0));
  return { url, result: { city: c.args.city, temp_now: j.current.temperature_2m, rain_chance_next_6h: rain } };
}

/* ------------------------------------------------------------------ the three formats */
function build(p: Provider, a: Ask, results: Record<string, unknown>[] | null) {
  const answer = results ? a.answer(results) : "…";
  const res = (i: number) => (results ? results[i] : { pending: "run the tool first" });
  if (p === "openai") {
    const tools = TOOLS.map((t) => ({ type: "function", function: t }));
    const base = [
      { role: "system", content: SYS },
      { role: "user", content: a.q },
    ];
    const assistant = { role: "assistant", content: null, tool_calls: a.calls.map((c) => ({ id: `call_${c.id}`, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args) } })) };
    return {
      endpoint: "POST https://openrouter.ai/api/v1/chat/completions\nAuthorization: Bearer $OPENROUTER_API_KEY",
      req1: { model: "MODEL", messages: base, tools, tool_choice: "auto" },
      res1: { id: "gen-…", object: "chat.completion", model: "MODEL", choices: [{ index: 0, finish_reason: "tool_calls", message: assistant }] },
      req2: { model: "MODEL", messages: [...base, assistant, ...a.calls.map((c, i) => ({ role: "tool", tool_call_id: `call_${c.id}`, content: JSON.stringify(res(i)) }))], tools },
      res2: { id: "gen-…", object: "chat.completion", model: "MODEL", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: answer } }] },
    };
  }
  if (p === "anthropic") {
    const tools = TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
    const content = [{ type: "text", text: a.intro }, ...a.calls.map((c) => ({ type: "tool_use", id: `toolu_0${c.id}`, name: c.name, input: c.args }))];
    return {
      endpoint: "POST https://api.anthropic.com/v1/messages\nx-api-key: $ANTHROPIC_API_KEY\nanthropic-version: 2023-06-01",
      req1: { model: "MODEL", max_tokens: 1024, system: SYS, tools, messages: [{ role: "user", content: a.q }] },
      res1: { id: "msg_…", type: "message", role: "assistant", model: "MODEL", content, stop_reason: "tool_use" },
      req2: { model: "MODEL", max_tokens: 1024, system: SYS, tools, messages: [{ role: "user", content: a.q }, { role: "assistant", content }, { role: "user", content: a.calls.map((c, i) => ({ type: "tool_result", tool_use_id: `toolu_0${c.id}`, content: JSON.stringify(res(i)) })) }] },
      res2: { id: "msg_…", type: "message", role: "assistant", model: "MODEL", content: [{ type: "text", text: answer }], stop_reason: "end_turn" },
    };
  }
  const tools = [{ functionDeclarations: TOOLS }];
  const model = { role: "model", parts: a.calls.map((c) => ({ functionCall: { name: c.name, args: c.args } })) };
  return {
    endpoint: "POST https://generativelanguage.googleapis.com/v1beta/models/MODEL:generateContent\nx-goog-api-key: $GEMINI_API_KEY",
    req1: { systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: "user", parts: [{ text: a.q }] }], tools },
    res1: { candidates: [{ content: model, finishReason: "STOP" }] },
    req2: { systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: "user", parts: [{ text: a.q }] }, model, { role: "user", parts: a.calls.map((c, i) => ({ functionResponse: { name: c.name, response: res(i) } })) }], tools },
    res2: { candidates: [{ content: { role: "model", parts: [{ text: answer }] }, finishReason: "STOP" }] },
  };
}
const STEPS = [
  { t: "You send the question and the tools", d: "Instructions, the user's question, and a description of each tool as JSON Schema. The model hasn't done anything yet." },
  { t: "The model asks for a tool", d: "Instead of answering, it replies with a structured request: which tool, with which arguments. It can't run anything itself." },
  { t: "Your code runs the tool", d: "This is ordinary code: here, a real call from your browser to a public API. Validate the arguments first; never trust them blindly." },
  { t: "You send the result back", d: "The whole conversation again, plus the model's request and the tool's result, linked by an id." },
  { t: "The model answers", d: "With real numbers to work from, it writes the answer, or asks for another tool and the loop goes round again." },
];
const LABEL: Record<Provider, string> = { openai: "OpenAI-compatible (OpenRouter)", anthropic: "Anthropic Messages", gemini: "Google Gemini" };

export function Inspector() {
  const [p, setP] = useState<Provider>("openai");
  const [askId, setAskId] = useState(ASKS[0].id);
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null);
  const [calls, setCalls] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const a = ASKS.find((x) => x.id === askId) ?? ASKS[0];
  useEffect(() => {
    if (step < 2 || results || err) return;
    let alive = true;
    Promise.all(a.calls.map(runTool))
      .then((rs) => {
        if (!alive) return;
        setResults(rs.map((r) => r.result));
        setCalls(rs.map((r) => r.url));
      })
      .catch(() => alive && setErr("The public API didn't answer just now. Try again in a moment."));
    return () => {
      alive = false;
    };
  }, [step, results, err, a]);
  const pick = (id: string) => {
    setAskId(id);
    setStep(0);
    setResults(null);
    setCalls([]);
    setErr(null);
  };
  const b = build(p, a, results);
  const body = step === 0 ? b.req1 : step === 1 ? b.res1 : step === 2 ? (results ? results.map((r, i) => ({ call: calls[i], result: r })) : { status: err ?? "calling the real API…" }) : step === 3 ? b.req2 : b.res2;
  const head = step === 0 || step === 3 ? b.endpoint : step === 2 ? `${a.calls.length > 1 ? `${a.calls.length} calls, run at the same time` : "1 call"} from your browser` : "200 OK · application/json";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ASKS.map((x) => (
          <button key={x.id} type="button" aria-pressed={x.id === askId} onClick={() => pick(x.id)} className={`rounded-2xl px-3.5 py-2 text-left text-[12.5px] transition ${x.id === askId ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}>
            “{x.q}”
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] font-semibold">Format</span>
        {(Object.keys(LABEL) as Provider[]).map((k) => (
          <button key={k} type="button" aria-pressed={p === k} onClick={() => setP(k)} className={`rounded-full px-3 py-1.5 text-[12px] transition ${p === k ? "bg-[#eb6834] text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}>
            {LABEL[k]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <ol className="space-y-1.5">
          {STEPS.map((s, i) => (
            <li key={s.t}>
              <button type="button" onClick={() => setStep(i)} className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${i === step ? "border-ink bg-ink text-white" : i < step ? "border-line bg-white" : "border-line bg-white/60 text-ink/60 hover:border-ink/40"}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold ${i === step ? "bg-[#eb6834] text-white" : i < step ? "bg-[#eaf8f1] text-[#0f6e4c]" : "bg-cream text-ink/50"}`}>{i < step ? "✓" : i + 1}</span>
                <span>
                  <span className="block text-[13.5px] font-semibold">{s.t}</span>
                  <span className={`mt-0.5 block text-[12px] leading-snug ${i === step ? "text-white/70" : "text-ink-2/60"}`}>{s.d}</span>
                </span>
              </button>
            </li>
          ))}
          <li className="flex gap-2 pt-1">
            <button type="button" disabled={step === 0} onClick={() => setStep((x) => Math.max(0, x - 1))} className="rounded-full px-3 py-1.5 text-[12.5px] ring-1 ring-line disabled:opacity-30">
              ← Back
            </button>
            <button type="button" disabled={step === STEPS.length - 1} onClick={() => setStep((x) => Math.min(STEPS.length - 1, x + 1))} className="rounded-full bg-[#eb6834] px-4 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40">
              Next step →
            </button>
          </li>
        </ol>
        <div className="min-w-0 overflow-hidden rounded-[22px] bg-ink">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
            <pre className="min-w-0 truncate font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-white/60">{head}</pre>
            <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${step === 1 || step === 4 ? "bg-[#1baf7a]" : step === 2 ? "bg-[#2a78d6]" : "bg-[#eb6834]"} text-white`}>{step === 1 || step === 4 ? "response" : step === 2 ? "your code" : "request"}</span>
          </div>
          <pre data-lenis-prevent className="max-h-[520px] overflow-auto p-4 font-mono text-[11.5px] leading-relaxed text-white/90">{JSON.stringify(body, null, 2)}</pre>
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">The tool calls in step 3 are real (Frankfurter for ECB rates, Open-Meteo for forecasts). The model&apos;s replies are written from those real results to show the exact shapes; real responses also carry token usage. MODEL stands for whichever model you choose. The live, model-driven version is the Prompt → automation page.</p>
    </div>
  );
}
