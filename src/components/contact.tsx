"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { profile } from "@/data/profile";
import { track } from "@/lib/track";
import { openCvPicker } from "./cv-picker";
import { Magnetic } from "./cursor";
import { ease, Kicker, RollText } from "./motion";

export function Contact() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const bigY = useTransform(scrollYProgress, [0, 1], ["30%", "0%"]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    track("contact_click", { method: "copy_email" });
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  const links = [
    { label: "LinkedIn", href: profile.linkedin },
    { label: "GitHub", href: profile.github },
    { label: "WhatsApp", href: profile.whatsapp },
  ];
  const cell =
    "group flex items-center justify-between border-b border-white/10 py-6 pr-4 text-[17px] transition-colors hover:text-white md:border-b-0 md:border-r md:px-5 md:first:pl-0 md:last:border-r-0";

  return (
    <section id="contact" ref={ref} className="relative overflow-hidden rounded-t-[36px] bg-ink text-white">
      <div className="mx-auto max-w-[1240px] px-5 pt-28 md:px-10 md:pt-36">
        <p className="mb-8 font-mono text-[12px] tracking-[0.2em] text-white/45 uppercase">
          <Kicker text="( 09 )  Contact" dark />
        </p>

        <motion.h2
          style={{ y: bigY }}
          className="text-[4.4rem] leading-[0.85] font-semibold tracking-[-0.065em] sm:text-[8rem] lg:text-[11.5rem]"
        >
          {"Let's talk.".split("").map((c, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ y: "60%", opacity: 0, filter: "blur(10px)" }}
              whileInView={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease, delay: i * 0.035 }}
              whileHover={{ y: -14, transition: { type: "spring", stiffness: 400, damping: 12 } }}
            >
              {c === " " ? " " : c}
            </motion.span>
          ))}
        </motion.h2>

        <div className="mt-14 flex flex-wrap items-center gap-4">
          <Magnetic>
            <a
              href={`mailto:${profile.email}`}
              onClick={() => track("contact_click", { method: "email" })}
              className="group inline-flex items-center gap-3 rounded-full bg-white py-4 pr-7 pl-6 text-[16px] font-medium text-ink sm:text-[18px]"
            >
              <RollText>{profile.email}</RollText>
              <ArrowUpRight className="h-5 w-5 transition group-hover:rotate-45" />
            </a>
          </Magnetic>
          <Magnetic>
            <button
              onClick={copy}
              aria-label="Copy email"
              className="relative grid h-[58px] w-[58px] place-items-center rounded-full border border-white/20 transition hover:bg-white/10"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={copied ? "ok" : "cp"} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </motion.span>
              </AnimatePresence>
              <AnimatePresence>
                {copied && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-9 rounded-md bg-white px-2 py-1 font-mono text-[11px] whitespace-nowrap text-ink"
                  >
                    copied!
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Magnetic>
        </div>

        <div className="mt-20 grid grid-cols-2 border-t border-white/10 md:grid-cols-4">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={cell}>
              <span className="text-white/70 transition group-hover:text-white">
                <RollText>{l.label}</RollText>
              </span>
              <ArrowUpRight className="h-4 w-4 text-white/40 transition group-hover:rotate-45 group-hover:text-white" />
            </a>
          ))}
          {/* the CV opens the template picker: one version per country format */}
          <button type="button" onClick={() => openCvPicker("contact")} aria-haspopup="dialog" className={`${cell} text-left`}>
            <span className="text-white/70 transition group-hover:text-white">
              <RollText>CV (6 formats)</RollText>
            </span>
            <ArrowUpRight className="h-4 w-4 text-white/40 transition group-hover:rotate-45 group-hover:text-white" />
          </button>
        </div>

        <footer className="flex flex-col justify-between gap-3 py-10 font-mono text-[12px] text-white/40 sm:flex-row">
          <span>© 2026 {profile.name}</span>
          <LocalTime />
          <a href="#home" className="hover:text-white">
            Back to top ↑
          </a>
        </footer>
      </div>
    </section>
  );
}

const fmtTime = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" }).format(new Date());
const subscribeClock = (cb: () => void) => {
  const id = setInterval(cb, 20_000);
  return () => clearInterval(id);
};

function LocalTime() {
  const t = useSyncExternalStore(subscribeClock, fmtTime, () => null);
  return (
    <span>
      {profile.city} · {t ?? "--:--"} WITA
    </span>
  );
}
