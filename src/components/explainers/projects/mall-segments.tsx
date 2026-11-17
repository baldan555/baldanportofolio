"use client";

import model from "@/data/models/mall-segments.json";
import { KMeansExplainer } from "../kmeans";

type Pt = [number, number];
export const points = model.points as Pt[];
// five real customers as starting centres; from here the replay ends on exactly the shipped segments
export const INIT = [10, 145, 119, 120, 63];

/** Match each replayed centre to the trained segment with the nearest centroid. */
export const names = (centres: Pt[]) =>
  centres.map((c) => {
    const seg = [...model.segments].sort((a, b) => Math.hypot(a.centroid[0] - c[0], a.centroid[1] - c[1]) - Math.hypot(b.centroid[0] - c[0], b.centroid[1] - c[1]))[0];
    return { name: seg.name, size: seg.size };
  });

export function Inside() {
  return (
    <KMeansExplainer
      title="Groups nobody labelled."
      line="K-means finds groups on its own: no right answers to learn from. Scroll to replay it on the 200 real mall customers."
      points={points}
      init={INIT}
      names={names}
      axes={{ x: "Annual income (k$)", y: "Spending score (1–100)", xr: [10, 142], yr: [0, 100] }}
      scores={model.elbow.map((e) => ({ k: e.k, s: e.silhouette }))}
      best={model.best_k}
      entity="customer"
      starts={20}
    />
  );
}
