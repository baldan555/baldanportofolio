"use client";

import dynamic from "next/dynamic";

/**
 * One chunk per project: each case-study page downloads only its own body (and model JSON).
 * next/dynamic only code-splits inside a Client Component, which is why this map lives here.
 * Pages are still server-rendered; the chunk is preloaded before hydration.
 */
const bodies: Record<string, React.ComponentType> = {
  "telco-churn": dynamic(() => import("../projects/telco").then((m) => m.TelcoBody)),
  "heart-failure": dynamic(() => import("../projects/heart").then((m) => m.HeartBody)),
  "mall-segments": dynamic(() => import("../projects/mall").then((m) => m.MallBody)),
  "nyc-taxi-anomaly": dynamic(() => import("../projects/taxi").then((m) => m.TaxiBody)),
  "credit-risk": dynamic(() => import("../projects/credit").then((m) => m.CreditBody)),
  "manufacturing-defects": dynamic(() => import("../projects/machine").then((m) => m.MachineBody)),
  "student-performance": dynamic(() => import("../projects/student").then((m) => m.StudentBody)),
  "demand-forecasting": dynamic(() => import("../projects/bike").then((m) => m.BikeBody)),
  "air-quality": dynamic(() => import("../projects/air").then((m) => m.AirBody)),
  "bank-churn": dynamic(() => import("../projects/bank").then((m) => m.BankBody)),
  "insurance-fraud": dynamic(() => import("../projects/insurance").then((m) => m.InsuranceBody)),
  "bank-fraud": dynamic(() => import("../projects/fraud").then((m) => m.FraudBody)),
  "product-recommender": dynamic(() => import("../projects/retail").then((m) => m.RetailBody)),
  "complaint-router": dynamic(() => import("../projects/router").then((m) => m.RouterBody)),
  "uplift-promo": dynamic(() => import("../projects/uplift").then((m) => m.UpliftBody)),
  "house-price-range": dynamic(() => import("../projects/house").then((m) => m.HouseBody)),
  "feedback-themes": dynamic(() => import("../projects/feedback").then((m) => m.FeedbackBody)),
  "handwritten-digits": dynamic(() => import("../projects/digits").then((m) => m.DigitsBody)),
  "hand-gestures": dynamic(() => import("../projects/gestures").then((m) => m.GesturesBody)),
  "object-detection": dynamic(() => import("../projects/objects").then((m) => m.ObjectsBody)),
  "live-forecasts": dynamic(() => import("../projects/live").then((m) => m.LiveBody)),
  "bilingual-sentiment": dynamic(() => import("../projects/sentiment").then((m) => m.SentimentBody)),
  "doodle-duel": dynamic(() => import("../projects/doodle").then((m) => m.DoodleBody)),
  "face-mood": dynamic(() => import("../projects/face-mood").then((m) => m.FaceMoodBody)),
  drowsiness: dynamic(() => import("../projects/drowsiness").then((m) => m.DrowsinessBody)),
  "virtual-mouse": dynamic(() => import("../projects/virtual-mouse").then((m) => m.VirtualMouseBody)),
  "sign-language": dynamic(() => import("../projects/sign").then((m) => m.SignBody)),
  "traffic-counter": dynamic(() => import("../projects/traffic").then((m) => m.TrafficBody)),
  "head-keyboard": dynamic(() => import("../projects/head-keyboard").then((m) => m.HeadKeyboardBody)),
  "air-synth": dynamic(() => import("../projects/air-synth").then((m) => m.AirSynthBody)),
};

export function ProjectBody({ slug }: { slug: string }) {
  const Body = bodies[slug];
  return Body ? <Body /> : null;
}
