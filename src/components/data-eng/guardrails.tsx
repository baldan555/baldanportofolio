import { KINDS } from "./incident-kinds";
import type { Kind } from "./incident-engine";

/* The four guardrails behind the guarded pipeline, as simplified production patterns. */
const CARDS: { kind: Kind; title: string; ideas: string[]; lang: string; code: string }[] = [
  {
    kind: "down",
    title: "Retry, alert, backfill from the watermark",
    ideas: ["Retry with growing waits: a blip should not page anyone", "Alert on the first run that still fails, and say “delayed” on the dashboard", "Load from the last good hour, not from “now”, so a gap fills itself"],
    lang: "python",
    code: `def extract(since):
    for wait in (1, 2, 4):
        try:
            return get(API, start=since, end=now())
        except HTTPError:
            sleep(wait)
    alert("extract failing")
    raise

since = min(watermark + HOUR, now() - 5 * HOUR)
batch = extract(since)`,
  },
  {
    kind: "schema",
    title: "A data contract, quarantine and replay",
    ideas: ["Write down what a batch must look like, and check every one", "A failing batch is held back, never half-published", "The raw batch stays in bronze, so the fix replays it without asking the source again"],
    lang: "python",
    code: `CONTRACT = {"time": str, "pm2_5": float}

def validate(batch):
    missing = CONTRACT.keys() - batch.keys()
    if missing:
        quarantine(batch)   # raw copy stays in bronze
        alert(f"contract: {missing} missing")
        return False
    return True`,
  },
  {
    kind: "dups",
    title: "Idempotent loads: MERGE on the key",
    ideas: ["Every row has a key (here, the hour)", "Loading the same batch twice leaves the table unchanged", "Safe to retry any run, any time"],
    lang: "sql",
    code: `MERGE silver.pm25 AS s
USING (SELECT DISTINCT hour, pm2_5
       FROM batch) AS b
ON s.hour = b.hour
WHEN MATCHED THEN
  UPDATE SET pm2_5 = b.pm2_5
WHEN NOT MATCHED THEN
  INSERT (hour, pm2_5)
  VALUES (b.hour, b.pm2_5)`,
  },
  {
    kind: "late",
    title: "A lookback window and partition rebuilds",
    ideas: ["Re-read the recent past on every run, not just the newest hour", "An empty value is “not yet”, not “none”", "When an old hour changes, rebuild the day it belongs to"],
    lang: "python",
    code: `batch = extract(since=now() - 5 * HOUR)
merge(batch.dropna())       # empty hours stay open

for day in batch.days_changed():
    rebuild_gold(day)       # the daily average is redone`,
  },
];

export function Guardrails() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {CARDS.map((c) => (
          <article key={c.kind} className="flex min-w-0 flex-col rounded-[24px] border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase" style={{ color: KINDS[c.kind].color }}>
              {KINDS[c.kind].label}
            </p>
            <h3 className="mt-1 text-[1.25rem] leading-tight font-semibold tracking-[-0.02em]">{c.title}</h3>
            <ul className="mt-3 space-y-1.5">
              {c.ideas.map((i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-2/75">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KINDS[c.kind].color }} />
                  {i}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex-1 overflow-hidden rounded-[16px] bg-ink">
              <p className="border-b border-white/10 px-3 py-1.5 font-mono text-[10px] text-white/40">{c.lang} · simplified pattern</p>
              <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-white/85">{c.code}</pre>
            </div>
          </article>
        ))}
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        In this portfolio&apos;s own PM2.5 pipeline (<span className="font-mono">ml/live_data.py</span>) the retry with growing waits is real code, and every re-run replaces its output instead of appending to it. The contract, quarantine, watermark and MERGE are how the same job would run in production, for example on BigQuery with a scheduler.
      </p>
    </div>
  );
}
