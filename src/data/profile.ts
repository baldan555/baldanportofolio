// All portfolio copy lives here — kept short on purpose (few words, easy to read).
// One file so it can move to MDX / next-intl later.

export const profile = {
  name: "N.I.S. Baldanullah",
  firstName: "Baldan",
  role: "Full Stack Data Scientist",
  city: "Makassar",
  location: "Makassar · Jakarta, Indonesia",
  email: "baldanullah55@gmail.com",
  phone: "+6281245941155",
  whatsapp: "https://wa.me/6281245941155",
  linkedin: "https://linkedin.com/in/baldanullah",
  github: "https://github.com/baldan555",
  cv: "/cv-baldanullah.pdf", // the international CV; every format is in public/cv/ (docs/cv/build.mjs), picked in components/cv-picker.tsx
};

// Rotating titles in the hero.
export const roles = ["Data Scientist", "SaaS Builder", "Automation Engineer", "Web & Mobile Dev"];

export const heroIntro = {
  hello: "Hi, I'm Baldan",
  lead: "I build data products, end to end.",
  body: "From ML models and dashboards to Next.js SaaS, mobile field apps and bots that do the busywork.",
  sub: "Data · Software · Automation · AI",
};

export const statement =
  "I don't stop at the insight. I build the whole thing: the app that collects the data, the model that reads it, and the automation that acts on it.";

export const workedWith = [
  "Indosat Ooredoo Hutchison",
  "Telkomsel Distributor",
  "Kalla Group",
  "Bangkit Academy",
  "Mitracomm Ekasarana",
  "INIPASTI Communika",
];

// "What I build": one capability per chapter. Steps light up as you scroll.
/** "What I build": broad areas, each with the kinds of things in it (no tech stack here: the skill pages go into tools). */
export type Capability = {
  key: "web" | "mobile" | "dashboards" | "automation" | "data" | "ai";
  tab: string;
  title: string;
  line: string;
  /** what the work involves, in order; each lights up a stage of the drawing next to it */
  steps: string[];
  /** the kinds of things built in this area */
  kinds: string[];
  /** real examples, in the handwritten note */
  example: string;
};

export const capabilities: Capability[] = [
  {
    key: "web",
    tab: "Web",
    title: "Web apps",
    line: "Products, portals and internal tools that people log into every day.",
    steps: ["Shaped around how the team really works", "Records and search that stay fast", "Roles and permissions, in two languages", "Online, secure and kept running"],
    kinds: ["SaaS products", "Company portals", "Client portals", "Booking & ordering", "Admin consoles", "Internal tools"],
    example: "GatherInsight, Portal Channel Operation, TickMate",
  },
  {
    key: "mobile",
    tab: "Mobile",
    title: "Mobile apps",
    line: "Apps for people out in the field, and for customers on the go.",
    steps: ["Camera, GPS and barcode built in", "Works offline, syncs when back online", "A web console to follow the team", "Content and users managed by the office"],
    kinds: ["Field & sales apps", "Check-in & attendance", "Surveys & data collection", "Customer apps", "Stock & barcode", "Android & iPhone"],
    example: "PROTRACK, GatherInsight field apps",
  },
  {
    key: "dashboards",
    tab: "Dashboards",
    title: "Dashboards",
    line: "Numbers people can read at a glance, and act on.",
    steps: ["Data pulled in automatically, every day", "Checked and combined into one source", "Charts, maps and targets in one view", "On laptops, phones and the office TV"],
    kinds: ["KPI & sales", "Operations", "Maps & territory", "Finance & revenue", "Wall displays", "Scheduled reports"],
    example: "KPI, revenue and distribution dashboards",
  },
  {
    key: "automation",
    tab: "Automation",
    title: "Automation",
    line: "Repetitive work handed to software, so people do the thinking.",
    steps: ["Starts on a schedule, a file or an event", "Does the clicks and data entry", "Sends the reports and emails", "Tells the team when it's done"],
    kinds: ["Report bots", "Approvals & workflows", "Data entry", "Email & WhatsApp alerts", "System integrations", "Scheduled jobs"],
    example: "portal bots, partner emails, ticket automation",
  },
  {
    key: "data",
    tab: "Data",
    title: "Data pipelines",
    line: "Data from every system, cleaned and in one place, on time.",
    steps: ["Collected from every app and spreadsheet", "Cleaned, checked and de-duplicated", "Stored in one place everyone trusts", "Refreshed on time, with an alert if not"],
    kinds: ["Data warehouses", "Pipelines", "Data quality checks", "Spreadsheets to database", "APIs & integrations", "Scheduled refresh"],
    example: "the daily data behind the KPI dashboards",
  },
  {
    key: "ai",
    tab: "AI",
    title: "Applied AI",
    line: "Models that forecast, spot patterns and answer questions.",
    steps: ["Learns from the data you already have", "Forecasts and predicts what comes next", "Assistants that answer in plain words", "Built into the tools people already use"],
    kinds: ["Forecasting", "Risk & churn scoring", "Computer vision", "Chat assistants", "AI agents", "Document reading"],
    example: "price forecasting, plus 30+ models on this site",
  },
];

export type Work = {
  slug: string;
  title: string;
  line: string;
  org: string;
  year: string;
  role: string;
  tags: string[];
  visual: "saas" | "phone" | "portal" | "automation" | "quadrant" | "forecast";
  points: { h: string; p: string }[];
  /** the live product, opened in a new tab from the card */
  url?: string;
  /** button text for that link; default "Visit <name>" */
  urlLabel?: string;
  /** chip on the screenshot when there is a link; default "live site" */
  urlChip?: string;
  /** brand colour for the card; default is the site's cream */
  theme?: "blue" | "magenta" | "navy" | "ioh" | "graphite" | "gold" | "lavender" | "ticket" | "tower" | "receipt" | "actions";
  /** a page on this site that explains how it works */
  case?: string;
  /** button text for that page; default "How <name> works" */
  caseLabel?: string;
};

export const works: Work[] = [
  {
    slug: "gatherinsight",
    title: "GatherInsight: research data that comes with its proof.",
    line: "Surveys, interviews, traffic counts and geo mapping. One web platform, three mobile apps.",
    org: "Own SaaS product",
    year: "2026",
    role: "Full-stack builder",
    tags: ["Next.js", "PostgreSQL", "Expo"],
    visual: "saas",
    url: "https://gatherinsight.baldanproject.my.id/",
    theme: "blue",
    case: "/work/gatherinsight",
    caseLabel: "How the field apps work",
    points: [
      { h: "Web platform.", p: "Next.js, Prisma and PostgreSQL, bilingual ID/EN." },
      { h: "Three mobile apps.", p: "Expo apps with offline sync, GPS and audio." },
      { h: "On Google Cloud.", p: "Cloud Run, Cloud SQL, Storage and Scheduler." },
    ],
  },
  {
    slug: "devops",
    title: "This site: shipped by its own pipeline.",
    line: "Its code is public on GitHub. Every push is linted, built and checked; main goes out to Cloud Run through Terraform, with no stored cloud keys and no manual deploys.",
    org: "Own project · this site",
    year: "2026",
    role: "DevOps",
    tags: ["GitHub Actions", "Terraform", "Cloud Run"],
    visual: "saas",
    url: "https://github.com/baldan555/baldanportofolio",
    urlLabel: "See the code",
    urlChip: "public repo",
    theme: "actions",
    case: "/work/devops",
    caseLabel: "How it ships",
    points: [
      { h: "Push to live.", p: "Lint, build, Terraform checks, image, rollout and a smoke test, on every push to main." },
      { h: "No keys stored.", p: "GitHub signs in to Google Cloud with short-lived tokens (Workload Identity Federation)." },
      { h: "Infra as code.", p: "Registry, service and access in Terraform, with a plan on every pull request." },
    ],
  },
  {
    slug: "protrack",
    title: "PROTRACK: proof the promoter was really at the outlet.",
    line: "The field app Indosat promoters work in: check in at the outlet, record each SIM card sold, see whether it activated.",
    org: "Indosat · Circle Kalisumapa",
    year: "2026",
    role: "Built end to end",
    tags: ["FastAPI", "Firestore", "Android"],
    visual: "phone",
    theme: "magenta",
    case: "/work/protrack",
    points: [
      { h: "Geofenced check-in.", p: "Within 500 m of the outlet, photo from the camera only." },
      { h: "Hard to fake.", p: "Fake GPS, replayed requests and impossible jumps rejected." },
      { h: "Every SIM once.", p: "Barcode scan, atomic claim, activation checked." },
    ],
  },
  {
    slug: "portals",
    title: "Portal Channel Operation: a region's sales ops in one place.",
    line: "The daily workbench of Indosat's Kalisumapa channel team: partners, distribution, payouts, revenue and a shelf of tools behind one login.",
    org: "Indosat · Circle Kalisumapa",
    year: "2026",
    role: "Built & maintained",
    tags: ["FastAPI", "JavaScript", "Cloud Storage"],
    case: "/work/portals",
    visual: "portal",
    theme: "ioh",
    points: [
      { h: "Six work areas.", p: "Partner, Distribution, Tools, Data, PNL and PSTR, under one menu." },
      { h: "Access per feature.", p: "Each page, and each tab inside it, granted per person; viewers only read." },
      { h: "Promoters, live.", p: "PROTRACK check-ins, live tracking and each promoter's route." },
    ],
  },
  {
    slug: "tickmate",
    title: "TickMate: every field complaint, tracked to closed.",
    line: "The helpdesk behind the channel team: areas raise a ticket, a handler picks it up, and nothing goes quiet without a trace.",
    org: "Indosat · Circle Kalisumapa",
    year: "2026",
    role: "Built end to end",
    tags: ["Next.js", "Prisma", "SQLite"],
    case: "/work/tickmate",
    visual: "portal",
    theme: "ticket",
    points: [
      { h: "Who sees what.", p: "Creators, handlers and supervisors, scoped to a region or the whole circle." },
      { h: "A trail on every ticket.", p: "Replies, files, status and handover, all logged with who and when." },
      { h: "Days open, in red.", p: "Status tabs, filters and a dashboard by severity, category and region." },
    ],
  },
  {
    slug: "embedhub",
    title: "Embed Hub: every team's Excel dashboards, one sidebar.",
    line: "Data owners paste an Excel for the web embed once, the admin files it under a menu, and viewers open it without hunting for links.",
    org: "Internal tool",
    year: "2026",
    role: "Built end to end",
    tags: ["Node.js", "Microsoft 365", "Cloud Run"],
    case: "/work/embedhub",
    visual: "portal",
    theme: "graphite",
    points: [
      { h: "Three roles.", p: "The admin builds menus and accounts, owners upload, viewers read." },
      { h: "Paste and done.", p: "The iframe code or just the link; https only, hosts can be limited." },
      { h: "Nothing to install.", p: "One Node file and a JSON store: runs anywhere Node 18 does." },
    ],
  },
  {
    slug: "fulfillment",
    title: "Fulfillment Manpower: every sales seat filled, or flagged.",
    line: "One place for the circle, its regions and the staffing agencies to see every sales slot: who's in, who left, and how long a seat has stood empty.",
    org: "Indosat · Circle Kalisumapa",
    year: "2026",
    role: "Built end to end",
    tags: ["Next.js", "Firestore", "Excel"],
    case: "/work/fulfillment",
    visual: "portal",
    theme: "navy",
    points: [
      { h: "Three levels of access.", p: "The circle sees everything; a region or an agency only its own slots." },
      { h: "Vacant days, counted.", p: "Yellow after 14 days, red after 30, the longest gaps first." },
      { h: "Excel in, Excel out.", p: "Upload the FF sheet with a backup taken first; export any view." },
    ],
  },
  {
    slug: "budgettower",
    title: "Budget Tower: a division's budget, from plan to paid.",
    line: "Marketing's spending in one view: what was approved, what's committed, what's been paid, and what's left each quarter.",
    org: "Indosat · Marketing division",
    year: "2026",
    role: "Built end to end",
    tags: ["Next.js", "Cloud Storage", "Excel"],
    case: "/work/budgettower",
    visual: "portal",
    theme: "tower",
    points: [
      { h: "Plan, commit, realize.", p: "Every proposal followed through to PO and goods receipt." },
      { h: "Quarter by quarter.", p: "Budget against spend each quarter, with the burn line for the year." },
      { h: "One upload.", p: "The monitoring workbook goes in; the dashboard rebuilds itself." },
    ],
  },
  {
    slug: "inventory",
    title: "InvenTory: every purchase with its receipt.",
    line: "Staff log what they buy for each event with a photo of the receipt; admins review it, and the totals add up on their own.",
    org: "Internal tool",
    year: "2026",
    role: "Built end to end",
    tags: ["Next.js", "Firebase", "Cloud Run"],
    case: "/work/inventory",
    visual: "portal",
    theme: "receipt",
    points: [
      { h: "Three roles.", p: "Staff submit, admins approve or send back, the master admin sets the lists." },
      { h: "Codes that explain.", p: "Each receipt is numbered by event, category and date." },
      { h: "Where it went.", p: "Spend per category, event and item, and a trend over time." },
    ],
  },
  {
    slug: "automation",
    title: "Bots that clear the busywork in enterprise portals.",
    line: "A web app replaced the Oracle Fusion sales-order macro: upload the quantity sheet, every row is checked, and the import files come out zipped. Plus bots for Mobii, SalesHub and Mobile Money.",
    org: "Indosat Sales & Distribution",
    year: "2026",
    role: "Automation",
    tags: ["FastAPI", "Oracle Fusion", "Playwright"],
    case: "/work/automation",
    visual: "automation",
    theme: "lavender",
    points: [
      { h: "Sheet in, ZIP out.", p: "Quantities become Fusion's three import CSVs, numbered per circle and month." },
      { h: "Checked first.", p: "Unknown dealers or materials are flagged and skipped, with an Excel of what to fix." },
      { h: "Portal bots too.", p: "Approve POs, download SO PDFs, daily reports out to WhatsApp." },
    ],
  },
  {
    slug: "dashboards",
    title: "Dashboards that outgrew Power BI.",
    line: "A D-1 KPI wall for the office TV: every region, area and branch on one screen, rebuilt from the morning's Excel exports. Plus GA funnels, partner quadrants and fraud monitoring on the web.",
    org: "Indosat & Telkomsel distribution",
    year: "2024–26",
    role: "Data + web",
    tags: ["Python", "Next.js", "SQLite"],
    case: "/work/dashboards",
    visual: "quadrant",
    theme: "gold",
    points: [
      { h: "Made for the TV.", p: "Five pages (D-1, PSOTTR, KPI Dash, DSE) cycle on their own, worst branch first." },
      { h: "Drop a file, done.", p: "The newest export in each folder is read on the next refresh; uploads via an admin page." },
      { h: "And on the web.", p: "GA Sankey flows, a partner quadrant, fraud and profit monitoring." },
    ],
  },
  {
    slug: "bitumen",
    title: "Forecasting bitumen prices with a neural network.",
    line: "From thesis to a live dashboard stakeholders check in real time.",
    org: "Kalla Group",
    year: "2023",
    role: "Big Data Analyst",
    tags: ["RNN", "Time series", "Streamlit"],
    case: "/work/bitumen",
    visual: "forecast",
    points: [
      { h: "Pipeline first.", p: "Merged data from several subsidiaries with SQL." },
      { h: "RNN model.", p: "Forecasts FOB Bitumen Singapore prices." },
      { h: "Shipped.", p: "Plotly + Streamlit app, 70% of decisions enhanced." },
    ],
  },
];

// "How I ship": the same flow behind every model, product and bot.
export const processAppliesTo = ["ML models", "SaaS & portals", "Field apps", "Bots & automation"];

export const processSteps = [
  { title: "Listen", items: ["Sit with the people doing the work", "Find the real bottleneck", "Agree on what success looks like"] },
  { title: "Prototype", items: ["A working version, fast", "Tested on real data early"] },
  { title: "Ship", items: ["Auth, roles and cloud deploy", "Tested and deployed on every push", "Docs and a clean handover"] },
  { title: "Keep improving", items: ["Monitor and fix fast", "Automate what repeats", "Measure the impact"] },
];

// each stop has a small animated scene of the mini character in that role (components/journey-scenes.tsx)
export const journey = [
  { period: "2026 — Now", role: "Tech Support Administration", org: "Mitracomm × Indosat", line: "Internal portals, dashboards and bots for Sales & Distribution.", current: true, scene: "bots" as const },
  { period: "2024 — 2026", role: "Data Analyst", org: "Telkomsel Distributor", line: "Databases, web dashboards, fraud detection.", scene: "fraud" as const },
  { period: "2023", role: "Big Data Analyst", org: "Kalla Group", line: "Pipelines and price forecasting.", scene: "pipes" as const },
  { period: "2023", role: "ML Cohort", org: "Bangkit Academy", line: "ML, deep learning, NLP, vision.", scene: "neural" as const },
  { period: "2020 — 2024", role: "B.Sc. Computer Science", org: "Universitas Pancasila", line: "Data Science · GPA 3.76", scene: "graduate" as const },
  { period: "2021 — 2022", role: "Web Data Management", org: "INIPASTI Communika", line: "Audience analytics for media.", scene: "media" as const },
];

export const numbers = [
  { value: 20, suffix: "+", label: "apps, dashboards & bots" },
  { value: 8, suffix: "", label: "portal automations" },
  { value: 70, suffix: "%", label: "decisions enhanced" },
  { value: 3.76, decimals: 2, suffix: "", label: "GPA" },
];

// Skill graph: hubs + leaves.
export const stackGraph = {
  hubs: [
    { id: "web", label: "Web & SaaS" },
    { id: "mobile", label: "Mobile" },
    { id: "auto", label: "Automation" },
    { id: "data", label: "Data & AI" },
    { id: "cloud", label: "Cloud, Data & DevOps" },
  ],
  leaves: [
    { id: "Next.js", hubs: ["web"] },
    { id: "TypeScript", hubs: ["web", "mobile"] },
    { id: "React", hubs: ["web", "mobile"] },
    { id: "Tailwind", hubs: ["web"] },
    { id: "Prisma", hubs: ["web", "cloud"] },
    { id: "NextAuth", hubs: ["web"] },
    { id: "FastAPI", hubs: ["web", "mobile", "data"] },
    { id: "Express", hubs: ["web", "auto"] },
    { id: "Vue", hubs: ["web"] },
    { id: "Go", hubs: ["web", "cloud"] },
    { id: "d3", hubs: ["web", "data"] },
    { id: "Expo", hubs: ["mobile"] },
    { id: "React Native", hubs: ["mobile"] },
    { id: "Kotlin", hubs: ["mobile"] },
    { id: "SQLite", hubs: ["mobile"] },
    { id: "Chrome Ext.", hubs: ["auto"] },
    { id: "Playwright", hubs: ["auto"] },
    { id: "WhatsApp API", hubs: ["auto"] },
    { id: "Power Automate", hubs: ["auto"] },
    { id: "Agentic AI", hubs: ["auto", "data"] },
    { id: "MCP", hubs: ["auto", "data"] },
    { id: "Python", hubs: ["data", "auto", "web"] },
    { id: "Pandas", hubs: ["data"] },
    { id: "TensorFlow", hubs: ["data"] },
    { id: "Scikit-Learn", hubs: ["data"] },
    { id: "LLMs", hubs: ["data"] },
    { id: "Power BI", hubs: ["data"] },
    { id: "Streamlit", hubs: ["data", "web"] },
    { id: "Plotly", hubs: ["data"] },
    { id: "SQL", hubs: ["cloud", "data"] },
    { id: "PostgreSQL", hubs: ["cloud", "web"] },
    { id: "BigQuery", hubs: ["cloud", "data"] },
    { id: "Firestore", hubs: ["cloud", "mobile"] },
    { id: "Cloud Run", hubs: ["cloud", "web"] },
    { id: "Cloud Storage", hubs: ["cloud"] },
    { id: "Docker", hubs: ["cloud", "web"] },
    { id: "Terraform", hubs: ["cloud"] },
    { id: "GitHub Actions", hubs: ["cloud", "web"] },
    { id: "Oracle", hubs: ["cloud"] },
  ],
};

export const experiments = [
  "Telco Churn", "Bank Fraud", "Medicine Recommender", "Heart Failure", "Student Performance",
  "Bank Churn", "Insurance Fraud", "Tire Damage CNN", "Air Quality", "Manufacturing Defects", "Credit Risk",
  "NYC Taxi Anomalies", "Mall Clustering", "MNIST", "Hand Gestures", "Face Mood",
  "F1 Object Detection", "Multi Sentiment", "British Airways NLP", "PwC Power BI",
];

export const credentials = {
  education: { title: "B.Sc. Computer Science", org: "Universitas Pancasila", note: "GPA 3.76 · Thesis on RNN forecasting" },
  certs: [
    { title: "Database Administrator", org: "BNSP", until: "2027" },
    { title: "TensorFlow Developer", org: "Google", until: "2026" },
  ],
  languages: "English · TOEFL ITP 617 · IELTS 6.0",
  courses: ["Stanford ML", "Google Data Analytics", "Azure AI Engineer", "Tableau", "SQL", "Python"],
};
