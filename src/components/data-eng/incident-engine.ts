/*
 * Incident simulator engine (no React). Two copies of one hourly pipeline replay the same real PM2.5 hours from a
 * simulated API:
 *   naive   — fetches the newest hour, appends it, reads a missing field as 0, drops empty values, checks nothing;
 *   guarded — fetches from its watermark with a lookback, retries, keeps every raw batch (bronze), validates a data
 *             contract, quarantines failing batches, MERGEs on the hour key and raises alerts.
 * Everything is recomputed from the incident list for any hour, so the timeline can be scrubbed back and forth.
 */
export type Kind = "down" | "schema" | "dups" | "late";
export type Incident = { id: number; kind: Kind; at: number };
export type Tone = "ok" | "warn" | "fail" | "info";
export type Stage = "ok" | "warn" | "fail" | "skip" | "none";
export type LogLine = { t: number; tone: Tone; text: string };
type ApiRow = { h: number; v: number | null };
type Resp = { status: number; field: string; rows: ApiRow[] };
export type Lane = {
  kind: "naive" | "guarded";
  rows: { h: number; v: number }[];
  watermark: number;
  fixed: boolean;
  fixedAt: number | null;
  quarantine: number[];
  bronze: Map<number, Resp>;
  pending: Set<number>;
  log: LogLine[];
  alerts: { t: number; kind: Kind; text: string; resolved: number | null }[];
  detected: Map<number, number>;
  stages: Stage[]; // extract, validate, load, serve
};

export const H0 = 48; // the first simulated run; hours before it are shared, correct history
export const DOWN_FOR = 5; // hours the API answers HTTP 503
export const LATE_FOR = 4; // hours whose value arrives late
export const LATE_BY = 3; // … this many hours late
export const DUP_N = 6; // hours the source sends a second time
export const LOOKBACK = 5; // the guarded copy re-reads this many recent hours every run
export const RETRIES = 3;
export const GUARD_FIX_AFTER = 3; // hours from the contract alert to the on-call fix
export const NAIVE_FIX_AFTER = 6; // hours until a reader notices the zeros

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** What the source API answers at hour t for hours from…to, given the incidents. */
export function api(truth: number[], inc: Incident[], t: number, from: number, to: number): Resp {
  if (inc.some((x) => x.kind === "down" && t >= x.at && t < x.at + DOWN_FOR)) return { status: 503, field: "", rows: [] };
  const renamed = inc.some((x) => x.kind === "schema" && t >= x.at);
  const rows: ApiRow[] = [];
  for (let h = Math.max(0, from); h <= to; h++) {
    const late = inc.some((x) => x.kind === "late" && h >= x.at && h < x.at + LATE_FOR) && t < h + LATE_BY;
    rows.push({ h, v: late ? null : truth[h] });
  }
  // the provider re-sends the previous hours once (a retried export on their side)
  if (inc.some((x) => x.kind === "dups" && x.at === t)) for (let h = t - 1; h >= t - DUP_N; h--) rows.unshift({ h, v: truth[h] });
  return { status: 200, field: renamed ? "pm25" : "pm2_5", rows };
}

function lane(kind: Lane["kind"], truth: number[]): Lane {
  return {
    kind,
    rows: truth.slice(0, H0).map((v, h) => ({ h, v })),
    watermark: H0 - 1,
    fixed: false,
    fixedAt: null,
    quarantine: [],
    bronze: new Map(),
    pending: new Set(),
    log: [],
    alerts: [],
    detected: new Map(),
    stages: ["ok", kind === "naive" ? "none" : "ok", "ok", "ok"],
  };
}

const say = (L: Lane, t: number, tone: Tone, text: string) => L.log.push({ t, tone, text });
const open = (L: Lane, kind: Kind) => L.alerts.find((a) => a.kind === kind && a.resolved == null);
const incidentAt = (inc: Incident[], kind: Kind, t: number) => inc.filter((x) => x.kind === kind && x.at <= t).pop();

function runNaive(truth: number[], inc: Incident[], L: Lane, t: number, clock: (h: number) => string) {
  // the only way this copy learns about a problem: a reader notices the chart showing 0
  const sch = incidentAt(inc, "schema", t);
  if (sch && !L.fixed && t >= sch.at + NAIVE_FIX_AFTER) {
    L.fixed = true;
    L.fixedAt = t;
    L.detected.set(sch.id, t);
    say(L, t, "warn", `A reader reports PM2.5 stuck at 0 since ${clock(sch.at)}. Hotfix: read "pm25". The zeros already written stay.`);
  }
  const r = api(truth, inc, t, t, t);
  if (r.status !== 200) {
    L.stages = ["fail", "none", "skip", "ok"];
    say(L, t, "fail", `Crashed: HTTP ${r.status}. Cron tries again next hour; nobody is told.`);
    return;
  }
  let n = 0;
  for (const row of r.rows) {
    if (r.field !== "pm2_5" && !L.fixed) {
      L.rows.push({ h: row.h, v: 0 }); // row.get("pm2_5", 0)
      n++;
    } else if (row.v != null) {
      L.rows.push({ h: row.h, v: row.v });
      n++;
    } // empty values are dropped silently
  }
  L.stages = ["ok", "none", "ok", "ok"];
  say(L, t, "ok", `Run OK · appended ${n} row${n === 1 ? "" : "s"}`);
}

function merge(L: Lane, rows: ApiRow[]) {
  const seen = new Set<number>();
  let fresh = 0,
    dupKeys = 0,
    late = 0;
  const empty: number[] = [];
  for (const row of rows) {
    if (seen.has(row.h)) {
      dupKeys++;
      continue;
    }
    seen.add(row.h);
    if (row.v == null) {
      if (!L.rows.some((x) => x.h === row.h)) {
        L.pending.add(row.h);
        empty.push(row.h);
      }
      continue;
    }
    const i = L.rows.findIndex((x) => x.h === row.h);
    if (i >= 0) L.rows[i] = { h: row.h, v: row.v };
    else {
      L.rows.push({ h: row.h, v: row.v });
      fresh++;
      if (L.pending.delete(row.h)) late++;
    }
  }
  L.rows.sort((a, b) => a.h - b.h);
  return { fresh, dupKeys, late, empty };
}

function runGuarded(truth: number[], inc: Incident[], L: Lane, t: number, clock: (h: number) => string) {
  // on-call deploys a mapping, then replays the quarantined raw batches from bronze (no re-fetch needed)
  const sch = incidentAt(inc, "schema", t);
  if (sch && !L.fixed && open(L, "schema") && t >= (open(L, "schema") as { t: number }).t + GUARD_FIX_AFTER) {
    L.fixed = true;
    L.fixedAt = t;
    const q = L.quarantine.splice(0);
    let back = 0;
    for (const h of q) back += merge(L, (L.bronze.get(h) as Resp).rows).fresh;
    if (q.length) L.watermark = Math.max(L.watermark, ...q);
    (open(L, "schema") as { resolved: number | null }).resolved = t;
    say(L, t, "info", `On-call maps "pm25" → "pm2_5" and replays ${q.length} quarantined batches from bronze: ${back} hours restored.`);
  }
  const from = Math.min(L.watermark + 1, t - LOOKBACK);
  let r = api(truth, inc, t, from, t);
  for (let k = 1; k < RETRIES && r.status !== 200; k++) r = api(truth, inc, t, from, t);
  if (r.status !== 200) {
    L.stages = ["fail", "skip", "skip", "warn"];
    if (!open(L, "down")) {
      L.alerts.push({ t, kind: "down", text: "Extract failing", resolved: null });
      const d = incidentAt(inc, "down", t);
      if (d) L.detected.set(d.id, t);
      say(L, t, "fail", `HTTP ${r.status} after ${RETRIES} tries (waited 1, 2, 4 s). Alert sent; dashboard shows "delayed".`);
    } else say(L, t, "fail", `Still HTTP ${r.status} after ${RETRIES} tries. Last good hour ${clock(L.watermark)}.`);
    return;
  }
  L.bronze.set(t, r);
  const fieldOk = r.field === "pm2_5" || (L.fixed && r.field === "pm25");
  if (!fieldOk) {
    L.quarantine.push(t);
    L.stages = ["ok", "fail", "skip", "warn"];
    if (!open(L, "schema")) {
      L.alerts.push({ t, kind: "schema", text: "Contract failed", resolved: null });
      if (sch) L.detected.set(sch.id, t);
      say(L, t, "fail", `Contract failed: "pm2_5" missing, found "${r.field}". Batch quarantined, nothing published. Alert sent.`);
    } else say(L, t, "fail", `Contract still failing. Batch ${L.quarantine.length} quarantined (raw kept in bronze).`);
    return;
  }
  const gap = t - L.watermark - 1;
  const m = merge(L, r.rows);
  L.watermark = t;
  const parts: string[] = [];
  const down = open(L, "down");
  if (down) {
    down.resolved = t;
    parts.push(`recovered after ${t - down.t} h, backfilled ${gap} missed hours`);
  }
  if (m.dupKeys) {
    const d = inc.find((x) => x.kind === "dups" && x.at === t);
    if (d) L.detected.set(d.id, t);
    parts.push(d ? `The source sent ${DUP_N} hours twice; MERGE matched them on the hour key, none added twice` : `${m.dupKeys} duplicate keys dropped by MERGE`);
  }
  if (m.late) parts.push(`${m.late} late hour${m.late > 1 ? "s" : ""} merged, day re-aggregated`);
  const lateInc = incidentAt(inc, "late", t);
  if (m.empty.length && lateInc && !L.detected.has(lateInc.id)) L.detected.set(lateInc.id, t);
  if (m.empty.length) parts.push(`${m.empty.length === 1 ? `${clock(m.empty[0])} is` : `${m.empty.length} hours are`} not published yet: kept open, re-read next run`);
  L.stages = ["ok", "ok", "ok", m.empty.length ? "warn" : "ok"];
  say(L, t, m.empty.length ? "warn" : "ok", parts.length ? parts.join(" · ") : `Merged ${m.fresh} new hour${m.fresh === 1 ? "" : "s"} (${r.rows.length - m.fresh} re-checked)`);
}

/** Both copies after every run up to hour `upTo`. */
export function simulate(truth: number[], incidents: Incident[], upTo: number, clock: (h: number) => string = pad) {
  const naive = lane("naive", truth),
    guarded = lane("guarded", truth);
  for (let t = H0; t <= upTo; t++) {
    runNaive(truth, incidents, naive, t, clock);
    runGuarded(truth, incidents, guarded, t, clock);
  }
  return { naive, guarded };
}

/* ------------------------------------------------------------------ reading the result */
export type HourState = "ok" | "missing" | "wrong" | "dup";
export function hourState(L: Lane, truth: number[], h: number): { state: HourState; values: number[] } {
  const values = L.rows.filter((r) => r.h === h).map((r) => r.v);
  if (!values.length) return { state: "missing", values };
  if (values.length > 1) return { state: "dup", values };
  return { state: Math.abs(values[0] - truth[h]) > 1e-9 ? "wrong" : "ok", values };
}

/** Hours an incident touches, [start, end). */
export function affected(x: Incident): [number, number] {
  if (x.kind === "down") return [x.at, x.at + DOWN_FOR];
  if (x.kind === "schema") return [x.at, x.at + NAIVE_FIX_AFTER];
  if (x.kind === "dups") return [x.at - DUP_N, x.at];
  return [x.at, x.at + LATE_FOR];
}

export function damage(L: Lane, truth: number[], from: number, to: number, upTo: number) {
  const d = { missing: 0, wrong: 0, dup: 0 };
  for (let h = from; h < Math.min(to, upTo + 1); h++) {
    const s = hourState(L, truth, h).state;
    if (s !== "ok") d[s]++;
  }
  return d;
}

/** The dashboard each copy serves at hour t. */
export function served(L: Lane, truth: number[], t: number) {
  const newest = L.rows.length ? Math.max(...L.rows.map((r) => r.h)) : -1;
  const now = L.rows.filter((r) => r.h === newest).map((r) => r.v);
  const day = L.rows.filter((r) => r.h > t - 24 && r.h <= t).map((r) => r.v);
  let truthSum = 0;
  for (let h = t - 23; h <= t; h++) truthSum += truth[h];
  return {
    newest,
    now: now.length ? now[now.length - 1] : null,
    avg: day.length ? day.reduce((a, b) => a + b, 0) / day.length : null,
    rows: day.length,
    truthAvg: truthSum / 24,
  };
}
