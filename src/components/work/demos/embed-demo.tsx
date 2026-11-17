"use client";

import { useState } from "react";

/* Embed Hub's parseEmbed (server.js), ported as is: the server keeps only a clean https URL, never the pasted HTML. */
function parseEmbed(raw: string, allowList: string[] | null): { ok: true; url: string; host: string } | { ok: false; error: string } {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Embed link is required" };
  if (input.length > 4000) return { ok: false, error: "Embed link is too long" };
  let src = input;
  const m = input.match(/<iframe[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  if (m) src = m[1] ?? m[2] ?? "";
  else if (input.includes("<")) return { ok: false, error: "Paste the <iframe> code or the embed link" };
  src = src.replace(/&amp;/g, "&");
  if (/\s/.test(src)) return { ok: false, error: "Embed link must not contain spaces" };
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return { ok: false, error: "Embed link is not a valid URL" };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Embed link must start with https://" };
  if (allowList && !allowList.some((h) => url.hostname === h || url.hostname.endsWith("." + h))) return { ok: false, error: "Embed host not allowed" };
  return { ok: true, url: url.toString(), host: url.hostname };
}

const SAMPLES = [
  { label: "Excel iframe", value: '<iframe width="402" height="346" frameborder="0" scrolling="no" src="https://contoso-my.sharepoint.com/personal/demo/_layouts/15/Doc.aspx?sourcedoc={0000}&amp;action=embedview&amp;wdAllowInteractivity=False"></iframe>' },
  { label: "Single quotes", value: "<iframe src='https://onedrive.live.com/embed?resid=DEMO123&authkey=abc'></iframe>" },
  { label: "Plain http", value: "http://example.com/sheet" },
  { label: "A <div>", value: '<div class="sheet">copied from the page</div>' },
];

export function EmbedDemo() {
  const [value, setValue] = useState(SAMPLES[0].value);
  const [restrict, setRestrict] = useState(false);
  const allow = restrict ? ["sharepoint.com", "onedrive.live.com", "officeapps.live.com"] : null;
  const r = parseEmbed(value, allow);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-[22px] border border-line bg-white p-5">
        <p className="font-mono text-[11px] tracking-[0.14em] text-ink/50 uppercase">Paste the embed code or link</p>
        <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={6} className="mt-3 w-full resize-y rounded-xl border border-line bg-[#f7f7f8] p-3 font-mono text-[12px] leading-relaxed outline-none focus:border-[#6366f1]/50" aria-label="Embed code or link" />
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button key={s.label} type="button" onClick={() => setValue(s.value)} className="rounded-full border border-line px-3 py-1 text-[12.5px] text-ink/70 hover:text-ink">
              {s.label}
            </button>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-[13px] text-ink/70">
          <input type="checkbox" checked={restrict} onChange={(e) => setRestrict(e.target.checked)} className="accent-[#6366f1]" />
          Only allow Microsoft hosts (ALLOWED_EMBED_HOSTS)
        </label>
      </div>
      <div className={`rounded-[22px] p-5 ${r.ok ? "bg-[#111113] text-white" : "border border-[#fecaca] bg-[#fff5f5]"}`}>
        <p className={`font-mono text-[11px] tracking-[0.14em] uppercase ${r.ok ? "text-white/50" : "text-[#b91c1c]"}`}>{r.ok ? "Accepted · saved as" : "Refused"}</p>
        {r.ok ? (
          <>
            <p className="mt-3 text-[13px] text-white/60">
              Link detected: <span className="font-semibold text-white">{r.host}</span>
            </p>
            <p className="mt-3 rounded-xl bg-white/10 p-3 font-mono text-[11.5px] leading-relaxed break-all text-white/85">{r.url}</p>
            <p className="mt-4 text-[12.5px] text-white/55">Viewers get it in a sandboxed iframe; the pasted HTML itself is thrown away.</p>
          </>
        ) : (
          <p className="mt-3 text-[16px] font-semibold text-[#991b1b]">{r.error}</p>
        )}
      </div>
    </div>
  );
}
