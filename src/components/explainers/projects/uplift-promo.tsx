"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import model from "@/data/models/uplift-promo.json";
import { predict, type LogRegModel } from "@/lib/logreg";
import { InsideSection, Picker, Scrolly, type Step } from "../scrolly";

type Arm = "none" | "mens" | "womens";
const ARMS: Arm[] = ["none", "mens", "womens"];
const NAME: Record<Arm, string> = { none: "No e-mail", mens: "Men's e-mail", womens: "Women's e-mail" };
const COLOR: Record<Arm, string> = { none: "#8a8a8a", mens: "#2a78d6", womens: "#eb6834" };
/** Rounded for inline styles, so server HTML and the browser agree (hydration). */
const r2 = (v: number) => Math.round(v * 100) / 100;
const tr = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const pts = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)} pts`;

type Customer = (typeof model.samples)[number];
/** Same inputs as the demo: purchase history on a log scale. */
const chances = (c: Customer) => {
  const input = { recency: c.recency, log_history: Math.log1p(c.history), mens: c.mens, womens: c.womens, newbie: c.newbie, zip_code: c.zip_code, channel: c.channel };
  return Object.fromEntries(ARMS.map((a) => [a, predict(model.models[a] as LogRegModel, input).probability])) as Record<Arm, number>;
};

function Panel({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 10 }}
      transition={tr}
      className={`absolute inset-0 flex flex-col justify-center overflow-hidden px-5 pb-10 sm:px-8 ${on ? "" : "pointer-events-none"}`}
    >
      {children}
    </motion.div>
  );
}

export function Visual({ step, c }: { step: number; c: Customer }) {
  const p = useMemo(() => chances(c), [c]);
  const max = Math.max(...ARMS.map((a) => p[a]), 0.01);
  const totalPicks = model.picks.mens + model.picks.womens + model.picks.negative;

  return (
    <div className="relative min-h-0 flex-1">
      <Panel on={step === 0}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{model.dataset.rows.toLocaleString("en-US")} customers, split at random</p>
        <div className="grid grid-cols-3 gap-3">
          {ARMS.map((a) => (
            <div key={a} className="rounded-2xl bg-white p-3">
              <div className="mb-2 grid grid-cols-10 gap-[3px]">
                {Array.from({ length: 50 }, (_, i) => (
                  <span key={i} className="aspect-square rounded-full" style={{ background: i < Math.round(model.rates[a].visit * 50) ? COLOR[a] : "rgba(11,11,11,0.1)" }} />
                ))}
              </div>
              <p className="text-[12px] font-semibold">{NAME[a]}</p>
              <p className="font-mono text-[12px]">{pct(model.rates[a].visit)} visited</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-2/60">Each dot ≈ 2% of the group. Because the groups were random, the gaps are caused by the e-mails.</p>
      </Panel>

      <Panel on={step === 1}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Customer {c.id}</p>
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          {[
            ["Months since last purchase", String(c.recency)],
            ["Spent last year", `$${c.history.toLocaleString("en-US")}`],
            ["Bought men's items", c.mens ? "yes" : "no"],
            ["Bought women's items", c.womens ? "yes" : "no"],
            ["New customer", c.newbie ? "yes" : "no"],
            ["Area · channel", `${c.zip_code} · ${c.channel}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white px-3 py-2">
              <span className="block font-mono text-[10px] text-muted uppercase">{k}</span>
              {v}
            </div>
          ))}
        </div>
      </Panel>

      <Panel on={step === 2 || step === 3}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Chance of visiting the site, from each group&apos;s own model</p>
        <div className="space-y-3">
          {ARMS.map((a) => (
            <div key={a} className="grid grid-cols-[120px_1fr_64px] items-center gap-2 text-[13px]">
              <span style={{ color: COLOR[a] }} className="font-semibold">
                {NAME[a]}
              </span>
              <div className="h-4 rounded-full bg-ink/[0.06]">
                <motion.div className="h-full rounded-full" initial={false} animate={{ width: `${r2((p[a] / max) * 100)}%` }} style={{ background: COLOR[a] }} transition={tr} />
              </div>
              <span className="text-right font-mono">{pct(p[a])}</span>
            </div>
          ))}
        </div>
        <motion.div initial={false} animate={{ opacity: step === 3 ? 1 : 0 }} transition={tr} className="mt-5 grid grid-cols-2 gap-2">
          {(["mens", "womens"] as const).map((a) => (
            <div key={a} className="rounded-2xl bg-white px-4 py-3">
              <p className="font-mono text-[10.5px] text-muted uppercase">uplift · {NAME[a]}</p>
              <p className="text-[24px] font-semibold" style={{ color: COLOR[a] }}>
                {pts(p[a] - p.none)}
              </p>
            </div>
          ))}
        </motion.div>
      </Panel>

      <Panel on={step === 4}>
        <p className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Best e-mail per customer, over all {totalPicks.toLocaleString("en-US")}</p>
        <div className="flex h-8 overflow-hidden rounded-full">
          {(["mens", "womens"] as const).map((a) => (
            <motion.div
              key={a}
              initial={false}
              animate={{ width: step === 4 ? `${r2((model.picks[a] / totalPicks) * 100)}%` : "0%" }}
              transition={tr}
              style={{ background: COLOR[a] }}
              className="flex items-center justify-center text-[12px] font-semibold text-white"
            >
              {Math.round((model.picks[a] / totalPicks) * 100)}%
            </motion.div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[12px]">
          <span style={{ color: COLOR.mens }}>Men&apos;s e-mail lifts them most</span>
          <span style={{ color: COLOR.womens }}>Women&apos;s e-mail lifts them most</span>
        </div>
        <p className="mt-4 text-[12.5px] text-ink-2/70">
          {model.picks.negative === 0 ? "Nobody is predicted to visit less because of an e-mail." : `${model.picks.negative.toLocaleString("en-US")} customers are better left alone.`}
        </p>
      </Panel>
    </div>
  );
}

export function Inside() {
  const rows = model.samples.slice(0, 5);
  const [pick, setPick] = useState(0);
  const c = rows[pick];
  const p = useMemo(() => chances(c), [c]);

  const steps: Step[] = [
    {
      t: "Start with a fair test",
      d: `A shop e-mailed a random third of ${model.dataset.rows.toLocaleString("en-US")} customers a men's offer, a third a women's offer, and nobody else. Random groups mean any gap in visits is caused by the e-mail.`,
    },
    { t: "One customer", d: "The question isn't “will they visit?” but “will the e-mail change whether they visit?”. Those are different people." },
    {
      t: "Three neurons, one per group",
      d: `Each group gets its own logistic-regression neuron, trained only on that group. For this customer: ${pct(p.none)} without an e-mail, ${pct(p.mens)} with the men's, ${pct(p.womens)} with the women's.`,
    },
    { t: "Uplift is the difference", d: `What the e-mail adds: the e-mailed chance minus the no-e-mail chance. That's a T-learner: two models, then subtract.` },
    {
      t: "Send each person their best e-mail",
      d: "Ranking customers by uplift says who gains most from which e-mail. The finding: the men's e-mail lifts almost everyone, so targeting it barely helps; the women's e-mail is the one worth aiming.",
    },
  ];

  return (
    <InsideSection title="Who does the e-mail change?" line="Not who will buy, but who buys because of the e-mail. Three neurons and one subtraction. Scroll through a real customer.">
      <Scrolly steps={steps}>
        {(step) => (
          <>
            <Picker label="Customer" rows={rows} value={pick} onChange={setPick} tag={(r) => (r.visited ? "visited" : "no visit")} />
            <div className="flex min-h-0 flex-1 flex-col">
              <Visual step={step} c={c} />
            </div>
          </>
        )}
      </Scrolly>
    </InsideSection>
  );
}
