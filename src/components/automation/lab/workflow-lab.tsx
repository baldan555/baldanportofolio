"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Banknote, Braces, Check, ChevronDown, ChevronUp, Clock, CloudRain, Copy, GitBranch, MessageCircle, Package, Play, Plus, Repeat, ScrollText, Server, Square, Table, Timer, Trash2, UserCheck, Webhook, Wind, X } from "lucide-react";
import { NODES, TRIGGERS, allSteps, newStep, runWorkflow, type Effect, type Field, type LogLine, type RunResult, type Step, type StepEvent, type StepType, type TriggerType, type Workflow } from "@/lib/workflow/engine";
import { TEMPLATES } from "@/lib/workflow/templates";

/*
 * The Workflow lab: a workflow as a list of steps (IF branches and loops nest inside), editable, and run for real in
 * the browser by the shared engine. Every step lights up as it runs, with its input, output, timing and retries;
 * messages and sheet rows land in simulated panels below; approvals wait for you.
 */
const ICON: Record<StepType | TriggerType, ReactNode> = {
  manual: <Play className="h-4 w-4" />,
  schedule: <Clock className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
  fx: <Banknote className="h-4 w-4" />,
  weather: <CloudRain className="h-4 w-4" />,
  air: <Wind className="h-4 w-4" />,
  npm: <Package className="h-4 w-4" />,
  mockapi: <Server className="h-4 w-4" />,
  if: <GitBranch className="h-4 w-4" />,
  set: <Braces className="h-4 w-4" />,
  loop: <Repeat className="h-4 w-4" />,
  wait: <Timer className="h-4 w-4" />,
  approval: <UserCheck className="h-4 w-4" />,
  message: <MessageCircle className="h-4 w-4" />,
  sheet: <Table className="h-4 w-4" />,
  log: <ScrollText className="h-4 w-4" />,
};
const GROUP_COLOR: Record<string, string> = { Trigger: "#0b0b0b", Data: "#2a78d6", Logic: "#6250d6", People: "#eb6834", Action: "#1baf7a" };
const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  running: { label: "running", bg: "#e7f0fb", fg: "#1d5aa6" },
  ok: { label: "done", bg: "#eaf8f1", fg: "#0f6e4c" },
  failed: { label: "failed", bg: "#fdf0ee", fg: "#a3302e" },
  retrying: { label: "retrying", bg: "#fbf5dd", fg: "#8a6d00" },
  skipped: { label: "skipped", bg: "#f1efea", fg: "rgba(11,11,11,0.45)" },
  waiting: { label: "waiting for you", bg: "#fff3ec", fg: "#a8461f" },
  stopped: { label: "stopped", bg: "#f1efea", fg: "rgba(11,11,11,0.55)" },
};
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
type Branch = "root" | "yes" | "no" | "body";
type Spot = { parent: string | null; branch: Branch; index: number };

function summary(s: Step) {
  const p = s.params;
  switch (s.type) {
    case "fx":
      return `${p.base} → ${p.target}`;
    case "weather":
    case "air":
      return String(p.city);
    case "npm":
      return String(p.packages).split(",").length + " packages";
    case "mockapi":
      return `${p.service} · ${p.endpoint}`;
    case "if":
      return `${p.left} ${p.op} ${p.right}`;
    case "loop":
      return `each of ${p.list}`;
    case "wait":
      return `${p.seconds} s`;
    case "approval":
      return `by ${p.approver}`;
    case "message":
      return `${p.channel} → ${p.to}`;
    case "sheet":
      return `“${p.sheet}”: ${p.columns}`;
    default:
      return NODES[s.type].label;
  }
}
/** The array that holds a step (or a branch of one), so edits can splice it. */
function holder(list: Step[], spot: Spot): Step[] | null {
  if (spot.parent == null) return list;
  for (const s of allSteps(list)) if (s.id === spot.parent) return (spot.branch === "yes" ? s.yes : spot.branch === "no" ? s.no : s.body) ?? null;
  return null;
}
function locate(list: Step[], id: string): { arr: Step[]; i: number } | null {
  const i = list.findIndex((s) => s.id === id);
  if (i >= 0) return { arr: list, i };
  for (const s of list) for (const sub of [s.yes, s.no, s.body]) if (sub) {
      const r = locate(sub, id);
      if (r) return r;
    }
  return null;
}

function AddMenu({ onPick, onClose }: { onPick: (t: StepType) => void; onClose: () => void }) {
  const groups = ["Data", "Logic", "People", "Action"] as const;
  return (
    <div className="relative z-20 my-1 rounded-2xl border border-line bg-white p-2 shadow-[0_12px_30px_-14px_rgba(11,11,11,0.35)]">
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="text-[11.5px] font-semibold">Add a step</p>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-0.5 hover:bg-ink/5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g}>
            <p className="px-1 font-mono text-[9.5px] tracking-[0.12em] uppercase" style={{ color: GROUP_COLOR[g] }}>
              {g}
            </p>
            {(Object.keys(NODES) as StepType[])
              .filter((t) => NODES[t].group === g)
              .map((t) => (
                <button key={t} type="button" onClick={() => onPick(t)} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-[12px] hover:bg-cream">
                  <span style={{ color: GROUP_COLOR[g] }}>{ICON[t]}</span>
                  {NODES[t].label}
                  {NODES[t].real && <span className="ml-auto font-mono text-[9px] text-[#1baf7a]">live</span>}
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** With `initial`, the lab opens that workflow (for example one an AI wrote) and hides the template picker. */
export function WorkflowLab({ initial }: { initial?: Workflow } = {}) {
  const [tpl, setTpl] = useState(TEMPLATES[0].id);
  const [wf, setWf] = useState<Workflow>(() => clone(initial ?? TEMPLATES[0].wf));
  const [sel, setSel] = useState("trigger");
  const [ev, setEv] = useState<Record<string, StepEvent>>({});
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState<{ id: string; text: string } | null>(null);
  const [history, setHistory] = useState<{ n: number; name: string; res: RunResult }[]>([]);
  const [tab, setTab] = useState<"settings" | "data" | "log" | "json">("settings");
  const [adding, setAdding] = useState<Spot | null>(null);
  const [copied, setCopied] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const seq = useRef(100);
  useEffect(() => () => ctl.current?.abort(), []);

  const load = (id: string) => {
    ctl.current?.abort();
    const t = TEMPLATES.find((x) => x.id === id) ?? TEMPLATES[0];
    setTpl(id);
    setWf(clone(t.wf));
    setSel("trigger");
    setEv({});
    setLogs([]);
    setPending(null);
    setAdding(null);
    setTab("settings");
  };
  const edit = (fn: (w: Workflow) => void) =>
    setWf((w) => {
      const n = clone(w);
      fn(n);
      return n;
    });
  const run = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setEv({});
    setLogs([]);
    setPending(null);
    setAdding(null);
    setRunning(true);
    setTab("log");
    const res = await runWorkflow(wf, {
      signal: c.signal,
      onStep: (e) => setEv((s) => ({ ...s, [e.id]: { ...s[e.id], ...e } })),
      onLog: (l) => setLogs((x) => [...x, l]),
      onEffect: (e) => setEffects((x) => [e, ...x].slice(0, 40)),
      approve: (step, text) =>
        new Promise<boolean>((resolve) => {
          resolver.current = resolve;
          setPending({ id: step.id, text });
          setSel(step.id);
          c.signal.addEventListener("abort", () => resolve(false));
        }),
    });
    setPending(null);
    setRunning(false);
    setHistory((h) => [{ n: (h[0]?.n ?? 0) + 1, name: wf.name, res }, ...h].slice(0, 6));
  };
  const answer = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setPending(null);
  };
  const insert = (spot: Spot, t: StepType) => {
    seq.current += 1;
    const id = `s${seq.current}`;
    edit((w) => holder(w.steps, spot)?.splice(spot.index, 0, newStep(t, id)));
    setAdding(null);
    setSel(id);
    setTab("settings");
  };
  const move = (id: string, d: -1 | 1) =>
    edit((w) => {
      const r = locate(w.steps, id);
      if (!r) return;
      const j = r.i + d;
      if (j < 0 || j >= r.arr.length) return;
      [r.arr[r.i], r.arr[j]] = [r.arr[j], r.arr[r.i]];
    });
  const remove = (id: string) => {
    edit((w) => {
      const r = locate(w.steps, id);
      if (r) r.arr.splice(r.i, 1);
    });
    setSel("trigger");
  };
  const setParam = (id: string, key: string, value: string | number) =>
    edit((w) => {
      if (id === "trigger") w.trigger.params[key] = value;
      else {
        const r = locate(w.steps, id);
        if (r) r.arr[r.i].params[key] = value;
      }
    });
  const rename = (id: string, name: string) =>
    edit((w) => {
      const r = locate(w.steps, id);
      if (r) r.arr[r.i].name = name;
    });

  const plus = (spot: Spot) => {
    const open = adding && adding.parent === spot.parent && adding.branch === spot.branch && adding.index === spot.index;
    return (
      <div className="relative py-0.5 pl-5">
        {open ? (
          <AddMenu onPick={(t) => insert(spot, t)} onClose={() => setAdding(null)} />
        ) : (
          <button type="button" disabled={running} onClick={() => setAdding(spot)} aria-label="Add a step here" className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-ink/25 bg-white text-ink/45 transition hover:border-ink hover:text-ink disabled:opacity-30">
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };
  const card = (s: Step | null) => {
    const id = s ? s.id : "trigger";
    const def = s ? NODES[s.type] : TRIGGERS[wf.trigger.type];
    const e = ev[id];
    const st = e ? STATUS[e.status] : null;
    const on = sel === id;
    const color = GROUP_COLOR[def.group];
    return (
      <div className={`group relative rounded-2xl border bg-white transition ${on ? "border-ink shadow-[0_0_0_1px_#0b0b0b]" : "border-line hover:border-ink/40"} ${e?.status === "skipped" ? "opacity-45" : ""} ${e?.status === "running" || e?.status === "retrying" ? "ring-2 ring-[#2a78d6]/40" : ""}`}>
        <button
          type="button"
          onClick={() => {
            setSel(id);
            if (tab === "log" && !running) setTab("settings");
          }}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white" style={{ background: color }}>
            {ICON[s ? s.type : wf.trigger.type]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold">{s ? s.name : def.label}</span>
            <span className="block truncate text-[11.5px] text-ink-2/55">{s ? summary(s) : wf.trigger.type === "schedule" ? `cron ${wf.trigger.params.cron}` : def.what}</span>
          </span>
          {st && (
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: st.bg, color: st.fg }}>
              {e?.status === "retrying" ? `retry ${e.attempt}` : st.label}
              {e?.ms != null && e.status === "ok" ? ` · ${e.ms < 1000 ? `${e.ms} ms` : `${(e.ms / 1000).toFixed(1)} s`}` : ""}
            </span>
          )}
        </button>
        {s && !running && (
          <div className="absolute top-1.5 right-1.5 hidden gap-0.5 rounded-lg bg-white p-0.5 shadow-sm group-hover:flex">
            <button type="button" aria-label="Move up" onClick={() => move(s.id, -1)} className="rounded p-0.5 hover:bg-ink/5">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Move down" onClick={() => move(s.id, 1)} className="rounded p-0.5 hover:bg-ink/5">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Delete step" onClick={() => remove(s.id)} className="rounded p-0.5 text-[#c8413f] hover:bg-ink/5">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {e?.status === "failed" && e.error && <p className="px-3 pb-2.5 text-[11.5px] text-[#a3302e]">{e.error}</p>}
        {e?.status === "retrying" && e.error && <p className="px-3 pb-2.5 text-[11.5px] text-[#8a6d00]">{e.error}</p>}
        {pending?.id === id && (
          <div className="mx-3 mb-3 rounded-xl bg-[#fff3ec] p-3">
            <p className="text-[12.5px] leading-snug">{pending.text}</p>
            <div className="mt-2 flex gap-1.5">
              <button type="button" onClick={() => answer(true)} className="flex items-center gap-1 rounded-full bg-[#1baf7a] px-3 py-1 text-[12px] font-semibold text-white">
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button type="button" onClick={() => answer(false)} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#a3302e] ring-1 ring-[#c8413f]/40">
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  const list = (steps: Step[], parent: string | null, branch: Branch): ReactNode => (
    <div>
      {plus({ parent, branch, index: 0 })}
      {steps.map((s, i) => (
        <div key={s.id}>
          <div className="relative pl-5">
            <span className="absolute top-0 bottom-0 left-[9px] w-px bg-ink/15" />
            {card(s)}
            {s.type === "if" && (
              <div className="mt-1.5 grid gap-2 pl-3 sm:grid-cols-2">
                {(["yes", "no"] as const).map((b) => (
                  <div key={b} className="rounded-2xl border border-dashed border-ink/15 bg-[#fbfaf7] p-1.5">
                    <p className="px-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: b === "yes" ? "#0f6e4c" : "#a3302e" }}>
                      {b === "yes" ? "Yes" : "No"}
                    </p>
                    {list((b === "yes" ? s.yes : s.no) ?? [], s.id, b)}
                  </div>
                ))}
              </div>
            )}
            {s.type === "loop" && (
              <div className="mt-1.5 rounded-2xl border border-dashed border-[#6250d6]/30 bg-[#f6f4fd] p-1.5 pl-3">
                <p className="px-1 font-mono text-[10px] font-bold tracking-[0.1em] text-[#6250d6] uppercase">for each item</p>
                {list(s.body ?? [], s.id, "body")}
              </div>
            )}
          </div>
          {plus({ parent, branch, index: i + 1 })}
        </div>
      ))}
    </div>
  );

  const selStep = sel === "trigger" ? null : (allSteps(wf.steps).find((s) => s.id === sel) ?? null);
  const fields: Field[] = selStep ? NODES[selStep.type].fields : TRIGGERS[wf.trigger.type].fields;
  const params = selStep ? selStep.params : wf.trigger.params;
  const se = ev[sel];
  const sheets = effects.filter((x): x is Extract<Effect, { kind: "sheet" }> => x.kind === "sheet");
  const msgs = effects.filter((x): x is Extract<Effect, { kind: "message" }> => x.kind === "message");
  const bySheet = new Map<string, { columns: string[]; rows: string[][] }>();
  for (const s of [...sheets].reverse()) {
    const g = bySheet.get(s.sheet) ?? { columns: s.columns, rows: [] };
    g.rows.push(s.row);
    bySheet.set(s.sheet, g);
  }
  const last = history[0];
  const input = (f: Field) => {
    const v = params[f.key] ?? "";
    const cls = "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-[12.5px] outline-none focus:border-ink disabled:opacity-60";
    if (f.kind === "select")
      return (
        <select value={String(v)} disabled={running} onChange={(e) => setParam(sel, f.key, e.target.value)} className={cls}>
          {f.options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    if (f.kind === "textarea") return <textarea value={String(v)} disabled={running} rows={f.key === "body" ? 6 : 3} onChange={(e) => setParam(sel, f.key, e.target.value)} className={`${cls} font-mono text-[11.5px]`} />;
    if (f.kind === "number") return <input type="number" min={f.min} max={f.max} value={Number(v)} disabled={running} onChange={(e) => setParam(sel, f.key, Number(e.target.value))} className={cls} />;
    return <input value={String(v)} disabled={running} onChange={(e) => setParam(sel, f.key, e.target.value)} className={cls} />;
  };

  return (
    <div className="space-y-3">
      {!initial && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] font-semibold">Start from</span>
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" aria-pressed={tpl === t.id} onClick={() => load(t.id)} className={`rounded-2xl px-3 py-1.5 text-left transition ${tpl === t.id ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}>
              <span className="block text-[12.5px] font-semibold">{t.title}</span>
              <span className={`block text-[10.5px] ${tpl === t.id ? "text-white/55" : "text-ink-2/50"}`}>{t.shows}</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-[24px] border border-line bg-[#fbfaf7] p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="mr-auto min-w-0 truncate text-[15px] font-semibold">{wf.name}</p>
            {running ? (
              <button type="button" onClick={() => ctl.current?.abort()} className="flex items-center gap-1.5 rounded-full border border-ink px-3.5 py-1.5 text-[12.5px] font-semibold">
                <Square className="h-3 w-3" /> Stop
              </button>
            ) : (
              <button type="button" onClick={run} className="flex items-center gap-1.5 rounded-full bg-[#eb6834] px-4 py-1.5 text-[12.5px] font-semibold text-white">
                <Play className="h-3.5 w-3.5" /> Run workflow
              </button>
            )}
          </div>
          {card(null)}
          {list(wf.steps, null, "root")}
          {last && !running && (
            <p className="mt-2 rounded-xl px-3 py-2 text-[12px]" style={{ background: last.res.status === "ok" ? "#eaf8f1" : last.res.status === "failed" ? "#fdf0ee" : "#f1efea", color: last.res.status === "ok" ? "#0f6e4c" : last.res.status === "failed" ? "#a3302e" : undefined }}>
              Run {last.n}: {last.res.status === "ok" ? "finished" : last.res.status === "failed" ? `failed (${last.res.error})` : last.res.status === "rejected" ? "ended: approval rejected" : "stopped"} in {(last.res.ms / 1000).toFixed(1)} s
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col rounded-[24px] border border-line bg-white">
          <div className="flex gap-1 border-b border-line p-2" role="tablist">
            {(
              [
                ["settings", "Settings"],
                ["data", "Data"],
                ["log", "Run log"],
                ["json", "Definition"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1 text-[12px] transition ${tab === k ? "bg-ink text-white" : "text-ink/60 hover:bg-ink/5"}`}>
                {label}
                {k === "log" && logs.length > 0 && <span className="ml-1 font-mono text-[10px] opacity-60">{logs.length}</span>}
              </button>
            ))}
          </div>
          <div data-lenis-prevent className="max-h-[560px] min-h-[320px] flex-1 overflow-y-auto p-4">
            {tab === "settings" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg text-white" style={{ background: GROUP_COLOR[selStep ? NODES[selStep.type].group : "Trigger"] }}>
                    {ICON[selStep ? selStep.type : wf.trigger.type]}
                  </span>
                  <p className="text-[14px] font-semibold">{selStep ? NODES[selStep.type].label : "Trigger"}</p>
                  {selStep && NODES[selStep.type].real && <span className="rounded-full bg-[#eaf8f1] px-2 py-0.5 font-mono text-[10px] text-[#0f6e4c]">real API</span>}
                </div>
                <p className="text-[12.5px] leading-snug text-ink-2/65">{selStep ? NODES[selStep.type].what : TRIGGERS[wf.trigger.type].what}</p>
                {!selStep && (
                  <>
                    <label className="block text-[12px] font-semibold">
                      Workflow name
                      <input value={wf.name} disabled={running} onChange={(e) => edit((w) => void (w.name = e.target.value))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-[12.5px] outline-none focus:border-ink" />
                    </label>
                    <label className="block text-[12px] font-semibold">
                      Starts with
                      <select
                        value={wf.trigger.type}
                        disabled={running}
                        onChange={(e) =>
                          edit((w) => {
                            const t = e.target.value as TriggerType;
                            w.trigger = { type: t, params: { ...TRIGGERS[t].defaults } };
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-[12.5px] outline-none focus:border-ink"
                      >
                        {(Object.keys(TRIGGERS) as TriggerType[]).map((t) => (
                          <option key={t} value={t}>
                            {TRIGGERS[t].label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[12px] font-semibold">
                      When a step fails
                      <select value={wf.onError} disabled={running} onChange={(e) => edit((w) => void (w.onError = e.target.value as Workflow["onError"]))} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-[12.5px] outline-none focus:border-ink">
                        <option value="stop">Stop the run</option>
                        <option value="alert">Stop and alert the on-call channel</option>
                      </select>
                    </label>
                  </>
                )}
                {selStep && (
                  <label className="block text-[12px] font-semibold">
                    Step name
                    <input value={selStep.name} disabled={running} onChange={(e) => rename(selStep.id, e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-[12.5px] outline-none focus:border-ink" />
                  </label>
                )}
                {fields.map((f) => (
                  <label key={f.key} className="block text-[12px] font-semibold">
                    {f.label}
                    {input(f)}
                    {f.help && <span className="mt-0.5 block text-[11px] font-normal text-ink-2/50">{f.help}</span>}
                  </label>
                ))}
                {selStep && ["message", "log", "set", "approval"].includes(selStep.type) && <p className="text-[11.5px] text-ink-2/50">Use {"{{field}}"} to insert data from earlier steps, for example {"{{rate}}"} or {"{{city}}"}. The Data tab shows what&apos;s available.</p>}
                {selStep && !running && (
                  <button type="button" onClick={() => remove(selStep.id)} className="flex items-center gap-1.5 text-[12px] text-[#a3302e] hover:underline">
                    <Trash2 className="h-3.5 w-3.5" /> Remove this step
                  </button>
                )}
              </div>
            )}
            {tab === "data" && (
              <div className="space-y-3">
                {!se ? (
                  <p className="text-[12.5px] text-ink-2/60">Run the workflow, then pick a step to see the data that went in and came out.</p>
                ) : (
                  (
                    [
                      ["Input", se.input],
                      ["Output", se.output],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[11.5px] font-semibold text-ink-2/60">{k}</p>
                      <pre className="mt-1 max-h-[220px] overflow-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-white/85">{v ? JSON.stringify(v, null, 2) : "—"}</pre>
                    </div>
                  ))
                )}
              </div>
            )}
            {tab === "log" && (
              <ol className="space-y-1 font-mono text-[11.5px]">
                {logs.length === 0 && <li className="font-sans text-[12.5px] text-ink-2/60">Press Run workflow. Every step, call and retry is written here.</li>}
                {logs.map((l, i) => (
                  <li key={i} className="flex gap-2 leading-snug">
                    <span className="w-14 shrink-0 text-right text-ink-2/40">{l.t < 1000 ? `${l.t} ms` : `${(l.t / 1000).toFixed(1)} s`}</span>
                    <span style={{ color: l.level === "error" ? "#a3302e" : l.level === "warn" ? "#8a6d00" : l.level === "ok" ? "#0f6e4c" : undefined }} className="min-w-0 break-words">
                      {l.text}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {tab === "json" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[11.5px] text-ink-2/60">This workflow as data: the same shape the AI writes on the prompt-to-automation page.</p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(JSON.stringify(wf, null, 2));
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1500);
                      } catch {
                        // clipboard blocked
                      }
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] hover:bg-ink/5"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="overflow-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-white/85">{JSON.stringify(wf, null, 2)}</pre>
              </div>
            )}
          </div>
          {history.length > 0 && (
            <div className="border-t border-line px-4 py-2.5">
              <p className="text-[11px] font-semibold text-ink-2/55">Runs</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {history.map((h) => (
                  <span key={h.n} className="rounded-full px-2 py-0.5 font-mono text-[10.5px]" style={{ background: h.res.status === "ok" ? "#eaf8f1" : h.res.status === "failed" ? "#fdf0ee" : "#f1efea", color: h.res.status === "ok" ? "#0f6e4c" : h.res.status === "failed" ? "#a3302e" : "rgba(11,11,11,0.6)" }}>
                    #{h.n} {h.res.status} · {(h.res.ms / 1000).toFixed(1)} s
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[22px] border border-line bg-white p-3">
          <div className="flex items-center justify-between px-1">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <MessageCircle className="h-4 w-4 text-[#1baf7a]" /> Messages sent <span className="font-normal text-ink-2/45">(simulated)</span>
            </p>
            {effects.length > 0 && (
              <button type="button" onClick={() => setEffects([])} className="text-[11.5px] text-ink-2/55 hover:text-ink">
                Clear
              </button>
            )}
          </div>
          <div className="mt-2 min-h-[120px] space-y-1.5">
            {msgs.length === 0 && <p className="px-1 text-[12px] text-ink-2/50">Messages your workflow sends appear here. Nothing leaves this page.</p>}
            {msgs.slice(0, 6).map((m, i) => (
              <div key={`${m.t}-${i}`} className="rounded-2xl rounded-tl-sm bg-[#eaf8f1] px-3 py-2">
                <p className="font-mono text-[10px] text-[#0f6e4c]">
                  {m.channel} → {m.to}
                </p>
                <p className="text-[12.5px] leading-snug">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[22px] border border-line bg-white p-3">
          <p className="flex items-center gap-1.5 px-1 text-[12.5px] font-semibold">
            <Table className="h-4 w-4 text-[#2a78d6]" /> Sheets <span className="font-normal text-ink-2/45">(simulated)</span>
          </p>
          <div className="mt-2 min-h-[120px] space-y-2">
            {bySheet.size === 0 && <p className="px-1 text-[12px] text-ink-2/50">Rows your workflow adds appear here.</p>}
            {[...bySheet.entries()].map(([name, g]) => (
              <div key={name} className="overflow-x-auto">
                <p className="px-1 font-mono text-[10.5px] text-ink-2/55">{name}</p>
                <table className="mt-0.5 w-full text-[11.5px]">
                  <thead>
                    <tr className="bg-cream/70">
                      {g.columns.map((c) => (
                        <th key={c} className="px-2 py-1 text-left font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.slice(-8).map((r, i) => (
                      <tr key={i} className="border-b border-line last:border-0">
                        {r.map((c, j) => (
                          <td key={j} className="px-2 py-1 tabular-nums">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
