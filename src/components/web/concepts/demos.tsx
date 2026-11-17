"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Demo } from "@/data/web-concepts";

/* Live demos for the concept library. Everything runs in the visitor's browser; nothing is sent anywhere except the
 * public requests each demo names. Timing and randomness live in module-level helpers, outside render. */
const OR = "#eb6834";
const GR = "#1baf7a";
const RD = "#c8413f";
const BL = "#2a78d6";
const btn = "rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-ink/85 disabled:opacity-40";
const ghost = "rounded-full border border-line bg-white px-3.5 py-1.5 text-[12.5px] transition hover:border-ink disabled:opacity-40";
const enc = new TextEncoder();
const clock = () => Date.now();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const statusColor = (s: number) => (s >= 500 || s === 0 ? RD : s >= 400 ? OR : s >= 300 ? BL : GR);
const statusClass = (s: number) => (s === 0 ? "no response: blocked, offline or refused" : s >= 500 ? "5xx · the server failed" : s >= 400 ? "4xx · the request was wrong" : s >= 300 ? "3xx · look somewhere else" : "2xx · success");

/** Colour-coded JSON (keys orange, strings green, numbers blue, true/false/null purple). */
function JsonView({ text }: { text: string }) {
  const parts: { t: string; c?: string }[] = [];
  const re = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ t: text.slice(last, i) });
    const tok = m[0];
    parts.push({ t: tok, c: tok.startsWith('"') ? (m[2] ? "#ffb08f" : "#8fe0b5") : /^(true|false|null)$/.test(tok) ? "#c3b8ff" : "#9cc8ff" });
    last = i + tok.length;
  }
  parts.push({ t: text.slice(last) });
  return (
    <pre className="max-h-56 overflow-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-white/80">
      {parts.map((p, i) => (
        <span key={i} style={p.c ? { color: p.c } : undefined}>
          {p.t}
        </span>
      ))}
    </pre>
  );
}

/** A request flying from the browser to a host and the response coming back. */
function Flight({ phase, req, res, color, host }: { phase: "idle" | "go" | "back" | "done"; req: string; res: string; color: string; host: string }) {
  return (
    <div className="relative h-[72px] rounded-2xl bg-[#fbfaf7] px-3">
      <div className="absolute top-1/2 left-3 flex -translate-y-1/2 items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1.5 text-[11.5px] font-semibold">
        <span className="h-2 w-2 rounded-full bg-ink" /> Your browser
      </div>
      <div className="absolute top-1/2 right-3 flex max-w-[45%] -translate-y-1/2 items-center gap-1.5 rounded-xl bg-ink px-2.5 py-1.5 text-[11.5px] font-semibold text-white">
        <span className="h-2 w-2 shrink-0 rounded-full bg-white" />
        <span className="truncate">{host}</span>
      </div>
      <div className="absolute top-1/2 right-[35%] left-[35%] border-t border-dashed border-ink/20" />
      <AnimatePresence>
        {phase === "go" && (
          <motion.span key="go" initial={{ left: "22%", opacity: 0 }} animate={{ left: "62%", opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: "easeInOut" }} className="absolute top-[14px] -translate-x-1/2 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap text-white" style={{ background: OR }}>
            {req}
          </motion.span>
        )}
        {(phase === "back" || phase === "done") && (
          <motion.span key="back" initial={{ left: "62%", opacity: 0 }} animate={{ left: "22%", opacity: 1 }} transition={{ duration: 0.7, ease: "easeInOut" }} className="absolute bottom-[12px] -translate-x-1/2 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap text-white" style={{ background: color }}>
            {res}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ API explorer */
const PRESETS = [
  { label: "Weather API", url: "https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.85&current=temperature_2m,wind_speed_10m" },
  { label: "Made-up page", url: "/this-page-does-not-exist" },
  { label: "Bad latitude", url: "https://api.open-meteo.com/v1/forecast?latitude=999&longitude=106.85&current=temperature_2m" },
  { label: "npm downloads", url: "https://api.npmjs.org/downloads/point/last-week/react" },
];
/** HTTP/2 sends no reason phrase, so fall back to the standard ones. */
const REASON: Record<number, string> = { 200: "OK", 201: "Created", 204: "No Content", 301: "Moved Permanently", 302: "Found", 304: "Not Modified", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 429: "Too Many Requests", 500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable" };
type Res = { url: string; host: string; path: string; status: number; text: string; ms: number; bytes: number; type: string; headers: [string, string][]; body: string; json: boolean };
async function timedRequest(url: string): Promise<Res> {
  const u = new URL(url, location.href);
  const base = { url, host: u.host, path: `${u.pathname}${u.search}`.slice(0, 40) };
  const t0 = performance.now();
  try {
    const r = await fetch(u.href, { cache: "no-store" });
    const body = await r.text();
    let pretty = body,
      json = false;
    try {
      pretty = JSON.stringify(JSON.parse(body), null, 2);
      json = true;
    } catch {
      pretty = body.replace(/\s+/g, " ").slice(0, 600);
    }
    return { ...base, status: r.status, text: r.statusText || REASON[r.status] || "", ms: Math.round(performance.now() - t0), bytes: enc.encode(body).length, type: r.headers.get("content-type") ?? "", headers: [...r.headers.entries()], body: pretty.slice(0, 1800), json };
  } catch {
    return { ...base, status: 0, text: "no response", ms: Math.round(performance.now() - t0), bytes: 0, type: "", headers: [], body: "", json: false };
  }
}
function ApiExplorer() {
  const [url, setUrl] = useState(PRESETS[0].url);
  const [phase, setPhase] = useState<"idle" | "go" | "back" | "done">("idle");
  const [res, setRes] = useState<Res | null>(null);
  const [tab, setTab] = useState<"body" | "headers">("body");
  const [history, setHistory] = useState<Res[]>([]);
  const send = async (target = url) => {
    setPhase("go");
    const [r] = await Promise.all([timedRequest(target), new Promise((ok) => setTimeout(ok, 700))]);
    setRes(r);
    setPhase("back");
    setHistory((h) => [r, ...h.filter((x) => x.url !== r.url)].slice(0, 6));
    setTimeout(() => setPhase("done"), 700);
  };
  const host = (() => {
    try {
      return new URL(url, "https://this.site").host;
    } catch {
      return "?";
    }
  })();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={ghost}
            disabled={phase === "go"}
            onClick={() => {
              setUrl(p.url);
              send(p.url);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-1.5 rounded-full border border-line bg-white p-1 pl-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <span className="rounded-full px-2 py-1 font-mono text-[11px] font-bold text-white" style={{ background: GR }}>
          GET
        </span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} aria-label="URL" className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] outline-none" />
        <button type="submit" className={btn} disabled={phase === "go"}>
          Send
        </button>
      </form>
      <Flight phase={phase} req={`GET ${res && phase !== "go" ? res.path : new URL(url, "https://x.y").pathname}`.slice(0, 26)} res={res ? `${res.status || "—"} ${res.text}`.slice(0, 22) : ""} color={res ? statusColor(res.status) : GR} host={host} />
      {res && phase !== "go" && (
        <div className="rounded-2xl border border-line bg-white p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[2.2rem] leading-none font-semibold tracking-[-0.04em] tabular-nums" style={{ color: statusColor(res.status) }}>
                {res.status || "—"} <span className="text-[1rem] tracking-normal">{res.text}</span>
              </p>
              <p className="mt-1 text-[12px] text-ink-2/60">{statusClass(res.status)}</p>
            </div>
            <div className="flex gap-3 font-mono text-[11px] text-ink-2/65">
              <span>{res.ms} ms</span>
              <span>{res.bytes.toLocaleString("en-US")} B</span>
              <span>{res.type.split(";")[0] || "—"}</span>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            {(["body", "headers"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-[12px] ${tab === t ? "bg-ink text-white" : "text-ink/60 hover:bg-ink/5"}`}>
                {t === "body" ? "Body" : `Headers (${res.headers.length})`}
              </button>
            ))}
          </div>
          <div className="mt-2">
            {tab === "body" ? (
              res.json ? (
                <JsonView text={res.body} />
              ) : (
                <pre className="max-h-40 overflow-auto rounded-xl bg-ink p-3 font-mono text-[11px] whitespace-pre-wrap text-white/75">{res.body || "(no body)"}</pre>
              )
            ) : (
              <div className="max-h-48 overflow-auto rounded-xl bg-cream/60 p-2 font-mono text-[11px]">
                {res.headers.length ? (
                  res.headers.map(([k, v]) => (
                    <p key={k} className="break-all">
                      <span className="text-[#b4532a]">{k}</span>: {v}
                    </p>
                  ))
                ) : (
                  <p className="text-ink-2/55">No headers this page may read.</p>
                )}
                <p className="mt-1.5 font-sans text-[10.5px] text-ink-2/50">For other sites, browsers only expose a few safe headers unless the server allows more.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {history.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-ink-2/50">History</span>
          {history.map((h) => (
            <button
              key={h.url}
              type="button"
              onClick={() => {
                setRes(h);
                setUrl(h.url);
                setPhase("done");
              }}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 font-mono"
            >
              <b style={{ color: statusColor(h.status) }}>{h.status || "—"}</b> {h.host}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ CORS lab */
type CorsCase = { url: string; label: string; note?: string };
const CORS_CASES: CorsCase[] = [
  { url: "https://api.npmjs.org/downloads/point/last-week/react", label: "npm registry", note: "sends Access-Control-Allow-Origin: *" },
  { url: "https://example.com/", label: "example.com", note: "sends no Access-Control-Allow-Origin" },
];
async function tryRead(url: string) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    const t = await r.text();
    return { ok: true, status: r.status, bytes: enc.encode(t).length };
  } catch {
    return { ok: false, status: 0, bytes: 0 };
  }
}
function CorsLab() {
  const [url, setUrl] = useState(CORS_CASES[0].url);
  const [stage, setStage] = useState(0); // 0 idle, 1 to browser, 2 to server, 3 back to browser, 4 decided
  const [out, setOut] = useState<{ ok: boolean; status: number; bytes: number } | null>(null);
  const run = async (u: string) => {
    setUrl(u);
    setOut(null);
    setStage(1);
    const wait = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
    const res = tryRead(u);
    await wait(500);
    setStage(2);
    await wait(600);
    setStage(3);
    const r = await res;
    await wait(500);
    setOut(r);
    setStage(4);
  };
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return "?";
    }
  })();
  const known = CORS_CASES.find((c) => c.url === url);
  const lanes = [
    { k: "page", t: "This page", sub: "your script" },
    { k: "br", t: "Browser", sub: "checks the answer" },
    { k: "srv", t: host, sub: "the other site" },
  ];
  const pos = ["8%", "50%", "92%"];
  const packet = stage === 1 ? { from: 0, to: 1, c: OR, t: "fetch()" } : stage === 2 ? { from: 1, to: 2, c: OR, t: "GET + Origin" } : stage === 3 ? { from: 2, to: 1, c: BL, t: "response" } : null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {CORS_CASES.map((c) => (
          <button key={c.url} type="button" onClick={() => run(c.url)} className={ghost} disabled={stage > 0 && stage < 4}>
            Read {c.label}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-1.5 rounded-full border border-line bg-white p-1 pl-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(url);
        }}
      >
        <input value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Any URL" className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] outline-none" />
        <button type="submit" className={btn} disabled={stage > 0 && stage < 4}>
          Try any URL
        </button>
      </form>
      <div className="relative h-[120px] rounded-2xl bg-[#fbfaf7]">
        {lanes.map((l, i) => (
          <div key={l.k} className="absolute top-3 -translate-x-1/2 text-center" style={{ left: pos[i] === "8%" ? "16%" : pos[i] === "92%" ? "84%" : "50%" }}>
            <div className={`mx-auto max-w-[120px] truncate rounded-xl px-2.5 py-1.5 text-[11.5px] font-semibold ${i === 1 ? "bg-ink text-white" : "border border-line bg-white"}`}>{l.t}</div>
            <p className="mt-0.5 text-[10px] text-ink-2/50">{l.sub}</p>
          </div>
        ))}
        <div className="absolute top-[68px] right-[16%] left-[16%] border-t border-dashed border-ink/20" />
        <AnimatePresence>
          {packet && (
            <motion.span
              key={stage}
              initial={{ left: ["16%", "50%", "84%"][packet.from] }}
              animate={{ left: ["16%", "50%", "84%"][packet.to] }}
              transition={{ duration: 0.55, ease: "easeInOut" }}
              className="absolute top-[60px] -translate-x-1/2 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap text-white"
              style={{ background: packet.c }}
            >
              {packet.t}
            </motion.span>
          )}
        </AnimatePresence>
        {stage === 4 && out && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-[54px] left-[33%] -translate-x-1/2 rounded-full px-3 py-1 text-[11.5px] font-bold text-white" style={{ background: out.ok ? GR : RD }}>
            {out.ok ? "✓ handed to the page" : "✗ blocked by the browser"}
          </motion.div>
        )}
        <p className="absolute right-3 bottom-2 left-3 text-center text-[11px] text-ink-2/60">
          {stage === 0 ? "Pick a site: the request really goes out." : stage < 4 ? "…" : out?.ok ? `Allowed: status ${out.status}, ${out.bytes.toLocaleString("en-US")} bytes readable${known?.note ? ` (the server ${known.note})` : ""}.` : `Blocked: the browser only says “failed to fetch”${known?.note ? `; the server ${known.note}` : "; either the server sends no Allow-Origin header, or it couldn't be reached"}.`}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ JWT lab */
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64json = (o: object) => b64url(enc.encode(JSON.stringify(o)));
const SECRET = "demo-secret-on-the-server";
async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}
const HEADER = { alg: "HS256", typ: "JWT" };
type Claims = { name: string; role: string; tenant: string; expired: boolean };
const START: Claims = { name: "Rina", role: "staff", tenant: "acme", expired: false };
function JwtLab() {
  const [now, setNow] = useState(0);
  const [claims, setClaims] = useState<Claims>(START);
  const [sig, setSig] = useState("");
  const [expected, setExpected] = useState("");
  const [nonce, setNonce] = useState(0);
  const payload = { sub: "user_42", name: claims.name, role: claims.role, tenant: claims.tenant, iat: now, exp: claims.expired ? now - 300 : now + 3600 };
  const h = b64json(HEADER),
    p = b64json(payload);
  const supported = typeof window === "undefined" || !!globalThis.crypto?.subtle;
  useEffect(() => {
    const id = window.setTimeout(() => setNow(Math.floor(clock() / 1000)), 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!now || !globalThis.crypto?.subtle) return;
    let alive = true;
    hmac(`${h}.${p}`).then((x) => {
      if (!alive) return;
      setExpected(x);
      setSig((s) => s || x);
    });
    return () => {
      alive = false;
    };
  }, [h, p, now, nonce]);
  if (!supported) return <p className="text-[12.5px] text-ink-2/60">Web Crypto is not available here (it needs HTTPS).</p>;
  const sigOk = !!sig && sig === expected;
  const fresh = !claims.expired;
  const accepted = sigOk && fresh;
  const set = (k: keyof Claims, v: string | boolean) => setClaims((c) => ({ ...c, [k]: v }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-[11px] font-semibold text-ink-2/60">
          name
          <input value={claims.name} onChange={(e) => set("name", e.target.value)} className="mt-0.5 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12.5px] font-normal text-ink outline-none focus:border-ink" />
        </label>
        <label className="text-[11px] font-semibold text-ink-2/60">
          role
          <select value={claims.role} onChange={(e) => set("role", e.target.value)} className="mt-0.5 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12.5px] font-normal text-ink">
            {["viewer", "staff", "manager", "admin"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold text-ink-2/60">
          tenant
          <select value={claims.tenant} onChange={(e) => set("tenant", e.target.value)} className="mt-0.5 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12.5px] font-normal text-ink">
            {["acme", "globex"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold text-ink-2/60">
          expires
          <select value={claims.expired ? "past" : "future"} onChange={(e) => set("expired", e.target.value === "past")} className="mt-0.5 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12.5px] font-normal text-ink">
            <option value="future">in 1 hour</option>
            <option value="past">5 min ago</option>
          </select>
        </label>
      </div>
      <div className="rounded-2xl bg-ink p-3">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[9.5px] tracking-[0.1em] uppercase">
          <span className="text-[#ff9b72]">header</span>
          <span className="text-[#a99cf0]">payload (anyone can read)</span>
          <span className="text-[#7ee2b0]">signature (needs the secret)</span>
        </div>
        <p className="mt-1.5 font-mono text-[11px] leading-relaxed break-all">
          <span className="text-[#ff9b72]">{h}</span>
          <span className="text-white/40">.</span>
          <span className="text-[#a99cf0]">{p}</span>
          <span className="text-white/40">.</span>
          <span className="text-[#7ee2b0]">{sig || "…"}</span>
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <pre className="rounded-xl bg-cream/70 p-2.5 font-mono text-[10.5px] text-[#5b47c9]">{JSON.stringify(payload, null, 1)}</pre>
        <div className="relative overflow-hidden rounded-xl border border-line bg-white p-2.5">
          <p className="text-[11px] font-semibold">What the server checks</p>
          <p className="mt-1.5 text-[11.5px]" style={{ color: sigOk ? GR : RD }}>
            {sigOk ? "✓" : "✗"} signature matches the content
          </p>
          <p className="text-[11.5px]" style={{ color: fresh ? GR : RD }}>
            {fresh ? "✓" : "✗"} not expired
          </p>
          <p className="mt-1.5 font-mono text-[9.5px] leading-snug break-all text-ink-2/55">
            expected {expected.slice(0, 20)}…
            <br />
            received{" "}
            {sig
              .slice(0, 20)
              .split("")
              .map((ch, i) => (
                <span key={i} style={{ color: ch === expected[i] ? undefined : RD, fontWeight: ch === expected[i] ? undefined : 700 }}>
                  {ch}
                </span>
              ))}
            …
          </p>
          <motion.span
            key={`${accepted}`}
            initial={{ scale: 1.6, opacity: 0, rotate: -14 }}
            animate={{ scale: 1, opacity: 1, rotate: -10 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="absolute right-2 bottom-2 rounded-md border-2 px-2 py-0.5 font-mono text-[11px] font-black tracking-[0.12em]"
            style={{ color: accepted ? GR : RD, borderColor: accepted ? GR : RD }}
          >
            {accepted ? "ACCEPTED" : "REJECTED"}
          </motion.span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setSig(expected)} disabled={sigOk || !expected} className={btn}>
          Sign it as the server
        </button>
        <button
          type="button"
          onClick={() => {
            setClaims(START);
            setSig("");
            setNonce((x) => x + 1);
          }}
          className={ghost}
        >
          Reset
        </button>
      </div>
      <p className="text-[11.5px] text-ink-2/55">Change any claim and the old signature no longer matches: that&apos;s why a user can read their token but can&apos;t promote themselves. Signed with HMAC-SHA-256 in your browser, using a demo secret.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ hash lab */
const sha = (t: string) => crypto.subtle.digest("SHA-256", enc.encode(t)).then(hex);
const randomSalt = () => hex(crypto.getRandomValues(new Uint8Array(8)).buffer);
/** How many SHA-256 hashes this browser does per second (about one second of work, in batches). */
async function benchmark() {
  const t0 = performance.now();
  let done = 0;
  while (performance.now() - t0 < 900) {
    await Promise.all(Array.from({ length: 500 }, (_, i) => crypto.subtle.digest("SHA-256", enc.encode(`guess-${done + i}`))));
    done += 500;
  }
  return done / ((performance.now() - t0) / 1000);
}
const twin = (s: string) => (s ? s.slice(0, -1) + String.fromCharCode(s.charCodeAt(s.length - 1) + 1) : "a");
const dur = (sec: number) => (sec < 1 ? "instantly" : sec < 60 ? `${sec.toFixed(0)} seconds` : sec < 3600 ? `${(sec / 60).toFixed(0)} minutes` : sec < 86400 ? `${(sec / 3600).toFixed(1)} hours` : sec < 86400 * 365 ? `${(sec / 86400).toFixed(0)} days` : sec < 86400 * 365 * 1e6 ? `${(sec / 86400 / 365).toLocaleString("en-US", { maximumFractionDigits: 0 })} years` : "longer than the universe has existed");
function HashLab() {
  const [pw, setPw] = useState("rahasia123");
  const [salts, setSalts] = useState<string[]>([]);
  const [hs, setHs] = useState({ a: "", b: "", s1: "", s2: "" });
  const [rate, setRate] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSalts([randomSalt(), randomSalt()]), 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!globalThis.crypto?.subtle || salts.length < 2) return;
    let alive = true;
    Promise.all([sha(pw), sha(twin(pw)), sha(salts[0] + pw), sha(salts[1] + pw)]).then(([a, b, s1, s2]) => alive && setHs({ a, b, s1, s2 }));
    return () => {
      alive = false;
    };
  }, [pw, salts]);
  const diff = hs.a && hs.b ? [...hs.a].filter((c, i) => c !== hs.b[i]).length : 0;
  const run = async () => {
    setBusy(true);
    setRate(await benchmark());
    setBusy(false);
  };
  const SPACES = [
    ["4-digit PIN", 1e4],
    ["6-digit PIN", 1e6],
    ["8 lowercase letters", 26 ** 8],
    ["8 letters + digits", 62 ** 8],
    ["12 letters + digits", 62 ** 12],
  ] as const;
  return (
    <div className="space-y-3">
      <label className="block text-[12px] font-semibold">
        A password (stays in your browser)
        <input value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 font-mono text-[13px] font-normal outline-none focus:border-ink" />
      </label>
      <div className="rounded-2xl border border-line bg-white p-3">
        <p className="text-[12px] font-semibold">
          Change one letter, change everything <span className="font-normal text-ink-2/55">· {diff} of 64 characters differ</span>
        </p>
        {[
          [pw, hs.a, false],
          [twin(pw), hs.b, true],
        ].map(([label, h, mark], k) => (
          <div key={k} className="mt-2">
            <p className="font-mono text-[11px] text-ink-2/60">{label as string}</p>
            <p className="font-mono text-[11px] break-all">
              {(h as string).split("").map((c, i) => (
                <span key={i} style={mark && c !== hs.a[i] ? { color: OR, fontWeight: 700 } : undefined}>
                  {c}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-white p-3">
        <p className="text-[12px] font-semibold">Same password, two users, two salts</p>
        {[
          [salts[0], hs.s1, "Rina"],
          [salts[1], hs.s2, "Budi"],
        ].map(([s, h, who]) => (
          <p key={who} className="mt-1.5 font-mono text-[10.5px] break-all">
            <span className="font-sans font-semibold text-ink">{who}</span> <span className="text-[#5b47c9]">salt {s}</span> → {(h as string) || "…"}
          </p>
        ))}
        <p className="mt-1.5 text-[11px] text-ink-2/55">A leaked database can&apos;t reveal who shares a password, and precomputed tables are useless.</p>
      </div>
      <div className="rounded-2xl bg-ink p-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-semibold">How fast can your browser guess?</p>
          <button type="button" onClick={run} disabled={busy} className="rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-ink disabled:opacity-50">
            {busy ? "Measuring…" : rate ? "Measure again" : "Run the speed test"}
          </button>
        </div>
        {rate && (
          <>
            <p className="mt-2 text-[1.6rem] leading-none font-semibold tabular-nums">
              {Math.round(rate).toLocaleString("en-US")} <span className="text-[12px] font-normal text-white/60">SHA-256 guesses per second, one browser tab</span>
            </p>
            <div className="mt-2 space-y-1">
              {SPACES.map(([label, combos]) => (
                <div key={label} className="grid grid-cols-[9.5rem_1fr] gap-2 text-[11.5px]">
                  <span className="text-white/60">{label}</span>
                  <span className="font-mono">{dur(combos / rate)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-white/50">Real attackers use GPUs that are far faster. That&apos;s why passwords use bcrypt or Argon2: deliberately slow, so every guess costs real time.</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ rate limiter (simulated token bucket) */
const CAP = 5;
const WINDOW = 15000;
function RateLab() {
  const [tokens, setTokens] = useState(CAP);
  const [events, setEvents] = useState<{ t: number; ok: boolean }[]>([]);
  const [t, setT] = useState(0);
  const tokRef = useRef(CAP);
  const spam = useRef<number | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      tokRef.current = Math.min(CAP, tokRef.current + 0.1);
      setTokens(tokRef.current);
      setT(clock());
    }, 100);
    return () => {
      window.clearInterval(id);
      if (spam.current) window.clearInterval(spam.current);
    };
  }, []);
  const send = (k = 1) => {
    const now = clock();
    const out: { t: number; ok: boolean }[] = [];
    for (let i = 0; i < k; i++) {
      const ok = tokRef.current >= 1;
      if (ok) tokRef.current -= 1;
      out.push({ t: now + i * 8, ok });
    }
    setTokens(tokRef.current);
    setEvents((e) => [...e.filter((x) => now - x.t < WINDOW), ...out]);
  };
  const startSpam = () => {
    if (spam.current) return;
    send();
    spam.current = window.setInterval(() => send(), 120);
  };
  const stopSpam = () => {
    if (spam.current) window.clearInterval(spam.current);
    spam.current = null;
  };
  const shown = events.filter((e) => t - e.t < WINDOW);
  const okN = shown.filter((e) => e.ok).length;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="rounded-2xl bg-[#fbfaf7] p-2">
          <svg viewBox="0 0 100 110" className="h-auto w-full" aria-label={`${Math.floor(tokens)} tokens`}>
            <path d="M14,18 L22,100 Q50,108 78,100 L86,18" fill="none" stroke="#0b0b0b" strokeWidth={2.5} strokeLinejoin="round" />
            <ellipse cx={50} cy={18} rx={36} ry={6} fill="none" stroke="#0b0b0b" strokeWidth={2} />
            {Array.from({ length: CAP }, (_, i) => {
              const full = i < Math.floor(tokens);
              const part = i === Math.floor(tokens) ? tokens % 1 : 0;
              return <motion.circle key={i} cx={50} initial={false} animate={{ cy: 88 - i * 15, r: full ? 6.5 : part * 6.5, opacity: full ? 1 : part > 0 ? 0.35 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} fill={GR} />;
            })}
            <text x={50} y={8} fontSize={8} textAnchor="middle" fill="#0b0b0b" fontFamily="ui-monospace, monospace">
              +1 token / s
            </text>
          </svg>
          <p className="text-center font-mono text-[11px]">{Math.floor(tokens)} / 5</p>
        </div>
        <div className="flex flex-col justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => send()} className={btn}>
              Send 1
            </button>
            <button type="button" onClick={() => send(8)} className={ghost}>
              Burst of 8
            </button>
            <button type="button" onPointerDown={startSpam} onPointerUp={stopSpam} onPointerLeave={stopSpam} className={ghost} style={{ borderColor: OR, color: OR }}>
              Hold to spam
            </button>
          </div>
          <div className="relative h-14 overflow-hidden rounded-xl bg-[#fbfaf7]">
            {shown.map((e, i) => (
              <span key={`${e.t}-${i}`} className="absolute bottom-2 h-8 w-[3px] rounded-full" style={{ left: `${Math.min(99, ((WINDOW - (t - e.t)) / WINDOW) * 100)}%`, background: e.ok ? GR : RD }} />
            ))}
            <span className="absolute top-1 left-2 font-mono text-[9.5px] text-ink-2/45">last 15 s</span>
            <span className="absolute top-1 right-2 font-mono text-[9.5px] text-ink-2/45">now</span>
          </div>
          <p className="font-mono text-[11.5px]">
            <span style={{ color: GR }}>{okN} × 200</span> · <span style={{ color: RD }}>{shown.length - okN} × 429</span>
          </p>
        </div>
      </div>
      <p className="text-[11.5px] text-ink-2/55">A token bucket, the most common limiter: bursts are fine until the bucket is empty, then the steady refill rate decides. Simulated in your browser; no requests are sent.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ index lab */
const ROWS = 200_000;
type Found = { target: number; idx: number; scan: number; scanMs: number; bin: number; binMs: number; ranges: [number, number][] };
function makeIds() {
  const a = new Int32Array(ROWS);
  for (let i = 0; i < ROWS; i++) a[i] = 1000 + i * 3;
  return a;
}
function findOne(a: Int32Array): Found {
  const idx = Math.floor(Math.random() * a.length);
  const target = a[idx];
  let t0 = performance.now();
  let scan = 0;
  for (let i = 0; i < a.length; i++) {
    scan++;
    if (a[i] === target) break;
  }
  const scanMs = performance.now() - t0;
  t0 = performance.now();
  let lo = 0,
    hi = a.length - 1,
    bin = 0;
  const ranges: [number, number][] = [];
  while (lo <= hi) {
    bin++;
    ranges.push([lo, hi]);
    const mid = (lo + hi) >> 1;
    if (a[mid] === target) break;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return { target, idx, scan, scanMs, bin, binMs: performance.now() - t0, ranges };
}
function averages(a: Int32Array, runs: number) {
  let scan = 0,
    bin = 0;
  for (let k = 0; k < runs; k++) {
    const f = findOne(a);
    scan += f.scan;
    bin += f.bin;
  }
  return { scan: scan / runs, bin: bin / runs, runs };
}
function IndexLab() {
  const ids = useRef<Int32Array | null>(null);
  const [r, setR] = useState<Found | null>(null);
  const [shown, setShown] = useState(0);
  const [avg, setAvg] = useState<{ scan: number; bin: number; runs: number } | null>(null);
  useEffect(() => {
    if (!r || shown >= r.ranges.length) return;
    const id = window.setTimeout(() => setShown((x) => x + 1), 220);
    return () => window.clearTimeout(id);
  }, [r, shown]);
  const run = () => {
    if (!ids.current) ids.current = makeIds();
    setR(findOne(ids.current));
    setShown(0);
  };
  const runMany = () => {
    if (!ids.current) ids.current = makeIds();
    setAvg(averages(ids.current, 20));
  };
  const cur = r && shown > 0 ? r.ranges[Math.min(shown, r.ranges.length) - 1] : null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={run} className={btn}>
          {r ? "Find another id" : `Find one id among ${ROWS.toLocaleString("en-US")}`}
        </button>
        <button type="button" onClick={runMany} className={ghost}>
          Average of 20 searches
        </button>
      </div>
      {r && (
        <div className="space-y-2 rounded-2xl border border-line bg-white p-3">
          <p className="font-mono text-[11px] text-ink-2/60">looking for id {r.target.toLocaleString("en-US")} (row {r.idx.toLocaleString("en-US")})</p>
          <div>
            <p className="text-[11.5px] font-semibold" style={{ color: RD }}>
              Full scan: {r.scan.toLocaleString("en-US")} rows read · {r.scanMs.toFixed(2)} ms
            </p>
            <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-cream">
              <motion.div key={`scan-${r.target}`} className="h-full rounded-full" style={{ background: RD }} initial={{ width: 0 }} animate={{ width: `${(r.scan / ROWS) * 100}%` }} transition={{ duration: Math.max(0.4, (r.scan / ROWS) * 3), ease: "linear" }} />
            </div>
          </div>
          <div>
            <p className="text-[11.5px] font-semibold" style={{ color: GR }}>
              Index (binary search): step {Math.min(shown, r.bin)} of {r.bin} · {r.binMs.toFixed(3)} ms
            </p>
            <div className="relative mt-1 h-3 rounded-full bg-cream">
              {cur && <motion.div className="absolute top-0 h-full rounded-full" style={{ background: GR }} initial={false} animate={{ left: `${(cur[0] / ROWS) * 100}%`, width: `${Math.max(0.6, ((cur[1] - cur[0] + 1) / ROWS) * 100)}%` }} transition={{ duration: 0.18 }} />}
              <span className="absolute top-[-3px] h-[18px] w-[2px] bg-ink" style={{ left: `${(r.idx / ROWS) * 100}%` }} />
            </div>
            <p className="mt-1 font-mono text-[10.5px] text-ink-2/55">{cur ? `rows ${cur[0].toLocaleString("en-US")} – ${cur[1].toLocaleString("en-US")} still possible` : ""}</p>
          </div>
        </div>
      )}
      {avg && (
        <p className="rounded-xl bg-cream/70 px-3 py-2 text-[12px]">
          Over {avg.runs} random searches: a full scan read <b>{Math.round(avg.scan).toLocaleString("en-US")}</b> rows on average; the index needed <b>{avg.bin.toFixed(1)}</b> steps (log₂ of 200,000 ≈ 17.6).
        </p>
      )}
      <p className="text-[11.5px] text-ink-2/55">Counted and timed in your browser. A database B-tree uses the same halving idea, with wider nodes stored on disk.</p>
    </div>
  );
}

export function ConceptDemo({ kind }: { kind: Demo }) {
  if (kind === "status") return <ApiExplorer />;
  if (kind === "cors") return <CorsLab />;
  if (kind === "jwt") return <JwtLab />;
  if (kind === "hash") return <HashLab />;
  if (kind === "rate") return <RateLab />;
  return <IndexLab />;
}
