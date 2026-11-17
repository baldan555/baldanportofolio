import type { Workflow } from "./engine";

/** Ready-made workflows for the lab: each shows a different building block on real or simulated data. */
export const TEMPLATES: { id: string; title: string; shows: string; wf: Workflow }[] = [
  {
    id: "fx",
    title: "Rupiah watch",
    shows: "real data · IF branch",
    wf: {
      name: "Rupiah watch",
      onError: "alert",
      trigger: { type: "schedule", params: { cron: "0 8 * * 1-5" } },
      steps: [
        { id: "s1", type: "fx", name: "USD to IDR rate", params: { base: "USD", target: "IDR", retries: 2, backoff: "exponential", failFirst: 0 } },
        {
          id: "s2",
          type: "if",
          name: "Above the alert level?",
          params: { left: "rate", op: ">", right: "16000" },
          yes: [{ id: "s3", type: "message", name: "Alert finance", params: { channel: "WhatsApp", to: "Finance team", text: "USD is Rp {{rate}} today (ECB reference rate, {{date}}). Time to review the open USD invoices." } }],
          no: [{ id: "s4", type: "log", name: "Note it", params: { text: "USD at Rp {{rate}}, below the alert level." } }],
        },
        { id: "s5", type: "sheet", name: "Keep a history", params: { sheet: "FX log", columns: "date, base, target, rate" } },
      ],
    },
  },
  {
    id: "rain",
    title: "Rain warning for drivers",
    shows: "real forecast · approval",
    wf: {
      name: "Rain warning for drivers",
      onError: "alert",
      trigger: { type: "schedule", params: { cron: "0 6 * * *" } },
      steps: [
        { id: "s1", type: "weather", name: "Next 6 hours", params: { city: "Jakarta", retries: 2, backoff: "exponential", failFirst: 0 } },
        {
          id: "s2",
          type: "if",
          name: "Rain likely?",
          params: { left: "rain_chance_next_6h", op: ">=", right: "40" },
          yes: [
            { id: "s3", type: "approval", name: "Ask the ops lead", params: { approver: "Ops lead", message: "{{rain_chance_next_6h}}% chance of rain in {{city}} in the next 6 hours. Warn the delivery drivers?" } },
            { id: "s4", type: "message", name: "Warn the drivers", params: { channel: "WhatsApp", to: "Drivers group", text: "Heads up: {{rain_chance_next_6h}}% chance of rain in {{city}} in the next 6 hours. Pack rain covers for the parcels." } },
          ],
          no: [{ id: "s5", type: "log", name: "Dry enough", params: { text: "Only {{rain_chance_next_6h}}% chance of rain in {{city}}. No warning needed." } }],
        },
      ],
    },
  },
  {
    id: "air",
    title: "Air quality notice",
    shows: "real data · two messages",
    wf: {
      name: "Air quality notice",
      onError: "stop",
      trigger: { type: "schedule", params: { cron: "0 7 * * *" } },
      steps: [
        { id: "s1", type: "air", name: "PM2.5 now", params: { city: "Jakarta", retries: 2, backoff: "exponential", failFirst: 0 } },
        { id: "s2", type: "sheet", name: "Log the reading", params: { sheet: "Air log", columns: "time, city, pm25, category" } },
        {
          id: "s3",
          type: "if",
          name: "Unhealthy for some?",
          params: { left: "pm25", op: ">", right: "35.4" },
          yes: [{ id: "s4", type: "message", name: "Advise masks", params: { channel: "Slack", to: "#field-team", text: "PM2.5 in {{city}} is {{pm25}} µg/m³ ({{category}}). Masks recommended for outdoor visits today." } }],
          no: [{ id: "s5", type: "message", name: "All clear", params: { channel: "Slack", to: "#field-team", text: "Air in {{city}} is {{category}} right now (PM2.5 {{pm25}} µg/m³)." } }],
        },
      ],
    },
  },
  {
    id: "npm",
    title: "Package download report",
    shows: "real data · loop",
    wf: {
      name: "Package download report",
      onError: "stop",
      trigger: { type: "manual", params: {} },
      steps: [
        { id: "s1", type: "npm", name: "Weekly downloads", params: { packages: "n8n, playwright, puppeteer, bullmq, @modelcontextprotocol/sdk", retries: 2, backoff: "exponential", failFirst: 0 } },
        { id: "s2", type: "loop", name: "Each package", params: { list: "items" }, body: [{ id: "s3", type: "sheet", name: "One row each", params: { sheet: "npm weekly", columns: "index, package, downloads" } }] },
        { id: "s4", type: "message", name: "Tell the team", params: { channel: "Slack", to: "#automation", text: "Updated weekly downloads for {{count}} packages. Most installed: {{top}}." } },
      ],
    },
  },
  {
    id: "refund",
    title: "Refund with retries",
    shows: "webhook · approval · retries",
    wf: {
      name: "Refund request",
      onError: "alert",
      trigger: { type: "webhook", params: { body: '{\n  "order": "A-1042",\n  "customer": "Rina",\n  "amount": 2000000,\n  "reason": "damaged on arrival"\n}' } },
      steps: [
        {
          id: "s1",
          type: "if",
          name: "Over Rp 1 million?",
          params: { left: "amount", op: ">", right: "1000000" },
          yes: [{ id: "s2", type: "approval", name: "Supervisor approves", params: { approver: "Supervisor", message: "Refund Rp {{amount}} to {{customer}} for order {{order}} ({{reason}})?" } }],
          no: [{ id: "s3", type: "log", name: "Small refund", params: { text: "Under the limit: refunded automatically." } }],
        },
        { id: "s4", type: "mockapi", name: "Issue the refund", params: { service: "Payments API", endpoint: "POST /refunds", retries: 3, backoff: "exponential", failFirst: 2 } },
        { id: "s5", type: "message", name: "Tell the customer", params: { channel: "Email", to: "{{customer}}", text: "Hi {{customer}}, your refund of Rp {{amount}} for order {{order}} is on its way (ref {{id}})." } },
        { id: "s6", type: "sheet", name: "Record it", params: { sheet: "Refunds", columns: "order, customer, amount, id" } },
      ],
    },
  },
];
