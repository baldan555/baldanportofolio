"use client";

import { useState } from "react";

/* TickMate's access rules (src/lib/auth/rbac.ts), on made-up tickets:
 * canCreateTicket  = SUPERADMIN || ADMIN || (USER && CREATOR)
 * canHandleTickets = SUPERADMIN || ADMIN || (USER && HANDLER)
 * isReadOnlyMonitor = USER && SUPERVISOR
 * scope: GLOBAL sees every region; REGION sees its region and the region it was split from (predecessor);
 * a closed ticket is locked for everyone but SUPERADMIN. Sidebar items follow the same checks. */

type Role = "SUPERADMIN" | "ADMIN" | "USER";
type Sub = "CREATOR" | "HANDLER" | "SUPERVISOR";
const REGIONS = ["North", "Central", "South"] as const;
const PREDECESSOR: Record<string, string> = { Central: "Central (before split)" };

const TICKETS = [
  { code: "TCK-NOR-DIMASAREA-LOGIN-0007", region: "North", status: "Open", closed: false },
  { code: "TCK-CEN-ARIFAREA-STOK-0014", region: "Central", status: "On Hold", closed: false },
  { code: "TCK-CEN-NADIAAREA-APP-0021", region: "Central", status: "Closed", closed: true },
  { code: "TCK-OLD-PUTRIAREA-FEE-0003", region: "Central (before split)", status: "Closed", closed: true },
  { code: "TCK-SOU-YOGAAREA-AKTV-0029", region: "South", status: "Pending", closed: false },
];

export function TickmateDemo() {
  const [role, setRole] = useState<Role>("USER");
  const [sub, setSub] = useState<Sub>("HANDLER");
  const [scope, setScope] = useState<"GLOBAL" | "REGION">("REGION");
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("Central");

  const isUser = role === "USER";
  const canCreate = !isUser || sub === "CREATOR";
  const canHandle = !isUser || sub === "HANDLER";
  const readOnly = isUser && sub === "SUPERVISOR";
  const global = scope === "GLOBAL";
  const visible = (r: string) => global || r === region || r === PREDECESSOR[region];

  const menu = [
    { label: "Inbox", on: true },
    { label: "New Ticket", on: canCreate },
    { label: "Tickets", on: true },
    { label: "My Ticket", on: canCreate },
    { label: "Dashboard", on: true },
    { label: "Manage Users", on: role === "SUPERADMIN" || role === "ADMIN" },
    { label: "Master Data", on: role === "SUPERADMIN" },
    { label: "Guide", on: true },
  ];

  const pill = (active: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-medium transition ${active ? "bg-[#155dfc] text-white" : "border border-line bg-white text-ink/70 hover:text-ink"}`;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className="flex flex-col gap-5 rounded-[22px] border border-line bg-white p-5">
        <div>
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink/50 uppercase">Role</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["SUPERADMIN", "ADMIN", "USER"] as Role[]).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)} className={pill(role === r)}>
                {r[0] + r.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        {isUser && (
          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink/50 uppercase">Sub-role</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["CREATOR", "HANDLER", "SUPERVISOR"] as Sub[]).map((s) => (
                <button key={s} type="button" onClick={() => setSub(s)} className={pill(sub === s)}>
                  {s[0] + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink/50 uppercase">Scope</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setScope("GLOBAL")} className={pill(global)}>
              All regions
            </button>
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setScope("REGION");
                  setRegion(r);
                }}
                className={pill(!global && region === r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-line pt-4">
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink/50 uppercase">Sidebar</p>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 text-[13px]">
            {menu.map((m) => (
              <li key={m.label} className={m.on ? "text-ink" : "text-ink/25 line-through"}>
                {m.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <p className="text-[15px] font-semibold">Complaint tickets</p>
          <p className="font-mono text-[11.5px] text-ink/50">{global ? "All regions" : `${region} region`}</p>
        </div>
        {TICKETS.map((tk) => {
          const see = visible(tk.region);
          const locked = tk.closed && role !== "SUPERADMIN";
          const handle = see && canHandle && !locked;
          const chat = see && !locked;
          return (
            <div key={tk.code} className={`grid grid-cols-1 gap-2 border-b border-line px-5 py-3.5 last:border-0 sm:grid-cols-[1fr_auto] sm:items-center ${see ? "" : "opacity-35"}`}>
              <div className="min-w-0">
                <p className="truncate font-mono text-[12.5px]">{tk.code}</p>
                <p className="mt-0.5 text-[12.5px] text-ink/55">
                  {tk.region} · {tk.status}
                  {tk.region === PREDECESSOR[region] && !global && " · visible through the region it was split from"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {!see ? (
                  <span className="rounded-full bg-ink/5 px-2.5 py-1 text-ink/50">out of scope</span>
                ) : (
                  <>
                    <span className="rounded-full bg-[#eef3fb] px-2.5 py-1 text-[#1447e6]">view</span>
                    <span className={`rounded-full px-2.5 py-1 ${chat ? "bg-[#eef3fb] text-[#1447e6]" : "bg-ink/5 text-ink/35 line-through"}`}>chat</span>
                    <span className={`rounded-full px-2.5 py-1 ${handle ? "bg-[#eef3fb] text-[#1447e6]" : "bg-ink/5 text-ink/35 line-through"}`}>status · assign</span>
                    {locked && <span className="rounded-full bg-[#fde8e8] px-2.5 py-1 text-[#b91c1c]">closed: locked</span>}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <p className="border-t border-line bg-[#f8fafc] px-5 py-3 text-[12.5px] text-ink/60">
          {readOnly
            ? "Supervisor: monitoring only. Status, assignment and uploads are refused by the server."
            : canHandle
              ? "Can move tickets along and assign them to someone in the same region."
              : "Creator: raises tickets and follows them; handlers move them along."}
        </p>
      </div>
    </div>
  );
}
