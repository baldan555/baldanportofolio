"use client";

import { useState } from "react";

/* InvenTory's rules (src/lib/data/note-code.ts, input/actions.ts, purchases/actions.ts):
 * note code = {event code}-{category code of the first item}-{DDMMYYYY}-{3-digit sequence}, the sequence per event code only, reserved in a transaction;
 * starting status: employee → pending; admin_master → approved; admin → pending only when "require approval for admin" is on;
 * reviewers act on pending notes: approve, ask for a revision, or reject; delete = a reviewer, or the owner while it is still pending. */

type Role = "employee" | "admin" | "admin_master";
type Status = "pending" | "approved" | "revision" | "rejected";
type Note = { code: string; by: Role; status: Status };
const EVENTS = ["RSK", "PMR", "GTM"];
const CATEGORIES = ["KSM", "MRC", "BTH", "CTK"];
const STATUS_UI: Record<Status, string> = {
  pending: "bg-[#fef3c6] text-[#a16207]",
  approved: "bg-[#d1fae5] text-[#047857]",
  revision: "bg-[#dbeafe] text-[#1d4ed8]",
  rejected: "bg-[#fee2e2] text-[#b91c1c]",
};
const LABEL: Record<Role, string> = { employee: "Staff", admin: "Admin", admin_master: "Admin Master" };

export function InventoryDemo() {
  const [role, setRole] = useState<Role>("employee");
  const [strict, setStrict] = useState(false);
  const [event, setEvent] = useState("RSK");
  const [cat, setCat] = useState("KSM");
  const [date, setDate] = useState("2026-11-15");
  const [seq, setSeq] = useState<Record<string, number>>({ RSK: 11, PMR: 3, GTM: 21 });
  const [notes, setNotes] = useState<Note[]>([]);
  const reviewer = role !== "employee";
  const [y, m, d] = date.split("-");
  const next = (seq[event] ?? 0) + 1;
  const code = `${event}-${cat}-${d}${m}${y}-${String(next).padStart(3, "0")}`;
  const startStatus: Status = role === "employee" ? "pending" : role === "admin_master" ? "approved" : strict ? "pending" : "approved";

  const submit = () => {
    setSeq((s) => ({ ...s, [event]: next }));
    setNotes((ns) => [{ code, by: role, status: startStatus }, ...ns].slice(0, 6));
  };
  const setStatus = (c: string, status: Status) => setNotes((ns) => ns.map((n) => (n.code === c ? { ...n, status } : n)));
  const remove = (c: string) => setNotes((ns) => ns.filter((n) => n.code !== c));
  const sel = "rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
      <div className="flex flex-col gap-4 rounded-[22px] border border-line bg-white p-5">
        <div>
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink/50 uppercase">Signed in as</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(LABEL) as Role[]).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${role === r ? "bg-[#0f172b] text-white" : "border border-line text-ink/70"}`}>
                {LABEL[r]}
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-[12.5px] text-ink/70">
            <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} className="accent-[#0f172b]" />
            Admin purchases need approval too
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[12px] text-ink/60">
            Event
            <select value={event} onChange={(e) => setEvent(e.target.value)} className={sel}>
              {EVENTS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-ink/60">
            First item&apos;s category
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={sel}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-[12px] text-ink/60">
            Purchase date
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={sel} />
          </label>
        </div>
        <div className="rounded-xl bg-[#0f172b] p-3 text-white">
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-white/50 uppercase">Next note code</p>
          <p className="mt-1 font-mono text-[15px] font-semibold">{code}</p>
          <p className="mt-1 text-[11.5px] text-white/55">starts as {startStatus}</p>
        </div>
        <button type="button" onClick={submit} className="rounded-full bg-[#0f172b] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-black">
          Submit purchase
        </button>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-line bg-white">
        <div className="border-b border-line px-5 py-3 text-[15px] font-semibold">Purchases</div>
        {!notes.length && <p className="px-5 py-6 text-[13.5px] text-ink/50">Submit a purchase. Change the event and the sequence follows that event; change the date or category and it keeps counting.</p>}
        {notes.map((n) => {
          const canDelete = reviewer || (n.by === role && n.status === "pending");
          return (
            <div key={n.code} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-0">
              <p className="min-w-0 flex-1 font-mono text-[12.5px]">{n.code}</p>
              <span className="text-[12px] text-ink/50">{LABEL[n.by]}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_UI[n.status]}`}>{n.status}</span>
              {reviewer && n.status === "pending" && (
                <div className="flex gap-1.5">
                  {(["approved", "revision", "rejected"] as Status[]).map((s) => (
                    <button key={s} type="button" onClick={() => setStatus(n.code, s)} className="rounded-full border border-line px-2.5 py-0.5 text-[12px] hover:bg-ink/5">
                      {s === "approved" ? "Approve" : s === "revision" ? "Revise" : "Reject"}
                    </button>
                  ))}
                </div>
              )}
              {canDelete && (
                <button type="button" onClick={() => remove(n.code)} className="text-[12px] text-[#b91c1c] hover:underline">
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
