/**
 * A small multi-object tracker and line counter for the Traffic Counter (my own code, on top of the detector's boxes).
 * Tracks are matched to new detections greedily by IoU against each track's predicted box (last box + velocity);
 * a track is confirmed after a couple of hits and dropped after several misses. A confirmed track is counted once,
 * with its direction, when its centre crosses the counting line segment.
 */
export type Box = { x: number; y: number; w: number; h: number }; // pixels, top-left origin
export type Det = Box & { cls: string; score: number };
export type Track = {
  id: number;
  box: Box;
  vx: number;
  vy: number;
  cls: string;
  votes: Record<string, number>;
  hits: number;
  misses: number;
  trail: { x: number; y: number }[];
  counted: false | "+" | "-";
};
export type Line = { x1: number; y1: number; x2: number; y2: number }; // pixels

export const TRACK = { iouMin: 0.2, confirmHits: 2, maxMisses: 8, trail: 24 };
// cars, buses and trucks are often relabelled frame to frame; they may match each other, the label is a majority vote
const GROUP: Record<string, string> = { car: "vehicle", bus: "vehicle", truck: "vehicle", motorcycle: "two-wheeler", bicycle: "two-wheeler", person: "person" };

export function iou(a: Box, b: Box) {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
}

const centre = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
/** Which side of the line a point is on (sign of the cross product). */
const side = (l: Line, p: { x: number; y: number }) => Math.sign((l.x2 - l.x1) * (p.y - l.y1) - (l.y2 - l.y1) * (p.x - l.x1));

/** Do segments p→q and the counting line intersect? (so crossings beyond the line's ends don't count) */
function crosses(l: Line, p: { x: number; y: number }, q: { x: number; y: number }) {
  const s1 = side(l, p);
  const s2 = side(l, q);
  if (s1 === 0 || s2 === 0 || s1 === s2) return 0;
  const m: Line = { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
  const a = side(m, { x: l.x1, y: l.y1 });
  const b = side(m, { x: l.x2, y: l.y2 });
  return a !== b ? (s2 > s1 ? 1 : -1) : 0;
}

export type Crossing = { id: number; cls: string; dir: "+" | "-" };

export class Tracker {
  tracks: Track[] = [];
  private next = 1;

  reset() {
    this.tracks = [];
    this.next = 1;
  }

  /** One frame: match, update, create, drop, and report the line crossings that happened in this frame. */
  update(dets: Det[], line: Line | null): Crossing[] {
    const pred = this.tracks.map((t) => ({ ...t.box, x: t.box.x + t.vx, y: t.box.y + t.vy }));
    const pairs: { t: number; d: number; v: number }[] = [];
    this.tracks.forEach((t, ti) =>
      dets.forEach((d, di) => {
        if (GROUP[t.cls] !== GROUP[d.cls]) return;
        const v = iou(pred[ti], d);
        if (v >= TRACK.iouMin) pairs.push({ t: ti, d: di, v });
      }),
    );
    pairs.sort((a, b) => b.v - a.v);
    const usedT = new Set<number>();
    const usedD = new Set<number>();
    const crossings: Crossing[] = [];
    for (const { t, d } of pairs) {
      if (usedT.has(t) || usedD.has(d)) continue;
      usedT.add(t);
      usedD.add(d);
      const tr = this.tracks[t];
      const det = dets[d];
      const before = centre(tr.box);
      const after = centre(det);
      tr.vx = 0.6 * tr.vx + 0.4 * (after.x - before.x);
      tr.vy = 0.6 * tr.vy + 0.4 * (after.y - before.y);
      tr.box = { x: det.x, y: det.y, w: det.w, h: det.h };
      tr.votes[det.cls] = (tr.votes[det.cls] ?? 0) + det.score;
      tr.cls = Object.entries(tr.votes).sort((a, b) => b[1] - a[1])[0][0];
      tr.hits++;
      tr.misses = 0;
      tr.trail = [...tr.trail.slice(-(TRACK.trail - 1)), after];
      if (line && !tr.counted && tr.hits >= TRACK.confirmHits) {
        const c = crosses(line, before, after);
        if (c) {
          tr.counted = c > 0 ? "+" : "-";
          crossings.push({ id: tr.id, cls: tr.cls, dir: tr.counted });
        }
      }
    }
    this.tracks.forEach((t, i) => {
      if (usedT.has(i)) return;
      t.misses++;
      t.box = { ...t.box, x: t.box.x + t.vx, y: t.box.y + t.vy }; // coast on the last velocity
    });
    dets.forEach((d, i) => {
      if (usedD.has(i)) return;
      this.tracks.push({ id: this.next++, box: { x: d.x, y: d.y, w: d.w, h: d.h }, vx: 0, vy: 0, cls: d.cls, votes: { [d.cls]: d.score }, hits: 1, misses: 0, trail: [centre(d)], counted: false });
    });
    this.tracks = this.tracks.filter((t) => t.misses <= TRACK.maxMisses);
    return crossings;
  }

  /** Tracks worth drawing: confirmed and seen recently. */
  visible() {
    return this.tracks.filter((t) => t.hits >= TRACK.confirmHits && t.misses <= 2);
  }
}
