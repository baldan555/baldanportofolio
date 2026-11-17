import type { Metadata } from "next";
import dup from "@/assets/works/protrack/dup.webp";
import ga from "@/assets/works/protrack/ga.webp";
import geofence from "@/assets/works/protrack/geofence.webp";
import home from "@/assets/works/protrack/home.webp";
import inside from "@/assets/works/protrack/inside.webp";
import mock from "@/assets/works/protrack/mock.webp";
import nearby from "@/assets/works/protrack/nearby.webp";
import { Phone } from "@/components/work/phone";
import { CheatSim } from "@/components/work/protrack/cheat-sim";
import { ACCENTS, Points as PointList, WorkSection } from "@/components/work/sections";

const ACCENT = ACCENTS.magenta;

export const metadata: Metadata = {
  title: "PROTRACK: how it works — Baldanullah",
  description:
    "How PROTRACK proves an Indosat promoter was really at the outlet: a 500 m geofence, camera-only photos, fake-GPS detection, device-signed requests, impossible-travel checks, every SIM card counted once and activation checked. Try to fake a check-in yourself.",
  alternates: { canonical: "/work/protrack" },
};

/* IM3 magenta and gold, from the app's own stylesheet */
const MAGENTA = "#d5006f";

const STEPS = [
  { src: nearby, n: "1", h: "Lock GPS", p: "The server measures the distance to every outlet in the master list in one vectorised pass and returns those within 500 m, nearest first.", alt: "Step 1: GPS locked, outlets within 500 m listed nearest first" },
  { src: geofence, n: "2", h: "Pick the outlet", p: "The distance is checked as soon as an outlet is picked. Too far, and the check-in can't be sent. The server checks again anyway.", alt: "Step 2: the picked outlet is 823 m away, shown in red as outside the radius" },
  { src: inside, n: "3", h: "Photo from the camera", p: "The photo button opens the camera, not the gallery, so an old photo can't be reused. Then the button turns on.", alt: "Step 3: inside the radius at 46 m with a camera photo taken; the send button is active" },
];

const BRIDGES = [
  { h: "Location bridge", p: "Reads Android's own mock-location flag (Location.isMock), which no browser can see. A fake-GPS app is caught on the phone, and the server refuses the request too." },
  { h: "Device key", p: "On first use the phone makes a key pair inside Android Keystore. The private key never leaves the phone; the server keeps only the public key. Every check-in is signed over a one-time nonce and a timestamp, so a request copied off the phone can't be replayed, and a decompiled APK holds no secret." },
  { h: "Camera", p: "Photo fields open the camera directly, so evidence is taken there and then." },
];

const SMALL = [
  { h: "Location only while working", p: "During an open visit the app sends its position every minute, appended to the visit's route for the live map in the admin portal. Logging out of the outlet stops it." },
  { h: "One visit at a time", p: "A quick check rejects a second check-in early; a Firestore transaction guarantees it when two requests race." },
  { h: "Only real promoters sign up", p: "The ID must be on the official SalesHub roster. ID, email and phone number are each unique, phone numbers normalised to 62…" },
  { h: "Rate limits that hold", p: "Login and sign-up attempts are counted in Firestore, not in memory, so the limit is shared by every server instance." },
  { h: "Sessions and passwords", p: "A 12-hour JWT in an httpOnly, secure cookie; passwords hashed with bcrypt; security headers and a strict content policy." },
  { h: "Messy outlet data", p: "About 0.4% of outlets have missing or impossible coordinates. They're marked “location not validated” instead of wrongly rejecting the promoter." },
  { h: "Light photos", p: "Every photo is compressed on the server before it goes to Cloud Storage." },
  { h: "Old app versions", p: "The web app detects an outdated Android shell and tells the promoter where to get the new one." },
];

const GA_STATES = [
  { label: "GA Valid", cls: "bg-[#e3f9ec] text-[#17a34a]", p: "Activated on or after the day it was submitted." },
  { label: "Tidak Valid", cls: "bg-[#fde5ea] text-[#d9284a]", p: "Activated before the promoter claimed it, so someone else sold it." },
  { label: "Proses Validasi", cls: "bg-[#fff2df] text-[#b06a00]", p: "No activation in the data yet." },
];

export default function ProtrackPage() {
  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#fff6da] via-[#fdf2f7] to-[#f9d3e6]" />
        <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-5 pt-14 pb-0 md:px-10 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:items-end">
          <div className="lg:pb-24">
            <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-[#a80058] uppercase">Case study · Indosat · Circle Kalisumapa · 2026</p>
            <h1 className="text-[2.8rem] leading-[0.95] font-semibold tracking-[-0.05em] sm:text-[4.4rem]">
              PROTRACK: proof the promoter was <span style={{ color: MAGENTA }}>really there.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-2/75">
              Promoters sell IM3 and 3 SIM cards at phone shops and are paid per card. PROTRACK is the app they work in: check in at the outlet, record each card sold, see whether it activated. Every step checks where they are and which phone
              they use, because money depends on it.
            </p>
            <div className="mt-7 flex flex-wrap gap-2 font-mono text-[11.5px]">
              {["Built end to end", "FastAPI · Firestore · Cloud Run", "Android (Kotlin)"].map((t) => (
                <span key={t} className="rounded-full border border-[#d5006f]/25 bg-white/70 px-3 py-1 text-[#a80058]">
                  {t}
                </span>
              ))}
            </div>
            <a href="#fake" className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffb000] to-[#d5006f] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(213,0,111,0.7)] transition hover:brightness-105">
              Try to fake a check-in ↓
            </a>
          </div>
          <div className="relative flex items-end justify-center gap-0 pt-4">
            <Phone src={nearby} alt="" className="relative top-10 w-[34%] max-w-[230px] -rotate-[7deg]" />
            <Phone src={home} alt="PROTRACK home: the promoter is checked in at an outlet, with this month's visits and cards sold" className="relative z-10 -mx-[4%] w-[40%] max-w-[270px]" priority />
            <Phone src={ga} alt="" className="relative top-10 w-[34%] max-w-[230px] rotate-[7deg]" />
          </div>
        </div>
      </section>
      <p className="mx-auto max-w-[1240px] px-5 pt-4 font-mono text-[11.5px] text-muted md:px-10">
        Screens: the real app running on demo data. No real promoters, outlets or phone numbers.
      </p>

      <WorkSection accent={ACCENT} id="visit" kicker="01 · A visit" title="Three steps, each one checked." line="A promoter can't move to the next step before the last is done, and nothing can be sent from outside the outlet.">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((s) => (
            <div key={s.n}>
              <Phone src={s.src} alt={s.alt} className="mx-auto w-[72%] max-w-[280px] sm:w-full" />
              <div className="mt-6 flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ffc107] to-[#d5006f] font-mono text-[12px] font-semibold text-white">{s.n}</span>
                <div>
                  <p className="text-[16px] font-semibold">{s.h}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-2/70">{s.p}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </WorkSection>

      <WorkSection accent={ACCENT}
        id="fake"
        kicker="02 · Try to cheat"
        title="Seven checks before a check-in is saved."
        line="Sales fees depend on check-ins, so people will try. Pick your tricks and send: the server runs its checks in this order, and the first one that notices stops the request with the app's real message."
      >
        <CheatSim />
      </WorkSection>

      <WorkSection accent={ACCENT} id="android" kicker="03 · Why an Android app" title="A web app in a native shell, for what browsers can't do." line="The screens are one web app, so updates ship without a new APK. The Android shell adds three bridges the browser doesn't have.">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[minmax(0,300px)_1fr] md:gap-14">
          <Phone src={mock} alt="A fake-GPS app is detected: the app refuses to lock the location" className="mx-auto w-[72%] max-w-[300px] md:w-full" />
          <div>
            <PointList accent={ACCENT} items={BRIDGES} />
            <div className="mt-8 rounded-[22px] border border-line bg-white p-5 font-mono text-[12px] leading-relaxed">
              <p className="text-muted">how a check-in is signed</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-xl bg-[#fdeef4] p-3">
                  <p className="font-semibold text-[#a80058]">Phone</p>
                  <p className="text-ink/70">nonce = random UUID</p>
                  <p className="text-ink/70">ts = now</p>
                  <p className="text-ink/70">sig = sign(nonce:ts) in Keystore</p>
                </div>
                <span className="text-center text-ink/40">→ headers →</span>
                <div className="rounded-xl bg-[#f4f4f1] p-3">
                  <p className="font-semibold">Server</p>
                  <p className="text-ink/70">ts recent? else refuse</p>
                  <p className="text-ink/70">nonce used before? refuse</p>
                  <p className="text-ink/70">verify sig with stored public key</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </WorkSection>

      <WorkSection accent={ACCENT} id="sims" kicker="04 · Every SIM once" title="Scan it, and it can only count once." line="Each SIM card sold is a fee, so the same number must never be claimed twice, by the same promoter or anyone else.">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_minmax(0,300px)] md:gap-14">
          <PointList accent={ACCENT}
            items={[
              { h: "Scan, then locked", p: "Scanning the barcode on the SIM pack fills the number and locks the field; changing it means scanning again. Each record notes whether it was scanned or typed." },
              { h: "Warned while typing", p: "A live check says if the number was ever submitted, by anyone. Only the latest response counts, so a slow reply can't show a stale warning." },
              { h: "One claim, guaranteed", p: "On save the server claims the number in a transaction, one document per number, so two taps at the same moment can't both win. If the photo upload fails after that, the claim is released." },
              { h: "Still at the outlet", p: "Submitting checks the 500 m radius again, so a forgotten logout can't be used to submit from somewhere else." },
            ]}
          />
          <Phone src={dup} alt="Submitting a SIM card: the scanned number is locked and flagged as already submitted, so Save stays off" className="mx-auto w-[72%] max-w-[300px] md:order-none md:w-full" />
        </div>
      </WorkSection>

      <WorkSection accent={ACCENT} id="activation" kicker="05 · Did it activate?" title="Every card checked against the activation data." line="A sale only counts if the card was activated. The monthly activation (GA) files are read straight from the same Cloud Storage bucket the admin portal uses: no copies to drift apart.">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[minmax(0,300px)_1fr] md:gap-14">
          <Phone src={ga} alt="GA Status: each submitted number marked as in process, valid or not valid" className="mx-auto w-[72%] max-w-[300px] md:w-full" />
          <div>
            <p className="text-[15px] leading-relaxed text-ink-2/75">
              The server builds a lookup of each number&apos;s first activation date across all months (cached for half an hour), then compares it with the day the promoter submitted it.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {GA_STATES.map((g) => (
                <div key={g.label} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[12.5px] font-bold ${g.cls}`}>{g.label}</span>
                  <span className="text-[14px] text-ink-2/75">{g.p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </WorkSection>

      <WorkSection accent={ACCENT} id="details" kicker="06 · The small stuff" title="What keeps it honest on a busy day.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SMALL.map((s) => (
            <div key={s.h} className="rounded-[22px] border border-line bg-white p-5">
              <p className="text-[15px] font-semibold tracking-[-0.01em]">{s.h}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2/70">{s.p}</p>
            </div>
          ))}
        </div>
      </WorkSection>

      <WorkSection accent={ACCENT} id="stack" kicker="07 · How it fits together" title="One backend, one bucket, two front doors.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] md:items-stretch">
          <div className="rounded-[22px] bg-gradient-to-br from-[#fff6da] to-[#fce4f0] p-5">
            <p className="font-mono text-[11px] tracking-[0.14em] text-[#a80058] uppercase">Promoter&apos;s phone</p>
            <p className="mt-2 text-[16px] font-semibold">PROTRACK app</p>
            <p className="mt-1 text-[13.5px] text-ink-2/70">Kotlin WebView shell: fused location, Keystore signing, camera. Web app inside: vanilla JS, ZXing barcode scanner.</p>
          </div>
          <span className="hidden self-center text-ink/30 md:block">→</span>
          <div className="rounded-[22px] bg-ink p-5 text-white">
            <p className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">Google Cloud Run</p>
            <p className="mt-2 text-[16px] font-semibold">FastAPI backend</p>
            <p className="mt-1 text-[13.5px] text-white/65">Auth, outlet search, check-in, checkout, live tracking, SIM tagging, GA status. Pandas for the outlet master and GA files.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="rounded-xl bg-white/10 p-2.5">
                <p className="font-semibold text-white">Firestore</p>
                <p className="text-white/55">promoters, check-ins, SIM claims, device keys, nonces, rate limits</p>
              </div>
              <div className="rounded-xl bg-white/10 p-2.5">
                <p className="font-semibold text-white">Cloud Storage</p>
                <p className="text-white/55">photos, outlet master, GA files, activity log</p>
              </div>
            </div>
          </div>
          <span className="hidden self-center text-ink/30 md:block">←</span>
          <div className="rounded-[22px] border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Office</p>
            <p className="mt-2 text-[16px] font-semibold">Admin portal</p>
            <p className="mt-1 text-[13.5px] text-ink-2/70">Live tracking map, access management, GA validation for fee claims, on the same data.</p>
          </div>
        </div>
      </WorkSection>
    </>
  );
}
