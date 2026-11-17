"use client";

import { useState } from "react";

/* Portal Channel Operation's access rule (routers/auth.py has_access, the same in the browser):
 * "all" grants everything; an exact key grants it; a tab key "page.tab" is also granted when "page" is granted
 * and no "page.*" key is set at all. Tabs are only saved under a checked page; an empty selection saves as "all".
 * Areas with nothing visible disappear; a user with a single area lands straight inside it.
 * Viewers never get write buttons; admins see everything plus the admin section. (A trimmed-down feature tree.) */

type Page = { key: string; label: string; tabs?: { key: string; label: string }[] };
const TREE: { area: string; pages: Page[] }[] = [
  { area: "Partner", pages: [{ key: "partner_email", label: "Partner email list" }, { key: "stock", label: "Data Stock" }] },
  { area: "Distribusi", pages: [{ key: "alokasi", label: "Allocation", tabs: [{ key: "alokasi.plan", label: "Plan" }, { key: "alokasi.payment", label: "Payment" }] }, { key: "validation", label: "Purchase validation" }] },
  { area: "Tools", pages: [{ key: "letter", label: "Letters & PDF" }, { key: "wa_blast", label: "WhatsApp blast" }] },
  { area: "Data & Referensi", pages: [{ key: "demarkasi", label: "Demarkasi", tabs: [{ key: "demarkasi.territory", label: "Territory" }, { key: "demarkasi.resign", label: "Resign" }] }] },
  { area: "PNL", pages: [{ key: "pnl", label: "P&L", tabs: [{ key: "pnl.upload", label: "Upload" }, { key: "pnl.dashboard", label: "Dashboard" }] }] },
  { area: "PSTR", pages: [{ key: "pstr", label: "PSTR rollup" }] },
];

function hasAccess(akses: string[], key: string) {
  if (akses.includes("all") || akses.includes(key)) return true;
  const dot = key.indexOf(".");
  if (dot < 0) return false;
  const page = key.slice(0, dot);
  return akses.includes(page) && !akses.some((a) => a.startsWith(page + "."));
}

export function PortalDemo() {
  const [role, setRole] = useState<"viewer" | "operator" | "admin">("operator");
  const [checked, setChecked] = useState<string[]>(["pnl", "pnl.upload", "demarkasi"]);

  // what saveUser stores: tabs only under a checked page; nothing checked means everything
  const saved = (() => {
    const keep = checked.filter((k) => !k.includes(".") || checked.includes(k.split(".")[0]));
    return keep.length ? keep : ["all"];
  })();
  const akses = role === "admin" ? ["all"] : saved;
  const areas = TREE.map((a) => ({ ...a, pages: a.pages.filter((p) => hasAccess(akses, p.key)) })).filter((a) => a.pages.length);

  const toggle = (key: string) => setChecked((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="rounded-[22px] border border-line bg-white p-5">
        <p className="font-mono text-[11px] tracking-[0.14em] text-ink/50 uppercase">Role</p>
        <div className="mt-2 flex gap-2">
          {(["viewer", "operator", "admin"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-full px-3 py-1.5 text-[13px] font-medium capitalize ${role === r ? "bg-[#E4002B] text-white" : "border border-line text-ink/70"}`}>
              {r}
            </button>
          ))}
        </div>
        <p className="mt-5 font-mono text-[11px] tracking-[0.14em] text-ink/50 uppercase">Access, per page and per tab</p>
        <div className={`mt-2 flex flex-col gap-3 ${role === "admin" ? "pointer-events-none opacity-40" : ""}`}>
          {TREE.map((a) => (
            <div key={a.area}>
              <p className="text-[12.5px] font-semibold text-ink/60">{a.area}</p>
              {a.pages.map((p) => (
                <div key={p.key} className="ml-1">
                  <label className="flex items-center gap-2 py-0.5 text-[13.5px]">
                    <input type="checkbox" checked={checked.includes(p.key)} onChange={() => toggle(p.key)} className="accent-[#E4002B]" />
                    {p.label}
                  </label>
                  {p.tabs?.map((t) => (
                    <label key={t.key} className={`ml-6 flex items-center gap-2 py-0.5 text-[12.5px] ${checked.includes(p.key) ? "text-ink/75" : "text-ink/30"}`}>
                      <input type="checkbox" disabled={!checked.includes(p.key)} checked={checked.includes(t.key)} onChange={() => toggle(t.key)} className="accent-[#E4002B]" />
                      {t.label} tab
                    </label>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-[22px] bg-ink p-5 font-mono text-[12px] text-white">
          <p className="text-[11px] tracking-[0.14em] text-white/50 uppercase">Saved in the user row</p>
          <p className="mt-2 break-all">
            role=<span className="text-[#ffb4c2]">{role}</span>, akses=<span className="text-[#ffb4c2]">{akses.join(",")}</span>
          </p>
        </div>
        <div className="rounded-[22px] border border-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[15px] font-semibold">What this person sees</p>
            {role === "viewer" && <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 font-mono text-[11px] text-ink/60">read-only: no write buttons</span>}
          </div>
          <p className="mt-1 text-[13px] text-ink/55">
            {areas.length === 1 ? `Only one area, so the menu is skipped: straight into ${areas[0].area}.` : `${areas.length} of 6 areas on the main menu.`}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {areas.map((a) => (
              <div key={a.area} className="rounded-2xl border border-[#E4002B]/15 bg-gradient-to-br from-white to-[#fdf0f3] p-3.5">
                <p className="text-[14px] font-semibold">{a.area}</p>
                <ul className="mt-1.5 flex flex-col gap-1 text-[12.5px] text-ink/70">
                  {a.pages.map((p) => (
                    <li key={p.key}>
                      {p.label}
                      {p.tabs && <span className="text-ink/45"> · {p.tabs.filter((t) => hasAccess(akses, t.key)).map((t) => t.label).join(", ") || "no tabs"}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {role === "admin" && (
              <div className="rounded-2xl bg-ink p-3.5 text-white sm:col-span-2">
                <p className="text-[14px] font-semibold">Admin</p>
                <p className="mt-1 text-[12.5px] text-white/60">Manage access · Activity log · GA data</p>
              </div>
            )}
          </div>
          <p className="mt-4 text-[12.5px] text-ink/50">Tick P&amp;L without any of its tabs and both tabs open: a page with no tab keys means every tab.</p>
        </div>
      </div>
    </div>
  );
}
