/**
 * The Data Models page: one entry per way of shaping data, each on a different kind of data.
 * Real samples where we have them (Online Retail rows and products, Jakarta's hourly PM2.5, the co-purchase graph,
 * the TfL API's shape); labelled examples elsewhere. Built on the server; only these small objects reach the browser.
 */
import retail from "./models/product-recommender.json";
import lf from "./models/live-forecasts.json";
import raw from "./retail-raw-sample.json";

export type Col = { n: string; t: string; k?: "pk" | "fk" };
export type Kind = "fact" | "dim" | "table" | "event" | "history" | "node" | "edge" | "agg";
export type Table = { name: string; kind: Kind; x: number; y: number; cols: Col[] };
export type Sample = { title: string; columns: string[]; rows: (string | number)[][] };
export type Model = {
  id: string;
  name: string;
  family: "Transactional" | "Analytical" | "Specialised";
  domain: string;
  data: "real" | "example";
  source: string;
  blurb: string;
  tables: Table[];
  links: [string, string][];
  sample: Sample;
  json?: string;
  best: string[];
  watch: string[];
  question: string;
  sql: string;
};

const C = (n: string, t: string, k?: "pk" | "fk"): Col => ({ n, t, k });
const cat = retail.catalog;
const prod = (i: number) => cat[i];
const rawRows = raw.rows;
const money = (v: number) => Math.round(v * 100) / 100;
const snap = lf.pm25.snapshot;

export const DATA_MODELS: Model[] = [
  {
    id: "flat",
    name: "Flat file (raw export)",
    family: "Transactional",
    domain: "Online shop orders",
    data: "real",
    source: "UCI Online Retail (CC BY 4.0): rows copied from the file, customer IDs left out",
    blurb:
      "One wide table, one row per line of every order, exactly as the shop's system exported it. Easy to open, painful to analyse: descriptions repeat on every row, and cancellations and postage sit next to real products.",
    tables: [
      {
        name: "online_retail.xlsx",
        kind: "table",
        x: 200,
        y: 30,
        cols: [
          C("InvoiceNo", "text"),
          C("StockCode", "text"),
          C("Description", "text"),
          C("Quantity", "int"),
          C("InvoiceDate", "datetime"),
          C("UnitPrice", "decimal"),
          C("CustomerID", "int"),
          C("Country", "text"),
        ],
      },
    ],
    links: [],
    sample: {
      title: `${retail.dataset.raw_rows.toLocaleString("en-US")} rows like these`,
      columns: ["InvoiceNo", "StockCode", "Description", "Qty", "InvoiceDate", "Price", "Country"],
      rows: rawRows.map((r) => [r.invoice, r.stock, r.description ?? "", r.quantity, r.date, r.price, r.country]),
    },
    best: ["Moving data between systems", "A first look in a spreadsheet"],
    watch: ["Repeated text wastes space and drifts (same product, two spellings)", "No rules: a cancellation (C536379) and postage look like sales"],
    question: "Orders per month",
    sql: `SELECT strftime(InvoiceDate, '%Y-%m') AS month,
       COUNT(DISTINCT InvoiceNo) AS orders
FROM online_retail
WHERE InvoiceNo NOT LIKE 'C%'          -- cleaning rules live in every query
  AND Quantity > 0 AND UnitPrice > 0
  AND StockCode NOT IN ('POST', 'D', 'M')
GROUP BY month ORDER BY month;`,
  },
  {
    id: "oltp",
    name: "Normalised (OLTP, 3NF)",
    family: "Transactional",
    domain: "Online shop orders",
    data: "real",
    source: "UCI Online Retail (CC BY 4.0): product codes and names from the data",
    blurb: "How an app's database stores the same orders: every fact once, in its own table, linked by keys. Writing and updating is fast and safe; reporting needs several joins.",
    tables: [
      { name: "customers", kind: "table", x: 20, y: 30, cols: [C("customer_key", "int", "pk"), C("country", "text")] },
      { name: "invoices", kind: "table", x: 220, y: 30, cols: [C("invoice_no", "text", "pk"), C("invoice_date", "datetime"), C("customer_key", "int", "fk"), C("is_cancelled", "bool")] },
      { name: "invoice_lines", kind: "table", x: 220, y: 190, cols: [C("invoice_no", "text", "fk"), C("stock_code", "text", "fk"), C("quantity", "int"), C("unit_price", "decimal")] },
      { name: "products", kind: "table", x: 430, y: 190, cols: [C("stock_code", "text", "pk"), C("description", "text")] },
    ],
    links: [
      ["invoices", "customers"],
      ["invoice_lines", "invoices"],
      ["invoice_lines", "products"],
    ],
    sample: {
      title: `products: ${retail.dataset.products.toLocaleString("en-US")} rows, each name stored once`,
      columns: ["stock_code", "description"],
      rows: [0, 1, 2, 3, 4].map((i) => [prod(i).id, prod(i).name]),
    },
    best: ["Apps that create and edit records", "Keeping data consistent (change a name in one place)"],
    watch: ["Reports need many joins", "Heavy analytical queries slow down the app"],
    question: "Revenue per product per month",
    sql: `SELECT date_trunc('month', i.invoice_date) AS month,
       p.description,
       SUM(l.quantity * l.unit_price) AS revenue
FROM invoice_lines l
JOIN invoices i USING (invoice_no)
JOIN products p USING (stock_code)
WHERE NOT i.is_cancelled
GROUP BY month, p.description;`,
  },
  {
    id: "star",
    name: "Star schema",
    family: "Analytical",
    domain: "Retail sales",
    data: "real",
    source: "UCI Online Retail (CC BY 4.0): products and real median prices",
    blurb:
      "The standard model for BI tools such as Power BI: one central fact table of events with numbers to add up, surrounded by dimension tables that describe them. Filters flow from dimensions to facts.",
    tables: [
      {
        name: "fact_sales",
        kind: "fact",
        x: 220,
        y: 120,
        cols: [C("date_key", "int", "fk"), C("product_key", "int", "fk"), C("country_key", "int", "fk"), C("invoice_no", "text"), C("quantity", "int"), C("revenue", "decimal")],
      },
      { name: "dim_date", kind: "dim", x: 20, y: 20, cols: [C("date_key", "int", "pk"), C("date", "date"), C("month", "text"), C("weekday", "text")] },
      { name: "dim_product", kind: "dim", x: 430, y: 20, cols: [C("product_key", "int", "pk"), C("stock_code", "text"), C("description", "text"), C("price", "decimal")] },
      { name: "dim_country", kind: "dim", x: 20, y: 250, cols: [C("country_key", "int", "pk"), C("country", "text"), C("region", "text")] },
    ],
    links: [
      ["fact_sales", "dim_date"],
      ["fact_sales", "dim_product"],
      ["fact_sales", "dim_country"],
    ],
    sample: { title: "dim_product", columns: ["product_key", "stock_code", "description", "median price (£)"], rows: [0, 1, 2, 3].map((i) => [i + 1, prod(i).id, prod(i).name, money(prod(i).price)]) },
    best: ["Dashboards and BI models", "Fast slicing by any dimension"],
    watch: ["Needs an ETL step to build and refresh", "Granularity of the fact table must be decided up front"],
    question: "Revenue per product per month",
    sql: `SELECT d.month, p.description, SUM(f.revenue) AS revenue
FROM fact_sales f
JOIN dim_date d USING (date_key)
JOIN dim_product p USING (product_key)
GROUP BY d.month, p.description;   -- cleaning already done when the fact table was built`,
  },
  {
    id: "snowflake",
    name: "Snowflake schema",
    family: "Analytical",
    domain: "Retail sales",
    data: "example",
    source: "Example: Online Retail has no product categories, so these are illustrative",
    blurb: "A star whose dimensions are split further: products point to categories, categories to departments. Less repetition, more joins. Useful when a hierarchy is shared by several facts.",
    tables: [
      { name: "fact_sales", kind: "fact", x: 20, y: 120, cols: [C("date_key", "int", "fk"), C("product_key", "int", "fk"), C("quantity", "int"), C("revenue", "decimal")] },
      { name: "dim_product", kind: "dim", x: 220, y: 120, cols: [C("product_key", "int", "pk"), C("description", "text"), C("category_key", "int", "fk")] },
      { name: "dim_category", kind: "dim", x: 420, y: 60, cols: [C("category_key", "int", "pk"), C("category", "text"), C("department_key", "int", "fk")] },
      { name: "dim_department", kind: "dim", x: 420, y: 230, cols: [C("department_key", "int", "pk"), C("department", "text")] },
    ],
    links: [
      ["fact_sales", "dim_product"],
      ["dim_product", "dim_category"],
      ["dim_category", "dim_department"],
    ],
    sample: {
      title: "dim_category (example)",
      columns: ["category_key", "category", "department_key"],
      rows: [
        [1, "Candle holders", 1],
        [2, "Lanterns", 1],
        [3, "Bags", 2],
        [4, "Kitchen", 3],
      ],
    },
    best: ["Shared, deep hierarchies", "Large dimensions where repetition is costly"],
    watch: ["More joins than a star", "BI tools usually prefer the flattened star"],
    question: "Revenue per department",
    sql: `SELECT dp.department, SUM(f.revenue) AS revenue
FROM fact_sales f
JOIN dim_product p USING (product_key)
JOIN dim_category c USING (category_key)
JOIN dim_department dp USING (department_key)
GROUP BY dp.department;`,
  },
  {
    id: "obt",
    name: "One big table (wide)",
    family: "Analytical",
    domain: "Retail sales",
    data: "real",
    source: "UCI Online Retail (CC BY 4.0): the cleaned rows from the flat-file example",
    blurb:
      "Everything joined and cleaned in advance into one wide table. The simplest thing for a dashboard or an analyst to query, at the cost of storage and of rebuilding it when anything changes.",
    tables: [
      {
        name: "sales_wide",
        kind: "table",
        x: 200,
        y: 30,
        cols: [C("invoice_no", "text"), C("date", "date"), C("month", "text"), C("weekday", "text"), C("product", "text"), C("country", "text"), C("quantity", "int"), C("revenue", "decimal")],
      },
    ],
    links: [],
    sample: {
      title: "sales_wide: cleaning and joins already applied",
      columns: ["date", "month", "weekday", "product", "country", "qty", "revenue"],
      rows: rawRows
        .filter((r) => r.quantity > 0 && !["POST", "D"].includes(r.stock))
        .map((r) => [r.date.slice(0, 10), r.date.slice(0, 7), "Wed", r.description ?? "", r.country, r.quantity, money(r.quantity * r.price)]),
    },
    best: ["Self-service dashboards", "Columnar warehouses (BigQuery, DuckDB) that compress repeats"],
    watch: ["Rebuild needed when a dimension changes", "Easy to let it grow into hundreds of columns"],
    question: "Revenue per product per month",
    sql: `SELECT month, product, SUM(revenue) AS revenue
FROM sales_wide
GROUP BY month, product;   -- no joins at all`,
  },
  {
    id: "event",
    name: "Event log (clickstream)",
    family: "Specialised",
    domain: "App analytics",
    data: "example",
    source: "Example: a made-up coffee app",
    blurb: "One row per thing that happened, in time order, with flexible properties. The raw material for funnels, retention and sessions. Never updated, only appended.",
    tables: [
      {
        name: "events",
        kind: "event",
        x: 120,
        y: 40,
        cols: [C("event_id", "text", "pk"), C("event_time", "timestamp"), C("user_key", "int", "fk"), C("session_id", "text"), C("event_name", "text"), C("properties", "json")],
      },
      { name: "users", kind: "dim", x: 420, y: 60, cols: [C("user_key", "int", "pk"), C("signup_date", "date"), C("city", "text")] },
    ],
    links: [["events", "users"]],
    sample: {
      title: "events (example)",
      columns: ["event_time", "user", "session", "event_name", "properties"],
      rows: [
        ["2026-11-03 08:01:12", 1042, "s-88", "app_open", "{}"],
        ["2026-11-03 08:01:40", 1042, "s-88", "view_item", '{"item":"Kopi susu"}'],
        ["2026-11-03 08:02:05", 1042, "s-88", "add_to_cart", '{"item":"Kopi susu","qty":2}'],
        ["2026-11-03 08:03:31", 1042, "s-88", "purchase", '{"total":56000}'],
        ["2026-11-03 08:04:10", 2215, "s-91", "app_open", "{}"],
      ],
    },
    best: ["Funnels, retention and product analytics", "Replaying what users did"],
    watch: ["Huge volumes: partition by date", "Event names and properties need a tracking plan or they drift"],
    question: "Conversion from view to purchase",
    sql: `SELECT COUNT(DISTINCT CASE WHEN event_name = 'view_item' THEN user_key END) AS viewed,
       COUNT(DISTINCT CASE WHEN event_name = 'purchase'  THEN user_key END) AS bought
FROM events
WHERE event_time >= DATE '2026-11-01';`,
  },
  {
    id: "timeseries",
    name: "Time series (long format)",
    family: "Specialised",
    domain: "Air quality sensors",
    data: "real",
    source: "Open-Meteo / CAMS, CC BY 4.0: Jakarta's hourly PM2.5 from the Live Forecast project",
    blurb:
      "A timestamp, what was measured, where, and the value. Long format (one row per measurement) adds new sensors without changing the table; it's pivoted to wide (one column per sensor) for charts.",
    tables: [
      { name: "measurements", kind: "fact", x: 120, y: 40, cols: [C("measured_at", "timestamp"), C("location_key", "int", "fk"), C("metric", "text"), C("value", "float")] },
      { name: "locations", kind: "dim", x: 420, y: 60, cols: [C("location_key", "int", "pk"), C("city", "text"), C("lat", "float"), C("lon", "float")] },
    ],
    links: [["measurements", "locations"]],
    sample: {
      title: "measurements: real hourly values",
      columns: ["measured_at", "city", "metric", "value (µg/m³)"],
      rows: snap.time.slice(-5).map((t, i) => [t.replace("T", " "), lf.pm25.place, "pm2_5", snap.value[snap.value.length - 5 + i]]),
    },
    best: ["Sensors, prices, traffic, anything measured over time", "Rolling averages and seasonality"],
    watch: ["Missing and duplicated timestamps", "Time zones: store UTC, display local"],
    question: "Daily average PM2.5",
    sql: `SELECT date_trunc('day', measured_at) AS day, AVG(value) AS pm25
FROM measurements
WHERE metric = 'pm2_5'
GROUP BY day ORDER BY day;`,
  },
  {
    id: "scd2",
    name: "History table (SCD type 2)",
    family: "Analytical",
    domain: "HR records",
    data: "example",
    source: "Example: made-up employees",
    blurb: "A dimension that keeps its past. When something changes (a move to another department), the old row is closed and a new one opened, so reports can show the truth as it was on any date.",
    tables: [
      {
        name: "dim_employee",
        kind: "history",
        x: 120,
        y: 40,
        cols: [C("employee_key", "int", "pk"), C("employee_id", "text"), C("department", "text"), C("city", "text"), C("valid_from", "date"), C("valid_to", "date"), C("is_current", "bool")],
      },
      { name: "fact_payroll", kind: "fact", x: 420, y: 60, cols: [C("employee_key", "int", "fk"), C("month", "date"), C("amount", "decimal")] },
    ],
    links: [["fact_payroll", "dim_employee"]],
    sample: {
      title: "dim_employee (example)",
      columns: ["key", "employee", "department", "city", "valid_from", "valid_to", "current"],
      rows: [
        [1, "E-104", "Sales", "Bandung", "2023-02-01", "2025-06-30", "no"],
        [2, "E-104", "Marketing", "Jakarta", "2025-07-01", "9999-12-31", "yes"],
        [3, "E-221", "Finance", "Surabaya", "2024-01-15", "9999-12-31", "yes"],
      ],
    },
    best: ["Headcount, territories, prices or customer segments over time", "Audits: “what did we know then?”"],
    watch: ["Joins must pick the version valid at the event's date", "Tables grow with every change"],
    question: "Headcount per department at the end of 2024",
    sql: `SELECT department, COUNT(*) AS headcount
FROM dim_employee
WHERE DATE '2024-12-31' BETWEEN valid_from AND valid_to
GROUP BY department;`,
  },
  {
    id: "graph",
    name: "Graph (nodes and edges)",
    family: "Specialised",
    domain: "Product co-purchases",
    data: "real",
    source: "UCI Online Retail (CC BY 4.0): pairs from the Product Recommender project",
    blurb: "Things (nodes) and the relationships between them (edges), each edge with its own numbers. Natural for networks: who bought what with what, who follows whom, which roads connect.",
    tables: [
      { name: "products", kind: "node", x: 80, y: 60, cols: [C("product_key", "int", "pk"), C("stock_code", "text"), C("description", "text")] },
      { name: "bought_together", kind: "edge", x: 380, y: 60, cols: [C("product_a", "int", "fk"), C("product_b", "int", "fk"), C("baskets", "int"), C("cosine", "float")] },
    ],
    links: [["bought_together", "products"]],
    sample: {
      title: "bought_together: real pairs",
      columns: ["product_a", "product_b", "baskets together", "cosine"],
      rows: [0, 1, 2].flatMap((i) => (retail.neighbors[i] as number[][]).slice(0, 2).map((nb) => [prod(i).name, prod(nb[0]).name, nb[1], nb[2]])),
    },
    best: ["Recommendations, networks, routes, fraud rings", "“Friends of friends” questions"],
    watch: ["Many-hop questions are slow in plain SQL", "Edges can explode in number"],
    question: "Products most often bought with the T-light holder",
    sql: `SELECT p.description, e.baskets
FROM bought_together e
JOIN products p ON p.product_key = e.product_b
WHERE e.product_a = 1          -- White Hanging Heart T-light Holder
ORDER BY e.baskets DESC LIMIT 5;`,
  },
  {
    id: "document",
    name: "Document (JSON)",
    family: "Specialised",
    domain: "Public API responses",
    data: "real",
    source: "Shape of the TfL Places API used by the Traffic Counter project (values shortened)",
    blurb: "Semi-structured records: nested objects and lists, fields that differ between records. Common for APIs and logs; flattened into tables before analysis.",
    tables: [
      {
        name: "places[]",
        kind: "table",
        x: 200,
        y: 30,
        cols: [C("id", "text"), C("commonName", "text"), C("lat", "number"), C("lon", "number"), C("additionalProperties[]", "list"), C("  .key", "text"), C("  .value", "text")],
      },
    ],
    links: [],
    json: `{
  "id": "JamCams_00001.07450",
  "commonName": "Piccadilly Circus",
  "lat": 51.5…, "lon": -0.13…,
  "additionalProperties": [
    { "key": "available", "value": "true" },
    { "key": "videoUrl",  "value": "https://…/00001.07450.mp4" }
  ]
}`,
    sample: { title: "after flattening", columns: ["id", "commonName", "available", "videoUrl"], rows: [["JamCams_00001.07450", "Piccadilly Circus", "true", "…/00001.07450.mp4"]] },
    best: ["APIs, event payloads, settings", "Data whose fields vary from record to record"],
    watch: ["Flatten before joining and aggregating", "Fields can quietly change type"],
    question: "Available cameras",
    sql: `SELECT id, commonName
FROM places, UNNEST(additionalProperties) AS p
WHERE p.key = 'available' AND p.value = 'true';`,
  },
  {
    id: "agg",
    name: "Summary table (aggregate)",
    family: "Analytical",
    domain: "Monthly reporting",
    data: "real",
    source: "UCI Online Retail (CC BY 4.0): orders per month from the cleaned data",
    blurb: "Pre-computed totals at a coarser grain (per month, per city). Tiny and instant for dashboards; it can only answer the questions it was built for.",
    tables: [{ name: "monthly_orders", kind: "agg", x: 200, y: 40, cols: [C("month", "text", "pk"), C("orders", "int"), C("revenue", "decimal"), C("refreshed_at", "timestamp")] }],
    links: [],
    sample: { title: "monthly_orders: real counts", columns: ["month", "orders"], rows: retail.eda.monthly.slice(-5).map((m) => [m.label, m.value]) },
    best: ["Executive dashboards and KPIs", "Very large facts summarised once a day"],
    watch: ["No drill-down below its grain", "Must be refreshed when late data arrives"],
    question: "Orders in November",
    sql: `SELECT orders FROM monthly_orders WHERE month = '2011-11';`,
  },
];
