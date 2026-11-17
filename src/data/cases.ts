import type { StaticImageData } from "next/image";
import fusionBatch from "@/assets/works/automation/fusion-batch.webp";
import fusionPreview from "@/assets/works/automation/fusion-preview.webp";
import budgetBurn from "@/assets/works/budgettower/burn.webp";
import budgetDash from "@/assets/works/budgettower/dashboard.webp";
import kpiDash from "@/assets/works/dashboards/kpi-dash.webp";
import kpiTv from "@/assets/works/dashboards/kpi-tv.webp";
import embedAdmin from "@/assets/works/embedhub/admin.webp";
import ffDash from "@/assets/works/fulfillment/dashboard.webp";
import invDash from "@/assets/works/inventory/dashboard.webp";
import invPurchases from "@/assets/works/inventory/purchases.webp";
import portalMenu from "@/assets/works/portal/menu.webp";
import portalPromotor from "@/assets/works/portal/promotor.webp";
import tmBoard from "@/assets/works/tickmate/board.webp";
import tmDash from "@/assets/works/tickmate/dashboard.webp";
import { TONES, type Tone } from "./case-tones";

/* Content of the "how it works" pages under /work/[slug]. Everything here was read from each app's own source code;
 * screens are the real apps running on made-up demo data. PROTRACK and GatherInsight have hand-built pages of their own. */

type Item = { h: string; p: string };
type Shot = { src: StaticImageData; alt: string; label: string };

export type CaseStudy = {
  slug: string;
  name: string;
  description: string;
  tone: Tone;
  kicker: string;
  title: string;
  highlight?: string;
  lede: string;
  chips: string[];
  shot?: Shot; // no screenshot: the hero draws a forecast chart instead
  dataNote: string;
  flow: { kicker: string; title: string; line?: string; steps: Item[] };
  demo?: { kicker: string; title: string; line: string; cta: string };
  mechanisms: { kicker: string; title: string; line?: string; items: Item[]; shot?: Shot };
  access?: { kicker: string; title: string; line?: string; rows: { who: string; can: string }[] };
  details: { title: string; items: Item[] };
  architecture: { title: string; line?: string; nodes: { where: string; title: string; body: string; main?: boolean; soft?: boolean; parts?: { name: string; what: string }[] }[] };
  stack: { title: string; items: { tech: string; role: string }[] };
};

const DEMO_NOTE = "Screens: the real app running on made-up demo data. No real people, outlets or figures.";

export const cases: CaseStudy[] = [
  // ------------------------------------------------------------------ Portal Channel Operation
  {
    slug: "portals",
    name: "Portal Channel Operation",
    description: "How Portal Channel Operation works: six work areas behind one login, access per page and per tab, CSV masters on Cloud Storage, P&L ingest, purchase validation and live promoter tracking.",
    tone: TONES.ioh,
    kicker: "Indosat · Circle Kalisumapa · 2026",
    title: "Portal Channel Operation: a region's sales ops in one place.",
    highlight: "in one place.",
    lede: "The daily workbench of the channel team. It replaced a pile of separate spreadsheets and one-off tools: partner lists, stock files, allocation and payment tracking, P&L workbooks, revenue rollups, letters and blasts. Teams upload their Excel, the server turns it into clean masters, and everyone sees the slice they're allowed to.",
    chips: ["Built & maintained", "FastAPI · pandas · Cloud Storage", "Vanilla JS · Leaflet · Chart.js"],
    shot: { src: portalMenu, alt: "Portal main menu on demo data: six work areas beside a sidebar with access management and the activity log", label: "portal channel operation · menu" },
    dataNote: DEMO_NOTE,
    flow: {
      kicker: "A working day",
      title: "One login, then only what you're allowed to touch.",
      steps: [
        { h: "Sign in", p: "The password is checked against a bcrypt hash; the server sets an httpOnly cookie holding an 8-hour token with the person's role, access keys and territory." },
        { h: "The app arrives after login", p: "The public page loads only a small boot script. The real app shell and its features are served only to a valid session, so nothing useful is exposed before login." },
        { h: "Pick a work area", p: "Partner, Distribusi, Tools, Data & Referensi, PNL, PSTR. The sidebar shows only the pages this person has; with a single area, the menu is skipped." },
        { h: "Upload, and the master rebuilds", p: "A partner's P&L workbook, a stock file, a revenue export: the server reads it, normalises it and rewrites that slice of the master CSV." },
        { h: "Read, export, notify", p: "Dashboards compute their ratios on the fly, exports are built on the server, and reminders go out by email or WhatsApp." },
      ],
    },
    demo: { kicker: "Try the access rule", title: "Who sees which page, and which tab.", line: "Access is stored as a short list of keys per person: a page, or a page and one of its tabs. Tick boxes and watch what this person would see, using the portal's own rule.", cta: "Try the access rule" },
    mechanisms: {
      kicker: "Under the hood",
      title: "Spreadsheets in, a clean master out.",
      shot: { src: portalPromotor, alt: "Promoter monitoring on demo data: promoters, outlet logins and submitted numbers per region and branch", label: "portal · promotor monitoring" },
      items: [
        { h: "Cloud Storage as the database", p: "Every dataset is a CSV on a bucket, read as bytes with a UTF-8 fallback so one stray character can't break a file, and cached for five minutes until the next write." },
        { h: "P&L that stays correct", p: "Only top-level P&L rows are kept, and percentages are never stored: they're recomputed as metric ÷ net revenue after adding up months and partners, so they never go stale." },
        { h: "Purchase validation", p: "P&L purchases are compared with payment data per partner and month: match = 1 − |a − b| / max, and 95% or more counts as valid. The distributor is found by fuzzy initials, with a confidence floor." },
        { h: "Exports that keep growing", p: "The revenue rollup reads columns by position and accepts sheet-name aliases, because the source export gets wider every month." },
        { h: "Live promoter tracking", p: "Reads the check-ins written by the PROTRACK app: a live map redrawn every 30 s, green for active, grey for checked out, red for fake GPS." },
      ],
    },
    access: {
      kicker: "Who sees what",
      title: "Per page, per tab, per territory.",
      line: "Checked twice: the browser hides what isn't allowed, and every API route refuses it anyway.",
      rows: [
        { who: "Viewer", can: "Reads the pages in their access list. Every write is refused by the server, and write buttons are hidden." },
        { who: "Operator", can: "Works in the pages and tabs granted to them: uploads, edits, exports." },
        { who: "Admin", can: "Everything, plus managing accounts and access, the activity log and GA data." },
        { who: "Territory", can: "Any account can also be pinned to a region, area, branch or MC; rows outside it are filtered out on the server, for every role." },
      ],
    },
    details: {
      title: "What keeps it safe with a whole team in it.",
      items: [
        { h: "Login throttle", p: "Five failed logins per five minutes per IP and username, counted in Firestore so every server instance shares the count." },
        { h: "Edits that don't collide", p: "Account edits read, compare and write with retries; if another admin changed the file meanwhile, the save is refused instead of overwriting." },
        { h: "Security headers", p: "Content policy, HSTS, no framing, nosniff and a strict referrer policy; the API docs are switched off." },
        { h: "Two bundles", p: "The front end ships obfuscated in two parts; the feature bundle is served only after login and never cached, so a new deploy loads without a hard refresh." },
        { h: "Fast dashboards", p: "The stock dashboard reads many daily files in parallel (up to 12 at once) and caches the result." },
        { h: "Activity log", p: "Logins, failures with the reason, and page visits are logged; admins get a searchable view." },
        { h: "Runs offline too", p: "A local mode swaps Cloud Storage and Firestore for folder and JSON stand-ins, so the same code runs on a laptop." },
        { h: "Satellite apps", p: "Stock input (with a Telegram bot), a learning portal, a validation form, field-activity and timeline apps use the same data and API." },
      ],
    },
    architecture: {
      title: "One backend, one bucket, many doors.",
      nodes: [
        { where: "Browser", title: "Portal front end", body: "Vanilla JS app: menus, tables, Chart.js charts, a Leaflet map, document tools." },
        { where: "Google Cloud Run", title: "FastAPI backend", body: "About 30 routers: auth, partner, distribution, P&L, PSTR, tools, validation, activity log.", main: true, parts: [{ name: "Cloud Storage", what: "CSV masters, users, uploads, logs" }, { name: "Firestore", what: "login throttle, promoter check-ins" }] },
        { where: "Around it", title: "Email, WhatsApp, apps", body: "SMTP for accounts and reminders, a WhatsApp sender service, LibreOffice for PDFs, the Telegram stock bot and the satellite apps.", soft: true },
      ],
    },
    stack: {
      title: "What each piece does.",
      items: [
        { tech: "FastAPI + Uvicorn", role: "The API and the protected app shell." },
        { tech: "pandas", role: "Every upload is cleaned, merged and rolled up here." },
        { tech: "Cloud Storage (gcsfs)", role: "The CSV masters that act as the database." },
        { tech: "Firestore", role: "Shared login throttle and the promoter check-ins." },
        { tech: "PyJWT + bcrypt", role: "Sessions and password hashes." },
        { tech: "openpyxl / pyxlsb", role: "Reading Excel uploads, writing exports." },
        { tech: "Vanilla JS, Chart.js, Leaflet", role: "The front end, charts and the live map." },
        { tech: "Docker on Cloud Run", role: "Build (with obfuscation) and hosting." },
      ],
    },
  },

  // ------------------------------------------------------------------ TickMate
  {
    slug: "tickmate",
    name: "TickMate",
    description: "How TickMate works: complaint tickets scoped by region, creators, handlers and supervisors, a chat thread and activity log per ticket, days-open tracking, a dashboard and Excel export.",
    tone: TONES.ticket,
    kicker: "Indosat · Circle Kalisumapa · 2026",
    title: "TickMate: every field complaint, tracked to closed.",
    highlight: "tracked to closed.",
    lede: "Field and ops staff raise complaints here instead of chasing them over chat and email. Each ticket carries its category, severity, brand, system and territory; handlers in the same region pick it up, and the thread, files and every status change stay on the ticket.",
    chips: ["Built end to end", "Next.js · Prisma · SQLite", "JWT with refresh rotation"],
    shot: { src: tmBoard, alt: "TickMate ticket list on demo data with status tabs, filters and severity", label: "tickmate · complaint tickets" },
    dataNote: DEMO_NOTE,
    flow: {
      kicker: "A ticket's life",
      title: "From a complaint to closed, with a trail.",
      steps: [
        { h: "File it", p: "A creator picks region, area and MC from the roster; the server checks the combination and gives the ticket its code inside a transaction." },
        { h: "Triage", p: "A handler sets the status and assigns someone; the list of people to assign is limited to that region." },
        { h: "Talk it through", p: "Messages and attachments go on the ticket. Read receipts drive the unread badges and the inbox." },
        { h: "Close it", p: "Choosing a closed status asks for confirmation, stamps the closing time, locks the ticket and can email the person who raised it." },
        { h: "Report", p: "The dashboard and an Excel export summarise everything in the viewer's own scope." },
      ],
    },
    demo: { kicker: "Try the roles", title: "Same tickets, different people.", line: "Pick a role, a sub-role and a scope. The sidebar, the visible tickets and the allowed actions follow TickMate's own rules.", cta: "Try the roles" },
    mechanisms: {
      kicker: "Under the hood",
      title: "Small rules that keep tickets honest.",
      shot: { src: tmDash, alt: "TickMate dashboard on demo data: totals, open, closed, unassigned, and tickets by status, severity, category, brand and region", label: "tickmate · dashboard" },
      items: [
        { h: "A code that explains itself", p: "TCK-{region}-{creator}-{category}-{number}: each part cleaned to letters and digits and cut to length, the number from one counter incremented in the same transaction." },
        { h: "Days open, in red", p: "Days open = (closed time, or now − created) in whole days; an open ticket turns red from day 3." },
        { h: "Unread means unread", p: "A ticket is unread when its last message came from someone else and is newer than your last read. The inbox merges new messages, status changes and new tickets." },
        { h: "Split regions keep their history", p: "When a region is split, the new ones still see tickets filed under the old one." },
        { h: "Attachments behind a check", p: "Images and PDFs up to 10 MB, stored under the ticket and served only after a region check." },
      ],
    },
    access: {
      kicker: "Who sees what",
      title: "Three roles, three sub-roles, two scopes.",
      line: "A fast token check at the edge, then the server reloads the user and repeats the role checks on every route.",
      rows: [
        { who: "Superadmin", can: "Everything: master data, deleting tickets, editing closed tickets, managing admins." },
        { who: "Admin", can: "Creates and handles tickets; manages user accounts (not other admins)." },
        { who: "Creator", can: "Raises tickets and follows their own; can't change status or assignment." },
        { who: "Handler", can: "Moves tickets along, assigns them and adds feedback." },
        { who: "Supervisor", can: "Monitoring only: status changes and uploads are refused by the server." },
        { who: "Scope", can: "Global sees every region; Region sees its own (and the region it was split from)." },
      ],
    },
    details: {
      title: "The parts nobody sees.",
      items: [
        { h: "Short tokens, rotated", p: "A 15-minute access token and a 7-day refresh token, rotated on every refresh; reusing an old one signs that user out everywhere." },
        { h: "Lockout", p: "Five failed logins lock the account for 15 minutes; unknown usernames still run a dummy hash, so timing gives nothing away." },
        { h: "One quiet refresh", p: "When a request gets a 401, the browser refreshes once (shared by every pending call) and replays it." },
        { h: "Territory checked", p: "An MC needs an area, and the combination must exist in the roster." },
        { h: "Live without websockets", p: "The list and ticket refresh every 5 s, the chat every 3 s, silently; a half-typed feedback is never overwritten." },
        { h: "Deactivate, don't delete", p: "Deleting a user who still has tickets is refused with a hint to deactivate instead." },
        { h: "Excel export", p: "A 17-column sheet of everything in your scope, dated in the file name." },
        { h: "Email only when wanted", p: "The closing email is off by default and goes out without slowing the request." },
      ],
    },
    architecture: {
      title: "One Next.js app, one small database.",
      nodes: [
        { where: "Browser", title: "React screens", body: "Ticket list, ticket thread, inbox, dashboard and admin pages, all talking to the API." },
        { where: "Server", title: "Next.js App Router", body: "Edge token check, server pages and API routes with validation and role checks on each.", main: true, parts: [{ name: "Prisma + SQLite", what: "users, tickets, messages, activity" }, { name: "Disk", what: "attachments, per ticket" }] },
        { where: "Out", title: "Email and Excel", body: "SMTP for the closing email, ExcelJS for exports.", soft: true },
      ],
    },
    stack: {
      title: "What each piece does.",
      items: [
        { tech: "Next.js 16 + React 19", role: "Screens and API in one app." },
        { tech: "Prisma + SQLite", role: "The data, in a single file that's easy to back up." },
        { tech: "jose", role: "Signed access tokens." },
        { tech: "bcryptjs", role: "Password hashes." },
        { tech: "zod", role: "Validating every request body." },
        { tech: "ExcelJS", role: "The Excel export." },
        { tech: "nodemailer", role: "The optional closing email." },
        { tech: "Tailwind CSS", role: "Styling." },
      ],
    },
  },

  // ------------------------------------------------------------------ Embed Hub
  {
    slug: "embedhub",
    name: "Embed Hub",
    description: "How Embed Hub works: admins build menus, data owners paste an Excel-for-the-web embed, viewers open it in a sandbox. One Node file, a JSON store, strict validation of every link.",
    tone: TONES.graphite,
    kicker: "Internal tool · 2026",
    title: "Embed Hub: every team's Excel dashboards, one sidebar.",
    highlight: "one sidebar.",
    lede: "Teams publish their dashboards as Excel for the web, and the links used to live in chats and bookmarks. Embed Hub gives them one home: the admin makes the menus, data owners paste the embed code once, and viewers open it without hunting. Who can see the sheet itself is still decided by Microsoft 365.",
    chips: ["Built end to end", "Node.js, no dependencies", "Cloud Run"],
    shot: { src: embedAdmin, alt: "Embed Hub admin menu on demo content: menus, embedded sheets and counts of menus, data and users", label: "embed hub · admin" },
    dataNote: "Screens: the real app running on demo content. Charts are public sample charts standing in for Excel sheets.",
    flow: {
      kicker: "How it's used",
      title: "Menus, then embeds, then reading.",
      steps: [
        { h: "Admin builds the structure", p: "Creates accounts and sidebar menus (a name and an icon), and puts them in order." },
        { h: "Owner pastes an embed", p: "The iframe code or just the link. The form shows the detected host straight away and offers a sandboxed preview." },
        { h: "Server keeps only a clean link", p: "It pulls out the URL, checks it hard and saves that, never the pasted HTML." },
        { h: "Viewer opens it", p: "Menus with items appear in the sidebar; the sheet opens in a sandboxed frame with reload, full screen and open-in-new-tab." },
      ],
    },
    demo: { kicker: "Try to paste something", title: "What the server accepts, and why.", line: "This is the server's own check, run in your browser. Paste an iframe, a link, or something that shouldn't be there.", cta: "Try the embed check" },
    mechanisms: {
      kicker: "Under the hood",
      title: "Small, strict, and dependency-free.",
      items: [
        { h: "Only the link survives", p: "The src is pulled out of the iframe; anything else with a < is refused; spaces are refused; it must parse as a URL and start with https://. An optional allow-list limits the hosts." },
        { h: "A JSON store that can't half-write", p: "Users, menus, items and sessions live in memory and are saved by writing a temp file and renaming it over the old one." },
        { h: "A header against forged requests", p: "Every write must carry a custom header, checked before login is even looked at; together with strict cookies, other sites can't post on your behalf." },
        { h: "Passwords with scrypt", p: "16-byte salt, 64-byte key, compared in constant time; unknown usernames still run a dummy hash." },
        { h: "Brute force capped", p: "Ten failures in 15 minutes from one address get a 429; a successful login clears the count." },
        { h: "Owners own their items", p: "An owner edits and deletes only their own; deleting a user hands their items to the admin. The last admin can't be removed." },
      ],
    },
    access: {
      kicker: "Who sees what",
      title: "Three roles.",
      rows: [
        { who: "Admin", can: "Accounts, menus and every item." },
        { who: "Data owner", can: "Adds items under any menu and edits or deletes only their own." },
        { who: "Viewer", can: "Reads. Menus without items are hidden from them." },
      ],
    },
    details: {
      title: "Hardening for a one-file server.",
      items: [
        { h: "Content policy", p: "Scripts only from itself, frames only over https, and the hub itself can't be framed." },
        { h: "Sandboxed frames", p: "Embeds run with only the permissions a spreadsheet needs: scripts, forms, popups, downloads, full screen." },
        { h: "Size limits", p: "Request bodies over 100 KB are refused; bad JSON gets a clear 400." },
        { h: "No path tricks", p: "Static files are served only from the public folder, with traversal blocked." },
        { h: "No HTML from users", p: "Every user string is rendered as text, never as HTML." },
        { h: "Sessions", p: "A random token in a strict, httpOnly cookie; only its hash is stored. A password reset ends that user's sessions." },
        { h: "Keyboard first", p: "Ctrl+K searches every page and item." },
        { h: "One instance on purpose", p: "Deployed with a single instance and a mounted bucket, because the store and rate limit live in memory." },
      ],
    },
    architecture: {
      title: "A browser, one Node file and a JSON file.",
      nodes: [
        { where: "Browser", title: "Single-page app", body: "Vanilla JS with a hash router and a command palette; embeds load straight from Microsoft into a sandbox." },
        { where: "Cloud Run", title: "node:http server", body: "Route table, sessions, role checks, validation; no framework, no npm packages.", main: true, parts: [{ name: "JSON store", what: "users, menus, items, sessions" }, { name: "Bucket volume", what: "keeps the store across restarts" }] },
        { where: "Microsoft 365", title: "The sheets", body: "Excel for the web serves the actual dashboards and decides who may see them.", soft: true },
      ],
    },
    stack: {
      title: "What each piece does.",
      items: [
        { tech: "Node.js 18 standard library", role: "HTTP server, crypto (scrypt), files. Zero dependencies." },
        { tech: "Vanilla JS + CSS", role: "The whole front end." },
        { tech: "JSON file store", role: "All data, written atomically." },
        { tech: "Cloud Run + Cloud Storage", role: "Hosting, with the store on a mounted bucket." },
        { tech: "Excel for the web", role: "The embedded dashboards." },
      ],
    },
  },

  // ------------------------------------------------------------------ Fulfillment Manpower
  {
    slug: "fulfillment",
    name: "Fulfillment Manpower",
    description: "How Fulfillment Manpower works: every sales seat for a circle, its regions and agencies; vacant days flagged at 14 and 30, fulfillment against a 95% target, scoped access, and a safe Excel round-trip.",
    tone: TONES.navy,
    kicker: "Indosat · Circle Kalisumapa · 2026",
    title: "Fulfillment Manpower: every sales seat filled, or flagged.",
    highlight: "or flagged.",
    lede: "A circle has a fixed number of field-sales seats, spread over regions, areas and MCs and staffed by outside agencies. This app shows who sits in each seat, how long the empty ones have been empty, and fulfillment against target. It replaces the shared master workbook, and still imports and exports that exact format.",
    chips: ["Built end to end", "Next.js · Firestore", "Excel in, Excel out"],
    shot: { src: ffDash, alt: "Fulfillment dashboard on demo data: quota, active, fulfillment against target, vacant slots, vacant days, fulfillment per region and role", label: "fulfillment · dashboard" },
    dataNote: DEMO_NOTE,
    flow: {
      kicker: "How it's used",
      title: "Every seat accounted for.",
      steps: [
        { h: "Sign in, get scoped", p: "The session says circle, region or agency, and every read is filtered to that." },
        { h: "Read the dashboard", p: "Quota, active, fulfillment against target, vacant seats, average and longest vacancy, and the critical count, then a Region › Area › MC tree." },
        { h: "Work the vacant board", p: "Empty seats, longest first. Filling one takes a name and a join date." },
        { h: "Record a resignation", p: "A date and a reason: the seat turns vacant, the record is archived and the vacancy clock starts." },
        { h: "Sync with Excel", p: "The circle uploads the full workbook (preview, confirm, automatic backup, replace); anyone exports their own scope." },
      ],
    },
    demo: { kicker: "Try the rules", title: "Resign a seat, let the days run.", line: "One made-up MC with eight seats. Resign or fill seats and drag a vacancy's days: the colours and the fulfillment bar follow the app's own thresholds.", cta: "Try the rules" },
    mechanisms: {
      kicker: "Under the hood",
      title: "Seats are the quota.",
      items: [
        { h: "Quota = seats", p: "Each seat has an ID made from its role and a unique key. A new seat starts vacant from today, and only a vacant seat can be deleted." },
        { h: "Vacant days", p: "Days since the resign date, counted in Jakarta time. Over 14 days is yellow, over 30 is red and counted as critical." },
        { h: "Fulfillment", p: "Active ÷ quota against a 95% target: green from 95%, amber from 85%, red below." },
        { h: "Resignations", p: "Reasons are kept, counted per month and ranked; a resign date before the join date or in the future is refused." },
        { h: "A careful Excel import", p: "Up to 10 MB; the file applied must be the very file that was previewed; eight sheets' headers must match; dates are validated; duplicates and unknown areas block the import, warnings don't." },
        { h: "Backup before replace", p: "Every import writes a backup first (the newest 20 are kept), then replaces the data in one go." },
      ],
    },
    access: {
      kicker: "Who sees what",
      title: "Three levels, enforced in the data layer.",
      line: "Checked on the server for every read and write, not only hidden in the screens.",
      rows: [
        { who: "Circle", can: "Everything: Excel upload, backups, users and the audit log." },
        { who: "Region", can: "Its own region's seats; can add, edit or remove seats there." },
        { who: "Agency", can: "Only the seats it staffs; can fill seats and record resignations." },
      ],
    },
    details: {
      title: "The parts nobody sees.",
      items: [
        { h: "Preview with consequences", p: "The upload preview counts added, removed and changed seats per role and warns about active people who would disappear." },
        { h: "Exports that still calculate", p: "The exported workbook has live formulas and highlights duplicate IDs, vacant rows and long vacancies." },
        { h: "Safe writes", p: "The JSON store queues writes and swaps files atomically; Firestore writes in batches, adding before deleting." },
        { h: "Sized for the free tier", p: "One document per MC keeps a full load around 170 reads, with a live cache." },
        { h: "Business rules", p: "Some seat types belong to one agency only, some need a PT; a unique ID can't be edited." },
        { h: "No open redirects", p: "After login it only returns to a local path." },
        { h: "Accounts", p: "New users get a one-time set-password link; a role change signs them out everywhere." },
        { h: "Two modes", p: "Runs on a local JSON file for demos, or Firestore with real sign-in in production." },
      ],
    },
    architecture: {
      title: "Server components over a swappable store.",
      nodes: [
        { where: "Browser", title: "Next.js screens", body: "Dashboard tree, vacant board, roster, resign archive, Excel upload and export." },
        { where: "Cloud Run", title: "Server actions + data layer", body: "Session → scope checks → validation and audit → the store.", main: true, parts: [{ name: "Firestore", what: "seats per MC, resigns, audit, backups" }, { name: "Firebase Auth", what: "sign-in, session cookie, claims" }] },
        { where: "Excel", title: "The master workbook", body: "Imported and exported in the same format the team already used.", soft: true },
      ],
    },
    stack: {
      title: "What each piece does.",
      items: [
        { tech: "Next.js 16 + React 19", role: "Screens and server actions." },
        { tech: "Firestore", role: "Seats, resignations, audit and backups." },
        { tech: "Firebase Auth", role: "Sign-in, session cookies, role claims." },
        { tech: "ExcelJS", role: "Reading and rebuilding the master workbook." },
        { tech: "Node crypto + zlib", role: "Signed demo sessions, file hashes, gzipped backups." },
        { tech: "Docker on Cloud Run", role: "Hosting." },
      ],
    },
  },

  // ------------------------------------------------------------------ Budget Tower
  {
    slug: "budgettower",
    name: "Budget Tower",
    description: "How Budget Tower works: a division's budget from plan to paid. Committed, realized and remaining per quarter, the burn line, PO and goods-receipt progress, all rebuilt from one Excel upload.",
    tone: TONES.tower,
    kicker: "Indosat · Marketing division · 2026",
    title: "Budget Tower: a division's budget, from plan to paid.",
    highlight: "from plan to paid.",
    lede: "Marketing tracked its spending in one big workbook: proposals on one sheet, payment requests, POs and receipts on another, and pivots on top. Budget Tower reads that workbook and shows what's approved, committed, paid and left, quarter by quarter.",
    chips: ["Built end to end", "Next.js · Cloud Storage", "One Excel upload"],
    shot: { src: budgetDash, alt: "Budget Tower dashboard on demo data: budget, committed, realized and remaining, SC/SR, PO and GR progress, quarter progress", label: "budget tower · dashboard" },
    dataNote: DEMO_NOTE,
    flow: {
      kicker: "How it's used",
      title: "Set the budget, upload, read.",
      steps: [
        { h: "Set the budget", p: "Q1–Q4 per division and year; the yearly total is their sum." },
        { h: "Upload the workbook", p: "The proposals sheet and the payments sheet, read by column position from row 12; the upload replaces that division and year." },
        { h: "Read the dashboard", p: "Budget, committed, realized and remaining; PO and goods-receipt progress; quarters; the burn chart; breakdowns; the approval pipeline." },
        { h: "Drill down or export", p: "Every number opens the matching rows, already filtered; export rebuilds the workbook." },
      ],
    },
    demo: { kicker: "Try a quarter", title: "Watch a quarter fill up.", line: "Move the budget, what's committed and what's been paid. The bar and the colour follow Budget Tower's own rules.", cta: "Try a quarter" },
    mechanisms: {
      kicker: "Under the hood",
      title: "Three numbers, computed the same way everywhere.",
      shot: { src: budgetBurn, alt: "Budget Tower burn chart on demo data: budget pace, committed, realized and remaining across the year", label: "budget tower · burn chart" },
      items: [
        { h: "Committed, realized, remaining", p: "Committed = the proposals' Plan Cost; realized = the payments' Accurate Cost; remaining = budget − committed. Per category, brand and name it also shows what's committed but not yet paid." },
        { h: "Quarter meter", p: "Committed ÷ budget, red from 100% and amber from 80%, because here high is bad. The bar shows paid, committed-but-unpaid and what's left." },
        { h: "Burn chart", p: "Twelve cumulative months against a pace line that grows through each quarter's budget; the realized line stops at the last month with data. Drawn by hand in SVG." },
        { h: "Payment pipeline", p: "Requests with a PO, POs with a goods receipt (counted by amount, since dates are often missing), and the average %PO and %GR." },
        { h: "Outstanding proposals", p: "Grouped by how long they've waited: 0–30, 31–90 and 90+ days, the oldest first." },
      ],
    },
    access: {
      kicker: "Who sees what",
      title: "Admins and members.",
      rows: [
        { who: "Admin", can: "Budgets, uploads, users and divisions. The last admin can't be removed." },
        { who: "Member", can: "Reads the dashboards; can be limited to certain divisions." },
      ],
    },
    details: {
      title: "The parts that make a messy workbook readable.",
      items: [
        { h: "Ghost rows ignored", p: "The template numbers hundreds of empty rows; a row only counts if its real fields are filled." },
        { h: "No 1899 dates", p: "A stray date in a text column is treated as blank, and Excel serial dates are converted properly." },
        { h: "Honest revenue", p: "Actual revenue is added only for proposals that reported it, since a blank cell turns into a huge negative in the sheet." },
        { h: "Filters that cascade", p: "Each dropdown offers only the values left after every other filter." },
        { h: "A moving GR column", p: "If the GR date column is missing, everything after it shifts and is read one column earlier." },
        { h: "Strong passwords", p: "12+ characters with mixed case, a digit and a symbol, hashed with bcrypt." },
        { h: "Brute force capped", p: "Login attempts are capped per address and per email, uploads per address." },
        { h: "Security headers", p: "Content policy, HSTS and no framing." },
      ],
    },
    architecture: {
      title: "A workbook in, a dashboard out.",
      nodes: [
        { where: "Browser", title: "Dashboards and tables", body: "KPI cards, quarter meters, the SVG burn chart, filtered tables, export." },
        { where: "Cloud Run", title: "Next.js server", body: "Upload API parses the workbook; the dashboard is computed on the server from the stored rows.", main: true, parts: [{ name: "Cloud Storage", what: "budgets, uploads, users as JSON" }, { name: "next-auth", what: "credentials, 8-hour sessions" }] },
        { where: "Excel", title: "Monitoring workbook", body: "The same file the team already keeps, uploaded as is.", soft: true },
      ],
    },
    stack: {
      title: "What each piece does.",
      items: [
        { tech: "Next.js 14 + React 18", role: "Pages, server actions and API routes." },
        { tech: "SheetJS", role: "Reading the workbook and writing the export." },
        { tech: "Cloud Storage", role: "Everything stored as JSON files; no database to run." },
        { tech: "next-auth", role: "Email and password login with JWT sessions." },
        { tech: "bcryptjs", role: "Password hashes." },
        { tech: "Hand-written SVG", role: "The burn chart, no chart library." },
        { tech: "Docker on Cloud Run", role: "Hosting, with the secret in Secret Manager." },
      ],
    },
  },

  // ------------------------------------------------------------------ InvenTory
  {
    slug: "inventory",
    name: "InvenTory",
    description: "How InvenTory works: staff log event purchases with a receipt photo, admins approve or send back, the master admin sets the lists. Note codes by event, category and date; spend per category, event and item.",
    tone: TONES.receipt,
    kicker: "Internal tool · 2026",
    title: "InvenTory: every purchase with its receipt.",
    highlight: "with its receipt.",
    lede: "Field staff buy supplies for events and used to keep receipts in their pockets and recaps in spreadsheets. Now each receipt is logged with its items and a photo, an admin reviews it, and the totals add up on their own.",
    chips: ["Built end to end", "Next.js · Firebase", "Cloud Run"],
    shot: { src: invDash, alt: "InvenTory dashboard on demo data: receipts, value, categories, events, waiting and approved, and the trend of spend", label: "inventory · dashboard" },
    dataNote: DEMO_NOTE,
    flow: {
      kicker: "A purchase",
      title: "From a receipt to the totals.",
      steps: [
        { h: "Set the lists", p: "The master admin sets categories and events (each with a code), units and regions." },
        { h: "Log the purchase", p: "Event, date, location and vendor, the items, and a photo of the receipt, compressed on the phone." },
        { h: "The server files it", p: "It validates everything again, decides the starting status, reserves the next number and uploads the photos." },
        { h: "Review", p: "Status tabs and filters; approve, ask for a revision or reject, one by one or in bulk." },
        { h: "Read and export", p: "Spend per category, event and item, a trend over time, and an Excel export." },
      ],
    },
    demo: { kicker: "Try it", title: "Log a purchase, then review it.", line: "Pick who you are and what you bought. The note code and the starting status follow InvenTory's own rules; switch to an admin to review.", cta: "Try it" },
    mechanisms: {
      kicker: "Under the hood",
      title: "A code that tells you what it is.",
      shot: { src: invPurchases, alt: "InvenTory purchases on demo data: note codes, vendors, events, totals, locations, who made them and their status", label: "inventory · purchases" },
      items: [
        { h: "Note code", p: "{event}-{category of the first item}-{DDMMYYYY}-{3-digit number}. The number counts per event code, reserved in a transaction so two submissions never share one." },
        { h: "Starting status", p: "Staff purchases start pending; the master admin's are approved; an admin's are approved unless the setting “admin purchases need approval” is on." },
        { h: "Light photos", p: "Resized to at most 1600 px and saved as JPEG on the phone, kept as is if that isn't smaller; the camera opens directly." },
        { h: "Bulk input", p: "An Excel template, read in the browser and grouped by a note-group column; each group gets its own code." },
        { h: "Totals computed, not typed", p: "Line totals and the receipt total are calculated on the server." },
      ],
    },
    access: {
      kicker: "Who sees what",
      title: "Three roles.",
      rows: [
        { who: "Staff", can: "Logs purchases and sees only their own; can delete one while it's still pending." },
        { who: "Admin", can: "Reviews everything, works in bulk, exports." },
        { who: "Admin Master", can: "All of that, plus users, the lists and the approval setting." },
      ],
    },
    details: {
      title: "The parts nobody sees.",
      items: [
        { h: "Nothing written from the browser", p: "Database and storage rules refuse all client writes; everything goes through the server." },
        { h: "Checked twice", p: "Every field the form checks is checked again on the server, including the receipt photo." },
        { h: "Suspend works at once", p: "Suspending a user disables their account, and their session is refused on the next request." },
        { h: "Indexes for the lists", p: "Queries by person and by status are backed by indexes." },
        { h: "Builds without secrets", p: "The storage client starts lazily, so the app builds with no credentials present." },
        { h: "Session", p: "The phone signs in, then trades its ID token for a 14-day httpOnly session cookie." },
        { h: "Inactive items hidden", p: "Retired categories and events disappear from the form but stay on old receipts." },
        { h: "Cleanup", p: "Deleting a receipt removes its photos too." },
      ],
    },
    architecture: {
      title: "Server actions over Firebase.",
      nodes: [
        { where: "Phone or laptop", title: "Next.js screens", body: "Purchase form with camera, bulk import, review table, charts, export." },
        { where: "Cloud Run", title: "Server actions", body: "Validation, status, note numbers, photo upload, review.", main: true, parts: [{ name: "Firestore", what: "receipts, lists, users, counters" }, { name: "Cloud Storage", what: "receipt and item photos" }] },
        { where: "Firebase Auth", title: "Sign-in", body: "Used on the phone only to sign in; the server takes over with a session cookie.", soft: true },
      ],
    },
    stack: {
      title: "What each piece does.",
      items: [
        { tech: "Next.js 16 + React 19", role: "Screens and server actions." },
        { tech: "firebase-admin", role: "Sessions, Firestore and Storage from the server." },
        { tech: "Firebase JS SDK", role: "Sign-in on the device." },
        { tech: "SheetJS", role: "Bulk template, import and export." },
        { tech: "Recharts", role: "The dashboard charts." },
        { tech: "Docker, Cloud Build, Cloud Run", role: "Build and hosting." },
      ],
    },
  },

  // ------------------------------------------------------------------ Automation
  {
    slug: "automation",
    name: "Automation",
    description: "How the automation works: a web app that replaced the Oracle Fusion sales-order macro (template in, checked, numbered, three import CSVs out), plus browser bots for Oracle Fusion, Mobii, SalesHub, Mobile Money and WhatsApp.",
    tone: TONES.lavender,
    kicker: "Indosat Sales & Distribution · 2026",
    title: "Bots that clear the busywork in enterprise portals.",
    highlight: "clear the busywork",
    lede: "The biggest piece replaced an Excel macro: staff upload a quantity sheet, every row is matched to the customer master, rows become sales orders with their Oracle numbers, and the three files Oracle Fusion imports come out zipped. Around it, small browser bots do the clicking in the portals people used to click through by hand.",
    chips: ["Built end to end", "FastAPI · SQLite", "Chrome extensions · Playwright"],
    shot: { src: fusionPreview, alt: "Fusion SO Import preview on demo data: orders and lines ready, two rows skipped with the reason, and the batch history", label: "fusion so import · preview" },
    dataNote: DEMO_NOTE,
    flow: {
      kicker: "Sales orders, from a sheet",
      title: "Upload, check, generate.",
      steps: [
        { h: "Upload", p: "Pick the brand, the product tab and the transaction date, then upload the quantity sheet: one row per dealer, one column per product." },
        { h: "Match", p: "Each row is matched to the customer master (ship-to and sold-to) and each product to its order type." },
        { h: "Preview", p: "Totals, rows skipped with the reason, warnings, and the orders about to be created; errors download as Excel." },
        { h: "Generate", p: "Numbers are assigned in one locked transaction; the three import CSVs, a ZIP and a filled copy of the original macro workbook are written." },
        { h: "Send", p: "The batch page offers the downloads and can email them." },
      ],
    },
    demo: { kicker: "Try a sheet", title: "Rows in, orders out.", line: "A tiny made-up customer master. Edit the sheet: rows are grouped into orders and numbered the way the app does it, and anything that doesn't match is skipped with the reason.", cta: "Try a sheet" },
    mechanisms: {
      kicker: "Under the hood",
      title: "Byte-for-byte what Oracle expects.",
      shot: { src: fusionBatch, alt: "A generated batch on demo data: source transaction identifiers and numbers, order types, customers and lines", label: "fusion so import · batch" },
      items: [
        { h: "A forgiving reader", p: "Finds the header in the first rows by its key column, accepts several spellings of Sold To and Ship To, reads 1.000 and 1,000 as thousands, cleans codes like 3530000023.0, and skips blanks and zeros." },
        { h: "Matching", p: "Ship To → the dealer's site (Party Site ID); Sold To → the customer's billing site (Account Site ID). If a dealer sits under several customers, the row's own customer wins, with a warning." },
        { h: "One order per group", p: "Rows group into one order per ID Mobo, ship-to, sold-to and order type; the same product twice is summed, with a warning." },
        { h: "Numbering", p: "Identifier = circle + date + a 3-digit sequence; number = order-type code + 4 + circle code + 9 digits. Both counters reset monthly and can be set by hand." },
        { h: "Exact output", p: "Fixed column counts, CRLF, UTF-8 without BOM; a test checks the files match the macro's sample byte for byte." },
        { h: "The macro, kept", p: "The original .xlsm is filled at the XML level so its buttons still work; if that fails, the CSVs still go out." },
      ],
    },
    access: {
      kicker: "The bots around it",
      title: "Clicking, done by software.",
      line: "Small tools, each for one portal. Most are Chrome extensions that work inside the page the person is already signed in to.",
      rows: [
        { who: "Oracle Fusion", can: "Download sales-order PDFs in bulk, schedule acknowledgement reports, cancel orders (dry-run by default, with a limit per run), add email and phone contacts to customer sites from Excel." },
        { who: "Mobii", can: "Approve orders in the inbox, upload CSV changes, add transition nodes to users, edit parent values per sub-district, keep the session alive." },
        { who: "SalesHub", can: "Update user data and validate IDs from Excel, through the app's accessibility tree (it's Flutter Web)." },
        { who: "Mobile Money", can: "Pull the transaction report one day at a time over a date range, as an extension or a Playwright tool." },
        { who: "Reports to WhatsApp", can: "BigQuery → Excel master → Outlook email → WhatsApp, with a WhatsApp sender service and a small 3D office that shows each bot's status." },
      ],
    },
    details: {
      title: "The parts nobody sees.",
      items: [
        { h: "Sessions", p: "PBKDF2 with 240,000 rounds, a 12-hour session, five failed logins in five minutes per user and address get a 429." },
        { h: "Reports from billing", p: "Billing and shipping exports become a monthly report by circle, region, branch and partner: allocation, paid and waiting payment." },
        { h: "Readable errors", p: "The error workbook has summary, error and warning tabs, frozen headers and filters." },
        { h: "Fast enough", p: "Customer lookups are batched 500 keys at a time; SQLite runs in WAL mode so reading never waits for a big import." },
        { h: "History", p: "Every page has its own audit trail in a side panel." },
        { h: "Email, carefully", p: "A test-connection button, the password never shown again, an 18 MB attachment cap and a mail log." },
        { h: "Bots that stop", p: "Destructive bots run dry by default, ask before acting, cap each run and stop at the first error." },
        { h: "Always on", p: "Runs on an office machine, restarted by the scheduler if it isn't listening." },
      ],
    },
    architecture: {
      title: "A small server and a shelf of bots.",
      nodes: [
        { where: "Browser", title: "Server-rendered pages", body: "Upload, preview, batches, counters, customers, materials, reports, email." },
        { where: "Office machine", title: "FastAPI", body: "Login, template reader, planner, numbering, CSV and ZIP writer, report builder, mailer.", main: true, parts: [{ name: "SQLite", what: "master data, counters, batches, audit" }, { name: "Files", what: "ZIPs, filled macro, error reports" }] },
        { where: "Chrome + Node", title: "The bots", body: "Extensions inside Oracle Fusion, Mobii, SalesHub and Mobile Money; Playwright for long report pulls; a WhatsApp sender service.", soft: true },
      ],
    },
    stack: {
      title: "What each piece does.",
      items: [
        { tech: "FastAPI + Uvicorn", role: "The sales-order web app." },
        { tech: "Jinja2", role: "Server-rendered pages." },
        { tech: "openpyxl", role: "Reading templates, writing reports and error files." },
        { tech: "SQLite", role: "Master data, counters and history." },
        { tech: "csv, zipfile, XML", role: "The Oracle import files and the filled macro." },
        { tech: "Chrome extensions (MV3)", role: "Bots inside the portals." },
        { tech: "Playwright", role: "Long, unattended report pulls." },
        { tech: "Node + Baileys", role: "The WhatsApp sender." },
      ],
    },
  },

  // ------------------------------------------------------------------ Dashboards
  {
    slug: "dashboards",
    name: "Dashboards",
    description: "How the dashboards work: a D-1 KPI wall on the office TV rebuilt from the morning's Excel exports, a self-serve GA dashboard with pivots and Sankey flows, and a partner quadrant.",
    tone: TONES.gold,
    kicker: "Indosat & Telkomsel distribution · 2024–26",
    title: "Dashboards that outgrew Power BI.",
    highlight: "outgrew Power BI.",
    lede: "The main one runs on the office TV: yesterday's sales KPIs for every region and branch, worst performers first, rebuilt by itself whenever a fresh export lands in its folder. Next to it, a self-serve GA dashboard and a partner quadrant replace hand-built pivots and a long Excel formula.",
    chips: ["Built end to end", "Python · pandas", "Next.js · SQLite · SVG"],
    shot: { src: kpiTv, alt: "D-1 KPI TV dashboard on demo data: scorecards and a table of every region, area and branch", label: "d-1 kpi dashboard · office tv" },
    dataNote: DEMO_NOTE,
    flow: {
      kicker: "The TV, every morning",
      title: "Drop the file, the TV catches up.",
      steps: [
        { h: "Drop or upload exports", p: "Through a login-gated admin page, each file goes to its category folder: sell-in, brand KPIs, PSOTTR, targets, DSE." },
        { h: "Newest file wins", p: "In each folder the most recently modified file is read, whatever its name." },
        { h: "Compute", p: "pandas rolls everything up to circle, region and branch; IOH is IM3 plus 3ID." },
        { h: "Serve", p: "The TV asks for fresh numbers every five minutes and for display settings every 20 seconds." },
        { h: "Cycle", p: "Five pages (D-1, PSOTTR, Rollable Summary, KPI Dash, DSE Productivity) rotate through the brands on their own." },
      ],
    },
    demo: { kicker: "Try the colours", title: "When does a branch turn red?", line: "Move one branch's numbers. Achievement, growth and the worst-first order follow the TV's own rules. Below it, score a distributor on the partner quadrant.", cta: "Try the rules" },
    mechanisms: {
      kicker: "Under the hood",
      title: "Built to run unattended.",
      shot: { src: kpiDash, alt: "KPI Dash on demo data: each parameter as a card with every region and branch, scrolling across the TV", label: "d-1 kpi dashboard · kpi dash" },
      items: [
        { h: "Re-read only when files change", p: "A signature of each newest file's path, modified time and size; the heavy parse runs again only when it changes." },
        { h: "Worst first", p: "Regions and branches are sorted by achievement, lowest first, missing values last; sister regions stay side by side." },
        { h: "Colours that agree with the text", p: "Achievement is rounded to one decimal before colouring: 100% and up green, 80% and up amber, below red. Growth gets an arrow only beyond ±0.05%." },
        { h: "Numbers a TV can show", p: "Scaled to K, M, Bn and Tn with one decimal; English units, because the Indonesian “M” means billions." },
        { h: "GA Sankey", p: "Two to four stages (for example channel → outlet category → region); each keeps its top nodes and the rest become “Lainnya”; drawn as hand-written SVG curves." },
        { h: "Partner quadrant", p: "Willingness and capability are weighted averages; 80 and up on both is Strategic, then Performance, Growth and At Risk." },
      ],
    },
    access: {
      kicker: "Who sees what",
      title: "Open on the TV, locked behind it.",
      rows: [
        { who: "The TV", can: "The display and its data are public on purpose, so it keeps showing numbers unattended." },
        { who: "TV admin", can: "Uploads and settings need a login: PBKDF2 with 200,000 iterations, no default password, 12-hour sessions." },
        { who: "GA dashboard", can: "Everyone signs in; admins import data and edit layouts, viewers explore." },
      ],
    },
    details: {
      title: "Small things a wall screen needs.",
      items: [
        { h: "Never stale code", p: "Every response says no-store, so the kiosk browser never keeps an old version." },
        { h: "Last good data stays", p: "If a refresh fails, the last numbers stay up under a banner." },
        { h: "Clear upload errors", p: "Each category accepts only its file types up to 30 MB, and the browser gets the real error message." },
        { h: "Lower is better, sometimes", p: "For travel time an up arrow is coloured as bad." },
        { h: "Data as of", p: "Each page shows its own data date, set by the admin or taken from its files." },
        { h: "Shared layouts", p: "The GA dashboard's widgets are dragged into place; other people's edits arrive every few seconds, with the last 300 versions kept." },
        { h: "Tidy imports", p: "Marketing names are trimmed and the most common spelling wins among case variants." },
        { h: "Pivot engine", p: "Subtotals per level, empty values labelled, and capped at 5,000 rows and 40 columns." },
      ],
    },
    architecture: {
      title: "Three tools, one idea: no manual pivots.",
      nodes: [
        { where: "Office TV", title: "D-1 KPI dashboard", body: "Excel folders → a Python pipeline (pandas, openpyxl, pyxlsb) with a signature cache → a standard-library server → the TV page.", main: true },
        { where: "Web", title: "GA dashboard", body: "CSV and Excel imports → SQLite through Prisma → pivots, charts and Sankey widgets in Next.js." },
        { where: "Web", title: "Partner quadrant", body: "A static site: scores in the browser, a Chart.js bubble chart, config as JSON.", soft: true },
      ],
    },
    stack: {
      title: "What each piece does.",
      items: [
        { tech: "Python http.server", role: "The TV's server, no framework." },
        { tech: "pandas, openpyxl, pyxlsb", role: "Reading the Excel exports." },
        { tech: "Vanilla JS + CSS", role: "The TV page, its cycling and marquees." },
        { tech: "Next.js + Prisma + SQLite", role: "The GA dashboard." },
        { tech: "Hand-written SVG", role: "The Sankey flows." },
        { tech: "Express + Chart.js", role: "The partner quadrant." },
      ],
    },
  },

  // ------------------------------------------------------------------ Bitumen
  {
    slug: "bitumen",
    name: "Bitumen forecast",
    description: "How the bitumen price forecast works: data from several subsidiaries merged with SQL, a recurrent neural network forecasting FOB Bitumen Singapore prices, and a Streamlit dashboard for stakeholders.",
    tone: TONES.cream,
    kicker: "Kalla Group · 2023",
    title: "Forecasting bitumen prices with a neural network.",
    highlight: "a neural network.",
    lede: "Bitumen is bought in bulk and its price moves with oil. This began as my thesis and became a dashboard stakeholders check: data from several subsidiaries brought together, a recurrent neural network forecasting the FOB Bitumen Singapore price, and the result on a page anyone can open.",
    chips: ["Big Data Analyst", "RNN · time series", "Streamlit · Plotly"],
    dataNote: "The notebook and data aren't part of this portfolio, so this page sticks to the approach.",
    flow: {
      kicker: "From data to a decision",
      title: "Four steps from scattered data to a forecast.",
      steps: [
        { h: "Bring the data together", p: "Records from several subsidiaries, merged with SQL into one clean series." },
        { h: "Shape the series", p: "Prices ordered in time and cut into windows: the past values the model sees, and the value it has to predict." },
        { h: "Train the network", p: "A recurrent neural network learns from those windows, carrying what it saw earlier forward through the sequence." },
        { h: "Put it in front of people", p: "A Streamlit app with Plotly charts shows the history and the forecast, so the forecast is used, not filed." },
      ],
    },
    mechanisms: {
      kicker: "Why a recurrent network",
      title: "A model that reads prices in order.",
      items: [
        { h: "Order matters", p: "A price series isn't a bag of numbers: yesterday says more than last year. A recurrent network reads the window step by step and keeps a running memory." },
        { h: "Windows, not single points", p: "Each training example is a stretch of past prices and the price that followed, so the model learns patterns over time." },
        { h: "Checked on unseen time", p: "A forecast model is judged on a later period it never trained on, the way it will be used." },
        { h: "A dashboard, not a report", p: "Stakeholders open the app and see the latest forecast next to the history, instead of waiting for a document." },
      ],
    },
    details: {
      title: "What it took beyond the model.",
      items: [
        { h: "Data from many places", p: "Several subsidiaries, several formats, one series." },
        { h: "SQL first", p: "The merge and cleaning happened in SQL before any modelling." },
        { h: "Interactive charts", p: "Plotly charts people can zoom and hover." },
        { h: "From thesis to tool", p: "The research became something people use." },
      ],
    },
    architecture: {
      title: "From databases to a dashboard.",
      nodes: [
        { where: "Subsidiaries", title: "Source data", body: "Records from several companies in the group.", soft: true },
        { where: "Analysis", title: "SQL + Python", body: "Merging, cleaning, windowing and training the recurrent network.", main: true },
        { where: "Web", title: "Streamlit app", body: "History and forecast in Plotly charts for stakeholders." },
      ],
    },
    stack: {
      title: "What each piece does.",
      items: [
        { tech: "SQL", role: "Merging the subsidiaries' data." },
        { tech: "Python", role: "Preparing the series and training." },
        { tech: "Recurrent neural network", role: "The forecasting model." },
        { tech: "Streamlit", role: "The dashboard app." },
        { tech: "Plotly", role: "Interactive charts." },
      ],
    },
  },
];

export const getCase = (slug: string) => cases.find((c) => c.slug === slug);
