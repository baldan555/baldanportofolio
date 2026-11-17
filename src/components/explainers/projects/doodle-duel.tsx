"use client";

import model from "@/data/models/doodle-duel.json";
import { decodeImage, type DigitCnn } from "@/lib/cnn";
import { CnnExplainer, type CnnRow } from "../cnn";

// the real test doodles exported with the model (used to check the browser against Python)
const rows: CnnRow[] = model.check.imgs.map((img, i) => {
  const probs = model.check.probs[i];
  const top = probs.indexOf(Math.max(...probs));
  return { id: `Doodle ${i + 1}`, pixels: decodeImage(img), tag: `guessed ${model.categories[top]}` };
});

export function Inside() {
  return (
    <CnnExplainer
      title="Inside the doodle guesser."
      line="The network behind the game is a small convolutional network. Scroll to follow a real test doodle through every layer, computed live with its real weights."
      model={model.model as DigitCnn}
      rows={rows}
      classes={model.categories}
      entity="doodle"
      history={model.history}
      trained={`${model.split.train.toLocaleString("en-US")} doodles`}
      bytes={model.shipped.bytes}
    />
  );
}
