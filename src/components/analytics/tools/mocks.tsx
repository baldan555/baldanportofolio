/**
 * Mini interface illustrations, one style per kind of tool (drawn here, generic, not screenshots): what working in it
 * roughly looks like. Small SVG animations (SMIL) give them life without JavaScript.
 */
import type { Mock } from "@/data/analytics-tools";
import p from "@/data/retail-profile.json";

// the numbers inside the drawings come from the cleaned Online Retail data (retail-profile.json)
const N = (v: number) => v.toLocaleString("en-US");
const K = (v: number) => `${(v / 1000).toFixed(1)}k`;
const GBPm = (v: number) => `£${(v / 1e6).toFixed(1)}m`;
const ALL = { orders: p.monthly.reduce((s, m) => s + m.orders, 0), revenue: p.monthly.reduce((s, m) => s + m.revenue, 0) };
const Q4 = p.monthly.filter((m) => m.month >= "2011-09" && m.month <= "2011-11");
const SEPNOV = { orders: Q4.reduce((s, m) => s + m.orders, 0), revenue: Q4.reduce((s, m) => s + m.revenue, 0) };
const cell = (country: string, month: string) => p.pivot.cells.find((c) => c.country === country && c.month === month)?.orders ?? 0;
const NOV = Q4[Q4.length - 1];
const SHORT: Record<string, string> = { "United Kingdom": "UK" };

const W = 300;
const H = 180;
const INK = "#0b0b0b";
const LINE = "rgba(11,11,11,0.1)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const BARS = [0.55, 0.8, 0.4, 0.95, 0.65, 0.75];

const Txt = ({ x, y, s = 7, c = INK, children, w, mono = true }: { x: number; y: number; s?: number; c?: string; children: React.ReactNode; w?: number; mono?: boolean }) => (
  <text x={x} y={y} fontSize={s} fill={c} fontWeight={w} xmlSpace="preserve" fontFamily={mono ? MONO : "ui-sans-serif, system-ui, sans-serif"}>
    {children}
  </text>
);
function Bars({ x, y, w, h, color, n = 6 }: { x: number; y: number; w: number; h: number; color: string; n?: number }) {
  const bw = w / n;
  return (
    <g>
      {BARS.slice(0, n).map((v, i) => (
        <rect key={i} x={x + i * bw + bw * 0.15} y={y + h - v * h} width={bw * 0.7} height={v * h} rx={1.5} fill={color} opacity={0.85}>
          <animate attributeName="height" values={`${v * h * 0.6};${v * h};${v * h * 0.6}`} dur={`${3 + i * 0.4}s`} repeatCount="indefinite" />
          <animate attributeName="y" values={`${y + h - v * h * 0.6};${y + h - v * h};${y + h - v * h * 0.6}`} dur={`${3 + i * 0.4}s`} repeatCount="indefinite" />
        </rect>
      ))}
    </g>
  );
}
const LinePath = ({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) => {
  const pts = [0.6, 0.45, 0.55, 0.3, 0.4, 0.2, 0.28, 0.12];
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x + (i / (pts.length - 1)) * w},${y + v * h}`).join(" ");
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeDasharray="400" strokeDashoffset="0">
      <animate attributeName="stroke-dashoffset" values="400;0;0" dur="4s" repeatCount="indefinite" />
    </path>
  );
};
function Grid({ x, y, cols, rows, cw, rh, head }: { x: number; y: number; cols: number; rows: number; cw: number; rh: number; head?: string }) {
  return (
    <g>
      {Array.from({ length: rows + 1 }, (_, r) => (
        <line key={`r${r}`} x1={x} x2={x + cols * cw} y1={y + r * rh} y2={y + r * rh} stroke={LINE} />
      ))}
      {Array.from({ length: cols + 1 }, (_, c) => (
        <line key={`c${c}`} x1={x + c * cw} x2={x + c * cw} y1={y} y2={y + rows * rh} stroke={LINE} />
      ))}
      {head && <rect x={x} y={y} width={cols * cw} height={rh} fill={head} opacity={0.12} />}
    </g>
  );
}
const Win = ({ children, dark = false, title }: { children: React.ReactNode; dark?: boolean; title?: string }) => (
  <g>
    <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill={dark ? "#14161a" : "#fff"} stroke={LINE} />
    <rect x={0.5} y={0.5} width={W - 1} height={16} rx={10} fill={dark ? "#1e2126" : "#f4f2ee"} />
    {[0, 1, 2].map((i) => (
      <circle key={i} cx={10 + i * 9} cy={8.5} r={2.6} fill={["#ff5f57", "#febc2e", "#28c840"][i]} />
    ))}
    {title && (
      <Txt x={W / 2 - title.length * 2} y={11} s={6.5} c={dark ? "rgba(255,255,255,0.5)" : "rgba(11,11,11,0.45)"}>
        {title}
      </Txt>
    )}
    {children}
  </g>
);
const Cursor = ({ x, y, c = INK }: { x: number; y: number; c?: string }) => (
  <rect x={x} y={y - 7} width={4} height={8} fill={c}>
    <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
  </rect>
);

function Inner({ mock, color, name }: { mock: Mock; color: string; name: string }) {
  switch (mock) {
    case "sql":
      return (
        <Win title={`${name} · query`}>
          <rect x={8} y={22} width={W - 16} height={62} rx={6} fill="#14161a" />
          <Txt x={16} y={38} c="#7cc4ff">
            SELECT <tspan fill="#fff">country, COUNT(DISTINCT invoice_no)</tspan>
          </Txt>
          <Txt x={16} y={50} c="#7cc4ff">
            FROM <tspan fill="#fff">sales</tspan> WHERE <tspan fill="#ffb37c">month = &apos;2011-11&apos;</tspan>
          </Txt>
          <Txt x={16} y={62} c="#7cc4ff">
            GROUP BY <tspan fill="#fff">country</tspan>;
          </Txt>
          <Cursor x={86} y={62} c="#fff" />
          <Grid x={8} y={94} cols={3} rows={4} cw={(W - 16) / 3} rh={18} head={color} />
          {[["country", "orders", "share"], ...p.pivot.countries.map((c) => [c, N(cell(c, "2011-11")), `${Math.round((cell(c, "2011-11") / NOV.orders) * 100)}%`])].map((r, i) =>
            r.map((c, j) => (
              <Txt key={`${i}${j}`} x={14 + j * ((W - 16) / 3)} y={106 + i * 18} w={i ? 400 : 700}>
                {c}
              </Txt>
            )),
          )}
        </Win>
      );
    case "console":
      return (
        <Win title={`${name} · console`}>
          <rect x={0.5} y={17} width={62} height={H - 18} fill="#f6f8fb" />
          {["project", "▸ raw", "▾ marts", "  fct_sales", "  dim_product"].map((t, i) => (
            <Txt key={t} x={6} y={32 + i * 12} s={6.5} c={i === 3 ? color : INK}>
              {t}
            </Txt>
          ))}
          <rect x={70} y={24} width={W - 78} height={40} rx={5} fill="#fff" stroke={LINE} />
          <Txt x={76} y={38}>
            SELECT month, SUM(revenue)
          </Txt>
          <Txt x={76} y={50}>
            FROM marts.fct_sales GROUP BY 1
          </Txt>
          <rect x={70} y={70} width={W - 78} height={14} rx={4} fill={color} opacity={0.15} />
          <Txt x={76} y={80} s={6.5} c={INK}>
            ✓ Query is valid. Runs on the warehouse.
          </Txt>
          <rect x={W - 58} y={70} width={50} height={14} rx={4} fill={color} />
          <Txt x={W - 45} y={80} s={6.5} c="#fff" w={700}>
            RUN
          </Txt>
          <LinePath x={74} y={96} w={W - 86} h={70} color={color} />
        </Win>
      );
    case "cli":
      return (
        <Win dark title={`${name} — terminal`}>
          {[
            "D SELECT month, COUNT(DISTINCT invoice_no) AS orders",
            "  FROM 'sales.parquet' WHERE month >= '2011-09'",
            "  GROUP BY ALL ORDER BY month LIMIT 3;",
            "┌─────────┬────────┐",
            "│ month   │ orders │",
            "├─────────┼────────┤",
            ...Q4.map((m) => `│ ${m.month} │ ${N(m.orders).padStart(6)} │`),
            "└─────────┴────────┘",
          ].map((l, i) => (
            <Txt key={i} x={10} y={30 + i * 14} c={i < 3 ? color : "rgba(255,255,255,0.8)"}>
              {l}
            </Txt>
          ))}
        </Win>
      );
    case "dag": {
      const nodes = [
        [14, 40, "raw_sales"],
        [14, 110, "raw_products"],
        [112, 40, "stg_sales"],
        [112, 110, "stg_products"],
        [210, 75, "fct_sales"],
      ] as const;
      return (
        <Win title={`${name} · lineage`}>
          {[
            [0, 2],
            [1, 3],
            [2, 4],
            [3, 4],
          ].map(([a, b], i) => (
            <g key={i}>
              <path
                d={`M${nodes[a][0] + 76},${nodes[a][1] + 11} C${nodes[a][0] + 90},${nodes[a][1] + 11} ${nodes[b][0] - 14},${nodes[b][1] + 11} ${nodes[b][0]},${nodes[b][1] + 11}`}
                fill="none"
                stroke="rgba(11,11,11,0.3)"
              />
              <circle r={2.5} fill={color}>
                <animateMotion
                  dur="2s"
                  repeatCount="indefinite"
                  begin={`${i * 0.4}s`}
                  path={`M${nodes[a][0] + 76},${nodes[a][1] + 11} C${nodes[a][0] + 90},${nodes[a][1] + 11} ${nodes[b][0] - 14},${nodes[b][1] + 11} ${nodes[b][0]},${nodes[b][1] + 11}`}
                />
              </circle>
            </g>
          ))}
          {nodes.map(([x, y, label], i) => (
            <g key={label}>
              <rect x={x} y={y} width={76} height={22} rx={6} fill={i === 4 ? color : "#fff"} stroke={color} />
              <Txt x={x + 6} y={y + 14} c={i === 4 ? "#fff" : INK}>
                {label}
              </Txt>
              <circle cx={x + 70} cy={y + 5} r={3} fill="#28c840" />
            </g>
          ))}
          <Txt x={14} y={168} s={6.5} c="rgba(11,11,11,0.5)">
            ✓ 5 models built · all tests passed · runs nightly
          </Txt>
        </Win>
      );
    }
    case "grid":
      return (
        <Win title={`${name} · Book1`}>
          <Grid x={8} y={22} cols={6} rows={8} cw={(W - 16) / 6} rh={13} head={color} />
          {["", "A", "B", "C", "D", "E"].map((c, i) => (
            <Txt key={c + i} x={14 + i * ((W - 16) / 6)} y={31} s={6.5} c="rgba(11,11,11,0.5)">
              {c}
            </Txt>
          ))}
          {[1, 2, 3, 4, 5, 6, 7].map((r) => (
            <Txt key={`n${r}`} x={14} y={44 + (r - 1) * 13} s={6.5} c="rgba(11,11,11,0.4)">
              {r}
            </Txt>
          ))}
          {[
            ["Country", "Sep", "Oct", "Nov", "Total"],
            ...p.pivot.countries.map((c) => [SHORT[c] ?? c, ...p.pivot.months.map((m) => N(cell(c, m))), N(p.pivot.months.reduce((t, m) => t + cell(c, m), 0))]),
          ].map((r, i) =>
            r.map((v, j) => (
              <Txt key={`${i}${j}`} x={14 + (j + 1) * ((W - 16) / 6)} y={44 + i * 13} w={i ? 400 : 700}>
                {v}
              </Txt>
            )),
          )}
          <rect x={8 + ((W - 16) / 6) * 2} y={61} width={((W - 16) / 6) * 3} height={13} fill={color} opacity={0.18} />
          <rect x={8 + ((W - 16) / 6) * 5} y={61} width={(W - 16) / 6} height={13} fill="none" stroke={color} strokeWidth={1.6} />
          <Txt x={14} y={140} s={6.5} c="rgba(11,11,11,0.5)">
            E3
          </Txt>
          <Txt x={30} y={140} s={6.5} c={color} w={700}>
            =SUM(B3:D3)
          </Txt>
          <Bars x={170} y={128} w={110} h={44} color={color} n={4} />
        </Win>
      );
    case "notebook":
      return (
        <Win title={`${name} · analysis.ipynb`}>
          <Txt x={10} y={32} s={6.5} c="rgba(11,11,11,0.45)">
            In [3]:
          </Txt>
          <rect x={40} y={23} width={W - 50} height={26} rx={4} fill="#f7f7f7" stroke={LINE} />
          <Txt x={46} y={34} c={color}>
            df.groupby(&apos;month&apos;).orders.sum()
          </Txt>
          <Txt x={46} y={44}>
            .plot(kind=&apos;bar&apos;)
          </Txt>
          <Txt x={10} y={64} s={6.5} c="#c2410c">
            Out[3]:
          </Txt>
          <Bars x={44} y={60} w={W - 60} h={70} color={color} />
          <Txt x={10} y={150} s={6.5} c="rgba(11,11,11,0.45)">
            In [4]:
          </Txt>
          <rect x={40} y={141} width={W - 50} height={16} rx={4} fill="#f7f7f7" stroke={LINE} />
          <Cursor x={46} y={153} />
        </Win>
      );
    case "pbi":
      return (
        <Win title="Report · Sales">
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={8 + i * 70} y={24} width={64} height={30} rx={4} fill="#fff" stroke={LINE} />
              <Txt x={14 + i * 70} y={35} s={6} c="rgba(11,11,11,0.5)">
                {["Revenue", "Orders", "Avg order"][i]}
              </Txt>
              <Txt x={14 + i * 70} y={48} s={9} w={700}>
                {[GBPm(ALL.revenue), K(ALL.orders), `£${Math.round(ALL.revenue / ALL.orders)}`][i]}
              </Txt>
            </g>
          ))}
          <rect x={8} y={60} width={134} height={100} rx={4} fill="#fff" stroke={LINE} />
          <Bars x={14} y={72} w={122} h={80} color={color} />
          <rect x={148} y={60} width={64} height={100} rx={4} fill="#fff" stroke={LINE} />
          <circle cx={180} cy={110} r={22} fill="none" stroke={color} strokeWidth={9} strokeDasharray="90 140" />
          <circle cx={180} cy={110} r={22} fill="none" stroke={INK} strokeWidth={9} strokeDasharray="40 140" strokeDashoffset={-90} opacity={0.7} />
          <rect x={220} y={17} width={79} height={H - 18} fill="#f4f2ee" />
          <Txt x={226} y={30} s={6.5} w={700}>
            Visualizations
          </Txt>
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={226 + (i % 4) * 17} y={36 + Math.floor(i / 4) * 17} width={13} height={13} rx={2} fill={i === 1 ? color : "rgba(11,11,11,0.12)"} />
          ))}
          <Txt x={226} y={100} s={6}>
            Rows: Country
          </Txt>
          <Txt x={226} y={110} s={6}>
            Values: Orders
          </Txt>
          {["Overview", "Products"].map((p, i) => (
            <rect key={p} x={8 + i * 54} y={166} width={50} height={10} rx={2} fill={i ? "rgba(11,11,11,0.08)" : color} opacity={i ? 1 : 0.8} />
          ))}
        </Win>
      );
    case "tableau":
      return (
        <Win title="Sheet 1">
          <rect x={0.5} y={17} width={64} height={H - 18} fill="#f6f6f6" />
          <Txt x={6} y={30} s={6.5} w={700}>
            Data
          </Txt>
          {["Country", "Invoice Date", "Product"].map((t, i) => (
            <Txt key={t} x={6} y={44 + i * 11} s={6.5} c="#1f6fbf">
              {t}
            </Txt>
          ))}
          {["Revenue", "Quantity"].map((t, i) => (
            <Txt key={t} x={6} y={84 + i * 11} s={6.5} c="#138a60">
              {t}
            </Txt>
          ))}
          <rect x={6} y={112} width={52} height={50} rx={3} fill="#fff" stroke={LINE} />
          <Txt x={10} y={122} s={6} w={700}>
            Marks
          </Txt>
          {["Color", "Size", "Label"].map((t, i) => (
            <Txt key={t} x={10} y={134 + i * 9} s={6}>
              ▪ {t}
            </Txt>
          ))}
          {[
            ["Columns", "MONTH(Invoice Date)"],
            ["Rows", "SUM(Revenue)"],
          ].map(([k, v], i) => (
            <g key={k}>
              <Txt x={72} y={30 + i * 16} s={6.5} c="rgba(11,11,11,0.5)">
                {k}
              </Txt>
              <rect x={108} y={22 + i * 16} width={110} height={12} rx={6} fill={i ? "#138a60" : "#1f6fbf"} opacity={0.85} />
              <Txt x={114} y={31 + i * 16} s={6.5} c="#fff">
                {v}
              </Txt>
            </g>
          ))}
          <Bars x={74} y={62} w={W - 84} h={100} color={color} />
        </Win>
      );
    case "looker":
      return (
        <Win title="Sales overview">
          <rect x={8} y={22} width={120} height={14} rx={7} fill="#fff" stroke={LINE} />
          <Txt x={16} y={32} s={6.5}>
            📅 1 Sep – 30 Nov 2011
          </Txt>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={8 + i * 72} y={42} width={66} height={30} rx={4} fill={color} opacity={0.08 + i * 0.03} />
              <Txt x={14 + i * 72} y={53} s={6} c="rgba(11,11,11,0.55)">
                {["Orders", "Revenue", "Avg order", "Best month"][i]}
              </Txt>
              <Txt x={14 + i * 72} y={66} s={9} w={700}>
                {[N(SEPNOV.orders), GBPm(SEPNOV.revenue), `£${Math.round(SEPNOV.revenue / SEPNOV.orders)}`, "Nov"][i]}
              </Txt>
            </g>
          ))}
          <rect x={8} y={78} width={W - 16} height={92} rx={4} fill="#fff" stroke={LINE} />
          <LinePath x={14} y={86} w={W - 28} h={76} color={color} />
        </Win>
      );
    case "metabase":
      return (
        <Win title="New question">
          {[
            ["Data", "Sales"],
            ["Filter", "Invoice date: Sep–Nov 2011"],
            ["Summarize", "Distinct invoices by Country"],
          ].map(([k, v], i) => (
            <g key={k}>
              <Txt x={10} y={32 + i * 26} s={6.5} c={color} w={700}>
                {k}
              </Txt>
              <rect x={10} y={36 + i * 26} width={130} height={14} rx={7} fill={color} opacity={0.15} />
              <Txt x={16} y={46 + i * 26} s={6.5}>
                {v}
              </Txt>
            </g>
          ))}
          <rect x={10} y={116} width={70} height={16} rx={8} fill={color} />
          <Txt x={24} y={127} s={7} c="#fff" w={700}>
            Visualize
          </Txt>
          <rect x={150} y={24} width={W - 158} height={146} rx={6} fill="#fff" stroke={LINE} />
          <Bars x={156} y={40} w={W - 170} h={120} color={color} n={4} />
        </Win>
      );
    case "superset":
      return (
        <Win title="Dashboard">
          <rect x={8} y={22} width={90} height={60} rx={4} fill="#fff" stroke={LINE} />
          <Txt x={14} y={40} s={6} c="rgba(11,11,11,0.5)">
            Orders
          </Txt>
          <Txt x={14} y={62} s={16} w={700} c={color}>
            {K(ALL.orders)}
          </Txt>
          <rect x={104} y={22} width={W - 112} height={60} rx={4} fill="#fff" stroke={LINE} />
          <LinePath x={110} y={28} w={W - 124} h={48} color={color} />
          <rect x={8} y={88} width={W - 16} height={82} rx={4} fill="#fff" stroke={LINE} />
          {Array.from({ length: 28 }, (_, i) => (
            <rect key={i} x={14 + (i % 14) * 19.6} y={96 + Math.floor(i / 14) * 36} width={17} height={32} rx={2} fill={color} opacity={[0.2, 0.5, 0.8, 0.35, 0.65][i % 5]} />
          ))}
        </Win>
      );
    case "connector":
      return (
        <Win title={`${name} · connections`}>
          {["App DB", "Stripe", "Shop CSV"].map((s, i) => (
            <g key={s}>
              <rect x={14} y={30 + i * 44} width={70} height={28} rx={6} fill="#fff" stroke={LINE} />
              <Txt x={22} y={47 + i * 44}>
                {s}
              </Txt>
              <path d={`M84,${44 + i * 44} C130,${44 + i * 44} 150,95 196,95`} fill="none" stroke="rgba(11,11,11,0.2)" />
              <circle r={3} fill={color}>
                <animateMotion dur="1.8s" repeatCount="indefinite" begin={`${i * 0.5}s`} path={`M84,${44 + i * 44} C130,${44 + i * 44} 150,95 196,95`} />
              </circle>
            </g>
          ))}
          <rect x={196} y={74} width={90} height={42} rx={8} fill={color} />
          <Txt x={206} y={92} c="#fff" w={700}>
            Warehouse
          </Txt>
          <Txt x={206} y={106} c="rgba(255,255,255,0.8)" s={6}>
            ✓ synced 2 min ago
          </Txt>
        </Win>
      );
    case "stream":
      return (
        <Win dark title={`${name} · topic: orders`}>
          {[0, 1, 2].map((p) => (
            <g key={p}>
              <Txt x={8} y={44 + p * 44} c="rgba(255,255,255,0.5)" s={6.5}>
                partition {p}
              </Txt>
              <line x1={60} x2={290} y1={40 + p * 44} y2={40 + p * 44} stroke="rgba(255,255,255,0.15)" strokeWidth={14} />
              {[0, 1, 2, 3].map((k) => (
                <rect key={k} x={60} y={34 + p * 44} width={14} height={12} rx={2} fill={["#eb6834", "#2a78d6", "#1baf7a", "#c29a00"][k]}>
                  <animate attributeName="x" values="60;280" dur={`${2.4 + p * 0.5}s`} begin={`${k * 0.6}s`} repeatCount="indefinite" />
                </rect>
              ))}
            </g>
          ))}
          <Txt x={8} y={172} c="#28c840" s={6.5}>
            ▲ events arrive in order, per partition
          </Txt>
        </Win>
      );
    case "cluster":
      return (
        <Win title={`${name} · job`}>
          <rect x={120} y={24} width={60} height={26} rx={6} fill={INK} />
          <Txt x={132} y={40} c="#fff" w={700}>
            driver
          </Txt>
          {[0, 1, 2, 3].map((w) => (
            <g key={w}>
              <line x1={150} y1={50} x2={30 + w * 72 + 30} y2={84} stroke="rgba(11,11,11,0.25)" />
              <rect x={30 + w * 72 - 16} y={84} width={60} height={56} rx={6} fill="#fff" stroke={color} />
              <Txt x={30 + w * 72 - 10} y={96} s={6.5}>
                worker {w + 1}
              </Txt>
              {[0, 1, 2].map((k) => (
                <rect key={k} x={30 + w * 72 - 10 + k * 17} y={104} width={14} height={28} rx={2} fill={color}>
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="1.6s" begin={`${(w + k) * 0.25}s`} repeatCount="indefinite" />
                </rect>
              ))}
            </g>
          ))}
          <Txt x={14} y={166} s={6.5} c="rgba(11,11,11,0.55)">
            one big job split into partitions, run in parallel
          </Txt>
        </Win>
      );
    case "git":
      return (
        <Win title="history · main">
          <line x1={30} x2={30} y1={26} y2={170} stroke={INK} strokeWidth={2} />
          <path d="M30,60 C55,60 55,80 55,90 L55,115 C55,125 55,135 30,140" fill="none" stroke={color} strokeWidth={2} />
          {[
            [30, 34, "Add revenue model", INK],
            [30, 60, "Fix duplicate rows", INK],
            [55, 92, "feat: country dimension", color],
            [55, 115, "test: unique invoice lines", color],
            [30, 140, "Merge pull request #12", INK],
            [30, 164, "Docs: KPI definitions", INK],
          ].map(([x, y, msg, c]) => (
            <g key={msg as string}>
              <circle cx={x as number} cy={y as number} r={5} fill="#fff" stroke={c as string} strokeWidth={2} />
              <Txt x={72} y={(y as number) + 2.5} s={7}>
                {msg as string}
              </Txt>
            </g>
          ))}
        </Win>
      );
    case "doc":
      return (
        <Win title={`${name} · orders`}>
          {[0, 1].map((k) => (
            <g key={k}>
              <rect x={10 + k * 146} y={24} width={136} height={146} rx={6} fill="#fafafa" stroke={LINE} />
              {[
                "{",
                `  _id: "o_${k ? 482 : 481}",`,
                `  country: "${k ? "France" : "UK"}",`,
                "  items: [",
                `    { code: "85123A",`,
                `      qty: ${k ? 2 : 6} },`,
                "  ],",
                k ? '  coupon: "XMAS"' : "",
                "}",
              ].map((l, i) => (
                <Txt key={i} x={16 + k * 146} y={38 + i * 14} s={6.5} c={l.includes(":") ? color : INK}>
                  {l}
                </Txt>
              ))}
            </g>
          ))}
        </Win>
      );
    case "app":
      return (
        <Win title="localhost:8501">
          <rect x={0.5} y={17} width={80} height={H - 18} fill="#f6f6f9" />
          <Txt x={8} y={34} s={6.5} w={700}>
            Filters
          </Txt>
          <Txt x={8} y={50} s={6}>
            Country
          </Txt>
          <rect x={8} y={54} width={64} height={12} rx={3} fill="#fff" stroke={LINE} />
          <Txt x={8} y={80} s={6}>
            Months
          </Txt>
          <line x1={10} x2={70} y1={88} y2={88} stroke="rgba(11,11,11,0.2)" strokeWidth={3} />
          <circle cx={20} cy={88} r={4} fill={color}>
            <animate attributeName="cx" values="20;60;20" dur="4s" repeatCount="indefinite" />
          </circle>
          <Txt x={92} y={36} s={11} w={700} mono={false}>
            Orders dashboard
          </Txt>
          <Bars x={92} y={50} w={W - 104} h={110} color={color} />
        </Win>
      );
    case "panels":
      return (
        <Win dark title="Live orders · last 15 min">
          {[0, 1].map((i) => (
            <g key={i}>
              <rect x={8 + i * 146} y={24} width={138} height={74} rx={4} fill="#1e2126" />
              <LinePath x={14 + i * 146} y={34} w={126} h={56} color={i ? "#28c840" : color} />
            </g>
          ))}
          <rect x={8} y={104} width={138} height={66} rx={4} fill="#1e2126" />
          <circle cx={77} cy={146} r={22} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8} strokeDasharray="104 200" transform="rotate(150 77 146)" />
          <circle cx={77} cy={146} r={22} fill="none" stroke={color} strokeWidth={8} strokeDasharray="70 200" transform="rotate(150 77 146)" />
          <rect x={154} y={104} width={138} height={66} rx={4} fill="#1e2126" />
          <Txt x={162} y={124} c="rgba(255,255,255,0.5)" s={6.5}>
            status
          </Txt>
          <circle cx={168} cy={147} r={5} fill="#28c840">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <Txt x={180} y={152} c="#fff" s={16} w={700}>
            LIVE
          </Txt>
        </Win>
      );
    case "script":
      return (
        <Win dark title="load_sales.py">
          {[
            ["import", " pandas as pd"],
            ["raw", " = pd.read_excel('online_retail.xlsx')"],
            ["raw", "['loaded_at'] = pd.Timestamp.now()"],
            ["raw", ".to_parquet('bronze/sales.parquet')"],
            ["print", "(f'saved {len(raw):,} rows')"],
          ].map(([a, b], i) => (
            <Txt key={i} x={10} y={32 + i * 14} c={color}>
              {a}
              <tspan fill="rgba(255,255,255,0.85)">{b}</tspan>
            </Txt>
          ))}
          <line x1={8} x2={W - 8} y1={110} y2={110} stroke="rgba(255,255,255,0.12)" />
          <Txt x={10} y={126} c="rgba(255,255,255,0.5)">
            $ python load_sales.py
          </Txt>
          <Txt x={10} y={142} c="#28c840">
            saved {N(p.rows)} rows
          </Txt>
          <Cursor x={10} y={158} c="#fff" />
        </Win>
      );
    case "runs": {
      const tasks = ["extract", "load_raw", "dbt_run", "dbt_test", "refresh_bi"];
      return (
        <Win title={`${name} · daily_sales`}>
          <Txt x={10} y={30} s={6.5} c="rgba(11,11,11,0.5)">
            schedule: every day 02:00 · retries: 3
          </Txt>
          {tasks.map((t, r) => (
            <g key={t}>
              <Txt x={10} y={52 + r * 22}>
                {t}
              </Txt>
              {Array.from({ length: 9 }, (_, d) => {
                const last = d === 8;
                const failed = d === 3 && r === 3;
                const skipped = (d === 3 && r === 4) || (last && r > 2);
                return (
                  <rect key={d} x={78 + d * 23} y={42 + r * 22} width={18} height={14} rx={3} fill={failed ? "#e34948" : skipped ? "rgba(11,11,11,0.08)" : "#28c840"} opacity={last ? 1 : 0.75}>
                    {last && r === 3 && <animate attributeName="fill" values="#c9eccd;#28c840;#c9eccd" dur="1.4s" repeatCount="indefinite" />}
                  </rect>
                );
              })}
            </g>
          ))}
          <Txt x={10} y={164} s={6.5} c="rgba(11,11,11,0.5)">
            red: a failed test stopped that night before the dashboard refreshed
          </Txt>
        </Win>
      );
    }
  }
}

/** A drawn mini interface for a kind of tool. */
export function MockUI({ mock, color, name }: { mock: Mock; color: string; name: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Illustration of working in ${name}`}>
      <Inner mock={mock} color={color} name={name} />
    </svg>
  );
}
