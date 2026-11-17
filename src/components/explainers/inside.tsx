"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// one small module per project, so a page only downloads its own model data
const explainers: Record<string, ComponentType> = {
  "telco-churn": dynamic(() => import("./projects/telco-churn").then((m) => m.Inside)),
  "heart-failure": dynamic(() => import("./projects/heart-failure").then((m) => m.Inside)),
  "mall-segments": dynamic(() => import("./projects/mall-segments").then((m) => m.Inside)),
  "nyc-taxi-anomaly": dynamic(() => import("./projects/nyc-taxi-anomaly").then((m) => m.Inside)),
  "bank-churn": dynamic(() => import("./projects/bank-churn").then((m) => m.Inside)),
  "credit-risk": dynamic(() => import("./projects/credit-risk").then((m) => m.Inside)),
  "student-performance": dynamic(() => import("./projects/student-performance").then((m) => m.Inside)),
  "manufacturing-defects": dynamic(() => import("./projects/manufacturing-defects").then((m) => m.Inside)),
  "air-quality": dynamic(() => import("./projects/air-quality").then((m) => m.Inside)),
  "demand-forecasting": dynamic(() => import("./projects/demand-forecasting").then((m) => m.Inside)),
  "bank-fraud": dynamic(() => import("./projects/bank-fraud").then((m) => m.Inside)),
  "insurance-fraud": dynamic(() => import("./projects/insurance-fraud").then((m) => m.Inside)),
  "product-recommender": dynamic(() => import("./projects/product-recommender").then((m) => m.Inside)),
  "complaint-router": dynamic(() => import("./projects/complaint-router").then((m) => m.Inside)),
  "uplift-promo": dynamic(() => import("./projects/uplift-promo").then((m) => m.Inside)),
  "house-price-range": dynamic(() => import("./projects/house-price-range").then((m) => m.Inside)),
  "feedback-themes": dynamic(() => import("./projects/feedback-themes").then((m) => m.Inside)),
  "doodle-duel": dynamic(() => import("./projects/doodle-duel").then((m) => m.Inside)),
  "handwritten-digits": dynamic(() => import("./projects/handwritten-digits").then((m) => m.Inside)),
  "sign-language": dynamic(() => import("./projects/sign-language").then((m) => m.Inside)),
  "live-forecasts": dynamic(() => import("./projects/live-forecasts").then((m) => m.Inside)),
  "bilingual-sentiment": dynamic(() => import("./projects/bilingual-sentiment").then((m) => m.Inside)),
  "virtual-mouse": dynamic(() => import("./projects/virtual-mouse").then((m) => m.Inside)),
  "air-synth": dynamic(() => import("./projects/air-synth").then((m) => m.Inside)),
  "hand-gestures": dynamic(() => import("./projects/hand-gestures").then((m) => m.Inside)),
  "face-mood": dynamic(() => import("./projects/face-mood").then((m) => m.Inside)),
  drowsiness: dynamic(() => import("./projects/drowsiness").then((m) => m.Inside)),
  "head-keyboard": dynamic(() => import("./projects/head-keyboard").then((m) => m.Inside)),
  "traffic-counter": dynamic(() => import("./projects/traffic-counter").then((m) => m.Inside)),
  "object-detection": dynamic(() => import("./projects/object-detection").then((m) => m.Inside)),
};

export function Inside({ slug }: { slug: string }) {
  const E = explainers[slug];
  return E ? <E /> : null;
}
