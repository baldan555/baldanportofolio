"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, MousePointer2, X } from "lucide-react";

/*
 * Robot or API? The same job (log in to a supplier portal, open Orders, export) done three ways on a mock portal:
 * a robot that replays recorded click positions, a robot that finds elements by role and name (as Playwright does),
 * and one API call. Then the portal ships a redesign. Everything here is simulated; no real site is touched.
 */
type Target = "user" | "pass" | "signin" | "orders" | "export";
type Mode = "coords" | "selectors" | "api";
type Layout = "A" | "B";
const POS: Record<Layout, Record<Target, [number, number]>> = {
  A: { user: [50, 36], pass: [50, 52], signin: [66, 70], orders: [38, 9], export: [84, 24] },
  B: { user: [50, 36], pass: [50, 52], signin: [34, 70], orders: [11, 44], export: [20, 24] },
};
const LABEL: Record<Layout, Record<Target, string>> = {
  A: { user: "Username", pass: "Password", signin: "Sign in", orders: "Orders", export: "Export" },
  B: { user: "Username", pass: "Password", signin: "Sign in", orders: "Orders", export: "Download CSV" },
};
const SCRIPT: { act: "type" | "click"; target: Target; text?: string; say: string; code: string }[] = [
  { act: "type", target: "user", text: "ops.bot", say: "Type the username", code: "getByLabel('Username').fill('ops.bot')" },
  { act: "type", target: "pass", text: "••••••••", say: "Type the password", code: "getByLabel('Password').fill(secret)" },
  { act: "click", target: "signin", say: "Click “Sign in”", code: "getByRole('button', { name: 'Sign in' }).click()" },
  { act: "click", target: "orders", say: "Open “Orders”", code: "getByRole('link', { name: 'Orders' }).click()" },
  { act: "click", target: "export", say: "Click “Export”", code: "getByRole('button', { name: 'Export' }).click()" },
];
const ORDERS: [string, string, string][] = [
  ["A-1039", "Toko Sinar", "Rp 182,500"],
  ["A-1040", "Warung Sari", "Rp 96,000"],
  ["A-1041", "Kios Jaya", "Rp 240,000"],
  ["A-1042", "Toko Baru", "Rp 150,000"],
];
type Row = { say: string; code: string; state: "todo" | "doing" | "ok" | "fail"; note?: string };

export function PortalDemo() {
  const [layout, setLayout] = useState<Layout>("A");
  const [mode, setMode] = useState<Mode>("selectors");
  const [smart, setSmart] = useState(false);
  const [screen, setScreen] = useState<"login" | "home" | "orders" | "done">("login");
  const [vals, setVals] = useState({ user: "", pass: "" });
  const [cursor, setCursor] = useState<[number, number]>([88, 88]);
  const [miss, setMiss] = useState<[number, number] | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; secs: number } | null>(null);
  const [api, setApi] = useState<string | null>(null);
  const token = useRef(0);
  useEffect(() => () => void (token.current += 1), []);
  const reset = () => {
    token.current += 1;
    setScreen("login");
    setVals({ user: "", pass: "" });
    setCursor([88, 88]);
    setMiss(null);
    setRows([]);
    setRunning(false);
    setResult(null);
    setApi(null);
  };
  const go = async () => {
    reset();
    const my = token.current;
    const wait = (ms: number) => new Promise<boolean>((r) => window.setTimeout(() => r(token.current === my), ms));
    setRunning(true);
    let secs = 0;
    if (mode === "api") {
      setRows([{ say: "One request to the portal's API", code: "GET /api/orders?date=2026-11-11", state: "doing" }]);
      if (!(await wait(450))) return;
      setApi(JSON.stringify(ORDERS.map(([id, store, total]) => ({ id, store, total: Number(total.replace(/\D/g, "")) })), null, 2));
      setRows([{ say: "One request to the portal's API", code: "GET /api/orders?date=2026-11-11", state: "ok", note: "200 OK, JSON" }]);
      setResult({ ok: true, text: layout === "B" ? "The redesign changed the screens, not the API, so nothing broke." : "No screens, no clicks: the data comes back as data.", secs: 0.4 });
      setRunning(false);
      return;
    }
    const list: Row[] = SCRIPT.map((s) => ({ say: s.say, code: mode === "coords" ? `mouse.click(${POS.A[s.target][0]}%, ${POS.A[s.target][1]}%)` : s.target === "export" && smart ? "getByRole('button', { name: /export|download/i }).click()" : s.code, state: "todo" }));
    setRows(list);
    for (const [i, s] of SCRIPT.entries()) {
      const mark = (state: Row["state"], note?: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, state, note } : x)));
      mark("doing");
      const actual = POS[layout][s.target];
      const aim = mode === "coords" ? POS.A[s.target] : actual;
      setCursor(aim);
      if (!(await wait(650))) return;
      secs += 0.9;
      // does the robot find the element?
      let found = true;
      let why = "";
      if (mode === "coords") {
        found = Math.abs(aim[0] - actual[0]) < 6 && Math.abs(aim[1] - actual[1]) < 6;
        why = `Clicked empty space at (${aim[0]}%, ${aim[1]}%): the button moved.`;
      } else if (LABEL[layout][s.target] !== LABEL.A[s.target] && !(smart && s.target === "export")) {
        found = false;
        why = `Timeout 30000 ms waiting for a button named “${LABEL.A[s.target]}”: it's called “${LABEL[layout][s.target]}” now.`;
      }
      if (!found) {
        setMiss(aim);
        mark("fail", why);
        setResult({ ok: false, text: why, secs: Math.round(secs * 10) / 10 });
        setRunning(false);
        return;
      }
      if (s.act === "type") setVals((v) => ({ ...v, [s.target]: s.text ?? "" }));
      else if (s.target === "signin") setScreen("home");
      else if (s.target === "orders") setScreen("orders");
      else setScreen("done");
      if (!(await wait(350))) return;
      mark("ok");
    }
    setResult({ ok: true, text: mode === "selectors" ? (layout === "B" ? "Finding elements by role and name survived the redesign." : "Done, the way Playwright scripts work.") : "Done, as long as nothing on screen moves.", secs: Math.round(secs * 10) / 10 });
    setRunning(false);
  };
  const L = LABEL[layout];
  const P = POS[layout];
  const at = (t: Target) => ({ left: `${P[t][0]}%`, top: `${P[t][1]}%` });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["coords", "Robot: recorded click positions"],
            ["selectors", "Robot: finds elements by name"],
            ["api", "One API call"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={mode === k}
            onClick={() => {
              setMode(k);
              reset();
            }}
            className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${mode === k ? "bg-ink text-white" : "bg-cream/70 text-ink/70 hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-3 py-2">
        <label className="flex items-center gap-2 text-[12.5px] font-semibold">
          <input
            type="checkbox"
            checked={layout === "B"}
            onChange={(e) => {
              setLayout(e.target.checked ? "B" : "A");
              reset();
            }}
            style={{ accentColor: "#eb6834" }}
          />
          The portal ships a redesign
        </label>
        <span className="text-[11.5px] text-ink-2/55">buttons move, “Orders” goes to a sidebar, “Export” becomes “Download CSV”</span>
        {mode === "selectors" && (
          <label className="flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={smart}
              onChange={(e) => {
                setSmart(e.target.checked);
                reset();
              }}
              style={{ accentColor: "#1baf7a" }}
            />
            match the export button by meaning
          </label>
        )}
        <button type="button" onClick={go} disabled={running} className="ml-auto rounded-full bg-[#eb6834] px-4 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50">
          {running ? "Running…" : "Run the job"}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[20px] border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line bg-cream/50 px-3 py-2">
            <span className="flex gap-1">
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <i key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              ))}
            </span>
            <span className="truncate rounded-md bg-white px-2 py-0.5 font-mono text-[10.5px] text-ink-2/60">portal.supplier.example/{screen === "login" ? "login" : screen === "home" ? "home" : "orders"}</span>
            {layout === "B" && <span className="ml-auto rounded-full bg-[#fff3ec] px-2 py-0.5 text-[10px] font-semibold text-[#a8461f]">new design</span>}
          </div>
          <div className="relative h-[290px] select-none">
            {mode === "api" ? (
              <div className="absolute inset-0 grid place-items-center p-4">
                {api ? <pre className="max-h-full w-full overflow-auto rounded-xl bg-ink p-3 font-mono text-[10.5px] leading-relaxed text-white/85">{api}</pre> : <p className="text-[12.5px] text-ink-2/50">No browser, no screens: the API answers with data.</p>}
              </div>
            ) : (
              <>
                {screen === "login" && (
                  <>
                    <p className="absolute top-[12%] left-1/2 -translate-x-1/2 text-[15px] font-semibold">Supplier portal</p>
                    {(["user", "pass"] as const).map((t) => (
                      <div key={t} className="absolute w-[56%] -translate-x-1/2 -translate-y-1/2" style={at(t)}>
                        <p className="text-[10px] text-ink-2/55">{L[t]}</p>
                        <div className="h-7 rounded-md border border-line px-2 font-mono text-[11.5px] leading-7">{vals[t]}</div>
                      </div>
                    ))}
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-ink px-4 py-1.5 text-[11.5px] font-semibold text-white" style={at("signin")}>
                      {L.signin}
                    </div>
                  </>
                )}
                {screen !== "login" && (
                  <>
                    {layout === "A" ? (
                      <div className="absolute inset-x-0 top-0 flex h-[18%] items-center gap-5 border-b border-line px-4 text-[11.5px]">
                        <span className="font-semibold">Dashboard</span>
                        <span className="absolute -translate-x-1/2 -translate-y-1/2 font-semibold" style={{ ...at("orders"), color: screen !== "home" ? "#eb6834" : undefined }}>
                          {L.orders}
                        </span>
                        <span className="ml-auto text-ink-2/50">Reports</span>
                      </div>
                    ) : (
                      <div className="absolute inset-y-0 left-0 w-[22%] border-r border-line bg-cream/40 text-[11.5px]">
                        <p className="px-3 pt-4 font-semibold">Dashboard</p>
                        <span className="absolute -translate-x-1/2 -translate-y-1/2 font-semibold" style={{ ...at("orders"), color: screen !== "home" ? "#eb6834" : undefined }}>
                          {L.orders}
                        </span>
                        <p className="absolute top-[60%] px-3 text-ink-2/50">Reports</p>
                      </div>
                    )}
                    {screen === "home" && <p className="absolute top-[50%] left-1/2 -translate-x-1/2 text-[12.5px] text-ink-2/50">Welcome back, ops.bot</p>}
                    {screen !== "home" && (
                      <>
                        <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md border border-ink px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap" style={at("export")}>
                          {L.export}
                        </div>
                        <table className={`absolute top-[36%] text-[11px] ${layout === "A" ? "inset-x-4" : "right-4 left-[26%]"}`}>
                          <tbody>
                            {ORDERS.map((o) => (
                              <tr key={o[0]} className="border-b border-line">
                                {o.map((c) => (
                                  <td key={c} className="py-1 pr-2">
                                    {c}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                    {screen === "done" && (
                      <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[11.5px] text-white">
                        <Download className="h-3.5 w-3.5" /> orders-2026-11-11.csv saved
                      </div>
                    )}
                  </>
                )}
                {miss && <span className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#c8413f]" style={{ left: `${miss[0]}%`, top: `${miss[1]}%` }} />}
                <MousePointer2 className="absolute h-5 w-5 fill-white text-ink transition-all duration-500 ease-out" style={{ left: `${cursor[0]}%`, top: `${cursor[1]}%` }} />
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col rounded-[20px] border border-line bg-white p-3">
          <p className="px-1 text-[12px] font-semibold">{mode === "api" ? "The request" : "The robot's script"}</p>
          <ol className="mt-2 space-y-1">
            {(rows.length ? rows : (mode === "api" ? [{ say: "One request to the portal's API", code: "GET /api/orders?date=2026-11-11" }] : SCRIPT.map((s) => ({ say: s.say, code: mode === "coords" ? `mouse.click(${POS.A[s.target][0]}%, ${POS.A[s.target][1]}%)` : s.code }))).map((r) => ({ state: "todo" as const, ...r }))).map((r, i) => (
              <li key={i} className="rounded-xl px-2 py-1.5" style={{ background: r.state === "fail" ? "#fdf0ee" : r.state === "ok" ? "#eaf8f1" : r.state === "doing" ? "#e7f0fb" : "#fbfaf7" }}>
                <p className="flex items-center gap-1.5 text-[12px] font-semibold">
                  {r.state === "ok" ? <Check className="h-3.5 w-3.5 text-[#1baf7a]" /> : r.state === "fail" ? <X className="h-3.5 w-3.5 text-[#c8413f]" /> : <span className="w-3.5 text-center font-mono text-[10px] text-ink-2/40">{i + 1}</span>}
                  {r.say}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10.5px] text-ink-2/55">{r.code}</p>
                {"note" in r && r.note && <p className={`mt-0.5 text-[11px] leading-snug ${r.state === "fail" ? "text-[#a3302e]" : "text-[#0f6e4c]"}`}>{r.note}</p>}
              </li>
            ))}
          </ol>
          {result && (
            <p className="mt-auto rounded-xl px-3 py-2 text-[12.5px] leading-snug" style={{ background: result.ok ? "#eaf8f1" : "#fdf0ee", color: result.ok ? "#0f6e4c" : "#a3302e" }}>
              <span className="font-semibold">{result.ok ? "Worked" : "Broke"}</span> after about {result.secs} s. {result.text}
            </p>
          )}
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-2/55">Simulated, slowed down so you can follow it. Try each robot with and without the redesign: recorded positions break when anything moves, name-based selectors survive moves but not renames, and the API doesn&apos;t care what the screens look like. That&apos;s why automations use an API whenever one exists.</p>
    </div>
  );
}
