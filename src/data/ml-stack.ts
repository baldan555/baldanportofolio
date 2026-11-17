/**
 * The Machine Learning toolkit: what the lab is built with, which algorithms were tried where,
 * and how every result was checked. Everything here mirrors ml/train.py and the exported model JSON.
 */
import credit from "./models/credit-risk.json";
import bike from "./models/demand-forecasting.json";
import heart from "./models/heart-failure.json";
import insurance from "./models/insurance-fraud.json";
import machine from "./models/manufacturing-defects.json";
import telco from "./models/telco-churn.json";
import { cardWeight, mlProjects } from "./skills";

const liveCount = mlProjects.filter((p) => p.status === "live").length;

/** Logo keys map to simple-icons exports in components/skills/ml-stack.tsx; `lucide` falls back to a line icon. */
export type StackTool = { name: string; logo?: string; lucide?: "database" | "sheet" | "chart"; version?: string; role: string };
export type StackStage = { title: string; line: string; tools: StackTool[] };

export const stackStages: StackStage[] = [
  {
    title: "Open data",
    line: `${liveCount} public datasets, each with its source and licence on the project page.`,
    tools: [
      { name: "UCI ML Repository", lucide: "database", version: "7 sets", role: "Air quality, German credit, bike sharing, heart failure, AI4I, online retail, student grades" },
      { name: "GitHub", logo: "siGithub", version: "6 sets", role: "IBM telco churn, Numenta taxi data, PolyAI BANKING77, and public mirrors of bank, mall and insurance data" },
      { name: "Kaggle", logo: "siKaggle", version: "1 set", role: "Home of the ULB card-fraud data (loaded from TensorFlow's public copy)" },
      { name: "MineThatData", lucide: "database", version: "1 set", role: "Kevin Hillstrom's randomised e-mail test (2008)" },
      { name: "Journal of Statistics Education", lucide: "database", version: "1 set", role: "Ames housing sales, published for teaching (2011)" },
      { name: "OpenML", lucide: "database", version: "1 set", role: "Women's clothing reviews, CC0 public domain" },
      { name: "openpyxl", lucide: "sheet", version: "3.1", role: "Reads the Excel files some datasets ship as" },
    ],
  },
  {
    title: "Train in Python",
    line: "One reproducible script cleans, compares and validates every model.",
    tools: [
      { name: "Python", logo: "siPython", version: "3.12", role: "ml/train.py: one function per project" },
      { name: "pandas", logo: "siPandas", version: "3.1", role: "Cleaning, joins, time features, EDA tables" },
      { name: "NumPy", logo: "siNumpy", version: "2.5", role: "Vector maths, robust statistics, histograms" },
      { name: "scikit-learn", logo: "siScikitlearn", version: "1.9", role: "Pipelines, TF-IDF, models, cross-validation, metrics" },
      { name: "SciPy", logo: "siScipy", version: "1.18", role: "Sparse matrices, and the HiGHS solver behind quantile regression" },
    ],
  },
  {
    title: "Export",
    line: "Models become small JSON files: coefficients, tree nodes, neighbour lists, chart data.",
    tools: [{ name: "JSON", logo: "siJson", version: `${liveCount} files`, role: `About 1.5 MB for all ${liveCount} projects, charts included` }],
  },
  {
    title: "Run in your browser",
    line: "The same maths re-implemented in TypeScript, so every demo works with no server.",
    tools: [
      { name: "TypeScript", logo: "siTypescript", version: "5.9", role: "Re-runs logistic, linear, tree, similarity and text models" },
      { name: "React", logo: "siReact", version: "19", role: "Interactive demos and sample tables" },
      { name: "Next.js", logo: "siNextdotjs", version: "16", role: "Every project page prerendered as static HTML" },
      { name: "Framer Motion", logo: "siFramer", version: "14", role: "Transitions and animated results" },
      { name: "Tailwind CSS", logo: "siTailwindcss", version: "4", role: "Layout and design tokens" },
      { name: "SVG charts", lucide: "chart", role: "Every chart drawn by hand: no chart library" },
    ],
  },
];

/** Column order for the model matrix follows the lab. */
export type MlAlgo = { name: string; family: string; line: string; tried: string[]; chosen: string[] };

export const mlAlgos: MlAlgo[] = [
  {
    name: "Logistic Regression",
    family: "Linear · classification",
    line: "A weighted sum turned into a probability. Every weight is readable, and it runs in the browser as one dot product.",
    tried: ["telco-churn", "heart-failure", "credit-risk", "manufacturing-defects", "bank-churn", "insurance-fraud", "bank-fraud", "complaint-router", "uplift-promo", "feedback-themes"],
    chosen: ["telco-churn", "heart-failure", "credit-risk", "bank-churn", "insurance-fraud", "bank-fraud", "complaint-router", "feedback-themes"],
  },
  {
    name: "Ridge Regression",
    family: "Linear · regression",
    line: "Linear regression with a penalty that keeps weights small; the penalty is tuned by cross-validation.",
    tried: ["student-performance", "demand-forecasting", "air-quality", "house-price-range"],
    chosen: ["student-performance", "demand-forecasting", "air-quality"],
  },
  {
    name: "Quantile regression",
    family: "Linear · intervals",
    line: "Fits the 10th, 50th and 90th percentile instead of the average, so the answer is a range; conformal calibration keeps that range honest.",
    tried: ["house-price-range"],
    chosen: ["house-price-range"],
  },
  {
    name: "Decision Tree",
    family: "Tree · rules",
    line: "A short flowchart of yes/no questions, kept to depth 3–5 so a person can follow every path.",
    tried: ["manufacturing-defects", "insurance-fraud"],
    chosen: ["manufacturing-defects"],
  },
  {
    name: "Linear SVM",
    family: "Linear · margin",
    line: "Draws the widest possible gap between classes. As accurate as logistic regression on words, but gives no probabilities to set a confidence threshold with.",
    tried: ["complaint-router", "feedback-themes"],
    chosen: [],
  },
  {
    name: "Naive Bayes",
    family: "Probabilistic · text",
    line: "Counts which words each class tends to use. The classic fast text baseline, well behind the linear models here.",
    tried: ["complaint-router", "feedback-themes"],
    chosen: [],
  },
  {
    name: "Random Forest",
    family: "Ensemble · bagging",
    line: "Hundreds of trees voting. The strong benchmark the simpler models had to get close to.",
    tried: ["telco-churn", "heart-failure", "credit-risk", "student-performance", "air-quality", "bank-churn", "bank-fraud"],
    chosen: [],
  },
  {
    name: "Gradient Boosting",
    family: "Ensemble · boosting",
    line: "Trees built one after another, each fixing the last one's errors (classic and histogram versions).",
    tried: ["telco-churn", "credit-risk", "manufacturing-defects", "student-performance", "demand-forecasting", "air-quality", "bank-churn", "insurance-fraud", "bank-fraud", "uplift-promo", "house-price-range"],
    chosen: [],
  },
  {
    name: "Uplift meta-learners",
    family: "Causal · uplift",
    line: "T-learner, S-learner and class transformation turn ordinary classifiers into estimates of how much an action changes someone. The shipped T-learner is three logistic models.",
    tried: ["uplift-promo"],
    chosen: ["uplift-promo"],
  },
  {
    name: "K-Means",
    family: "Clustering",
    line: "Groups customers around k centres; k picked with the elbow and silhouette scores.",
    tried: ["mall-segments"],
    chosen: ["mall-segments"],
  },
  {
    name: "Topic model (NMF)",
    family: "Unsupervised · text",
    line: "Factorises thousands of reviews into a few themes, each a weighted set of words, without being told what to look for.",
    tried: ["feedback-themes"],
    chosen: ["feedback-themes"],
  },
  {
    name: "Robust z-score",
    family: "Statistics · anomaly",
    line: "Each hour against its usual weekday-hour median, scaled by the median absolute deviation, so anomalies can't bend the baseline.",
    tried: ["nyc-taxi-anomaly"],
    chosen: ["nyc-taxi-anomaly"],
  },
  {
    name: "Item-item cosine similarity",
    family: "Recommendation",
    line: "Products that keep landing in the same baskets, normalised so best sellers don't win by default.",
    tried: ["product-recommender"],
    chosen: ["product-recommender"],
  },
  {
    name: "Association rules",
    family: "Recommendation",
    line: "Confidence and lift from market-basket analysis. Tested side by side, beaten by cosine.",
    tried: ["product-recommender"],
    chosen: [],
  },
  {
    name: "Baseline rules",
    family: "Sanity check",
    line: "Predict the average, repeat last week, suggest best sellers, use one column: a model has to beat these first.",
    tried: ["student-performance", "demand-forecasting", "product-recommender", "insurance-fraud", "house-price-range"],
    chosen: [],
  },
];

export type Check = { name: string; detail: string; slugs: string[] };
export type CheckGroup = { title: string; line: string; icon: "split" | "scale" | "shield" | "flag"; checks: Check[] };

const repeats = (v: string) => Number(v.match(/\((\d+) repeats\)/)?.[1] ?? 0);

const hobbies = insurance.comparison.find((c) => c.model === "Logistic Regression" && c.features === "+ hobbies")!;
const claimFacts = insurance.comparison.find((c) => c.model === "Logistic Regression" && c.features === "claim facts")!;

export const checkGroups: CheckGroup[] = [
  {
    title: "Split honestly",
    line: "Test on data the model has never seen, the way it will meet the future.",
    icon: "split",
    checks: [
      { name: "Hold-out test set", detail: `Touched once: ${Math.round((1 - telco.split.test_size) * 100)}/${Math.round(telco.split.test_size * 100)} split, ${machine.split.train.toLocaleString("en-US")} / ${machine.split.test.toLocaleString("en-US")} machines, the authors' fixed split for text`, slugs: ["telco-churn", "manufacturing-defects", "complaint-router", "feedback-themes"] },
      { name: "Tuned on training data only", detail: "Regularisation picked by cross-validation before the test set is opened", slugs: ["complaint-router", "student-performance", "feedback-themes"] },
      { name: "Repeated stratified CV", detail: `5-fold, repeated ${repeats(heart.validation)}× and ${repeats(credit.validation)}×: stable scores on small data`, slugs: ["heart-failure", "credit-risk"] },
      { name: "Out-of-fold scores", detail: "Every row scored by a model that never trained on it", slugs: ["bank-churn", "insurance-fraud", "uplift-promo"] },
      { name: "Randomised control group", detail: "Uplift is only ever measured against customers who were randomly left out", slugs: ["uplift-promo"] },
      { name: "Time split", detail: "Learn from the past, test on what came after", slugs: ["air-quality", "bank-fraud", "product-recommender", "house-price-range"] },
      { name: "Calibrated uncertainty", detail: "A conformal offset from a separate year, so an 80% range covers about 80%", slugs: ["house-price-range"] },
      { name: "Rolling backtest", detail: `${bike.backtest.origins} forecast origins × ${bike.backtest.horizon} days ahead`, slugs: ["demand-forecasting"] },
    ],
  },
  {
    title: "Price the mistakes",
    line: "A missed fraud and a false alarm don't cost the same, so the metric shouldn't pretend they do.",
    icon: "scale",
    checks: [
      { name: "Cost-aware threshold", detail: `Bad loan approved costs ${credit.costs.approve_bad}× a good one declined → cut-off ${credit.costs.bayes_threshold.toFixed(2)}`, slugs: ["credit-risk"] },
      { name: "Class weights", detail: `Each fraud weighted ~${cardWeight}× while training`, slugs: ["bank-fraud"] },
      { name: "Review-budget metrics", detail: "Frauds caught in the top N alerts an analyst can check", slugs: ["bank-fraud", "insurance-fraud"] },
      { name: "Gains & lift", detail: "Who to call first when the budget only covers some customers", slugs: ["bank-churn"] },
      { name: "Alert threshold sweep", detail: "Detected events vs false alerts at every cut-off", slugs: ["nyc-taxi-anomaly"] },
      { name: "Confidence threshold", detail: "Act automatically only when the model is sure; hand the rest to a person", slugs: ["complaint-router"] },
      { name: "Budget curves", detail: "Extra visits for every share of the list you can afford to contact", slugs: ["uplift-promo"] },
    ],
  },
  {
    title: "Hunt for leaks & bias",
    line: "A score that looks too good is a question, not a result.",
    icon: "shield",
    checks: [
      { name: "Leaky column dropped", detail: "Follow-up time quietly encodes the outcome", slugs: ["heart-failure"] },
      { name: "Too-good feature rejected", detail: `Hobbies lift AUC from ${claimFacts.roc_auc.toFixed(2)} to ${hobbies.roc_auc.toFixed(2)}: a dataset artifact, not a fraud signal`, slugs: ["insurance-fraud"] },
      { name: "Sensitive fields left out", detail: "Gender, sex and personal profile fields never reach the model", slugs: ["bank-churn", "student-performance", "insurance-fraud", "feedback-themes"] },
      { name: "Atypical rows set aside", detail: "Foreclosures, family sales and linked-property deals aren't market prices", slugs: ["house-price-range"] },
    ],
  },
  {
    title: "Beat a baseline, then explain",
    line: "Prove the model beats a simple rule, then pick the one people can read.",
    icon: "flag",
    checks: [
      { name: "Naive baselines", detail: "Last week's demand, the average grade, best sellers, neighbourhood prices", slugs: ["demand-forecasting", "student-performance", "product-recommender", "house-price-range"] },
      { name: "Response model as a foil", detail: "Ranking by who will act versus by who the action changes", slugs: ["uplift-promo"] },
      { name: "Simpler model kept", detail: "When the gap is small, the readable model ships", slugs: ["telco-churn", "bank-fraud"] },
      { name: "Elbow & silhouette", detail: "Choosing k for clusters with two independent checks", slugs: ["mall-segments"] },
      { name: "Coherence & diversity", detail: "Choosing the number of themes by whether their words really appear together", slugs: ["feedback-themes"] },
      { name: "Explanations in the demo", detail: "Per-prediction drivers, tree paths, 'because you added…', highlighted words", slugs: ["insurance-fraud", "product-recommender", "complaint-router", "feedback-themes"] },
    ],
  },
];

export const mlMetrics = ["ROC-AUC", "Average precision", "F1", "Macro-F1", "Top-3 accuracy", "Frauds in top N", "MAE", "R²", "Silhouette", "Hit@5", "Qini", "Pinball loss", "Interval coverage", "NPMI coherence"];
