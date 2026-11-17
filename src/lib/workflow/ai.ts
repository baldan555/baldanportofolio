/**
 * What the prompt-to-automation demo tells the model, the one tool it must call, and the validator that turns
 * whatever comes back into a safe Workflow for the engine. Shared by the server route (which uses it) and the page
 * (which shows it), so what visitors read is exactly what the model gets. No secrets in here.
 */
import { CITIES, NODES, TRIGGERS, type Params, type Step, type StepType, type TriggerType, type Workflow } from "./engine";

/** The fields each data step adds, so the model knows what later steps can use. */
const OUTPUTS: Partial<Record<StepType, string>> = {
  fx: "base, target, rate, date",
  weather: "city, temp_now, rain_chance_next_6h (0–100), hours (list), time",
  air: "city, pm25 (µg/m³), category (US EPA name, e.g. Moderate), time",
  npm: "items (list of { package, downloads }), count, top, total",
  mockapi: "id, status, service",
  approval: "approved (true/false), by",
  set: "the fields it defines",
};

export function buildSystemPrompt(): string {
  const steps = (Object.keys(NODES) as StepType[])
    .map((t) => {
      const d = NODES[t];
      const params = d.fields.map((f) => `${f.key}${f.options ? ` (one of: ${f.options.join(", ")})` : f.kind === "number" ? ` (number${f.min != null ? ` ${f.min}–${f.max}` : ""})` : ""}`).join("; ");
      return `- ${t}: ${d.what}${params ? ` Params: ${params}.` : ""}${OUTPUTS[t] ? ` Adds: ${OUTPUTS[t]}.` : ""}`;
    })
    .join("\n");
  const triggers = (Object.keys(TRIGGERS) as TriggerType[]).map((t) => `- ${t}: ${TRIGGERS[t].what}${TRIGGERS[t].fields.map((f) => ` Param ${f.key}: ${f.label}.`).join("")}`).join("\n");
  return `You turn a person's description of a task into a workflow for a small automation engine. Always answer by calling create_workflow exactly once.

Triggers:
${triggers}

Step types (use only these):
${steps}

Rules:
- Later steps can use any field added by earlier steps. In text params write {{field}}, for example "USD is Rp {{rate}}".
- "if" compares one field (left) with a value (right) using op; put the steps for each branch in "yes" and "no".
- "loop" runs the steps in "body" once per item of a list field; each item's fields become available, plus index.
- Cities available: ${Object.keys(CITIES).join(", ")}. Currencies: those listed for fx.
- Messages and sheet rows are simulated by the demo. Business API calls (mockapi) are simulated too.
- Keep retries 1–3 on data steps and failFirst 0 unless the person asks to test failures.
- At most 10 steps. Name the workflow and steps in the person's language; write message texts in their language.
- If the request needs something these steps can't do (another data source, a real email), build the closest useful workflow and say what's missing.
- explanation: 1–3 short sentences in the person's language: what the workflow does and any limits.`;
}

export const CREATE_WORKFLOW_TOOL = {
  type: "function",
  function: {
    name: "create_workflow",
    description: "Submit the workflow that automates the person's request.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short workflow name" },
        explanation: { type: "string", description: "1–3 sentences for the person, in their language" },
        trigger: {
          type: "object",
          properties: { type: { type: "string", enum: Object.keys(TRIGGERS) }, params: { type: "object", description: "schedule: { cron }; webhook: { body } (a JSON string); manual: {}" } },
          required: ["type"],
        },
        onError: { type: "string", enum: ["stop", "alert"] },
        steps: {
          type: "array",
          description: "Steps in order. An if step has yes and no arrays of steps; a loop step has a body array of steps.",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: Object.keys(NODES) },
              name: { type: "string" },
              params: { type: "object" },
              yes: { type: "array", items: { type: "object" } },
              no: { type: "array", items: { type: "object" } },
              body: { type: "array", items: { type: "object" } },
            },
            required: ["type", "name", "params"],
          },
        },
      },
      required: ["name", "explanation", "trigger", "steps"],
    },
  },
} as const;

/* ------------------------------------------------------------------ validation */
const MAX_STEPS = 12;
const MAX_DEPTH = 3;
const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);
const FIELD = /^[\w.]{1,60}$/;
const PKG = /^@?[a-z0-9][\w.-]*(\/[\w.-]+)?$/i;

function cleanParams(type: StepType, raw: unknown, warn: (w: string) => void): Params {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const def = NODES[type];
  const out: Params = {};
  for (const f of def.fields) {
    const v = src[f.key];
    const d = def.defaults[f.key];
    if (v == null || v === "") {
      if (d != null) out[f.key] = d;
      continue;
    }
    if (f.kind === "select") out[f.key] = f.options?.includes(String(v)) ? String(v) : (d ?? f.options?.[0] ?? "");
    else if (f.kind === "number") {
      const n = Number(v);
      out[f.key] = Number.isFinite(n) ? Math.min(f.max ?? n, Math.max(f.min ?? n, Math.round(n))) : Number(d ?? 0);
    } else out[f.key] = clip(v, f.kind === "textarea" ? 400 : 120);
  }
  if (type === "if") {
    if (!FIELD.test(String(out.left))) {
      warn(`An IF step compared an invalid field; it now uses “${def.defaults.left}”.`);
      out.left = def.defaults.left;
    }
    if (!def.fields[1].options?.includes(String(out.op))) out.op = ">";
  }
  if (type === "loop" && !FIELD.test(String(out.list))) out.list = "items";
  if (type === "npm") {
    const pk = String(out.packages)
      .split(",")
      .map((x) => x.trim())
      .filter((x) => PKG.test(x))
      .slice(0, 8);
    out.packages = pk.length ? pk.join(", ") : String(def.defaults.packages);
  }
  return out;
}

export type Checked = { ok: true; workflow: Workflow; explanation: string; warnings: string[] } | { ok: false; error: string };

/** Turns untrusted model output into a Workflow the engine can run, or explains why it can't. */
export function validateWorkflow(raw: unknown): Checked {
  if (!raw || typeof raw !== "object") return { ok: false, error: "The model didn't return a workflow." };
  const r = raw as Record<string, unknown>;
  const warnings: string[] = [];
  const warn = (w: string) => warnings.length < 8 && warnings.push(w);
  let count = 0;
  const walk = (list: unknown, depth: number): Step[] => {
    if (!Array.isArray(list)) return [];
    const out: Step[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const s = item as Record<string, unknown>;
      const type = String(s.type) as StepType;
      if (!(type in NODES)) {
        warn(`Skipped a step of unknown type “${clip(s.type, 30)}”.`);
        continue;
      }
      if (count >= MAX_STEPS) {
        warn(`Kept the first ${MAX_STEPS} steps only.`);
        break;
      }
      count += 1;
      const step: Step = { id: `s${count}`, type, name: clip(s.name, 60) || NODES[type].label, params: cleanParams(type, s.params, warn) };
      if (type === "if") {
        step.yes = depth < MAX_DEPTH ? walk(s.yes, depth + 1) : [];
        step.no = depth < MAX_DEPTH ? walk(s.no, depth + 1) : [];
      }
      if (type === "loop") step.body = depth < MAX_DEPTH ? walk(s.body, depth + 1) : [];
      out.push(step);
    }
    return out;
  };
  const steps = walk(r.steps, 1);
  if (!steps.length) return { ok: false, error: "The workflow had no usable steps." };
  const tr = (r.trigger && typeof r.trigger === "object" ? r.trigger : {}) as Record<string, unknown>;
  const ttype = (String(tr.type) in TRIGGERS ? String(tr.type) : "manual") as TriggerType;
  const tp = (tr.params && typeof tr.params === "object" ? tr.params : {}) as Record<string, unknown>;
  const params: Params = { ...TRIGGERS[ttype].defaults };
  if (ttype === "schedule") {
    const cron = clip(tp.cron, 60).trim();
    if (cron.split(/\s+/).length === 5 && /^[\d*/,\-A-Za-z ]+$/.test(cron)) params.cron = cron;
    else warn("The schedule wasn't a valid cron expression; it now runs daily at 07:00.");
  }
  if (ttype === "webhook") {
    const body = typeof tp.body === "string" ? tp.body : tp.body && typeof tp.body === "object" ? JSON.stringify(tp.body, null, 2) : "";
    try {
      if (body && body.length <= 2000 && typeof JSON.parse(body) === "object") params.body = body;
    } catch {
      warn("The webhook's sample body wasn't valid JSON; a default sample is used.");
    }
  }
  return {
    ok: true,
    workflow: { name: clip(r.name, 60) || "Generated workflow", trigger: { type: ttype, params }, steps, onError: r.onError === "alert" ? "alert" : "stop" },
    explanation: clip(r.explanation, 500),
    warnings,
  };
}

/** Pulls a JSON object out of a model's plain-text answer (some models answer in text instead of calling the tool). */
export function extractJson(text: unknown): unknown {
  if (typeof text !== "string") return null;
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(text.slice(a, b + 1));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ examples (shown when live generation is off) */
export const EXAMPLES: { prompt: string; explanation: string; raw: unknown }[] = [
  {
    prompt: "Every weekday at 8, check the dollar rate. If USD is above Rp 16,000, WhatsApp the finance team. Either way, log it in a sheet.",
    explanation: "Each weekday at 08:00 it reads the ECB's USD→IDR rate, messages the finance team when it's above Rp 16,000, and always adds a row to the FX log.",
    raw: {
      name: "Dollar watch",
      trigger: { type: "schedule", params: { cron: "0 8 * * 1-5" } },
      onError: "alert",
      steps: [
        { type: "fx", name: "USD to IDR", params: { base: "USD", target: "IDR", retries: 2 } },
        { type: "if", name: "Above Rp 16,000?", params: { left: "rate", op: ">", right: "16000" }, yes: [{ type: "message", name: "Tell finance", params: { channel: "WhatsApp", to: "Finance team", text: "USD is Rp {{rate}} today ({{date}}), above our Rp 16,000 alert level." } }], no: [] },
        { type: "sheet", name: "Log the rate", params: { sheet: "FX log", columns: "date, rate" } },
      ],
    },
  },
  {
    prompt: "Setiap pagi jam 7 cek kualitas udara Jakarta. Kalau tidak sehat, kirim WhatsApp ke tim lapangan supaya pakai masker.",
    explanation: "Setiap pagi pukul 07.00 workflow membaca PM2.5 Jakarta. Jika di atas 35,4 µg/m³ (tidak sehat untuk kelompok sensitif), tim lapangan mendapat pesan WhatsApp.",
    raw: {
      name: "Cek udara pagi",
      trigger: { type: "schedule", params: { cron: "0 7 * * *" } },
      onError: "stop",
      steps: [
        { type: "air", name: "PM2.5 Jakarta", params: { city: "Jakarta", retries: 2 } },
        { type: "if", name: "Tidak sehat?", params: { left: "pm25", op: ">", right: "35.4" }, yes: [{ type: "message", name: "Kabari tim lapangan", params: { channel: "WhatsApp", to: "Tim lapangan", text: "PM2.5 di {{city}} {{pm25}} µg/m³ ({{category}}). Pakai masker saat kunjungan hari ini ya." } }], no: [{ type: "log", name: "Udara aman", params: { text: "Udara {{city}} {{category}} (PM2.5 {{pm25}}), tidak perlu peringatan." } }] },
      ],
    },
  },
  {
    prompt: "Before 6 am, check whether it will rain in Surabaya. If the chance is over 50%, ask the ops lead, then warn the drivers.",
    explanation: "At 05:30 it checks Surabaya's rain chance for the next 6 hours; above 50% it asks the ops lead for approval and then warns the drivers.",
    raw: {
      name: "Rain check for drivers",
      trigger: { type: "schedule", params: { cron: "30 5 * * *" } },
      onError: "alert",
      steps: [
        { type: "weather", name: "Surabaya forecast", params: { city: "Surabaya", retries: 2 } },
        {
          type: "if",
          name: "Likely to rain?",
          params: { left: "rain_chance_next_6h", op: ">", right: "50" },
          yes: [
            { type: "approval", name: "Ops lead approves", params: { approver: "Ops lead", message: "{{rain_chance_next_6h}}% chance of rain in {{city}}. Warn the drivers?" } },
            { type: "message", name: "Warn drivers", params: { channel: "WhatsApp", to: "Drivers group", text: "Rain likely in {{city}} ({{rain_chance_next_6h}}%). Pack rain covers." } },
          ],
          no: [{ type: "log", name: "Dry", params: { text: "{{rain_chance_next_6h}}% chance of rain: no warning." } }],
        },
      ],
    },
  },
  {
    prompt: "Every Monday, get last week's downloads for n8n, playwright and puppeteer, put each in a sheet and post the most installed one in Slack.",
    explanation: "Every Monday at 09:00 it fetches last week's npm downloads for the three packages, adds a row per package, and posts the top one to Slack.",
    raw: {
      name: "Weekly package report",
      trigger: { type: "schedule", params: { cron: "0 9 * * 1" } },
      onError: "stop",
      steps: [
        { type: "npm", name: "Weekly downloads", params: { packages: "n8n, playwright, puppeteer", retries: 2 } },
        { type: "loop", name: "Each package", params: { list: "items" }, body: [{ type: "sheet", name: "Add a row", params: { sheet: "npm weekly", columns: "package, downloads" } }] },
        { type: "message", name: "Post the leader", params: { channel: "Slack", to: "#automation", text: "Most installed last week: {{top}} (of {{count}} packages)." } },
      ],
    },
  },
  {
    prompt: "When a refund request arrives, refund it, but anything above Rp 1 million needs a supervisor first. Email the customer afterwards.",
    explanation: "A webhook receives each refund request; above Rp 1,000,000 a supervisor must approve, then the (simulated) payments API refunds it, with retries, and the customer gets an email.",
    raw: {
      name: "Refund requests",
      trigger: { type: "webhook", params: { body: '{ "order": "A-1042", "customer": "Rina", "amount": 2000000 }' } },
      onError: "alert",
      steps: [
        { type: "if", name: "Over Rp 1 million?", params: { left: "amount", op: ">", right: "1000000" }, yes: [{ type: "approval", name: "Supervisor approves", params: { approver: "Supervisor", message: "Refund Rp {{amount}} to {{customer}} for {{order}}?" } }], no: [] },
        { type: "mockapi", name: "Refund", params: { service: "Payments API", endpoint: "POST /refunds", retries: 3, failFirst: 1 } },
        { type: "message", name: "Email the customer", params: { channel: "Email", to: "{{customer}}", text: "Hi {{customer}}, your refund of Rp {{amount}} for {{order}} is on its way (ref {{id}})." } },
      ],
    },
  },
];
