import { connection } from "next/server";
import { openRouterModels } from "@/lib/openrouter-models";
import { CREATE_WORKFLOW_TOOL, buildSystemPrompt, extractJson, validateWorkflow } from "@/lib/workflow/ai";

/*
 * Prompt → automation: turns a visitor's description into a Workflow by asking a model on OpenRouter to call one tool.
 * The key never leaves the server. Configuration (environment variables):
 *   OPENROUTER_API_KEY         required; set a credit limit on the key in OpenRouter too
 *   OPENROUTER_MODEL           required; the default model id, e.g. a tool-capable model from openrouter.ai/models
 *   OPENROUTER_ALLOWED_MODELS  optional; comma-separated extra model ids visitors may pick
 *   AUTOMATION_PER_HOUR        optional; requests per visitor per hour (default 8)
 *   AUTOMATION_PER_DAY         optional; requests per server instance per day (default 200)
 * The limits are kept in memory, per server instance: a first line of defence. The key's own credit limit is the real cap.
 */
const MAX_PROMPT = 400;
const PER_HOUR = Math.max(1, Number(process.env.AUTOMATION_PER_HOUR) || 8);
const PER_DAY = Math.max(1, Number(process.env.AUTOMATION_PER_DAY) || 200);
const hits = new Map<string, number[]>();
let day = "";
let dayCount = 0;

function allowedModels(): string[] {
  const extra = (process.env.OPENROUTER_ALLOWED_MODELS ?? "").split(",").map((s) => s.trim());
  return [...new Set([process.env.OPENROUTER_MODEL?.trim(), ...extra].filter((x): x is string => !!x))];
}
function take(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    dayCount = 0;
    hits.clear();
  }
  if (dayCount >= PER_DAY) return { ok: false, retryAfter: Math.ceil((Date.parse(`${today}T00:00:00Z`) + 864e5 - now) / 1000) };
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 36e5);
  if (recent.length >= PER_HOUR) return { ok: false, retryAfter: Math.ceil((recent[0] + 36e5 - now) / 1000) };
  recent.push(now);
  hits.set(ip, recent);
  dayCount += 1;
  return { ok: true };
}

/** Whether live generation is switched on, which models visitors may pick (with live prices), and the limits. */
export async function GET() {
  await connection(); // read the environment at request time, not at build time
  const ids = allowedModels();
  let prices: Awaited<ReturnType<typeof openRouterModels>> = [];
  try {
    prices = await openRouterModels();
  } catch {
    // prices are a nice-to-have
  }
  const models = ids.map((id) => {
    const m = prices.find((x) => x.id === id);
    return { id, name: m?.name ?? id, inM: m?.inM ?? null, outM: m?.outM ?? null, tools: m?.tools ?? null };
  });
  return Response.json({ configured: !!process.env.OPENROUTER_API_KEY && ids.length > 0, models, limits: { perHour: PER_HOUR, maxPrompt: MAX_PROMPT } }, { headers: { "Cache-Control": "no-store" } });
}

async function ask(key: string, model: string, prompt: string, forced: boolean) {
  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: prompt },
      ],
      tools: [CREATE_WORKFLOW_TOOL],
      tool_choice: forced ? { type: "function", function: { name: "create_workflow" } } : "auto",
      max_tokens: 1800,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(45000),
  });
}

export async function POST(request: Request) {
  const key = process.env.OPENROUTER_API_KEY;
  const allowed = allowedModels();
  if (!key || !allowed.length) return Response.json({ error: "not_configured" }, { status: 503 });
  let body: { prompt?: unknown; model?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 5 || prompt.length > MAX_PROMPT) return Response.json({ error: "bad_prompt", maxPrompt: MAX_PROMPT }, { status: 400 });
  const model = typeof body.model === "string" && allowed.includes(body.model) ? body.model : allowed[0];
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "anon";
  const gate = take(ip);
  if (!gate.ok) return Response.json({ error: "rate_limited", retryAfter: gate.retryAfter }, { status: 429, headers: { "Retry-After": String(gate.retryAfter) } });

  const t0 = Date.now();
  let res: Response;
  try {
    res = await ask(key, model, prompt, true);
    // some models don't accept a forced tool choice: ask once more and let them choose
    if (res.status === 400) {
      const text = await res.text();
      if (/tool_choice|tool choice/i.test(text)) res = await ask(key, model, prompt, false);
      else return Response.json({ error: "model_error", status: 400, detail: text.slice(0, 200) }, { status: 502 });
    }
  } catch {
    return Response.json({ error: "timeout" }, { status: 504 });
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      // no readable error body
    }
    return Response.json({ error: "model_error", status: res.status, detail: detail.slice(0, 200) }, { status: 502 });
  }
  const j = (await res.json()) as { choices?: { message?: { content?: string | null; tool_calls?: { function?: { arguments?: string } }[] } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const msg = j.choices?.[0]?.message;
  const args = msg?.tool_calls?.[0]?.function?.arguments;
  let raw: unknown = null;
  try {
    raw = args ? JSON.parse(args) : extractJson(msg?.content);
  } catch {
    raw = extractJson(msg?.content ?? args);
  }
  const v = validateWorkflow(raw);
  if (!v.ok) return Response.json({ error: "bad_workflow", detail: v.error }, { status: 422 });
  const usage = { prompt_tokens: j.usage?.prompt_tokens ?? null, completion_tokens: j.usage?.completion_tokens ?? null };
  let cost: number | null = null;
  try {
    const p = (await openRouterModels()).find((m) => m.id === model);
    if (p && usage.prompt_tokens != null && usage.completion_tokens != null) cost = (usage.prompt_tokens * p.inM + usage.completion_tokens * p.outM) / 1e6;
  } catch {
    // cost is optional
  }
  return Response.json({ workflow: v.workflow, explanation: v.explanation, warnings: v.warnings, model, usage, cost, ms: Date.now() - t0, raw: (args ?? msg?.content ?? "").slice(0, 8000) });
}
