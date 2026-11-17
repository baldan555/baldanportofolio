"use client";

import { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";

/* A checker for tool definitions: paste or edit one, and it's reviewed against the habits that make models pick the
 * right tool with the right arguments. Plain rules, run in the browser. */
const PRESETS: [string, string][] = [
  [
    "Weak",
    JSON.stringify(
      {
        name: "orders",
        description: "Orders tool",
        parameters: { type: "object", properties: { d: { type: "string" }, s: { type: "string" }, mode: { type: "string", description: "either summary or full" } } },
      },
      null,
      2,
    ),
  ],
  [
    "Strong",
    JSON.stringify(
      {
        name: "get_orders",
        description: "Lists the orders placed on one day, optionally for one store. Use it for any question about sales or orders on a specific date. Returns an array of { order_id, store, total_idr }.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "The day, as YYYY-MM-DD" },
            store: { type: "string", description: "Store name; leave out for all stores" },
            detail: { type: "string", enum: ["summary", "full"], description: "summary = totals per store, full = every order" },
          },
          required: ["date"],
        },
      },
      null,
      2,
    ),
  ],
  [
    "Risky",
    JSON.stringify(
      {
        name: "issue_refund",
        description: "Refunds an order to the customer's original payment method. Use only after checking the order. Returns { refund_id, amount_idr }.",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The order to refund, such as A-1042" },
            amount_idr: { type: "number", description: "Amount in rupiah; at most the order total" },
          },
          required: ["order_id", "amount_idr"],
        },
      },
      null,
      2,
    ),
  ],
];
const VERBS = ["get", "list", "search", "find", "create", "add", "update", "set", "delete", "remove", "send", "check", "calculate", "run", "book", "cancel", "issue", "refund", "fetch", "lookup", "post", "read", "write"];
const RISKY = ["delete", "remove", "refund", "issue", "send", "pay", "transfer", "cancel", "post", "write"];
type Check = { ok: boolean | "warn"; text: string; tip?: string };
type Prop = { type?: unknown; description?: unknown; enum?: unknown };

function review(src: string): Check[] | string {
  let t: Record<string, unknown>;
  try {
    t = JSON.parse(src) as Record<string, unknown>;
  } catch (e) {
    return `Not valid JSON: ${(e as Error).message}`;
  }
  if (t.type === "function" && t.function && typeof t.function === "object") t = t.function as Record<string, unknown>;
  const out: Check[] = [];
  const name = String(t.name ?? "");
  const desc = String(t.description ?? "");
  const params = (t.parameters ?? t.input_schema ?? t.inputSchema) as { type?: string; properties?: Record<string, Prop>; required?: unknown } | undefined;
  const props = params?.properties ?? {};
  const keys = Object.keys(props);
  const required = Array.isArray(params?.required) ? (params?.required as string[]) : [];
  out.push(/^[a-z][a-z0-9_]{2,63}$/.test(name) ? { ok: true, text: `Name “${name}” is snake_case` } : { ok: false, text: "Name should be snake_case, 3–64 characters", tip: "Models and APIs expect names like get_orders." });
  out.push(VERBS.some((v) => name.startsWith(`${v}_`) || name === v) ? { ok: true, text: "Name starts with a verb" } : { ok: "warn", text: "Name doesn't say what it does", tip: "verb_noun reads like an action: get_orders, send_message." });
  out.push(desc.length >= 60 ? { ok: true, text: "Description is specific" } : { ok: false, text: `Description is too short (${desc.length} characters)`, tip: "Say what it does, when to use it, and what it returns. This is what the model reads to choose." });
  out.push(/\breturns?\b/i.test(desc) ? { ok: true, text: "Description says what comes back" } : { ok: "warn", text: "Description doesn't say what it returns", tip: "Knowing the result's shape helps the model plan the next step." });
  out.push(/\buse (it|this|only)\b|\bwhen\b/i.test(desc) ? { ok: true, text: "Description says when to use it" } : { ok: "warn", text: "Description doesn't say when to use it", tip: "“Use it for…” stops the model choosing the wrong tool." });
  out.push(params?.type === "object" ? { ok: true, text: "Parameters are a JSON Schema object" } : { ok: false, text: "Parameters should be { \"type\": \"object\", \"properties\": … }" });
  const undocumented = keys.filter((k) => typeof props[k].type !== "string" || typeof props[k].description !== "string" || String(props[k].description).length < 8);
  out.push(keys.length && !undocumented.length ? { ok: true, text: "Every parameter has a type and a description" } : { ok: false, text: keys.length ? `Missing type or description: ${undocumented.join(", ")}` : "No parameters described", tip: "Names like “d” or “s” mean nothing to a model; describe each one." });
  const short = keys.filter((k) => k.length < 3);
  if (short.length) out.push({ ok: "warn", text: `Cryptic parameter names: ${short.join(", ")}`, tip: "Use full words: date, store." });
  const choice = keys.filter((k) => !Array.isArray(props[k].enum) && /\b(either|one of|or)\b/i.test(String(props[k].description ?? "")));
  out.push(choice.length ? { ok: "warn", text: `Fixed choices without an enum: ${choice.join(", ")}`, tip: "An enum makes the allowed values explicit, and checkable." } : { ok: true, text: "Fixed choices use enums (or there are none)" });
  const dates = keys.filter((k) => /date|day|time/i.test(k) && !/YYYY|ISO|format/i.test(String(props[k].description ?? "")));
  if (dates.length) out.push({ ok: "warn", text: `Date fields without a format: ${dates.join(", ")}`, tip: "Say YYYY-MM-DD, or the model will guess." });
  const missing = required.filter((r) => !keys.includes(r));
  out.push(required.length && !missing.length ? { ok: true, text: `Required fields listed: ${required.join(", ")}` } : { ok: missing.length ? false : "warn", text: missing.length ? `Required but not defined: ${missing.join(", ")}` : "No required fields listed", tip: "Mark what must be given, so a call without it fails clearly." });
  out.push(keys.length <= 6 ? { ok: true, text: `${keys.length} parameter${keys.length === 1 ? "" : "s"}: easy to fill` } : { ok: "warn", text: `${keys.length} parameters: consider splitting the tool` });
  if (RISKY.some((v) => name.startsWith(`${v}_`) || name === v)) out.push({ ok: "warn", text: "This tool changes things in the real world", tip: "Enforce limits inside the tool's code (not only the prompt), log every call, and put a human approval in front of it." });
  return out;
}

export function ToolLint() {
  const [src, setSrc] = useState(PRESETS[0][1]);
  const r = review(src);
  const score = typeof r === "string" ? 0 : r.filter((c) => c.ok === true).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] font-semibold">Start from</span>
        {PRESETS.map(([label, text]) => (
          <button key={label} type="button" aria-pressed={src === text} onClick={() => setSrc(text)} className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${src === text ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="text-[12px] font-semibold">A tool definition (edit it)</span>
          <textarea value={src} onChange={(e) => setSrc(e.target.value)} spellCheck={false} rows={18} className="mt-1.5 w-full rounded-[18px] border border-line bg-ink p-4 font-mono text-[11.5px] leading-relaxed text-white/90 outline-none focus:border-[#eb6834]" />
        </label>
        <div className="flex flex-col rounded-[22px] border border-line bg-white p-4">
          {typeof r === "string" ? (
            <p className="rounded-xl bg-[#fdf0ee] px-3 py-2 text-[13px] text-[#a3302e]">{r}</p>
          ) : (
            <>
              <p className="text-[12px] font-semibold text-ink-2/60">Review</p>
              <p className="text-[1.6rem] leading-tight font-semibold tabular-nums">
                {score} <span className="text-[14px] font-normal text-ink-2/50">of {r.length} checks pass</span>
              </p>
              <ul className="mt-2 space-y-1.5">
                {r.map((c) => (
                  <li key={c.text} className="flex gap-2 text-[12.5px] leading-snug">
                    {c.ok === true ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1baf7a]" /> : c.ok === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#c29a00]" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-[#c8413f]" />}
                    <span>
                      {c.text}
                      {c.tip && c.ok !== true && <span className="block text-[11.5px] text-ink-2/55">{c.tip}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">Accepts the plain form, the OpenAI-style {"{ type: \"function\", function: … }"} wrapper, Anthropic&apos;s input_schema or MCP&apos;s inputSchema. Simple rules in your browser; the model&apos;s real test is your evaluation set.</p>
    </div>
  );
}
