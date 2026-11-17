/**
 * Deep Learning & Vision skill: method, lab, case studies and toolkit.
 * Every number comes from the training JSON written by ml/train.py.
 */
import digits from "./models/handwritten-digits.json";
import gestures from "./models/hand-gestures.json";
import lf from "./models/live-forecasts.json";
import bs from "./models/bilingual-sentiment.json";
import dd from "./models/doodle-duel.json";
import sl from "./models/sign-language.json";
import airCheck from "./models/air-synth.json";
import { faceModel } from "./face-model";
import { detector, detectorOptions } from "./object-detector";
import type { CaseStudy } from "./skills";

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const n = (v: number) => v.toLocaleString("en-US");

const cmp = (name: string) => digits.comparison.find((c) => c.model === name)!;
const dgAug = cmp(digits.chosen);
const dgCnn = cmp("Small CNN");
const dgSoft = cmp("Softmax regression (no hidden layer)");
const kb = (b: number) => `${Math.round(b / 1024)} KB`;

const gcmp = (name: string) => gestures.comparison.find((c) => c.model === name)!;
const gsShip = gcmp(gestures.chosen);
const gsAug = gcmp("Small CNN + augmentation");
const gsMobile = gestures.comparison.find((c) => c.model.startsWith("MobileNet"))!;
const NEWBG = "New background";
const PINCH_DOWN = 0.28; // same thresholds as src/lib/virtual-mouse.ts
const PINCH_UP = 0.42;

const lfPm = (m: string) => lf.pm25.comparison.find((c) => c.model === m)!;
const lfPmGain = 1 - lfPm("LSTM").mae / lfPm("Same hour yesterday").mae;
const lfFx = (m: string) => lf.fx.comparison.find((c) => c.model.startsWith(m))!;
const lfWk = (m: string) => lf.wiki.comparison.find((c) => c.model === m)!;
const lfWkBest = [...lf.wiki.comparison].filter((c) => c.model !== "LSTM").sort((a, b) => a.mae_log - b.mae_log)[0];
const lfParams = (m: { units: number; inputDim: number; horizon: number }) => 4 * m.units * (m.inputDim + m.units + 1) + m.units * m.horizon + m.horizon;
const bsParams = (l: typeof bs.id | typeof bs.en) => l.comparison.find((c) => c.model === l.chosen)!.params;
const bsLr = (l: typeof bs.id | typeof bs.en) => l.comparison.find((c) => c.model.startsWith("TF-IDF"))!;
const bsLrEn = bs.en.comparison.find((c) => c.model.startsWith("TF-IDF"))!;
const ddBy = (m: string) => dd.comparison.find((c) => c.model === m)!;
const ddChosen = ddBy(dd.chosen);
const slNN = "Neural network (MLP)";
const slGrouped = (sl.results.grouped as Record<string, number>)[slNN];
const slRandom = (sl.results.random as Record<string, number>)[slNN];
const lfWeights = lfParams(lf.pm25.model) + lfParams(lf.fx.model) + lfParams(lf.wiki.model);

export const dlCategories = ["Computer vision", "Sequences", "NLP"];

/** Data for "How a neural network learns" on the DL page: Jakarta's typical PM2.5 per hour of day, and last week hour by hour. */
export const pmProfile = { byHour: lf.pm25.by_hour, hours: lf.pm25.hours, week: { time: lf.pm25.snapshot.time, value: lf.pm25.snapshot.value } };

type Weights = { shape: number[]; b: number[] };
const layerParams = (layers: Weights[]) => layers.reduce((s, l) => s + l.shape.reduce((a, b) => a * b, 1) + l.b.length, 0);
/** Weights in the networks trained for this page, counted from the exported models. */
export const dlNetworkSizes = [
  { name: "Sign Language MLP", params: layerParams(Object.values(sl.model) as Weights[]) },
  { name: "PM2.5 LSTM", params: lfParams(lf.pm25.model) },
  { name: "Digits CNN", params: layerParams(Object.values(digits.model) as Weights[]) },
  { name: "Doodle CNN", params: layerParams(Object.values(dd.model) as Weights[]) },
  { name: "Indonesian BiLSTM", params: bsParams(bs.id) },
  { name: "English BiLSTM", params: bsParams(bs.en) },
];


export const dlProjects = [
  {
    slug: "doodle-duel",
    title: "Doodle Duel",
    category: "Computer vision",
    problem: "A drawing game: you get a word and 20 seconds, the network guesses while you draw.",
    method: `CNN trained on ${(dd.split.train / 1000).toFixed(0)}k Quick, Draw! doodles, in the browser`,
    metric: { label: "First-guess accuracy", value: pct(dd.shipped.acc) },
    status: "live" as const,
  },
  {
    slug: "face-mood",
    title: "Face Mood Mirror",
    category: "Computer vision",
    problem: "Make a face at your camera: it reads your expression, shows why, and an avatar copies you.",
    method: "MediaPipe face mesh + blendshapes, FACS rules calibrated to your face",
    metric: { label: "Face movements read", value: String(faceModel.blendshapes) },
    status: "live" as const,
  },
  {
    slug: "drowsiness",
    title: "Drowsiness Detector",
    category: "Computer vision",
    problem: "Close your eyes at the camera for too long and an alarm goes off, like a driver-fatigue monitor.",
    method: "Eye aspect ratio from face landmarks, calibrated per person",
    metric: { label: "Default alarm", value: "1.5 s" },
    status: "live" as const,
  },
  {
    slug: "virtual-mouse",
    title: "Virtual Mouse",
    category: "Computer vision",
    problem: "Move a cursor with your index finger and click by pinching: a hands-free mouse in the browser.",
    method: "MediaPipe hand landmarks, One Euro smoothing, pinch with hysteresis",
    metric: { label: "Hand points tracked", value: "21" },
    status: "live" as const,
  },
  {
    slug: "sign-language",
    title: "Sign Language Speller",
    category: "Computer vision",
    problem: "Make an ASL letter with your hand: it reads the letter live and types the words you spell.",
    method: "MediaPipe hand landmarks + a neural network trained on ASLNow!",
    metric: { label: "Letters right (grouped test)", value: pct(slGrouped) },
    status: "live" as const,
  },
  {
    slug: "traffic-counter",
    title: "Traffic Counter",
    category: "Computer vision",
    problem: "Pick a live London traffic camera: every car, bus, bike and pedestrian is tracked and counted across a line.",
    method: "EfficientDet-Lite0 + my own tracker and line counter, on TfL open data",
    metric: { label: "Live cameras", value: "~900" },
    status: "live" as const,
  },
  {
    slug: "head-keyboard",
    title: "Head & Blink Keyboard",
    category: "Computer vision",
    problem: "Type without your hands: point with your head or your eyes, blink to press, or type with blinks alone.",
    method: "Head pose, iris gaze and eye aspect ratio from face landmarks; dwell and scanning",
    metric: { label: "Ways to select", value: "3" },
    status: "live" as const,
  },
  {
    slug: "air-synth",
    title: "Air Synth",
    category: "Computer vision",
    problem: "Play music in the air: one hand sets the note, the other the volume or the chord, like a theremin.",
    method: "Two-hand landmarks, finger counting and thumb taps, a Web Audio synthesizer",
    metric: { label: "Finger count right (real hands)", value: pct(airCheck.count_acc) },
    status: "live" as const,
  },
  {
    slug: "handwritten-digits",
    title: "Handwritten Digits",
    category: "Computer vision",
    problem: "Draw a digit: can a small network read it the way a person does?",
    method: "CNN with data augmentation, 8-bit weights",
    metric: { label: "Test accuracy", value: pct(digits.shipped.acc, 2) },
    status: "live" as const,
  },
  {
    slug: "hand-gestures",
    title: "Hand Gestures",
    category: "Computer vision",
    problem: "Make a fist at your camera: live hand tracking and gestures, then rock, paper, scissors.",
    method: "MediaPipe hand landmarks + gestures; my CNN as the experiment",
    metric: { label: "Live gestures", value: "7" },
    status: "live" as const,
  },
  {
    slug: "object-detection",
    title: "Live Object Detection",
    category: "Computer vision",
    problem: "Point your camera at a desk or a street: what's there, and where?",
    method: "EfficientDet-Lite0 on MediaPipe, in the browser",
    metric: { label: "Objects it knows", value: String(detector.classes) },
    status: "live" as const,
  },
  {
    slug: "live-forecasts",
    title: "Live Forecast Lab",
    category: "Sequences",
    problem: "Jakarta's air, the rupiah and Wikipedia attention: forecast from today's data, then checked against what happened.",
    method: "Three LSTMs on live public APIs, against simple baselines",
    metric: { label: "Air: error vs best simple guess", value: `−${pct(lfPmGain, 0)}` },
    status: "live" as const,
  },
  {
    slug: "bilingual-sentiment",
    title: "Bilingual Sentiment",
    category: "NLP",
    problem: "Type in Indonesian or English: is it positive, negative or neutral, which words decided, and (in English) which emotions?",
    method: "BiLSTMs trained from scratch vs TF-IDF baseline, int8, in the browser",
    metric: { label: "English emotions", value: "28" },
    status: "live" as const,
  },
];

export const dlMethod = [
  {
    title: "Frame & collect",
    line: "Decide what goes in, what comes out and how it will be judged, then find data with a clear licence.",
    tools: ["Public datasets", "Licence check"],
    seen: { slug: "handwritten-digits", text: `${n(digits.dataset.train + digits.dataset.test)} labelled digits, ${digits.dataset.license.split(" (")[0]}` },
  },
  {
    title: "Prepare tensors",
    line: "Scale, reshape and split, so the network sees clean numbers and the test set stays untouched.",
    tools: ["NumPy", "Train / val / test"],
    seen: { slug: "handwritten-digits", text: `Pixels scaled to 0–1; ${n(digits.split.val)} training images held back to stop training at the right time` },
  },
  {
    title: "Start simple",
    line: "A model with no hidden layer first: it sets the bar every deeper network has to clear.",
    tools: ["Keras", "Baselines"],
    seen: { slug: "handwritten-digits", text: `No hidden layer already reads ${pct(dgSoft.acc)} of test digits` },
  },
  {
    title: "Build the network",
    line: "Add the structure the data needs: convolutions for images, recurrence for sequences.",
    tools: ["Conv2D", "Pooling", "Dropout"],
    seen: { slug: "handwritten-digits", text: `Two small conv blocks, ${n(dgAug.params)} parameters, ${pct(dgCnn.acc, 2)} without any tricks` },
  },
  {
    title: "Train for the real world",
    line: "Augment the training data and stop early, so the model survives inputs that don't look like the test set.",
    tools: ["Augmentation", "Background swaps", "Early stopping"],
    seen: { slug: "hand-gestures", text: `Swapping the white background while training lifts unseen-background accuracy from ${pct(gsAug.robust[NEWBG])} to ${pct(gsShip.robust[NEWBG])}` },
  },
  {
    title: "Shrink & ship",
    line: "Quantise the weights, re-test the small version, and run it where the user is.",
    tools: ["8-bit weights", "TypeScript"],
    seen: { slug: "handwritten-digits", text: `${kb(digits.shipped.bytes)} of weights, ${pct(digits.shipped.acc, 2)} accuracy, running in your browser` },
  },
];

export const dlCaseStudies: CaseStudy[] = [
  {
    slug: "handwritten-digits",
    title: "Handwritten Digits",
    category: "Computer vision",
    line: "A convolutional network that reads digits you draw, trained with TensorFlow and running in your browser.",
    overview: [
      "Reading handwriting was one of the first jobs neural networks did in the real world, sorting post and cheques. It is still the clearest way to show what a convolutional network adds: it learns small visual patterns and combines them, instead of memorising pixels.",
      `This rebuild climbs from a model with no hidden layer to a small CNN trained with augmentation, tests each one on ${n(digits.dataset.test)} digits it never saw and on shifted, rotated and shrunk copies, then shrinks the winner to 8-bit weights so it runs on the canvas below.`,
    ],
    process: [
      { title: "Raw data", value: `${n(digits.dataset.train + digits.dataset.test)} digits`, detail: "28×28 grayscale, labelled 0–9" },
      { title: "Prepare", value: "0–1 pixels", detail: `${n(digits.split.train)} train · ${n(digits.split.val)} val · ${n(digits.split.test)} test` },
      { title: "Baseline", value: pct(dgSoft.acc), detail: "No hidden layer" },
      { title: "CNN", value: `${n(dgAug.params)} params`, detail: "2 conv blocks + dense layer" },
      { title: "Augment", value: "shift · rotate · zoom", detail: "Random changes while training" },
      { title: "Ship", value: pct(digits.shipped.acc, 2), detail: `${kb(digits.shipped.bytes)} of 8-bit weights` },
    ],
    stats: [
      { label: "Test accuracy (browser model)", value: pct(digits.shipped.acc, 2) },
      { label: "Mistakes out of 10,000", value: n(digits.shipped.errors) },
      { label: "Shifted digits", value: pct(dgAug.robust["Shifted ±4 px"]) },
      { label: "Weights", value: kb(digits.shipped.bytes) },
    ],
    problem: "Recognise a handwritten digit from a small grayscale image, including messy digits drawn by visitors.",
    data: { name: digits.dataset.name, source: digits.dataset.source, detail: `${n(digits.dataset.train + digits.dataset.test)} images, ${digits.dataset.license}.` },
    approach: [
      `Kept the official ${n(digits.dataset.test)}-image test set for the end; held back ${n(digits.split.val)} training images for early stopping.`,
      "Trained four networks of growing power with TensorFlow/Keras: no hidden layer, one dense hidden layer, a small CNN, and the same CNN with augmentation.",
      "Tested every model on the plain test set and on shifted, rotated and shrunk copies of it.",
      "Quantised the chosen CNN to 8 bits per weight and re-tested it with the exact forward pass the browser runs.",
    ],
    comparisonLabel: "Test accuracy · shifted digits",
    comparison: digits.comparison.map((c) => ({ model: c.model, score: `${pct(c.acc, 2)} · ${pct(c.robust["Shifted ±4 px"])}`, note: c.model === digits.chosen ? "shipped" : undefined })),
    honest: `MNIST is a solved benchmark: its digits are clean, centred and written by a few thousand people decades ago, so ${pct(digits.shipped.acc, 2)} on its test set says more about the method than about real-world handwriting. Digits drawn with a mouse look different, which is exactly why the shipped model was trained with augmentation; it still slips on very thin, off-centre or unusual digits. The plain CNN scores ${pct(dgCnn.acc, 2)} on the test set, ${dgCnn.acc > dgAug.acc ? "a touch above" : "close to"} the augmented one, but falls to ${pct(dgCnn.robust["Shifted ±4 px"])} on shifted digits.`,
    code: "ml/train.py → mnist()",
  },
  {
    slug: "hand-gestures",
    title: "Hand Gestures",
    category: "Computer vision",
    line: "Hand gestures read live from your webcam, in the browser, and a CNN experiment that shows why hand landmarks beat raw pixels.",
    overview: [
      "Gesture control has to work in a real room: any background, any light, any hand. The robust way is to find the hand first and describe it by its joints, not by its pixels. MediaPipe does exactly that, tracking 21 points per hand in real time, and its gesture model reads fist, palm, victory and more from those points.",
      `The live demo runs MediaPipe in your browser with WebAssembly and the GPU, smooths its answers over the last frames and turns them into a rock-paper-scissors game. Below it, my own CNN trained on rendered hands shows the alternative: on backgrounds it never saw it falls to ${pct(gsAug.robust[NEWBG])}, and background swaps only lift it to ${pct(gsShip.robust[NEWBG])}.`,
    ],
    process: [
      { title: "Camera", value: "your webcam", detail: "Frames stay on the device" },
      { title: "Hand points", value: "21 landmarks", detail: "MediaPipe's tracker, WebAssembly + GPU" },
      { title: "Gesture", value: "7 classes", detail: "MediaPipe's classifier on the landmarks" },
      { title: "Smoothing", value: "10 frames", detail: "Majority vote, so one noisy frame can't flip it" },
      { title: "Game", value: "✊ ✋ ✌️", detail: "Fist, palm and victory become your move" },
      { title: "Experiment", value: `${pct(gsAug.robust[NEWBG])} → ${pct(gsShip.robust[NEWBG])}`, detail: "My pixel CNN on unseen backgrounds" },
    ],
    stats: [
      { label: "Live gestures", value: "7" },
      { label: "Hand points tracked", value: "21" },
      { label: "Model download", value: "8 MB, once" },
      { label: "Pixel CNN, unseen backgrounds", value: pct(gsShip.robust[NEWBG]) },
    ],
    problem: "Recognise hand gestures live from a webcam in any room, and show why a landmark-based model is the robust choice.",
    data: { name: gestures.dataset.name, source: gestures.dataset.source, detail: `${n(gestures.dataset.train + gestures.dataset.test)} images, ${gestures.dataset.license}.` },
    approach: [
      "Ran MediaPipe's gesture recognizer (hand detector, 21-point landmark model, gesture classifier) in the browser, self-hosted, GPU first with a CPU fallback.",
      "Smoothed the per-frame gesture with a majority vote over the last 10 frames and mapped fist, palm and victory to a rock-paper-scissors game.",
      `For comparison, trained my own CNN on ${n(gestures.dataset.train)} rendered hands with TensorFlow: plain, with augmentation, and with background swaps, plus MobileNetV2 transfer learning.`,
      "Stress-tested every CNN on rotated, darker and new-background copies of the test set; the CNN runs in the browser too, with heatmaps of where it looks.",
    ],
    comparisonLabel: "CNN experiment: original test set · unseen backgrounds",
    comparison: gestures.comparison.map((c) => ({ model: c.model, score: `${pct(c.acc)} · ${pct(c.robust[NEWBG])}`, note: c.model === gestures.chosen ? "shipped" : undefined })),
    honest: `The live recognizer is MediaPipe's pretrained model from Google, used as it is: I built the camera pipeline, the smoothing, the game and the comparison, not the gesture model itself. It needs a decent camera and light, and struggles with very fast motion, gloves or a hand cut off by the frame. The CNN experiment uses rendered hands only, so even its stress test is synthetic; MobileNetV2 is sturdier there (${pct(gsMobile.robust[NEWBG])} on new backgrounds) but has ${Math.round(gsMobile.params / gsShip.params)}× the parameters.`,
    code: "ml/train.py → rps()",
  },
  {
    slug: "object-detection",
    title: "Live Object Detection",
    category: "Computer vision",
    line: "Boxes and labels for 80 everyday objects, live from your camera, computed on your own device.",
    overview: [
      "Object detection answers two questions at once: what is in the picture, and where. My original F1 project did it on racing footage; this rebuild turns it into a live tool anyone can point at their own surroundings.",
      `It runs Google's EfficientDet-Lite0, trained on COCO, through MediaPipe in the browser. Every frame the network scores ${detector.candidates.toLocaleString("en-US")} candidate boxes; the best box per object survives, and a confidence slider and object filters decide what you see.`,
    ],
    process: [
      { title: "Frame", value: "camera or photo", detail: "Processed on the device" },
      { title: "Resize", value: `${detector.input}×${detector.input}`, detail: "EfficientDet-Lite0 input" },
      { title: "Score", value: `${detector.candidates.toLocaleString("en-US")} boxes`, detail: "Candidate boxes per frame" },
      { title: "Merge", value: "best box", detail: "Overlaps for one object merged" },
      { title: "Filter", value: "your threshold", detail: "Confidence slider + object groups" },
      { title: "Show", value: "boxes + counts", detail: "Live, with fps on your device" },
    ],
    stats: [
      { label: "Objects it knows", value: String(detector.classes) },
      { label: "Candidate boxes per frame", value: detector.candidates.toLocaleString("en-US") },
      { label: "Model download", value: `${(detector.bytes / 1e6).toFixed(1)} MB` },
      { label: "Phone GPU (Google benchmark)", value: `${Math.round(detectorOptions.find((o) => o.chosen)!.gpu!)} ms` },
    ],
    problem: "Find and label everyday objects in a live camera feed, privately and fast enough for real time.",
    data: { name: "COCO: Common Objects in Context", source: detector.coco, detail: `${detector.instances} labelled objects, ${detector.classes} categories; model by Google (MediaPipe).` },
    approach: [
      "Compared the five detectors Google publishes for MediaPipe on its Pixel 6 benchmark and their file sizes; picked EfficientDet-Lite0 in float16.",
      "Ran it in the browser with MediaPipe, self-hosted, GPU first with a CPU fallback; the library loads only when you start the demo.",
      "Mapped boxes onto a mirrored selfie view without mirroring the labels, and added a front/back camera switch for phones.",
      "Kept the model's own threshold low and filtered live in the page, so the confidence slider and object groups react instantly.",
    ],
    comparisonLabel: "Google's Pixel 6 benchmark: GPU ms per frame · download size",
    comparison: detectorOptions.map((o) => ({ model: o.model, score: `${o.gpu ? `${o.gpu} ms` : "no GPU figure"} · ${o.mb.toFixed(1)} MB`, note: o.chosen ? "used" : undefined })),
    honest: "The detector is Google's, pretrained on COCO and used as published; I built the tool around it and did not retrain or re-evaluate it, and Google's page gives speeds but no accuracy figures for these models. It only knows COCO's 80 objects, so a racing car is just a car, and small, distant, blurry or partly hidden objects are often missed. Lowering the confidence slider finds more of them, along with more wrong boxes.",
    code: "src/components/demos/object-detection-demo.tsx",
  },
  {
    slug: "live-forecasts",
    title: "Live Forecast Lab",
    category: "Sequences",
    line: "Three small LSTMs that forecast Jakarta's air, the rupiah and Wikipedia attention from data fetched the moment you open the page.",
    overview: [
      "Most forecasting demos replay an old dataset. This one doesn't: every visit pulls the newest hourly air quality for Jakarta, the latest ECB exchange rate and yesterday's Indonesian Wikipedia pageviews, and forecasts forward from now. The forecast it made one horizon ago is checked against what actually happened, live.",
      `The three series behave very differently, and the results say so. For air, the LSTM cuts the error of the best simple guess by ${pct(lfPmGain, 0)}. For Wikipedia attention, one model for all articles learns how spikes fade. For the rupiah, it does not beat "no change", and the page says that plainly: what does work there is an uncertainty band that widens when the currency gets jumpy.`,
    ],
    process: [
      { title: "History", value: `${n(lf.pm25.hours)} h · ${n(lf.fx.days)} d`, detail: `Plus ${n(lf.wiki.articles)} Wikipedia articles, cached once` },
      { title: "Windows", value: `${lf.pm25.L} h · ${lf.fx.L} d · ${lf.wiki.L} d`, detail: "Scaled inputs, split by time" },
      { title: "Baselines", value: "6 simple guesses", detail: "Same as now, yesterday, no change, drift, last week, 7-day mean" },
      { title: "LSTM", value: `${lf.pm25.model.units} · ${lf.fx.model.units} · ${lf.wiki.model.units} units`, detail: "Keras, Huber loss, early stopping" },
      { title: "Ship", value: `${n(lfWeights)} weights`, detail: "JSON; TypeScript forward pass = NumPy" },
      { title: "Live", value: "fetch → forecast → check", detail: "Three public APIs, from your browser" },
    ],
    stats: [
      { label: "Air: error vs best simple guess", value: `−${pct(lfPmGain, 0)}` },
      { label: "Air: average miss over 24 h", value: `${lfPm("LSTM").mae.toFixed(1)} µg/m³` },
      { label: "Rupiah: inside the 80% band", value: pct(lf.fx.band.coverage) },
      { label: "Wikipedia: typical miss, 7 days", value: pct(lfWk("LSTM").typical, 0) },
    ],
    problem: "Forecast three live public series from today's data, beat honest baselines where possible, and say so where not.",
    data: {
      name: "Open-Meteo (CAMS) · ECB via Frankfurter · Wikimedia pageviews",
      source: lf.pm25.url,
      detail: `${n(lf.pm25.hours)} hourly PM2.5 values, ${n(lf.fx.days)} daily exchange rates, ${n(lf.wiki.articles)} trending articles; all fetched live again in the browser.`,
    },
    approach: [
      `Cached the history once: Jakarta PM2.5 since ${lf.pm25.range[0].slice(0, 4)}, USD/IDR since ${lf.fx.range[0].slice(0, 4)}, and two years of daily views for every article that reached Indonesian Wikipedia's daily top list in the past year.`,
      "Split strictly by time: the newest stretch is the test set, the stretch before it decides when to stop training, and no window sees its own future.",
      "Set the bar with simple guesses: same as now, same hour yesterday, no change, long-run drift, same weekday last week, last 7-day average.",
      "Trained one small Keras LSTM per series that outputs the whole horizon at once; for the rupiah, added an 80% band from validation errors scaled by recent volatility.",
      "Rewrote the LSTM in TypeScript and checked it against NumPy; the page calls the APIs directly and runs every forecast on your device.",
    ],
    comparisonLabel: "Test error · LSTM vs the best simple guess",
    comparison: [
      { model: "Jakarta PM2.5, 24 h ahead", score: `${lfPm("LSTM").mae.toFixed(1)} vs ${lfPm("Same hour yesterday").mae.toFixed(1)} µg/m³`, note: "LSTM wins" },
      { model: "USD/IDR, 5 days ahead", score: `Rp ${lfFx("LSTM").mae5.toFixed(0)} vs Rp ${lfFx("No change").mae5.toFixed(0)}`, note: "no real difference" },
      { model: "Wikipedia views, 7 days ahead", score: `${pct(lfWk("LSTM").typical, 0)} vs ${pct(lfWkBest.typical, 0)} typical miss`, note: lfWk("LSTM").mae_log < lfWkBest.mae_log ? "LSTM wins" : "baseline wins" },
    ],
    honest: `The PM2.5 "actuals" are the Copernicus model's own estimates, not sensor readings, so the LSTM learns to forecast a model; the live demo shows the professional CAMS forecast next to it for that reason. The rupiah model is no better than "no change", as decades of research on exchange rates would predict; its ${pct(lfFx("LSTM").direction ?? 0)} right-direction score only reflects a weakening trend in the test period. The Wikipedia model cannot see the news, so it cannot predict a new spike, only how an existing one fades.`,
    code: "ml/train.py → live_forecasts() · ml/live_data.py",
  },
  {
    slug: "bilingual-sentiment",
    title: "Bilingual Sentiment",
    category: "NLP",
    line: "Sentiment for Indonesian and English, plus 28 emotions for English, from two small BiLSTMs running in your browser.",
    overview: [
      "Reading opinions at scale is one of the most common jobs for language models: product reviews, support tickets, comments. Most portfolio versions call a large hosted model. This one trains two small recurrent networks from scratch, one per language, and runs them on your device, with a view of which words decided each answer.",
      `The Indonesian model learned from ${n(bs.id.dataset.train)} labelled reviews and opinions (SmSA, IndoNLU); the English one from ${n(bs.en.dataset.train)} Reddit comments labelled with 28 emotions (GoEmotions, Google Research), which also give it a sentiment. Each network is compared with a TF-IDF + logistic regression baseline and with averaged word embeddings on test data it never saw.`,
    ],
    process: [
      { title: "Raw text", value: `${n(bs.id.dataset.train + bs.id.dataset.val + bs.id.dataset.test)} + ${n(bs.en.dataset.train + bs.en.dataset.val + bs.en.dataset.test)}`, detail: "Indonesian sentences + English comments" },
      { title: "Tokens", value: `${n(bs.id.vocab_size)} · ${n(bs.en.vocab_size)} words`, detail: "Same tokenizer in Python and the browser" },
      { title: "Baselines", value: `F1 ${bsLr(bs.id).f1.toFixed(2)} · ${bsLr(bs.en).f1.toFixed(2)}`, detail: "TF-IDF + logistic regression, test macro-F1" },
      { title: "BiLSTM", value: `${n(bsParams(bs.id))} · ${n(bsParams(bs.en))}`, detail: "Weights; English adds 28 emotion outputs" },
      { title: "Ship", value: "int8", detail: "8-bit weights, re-tested with the browser's forward pass" },
      { title: "Explain", value: "word by word", detail: "How much each word moves the answer" },
    ],
    stats: [
      { label: "Indonesian test macro-F1", value: bs.id.shipped.f1.toFixed(3) },
      { label: "English test macro-F1 (4 sentiments)", value: bs.en.shipped.f1.toFixed(3) },
      { label: "English emotions macro-F1", value: bs.en.shipped.emo_f1.toFixed(3) },
      { label: "Emotions it can name", value: "28" },
    ],
    problem: "Classify the sentiment of Indonesian and English text, name English emotions, and show which words drove each answer, without a server.",
    data: { name: "SmSA (IndoNLU) · GoEmotions (Google Research)", source: bs.id.dataset.source, detail: `${n(bs.id.dataset.train + bs.id.dataset.val + bs.id.dataset.test)} Indonesian sentences and ${n(bs.en.dataset.train + bs.en.dataset.val + bs.en.dataset.test)} English comments, both Apache-2.0.` },
    approach: [
      "Kept each dataset's official train, validation and test split; the test sets were scored once, at the end.",
      "Wrote one tokenizer used by both Python and TypeScript; words seen at least twice in training form each vocabulary, the rest share an 'unknown' vector.",
      "Compared three models per language: TF-IDF + logistic regression, averaged word embeddings and a BiLSTM (two sizes, chosen on validation data), all with balanced class weights.",
      "For English, one network with two heads: a softmax over four sentiments and 28 sigmoid emotions, each emotion with its own threshold tuned on validation data.",
      "Shipped 8-bit weights, re-tested them with the exact forward pass the browser runs, and explained answers by leaving each word out in turn.",
    ],
    comparisonLabel: "Test macro-F1 · Indonesian · English (sentiment) · English emotions",
    comparison: bs.id.comparison.map((c, i) => ({
      model: c.model,
      score: `${c.f1.toFixed(3)} · ${bs.en.comparison[i].f1.toFixed(3)} · ${bs.en.comparison[i].emo_f1.toFixed(3)}`,
      note: c.model === bs.id.chosen || bs.en.comparison[i].model === bs.en.chosen ? "shipped" : undefined,
    })),
    honest: `With thousands of short, labelled texts, a linear model on word counts is a strong rival. The BiLSTM only edges the TF-IDF baseline on Indonesian (macro-F1 ${bs.id.shipped.f1.toFixed(3)} vs ${bsLr(bs.id).f1.toFixed(3)}, at slightly lower accuracy) and does not beat it on English sentiment (${bs.en.shipped.f1.toFixed(3)} vs ${bsLr(bs.en).f1.toFixed(3)}) or on the 28 emotions (${bs.en.shipped.emo_f1.toFixed(3)} vs ${bsLrEn.emo_f1.toFixed(3)}), where the baseline trains one classifier per emotion. Every model scores lower on the official Indonesian test set than on validation; it is more balanced than the training data. Pretrained transformers such as IndoBERT or RoBERTa score clearly higher but weigh hundreds of megabytes; these networks are small enough to run instantly in a page. The two test sets are different kinds of text, so Indonesian and English scores should not be compared with each other.`,
    code: "ml/train.py → sentiment()",
  },
  {
    slug: "doodle-duel",
    title: "Doodle Duel",
    category: "Computer vision",
    line: "A drawing game against a CNN: it guesses your doodle while you draw, across 30 everyday things.",
    overview: [
      "Recognising a quick sketch is easy for people and surprisingly hard for a computer: everyone draws a cat differently, fast and messily. Google's Quick, Draw! project collected millions of 20-second doodles; this project trains a convolutional network on a sample of them and turns it into a game.",
      `You get a word and 20 seconds. Your strokes are framed exactly like the training doodles, the network runs in your browser many times a second, and it calls the answer as soon as your word is its top guess. Four networks were compared; the shipped one guesses ${pct(dd.shipped.acc)} of unseen test doodles first time and ${pct(dd.shipped.top3)} within three guesses.`,
    ],
    process: [
      { title: "Raw data", value: `${n(dd.split.train + dd.split.val + dd.split.test)} doodles`, detail: `10,000 per word, ${dd.categories.length} words` },
      { title: "Prepare", value: "28×28", detail: `${n(dd.split.train)} train · ${n(dd.split.val)} val · ${n(dd.split.test)} test` },
      { title: "Baseline", value: pct(ddBy("Softmax regression (no hidden layer)").acc), detail: "No hidden layer" },
      { title: "CNN", value: `${n(ddChosen.params)} weights`, detail: dd.chosen },
      { title: "Ship", value: pct(dd.shipped.acc), detail: `${Math.round(dd.shipped.bytes / 1024)} KB of 8-bit weights` },
      { title: "Play", value: "6 × 20 s", detail: "Live guesses while you draw" },
    ],
    stats: [
      { label: "First-guess accuracy (test)", value: pct(dd.shipped.acc) },
      { label: "Within three guesses", value: pct(dd.shipped.top3) },
      { label: "Things it knows", value: String(dd.categories.length) },
      { label: "Weights", value: `${Math.round(dd.shipped.bytes / 1024)} KB` },
    ],
    problem: "Recognise a fast, messy doodle among 30 everyday things while it is still being drawn, on any device.",
    data: { name: "Quick, Draw! (Google)", source: dd.dataset.source, detail: `${n(dd.split.train + dd.split.val + dd.split.test)} doodles sampled from the public dataset, ${dd.dataset.license}.` },
    approach: [
      "Fetched 10,000 doodles per word from five places spread through each of Google's files, then split 8,000 / 1,000 / 1,000.",
      "Measured how the dataset frames a drawing (longest side 26 of 28 pixels, centred) and framed the visitor's strokes the same way in the browser.",
      "Compared four networks in TensorFlow: no hidden layer, one dense layer, a small CNN and a wider CNN with augmentation; picked on validation accuracy.",
      "Shrank the chosen CNN to 8-bit weights, re-tested it with the browser's forward pass, and built the game around it: rounds, timer, live guesses and voice.",
    ],
    comparisonLabel: "Test accuracy · top-3",
    comparison: dd.comparison.map((c) => ({ model: c.model, score: `${pct(c.acc)} · ${pct(c.top3)}`, note: c.model === dd.chosen ? "shipped" : undefined })),
    honest: `The network only knows ${dd.categories.length} words, so anything else still gets the closest of them. It learned from 20-second doodles, so careful, detailed drawings can confuse it more than a quick sketch. The training sample is 10,000 of the 100,000+ drawings per word, taken from five places in each file rather than fully at random. Its most common mix-up is ${dd.pairs[0].actual} read as ${dd.pairs[0].predicted} (${dd.pairs[0].n} of 1,000 test doodles).`,
    code: "ml/train.py → doodles() · ml/quickdraw_data.py",
  },
  {
    slug: "face-mood",
    title: "Face Mood Mirror",
    category: "Computer vision",
    line: "Your facial expression read live from the camera, explained action unit by action unit, with an avatar that copies you.",
    overview: [
      `Faces move in a small number of well-studied ways. Google's Face Landmarker tracks ${faceModel.landmarks} points on the face and scores ${faceModel.blendshapes} of those movements every frame, in the browser. This project turns them into something you can see and play with.`,
      "The mood is read with rules from the Facial Action Coding System: each expression is a weighted recipe of action units, measured against your own relaxed face after a short calibration. The page shows which movements decided the reading, an avatar mirrors your face, and a challenge asks you to copy five moods as fast as you can.",
    ],
    process: [
      { title: "Camera", value: "your webcam", detail: "Frames stay on the device" },
      { title: "Face mesh", value: `${faceModel.landmarks} points`, detail: "Google's Face Landmarker, GPU first" },
      { title: "Movements", value: `${faceModel.blendshapes} blendshapes`, detail: "Each scored 0–1, every frame" },
      { title: "Calibrate", value: `${faceModel.calibrateMs / 1000} s`, detail: "Your relaxed face becomes the zero" },
      { title: "FACS rules", value: "5 moods", detail: "Weighted action units per expression" },
      { title: "Mirror", value: "avatar + challenge", detail: "Copies your face; Copy the mood" },
    ],
    stats: [
      { label: "Face points tracked", value: String(faceModel.landmarks) },
      { label: "Facial movements read", value: String(faceModel.blendshapes) },
      { label: "Moods", value: "5" },
      { label: "Model download", value: `${(faceModel.bytes / 1e6).toFixed(1)} MB` },
    ],
    problem: "Read a facial expression live from a webcam, explain the reading, and keep the video private.",
    data: { name: faceModel.name, source: faceModel.source, detail: `Pretrained by Google, ${faceModel.license}; ${faceModel.landmarks} landmarks and ${faceModel.blendshapes} blendshapes per frame.` },
    approach: [
      "Ran Google's Face Landmarker in the browser with MediaPipe, self-hosted, GPU first with a CPU fallback, asking for blendshapes and the head's pose.",
      "Wrote the mood rules from FACS: happy (AU12, AU6), surprised (AU1, AU2, AU5, AU26), sad (AU15, AU1 without AU2, AU17) and angry (AU4, AU9, AU24, AU7), each a weighted mean of its action units.",
      `Subtracted the visitor's relaxed face, averaged over ${faceModel.calibrateMs / 1000} seconds, and smoothed the blendshapes between frames so readings don't flicker.`,
      "Drew an original avatar driven by the same blendshapes and head pose, built the Copy the mood challenge on top, and added sliders for visitors without a camera.",
    ],
    honest: "The face model is Google's, used as published. The mood rules are mine and have not been measured on a labelled set of faces: the weights were set by hand from the FACS definitions and checked on synthetic expressions. Above all it reads expressions, not feelings: a smile can be polite, a frown can be concentration, and expressions vary between people and cultures, so it should never be used to judge anyone.",
    code: "src/lib/face-mood.ts · src/components/demos/face-mood-demo.tsx",
  },
  {
    slug: "drowsiness",
    title: "Drowsiness Detector",
    category: "Computer vision",
    line: "A driver-fatigue monitor in the browser: eye closure, blinks, PERCLOS and yawns from your webcam, with an alarm.",
    overview: [
      "Drowsiness causes a large share of road accidents, and the first signs are visible in the face: the eyes close for longer, blinks slow down, yawns come more often. Driver-monitoring systems in modern cars watch for exactly these cues.",
      `This project measures them from a webcam. Google's face mesh model tracks ${faceModel.landmarks} points; the detector uses twelve around the eyes to compute the eye aspect ratio, compares it with your own open eyes from a short calibration, and sounds an alarm when your eyes stay closed too long. A dashboard adds blink rate, PERCLOS and yawns.`,
    ],
    process: [
      { title: "Camera", value: "your webcam", detail: "Frames stay on the device" },
      { title: "Face mesh", value: `${faceModel.landmarks} points`, detail: "Google's Face Landmarker" },
      { title: "EAR", value: "6 points per eye", detail: "Eyelid opening over eye width" },
      { title: "Calibrate", value: "2 s", detail: "Your open-eye EAR becomes the reference" },
      { title: "Track", value: "blinks · PERCLOS · yawns", detail: "Over the last minute" },
      { title: "Alarm", value: "1.5 s closed", detail: "Adjustable, Web Audio tone" },
    ],
    stats: [
      { label: "Points used", value: "20" },
      { label: "Default alarm", value: "1.5 s" },
      { label: "Calibration", value: "2 s" },
      { label: "Model download", value: `${(faceModel.bytes / 1e6).toFixed(1)} MB` },
    ],
    problem: "Detect prolonged eye closure and fatigue cues from a webcam in real time, without sending video anywhere.",
    data: { name: faceModel.name, source: faceModel.source, detail: `Pretrained by Google, ${faceModel.license}; 12 eye and 8 mouth points of ${faceModel.landmarks} are used.` },
    approach: [
      "Ran Google's Face Landmarker in the browser (the same self-hosted model as Face Mood Mirror) and took the six EAR points of each eye and eight mouth points.",
      "Computed the eye aspect ratio in pixels, averaged over both eyes, and set the closed threshold per person: a share of the median EAR from a 2-second open-eye calibration.",
      "Timed every closure: short ones count as blinks, long ones fill the alarm bar; tracked PERCLOS over the last minute and yawns from the mouth aspect ratio.",
      "Added an alarm tone with the Web Audio API, a live EAR chart, adjustable thresholds and a slider simulation for visitors without a camera.",
    ],
    honest: "This is a demonstration, not a safety device: if you feel drowsy while driving, stop and rest. The face model is Google's; the thresholds are mine, taken from the EAR literature and checked on simulated closures, not measured on a labelled drowsiness dataset. It needs a lit, visible face, so darkness, sunglasses, a lowered head or looking down at a phone can fool it.",
    code: "src/lib/drowsiness.ts · src/components/demos/drowsiness-demo.tsx",
  },
  {
    slug: "virtual-mouse",
    title: "Virtual Mouse",
    category: "Computer vision",
    line: "A floating cursor you steer with your hand: point to move, pinch to click and drag, all from the webcam.",
    overview: [
      "Touch-free control matters in kitchens, operating theatres, kiosks and for people who can't use a mouse. Hand tracking makes it possible with an ordinary webcam: the joints of the hand are found many times a second, and a couple of fingertips are enough to act as a pointer.",
      "This project turns MediaPipe's 21 hand points into a cursor. The pointer sits between the thumb and index fingertip, is smoothed with a One Euro filter, and a pinch measured relative to the palm becomes a click or a drag. The events go to ordinary widgets in a playground: buttons, a slider, a draggable sticker, a drawing pad and a bubble-popping challenge.",
    ],
    process: [
      { title: "Camera", value: "your webcam", detail: "Frames stay on the device" },
      { title: "Hand points", value: "21 landmarks", detail: "Google's hand model, GPU first" },
      { title: "Cursor", value: "thumb–index midpoint", detail: "Mirrored, from the middle of the view" },
      { title: "Smooth", value: "One Euro filter", detail: "Still = steady, fast = responsive" },
      { title: "Pinch", value: `< ${PINCH_DOWN} · > ${PINCH_UP}`, detail: "Gap ÷ palm length, with hysteresis" },
      { title: "Events", value: "down · move · up · click", detail: "Real pointer events on page widgets" },
    ],
    stats: [
      { label: "Hand points tracked", value: "21" },
      { label: "Points that drive it", value: "4" },
      { label: "Extra download", value: "none" },
      { label: "Actions", value: "move · click · drag" },
    ],
    problem: "Control a pointer with one hand in front of a webcam: move, click and drag, smoothly enough to use.",
    data: { name: "MediaPipe hand landmarks (Google)", source: "https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer", detail: "Pretrained, Apache-2.0; the gesture recognizer bundle already used by Hand Gestures, so no extra download." },
    approach: [
      "Reused the self-hosted MediaPipe gesture recognizer for its 21 hand landmarks, GPU first with a CPU fallback.",
      "Put the cursor at the midpoint of the thumb and index tips (stable while pinching), mirrored it and mapped the comfortable middle of the camera view to the whole playground.",
      "Smoothed the cursor with a One Euro filter and detected the pinch as fingertip gap over palm length, closing and opening at different thresholds.",
      "Sent synthetic pointer and click events to whatever sits under the cursor, so ordinary widgets respond, and built a playground to try it.",
    ],
    honest: "Browsers don't let a web page move the computer's real cursor or click outside the page, so this mouse works inside the playground; a desktop version would send the same events to the operating system. The hand model is Google's; the thresholds were tuned by hand, not benchmarked. It needs one hand in good light, and holding an arm up is tiring after a minute or two.",
    code: "src/lib/virtual-mouse.ts · src/components/demos/virtual-mouse-demo.tsx",
  },
  {
    slug: "sign-language",
    title: "Sign Language Speller",
    category: "Computer vision",
    line: "ASL fingerspelling read live from your webcam: hand landmarks, a small neural network, and the words you spell.",
    overview: [
      "Fingerspelling spells names and new words letter by letter with one hand, and it is where most people start learning a sign language. A webcam and a hand tracker are enough to read it: the shape of the hand is all a still letter needs.",
      `This project trains a neural network on ${n(sl.dataset.samples)} hand-landmark samples from the ASLNow! dataset. In the browser, MediaPipe tracks your hand, the network reads the letter, and holding it steady types it. Tested so that near-identical frames can't leak between training and test, it gets ${pct(slGrouped)} of letters right.`,
    ],
    process: [
      { title: "Raw data", value: `${n(sl.dataset.samples)} hands`, detail: `${sl.letters.length} letters, 21 points each` },
      { title: "Normalise", value: "wrist · palm", detail: "Position and distance stop mattering" },
      { title: "Group twins", value: `${n(sl.groups)} groups`, detail: "Near-duplicates kept on one side of the split" },
      { title: "Compare", value: "k-NN · forest · MLP", detail: "5-fold cross-validation, two ways" },
      { title: "Ship", value: pct(slGrouped), detail: "Neural network, grouped test" },
      { title: "Live", value: "hold to type", detail: "Majority over recent frames" },
    ],
    stats: [
      { label: "Letters right, grouped test", value: pct(slGrouped) },
      { label: "Random split (optimistic)", value: pct(slRandom) },
      { label: "Letters", value: String(sl.letters.length) },
      { label: "Training samples", value: n(sl.dataset.samples) },
    ],
    problem: "Recognise ASL fingerspelling letters from a webcam in real time and turn steady letters into text.",
    data: { name: "ASLNow! fingerspelling", source: sl.dataset.source, detail: `${n(sl.dataset.samples)} MediaPipe hand-landmark samples, ${sl.letters.length} letters, ${sl.dataset.license} licence.` },
    approach: [
      "Loaded every sample's 21 hand points and normalised them: wrist at the origin, divided by the palm's length.",
      `Grouped near-identical samples (${n(sl.groups)} groups), because the files have no participant id and neighbouring frames of one recording look alike.`,
      "Compared k-nearest neighbours, a random forest and a small neural network with stratified 5-fold cross-validation, on a random split and on the groups; trained with mirrored, rotated and stretched hands.",
      "Shipped the neural network as plain numbers, checked the TypeScript forward pass against NumPy, and built live spelling and word practice on MediaPipe hand tracking.",
    ],
    comparisonLabel: "5-fold accuracy · random split · near-duplicates grouped",
    comparison: Object.keys(sl.results.grouped).map((m) => ({ model: m, score: `${pct((sl.results.random as Record<string, number>)[m])} · ${pct((sl.results.grouped as Record<string, number>)[m])}`, note: m === slNN ? "shipped" : undefined })),
    honest: `This spells ASL letters; it doesn't translate sign language, which uses movement, both hands, the face and its own grammar (Indonesia's BISINDO included). The dataset is small and its number of signers unknown, so a new signer may score below the ${pct(slGrouped)} grouped result, and J and Z are learned as still poses although they move in ASL. Its most common mix-up is ${sl.pairs[0].actual} read as ${sl.pairs[0].predicted}.`,
    code: "ml/train.py → asl()",
  },
  {
    slug: "traffic-counter",
    title: "Traffic Counter",
    category: "Computer vision",
    line: "Real London traffic cameras, analysed in your browser: road users detected, tracked with ids and counted across a line, by type and direction.",
    overview: [
      "Counting vehicles and people is one of the most common real-world jobs for computer vision: city planning, road works, shop footfall. The hard part isn't seeing a car in one frame, it is knowing that the car in the next frame is the same one, so it is counted once.",
      "This project takes the newest clip from any of Transport for London's open traffic cameras, detects road users in every frame with EfficientDet-Lite0, links them into tracks with ids and trails, and counts each track once when it crosses a line you place, by type and direction. A small route on this site relays the clip so the browser is allowed to analyse it.",
    ],
    process: [
      { title: "Camera", value: "~900 in London", detail: "TfL JamCams, open data" },
      { title: "Relay", value: "one route", detail: "Same-origin clip, so pixels can be read" },
      { title: "Detect", value: "6 road-user types", detail: "EfficientDet-Lite0 (COCO)" },
      { title: "Track", value: "ids + trails", detail: "Overlap matching with predicted motion" },
      { title: "Count", value: "once per track", detail: "Line crossing, with direction" },
      { title: "Show", value: "live dashboard", detail: "Counts by type, in view now" },
    ],
    stats: [
      { label: "Live cameras", value: "~900" },
      { label: "Road-user types", value: "6" },
      { label: "Clip length", value: "≈10 s" },
      { label: "Server code", value: "1 relay route" },
    ],
    problem: "Count road users by type and direction from public traffic cameras, in the browser, from the latest footage.",
    data: { name: "TfL JamCams (Transport for London)", source: "https://api.tfl.gov.uk/Place/Type/JamCam", detail: "Open data, Powered by TfL Open Data; clips refreshed every few minutes." },
    approach: [
      "Checked public CCTV sources: TfL's JamCams and Singapore's traffic images are open data, but their files can't be read by a web page's AI without a relay; Indonesian city feeds publish no reuse terms, so they weren't used.",
      "Added two Next.js routes: the camera list (cached for an hour) and a relay for one camera's newest clip that only accepts TfL camera ids.",
      "Ran EfficientDet-Lite0 on every frame for six road-user classes and wrote a tracker: predicted boxes, greedy IoU matching, confirmation, coasting and a class vote.",
      "Counted each confirmed track once when its centre crosses the counting segment, with direction, and built the camera picker, movable line and dashboard; the same counter runs on a visitor's own camera.",
    ],
    honest: "Counts describe one ten-second clip of one junction, not traffic volume. They haven't been checked against hand counts: the clips are low resolution, so small or distant vehicles are missed and heavy overlap can merge or split tracks. The detector is Google's, used as published; the tracker, counter and relay are mine. Data: Powered by TfL Open Data; this project is not affiliated with or endorsed by TfL.",
    code: "src/lib/tracker.ts · src/lib/jamcams.ts · src/components/demos/traffic-demo.tsx",
  },
  {
    slug: "head-keyboard",
    title: "Head & Blink Keyboard",
    category: "Computer vision",
    line: "Hands-free typing for accessibility: the head or the eyes point, a blink presses, and a scanning mode works with blinks alone.",
    overview: [
      "For people living with ALS, a spinal cord injury or cerebral palsy, a keyboard can be out of reach while a small head movement or a blink is not. Augmentative and alternative communication (AAC) devices turn those movements into words, usually with dedicated eye-tracking hardware.",
      "This project does it with a webcam. Google's face model gives the head's pose and the eyelid points every frame; the page turns head movement into a pointer, a deliberate blink or a dwell into a key press, and offers row/column scanning for people who can only blink. Word suggestions in English and Bahasa Indonesia and a Speak button complete the message.",
    ],
    process: [
      { title: "Camera", value: "your webcam", detail: "Frames stay on the device" },
      { title: "Face model", value: `${faceModel.landmarks} points + pose`, detail: "Google's Face Landmarker" },
      { title: "Calibrate", value: "1.5 s", detail: "Neutral head pose and open-eye EAR" },
      { title: "Point", value: "head or eyes", detail: "Head pose or iris gaze, smoothed" },
      { title: "Press", value: "blink · dwell · scan", detail: "Three methods for different bodies" },
      { title: "Speak", value: "EN · ID", detail: "Word suggestions and text-to-speech" },
    ],
    stats: [
      { label: "Ways to select", value: "3" },
      { label: "Pointers", value: "head · eyes" },
      { label: "Suggestion languages", value: "2" },
      { label: "Extra download", value: "none" },
    ],
    problem: "Let someone type and speak a message with only head movements and blinks, using an ordinary webcam.",
    data: { name: faceModel.name, source: faceModel.source, detail: `Pretrained by Google, ${faceModel.license}; head pose and 12 eyelid points per frame.` },
    approach: [
      "Reused the self-hosted Face Landmarker for the head's transformation matrix and the eyelid points, and calibrated the neutral pose and open-eye EAR for each person.",
      "Mapped head turn and nod to a pointer over the keyboard, smoothed with a One Euro filter, with adjustable range and flips.",
      "Added an eye pointer from the iris landmarks (iris between the eye corners and lids), mapped by a 5-dot calibration and frozen during blinks, with clicks placed where the eyes were just before the lids moved.",
      "Offered an instant blink click (on the closing edge, one per 0.35 s) and a held blink (0.45 to 2.5 s, firing on reopening), plus dwell selection and row/column scanning.",
      "Built an alphabetical keyboard with word suggestions in English and Bahasa Indonesia, text-to-speech, and arrow keys plus Space as a fallback and switch input.",
    ],
    honest: "A demonstration, not a medical device: dedicated AAC systems use infrared eye trackers and are fitted and tested with their users, and this page hasn't been tested with people who rely on AAC. Expect a few words per minute. It needs a lit, visible face; glare from glasses, tremor or drooping eyelids need adjusted settings. The face model is Google's; everything on top is mine.",
    code: "src/lib/head-keyboard.ts · src/components/demos/head-keyboard-demo.tsx",
  },
  {
    slug: "air-synth",
    title: "Air Synth",
    category: "Computer vision",
    line: "A hand-played instrument: a theremin where the right hand sets the note and the left the volume, and finger chords where fingers pick the chord and thumb taps play it.",
    overview: [
      "The theremin, invented in 1920, is played without touching it: one hand moves near an antenna to change the pitch, the other near a loop to change the volume. A webcam and a hand model can do the same job as the antennas.",
      "This page tracks both hands and turns them into music in two ways. In Theremin mode the right hand's height picks a note on a scale and the left hand sets the volume, mutes with a fist and adds vibrato with a pinch. In Finger chords mode the left hand shows one to five fingers to pick a chord and the right thumb taps each finger to play its notes. The sound is synthesized live with the Web Audio API.",
    ],
    process: [
      { title: "Camera", value: "your webcam", detail: "Frames stay on the device" },
      { title: "Hand model", value: "2 × 21 points", detail: "Google's hand landmarks, two hands" },
      { title: "Assign", value: "right plays", detail: "By side of the mirrored screen" },
      { title: "Read", value: "height · fingers · taps", detail: "Divided by palm length, with hysteresis" },
      { title: "Music", value: "scale · chord", detail: "Snapped to a scale, five chords in a key" },
      { title: "Sound", value: "Web Audio", detail: "Oscillators, filter, reverb, limiter" },
    ],
    stats: [
      { label: "Modes", value: "2" },
      { label: "Finger count right", value: pct(airCheck.count_acc) },
      { label: "Real hands tested", value: n(airCheck.dataset.hands) },
      { label: "Extra download", value: "none" },
    ],
    problem: "Turn hand movements seen by a webcam into an instrument that is easy to play and sounds good, with no samples or audio libraries.",
    data: { name: "MediaPipe hand landmarks (Google)", source: "https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer", detail: `Pretrained, Apache-2.0, two hands at once; finger rules checked on ${n(airCheck.dataset.hands)} hands from ASLNow! (MIT).` },
    approach: [
      "Reused the self-hosted gesture recognizer bundle for its hand landmarks, now tracking two hands, and assigned their jobs by which side of the mirrored screen they are on.",
      "Mapped the playing hand's height to a position along a scale over two octaves, snapped with a margin so a resting hand doesn't flicker between notes, or glided continuously.",
      "Counted raised fingers by comparing each fingertip's distance from the wrist with its middle joint's, and found thumb-to-finger taps from distances divided by palm length with two thresholds.",
      `Checked the counting rule on ${n(airCheck.dataset.hands)} real hands from ASL letters with a known number of raised fingers: ${pct(airCheck.count_acc)} right; the thumb threshold was set from the same hands.`,
      "Built the synthesizer from Web Audio nodes: a gliding lead with vibrato, four plucked chord voices and a bass, a low-pass tone control, a generated reverb and a limiter, plus a note trail and oscilloscope, and mouse and keyboard play without a camera.",
    ],
    honest: "A toy instrument, not a replacement for one: the camera, the model and the audio each add a little delay, so fast rhythms are hard. The finger test uses ASL letter shapes, not people counting, and neighbouring video frames in that dataset look alike, so the score is a little optimistic; five fingers isn't covered. Hands are assigned by screen side, so crossing them swaps their jobs. The hand model is Google's; everything else is mine.",
    code: "src/lib/air-synth.ts · src/components/demos/air-synth-demo.tsx · scripts/check-air-synth.mjs",
  },
];

/** Toolkit for the DL page: stages of the pipeline (logos resolved in the server component). */
export const dlStack = [
  {
    title: "Open data",
    line: "Public image datasets with their licences, downloaded once and never committed.",
    tools: [
      { name: "MNIST", lucide: "database" as const, version: "70k images", role: "Handwritten digits, CC BY-SA 3.0, from Keras' public mirror" },
      { name: "Rock Paper Scissors", lucide: "database" as const, version: `${n(gestures.dataset.train + gestures.dataset.test)} images`, role: "Rendered hands by Laurence Moroney, CC BY 2.0" },
      { name: "COCO", lucide: "database" as const, version: `${detector.classes} objects`, role: "Behind Google's pretrained detector: 1.5 million labelled objects" },
      { name: "Open-Meteo · CAMS", lucide: "database" as const, version: `${n(lf.pm25.hours)} h`, role: "Hourly PM2.5 for Jakarta, CC BY 4.0, history and live" },
      { name: "ECB · Frankfurter", lucide: "database" as const, version: `${n(lf.fx.days)} days`, role: "Daily USD/IDR reference rates since 1999, history and live" },
      { name: "Quick, Draw!", lucide: "database" as const, version: `${(dd.split.train + dd.split.val + dd.split.test) / 1000}k doodles`, role: "Google's public doodle dataset, CC BY 4.0; 10,000 per word sampled" },
      { name: "SmSA · IndoNLU", lucide: "database" as const, version: `${n(bs.id.dataset.train + bs.id.dataset.val + bs.id.dataset.test)} sentences`, role: "Indonesian reviews and opinions labelled positive, neutral or negative, Apache-2.0" },
      { name: "GoEmotions", lucide: "database" as const, version: `${n(bs.en.dataset.train + bs.en.dataset.val + bs.en.dataset.test)} comments`, role: "English Reddit comments labelled with 28 emotions by Google Research, Apache-2.0" },
      { name: "ASLNow!", lucide: "database" as const, version: `${n(sl.dataset.samples)} hands`, role: "ASL fingerspelling hand landmarks, MIT licence" },
      { name: "TfL JamCams", lucide: "database" as const, version: "~900 cameras", role: "London traffic camera clips, open data (Powered by TfL Open Data)" },
      { name: "Wikimedia pageviews", lucide: "database" as const, version: `${n(lf.wiki.articles)} pages`, role: "Daily human views of trending Indonesian Wikipedia articles" },
    ],
  },
  {
    title: "Train in Python",
    line: "Networks built and trained with Keras on TensorFlow, compared against simpler baselines.",
    tools: [
      { name: "TensorFlow", logo: "siTensorflow", version: digits.tf.tensorflow, role: "Training CNNs, LSTMs and BiLSTMs, augmentation layers, deterministic runs" },
      { name: "Keras", logo: "siKeras", version: digits.tf.keras, role: "Sequential models, callbacks, early stopping" },
      { name: "NumPy", logo: "siNumpy", version: "2.5", role: "Data prep and the reference forward pass for 8-bit weights" },
      { name: "SciPy", logo: "siScipy", version: "1.18", role: "Stress tests: shifted, rotated, shrunk, new backgrounds" },
      { name: "MobileNetV2", logo: "siKeras", version: "ImageNet", role: "Pretrained reference model (Keras Applications), not shipped" },
    ],
  },
  {
    title: "Export",
    line: "CNN weights stored as 8-bit integers with one scale per filter; LSTM weights as rounded floats.",
    tools: [
      { name: "JSON · CNNs", logo: "siJson", version: kb(digits.shipped.bytes + gestures.shipped.bytes), role: "Every conv and dense weight of both CNNs, 8 bits each" },
      { name: "JSON · BiLSTMs", logo: "siJson", version: `${n(bsParams(bs.id) + bsParams(bs.en))} weights`, role: "Both sentiment networks and their vocabularies, 8 bits per weight" },
      { name: "JSON · LSTMs", logo: "siJson", version: `${n(lfWeights)} weights`, role: "The three LSTMs, scaling constants and the rupiah band" },
    ],
  },
  {
    title: "Run in your browser",
    line: "Convolutions, pooling and dense layers written in TypeScript: no TensorFlow.js, no server.",
    tools: [
      { name: "TypeScript", logo: "siTypescript", version: "5.9", role: "The CNN, LSTM and BiLSTM forward passes and the tokenizer, step by step" },
      { name: "MediaPipe", logo: "siMediapipe", version: "1.1.1", role: "Live hand tracking, gestures, face mesh with blendshapes and object detection (EfficientDet-Lite0), WebAssembly + GPU, self-hosted" },
      { name: "Canvas API", lucide: "pen" as const, role: "Drawing pads, stroke framing, hand skeleton, heatmaps and feature maps" },
      { name: "Web Audio API", lucide: "music" as const, role: "The Air Synth instrument: oscillators, filter, reverb and limiter, synthesized live" },
      { name: "Camera API", lucide: "camera" as const, role: "Webcam frames, processed on the device" },
      { name: "Fetch API", lucide: "globe" as const, role: "Live data straight from Open-Meteo, Frankfurter and Wikimedia, no server" },
      { name: "React", logo: "siReact", version: "19", role: "The demo and live probabilities" },
      { name: "Next.js", logo: "siNextdotjs", version: "16", role: "Static pages, plus one route that relays TfL camera clips" },
    ],
  },
];

export const dlChecks = [
  {
    title: "Split honestly",
    line: "The test set is opened once, at the end.",
    icon: "split" as const,
    checks: [
      { name: "Validation split for early stopping", detail: "Part of the training data decides when to stop; the test set never does", slugs: ["handwritten-digits", "hand-gestures"] },
      { name: "Official test set", detail: "Kept untouched until the end: different writers for digits, separate renders for gestures, held-out doodles", slugs: ["handwritten-digits", "hand-gestures", "doodle-duel"] },
      { name: "Official splits", detail: "Each text dataset's own train, validation and test split, test scored once", slugs: ["bilingual-sentiment"] },
      { name: "Grouped split", detail: "Near-identical samples kept on one side, so twins can't inflate the test score", slugs: ["sign-language"] },
      { name: "Split by time", detail: "The newest stretch is the test set; no window ever sees its own future", slugs: ["live-forecasts"] },
      { name: "Simple baselines first", detail: "Same as now, no change, last week, TF-IDF + logistic regression: the bar the network has to clear", slugs: ["live-forecasts", "bilingual-sentiment"] },
    ],
  },
  {
    title: "Make it robust",
    line: "Real inputs are messier than benchmarks.",
    icon: "shield" as const,
    checks: [
      { name: "Data augmentation", detail: "Random rotation, shift, zoom, flips and brightness while training", slugs: ["handwritten-digits", "hand-gestures", "doodle-duel"] },
      { name: "Stress tests", detail: "The same test set shifted, rotated, shrunk, darkened or on new backgrounds", slugs: ["handwritten-digits", "hand-gestures"] },
      { name: "Background swaps", detail: "Breaking the 'white = background' shortcut with random textures", slugs: ["hand-gestures"] },
      { name: "Identity before counting", detail: "Boxes are tracked frame to frame and each track is counted once, so one car isn't counted thirty times", slugs: ["traffic-counter"] },
      { name: "Smoothed and debounced", detail: "One Euro filtering for pointers; two thresholds for the pinch; a minimum and maximum blink length; notes and chords that only change once the hand clearly moves", slugs: ["virtual-mouse", "head-keyboard", "air-synth"] },
      { name: "Hand rules tested on real hands", detail: "Finger counting, fists and thumb taps checked on real hand landmarks before shipping", slugs: ["air-synth"] },
      { name: "Calibrated to each face", detail: "Measured against the visitor's own relaxed face, open eyes or neutral head pose, so natural differences don't count", slugs: ["face-mood", "drowsiness", "head-keyboard"] },
      { name: "Same framing as training", detail: "Visitors' strokes are cropped, scaled and centred exactly like the dataset's bitmaps", slugs: ["doodle-duel"] },
      { name: "Landmarks, not pixels", detail: "21 hand points carry the shape and nothing about the background", slugs: ["hand-gestures"] },
    ],
  },
  {
    title: "Shrink honestly",
    line: "A smaller model is a different model: test it again.",
    icon: "scale" as const,
    checks: [
      { name: "8-bit weights, re-tested", detail: `Digits ${pct(digits.shipped.float_acc, 2)} → ${pct(digits.shipped.acc, 2)}; gestures ${pct(gestures.shipped.float_acc)} → ${pct(gestures.shipped.acc)}; sentiment agrees with full precision on ${pct(bs.id.shipped.agree_float)} / ${pct(bs.en.shipped.agree_float)}; doodles ${pct(dd.shipped.float_acc)} → ${pct(dd.shipped.acc)}`, slugs: ["handwritten-digits", "hand-gestures", "bilingual-sentiment", "doodle-duel"] },
      { name: "Browser = Python", detail: "The TypeScript forward pass is checked against NumPy on test data", slugs: ["handwritten-digits", "hand-gestures", "live-forecasts", "bilingual-sentiment", "doodle-duel", "sign-language"] },
      { name: "Runs on the device", detail: "Camera frames are processed locally; nothing is uploaded or recorded", slugs: ["hand-gestures", "object-detection", "face-mood", "drowsiness", "virtual-mouse", "sign-language", "traffic-counter", "head-keyboard", "air-synth"] },
      { name: "Speed vs size", detail: "Chose the detector from Google's benchmark: fast on a phone GPU at 7 MB", slugs: ["object-detection"] },
    ],
  },
  {
    title: "Look at the mistakes",
    line: "Accuracy hides which errors happen and why.",
    icon: "flag" as const,
    checks: [
      { name: "Confusion matrix", detail: "Which classes get mixed up with which", slugs: ["handwritten-digits", "hand-gestures", "bilingual-sentiment", "doodle-duel", "sign-language"] },
      { name: "Most confident mistakes", detail: "The errors the network was surest about, shown as images", slugs: ["handwritten-digits"] },
      { name: "Where it looks", detail: "Class activation maps for images, leave-one-word-out for text, action units for faces", slugs: ["hand-gestures", "bilingual-sentiment", "face-mood"] },
      { name: "Confidence threshold", detail: "Slide it and watch missed objects turn into false alarms", slugs: ["object-detection"] },
      { name: "Live check", detail: "The forecast made one horizon ago, against what then happened, on today's data", slugs: ["live-forecasts"] },
      { name: "Calibrated band", detail: `The rupiah's 80% band held ${pct(lf.fx.band.coverage)} of test outcomes`, slugs: ["live-forecasts"] },
    ],
  },
];

