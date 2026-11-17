/* Drawn (not screenshot) phones for the three GatherInsight field apps: what each screen does, in the product's blue.
 * Swap for real screenshots when they're available; the page labels these as illustrations. */

const BLUE = "#2088e4";
const DEEP = "#1a5fa8";

export function DrawnPhone({ children, className = "", label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <figure className={className}>
      <div className="aspect-[390/800] overflow-hidden rounded-[30px] border-[6px] border-[#0f1f33] bg-[#f6faff] shadow-[0_30px_60px_-30px_rgba(20,70,140,0.55)]">
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1 font-mono text-[9px] text-[#0f1f33]/60">
          <span>09:41</span>
          <span className="h-3 w-12 rounded-full bg-[#0f1f33]" />
          <span>●●●</span>
        </div>
        <div className="flex h-full flex-col px-3 pb-3">{children}</div>
      </div>
      <figcaption className="mt-3 text-center font-mono text-[11px] text-[#1a5fa8]">{label}</figcaption>
    </figure>
  );
}

function Bar({ w, c = "bg-[#0f1f33]/10" }: { w: string; c?: string }) {
  return <span className={`block h-1.5 rounded-full ${c}`} style={{ width: w }} />;
}

/** Study & Research: the survey list, ready offline, with entries waiting to send. */
export function StudyScreen() {
  return (
    <>
      <p className="mt-2 text-[15px] font-bold tracking-tight text-[#0f1f33]">Input</p>
      <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-[#fff2df] px-2.5 py-1.5 text-[9.5px] font-semibold text-[#9a5b00]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#e08a00]" /> Offline · 3 entries waiting to send
      </div>
      {[
        { t: "Customer satisfaction 2026", d: "12 / 20", p: 60 },
        { t: "Household internet use", d: "7 / 15", p: 46 },
        { t: "Store visit audit", d: "18 / 18", p: 100 },
      ].map((s) => (
        <div key={s.t} className="mt-2 rounded-2xl border border-[#2088e4]/12 bg-white p-2.5">
          <p className="text-[10.5px] font-bold text-[#0f1f33]">{s.t}</p>
          <p className="mt-0.5 text-[8.5px] text-[#1a5fa8]">Ready offline · saved 08:12</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2088e4]/12">
              <span className="block h-full rounded-full" style={{ width: `${s.p}%`, background: BLUE }} />
            </span>
            <span className="font-mono text-[8.5px] text-[#0f1f33]/60">{s.d}</span>
          </div>
        </div>
      ))}
      <div className="mt-2 rounded-2xl border border-[#2088e4]/12 bg-white p-2.5">
        <p className="text-[9.5px] font-semibold text-[#0f1f33]">Consent</p>
        <div className="mt-1.5 space-y-1">
          <Bar w="92%" />
          <Bar w="80%" />
          <Bar w="60%" />
        </div>
        <p className="mt-2 flex items-center gap-1 text-[8.5px] text-[#d9284a]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d9284a]" /> Voice recorded after consent
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-center text-[9px] font-bold">
          <span className="rounded-lg border border-[#0f1f33]/15 py-1.5 text-[#0f1f33]/70">Decline</span>
          <span className="rounded-lg py-1.5 text-white" style={{ background: BLUE }}>Agree</span>
        </div>
      </div>
    </>
  );
}

/** Mobility: the traffic counter, one big tile per vehicle class. */
export function MobilityScreen() {
  const tiles = [
    { k: "MC", n: 412, h: "motorcycle" },
    { k: "LV", n: 156, h: "car, pickup" },
    { k: "HV", n: 21, h: "bus, truck" },
    { k: "UM", n: 9, h: "bicycle, cart" },
  ];
  return (
    <>
      <p className="mt-2 text-[15px] font-bold tracking-tight text-[#0f1f33]">Traffic count</p>
      <p className="text-[9px] text-[#0f1f33]/55">Site JL-07 · 41 m away</p>
      <div className="mt-2 rounded-xl bg-[#0f1f33] px-3 py-2 text-white">
        <p className="font-mono text-[13px] font-bold">02:14:36 <span className="text-white/45">/ 12:00:00</span></p>
        <p className="font-mono text-[8.5px] text-white/60">Interval 9/48 · 06:32 left</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9px] font-bold">
        <span className="rounded-full py-1 text-center text-white" style={{ background: BLUE }}>Direction A · 312</span>
        <span className="rounded-full border border-[#2088e4]/30 py-1 text-center text-[#1a5fa8]">Direction B · 286</span>
      </div>
      <div className="mt-2 grid flex-1 grid-cols-2 gap-1.5">
        {tiles.map((t) => (
          <div key={t.k} className="flex flex-col justify-between rounded-2xl border border-[#2088e4]/15 bg-white p-2">
            <span className="text-[13px] font-extrabold text-[#0f1f33]">{t.k}</span>
            <span className="font-mono text-[18px] leading-none font-bold" style={{ color: DEEP }}>
              {t.n}
            </span>
            <span className="text-[7.5px] text-[#0f1f33]/50">{t.h}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 mb-6 grid grid-cols-2 gap-1.5 text-center text-[9px] font-bold">
        <span className="rounded-lg border border-[#0f1f33]/15 py-1.5 text-[#0f1f33]/70">Undo</span>
        <span className="rounded-lg border border-[#0f1f33]/15 py-1.5 text-[#0f1f33]/70">Pause</span>
      </div>
    </>
  );
}

/** Geo: walking an area boundary on a plan drawn on the phone (no map tiles). */
export function GeoScreen() {
  const ring = "30,150 52,72 118,48 172,70 186,128 150,176 82,182";
  return (
    <>
      <p className="mt-2 text-[15px] font-bold tracking-tight text-[#0f1f33]">Area · Parcel 14</p>
      <p className="text-[9px] text-[#0f1f33]/55">Walking the boundary</p>
      <div className="relative mt-2 rounded-2xl border border-[#2088e4]/15 bg-white">
        <svg viewBox="0 0 210 220" className="block h-auto w-full">
          <rect x="12" y="20" width="186" height="186" rx="8" fill="none" stroke={BLUE} strokeOpacity="0.45" strokeDasharray="5 4" />
          <polygon points={ring} fill={BLUE} fillOpacity="0.12" stroke={BLUE} strokeWidth="2" />
          <line x1="82" y1="182" x2="30" y2="150" stroke={BLUE} strokeWidth="2" strokeDasharray="4 4" />
          {ring.split(" ").map((p) => {
            const [x, y] = p.split(",");
            return <circle key={p} cx={x} cy={y} r="3" fill="#fff" stroke={DEEP} strokeWidth="1.5" />;
          })}
          <circle cx="82" cy="182" r="14" fill={BLUE} fillOpacity="0.15" />
          <circle cx="82" cy="182" r="5" fill={BLUE} stroke="#fff" strokeWidth="2" />
          <line x1="140" y1="200" x2="190" y2="200" stroke="#0f1f33" strokeWidth="1.5" />
          <text x="165" y="196" textAnchor="middle" fontSize="8" fill="#0f1f33" fillOpacity="0.6">
            20 m
          </text>
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {[
          ["2,418 m²", "area"],
          ["23", "corners"],
          ["±4 m", "accuracy"],
          ["96%", "inside zone"],
        ].map(([v, k]) => (
          <div key={k} className="rounded-xl bg-white px-2 py-1.5">
            <p className="font-mono text-[11px] font-bold" style={{ color: DEEP }}>
              {v}
            </p>
            <p className="text-[7.5px] text-[#0f1f33]/50">{k}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-center text-[9px] font-bold">
        <span className="rounded-lg border border-[#0f1f33]/15 py-1.5 text-[#0f1f33]/70">Pause</span>
        <span className="rounded-lg py-1.5 text-white" style={{ background: BLUE }}>Finish</span>
      </div>
    </>
  );
}
