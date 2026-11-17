"use client";

import type { ComponentType } from "react";
import p from "@/data/retail-profile.json";
import { TableAnim, type TRow } from "./table-anim";
import * as V from "./visuals";

export const STAGES = ["Ingest", "Profile & test", "Clean", "Transform", "Model", "Store & speed", "Architecture", "Governance"] as const;
export type Stage = (typeof STAGES)[number];
export type Method = { id: string; name: string; stage: Stage; what: string; how: string[]; sql?: string; real: boolean; V: ComponentType };

const c = p.cases;
const n = (v: number) => v.toLocaleString("en-US");
const lines = p.invoice;
const row = (id: string, ...cells: (string | number | null)[]): TRow => ({ id, cells });
const short = (s: string | null, k = 22) => (s && s.length > k ? `${s.slice(0, k - 1)}…` : s);

/* ---------------------------------------------------------------- table demos (real rows where possible) */

const FullLoad = () => (
  <TableAnim
    labels={["Yesterday's copy", "After full reload"]}
    columns={["invoice", "code", "qty"]}
    before={[row("a", "536365", "85123A", 6), row("b", "536365", "71053", 6)]}
    after={[row("a2", "536365", "85123A", 6), row("b2", "536365", "71053", 6), row("c2", "536365", "84406B", 8), row("d2", "536365", "84029G", 6)]}
  />
);
const Incremental = () => (
  <TableAnim
    labels={["Loaded so far", "After this run"]}
    columns={["invoice", "date", "qty"]}
    before={lines.slice(0, 2).map((l, i) => row(`l${i}`, l.invoice, l.date, l.quantity))}
    after={[
      ...lines.slice(0, 2).map((l, i) => row(`l${i}`, l.invoice, l.date, l.quantity)),
      row("c", c.outlier.example[0].invoice, c.outlier.example[0].date, c.outlier.example[0].quantity),
      row("d", c.outlier.example[1].invoice, c.outlier.example[1].date, c.outlier.example[1].quantity),
    ]}
  />
);
const Cdc = () => (
  <TableAnim
    labels={["Copy", "After applying the change log"]}
    columns={["code", "description", "price"]}
    before={[row("a", "85123A", "White hanging heart", 2.55), row("b", "71053", "White metal lantern", 3.39), row("c", "22999", "Old product", 1.0)]}
    after={[row("a", "85123A", "White hanging heart", 2.95), row("b", "71053", "White metal lantern", 3.39), row("d", "23843", "Paper craft, little birdie", 2.08)]}
  />
);
const Dedupe = () => {
  const [a, b] = c.duplicates.example;
  return (
    <TableAnim
      columns={["invoice", "code", "description", "qty", "price"]}
      before={[
        row("x", lines[0].invoice, lines[0].stock, short(lines[0].description), lines[0].quantity, lines[0].price),
        row("a", a.invoice, a.stock, short(a.description), a.quantity, a.price),
        row("b", b.invoice, b.stock, short(b.description), b.quantity, b.price),
      ]}
      after={[row("x", lines[0].invoice, lines[0].stock, short(lines[0].description), lines[0].quantity, lines[0].price), row("a", a.invoice, a.stock, short(a.description), a.quantity, a.price)]}
    />
  );
};
const MISSING_ROWS = [lines[0], c.missing_description.example[0], c.zero_price.example[0], c.duplicates.example[0]];
const Missing = () => (
  <TableAnim
    labels={["Raw", "Flagged"]}
    columns={["invoice", "customer", "country"]}
    afterColumns={["invoice", "customer", "is_guest", "country"]}
    before={MISSING_ROWS.map((r, i) => row(`m${i}`, r.invoice, r.customer, r.country))}
    after={MISSING_ROWS.map((r, i) => row(`m${i}`, r.invoice, r.customer ?? "guest", r.customer ? "no" : "yes", r.country))}
  />
);
const Types = () => (
  <TableAnim
    labels={["As text", "Typed"]}
    columns={["InvoiceDate (text)", "Quantity (text)", "UnitPrice (text)"]}
    afterColumns={["invoice_ts (timestamp)", "quantity (int)", "unit_price (decimal)"]}
    before={lines.slice(0, 3).map((l, i) => row(`r${i}`, l.date.replace(/(\d+)-(\d+)-(\d+)/, "$3/$2/$1"), ` ${l.quantity} `, `£${l.price}`))}
    after={lines.slice(0, 3).map((l, i) => row(`r${i}`, `${l.date}:00`, l.quantity, l.price))}
  />
);
const Standardise = () => {
  const v = c.description_variants;
  const canonical = v.names[0].name;
  return (
    <TableAnim
      labels={["Raw spellings", "One standard name"]}
      columns={["code", "description", "rows"]}
      before={v.names.map((x, i) => row(`v${i}`, v.stock, x.name, x.rows))}
      after={v.names.map((x, i) => row(`v${i}`, v.stock, canonical.replace(" B'DRAW", " DRAWER").replace(",", " "), x.rows))}
    />
  );
};
const Invalid = () => {
  const ok = lines[0];
  const cancel = c.cancellations.example[0];
  const zero = c.zero_price.example[0];
  return (
    <TableAnim
      columns={["invoice", "code", "description", "qty", "price"]}
      before={[
        row("ok", ok.invoice, ok.stock, short(ok.description), ok.quantity, ok.price),
        row("c", cancel.invoice, cancel.stock, cancel.description, cancel.quantity, cancel.price),
        row("z", zero.invoice, zero.stock, zero.description, zero.quantity, zero.price),
        row("p", "536370", "POST", "POSTAGE", 3, 18),
      ]}
      after={[row("ok", ok.invoice, ok.stock, short(ok.description), ok.quantity, ok.price)]}
    />
  );
};
const Rename = () => (
  <TableAnim
    labels={["Source names", "House style"]}
    columns={["InvoiceNo", "StockCode", "UnitPrice"]}
    afterColumns={["invoice_no", "product_code", "unit_price_gbp"]}
    before={lines.slice(0, 2).map((l, i) => row(`r${i}`, l.invoice, l.stock, l.price))}
    after={lines.slice(0, 2).map((l, i) => row(`r${i}`, l.invoice, l.stock, l.price))}
  />
);
const Aggregate = () => {
  const revenue = Math.round(lines.reduce((s, l) => s + l.quantity * l.price, 0) * 100) / 100;
  return (
    <TableAnim
      labels={[`${lines.length} order lines`, "GROUP BY invoice"]}
      columns={["invoice", "code", "qty", "price"]}
      afterColumns={["invoice", "lines", "units", "revenue"]}
      before={lines.map((l, i) => row(`l${i}`, l.invoice, l.stock, l.quantity, l.price))}
      after={[
        row(
          "total",
          lines[0].invoice,
          lines.length,
          lines.reduce((s, l) => s + l.quantity, 0),
          revenue,
        ),
      ]}
    />
  );
};
const Pivot = () => {
  const cells = p.pivot.cells;
  const months = p.pivot.months;
  return (
    <TableAnim
      labels={["Long (one row per value)", "Wide (one column per month)"]}
      columns={["country", "month", "orders"]}
      afterColumns={["country", ...months]}
      before={cells.filter((x) => x.country !== "United Kingdom").map((x) => row(`${x.country}${x.month}`, x.country, x.month, x.orders))}
      after={p.pivot.countries.filter((k) => k !== "United Kingdom").map((k) => row(k, k, ...months.map((m) => cells.find((x) => x.country === k && x.month === m)?.orders ?? 0)))}
    />
  );
};
const Derived = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <TableAnim
      labels={["Raw", "With derived columns"]}
      columns={["date", "qty", "price"]}
      afterColumns={["date", "qty", "price", "revenue", "weekday"]}
      before={lines.slice(0, 3).map((l, i) => row(`r${i}`, l.date, l.quantity, l.price))}
      after={lines
        .slice(0, 3)
        .map((l, i) => row(`r${i}`, l.date, l.quantity, l.price, Math.round(l.quantity * l.price * 100) / 100, days[(new Date(`${l.date.slice(0, 10)}T00:00:00Z`).getUTCDay() + 6) % 7]))}
    />
  );
};
const Latest = () => (
  <TableAnim
    labels={["Every version", "ROW_NUMBER() = 1"]}
    columns={["customer", "city", "updated_at"]}
    before={[row("a1", "C-17", "Leeds", "2011-02-03"), row("a2", "C-17", "York", "2011-09-14"), row("b1", "C-42", "Lyon", "2011-05-01")]}
    after={[row("a2", "C-17", "York", "2011-09-14"), row("b1", "C-42", "Lyon", "2011-05-01")]}
  />
);
const Flatten = () => (
  <TableAnim
    labels={["Nested JSON", "Flattened"]}
    columns={["id", "additionalProperties"]}
    afterColumns={["id", "key", "value"]}
    before={[row("p", "JamCams_00001.07450", "[{available:true}, {videoUrl:…mp4}]")]}
    after={[row("k1", "JamCams_00001.07450", "available", "true"), row("k2", "JamCams_00001.07450", "videoUrl", "…/00001.07450.mp4")]}
  />
);
const Union = () => (
  <TableAnim
    labels={["2010 file", "UNION ALL 2011 file"]}
    columns={["invoice", "date", "qty"]}
    before={lines.slice(0, 2).map((l, i) => row(`a${i}`, l.invoice, l.date, l.quantity))}
    after={[
      ...lines.slice(0, 2).map((l, i) => row(`a${i}`, l.invoice, l.date, l.quantity)),
      row("b0", c.outlier.example[0].invoice, c.outlier.example[0].date, c.outlier.example[0].quantity),
      row("b1", c.outlier.example[1].invoice, c.outlier.example[1].date, c.outlier.example[1].quantity),
    ]}
  />
);
const Surrogate = () => (
  <TableAnim
    labels={["Natural keys", "Surrogate keys added"]}
    columns={["product_code", "description"]}
    afterColumns={["product_key", "product_code", "description"]}
    before={p.top_products.slice(0, 4).map((x) => row(x.stock, x.stock, short(x.description, 26)))}
    after={p.top_products.slice(0, 4).map((x, i) => row(x.stock, i + 1, x.stock, short(x.description, 26)))}
  />
);
const Scd1 = () => (
  <TableAnim
    labels={["Before", "Overwrite (type 1)"]}
    columns={["customer", "city"]}
    before={[row("a", "C-17", "Leeds"), row("b", "C-42", "Lyon")]}
    after={[row("a", "C-17", "York"), row("b", "C-42", "Lyon")]}
  />
);
const Scd2 = () => (
  <TableAnim
    labels={["Before", "New version row (type 2)"]}
    columns={["key", "customer", "city", "valid_from", "valid_to", "current"]}
    before={[row("1", 1, "C-17", "Leeds", "2010-12-01", "9999-12-31", "yes")]}
    after={[row("1", 1, "C-17", "Leeds", "2010-12-01", "2011-09-13", "no"), row("2", 2, "C-17", "York", "2011-09-14", "9999-12-31", "yes")]}
  />
);
const Scd3 = () => (
  <TableAnim
    labels={["Before", "Previous column (type 3)"]}
    columns={["customer", "city"]}
    afterColumns={["customer", "city", "previous_city"]}
    before={[row("a", "C-17", "Leeds")]}
    after={[row("a", "C-17", "York", "Leeds")]}
  />
);
const Denormalise = () => (
  <TableAnim
    labels={["Fact + lookups", "Joined wide table"]}
    columns={["product_key", "qty", "revenue"]}
    afterColumns={["product_key", "description", "qty", "revenue"]}
    before={lines.slice(0, 3).map((l, i) => row(`r${i}`, i + 1, l.quantity, Math.round(l.quantity * l.price * 100) / 100))}
    after={lines.slice(0, 3).map((l, i) => row(`r${i}`, i + 1, short(l.description), l.quantity, Math.round(l.quantity * l.price * 100) / 100))}
  />
);
const Masking = () => (
  <TableAnim
    labels={["Restricted", "What analysts see"]}
    columns={["customer", "email", "phone", "country"]}
    before={[row("a", "Customer A", "ana@example.com", "+44 7700 900123", "United Kingdom"), row("b", "Customer B", "luc@example.org", "+33 6 12 34 56 78", "France")]}
    after={[row("a", "7f3a…e1", "a***@example.com", "+44 •••• ••0123", "United Kingdom"), row("b", "c94d…20", "l***@example.org", "+33 • •• •• •• 78", "France")]}
  />
);

/* ---------------------------------------------------------------- the catalogue */

const funnelDrop = (i: number) => p.funnel[i - 1].rows - p.funnel[i].rows;

export const METHODS: Method[] = [
  // ingest
  {
    id: "full",
    name: "Full load",
    stage: "Ingest",
    real: true,
    V: FullLoad,
    what: "Copy the whole source table every time, replacing the old copy.",
    how: ["Simple and always complete", "Slow and costly once tables are big", "Fine for small lookup tables"],
    sql: "TRUNCATE stg_products;\nINSERT INTO stg_products SELECT * FROM source.products;",
  },
  {
    id: "incremental",
    name: "Incremental load",
    stage: "Ingest",
    real: true,
    V: Incremental,
    what: "Only fetch rows newer than the last load, using a watermark such as the latest timestamp.",
    how: ["Remember the high-water mark after each run", "Fetch WHERE updated_at > watermark", "Misses deletes unless the source flags them"],
    sql: "INSERT INTO stg_sales\nSELECT * FROM source.sales\nWHERE invoice_ts > (SELECT MAX(invoice_ts) FROM stg_sales);",
  },
  {
    id: "cdc",
    name: "Change data capture",
    stage: "Ingest",
    real: false,
    V: Cdc,
    what: "Read the source database's own change log (inserts, updates, deletes) and replay it.",
    how: ["Captures updates and deletes, not just new rows", "Near real-time, light on the source", "Needs log access (e.g. Debezium on PostgreSQL)"],
    sql: "MERGE INTO products t USING changes c ON t.code = c.code\nWHEN MATCHED AND c.op = 'D' THEN DELETE\nWHEN MATCHED THEN UPDATE SET price = c.price\nWHEN NOT MATCHED THEN INSERT VALUES (c.code, c.description, c.price);",
  },
  {
    id: "stream",
    name: "Batch vs streaming",
    stage: "Ingest",
    real: false,
    V: V.BatchStream,
    what: "Move data on a schedule (batch) or event by event as it happens (streaming).",
    how: ["Batch: simpler, cheaper, minutes-to-hours old", "Streaming: seconds old, more moving parts", "Most reporting is happy with batch"],
  },
  // profile & test
  {
    id: "profile",
    name: "Data profiling",
    stage: "Profile & test",
    real: true,
    V: V.Profiling,
    what: "Measure every column before trusting it: empties, distinct values, ranges.",
    how: [`${(c.missing_customer.share * 100).toFixed(1)}% of rows have no customer ID`, `${n(c.missing_description.rows)} rows have no description`, "Ranges reveal negatives and extreme values"],
    sql: "SELECT COUNT(*) AS rows,\n       COUNT(*) - COUNT(CustomerID) AS no_customer,\n       COUNT(DISTINCT StockCode) AS products,\n       MIN(Quantity), MAX(Quantity)\nFROM raw_sales;",
  },
  {
    id: "tests",
    name: "Data tests",
    stage: "Profile & test",
    real: true,
    V: V.DataTests,
    what: "Rules the data must pass every run: not null, unique, accepted ranges, valid references.",
    how: ["Written once, run automatically", "Fail loudly instead of silently", "Common in dbt: not_null, unique, relationships"],
    sql: "-- a test passes when this returns no rows\nSELECT * FROM raw_sales WHERE Quantity <= 0;",
  },
  {
    id: "outliers",
    name: "Outlier detection",
    stage: "Profile & test",
    real: true,
    V: V.Outliers,
    what: "Find values far from the rest with a rule (IQR fence, z-score) and decide what they are.",
    how: [`Biggest line: ${n(c.outlier.example[0].quantity)} units, cancelled 12 minutes later`, "Fences flag candidates, people judge them", "Never delete outliers just for being big"],
    sql: "WITH q AS (SELECT quantile_cont(Quantity, 0.25) q1, quantile_cont(Quantity, 0.75) q3 FROM raw_sales)\nSELECT * FROM raw_sales, q WHERE Quantity > q3 + 1.5 * (q3 - q1);",
  },
  // clean
  {
    id: "dedupe",
    name: "Remove duplicates",
    stage: "Clean",
    real: true,
    V: Dedupe,
    what: "Rows that are identical in every column are the same event recorded twice.",
    how: [`${n(c.duplicates.rows)} exact duplicate rows in the raw file`, "Decide what “duplicate” means: every column, or a business key", "Keep one, count what was removed"],
    sql: "SELECT DISTINCT * FROM raw_sales;\n-- removes " + n(funnelDrop(1)) + " rows here",
  },
  {
    id: "missing",
    name: "Handle missing values",
    stage: "Clean",
    real: true,
    V: Missing,
    what: "Choose per column: drop the row, fill a value (impute), or keep it and flag it.",
    how: [
      `${n(c.missing_customer.rows)} orders have no customer: real guest checkouts, so flag them`,
      "Imputing invents data: only where it can't mislead",
      "Never fill with 0 when 0 means something",
    ],
    sql: "SELECT *, CustomerID IS NULL AS is_guest,\n       COALESCE(CAST(CustomerID AS TEXT), 'guest') AS customer\nFROM raw_sales;",
  },
  {
    id: "types",
    name: "Fix data types",
    stage: "Clean",
    real: true,
    V: Types,
    what: "Turn text into real dates, integers and decimals so sorting and maths work.",
    how: ["Dates in one format and time zone", "Strip currency signs and spaces before casting", "Rows that won't cast go to quarantine"],
    sql: "SELECT strptime(InvoiceDate, '%d/%m/%Y %H:%M') AS invoice_ts,\n       CAST(trim(Quantity) AS INTEGER) AS quantity,\n       CAST(replace(UnitPrice, '£', '') AS DECIMAL(10,2)) AS unit_price\nFROM raw_sales_text;",
  },
  {
    id: "standardise",
    name: "Standardise values",
    stage: "Clean",
    real: true,
    V: Standardise,
    what: "One spelling per thing: trim spaces, fix case, merge variants of the same name.",
    how: [
      `Code ${c.description_variants.stock} appears under ${c.description_variants.names.length} different descriptions`,
      "Pick one canonical name per code",
      "Keep a mapping table so it's repeatable",
    ],
    sql: "SELECT StockCode,\n       FIRST(Description ORDER BY n DESC) AS description  -- most common spelling\nFROM (SELECT StockCode, Description, COUNT(*) n FROM raw_sales GROUP BY 1, 2)\nGROUP BY StockCode;",
  },
  {
    id: "invalid",
    name: "Filter invalid records",
    stage: "Clean",
    real: true,
    V: Invalid,
    what: "Remove rows that aren't what the analysis is about: cancellations, zero prices, fees.",
    how: [
      `${n(c.cancellations.rows)} cancellations, ${n(c.zero_price.rows)} zero-price rows`,
      `${n(c.non_product_codes.rows)} postage, fee and adjustment rows`,
      "Write each rule down and count what it removes",
    ],
    sql: "SELECT * FROM raw_sales\nWHERE InvoiceNo NOT LIKE 'C%'\n  AND Quantity > 0 AND UnitPrice > 0\n  AND StockCode NOT IN ('POST', 'D', 'M', 'DOT', 'BANK CHARGES');",
  },
  {
    id: "rename",
    name: "Rename & conform",
    stage: "Clean",
    real: true,
    V: Rename,
    what: "Consistent names and units across every source: snake_case, currency in the name.",
    how: ["Every table speaks the same language", "Units in names avoid mistakes (price_gbp)", "Shared columns get identical names (conformed)"],
    sql: "SELECT InvoiceNo AS invoice_no,\n       StockCode AS product_code,\n       UnitPrice AS unit_price_gbp\nFROM raw_sales;",
  },
  // transform
  {
    id: "joins",
    name: "Joins",
    stage: "Transform",
    real: false,
    V: V.Joins,
    what: "Combine tables on a shared key. The join type decides what happens to rows without a match.",
    how: ["INNER: only matches", "LEFT: keep every left row, nulls where no match", "ANTI: rows with no match, great for checks"],
    sql: "SELECT l.*, p.description\nFROM order_lines l\nLEFT JOIN products p ON p.code = l.code;",
  },
  {
    id: "aggregate",
    name: "Aggregation",
    stage: "Transform",
    real: true,
    V: Aggregate,
    what: "Collapse many rows into one per group with SUM, COUNT, AVG.",
    how: ["The GROUP BY columns become the new grain", "Count distinct carefully (orders vs lines)", "Filter groups with HAVING"],
    sql: "SELECT invoice_no, COUNT(*) AS lines, SUM(quantity) AS units,\n       SUM(quantity * unit_price) AS revenue\nFROM order_lines GROUP BY invoice_no;",
  },
  {
    id: "window",
    name: "Window functions",
    stage: "Transform",
    real: true,
    V: V.WindowFns,
    what: "Calculations across neighbouring rows without collapsing them: running totals, ranks, previous values.",
    how: ["OVER (ORDER BY …) defines the window", "LAG / LEAD look at the previous / next row", "PARTITION BY restarts per group"],
    sql: "SELECT month, orders,\n       SUM(orders) OVER (ORDER BY month) AS running_total,\n       orders - LAG(orders) OVER (ORDER BY month) AS change,\n       RANK() OVER (ORDER BY orders DESC) AS rank\nFROM monthly_orders;",
  },
  {
    id: "pivot",
    name: "Pivot & unpivot",
    stage: "Transform",
    real: true,
    V: Pivot,
    what: "Reshape between long (one row per value) and wide (one column per category).",
    how: ["Long is best for storage and SQL", "Wide is best for people and charts", "UNPIVOT goes back the other way"],
    sql: "PIVOT monthly_country_orders\nON month USING SUM(orders)\nGROUP BY country;",
  },
  {
    id: "derived",
    name: "Derived columns",
    stage: "Transform",
    real: true,
    V: Derived,
    what: "New columns computed from existing ones: revenue, weekday, flags, buckets.",
    how: ["Compute once in the model, not in every report", "Name them clearly", "Keep the formula documented"],
    sql: "SELECT *, quantity * unit_price AS revenue,\n       dayname(invoice_ts) AS weekday\nFROM order_lines;",
  },
  {
    id: "latest",
    name: "Keep the latest version",
    stage: "Transform",
    real: false,
    V: Latest,
    what: "When a record appears several times over time, number the versions and keep the newest.",
    how: ["ROW_NUMBER() OVER (PARTITION BY key ORDER BY updated_at DESC)", "Keep row number 1", "Common after incremental loads"],
    sql: "SELECT * FROM (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer ORDER BY updated_at DESC) AS rn\n  FROM customer_versions)\nWHERE rn = 1;",
  },
  {
    id: "flatten",
    name: "Flatten nested data",
    stage: "Transform",
    real: false,
    V: Flatten,
    what: "Turn JSON objects and lists into rows and columns that SQL can join and count.",
    how: ["UNNEST / explode a list into rows", "Pull fields out of objects into columns", "Watch for row multiplication"],
    sql: "SELECT id, p.key, p.value\nFROM places, UNNEST(additionalProperties) AS t(p);",
  },
  {
    id: "union",
    name: "Union / append",
    stage: "Transform",
    real: true,
    V: Union,
    what: "Stack tables with the same columns, e.g. one file per year, into one.",
    how: ["Columns must match in order and type", "UNION removes duplicates, UNION ALL keeps all (faster)", "Add a source column to know where rows came from"],
    sql: "SELECT * FROM sales_2010\nUNION ALL\nSELECT * FROM sales_2011;",
  },
  // model
  {
    id: "normalise",
    name: "Normalisation (1NF → 3NF)",
    stage: "Model",
    real: false,
    V: V.Normalise,
    what: "Split a repetitive table so every fact is stored once, in the table it depends on.",
    how: ["1NF: one value per cell, one row per thing", "2NF: no facts that depend on part of the key", "3NF: no facts that depend on other non-key columns"],
  },
  {
    id: "grain",
    name: "Fact grain",
    stage: "Model",
    real: true,
    V: V.Grain,
    what: "Declare what one row of the fact table means before adding any column.",
    how: ["Here: one row per invoice line", "Measures must match the grain", "Mixed grains double-count"],
  },
  {
    id: "surrogate",
    name: "Surrogate keys",
    stage: "Model",
    real: true,
    V: Surrogate,
    what: "Give each dimension row its own meaningless integer key instead of the source's code.",
    how: ["Stable even if the source code changes or is reused", "Small integers join fast", "Needed for history (SCD type 2)"],
    sql: "SELECT ROW_NUMBER() OVER (ORDER BY product_code) AS product_key, *\nFROM stg_products;",
  },
  {
    id: "scd1",
    name: "SCD type 1: overwrite",
    stage: "Model",
    real: false,
    V: Scd1,
    what: "When an attribute changes, overwrite it. Simple, but the history is gone.",
    how: ["Use for corrections (typos)", "Reports always show today's value", "Old reports change when re-run"],
    sql: "UPDATE dim_customer SET city = 'York' WHERE customer = 'C-17';",
  },
  {
    id: "scd2",
    name: "SCD type 2: new row",
    stage: "Model",
    real: false,
    V: Scd2,
    what: "Close the old row with an end date and add a new row, so the past stays true.",
    how: ["valid_from / valid_to / is_current columns", "Facts point to the version valid at the time", "The standard for things that really change"],
    sql: "UPDATE dim_customer SET valid_to = DATE '2011-09-13', is_current = false\nWHERE customer = 'C-17' AND is_current;\nINSERT INTO dim_customer VALUES (2, 'C-17', 'York', DATE '2011-09-14', DATE '9999-12-31', true);",
  },
  {
    id: "scd3",
    name: "SCD type 3: previous column",
    stage: "Model",
    real: false,
    V: Scd3,
    what: "Keep the current and the previous value side by side in two columns.",
    how: ["Only one step of history", "Handy for “before and after a reorganisation”", "Rarely the right long-term choice"],
  },
  {
    id: "denormalise",
    name: "Denormalise for reading",
    stage: "Model",
    real: true,
    V: Denormalise,
    what: "Join descriptive columns back onto the facts so readers don't have to.",
    how: ["The opposite of normalising, on purpose", "Faster, simpler dashboards", "Rebuild when dimensions change"],
    sql: "CREATE TABLE sales_wide AS\nSELECT f.*, p.description FROM fact_sales f JOIN dim_product p USING (product_key);",
  },
  // store & speed
  {
    id: "columnar",
    name: "Row vs column storage",
    stage: "Store & speed",
    real: false,
    V: V.RowVsColumn,
    what: "Row stores keep each row together (fast for one record); column stores keep each column together (fast for totals).",
    how: ["Apps: row stores (PostgreSQL)", "Analytics: column stores (BigQuery, DuckDB, Parquet)", "Columns of similar values compress well"],
  },
  {
    id: "index",
    name: "Indexes",
    stage: "Store & speed",
    real: true,
    V: V.BTree,
    what: "A sorted lookup structure (B-tree) that jumps to matching rows instead of scanning everything.",
    how: ["Great for selective lookups (one invoice)", "Every index slows down writes a little", "Column stores rely more on partitions"],
    sql: "CREATE INDEX idx_sales_invoice ON order_lines (invoice_no);",
  },
  {
    id: "partition",
    name: "Partitioning",
    stage: "Store & speed",
    real: true,
    V: V.Partitions,
    what: "Store a big table in chunks (by month, by country) so queries skip chunks they don't need.",
    how: ["Partition by the most common filter, usually date", "Pruning: only matching partitions are read", "Too many tiny partitions hurt"],
    sql: "CREATE TABLE order_lines (...) PARTITION BY RANGE (invoice_month);",
  },
  {
    id: "matview",
    name: "Materialised views",
    stage: "Store & speed",
    real: true,
    V: V.MatView,
    what: "Store the result of an expensive query and refresh it on a schedule.",
    how: ["Dashboards read the small stored result", "Refresh after each load", "Stale between refreshes"],
    sql: "CREATE MATERIALIZED VIEW monthly_orders AS\nSELECT date_trunc('month', invoice_ts) month, COUNT(DISTINCT invoice_no) orders\nFROM order_lines GROUP BY 1;",
  },
  // architecture
  {
    id: "etl",
    name: "ETL vs ELT",
    stage: "Architecture",
    real: false,
    V: V.EtlElt,
    what: "Transform before loading (ETL), or load raw data and transform inside the warehouse (ELT).",
    how: ["ELT is the modern default with cheap warehouses", "Raw data stays available for re-processing", "dbt is an ELT tool"],
  },
  {
    id: "medallion",
    name: "Bronze, silver, gold",
    stage: "Architecture",
    real: true,
    V: V.Medallion,
    what: "Layers of increasing quality: raw as received, cleaned, then business-ready tables.",
    how: ["Bronze: never edited, can always replay", "Silver: cleaned, typed, deduplicated", "Gold: modelled for one purpose (dashboards, ML)"],
  },
  {
    id: "oltp",
    name: "OLTP vs OLAP",
    stage: "Architecture",
    real: false,
    V: V.OltpOlap,
    what: "Systems that run the business (transactions) versus systems that analyse it.",
    how: ["Don't run heavy reports on the app's database", "Copy data to an analytical store", "Model each for its job"],
  },
  {
    id: "dag",
    name: "Orchestration (DAG)",
    stage: "Architecture",
    real: false,
    V: V.Dag,
    what: "A scheduler runs each step in dependency order, retries failures and alerts when something breaks.",
    how: ["Tasks and dependencies form a graph", "Tools: Airflow, Dagster, dbt Cloud, cron", "Parallel where there are no dependencies"],
  },
  {
    id: "idempotent",
    name: "Idempotent jobs",
    stage: "Architecture",
    real: true,
    V: V.Idempotent,
    what: "Running a job twice gives the same result as running it once.",
    how: ["Delete-then-insert or MERGE, never blind INSERT", "Makes retries and backfills safe", "Partition by date to re-run one day"],
    sql: "DELETE FROM fact_sales WHERE invoice_date = DATE '2010-12-01';\nINSERT INTO fact_sales SELECT * FROM stg_sales WHERE invoice_date = DATE '2010-12-01';",
  },
  {
    id: "acid",
    name: "ACID transactions",
    stage: "Architecture",
    real: false,
    V: V.Acid,
    what: "A group of changes either all happen or none do, even if the system crashes half-way.",
    how: ["Atomic, Consistent, Isolated, Durable", "BEGIN … COMMIT / ROLLBACK", "Why databases don't lose half an order"],
    sql: "BEGIN;\nUPDATE stock SET units = units - 6 WHERE code = '85123A';\nINSERT INTO order_lines VALUES ('536365', '85123A', 6, 2.55);\nCOMMIT;",
  },
  // governance
  {
    id: "lineage",
    name: "Data lineage",
    stage: "Governance",
    real: false,
    V: V.Lineage,
    what: "A map of where every table and dashboard number comes from.",
    how: ["Trace a wrong number back to its source", "See what breaks before changing a table", "dbt draws it automatically"],
  },
  {
    id: "catalog",
    name: "Data catalogue",
    stage: "Governance",
    real: true,
    V: V.Catalog,
    what: "Every table and column documented: meaning, owner, quality.",
    how: ["People find data without asking around", "Definitions agreed once (what is an “order”?)", "Kept next to the code so it stays current"],
  },
  {
    id: "masking",
    name: "Masking personal data",
    stage: "Governance",
    real: false,
    V: Masking,
    what: "Hide or hash personal details so analysts can work without seeing who people are.",
    how: ["Hash IDs so joins still work", "Partially mask emails and phones", "Required by privacy laws such as GDPR and Indonesia's PDP law"],
  },
  {
    id: "rls",
    name: "Row-level security",
    stage: "Governance",
    real: true,
    V: V.RowSecurity,
    what: "One table, many viewers: each user sees only the rows they're allowed to.",
    how: ["Rules filter rows per user or role", "Built into Power BI, BigQuery and PostgreSQL", "One report instead of a copy per region"],
    sql: "CREATE POLICY by_country ON orders\nUSING (country = current_setting('app.country'));",
  },
  {
    id: "contract",
    name: "Data contracts",
    stage: "Governance",
    real: false,
    V: V.Contract,
    what: "An agreement on a dataset's schema and quality between the team that produces it and the teams that use it.",
    how: ["Breaking changes are caught before they load", "Producers know who depends on them", "Versioned like an API"],
  },
];
