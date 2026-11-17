import type { Metadata } from "next";
import { AreaCheck } from "@/components/work/gatherinsight/area-check";
import { DrawnPhone, GeoScreen, MobilityScreen, StudyScreen } from "@/components/work/gatherinsight/drawn-phones";
import { SyncSim } from "@/components/work/gatherinsight/sync-sim";
import { TallyDemo } from "@/components/work/gatherinsight/tally-demo";
import { ACCENTS, Points, WorkSection } from "@/components/work/sections";

export const metadata: Metadata = {
  title: "GatherInsight field apps: how they work — Baldanullah",
  description:
    "The three GatherInsight field apps (surveys and interviews, traffic counts, geo mapping) work without signal: an offline queue with ids made on the phone, GPS rules the office controls, voice evidence in two-minute pieces, a tap-by-tap traffic counter and GPS geometry measured like the server does. Try the sync queue, the GPS check and the counter.",
  alternates: { canonical: "/work/gatherinsight" },
};

const ACCENT = ACCENTS.blue;
const BLUE = "#2088e4";

const APPS = [
  {
    name: "Study & Research",
    what: "Questionnaires and interviews in the field.",
    points: ["Picks the respondent from the sample frame, quotas or a household draw", "Consent first; voice recorded only after a yes", "Results and refused entries, with the reason, on the phone"],
  },
  {
    name: "Mobility",
    what: "Traffic counts at a site, 12 hours by default.",
    points: ["One big tile per vehicle class, per direction", "Every tap stored as an event, in 15-minute bins", "Pushes the count live to the office every 45 s"],
  },
  {
    name: "Geo",
    what: "Six ways to map: points, lines, areas, samples, inspections, incidents.",
    points: ["Geometry recorded by walking with GPS, cleaned on the phone", "Plans drawn on the phone, so maps work with no signal", "The server measures again; the phone never gets the last word"],
  },
];

const GATES = [
  { h: "Pick the respondent", p: "From the sample frame (main, reserve, declined, unreachable), a crossed quota or a systematic sequence. The GPS check runs before anything starts." },
  { h: "Household draw", p: "When the survey picks one member per house: everyone's birthday goes in, the next birthday wins. Only if the survey needs it." },
  { h: "Screening", p: "The criteria as a checklist. Not eligible? The visit is still recorded, just not counted." },
  { h: "Consent", p: "A no is recorded too. A yes starts the voice recording when the survey asks for one." },
  { h: "The questions", p: "One page per section. Required answers and ranges checked before Next; branching rules pick the next page; answers on skipped pages are dropped before sending." },
  { h: "Review and send", p: "GPS still on? End position taken, the last audio piece queued, then the interview joins the send queue and the phone says Sent, Refused (with the reason) or Saved." },
];

const VOICE = [
  { h: "Only after consent", p: "Recording starts on the consent screen's Agree, never before, and only when the survey has voice notes on." },
  { h: "Two-minute pieces", p: "A new file every two minutes, AAC at 16 kHz mono and 32 kbps: about a quarter of a megabyte a minute. A weak connection only ever has a small file to move." },
  { h: "Each piece on its own", p: "Pieces queue and upload separately, numbered in order. Sending the same piece twice is harmless, and the file is deleted from the phone only after the server confirms it." },
  { h: "Tied to the interview", p: "A session key made at consent links every piece to the interview, so the office can listen next to the answers." },
];

const GEO = [
  { h: "Points", p: "About ten GPS readings in twenty seconds. Readings far from the median are dropped, the rest averaged, weighted by how accurate each one was. Too close to a similar point? The phone asks." },
  { h: "Lines", p: "Walk or drive along a road or drain. Points closer than a few metres are skipped, the line is thinned with Douglas–Peucker, and its ends can snap to existing segments." },
  { h: "Areas", p: "Walk the boundary, stand at each corner, or draw with a reason. Corners that were walked past quickly are recovered from the buffered fixes. Area and overlap are measured on the phone and again on the server, which has the last word." },
  { h: "Samples", p: "Go to a planned point: arrived, moved a little (give a reason), or too far (can't save). Take repeated readings; noise can be averaged as decibel energy rather than as plain numbers." },
  { h: "Inspections", p: "Revisit features in rounds and mark them confirmed, changed, missing or unreachable. A change is a proposal that a person, or the rules, approve." },
  { h: "Incidents", p: "Report with a severity that sets the response time and an affected radius. Never refused by a quality rule: a late report is better than none." },
];

export default function GatherInsightFieldPage() {
  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#f3f9ff] via-[#eaf3fd] to-[#d7e8fb]" />
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {[250, 330, 410].map((x) => (
            <line key={x} x1={x - 160} y1={340} x2={x + 60} y2={-40} stroke="#d3e6fa" strokeWidth={46} strokeLinecap="round" />
          ))}
        </svg>
        <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-5 pt-14 pb-16 md:px-10 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div>
            <p className="mb-5 font-mono text-[12px] tracking-[0.2em] text-[#1a5fa8] uppercase">Case study · GatherInsight · field apps · 2026</p>
            <h1 className="text-[2.8rem] leading-[0.95] font-semibold tracking-[-0.05em] sm:text-[4.4rem]">
              Three field apps that <span style={{ color: BLUE }}>keep working without signal.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-2/75">
              GatherInsight&apos;s web platform plans the research; these phones do the fieldwork. Surveyors interview, count traffic and map places, often far from any signal, and every record comes back with its proof: where, when, and what was
              said.
            </p>
            <div className="mt-7 flex flex-wrap gap-2 font-mono text-[11.5px]">
              {["Expo · React Native", "SQLite offline queue", "Next.js · PostgreSQL backend"].map((t) => (
                <span key={t} className="rounded-full border border-[#2088e4]/30 bg-white/70 px-3 py-1 text-[#1a5fa8]">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#offline" className="inline-flex items-center gap-2 rounded-full bg-[#2088e4] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_4px_0_#98c4f7] transition hover:bg-[#1a78cc]">
                Lose the signal yourself ↓
              </a>
              <a href="https://gatherinsight.baldanproject.my.id/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#2088e4]/35 bg-white/70 px-5 py-3 text-[14px] font-semibold text-[#1a5fa8] transition hover:bg-white">
                The web platform ↗
              </a>
            </div>
          </div>
          {/* phones: a swipeable row at a readable size on small screens, three columns from sm up */}
          <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:items-end sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0">
            <DrawnPhone label="Study & Research" className="w-[210px] shrink-0 snap-center sm:w-auto sm:translate-y-6">
              <StudyScreen />
            </DrawnPhone>
            <DrawnPhone label="Mobility" className="w-[210px] shrink-0 snap-center sm:w-auto">
              <MobilityScreen />
            </DrawnPhone>
            <DrawnPhone label="Geo" className="w-[210px] shrink-0 snap-center sm:w-auto sm:translate-y-6">
              <GeoScreen />
            </DrawnPhone>
          </div>
        </div>
      </section>
      <p className="mx-auto max-w-[1240px] px-5 pt-4 font-mono text-[11.5px] text-muted md:px-10">Phones are drawings of what each app does, made from its code. Real screenshots are coming.</p>

      <WorkSection id="apps" kicker="01 · Three apps" title="One platform, three jobs in the field." line="Separate apps, so each install carries only what its job needs. They share one codebase: the same database layer, sync pattern, GPS code and sign-in." accent={ACCENT}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {APPS.map((a) => (
            <div key={a.name} className="rounded-[24px] border border-[#2088e4]/15 bg-gradient-to-br from-white to-[#f3f9ff] p-6">
              <p className="text-[19px] font-semibold tracking-[-0.02em]">{a.name}</p>
              <p className="mt-1 text-[14px] text-ink-2/65">{a.what}</p>
              <ul className="mt-4 flex flex-col gap-2">
                {a.points.map((p) => (
                  <li key={p} className="flex gap-2 text-[13.5px] leading-snug text-ink-2/80">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: BLUE }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </WorkSection>

      <WorkSection id="interview" kicker="02 · One interview" title="Gate by gate, and only the gates a survey needs." line="Even a visit that goes nowhere (declined, not eligible, nobody home) is recorded, because a research team needs its response rate as much as its answers." accent={ACCENT}>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GATES.map((g, i) => (
            <li key={g.h} className="relative rounded-[22px] border border-line bg-white p-5">
              <span className="grid h-7 w-7 place-items-center rounded-full font-mono text-[12px] font-semibold text-white" style={{ background: BLUE }}>
                {i + 1}
              </span>
              <p className="mt-3 text-[16px] font-semibold">{g.h}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2/70">{g.p}</p>
            </li>
          ))}
        </ol>
      </WorkSection>

      <WorkSection
        id="offline"
        kicker="03 · Offline first"
        title="No signal is the normal case, not the error."
        line="Surveys download ahead of time. A finished interview goes into a queue on the phone with an id the phone made itself, and the queue drains oldest first when the signal returns, and every 30 seconds. Lose the signal, finish a few interviews, then make the server misbehave."
        accent={ACCENT}
      >
        <SyncSim />
      </WorkSection>

      <WorkSection id="gps" kicker="04 · GPS rules" title="The office sets the rules, the phone enforces them." line="Per survey: capture at the interview or continuously while the app is open, required or not, lock the whole app until GPS is on, what happens outside the assignment area, an accuracy limit, how old a fix may be, whether fake GPS is refused. A surveyor can be paused, and the phone picks up new rules within minutes." accent={ACCENT}>
        <AreaCheck />
        <p className="mt-6 max-w-3xl text-[14px] leading-relaxed text-ink-2/70">
          The server judges each interview by the rules the phone had when it started, so changing a rule mid-day flags interviews instead of throwing them away. It also compares the phone&apos;s clock with its own and the start position with the end
          position, and flags what doesn&apos;t add up.
        </p>
      </WorkSection>

      <WorkSection id="voice" kicker="05 · Voice evidence" title="What was actually said, in small pieces." accent={ACCENT}>
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
          <Points items={VOICE} accent={ACCENT} />
          <div className="rounded-[24px] border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">one interview, 5 min 12 s</p>
            <div className="mt-4 flex items-center gap-2 text-[12px]">
              <span className="rounded-full bg-[#e3f9ec] px-2.5 py-1 font-semibold text-[#11733a]">Consent: yes</span>
              <span className="text-ink/30">→</span>
              <span className="text-ink/60">recording</span>
            </div>
            <div className="mt-4 flex gap-1.5">
              {[
                { f: "0000.m4a", w: 40, s: "uploaded" },
                { f: "0001.m4a", w: 40, s: "uploaded" },
                { f: "0002.m4a", w: 20, s: "waiting" },
              ].map((p) => (
                <div key={p.f} style={{ flexBasis: `${p.w}%` }} className={`rounded-xl px-2.5 py-3 ${p.s === "uploaded" ? "bg-[#dbedfb]" : "bg-[#fff2df]"}`}>
                  <p className="font-mono text-[11.5px] font-semibold text-[#0f1f33]">{p.f}</p>
                  <p className={`text-[11px] ${p.s === "uploaded" ? "text-[#1a5fa8]" : "text-[#9a5b00]"}`}>{p.s}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10.5px] text-ink/40">
              <span>0:00</span>
              <span>2:00</span>
              <span>4:00</span>
              <span>5:12</span>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink/55">The last piece is queued at Submit. Leaving the interview or starting another one ends the recording, so audio never runs into the next respondent.</p>
          </div>
        </div>
      </WorkSection>

      <WorkSection id="mobility" kicker="06 · Mobility" title="A traffic count that can't lose a tap." line="Twelve hours at a roadside, one tap per vehicle. Each tap is written to the phone's database before the screen even updates, so a crash or a flat battery loses nothing. Tap a few vehicles, undo one, jump the clock." accent={ACCENT}>
        <TallyDemo />
        <p className="mt-6 max-w-3xl text-[14px] leading-relaxed text-ink-2/70">
          A pause needs a reason (rain, rest, road closed) and paused time isn&apos;t counted as an empty road. Ending a session runs the same form checks as the server, then the server reviews it: distance to the site, how long it was watched, empty
          intervals, the share of undos, and intervals far out of line.
        </p>
      </WorkSection>

      <WorkSection id="geo" kicker="07 · Geo" title="Six ways to map, measured twice." line="Maps on the phone are plans drawn with SVG from the downloaded work pack, not map tiles, so they work in a field with no signal. The geometry code is copied from the server, so the phone shows the warnings the server will raise before anything is sent." accent={ACCENT}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-10">
          <div className="self-start rounded-[24px] border border-line bg-white p-5">
            <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">walking an area: raw → kept → thinned</p>
            <svg viewBox="0 0 380 170" className="mt-3 block h-auto w-full" role="img" aria-label="Raw GPS fixes along a boundary, the points kept, and the thinned ring">
              {/* raw fixes */}
              {[
                [20, 120], [26, 112], [31, 103], [35, 96], [40, 86], [46, 76], [52, 70], [60, 64], [70, 60], [82, 57], [95, 56], [104, 60], [110, 70], [113, 82], [114, 96], [112, 110], [104, 120], [92, 126], [76, 130], [60, 131], [44, 128], [30, 124],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="2.2" fill="#0f1f33" fillOpacity="0.35" />
              ))}
              <text x="20" y="160" fontSize="10" fill="#0f1f33" fillOpacity="0.55">
                every fix
              </text>
              {/* kept */}
              <polygon points="150,120 158,98 166,78 180,64 200,57 222,58 234,72 238,96 232,118 214,128 188,131 165,126" fill="none" stroke={BLUE} strokeWidth="1.5" />
              {[[150, 120], [158, 98], [166, 78], [180, 64], [200, 57], [222, 58], [234, 72], [238, 96], [232, 118], [214, 128], [188, 131], [165, 126]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="2.6" fill="#fff" stroke={BLUE} strokeWidth="1.5" />
              ))}
              <text x="150" y="160" fontSize="10" fill="#0f1f33" fillOpacity="0.55">
                kept, metres apart
              </text>
              {/* thinned */}
              <polygon points="280,120 300,62 352,58 362,104 340,129 300,131" fill={BLUE} fillOpacity="0.12" stroke={BLUE} strokeWidth="2" />
              {[[280, 120], [300, 62], [352, 58], [362, 104], [340, 129], [300, 131]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill={BLUE} />
              ))}
              <text x="280" y="160" fontSize="10" fill="#0f1f33" fillOpacity="0.55">
                thinned
              </text>
            </svg>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink/55">Thinning uses Douglas–Peucker; badly inaccurate fixes are thrown out on the way. A walk in progress is saved every few corners, so closing the app doesn&apos;t lose it.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {GEO.map((g) => (
              <div key={g.h} className="rounded-[20px] border border-line bg-white p-4">
                <p className="text-[15px] font-semibold">{g.h}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2/70">{g.p}</p>
              </div>
            ))}
          </div>
        </div>
      </WorkSection>

      <WorkSection id="engine" kicker="08 · Under the hood" title="Small rules that keep a field team's data honest." accent={ACCENT}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { h: "Edits during upload survive", p: "In the Geo apps every save bumps a revision number. The server's reply only marks a record clean if it's still the revision that was sent." },
            { h: "One pass at a time", p: "Sync never overlaps itself, so the same entry is never sent twice at once and the order holds." },
            { h: "Photos from the camera", p: "No gallery. A photo that can't upload yet waits inside the answer and goes before the interview does." },
            { h: "Signed in, offline", p: "The token sits in the phone's secure store, so a surveyor who signed in once can work all week without signal." },
            { h: "The office can lock the app", p: "If a survey requires it, the whole app shows only “turn on GPS” until location is on, and an office pause releases it." },
            { h: "Too-old apps are told", p: "Every request carries the app version; the server can require an update." },
            { h: "Two languages", p: "Indonesian and English, switchable on the login screen; server messages are translated back on the phone." },
            { h: "Tested like a phone", p: "Tests run the real queue and sync code on in-memory SQLite against a dev server, simulating no signal, lost replies and hangs." },
          ].map((s) => (
            <div key={s.h} className="rounded-[22px] border border-line bg-white p-5">
              <p className="text-[15px] font-semibold tracking-[-0.01em]">{s.h}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2/70">{s.p}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11.5px]">
          {["Expo SDK 57", "React Native 0.86", "expo-router", "expo-sqlite (WAL)", "expo-location", "expo-audio", "expo-secure-store", "NetInfo", "react-native-svg", "Next.js", "Prisma", "PostgreSQL", "Cloud Run", "Cloud Storage"].map((t) => (
            <span key={t} className="rounded-full border border-[#2088e4]/25 bg-white px-3 py-1 text-[#1a5fa8]">
              {t}
            </span>
          ))}
        </div>
      </WorkSection>
    </>
  );
}
