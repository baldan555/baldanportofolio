/**
 * Build-time code documentation for the project pages. Server only: reads the real source files,
 * so the walkthrough always shows the code that produced the numbers on the page.
 *
 * Python: each training function in ml/train.py is split at `# STEP: <title> | <why>` comment lines.
 * Browser: whole TypeScript functions, picked per project in src/data/code-docs.ts.
 */
import fs from "node:fs";
import path from "node:path";
import { codeDocConfig } from "@/data/code-docs";

export type CodeStep = { title: string; why: string; code: string; lang: "python" | "ts"; file: string; line: number };
export type CodeDoc = {
  file: string;
  fn: string;
  steps: CodeStep[];
  full: string;
  script: string;
  helpers: string[];
  pip: string;
  browser: CodeStep[];
  extra: { file: string; code: string }[];
};

const read = (f: string) => fs.readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), f), "utf8").replace(/\r\n/g, "\n");
const PY_STEP = /^\s*# STEP: (.+?)(?:\s+\|\s+(.+?))?\s*$/;

function trimBlank(lines: string[]) {
  let a = 0;
  let b = lines.length;
  while (a < b && !lines[a].trim()) a++;
  while (b > a && !lines[b - 1].trim()) b--;
  return lines.slice(a, b);
}

function dedent(lines: string[]) {
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(Number.isFinite(ind) ? ind : 0));
}

type Block = { name: string; kind: "def" | "const"; start: number; lines: string[] };

/** Top-level `def name(` and `NAME = ...` blocks of a Python file, each with its source lines. */
function pyBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const d = lines[i].match(/^def (\w+)\(/);
    const c = lines[i].match(/^([A-Z][A-Z0-9_]*)\s*=/);
    if (!d && !c) continue;
    let j = i + 1;
    // a block ends at the next line that starts in column 0 (code or comment), except closing brackets
    while (j < lines.length && (lines[j] === "" || /^[\s)\]}]/.test(lines[j]))) j++;
    blocks.push({ name: (d ?? c)![1], kind: d ? "def" : "const", start: i + 1, lines: trimBlank(lines.slice(i, j)) });
  }
  return blocks;
}

function pythonDoc(fn: string) {
  const file = "ml/train.py";
  const lines = read(file).split("\n");
  const blocks = pyBlocks(lines);
  const target = blocks.find((b) => b.kind === "def" && b.name === fn);
  if (!target) throw new Error(`code-docs: ${fn}() not found in ${file}`);

  // steps: split the function body at the STEP markers
  const steps: CodeStep[] = [];
  let cur: { title: string; why: string; line: number; body: string[] } | null = null;
  target.lines.slice(1).forEach((l, k) => {
    const m = l.match(PY_STEP);
    if (m) {
      if (cur) steps.push({ title: cur.title, why: cur.why, code: dedent(trimBlank(cur.body)).join("\n"), lang: "python", file, line: cur.line });
      cur = { title: m[1], why: m[2] ?? "", line: target.start + k + 2, body: [] };
    } else if (cur) cur.body.push(l);
  });
  if (cur) {
    const c = cur as { title: string; why: string; line: number; body: string[] };
    steps.push({ title: c.title, why: c.why, code: dedent(trimBlank(c.body)).join("\n"), lang: "python", file, line: c.line });
  }
  const full = target.lines.filter((l) => !PY_STEP.test(l)).join("\n");

  // runnable script: imports + paths + every helper the function uses (and the helpers they use)
  const projectFns = new Set(codeDocConfig.projectFunctions);
  const helpers = blocks.filter((b) => !projectFns.has(b.name) && !["ROOT", "RAW", "OUT", "SEED"].includes(b.name));
  const used = new Set<string>();
  const visit = (src: string) => {
    for (const h of helpers) {
      if (used.has(h.name)) continue;
      const re = h.kind === "def" ? new RegExp(`(?<![\\w.])${h.name}\\(`) : new RegExp(`\\b${h.name}\\b`);
      if (re.test(src)) {
        used.add(h.name);
        visit(h.lines.join("\n"));
      }
    }
  };
  visit(full);
  const first = lines.findIndex((l) => l.startsWith("from __future__"));
  const rootAt = lines.findIndex((l) => l.startsWith("ROOT ="));
  const seedAt = lines.findIndex((l) => l.startsWith("SEED ="));
  const header = trimBlank(lines.slice(first, rootAt)).join("\n");
  const paths = lines.slice(rootAt, seedAt + 1).join("\n");
  const helperSrc = helpers.filter((h) => used.has(h.name)).map((h) => h.lines.join("\n"));
  const script =
    [
      `"""${fn}() from ml/train.py, with the imports and helpers it needs. Put the dataset under ml/data/raw/ first."""`,
      header,
      paths,
      ...helperSrc,
      full,
      `if __name__ == "__main__":\n    ${fn}()`,
    ].join("\n\n\n") + "\n";

  const pkgs = ["numpy", "pandas", "scikit-learn"];
  if (/\bscipy\b|ndimage|QuantileRegressor/.test(full)) pkgs.push("scipy");
  if (/\bkeras\b|tensorflow/.test(full)) pkgs.push("tensorflow");
  return { file, fn, steps, full, script, helpers: [...used], pip: `pip install ${pkgs.join(" ")}` };
}

/** A whole TypeScript function (`export function name(` ... closing brace in column 0). */
function tsFunction(file: string, fn: string) {
  const lines = read(file).split("\n");
  const at = lines.findIndex((l) => new RegExp(`^(export )?(async )?function ${fn}\\b`).test(l));
  if (at < 0) throw new Error(`code-docs: ${fn} not found in ${file}`);
  let start = at;
  while (start > 0 && /^\s*(\*|\/\*\*|\/\/)/.test(lines[start - 1])) start--; // keep its doc comment
  let end = at;
  while (end < lines.length && lines[end] !== "}") end++;
  return { code: lines.slice(start, end + 1).join("\n"), line: start + 1 };
}

export function getCodeDoc(slug: string, code: string): CodeDoc | null {
  const cfg = codeDocConfig.projects[slug];
  const fn = code.match(/(\w+)\(\)/)?.[1];
  const py = fn && codeDocConfig.projectFunctions.includes(fn) ? pythonDoc(fn) : null;
  const browser = (cfg?.browser ?? []).map((b) => {
    const t = tsFunction(b.file, b.fn);
    return { title: b.title, why: b.why, code: t.code, lang: "ts" as const, file: b.file, line: t.line };
  });
  const extra = (cfg?.extra ?? []).map((f) => ({ file: f, code: read(f).trimEnd() }));
  if (!py && !browser.length) return null;
  return {
    file: py?.file ?? cfg?.browser?.[0]?.file ?? "",
    fn: py?.fn ?? "",
    steps: py?.steps ?? [],
    full: py?.full ?? "",
    script: py?.script ?? "",
    helpers: py?.helpers ?? [],
    pip: py?.pip ?? "",
    browser,
    extra,
  };
}
