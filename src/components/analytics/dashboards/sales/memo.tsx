"use client";

import { FULL_IDX, MONTHS, PARTIAL, S, gbp, kpis, metricsOf, monthName, monthYear, num, pct, productsOf, scopeName, type Sel } from "./data";
import { Card } from "./tiles";

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** Plain-language findings for the current selection, computed from the same numbers as the tiles. */
export function insights(sel: Sel): string[] {
  const m = metricsOf(sel.scope);
  const name = scopeName(sel.scope);
  const mid = sel.scope === "All" ? "all countries together" : name;
  const { cur, prev } = kpis(sel);
  const rate = (c: number, o: number) => c / (o + c);
  const avgRate = FULL_IDX.reduce((s, i) => s + rate(m.cancelled[i], m.orders[i]), 0) / FULL_IDX.length;
  const prods = productsOf(sel);
  const out: string[] = [];
  if (sel.period === "year") {
    const revs = FULL_IDX.map((i) => m.revenue[i]);
    const best = FULL_IDX[revs.indexOf(Math.max(...revs))];
    const worst = FULL_IDX[revs.indexOf(Math.min(...revs))];
    out.push(`${name}: ${gbp(cur.revenue)} net revenue over 12 months, from ${num(cur.orders)} orders.`);
    out.push(
      `Best month ${monthYear(MONTHS[best])} (${gbp(m.revenue[best])}), weakest ${monthYear(MONTHS[worst])} (${gbp(m.revenue[worst])})${best > worst ? ": the year ends stronger than it starts" : ""}.`,
    );
    if (prods[0]) out.push(`${prods[0].name} is the top product at ${gbp(prods[0].revenue)}, ${Math.round((prods[0].revenue / cur.revenue) * 1000) / 10}% of the total.`);
    if (sel.scope === "All") {
      const uk = metricsOf("United Kingdom");
      const ukRev = FULL_IDX.reduce((s, i) => s + uk.revenue[i], 0);
      const champ = S.segments.find((s) => s.segment === "Champions")!;
      const tr = S.segments.reduce((s, x) => s + x.revenue, 0);
      const tc = S.segments.reduce((s, x) => s + x.customers, 0);
      const nine = S.scopes.slice(2).reduce((s, sc) => s + FULL_IDX.reduce((a, k) => a + metricsOf(sc).revenue[k], 0), 0);
      out.push(`The UK brings ${Math.round((ukRev / cur.revenue) * 100)}% of revenue; the next nine countries bring ${Math.round((nine / (cur.revenue - ukRev)) * 100)}% of what's left.`);
      out.push(
        `“Champions” are ${Math.round((champ.customers / tc) * 100)}% of customers but ${Math.round((champ.revenue / tr) * 100)}% of revenue: keeping them matters more than anything else here.`,
      );
    }
    out.push(`About ${(avgRate * 100).toFixed(0)}% of invoices end up cancelled, which is why this dashboard reports net revenue.`);
    return out;
  }
  const i = sel.period;
  const mo = monthYear(MONTHS[i]);
  if (i === PARTIAL) out.push(`Careful: ${mo} has only nine days of data, so it can't be compared with full months.`);
  if (prev) {
    const r = cur.revenue / prev.revenue - 1;
    const o = cur.orders / prev.orders - 1;
    const a = cur.revenue / cur.orders / (prev.revenue / prev.orders) - 1;
    out.push(`${name}: ${gbp(cur.revenue)} net revenue in ${mo}, ${pct(r)} on ${monthName(MONTHS[i - 1], "long")}.`);
    if (Math.abs(r) > 0.02 && i !== PARTIAL)
      out.push(
        Math.abs(o) >= Math.abs(a)
          ? `Mostly ${o > 0 ? "more" : "fewer"} orders (${pct(o)}); the average order moved ${pct(a)}.`
          : `Mostly ${a > 0 ? "bigger" : "smaller"} orders (average ${pct(a)}); the number of orders moved ${pct(o)}.`,
      );
  } else {
    out.push(`${name}: ${gbp(cur.revenue)} net revenue in ${mo}, the first month in the data, so there's nothing to compare with yet.`);
  }
  if (i !== PARTIAL) {
    const rank = 1 + FULL_IDX.filter((k) => m.revenue[k] > m.revenue[i]).length;
    out.push(rank === 1 ? `The best of the 12 full months for ${mid}.` : rank === 12 ? `The weakest of the 12 full months for ${mid}.` : `The ${ordinal(rank)} best of the 12 full months for ${mid}.`);
  }
  if (prods[0]) out.push(`${prods[0].name} led with ${gbp(prods[0].revenue)}, ${Math.round((prods[0].revenue / cur.revenue) * 1000) / 10}% of the month.`);
  if (i > 0 && cur.customers) out.push(`${num(cur.new)} new customers, ${Math.round((cur.new / cur.customers) * 100)}% of the ${num(cur.customers)} who bought.`);
  const rc = rate(cur.cancelled, cur.orders);
  out.push(`Cancellations at ${(rc * 100).toFixed(1)}% of invoices, ${rc > avgRate ? "above" : "below"} the 12-month average of ${(avgRate * 100).toFixed(1)}%.`);
  return out;
}

export function Memo({ sel }: { sel: Sel }) {
  const lines = insights(sel);
  return (
    <Card title="What the numbers say" sub="Written from the same numbers as the tiles, for the current filters" className="lg:col-span-4" dark>
      <ul className="space-y-2.5">
        {lines.map((l, k) => (
          <li key={k} className="flex gap-2 text-[13px] leading-snug text-white/90">
            <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#eb6834]" />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
