"use client";

import { Check, LoaderCircle, RotateCcw, Send, X } from "lucide-react";
import { useRef, useState } from "react";

/** The server's checks, in the order routers/checkin.py runs them before a check-in is saved. */
const CHECKS = [
  { key: "device", title: "Signed by a registered phone", how: "a key in Android Keystore signs a one-time nonce and timestamp" },
  { key: "photo", title: "It's a photo", how: "jpeg, png or webp, taken with the camera" },
  { key: "mock", title: "GPS isn't faked", how: "Android's own mock-location flag" },
  { key: "travel", title: "The trip is possible", how: "distance and time since the last check-in" },
  { key: "open", title: "No other visit open", how: "one outlet at a time" },
  { key: "outlet", title: "The outlet exists", how: "looked up in the outlet master list" },
  { key: "fence", title: "Within 500 m of the outlet", how: "great-circle distance to the outlet's coordinates" },
] as const;
type CheckKey = (typeof CHECKS)[number]["key"];

/** Ways to cheat, each caught by one check; messages are the app's own (Indonesian), with a translation. */
const TRICKS: { key: string; label: string; fails: CheckKey; status: number; en: string; id: string }[] = [
  { key: "laptop", label: "Send it from a laptop with curl", fails: "device", status: 403, en: "Outlet login only works from the official Android app.", id: "Login outlet cuma bisa dilakukan lewat aplikasi Android resmi." },
  { key: "replay", label: "Replay a request captured earlier", fails: "device", status: 403, en: "Request rejected (replay detected).", id: "Request ditolak (terdeteksi diulang)." },
  { key: "pdf", label: "Upload a PDF instead of a photo", fails: "photo", status: 400, en: "The file must be a camera photo (jpeg/png/webp).", id: "File harus berupa foto (jpeg/png/webp) hasil kamera." },
  { key: "fake", label: "Turn on a fake-GPS app", fails: "mock", status: 400, en: "GPS detected as fake (mock location). Turn off the fake-GPS app first.", id: "Lokasi GPS terdeteksi palsu (mock location) - matikan aplikasi/fitur fake GPS sebelum lanjut." },
  { key: "jump", label: "Last check-in was 600 km away, 20 min ago", fails: "travel", status: 400, en: "Location doesn't add up: 600 km from your last check-in in 20 minutes (1,800 km/h). Check your GPS.", id: "Lokasi tidak masuk akal — jarak 600km dari check-in terakhir Anda dalam 20 menit (tersirat kecepatan 1800 km/jam). Periksa GPS Anda." },
  { key: "open", label: "Still logged in at another outlet", fails: "open", status: 409, en: "You're still logged in at “Mitra Cell 88”. Log out there first.", id: "Anda masih login di outlet \"Mitra Cell 88\" - logout outlet dulu sebelum login outlet baru." },
  { key: "code", label: "Make up an outlet code", fails: "outlet", status: 404, en: "Outlet not found in the master data.", id: "Outlet tidak ditemukan di master data." },
  { key: "far", label: "Stand 820 m from the outlet", fails: "fence", status: 400, en: "You're 820 m from the outlet, beyond the 500 m allowed. The check-in can't be sent.", id: "Lokasi Anda 820m dari outlet - melebihi radius 500m yang diizinkan. Login outlet tidak bisa dikirim." },
];

type Run = { at: number; failed: (typeof TRICKS)[number] | null; done: boolean } | null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function CheatSim() {
  const [picked, setPicked] = useState<string[]>(["fake"]);
  const [run, setRun] = useState<Run>(null);
  const runId = useRef(0);

  const toggle = (k: string) => {
    setRun(null);
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  };

  const send = async () => {
    const id = ++runId.current;
    const tricks = TRICKS.filter((t) => picked.includes(t.key));
    for (let i = 0; i < CHECKS.length; i++) {
      setRun({ at: i, failed: null, done: false });
      await sleep(380);
      if (runId.current !== id) return; // a newer run started
      const caught = tricks.find((t) => t.fails === CHECKS[i].key);
      if (caught) {
        setRun({ at: i, failed: caught, done: true });
        return;
      }
    }
    setRun({ at: CHECKS.length, failed: null, done: true });
  };

  const state = (i: number) => {
    if (!run) return "idle";
    if (i < run.at) return "pass";
    if (i === run.at) return run.failed ? "fail" : run.done ? "pass" : "checking";
    return "idle";
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[26px] border border-[#d5006f]/15 bg-gradient-to-br from-[#fffaf0] to-[#fdeef4] p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-[#a80058] uppercase">Pick your tricks</p>
        <div className="mt-4 flex flex-col gap-2">
          {TRICKS.map((t) => {
            const on = picked.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => toggle(t.key)}
                aria-pressed={on}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-[14px] transition ${on ? "border-[#d5006f] bg-white font-medium text-ink shadow-sm" : "border-[#d5006f]/15 bg-white/50 text-ink/70 hover:bg-white"}`}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? "border-[#d5006f] bg-[#d5006f] text-white" : "border-ink/20"}`}>
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={send}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffb000] to-[#d5006f] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(213,0,111,0.7)] transition hover:brightness-105"
          >
            <Send className="h-4 w-4" /> Send check-in
          </button>
          <button
            type="button"
            onClick={() => {
              runId.current++;
              setRun(null);
              setPicked([]);
            }}
            aria-label="Clear"
            className="grid h-12 w-12 place-items-center rounded-full border border-ink/15 bg-white text-ink/60 transition hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-[12.5px] text-ink/50">{picked.length ? `${picked.length} trick${picked.length > 1 ? "s" : ""} on. The first check that notices one stops the request.` : "No tricks: an honest check-in."}</p>
      </div>

      <div className="rounded-[26px] border border-line bg-white p-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Server · POST /checkin</p>
        <ol className="mt-4 flex flex-col">
          {CHECKS.map((c, i) => {
            const s = state(i);
            return (
              <li key={c.key} className="relative flex gap-3 pb-4 last:pb-0">
                {i < CHECKS.length - 1 && <span className={`absolute top-7 bottom-0 left-[13px] w-px ${s === "pass" ? "bg-live" : "bg-line"}`} />}
                <span
                  className={`relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-[11px] transition ${
                    s === "pass" ? "border-live bg-live text-white" : s === "fail" ? "border-[#d9284a] bg-[#d9284a] text-white" : s === "checking" ? "border-[#d5006f] text-[#d5006f]" : "border-line text-ink/40"
                  }`}
                >
                  {s === "pass" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s === "fail" ? <X className="h-3.5 w-3.5" strokeWidth={3} /> : s === "checking" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className={`text-[14.5px] font-semibold ${s === "idle" && run ? "text-ink/35" : ""}`}>{c.title}</p>
                  <p className="text-[12.5px] text-ink/50">{c.how}</p>
                  {s === "fail" && run?.failed && (
                    <div className="mt-2 rounded-xl bg-[#fde5ea] px-3 py-2">
                      <p className="text-[13px] font-medium text-[#b0173a]">{run.failed.status} · {run.failed.en}</p>
                      <p className="mt-1 font-mono text-[11px] leading-snug text-[#b0173a]/70">“{run.failed.id}”</p>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div aria-live="polite">
          {run?.done && !run.failed && (
            <div className="mt-4 rounded-xl bg-[#e3f9ec] px-4 py-3 text-[13.5px] text-[#11733a]">
              <span className="font-semibold">Saved.</span> Photo compressed and stored, visit written in one transaction (which checks again that no other visit opened meanwhile), live location on until logout.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
