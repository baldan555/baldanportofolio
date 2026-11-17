/**
 * One chore, automated six ways, drawn on the shared morphing canvas (640×340). The chore: every morning, get
 * yesterday's orders from a supplier portal, add them up per store, update the sales sheet and tell the team.
 * The four steps (s1–s4) keep their colour in every drawing, so you can watch the same work change hands:
 * from a person, to a script, to workflow nodes, to a robot clicking screens, to pipeline tasks, to an agent's tools.
 */
import type { CanvasHop, DEdge, Drawing, Spec } from "@/components/web/archs/arch-canvas";
import type { FIcon, FTone } from "./web-flows";
import type { Kind, Place } from "./web-archs";

export type WayId = "hand" | "script" | "workflow" | "rpa" | "pipeline" | "agent";
export type Hop = CanvasHop & { say: string };
export type Way = Drawing & {
  id: WayId;
  short: string;
  tagline: string;
  journey: Hop[];
  facts: [string, string][];
  tools: string[];
};

const P = (x: number, y: number, w: number, h: number, label: string, kind: Kind, sub?: string, icon?: FIcon): Place => ({ x, y, w, h, label, kind, sub, icon });
const E = (from: string, to: string, kind: DEdge["kind"] = "sync", d?: string): DEdge => ({ from, to, kind, d });
const H = (from: string, to: string, tag: string, say: string, net = true, tone: FTone = "req"): Hop => ({ from, to, tag, say, net, tone });

export const WAYS: Way[] = [
  {
    id: "hand",
    name: "By hand",
    short: "By hand",
    tagline: "The same clicks every single morning, done by a person who has better things to do.",
    parts: {
      you: P(20, 140, 84, 60, "You", "client", "every morning", "user"),
      portal: P(150, 24, 150, 50, "Supplier portal", "ext", "website only", "browser"),
      s1: P(150, 98, 150, 46, "Download", "module", "log in, export to Excel"),
      s2: P(150, 156, 150, 46, "Add up", "module", "per store, by hand"),
      s3: P(150, 214, 150, 46, "Paste", "module", "into the sales sheet"),
      s4: P(150, 272, 150, 46, "Message", "module", "type it to the team"),
      sheet: P(470, 140, 150, 52, "Sales sheet", "db", "Google Sheets", "sheet"),
      chat: P(470, 240, 150, 52, "Team chat", "ext", "WhatsApp · Slack", "chat"),
    },
    edges: [E("you", "s1", "call"), E("s1", "portal"), E("s1", "s2", "api"), E("s2", "s3", "api"), E("s3", "s4", "api"), E("s3", "sheet"), E("s4", "chat")],
    journey: [
      H("you", "s1", "log in", "You remember, open the portal and log in.", false, "data"),
      H("s1", "portal", "export", "Find yesterday's orders and export them to Excel.", false, "data"),
      H("s1", "s2", "open file", "Open the file and add up the totals per store.", false, "data"),
      H("s2", "s3", "copy", "Copy the totals…", false, "data"),
      H("s3", "sheet", "paste", "…paste them into the sales sheet, carefully.", false, "data"),
      H("s4", "chat", "type", "Then type a message to the team. Tomorrow, again.", false, "ok"),
    ],
    facts: [
      ["Starts when", "you remember to"],
      ["Reaches systems through", "the screen"],
      ["Who can build it", "anyone"],
      ["Breaks when", "you're busy, ill, or make a typo"],
    ],
    tools: ["Browser", "Excel", "Chat app"],
  },
  {
    id: "script",
    name: "Script + schedule",
    short: "Script",
    tagline: "A few dozen lines of code and a timer. Fast, cheap and exact, if the systems have APIs.",
    parts: {
      clock: P(20, 140, 84, 60, "07:00", "infra", "cron", "clock"),
      you: P(20, 256, 84, 60, "You", "client", "just read it", "user"),
      box: P(132, 30, 282, 280, "Python script", "container", "on a small server"),
      s1: P(148, 84, 250, 46, "fetch_orders()", "module", "portal API"),
      s2: P(148, 142, 250, 46, "totals_by_store()", "module", "pandas"),
      s3: P(148, 200, 250, 46, "update_sheet()", "module", "Sheets API"),
      s4: P(148, 258, 250, 46, "notify()", "module", "chat API"),
      portal: P(450, 40, 170, 50, "Supplier portal", "ext", "has an API", "browser"),
      sheet: P(450, 152, 170, 50, "Sales sheet", "db", "Google Sheets", "sheet"),
      chat: P(450, 262, 170, 50, "Team chat", "ext", "WhatsApp · Slack", "chat"),
    },
    edges: [E("clock", "box"), E("s1", "s2", "api"), E("s2", "s3", "api"), E("s3", "s4", "api"), E("s1", "portal"), E("s3", "sheet"), E("s4", "chat")],
    journey: [
      H("clock", "s1", "07:00", "Every morning at 7 the server's scheduler (cron) starts the script.", false, "data"),
      H("s1", "portal", "GET /orders", "It asks the portal's API for yesterday's orders."),
      H("portal", "s1", "JSON", "The portal answers with data, not a screen.", true, "ok"),
      H("s1", "s2", "rows", "Totals per store take a few lines of pandas.", false, "data"),
      H("s3", "sheet", "update", "The Sheets API writes the totals into the sheet."),
      H("s4", "chat", "message", "A chat API posts the summary. Done before anyone is awake.", true, "ok"),
    ],
    facts: [
      ["Starts when", "a schedule fires (cron)"],
      ["Reaches systems through", "APIs"],
      ["Who can build it", "a developer"],
      ["Breaks when", "an API changes and nobody reads the logs"],
    ],
    tools: ["Python", "Node.js", "cron", "Task Scheduler", "Apps Script"],
  },
  {
    id: "workflow",
    name: "No-code workflow",
    short: "Workflow",
    tagline: "Boxes and arrows on a canvas, each box a ready-made connector to one of your apps.",
    parts: {
      box: P(10, 96, 620, 122, "Workflow canvas", "container", "n8n · Make · Zapier · Power Automate"),
      clock: P(24, 148, 84, 54, "Schedule", "infra", "daily 07:00", "clock"),
      s1: P(124, 148, 108, 54, "HTTP call", "bounded", "portal API"),
      s2: P(248, 148, 108, 54, "Summarize", "bounded", "group by store"),
      s3: P(372, 148, 108, 54, "Sheets", "bounded", "update rows"),
      s4: P(496, 148, 108, 54, "Slack", "bounded", "send message"),
      portal: P(122, 252, 112, 56, "Portal", "ext", "orders API", "browser"),
      sheet: P(370, 252, 112, 56, "Sheet", "db", "Google Sheets", "sheet"),
      chat: P(494, 252, 112, 56, "Team chat", "ext", "Slack channel", "chat"),
      you: P(20, 252, 84, 60, "You", "client", "get the message", "user"),
    },
    edges: [E("clock", "s1", "api"), E("s1", "s2", "api"), E("s2", "s3", "api"), E("s3", "s4", "api"), E("s1", "portal"), E("s3", "sheet"), E("s4", "chat")],
    journey: [
      H("clock", "s1", "07:00", "The workflow's first node is a schedule trigger.", false, "data"),
      H("s1", "portal", "GET /orders", "An HTTP node calls the portal's API."),
      H("portal", "s1", "items", "Each order becomes an item flowing to the next node.", true, "ok"),
      H("s1", "s2", "items[]", "A Summarize node groups the items by store.", false, "data"),
      H("s2", "s3", "totals", "A Google Sheets node, set up with a few clicks and a login.", false, "data"),
      H("s3", "sheet", "update", "It updates the rows."),
      H("s4", "chat", "message", "A Slack node posts the summary. No code written.", true, "ok"),
    ],
    facts: [
      ["Starts when", "a trigger node fires: a schedule, a webhook, a new email"],
      ["Reaches systems through", "ready-made connectors"],
      ["Who can build it", "anyone comfortable with logic"],
      ["Breaks when", "a step fails quietly, or the plan's task limit runs out"],
    ],
    tools: ["n8n", "Zapier", "Make", "Power Automate", "Pipedream"],
  },
  {
    id: "rpa",
    name: "RPA bot",
    short: "RPA",
    tagline: "A software robot that uses the screen, mouse and keyboard, for systems that have no API.",
    parts: {
      clock: P(20, 24, 124, 56, "07:00", "infra", "scheduled run", "clock"),
      bot: P(20, 104, 124, 124, "Robot", "service", "clicks like a person", "robot"),
      you: P(20, 256, 124, 60, "You", "client", "check the run log", "user"),
      portal: P(176, 24, 204, 150, "Supplier portal", "ext", "no API, only screens", "browser"),
      s1: P(192, 96, 172, 46, "Export ▸", "bounded", "bot clicks the button"),
      sheet: P(412, 24, 208, 176, "Sales sheet", "db", "opened in the browser", "sheet"),
      s2: P(428, 82, 176, 46, "=SUM by store", "bounded", "bot types formulas"),
      s3: P(428, 140, 176, 46, "Paste totals", "bounded", "bot pastes"),
      chat: P(412, 216, 208, 104, "Team chat", "ext", "WhatsApp Web", "chat"),
      s4: P(428, 262, 176, 44, "Type & send", "bounded", "bot types the message"),
    },
    edges: [E("clock", "bot"), E("bot", "portal"), E("bot", "sheet", "sync", "M144,180 C260,205 360,200 412,175"), E("bot", "chat")],
    journey: [
      H("clock", "bot", "07:00", "The scheduler starts the robot on a machine with a screen.", false, "data"),
      H("bot", "s1", "click Export", "The portal has no API, so the robot opens it and clicks, exactly as you would.", false, "req"),
      H("s1", "bot", "orders.xlsx", "It waits for the download to finish.", false, "ok"),
      H("bot", "s2", "type =SUM", "It types formulas into the sheet…", false, "data"),
      H("bot", "s3", "paste", "…pastes the totals…", false, "data"),
      H("bot", "s4", "type, send", "…and types the team message in WhatsApp Web.", false, "ok"),
    ],
    facts: [
      ["Starts when", "a scheduler fires, or you press Run"],
      ["Reaches systems through", "the screen, like a person"],
      ["Who can build it", "an RPA developer"],
      ["Breaks when", "a button moves, a pop-up appears or the page is slow"],
    ],
    tools: ["UiPath", "Power Automate Desktop", "Automation Anywhere", "Playwright", "Selenium"],
  },
  {
    id: "pipeline",
    name: "Orchestrated pipeline",
    short: "Pipeline",
    tagline: "Many small tasks in a graph, with retries, a history of every run, and alerts when it fails.",
    parts: {
      portal: P(20, 24, 84, 56, "Portal", "ext", "API"),
      clock: P(20, 140, 84, 60, "Schedule", "infra", "daily 07:00", "clock"),
      you: P(20, 256, 84, 60, "You", "client", "on call", "user"),
      box: P(124, 24, 346, 292, "Orchestrator", "container", "Airflow · Prefect · Dagster · Temporal"),
      s1: P(140, 128, 96, 64, "extract", "bounded", "retries 3×"),
      s2: P(252, 128, 96, 64, "transform", "bounded", "tested"),
      s3: P(364, 82, 92, 54, "load", "bounded", "to the sheet"),
      s4: P(364, 190, 92, 54, "notify", "bounded", "on success"),
      log: P(140, 230, 208, 70, "Run history", "db", "every run, retry and log line", "chart"),
      sheet: P(496, 82, 124, 54, "Sales sheet", "db", "Google Sheets", "sheet"),
      chat: P(496, 190, 124, 54, "Team chat", "ext", "alerts too", "chat"),
    },
    edges: [E("clock", "box"), E("s1", "portal"), E("s1", "s2", "api"), E("s2", "s3", "api"), E("s3", "s4", "api"), E("s3", "sheet"), E("s4", "chat")],
    journey: [
      H("clock", "s1", "run 07:00", "The orchestrator starts today's run: a graph of small, separate tasks.", false, "data"),
      H("s1", "portal", "GET /orders", "extract asks the portal's API…"),
      H("portal", "s1", "timeout", "…which times out today.", true, "bad"),
      H("s1", "portal", "retry 1", "The orchestrator waits a little and retries on its own."),
      H("portal", "s1", "rows", "This time it works. Every attempt is in the run history.", true, "ok"),
      H("s1", "s2", "rows", "Each task hands its output to the next.", false, "data"),
      H("s3", "sheet", "update", "load writes the sheet through its API."),
      H("s3", "s4", "success", "notify only runs if everything before it succeeded.", false, "ok"),
      H("s4", "chat", "done ✓", "The team gets the summary; a failure would alert whoever is on call.", true, "ok"),
    ],
    facts: [
      ["Starts when", "a schedule, an event, or a backfill of past days"],
      ["Reaches systems through", "APIs, one small task each"],
      ["Who can build it", "data or platform engineers"],
      ["Breaks when", "rarely in silence: it retries, then alerts"],
    ],
    tools: ["Airflow", "Prefect", "Dagster", "Temporal", "GitHub Actions"],
  },
  {
    id: "agent",
    name: "AI agent",
    short: "Agent",
    tagline: "A language model given a goal and a set of tools. It decides the steps itself, within limits you set.",
    parts: {
      clock: P(20, 40, 84, 56, "07:00", "infra", "or a message", "clock"),
      you: P(20, 240, 84, 60, "You", "client", "approve if asked", "user"),
      llm: P(140, 110, 170, 110, "AI agent", "infra", "an LLM choosing tools", "spark"),
      s1: P(340, 24, 140, 46, "get_orders", "fn", "tool", "bolt"),
      s2: P(340, 84, 140, 46, "run_python", "fn", "tool", "bolt"),
      s3: P(340, 144, 140, 46, "update_sheet", "fn", "tool", "bolt"),
      s4: P(340, 204, 140, 46, "send_message", "fn", "tool", "bolt"),
      guard: P(340, 266, 280, 52, "Ask a human when unsure", "bounded", "guardrail: an approval step"),
      portal: P(506, 24, 114, 46, "Portal", "ext", "API", "browser"),
      sheet: P(506, 144, 114, 46, "Sheet", "db", "Google Sheets", "sheet"),
      chat: P(506, 204, 114, 46, "Team chat", "ext", "WhatsApp", "chat"),
    },
    edges: [E("clock", "llm"), E("you", "llm"), E("llm", "s1"), E("llm", "s2"), E("llm", "s3"), E("llm", "s4"), E("llm", "guard", "sync", "M250,220 C258,256 296,272 340,278"), E("guard", "you", "sync", "M340,304 C250,314 160,302 104,284"), E("s1", "portal"), E("s3", "sheet"), E("s4", "chat")],
    journey: [
      H("clock", "llm", "goal", "At 7 the agent gets a goal, not a script: “Do the morning orders report.”", false, "data"),
      H("llm", "s1", "get_orders(date)", "The model picks the first step and calls a tool."),
      H("s1", "llm", "rows", "The tool's result goes back into its conversation.", true, "ok"),
      H("llm", "s2", "run_python(sum)", "It writes and runs a little code to add things up."),
      H("s2", "llm", "totals", "One store's total is far above its usual. That looks odd.", true, "ok"),
      H("llm", "guard", "unusual?", "Its instructions say: ask a person when something looks wrong.", false, "data"),
      H("guard", "you", "approve?", "You get a quick question instead of a wrong report.", true, "req"),
      H("you", "llm", "yes, a promo", "You confirm, and the agent carries on.", true, "ok"),
      H("llm", "s3", "update_sheet", "It updates the sheet…"),
      H("llm", "s4", "send_message", "…and writes the team message in its own words.", true, "ok"),
    ],
    facts: [
      ["Starts when", "it gets a goal: a message, an email, a schedule"],
      ["Reaches systems through", "tools it chooses itself"],
      ["Who can build it", "a developer, with careful instructions and limits"],
      ["Breaks when", "it misreads the goal: needs limits, checks and logs"],
    ],
    tools: ["OpenRouter", "OpenAI · Claude · Gemini", "LangGraph", "n8n AI Agent", "MCP"],
  },
];

export const WAY_SPEC: Spec = {
  z: ["box", "portal", "sheet", "chat", "clock", "you", "bot", "llm", "log", "guard", "s1", "s2", "s3", "s4"],
  domain: { s1: "#2a78d6", s2: "#6250d6", s3: "#1baf7a", s4: "#c29a00" },
  home: {},
  fills: { box: "#f4f1eb" },
};
for (const w of WAYS) for (const [k, v] of Object.entries(w.parts)) WAY_SPEC.home[k] ??= v;

export const wayById = (id: WayId) => WAYS.find((w) => w.id === id) as Way;
