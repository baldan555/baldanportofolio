"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLenis } from "lenis/react";
import { Download, Eye, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/track";

/**
 * "Download CV" opens this picker: the same CV in the format each market expects. The PDFs are built from one source
 * (docs/cv/build.mjs) into public/cv/. Open it from anywhere with openCvPicker().
 * A plain fixed overlay, not a native <dialog>: showModal() puts the dialog in the browser's top layer, above every
 * z-index, so the custom cursor (z-[200], cursor.tsx) would slide underneath it. This one sits at z-[150].
 */
const EVENT = "cv-picker:open";
/** Open the picker; `from` says which button (sent to analytics). */
export const openCvPicker = (from = "button") => {
  track("cv_picker_open", { from });
  window.dispatchEvent(new Event(EVENT));
};

const TEMPLATES = [
  {
    id: "international",
    code: "INTL",
    name: "International",
    what: "The main CV: summary, highlights, every role and project. Works for most applications.",
    meta: "A4 · 2 pages",
    fits: "Global roles, remote work, Asia",
  },
  {
    id: "united-states",
    code: "US",
    name: "United States",
    what: "A one-page résumé: short bullets, US spelling, US Letter size, no references.",
    meta: "Letter · 1 page",
    fits: "Also Canada",
  },
  {
    id: "united-kingdom",
    code: "UK",
    name: "United Kingdom",
    what: "A two-page CV with a personal statement and key skills, UK spelling, references on request.",
    meta: "A4 · 2 pages",
    fits: "Also Ireland, Singapore, Malaysia",
  },
  {
    id: "australia",
    code: "AU",
    name: "Australia",
    what: "A resume with responsibilities and key achievements for each role, key skills grid, referees on request.",
    meta: "A4 · 3 pages",
    fits: "Also New Zealand",
  },
  {
    id: "europass",
    code: "EU",
    name: "Europe (Europass style)",
    what: "Dated timeline, CEFR language grid and digital skills, in the layout used across the EU.",
    meta: "A4 · 3 pages",
    fits: "Most EU countries",
  },
  {
    id: "indonesia",
    code: "ID",
    name: "Indonesia (Bahasa)",
    what: "The main CV in Bahasa Indonesia, for employers in Indonesia.",
    meta: "A4 · 2 pages",
    fits: "Indonesian companies and recruiters",
  },
];

export function CvPicker() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const lenis = useLenis();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const show = () => {
      opener.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);

  // while open: the page behind stays still, Esc closes, Tab stays inside, focus goes in and comes back after
  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>("a[href], button");
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      lenis?.start();
      opener.current?.focus?.();
    };
  }, [open, lenis, close]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cv-picker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-lenis-prevent
          className="fixed inset-0 z-[150] overflow-y-auto overscroll-contain bg-black/45 backdrop-blur-sm"
        >
          <div
            className="flex min-h-full items-center justify-center p-3"
            onClick={(e) => {
              if (e.target === e.currentTarget) close(); // a click outside the panel closes it
            }}
          >
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cv-picker-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-[min(940px,100%)] rounded-[28px] bg-bg text-ink shadow-[0_40px_120px_-30px_rgba(0,0,0,0.45)]"
            >
      <div className="p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Download CV</p>
            <h2 id="cv-picker-title" className="mt-1 text-[1.7rem] leading-tight font-semibold tracking-[-0.03em] sm:text-[2.1rem]">
              Pick the format for where you&apos;re hiring.
            </h2>
            <p className="mt-1.5 max-w-xl text-[14px] text-ink-2/70">Same experience and projects in every version, shaped to each country&apos;s conventions. All are text PDFs that applicant-tracking systems can read.</p>
          </div>
          <button ref={closeBtn} type="button" onClick={close} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white transition hover:border-ink/40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => {
            const href = `/cv/cv-baldanullah-${t.id}.pdf`;
            return (
              <li key={t.id} className="flex flex-col rounded-[22px] border border-line bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 min-w-9 place-items-center rounded-full bg-ink px-2 font-mono text-[11px] font-semibold tracking-wide text-white">{t.code}</span>
                  <div className="min-w-0">
                    <p className="text-[16px] leading-tight font-semibold">{t.name}</p>
                    <p className="font-mono text-[11px] text-muted">{t.meta}</p>
                  </div>
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2/75">{t.what}</p>
                <p className="mt-1 text-[12px] text-ink/45">{t.fits}</p>
                <div className="mt-auto flex gap-2 pt-4">
                  <a href={href} download onClick={() => track("cv_download", { cv_format: t.id, how: "download" })} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-ink/85">
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                  <a href={href} target="_blank" rel="noreferrer" onClick={() => track("cv_download", { cv_format: t.id, how: "preview" })} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] transition hover:border-ink/40">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-[12px] text-ink/45">Hiring in Germany, Japan or the Gulf? Those formats usually ask for a photo and personal details; email me and I&apos;ll send one.</p>
      </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
