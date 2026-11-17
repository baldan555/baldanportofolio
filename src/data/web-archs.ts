/**
 * Six ways to build the same product (a small online shop), drawn on one 640×340 canvas. The same parts (catalog,
 * orders, payments, users, emails…) keep their identity and colour in every architecture, so switching morphs one
 * drawing into the next. Journeys follow one order; incidents show what breaks. All of it is a teaching model: the
 * ratings are rules of thumb, not benchmarks, and the page says so.
 */
import type { FIcon, FTone } from "./web-flows";

export type ArchId = "monolith" | "modular" | "micro" | "serverless" | "jamstack" | "baas";
export type PartId = "client" | "cdn" | "lb" | "box" | "baas" | "build" | "bus" | "ui" | "db" | "users" | "catalog" | "orders" | "pay" | "notify" | "files" | "dbUsers" | "dbCatalog" | "dbOrders" | "dbPay";
export type Kind = "client" | "infra" | "container" | "module" | "bounded" | "service" | "fn" | "page" | "db" | "bus" | "ext" | "table";
export type Place = { x: number; y: number; w: number; h: number; label: string; kind: Kind; sub?: string; icon?: FIcon; schemas?: boolean };
export type EdgeKind = "sync" | "async" | "call" | "api" | "data";
export type Edge = { from: PartId; to: PartId; kind: EdgeKind; d?: string };
export type Hop = { from: PartId; to: PartId; tag: string; say: string; net: boolean; tone?: FTone; side?: boolean };
export type Status = "down" | "slow" | "scaled" | "deploy" | "hot";
export type IncidentId = "crash" | "spike" | "deploy" | "dbslow";
export type Verdict = "down" | "partial" | "slow" | "fine";
export type Outcome = { verdict: Verdict; users: string; why: string; status: Partial<Record<PartId, Status>> };
export type RatingKey = "first" | "ops" | "scale" | "contain" | "tiny" | "teams" | "vendor" | "local";
export type Arch = {
  id: ArchId;
  name: string;
  tagline: string;
  parts: Partial<Record<PartId, Place>>;
  edges: Edge[];
  journey: Hop[];
  deploys: string;
  dbs: string;
  best: string[];
  watch: string[];
  stack: string[];
  real?: string;
  ratings: Record<RatingKey, number>;
  incidents: Record<IncidentId, Outcome>;
};

/** Back-to-front drawing order: containers first, chips that sit inside other boxes last. */
export const Z: PartId[] = ["box", "baas", "cdn", "client", "lb", "build", "bus", "ui", "db", "users", "catalog", "orders", "pay", "notify", "files", "dbUsers", "dbCatalog", "dbOrders", "dbPay"];
/** Each business part keeps its colour in every architecture. */
export const DOMAIN: Partial<Record<PartId, string>> = { users: "#6250d6", catalog: "#2a78d6", orders: "#eb6834", pay: "#1baf7a", notify: "#c29a00", dbUsers: "#6250d6", dbCatalog: "#2a78d6", dbOrders: "#eb6834", dbPay: "#1baf7a" };

const P = (x: number, y: number, w: number, h: number, label: string, kind: Kind, sub?: string, icon?: FIcon, schemas?: boolean): Place => ({ x, y, w, h, label, kind, sub, icon, schemas });
const E = (from: PartId, to: PartId, kind: EdgeKind = "sync", d?: string): Edge => ({ from, to, kind, d });
const H = (from: PartId, to: PartId, tag: string, say: string, net = true, tone: FTone = "req", side?: boolean): Hop => ({ from, to, tag, say, net, tone, side });
const CLIENT = P(10, 140, 80, 60, "Customers", "client", "web + app", "user");

/* the two monoliths share their layout; only the rules inside differ */
const MONO_MODULES = (k: Kind) => ({
  ui: P(228, 70, 118, 56, "Web pages", k, "server-rendered"),
  catalog: P(372, 70, 118, 56, "Catalog", k, "products, stock"),
  orders: P(228, 150, 118, 56, "Orders", k, "cart, checkout"),
  pay: P(372, 150, 118, 56, "Payments", k, "charges, refunds"),
  users: P(228, 230, 118, 56, "Users", k, "accounts, sign-in"),
  notify: P(372, 230, 118, 56, "Emails", k, "receipts"),
});
const allDown = { box: "down", ui: "down", catalog: "down", orders: "down", pay: "down", users: "down", notify: "down" } as const;
const allSlow = { box: "slow", ui: "slow", catalog: "slow", orders: "slow", pay: "slow", users: "slow", notify: "slow" } as const;

export const ARCHS: Arch[] = [
  {
    id: "monolith",
    name: "Monolith",
    tagline: "One codebase, one process, one database. Every feature is a folder, and calling another feature is a function call.",
    parts: { client: CLIENT, lb: P(104, 145, 96, 50, "Router", "infra", "load balancer"), box: P(214, 20, 290, 300, "One app · one deploy", "container", "one codebase, one process"), ...MONO_MODULES("module"), db: P(524, 140, 104, 60, "Database", "db", "one, shared", "db") },
    edges: [E("client", "lb"), E("lb", "box"), E("box", "db"), E("ui", "catalog", "call"), E("ui", "orders", "call"), E("orders", "pay", "call"), E("orders", "catalog", "call"), E("pay", "users", "call"), E("users", "orders", "call"), E("notify", "orders", "call"), E("notify", "pay", "call"), E("catalog", "users", "call")],
    journey: [
      H("client", "lb", "POST /checkout", "You tap Pay. The request reaches a load balancer in front of the app."),
      H("lb", "orders", "forward", "It hands the request to one running copy of the app."),
      H("orders", "catalog", "checkStock()", "Orders asks Catalog about stock with a plain function call. No network, no waiting.", false, "data"),
      H("orders", "pay", "charge()", "Payments is just another folder of code in the same process.", false, "data"),
      H("orders", "db", "1 transaction", "Order, stock and payment are saved in one database transaction: all of it or none of it.", true, "data"),
      H("orders", "notify", "sendReceipt()", "The receipt email is queued with another function call.", false, "data"),
      H("orders", "client", "201 Created", "Done inside one process: the simplest thing to build, test, debug and run.", true, "ok"),
    ],
    deploys: "1 app",
    dbs: "1",
    best: ["New products and small teams", "Most business apps, for years", "Anything that needs strong consistency"],
    watch: ["Code turns into spaghetti without discipline", "One bug or memory leak can take everything down", "Can only scale the whole app at once"],
    stack: ["Laravel", "Django", "Rails", "Spring Boot", "Next.js + Postgres"],
    ratings: { first: 4, ops: 4, scale: 2, contain: 1, tiny: 3, teams: 2, vendor: 5, local: 5 },
    incidents: {
      crash: { verdict: "down", status: allDown, users: "The whole shop is down, even browsing: everything ran in the process that crashed.", why: "In a monolith, a crash anywhere takes everything in that process with it. Running several copies helps only until each copy hits the same bug." },
      spike: { verdict: "fine", status: { catalog: "hot", box: "scaled", db: "slow" }, users: "The shop stays up once more copies of the app start.", why: "You can only scale the whole app, so every copy also carries payments, users and the rest though only the catalog is busy. Simple, but wasteful at large scale. The shared database feels it too, so a cache usually comes next." },
      deploy: { verdict: "fine", status: { box: "deploy", ui: "deploy", catalog: "deploy", orders: "deploy", pay: "deploy", users: "deploy", notify: "deploy" }, users: "Nothing visible, if the rollout is careful.", why: "A one-line change to orders means building, testing and redeploying the entire app. Easy with five developers; a queue of waiting changes with fifty." },
      dbslow: { verdict: "slow", status: { db: "slow", ...allSlow }, users: "Every page is slow.", why: "Every feature shares one database, so one bad query slows them all down." },
    },
  },
  {
    id: "modular",
    name: "Modular monolith",
    tagline: "Still one app and one deploy, but with walls inside: each module owns its code and tables, and others may only use its public interface.",
    parts: { client: CLIENT, lb: P(104, 145, 96, 50, "Router", "infra", "load balancer"), box: P(214, 20, 290, 300, "One app · one deploy", "container", "modules with walls between them"), ...MONO_MODULES("bounded"), db: P(524, 128, 104, 84, "Database", "db", "one schema each", "db", true) },
    edges: [E("client", "lb"), E("lb", "box"), E("box", "db"), E("ui", "catalog", "api"), E("ui", "orders", "api"), E("orders", "pay", "api"), E("orders", "users", "api"), E("orders", "notify", "api")],
    journey: [
      H("client", "lb", "POST /checkout", "Same start: one request to one app."),
      H("lb", "orders", "forward", "It reaches the orders module."),
      H("orders", "catalog", "catalog.reserve()", "Orders may only use Catalog's public interface, never its tables. A build check fails if it tries.", false, "data"),
      H("orders", "pay", "payments.charge()", "Same for Payments: a clear contract, still a fast function call.", false, "data"),
      H("orders", "db", "orders schema", "Each module writes only its own tables, still inside one transaction.", true, "data"),
      H("orders", "notify", "OrderPlaced event", "Modules talk through in-process events, ready to become real messages if one is ever split out.", false, "data"),
      H("orders", "client", "201 Created", "One process, but teams can work in their own module without stepping on each other.", true, "ok"),
    ],
    deploys: "1 app",
    dbs: "1, split by schema",
    best: ["Growing teams (10 to 50 developers)", "Products that might split later", "Keeping operations simple while code grows"],
    watch: ["Walls need tooling and code review to hold", "Still one deploy and one runtime", "Still scales as one unit"],
    stack: ["Spring Modulith", ".NET modules", "Rails engines", "Nx / Turborepo"],
    ratings: { first: 3, ops: 4, scale: 2, contain: 2, tiny: 3, teams: 3, vendor: 5, local: 5 },
    incidents: {
      crash: { verdict: "down", status: allDown, users: "Everything is down, just like the plain monolith.", why: "Walls organise the code, not the runtime: it's still one process, so a crash takes everything down. That's the price of simple operations." },
      spike: { verdict: "fine", status: { catalog: "hot", box: "scaled", db: "slow" }, users: "The shop stays up once more copies start.", why: "Still scaled as one unit. But because Catalog is a clean module with its own tables, it's easy to move it into its own service if this keeps happening." },
      deploy: { verdict: "fine", status: { box: "deploy", orders: "deploy" }, users: "Nothing visible.", why: "Still one deploy, but the change and its tests stay inside the orders module, so the other teams aren't involved." },
      dbslow: { verdict: "slow", status: { db: "slow", ...allSlow }, users: "Every page is slow.", why: "One database underneath. Because each module owns its own schema, you can at least see whose queries are slow, and later give that module its own database." },
    },
  },
  {
    id: "micro",
    name: "Microservices",
    tagline: "Each part is its own small app with its own database, deployed and scaled on its own, talking to the others over the network.",
    parts: {
      client: CLIENT,
      ui: P(104, 145, 88, 50, "Frontend", "service", "web + app", "browser"),
      lb: P(204, 145, 92, 50, "API gateway", "infra", "auth, routing"),
      users: P(330, 14, 128, 48, "Users", "service", "own deploy"),
      catalog: P(330, 82, 128, 48, "Catalog", "service", "own deploy"),
      orders: P(330, 150, 128, 48, "Orders", "service", "own deploy"),
      pay: P(330, 218, 128, 48, "Payments", "service", "own deploy"),
      dbUsers: P(416, 21, 34, 34, "DB", "db"),
      dbCatalog: P(416, 89, 34, 34, "DB", "db"),
      dbOrders: P(416, 157, 34, 34, "DB", "db"),
      dbPay: P(416, 225, 34, 34, "DB", "db"),
      bus: P(482, 14, 56, 252, "Bus", "bus", "events", "queue"),
      notify: P(556, 120, 72, 70, "Emails", "service", "service"),
    },
    edges: [E("client", "ui"), E("ui", "lb"), E("lb", "users"), E("lb", "catalog"), E("lb", "orders"), E("lb", "pay"), E("orders", "pay"), E("orders", "bus", "async"), E("pay", "bus", "async"), E("bus", "notify", "async")],
    journey: [
      H("ui", "lb", "POST /orders", "The frontend sends the order to the API gateway."),
      H("lb", "orders", "token checked", "The gateway checks who you are and routes the request to the Orders service."),
      H("orders", "catalog", "GET /stock", "Orders asks the Catalog service over the network. Any call can be slow or fail."),
      H("orders", "pay", "POST /charges", "Then the Payments service: another network call, another team's code."),
      H("orders", "dbOrders", "INSERT", "Orders saves to its own database. No transaction spans services, so failing halfway needs compensating steps (a saga).", true, "data"),
      H("orders", "bus", "order.placed", "It publishes an event and moves on.", true, "data"),
      H("bus", "notify", "order.placed", "The Email service reacts in its own time; Orders doesn't wait for it.", true, "data"),
      H("orders", "ui", "201 Created", "Many more network hops than a monolith, but every service can be changed, deployed and scaled alone.", true, "ok"),
    ],
    deploys: "5 services + gateway",
    dbs: "4, one per service",
    best: ["Large organisations with many teams", "Parts with very different load or rules", "Teams that need to ship independently"],
    watch: ["Network calls fail: needs timeouts, retries, tracing", "No transactions or joins across services", "A lot to run: deploys, monitoring, versions"],
    stack: ["Kubernetes", "Docker", "Kafka / Pub/Sub", "gRPC", "OpenTelemetry"],
    ratings: { first: 1, ops: 1, scale: 5, contain: 4, tiny: 1, teams: 5, vendor: 4, local: 2 },
    incidents: {
      crash: { verdict: "partial", status: { pay: "down", orders: "slow" }, users: "Browsing and sign-in work. Checkout fails or hangs, because Orders waits on Payments.", why: "The crash stays inside one service, but whatever calls it synchronously suffers too. Timeouts, circuit breakers or a queue between Orders and Payments keep checkout accepting orders and charging later." },
      spike: { verdict: "fine", status: { lb: "hot", catalog: "scaled" }, users: "The shop stays up.", why: "Only the Catalog service gets more copies; Payments and Orders keep their size. Scaling just the busy part is a big reason large products split up." },
      deploy: { verdict: "fine", status: { orders: "deploy" }, users: "Nothing visible.", why: "The Orders team ships alone, any time of day. The catch: its API has to stay compatible with every service that calls it." },
      dbslow: { verdict: "partial", status: { dbOrders: "slow", orders: "slow" }, users: "Browsing is fine; checkout is slow.", why: "Each service has its own database, so one slow database only slows its own service. The price is paid elsewhere: no joins or transactions across services." },
    },
  },
  {
    id: "serverless",
    name: "Serverless",
    tagline: "No servers to keep running: small functions start on each request, scale on their own, and cost nothing when idle.",
    parts: {
      client: CLIENT,
      ui: P(104, 145, 88, 50, "Static app", "page", "on a CDN"),
      lb: P(204, 145, 92, 50, "API gateway", "infra", "per request"),
      users: P(330, 16, 124, 44, "ƒ users", "fn", "runs on demand", "bolt"),
      catalog: P(330, 76, 124, 44, "ƒ catalog", "fn", "runs on demand", "bolt"),
      orders: P(330, 136, 124, 44, "ƒ orders", "fn", "runs on demand", "bolt"),
      pay: P(330, 196, 124, 44, "ƒ payments", "fn", "runs on demand", "bolt"),
      notify: P(330, 276, 124, 44, "ƒ emails", "fn", "runs on demand", "bolt"),
      db: P(486, 16, 142, 90, "Managed DB", "db", "DynamoDB · Firestore", "db"),
      bus: P(486, 136, 142, 56, "Queue", "bus", "SQS · Pub/Sub", "queue"),
    },
    edges: [E("client", "ui"), E("ui", "lb"), E("lb", "users"), E("lb", "catalog"), E("lb", "orders"), E("users", "db"), E("catalog", "db"), E("orders", "db"), E("orders", "bus", "async"), E("bus", "pay", "async"), E("bus", "notify", "async")],
    journey: [
      H("ui", "lb", "POST /orders", "The app, served as static files, calls the API gateway."),
      H("lb", "orders", "invoke", "The gateway starts the orders function. If no copy is warm, a cold start adds a moment."),
      H("orders", "db", "save order", "The function writes to a managed database directly.", true, "data"),
      H("orders", "bus", "enqueue", "It drops a message on a queue and finishes. You pay only for the time it ran.", true, "data"),
      H("orders", "ui", "202 Accepted", "The customer gets an answer right away.", true, "ok"),
      H("bus", "pay", "charge", "The queue starts the payments function in the background, retrying if it fails.", true, "data"),
      H("bus", "notify", "receipt", "And the emails function, independently.", true, "data"),
    ],
    deploys: "5 functions",
    dbs: "1, managed",
    best: ["Spiky or unpredictable traffic", "Background jobs, webhooks, scheduled tasks", "Small teams that don't want to run servers"],
    watch: ["Cold starts on the first request", "Time limits, and hundreds of copies can swamp a database", "Tied to one cloud's services and pricing"],
    stack: ["AWS Lambda", "Cloud Run functions", "Vercel Functions", "Cloudflare Workers"],
    ratings: { first: 3, ops: 4, scale: 5, contain: 4, tiny: 5, teams: 4, vendor: 2, local: 2 },
    incidents: {
      crash: { verdict: "partial", status: { pay: "down" }, users: "Payments fail and are retried; everything else works.", why: "Each function call runs in isolation, so a bug only breaks the requests that hit it, and queued work is retried. There's no long-running process left in a broken state." },
      spike: { verdict: "fine", status: { lb: "hot", catalog: "scaled", db: "slow" }, users: "Mostly fine; a few first requests are slower while copies start.", why: "The platform starts as many copies as needed, automatically, and you pay per request. Watch the database: hundreds of copies can run out of its connections." },
      deploy: { verdict: "fine", status: { orders: "deploy" }, users: "Nothing visible.", why: "One function deploys in seconds. With dozens of them, keeping versions, permissions and configuration straight becomes the real work." },
      dbslow: { verdict: "slow", status: { db: "slow", users: "slow", catalog: "slow", orders: "slow" }, users: "Most actions are slow.", why: "Every function waits on the slow database, and you pay for the waiting time too. A managed database still needs good indexes." },
    },
  },
  {
    id: "jamstack",
    name: "Static + APIs",
    tagline: "Pages are built ahead of time and served as plain files from a CDN; only the truly dynamic parts call APIs. Often called Jamstack.",
    parts: {
      client: CLIENT,
      cdn: P(110, 20, 210, 196, "CDN · edge", "container", "pre-built files, near every visitor"),
      ui: P(124, 72, 182, 52, "Pages", "page", "HTML built ahead of time", "file"),
      catalog: P(124, 136, 182, 52, "Product pages", "page", "one file per product", "file"),
      build: P(110, 262, 100, 58, "Build", "infra", "on change"),
      db: P(222, 262, 98, 58, "Content", "db", "CMS · JSON", "db"),
      users: P(352, 20, 150, 48, "Auth", "ext", "Clerk · Auth0", "globe"),
      pay: P(352, 90, 150, 48, "Payments", "ext", "Midtrans · Stripe", "globe"),
      notify: P(352, 160, 150, 48, "Emails", "ext", "Resend · SendGrid", "globe"),
      orders: P(352, 230, 150, 48, "ƒ checkout", "fn", "your one function", "bolt"),
    },
    edges: [E("client", "cdn"), E("client", "orders", "sync", "M90,195 C130,262 300,250 352,254"), E("orders", "pay", "sync", "M502,246 C548,232 548,128 502,114"), E("orders", "notify", "sync", "M502,250 C526,240 526,196 502,184"), E("db", "build", "data"), E("build", "cdn", "data")],
    journey: [
      H("client", "catalog", "GET /kopi", "Opening a product page: the CDN returns a file that was built in advance. No server code runs."),
      H("catalog", "client", "HTML", "It comes from a location near you, so it's fast everywhere.", true, "ok"),
      H("client", "orders", "POST /api/checkout", "Only the dynamic parts call APIs: checkout is one small function."),
      H("orders", "pay", "create payment", "It asks a payment provider for a payment page."),
      H("pay", "orders", "webhook: paid", "When you've paid, the provider calls back.", true, "ok"),
      H("orders", "notify", "send receipt", "An email API sends the receipt."),
      H("db", "build", "content changed", "Separately: when a product changes, the site is rebuilt…", true, "data", true),
      H("build", "cdn", "new files", "…and the new files replace the old ones on the CDN.", true, "data", true),
    ],
    deploys: "1 site + 1 function",
    dbs: "content only",
    best: ["Content: shops, docs, blogs, marketing", "Huge traffic on the same pages", "Small teams; almost nothing to run"],
    watch: ["Rebuilds get slow with very many pages", "Personal, per-user pages need APIs", "Many third-party services to juggle"],
    stack: ["Next.js static export", "Astro", "Hugo", "Netlify / Vercel / Cloudflare Pages"],
    real: "This portfolio is built this way: pages are generated ahead of time from JSON files in the repository, and live numbers come from your browser calling public APIs directly.",
    ratings: { first: 4, ops: 5, scale: 5, contain: 4, tiny: 5, teams: 3, vendor: 3, local: 4 },
    incidents: {
      crash: { verdict: "partial", status: { pay: "down" }, users: "Every page loads instantly; only paying fails.", why: "Pages are already built and served from the CDN, so they stay up whatever happens behind them. Only the dynamic parts depend on the APIs." },
      spike: { verdict: "fine", status: { catalog: "hot", cdn: "scaled" }, users: "Nothing changes: pages come from the CDN, close to every visitor.", why: "Pre-built pages are just files, and a CDN is made for exactly this. Nothing of yours has to scale." },
      deploy: { verdict: "fine", status: { orders: "deploy" }, users: "Nothing visible.", why: "The checkout function deploys on its own. Changing pages means rebuilding the site, which takes a minute for small sites and much longer for huge ones." },
      dbslow: { verdict: "fine", status: { db: "slow", build: "slow" }, users: "Visitors notice nothing.", why: "The content database is only read while building, so a slow database makes builds slower, not pages." },
    },
  },
  {
    id: "baas",
    name: "Backend-as-a-Service",
    tagline: "No backend of your own: a provider gives you sign-in, database, files and functions, and the app talks to them directly.",
    parts: {
      client: CLIENT,
      ui: P(104, 124, 112, 92, "Your app", "service", "all your code", "phone"),
      baas: P(236, 16, 392, 308, "Backend-as-a-Service", "container", "Supabase · Firebase · Appwrite"),
      users: P(252, 70, 172, 52, "Auth", "module", "sign-in, sessions", "key"),
      db: P(252, 138, 172, 112, "Database", "db", "rules on every row", "db"),
      catalog: P(266, 190, 70, 46, "products", "table"),
      orders: P(342, 190, 70, 46, "orders", "table"),
      pay: P(440, 70, 172, 52, "ƒ payments", "fn", "cloud function", "bolt"),
      notify: P(440, 138, 172, 52, "Messaging", "module", "push, email", "bell"),
      files: P(440, 206, 172, 52, "Storage", "module", "images, files", "file"),
    },
    edges: [E("client", "ui"), E("ui", "baas"), E("pay", "db"), E("pay", "notify")],
    journey: [
      H("client", "ui", "tap Pay", "Everything starts in your app. There is no server of your own.", false, "data"),
      H("ui", "users", "session", "The provider's Auth already knows who is signed in."),
      H("ui", "orders", "insert order", "The app writes straight to the database. A row rule decides: you may only add orders for yourself.", true, "data"),
      H("ui", "pay", "invoke", "Payments need a secret key, so that one piece runs as a cloud function."),
      H("pay", "orders", "status: paid", "The function marks the order paid.", true, "data"),
      H("pay", "notify", "push", "And sends a push notification.", true, "data"),
      H("orders", "ui", "live update", "The app is subscribed to its orders, so the status changes on screen by itself.", true, "ok"),
    ],
    deploys: "1 app + 1 function",
    dbs: "1, managed",
    best: ["Prototypes and first versions", "Mobile apps with sign-in and sync", "Very small teams, no backend developer"],
    watch: ["Logic spread across app, rules and functions", "Costs grow with every read and write", "Hard to leave the provider later"],
    stack: ["Supabase", "Firebase", "Appwrite", "PocketBase"],
    ratings: { first: 5, ops: 5, scale: 4, contain: 3, tiny: 4, teams: 2, vendor: 1, local: 3 },
    incidents: {
      crash: { verdict: "partial", status: { pay: "down" }, users: "Checkout fails; browsing and sign-in work.", why: "Your own server code is tiny (a function or two), so bugs stay small. The rest is the provider's, already running." },
      spike: { verdict: "fine", status: { db: "hot", baas: "scaled" }, users: "Fine.", why: "The provider scales it for you. The bill grows with reads and writes, and usage pricing can jump at scale." },
      deploy: { verdict: "fine", status: { db: "deploy", ui: "deploy" }, users: "New rules apply at once; app changes arrive as people update.", why: "Most logic lives in the app and the database rules. A rule change is instant, but a mobile app update waits for store review and for users to install it." },
      dbslow: { verdict: "slow", status: { db: "slow", ui: "slow" }, users: "Everything is slow, and there's little you can do.", why: "You can't tune servers you don't run: your queries and indexes are yours, the machines are not. That's the trade for not running a backend." },
    },
  },
];

export const INCIDENTS: { id: IncidentId; label: string; short: string }[] = [
  { id: "crash", label: "Payments code crashes", short: "crash" },
  { id: "spike", label: "10× traffic on product pages", short: "spike" },
  { id: "deploy", label: "Ship a change to Orders", short: "deploy" },
  { id: "dbslow", label: "The database slows down", short: "slow DB" },
];
export const VERDICT: Record<Verdict, { label: string; color: string; bg: string }> = {
  down: { label: "all down", color: "#a3302e", bg: "#fdf0ee" },
  partial: { label: "partly broken", color: "#a8461f", bg: "#fff3ec" },
  slow: { label: "slow", color: "#8a6d00", bg: "#fbf5dd" },
  fine: { label: "fine", color: "#0f6e4c", bg: "#eaf8f1" },
};
export const STATUS: Record<Status, { label: string; color: string }> = {
  down: { label: "down", color: "#c8413f" },
  slow: { label: "slow", color: "#c29a00" },
  scaled: { label: "scaled out", color: "#1baf7a" },
  deploy: { label: "deploying", color: "#eb6834" },
  hot: { label: "busy", color: "#eb6834" },
};

export const RATING_ROWS: [RatingKey, string][] = [
  ["first", "Fast to a first version"],
  ["ops", "Little to run and watch"],
  ["scale", "Scales only the busy part"],
  ["contain", "A bug stays contained"],
  ["tiny", "Cheap while traffic is tiny"],
  ["teams", "Many teams ship independently"],
  ["vendor", "Free to change providers"],
  ["local", "Easy to run on a laptop"],
];

export const STAGES: { arch: ArchId; when: string; team: string; text: string; alongside?: boolean }[] = [
  { arch: "baas", when: "Week 1", team: "1–2 people", text: "Prototype on a backend-as-a-service: sign-in, database and files in an afternoon." },
  { arch: "monolith", when: "Year 1", team: "3–8 developers", text: "The idea works and the logic grows: one app and one database, on a platform like Cloud Run or Render." },
  { arch: "modular", when: "Year 3", team: "10–40 developers", text: "Teams collide in one codebase: put walls between modules before splitting anything." },
  { arch: "micro", when: "Year 5+", team: "50+ developers", text: "Parts with their own team and their own load move out into services, one at a time." },
  { arch: "jamstack", when: "Any time", team: "alongside", text: "Marketing pages, docs and shop pages built ahead and served from a CDN.", alongside: true },
  { arch: "serverless", when: "Any time", team: "alongside", text: "Spiky or scheduled jobs (image resizing, reports, webhooks) as functions beside the rest.", alongside: true },
];

export const FIT_QS: { q: string; opts: { a: string; w: Partial<Record<ArchId, number>> }[] }[] = [
  {
    q: "What are you building first?",
    opts: [
      { a: "A prototype to test an idea", w: { baas: 3, jamstack: 1 } },
      { a: "A product with real business logic", w: { monolith: 2, modular: 1 } },
      { a: "Mostly content: shop, docs, marketing", w: { jamstack: 3 } },
    ],
  },
  {
    q: "How many developers will work on it?",
    opts: [
      { a: "1–5", w: { monolith: 2, baas: 2, jamstack: 1, serverless: 1 } },
      { a: "6–40", w: { modular: 3, monolith: 1 } },
      { a: "More than 40", w: { micro: 3, modular: 1 } },
    ],
  },
  {
    q: "What does traffic look like?",
    opts: [
      { a: "Fairly steady", w: { monolith: 1, modular: 1, micro: 1 } },
      { a: "Spiky, or near zero most of the time", w: { serverless: 3, jamstack: 1, baas: 1 } },
      { a: "Huge, but on a few hot parts", w: { micro: 2, serverless: 1 } },
    ],
  },
  {
    q: "How much control do you need over the backend and data?",
    opts: [
      { a: "Full: custom logic, compliance", w: { modular: 2, monolith: 1, micro: 1 } },
      { a: "Some", w: { serverless: 1, monolith: 1 } },
      { a: "Little: speed matters more", w: { baas: 2, jamstack: 1 } },
    ],
  },
];

export const archById = (id: ArchId) => ARCHS.find((a) => a.id === id) as Arch;
/** The first place a part appears, so a part that enters later starts from a sensible spot. */
export const HOME: Partial<Record<PartId, Place>> = {};
for (const a of ARCHS) for (const [k, v] of Object.entries(a.parts) as [PartId, Place][]) HOME[k] ??= v;
