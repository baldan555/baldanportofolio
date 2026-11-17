/*
 * "Three ways to ship a product": web app, SaaS and mobile app, each with a small looping SVG/SMIL animation.
 */
const INK = "#0b0b0b";
const ORANGE = "#eb6834";
const GREEN = "#1baf7a";
const BLUE = "#2a78d6";
const PURPLE = "#6250d6";
const LINE = "rgba(11,11,11,0.16)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

function WebArt() {
  return (
    <svg viewBox="0 0 260 150" className="h-auto w-full" aria-hidden>
      <rect x={20} y={14} width={220} height={124} rx={12} fill="#fff" stroke={INK} strokeWidth={1.4} />
      <rect x={20} y={14} width={220} height={22} rx={12} fill="#f1eee8" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={34 + i * 10} cy={25} r={3} fill={["#ff5f57", "#febc2e", "#28c840"][i]} />
      ))}
      <rect x={66} y={19} width={150} height={12} rx={6} fill="#fff" />
      <text x={74} y={28} fontSize={7.5} fontFamily={MONO} fill="rgba(11,11,11,0.6)">
        app.example.com
      </text>
      {[
        [34, 48, 120, 12],
        [34, 68, 192, 6],
        [34, 80, 170, 6],
        [34, 96, 58, 30],
        [100, 96, 58, 30],
        [166, 96, 60, 30],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={3} fill={i === 0 ? INK : i > 2 ? "#e9e3d8" : "#d6d0c4"}>
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${(0.08 * i).toFixed(2)};${(0.08 * i + 0.15).toFixed(2)};0.9;1`} dur="4s" repeatCount="indefinite" />
        </rect>
      ))}
      <g transform="translate(222 25)">
        <path d="M-4,0 a4,4 0 1 1 1.2,2.9" fill="none" stroke={GREEN} strokeWidth={1.6}>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
  );
}

function SaasArt() {
  const tenants = [
    ["A", BLUE],
    ["B", ORANGE],
    ["C", PURPLE],
  ];
  return (
    <svg viewBox="0 0 260 150" className="h-auto w-full" aria-hidden>
      {tenants.map(([t, c], i) => (
        <g key={t}>
          <rect x={16 + i * 84} y={12} width={60} height={30} rx={8} fill="#fff" stroke={c} strokeWidth={1.6} />
          <text x={46 + i * 84} y={31} fontSize={10} textAnchor="middle" fontWeight={800} fill={c}>
            {`Company ${t}`}
          </text>
          <path d={`M${46 + i * 84},42 C${46 + i * 84},64 130,58 130,76`} fill="none" stroke={LINE} strokeWidth={1.4} />
          <circle r={3} fill={c}>
            <animateMotion dur="2.4s" begin={`-${i * 0.8}s`} repeatCount="indefinite" path={`M${46 + i * 84},42 C${46 + i * 84},64 130,58 130,76`} />
          </circle>
        </g>
      ))}
      <rect x={70} y={76} width={120} height={62} rx={10} fill={INK} />
      <text x={130} y={92} fontSize={8.5} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontFamily={MONO}>
        one system, one database
      </text>
      {tenants.map(([t, c], i) => (
        <g key={t}>
          <rect x={82} y={100 + i * 11} width={96} height={8} rx={2} fill={c as string} opacity={0.9} />
          <text x={86} y={106.5 + i * 11} fontSize={6.5} fill="#fff" fontFamily={MONO}>
            {`tenant_id = ${t}`}
          </text>
        </g>
      ))}
      <rect x={196} y={96} width={52} height={20} rx={10} fill="#fff" stroke={GREEN} />
      <text x={222} y={109} fontSize={8} textAnchor="middle" fill={GREEN} fontWeight={800}>
        Pro plan
      </text>
    </svg>
  );
}

function MobileArt() {
  return (
    <svg viewBox="0 0 260 150" className="h-auto w-full" aria-hidden>
      <rect x={96} y={6} width={70} height={138} rx={14} fill="#fff" stroke={INK} strokeWidth={1.6} />
      <rect x={120} y={11} width={22} height={5} rx={2.5} fill={INK} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={104} y={30 + i * 22} width={54} height={16} rx={4} fill="#e9e3d8" />
      ))}
      <rect x={96} y={124} width={70} height={20} rx={0} fill="#f6f3ee" />
      <g>
        <rect x={150} y={18} width={92} height={26} rx={8} fill={INK}>
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.2;0.3;0.8;1" dur="4s" repeatCount="indefinite" />
        </rect>
        <text x={158} y={34} fontSize={8} fill="#fff">
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.2;0.3;0.8;1" dur="4s" repeatCount="indefinite" />
          New: your order is here
        </text>
      </g>
      <g transform="translate(60 92)">
        <path d="M0,-18 a12,12 0 0 1 12,12 c0,9 -12,22 -12,22 c0,0 -12,-13 -12,-22 a12,12 0 0 1 12,-12 z" fill={ORANGE}>
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 -6; 0 0" dur="1.6s" repeatCount="indefinite" />
        </path>
        <circle cx={0} cy={-6} r={4} fill="#fff">
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 -6; 0 0" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <ellipse cx={0} cy={22} rx={12} ry={3} fill="rgba(11,11,11,0.15)" />
      </g>
      <text x={60} y={136} fontSize={8} textAnchor="middle" fontFamily={MONO} fill="rgba(11,11,11,0.6)">
        GPS
      </text>
      <text x={200} y={136} fontSize={8} textAnchor="middle" fontFamily={MONO} fill="rgba(11,11,11,0.6)">
        works offline
      </text>
      <circle cx={200} cy={100} r={14} fill="none" stroke={LINE} strokeWidth={1.4} />
      <path d="M193,100 l5,5 l9,-10" fill="none" stroke={GREEN} strokeWidth={2} />
    </svg>
  );
}

const WAYS = [
  {
    t: "Web app",
    d: "Opens in a browser: nothing to install, works on any device, and everyone gets the new version the moment it ships.",
    meet: "online banking, booking sites, the tools you open in a tab",
    with: ["Next.js", "React", "Vue", "Laravel"],
    Art: WebArt,
  },
  {
    t: "SaaS",
    d: "A web app sold as a subscription. Many companies share one system, and each one sees only its own data, users and plan.",
    meet: "accounting, HR, CRM and project tools paid per month",
    with: ["Accounts & roles", "Tenants", "Billing", "Plans"],
    Art: SaasArt,
  },
  {
    t: "Mobile app",
    d: "Installed from a store. It can use the camera, GPS and notifications, and keep working when the signal drops.",
    meet: "ride-hailing, delivery, chat, field apps",
    with: ["React Native", "Expo", "Flutter", "Kotlin"],
    Art: MobileArt,
  },
];

export function ShipWays() {
  return (
    <section id="ship" className="mx-auto mt-28 max-w-[1240px] scroll-mt-32 px-5 md:px-10">
      <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">Three ways to ship a product</p>
      <h2 className="max-w-3xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">Web, SaaS and mobile, in one minute.</h2>
      <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2/70">They overlap more than the names suggest: most SaaS products are a web app plus mobile apps, sold by subscription, on one backend.</p>
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {WAYS.map(({ t, d, meet, with: tools, Art }, i) => (
          <article key={t} className="group flex flex-col rounded-[24px] border border-line bg-white p-4 transition hover:-translate-y-1 hover:border-ink/30">
            <div className="rounded-[18px] bg-cream/60 p-2">
              <Art />
            </div>
            <p className="mt-4 font-mono text-[11px] text-muted">0{i + 1}</p>
            <h3 className="mt-0.5 text-[1.5rem] leading-tight font-semibold tracking-[-0.02em]">{t}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2/70">{d}</p>
            <p className="mt-3 flex-1 text-[12.5px] text-ink-2/55">
              <span className="font-semibold text-ink/70">You meet it as </span>
              {meet}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tools.map((x) => (
                <span key={x} className="rounded-full bg-cream/70 px-2.5 py-1 text-[11.5px]">
                  {x}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
