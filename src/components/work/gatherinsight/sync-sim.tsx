"use client";

import { CloudOff, RefreshCw, Smartphone, Server, Wifi, WifiOff } from "lucide-react";
import { useRef, useState } from "react";

/* The phone's send queue, as lib/sync.ts runs it: oldest first, one entry at a time, an id made on the phone,
 * 400/409 = refused (marked, queue continues), network error or 5xx = the pass stops so the order is kept. */

type Entry = { id: string; n: number; survey: "CSAT" | "NPS"; status: "waiting" | "sending" | "sent" | "refused"; note?: string };
type Line = { t: string; tone: "ok" | "bad" | "info" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shortId = (n: number) => `${(0x3fa9 + n * 7919).toString(16).slice(-4)}…${(0x91c2 + n * 104729).toString(16).slice(-4)}`;

export function SyncSim() {
  const [online, setOnline] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([
    { id: shortId(1), n: 1, survey: "CSAT", status: "waiting" },
    { id: shortId(2), n: 2, survey: "NPS", status: "waiting" },
  ]);
  const [server, setServer] = useState<string[]>([]);
  const [quotaFull, setQuotaFull] = useState(false);
  const [dropNext, setDropNext] = useState(false);
  const [error500, setError500] = useState(false);
  const [log, setLog] = useState<Line[]>([{ t: "No signal. Two interviews are saved on the phone, waiting.", tone: "info" }]);
  const [busy, setBusy] = useState(false);
  const serverRef = useRef<string[]>([]);
  const counter = useRef(2);

  const add = () => {
    counter.current += 1;
    const n = counter.current;
    setEntries((e) => [...e, { id: shortId(n), n, survey: n % 3 === 0 ? "NPS" : "CSAT", status: "waiting" }]);
  };

  const pass = async (isOnline: boolean, list: Entry[], why: string) => {
    if (busy) return;
    setBusy(true);
    const lines: Line[] = [{ t: why, tone: "info" }];
    let drop = dropNext;
    const queue = list.filter((e) => e.status === "waiting");
    if (!queue.length) lines.push({ t: "Nothing waiting.", tone: "info" });
    for (const e of queue) {
      if (!isOnline) {
        lines.push({ t: "No connection: the pass stops, the queue stays as it is. Next try in 30 s.", tone: "bad" });
        break;
      }
      setEntries((all) => all.map((x) => (x.id === e.id ? { ...x, status: "sending" } : x)));
      await sleep(450);
      if (error500) {
        setEntries((all) => all.map((x) => (x.id === e.id ? { ...x, status: "waiting" } : x)));
        lines.push({ t: `#${e.n} → 500 server error. The pass stops here so nothing is sent out of order.`, tone: "bad" });
        break;
      }
      if (quotaFull && e.survey === "CSAT" && !serverRef.current.includes(e.id)) {
        setEntries((all) => all.map((x) => (x.id === e.id ? { ...x, status: "refused", note: "QUOTA_FULL" } : x)));
        lines.push({ t: `#${e.n} → 409 QUOTA_FULL. Marked refused with the reason; the queue carries on.`, tone: "bad" });
        continue;
      }
      const known = serverRef.current.includes(e.id);
      if (!known) {
        serverRef.current = [...serverRef.current, e.id];
        setServer(serverRef.current);
      }
      if (drop) {
        drop = false;
        setDropNext(false);
        setEntries((all) => all.map((x) => (x.id === e.id ? { ...x, status: "waiting" } : x)));
        lines.push({ t: `#${e.n} → the server saved it, but the reply was lost on the way. The phone still thinks it's waiting.`, tone: "bad" });
        break;
      }
      setEntries((all) => all.map((x) => (x.id === e.id ? { ...x, status: "sent" } : x)));
      lines.push(known ? { t: `#${e.n} → "already have ${e.id}". Same id, so no duplicate: marked sent.`, tone: "ok" } : { t: `#${e.n} → 200 saved.`, tone: "ok" });
    }
    setLog(lines);
    setBusy(false);
  };

  const toggleNet = () => {
    const next = !online;
    setOnline(next);
    if (next) void pass(true, entries, "Signal back: the network listener starts a pass.");
    else setLog([{ t: "Signal lost. Finished interviews keep queueing on the phone.", tone: "info" }]);
  };

  const waiting = entries.filter((e) => e.status === "waiting" || e.status === "sending").length;
  const pill = (s: Entry["status"]) =>
    s === "sent" ? "bg-[#e3f9ec] text-[#11733a]" : s === "refused" ? "bg-[#fde5ea] text-[#b0173a]" : s === "sending" ? "bg-[#dbedfb] text-[#1a5fa8]" : "bg-[#fff2df] text-[#9a5b00]";
  const label = (s: Entry["status"]) => (s === "sent" ? "Sent" : s === "refused" ? "Refused" : s === "sending" ? "Sending…" : "Waiting to send");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <div className="rounded-[26px] border border-[#2088e4]/15 bg-gradient-to-br from-[#f3f9ff] to-[#e3f0fc] p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-[#1a5fa8] uppercase">
            <Smartphone className="h-4 w-4" /> Phone · SQLite queue
          </p>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${online ? "bg-[#e3f9ec] text-[#11733a]" : "bg-[#fff2df] text-[#9a5b00]"}`}>
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />} {online ? "Online" : "No signal"}
          </span>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">
                  Interview #{e.n} <span className="font-normal text-ink/45">· {e.survey}</span>
                </p>
                <p className="font-mono text-[11px] text-ink/45">id {e.id}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${pill(e.status)}`}>{label(e.status)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={add} className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#1a5fa8] shadow-sm transition hover:bg-[#f3f9ff]">
            + Finish an interview
          </button>
          <button
            type="button"
            onClick={toggleNet}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2088e4] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_0_#98c4f7] transition hover:bg-[#1a78cc]"
          >
            {online ? <CloudOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />} {online ? "Lose the signal" : "Get signal back"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void pass(online, entries, "30 s timer: another pass.")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#2088e4]/30 bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#1a5fa8] transition hover:bg-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Sync now
          </button>
        </div>
        <p className="mt-3 text-[12.5px] text-ink/50">{waiting} waiting · ids are made on the phone, so a resend can never create a second row.</p>
      </div>

      <div className="hidden items-center lg:flex">
        <span className="font-mono text-[12px] text-ink/30">{online ? "⇄" : "✕"}</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-[26px] border border-line bg-white p-5">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
            <Server className="h-4 w-4" /> Server · responses
          </p>
          <p className="mt-3 text-[32px] leading-none font-semibold tracking-tight">{server.length}</p>
          <p className="text-[12.5px] text-ink/50">rows stored, one per interview id</p>
          <div className="mt-4 flex flex-col gap-2">
            {[
              { on: quotaFull, set: () => setQuotaFull((v) => !v), t: "CSAT quota is full", d: "the next CSAT entries come back 409" },
              { on: dropNext, set: () => setDropNext((v) => !v), t: "Lose the next reply", d: "saved on the server, the phone never hears" },
              { on: error500, set: () => setError500((v) => !v), t: "Server error 500", d: "a bad deploy, say" },
            ].map((s) => (
              <button
                key={s.t}
                type="button"
                onClick={s.set}
                aria-pressed={s.on}
                className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2 text-left transition ${s.on ? "border-[#2088e4] bg-[#f3f9ff]" : "border-line hover:bg-[#fafafa]"}`}
              >
                <span className={`h-4 w-7 shrink-0 rounded-full p-0.5 transition ${s.on ? "bg-[#2088e4]" : "bg-ink/15"}`}>
                  <span className={`block h-3 w-3 rounded-full bg-white transition ${s.on ? "translate-x-3" : ""}`} />
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold">{s.t}</span>
                  <span className="block text-[12px] text-ink/50">{s.d}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[22px] bg-[#0f1f33] p-4 font-mono text-[12px] leading-relaxed" aria-live="polite">
          {log.map((l, i) => (
            <p key={i} className={l.tone === "ok" ? "text-[#7ee2b0]" : l.tone === "bad" ? "text-[#ffb4c0]" : "text-white/60"}>
              {l.t}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
