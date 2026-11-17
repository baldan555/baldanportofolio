// "Explore my skills" — one page per core skill, each with a method and a lab.
// Project numbers come from ml/train.py (see src/data/models/*.json); nothing here is hand-typed metrics.

import air from "./models/air-quality.json";
import bank from "./models/bank-churn.json";
import card from "./models/bank-fraud.json";
import retail from "./models/product-recommender.json";
import router from "./models/complaint-router.json";
import uplift from "./models/uplift-promo.json";
import house from "./models/house-price-range.json";
import feedbackM from "./models/feedback-themes.json";
import credit from "./models/credit-risk.json";
import bike from "./models/demand-forecasting.json";
import heart from "./models/heart-failure.json";
import insurance from "./models/insurance-fraud.json";
import mall from "./models/mall-segments.json";
import machine from "./models/manufacturing-defects.json";
import student from "./models/student-performance.json";
import taxi from "./models/nyc-taxi-anomaly.json";
import telco from "./models/telco-churn.json";

export type Skill = {
  slug: string;
  name: string;
  short: string;
  line: string;
  ready: boolean;
  tags: string[];
};

export const skills: Skill[] = [
  {
    slug: "machine-learning",
    name: "Machine Learning",
    short: "ML",
    line: "Turning history into predictions people can act on.",
    ready: true,
    tags: ["scikit-learn", "Classification", "Clustering", "Anomaly detection"],
  },
  { slug: "deep-learning", name: "Deep Learning & Vision", short: "DL", line: "Neural networks for images, text and time series.", ready: true, tags: ["TensorFlow", "Keras", "CNN"] },
  { slug: "analytics", name: "Data Analytics & BI", short: "BI", line: "Questions answered with SQL, charts and dashboards.", ready: true, tags: ["SQL", "Power BI", "Tableau"] },
  { slug: "data-engineering", name: "Data Engineering", short: "DE", line: "Pipelines that make messy data trustworthy.", ready: true, tags: ["BigQuery", "GCP", "Pipelines"] },
  { slug: "web-mobile", name: "Web, SaaS & Mobile", short: "WEB", line: "Products people log into every day.", ready: true, tags: ["Next.js", "Expo", "FastAPI"] },
  { slug: "automation", name: "Automation & AI Agents", short: "AI", line: "Bots and agents for the repetitive work.", ready: true, tags: ["Playwright", "LLMs", "MCP"] },
];

export const getSkill = (slug: string) => skills.find((s) => s.slug === slug);

/* ------------------------------------------------------------------ */
/* Machine Learning                                                     */
/* ------------------------------------------------------------------ */

export const mlMethod = [
  {
    title: "Frame the problem",
    line: "Turn a business question into a target and one metric everyone agrees on.",
    tools: ["SQL", "Stakeholder notes"],
    seen: { slug: "credit-risk", text: "A 5:1 cost of errors turned into the decision threshold" },
  },
  {
    title: "Explore the data",
    line: "Distributions, gaps and leaks before any model touches it.",
    tools: ["Pandas", "Plotly"],
    seen: { slug: "heart-failure", text: "Dropped the follow-up time column: it leaks the outcome" },
  },
  {
    title: "Engineer features",
    line: "Encode, scale and build the signals a model can actually use.",
    tools: ["scikit-learn Pipelines"],
    seen: { slug: "manufacturing-defects", text: "Power, temperature gap and strain: F1 from 0.43 to 0.89" },
  },
  {
    title: "Train & validate",
    line: "Several models, honest validation, the test set kept for the very end.",
    tools: ["Cross-validation", "Grid search"],
    seen: { slug: "heart-failure", text: "10× repeated 5-fold cross-validation on 299 patients" },
  },
  {
    title: "Explain",
    line: "Choose the model people can read and trust, not just the top score.",
    tools: ["Coefficients", "Feature effects"],
    seen: {
      slug: "telco-churn",
      text: `Logistic regression kept, ${(
        Math.max(...telco.comparison.map((c) => c.roc_auc)) - telco.metrics.roc_auc
      ).toFixed(3)} AUC behind the top model`,
    },
  },
  {
    title: "Ship",
    line: "Export it so anyone can try it, right here in the browser.",
    tools: ["JSON export", "TypeScript"],
    seen: { slug: "mall-segments", text: "Every demo on this page runs without a server" },
  },
];

export type MlCategory = "Classification" | "NLP" | "Causal inference" | "Clustering" | "Anomaly detection" | "Regression" | "Time series" | "Recommendation";

export type MlProject = {
  slug: string;
  title: string;
  category: MlCategory;
  problem: string;
  method: string;
  metric?: { label: string; value: string };
  status: "live" | "rebuilding";
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const upWomen = uplift.curves.womens["T-learner · logistic"];
/** share of the women's e-mail effect kept when only the best-ranked half of the list is e-mailed */
const upHalf = upWomen[10] / upWomen[upWomen.length - 1];
const houseChosen = house.comparison.find((c) => c.model === house.chosen)!;

export const mlProjects: MlProject[] = [
  {
    slug: "telco-churn",
    title: "Telco Customer Churn",
    category: "Classification",
    problem: "Which customers are about to leave?",
    method: "Logistic regression vs random forest vs boosting",
    metric: { label: "ROC-AUC", value: telco.metrics.roc_auc.toFixed(3) },
    status: "live",
  },
  {
    slug: "heart-failure",
    title: "Heart Failure Prediction",
    category: "Classification",
    problem: "Which patients are at higher risk?",
    method: "Logistic regression, repeated cross-validation",
    metric: { label: "ROC-AUC (CV)", value: heart.comparison[0].roc_auc_mean.toFixed(3) },
    status: "live",
  },
  {
    slug: "mall-segments",
    title: "Mall Customer Segments",
    category: "Clustering",
    problem: "What kinds of shoppers does a mall have?",
    method: "K-Means, k picked by silhouette",
    metric: { label: "Silhouette", value: (mall.elbow.find((e) => e.k === mall.best_k)?.silhouette ?? 0).toFixed(3) },
    status: "live",
  },
  {
    slug: "nyc-taxi-anomaly",
    title: "NYC Taxi Anomalies",
    category: "Anomaly detection",
    problem: "When did taxi demand do something unusual?",
    method: "Seasonal baseline + robust z-score",
    metric: {
      label: "Known events found",
      value: (() => {
        const d = taxi.sweep.find((s) => s.threshold === taxi.default_threshold);
        return d ? `${d.detected}/${d.of}` : "";
      })(),
    },
    status: "live",
  },
  {
    slug: "bank-churn",
    title: "Bank Churn Targeting",
    category: "Classification",
    problem: "With a limited budget, which customers should we call first?",
    method: "Engineered logistic regression + gains curve",
    metric: { label: "Leavers reached in top 10%", value: `${Math.round(bank.comparison.find((c) => c.model === bank.chosen)!.top10 * 100)}%` },
    status: "live",
  },
  {
    slug: "credit-risk",
    title: "Credit Risk",
    category: "Classification",
    problem: "Approve or decline: which loans will default?",
    method: "Logistic regression + cost-aware threshold",
    metric: { label: "Cost saved vs 50%", value: `${Math.round((1 - credit.eval.at_bayes.cost / credit.eval.at_half.cost) * 100)}%` },
    status: "live",
  },
  {
    slug: "student-performance",
    title: "Student Performance",
    category: "Regression",
    problem: "Which students need help, before the grades arrive?",
    method: "Ridge regression at three points in the year",
    metric: { label: "MAE at start of year", value: `${student.stages.start.oof_mae.toFixed(2)} pts` },
    status: "live",
  },
  {
    slug: "manufacturing-defects",
    title: "Manufacturing Defects",
    category: "Classification",
    problem: "Which machine runs are about to fail?",
    method: "Physics features + a depth-5 decision tree",
    metric: { label: "F1 on 3% failures", value: machine.metrics.f1.toFixed(3) },
    status: "live",
  },
  {
    slug: "air-quality",
    title: "Air Quality Virtual Sensor",
    category: "Regression",
    problem: "Can five cheap sensors stand in for a lab-grade analyser?",
    method: "Ridge regression, time split + monthly recalibration",
    metric: { label: "MAE on unseen months", value: `${air.comparison.find((c) => c.model === air.chosen)!.time_mae.toFixed(2)} mg/m³` },
    status: "live",
  },
  {
    slug: "demand-forecasting",
    title: "Demand Forecasting",
    category: "Time series",
    problem: "How many bikes will people rent in the next two weeks?",
    method: "Ridge with calendar + weather, rolling backtest",
    metric: {
      label: "Less error vs naive",
      value: `${Math.round((1 - bike.comparison.find((c) => c.model === bike.chosen)!.mae / bike.comparison[0].mae) * 100)}%`,
    },
    status: "live",
  },
  {
    slug: "bank-fraud",
    title: "Card Fraud Review Queue",
    category: "Anomaly detection",
    problem: "One fraud in 578 payments: which alerts should analysts check?",
    method: "Class-balanced logistic regression, time split",
    metric: { label: "Frauds in top 100 alerts", value: `${card.comparison.find((c) => c.model === card.chosen)!.caught["100"]}/${card.split.test_frauds}` },
    status: "live",
  },
  {
    slug: "insurance-fraud",
    title: "Insurance Claim Fraud",
    category: "Classification",
    problem: "Which claims deserve a second look, and which signals can we trust?",
    method: "Logistic score + 3-question tree checklist",
    metric: { label: "Fraud in top 20% reviewed", value: `${Math.round(insurance.eval.gains[19].captured * 100)}%` },
    status: "live",
  },
  {
    slug: "product-recommender",
    title: "Product Recommender",
    category: "Recommendation",
    problem: "Customers who bought this also bought… what should the shop suggest next?",
    method: "Item-to-item cosine similarity, time split",
    metric: { label: "Hidden item in top 5", value: `${(retail.shipped.hit5 * 100).toFixed(1)}%` },
    status: "live",
  },
  {
    slug: "complaint-router",
    title: "Complaint Router",
    category: "NLP",
    problem: "A customer writes in: which of 8 support teams should handle it?",
    method: "TF-IDF character n-grams + logistic regression",
    metric: { label: "Right team", value: `${(router.shipped.team_acc * 100).toFixed(1)}%` },
    status: "live",
  },
  {
    slug: "uplift-promo",
    title: "Uplift Promo Targeting",
    category: "Causal inference",
    problem: "Who should get the e-mail, and which one, so the budget goes to people it actually changes?",
    method: "T-learner uplift model on a randomised test",
    metric: { label: "Women's e-mail effect from half the sends", value: `${Math.round(upHalf * 100)}%` },
    status: "live",
  },
  {
    slug: "house-price-range",
    title: "House Price Range",
    category: "Regression",
    problem: "Not one price but an honest range: what will this house sell for?",
    method: "Quantile regression + conformal calibration",
    metric: { label: "2010 sales inside the 80% range", value: `${(houseChosen.calibrated.coverage * 100).toFixed(1)}%` },
    status: "live",
  },
  {
    slug: "feedback-themes",
    title: "Feedback Themes",
    category: "NLP",
    problem: "What are thousands of reviews actually about, and which themes come with unhappy customers?",
    method: "NMF topic model + logistic tone model",
    metric: { label: "Tone model ROC-AUC", value: feedbackM.shipped.roc_auc.toFixed(3) },
    status: "live",
  },
];

export const mlCategories: MlCategory[] = ["Classification", "NLP", "Causal inference", "Clustering", "Anomaly detection", "Regression", "Time series", "Recommendation"];

/* Case-study copy for the rebuilt projects. Numbers are pulled from the model files. */
export type CaseStudy = {
  slug: string;
  title: string;
  category: string;
  line: string;
  overview: string[];
  process: { title: string; value: string; detail: string }[];
  stats: { label: string; value: string }[];
  problem: string;
  data: { name: string; source?: string; detail: string };
  approach: string[];
  comparison?: { model: string; score: string; note?: string }[];
  comparisonLabel?: string;
  honest: string;
  code: string;
};

const taxiDefault = taxi.sweep.find((s) => s.threshold === taxi.default_threshold)!;

export const caseStudies: CaseStudy[] = [
  {
    slug: "telco-churn",
    title: "Telco Customer Churn",
    category: "Classification",
    line: "Spot the customers who are about to leave, and see why.",
    overview: [
      "Keeping a customer is often cheaper than winning a new one. This project ranks a telco's customers by how likely they are to leave next month, and shows why, so a retention team knows who to call and what to offer.",
      "It uses IBM's public Telco dataset, nine features a team can actually see or act on, and three models compared on the same unseen test set. The simplest model won on clarity without giving up accuracy.",
    ],
    process: [
      { title: "Raw data", value: `${telco.dataset.raw_rows.toLocaleString("en-US")} rows`, detail: `${telco.dataset.raw_cols} columns from IBM's sample table` },
      { title: "Clean", value: `${telco.dataset.rows.toLocaleString("en-US")} rows`, detail: `${telco.dataset.dropped_rows} rows with a blank TotalCharges removed` },
      { title: "Features", value: `${telco.dataset.features_used.length} → ${telco.dataset.encoded_cols} columns`, detail: "Numbers scaled, categories one-hot encoded" },
      { title: "Split", value: `${telco.split.train.toLocaleString("en-US")} / ${telco.split.test.toLocaleString("en-US")}`, detail: "80/20 train and test, churn rate kept equal" },
      { title: "Compare", value: `${telco.comparison.length} models`, detail: "Logistic regression, random forest, boosting" },
      { title: "Predict", value: "0–100%", detail: "Churn probability plus the reasons behind it" },
    ],
    stats: [
      { label: "ROC-AUC", value: telco.metrics.roc_auc.toFixed(3) },
      { label: "Recall", value: pct(telco.metrics.recall) },
      { label: "Customers", value: telco.dataset.rows.toLocaleString("en-US") },
      { label: "Churn rate", value: pct(telco.dataset.churn_rate) },
    ],
    problem:
      "A telco loses about one in four customers. Retention offers cost money, so the team needs a ranked list of who is most likely to churn, plus the reasons, to act early.",
    data: { name: telco.dataset.name, source: telco.dataset.source, detail: `${telco.dataset.rows.toLocaleString("en-US")} customers, ${telco.dataset.features_used.length} features used, 80/20 stratified split.` },
    approach: [
      "Cleaned blank TotalCharges rows and kept 9 features a retention team can actually influence or observe.",
      "Scaled numbers and one-hot encoded categories inside one scikit-learn pipeline, so training and the demo use identical maths.",
      "Compared three models on the same held-out test set.",
      "Kept logistic regression: within a hair of boosting, and every effect is readable.",
    ],
    comparisonLabel: "ROC-AUC on the test set",
    comparison: telco.comparison.map((c) => ({ model: c.model, score: c.roc_auc.toFixed(3), note: c.model === telco.chosen ? "chosen" : undefined })),
    honest: `At a 50% threshold it catches ${pct(telco.metrics.recall)} of churners. A real retention campaign would lower the threshold to trade precision for recall.`,
    code: "ml/train.py → telco()",
  },
  {
    slug: "heart-failure",
    title: "Heart Failure Prediction",
    category: "Classification",
    line: "A small clinical dataset, validated carefully instead of over-fitted.",
    overview: [
      "Heart-failure patients are followed after diagnosis, and doctors want to know who is at higher risk. With only 299 patients, the hard part isn't the model; it's not fooling yourself.",
      "This rebuild removes a column that leaks the answer, keeps six readable markers, and scores every model on 50 cross-validation folds so the result isn't one lucky split. It's an educational project, not a clinical tool.",
    ],
    process: [
      { title: "Raw data", value: `${heart.dataset.rows} patients`, detail: `${heart.dataset.raw_cols} columns of clinical records` },
      { title: "Leak check", value: "−1 column", detail: "Follow-up time removed: it is only known after the outcome" },
      { title: "Features", value: `${heart.dataset.features_used.length} markers`, detail: "Age, EF, creatinine, sodium, blood pressure, anaemia" },
      { title: "Validate", value: "50 folds", detail: "5-fold cross-validation, repeated 10 times" },
      { title: "Compare", value: `${heart.comparison.length} models`, detail: "Logistic regression vs random forest" },
      { title: "Predict", value: "risk %", detail: "Readable coefficients, shipped to the browser" },
    ],
    stats: [
      { label: "ROC-AUC (CV)", value: `${heart.comparison[0].roc_auc_mean.toFixed(3)} ± ${heart.comparison[0].roc_auc_std.toFixed(2)}` },
      { label: "Patients", value: String(heart.dataset.rows) },
      { label: "Event rate", value: pct(heart.dataset.event_rate) },
      { label: "Features", value: String(heart.dataset.features_used.length) },
    ],
    problem: "With only 299 patients, a single train/test split can be lucky or unlucky. The goal was an honest estimate of how well simple clinical markers separate risk.",
    data: { name: heart.dataset.name, source: heart.dataset.source, detail: `${heart.dataset.rows} patients. Follow-up time removed because it is only known after the outcome.` },
    approach: [
      "Removed the leaking follow-up-time column first.",
      "Used six markers: age, ejection fraction, serum creatinine, serum sodium, high blood pressure, anaemia.",
      "Scored every model with 5-fold cross-validation repeated 10 times (50 fits each).",
      "Kept logistic regression for its transparency; random forest scored slightly higher but within the noise.",
    ],
    comparisonLabel: "Mean ROC-AUC across 50 folds",
    comparison: heart.comparison.map((c) => ({ model: c.model, score: `${c.roc_auc_mean.toFixed(3)} ± ${c.roc_auc_std.toFixed(2)}`, note: c.model === heart.chosen ? "chosen" : undefined })),
    honest: "An educational model on a public dataset. It is not a medical tool and should never guide a real diagnosis.",
    code: "ml/train.py → heart()",
  },
  {
    slug: "mall-segments",
    title: "Mall Customer Segments",
    category: "Clustering",
    line: "Five shopper types, found without labels.",
    overview: [
      "A mall wants to market differently to different shoppers, but nobody has labelled them. Unsupervised learning finds the groups from the data alone.",
      "K-Means runs for every k from 2 to 8, and the silhouette score, not a guess, picks how many segments there are. Each segment then gets a plain-language name a marketing team can use.",
    ],
    process: [
      { title: "Raw data", value: `${mall.dataset.rows} members`, detail: `${mall.dataset.raw_cols} columns: age, gender, income, score` },
      { title: "Features", value: "2", detail: "Annual income and spending score" },
      { title: "Cluster", value: "k = 2 … 8", detail: "K-Means, 20 restarts for each k" },
      { title: "Score", value: "silhouette", detail: "How well separated each run is" },
      { title: "Pick", value: `k = ${mall.best_k}`, detail: `Best silhouette: ${(mall.elbow.find((e) => e.k === mall.best_k)?.silhouette ?? 0).toFixed(3)}` },
      { title: "Name", value: `${mall.segments.length} segments`, detail: "Named from income and spending vs the median" },
    ],
    stats: [
      { label: "Best k", value: String(mall.best_k) },
      { label: "Silhouette", value: (mall.elbow.find((e) => e.k === mall.best_k)?.silhouette ?? 0).toFixed(3) },
      { label: "Customers", value: String(mall.dataset.rows) },
      { label: "k tested", value: "2–8" },
    ],
    problem: "Marketing wants to talk differently to different shoppers, but nobody has labelled them. Clustering finds the natural groups in income and spending.",
    data: { name: mall.dataset.name, detail: `${mall.dataset.rows} customers, annual income and a 1–100 spending score.` },
    approach: [
      "Ran K-Means for every k from 2 to 8 (20 restarts each).",
      "Picked k with the best silhouette score instead of eyeballing the elbow.",
      "Named each segment from where its centre sits against the median income and spending.",
    ],
    comparisonLabel: "Silhouette score by k",
    comparison: mall.elbow.map((e) => ({ model: `k = ${e.k}`, score: e.silhouette.toFixed(3), note: e.k === mall.best_k ? "chosen" : undefined })),
    honest: "Two features make the clusters easy to see and explain. A production version would add age, visit frequency and basket data.",
    code: "ml/train.py → mall()",
  },
  {
    slug: "nyc-taxi-anomaly",
    title: "NYC Taxi Anomalies",
    category: "Anomaly detection",
    line: "Seven months of taxi demand, and the days that broke the pattern.",
    overview: [
      "Taxi demand in New York follows a strong daily and weekly rhythm. The useful question for an operations team is when that rhythm breaks: holidays, a marathon, a blizzard.",
      "Instead of a black box, the detector compares each hour with what's normal for that weekday and hour, measures the gap with a robust z-score, and raises an alert past a threshold you can tune yourself below.",
    ],
    process: [
      { title: "Raw data", value: `${taxi.dataset.points_raw.toLocaleString("en-US")} points`, detail: "Passengers every 30 minutes" },
      { title: "Hourly", value: `${taxi.dataset.hours.toLocaleString("en-US")} hours`, detail: "Two half-hours summed into one" },
      { title: "Baseline", value: "7 × 24", detail: "Median demand for each weekday and hour" },
      { title: "Score", value: "robust z", detail: "Gap from expected, scaled by MAD, 3-hour smoothing" },
      { title: "Alert", value: `|z| > ${taxi.default_threshold}`, detail: "Picked from the threshold sweep" },
      { title: "Evaluate", value: `${taxiDefault.detected}/${taxiDefault.of} · ${taxiDefault.false_alerts}`, detail: "Known events found · false alerts" },
    ],
    stats: [
      { label: "Known events found", value: `${taxiDefault.detected}/${taxiDefault.of}` },
      { label: "False alerts", value: String(taxiDefault.false_alerts) },
      { label: "Hours checked", value: taxi.series.value.length.toLocaleString("en-US") },
      { label: "Threshold", value: `|z| > ${taxi.default_threshold}` },
    ],
    problem: "Ops teams want to know when demand behaves strangely, without a model that cries wolf every Friday night.",
    data: { name: taxi.dataset.name, source: taxi.dataset.source, detail: `${taxi.dataset.period[0]} → ${taxi.dataset.period[1]}, ${taxi.dataset.resolution}. Five labelled events: marathon, Thanksgiving, Christmas, New Year, blizzard.` },
    approach: [
      "Built the expected demand for each weekday-hour with the median, so outliers don't bend the baseline.",
      "Measured how far each hour sits from it with a robust z-score (MAD), smoothed over 3 hours.",
      "Swept the threshold and counted known events found versus false alerts.",
    ],
    comparisonLabel: "Threshold sweep",
    comparison: taxi.sweep.map((s) => ({
      model: `|z| > ${s.threshold}`,
      score: `${s.detected}/${s.of} found · ${s.false_alerts} false alerts`,
      note: s.threshold === taxi.default_threshold ? "chosen" : undefined,
    })),
    honest:
      "The labelled windows span several days, which makes detection easier. Most of the \"false alerts\" land on July 4th weekend, Labor Day weekend and MLK Day: real holidays the benchmark simply doesn't label. The slider shows the trade-off.",
    code: "ml/train.py → nyc_taxi()",
  },
];

caseStudies.push({
  slug: "credit-risk",
  title: "Credit Risk",
  category: "Classification",
  line: "Approve or decline a loan, when one mistake costs five times more than the other.",
  overview: [
    "A bank loses far more when it approves a borrower who defaults than when it turns away one who would have repaid. This dataset even says how much more: five to one.",
    "So the goal isn't the highest accuracy. It's the cheapest decisions. The model scores default risk, and the decision threshold comes straight from the cost matrix instead of the usual 50%. Sensitive attributes such as sex, marital status, age and foreign-worker status are left out on purpose.",
  ],
  process: [
    { title: "Raw data", value: `${credit.dataset.rows.toLocaleString("en-US")} loans`, detail: `${credit.dataset.raw_cols - 1} coded attributes + outcome` },
    { title: "Decode", value: "A11 → words", detail: "Every code mapped back to its meaning" },
    { title: "Fairness", value: "−3 attributes", detail: "Sex & marital status, age, foreign worker left out" },
    { title: "Features", value: `${credit.dataset.features_used.length} → ${credit.dataset.encoded_cols} columns`, detail: "3 numbers scaled, 8 categories one-hot" },
    { title: "Validate", value: "25 folds", detail: `${credit.comparison.length} models, 5-fold CV × 5 repeats` },
    { title: "Decide", value: "threshold 1/6", detail: `Where ${credit.costs.approve_bad} × risk = ${credit.costs.decline_good} × (1 − risk)` },
  ],
  stats: [
    { label: "Cost vs 50% rule", value: `−${Math.round((1 - credit.eval.at_bayes.cost / credit.eval.at_half.cost) * 100)}%` },
    { label: "ROC-AUC (CV)", value: credit.comparison.find((c) => c.model === "Logistic Regression")!.roc_auc_mean.toFixed(3) },
    { label: "Loans", value: credit.dataset.rows.toLocaleString("en-US") },
    { label: "Default rate", value: `${(credit.dataset.default_rate * 100).toFixed(0)}%` },
  ],
  problem: "Approving a borrower who defaults costs the bank five times more than declining one who would have repaid. Decisions should minimise that cost, not maximise accuracy.",
  data: { name: credit.dataset.name, source: credit.dataset.source, detail: `${credit.dataset.rows.toLocaleString("en-US")} applications, ${credit.dataset.features_used.length} features used.` },
  approach: [
    "Decoded every attribute (A11, A34…) back into plain words using the dataset's documentation.",
    "Left out sex and marital status, age and foreign-worker status so the model can't lean on them.",
    "Compared logistic regression, random forest and gradient boosting on 25 cross-validation folds; the spread was wider than the gaps, so the readable model stayed.",
    "Set the decision threshold at 1/6, where the expected cost of approving equals the cost of declining, and checked it on out-of-fold predictions.",
  ],
  comparisonLabel: "Mean ROC-AUC across 25 folds",
  comparison: credit.comparison.map((c) => ({ model: c.model, score: `${c.roc_auc_mean.toFixed(3)} ± ${c.roc_auc_std.toFixed(2)}`, note: c.model === credit.chosen ? "chosen" : undefined })),
  honest: `The cost-aware rule declines ${credit.eval.at_bayes.declined} of ${credit.dataset.rows.toLocaleString("en-US")} applications. That's what a 5:1 cost matrix asks for, but a real lender would also count the profit lost on good customers turned away. Removing sensitive attributes doesn't guarantee fairness on its own; proxies can remain.`,
  code: "ml/train.py → credit()",
});

const mTreeRaw = machine.comparison.find((c) => c.features === "raw" && c.model.startsWith("Decision"))!;
const mGb = machine.comparison.find((c) => c.features === "physics" && c.model.startsWith("Gradient"))!;
const mByMode = machine.eval.recall_by_mode;

caseStudies.push({
  slug: "manufacturing-defects",
  title: "Manufacturing Defects",
  category: "Classification",
  line: "Predicting machine failures when only 3 in 100 runs fail, with rules you can read.",
  overview: [
    "In a factory, a missed failure means downtime and scrap, while a false alarm means an unnecessary stop. With only about 3% of runs failing, accuracy is meaningless: a model that always says “fine” is 97% accurate.",
    "Instead of reaching for a bigger model, this project adds three features straight from physics: power, the temperature gap and tool wear × torque. A small decision tree with those features matches gradient boosting and can be drawn on one screen.",
  ],
  process: [
    { title: "Raw data", value: `${machine.dataset.rows.toLocaleString("en-US")} runs`, detail: `${machine.dataset.raw_cols} columns, ${machine.dataset.failures} failures` },
    { title: "Leak check", value: "−5 flags", detail: "Failure-mode flags removed: they reveal the answer" },
    { title: "Physics", value: "+3 features", detail: "Power (W), temperature gap (K), wear × torque" },
    { title: "Split", value: `${machine.split.train.toLocaleString("en-US")} / ${machine.split.test.toLocaleString("en-US")}`, detail: `Stratified, ${machine.split.test_failures} failures in the test set` },
    { title: "Compare", value: "3 models × 2", detail: "Logistic, tree, boosting · raw vs physics" },
    { title: "Explain", value: `${machine.tree.leaves} leaves`, detail: `Depth-${machine.tree.depth} tree, every decision readable` },
  ],
  stats: [
    { label: "F1 (failures)", value: machine.metrics.f1.toFixed(3) },
    { label: "Recall", value: `${Math.round(machine.metrics.recall * 100)}%` },
    { label: "Precision", value: `${Math.round(machine.metrics.precision * 100)}%` },
    { label: "Failure rate", value: `${(machine.dataset.failure_rate * 100).toFixed(1)}%` },
  ],
  problem: "Spot the runs that will fail, from five sensor readings, when failures are rare enough that accuracy hides everything.",
  data: { name: machine.dataset.name, source: machine.dataset.source, detail: `${machine.dataset.rows.toLocaleString("en-US")} synthetic runs modelled on real milling data.` },
  approach: [
    "Removed the five failure-mode flags first: they are the answer in disguise.",
    "Checked the dataset's documented failure rules against the data before modelling.",
    "Added three physics features: power from torque and speed, the process-air temperature gap, and tool wear × torque.",
    `Compared three models with and without them. The depth-5 tree jumped from F1 ${mTreeRaw.f1.toFixed(2)} to ${machine.metrics.f1.toFixed(2)}, level with boosting (${mGb.f1.toFixed(2)}), so the readable tree was kept.`,
  ],
  comparisonLabel: "F1 on the test set (failures)",
  comparison: machine.comparison.map((c) => ({
    model: `${c.model} · ${c.features}`,
    score: c.f1.toFixed(3),
    note: c.features === "physics" && c.model.startsWith("Decision") ? "chosen" : undefined,
  })),
  honest: `The tree catches every heat (${mByMode.HDF.caught}/${mByMode.HDF.total}), power (${mByMode.PWF.caught}/${mByMode.PWF.total}) and overstrain (${mByMode.OSF.caught}/${mByMode.OSF.total}) failure in the test set, but only ${mByMode.TWF.caught} of ${mByMode.TWF.total} tool-wear failures: those happen at a random point between 200 and 240 minutes by design. The data is synthetic, so real machines will be noisier.`,
  code: "ml/train.py → ai4i()",
});

const stRidge = (s: string) => student.comparison.find((c) => c.stage === s && c.model === "Ridge regression")!;
const stFlag = student.flags["11"];

caseStudies.push({
  slug: "student-performance",
  title: "Student Performance",
  category: "Regression",
  line: "Predicting final grades, and being honest about how early you can.",
  overview: [
    "Once a student's first-term grade is known, predicting the final grade is easy. But by then it is often too late to help. The useful question is what we can say at the start of the year, from habits and background alone.",
    "This rebuild trains the same readable model at three points in the year: before any grades, after term 1 and after term 2. It shows exactly how much each new piece of information buys, and turns the earliest model into a practical check-in list.",
  ],
  process: [
    { title: "Raw data", value: `${student.dataset.rows} students`, detail: `${student.dataset.raw_cols} columns from reports and surveys` },
    { title: "Fairness", value: "−1 column", detail: "Sex left out of every model" },
    { title: "Features", value: `12 → ${student.stages.start.encoded_cols} columns`, detail: "Habits, background, school; G1 and G2 held back" },
    { title: "Model", value: "Ridge", detail: `Penalty chosen by cross-validation (α ≈ ${student.stages.start.alpha.toFixed(0)})` },
    { title: "Stages", value: "3 × 25 folds", detail: "Start of year, after term 1, after term 2" },
    { title: "Predict", value: `grade ± ${student.stages.start.oof_mae.toFixed(1)}`, detail: "With the error band shown, not hidden" },
  ],
  stats: [
    { label: "MAE · start of year", value: stRidge("start").mae.toFixed(2) },
    { label: "MAE · after term 2", value: stRidge("term2").mae.toFixed(2) },
    { label: "Fails caught early", value: `${stFlag.caught}/${stFlag.fails}` },
    { label: "Students", value: String(student.dataset.rows) },
  ],
  problem: "Teachers want to know which students will struggle while there is still time to help, not after the first grades are in.",
  data: { name: student.dataset.name, source: student.dataset.source, detail: `${student.dataset.rows} students, grades 0–20 with 10 as a pass.` },
  approach: [
    "Left sex out of every model, and held back the term grades G1 and G2 for the start-of-year stage.",
    "Kept 12 readable features (past failures, study time, absences, plans for higher education, school and a few habits). They score as well as all 30 columns.",
    "Trained ridge regression, random forest and gradient boosting at each stage with 25 cross-validation folds; ridge stayed within a few hundredths of the others.",
    "Turned the start-of-year predictions into a check-in list and measured how many future fails it would catch.",
  ],
  comparisonLabel: "MAE in grade points (ridge regression)",
  comparison: [
    { model: "Guess the average", score: student.baseline_mae.toFixed(2) },
    ...(["start", "term1", "term2"] as const).map((s) => ({
      model: student.stages[s].label,
      score: `${stRidge(s).mae.toFixed(2)} · R² ${stRidge(s).r2.toFixed(2)}`,
      note: s === "start" ? "early warning" : undefined,
    })),
  ],
  honest: `At the start of the year the model explains only about ${Math.round(stRidge("start").r2 * 100)}% of the variation in grades: most of what decides a grade isn't in a survey. It is a prompt for a conversation, not a verdict. The check-in list (predicted below 11) catches ${stFlag.caught} of ${stFlag.fails} future fails but also names ${stFlag.flagged - stFlag.caught} students who pass.`,
  code: "ml/train.py → student()",
});

const bkChosen = bike.comparison.find((c) => c.model === bike.chosen)!;
const bkNaive = bike.comparison.find((c) => c.model.startsWith("Seasonal"))!;

caseStudies.push({
  slug: "demand-forecasting",
  title: "Demand Forecasting",
  category: "Time series",
  line: "Forecasting two weeks of bike rentals, tested the way it would be used.",
  overview: [
    "A bike-share operator has to put bikes and staff in the right place before demand shows up. That needs a forecast, and an honest measure of how wrong it will be.",
    "The model stacks four forces: the growth trend, the season, the day of the week and the weather. It is judged with a rolling backtest: stand on a date in 2012, use only the past, forecast the next 14 days, move a week, repeat.",
  ],
  process: [
    { title: "Raw data", value: `${bike.dataset.rows} days`, detail: `${bike.dataset.period[0]} → ${bike.dataset.period[1]}` },
    { title: "Leak check", value: "−2 columns", detail: "Casual + registered add up to the answer" },
    { title: "Features", value: "trend + calendar + weather", detail: "Month, weekday, holiday, °C and °C², humidity, wind" },
    { title: "Backtest", value: `${bike.backtest.origins} origins`, detail: `Weekly through 2012, ${bike.backtest.horizon}-day horizon each` },
    { title: "Compare", value: `${bike.comparison.length} models`, detail: "Naive, ridge calendar, ridge + weather, boosting" },
    { title: "Forecast", value: `± ${Math.round(bkChosen.mae)} bikes`, detail: "Average daily error, shown next to every forecast" },
  ],
  stats: [
    { label: "MAE (bikes/day)", value: Math.round(bkChosen.mae).toLocaleString("en-US") },
    { label: "vs last-week guess", value: `−${Math.round((1 - bkChosen.mae / bkNaive.mae) * 100)}%` },
    { label: "WAPE", value: `${(bkChosen.wape * 100).toFixed(1)}%` },
    { label: "Backtest windows", value: String(bike.backtest.origins) },
  ],
  problem: "Plan bikes and staff two weeks ahead, knowing how far off the plan is likely to be.",
  data: { name: bike.dataset.name, source: bike.dataset.source, detail: `${bike.dataset.rows} days of rentals with weather and holidays.` },
  approach: [
    "Dropped the casual and registered counts: they sum to the target.",
    "Converted the scaled weather back to °C, %, km/h, and added temperature² because rentals fall again on the hottest days.",
    "Ran a rolling-origin backtest over 2012: 51 weekly start dates, 14 days ahead each, training only on data before the start.",
    "Ridge regression matched gradient boosting, so the transparent model became the forecaster and the planner.",
  ],
  comparisonLabel: "Backtest MAE (bikes per day)",
  comparison: bike.comparison.map((c) => ({ model: c.model, score: `${Math.round(c.mae).toLocaleString("en-US")} · WAPE ${(c.wape * 100).toFixed(1)}%`, note: c.model === bike.chosen ? "chosen" : undefined })),
  honest:
    "The backtest feeds the model the weather that actually happened, as if the weather forecast were perfect. Real weather forecasts would add error, more so for days 8–14. Extreme events like Hurricane Sandy (22 rentals) are far outside anything a calendar-and-weather model can foresee.",
  code: "ml/train.py → bike()",
});

const aqRidge = air.comparison.find((c) => c.model === air.chosen)!;
const aqStatic = air.drift.reduce((a, d) => a + d.static, 0) / air.drift.length;
const aqRecal = air.drift.reduce((a, d) => a + d.recalibrated, 0) / air.drift.length;

caseStudies.push({
  slug: "air-quality",
  title: "Air Quality Virtual Sensor",
  category: "Regression",
  line: "Estimating real carbon monoxide from cheap sensors, and catching the drift that random splits hide.",
  overview: [
    "Certified air-quality analysers are accurate but expensive, so cities can only afford a few. Cheap metal-oxide sensors could cover every street, if a model can translate their raw signals into real concentrations.",
    "This project trains that translation for carbon monoxide, then asks the uncomfortable question: does it still work months later? Shuffled data says yes. Time says the sensors drift, and shows how much monthly recalibration wins back.",
  ],
  process: [
    { title: "Raw data", value: `${air.dataset.rows.toLocaleString("en-US")} hours`, detail: `${air.dataset.period[0]} → ${air.dataset.period[1]}` },
    { title: "Missing", value: "−200 → gaps", detail: `Rows without CO truth or sensor readings removed; ${air.dataset.usable.toLocaleString("en-US")} left` },
    { title: "Features", value: "5 sensors + weather", detail: "Plus hour of day as a sine/cosine pair" },
    { title: "Split", value: "by time", detail: `Train before ${air.split.cut}, test after (${air.split.test.toLocaleString("en-US")} hours)` },
    { title: "Compare", value: "3 models × 2 splits", detail: "Ridge, random forest, boosting · random vs time" },
    { title: "Maintain", value: "monthly retrain", detail: `Average monthly error ${aqStatic.toFixed(2)} → ${aqRecal.toFixed(2)} mg/m³` },
  ],
  stats: [
    { label: "MAE · unseen months", value: aqRidge.time_mae.toFixed(2) },
    { label: "MAE · random split", value: aqRidge.random_mae.toFixed(2) },
    { label: "With monthly retrain", value: aqRecal.toFixed(2) },
    { label: "Usable hours", value: air.dataset.usable.toLocaleString("en-US") },
  ],
  problem: "Replace an expensive reference analyser with five cheap sensors and a model, without fooling ourselves about how long the model stays accurate.",
  data: { name: air.dataset.name, source: air.dataset.source, detail: `${air.dataset.rows.toLocaleString("en-US")} hourly readings, ${air.dataset.usable.toLocaleString("en-US")} usable.` },
  approach: [
    "Turned the device's −200 codes into missing values and dropped the hydrocarbon column, which is 90% empty.",
    "Used the five sensor responses, temperature, humidity and the hour of day as a sine/cosine pair.",
    "Scored every model twice: on shuffled hours and on a strict time split (train before December, test after).",
    "Measured drift month by month, and how much retraining on all past data each month recovers.",
  ],
  comparisonLabel: "MAE in mg/m³: random split → time split",
  comparison: air.comparison.map((c) => ({ model: c.model, score: `${c.random_mae.toFixed(3)} → ${c.time_mae.toFixed(3)}`, note: c.model === air.chosen ? "chosen" : undefined })),
  honest: `Random forest is slightly more accurate on the unseen months (${air.comparison.find((c) => c.model === "Random Forest")!.time_mae.toFixed(3)} vs ${aqRidge.time_mae.toFixed(3)}); ridge was kept because it is stable and runs in the browser. One device, one city, one year: a real deployment would need recalibration against a reference station on a schedule, as the drift chart shows.`,
  code: "ml/train.py → air()",
});

const bkC = bank.comparison.find((c) => c.model === bank.chosen)!;
const bkRaw = bank.comparison.find((c) => c.model === "Logistic · raw columns")!;
const bkGb = bank.comparison.find((c) => c.model === "Gradient Boosting")!;

caseStudies.push({
  slug: "bank-churn",
  title: "Bank Churn Targeting",
  category: "Classification",
  line: "A retention team can't call everyone. This ranks who to call first, and shows what each budget buys.",
  overview: [
    "Predicting churn is only half the job. A retention team has a fixed number of calls, so the real question is how many of the customers about to leave they reach if they call the riskiest first.",
    "The model is a logistic regression with three engineered features: age², product count as categories and a zero-balance flag. That takes it from a weak linear model to nearly boosting-level ranking, while every effect stays readable. A budget slider turns the scores into campaign numbers.",
  ],
  process: [
    { title: "Raw data", value: `${bank.dataset.rows.toLocaleString("en-US")} customers`, detail: `${(bank.dataset.churn_rate * 100).toFixed(1)}% closed their account` },
    { title: "Privacy", value: "−4 columns", detail: "Surname and IDs dropped; gender left out" },
    { title: "Features", value: `+3 → ${bank.encoded_cols} cols`, detail: "Age², products as categories, zero balance" },
    { title: "Validate", value: "5-fold OOF", detail: "Every customer scored by a model that never saw them" },
    { title: "Rank", value: "riskiest first", detail: `Top decile churns at ${Math.round(bank.eval.lift[0].rate * 100)}%` },
    { title: "Plan", value: `top 10% → ${Math.round(bkC.top10 * 100)}%`, detail: "of all leavers reached with a tenth of the calls" },
  ],
  stats: [
    { label: "Leavers in top 10%", value: `${Math.round(bkC.top10 * 100)}%` },
    { label: "Top-decile lift", value: `${bank.eval.lift[0].lift.toFixed(1)}×` },
    { label: "ROC-AUC", value: bkC.roc_auc.toFixed(3) },
    { label: "Customers", value: bank.dataset.rows.toLocaleString("en-US") },
  ],
  problem: "Spend a limited retention budget on the customers most likely to leave, and know in advance how many leavers that budget will reach.",
  data: { name: bank.dataset.name, source: bank.dataset.source, detail: `${bank.dataset.rows.toLocaleString("en-US")} customers in France, Germany and Spain.` },
  approach: [
    "Dropped surnames and IDs, and left gender out of the model.",
    "Read the shape of the risk first: products behave like categories, age rises then falls, zero balances churn less.",
    `Added age², product categories and a zero-balance flag. The same logistic regression went from AUC ${bkRaw.roc_auc.toFixed(3)} to ${bkC.roc_auc.toFixed(3)}.`,
    `Judged models by how many leavers the top of the list holds. The readable model reaches ${Math.round(bkC.top10 * 100)}% in the top 10%, boosting ${Math.round(bkGb.top10 * 100)}%.`,
  ],
  comparisonLabel: "Leavers reached in the top 10% · ROC-AUC",
  comparison: bank.comparison.map((c) => ({ model: c.model, score: `${Math.round(c.top10 * 100)}% · ${c.roc_auc.toFixed(3)}`, note: c.model === bank.chosen ? "chosen" : undefined })),
  honest: `Gradient boosting ranks a little better (top 10%: ${Math.round(bkGb.top10 * 100)}% vs ${Math.round(bkC.top10 * 100)}%); the readable model was kept so the team can see why a customer is flagged. The scores say who is likely to leave, not who can be persuaded to stay: a real campaign would test the offer before scaling it.`,
  code: "ml/train.py → bank()",
});

const inLr = insurance.comparison.find((c) => c.features === "claim facts" && c.model === "Logistic Regression")!;
const inSev = insurance.comparison.find((c) => c.features === "one column")!;
const inHob = insurance.comparison.find((c) => c.features === "+ hobbies" && c.model === "Logistic Regression")!;

caseStudies.push({
  slug: "insurance-fraud",
  title: "Insurance Claim Fraud",
  category: "Classification",
  line: "Scoring auto claims for review, and refusing the signal that looks too good to be true.",
  overview: [
    "An insurer can't investigate every claim, so it needs a score that ranks claims for review and reasons an investigator can check. With a quarter of these claims labelled fraud, the risk is less a weak model and more a model that learns the wrong thing.",
    "The rebuild uses only facts about the claim and the incident, gives investigators a three-question checklist from a small tree, and shows openly what happens with a field that should never be used: the policy holder's hobby.",
  ],
  process: [
    { title: "Raw data", value: `${insurance.dataset.rows.toLocaleString("en-US")} claims`, detail: `${insurance.dataset.raw_cols} columns, ${Math.round(insurance.dataset.fraud_rate * 100)}% fraud` },
    { title: "Clean", value: "? → Unknown", detail: "Missing answers kept as their own category" },
    { title: "Fairness", value: `−${insurance.dataset.raw_cols - insurance.dataset.features_used.length - 1} columns`, detail: "Profile, IDs, dates, places and hobbies out" },
    { title: "Features", value: `${insurance.dataset.features_used.length} claim facts`, detail: "Severity, incident, authorities, amounts, witnesses" },
    { title: "Validate", value: "5-fold OOF", detail: "Each claim scored by a model that never saw it" },
    { title: "Explain", value: "3 questions", detail: "Depth-3 tree as an investigator checklist" },
  ],
  stats: [
    { label: "ROC-AUC (claim facts)", value: inLr.roc_auc.toFixed(3) },
    { label: "Fraud in top 20%", value: `${Math.round(insurance.eval.gains[19].captured * 100)}%` },
    { label: "Severity alone", value: inSev.roc_auc.toFixed(3) },
    { label: "Claims", value: insurance.dataset.rows.toLocaleString("en-US") },
  ],
  problem: "Rank claims for investigation with signals that would stand up to the customer, a regulator and next year's data.",
  data: { name: insurance.dataset.name, source: insurance.dataset.source, detail: `${insurance.dataset.rows.toLocaleString("en-US")} claims, CC BY 4.0.` },
  approach: [
    "Kept missing answers ('?') as an explicit Unknown category instead of guessing.",
    "Left out every profile field (sex, age, zip, education, occupation, relationship, hobbies) plus IDs, dates and places.",
    "Compared logistic regression, a depth-3 tree and boosting on the claim facts, plus severity alone as a sanity check.",
    `Tested hobbies separately: AUC jumps from ${inLr.roc_auc.toFixed(2)} to ${inHob.roc_auc.toFixed(2)}, driven by chess and cross-fit. Kept out as an artifact.`,
  ],
  comparisonLabel: "Out-of-fold ROC-AUC",
  comparison: insurance.comparison.map((c) => ({ model: `${c.model} · ${c.features}`, score: c.roc_auc.toFixed(3), note: c.features === "claim facts" && c.model === "Logistic Regression" ? "chosen" : c.features === "+ hobbies" ? "rejected" : undefined })),
  honest: `Most of the signal is one field: incident severity alone scores ${inSev.roc_auc.toFixed(3)} against ${inLr.roc_auc.toFixed(3)} for all claim facts. Only ${insurance.dataset.rows.toLocaleString("en-US")} claims and no dates to test on later claims, so the score is a triage aid, not a verdict.`,
  code: "ml/train.py → insurance()",
});

const cfC = card.comparison.find((c) => c.model === card.chosen)!;
const cardTrainFrauds = card.dataset.frauds - card.split.test_frauds;
/** class_weight="balanced" ratio in the training window: legit ÷ fraud. */
export const cardWeight = Math.round((card.split.train - cardTrainFrauds) / cardTrainFrauds);
const cfRf = card.comparison.find((c) => c.model === "Random Forest")!;

caseStudies.push({
  slug: "bank-fraud",
  title: "Card Fraud Review Queue",
  category: "Anomaly detection",
  line: "Finding 108 frauds among 85,000 payments, measured the way a fraud team works: alerts per day.",
  overview: [
    "Card fraud is rare, about one payment in 578 here, so accuracy is meaningless and even ROC curves flatter every model. A fraud team doesn't ask for a score; it asks how many frauds it will stop with the alerts it can check.",
    "This rebuild trains on the first 37 hours of real, anonymised card payments and tests on the last 11, exactly as the model would meet new data. A class-balanced logistic regression ranks the payments, and the demo turns its scores into a review queue you can size yourself.",
  ],
  process: [
    { title: "Raw data", value: `${card.dataset.rows.toLocaleString("en-US")} payments`, detail: `${card.dataset.frauds} frauds over ${Math.round(card.dataset.hours)} hours` },
    { title: "Features", value: "28 + amount", detail: "Anonymised PCA signals, log(1 + amount)" },
    { title: "Split", value: "by time", detail: `Train first ${card.split.cut_hours} h · test last ${card.split.test_hours} h` },
    { title: "Imbalance", value: "class weights", detail: `Each fraud counts ~${cardWeight}× more while training` },
    { title: "Compare", value: `${card.comparison.length} models`, detail: "Logistic (plain / balanced), random forest, boosting" },
    { title: "Queue", value: `top 100 → ${cfC.caught["100"]}`, detail: `of ${card.split.test_frauds} frauds in the test window` },
  ],
  stats: [
    { label: "Frauds in top 100", value: `${cfC.caught["100"]}/${card.split.test_frauds}` },
    { label: "Frauds in top 200", value: `${cfC.caught["200"]}/${card.split.test_frauds}` },
    { label: "Average precision", value: cfC.ap.toFixed(3) },
    { label: "Fraud rate", value: `${(card.dataset.fraud_rate * 100).toFixed(2)}%` },
  ],
  problem: "Rank incoming card payments so a small fraud team spends its limited reviews where the fraud is.",
  data: { name: card.dataset.name, source: card.dataset.source, detail: `${card.dataset.rows.toLocaleString("en-US")} payments, ${card.dataset.license}.` },
  approach: [
    "Split by time, not at random: train on the first 37 hours, test on the last 11.",
    "Used the 28 anonymised signals plus log(1 + amount); the time column only says seconds since the start, so it wasn't used as a feature.",
    "Weighted the rare fraud class so the model doesn't learn to say 'legit' every time.",
    "Judged models by average precision and frauds caught in the top 50, 100, 200 and 500 alerts.",
  ],
  comparisonLabel: "Avg precision · frauds caught in top 100",
  comparison: card.comparison.map((c) => ({ model: c.model, score: `${c.ap.toFixed(3)} · ${c.caught["100"]}/${card.split.test_frauds}`, note: c.model === card.chosen ? "chosen" : undefined })),
  honest: `The random forest is a little better (${cfRf.caught["100"]} vs ${cfC.caught["100"]} frauds in the top 100); the logistic model stays because it can explain every alert in the browser. The test window is only ${card.split.test_hours} hours from two days in 2013, and because the features are anonymised, an analyst can see which signals fired but not what they mean.`,
  code: "ml/train.py → card_fraud()",
});

const rtPop = retail.comparison[0];

caseStudies.push({
  slug: "product-recommender",
  title: "Product Recommender",
  category: "Recommendation",
  line: "“Bought this, also bought” from a year of real orders, tested on baskets the model never saw.",
  overview: [
    "An online shop has a few seconds to suggest the next product. The classic answer is item-to-item collaborative filtering: products that keep landing in the same baskets are probably related, whatever their names say.",
    `This rebuild learns those links from ${retail.split.train_baskets.toLocaleString("en-US")} baskets at a UK gift retailer, then grades itself honestly: take a later basket, hide one product, and check whether the rest bring it back in the top 5. The demo is the real model running in your browser: build a basket and watch the suggestions change.`,
  ],
  process: [
    { title: "Raw data", value: `${retail.dataset.raw_rows.toLocaleString("en-US")} lines`, detail: `Order lines, ${retail.dataset.period[0].slice(0, 7)} to ${retail.dataset.period[1].slice(0, 7)}` },
    { title: "Clean", value: `${retail.dataset.invoices.toLocaleString("en-US")} baskets`, detail: "Drop cancellations, fees, postage, zero prices" },
    { title: "Split", value: "by time", detail: `Learn before ${retail.split.cut} · test after` },
    { title: "Catalog", value: `top ${retail.catalog_size}`, detail: `Best sellers, ${Math.round(retail.coverage * 100)}% of all lines` },
    { title: "Similarity", value: "cosine", detail: "Together ÷ √(count A × count B)" },
    { title: "Hide one", value: `top 5 → ${(retail.shipped.hit5 * 100).toFixed(0)}%`, detail: `${retail.split.tests.toLocaleString("en-US")} test baskets, vs ${(rtPop.hit5 * 100).toFixed(0)}% for best sellers` },
  ],
  stats: [
    { label: "Hidden item in top 5", value: `${(retail.shipped.hit5 * 100).toFixed(1)}%` },
    { label: "Best-seller baseline", value: `${(rtPop.hit5 * 100).toFixed(1)}%` },
    { label: "In top 10", value: `${(retail.shipped.hit10 * 100).toFixed(1)}%` },
    { label: "Test baskets", value: retail.split.tests.toLocaleString("en-US") },
  ],
  problem: "Suggest the products a shopper is most likely to add, given only what is already in the basket.",
  data: { name: retail.dataset.name, source: retail.dataset.source, detail: `${retail.dataset.raw_rows.toLocaleString("en-US")} order lines, ${retail.dataset.license}.` },
  approach: [
    `Cleaned the order lines and grouped them into ${retail.dataset.invoices.toLocaleString("en-US")} baskets; customer IDs are not used.`,
    `Learned only from orders before ${retail.split.cut}, tested on the ${retail.split.test_baskets.toLocaleString("en-US")} baskets after.`,
    "Scored product pairs four ways (popularity, confidence, lift, cosine) and summed each candidate's score over the basket.",
    `Shipped each product's ${retail.shipped.k} closest neighbours to the browser and re-tested that exact version.`,
  ],
  comparisonLabel: "Hidden item found in top 5 · top 10",
  comparison: [
    ...retail.comparison.map((c) => ({ model: c.model, score: `${(c.hit5 * 100).toFixed(1)}% · ${(c.hit10 * 100).toFixed(1)}%`, note: c.model === retail.chosen ? "best" : undefined })),
    { model: `Cosine, top ${retail.shipped.k} neighbours`, score: `${(retail.shipped.hit5 * 100).toFixed(1)}% · ${(retail.shipped.hit10 * 100).toFixed(1)}%`, note: "shipped" },
  ],
  honest: `The test only counts an exact match: suggesting the pink lunch bag when the shopper took the red one is a miss, so the real usefulness is probably higher, but nothing here was A/B tested on live customers. The catalog is the ${retail.catalog_size} best sellers, which make up ${Math.round(retail.coverage * 100)}% of order lines; the long tail gets no suggestions. And with no customer history, a first-time visitor and a loyal wholesaler get the same answer for the same basket.`,
  code: "ml/train.py → retail()",
});

const rtChosen = router.comparison.find((c) => c.model === router.chosen)!;
const rt60 = router.confidence.find((c) => Math.abs(c.t - 0.6) < 1e-9)!;

caseStudies.push({
  slug: "complaint-router",
  title: "Complaint Router",
  category: "NLP",
  line: "Reading a customer's message and sending it to the right team, in the browser, typos included.",
  overview: [
    "Every support inbox has the same first job: read the message, decide who should handle it. Done by hand, it is slow and inconsistent; done badly by a bot, tickets bounce between teams.",
    `This rebuild learns that job from ${(router.dataset.train + router.dataset.test).toLocaleString("en-US")} labelled bank customer messages. It reads letter chunks rather than whole words, picks one of 77 intents, and maps it to one of 8 teams. Below a confidence you choose, it hands the message to a person instead of guessing.`,
  ],
  process: [
    { title: "Raw data", value: `${(router.dataset.train + router.dataset.test).toLocaleString("en-US")} messages`, detail: `${router.dataset.intents} intents, fixed public test split` },
    { title: "Teams", value: `${router.dataset.teams} desks`, detail: "Intents grouped by who would handle them" },
    { title: "Features", value: "char n-grams", detail: "2–5 letters inside each word, TF-IDF weighted" },
    { title: "Tune", value: `C = ${router.cv.C}`, detail: `${router.cv.folds}-fold CV on the training set only` },
    { title: "Compare", value: `${router.comparison.length} models`, detail: "Naive Bayes, linear SVM, logistic (words, chars)" },
    { title: "Ship", value: `${router.shipped.ngrams.toLocaleString("en-US")} n-grams`, detail: `8-bit weights → ${(router.shipped.acc * 100).toFixed(1)}% exact in the browser` },
  ],
  stats: [
    { label: "Right team", value: `${(router.shipped.team_acc * 100).toFixed(1)}%` },
    { label: "Exact intent (of 77)", value: `${(router.shipped.acc * 100).toFixed(1)}%` },
    { label: "Right intent in top 3", value: `${(router.shipped.top3 * 100).toFixed(1)}%` },
    { label: "Auto-routed at 60%", value: `${Math.round(rt60.coverage * 100)}%` },
  ],
  problem: "Route each incoming customer message to the team that can resolve it, and know when to ask a human instead.",
  data: { name: router.dataset.name, source: router.dataset.source, detail: `${(router.dataset.train + router.dataset.test).toLocaleString("en-US")} messages, ${router.dataset.license}.` },
  approach: [
    `Kept the authors' fixed split: ${router.dataset.train.toLocaleString("en-US")} messages to learn from, ${router.dataset.test.toLocaleString("en-US")} (40 per intent) to test on.`,
    "Grouped the 77 intents into 8 support teams and scored both the exact intent and the team.",
    "Compared word and character n-gram features with Naive Bayes, a linear SVM and logistic regression; tuned only on the training set.",
    "Kept the strongest n-grams per intent, refit, stored the weights as 8-bit integers, and re-tested exactly that version.",
  ],
  comparisonLabel: "Exact intent · right team (test set)",
  comparison: [
    ...router.comparison.map((c) => ({ model: c.model, score: `${(c.acc * 100).toFixed(1)}% · ${(c.team_acc * 100).toFixed(1)}%`, note: c.model === router.chosen ? "best" : undefined })),
    { model: `Char n-grams, ${router.shipped.ngrams.toLocaleString("en-US")} features, 8-bit`, score: `${(router.shipped.acc * 100).toFixed(1)}% · ${(router.shipped.team_acc * 100).toFixed(1)}%`, note: "shipped" },
  ],
  honest: `These are short, tidy single questions, cleaner than real complaint emails, which are longer and mix several problems; real tickets would need their own labels. The 8 teams are my grouping, not part of the dataset, and some test labels are debatable: the model's most confident "mistakes" are arguably right. Neural sentence encoders in the original paper score a few points higher than this model's ${(rtChosen.acc * 100).toFixed(1)}%, but they need a server; this one runs in your browser.`,
  code: "ml/train.py → complaints()",
});

const upT = uplift.comparison.find((c) => c.model === uplift.chosen)!;
const upResp = uplift.comparison.find((c) => c.model === "Response model (who visits)")!;
const ptsOf = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)} pts`;

caseStudies.push({
  slug: "uplift-promo",
  title: "Uplift Promo Targeting",
  category: "Causal inference",
  line: "Not who will buy, but who the message changes: sending e-mails only where they make a difference.",
  overview: [
    "Most targeting models answer the wrong question: who is likely to act. Many of those people would act anyway, and messaging them wastes budget. Uplift modelling asks how much a message changes each person's behaviour.",
    `That needs a randomised test, and this ${uplift.dataset.rows.toLocaleString("en-US")}-customer e-mail experiment is one: a men's e-mail, a women's e-mail or nothing, assigned at random. The model learns where each e-mail works, and the demo turns that into a budget decision.`,
  ],
  process: [
    { title: "Raw data", value: `${uplift.dataset.rows.toLocaleString("en-US")} customers`, detail: "Three random groups, ~21,300 each" },
    { title: "Effect", value: `${ptsOf(uplift.ate.mens.visit[0])} · ${ptsOf(uplift.ate.womens.visit[0])}`, detail: "Visits within two weeks: men's · women's e-mail" },
    { title: "Model", value: "T-learner", detail: "One logistic model per group; uplift = difference" },
    { title: "Validate", value: "5-fold OOF", detail: "Every customer scored by models that never saw them" },
    { title: "Compare", value: `${uplift.comparison.length} methods`, detail: "T, S, class transformation, and a response model" },
    { title: "Decide", value: `½ list → ${Math.round(upHalf * 100)}%`, detail: "Of the women's e-mail effect kept" },
  ],
  stats: [
    { label: "Women's effect, half the sends", value: `${Math.round(upHalf * 100)}%` },
    { label: "Men's e-mail lift", value: ptsOf(uplift.ate.mens.visit[0]) },
    { label: "Women's e-mail lift", value: ptsOf(uplift.ate.womens.visit[0]) },
    { label: "Qini · women's", value: upT.womens.qini.toFixed(1) },
  ],
  problem: "Decide who gets which promotional e-mail so a limited budget buys the most extra visits.",
  data: { name: uplift.dataset.name, source: uplift.dataset.source, detail: `${uplift.dataset.rows.toLocaleString("en-US")} customers. ${uplift.dataset.license}.` },
  approach: [
    "Measured the average effect of each e-mail with 95% intervals, overall and inside customer groups.",
    "Trained one logistic model per group (T-learner); a customer's uplift is the difference between their predicted visit chances.",
    "Scored everyone out-of-fold and judged methods by Qini curves against the randomised control group.",
    "Compared with gradient boosting, an S-learner, class transformation, and a plain response model that ranks by who is likely to visit.",
  ],
  comparisonLabel: "Qini (area above random) · men's / women's",
  comparison: uplift.comparison.map((c) => ({ model: c.model, score: `${c.mens.qini.toFixed(2)} / ${c.womens.qini.toFixed(2)}`, note: c.model === uplift.chosen ? "shipped" : undefined })),
  honest: `For the women's e-mail, uplift ranking clearly beats a response model (Qini ${upT.womens.qini.toFixed(1)} vs ${upResp.womens.qini.toFixed(1)}). For the men's e-mail it doesn't (${upT.mens.qini.toFixed(1)} vs ${upResp.mens.qini.toFixed(1)}): that e-mail lifts almost everyone by a similar amount, so there is little to target, and saying so is the honest result. Purchases are too rare here (about 1 in 100) to model per customer, so uplift is measured on visits. The data is one retailer in 2008, released without a formal licence.`,
  code: "ml/train.py → uplift()",
});

const hsBand = house.comparison.find((c) => c.model.startsWith("Least"))!;
const hsGbm = house.comparison.find((c) => c.model.startsWith("Gradient"))!;

caseStudies.push({
  slug: "house-price-range",
  title: "House Price Range",
  category: "Regression",
  line: "A price estimate you can trust: a range that holds the real price about 80% of the time.",
  overview: [
    "A single predicted price sounds precise and is almost always wrong. What a buyer, seller or lender needs is a range, and a range is only useful if it is honest: an \u201c80% range\u201d should contain the real price about 80% of the time.",
    `This rebuild prices homes in Ames, Iowa with quantile regression (the 10th, 50th and 90th percentile instead of one average), calibrates the range on a separate year with conformal prediction, and checks it on ${house.split.test} sales from a year it never saw.`,
  ],
  process: [
    { title: "Raw data", value: `${house.dataset.rows.toLocaleString("en-US")} sales`, detail: `${house.dataset.columns} columns, ${house.dataset.years[0]}–${house.dataset.years[1]}` },
    { title: "Clean", value: `${house.dataset.kept.toLocaleString("en-US")} kept`, detail: "Typical market sales, no 4,000+ sq ft homes" },
    { title: "Split", value: "by year", detail: "Learn 2006–08 · calibrate 2009 · test 2010" },
    { title: "Model", value: "3 quantiles", detail: "10th, 50th, 90th percentile of log price" },
    { title: "Calibrate", value: "conformal", detail: "Offset from 2009 so 80% means 80%" },
    { title: "Result", value: `${(houseChosen.calibrated.coverage * 100).toFixed(1)}% inside`, detail: `${house.split.test} sales in 2010` },
  ],
  stats: [
    { label: "2010 sales inside the 80% range", value: `${(houseChosen.calibrated.coverage * 100).toFixed(1)}%` },
    { label: "Middle estimate error", value: `$${Math.round(houseChosen.mae / 100) / 10}k (${(houseChosen.mape * 100).toFixed(1)}%)` },
    { label: "Typical range", value: `±${Math.round((houseChosen.calibrated.width_pct / 2) * 100)}%` },
    { label: "Test sales", value: String(house.split.test) },
  ],
  problem: "Estimate what a house will sell for as a range that is honest about its uncertainty.",
  data: { name: house.dataset.name, source: house.dataset.source, detail: `${house.dataset.rows.toLocaleString("en-US")} sales. ${house.dataset.license}.` },
  approach: [
    `Kept ${house.dataset.kept.toLocaleString("en-US")} typical market sales, as the data's author recommends; modelled log price from 14 readable features.`,
    "Fitted linear quantile regressions for the 10th, 50th and 90th percentile; the penalty was chosen on the 2009 sales, not the test year.",
    "Calibrated the range with conformalised quantile regression on 2009 sales, then tested once on 2010.",
    "Compared with gradient boosting (quantile loss), least squares with a fixed band, and neighbourhood price ranges.",
  ],
  comparisonLabel: "Coverage of the 80% range · middle estimate error (2010)",
  comparison: house.comparison.map((c) => ({ model: c.model, score: `${(c.calibrated.coverage * 100).toFixed(1)}% · ${(c.mape * 100).toFixed(1)}%`, note: c.model === house.chosen ? "shipped" : undefined })),
  honest: `A plain least-squares line with a fixed band covers just as well here (${(hsBand.calibrated.coverage * 100).toFixed(1)}%), so the quantile model's edge is small: the best pinball loss, and ranges that come straight from the model. Gradient boosting's middle estimates were slightly better ($${Math.round(hsGbm.mae / 100) / 10}k vs $${Math.round(houseChosen.mae / 100) / 10}k error) but its ranges were too narrow. Conformal calibration assumes next year looks like the calibration year, and 2010 here only runs from January to July. One Iowa college town, ${house.dataset.years[0]}–${house.dataset.years[1]}, published without a formal licence.`,
  code: "ml/train.py → ames()",
});

const fbWorst = [...feedbackM.themes].sort((a, b) => b.in_low / b.in_high - a.in_low / a.in_high)[0];

caseStudies.push({
  slug: "feedback-themes",
  title: "Feedback Themes",
  category: "NLP",
  line: "Reading 22,000 reviews at once: what customers talk about, and what the unhappy ones talk about.",
  overview: [
    "Star ratings say how a customer felt, not why. The why is in the text, and nobody reads twenty thousand reviews. This is the problem a feedback tool has to solve: turn open text into a handful of themes a team can act on.",
    `This rebuild finds ${feedbackM.k} themes in clothing reviews with a topic model that is never told what to look for, links them to stars and the recommend box, and adds a tone model that flags unhappy reviews. Both run in your browser on any text you type.`,
  ],
  process: [
    { title: "Raw data", value: `${feedbackM.dataset.rows.toLocaleString("en-US")} reviews`, detail: `${feedbackM.dataset.with_text.toLocaleString("en-US")} with text` },
    { title: "Words", value: "TF-IDF", detail: `${feedbackM.theme_model.vocab.length.toLocaleString("en-US")} words, stop words removed` },
    { title: "Themes", value: `NMF, k = ${feedbackM.k}`, detail: "Number of themes chosen by coherence" },
    { title: "Link", value: "themes × stars", detail: "Which themes fill the 1–2★ reviews" },
    { title: "Tone", value: `AUC ${feedbackM.shipped.roc_auc.toFixed(3)}`, detail: "Logistic model on words and phrases" },
    { title: "Ship", value: "8-bit weights", detail: "Themes and tone computed in the browser" },
  ],
  stats: [
    { label: "Themes found", value: String(feedbackM.k) },
    { label: "Tone model ROC-AUC", value: feedbackM.shipped.roc_auc.toFixed(3) },
    { label: `${fbWorst.name} in 1–2★ reviews`, value: `${Math.round(fbWorst.in_low * 100)}%` },
    { label: "Reviews analysed", value: feedbackM.dataset.with_text.toLocaleString("en-US") },
  ],
  problem: "Turn thousands of free-text reviews into themes a team can act on, and spot the unhappy ones.",
  data: { name: feedbackM.dataset.name, source: feedbackM.dataset.source, detail: `${feedbackM.dataset.rows.toLocaleString("en-US")} reviews, ${feedbackM.dataset.license}.` },
  approach: [
    "Turned each review into TF-IDF word weights, leaving out stop words and words like dress or love that say little on their own.",
    `Factorised the reviews into themes with NMF; compared 6 to 12 themes by coherence and diversity and kept ${feedbackM.k}.`,
    "Read every theme against stars and the recommend box, overall and per department.",
    "Trained a tone model on the recommend box (held-out 20% test), shrank it to 2,500 phrases with 8-bit weights, and re-tested that version.",
  ],
  comparisonLabel: "Tone model: ROC-AUC · average precision (test split)",
  comparison: [
    ...feedbackM.comparison.map((c) => ({ model: c.model, score: `${c.roc_auc.toFixed(3)} · ${c.ap.toFixed(3)}`, note: c.model === feedbackM.chosen ? "best" : undefined })),
    { model: `Shipped: ${feedbackM.shipped.ngrams.toLocaleString("en-US")} n-grams, 8-bit`, score: `${feedbackM.shipped.roc_auc.toFixed(3)} · ${feedbackM.shipped.ap.toFixed(3)}`, note: "shipped" },
  ],
  honest: `A topic model finds word patterns, not meaning: the theme names are my reading of them, and "${fbWorst.name}" bundles fabric and fit complaints together. The recommend box is noisy (some 4–5★ reviewers ticked "would not recommend"), which caps how good any tone model can look. One anonymised retailer, English only; the reviewer's age is in the data but left out.`,
  code: "ml/train.py → feedback()",
});

export const getCase = (slug: string) => caseStudies.find((c) => c.slug === slug);
