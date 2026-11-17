"use client";

import model from "@/data/models/handwritten-digits.json";
import { decodeImage, type DigitCnn } from "@/lib/cnn";
import { CnnExplainer, type CnnRow } from "../cnn";

// four ordinary test digits and two the network got wrong
const picked = [...model.samples.filter((s) => s.kind === "random" && [2, 3, 7, 8].includes(s.label)), ...model.samples.filter((s) => s.kind === "mistake").slice(0, 2)];
const rows: CnnRow[] = picked.map((s) => ({ id: s.id, pixels: decodeImage(s.img), label: String(s.label), tag: s.pred === s.label ? `a ${s.label}` : `${s.label}, read as ${s.pred}` }));

export function Inside() {
  return (
    <CnnExplainer
      title="Inside a convolutional network."
      line="Scroll to follow one real test digit through every layer: the feature maps below are computed live in your browser with the network's real weights."
      model={model.model as DigitCnn}
      rows={rows}
      classes={Array.from({ length: 10 }, (_, i) => String(i))}
      entity="digit"
      history={model.history}
      trained={`${model.split.train.toLocaleString("en-US")} handwritten digits`}
      bytes={model.shipped.bytes}
    />
  );
}
