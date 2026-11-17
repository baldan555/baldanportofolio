/**
 * Tools for the Data Analytics & BI "Tools" page: my stack plus the wider landscape, where each sits in a data
 * pipeline, quick facts, and the rules behind the stack builder. Ratings are rule-of-thumb judgements (1–5), not
 * benchmarks, and are labelled as such on the page.
 */
export type Stage = "Collect" | "Store" | "Transform" | "Orchestrate" | "Analyse" | "Visualise" | "Collaborate";
export type Mock =
  | "sql"
  | "console"
  | "cli"
  | "dag"
  | "grid"
  | "notebook"
  | "pbi"
  | "tableau"
  | "looker"
  | "metabase"
  | "superset"
  | "connector"
  | "stream"
  | "cluster"
  | "git"
  | "doc"
  | "app"
  | "panels"
  | "script"
  | "runs";
export type Ratings = { scale: number; ease: number; collab: number; realtime: number; governance: number };
export type Tool = {
  id: string;
  name: string;
  stage: Stage;
  mine: boolean;
  icon?: string;
  mono?: string;
  color: string;
  what: string;
  strong: string;
  weak: string;
  use?: string;
  cost: "Free" | "Open source" | "Free tier, then paid" | "Paid";
  rate: Ratings;
  mock: Mock;
};

export const STAGES: { id: Stage; line: string }[] = [
  { id: "Collect", line: "Pull data out of apps, files, APIs and event streams." },
  { id: "Store", line: "Keep it in a database or warehouse that can be queried." },
  { id: "Transform", line: "Clean, join and model it into trusted tables." },
  { id: "Orchestrate", line: "Run every step in order, on schedule, with alerts." },
  { id: "Analyse", line: "Explore, test ideas, compute the numbers." },
  { id: "Visualise", line: "Dashboards and reports for the people who decide." },
  { id: "Collaborate", line: "Version, review and reproduce the work." },
];

const R = (scale: number, ease: number, collab: number, realtime: number, governance: number): Ratings => ({ scale, ease, collab, realtime, governance });

export const TOOLS: Tool[] = [
  // ---------------- my stack
  {
    id: "python",
    name: "Python scripts",
    stage: "Collect",
    mine: true,
    icon: "siPython",
    color: "#3776AB",
    cost: "Open source",
    rate: R(3, 3, 3, 3, 2),
    mock: "script",
    what: "Small programs that call APIs, download files and load them.",
    strong: "Any source with an API; fully controllable and free.",
    weak: "You maintain every connector yourself.",
    use: "Pulling live public data, e.g. the Live Forecast project's air, currency and Wikipedia feeds (ml/live_data.py).",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    stage: "Store",
    mine: true,
    icon: "siPostgresql",
    color: "#4169E1",
    cost: "Open source",
    rate: R(3, 3, 4, 3, 4),
    mock: "sql",
    what: "The open-source relational database behind many apps.",
    strong: "Reliable, standard SQL, rich extensions, great all-rounder.",
    weak: "Analytical scans slow down past hundreds of millions of rows.",
    use: "App databases and analysis-ready tables up to millions of rows.",
  },
  {
    id: "bigquery",
    name: "BigQuery",
    stage: "Store",
    mine: true,
    icon: "siGooglebigquery",
    color: "#669DF6",
    cost: "Free tier, then paid",
    rate: R(5, 4, 4, 4, 5),
    mock: "console",
    what: "Google Cloud's serverless data warehouse.",
    strong: "Scans billions of rows in seconds; no servers; pay per query.",
    weak: "Costs grow with careless SELECT * on huge tables.",
    use: "Company-wide warehouses, event data and scheduled reporting tables.",
  },
  {
    id: "duckdb",
    name: "DuckDB",
    stage: "Store",
    mine: true,
    icon: "siDuckdb",
    color: "#FFC107",
    cost: "Open source",
    rate: R(4, 5, 2, 1, 2),
    mock: "cli",
    what: "An in-process analytical database: SQL on files, on a laptop or in the browser.",
    strong: "Reads CSV and Parquet directly; very fast on one machine; zero setup.",
    weak: "One machine, one writer: not a shared server.",
    use: "Local analysis of large files, and the SQL playground coming to this page.",
  },
  {
    id: "sql",
    name: "SQL",
    stage: "Transform",
    mine: true,
    mono: "SQL",
    color: "#0b0b0b",
    cost: "Free",
    rate: R(5, 4, 4, 3, 4),
    mock: "sql",
    what: "The language every database and warehouse speaks.",
    strong: "Joins, aggregates and window functions right where the data lives.",
    weak: "Awkward for statistics, APIs and complex logic.",
    use: "Every analysis: cleaning, joining, cohorts, funnels, KPIs.",
  },
  {
    id: "dbt",
    name: "dbt",
    stage: "Transform",
    mine: true,
    mono: "dbt",
    color: "#FF694B",
    cost: "Open source",
    rate: R(5, 3, 5, 2, 5),
    mock: "dag",
    what: "Turns SQL SELECT statements into tested, documented, versioned tables.",
    strong: "Models built in dependency order, with tests, docs and lineage.",
    weak: "Batch only; another tool to learn and run.",
    use: "Building the star schemas and summary tables that dashboards read.",
  },
  {
    id: "pandas",
    name: "Python · pandas",
    stage: "Analyse",
    mine: true,
    icon: "siPandas",
    color: "#150458",
    cost: "Open source",
    rate: R(3, 3, 3, 2, 2),
    mock: "notebook",
    what: "The data workhorse: load, reshape and analyse data in code.",
    strong: "Anything SQL finds awkward: statistics, files, APIs, modelling.",
    weak: "Data must fit in memory; code needs care to be reproducible.",
    use: "Every model on this site was trained with Python (ml/train.py).",
  },
  {
    id: "jupyter",
    name: "Jupyter",
    stage: "Analyse",
    mine: true,
    icon: "siJupyter",
    color: "#F37626",
    cost: "Open source",
    rate: R(3, 4, 3, 1, 2),
    mock: "notebook",
    what: "Notebooks mixing code, results, charts and notes.",
    strong: "Exploring step by step and sharing the reasoning, not just the answer.",
    weak: "Out-of-order cells make notebooks hard to rerun.",
    use: "First looks at new data and documented one-off analyses.",
  },
  {
    id: "excel",
    name: "Excel",
    stage: "Analyse",
    mine: true,
    mono: "XL",
    color: "#1D6F42",
    cost: "Paid",
    rate: R(1, 5, 3, 1, 2),
    mock: "grid",
    what: "The spreadsheet everyone already has.",
    strong: "Pivot tables, quick checks, and numbers non-technical colleagues can touch.",
    weak: "About a million rows per sheet; easy to break silently.",
    use: "Small datasets, ad-hoc checks and exports people want to play with.",
  },
  {
    id: "powerbi",
    name: "Power BI",
    stage: "Visualise",
    mine: true,
    mono: "BI",
    color: "#F2C811",
    cost: "Free tier, then paid",
    rate: R(4, 3, 4, 3, 5),
    mock: "pbi",
    what: "Microsoft's BI tool: data models, DAX measures and interactive reports.",
    strong: "Star-schema models, row-level security, fits Microsoft 365 companies.",
    weak: "DAX has a learning curve; sharing needs licences.",
    use: "Interactive management dashboards on a governed data model.",
  },
  {
    id: "tableau",
    name: "Tableau",
    stage: "Visualise",
    mine: true,
    mono: "Tb",
    color: "#E97627",
    cost: "Paid",
    rate: R(4, 3, 4, 3, 4),
    mock: "tableau",
    what: "Visual analytics built around drag-and-drop exploration.",
    strong: "Fast, flexible exploration and polished interactive views.",
    weak: "Licences are expensive; modelling is less central than in Power BI.",
    use: "Exploratory dashboards and visual storytelling.",
  },
  {
    id: "looker",
    name: "Looker Studio",
    stage: "Visualise",
    mine: true,
    icon: "siLooker",
    color: "#4285F4",
    cost: "Free",
    rate: R(3, 5, 4, 2, 2),
    mock: "looker",
    what: "Google's free dashboard tool.",
    strong: "Connects straight to BigQuery, Sheets and Google Analytics; easy to share.",
    weak: "Limited modelling; slow on big live queries.",
    use: "Lightweight shared dashboards on Google data.",
  },
  {
    id: "metabase",
    name: "Metabase",
    stage: "Visualise",
    mine: true,
    icon: "siMetabase",
    color: "#509EE3",
    cost: "Open source",
    rate: R(3, 5, 4, 2, 3),
    mock: "metabase",
    what: "Open-source BI that lets non-analysts ask questions.",
    strong: "Self-hosted, simple question builder, SQL when needed.",
    weak: "Fewer chart types and less polish than the big names.",
    use: "Self-service questions for a team, on its own database.",
  },
  // ---------------- the wider landscape (not claimed as my stack)
  {
    id: "airbyte",
    name: "Airbyte",
    stage: "Collect",
    mine: false,
    icon: "siAirbyte",
    color: "#615EFF",
    cost: "Open source",
    rate: R(4, 4, 4, 3, 4),
    mock: "connector",
    what: "Open-source connectors that sync hundreds of sources into a warehouse.",
    strong: "Ready-made connectors, self-hosted or cloud.",
    weak: "Running it yourself takes infrastructure.",
  },
  {
    id: "fivetran",
    name: "Fivetran",
    stage: "Collect",
    mine: false,
    mono: "5T",
    color: "#0073FF",
    cost: "Paid",
    rate: R(5, 5, 4, 3, 5),
    mock: "connector",
    what: "Fully managed data connectors.",
    strong: "Set up in minutes, maintained for you.",
    weak: "Priced per row synced: adds up fast.",
  },
  {
    id: "kafka",
    name: "Apache Kafka",
    stage: "Collect",
    mine: false,
    icon: "siApachekafka",
    color: "#231F20",
    cost: "Open source",
    rate: R(5, 2, 3, 5, 4),
    mock: "stream",
    what: "A distributed log for streaming events in real time.",
    strong: "Millions of events per second, replayable.",
    weak: "Complex to run; overkill for daily reports.",
  },
  {
    id: "snowflake",
    name: "Snowflake",
    stage: "Store",
    mine: false,
    icon: "siSnowflake",
    color: "#29B5E8",
    cost: "Paid",
    rate: R(5, 4, 5, 3, 5),
    mock: "console",
    what: "A cloud data warehouse that runs on AWS, Azure or Google Cloud.",
    strong: "Separate storage and compute, easy data sharing.",
    weak: "Credits get expensive without monitoring.",
  },
  {
    id: "mysql",
    name: "MySQL",
    stage: "Store",
    mine: false,
    icon: "siMysql",
    color: "#4479A1",
    cost: "Open source",
    rate: R(3, 4, 3, 3, 3),
    mock: "sql",
    what: "A popular open-source relational database for web apps.",
    strong: "Everywhere in web hosting; simple and fast for apps.",
    weak: "Fewer analytical features than PostgreSQL.",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    stage: "Store",
    mine: false,
    icon: "siMongodb",
    color: "#47A248",
    cost: "Free tier, then paid",
    rate: R(4, 4, 3, 4, 3),
    mock: "doc",
    what: "A document database storing flexible JSON-like records.",
    strong: "Flexible schemas for app data that changes shape.",
    weak: "Analytics usually needs flattening into tables first.",
  },
  {
    id: "spark",
    name: "Apache Spark",
    stage: "Transform",
    mine: false,
    icon: "siApachespark",
    color: "#E25A1C",
    cost: "Open source",
    rate: R(5, 2, 3, 4, 3),
    mock: "cluster",
    what: "Distributed processing across many machines.",
    strong: "Terabytes of data, SQL or Python, batch and streaming.",
    weak: "Clusters to manage; heavy for small data.",
  },
  {
    id: "airflow",
    name: "Apache Airflow",
    stage: "Orchestrate",
    mine: false,
    icon: "siApacheairflow",
    color: "#017CEE",
    cost: "Open source",
    rate: R(5, 2, 4, 2, 4),
    mock: "runs",
    what: "Schedules and monitors pipelines written as Python DAGs.",
    strong: "The standard orchestrator; huge ecosystem.",
    weak: "A server to run; DAG code to maintain.",
  },
  {
    id: "prefect",
    name: "Prefect",
    stage: "Orchestrate",
    mine: false,
    icon: "siPrefect",
    color: "#070E10",
    cost: "Free tier, then paid",
    rate: R(4, 4, 4, 2, 3),
    mock: "runs",
    what: "A modern, Python-first workflow orchestrator.",
    strong: "Plain Python functions become monitored flows.",
    weak: "Smaller ecosystem than Airflow.",
  },
  {
    id: "sheets",
    name: "Google Sheets",
    stage: "Analyse",
    mine: false,
    icon: "siGooglesheets",
    color: "#34A853",
    cost: "Free",
    rate: R(1, 5, 5, 2, 2),
    mock: "grid",
    what: "The online spreadsheet, shared by link.",
    strong: "Real-time collaboration; connects to BigQuery and Looker Studio.",
    weak: "Slows down well before Excel's limits.",
  },
  {
    id: "r",
    name: "R",
    stage: "Analyse",
    mine: false,
    icon: "siR",
    color: "#276DC3",
    cost: "Open source",
    rate: R(3, 3, 3, 1, 2),
    mock: "notebook",
    what: "A language built by statisticians for statistics and graphics.",
    strong: "Unmatched statistical packages and ggplot2 charts.",
    weak: "Less common outside research and statistics teams.",
  },
  {
    id: "superset",
    name: "Apache Superset",
    stage: "Visualise",
    mine: false,
    icon: "siApachesuperset",
    color: "#20A6C9",
    cost: "Open source",
    rate: R(4, 3, 4, 3, 3),
    mock: "superset",
    what: "Open-source BI built for SQL-savvy teams.",
    strong: "Many chart types, connects to most databases, free.",
    weak: "Self-hosting and setup take effort.",
  },
  {
    id: "streamlit",
    name: "Streamlit",
    stage: "Visualise",
    mine: false,
    icon: "siStreamlit",
    color: "#FF4B4B",
    cost: "Open source",
    rate: R(3, 4, 3, 3, 2),
    mock: "app",
    what: "Turns Python scripts into interactive data apps.",
    strong: "From notebook to shareable app in an afternoon.",
    weak: "An app, not a governed BI platform.",
  },
  {
    id: "grafana",
    name: "Grafana",
    stage: "Visualise",
    mine: false,
    icon: "siGrafana",
    color: "#F46800",
    cost: "Open source",
    rate: R(4, 3, 4, 5, 3),
    mock: "panels",
    what: "Real-time dashboards for metrics and time series.",
    strong: "Live monitoring and alerts, refreshing every few seconds.",
    weak: "Made for monitoring, not business reporting.",
  },
  {
    id: "git",
    name: "Git & GitHub",
    stage: "Collaborate",
    mine: false,
    icon: "siGithub",
    color: "#181717",
    cost: "Free tier, then paid",
    rate: R(5, 3, 5, 1, 5),
    mock: "git",
    what: "Version control for code, SQL models and notebooks.",
    strong: "History, review and rollback for every change.",
    weak: "Not built for large data files.",
  },
];

/* ---------------- BI head-to-head (rule-of-thumb, 1–5) */
export const BI_AXES = ["Free to start", "Ease", "Data modelling", "Visual freedom", "Sharing", "Governance"];
export const BI_RATINGS: { id: string; v: number[] }[] = [
  { id: "powerbi", v: [3, 3, 5, 4, 4, 5] },
  { id: "tableau", v: [1, 3, 3, 5, 4, 4] },
  { id: "looker", v: [5, 5, 2, 3, 5, 2] },
  { id: "metabase", v: [5, 5, 2, 2, 4, 3] },
  { id: "superset", v: [5, 3, 2, 4, 4, 3] },
];

/* ---------------- same task, every tool */
export const SAME_TASK = {
  question: "Orders per country per month (Sep–Nov 2011)",
  versions: [
    {
      id: "sql",
      label: "SQL",
      code: "SELECT country,\n       strftime(invoice_ts, '%Y-%m') AS month,\n       COUNT(DISTINCT invoice_no)   AS orders\nFROM sales\nWHERE month BETWEEN '2011-09' AND '2011-11'\nGROUP BY country, month;",
    },
    { id: "pandas", label: "pandas", code: "(df[df.month.between('2011-09', '2011-11')]\n   .groupby(['country', 'month'])['invoice_no']\n   .nunique()\n   .unstack('month'))" },
    {
      id: "excel",
      label: "Excel",
      code: "1. Insert → PivotTable → tick “Add this data to the Data Model”\n2. Rows: Country    Columns: Month\n3. Values: InvoiceNo → Value Field Settings → Distinct Count\n4. Filter Month: Sep, Oct, Nov 2011",
    },
    {
      id: "powerbi",
      label: "Power BI (DAX)",
      code: "Orders = DISTINCTCOUNT ( Sales[InvoiceNo] )\n\n-- Matrix visual: Rows = Country, Columns = Month,\n-- Values = [Orders], filter Month = Sep–Nov 2011",
    },
    { id: "tableau", label: "Tableau", code: "Rows:     [Country]\nColumns:  MONTH([Invoice Date])\nText:     COUNTD([Invoice No])\nFilter:   Invoice Date between 1 Sep and 30 Nov 2011" },
    {
      id: "looker",
      label: "Looker Studio",
      code: "Chart: Pivot table\nRow dimension:    Country\nColumn dimension: Month (from Invoice Date)\nMetric:           COUNT_DISTINCT(InvoiceNo)\nDate range:       1 Sep 2011 – 30 Nov 2011",
    },
    {
      id: "metabase",
      label: "Metabase",
      code: "Pick your data:  Sales\nFilter:          Invoice Date is between Sep 1 – Nov 30, 2011\nSummarize:       Number of distinct values of Invoice No\nBy:              Country, Invoice Date: Month",
    },
    {
      id: "dbt",
      label: "dbt model",
      code: "-- models/marts/orders_by_country_month.sql\nselect country, date_trunc('month', invoice_ts) as month,\n       count(distinct invoice_no) as orders\nfrom {{ ref('stg_sales') }}\ngroup by 1, 2",
    },
  ],
};

/* ---------------- stack builder */
export const QUESTIONS = [
  { id: "size", q: "How much data?", opts: ["Fits in a spreadsheet", "Millions of rows", "Billions of rows"] },
  { id: "source", q: "Where does it come from?", opts: ["Files & exports", "An app's database", "Many SaaS apps", "Live events"] },
  { id: "fresh", q: "How fresh must it be?", opts: ["One-off answer", "Daily", "Hourly", "Real-time"] },
  { id: "audience", q: "Who reads the result?", opts: ["Just me", "My team", "Managers & company", "The public"] },
  { id: "budget", q: "Budget?", opts: ["Free only", "Small", "Company budget"] },
  { id: "skills", q: "Team skills?", opts: ["Spreadsheets", "SQL", "Python"] },
  { id: "eco", q: "Company ecosystem?", opts: ["None in particular", "Google", "Microsoft"] },
] as const;
export type Answers = Record<(typeof QUESTIONS)[number]["id"], number>;

export const PRESETS: { name: string; who: string; a: Answers }[] = [
  { name: "Coffee shop owner", who: "UMKM with sales in spreadsheets", a: { size: 0, source: 0, fresh: 1, audience: 0, budget: 0, skills: 0, eco: 1 } },
  { name: "Freelance analyst", who: "One-off questions on client files", a: { size: 1, source: 0, fresh: 0, audience: 1, budget: 0, skills: 2, eco: 0 } },
  { name: "Startup with an app", who: "Product and growth metrics", a: { size: 1, source: 1, fresh: 2, audience: 1, budget: 1, skills: 1, eco: 1 } },
  { name: "Enterprise", who: "Many systems, Microsoft 365", a: { size: 2, source: 2, fresh: 1, audience: 2, budget: 2, skills: 1, eco: 2 } },
  { name: "Open-data portal", who: "Public dashboards for citizens", a: { size: 1, source: 0, fresh: 1, audience: 3, budget: 0, skills: 1, eco: 1 } },
  { name: "Live monitoring", who: "Orders and incidents as they happen", a: { size: 2, source: 3, fresh: 3, audience: 1, budget: 2, skills: 2, eco: 0 } },
];

export type StackPick = { stage: Stage; tool: string | null; why: string; alt?: string };

export function buildStack(a: Answers): { picks: StackPick[]; cost: string; learn: string[] } {
  const small = a.size === 0;
  const huge = a.size === 2;
  const free = a.budget === 0;
  const rich = a.budget === 2;
  const once = a.fresh === 0;
  const live = a.fresh === 3 || a.source === 3;
  const google = a.eco === 1;
  const ms = a.eco === 2;
  const py = a.skills === 2;
  const cells = a.skills === 0;
  // the spreadsheet: Google Sheets when free or in a Google company, otherwise Excel
  const sheet = google || free ? "sheets" : "excel";
  const picks: StackPick[] = [];

  // collect
  if (a.source === 3) picks.push({ stage: "Collect", tool: "kafka", why: "Live events need a stream that never sleeps, and can be replayed when something breaks.", alt: "airbyte" });
  else if (a.source === 0)
    picks.push({
      stage: "Collect",
      tool: py ? "python" : null,
      why: py ? "Files and exports load with a short Python script that can be re-run any time." : "Files can simply be uploaded or opened; no connector needed yet.",
      alt: py ? "airbyte" : "python",
    });
  else
    picks.push({
      stage: "Collect",
      tool: rich ? "fivetran" : "airbyte",
      why: rich ? "With budget, managed connectors save engineering time and are maintained for you." : "Open-source connectors sync app databases and SaaS tools without writing each one.",
      alt: rich ? "airbyte" : "python",
    });

  // store
  let store: string;
  if (small && a.audience <= 1 && !live) store = cells ? sheet : py ? "duckdb" : google ? "sheets" : "postgres";
  else if (huge || live) store = google || (!ms && !rich) ? "bigquery" : "snowflake";
  else if (once && a.audience <= 1) store = "duckdb";
  else if (a.audience === 0) store = "duckdb";
  else store = google ? "bigquery" : free ? "postgres" : ms ? "postgres" : "bigquery";
  const storeWhy: Record<string, string> = {
    sheets: "Small data: a shared Google Sheet is enough, and free.",
    excel: "Small data and spreadsheet skills: start in Excel.",
    duckdb: once ? "Questions on big files: DuckDB queries them in place on a laptop, no server to run." : "Big files for one analyst: DuckDB queries them on a laptop, free.",
    postgres: "A shared, free, reliable database for team-sized data.",
    bigquery: huge || live ? "Billions of rows or a constant stream: a serverless warehouse scans them in seconds." : "Serverless, shared, with a free tier, and native to Google tools.",
    snowflake: "Huge data with budget, on any cloud (including Azure), with easy sharing.",
  };
  const storeAlt: Record<string, string> = { bigquery: "snowflake", snowflake: "bigquery", postgres: "duckdb", duckdb: "postgres", sheets: "duckdb", excel: "duckdb" };
  picks.push({ stage: "Store", tool: store, why: storeWhy[store], alt: storeAlt[store] });

  // transform
  if (cells && (small || once)) picks.push({ stage: "Transform", tool: sheet, why: "Small data: a pivot table and a few formulas do the cleaning. No pipeline needed.", alt: "sql" });
  else if (once || small)
    picks.push({
      stage: "Transform",
      tool: py && once ? "pandas" : "sql",
      why: py && once ? "A one-off: a few lines of pandas in the notebook, no pipeline to maintain." : "A small or one-off job: a few queries are enough, no pipeline to maintain.",
      alt: py && once ? "sql" : "pandas",
    });
  else if (huge && py && live) picks.push({ stage: "Transform", tool: "spark", why: "Huge, streaming data and Python skills: processing spread across many machines.", alt: "dbt" });
  else picks.push({ stage: "Transform", tool: "dbt", why: "Recurring work deserves tested, documented SQL models, so the numbers don't drift.", alt: "sql" });

  // orchestrate
  if (once || (small && a.audience === 0)) picks.push({ stage: "Orchestrate", tool: null, why: "Nothing to schedule yet: run it when needed.", alt: "prefect" });
  else if (!py && a.fresh <= 1 && !rich)
    picks.push({ stage: "Orchestrate", tool: null, why: "A daily refresh can use the scheduler built into dbt or the warehouse. A separate orchestrator can wait.", alt: "airflow" });
  else
    picks.push({
      stage: "Orchestrate",
      tool: py && !rich ? "prefect" : "airflow",
      why: a.fresh >= 2 ? "Hourly or live data needs reliable scheduling, retries and alerts." : "A nightly schedule with retries keeps every table fresh without anyone pressing run.",
      alt: py && !rich ? "airflow" : "prefect",
    });

  // analyse
  picks.push({
    stage: "Analyse",
    tool: py ? "jupyter" : a.skills === 1 ? "sql" : sheet,
    why: py ? "Notebooks keep code, results and reasoning together." : a.skills === 1 ? "Analyse in SQL, right where the data lives." : "Spreadsheets, for people who think in cells.",
    alt: py ? "pandas" : a.skills === 1 ? sheet : sheet === "sheets" ? "excel" : "sheets",
  });

  // visualise
  let vis: string;
  if (live) vis = "grafana";
  else if (once && a.audience <= 1) vis = py ? "jupyter" : sheet;
  else if (a.audience === 0) vis = py ? "jupyter" : cells ? sheet : "metabase";
  else if (a.audience === 3) vis = py && free ? "streamlit" : "looker";
  else if (a.audience === 1) vis = google ? "looker" : free ? "metabase" : ms ? "powerbi" : "metabase";
  else vis = ms ? "powerbi" : google ? "looker" : rich ? "tableau" : "powerbi";
  const visWhy: Record<string, string> = {
    grafana: "Data that changes by the second needs live panels and alerts.",
    jupyter:
      once && a.audience === 1 ? "A one-off answer: charts in the notebook (or pasted into a slide), no dashboard to maintain." : "If you're the only reader, charts in the notebook are enough.",
    excel: "Charts right next to the numbers, no extra tool.",
    sheets: "Charts right next to the numbers, shared by link.",
    metabase: "Free, self-hosted, and teammates can ask their own questions.",
    streamlit: "A free Python app anyone can open, with full control over what it shows.",
    looker: a.audience === 3 ? "Free public dashboards that anyone can open by link." : "Free, easy to share, and native to Google data.",
    powerbi: "Governed models and row-level security for decision-makers, at home in Microsoft 365.",
    tableau: "Rich, polished interactive views for leadership, with the budget for licences.",
  };
  const visAlt: Record<string, string> = {
    powerbi: "tableau",
    tableau: "powerbi",
    looker: "metabase",
    metabase: "superset",
    grafana: "superset",
    streamlit: "looker",
    jupyter: "streamlit",
    sheets: "looker",
    excel: "powerbi",
  };
  picks.push({ stage: "Visualise", tool: vis, why: visWhy[vis], alt: visAlt[vis] });

  // collaborate
  const noGit = cells || (once && a.audience === 0);
  picks.push({
    stage: "Collaborate",
    tool: noGit ? null : "git",
    why: noGit
      ? "No code yet: the spreadsheet's own version history is enough. Git matters once there are queries and scripts."
      : "Every query, model and notebook in version control, reviewed and reversible.",
  });

  const costOf = (p: StackPick) => TOOLS.find((t) => t.id === p.tool)?.cost;
  const paid = picks.filter((p) => costOf(p) === "Paid").length;
  const tier = picks.filter((p) => costOf(p) === "Free tier, then paid").length;
  const cost = paid ? "Paid licences involved" : tier ? "Free to start, pay as it grows" : "Free / open source";
  const SKILL: Record<string, string> = {
    sql: "SQL",
    dbt: "SQL",
    bigquery: "SQL",
    postgres: "SQL",
    snowflake: "SQL",
    duckdb: "SQL",
    metabase: "SQL",
    superset: "SQL",
    python: "Python",
    pandas: "Python",
    jupyter: "Python",
    airflow: "Python",
    prefect: "Python",
    spark: "Python",
    streamlit: "Python",
    powerbi: "DAX",
    excel: "Spreadsheets",
    sheets: "Spreadsheets",
    git: "Git",
  };
  const ORDER = ["Spreadsheets", "SQL", "Python", "DAX", "Git", "Each tool's interface"];
  const learn = Array.from(new Set(picks.filter((p) => p.tool).map((p) => SKILL[p.tool!] ?? "Each tool's interface"))).sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
  return { picks, cost, learn };
}
