import { ImageResponse } from "next/og";

/* The picture shown when the site is shared on LinkedIn, WhatsApp, X or Slack: name, one-line promise and the six
 * skill areas, in the site's own ink-on-cream palette. Generated at build time. */
export const alt = "N.I.S. Baldanullah, Full Stack Data Scientist: data products built end to end";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SKILLS = ["Machine Learning", "Deep Learning & Vision", "Data Analytics & BI", "Data Engineering", "Web, SaaS & Mobile", "Automation & AI Agents"];

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fbfbf9", padding: 64, fontFamily: "sans-serif", color: "#0b0b0b" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28, fontWeight: 700 }}>b</div>
            <div style={{ fontSize: 22, letterSpacing: 4, color: "#8a8a85" }}>BALDANULLAH · PORTFOLIO</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.0, letterSpacing: -3 }}>I build data products,</div>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3, color: "#eb6834" }}>end to end.</div>
            <div style={{ marginTop: 26, fontSize: 30, color: "#2b2b2b" }}>Full Stack Data Scientist · Makassar, Indonesia</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {["Live demos", "Dashboards", "AI agents"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 999, border: "2px solid #0b0b0b", padding: "8px 18px", fontSize: 22 }}>
                {t === "Live demos" && <div style={{ width: 10, height: 10, borderRadius: 999, background: "#19a974" }} />}
                {t}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, width: 432, marginLeft: "auto", alignContent: "center" }}>
          {SKILLS.map((s, i) => (
            <div key={s} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 209, height: 150, borderRadius: 24, padding: 20, background: i % 3 === 1 ? "#f3ede1" : "#0b0b0b", color: i % 3 === 1 ? "#0b0b0b" : "#fff" }}>
              {/* one string: "0{i + 1}" would be two text nodes, which the image renderer rejects outside flex */}
              <div style={{ fontSize: 16, opacity: 0.55 }}>{`0${i + 1}`}</div>
              <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
