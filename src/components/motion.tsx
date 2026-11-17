"use client";

import { animate, motion, useInView, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const ease = [0.22, 1, 0.36, 1] as const;

/** Fade + rise + un-blur when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.9, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Headline that rises word by word from a mask. */
export function SplitWords({
  text,
  className,
  delay = 0,
  stagger = 0.06,
  serifWords = [],
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  serifWords?: string[];
}) {
  const words = text.split(" ");
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom" aria-hidden>
          <motion.span
            className={`inline-block ${serifWords.includes(w) ? "font-serif font-normal italic tracking-normal" : ""}`}
            variants={{
              hidden: { y: "105%", rotate: 4 },
              show: { y: 0, rotate: 0, transition: { duration: 0.9, ease } },
            }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </motion.span>
  );
}

/** Each word fades from grey to ink as the given progress moves 0 → 1. */
export function ScrollWords({ text, progress, className }: { text: string; progress: MotionValue<number>; className?: string }) {
  const words = text.split(" ");
  return (
    <p className={className}>
      {words.map((w, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        return (
          <Word key={i} progress={progress} range={[start, end]}>
            {w}
          </Word>
        );
      })}
    </p>
  );
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const blur = useTransform(progress, range, [4, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return (
    <span className="relative mr-[0.25em] inline-block">
      <motion.span style={{ opacity, filter }}>{children}</motion.span>
    </span>
  );
}

const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=";

/** Mono label that scrambles into place when it enters the viewport (and on hover). */
export function Scramble({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-5% 0px" });
  const [out, setOut] = useState(text);

  const run = () => {
    let frame = 0;
    const total = 18;
    const id = setInterval(() => {
      frame++;
      setOut(
        text
          .split("")
          .map((c, i) => (c === " " || i < (frame / total) * text.length ? c : glyphs[Math.floor(Math.random() * glyphs.length)]))
          .join(""),
      );
      if (frame >= total) {
        clearInterval(id);
        setOut(text);
      }
    }, 32);
  };

  useEffect(() => {
    if (inView) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <span ref={ref} className={className} onMouseEnter={run}>
      {out}
    </span>
  );
}

/**
 * Home-page section label, e.g. "( 01 )  What I do": the number sits in a small pill and the title gets a highlighter
 * stroke that sweeps in when it scrolls into view. Same mono font as before; `dark` for the black sections.
 */
export function Kicker({ text, dark = false }: { text: string; dark?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-5% 0px" });
  const m = text.match(/^\(\s*(\d+)\s*\)\s*(.*)$/);
  const num = m ? m[1] : null;
  const title = m ? m[2] : text;
  return (
    <span ref={ref} className="inline-flex items-center gap-3">
      {num && (
        <span className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${dark ? "bg-white text-ink" : "bg-ink text-white"}`}>
          <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live text-live" aria-hidden />( {num} )
        </span>
      )}
      <span className={`kicker-mark ${dark ? "kicker-mark-dark text-white" : "text-ink"}`} data-on={inView ? "true" : "false"}>
        <Scramble text={title} />
      </span>
    </span>
  );
}

/** Text that rolls up to a duplicate on hover (used in nav + buttons). */
export function RollText({ children }: { children: string }) {
  return (
    <span className="group/roll relative inline-flex overflow-hidden">
      <span className="transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover/roll:-translate-y-full">{children}</span>
      <span className="absolute inset-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover/roll:translate-y-0">
        {children}
      </span>
    </span>
  );
}

export function CountUp({ to, decimals = 0, suffix = "", duration = 1.8 }: { to: number; decimals?: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => v.toFixed(decimals) + suffix);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration, ease });
    return () => controls.stop();
  }, [inView, mv, to, duration]);

  return <motion.span ref={ref}>{text}</motion.span>;
}
