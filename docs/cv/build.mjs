// Builds every CV template from data.mjs and prints them to PDF with headless Chrome.
//   node docs/cv/build.mjs            (from the project folder; set CHROME=... if Chrome lives elsewhere)
// Output: public/cv/*.pdf (the site's download picker) and public/cv-baldanullah.pdf (the international one, old link).
// The international template is the hand-tuned docs/cv/cv.html; the others are generated here.
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { en, id, person as P } from "./data.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT_HTML = join(HERE, "out");
const OUT_PDF = join(ROOT, "public", "cv");
mkdirSync(OUT_HTML, { recursive: true });
mkdirSync(OUT_PDF, { recursive: true });

/* ---------------------------------------------------------------- helpers */
const esc = (s) => String(s).replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const span = (from, to, style = "long") => {
  const f = (d) =>
    style === "euro" ? `${String(d[0]).padStart(2, "0")}/${d[1]}` : style === "short" ? `${MON[d[0] - 1].slice(0, 3)} ${d[1]}` : style === "id" ? `${BULAN[d[0] - 1]} ${d[1]}` : `${MON[d[0] - 1]} ${d[1]}`;
  const now = style === "euro" ? "CURRENT" : style === "id" ? "Sekarang" : "Present";
  return `${f(from)} – ${to ? f(to) : now}`;
};
const US = [
  ["optimised", "optimized"], ["optimise", "optimize"], ["analysed", "analyzed"], ["analyse", "analyze"], ["modelling", "modeling"],
  ["visualisation", "visualization"], ["Visualisation", "Visualization"], ["organisation", "organization"], ["recognised", "recognized"],
  ["Analysed", "Analyzed"], ["Optimised", "Optimized"], ["behaviour", "behavior"], ["Behaviour", "Behavior"],
];
const toUS = (s) => US.reduce((t, [a, b]) => t.replaceAll(a, b), s);
const link = (href, text = href) => `<a class="u" href="${href.startsWith("http") || href.startsWith("mailto") ? href : `https://${href}`}">${esc(text)}</a>`;
const ul = (items, f = rich) => `<ul>${items.map((x) => `<li>${f(x)}</li>`).join("")}</ul>`;

const BASE = `
  @font-face { font-family: "Geist"; font-weight: 100 900; src: url("../fonts/geist-latin.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
  @font-face { font-family: "Geist"; font-weight: 100 900; src: url("../fonts/geist-latin-ext.woff2") format("woff2"); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+20A0-20AB, U+20AD-20C0; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: "Geist", "Segoe UI", Arial, sans-serif; color: #2b2b2b; }
  a { color: inherit; text-decoration: none; }
  a.u { text-decoration: underline; text-underline-offset: 1.5pt; text-decoration-thickness: 0.5pt; }
  b { color: #111; font-weight: 650; }
  ul { margin: 2pt 0 0; padding-left: 11pt; }
  li { margin: 1pt 0; text-align: justify; }
  li::marker { color: #777; }
  .item { break-inside: avoid; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 10pt; }
  .muted { color: #666; }
  p { margin: 0; }
  .contact { display: flex; flex-wrap: wrap; justify-content: center; row-gap: 1pt; }
  .contact span { white-space: nowrap; }
`;
const page = (title, css, body, lang = "en") => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${BASE}${css}</style></head><body>${body}</body></html>`;

/* ---------------------------------------------------------------- Australia: resume with responsibilities + key achievements, referees */
function australia() {
  const css = `
    @page { size: A4; margin: 13mm 15mm; }
    body { font-size: 9.3pt; line-height: 1.38; }
    header { border-left: 4pt solid #0f8a5f; padding-left: 10pt; }
    h1 { margin: 0; font-size: 22pt; letter-spacing: 0.01em; color: #111; font-weight: 750; }
    .title { font-size: 11pt; font-weight: 600; color: #0f8a5f; margin-top: 1pt; }
    .contact { margin-top: 4pt; font-size: 8.8pt; justify-content: flex-start; }
    .contact span + span::before { content: "·"; margin: 0 5pt; color: #999; }
    h2 { margin: 12pt 0 5pt; font-size: 10.5pt; font-weight: 750; color: #111; text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 2pt; border-bottom: 1pt solid #0f8a5f; break-after: avoid; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2pt 12pt; margin: 0; padding-left: 11pt; }
    .grid li { margin: 0; text-align: left; }
    .job { margin-bottom: 8pt; }
    .role { font-weight: 700; font-size: 10pt; color: #111; }
    .date { font-weight: 650; color: #111; white-space: nowrap; }
    .label { margin-top: 3pt; font-size: 8.4pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #0f8a5f; }
    .proj { margin: 3pt 0; text-align: left; }
    .skills p { margin: 2pt 0; }
  `;
  const jobs = en.jobs
    .map(
      (j) => `<div class="job item">
      <div class="row"><div class="role">${esc(j.role)} <span class="muted" style="font-weight:400">(${esc(j.type)})</span></div><div class="date">${span(j.from, j.to)}</div></div>
      <div class="row"><div class="muted">${esc(j.org)}${j.orgNote ? ` · ${esc(j.orgNote)}` : ""}</div><div class="muted">${esc(j.where)}</div></div>
      <div class="label">Responsibilities</div>${ul(j.dutiesAu ?? j.duties.slice(0, 3))}
      ${j.wins.length ? `<div class="label">Key achievements</div>${ul(j.wins)}` : ""}
    </div>`,
    )
    .join("");
  const body = `
    <header>
      <h1>${esc(P.name)}</h1>
      <div class="title">${esc(P.title)}</div>
      <div class="contact"><span>${esc(P.location)}</span><span>${esc(P.phone)}</span><span>${link(`mailto:${P.email}`, P.email)}</span></div>
      <div class="contact" style="margin-top:1pt"><span>${link(P.linkedin)}</span><span>${link(P.github)}</span><span>Portfolio: ${link(P.portfolio)}</span></div>
    </header>
    <h2>Career Summary</h2><p style="text-align:justify">${rich(en.summary)}</p>
    <h2>Key Skills</h2><ul class="grid">${en.keySkills.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    <h2>Professional Experience</h2>${jobs}
    <h2>Selected Projects</h2>
    ${en.projects.map((p) => `<p class="proj"><b>${esc(p.name)}</b> — ${rich(p.text)} <span class="muted">${esc(p.stack)} · ${link(p.link)}${p.repo ? ` · ${link(p.repo)}` : ""}</span></p>`).join("")}
    <p class="proj"><b>Machine learning:</b> ${esc(en.ml)}</p>
    <p class="proj"><b>Deep learning &amp; computer vision:</b> ${esc(en.dl)}</p>
    <p class="proj"><b>Virtual experiences:</b> ${esc(en.virtual)}</p>
    <h2>Education</h2>
    ${en.education.map((e) => `<div class="item" style="margin-bottom:6pt"><div class="row"><div class="role">${esc(e.title)}</div><div class="date">${span(e.from, e.to)}</div></div><div class="row"><div class="muted">${esc(e.org)}</div><div class="muted">${esc(e.where)}</div></div>${ul(e.bullets)}</div>`).join("")}
    <h2>Professional Development</h2><p style="text-align:justify">${esc(en.courses)}</p>
    <h2>Certifications</h2>
    ${en.certs.map(([n, o, f, t]) => `<div class="row"><div><b>${esc(n)}</b> — ${esc(o)}</div><div class="date">${span(f, t)}</div></div>`).join("")}
    <h2>Technical Skills</h2><div class="skills">${en.skills.map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v)}</p>`).join("")}<p><b>Languages:</b> ${esc(en.languages)}</p></div>
    <h2>Referees</h2><p>Available on request.</p>
  `;
  return page(`${P.name} — Resume (Australia)`, css, body, "en-AU");
}

/* ---------------------------------------------------------------- United Kingdom: personal statement, key skills, references on request */
function uk() {
  const css = `
    @page { size: A4; margin: 12mm 15mm; }
    body { font-size: 9pt; line-height: 1.32; }
    header { text-align: center; }
    .kicker { font-size: 8pt; letter-spacing: 0.12em; text-transform: uppercase; color: #777; }
    h1 { margin: 2pt 0 0; font-size: 21pt; color: #111; font-weight: 750; }
    .title { font-size: 10pt; font-weight: 600; color: #333; margin-top: 2pt; }
    .contact { margin-top: 4pt; font-size: 8.6pt; }
    .contact span + span::before { content: "|"; margin: 0 6pt; color: #aaa; }
    h2 { margin: 8pt 0 3.5pt; font-size: 10.2pt; font-weight: 750; color: #1f3a5f; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 0.8pt solid #1f3a5f; padding-bottom: 2pt; break-after: avoid; }
    .ks { display: grid; grid-template-columns: 1fr 1fr; gap: 3pt 14pt; }
    .ks p { text-align: justify; }
    .job { margin-bottom: 6pt; }
    .role { font-weight: 700; font-size: 9.8pt; color: #111; }
    .date { font-weight: 650; color: #111; white-space: nowrap; }
    .proj { margin: 2.5pt 0; text-align: justify; }
  `;
  const body = `
    <header>
      <div class="kicker">Curriculum Vitae</div>
      <h1>${esc(P.name)}</h1>
      <div class="title">${esc(P.title)}</div>
      <div class="contact"><span>${esc(P.location)}</span><span>${esc(P.phone)}</span><span>${link(`mailto:${P.email}`, P.email)}</span></div>
      <div class="contact" style="margin-top:1pt"><span>${link(P.linkedin)}</span><span>${link(P.github)}</span><span>Portfolio: ${link(P.portfolio)}</span></div>
    </header>
    <h2>Personal Statement</h2><p style="text-align:justify">${rich(en.summary)}</p>
    <h2>Key Skills</h2><div class="ks">${en.keySkillsUk.map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v)}</p>`).join("")}</div>
    <h2>Employment History</h2>
    ${en.jobs.map((j) => `<div class="job item"><div class="row"><div class="role">${esc(j.role)} <span class="muted" style="font-weight:400">– ${esc(j.type)}</span></div><div class="date">${span(j.from, j.to)}</div></div><div class="row"><div class="muted">${esc(j.org)}${j.orgNote ? ` · ${esc(j.orgNote)}` : ""}</div><div class="muted">${esc(j.where)}</div></div>${ul(j.duties)}</div>`).join("")}
    <h2>Selected Projects</h2>
    ${en.projects.map((p) => `<p class="proj"><b>${esc(p.name)}</b> — ${rich(p.text)} <span class="muted">${esc(p.stack)}</span></p>`).join("")}
    <p class="proj"><b>Machine learning:</b> ${esc(en.ml)}</p>
    <p class="proj"><b>Deep learning &amp; computer vision:</b> ${esc(en.dl)}</p>
    <h2>Education &amp; Qualifications</h2>
    ${en.education.map((e) => `<div class="item" style="margin-bottom:5pt"><div class="row"><div class="role">${esc(e.title)}</div><div class="date">${span(e.from, e.to)}</div></div><div class="row"><div class="muted">${esc(e.org)}</div><div class="muted">${esc(e.where)}</div></div>${ul(e.bullets)}</div>`).join("")}
    <h2>Certifications &amp; Training</h2>
    ${en.certs.map(([n, o, f, t]) => `<div class="row"><div><b>${esc(n)}</b> — ${esc(o)}</div><div class="date">${span(f, t)}</div></div>`).join("")}
    <p style="margin-top:3pt;text-align:justify"><b>Courses:</b> ${esc(en.courses)}</p>
    <p style="margin-top:2pt;text-align:justify"><b>Virtual experiences:</b> ${esc(en.virtual)}</p>
    <h2>Technical Skills &amp; Languages</h2>${en.skills.map(([k, v]) => `<p style="margin:1.5pt 0;text-align:justify"><b>${esc(k)}:</b> ${esc(v)}</p>`).join("")}
    <p style="margin:1.5pt 0"><b>Languages:</b> ${esc(en.languages)}</p>
    <p style="margin-top:5pt"><i>References available on request.</i></p>
  `;
  return page(`${P.name} — CV (United Kingdom)`, css, body, "en-GB");
}

/* ---------------------------------------------------------------- United States: one-page résumé, Letter, US spelling, no references */
function us() {
  const css = `
    @page { size: Letter; margin: 0.45in 0.55in; }
    body { font-size: 8.7pt; line-height: 1.3; }
    header { text-align: center; }
    h1 { margin: 0; font-size: 19pt; color: #111; font-weight: 750; }
    .title { font-size: 9.6pt; font-weight: 600; color: #333; }
    .contact { margin-top: 2pt; font-size: 8.3pt; }
    .contact span + span::before { content: "|"; margin: 0 5pt; color: #aaa; }
    h2 { margin: 7pt 0 3pt; font-size: 9.6pt; font-weight: 750; color: #111; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 0.8pt solid #111; padding-bottom: 1.5pt; break-after: avoid; }
    .job { margin-bottom: 4pt; }
    .role { font-weight: 700; color: #111; }
    .date { font-weight: 650; color: #111; white-space: nowrap; }
    li { margin: 0.6pt 0; }
    .line { margin: 1.5pt 0; text-align: justify; }
  `;
  const body = `
    <header>
      <h1>${esc(P.name)}</h1>
      <div class="title">${esc(P.title)}</div>
      <div class="contact"><span>Makassar, Indonesia</span><span>${esc(P.phone)}</span><span>${link(`mailto:${P.email}`, P.email)}</span><span>${link(P.linkedin)}</span><span>${link(P.portfolio)}</span></div>
    </header>
    <h2>Summary</h2><p style="text-align:justify">${esc(toUS(en.summaryShort))}</p>
    <h2>Experience</h2>
    ${en.jobs.map((j) => `<div class="job item"><div class="row"><div><span class="role">${esc(j.role)}</span> — ${esc(j.orgUs ?? `${j.org}${j.orgNote ? ` (${j.orgNote})` : ""}`)}, ${esc(j.where.split(",")[0])}</div><div class="date">${span(j.from, j.to, "short")}</div></div>${ul(j.short.map(toUS), esc)}</div>`).join("")}
    <h2>Projects</h2>
    ${en.projects.map((p) => `<p class="line"><b>${esc(p.name)}</b> — ${esc(toUS(p.short))} ${link(p.link)}${p.repo ? ` · ${link(p.repo)}` : ""}</p>`).join("")}
    <p class="line"><b>Machine &amp; deep learning:</b> ${esc(toUS(en.mlShort))}</p>
    <h2>Education</h2>
    <div class="row"><div><b>B.Sc. Computer Science (Data Science)</b>, Universitas Pancasila — GPA 3.76/4.00; thesis on RNN price forecasting</div><div class="date">2020 – 2024</div></div>
    <div class="row"><div><b>Machine Learning Path</b>, Bangkit Academy (Google, GoTo, Traveloka) — capstone deployed to a mobile app</div><div class="date">2023</div></div>
    <h2>Certifications</h2>
    <p class="line">${en.certs.map(([n, o, , t]) => `<b>${esc(n)}</b> (${esc(o)}, valid to ${MON[t[0] - 1].slice(0, 3)} ${t[1]})`).join(" • ")} • Stanford Machine Learning • Google Data Analytics • Azure AI Engineer</p>
    <h2>Skills</h2>
    ${en.skills.slice(0, 6).map(([k, v]) => `<p class="line"><b>${esc(toUS(k))}:</b> ${esc(toUS(v))}</p>`).join("")}
    <p class="line"><b>Languages:</b> ${esc(en.languages)}</p>
  `;
  return page(`${P.name} — Resume (United States)`, css, body, "en-US");
}

/* ---------------------------------------------------------------- Europe: Europass-style, dated left column, CEFR language grid */
function europass() {
  const blue = "#0b3d91";
  const css = `
    @page { size: A4; margin: 12mm 14mm; }
    body { font-size: 8.9pt; line-height: 1.35; }
    header { display: grid; grid-template-columns: auto 1fr; align-items: end; gap: 16pt; padding-bottom: 6pt; border-bottom: 2pt solid ${blue}; }
    h1 { margin: 0; font-size: 20pt; color: ${blue}; font-weight: 750; letter-spacing: 0.01em; white-space: nowrap; }
    .info div { white-space: nowrap; }
    .title { font-size: 10pt; font-weight: 600; color: #333; }
    .info { font-size: 8.4pt; line-height: 1.5; text-align: right; }
    .info b { color: ${blue}; font-weight: 650; }
    h2 { margin: 11pt 0 5pt; font-size: 10pt; font-weight: 750; color: ${blue}; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 8pt; break-after: avoid; }
    h2::after { content: ""; flex: 1; height: 0.8pt; background: ${blue}; opacity: 0.6; }
    .entry { display: grid; grid-template-columns: 92pt 1fr; gap: 10pt; margin-bottom: 7pt; break-inside: avoid; }
    .when { font-size: 8.3pt; color: #555; padding-top: 1pt; }
    .when b { display: block; color: #333; font-weight: 600; }
    .what .role { font-weight: 750; color: #111; font-size: 9.6pt; text-transform: uppercase; letter-spacing: 0.02em; }
    .what .org { color: ${blue}; font-weight: 600; }
    table { border-collapse: collapse; width: 100%; font-size: 8.4pt; margin-top: 3pt; }
    th, td { border: 0.6pt solid #c9d3e6; padding: 3pt 5pt; text-align: center; }
    th { background: #eef2fa; color: ${blue}; font-weight: 650; }
    td.l { text-align: left; font-weight: 650; color: #111; }
    .note { font-size: 7.8pt; color: #666; margin-top: 2pt; }
    .kv p { margin: 1.5pt 0; text-align: justify; }
  `;
  const entry = (when, where, inner) => `<div class="entry"><div class="when"><b>${when}</b>${esc(where)}</div><div class="what">${inner}</div></div>`;
  const body = `
    <header>
      <div><h1>${esc(P.name)}</h1><div class="title">${esc(P.title)}</div></div>
      <div class="info">
        <div><b>Address:</b> ${esc(P.location)} · <b>Phone:</b> ${esc(P.phone)}</div>
        <div><b>Email:</b> ${link(`mailto:${P.email}`, P.email)}</div>
        <div><b>LinkedIn:</b> ${link(P.linkedin)} · <b>GitHub:</b> ${link(P.github)}</div>
        <div><b>Website:</b> ${link(P.portfolio)}</div>
      </div>
    </header>
    <h2>About me</h2><p style="text-align:justify">${rich(en.summary)}</p>
    <h2>Work experience</h2>
    ${en.jobs.map((j) => entry(span(j.from, j.to, "euro"), j.where, `<div class="role">${esc(j.role)}</div><div><span class="org">${esc(j.org)}</span>${j.orgNote ? ` · ${esc(j.orgNote)}` : ""} · ${esc(j.type)}</div>${ul(j.duties)}`)).join("")}
    <h2>Education and training</h2>
    ${en.education.map((e) => entry(span(e.from, e.to, "euro"), e.where, `<div class="role">${esc(e.title)}</div><div class="org">${esc(e.org)}</div>${ul(e.bullets)}`)).join("")}
    ${entry("2022 – 2024", "Online", `<div class="role">Courses</div><p style="text-align:justify">${esc(en.courses)}</p>`)}
    <h2>Language skills</h2>
    <p><b>Mother tongue:</b> Indonesian</p>
    <table>
      <tr><th rowspan="2" style="width:22%">Other language</th><th colspan="2">Understanding</th><th colspan="2">Speaking</th><th rowspan="2">Writing</th></tr>
      <tr><th>Listening</th><th>Reading</th><th>Spoken production</th><th>Spoken interaction</th></tr>
      <tr><td class="l">English</td><td>B2</td><td>B2</td><td>B2</td><td>B2</td><td>B2</td></tr>
    </table>
    <p class="note">Levels on the Common European Framework of Reference (CEFR), from IELTS 6.0 and TOEFL ITP 617 (predicted).</p>
    <h2>Digital skills</h2><div class="kv">${en.skills.map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v)}</p>`).join("")}</div>
    <h2>Projects</h2>
    ${en.projects.map((p) => entry("2026", "", `<div class="role">${esc(p.name.replace(/ \(2026\)/, ""))}</div><p style="text-align:justify">${rich(p.text)}</p><p class="note">${esc(p.stack)} · ${link(p.link)}${p.repo ? ` · ${link(p.repo)}` : ""}</p>`)).join("")}
    ${entry("2023 – 2026", "", `<div class="role">Machine learning &amp; deep learning</div><p style="text-align:justify">${esc(en.ml)}</p><p style="text-align:justify;margin-top:2pt">${esc(en.dl)}</p>`)}
    <h2>Certifications</h2>
    ${en.certs.map(([n, o, f, t]) => entry(span(f, t, "euro"), "", `<div class="role">${esc(n)}</div><div class="org">${esc(o)}</div>`)).join("")}
    <h2>Social and communication skills</h2><p>${esc(en.soft)}</p>
  `;
  return page(`${P.name} — CV (Europe, Europass style)`, css, body, "en");
}

/* ---------------------------------------------------------------- Indonesia: Bahasa Indonesia, same layout as the international CV */
function indonesia() {
  const css = readFileSync(join(HERE, "cv.html"), "utf8").match(/<style>([\s\S]*?)<\/style>/)[1].replace(/url\("fonts\//g, 'url("../fonts/');
  const jobs = en.jobs
    .map(
      (j, i) => `<div class="item">
      <div class="row"><div class="role">${esc(j.role)} <em>– ${j.type === "Intern" ? "Magang" : "Kontrak"}</em></div><div class="date">${span(j.from, j.to, "id")}</div></div>
      <div class="row"><div class="org">${esc(j.org)}${j.orgNote ? ` · ${esc(j.orgNote.replace("placed at", "ditempatkan di").replace("Telkomsel distributor", "distributor Telkomsel"))}` : ""}</div><div class="loc">${esc(j.where)}</div></div>
      ${ul(id.jobs[i].duties)}
    </div>`,
    )
    .join("");
  const body = `
    <header>
      <h1>${esc(P.name)}</h1>
      <div class="title">FULL STACK DATA SCIENTIST</div>
      <div class="contact"><span>${esc(P.location)}</span><span>${esc(P.phone)}</span><span>${link(`mailto:${P.email}`, P.email)}</span><span>${link(P.linkedin)}</span><span>${link(P.github)}</span></div>
      <div class="contact"><span>Portofolio (30+ project live): ${link(P.portfolio)}</span></div>
    </header>
    <p class="summary">${rich(id.summary)}</p>
    <div class="highlights">${id.highlights.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
    <h2>Pengalaman Kerja</h2>${jobs}
    <h2>Proyek Unggulan</h2>
    <div class="sub">Produk sendiri</div>
    ${en.projects.map((p, i) => `<p class="proj"><b>${esc(id.projects[i].name ?? p.name)}</b> — ${rich(id.projects[i].text)} <span class="stack">${esc(p.stack)} · ${link(p.link)}${p.repo ? ` · ${link(p.repo)}` : ""}</span></p>`).join("")}
    <div class="sub">Machine learning (scikit-learn, model berjalan di browser)</div><p class="list">${esc(id.ml)}</p>
    <div class="sub">Deep learning &amp; computer vision (TensorFlow, MediaPipe, di perangkat)</div><p class="list">${esc(id.dl)}</p>
    <p class="list" style="margin-top:4pt"><b>Program virtual:</b> ${esc(id.virtual)}</p>
    <h2>Pendidikan</h2>
    ${en.education
      .map(
        (e, i) => `<div class="item"><div class="row"><div class="role">${esc(id.education[i].title)}</div><div class="date">${span(e.from, e.to, "id")}</div></div><div class="row"><div class="org">${esc(e.org.replace("led by", "dipimpin oleh").replace(" and ", " dan "))}</div><div class="loc">${esc(e.where.replace("South Jakarta", "Jakarta Selatan").replace("Online", "Daring"))}</div></div>${ul(id.education[i].bullets)}</div>`,
      )
      .join("")}
    <div class="item"><div class="role" style="font-size:9.4pt">Kursus</div><p class="list" style="margin:2pt 0 0">${esc(en.courses)}</p></div>
    <h2>Sertifikasi</h2>
    ${en.certs.map(([n, o, f, t], i) => `<div class="two"${i ? ' style="margin-top:2pt"' : ""}><div><b>${esc(n)}</b> — ${esc(o)}</div><div class="date">${span(f, t, "id")}</div></div>`).join("")}
    <h2>Keahlian</h2>
    <div class="skills">${id.skills.map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v)}</p>`).join("")}<p><b>Soft skill:</b> ${esc(id.soft)} <b>Bahasa:</b> ${esc(id.languages)}</p></div>
  `;
  return page(`${P.name} — CV (Bahasa Indonesia)`, css, body, "id");
}

/* ---------------------------------------------------------------- build + print */
const jobs = [
  { id: "international", html: join(HERE, "cv.html") },
  { id: "australia", make: australia },
  { id: "united-kingdom", make: uk },
  { id: "united-states", make: us },
  { id: "europass", make: europass },
  { id: "indonesia", make: indonesia },
];
for (const j of jobs) {
  if (j.make) {
    j.html = join(OUT_HTML, `${j.id}.html`);
    writeFileSync(j.html, j.make());
  }
}

const chrome = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9343;
const proc = spawn(chrome, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--allow-file-access-from-files", `--user-data-dir=${join(OUT_HTML, ".chrome")}`, `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable");
await send("Runtime.enable");
const report = [];
for (const j of jobs) {
  await send("Page.navigate", { url: pathToFileURL(j.html).href });
  await sleep(900);
  await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => 1)", awaitPromise: true });
  const pdf = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true });
  const buf = Buffer.from(pdf.result.data, "base64");
  const out = join(OUT_PDF, `cv-baldanullah-${j.id}.pdf`);
  writeFileSync(out, buf);
  report.push({ template: j.id, pages: (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length, kb: Math.round(buf.length / 1024) });
}
ws.close();
proc.kill();
copyFileSync(join(OUT_PDF, "cv-baldanullah-international.pdf"), join(ROOT, "public", "cv-baldanullah.pdf"));
console.table(report);
process.exit(0);
