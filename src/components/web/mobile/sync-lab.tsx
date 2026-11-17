"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Check, CloudOff, Pencil, Plane, Server, Wifi } from "lucide-react";

/*
 * Offline-first sync, simulated: two phones keep a local copy and an outbox of changes; when they come online the
 * outbox goes to the server, which settles conflicts either per field (both edits survive) or per whole item (the
 * later save wins and silently overwrites the other one). A logical clock orders the edits.
 */
type Dev = "A" | "B";
type Field = "text" | "done";
type Ver = { t: number; by: Dev | "seed" };
type Item = { id: string; text: string; done: boolean; v: Record<Field, Ver> };
type Op = { dev: Dev; item: string; field: Field; value: string | boolean; t: number; snap: Item; created?: boolean };
type Phone = { online: boolean; items: Item[]; outbox: Op[] };
type Log = { k: number; tone: "ok" | "bad" | "info"; text: string };
type World = { clock: number; server: Item[]; phones: Record<Dev, Phone>; log: Log[]; k: number };
type Strategy = "field" | "record";
const NAME: Record<Dev, string> = { A: "Rina", B: "Budi" };
const GR = "#1baf7a";
const RD = "#c8413f";
const OR = "#eb6834";

const seed = (): Item[] =>
  [
    ["v1", "Visit Toko Sinar"],
    ["v2", "Restock coffee beans"],
    ["v3", "Send invoice to CV Abadi"],
  ].map(([id, text]) => ({ id, text, done: false, v: { text: { t: 0, by: "seed" }, done: { t: 0, by: "seed" } } }));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
function fresh(): World {
  return { clock: 0, server: seed(), phones: { A: { online: true, items: seed(), outbox: [] }, B: { online: true, items: seed(), outbox: [] } }, log: [{ k: 0, tone: "info", text: "Both phones are online and in sync." }], k: 0 };
}
const say = (w: World, tone: Log["tone"], text: string) => {
  w.k += 1;
  w.log.unshift({ k: w.k, tone, text });
  w.log = w.log.slice(0, 14);
};

/** Push one phone's outbox to the server, then refresh every online phone from the server. */
function sync(w: World, dev: Dev, strategy: Strategy) {
  const ph = w.phones[dev];
  if (!ph.outbox.length) {
    ph.items = clone(w.server);
    return;
  }
  for (const op of ph.outbox) {
    const s = w.server.find((x) => x.id === op.item);
    if (!s) {
      w.server.push(clone(op.snap));
      say(w, "ok", `${NAME[dev]} added “${op.snap.text}”.`);
      continue;
    }
    const label = op.field === "text" ? `renamed it to “${op.value}”` : op.value ? "ticked it done" : "unticked it";
    if (strategy === "field") {
      if (op.t > s.v[op.field].t) {
        (s as Record<Field, string | boolean>)[op.field] = op.value;
        s.v[op.field] = { t: op.t, by: dev };
        say(w, "ok", `${NAME[dev]} ${label} (t${op.t}): merged.`);
      } else say(w, "bad", `${NAME[dev]}'s edit (t${op.t}) is older than ${s.v[op.field].by === "seed" ? "the original" : NAME[s.v[op.field].by as Dev]}'s (t${s.v[op.field].t}) on the same field: dropped.`);
    } else {
      const recT = Math.max(s.v.text.t, s.v.done.t);
      if (op.t > recT) {
        const lost = (["text", "done"] as Field[]).filter((f) => f !== op.field && s.v[f].t > op.snap.v[f].t && s[f] !== op.snap[f]);
        const idx = w.server.indexOf(s);
        w.server[idx] = clone({ ...op.snap, v: { ...op.snap.v, [op.field]: { t: op.t, by: dev } } });
        say(w, "info", `${NAME[dev]} ${label} (t${op.t}): saved the whole item.`);
        for (const f of lost) say(w, "bad", `…which overwrote ${NAME[s.v[f].by as Dev]}'s change to “${f}”. That edit is lost.`);
      } else say(w, "bad", `${NAME[dev]}'s save (t${op.t}) is older than the item on the server (t${recT}): dropped.`);
    }
  }
  ph.outbox = [];
  for (const d of ["A", "B"] as Dev[]) if (w.phones[d].online && !w.phones[d].outbox.length) w.phones[d].items = clone(w.server);
}

function edit(w0: World, dev: Dev, id: string, field: Field, value: string | boolean, strategy: Strategy) {
  const w = clone(w0);
  const ph = w.phones[dev];
  w.clock += 1;
  let it = ph.items.find((x) => x.id === id);
  let created = false;
  if (!it) {
    it = { id, text: String(value), done: false, v: { text: { t: w.clock, by: dev }, done: { t: w.clock, by: dev } } };
    ph.items.push(it);
    created = true;
  } else {
    (it as Record<Field, string | boolean>)[field] = value;
    it.v[field] = { t: w.clock, by: dev };
  }
  ph.outbox.push({ dev, item: id, field, value, t: w.clock, snap: clone(it), created });
  if (ph.online) sync(w, dev, strategy);
  else say(w, "info", `${NAME[dev]} is offline: the change is saved on the phone and waits in the outbox.`);
  return w;
}
function setOnline(w0: World, dev: Dev, online: boolean, strategy: Strategy) {
  const w = clone(w0);
  w.phones[dev].online = online;
  if (online) {
    const n = w.phones[dev].outbox.length;
    say(w, "info", `${NAME[dev]} is back online${n ? `: sending ${n} change${n > 1 ? "s" : ""}` : ""}.`);
    sync(w, dev, strategy);
  } else say(w, "info", `${NAME[dev]} switched on airplane mode.`);
  return w;
}

type Flight = { id: number; dev: Dev; up: boolean; label: string };

function PhoneView({ dev, ph, onEdit, onToggleNet, onAdd }: { dev: Dev; ph: Phone; onEdit: (id: string, f: Field, v: string | boolean) => void; onToggleNet: () => void; onAdd: (text: string) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [add, setAdd] = useState("");
  const pending = new Set(ph.outbox.map((o) => o.item));
  return (
    <div className="mx-auto w-full max-w-[250px] rounded-[34px] border-[6px] border-ink bg-white p-3 shadow-[0_20px_50px_-28px_rgba(11,11,11,0.6)]">
      <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-ink" />
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold">{NAME[dev]}&apos;s phone</span>
        <span className="flex items-center gap-1" style={{ color: ph.online ? GR : RD }}>
          {ph.online ? <Wifi className="h-3.5 w-3.5" /> : <Plane className="h-3.5 w-3.5" />}
          {ph.online ? "online" : "offline"}
        </span>
      </div>
      <p className="mt-2 text-[15px] font-semibold tracking-[-0.01em]">Visits today</p>
      <div className="mt-2 space-y-1.5">
        {ph.items.map((it) => (
          <div key={it.id} className={`flex items-start gap-2 rounded-xl border px-2 py-1.5 ${pending.has(it.id) ? "border-[#eb6834]/60 bg-[#fff3ec]" : "border-line"}`}>
            <button type="button" aria-label={it.done ? "Mark not done" : "Mark done"} onClick={() => onEdit(it.id, "done", !it.done)} className={`mt-[1px] grid h-4 w-4 shrink-0 place-items-center rounded border ${it.done ? "border-[#1baf7a] bg-[#1baf7a] text-white" : "border-ink/30"}`}>
              {it.done && <Check className="h-3 w-3" />}
            </button>
            {editing === it.id ? (
              <form
                className="min-w-0 flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.trim() && draft !== it.text) onEdit(it.id, "text", draft.trim());
                  setEditing(null);
                }}
              >
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => setEditing(null)} className="w-full rounded border border-ink/20 px-1 text-[12px] outline-none" />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(it.id);
                  setDraft(it.text);
                }}
                className={`group min-w-0 flex-1 text-left text-[12px] leading-snug ${it.done ? "text-ink/45 line-through" : ""}`}
              >
                {it.text} <Pencil className="ml-0.5 inline h-2.5 w-2.5 opacity-30 group-hover:opacity-80" />
              </button>
            )}
          </div>
        ))}
      </div>
      <form
        className="mt-2 flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (add.trim()) onAdd(add.trim());
          setAdd("");
        }}
      >
        <input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Add a visit" className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1 text-[11.5px] outline-none focus:border-ink" />
        <button type="submit" className="rounded-lg bg-ink px-2 text-[11.5px] text-white">
          +
        </button>
      </form>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="text-[10.5px]" style={{ color: ph.outbox.length ? OR : GR }}>
          {ph.outbox.length ? `${ph.outbox.length} change${ph.outbox.length > 1 ? "s" : ""} in the outbox` : "all synced ✓"}
        </span>
        <button type="button" onClick={onToggleNet} aria-pressed={!ph.online} className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold ${ph.online ? "bg-cream text-ink" : "bg-ink text-white"}`}>
          {ph.online ? <CloudOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
          {ph.online ? "Go offline" : "Go online"}
        </button>
      </div>
    </div>
  );
}

export function SyncLab() {
  const [w, setW] = useState<World>(fresh);
  const [strategy, setStrategy] = useState<Strategy>("field");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const fid = useRef(0);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const fly = (dev: Dev, up: boolean, label: string) => {
    fid.current += 1;
    const f = { id: fid.current, dev, up, label };
    setFlights((x) => [...x, f]);
    later(1100, () => setFlights((x) => x.filter((y) => y.id !== f.id)));
  };
  const apply = (next: World, dev: Dev, sent: number) => {
    setW(next);
    if (sent && next.phones[dev].online) {
      fly(dev, true, `${sent} change${sent > 1 ? "s" : ""}`);
      later(500, () => (["A", "B"] as Dev[]).forEach((d) => next.phones[d].online && fly(d, false, "latest")));
    }
  };
  const doEdit = (dev: Dev, id: string, f: Field, v: string | boolean) => {
    if (playing) return;
    apply(edit(w, dev, id, f, v, strategy), dev, 1);
  };
  const toggle = (dev: Dev) => {
    if (playing) return;
    const goingOnline = !w.phones[dev].online;
    const sent = w.phones[dev].outbox.length;
    apply(setOnline(w, dev, goingOnline, strategy), dev, goingOnline ? sent : 0);
  };
  const reset = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setFlights([]);
    setPlaying(false);
    setW(fresh());
  };
  /** The classic conflict: both offline, different edits to the same visit, then both come back. */
  const play = () => {
    reset();
    setPlaying(true);
    const s = strategy;
    let cur = fresh();
    const step = (ms: number, fn: (x: World) => World, dev?: Dev, sent = 0) =>
      later(ms, () => {
        cur = fn(cur);
        setW(cur);
        if (dev && sent) {
          fly(dev, true, `${sent} change`);
          later(500, () => (["A", "B"] as Dev[]).forEach((d) => cur.phones[d].online && fly(d, false, "latest")));
        }
      });
    step(300, (x) => setOnline(x, "A", false, s));
    step(1100, (x) => setOnline(x, "B", false, s));
    step(2000, (x) => edit(x, "A", "v1", "text", "Visit Toko Sinar · bring samples", s));
    step(2900, (x) => edit(x, "B", "v1", "done", true, s));
    step(3900, (x) => setOnline(x, "A", true, s), "A", 1);
    step(5300, (x) => setOnline(x, "B", true, s), "B", 1);
    later(6400, () => setPlaying(false));
  };
  const left = (dev: Dev, up: boolean) => (dev === "A" ? (up ? ["28%", "42%"] : ["42%", "28%"]) : up ? ["72%", "58%"] : ["58%", "72%"]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-line bg-white p-3">
        <span className="text-[12px] font-semibold">When two edits collide:</span>
        {(
          [
            ["field", "Merge per field"],
            ["record", "Whole item, last write wins"],
          ] as [Strategy, string][]
        ).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={strategy === k} onClick={() => setStrategy(k)} className={`rounded-full px-3 py-1.5 text-[12px] ${strategy === k ? "bg-ink text-white" : "border border-line text-ink/70 hover:border-ink"}`}>
            {label}
          </button>
        ))}
        <span className="ml-auto flex gap-1.5">
          <button type="button" onClick={play} disabled={playing} className="rounded-full bg-[#eb6834] px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60">
            {playing ? "Playing…" : "Play the classic conflict"}
          </button>
          <button type="button" onClick={reset} className="rounded-full border border-line px-3 py-1.5 text-[12px] hover:border-ink">
            Reset
          </button>
        </span>
      </div>
      <div className="relative grid gap-4 rounded-[26px] bg-[#fbfaf7] p-4 lg:grid-cols-[1fr_1.15fr_1fr]">
        <PhoneView dev="A" ph={w.phones.A} onEdit={(id, f, v) => doEdit("A", id, f, v)} onToggleNet={() => toggle("A")} onAdd={(t) => doEdit("A", `n${w.clock + 1}a`, "text", t)} />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="rounded-2xl bg-ink p-3 text-white">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold">
              <Server className="h-3.5 w-3.5" /> Server · the source of truth
              <span className="ml-auto font-mono text-[10px] text-white/45">clock t{w.clock}</span>
            </p>
            <div className="mt-2 space-y-1">
              {w.server.map((it) => (
                <div key={it.id} className="rounded-lg bg-white/[0.07] px-2 py-1.5">
                  <p className={`text-[12px] ${it.done ? "text-white/50 line-through" : ""}`}>{it.text}</p>
                  <p className="mt-0.5 font-mono text-[9.5px] text-white/45">
                    text: {it.v.text.by === "seed" ? "original" : NAME[it.v.text.by as Dev]} t{it.v.text.t} · done: {String(it.done)} by {it.v.done.by === "seed" ? "original" : NAME[it.v.done.by as Dev]} t{it.v.done.t}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="min-h-[150px] flex-1 rounded-2xl border border-line bg-white p-2.5">
            <p className="text-[11px] font-semibold">Sync log</p>
            <ol className="mt-1 space-y-1">
              <AnimatePresence initial={false}>
                {w.log.slice(0, 7).map((l) => (
                  <motion.li key={l.k} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg px-2 py-1 text-[11.5px] leading-snug" style={{ background: l.tone === "bad" ? "#fdf0ee" : l.tone === "ok" ? "#eaf8f1" : "#f6f3ee", color: l.tone === "bad" ? "#a3302e" : l.tone === "ok" ? "#0f6e4c" : undefined }}>
                    {l.text}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          </div>
        </div>
        <PhoneView dev="B" ph={w.phones.B} onEdit={(id, f, v) => doEdit("B", id, f, v)} onToggleNet={() => toggle("B")} onAdd={(t) => doEdit("B", `n${w.clock + 1}b`, "text", t)} />
        {/* packets between the phones and the server (wide screens) */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <AnimatePresence>
            {flights.map((f) => {
              const [a, b] = left(f.dev, f.up);
              return (
                <motion.span key={f.id} initial={{ left: a, opacity: 0 }} animate={{ left: b, opacity: [0, 1, 1, 0] }} transition={{ duration: 1, ease: "easeInOut" }} className="absolute top-[38%] -translate-x-1/2 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap text-white" style={{ background: f.up ? OR : GR }}>
                  {f.label}
                </motion.span>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">
        Simulated in your browser. Try it yourself: put both phones offline, rename a visit on Rina&apos;s phone, tick the same visit on Budi&apos;s, then bring them back. With “merge per field” both changes survive; with “whole item” the later save wins and the other edit vanishes, which is why serious offline apps track changes per field (or use CRDTs).
      </p>
    </div>
  );
}
