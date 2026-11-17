"use client";

import { useInView, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const REPO = "baldan555/baldanportofolio";

type JobId = "quality" | "tf" | "plan" | "deploy";
type State = "wait" | "run" | "ok" | "fail" | "skip";

/* The four jobs of .github/workflows/ci-cd.yml and the steps that matter in each. `ms` only paces the replay. */
const JOBS: Record<JobId, { name: string; steps: string[]; ms: number[] }> = {
  quality: { name: "Lint and build", steps: ["npm ci", "npm run lint", "next build · types + every page"], ms: [600, 500, 1300] },
  tf: { name: "Terraform format and validate", steps: ["terraform fmt -check", "terraform init -backend=false", "terraform validate"], ms: [350, 350, 350] },
  plan: { name: "Terraform plan", steps: ["keyless sign-in (WIF)", "terraform init · GCS state", "terraform plan"], ms: [450, 450, 800] },
  deploy: { name: "Build image and deploy", steps: ["keyless sign-in (WIF)", "docker build + push site:<commit>", "terraform apply -var image=…", "smoke test · image + HTTP 200"], ms: [450, 1500, 900, 700] },
};
const ORDER: JobId[][] = [
  ["quality", "tf"],
  ["plan", "deploy"],
];
// what the first real run took, until GitHub answers with the latest one
const SNAPSHOT: Partial<Record<JobId, string>> = { quality: "1m 50s", tf: "7s", deploy: "4m 17s" };
const NAME_TO_ID: Record<string, JobId> = Object.fromEntries(Object.entries(JOBS).map(([id, j]) => [j.name, id as JobId]));

type Scenario = { id: string; label: string; event: "push" | "pr"; fail?: { job: JobId; step: number; log: string }; good: boolean; outcome: string };

const SCENARIOS: Scenario[] = [
  { id: "push", label: "Push to main", event: "push", good: true, outcome: "New revision live on the domain. The smoke test confirmed Cloud Run serves exactly this commit's image, and the site answers 200." },
  { id: "pr", label: "Open a pull request", event: "pr", good: true, outcome: "Nothing changes in the cloud. The plan tells the reviewer what merging would do, before anyone merges." },
  { id: "types", label: "Push a type error", event: "push", fail: { job: "quality", step: 2, log: "Type error: Property 'title' does not exist on type 'Work'." }, good: false, outcome: "The release never starts. Visitors keep the last good build, and the commit is marked red on GitHub." },
  { id: "fmt", label: "Unformatted Terraform", event: "push", fail: { job: "tf", step: 0, log: "main.tf is not formatted (terraform fmt -check exits 3)." }, good: false, outcome: "Stopped before any image is built: infrastructure code passes the same gate as app code." },
  { id: "smoke", label: "Site doesn't answer", event: "push", fail: { job: "deploy", step: 3, log: "GET / -> 503, six tries 10 s apart." }, good: false, outcome: "The run goes red within a minute and GitHub emails me. Re-running the last green run puts its image back, since every image is tagged by commit." },
];

type Track = { start: number; ends: number[]; result: "ok" | "fail" | "skip"; done: number; reason?: string };

/** When each job starts, when each of its steps ends, and how it finishes, following the workflow's `needs` and `if`. */
function timeline(s: Scenario) {
  const run = (id: JobId, start: number): Track => {
    const last = s.fail?.job === id ? s.fail.step : JOBS[id].steps.length - 1;
    const ends: number[] = [];
    let t = start;
    for (let i = 0; i <= last; i++) ends.push((t += JOBS[id].ms[i]));
    return { start, ends, result: s.fail?.job === id ? "fail" : "ok", done: t };
  };
  const skip = (reason: string, at = 0): Track => ({ start: at, ends: [], result: "skip", done: at, reason });
  const quality = run("quality", 0);
  const tf = run("tf", 0);
  const checks = Math.max(quality.done, tf.done);
  const plan = s.event !== "pr" ? skip("pull requests only") : tf.result === "ok" ? run("plan", tf.done) : skip("Terraform checks failed", tf.done);
  const deploy =
    s.event !== "push" ? skip("main only") : quality.result === "ok" && tf.result === "ok" ? run("deploy", checks) : skip(`${quality.result === "fail" ? "Lint and build" : "Terraform checks"} failed`, checks);
  const jobs: Record<JobId, Track> = { quality, tf, plan, deploy };
  return { jobs, total: Math.max(...Object.values(jobs).map((j) => j.done)) + 350 };
}

function jobState(k: Track, t: number): State {
  if (k.result === "skip") return t >= k.done ? "skip" : "wait";
  if (t < k.start) return "wait";
  return t >= k.done ? k.result : "run";
}

function stepState(k: Track, i: number, t: number): State | "never" {
  if (k.result === "skip") return "skip";
  const end = k.ends[i];
  if (end === undefined) return "never";
  const begin = i ? k.ends[i - 1] : k.start;
  if (t >= end) return i === k.ends.length - 1 && k.result === "fail" ? "fail" : "ok";
  return t >= begin ? "run" : "wait";
}

function Icon({ state, small = false }: { state: State | "never"; small?: boolean }) {
  const size = small ? "h-3.5 w-3.5" : "h-[18px] w-[18px]";
  if (state === "run") return <span className={`${size} shrink-0 animate-spin rounded-full border-2 border-[#bf8700]/25 border-t-[#bf8700]`} role="img" aria-label="running" />;
  if (state === "ok" || state === "fail")
    return (
      <svg viewBox="0 0 16 16" className={`${size} shrink-0`} role="img" aria-label={state === "ok" ? "passed" : "failed"}>
        <circle cx="8" cy="8" r="8" fill={state === "ok" ? "#1a7f37" : "#cf222e"} />
        {state === "ok" ? <path d="M4.6 8.3l2.2 2.2 4.6-4.8" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2" stroke="white" strokeWidth="1.7" strokeLinecap="round" />}
      </svg>
    );
  if (state === "skip")
    return (
      <svg viewBox="0 0 16 16" className={`${size} shrink-0 text-ink/40`} role="img" aria-label="skipped">
        <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 12L12 4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  return <span className={`${size} shrink-0 rounded-full border-2 border-dashed ${state === "never" ? "border-ink/10" : "border-ink/25"}`} role="img" aria-label={state === "never" ? "not run" : "waiting"} />;
}

type Run = { id: number; run_number: number; display_title: string; head_sha: string; head_branch: string; event: string; status: string; conclusion: string | null; html_url: string; run_started_at: string; updated_at: string };
type Live = { state: "loading" } | { state: "error" } | { state: "ok"; runs: Run[]; now: number; jobs?: { run: number; d: Partial<Record<JobId, string>> } };

const dur = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};
const ago = (ms: number) => {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
};

/** The latest workflow runs of this site's repository, from GitHub's public API (no token; 60 calls an hour per visitor). */
function useLiveRuns() {
  const [live, setLive] = useState<Live>({ state: "loading" });
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=6`, { signal: ctrl.signal });
        if (!r.ok) throw new Error(String(r.status));
        const runs: Run[] = (await r.json()).workflow_runs ?? [];
        setLive({ state: "ok", runs, now: Date.now() });
        const green = runs.find((x) => x.status === "completed" && x.conclusion === "success");
        if (!green) return;
        const j = await fetch(`https://api.github.com/repos/${REPO}/actions/runs/${green.id}/jobs`, { signal: ctrl.signal });
        if (!j.ok) return;
        const d: Partial<Record<JobId, string>> = {};
        for (const job of (await j.json()).jobs ?? []) {
          const id = NAME_TO_ID[job.name];
          if (id && job.conclusion === "success" && job.started_at && job.completed_at) d[id] = dur(Date.parse(job.completed_at) - Date.parse(job.started_at));
        }
        setLive((prev) => (prev.state === "ok" ? { ...prev, jobs: { run: green.run_number, d } } : prev));
      } catch {
        if (!ctrl.signal.aborted) setLive({ state: "error" });
      }
    })();
    return () => ctrl.abort();
  }, []);
  return live;
}

export function PipelineDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const reduce = useReducedMotion();
  const [pick, setPick] = useState(0);
  const [round, setRound] = useState(0);
  const [t, setT] = useState(0);
  const live = useLiveRuns();
  const s = SCENARIOS[pick];
  const { jobs, total } = timeline(s);

  // replay the chosen scenario on one clock; reduced motion jumps straight to the end
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      const id = requestAnimationFrame(() => setT(total));
      return () => cancelAnimationFrame(id);
    }
    const t0 = performance.now();
    let id = 0;
    const tick = () => {
      const now = performance.now() - t0;
      setT(Math.min(now, total));
      if (now < total) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [inView, reduce, pick, round, total]);

  const finished = t >= total;
  // green: shipped or nothing to ship; amber: stopped by a check, site untouched; red: the live site itself failed
  const tone = !finished ? "wait" : s.good ? "ok" : s.fail?.job === "deploy" ? "alarm" : "blocked";
  const TONE = {
    wait: { box: "bg-ink/[0.04]", head: "text-ink/45", label: "Live site · waiting for the run" },
    ok: { box: "bg-[#dafbe1]", head: "text-[#1a7f37]", label: "Live site · fine" },
    blocked: { box: "bg-[#fff8c5]", head: "text-[#9a6700]", label: "Live site · untouched" },
    alarm: { box: "bg-[#ffebe9]", head: "text-[#cf222e]", label: "Live site · alarm raised" },
  }[tone];
  const real = live.state === "ok" && live.jobs ? live.jobs.d : SNAPSHOT;
  const realFrom = live.state === "ok" && live.jobs ? `last green run, #${live.jobs.run}` : "first run";

  return (
    <div ref={ref} className="grid grid-cols-1 gap-5">
      <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[11px] tracking-[0.14em] text-ink/50 uppercase">The change</span>
          {SCENARIOS.map((sc, i) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                setPick(i);
                setRound((r) => r + 1);
                setT(0);
              }}
              aria-pressed={i === pick}
              className={`rounded-full border px-3 py-1.5 text-[13px] transition ${i === pick ? "border-[#1f2328] bg-[#1f2328] text-white" : "border-line text-ink/70 hover:border-ink/30 hover:text-ink"}`}
            >
              {sc.label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-[#f6f8fa] p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 font-mono text-[12px]">
            <span className="font-semibold text-ink">ci-cd.yml</span>
            <span className="text-ink/50">on: {s.event === "push" ? "push · main" : "pull_request"}</span>
          </div>
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_28px_1fr]">
            {ORDER.map((col, ci) => (
              <div key={ci} className={`grid grid-cols-1 gap-3 ${ci ? "md:col-start-3" : ""}`}>
                {col.map((id) => {
                  const k = jobs[id];
                  const st = jobState(k, t);
                  const label = st === "run" ? "running" : st === "fail" ? "failed" : st === "skip" ? "skipped" : st === "ok" ? (real[id] ?? "done") : "queued";
                  return (
                    <div
                      key={id}
                      className={`rounded-xl border bg-white p-3.5 transition-colors duration-300 ${st === "run" ? "border-[#bf8700]/45" : st === "fail" ? "border-[#cf222e]/40" : st === "skip" ? "border-ink/10 opacity-60" : "border-ink/10"}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon state={st} />
                        <p className="min-w-0 flex-1 text-[14px] font-semibold tracking-[-0.01em]">{JOBS[id].name}</p>
                        <span className={`shrink-0 font-mono text-[11.5px] ${st === "fail" ? "text-[#cf222e]" : st === "run" ? "text-[#9a6700]" : "text-ink/45"}`}>{label}</span>
                      </div>
                      {k.result === "skip" ? (
                        <p className="mt-2 pl-[28px] text-[12.5px] text-ink/55">{st === "skip" ? `Skipped: ${k.reason}.` : "Waiting for the checks…"}</p>
                      ) : (
                        <ul className="mt-2.5 grid gap-1.5 pl-[28px]">
                          {JOBS[id].steps.map((step, i) => {
                            const ss = stepState(k, i, t);
                            return (
                              <li key={step} className={`flex min-w-0 items-start gap-2 font-mono text-[11.5px] leading-[1.45] ${ss === "never" ? "text-ink/25" : ss === "fail" ? "text-[#cf222e]" : "text-ink/65"}`}>
                                <span className="mt-px flex">
                                  <Icon state={ss} small />
                                </span>
                                <span className="min-w-0 break-words">{step}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {st === "fail" && s.fail && <p className="mt-2.5 ml-[28px] rounded-lg bg-[#fff5f5] px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-[#a40e26]">{s.fail.log}</p>}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* the "needs" edge between the checks and what runs after them */}
            <svg viewBox="0 0 28 60" className="hidden h-14 w-7 text-ink/25 md:col-start-2 md:row-start-1 md:block" aria-hidden>
              <path d="M2 30h20M16 23l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div
          aria-live="polite"
          className={`mt-4 flex flex-col gap-3 rounded-2xl p-4 transition-colors duration-300 sm:flex-row sm:items-center ${TONE.box}`}
        >
          <div className="min-w-0 flex-1">
            <p className={`font-mono text-[11px] tracking-[0.14em] uppercase ${TONE.head}`}>{TONE.label}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink/80">{finished ? s.outcome : "Jobs run in parallel where they can; the release waits for both checks."}</p>
          </div>
          <button type="button" onClick={() => { setRound((r) => r + 1); setT(0); }} className="shrink-0 self-start rounded-full border border-ink/20 bg-white px-4 py-2 text-[13px] font-semibold hover:border-ink/40 sm:self-center">
            Run again ↻
          </button>
        </div>
        <p className="mt-3 font-mono text-[11px] text-ink/45">Durations beside each green job: {realFrom} of the real pipeline. The replay itself is sped up.</p>
      </div>

      <LiveRuns live={live} />
    </div>
  );
}

function LiveRuns({ live }: { live: Live }) {
  const all = `https://github.com/${REPO}/actions`;
  return (
    <div className="rounded-[22px] bg-[#1f2328] p-5 text-white sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-white/55 uppercase">
          <span className="relative flex h-1.5 w-1.5 text-live">
            <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
          </span>
          Latest real runs · live from GitHub
        </p>
        <a href={all} target="_blank" rel="noopener noreferrer" data-cursor="Visit" className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/80 hover:text-white">
          All runs <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {live.state === "loading" && (
        <div className="mt-4 grid gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.06]" />
          ))}
        </div>
      )}
      {live.state === "error" && (
        <p className="mt-4 text-[14px] leading-relaxed text-white/65">
          GitHub&apos;s API didn&apos;t answer just now (it allows 60 calls an hour per visitor).{" "}
          <a href={all} target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline underline-offset-4">
            See the runs on GitHub
          </a>
          .
        </p>
      )}
      {live.state === "ok" && (
        <ul className="mt-4 grid gap-2">
          {live.runs.map((r) => {
            const running = r.status !== "completed";
            const st: State | "never" = running ? "run" : r.conclusion === "success" ? "ok" : r.conclusion === "failure" ? "fail" : "skip";
            return (
              <li key={r.id} className="min-w-0">
                <a
                  href={r.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="Visit"
                  className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-3.5 py-3 transition hover:bg-white/[0.1]"
                >
                  <Icon state={st} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{r.display_title}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-white/45">
                      #{r.run_number} · {r.head_sha.slice(0, 7)} · {r.event === "push" ? `push · ${r.head_branch}` : r.event.replace("_", " ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right font-mono text-[11px] text-white/55">
                    <p className={running ? "text-[#e3b341]" : ""}>{running ? "running now" : dur(Date.parse(r.updated_at) - Date.parse(r.run_started_at))}</p>
                    <p className="mt-0.5 text-white/35">{ago(live.now - Date.parse(r.run_started_at))}</p>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
