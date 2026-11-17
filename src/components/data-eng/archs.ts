/*
 * The architecture gallery's content. "This site" is the real setup of this portfolio, with numbers passed in from
 * the data files; the other five are reference designs with example records (labelled as such on the page).
 * Ratings are rules of thumb, not benchmarks.
 */
export type ArchId = "site" | "batch" | "stream" | "lakehouse" | "cdc" | "reverse";
export type Flow = "batch" | "stream" | "cdc" | "reverse";
export type ArchNode = { id: string; c: number; r: number; label: string; sub: string; icon?: string; mono?: string; control?: boolean };
export type ArchEdge = { from: string; to: string; flow?: Flow | "control"; v?: boolean };
export type ArchStep = { node: string[]; title: string; body: string; record?: { lang: string; text: string } };
export type Ratings = { fresh: number; cost: number; effort: number; replay: number };
export type Arch = {
  id: ArchId;
  name: string;
  short: string;
  tagline: string;
  flow: Flow;
  real?: boolean;
  nodes: ArchNode[];
  edges: ArchEdge[];
  group?: { c0: number; c1: number; r: number; label: string };
  steps: ArchStep[];
  latency: string;
  ratings: Ratings;
  best: string[];
  watch: string[];
  tools: [string, string][];
  seeAlso?: { href: string; label: string };
};
export type Real = { hour: string; pm: number; date: string; dailyMean: number; requests: number; rawBytes: number; rawSlots: number; airBytes: number; forecastBytes: number };

const kb = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);
const n0 = (v: number) => v.toLocaleString("en-US");

export function archs(real: Real): Arch[] {
  return [
    {
      id: "site",
      name: "This site",
      short: "This site",
      tagline: "Small public data, Python jobs run by hand, JSON in the repo, static pages, live calls from the browser.",
      flow: "batch",
      real: true,
      nodes: [
        { id: "datasets", c: 0, r: 0, label: "Datasets", sub: "UCI · Kaggle · IBM\nQuick, Draw!" },
        { id: "apis", c: 0, r: 2, label: "Public APIs", sub: "Open-Meteo · ECB\nWikimedia" },
        { id: "raw", c: 1, r: 0, label: "Raw files", sub: "ml/data/raw\nkept out of git" },
        { id: "py", c: 2, r: 0, label: "Python jobs", sub: "pandas · train.py\nrun by hand", icon: "python" },
        { id: "json", c: 3, r: 0, label: "JSON files", sub: "src/data\nin git", icon: "json" },
        { id: "next", c: 4, r: 0, label: "Static pages", sub: "Next.js build", icon: "nextdotjs" },
        { id: "browser", c: 5, r: 1, label: "Your browser", sub: "pages + live\nAPI calls" },
      ],
      edges: [
        { from: "datasets", to: "raw" },
        { from: "apis", to: "raw" },
        { from: "raw", to: "py" },
        { from: "py", to: "json" },
        { from: "json", to: "next" },
        { from: "next", to: "browser" },
        { from: "apis", to: "browser", flow: "stream" },
      ],
      steps: [
        {
          node: ["apis"],
          title: "One hour of Jakarta air, at the source",
          body: "Open-Meteo serves the CAMS model's PM2.5 for Jakarta hour by hour, free and without a key. This is a real hour from the saved data.",
          record: { lang: "json", text: `{ "time": "${real.hour}", "pm2_5": ${real.pm} }` },
        },
        {
          node: ["raw"],
          title: `Fetched in ${real.requests} requests and cached`,
          body: "ml/live_data.py asks for one year per request, retries with growing waits, and writes one raw file that every run replaces. Datasets such as Online Retail were downloaded once, by hand, into the same folder.",
          record: { lang: "file", text: `ml/data/raw/live/pm25_jakarta.json\n${kb(real.rawBytes)} · ${n0(real.rawSlots)} hourly slots` },
        },
        {
          node: ["py"],
          title: "Shaped by a Python job",
          body: "ml/air_dashboard.py keeps whole days and averages them; ml/train.py trains the forecasting LSTM on the same file. Each script reads raw files and writes small results.",
          record: { lang: "python", text: `daily = clean.resample("D").mean()\n# ${real.date}: ${real.dailyMean} µg/m³` },
        },
        {
          node: ["json"],
          title: "Saved as small JSON files in the repo",
          body: "Only the results are committed, never the raw data. Pages import them at build time.",
          record: { lang: "file", text: `src/data/air-dashboard.json        ${kb(real.airBytes)}\nsrc/data/models/live-forecasts.json  ${kb(real.forecastBytes)}` },
        },
        { node: ["next"], title: "Built into static pages", body: "next build reads the JSON and writes plain HTML: no database and no Python server behind the pages.", record: { lang: "text", text: "/skills/analytics/dashboards/air  →  static HTML" } },
        {
          node: ["browser"],
          title: "Topped up live in your browser",
          body: "When the air dashboard opens, your browser asks Open-Meteo for the newest hours directly. The saved file only covers the history.",
          record: { lang: "http", text: "GET air-quality-api.open-meteo.com/v1/air-quality\n  ?latitude=-6.2&longitude=106.85&past_days=14" },
        },
      ],
      latency: "history: when I re-run it · live tiles: seconds",
      ratings: { fresh: 2, cost: 1, effort: 1, replay: 4 },
      best: ["Small data that fits in memory", "Public data with nothing secret in it", "A static site: nothing to keep running"],
      watch: ["Nothing runs on a schedule, so history is refreshed by hand", "Doesn't stretch to big or private data", "Every data change needs a rebuild"],
      tools: [
        ["Built with", "Python · pandas · scikit-learn · TensorFlow → JSON → Next.js"],
        ["Server", "none, except two small routes that relay TfL traffic-camera clips for one demo"],
      ],
      seeAlso: { href: "/skills/data-engineering/lab#catalog", label: "Every pipeline behind this site, timed" },
    },
    {
      id: "batch",
      name: "Batch ELT on GCP",
      short: "Batch",
      tagline: "The classic warehouse: load everything on a schedule, transform inside BigQuery, refresh the dashboards.",
      flow: "batch",
      nodes: [
        { id: "db", c: 0, r: 0, label: "App database", sub: "orders · customers", icon: "postgresql" },
        { id: "files", c: 0, r: 2, label: "Files & SaaS", sub: "CSV · Sheets · APIs", icon: "googlesheets" },
        { id: "extract", c: 1, r: 1, label: "Extract & load", sub: "Cloud Run job\nor Airbyte", icon: "airbyte" },
        { id: "gcs", c: 2, r: 1, label: "Landing zone", sub: "Cloud Storage\nParquet files", icon: "googlecloudstorage" },
        { id: "raw", c: 3, r: 1, label: "Raw tables", sub: "BigQuery\npartitioned by day", icon: "googlebigquery" },
        { id: "dbt", c: 4, r: 1, label: "dbt models", sub: "staging → marts\n+ tests", mono: "dbt" },
        { id: "bi", c: 5, r: 1, label: "Dashboards", sub: "Looker Studio", icon: "looker" },
        { id: "sched", c: 2.5, r: 2.15, label: "Scheduler", sub: "Composer (Airflow)\ndaily at 02:00", icon: "apacheairflow", control: true },
      ],
      edges: [
        { from: "db", to: "extract" },
        { from: "files", to: "extract" },
        { from: "extract", to: "gcs" },
        { from: "gcs", to: "raw" },
        { from: "raw", to: "dbt" },
        { from: "dbt", to: "bi" },
        { from: "sched", to: "extract", flow: "control", v: true },
        { from: "sched", to: "dbt", flow: "control", v: true },
      ],
      steps: [
        { node: ["db"], title: "An order is written at 14:05", body: "A store's point-of-sale app saves the order in its own database. Nothing happens downstream yet.", record: { lang: "row", text: "order_id  store        total     updated_at\n50112     Makassar 2   185000    2026-11-10 14:05" } },
        { node: ["sched"], title: "02:00: the scheduler starts the run", body: "One DAG runs every step in order: extract, load, transform, test, refresh. If a step fails, the later ones wait and someone is alerted.", record: { lang: "text", text: "extract_orders >> load_raw >> dbt_build >> refresh_bi" } },
        { node: ["extract"], title: "Only what changed since the last run", body: "An incremental extract asks for rows updated after the last watermark, instead of copying the whole table every night.", record: { lang: "sql", text: "SELECT * FROM orders\nWHERE updated_at > '2026-11-09 02:00'" } },
        { node: ["gcs"], title: "Landed as files, never edited", body: "Raw extracts are written once to Cloud Storage. Any later step can be re-run from them without touching the source again.", record: { lang: "path", text: "gs://lake/raw/orders/dt=2026-11-10/part-000.parquet" } },
        { node: ["raw"], title: "Loaded into BigQuery", body: "A partitioned raw table: queries that ask for one day only scan that day, which keeps the bill small.", record: { lang: "sql", text: "LOAD DATA INTO raw.orders\nFROM FILES (format = 'PARQUET',\n  uris = ['gs://lake/raw/orders/dt=2026-11-10/*'])" } },
        { node: ["dbt"], title: "Transformed and tested in SQL", body: "dbt builds staging models (types, names) and marts (joins, revenue). Tests for unique keys and empty values must pass before anything is published.", record: { lang: "sql", text: "-- fct_sales.sql\nSELECT store, DATE(updated_at) AS day,\n       SUM(total) AS revenue\nFROM {{ ref('stg_orders') }}\nGROUP BY 1, 2" } },
        { node: ["bi"], title: "06:00: the manager sees yesterday", body: "The dashboard refreshes after the run. The 14:05 order appears about 16 hours after it happened, which is fine for daily reporting.", record: { lang: "row", text: "Makassar 2 · 10 Nov · revenue Rp 48.2 m" } },
      ],
      latency: "hours (daily or hourly runs)",
      ratings: { fresh: 2, cost: 2, effort: 2, replay: 5 },
      best: ["Reporting, finance and KPI dashboards", "Teams that know SQL", "The first data platform most companies build"],
      watch: ["Stale by design: yesterday's numbers", "Full reloads get slow and expensive: go incremental", "Upstream schema changes break loads"],
      tools: [
        ["GCP", "Cloud Composer · Cloud Storage · BigQuery · Dataform or dbt · Looker"],
        ["AWS", "MWAA · S3 · Redshift · dbt · QuickSight"],
        ["Open source", "Airflow · MinIO · Postgres or DuckDB · dbt · Metabase"],
      ],
      seeAlso: { href: "/skills/data-engineering/simulator", label: "What goes wrong in a batch pipeline, simulated" },
    },
    {
      id: "stream",
      name: "Streaming",
      short: "Streaming",
      tagline: "Events flow continuously: processed in small windows and acted on within seconds.",
      flow: "stream",
      nodes: [
        { id: "app", c: 0, r: 1, label: "Apps & devices", sub: "clicks · payments\nsensors" },
        { id: "bus", c: 1, r: 1, label: "Event bus", sub: "Pub/Sub or Kafka", icon: "googlepubsub" },
        { id: "proc", c: 2, r: 1, label: "Processor", sub: "Dataflow (Beam)\nor Flink", icon: "googledataflow" },
        { id: "dlq", c: 2, r: 2.15, label: "Dead letters", sub: "bad events, kept\nfor a fix", control: true },
        { id: "wh", c: 3.5, r: 0, label: "Warehouse", sub: "BigQuery\nstreaming writes", icon: "googlebigquery" },
        { id: "kv", c: 3.5, r: 2, label: "Serving store", sub: "Bigtable or Redis", icon: "redis" },
        { id: "live", c: 5, r: 0, label: "Live dashboard", sub: "seconds behind" },
        { id: "act", c: 5, r: 2, label: "Alerts & actions", sub: "block · page\nnotify" },
      ],
      edges: [
        { from: "app", to: "bus" },
        { from: "bus", to: "proc" },
        { from: "proc", to: "dlq", flow: "control", v: true },
        { from: "proc", to: "wh" },
        { from: "proc", to: "kv" },
        { from: "wh", to: "live" },
        { from: "kv", to: "act" },
      ],
      steps: [
        { node: ["app"], title: "A card payment at 14:05:01.200", body: "Every payment is published as an event the moment it happens, with the time it happened inside it.", record: { lang: "json", text: '{ "event_id": "e-7f3a", "user": 8812,\n  "amount": 2400000, "ts": "14:05:01.200" }' } },
        { node: ["bus"], title: "Into a durable event bus", body: "The bus keeps every event for days and lets many consumers read it independently. Events for the same user share an ordering key.", record: { lang: "text", text: "topic: payments · key: user-8812 · kept 7 days" } },
        { node: ["proc"], title: "Windowed, deduplicated, scored", body: "The processor groups events in one-minute windows by event time, drops repeats by event_id, compares the amount with the user's usual spend and scores it.", record: { lang: "json", text: '{ "user": 8812, "window": "14:05",\n  "spend_vs_30d": 11.4, "risk": 0.93 }' } },
        { node: ["dlq"], title: "Bad events go aside, not into the void", body: "An event that can't be parsed goes to a dead-letter topic so the job keeps running, and it can be fixed and replayed later.", record: { lang: "text", text: "payments-dlq: 1 event · reason: amount is not a number" } },
        { node: ["kv"], title: "Written where an app can read it fast", body: "The score lands in a low-latency store the payment service checks before approving the next transaction.", record: { lang: "text", text: "risk:user-8812 = 0.93  (ttl 1 h)" } },
        { node: ["act"], title: "Acted on within seconds", body: "Over the threshold: the card is held and the customer gets a confirmation request, all before the coffee is handed over.", record: { lang: "text", text: "risk 0.93 > 0.90 → hold card · send confirmation" } },
        { node: ["wh", "live"], title: "And kept for analysis", body: "The same events stream into BigQuery, where the ops dashboard and later analysis read them.", record: { lang: "sql", text: "SELECT COUNT(*) FROM payments\nWHERE ts > TIMESTAMP_SUB(CURRENT_TIMESTAMP(),\n  INTERVAL 5 MINUTE)" } },
      ],
      latency: "seconds",
      ratings: { fresh: 5, cost: 4, effort: 5, replay: 3 },
      best: ["Fraud checks, monitoring, live operations", "Anything where acting a minute late is too late", "Feeding apps, not just dashboards"],
      watch: ["Most dashboards don't need seconds: batch is far cheaper", "Late and out-of-order events, duplicates, state", "Always-on workers cost money even when quiet"],
      tools: [
        ["GCP", "Pub/Sub · Dataflow · BigQuery · Bigtable"],
        ["AWS", "Kinesis · Managed Flink · Redshift streaming · DynamoDB"],
        ["Open source", "Kafka · Flink · ClickHouse · Redis"],
      ],
      seeAlso: { href: "/skills/data-engineering/lab#stream", label: "Windows and watermarks on live Wikipedia edits" },
    },
    {
      id: "lakehouse",
      name: "Lakehouse",
      short: "Lakehouse",
      tagline: "Cheap object storage with table formats on top: bronze, silver and gold layers shared by BI and machine learning.",
      flow: "batch",
      nodes: [
        { id: "bsrc", c: 0, r: 0, label: "Batch sources", sub: "DB exports · files" },
        { id: "ssrc", c: 0, r: 2, label: "Streams", sub: "events · CDC" },
        { id: "ingest", c: 1, r: 1, label: "Ingestion", sub: "Spark or\nDataflow jobs", icon: "apachespark" },
        { id: "bronze", c: 2, r: 1, label: "Bronze", sub: "raw, append-only" },
        { id: "silver", c: 3, r: 1, label: "Silver", sub: "clean · deduped\njoined" },
        { id: "gold", c: 4, r: 1, label: "Gold", sub: "aggregates\nfeatures" },
        { id: "sql", c: 5, r: 0, label: "BI & SQL", sub: "Trino · Databricks\nBigQuery", icon: "trino" },
        { id: "ml", c: 5, r: 2, label: "ML & notebooks", sub: "Spark · Python", icon: "python" },
        { id: "catalog", c: 3, r: 2.3, label: "Catalog", sub: "schemas · access\nlineage", control: true },
      ],
      edges: [
        { from: "bsrc", to: "ingest" },
        { from: "ssrc", to: "ingest" },
        { from: "ingest", to: "bronze" },
        { from: "bronze", to: "silver" },
        { from: "silver", to: "gold" },
        { from: "gold", to: "sql" },
        { from: "gold", to: "ml" },
        { from: "catalog", to: "silver", flow: "control", v: true },
      ],
      group: { c0: 2, c1: 4, r: 1, label: "object storage (GCS / S3) + Delta Lake or Iceberg tables" },
      steps: [
        { node: ["bsrc", "ssrc"], title: "Delivery pings and the orders table", body: "Trucks send GPS pings as JSON events all day; the orders table arrives as a nightly export. Two shapes, two speeds.", record: { lang: "json", text: '{ "truck": "T-17", "lat": -6.21, "lon": 106.82,\n  "ts": "2026-11-10T14:05:12" }' } },
        { node: ["ingest"], title: "Ingested as they are", body: "One job reads both sources and writes them to the lake without changing anything. Fixing comes later.", record: { lang: "text", text: "pings: 1.2 m rows/day · orders: nightly export" } },
        { node: ["bronze"], title: "Bronze: keep everything", body: "Append-only tables in an open format on object storage. If a later step has a bug, it is rebuilt from here.", record: { lang: "path", text: "gs://lake/bronze/pings/date=2026-11-10/*.parquet\n+ _delta_log/ (the transaction log)" } },
        { node: ["silver"], title: "Silver: clean, deduplicated, joined", body: "A MERGE removes duplicate pings and joins them to orders, giving one row per delivery stop. ACID transactions mean readers never see half a write.", record: { lang: "sql", text: "MERGE INTO silver.stops s\nUSING new_stops n ON s.stop_id = n.stop_id\nWHEN NOT MATCHED THEN INSERT *" } },
        { node: ["gold"], title: "Gold: numbers and features", body: "Daily on-time rate per city for the dashboard, and per-stop features for the arrival-time model, from the same silver table.", record: { lang: "row", text: "city      day      on_time\nJakarta   10 Nov   91.4 %" } },
        { node: ["sql"], title: "BI reads the lake directly", body: "A SQL engine queries gold tables where they sit, so there is no second copy in a warehouse to keep in sync." },
        { node: ["ml"], title: "ML reads the same tables, at any version", body: "Time travel reproduces exactly the data last month's model was trained on.", record: { lang: "sql", text: "SELECT * FROM gold.stop_features\nVERSION AS OF 412" } },
        { node: ["catalog"], title: "One catalog governs it all", body: "Schemas, permissions and lineage live in a catalog, so BI and ML users see the same definitions and only what they may see." },
      ],
      latency: "minutes to hours",
      ratings: { fresh: 3, cost: 3, effort: 4, replay: 5 },
      best: ["BI and machine learning on the same data", "Large or semi-structured data", "Open formats, no lock-in to one engine"],
      watch: ["Small files and table maintenance (compaction, cleanup)", "Governance needs real effort", "Overkill for data that fits in one warehouse"],
      tools: [
        ["GCP", "Cloud Storage · BigLake Iceberg tables · Dataproc · BigQuery"],
        ["AWS", "S3 · Iceberg · Glue · Athena or EMR"],
        ["Open source", "MinIO · Delta Lake or Iceberg · Spark · Trino"],
      ],
      seeAlso: { href: "/skills/analytics/models#pipeline", label: "Bronze, silver and gold on real retail data" },
    },
    {
      id: "cdc",
      name: "Change data capture",
      short: "CDC",
      tagline: "Read the database's own change log and replay every insert, update and delete downstream, within seconds.",
      flow: "cdc",
      nodes: [
        { id: "db", c: 0, r: 1, label: "App database", sub: "PostgreSQL\nor MySQL", icon: "postgresql" },
        { id: "log", c: 1, r: 1, label: "Change log", sub: "WAL / binlog" },
        { id: "conn", c: 2, r: 1, label: "CDC connector", sub: "Debezium or\nDatastream" },
        { id: "bus", c: 3, r: 1, label: "Change stream", sub: "Kafka / Pub/Sub", icon: "apachekafka" },
        { id: "wh", c: 4, r: 0, label: "Warehouse", sub: "current + history\nBigQuery", icon: "googlebigquery" },
        { id: "search", c: 4, r: 2, label: "Search & cache", sub: "kept in sync", icon: "redis" },
        { id: "bi", c: 5, r: 0, label: "Analytics", sub: "a minute behind" },
      ],
      edges: [
        { from: "db", to: "log" },
        { from: "log", to: "conn" },
        { from: "conn", to: "bus" },
        { from: "bus", to: "wh" },
        { from: "bus", to: "search" },
        { from: "wh", to: "bi" },
      ],
      steps: [
        { node: ["db"], title: "A customer moves house", body: "The app runs an ordinary update. Nobody writes any extra code for analytics.", record: { lang: "sql", text: "UPDATE customers SET city = 'Makassar'\nWHERE id = 8812;" } },
        { node: ["log"], title: "The database has already logged it", body: "Every committed change goes to the write-ahead log for crash recovery anyway. CDC reads that log, so it adds no query load on the app's tables.", record: { lang: "text", text: "LSN 0/1A2B3C8 · UPDATE customers id=8812" } },
        { node: ["conn"], title: "Turned into a change event", body: "The connector emits before and after images. On its first run it snapshots existing rows, then follows the log from that exact position.", record: { lang: "json", text: '{ "op": "u",\n  "before": { "id": 8812, "city": "Bandung" },\n  "after":  { "id": 8812, "city": "Makassar" },\n  "ts_ms": 1794294300000 }' } },
        { node: ["bus"], title: "Ordered per key", body: "Events are keyed by customer id, so all changes to one customer arrive in the order they happened.", record: { lang: "text", text: "topic: db.public.customers · key: 8812" } },
        { node: ["wh"], title: "Merged into current and history tables", body: "The current table is updated; the history table closes the old row and opens a new one (slowly changing dimension, type 2). Deletes become soft deletes.", record: { lang: "row", text: "id    city      valid_from   valid_to\n8812  Bandung   2023-04-02   2026-11-10 14:05\n8812  Makassar  2026-11-10   (current)" } },
        { node: ["search"], title: "Search and caches follow the same events", body: "The same stream updates the search index and clears stale cache entries, so every system agrees." },
        { node: ["bi"], title: "Analytics within a minute, with history", body: "Dashboards see the move almost at once, and the history still says where the customer lived before." },
      ],
      latency: "seconds to minutes",
      ratings: { fresh: 4, cost: 3, effort: 4, replay: 3 },
      best: ["Copying app databases to analytics without nightly dumps", "Audit trails and history (SCD type 2)", "Keeping search, caches and services in sync"],
      watch: ["Schema changes on the source", "The first snapshot of very large tables", "Ordering, duplicates and deletes: MERGE must be idempotent"],
      tools: [
        ["GCP", "Datastream → BigQuery"],
        ["AWS", "Database Migration Service · MSK"],
        ["Open source", "Debezium · Kafka Connect · Kafka"],
      ],
      seeAlso: { href: "/skills/analytics/models#methods", label: "CDC, SCD types and MERGE, animated" },
    },
    {
      id: "reverse",
      name: "Reverse ETL",
      short: "Reverse ETL",
      tagline: "The warehouse stops being the last stop: modelled results are pushed back into the tools teams work in.",
      flow: "reverse",
      nodes: [
        { id: "wh", c: 0, r: 1, label: "Warehouse", sub: "BigQuery\nmodelled tables", icon: "googlebigquery" },
        { id: "model", c: 1, r: 1, label: "Audience model", sub: "dbt: churn risk\n+ segments", mono: "dbt" },
        { id: "sync", c: 2, r: 1, label: "Sync job", sub: "diff · upsert\nretry · rate limit" },
        { id: "crm", c: 3.5, r: 0, label: "CRM", sub: "HubSpot\nor Salesforce", icon: "hubspot" },
        { id: "ads", c: 3.5, r: 1, label: "Ad audiences", sub: "Google Ads", icon: "googleads" },
        { id: "sup", c: 3.5, r: 2, label: "Support & chat", sub: "Zendesk · WhatsApp", icon: "zendesk" },
        { id: "team", c: 5, r: 1, label: "Teams act", sub: "call · offer\nprioritise" },
      ],
      edges: [
        { from: "wh", to: "model" },
        { from: "model", to: "sync" },
        { from: "sync", to: "crm" },
        { from: "sync", to: "ads" },
        { from: "sync", to: "sup" },
        { from: "crm", to: "team" },
        { from: "ads", to: "team" },
        { from: "sup", to: "team" },
      ],
      steps: [
        { node: ["wh"], title: "A churn score, computed every night", body: "A model in the warehouse scores each customer's risk of leaving. Until now it lived on a dashboard few people opened.", record: { lang: "row", text: "customer  contract        churn_risk\n8812      month-to-month  0.82" } },
        { node: ["model"], title: "Turned into an audience", body: "A dbt model decides who counts as at risk and which fields each tool needs, and nothing more.", record: { lang: "sql", text: "SELECT customer_id, email_sha256, churn_risk\nFROM {{ ref('customer_scores') }}\nWHERE churn_risk > 0.7" } },
        { node: ["sync"], title: "Only what changed is sent", body: "The sync compares with the last run and sends just the new, changed and removed rows. Upserts by an external id make retries safe; rate limits are respected.", record: { lang: "text", text: "diff vs last sync → added · changed · removed\nupsert by customer_id · retry with backoff" } },
        { node: ["crm"], title: "The account manager sees it in the CRM", body: "A churn-risk field and a follow-up task appear on the customer's record.", record: { lang: "json", text: '{ "customer_id": 8812, "churn_risk": 0.82,\n  "task": "call this week" }' } },
        { node: ["ads"], title: "Ads stop chasing someone you already have", body: "The customer moves from acquisition ads to a win-back audience. Emails are sent hashed, as the ad platform requires." },
        { node: ["sup"], title: "Support knows too", body: "Tickets from at-risk customers jump the queue; a retention offer goes out on WhatsApp only to people who opted in." },
        { node: ["team"], title: "People act where they already work", body: "No one has to remember to open a dashboard. Outcomes (saved or lost) flow back into the warehouse with the next batch load." },
      ],
      latency: "minutes to hours",
      ratings: { fresh: 3, cost: 2, effort: 3, replay: 3 },
      best: ["Putting scores and segments where teams work", "Marketing audiences and sales follow-ups", "One definition of a customer across tools"],
      watch: ["Matching identities across tools", "API rate limits and partial failures", "Consent and privacy: send only the fields needed"],
      tools: [
        ["GCP", "BigQuery · Cloud Run job · Workflows"],
        ["Products", "Hightouch · Census"],
        ["Open source", "custom jobs on Airflow · dbt"],
      ],
      seeAlso: { href: "/skills/analytics/dashboards/churn", label: "The kind of churn score this would sync" },
    },
  ];
}

/* ------------------------------------------------------------------ the fit picker */
export const QUESTIONS: { q: string; options: { label: string; score: Partial<Record<ArchId, number>>; why: Partial<Record<ArchId, string>> }[] }[] = [
  {
    q: "How fresh must the data be?",
    options: [
      { label: "Next morning is fine", score: { batch: 3, lakehouse: 2, site: 2, reverse: 1 }, why: { batch: "daily freshness is exactly what scheduled batch gives", lakehouse: "scheduled jobs on the lake are enough", site: "a manual refresh is enough", reverse: "nightly syncs are typical" } },
      { label: "Within the hour", score: { batch: 1, lakehouse: 2, cdc: 3, reverse: 2 }, why: { cdc: "changes arrive within minutes", lakehouse: "frequent incremental jobs fit", reverse: "syncs can run every few minutes", batch: "hourly runs are possible" } },
      { label: "Within seconds", score: { stream: 4, cdc: 2 }, why: { stream: "only streaming reacts within seconds", cdc: "CDC can be near real time" } },
    ],
  },
  {
    q: "Where does the data come from?",
    options: [
      { label: "App database tables", score: { cdc: 3, batch: 2 }, why: { cdc: "the database's change log is the cleanest source", batch: "incremental extracts from tables work well" } },
      { label: "Events from apps or devices", score: { stream: 3, lakehouse: 1 }, why: { stream: "events are already a stream", lakehouse: "events can land in bronze" } },
      { label: "Files and SaaS exports", score: { batch: 2, lakehouse: 2, site: 2 }, why: { batch: "files load naturally on a schedule", lakehouse: "files land as-is in bronze", site: "files can be processed by a script" } },
      { label: "Already in the warehouse", score: { reverse: 5 }, why: { reverse: "the data is modelled; it needs to reach the tools" } },
    ],
  },
  {
    q: "Who uses the result?",
    options: [
      { label: "Dashboards and reports", score: { batch: 2, site: 1, lakehouse: 1 }, why: { batch: "marts in a warehouse are built for BI", site: "static dashboards can read small files", lakehouse: "gold tables serve BI" } },
      { label: "Data science and ML too", score: { lakehouse: 3 }, why: { lakehouse: "BI and ML share the same tables and versions" } },
      { label: "Sales, marketing and support tools", score: { reverse: 4 }, why: { reverse: "it pushes results into those tools" } },
      { label: "Apps and alerts", score: { stream: 3, cdc: 1 }, why: { stream: "apps need answers in seconds", cdc: "services can react to change events" } },
    ],
  },
  {
    q: "How big is it?",
    options: [
      { label: "Small: fits on a laptop", score: { site: 2, batch: 1 }, why: { site: "no platform is needed for data this small", batch: "a small warehouse stays cheap" } },
      { label: "Big or messy (JSON, logs, images)", score: { lakehouse: 2, stream: 1 }, why: { lakehouse: "object storage takes any shape at low cost", stream: "high volume suits a stream" } },
    ],
  },
];
