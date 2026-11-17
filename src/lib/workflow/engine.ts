/**
 * A small workflow engine that runs in the browser: a trigger, then a list of steps (with IF branches and loops)
 * that pass data along. Data nodes call real public APIs (ECB rates via Frankfurter, Open-Meteo weather and air
 * quality, npm downloads); action nodes (messages, sheet rows) are simulated and only appear on the page. Shared by
 * the Workflow lab and the prompt-to-automation demo, which asks an AI to write a Workflow in this same shape.
 */

/* ================================================================== the shape of a workflow */
export type TriggerType = "manual" | "schedule" | "webhook";
export type StepType = "fx" | "weather" | "air" | "npm" | "mockapi" | "if" | "set" | "loop" | "wait" | "approval" | "message" | "sheet" | "log";
export type Params = Record<string, string | number | boolean>;
export type Step = { id: string; type: StepType; name: string; params: Params; yes?: Step[]; no?: Step[]; body?: Step[] };
export type Workflow = { name: string; trigger: { type: TriggerType; params: Params }; steps: Step[]; onError: "stop" | "alert" };

/* ================================================================== the node catalog (no React here) */
export type Field = { key: string; label: string; kind: "text" | "number" | "select" | "textarea"; options?: string[]; min?: number; max?: number; help?: string };
export type NodeDef = { label: string; group: "Trigger" | "Data" | "Logic" | "People" | "Action"; what: string; fields: Field[]; defaults: Params; real?: boolean };
export const CITIES: Record<string, [number, number]> = { Jakarta: [-6.2, 106.85], Makassar: [-5.14, 119.42], Surabaya: [-7.25, 112.75], Bandung: [-6.91, 107.61], Medan: [3.59, 98.67], Denpasar: [-8.65, 115.22] };
const CITY_LIST = Object.keys(CITIES);
const RETRY_FIELDS: Field[] = [
  { key: "retries", label: "Retries on failure", kind: "number", min: 0, max: 5 },
  { key: "backoff", label: "Wait between retries", kind: "select", options: ["fixed", "exponential"] },
  { key: "failFirst", label: "Simulate failures first", kind: "number", min: 0, max: 4, help: "Make the first N attempts fail, to watch the retries." },
];
export const TRIGGERS: Record<TriggerType, NodeDef> = {
  manual: { label: "Manual run", group: "Trigger", what: "Starts when you press Run.", fields: [], defaults: {} },
  schedule: { label: "Schedule", group: "Trigger", what: "Starts at fixed times. Here, Run simulates the next scheduled run.", fields: [{ key: "cron", label: "Cron expression", kind: "text", help: "minute hour day month weekday" }], defaults: { cron: "0 7 * * *" } },
  webhook: { label: "Webhook", group: "Trigger", what: "Starts when another app sends data to the workflow's URL. Here, Run sends the sample below.", fields: [{ key: "body", label: "Sample request body (JSON)", kind: "textarea" }], defaults: { body: '{ "order": "A-1042", "amount": 150000 }' } },
};
export const NODES: Record<StepType, NodeDef> = {
  fx: { label: "Exchange rate", group: "Data", real: true, what: "Today's reference rate from the European Central Bank, via the free Frankfurter API.", fields: [{ key: "base", label: "From", kind: "select", options: ["USD", "EUR", "SGD", "JPY", "CNY", "AUD", "GBP"] }, { key: "target", label: "To", kind: "select", options: ["IDR", "USD", "EUR", "SGD", "MYR"] }, ...RETRY_FIELDS], defaults: { base: "USD", target: "IDR", retries: 2, backoff: "exponential", failFirst: 0 } },
  weather: { label: "Weather forecast", group: "Data", real: true, what: "The next hours' rain chance and temperature from Open-Meteo.", fields: [{ key: "city", label: "City", kind: "select", options: CITY_LIST }, ...RETRY_FIELDS], defaults: { city: "Jakarta", retries: 2, backoff: "exponential", failFirst: 0 } },
  air: { label: "Air quality", group: "Data", real: true, what: "PM2.5 right now from Open-Meteo, with its US EPA category.", fields: [{ key: "city", label: "City", kind: "select", options: CITY_LIST }, ...RETRY_FIELDS], defaults: { city: "Jakarta", retries: 2, backoff: "exponential", failFirst: 0 } },
  npm: { label: "npm downloads", group: "Data", real: true, what: "Last week's downloads of some npm packages, as a list of items.", fields: [{ key: "packages", label: "Packages (comma-separated)", kind: "text" }, ...RETRY_FIELDS], defaults: { packages: "n8n, playwright, puppeteer, bullmq", retries: 2, backoff: "exponential", failFirst: 0 } },
  mockapi: { label: "Business API (simulated)", group: "Data", what: "Stands in for one of your own systems, such as payments or a CRM. Nothing is sent anywhere.", fields: [{ key: "service", label: "Service", kind: "text" }, { key: "endpoint", label: "Call", kind: "text" }, ...RETRY_FIELDS], defaults: { service: "Payments API", endpoint: "POST /refunds", retries: 3, backoff: "exponential", failFirst: 2 } },
  if: { label: "IF", group: "Logic", what: "Sends the run down the Yes or the No path.", fields: [{ key: "left", label: "Value (a field name)", kind: "text" }, { key: "op", label: "Is", kind: "select", options: [">", ">=", "<", "<=", "==", "!=", "contains"] }, { key: "right", label: "Compared with", kind: "text" }], defaults: { left: "rate", op: ">", right: "16000" } },
  set: { label: "Set fields", group: "Logic", what: "Creates or renames fields. One per line: name = text with {{fields}}.", fields: [{ key: "fields", label: "Fields", kind: "textarea" }], defaults: { fields: "summary = {{base}} 1 = {{target}} {{rate}}" } },
  loop: { label: "For each item", group: "Logic", what: "Runs the steps inside once for every item of a list.", fields: [{ key: "list", label: "List field", kind: "text" }], defaults: { list: "items" } },
  wait: { label: "Wait", group: "Logic", what: "Pauses the run for a few seconds.", fields: [{ key: "seconds", label: "Seconds", kind: "number", min: 1, max: 10 }], defaults: { seconds: 2 } },
  approval: { label: "Ask for approval", group: "People", what: "Pauses until a person approves or rejects. Rejecting ends the run.", fields: [{ key: "approver", label: "Who approves", kind: "text" }, { key: "message", label: "Question", kind: "textarea" }], defaults: { approver: "Ops lead", message: "Go ahead?" } },
  message: { label: "Send a message", group: "Action", what: "Posts a message to a chat or inbox (simulated: it appears in the chat panel below).", fields: [{ key: "channel", label: "Channel", kind: "select", options: ["WhatsApp", "Telegram", "Slack", "Email"] }, { key: "to", label: "To", kind: "text" }, { key: "text", label: "Message", kind: "textarea" }], defaults: { channel: "WhatsApp", to: "Team", text: "Done: {{summary}}" } },
  sheet: { label: "Add a sheet row", group: "Action", what: "Appends a row to a sheet (simulated: the sheet panel below).", fields: [{ key: "sheet", label: "Sheet", kind: "text" }, { key: "columns", label: "Columns (field names)", kind: "text" }], defaults: { sheet: "Log", columns: "date, rate" } },
  log: { label: "Write to the log", group: "Action", what: "Adds a line to the run log.", fields: [{ key: "text", label: "Text", kind: "textarea" }], defaults: { text: "Nothing to do today." } },
};

/* ================================================================== data helpers */
type Data = Record<string, unknown>;
/** Reads a dotted path such as "items.0.package" or "steps.s2.rate". */
export function pick(data: Data, path: string): unknown {
  let cur: unknown = data;
  for (const k of path.trim().split(".").filter(Boolean)) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}
const show = (v: unknown) => (typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
/** Fills {{field}} placeholders from the run's data. */
export const fill = (tpl: string, data: Data) => tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p: string) => show(pick(data, p)));
const PM_CATS: [number, string][] = [
  [9, "Good"],
  [35.4, "Moderate"],
  [55.4, "Unhealthy for sensitive groups"],
  [125.4, "Unhealthy"],
  [225.4, "Very unhealthy"],
  [Infinity, "Hazardous"],
];
const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      rej(new DOMException("Stopped", "AbortError"));
    });
  });
const now = () => performance.now();
let mockSeq = 0;

async function getJson(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json() as Promise<Record<string, unknown>>;
}
/** One attempt of a data node. Returns the node's output and the URL it called (for the log). */
async function callData(step: Step, signal: AbortSignal): Promise<{ out: Data; url: string }> {
  const p = step.params;
  if (step.type === "fx") {
    const url = `https://api.frankfurter.dev/v1/latest?base=${p.base}&symbols=${p.target}`;
    const j = await getJson(url, signal);
    const rate = (j.rates as Record<string, number> | undefined)?.[String(p.target)];
    if (rate == null) throw new Error(`No ${p.base}→${p.target} rate in the answer`);
    return { url, out: { base: p.base, target: p.target, rate, date: j.date } };
  }
  if (step.type === "weather") {
    const [lat, lon] = CITIES[String(p.city)] ?? CITIES.Jakarta;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability,temperature_2m&current=temperature_2m&forecast_days=2&timezone=Asia%2FJakarta`;
    const j = await getJson(url, signal);
    const h = j.hourly as { time: string[]; precipitation_probability: (number | null)[]; temperature_2m: (number | null)[] };
    const cur = j.current as { time: string; temperature_2m: number };
    const start = Math.max(0, h.time.findIndex((t) => t >= cur.time.slice(0, 13)));
    const next = h.time.slice(start, start + 6).map((t, i) => ({ time: t.slice(11), rain_pct: h.precipitation_probability[start + i] ?? 0, temp: h.temperature_2m[start + i] }));
    return { url, out: { city: p.city, temp_now: cur.temperature_2m, rain_chance_next_6h: Math.max(0, ...next.map((x) => x.rain_pct)), hours: next, time: cur.time } };
  }
  if (step.type === "air") {
    const [lat, lon] = CITIES[String(p.city)] ?? CITIES.Jakarta;
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5&timezone=Asia%2FJakarta`;
    const j = await getJson(url, signal);
    const cur = j.current as { time: string; pm2_5: number | null };
    if (cur?.pm2_5 == null) throw new Error("No PM2.5 value right now");
    const pm25 = Math.round(cur.pm2_5 * 10) / 10;
    return { url, out: { city: p.city, pm25, category: (PM_CATS.find(([m]) => pm25 <= m) as [number, string])[1], time: cur.time } };
  }
  if (step.type === "npm") {
    const pkgs = String(p.packages)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (!pkgs.length) throw new Error("No packages given");
    const items = await Promise.all(
      pkgs.map(async (name) => {
        const j = await getJson(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name).replace("%40", "@")}`, signal);
        return { package: name, downloads: Number(j.downloads ?? 0) };
      }),
    );
    items.sort((a, b) => b.downloads - a.downloads);
    return { url: "https://api.npmjs.org/downloads/point/last-week/…", out: { items, count: items.length, top: items[0]?.package, total: items.reduce((a, b) => a + b.downloads, 0) } };
  }
  // mockapi: a stand-in for an internal system
  await sleep(250 + (mockSeq % 3) * 80, signal);
  mockSeq += 1;
  return { url: `${p.service} ${p.endpoint}`, out: { id: `rf_${(4096 + mockSeq * 97).toString(16)}`, status: "succeeded", service: p.service } };
}

/* ================================================================== running */
export type Status = "idle" | "running" | "ok" | "failed" | "retrying" | "skipped" | "waiting" | "stopped";
export type StepEvent = { id: string; status: Status; attempt?: number; ms?: number; input?: Data; output?: Data; error?: string; note?: string };
export type LogLine = { t: number; level: "info" | "ok" | "warn" | "error"; text: string };
export type Effect = { kind: "message"; channel: string; to: string; text: string; t: number } | { kind: "sheet"; sheet: string; columns: string[]; row: string[]; t: number };
export type Hooks = { signal: AbortSignal; onStep: (e: StepEvent) => void; onLog: (l: LogLine) => void; onEffect: (e: Effect) => void; approve: (step: Step, text: string) => Promise<boolean> };
export type RunResult = { status: "ok" | "failed" | "stopped" | "rejected"; ms: number; error?: string; failedAt?: string };

class Rejected extends Error {}

function compare(a: unknown, op: string, bRaw: string) {
  const bNum = Number(bRaw);
  const b: unknown = bRaw.trim() !== "" && !Number.isNaN(bNum) ? bNum : bRaw;
  const na = typeof a === "string" && a.trim() !== "" && !Number.isNaN(Number(a)) ? Number(a) : a;
  switch (op) {
    case ">":
      return Number(na) > Number(b);
    case ">=":
      return Number(na) >= Number(b);
    case "<":
      return Number(na) < Number(b);
    case "<=":
      return Number(na) <= Number(b);
    case "==":
      return String(na) === String(b);
    case "!=":
      return String(na) !== String(b);
    default:
      return String(na ?? "").toLowerCase().includes(String(b).toLowerCase());
  }
}

export async function runWorkflow(wf: Workflow, h: Hooks): Promise<RunResult> {
  const t0 = now();
  const log = (level: LogLine["level"], text: string) => h.onLog({ t: Math.round(now() - t0), level, text });
  const steps: Record<string, Data> = {};
  let data: Data = { steps };
  let current = "trigger";
  // trigger
  h.onStep({ id: "trigger", status: "running" });
  try {
    let out: Data = { started_at: new Date().toISOString() };
    if (wf.trigger.type === "webhook") {
      try {
        out = { ...out, ...(JSON.parse(String(wf.trigger.params.body ?? "{}")) as Data) };
      } catch {
        throw new Error("The webhook's sample body isn't valid JSON");
      }
      log("info", "Webhook received the sample request.");
    } else if (wf.trigger.type === "schedule") log("info", `Scheduled run (cron ${wf.trigger.params.cron}), started now for the demo.`);
    else log("info", "Started by hand.");
    data = { ...data, ...out };
    steps.trigger = out;
    h.onStep({ id: "trigger", status: "ok", output: out, ms: Math.round(now() - t0) });

    const run = async (list: Step[]): Promise<void> => {
      for (const s of list) {
        if (h.signal.aborted) throw new DOMException("Stopped", "AbortError");
        current = s.id;
        const input = { ...data, steps: undefined };
        const def = NODES[s.type];
        const st0 = now();
        h.onStep({ id: s.id, status: "running", input });
        let out: Data = {};
        if (def.group === "Data") {
          const max = Number(s.params.retries ?? 0) + 1;
          for (let attempt = 1; ; attempt++) {
            try {
              if (attempt <= Number(s.params.failFirst ?? 0)) {
                await sleep(300, h.signal);
                throw new Error("HTTP 503 Service Unavailable (simulated)");
              }
              const r = await callData(s, h.signal);
              out = r.out;
              log("ok", `${s.name}: ${r.url}${attempt > 1 ? ` (attempt ${attempt})` : ""}`);
              break;
            } catch (e) {
              if ((e as Error).name === "AbortError") throw e;
              const msg = (e as Error).message;
              if (attempt >= max) throw new Error(`${msg}, after ${attempt} attempt${attempt > 1 ? "s" : ""}`);
              const wait = s.params.backoff === "fixed" ? 800 : 500 * 2 ** (attempt - 1);
              log("warn", `${s.name}: ${msg}. Retrying in ${(wait / 1000).toFixed(1)} s (attempt ${attempt + 1} of ${max}).`);
              h.onStep({ id: s.id, status: "retrying", attempt: attempt + 1, error: msg, input });
              await sleep(wait, h.signal);
            }
          }
        } else if (s.type === "if") {
          const val = pick(data, String(s.params.left));
          const yes = compare(val, String(s.params.op), String(s.params.right));
          out = { result: yes };
          log("info", `${s.name}: ${String(s.params.left)} (${show(val)}) ${s.params.op} ${s.params.right} → ${yes ? "Yes" : "No"}`);
          h.onStep({ id: s.id, status: "ok", input, output: { [String(s.params.left)]: val, result: yes ? "Yes" : "No" }, ms: Math.round(now() - st0) });
          const skip = (xs: Step[] | undefined) =>
            (xs ?? []).forEach(function mark(x: Step) {
              h.onStep({ id: x.id, status: "skipped" });
              (x.yes ?? []).forEach(mark);
              (x.no ?? []).forEach(mark);
              (x.body ?? []).forEach(mark);
            });
          skip(yes ? s.no : s.yes);
          await run((yes ? s.yes : s.no) ?? []);
          continue;
        } else if (s.type === "loop") {
          const list = pick(data, String(s.params.list));
          if (!Array.isArray(list)) throw new Error(`“${s.params.list}” isn't a list`);
          h.onStep({ id: s.id, status: "ok", input, output: { items: list.length }, ms: Math.round(now() - st0) });
          log("info", `${s.name}: ${list.length} items.`);
          const before = data;
          for (const [i, item] of list.entries()) {
            data = { ...before, item, index: i + 1, ...(item && typeof item === "object" ? (item as Data) : {}) };
            await run(s.body ?? []);
          }
          data = before;
          continue;
        } else if (s.type === "set") {
          for (const line of String(s.params.fields).split("\n")) {
            const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)$/);
            if (!m) continue;
            const tpl = m[2];
            const only = tpl.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
            out[m[1]] = only ? pick(data, only[1]) : fill(tpl, data);
          }
        } else if (s.type === "wait") {
          const sec = Math.max(1, Math.min(10, Number(s.params.seconds) || 1));
          h.onStep({ id: s.id, status: "running", input, note: `waiting ${sec} s` });
          await sleep(sec * 1000, h.signal);
          out = { waited_s: sec };
        } else if (s.type === "approval") {
          const text = fill(String(s.params.message), data);
          h.onStep({ id: s.id, status: "waiting", input, note: text });
          log("info", `${s.name}: waiting for ${s.params.approver}.`);
          const ok = await h.approve(s, text);
          out = { approved: ok, by: s.params.approver };
          if (!ok) {
            h.onStep({ id: s.id, status: "stopped", output: out, ms: Math.round(now() - st0) });
            log("warn", `${s.params.approver} rejected it. The run ends here.`);
            throw new Rejected();
          }
          log("ok", `${s.params.approver} approved.`);
        } else if (s.type === "message") {
          const text = fill(String(s.params.text), data);
          const to = fill(String(s.params.to), data);
          h.onEffect({ kind: "message", channel: String(s.params.channel), to, text, t: Math.round(now() - t0) });
          out = { sent: true, channel: s.params.channel, to, text };
          log("ok", `${s.name}: ${s.params.channel} message to ${to}.`);
        } else if (s.type === "sheet") {
          const columns = String(s.params.columns)
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
          const row = columns.map((c) => show(pick(data, c)));
          h.onEffect({ kind: "sheet", sheet: String(s.params.sheet), columns, row, t: Math.round(now() - t0) });
          out = Object.fromEntries(columns.map((c, i) => [c, row[i]]));
          log("ok", `${s.name}: row added to “${s.params.sheet}”.`);
        } else if (s.type === "log") {
          const text = fill(String(s.params.text), data);
          out = { text };
          log("info", text);
        }
        steps[s.id] = out;
        data = { ...data, ...out };
        h.onStep({ id: s.id, status: "ok", input, output: out, ms: Math.round(now() - st0) });
      }
    };
    await run(wf.steps);
    log("ok", "Run finished.");
    return { status: "ok", ms: Math.round(now() - t0) };
  } catch (e) {
    const ms = Math.round(now() - t0);
    if (e instanceof Rejected) return { status: "rejected", ms };
    if ((e as Error).name === "AbortError") {
      h.onStep({ id: current, status: "stopped" });
      log("warn", "Stopped by you.");
      return { status: "stopped", ms };
    }
    const msg = (e as Error).message;
    h.onStep({ id: current, status: "failed", error: msg });
    log("error", `Failed at “${current}”: ${msg}`);
    if (wf.onError === "alert") {
      h.onEffect({ kind: "message", channel: "Telegram", to: "On-call", text: `⚠ “${wf.name}” failed at step ${current}: ${msg}`, t: ms });
      log("warn", "Failure alert sent to the on-call channel.");
    }
    return { status: "failed", ms, error: msg, failedAt: current };
  }
}

/* ================================================================== helpers for editors */
export function newStep(type: StepType, id: string): Step {
  const def = NODES[type];
  const s: Step = { id, type, name: def.label, params: { ...def.defaults } };
  if (type === "if") {
    s.yes = [];
    s.no = [];
  }
  if (type === "loop") s.body = [];
  return s;
}
/** Every step id in a workflow, depth first. */
export function allSteps(list: Step[]): Step[] {
  return list.flatMap((s) => [s, ...allSteps(s.yes ?? []), ...allSteps(s.no ?? []), ...allSteps(s.body ?? [])]);
}
