/**
 * Checks Air Synth's finger reading on real hands: the ASLNow! landmark files (ml/data/raw/aslnow, see ml/train.py)
 * include hand shapes with a known number of raised fingers, a fist, and a thumb touching the index.
 * Runs the same TypeScript the page uses and writes src/data/models/air-synth.json.
 *
 *   node --experimental-strip-types scripts/check-air-synth.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fingersUp, isFist, tapRatios, tappedFinger } from "../src/lib/air-synth.ts";

const ROOT = "ml/data/raw/aslnow";
const load = (letter) =>
  readdirSync(`${ROOT}/${letter}`)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(`${ROOT}/${letter}/${f}`, "utf8")))
    .filter((h) => h.length === 21);

// ASL letters whose hand shape shows a clear number of raised fingers (thumb included)
const SHAPES = [
  { letter: "A", shape: "Fist, thumb at the side", fingers: 0 },
  { letter: "S", shape: "Fist, thumb across", fingers: 0 },
  { letter: "E", shape: "Fingers curled, thumb tucked", fingers: 0 },
  { letter: "D", shape: "Index up", fingers: 1 },
  { letter: "I", shape: "Pinky up", fingers: 1 },
  { letter: "U", shape: "Index + middle together", fingers: 2 },
  { letter: "V", shape: "Index + middle apart", fingers: 2 },
  { letter: "L", shape: "Thumb + index", fingers: 2 },
  { letter: "Y", shape: "Thumb + pinky", fingers: 2 },
  { letter: "W", shape: "Three fingers", fingers: 3 },
  { letter: "F", shape: "Middle, ring, pinky up; thumb on index", fingers: 3 },
  { letter: "B", shape: "Four fingers, thumb folded", fingers: 4 },
];

const round = (v) => Math.round(v * 10000) / 10000;
const counts = SHAPES.map((s) => {
  const hands = load(s.letter);
  const right = hands.filter((h) => fingersUp(h) === s.fingers).length;
  return { ...s, n: hands.length, acc: round(right / hands.length) };
});
const all = counts.reduce((a, c) => a + c.n, 0);
const right = counts.reduce((a, c) => a + c.acc * c.n, 0);

// fist = mute in theremin mode: should fire on the fists and never on the open shapes
const fists = SHAPES.filter((s) => s.fingers === 0).flatMap((s) => load(s.letter));
const open = SHAPES.filter((s) => s.fingers > 0).flatMap((s) => load(s.letter));
// thumb-to-index tap: F is exactly that; open shapes with the thumb away should not tap
const fHands = load("F");
const away = ["B", "U", "L", "Y"].flatMap(load);

const out = {
  dataset: { name: "ASLNow! fingerspelling", source: "https://huggingface.co/datasets/sid220/asl-now-fingerspelling", license: "MIT", hands: all },
  counts,
  count_acc: round(right / all),
  fist: { hit: round(fists.filter(isFist).length / fists.length), false_alarm: round(open.filter(isFist).length / open.length), n: fists.length + open.length },
  tap: { index_on_f: round(fHands.filter((h) => tappedFinger(-1, tapRatios(h)) === 0).length / fHands.length), false_on_open: round(away.filter((h) => tappedFinger(-1, tapRatios(h)) >= 0).length / away.length), n: fHands.length + away.length },
};
writeFileSync("src/data/models/air-synth.json", JSON.stringify(out, null, 1) + "\n");
console.log(`finger count right on ${(out.count_acc * 100).toFixed(1)}% of ${all} hands`);
for (const c of counts) console.log(`  ${c.letter} ${c.shape.padEnd(40)} ${c.fingers}  ${(c.acc * 100).toFixed(0)}%  (n=${c.n})`);
console.log(`fist: ${(out.fist.hit * 100).toFixed(0)}% of fists, ${(out.fist.false_alarm * 100).toFixed(1)}% false on open hands`);
console.log(`tap: thumb-on-index found on ${(out.tap.index_on_f * 100).toFixed(0)}% of F, false on ${(out.tap.false_on_open * 100).toFixed(1)}% of open hands`);
