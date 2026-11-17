import catalog from "@/data/de-catalog.json";
import { MONTH_LONG } from "@/lib/months";

/*
 * Every pipeline behind this portfolio, measured: ml/de_catalog.py re-ran the offline batch scripts one after another,
 * timed each and recorded the sizes going in and out. The network fetcher and model training are listed, not re-run.
 */
type IO = { file: string; bytes: number | null; rows?: number | null };
type Pipe = { id: string; name: string; script: string; kind: string; seconds: number | null; inputs: IO[]; outputs: IO[]; steps: string[]; feeds: string };
const C = catalog as { measured: string; python: string; pandas: string; pipelines: Pipe[] };

const KIND: Record<string, [string, string]> = { batch: ["batch", "#0b0b0b"], api: ["API ingest", "#2a78d6"], ml: ["model training", "#6250d6"] };
const size = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const n0 = (v: number) => v.toLocaleString("en-US");
/** Short notes for raw files whose name does not say what they are. */
const NOTE: Record<string, string> = { "online_retail.pkl": "the UCI Excel file, cached as a pickle" };
const noteOf = (file: string) => NOTE[file.split("/").pop() ?? ""];

const measured = C.pipelines.filter((p) => p.seconds != null);
const total = measured.reduce((a, p) => a + (p.seconds as number), 0);
const inBytes = [...new Map(measured.flatMap((p) => p.inputs).map((i) => [i.file, i.bytes ?? 0])).values()].reduce((a, b) => a + b, 0);
const outBytes = measured.flatMap((p) => p.outputs).reduce((a, o) => a + (o.bytes ?? 0), 0);
const [y, m, d] = C.measured.split("-").map(Number);
const when = `${d} ${MONTH_LONG[m - 1]} ${y}`;
let offset = 0;
const runs = measured.map((p) => {
  const r = { p, start: offset };
  offset += p.seconds as number;
  return r;
});
const ticks = Array.from({ length: Math.floor(total / 10) + 1 }, (_, i) => i * 10);

export function PipelineCatalog() {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [String(measured.length), "batch pipelines re-run for this page"],
          [`${total.toFixed(1)} s`, "for all of them, one after another"],
          [size(inBytes), "of raw files read"],
          [size(outBytes), `of JSON served, about ${Math.round(inBytes / outBytes)}× smaller`],
        ].map(([v, k]) => (
          <div key={k} className="rounded-[20px] border border-line bg-white p-4">
            <p className="text-[2rem] leading-none font-semibold tracking-[-0.04em] tabular-nums">{v}</p>
            <p className="mt-1.5 text-[12.5px] text-ink-2/60">{k}</p>
          </div>
        ))}
      </div>

      {/* the measured run as a timeline */}
      <section className="rounded-[20px] border border-line bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[14px] font-semibold">The measured run</h3>
          <p className="font-mono text-[10.5px] text-ink-2/55">
            {when} · Python {C.python} · pandas {C.pandas} · a laptop
          </p>
        </div>
        <div className="mt-3 space-y-1.5">
          {runs.map(({ p, start }) => (
            <div key={p.id} className="grid grid-cols-[7.5rem_1fr] items-center gap-2 sm:grid-cols-[11rem_1fr]">
              <span className="truncate text-[12px]">{p.name}</span>
              <div className="relative h-6 rounded-[6px] bg-cream/60">
                <div
                  className="absolute top-0 h-full rounded-[6px] bg-ink"
                  style={{ left: `${(start / total) * 100}%`, width: `max(3px, ${((p.seconds as number) / total) * 100}%)` }}
                  title={`${p.script}: ${p.seconds} s`}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 font-mono text-[10.5px] whitespace-nowrap"
                  style={
                    (p.seconds as number) / total > 0.25
                      ? { left: `${(start / total) * 100 + 1}%`, color: "#fff" }
                      : start / total > 0.7
                        ? { right: `${100 - (start / total) * 100 + 0.8}%` }
                        : { left: `calc(${((start + (p.seconds as number)) / total) * 100}% + 6px)` }
                  }
                >
                  {p.seconds} s
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-[7.5rem_1fr] gap-2 sm:grid-cols-[11rem_1fr]">
          <span />
          <div className="relative h-4">
            {ticks.map((t) => (
              <span key={t} className="absolute -translate-x-1/2 font-mono text-[10px] whitespace-nowrap text-ink-2/50" style={{ left: `${(t / total) * 100}%` }}>
                {t} s
              </span>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-2/60">
          Run by <span className="font-mono">ml/de_catalog.py</span>, which starts each script and times it. The sales ETL dominates: it rebuilds every country × month metric, the cohorts and RFM from half a million rows. On a scheduler the independent ones would run side by side.
        </p>
      </section>

      {/* every pipeline */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {C.pipelines.map((p) => {
          const [kind, color] = KIND[p.kind] ?? [p.kind, "#0b0b0b"];
          const inB = p.inputs.reduce((a, i) => a + (i.bytes ?? 0), 0);
          const outB = p.outputs.reduce((a, o) => a + (o.bytes ?? 0), 0);
          const rows = p.inputs.reduce((a, i) => a + (i.rows ?? 0), 0);
          return (
            <article key={p.id} className="flex min-w-0 flex-col rounded-[20px] border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full px-2.5 py-0.5 font-mono text-[10.5px] text-white" style={{ background: color }}>
                  {kind}
                </span>
                <span className="font-mono text-[11px] text-ink-2/60">{p.seconds != null ? `${p.seconds} s` : "not re-run here"}</span>
              </div>
              <h4 className="mt-3 text-[16px] leading-tight font-semibold tracking-[-0.01em]">{p.name}</h4>
              <p className="mt-0.5 font-mono text-[11px] text-ink-2/55">{p.script}</p>
              <ol className="mt-3 flex flex-wrap items-center gap-1 text-[11.5px]">
                {p.steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-1">
                    {i > 0 && <span className="text-ink/25">→</span>}
                    <span className="rounded-md bg-cream/70 px-1.5 py-0.5">{s}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 grid flex-1 content-end gap-1.5 text-[11.5px]">
                <div className="rounded-lg bg-cream/40 px-2.5 py-1.5">
                  <p className="text-[10.5px] text-ink-2/50">in</p>
                  {p.inputs.map((i) => (
                    <p key={i.file} className="truncate font-mono text-[10.5px]" title={i.file}>
                      {i.file}
                      {noteOf(i.file) && <span className="block font-sans text-[10.5px] text-ink-2/50">{noteOf(i.file)}</span>}
                    </p>
                  ))}
                  {inB > 0 && (
                    <p className="mt-0.5 text-ink-2/70">
                      {size(inB)}
                      {rows ? ` · ${n0(rows)} rows` : ""}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-cream/40 px-2.5 py-1.5">
                  <p className="text-[10.5px] text-ink-2/50">out</p>
                  {p.outputs.map((o) => (
                    <p key={o.file} className="truncate font-mono text-[10.5px]" title={o.file}>
                      {o.file}
                    </p>
                  ))}
                  <p className="mt-0.5 text-ink-2/70">
                    {size(outB)}
                    {inB > 0 && outB > 0 && inB / outB >= 2 ? ` · ${Math.round(inB / outB)}× smaller` : ""}
                  </p>
                </div>
                <p className="pt-1 text-[11.5px] text-ink-2/60">
                  <span className="font-semibold text-ink">Feeds</span> {p.feeds}
                </p>
              </div>
            </article>
          );
        })}
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        The live API fetcher is not re-run for this page because it calls the network, and model training is listed with its outputs only. Every number above comes from <span className="font-mono">src/data/de-catalog.json</span>, written by the measured run.
      </p>
    </div>
  );
}
