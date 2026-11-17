"use client";

import { Check, ChevronDown, Copy, Download } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { CodeDoc, CodeStep } from "@/lib/code-docs";
import { SectionTitle } from "./sections";

/* ------------------------------------------------------------------ tiny syntax highlighter (no extra dependency) */

const PY_KW = new Set("def return if elif else for in while import from as with try except finally raise class lambda None True False and or not is yield pass break continue global nonlocal assert del print".split(" "));
const TS_KW = new Set("const let var function return if else for of in while import from export type interface new class extends async await try catch finally throw typeof instanceof null undefined true false break continue switch case default as keyof readonly".split(" "));
const TOKEN = {
  python: /("""[\s\S]*?"""|'''[\s\S]*?'''|[rfbu]*"(?:\\.|[^"\\\n])*"|[rfbu]*'(?:\\.|[^'\\\n])*'|#[^\n]*|\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b|\b[A-Za-z_]\w*\b)/g,
  ts: /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g,
};
const C = { comment: "#8a8a85", string: "#1a7f55", keyword: "#6250d6", number: "#c2410c", fn: "#2a78d6" };

function highlight(code: string, lang: "python" | "ts"): ReactNode[] {
  const kw = lang === "python" ? PY_KW : TS_KW;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN[lang])) {
    const t = m[0];
    const at = m.index!;
    if (at > last) out.push(code.slice(last, at));
    let color: string | undefined;
    if (t.startsWith("#") || t.startsWith("//") || t.startsWith("/*")) color = C.comment;
    else if (/^[rfbu]*["'`]/.test(t) && !/^[rfbu]+$/.test(t)) color = C.string;
    else if (/^\d/.test(t)) color = C.number;
    else if (kw.has(t)) color = C.keyword;
    else if (code[at + t.length] === "(") color = C.fn;
    out.push(color ? <span key={at} style={{ color, fontStyle: color === C.comment ? "italic" : undefined }}>{t}</span> : t);
    last = at + t.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

/* ------------------------------------------------------------------ copy */

function useCopy() {
  const [done, setDone] = useState<string | null>(null);
  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement("textarea"), { value: text });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(id);
    setTimeout(() => setDone((d) => (d === id ? null : d)), 1600);
  };
  return { done, copy };
}

function CopyButton({ id, text, label, dark }: { id: string; text: string; label: string; dark?: boolean }) {
  const { done, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(id, text)}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${dark ? "bg-ink text-white hover:opacity-90" : "border border-ink/10 bg-white text-ink/75 hover:border-ink/30 hover:text-ink"}`}
    >
      {done === id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done === id ? "Copied" : label}
    </button>
  );
}

const PREVIEW_LINES = 16;

function CodeBlock({ code, lang, file, line, id }: { code: string; lang: "python" | "ts"; file: string; line: number; id: string }) {
  const lines = code.split("\n");
  const long = lines.length > PREVIEW_LINES + 4;
  const [open, setOpen] = useState(!long);
  const shown = open ? code : lines.slice(0, PREVIEW_LINES).join("\n");
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-[#fbfaf7]">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <p className="truncate font-mono text-[11px] text-muted">
          {file}:{line} · {lines.length} lines
        </p>
        <CopyButton id={id} text={code} label="Copy" />
      </div>
      <div className="relative">
        <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-[1.6] text-ink">
          <code>{highlight(shown, lang)}</code>
        </pre>
        {long && !open && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#fbfaf7] to-transparent" />}
      </div>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-center gap-1 border-t border-line py-1.5 text-[12px] text-ink/60 hover:text-ink">
          <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
          {open ? "Show less" : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}

function Steps({ steps, offset, prefix }: { steps: CodeStep[]; offset: number; prefix: string }) {
  return (
    <ol className="space-y-5">
      {steps.map((s, i) => (
        <li key={`${prefix}-${i}`} className="grid gap-3 md:grid-cols-[260px_1fr] md:gap-6">
          <div className="flex gap-3 md:block">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-mono text-[12px] text-white">{offset + i + 1}</span>
            <div className="md:mt-3">
              <p className="text-[15px] leading-snug font-semibold">{s.title}</p>
              {s.why && <p className="mt-1 text-[13px] leading-relaxed text-ink-2/70">{s.why}</p>}
            </div>
          </div>
          <CodeBlock code={s.code} lang={s.lang} file={s.file} line={s.line} id={`${prefix}-${i}`} />
        </li>
      ))}
    </ol>
  );
}

export function CodeWalkthrough({ doc, dataSource }: { doc: CodeDoc; dataSource?: string }) {
  const download = () => {
    const url = URL.createObjectURL(new Blob([doc.script], { type: "text/x-python" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${doc.fn}.py` });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section id="code" className="mx-auto mt-24 max-w-[1240px] scroll-mt-32 px-5 md:px-10">
      <SectionTitle
        kicker="Build notes"
        title="How it's built, step by step."
        line={
          doc.steps.length
            ? "The real code behind this page, taken from the repository when the site is built and split at each step of the training run. Copy any step, or the whole script with its imports and helpers."
            : "The real code behind this demo, taken from the repository when the site is built. Copy any piece."
        }
      />
      {doc.script && (
        <div className="mb-8 flex flex-col gap-3 rounded-2xl bg-ink p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.16em] text-white/50 uppercase">Run it yourself</p>
            <p className="mt-1 text-[14.5px]">
              <span className="font-mono">{doc.fn}()</span> from <span className="font-mono">{doc.file}</span>
              {doc.helpers.length > 0 && <span className="text-white/60"> + {doc.helpers.length} helper{doc.helpers.length > 1 ? "s" : ""} ({doc.helpers.join(", ")})</span>}
            </p>
            <p className="mt-1 font-mono text-[12px] break-all text-white/60">
              {doc.pip} · data in ml/data/raw/{dataSource ? " · " : ""}
              {dataSource && (
                <a href={dataSource} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
                  dataset source
                </a>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={download} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium hover:bg-white/20">
              <Download className="h-3.5 w-3.5" /> {doc.fn}.py
            </button>
            <WhiteCopy text={doc.script} />
          </div>
        </div>
      )}

      {doc.steps.length > 0 && (
        <>
          <p className="mb-4 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Training · Python</p>
          <Steps steps={doc.steps} offset={0} prefix="py" />
        </>
      )}
      {doc.browser.length > 0 && (
        <>
          <p className="mt-10 mb-4 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">In your browser · TypeScript</p>
          <Steps steps={doc.browser} offset={doc.steps.length} prefix="ts" />
        </>
      )}
      {doc.extra.map((x) => (
        <details key={x.file} className="group mt-8 rounded-2xl border border-line bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4">
            <span>
              <span className="text-[14.5px] font-semibold">Data download script</span>
              <span className="ml-2 font-mono text-[12px] text-muted">{x.file}</span>
            </span>
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5">
            <CodeBlock code={x.code} lang="python" file={x.file} line={1} id={`extra-${x.file}`} />
          </div>
        </details>
      ))}
    </section>
  );
}

function WhiteCopy({ text }: { text: string }) {
  const { done, copy } = useCopy();
  return (
    <button type="button" onClick={() => copy("script", text)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:opacity-90">
      {done === "script" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done === "script" ? "Copied" : "Copy runnable script"}
    </button>
  );
}
