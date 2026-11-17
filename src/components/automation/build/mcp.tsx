"use client";

import { useState } from "react";

/* MCP, message by message: an app connects to an MCP server, discovers its tools, hands them to the model, and runs
 * the call the model asks for. JSON-RPC messages as the protocol defines them (version 2025-06-18), shown over
 * either transport. Illustrative data; the shapes are the protocol's. */
type Lane = "model" | "client" | "server" | "db";
const LANES: [Lane, string, string][] = [
  ["model", "Model", "the LLM"],
  ["client", "Your app", "MCP client"],
  ["server", "MCP server", "e.g. “orders”"],
  ["db", "Orders DB", "your system"],
];
const X: Record<Lane, number> = { model: 70, client: 230, server: 390, db: 545 };
const ROWS = JSON.stringify([
  { store: "Toko Sinar", total: 1240000 },
  { store: "Kios Jaya", total: 4980000 },
]);
const SCHEMA = { type: "object", properties: { date: { type: "string", description: "YYYY-MM-DD" } }, required: ["date"] };
const STEPS: { from: Lane; to: Lane; tag: string; say: string; body: unknown; mcp: boolean }[] = [
  { from: "client", to: "server", tag: "initialize", say: "The app opens the connection and says which protocol version it speaks.", mcp: true, body: { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "ops-assistant", version: "1.0.0" } } } },
  { from: "server", to: "client", tag: "capabilities", say: "The server answers with what it offers: here, tools.", mcp: true, body: { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-06-18", capabilities: { tools: { listChanged: true } }, serverInfo: { name: "orders", version: "1.0.0" } } } },
  { from: "client", to: "server", tag: "initialized", say: "A notification (no id, no reply): ready to work.", mcp: true, body: { jsonrpc: "2.0", method: "notifications/initialized" } },
  { from: "client", to: "server", tag: "tools/list", say: "The app asks which tools exist.", mcp: true, body: { jsonrpc: "2.0", id: 2, method: "tools/list" } },
  { from: "server", to: "client", tag: "tool list", say: "Each tool comes with a name, a description and a JSON Schema for its input.", mcp: true, body: { jsonrpc: "2.0", id: 2, result: { tools: [{ name: "get_orders", description: "Orders for one day, with store and total. Returns an array.", inputSchema: SCHEMA }] } } },
  { from: "client", to: "model", tag: "tools", say: "Not MCP: the app translates the tools into the model API's own format and sends them with the conversation.", mcp: false, body: { tools: [{ type: "function", function: { name: "get_orders", description: "Orders for one day, with store and total. Returns an array.", parameters: SCHEMA } }] } },
  { from: "model", to: "client", tag: "tool call", say: "The model asks for the tool, in its API's format.", mcp: false, body: { tool_calls: [{ id: "call_1", type: "function", function: { name: "get_orders", arguments: '{"date":"2026-11-11"}' } }] } },
  { from: "client", to: "server", tag: "tools/call", say: "The app forwards the call to the MCP server (and could ask you first).", mcp: true, body: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_orders", arguments: { date: "2026-11-11" } } } },
  { from: "server", to: "db", tag: "query", say: "Not MCP: the server's own code talks to your system, with its own credentials.", mcp: false, body: "SELECT store, SUM(total) AS total\nFROM orders WHERE day = '2026-11-11'\nGROUP BY store;" },
  { from: "db", to: "server", tag: "rows", say: "Your system answers as it always does.", mcp: false, body: [{ store: "Toko Sinar", total: 1240000 }, { store: "Kios Jaya", total: 4980000 }] },
  { from: "server", to: "client", tag: "result", say: "The result goes back as content blocks; isError tells the model whether it worked.", mcp: true, body: { jsonrpc: "2.0", id: 3, result: { content: [{ type: "text", text: ROWS }], isError: false } } },
  { from: "client", to: "model", tag: "tool result", say: "Not MCP: the app passes the result to the model, linked to its request.", mcp: false, body: { role: "tool", tool_call_id: "call_1", content: ROWS } },
  { from: "model", to: "client", tag: "answer", say: "The model answers with real numbers.", mcp: false, body: { role: "assistant", content: "Yesterday: Kios Jaya Rp 4.98m, Toko Sinar Rp 1.24m." } },
];
const MORE: [string, string, string][] = [
  ["Tools", "tools/list · tools/call", "Actions the model can take: query, create, send. The part every agent uses."],
  ["Resources", "resources/list · resources/read", "Read-only data the app can attach as context: files, records, documents."],
  ["Prompts", "prompts/list · prompts/get", "Reusable prompt templates a server offers, such as “summarise this ticket”."],
  ["Elicitation & sampling", "elicitation/create · sampling/createMessage", "The server asks the user for missing input, or asks the app's model to write something."],
];

export function McpSteps() {
  const [i, setI] = useState(0);
  const [transport, setTransport] = useState<"stdio" | "http">("stdio");
  const s = STEPS[i];
  const H = 70 + STEPS.length * 26;
  const frame = !s.mcp
    ? "Not an MCP message"
    : transport === "stdio"
      ? `stdio: one JSON message per line on the server's ${s.from === "client" ? "stdin" : "stdout"}`
      : s.from === "client"
        ? "POST /mcp\nContent-Type: application/json\nAccept: application/json, text/event-stream" + (i > 1 ? "\nMcp-Session-Id: 9f2c…" : "")
        : `HTTP 200 · application/json${i === 1 ? "\nMcp-Session-Id: 9f2c…" : ""}`;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-[22px] border border-line bg-[#fbfaf7] p-3">
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 615 ${H}`} className="block h-auto w-full min-w-[520px]" role="img" aria-label="MCP sequence diagram">
              <defs>
                <marker id="mcpA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="rgba(11,11,11,0.45)" />
                </marker>
                <marker id="mcpB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#eb6834" />
                </marker>
              </defs>
              <rect x={X.client + 30} y={4} width={X.server - X.client - 60} height={H - 8} rx={10} fill="rgba(235,104,52,0.06)" />
              <text x={(X.client + X.server) / 2} y={H - 10} textAnchor="middle" fontSize={9.5} fill="#a8461f" fontFamily="ui-sans-serif, system-ui" fontWeight={700}>
                MCP happens here
              </text>
              {LANES.map(([k, label, sub]) => (
                <g key={k}>
                  <rect x={X[k] - 56} y={8} width={112} height={38} rx={10} fill={k === "server" ? "#0b0b0b" : "#fff"} stroke="rgba(11,11,11,0.2)" />
                  <text x={X[k]} y={24} textAnchor="middle" fontSize={12} fontWeight={750} fill={k === "server" ? "#fff" : "#0b0b0b"} fontFamily="ui-sans-serif, system-ui">
                    {label}
                  </text>
                  <text x={X[k]} y={38} textAnchor="middle" fontSize={9} fill={k === "server" ? "rgba(255,255,255,0.6)" : "rgba(11,11,11,0.5)"} fontFamily="ui-sans-serif, system-ui">
                    {sub}
                  </text>
                  <line x1={X[k]} x2={X[k]} y1={46} y2={H - 22} stroke="rgba(11,11,11,0.15)" strokeDasharray="3 4" />
                </g>
              ))}
              {STEPS.map((st, k) => {
                const y = 64 + k * 26;
                const on = k === i;
                const x1 = X[st.from],
                  x2 = X[st.to];
                const dir = x2 > x1 ? 1 : -1;
                return (
                  <g key={k} onClick={() => setI(k)} style={{ cursor: "pointer" }} opacity={k > i ? 0.35 : 1}>
                    <line x1={x1 + dir * 4} x2={x2 - dir * 4} y1={y} y2={y} stroke={on ? "#eb6834" : st.mcp ? "rgba(11,11,11,0.5)" : "rgba(11,11,11,0.3)"} strokeWidth={on ? 2.2 : 1.3} strokeDasharray={st.mcp ? undefined : "4 3"} markerEnd={`url(#${on ? "mcpB" : "mcpA"})`} />
                    <rect x={(x1 + x2) / 2 - st.tag.length * 3.1 - 7} y={y - 9} width={st.tag.length * 6.2 + 14} height={15} rx={7.5} fill={on ? "#eb6834" : "#fff"} stroke={on ? "#eb6834" : "rgba(11,11,11,0.15)"} />
                    <text x={(x1 + x2) / 2} y={y + 2} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={on ? "#fff" : "rgba(11,11,11,0.7)"} fontFamily="ui-monospace, monospace">
                      {st.tag}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <p className="text-[11px] text-ink-2/50">Solid arrows are MCP messages; dashed ones are not. Click any arrow.</p>
            <div className="flex shrink-0 gap-1">
              <button type="button" disabled={i === 0} onClick={() => setI((x) => x - 1)} className="rounded-full px-2.5 py-1 text-[12px] ring-1 ring-line disabled:opacity-30">
                ←
              </button>
              <button type="button" disabled={i === STEPS.length - 1} onClick={() => setI((x) => x + 1)} className="rounded-full bg-[#eb6834] px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="rounded-2xl border border-line bg-white p-3">
            <p className="font-mono text-[10.5px] text-ink-2/50">
              step {i + 1} of {STEPS.length} · {LANES.find((l) => l[0] === s.from)?.[1]} → {LANES.find((l) => l[0] === s.to)?.[1]}
            </p>
            <p className="mt-1 text-[13.5px] leading-snug font-medium">{s.say}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] font-semibold">Transport</span>
            {(
              [
                ["stdio", "stdio (local process)"],
                ["http", "Streamable HTTP (remote)"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={transport === k} onClick={() => setTransport(k)} className={`rounded-full px-2.5 py-1 text-[11.5px] transition ${transport === k ? "bg-ink text-white" : "bg-cream/70 text-ink/70"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="min-w-0 overflow-hidden rounded-[18px] bg-ink">
            <pre className="border-b border-white/10 px-4 py-2 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap text-white/55">{frame}</pre>
            <pre data-lenis-prevent className="max-h-[330px] overflow-auto p-4 font-mono text-[11.5px] leading-relaxed text-white/90">{typeof s.body === "string" ? s.body : JSON.stringify(s.body, null, 2)}</pre>
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {MORE.map(([t, m, d]) => (
          <div key={t} className="rounded-2xl border border-line bg-white p-3.5">
            <p className="text-[14px] font-semibold">{t}</p>
            <p className="mt-0.5 font-mono text-[10.5px] text-[#a8461f]">{m}</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink-2/70">{d}</p>
          </div>
        ))}
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">Messages follow the Model Context Protocol specification (JSON-RPC 2.0, version 2025-06-18); the data is illustrative. MCP standardises the middle: the same server works with any MCP client, whichever model sits behind it.</p>
    </div>
  );
}
