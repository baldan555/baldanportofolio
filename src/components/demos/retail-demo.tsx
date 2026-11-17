"use client";

import { pc } from "./controls";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import model from "@/data/models/product-recommender.json";

export type BasketSample = (typeof model.samples)[number];

const C = model.catalog;
/** Per product: [neighbour index, times bought together, cosine similarity] — top 20, exactly as evaluated. */
const NB = model.neighbors as [number, number, number][][];
const TRAIN = model.split.train_baskets;
const S1 = "#2a78d6";
const S2 = "#eb6834";
const MAX_BASKET = 10;

export const gbp = (v: number) => `£${v.toFixed(2)}`;

/** `because` = the basket item with the strongest single link to this product. */
type Rec = { j: number; score: number; because: number; together: number; best: number };

/** Score every product by summing its similarity to each basket item; ties go to the more popular product. */
export function rankAll(basket: number[]): Rec[] {
  const acc = new Map<number, Rec>();
  for (const i of basket)
    for (const [j, co, s] of NB[i]) {
      const cur = acc.get(j);
      if (!cur) acc.set(j, { j, score: s, because: i, together: co, best: s });
      else {
        cur.score += s;
        if (s > cur.best) Object.assign(cur, { because: i, together: co, best: s });
      }
    }
  const inBasket = new Set(basket);
  return [...acc.values()].filter((r) => !inBasket.has(r.j)).sort((a, b) => b.score - a.score || C[b.j].baskets - C[a.j].baskets || a.j - b.j);
}

const popular = C.map((_, j) => j).sort((a, b) => C[b].baskets - C[a].baskets || a - b);

/** Basket builder: add products, get "bought together" suggestions. A `preset` loads a real test basket with one item hidden. */
export function RetailDemo({ preset }: { preset?: BasketSample | null }) {
  const [basket, setBasket] = useState<number[]>(preset ? preset.given : [popular[0]]);
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<number | null>(null);

  const ranked = useMemo(() => rankAll(basket), [basket]);
  const top = basket.length ? ranked.slice(0, 5) : popular.slice(0, 5).map((j) => ({ j, score: 0, because: -1, together: 0, best: 0 }));
  const hidden = preset?.hidden ?? null;
  const hiddenRank = hidden === null ? null : basket.includes(hidden) ? 0 : ranked.findIndex((r) => r.j === hidden) + 1 || null;
  const maxScore = Math.max(...top.map((r) => r.score), 1e-9);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? popular.filter((j) => C[j].name.toLowerCase().includes(q)) : popular;
    return pool.filter((j) => !basket.includes(j)).slice(0, 8);
  }, [query, basket]);

  const add = (j: number) => {
    if (basket.includes(j) || basket.length >= MAX_BASKET) return;
    setBasket([...basket, j]);
    setFocus(j);
  };
  const remove = (j: number) => {
    setBasket(basket.filter((b) => b !== j));
    if (focus === j) setFocus(null);
  };
  const lens = focus !== null && basket.includes(focus) ? focus : (basket[basket.length - 1] ?? null);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        {/* Basket + picker */}
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
              Basket · {basket.length}/{MAX_BASKET}
            </p>
            {basket.length > 0 && (
              <button onClick={() => setBasket([])} className="text-[12px] text-muted underline-offset-2 hover:text-ink hover:underline">
                Clear
              </button>
            )}
          </div>
          <div className="flex min-h-[44px] flex-wrap gap-2">
            <AnimatePresence initial={false}>
              {basket.map((j) => (
                <motion.span
                  key={j}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`flex items-center gap-1.5 rounded-full py-1 pr-1.5 pl-3 text-[12.5px] ${lens === j ? "bg-ink text-white" : "bg-cream"}`}
                >
                  <button onClick={() => setFocus(j)} className="text-left" data-cursor="Inspect">
                    {C[j].name}
                  </button>
                  <button onClick={() => remove(j)} aria-label={`Remove ${C[j].name}`} className="rounded-full p-0.5 opacity-60 hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            {basket.length === 0 && <p className="self-center text-[13px] text-muted">Empty basket: add a product below.</p>}
          </div>

          <div className="border-t border-line pt-4">
            <label className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 focus-within:border-ink/40">
              <Search className="h-4 w-4 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${C.length} products: lunch bag, heart, christmas…`}
                className="w-full bg-transparent text-[13.5px] outline-none"
              />
            </label>
            <p className="mt-3 mb-2 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">{query.trim() ? `${results.length ? "Matches" : "No match"}` : "Best sellers"}</p>
            <div className="flex flex-wrap gap-1.5">
              {results.map((j) => (
                <button
                  key={j}
                  onClick={() => add(j)}
                  disabled={basket.length >= MAX_BASKET}
                  className="flex items-center gap-1 rounded-full border border-ink/10 px-2.5 py-1 text-[12px] transition-colors hover:border-ink/40 hover:bg-cream/60 disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" /> {C[j].name}
                </button>
              ))}
            </div>
          </div>

          {hidden !== null && (
            <div className="rounded-xl bg-cream px-4 py-3 text-[12.5px]">
              <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Hidden from the model</p>
              <p className="mt-1">
                This basket also had <b>{C[hidden].name}</b>.{" "}
                {hiddenRank === 0 ? (
                  "It is in the basket now, so it can't be suggested."
                ) : hiddenRank === null ? (
                  "It isn't among the neighbours of any item here, so the model would not suggest it."
                ) : (
                  <>
                    The model ranks it <b>#{hiddenRank}</b>: {hiddenRank <= 5 ? "inside the top 5, a hit." : "outside the top 5, a miss."}
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="rounded-2xl bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[14px] font-semibold">{basket.length ? "Customers who bought these also bought" : "Nothing to go on: best sellers"}</p>
            <p className="font-mono text-[10.5px] text-muted">score = Σ similarity</p>
          </div>
          <ol className="mt-4 space-y-2.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {top.map((r, i) => {
                const isHidden = r.j === hidden;
                return (
                  <motion.li
                    key={r.j}
                    layout
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className={`rounded-xl px-3.5 py-2.5 ${isHidden ? "bg-ink text-white" : "bg-cream/60"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13.5px] leading-snug font-medium">
                          <span className="mr-2 font-mono text-[11px] opacity-60">{i + 1}</span>
                          {C[r.j].name}
                          {isHidden && <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10.5px]">the hidden item ✓</span>}
                        </p>
                        <p className={`mt-0.5 text-[11.5px] ${isHidden ? "text-white/70" : "text-ink-2/65"}`}>
                          {r.because >= 0 ? (
                            <>
                              because of {C[r.because].name} · bought together {r.together.toLocaleString("en-US")}×
                            </>
                          ) : (
                            <>in {C[r.j].baskets.toLocaleString("en-US")} training baskets</>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11.5px] opacity-80">{basket.length ? r.score.toFixed(3) : gbp(C[r.j].price)}</span>
                    </div>
                    {basket.length > 0 && (
                      <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isHidden ? "bg-white/20" : "bg-ink/8"}`}>
                        <motion.div className="h-full rounded-full" style={{ background: isHidden ? "#fff" : S1 }} initial={false} animate={{ width: pc((r.score / maxScore) * 100) }} />
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
        </div>
      </div>

      {lens !== null && <NeighbourLens i={lens} />}
    </div>
  );
}

/** What the model knows about one product: its closest neighbours, with the raw co-purchase numbers behind them. */
function NeighbourLens({ i }: { i: number }) {
  const rows = NB[i].slice(0, 8).map(([j, co, s]) => {
    const conf = co / C[i].baskets;
    const lift = conf / (C[j].baskets / TRAIN);
    return { j, co, s, conf, lift };
  });
  const maxS = rows[0]?.s ?? 1;
  return (
    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold">Inside the model: {C[i].name}</p>
        <p className="text-[12px] text-muted">
          in {C[i].baskets.toLocaleString("en-US")} of {TRAIN.toLocaleString("en-US")} training baskets · typical price {gbp(C[i].price)}
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="font-mono text-[10.5px] text-ink-2/60 uppercase">
              <th className="py-1.5 pr-3 font-medium">Closest products</th>
              <th className="py-1.5 pr-3 text-right font-medium">Together</th>
              <th className="py-1.5 pr-3 text-right font-medium">Also bought it</th>
              <th className="py-1.5 pr-3 text-right font-medium">Lift</th>
              <th className="w-[26%] py-1.5 font-medium">Similarity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.j} className="border-t border-line">
                <td className="py-1.5 pr-3">{C[r.j].name}</td>
                <td className="py-1.5 pr-3 text-right font-mono">{r.co.toLocaleString("en-US")}</td>
                <td className="py-1.5 pr-3 text-right font-mono">{Math.round(r.conf * 100)}%</td>
                <td className="py-1.5 pr-3 text-right font-mono">{r.lift.toFixed(1)}×</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8">
                      <div className="h-full rounded-full" style={{ width: `${(r.s / maxS) * 100}%`, background: S2 }} />
                    </div>
                    <span className="w-10 text-right font-mono text-[11px]">{r.s.toFixed(3)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11.5px] text-muted">
        &ldquo;Also bought it&rdquo;: share of baskets with this product that had the other one too. Lift: how many times more often than chance. Similarity (cosine) balances both, so a best seller doesn&apos;t win just by being everywhere.
      </p>
    </motion.div>
  );
}
