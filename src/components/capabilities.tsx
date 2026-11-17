"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowUpRight, Check, Lock, MapPin, Send } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { capabilities, type Capability } from "@/data/profile";
import { ease, Kicker } from "./motion";

/** Where to see each capability working, on the skill pages. */
const CAP_LINKS: Record<Capability["key"], { href: string; label: string }> = {
  web: { href: "/skills/web-mobile/saas", label: "Try a web app, live" },
  mobile: { href: "/skills/web-mobile/mobile", label: "Open the mobile lab" },
  dashboards: { href: "/skills/analytics/dashboards", label: "Open the live dashboards" },
  automation: { href: "/skills/automation/lab", label: "Run a workflow" },
  data: { href: "/skills/data-engineering/simulator", label: "Break a pipeline, live" },
  ai: { href: "/skills/machine-learning", label: "Try the models" },
};

/**
 * "What I build" — a pinned, scroll-driven deck. Each chapter is one capability;
 * inside a chapter, its "how it works" steps light up one by one as you scroll,
 * and the mockup on the right builds itself in sync.
 */
export function Capabilities() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [pos, setPos] = useState({ chapter: 0, step: 0 });
  const n = capabilities.length;

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const raw = Math.min(n - 0.0001, Math.max(0, p * n));
    const chapter = Math.floor(raw);
    const local = raw - chapter;
    const steps = capabilities[chapter].steps.length;
    // leave a small lead-in so step 1 is readable before step 2 starts
    const step = Math.min(steps - 1, Math.floor(local * (steps + 0.4)));
    setPos((prev) => (prev.chapter === chapter && prev.step === step ? prev : { chapter, step }));
  });

  const c = capabilities[pos.chapter];

  return (
    <section id="build" ref={ref} className="relative" style={{ height: `${n * 140}vh` }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-6 px-5 pt-16 md:grid-cols-[1fr_1.1fr] md:gap-14 md:px-10 md:pt-0">
          {/* ---------- left: words ---------- */}
          <div>
            <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
              <Kicker text="( 02 )  What I build" />
            </p>

            {/* chapter tabs */}
            <div className="mb-6 flex flex-wrap gap-1.5">
              {capabilities.map((cap, i) => (
                <span
                  key={cap.key}
                  className={`relative rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-300 ${
                    i === pos.chapter ? "text-white" : i < pos.chapter ? "text-ink" : "text-ink/35"
                  }`}
                >
                  {i === pos.chapter && (
                    <motion.span layoutId="cap-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                  )}
                  <span className="relative">{cap.tab}</span>
                </span>
              ))}
            </div>

            <div className="relative h-[1.05em] text-[2.8rem] leading-none font-semibold tracking-[-0.05em] sm:text-[4rem] lg:text-[5rem]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h3
                  key={c.key}
                  initial={{ opacity: 0, y: 40, filter: "blur(14px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -40, filter: "blur(14px)" }}
                  transition={{ duration: 0.55, ease }}
                  className="absolute inset-0 whitespace-nowrap"
                >
                  {c.title}
                </motion.h3>
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease, delay: 0.06 }}
              >
                <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-2/75 md:mt-5 md:text-[18px]">{c.line}</p>

                {/* how it works — desktop list */}
                <ol className="mt-7 hidden space-y-1 md:block">
                  {c.steps.map((s, i) => (
                    <li key={s} className="relative flex items-center gap-4 py-2">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-[11px] transition-all duration-500 ${
                          i < pos.step
                            ? "border-ink bg-ink text-white"
                            : i === pos.step
                              ? "border-ink bg-white text-ink shadow-[0_0_0_5px_rgba(11,11,11,0.07)]"
                              : "border-ink/15 text-ink/35"
                        }`}
                      >
                        {i < pos.step ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span
                        className={`text-[16px] transition-all duration-500 ${
                          i === pos.step ? "translate-x-1 font-semibold text-ink" : i < pos.step ? "text-ink/70" : "text-ink/30"
                        }`}
                      >
                        {s}
                      </span>
                    </li>
                  ))}
                </ol>

                {/* how it works — mobile: just the active step */}
                <div className="mt-4 flex items-center gap-3 md:hidden">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-ink font-mono text-[11px] text-white">{pos.step + 1}</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={pos.step}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="text-[15px] font-semibold"
                    >
                      {c.steps[pos.step]}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <div className="mt-6 flex flex-wrap gap-1.5 md:mt-7">
                  {c.kinds.map((t, i) => (
                    <motion.span
                      key={t}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 + i * 0.04, duration: 0.35, ease }}
                      className={`rounded-full border border-ink/10 bg-white px-3 py-1 text-[12.5px] ${i >= 4 ? "hidden sm:inline-block" : ""}`}
                    >
                      {t}
                    </motion.span>
                  ))}
                </div>
                <p className="mt-4 hidden font-hand text-[22px] text-ink-2/70 md:block">built: {c.example}</p>
                <Link href={CAP_LINKS[c.key].href} data-cursor="Open" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-ink px-3.5 py-1.5 text-[13px] font-medium transition hover:bg-ink hover:text-white">
                  {CAP_LINKS[c.key].label}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ---------- right: live mockup ---------- */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] bg-cream md:aspect-[5/4]">
            <div className="absolute inset-0 [background-image:radial-gradient(rgba(0,0,0,0.07)_1px,transparent_1px)] [background-size:20px_20px]" />
            <AnimatePresence mode="wait">
              <motion.div
                key={c.key}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease }}
              >
                <Mock k={c.key} step={pos.step} />
              </motion.div>
            </AnimatePresence>
            {/* chapter progress */}
            <div className="absolute inset-x-6 bottom-5 flex gap-1.5">
              {c.steps.map((_, i) => (
                <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-ink/10">
                  <motion.span className="block h-full origin-left bg-ink" animate={{ scaleX: i <= pos.step ? 1 : 0 }} transition={{ duration: 0.5, ease }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Mockups — each builds up as `step` grows (0..3)                     */
/* ================================================================== */

function Mock({ k, step }: { k: Capability["key"]; step: number }) {
  if (k === "web") return <WebMock step={step} />;
  if (k === "mobile") return <MobileMock step={step} />;
  if (k === "dashboards") return <DashMock step={step} />;
  if (k === "automation") return <AutoMock step={step} />;
  if (k === "data") return <DataMock step={step} />;
  return <AiMock step={step} />;
}

const show = (on: boolean, y = 10) => ({
  initial: false as const,
  animate: on ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y, scale: 0.97 },
  transition: { duration: 0.5, ease },
});

function Window({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_24px_60px_-30px_rgba(0,0,0,0.4)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-ink/[0.06] px-3.5 py-2.5">
        <span className="h-2 w-2 rounded-full bg-ink/15" />
        <span className="h-2 w-2 rounded-full bg-ink/15" />
        <span className="h-2 w-2 rounded-full bg-ink/15" />
        <span className="ml-2 font-mono text-[10.5px] text-ink/45">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ---------- Web apps ---------- */
function WebMock({ step }: { step: number }) {
  const rows = ["Client onboarding", "Monthly orders", "Team schedule", "Support requests"];
  return (
    <div className="absolute inset-0 p-6 pb-12 sm:p-9 sm:pb-14">
      <Window title="app / workspace" className="h-full">
        <div className="flex h-full">
          <div className="w-[26%] border-r border-ink/[0.06] p-3">
            <div className="mb-4 h-3 w-14 rounded bg-ink" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`mb-2 h-2 rounded ${i === 1 ? "w-[80%] bg-ink/40" : "w-[65%] bg-ink/10"}`} />
            ))}
          </div>
          <div className="relative flex-1 p-3.5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-ink/80" />
              <motion.div {...show(step >= 2, -6)} className="flex items-center gap-1.5">
                <span className="flex overflow-hidden rounded-md border border-ink/10 font-mono text-[9.5px]">
                  <motion.span animate={{ backgroundColor: step >= 2 ? "#0b0b0b" : "#ffffff", color: step >= 2 ? "#fff" : "#0b0b0b" }} className="px-1.5 py-0.5">
                    ID
                  </motion.span>
                  <span className="px-1.5 py-0.5">EN</span>
                </span>
                <span className="flex items-center gap-1 rounded-md bg-cream px-1.5 py-0.5 text-[9.5px] font-medium">
                  <Lock className="h-2.5 w-2.5" /> Admin
                </span>
              </motion.div>
            </div>
            <div className="mt-4 space-y-2">
              {rows.map((r, i) => (
                <motion.div
                  key={r}
                  initial={false}
                  animate={step >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
                  transition={{ duration: 0.45, ease, delay: step >= 1 ? i * 0.08 : 0 }}
                  className="flex items-center justify-between rounded-lg border border-ink/[0.07] px-2.5 py-2"
                >
                  <span className="text-[11px] font-medium">{r}</span>
                  <span className="h-1.5 w-10 overflow-hidden rounded-full bg-ink/10">
                    <motion.span className="block h-full bg-ink" initial={false} animate={{ width: step >= 1 ? `${40 + i * 15}%` : "0%" }} transition={{ delay: 0.3 + i * 0.08, duration: 0.6 }} />
                  </span>
                </motion.div>
              ))}
              {step < 1 && (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-8 animate-pulse rounded-lg bg-ink/[0.04]" />
                  ))}
                </div>
              )}
            </div>
            <motion.div {...show(step >= 1)} className="absolute bottom-3 left-3.5 font-mono text-[9.5px] text-ink/45">
              saved · searchable
            </motion.div>
          </div>
        </div>
      </Window>
      <motion.div
        {...show(step >= 3, 16)}
        className="absolute right-4 bottom-12 flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 font-mono text-[11px] text-white shadow-lg sm:right-7 sm:bottom-16"
      >
        <span className="relative flex h-1.5 w-1.5 text-live">
          <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
        </span>
        live · secured
      </motion.div>
    </div>
  );
}

/* ---------- Field app + web console ---------- */
function MobileMock({ step }: { step: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-5 px-5 pb-8">
      <div className="relative h-[80%] max-h-[410px] w-[40%] max-w-[200px] shrink-0 rounded-[30px] border-[6px] border-ink bg-white p-2.5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-ink/80" />
        <p className="text-[10px] font-semibold">Check-in</p>
        <div className="relative mt-1.5 h-[40%] overflow-hidden rounded-xl bg-cream">
          <svg viewBox="0 0 100 80" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <path d="M0 30 H100 M0 58 H100 M30 0 V80 M70 0 V80" stroke="#0b0b0b" strokeOpacity="0.12" strokeWidth="5" />
          </svg>
          <motion.div
            className="absolute top-[22%] left-[44%]"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.2 }}
          >
            <MapPin className="h-6 w-6 fill-ink text-white" strokeWidth={1.5} />
          </motion.div>
          <motion.span
            className="absolute top-[52%] left-[47%] h-3 w-3 rounded-full border border-ink"
            animate={{ scale: [1, 3], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </div>
        <motion.div {...show(step >= 0, 6)} className="mt-2 flex items-center gap-1 rounded-md bg-ink px-1.5 py-1 text-[8.5px] font-medium text-white">
          <Check className="h-2.5 w-2.5" strokeWidth={3} /> GPS verified
        </motion.div>
        <motion.div {...show(step >= 1, 6)} className="mt-2 flex items-center gap-1.5">
          <div className="h-8 w-8 rounded-md bg-ink/15" />
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
              <motion.div className="h-full bg-ink" initial={false} animate={{ width: step >= 1 ? "100%" : "0%" }} transition={{ duration: 1.1, ease }} />
            </div>
            <p className="mt-1 font-mono text-[8px] text-ink/50">{step >= 1 ? "visit synced" : ""}</p>
          </div>
        </motion.div>
        <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl bg-ink py-2 text-center text-[10px] font-semibold text-white">Check in</div>
      </div>

      {/* web console */}
      <div className="relative w-[50%] max-w-[270px]">
        <motion.div {...show(step >= 2, 20)}>
          <Window title="console / dashboard">
            <div className="relative h-32 bg-cream/60">
              {[
                [18, 30],
                [52, 22],
                [70, 62],
                [34, 70],
                [84, 36],
              ].map(([x, y], i) => (
                <motion.span
                  key={i}
                  className="absolute h-2.5 w-2.5 rounded-full bg-ink"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  animate={{ scale: [1, 1.35, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.25 }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-2.5">
              {["visits", "teams", "sites"].map((l) => (
                <div key={l} className="rounded-md bg-cream/70 px-1.5 py-1">
                  <div className="h-1.5 w-6 rounded bg-ink/60" />
                  <p className="mt-1 font-mono text-[8.5px] text-ink/50">{l}</p>
                </div>
              ))}
            </div>
          </Window>
        </motion.div>
        <motion.div {...show(step >= 3, 16)} className="absolute -bottom-10 -left-6 w-[78%] rounded-xl border border-ink/10 bg-white p-2.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)]">
          <p className="font-mono text-[9px] text-ink/45">content · users</p>
          {["Locations", "Announcements", "User roles"].map((r, i) => (
            <div key={r} className="mt-1.5 flex items-center justify-between">
              <span className="text-[10px]">{r}</span>
              <span className={`h-3 w-5 rounded-full p-[2px] ${i === 1 ? "bg-ink/15" : "bg-ink"}`}>
                <span className={`block h-2 w-2 rounded-full bg-white ${i === 1 ? "" : "translate-x-2"}`} />
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- Web dashboards ---------- */
function DashMock({ step }: { step: number }) {
  const bars = [42, 64, 52, 78, 70, 90];
  const tv = step >= 3;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 pb-12 sm:p-9 sm:pb-14">
      <motion.div
        className="relative w-full"
        initial={false}
        animate={{ scale: tv ? 0.86 : 1, y: tv ? -10 : 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <div className={`rounded-[20px] transition-all duration-500 ${tv ? "bg-ink p-2.5" : "p-0"}`}>
          <Window title={step >= 1 ? "dashboard · updated 06:00" : "collecting today's data…"}>
            <div className="grid grid-cols-[1.3fr_1fr] gap-3 p-3.5">
              <div className="rounded-lg border border-ink/[0.07] p-2.5">
                <p className="text-[10px] font-medium text-ink/60">Flow</p>
                <svg viewBox="0 0 200 110" className="mt-1 w-full">
                  {[
                    "M10 20 C 90 20, 110 40, 190 40",
                    "M10 55 C 90 55, 110 30, 190 30",
                    "M10 55 C 90 55, 110 80, 190 80",
                    "M10 90 C 90 90, 110 75, 190 75",
                  ].map((d, i) => (
                    <motion.path
                      key={i}
                      d={d}
                      fill="none"
                      stroke="#0b0b0b"
                      strokeOpacity={0.12 + i * 0.12}
                      strokeWidth={8 + (i % 2) * 6}
                      initial={false}
                      animate={{ pathLength: step >= 2 ? 1 : 0 }}
                      transition={{ duration: 0.9, delay: i * 0.1, ease: "easeInOut" }}
                    />
                  ))}
                </svg>
              </div>
              <div className="flex flex-col rounded-lg border border-ink/[0.07] p-2.5">
                <p className="text-[10px] font-medium text-ink/60">Weekly</p>
                <div className="mt-auto flex h-20 items-end gap-1.5">
                  {bars.map((b, i) => (
                    <motion.div
                      key={i}
                      className={`flex-1 rounded-t ${i === bars.length - 1 ? "bg-ink" : "bg-ink/15"}`}
                      initial={false}
                      animate={{ height: step >= 2 ? `${b}%` : "6%" }}
                      transition={{ duration: 0.6, ease, delay: i * 0.06 }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {step < 2 && (
              <div className="px-3.5 pb-3 font-mono text-[10px] text-ink/45">
                {step === 0 ? "pulling sales, stock and visits…" : "48,210 rows checked and joined ✓"}
              </div>
            )}
          </Window>
        </div>
        {tv && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mx-auto h-6 w-16 bg-ink" style={{ clipPath: "polygon(30% 0,70% 0,100% 100%,0 100%)" }} />
        )}
      </motion.div>
      <motion.p {...show(tv, 6)} className="mt-1 font-mono text-[10.5px] text-ink/55">
        office TV · yesterday&apos;s KPI
      </motion.p>
    </div>
  );
}

/* ---------- Automation ---------- */
function AutoMock({ step }: { step: number }) {
  const tasks = ["Approve request", "Update record", "Download invoice", "Approve request", "Send reminder"];
  return (
    <div className="absolute inset-0 grid grid-cols-[1.2fr_1fr] items-center gap-4 p-6 pb-12 sm:p-9 sm:pb-14">
      <Window title="bot · running">
        <div className="p-3">
          <div className="flex items-center justify-between rounded-lg bg-cream px-2.5 py-2">
            <span className="text-[10.5px] font-medium">orders.xlsx</span>
            <span className="font-mono text-[9.5px] text-ink/50">{step >= 0 ? "loaded" : ""}</span>
          </div>
          <div className="mt-2.5 space-y-1.5">
            {tasks.map((t, i) => {
              const done = step >= 2 || (step === 1 && i < 3);
              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ opacity: step >= 1 ? 1 : 0.35 }}
                  className="flex items-center justify-between rounded-md border border-ink/[0.07] px-2 py-1.5"
                >
                  <span className="text-[10.5px]">
                    {t} <span className="font-mono text-ink/40">#{4810 + i * 7}</span>
                  </span>
                  <motion.span
                    initial={false}
                    animate={{ scale: done ? 1 : 0.6, backgroundColor: done ? "#0b0b0b" : "rgba(11,11,11,0.08)" }}
                    transition={{ delay: step === 1 ? i * 0.25 : 0, type: "spring", stiffness: 400, damping: 20 }}
                    className="grid h-4 w-4 place-items-center rounded-full"
                  >
                    {done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </motion.span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Window>

      <div className="space-y-3">
        <motion.div {...show(step >= 2, 12)} className="rounded-xl border border-ink/10 bg-white p-3 shadow-sm">
          <p className="font-mono text-[9.5px] text-ink/45">email</p>
          <p className="mt-1 text-[11px] font-semibold">Daily report attached</p>
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-cream px-2 py-1 text-[10px]">report.xlsx</div>
        </motion.div>
        <motion.div {...show(step >= 3, 12)} className="ml-auto max-w-[95%] rounded-2xl rounded-tr-sm bg-ink p-3 text-white shadow-lg">
          <p className="text-[11px] leading-snug">All done. Report sent to the team.</p>
          <p className="mt-1 flex items-center justify-end gap-1 font-mono text-[9px] text-white/60">
            <Send className="h-2.5 w-2.5" /> whatsapp ✓✓
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- Data pipelines ---------- */
function DataMock({ step }: { step: number }) {
  const sources = ["Sales app", "Spreadsheets", "Web forms", "Partner files"];
  const fixes = ["Duplicates removed", "Dates in one format", "Gaps flagged"];
  const link = (on: boolean) => (
    <motion.span className="hidden h-px w-5 origin-left bg-ink sm:block" initial={false} animate={{ scaleX: on ? 1 : 0 }} transition={{ duration: 0.5, ease }} />
  );
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-2 p-5 pb-12 sm:gap-3 sm:p-9 sm:pb-14">
      <div className="w-[28%] space-y-1.5">
        <p className="font-mono text-[9px] text-ink/45">sources</p>
        {sources.map((src, i) => (
          <motion.div
            key={src}
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease, delay: i * 0.08 }}
            className="rounded-lg border border-ink/10 bg-white px-2 py-1.5 text-[10px] font-medium shadow-sm"
          >
            {src}
          </motion.div>
        ))}
      </div>
      {link(step >= 1)}
      <motion.div {...show(step >= 1)} className="w-[30%] rounded-xl border border-ink/10 bg-white p-2.5 shadow-sm">
        <p className="font-mono text-[9px] text-ink/45">clean · check</p>
        {fixes.map((f, i) => (
          <motion.p
            key={f}
            initial={false}
            animate={{ opacity: step >= 1 ? 1 : 0 }}
            transition={{ delay: step >= 1 ? 0.2 + i * 0.15 : 0 }}
            className="mt-1.5 flex items-start gap-1 text-[9.5px] leading-tight"
          >
            <Check className="mt-px h-2.5 w-2.5 shrink-0" strokeWidth={3} /> {f}
          </motion.p>
        ))}
      </motion.div>
      {link(step >= 2)}
      <div className="relative w-[32%]">
        <motion.div {...show(step >= 2)}>
          <Window title="table">
            <div className="space-y-1.5 p-2.5">
              {[90, 70, 82, 60, 76].map((w, i) => (
                <div key={i} className="flex gap-1">
                  <span className="h-1.5 w-3 rounded bg-ink/30" />
                  <span className="h-1.5 rounded bg-ink/10" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
            <p className="px-2.5 pb-2 font-mono text-[9px] text-ink/50">1.2M rows · one truth</p>
          </Window>
        </motion.div>
        <motion.div
          {...show(step >= 3, 12)}
          className="absolute right-0 -bottom-9 flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1.5 font-mono text-[9.5px] whitespace-nowrap text-white shadow-lg sm:right-auto sm:left-1/2 sm:-translate-x-1/2"
        >
          <span className="relative flex h-1.5 w-1.5 text-live">
            <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-live" />
          </span>
          on time · 06:00
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- Applied AI ---------- */
function AiMock({ step }: { step: number }) {
  return (
    <div className="absolute inset-0 p-6 pb-12 sm:p-9 sm:pb-14">
      <div className="grid h-full grid-cols-2 grid-rows-2 gap-3">
        {/* clean */}
        <div className="rounded-xl border border-ink/10 bg-white p-3">
          <p className="font-mono text-[9.5px] text-ink/45">1 · learn</p>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="h-3 rounded-sm"
                initial={false}
                animate={{ backgroundColor: [3, 8, 14].includes(i) && step < 1 ? "#0b0b0b" : "rgba(11,11,11,0.1)" }}
                transition={{ duration: 0.4, delay: i * 0.02 }}
              />
            ))}
          </div>
        </div>
        {/* model */}
        <motion.div {...show(step >= 1)} className="rounded-xl border border-ink/10 bg-white p-3">
          <p className="font-mono text-[9.5px] text-ink/45">2 · forecast</p>
          <svg viewBox="0 0 120 60" className="mt-1 w-full">
            <motion.path d="M2 50 C20 44 30 48 45 36 S70 30 80 24" fill="none" stroke="#0b0b0b" strokeWidth="2.2" initial={false} animate={{ pathLength: step >= 1 ? 1 : 0 }} transition={{ duration: 1 }} />
            <motion.path d="M80 24 C92 20 104 12 118 8" fill="none" stroke="#0b0b0b" strokeWidth="2.2" strokeDasharray="4 4" initial={false} animate={{ opacity: step >= 1 ? 1 : 0 }} transition={{ delay: 0.9 }} />
          </svg>
        </motion.div>
        {/* agent */}
        <motion.div {...show(step >= 2)} className="flex flex-col justify-end gap-1.5 rounded-xl border border-ink/10 bg-white p-3">
          <p className="mb-auto font-mono text-[9.5px] text-ink/45">3 · assistant</p>
          <div className="self-end rounded-xl rounded-br-sm bg-cream px-2 py-1.5 text-[10px]">Which outlets need a visit?</div>
          <div className="self-start rounded-xl rounded-bl-sm bg-ink px-2 py-1.5 text-[10px] text-white">I checked this week&apos;s visits. These 12 need one →</div>
        </motion.div>
        {/* ship */}
        <motion.div {...show(step >= 3)} className="flex flex-col items-center justify-center rounded-xl bg-ink p-3 text-white">
          <Check className="h-6 w-6" strokeWidth={2.5} />
          <p className="mt-1.5 text-[12px] font-semibold">In the app</p>
          <p className="font-mono text-[9.5px] text-white/55">where people already work</p>
        </motion.div>
      </div>
    </div>
  );
}
