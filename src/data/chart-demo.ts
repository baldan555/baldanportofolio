/**
 * Example data for the chart library: a made-up coffee chain ("Kopi Senja") in Indonesian cities.
 * Every number here is invented and generated from a fixed seed with plain arithmetic, so the server and the
 * browser produce identical values. Nothing on the chart library page is a real business result.
 */

let seed = 20261111;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
/** Roughly normal (sum of 12 uniforms), arithmetic only. */
const normal = (mu = 0, sd = 1) => {
  let s = 0;
  for (let i = 0; i < 12; i++) s += rand();
  return mu + (s - 6) * sd;
};
const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

export const CITIES = ["Jakarta", "Surabaya", "Bandung", "Medan", "Makassar", "Yogyakarta", "Denpasar", "Semarang"];
export const PRODUCTS = ["Kopi susu", "Americano", "Latte", "Teh", "Pastry"];
export const CHANNELS = ["Dine-in", "Takeaway", "Delivery"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const citySize = [3.2, 1.8, 1.6, 1.3, 1.0, 1.1, 1.2, 0.9];
const productMix = [0.36, 0.16, 0.2, 0.14, 0.14];

/** Revenue (million rupiah) per city per month, over two years: growth, a year-end peak and noise. */
export const monthly = CITIES.map((city, c) => ({
  city,
  values: Array.from({ length: 24 }, (_, m) => round(citySize[c] * 100 * (1 + m * 0.018) * (1 + (m % 12 === 11 ? 0.22 : m % 12 === 10 ? 0.1 : m % 12 === 2 ? -0.08 : 0)) * (1 + normal(0, 0.035)))),
}));
export const totalByMonth = Array.from({ length: 24 }, (_, m) => round(monthly.reduce((s, c) => s + c.values[m], 0)));
export const revenueByCity = monthly.map((c) => ({ label: c.city, value: round(c.values.slice(12).reduce((a, b) => a + b, 0)) })).sort((a, b) => b.value - a.value);
export const revenueLastYear = monthly.map((c) => ({ label: c.city, a: round(c.values.slice(0, 12).reduce((x, y) => x + y, 0)), b: round(c.values.slice(12).reduce((x, y) => x + y, 0)) }));

/** This year's revenue by city and product. */
export const cityProduct = revenueByCity.slice(0, 6).map((r) => ({ label: r.label, parts: PRODUCTS.map((p, i) => round(r.value * productMix[i] * (1 + normal(0, 0.12)))) }));
export const productTotals = PRODUCTS.map((p, i) => ({ label: p, value: round(cityProduct.reduce((s, c) => s + c.parts[i], 0)) }));

/** Targets for the bullet chart. */
export const targets = revenueByCity
  .slice(0, 5)
  .map((r) => ({ label: r.label, value: r.value, target: round(r.value * (0.92 + rand() * 0.2)), poor: round(r.value * 0.6), ok: round(r.value * 0.85) }));

/** Daily orders for one year (calendar heatmap): weekly rhythm, a slow start in January, busier year-end. */
export const daily = Array.from({ length: 364 }, (_, d) => {
  const dow = d % 7; // 0 = Monday
  const weekend = dow >= 5 ? 1.35 : 1;
  const season = 1 + d / 900 + (d > 330 ? 0.25 : 0);
  return Math.max(0, round(420 * weekend * season * (1 + normal(0, 0.08))));
});

/** Order values (thousand rupiah) per channel, skewed to the right like real baskets. */
const skewed = (base: number, spread: number) => {
  const u = rand() + rand() + rand();
  return round(base + spread * u * u, 0);
};
export const orderValues = CHANNELS.map((ch, i) => ({ label: ch, values: Array.from({ length: 160 }, () => skewed([28, 22, 45][i], [9, 7, 14][i])) }));

/** Store-level data: waiting time vs satisfaction, size and city. */
export const stores = Array.from({ length: 60 }, (_, i) => {
  const wait = round(2 + rand() * 13, 1);
  const seats = Math.round(20 + rand() * 60);
  return { id: i, city: CITIES[i % CITIES.length], wait, satisfaction: round(Math.min(5, Math.max(1, 4.9 - wait * 0.14 + normal(0, 0.28))), 2), revenue: round(seats * (6 + rand() * 4)), seats };
});

/** Correlation between store metrics (computed from the generated stores). */
export const METRICS = ["wait", "satisfaction", "revenue", "seats"] as const;
const corr = (a: number[], b: number[]) => {
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  a.forEach((v, i) => {
    sab += (v - ma) * (b[i] - mb);
    saa += (v - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  });
  return sab / Math.sqrt(saa * sbb);
};
export const correlations = METRICS.map((m1) =>
  METRICS.map((m2) =>
    round(
      corr(
        stores.map((s) => s[m1]),
        stores.map((s) => s[m2]),
      ),
      2,
    ),
  ),
);

/** App funnel for one month. */
export const funnel = [
  { label: "Opened the app", value: 48200 },
  { label: "Viewed the menu", value: 31900 },
  { label: "Added to cart", value: 14300 },
  { label: "Checked out", value: 9100 },
  { label: "Paid", value: 8240 },
];

/** Profit bridge for the year (million rupiah). */
export const bridge = [
  { label: "Revenue", value: 4120, kind: "total" as const },
  { label: "Beans & milk", value: -1310, kind: "step" as const },
  { label: "Staff", value: -980, kind: "step" as const },
  { label: "Rent", value: -720, kind: "step" as const },
  { label: "Delivery fees", value: -260, kind: "step" as const },
  { label: "Marketing", value: -190, kind: "step" as const },
  { label: "Profit", value: 660, kind: "total" as const },
];

/** Flows: channel → product → payment (orders, thousands). */
export const sankey = {
  nodes: ["Dine-in", "Takeaway", "Delivery", "Coffee", "Tea", "Food", "QRIS", "Cash", "Card"],
  links: [
    [0, 3, 34],
    [0, 4, 9],
    [0, 5, 12],
    [1, 3, 28],
    [1, 4, 6],
    [1, 5, 5],
    [2, 3, 22],
    [2, 4, 4],
    [2, 5, 10],
    [3, 6, 52],
    [3, 7, 18],
    [3, 8, 14],
    [4, 6, 11],
    [4, 7, 6],
    [4, 8, 2],
    [5, 6, 16],
    [5, 7, 7],
    [5, 8, 4],
  ] as [number, number, number][],
};

/** Opening a new store: tasks in weeks. */
export const gantt = [
  { label: "Find location", start: 0, end: 4 },
  { label: "Sign lease", start: 3, end: 5 },
  { label: "Fit-out", start: 5, end: 11 },
  { label: "Hire & train", start: 8, end: 12 },
  { label: "Soft opening", start: 12, end: 13 },
  { label: "Launch", start: 13, end: 14 },
];

/** Hierarchy for treemap / sunburst: category → product, this year's revenue. */
export const hierarchy = [
  {
    label: "Coffee",
    children: [
      { label: "Kopi susu", value: 1480 },
      { label: "Latte", value: 820 },
      { label: "Americano", value: 650 },
      { label: "Cold brew", value: 240 },
    ],
  },
  {
    label: "Tea",
    children: [
      { label: "Teh tarik", value: 330 },
      { label: "Iced tea", value: 240 },
    ],
  },
  {
    label: "Food",
    children: [
      { label: "Croissant", value: 210 },
      { label: "Banana bread", value: 150 },
    ],
  },
];

/** Province tile map: each province is one square, roughly where it lies (col, row), with stores per province. */
export const provinces: { code: string; name: string; col: number; row: number; stores: number }[] = [
  ["ACE", "Aceh", 0, 0],
  ["SUT", "Sumatera Utara", 1, 1],
  ["RIA", "Riau", 2, 1],
  ["KRI", "Kepulauan Riau", 3, 1],
  ["SUB", "Sumatera Barat", 1, 2],
  ["JAM", "Jambi", 2, 2],
  ["BEN", "Bengkulu", 1, 3],
  ["SUS", "Sumatera Selatan", 2, 3],
  ["BBL", "Bangka Belitung", 3, 3],
  ["LAM", "Lampung", 2, 4],
  ["BAN", "Banten", 3, 5],
  ["JKT", "DKI Jakarta", 4, 4],
  ["JBR", "Jawa Barat", 4, 5],
  ["JTG", "Jawa Tengah", 5, 5],
  ["YOG", "DI Yogyakarta", 5, 6],
  ["JTM", "Jawa Timur", 6, 5],
  ["BAL", "Bali", 7, 5],
  ["NTB", "Nusa Tenggara Barat", 8, 5],
  ["NTT", "Nusa Tenggara Timur", 9, 5],
  ["KBR", "Kalimantan Barat", 4, 2],
  ["KTG", "Kalimantan Tengah", 5, 2],
  ["KSL", "Kalimantan Selatan", 6, 3],
  ["KTM", "Kalimantan Timur", 6, 2],
  ["KUT", "Kalimantan Utara", 6, 1],
  ["GOR", "Gorontalo", 8, 1],
  ["SLU", "Sulawesi Utara", 9, 1],
  ["STG", "Sulawesi Tengah", 8, 2],
  ["SBR", "Sulawesi Barat", 7, 3],
  ["SSL", "Sulawesi Selatan", 8, 3],
  ["SGR", "Sulawesi Tenggara", 9, 3],
  ["MUT", "Maluku Utara", 10, 1],
  ["MAL", "Maluku", 10, 3],
  ["PBD", "Papua Barat Daya", 11, 2],
  ["PBR", "Papua Barat", 12, 2],
  ["PAP", "Papua", 13, 2],
  ["PTG", "Papua Tengah", 12, 3],
  ["PPG", "Papua Pegunungan", 13, 3],
  ["PSL", "Papua Selatan", 13, 4],
].map(([code, name, col, row]) => {
  const big = ["JKT", "JBR", "JTM", "JTG", "BAN", "BAL", "SUT", "SSL", "YOG"].includes(code as string);
  return { code: code as string, name: name as string, col: col as number, row: row as number, stores: Math.round(big ? 8 + rand() * 30 : rand() * 7) };
});

/** KPIs with a 12-month sparkline. */
export const kpis = [
  { label: "Revenue", value: "Rp 4.1 bn", delta: 0.18, series: totalByMonth.slice(12) },
  { label: "Orders", value: "1.26 m", delta: 0.11, series: totalByMonth.slice(12).map((v) => round(v * 0.3)) },
  { label: "Average ticket", value: "Rp 32.6k", delta: 0.06, series: Array.from({ length: 12 }, (_, i) => round(30 + i * 0.22 + normal(0, 0.5), 1)) },
  { label: "Satisfaction", value: "4.4 / 5", delta: -0.02, series: Array.from({ length: 12 }, (_, i) => round(4.5 - i * 0.01 + normal(0, 0.04), 2)) },
];

/** A share (0–1) for the gauge: progress to this year's target. */
export const targetShare = 0.83;

/* ------------------------------------------------------------------ more example data for the chart variants (appended, so the values above stay the same) */

export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00–21:00

/** Orders per hour of the day for an average weekday and weekend day: morning rush, lunch, after-work. */
const hourShape = (h: number, weekend: boolean) =>
  weekend
    ? 20 + 60 * Math.max(0, 1 - Math.abs(h - 11) / 6) + 35 * Math.max(0, 1 - Math.abs(h - 16) / 4)
    : 15 + 70 * Math.max(0, 1 - Math.abs(h - 8) / 2.5) + 40 * Math.max(0, 1 - Math.abs(h - 13) / 2) + 45 * Math.max(0, 1 - Math.abs(h - 18) / 2.5);
export const hourlyByDay = WEEKDAYS.map((d, i) => ({ day: d, values: HOURS.map((h) => round(hourShape(h, i >= 5) * (i === 4 ? 1.15 : 1) * (1 + normal(0, 0.06)))) }));
export const hourlyWeekday = HOURS.map((h, k) => round(hourlyByDay.slice(0, 5).reduce((s, d) => s + d.values[k], 0) / 5));
export const hourlyWeekend = HOURS.map((h, k) => round(hourlyByDay.slice(5).reduce((s, d) => s + d.values[k], 0) / 2));

/** Orders (thousands) per quarter and channel. */
export const channelQuarter = QUARTERS.map((q, i) => ({ label: q, parts: [round(160 + i * 6 + normal(0, 5)), round(110 + i * 4 + normal(0, 4)), round(70 + i * 14 + normal(0, 4))] }));

/** Channel mix (shares) per city. */
export const cityChannel = CITIES.map((c) => {
  const raw = [0.45 + normal(0, 0.06), 0.3 + normal(0, 0.05), 0.25 + normal(0, 0.06)].map((v) => Math.max(0.05, v));
  const s = raw.reduce((a, b) => a + b, 0);
  return { label: c, parts: raw.map((v) => round(v / s, 3)) };
});

/** Customer survey: share of answers per level (strongly disagree → strongly agree). */
export const LIKERT = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
export const survey = ["Coffee tastes great", "Staff are friendly", "Prices are fair", "Seats are easy to find", "The app works well", "Delivery is on time"].map((q, i) => {
  const lean = [0.9, 0.7, -0.1, -0.4, 0.2, 0.05][i];
  const raw = [0.12 - lean * 0.06, 0.18 - lean * 0.08, 0.22, 0.28 + lean * 0.06, 0.2 + lean * 0.1].map((v) => Math.max(0.02, v + normal(0, 0.015)));
  const s = raw.reduce((a, b) => a + b, 0);
  return { label: q, parts: raw.map((v) => round(v / s, 3)) };
});

/** Green-bean price per kg (thousand rupiah) over 30 trading days, with volume: open, high, low, close. */
export const beans = (() => {
  let close = 92;
  return Array.from({ length: 30 }, (_, d) => {
    const open = round(close + normal(0, 0.8), 1);
    close = round(open + normal(0.12, 1.6), 1);
    const high = round(Math.max(open, close) + Math.abs(normal(0, 0.9)), 1);
    const low = round(Math.min(open, close) - Math.abs(normal(0, 0.9)), 1);
    return { day: d + 1, open, high, low, close, volume: round(40 + rand() * 50) };
  });
})();

/** Ratings (1–5) per city on six things customers notice. */
export const ASPECTS = ["Taste", "Speed", "Price", "Ambience", "Service", "Cleanliness"];
export const ratings = CITIES.map((c, i) => ({ label: c, values: ASPECTS.map((a, k) => round(Math.min(5, Math.max(2.2, 3.9 + normal(0, 0.35) + (k === 1 ? -0.25 * (i % 3) : 0))), 1)) }));

/** Baskets: number of items vs order value (thousand rupiah), for dense scatter charts. */
export const baskets = Array.from({ length: 420 }, () => {
  const items = Math.max(1, Math.round(1 + rand() * rand() * 7 + rand()));
  return { items: round(items + normal(0, 0.25), 2), value: round(Math.max(12, items * 24 + normal(0, 9) + rand() * 15), 1) };
});

/** Monthly cohorts: share of new customers still ordering after n months. */
export const cohorts = MONTHS.slice(0, 8).map((m, i) => ({
  label: `${m} cohort`,
  size: round(900 + rand() * 500),
  values: Array.from({ length: 8 - i }, (_, n) => (n === 0 ? 1 : round(Math.max(0.08, 0.62 * Math.exp(-n / (3.2 + i * 0.15)) + normal(0, 0.015)), 3))),
}));

/** Loyalty tiers (customers). */
export const tiers = [
  { label: "Gold", value: 1200 },
  { label: "Silver", value: 4800 },
  { label: "Bronze", value: 12600 },
  { label: "New", value: 28400 },
];
/** How customers moved between tiers from January to June to December. */
export const tierFlow = {
  stages: ["January", "June", "December"],
  tiers: ["Gold", "Silver", "Bronze", "Lapsed"],
  links: [
    [0, 0, 0, 9],
    [0, 0, 1, 2],
    [1, 1, 1, 22],
    [1, 0, 0, 4],
    [1, 1, 3, 5],
    [2, 2, 2, 30],
    [2, 1, 1, 9],
    [2, 3, 3, 14],
    [3, 2, 2, 6],
    [3, 3, 3, 18],
  ] as [number, number, number, number][],
};

/** Customers who ordered in one city and also in another (hundreds), for chord and matrix charts. */
export const cityMatrix = (() => {
  const six = CITIES.slice(0, 6);
  return { labels: six, m: six.map((a, i) => six.map((b, j) => (i === j ? 0 : round((citySize[i] * citySize[j] * 6 * (1 + rand() * 0.5)) / (1 + Math.abs(i - j) * 0.4))))) };
})();

/** Supply network: roastery → warehouses → cities. */
export const network = {
  nodes: [{ id: "Roastery", kind: 0 }, { id: "WH West", kind: 1 }, { id: "WH East", kind: 1 }, ...CITIES.map((c) => ({ id: c, kind: 2 }))],
  links: [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 5],
    [1, 6],
    [1, 10],
    [2, 4],
    [2, 7],
    [2, 9],
    [2, 8],
    [1, 2],
    [3, 5],
  ] as [number, number][],
};

/** Moments worth marking on a timeline. */
export const events = [
  { m: 14, label: "New menu" },
  { m: 17, label: "Price +5%" },
  { m: 20, label: "App launch" },
];
export const campaigns = [
  { label: "Ramadan promo", start: 2, end: 4 },
  { label: "Back to school", start: 6, end: 8 },
  { label: "App launch", start: 7, end: 10 },
  { label: "Year-end bundle", start: 10, end: 12 },
];
export const milestones = [
  { m: 0, label: "First store" },
  { m: 3, label: "Delivery starts" },
  { m: 6, label: "10th store" },
  { m: 8, label: "Loyalty app" },
  { m: 11, label: "Bali opens" },
];

/** Customer journey: average satisfaction (1–5) at each step. */
export const journey = [
  { label: "Find", value: 4.1 },
  { label: "Order", value: 3.6 },
  { label: "Wait", value: 2.9 },
  { label: "Pick up", value: 3.8 },
  { label: "Drink", value: 4.6 },
  { label: "Return", value: 4.2 },
];

/** Task burndown for opening a store (tasks left per week, plan vs actual). */
export const burndown = Array.from({ length: 15 }, (_, w) => ({
  week: w,
  plan: round(60 - w * (60 / 14)),
  actual: w > 11 ? null : round(Math.max(0, 60 - w * 4.2 + (w > 4 && w < 9 ? 6 : 0) + normal(0, 1.5))),
}));

/* ------------------------------------------------------------------ maps, words, sets and models (appended) */

/** Store growth this year per province (%), for the diverging and bivariate maps. */
export const provinceGrowth: Record<string, number> = Object.fromEntries(provinces.map((p) => [p.code, round(normal(9, 8), 1)]));

/** Green-bean purchases by origin country (tonnes this year). */
export const beanOrigins = [
  { iso: "IDN", name: "Indonesia", tonnes: 380 },
  { iso: "BRA", name: "Brazil", tonnes: 420 },
  { iso: "VNM", name: "Vietnam", tonnes: 260 },
  { iso: "COL", name: "Colombia", tonnes: 180 },
  { iso: "ETH", name: "Ethiopia", tonnes: 120 },
  { iso: "IND", name: "India", tonnes: 90 },
  { iso: "PER", name: "Peru", tonnes: 70 },
  { iso: "HND", name: "Honduras", tonnes: 60 },
  { iso: "UGA", name: "Uganda", tonnes: 55 },
  { iso: "GTM", name: "Guatemala", tonnes: 50 },
  { iso: "KEN", name: "Kenya", tonnes: 45 },
  { iso: "PNG", name: "Papua New Guinea", tonnes: 40 },
];

/** Words from customer reviews: count and sentiment (+1 positive, 0 neutral, −1 negative). */
export const reviewWords: { word: string; n: number; s: -1 | 0 | 1 }[] = (
  [
    ["coffee", 412, 0],
    ["friendly", 238, 1],
    ["kopi susu", 225, 0],
    ["cozy", 180, 1],
    ["wifi", 164, 0],
    ["slow", 152, -1],
    ["sweet", 141, 1],
    ["price", 133, 0],
    ["latte", 128, 0],
    ["delivery", 120, 0],
    ["clean", 104, 1],
    ["crowded", 98, -1],
    ["strong", 92, 1],
    ["gula aren", 88, 1],
    ["parking", 81, -1],
    ["music", 74, 0],
    ["cheap", 70, 1],
    ["queue", 66, -1],
    ["fresh", 63, 1],
    ["app", 61, 0],
    ["barista", 58, 0],
    ["pastry", 55, 0],
    ["cold", 52, -1],
    ["seats", 50, 0],
    ["late", 47, -1],
    ["aroma", 44, 1],
    ["view", 40, 1],
    ["noisy", 38, -1],
    ["promo", 36, 1],
    ["bitter", 33, -1],
    ["warm", 31, 1],
    ["work", 30, 0],
    ["meeting", 28, 0],
    ["dessert", 26, 0],
    ["matcha", 24, 0],
    ["air-con", 22, 0],
    ["rude", 18, -1],
    ["expensive", 17, -1],
    ["spilled", 12, -1],
    ["bathroom", 11, -1],
  ] as [string, number, -1 | 0 | 1][]
).map(([word, n, s]) => ({ word, n, s }));

/** Monthly mentions of four words. */
export const wordMonths = ["slow", "cozy", "delivery", "promo"].map((w, k) => ({
  word: w,
  values: Array.from({ length: 12 }, (_, m) => Math.max(1, Math.round([14, 15, 6, 2][k] + [-(m * 0.6), 0.2 * m, m * 1.1, m === 6 || m === 11 ? 9 : 0][k] + normal(0, 1.6)))),
}));

/** Word counts in dine-in vs delivery reviews. */
export const wordByChannel = [
  ["cozy", 160, 20],
  ["wifi", 150, 14],
  ["music", 66, 8],
  ["seats", 46, 4],
  ["late", 5, 42],
  ["spilled", 1, 11],
  ["cold", 12, 40],
  ["app", 9, 52],
  ["packaging", 4, 36],
  ["fast", 18, 34],
].map(([w, a, b]) => ({ word: w as string, dine: a as number, delivery: b as number }));

/** Words that appear next to each other (pairs, count). */
export const bigrams: [string, string, number][] = [
  ["kopi", "susu", 225],
  ["gula", "aren", 88],
  ["friendly", "staff", 120],
  ["slow", "service", 90],
  ["slow", "wifi", 40],
  ["strong", "coffee", 70],
  ["iced", "coffee", 60],
  ["iced", "latte", 45],
  ["cozy", "place", 80],
  ["long", "queue", 50],
  ["friendly", "barista", 38],
  ["cold", "coffee", 30],
];

/** Phrases that start with "the coffee is …", for a word tree. */
export const wordTree = {
  root: "the coffee is",
  branches: [
    {
      w: "strong",
      n: 64,
      next: [
        ["and smooth", 30],
        ["but bitter", 18],
        ["enough", 16],
      ],
    },
    {
      w: "sweet",
      n: 52,
      next: [
        ["with gula aren", 34],
        ["but too sweet", 18],
      ],
    },
    {
      w: "cold",
      n: 30,
      next: [
        ["on delivery", 22],
        ["and watery", 8],
      ],
    },
    { w: "worth it", n: 26, next: [["for the price", 26]] },
  ],
} as const;

/** Customers who bought coffee, tea and/or food this month, by overlap. */
export const sets = { A: "Coffee", B: "Tea", C: "Food", only: { A: 5200, B: 1100, C: 900 }, AB: 1400, AC: 2100, BC: 600, ABC: 700 };

/** A made-up churn model: one score per customer and whether they actually left. */
export const churn = Array.from({ length: 500 }, () => {
  const left = rand() < 0.22;
  const z = (left ? 0.9 : -0.9) + normal(0, 1);
  return { left, score: round(1 / (1 + Math.exp(-z * 1.4)), 3) };
});
export const featureImportance = [
  { label: "Days since last order", value: 0.31 },
  { label: "Orders per month", value: 0.22 },
  { label: "Average wait", value: 0.14 },
  { label: "Delivery share", value: 0.11 },
  { label: "Promo use", value: 0.09 },
  { label: "Satisfaction", value: 0.08 },
  { label: "Store distance", value: 0.05 },
];
