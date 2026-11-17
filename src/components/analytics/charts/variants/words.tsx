import { MONTHS, bigrams, reviewWords, wordByChannel, wordMonths, wordTree } from "@/data/chart-demo";
import { H, INK, MUTED, PAL, Svg, Text, W, band, lin, offsets, path, r1 } from "../kit";
import { defs } from "../types";
import { BAD, GOOD } from "./base";

const FONT = "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
const words = [...reviewWords].sort((a, b) => b.n - a.n);
const NMAX = words[0].n;
const NMIN = words[words.length - 1].n;
const SENT = (s: number) => (s > 0 ? GOOD : s < 0 ? BAD : "#5b6470");

type Placed = { word: string; n: number; s: number; x: number; y: number; size: number; rot: boolean };
/**
 * Word cloud layout: biggest word first, in the centre; every next word walks out along a spiral until it finds a
 * spot that overlaps nothing. Text widths are estimated (0.6 em per letter), so the layout is the same everywhere.
 */
function cloud(opts: { maxSize?: number; minSize?: number; rotate?: boolean; shape?: "rect" | "circle"; cx?: number; cy?: number; bottom?: number }) {
  const { maxSize = 40, minSize = 9, rotate = true, shape = "rect", cx = W / 2, cy = H / 2, bottom = 4 } = opts;
  const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const out: Placed[] = [];
  words.forEach((w, i) => {
    const size = r1(minSize + ((w.n - NMIN) / (NMAX - NMIN)) ** 0.7 * (maxSize - minSize));
    const rot = rotate && i > 3 && i % 4 === 2;
    const tw = w.word.length * size * 0.6 + 2;
    const th = size * 0.9;
    const bw = rot ? th : tw;
    const bh = rot ? tw : th;
    for (let t = 0; t < 120; t += 0.08) {
      const rr = 1.7 * t;
      const x = cx + rr * Math.cos(t) * 1.55;
      const y = cy + rr * Math.sin(t);
      const b = { x0: x - bw / 2, y0: y - bh / 2, x1: x + bw / 2, y1: y + bh / 2 };
      const inBounds =
        shape === "circle"
          ? [
              [b.x0, b.y0],
              [b.x1, b.y0],
              [b.x0, b.y1],
              [b.x1, b.y1],
            ].every(([px, py]) => ((px - cx) / 150) ** 2 + ((py - cy) / 100) ** 2 <= 1)
          : b.x0 > 4 && b.x1 < W - 4 && b.y0 > 4 && b.y1 < H - bottom;
      if (inBounds && boxes.every((o) => b.x1 + 1 < o.x0 || b.x0 - 1 > o.x1 || b.y1 + 1 < o.y0 || b.y0 - 1 > o.y1)) {
        boxes.push(b);
        out.push({ word: w.word, n: w.n, s: w.s, x: r1(x), y: r1(y), size, rot });
        break;
      }
    }
  });
  return out;
}
const CLOUD = cloud({});
const CLOUD_SENT = cloud({ rotate: false, maxSize: 34, cy: H / 2 - 8, bottom: 20 });
const CLOUD_CIRCLE = cloud({ rotate: false, shape: "circle", maxSize: 34, minSize: 8 });

function Words({ placed, color }: { placed: Placed[]; color: (p: Placed, i: number) => string }) {
  return (
    <g>
      {placed.map((p, i) => (
        <text
          key={p.word}
          x={p.x}
          y={r1(p.y + p.size * 0.33)}
          fontSize={p.size}
          fontWeight={p.size > 20 ? 800 : p.size > 13 ? 700 : 500}
          textAnchor="middle"
          fill={color(p, i)}
          fontFamily={FONT}
          transform={p.rot ? `rotate(-90 ${p.x} ${p.y})` : undefined}
        >
          <title>{`${p.word}: ${p.n} mentions`}</title>
          {p.word}
        </text>
      ))}
    </g>
  );
}
const CloudBasic = () => (
  <Svg label="Word cloud: words from customer reviews, the most mentioned word biggest and in the middle">
    <Words placed={CLOUD} color={(p, i) => (i === 0 ? INK : PAL[i % 7])} />
  </Svg>
);
const CloudSentiment = () => (
  <Svg label="Word cloud coloured by sentiment: positive words green, negative red, neutral grey">
    <Words placed={CLOUD_SENT} color={(p) => SENT(p.s)} />
    {[
      ["positive", GOOD],
      ["neutral", "#5b6470"],
      ["negative", BAD],
    ].map(([l, c], i) => (
      <g key={l}>
        <rect x={10 + i * 62} y={H - 13} width={8} height={8} rx={2} fill={c} />
        <Text x={21 + i * 62} y={H - 6} size={8}>
          {l}
        </Text>
      </g>
    ))}
  </Svg>
);
const CloudCircle = () => (
  <Svg label="Word cloud packed inside an oval shape">
    <ellipse cx={W / 2} cy={H / 2} rx={152} ry={102} fill="rgba(42,120,214,0.05)" stroke="rgba(42,120,214,0.2)" strokeDasharray="3 3" />
    <Words placed={CLOUD_CIRCLE} color={(p, i) => (i < 3 ? PAL[3] : i < 10 ? PAL[0] : "rgba(42,120,214,0.55)")} />
  </Svg>
);
/** Classic tag cloud: words in alphabetical order, flowing like a paragraph, sized by count. */
function TagCloud() {
  const alpha = [...words].sort((a, b) => a.word.localeCompare(b.word));
  const lines: { word: string; n: number; s: number; x: number; size: number; line: number }[] = [];
  let x = 12;
  let line = 0;
  for (const w of alpha) {
    const size = r1(8 + ((w.n - NMIN) / (NMAX - NMIN)) ** 0.6 * 16);
    const tw = w.word.length * size * 0.58;
    if (x + tw > W - 12) {
      line += 1;
      x = 12;
    }
    lines.push({ ...w, x: r1(x), size, line });
    x += tw + 9;
  }
  const lh = (H - 20) / (line + 1);
  return (
    <Svg label="Tag cloud: words in alphabetical order, each sized by how often it appears">
      {lines.map((w) => (
        <text
          key={w.word}
          x={w.x}
          y={r1(16 + w.line * lh + lh / 2 + w.size * 0.3)}
          fontSize={w.size}
          fontWeight={w.size > 16 ? 700 : 500}
          fill={w.size > 16 ? INK : "rgba(11,11,11,0.62)"}
          fontFamily={FONT}
        >
          {w.word}
        </text>
      ))}
    </Svg>
  );
}
function Frequency() {
  const top = words.slice(0, 12);
  const x = lin(0, NMAX, 74, W - 36);
  const b = band(top.length, 6, H - 6, 0.25);
  return (
    <Svg label="Word frequency bars: the twelve most mentioned words, ranked">
      {top.map((w, i) => (
        <g key={w.word}>
          <Text x={68} y={b.mid(i) + 3} anchor="end" size={9} color={INK}>
            {w.word}
          </Text>
          <rect x={74} y={b.at(i)} width={r1(x(w.n) - 74)} height={b.bw} rx={2} fill={SENT(w.s)} opacity={0.85} />
          <Text x={x(w.n) + 4} y={b.mid(i) + 3} size={8} mono>
            {w.n}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function Sentiment() {
  const pos = words.filter((w) => w.s > 0).slice(0, 7);
  const neg = words.filter((w) => w.s < 0).slice(0, 7);
  const max = Math.max(...pos.map((w) => w.n), ...neg.map((w) => w.n));
  const mid = W / 2;
  const b = band(7, 22, H - 6, 0.3);
  return (
    <Svg label="Sentiment words: the most common negative words to the left, positive to the right">
      <Text x={mid - 8} y={13} anchor="end" size={9} color={BAD} weight={700}>
        {"negative"}
      </Text>
      <Text x={mid + 8} y={13} size={9} color={GOOD} weight={700}>
        {"positive"}
      </Text>
      {neg.map((w, i) => {
        const len = r1((w.n / max) * (mid - 70));
        return (
          <g key={w.word}>
            <rect x={r1(mid - 2 - len)} y={b.at(i)} width={len} height={b.bw} rx={2} fill={BAD} opacity={0.8} />
            <Text x={r1(mid - 6 - len)} y={b.mid(i) + 3} anchor="end" size={8.5} color={INK}>
              {w.word}
            </Text>
          </g>
        );
      })}
      {pos.map((w, i) => {
        const len = r1((w.n / max) * (mid - 70));
        return (
          <g key={w.word}>
            <rect x={mid + 2} y={b.at(i)} width={len} height={b.bw} rx={2} fill={GOOD} opacity={0.8} />
            <Text x={r1(mid + 6 + len)} y={b.mid(i) + 3} size={8.5} color={INK}>
              {w.word}
            </Text>
          </g>
        );
      })}
      <line x1={mid} x2={mid} y1={18} y2={H - 4} stroke={INK} />
    </Svg>
  );
}
function Compare() {
  const rows = [...wordByChannel].sort((a, b) => b.dine - b.delivery - (a.dine - a.delivery));
  const max = Math.max(...rows.flatMap((r) => [r.dine, r.delivery]));
  const mid = W / 2;
  const b = band(rows.length, 22, H - 6, 0.25);
  return (
    <Svg label="Word comparison: how often each word appears in dine-in reviews (left) and delivery reviews (right)">
      <Text x={mid - 34} y={13} anchor="end" size={9} color={PAL[0]} weight={700}>
        {"Dine-in"}
      </Text>
      <Text x={mid + 34} y={13} size={9} color={PAL[2]} weight={700}>
        {"Delivery"}
      </Text>
      {rows.map((r, i) => (
        <g key={r.word}>
          <rect x={r1(mid - 30 - (r.dine / max) * (mid - 40))} y={b.at(i)} width={r1((r.dine / max) * (mid - 40))} height={b.bw} rx={2} fill={PAL[0]} />
          <rect x={mid + 30} y={b.at(i)} width={r1((r.delivery / max) * (mid - 40))} height={b.bw} rx={2} fill={PAL[2]} />
          <Text x={mid} y={b.mid(i) + 3} anchor="middle" size={8.5} color={INK}>
            {r.word}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
const NODES = Array.from(new Set(bigrams.flatMap(([a, b]) => [a, b])));
const NPOS: Record<string, [number, number]> = {
  kopi: [50, 40],
  susu: [130, 34],
  gula: [40, 110],
  aren: [110, 120],
  friendly: [205, 40],
  staff: [300, 30],
  barista: [300, 78],
  slow: [210, 170],
  service: [300, 196],
  wifi: [310, 150],
  strong: [150, 90],
  coffee: [210, 110],
  iced: [270, 112],
  latte: [330, 112],
  cozy: [60, 180],
  place: [140, 196],
  long: [40, 150],
  queue: [120, 160],
  cold: [175, 140],
};
function Bigrams() {
  const max = Math.max(...bigrams.map((b) => b[2]));
  const deg = (w: string) => bigrams.filter(([a, b]) => a === w || b === w).reduce((s, b) => s + b[2], 0);
  return (
    <Svg label="Word-pair network: words joined by a line when they appear side by side; thicker lines appear more often">
      {bigrams.map(([a, b, n]) => (
        <line key={a + b} x1={NPOS[a][0]} y1={NPOS[a][1]} x2={NPOS[b][0]} y2={NPOS[b][1]} stroke={PAL[0]} strokeWidth={r1(0.8 + (n / max) * 5)} opacity={0.45} />
      ))}
      {NODES.map((w) => (
        <g key={w}>
          <circle cx={NPOS[w][0]} cy={NPOS[w][1]} r={r1(3 + Math.sqrt(deg(w) / max) * 6)} fill={w === "coffee" ? PAL[1] : PAL[0]} />
          <Text x={NPOS[w][0]} y={NPOS[w][1] - 10} anchor="middle" size={8.5} color={INK}>
            {w}
          </Text>
        </g>
      ))}
    </Svg>
  );
}
function WordTree() {
  const total = wordTree.branches.reduce((s, b) => s + b.n, 0);
  const rootX = 14;
  const rootY = H / 2;
  const b1x = 120;
  const b2x = 210;
  const slots = wordTree.branches.flatMap((b) => b.next.map(() => b.w));
  const step = (H - 24) / slots.length;
  const first = offsets(wordTree.branches.map((b) => b.next.length));
  const layout = wordTree.branches.map((b, bi) => {
    const kids = b.next.map(([t, n], j) => ({ t, n, y: r1(16 + (first[bi] + j + 0.5) * step) }));
    const y = r1(kids.reduce((s, c) => s + c.y, 0) / kids.length);
    return { ...b, y, kids };
  });
  return (
    <Svg label="Word tree: how reviews continue after “the coffee is”, branch size by how often">
      <Text x={rootX} y={rootY + 4} size={12} color={INK} weight={700}>
        {wordTree.root}
      </Text>
      {layout.map((b) => (
        <g key={b.w}>
          <path d={`M${rootX + 86},${rootY} C${b1x - 20},${rootY} ${b1x - 30},${b.y} ${b1x - 4},${b.y}`} fill="none" stroke={MUTED} strokeWidth={r1(0.6 + (b.n / total) * 6)} opacity={0.5} />
          <Text x={b1x} y={b.y + 4} size={r1(9 + (b.n / total) * 14)} color={PAL[0]} weight={700}>
            {b.w}
          </Text>
          {b.kids.map((c) => (
            <g key={c.t}>
              <path
                d={`M${b1x + b.w.length * 7 + 6},${b.y} C${b2x - 14},${b.y} ${b2x - 18},${c.y} ${b2x - 4},${c.y}`}
                fill="none"
                stroke={MUTED}
                strokeWidth={r1(0.5 + (c.n / total) * 5)}
                opacity={0.45}
              />
              <Text x={b2x} y={c.y + 3} size={r1(8 + (c.n / total) * 8)} color={INK}>
                {c.t}
              </Text>
            </g>
          ))}
        </g>
      ))}
    </Svg>
  );
}
function Mentions() {
  const max = Math.max(...wordMonths.flatMap((w) => w.values));
  const x = lin(0, 11, 30, W - 60);
  const y = lin(0, max, H - 22, 14);
  // end labels pushed apart so they never sit on top of each other
  const ends = wordMonths.map((w, k) => ({ k, y: y(w.values[11]) })).sort((a, b) => a.y - b.y);
  const labelY: number[] = [];
  ends.reduce((prev, e) => {
    const yy = Math.max(e.y, prev + 11);
    labelY[e.k] = yy;
    return yy;
  }, -Infinity);
  return (
    <Svg label="Word mentions over time: how often four words came up each month">
      {[0, Math.round(max / 2), max].map((v) => (
        <g key={v}>
          <line x1={30} x2={W - 60} y1={y(v)} y2={y(v)} stroke="rgba(11,11,11,0.07)" />
          <Text x={24} y={y(v) + 3} anchor="end" size={8} mono>
            {v}
          </Text>
        </g>
      ))}
      {wordMonths.map((w, k) => (
        <g key={w.word}>
          <path d={path(w.values.map((v, i) => [x(i), y(v)]))} fill="none" stroke={PAL[k]} strokeWidth={2} />
          <Text x={x(11) + 5} y={labelY[k] + 3} size={9} color={PAL[k]} weight={700}>
            {`“${w.word}”`}
          </Text>
        </g>
      ))}
      {MONTHS.map((m, i) => (
        <Text key={m} x={x(i)} y={H - 8} anchor="middle" size={8}>
          {m.slice(0, 1)}
        </Text>
      ))}
    </Svg>
  );
}
const REVIEW: [string, number][] = [
  ["The", 0],
  ["kopi susu", 1],
  ["is", 0],
  ["sweet", 1],
  ["and", 0],
  ["the", 0],
  ["staff", 0],
  ["are", 0],
  ["friendly,", 1],
  ["but", 0],
  ["the", 0],
  ["wifi", 0],
  ["is", 0],
  ["slow", -1],
  ["and", 0],
  ["parking", 0],
  ["is", 0],
  ["a", 0],
  ["nightmare.", -1],
  ["Still", 0],
  ["my", 0],
  ["favourite", 1],
  ["place", 0],
  ["to", 0],
  ["work.", 0],
];
function Highlight() {
  const size = 13;
  const lines: { w: string; s: number; x: number; line: number }[] = [];
  let x = 16;
  let line = 0;
  for (const [w, s] of REVIEW) {
    const tw = w.length * size * 0.56;
    if (x + tw > W - 16) {
      line += 1;
      x = 16;
    }
    lines.push({ w, s, x: r1(x), line });
    x += tw + 7;
  }
  return (
    <Svg label="Highlighted text: one review with positive words marked green and negative words red">
      <Text x={16} y={22} size={9}>
        {"One review, words scored by a sentiment list"}
      </Text>
      {lines.map((t, i) => (
        <g key={i}>
          {t.s !== 0 && (
            <rect x={t.x - 2} y={r1(46 + t.line * 30 - size)} width={r1(t.w.length * size * 0.56 + 4)} height={size + 7} rx={4} fill={t.s > 0 ? "rgba(27,175,122,0.2)" : "rgba(227,73,72,0.2)"} />
          )}
          <text x={t.x} y={46 + t.line * 30} fontSize={size} fill={t.s > 0 ? "#0d6b47" : t.s < 0 ? "#b3261e" : INK} fontWeight={t.s ? 700 : 400} fontFamily={FONT}>
            {t.w}
          </text>
        </g>
      ))}
      <Text x={16} y={H - 14} size={9} color={INK}>
        {"score: +3 positive, −2 negative → mildly positive"}
      </Text>
    </Svg>
  );
}

export const WORD_VARIANTS = [
  ...defs("Text & words", "Word clouds", [
    ["tx-cloud", "Word cloud", "A quick, friendly impression of what people talk about most.", "Comparing words precisely: sizes are hard to read, long words look bigger.", CloudBasic],
    ["tx-cloud-sentiment", "Sentiment word cloud", "Seeing at once what people praise and complain about.", "When the sentiment list hasn't been checked for your context.", CloudSentiment],
    ["tx-cloud-shape", "Shaped word cloud", "A decorative cloud for a poster or a hero section.", "Analysis: the shape adds nothing but looks.", CloudCircle],
    ["tx-tags", "Tag cloud (A–Z)", "Finding a word quickly while still seeing what's common.", "Ranking words: use frequency bars.", TagCloud],
  ]),
  ...defs("Text & words", "Word charts", [
    ["tx-freq", "Word frequency bars", "The honest version of a word cloud: ranked and exact.", "Hundreds of words: show the top ones.", Frequency],
    ["tx-sentiment", "Positive vs negative words", "Contrasting praise and complaints side by side.", "Words whose sentiment depends on context.", Sentiment],
    ["tx-compare", "Word comparison", "How two groups talk differently.", "Groups with very different numbers of reviews: use rates.", Compare],
    ["tx-bigrams", "Word-pair network", "Phrases and themes that go together.", "Large vocabularies: it becomes a hairball.", Bigrams],
    ["tx-tree", "Word tree", "How sentences continue after a key phrase.", "Phrases with many rare continuations.", WordTree],
    ["tx-mentions", "Mentions over time", "Whether a topic is growing or fading.", "Very rare words: the lines are noise.", Mentions],
    ["tx-highlight", "Highlighted text", "Explaining how text is scored, word by word.", "Long documents.", Highlight],
  ]),
];
