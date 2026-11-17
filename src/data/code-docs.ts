/**
 * Which code each project page documents (see src/lib/code-docs.ts).
 * Python steps come from `# STEP:` markers inside the training function named in the case study's `code` field;
 * the browser functions and extra scripts are listed here.
 */
type BrowserFn = { file: string; fn: string; title: string; why: string };
type ProjectCode = { browser?: BrowserFn[]; extra?: string[] };

const LOGREG: BrowserFn = {
  file: "src/lib/logreg.ts",
  fn: "predict",
  title: "Score it in the browser",
  why: "The exported coefficients are plain numbers, so the demo scales the inputs, adds up coefficient × value and applies the sigmoid. No server, no Python.",
};

export const codeDocConfig: { projectFunctions: string[]; projects: Record<string, ProjectCode> } = {
  // training functions in ml/train.py that are whole projects (everything else there is a shared helper)
  projectFunctions: [
    "telco", "heart", "mall", "nyc_taxi", "credit", "ai4i", "student", "bike", "air", "bank", "insurance", "card_fraud",
    "retail", "complaints", "uplift", "ames", "feedback", "mnist", "rps", "live_forecasts", "sentiment", "doodles", "asl",
  ],
  projects: {
    "telco-churn": { browser: [LOGREG] },
    "heart-failure": { browser: [LOGREG] },
    "credit-risk": { browser: [LOGREG] },
    "student-performance": { browser: [LOGREG] },
    "demand-forecasting": { browser: [LOGREG] },
    "air-quality": { browser: [LOGREG] },
    "bank-churn": { browser: [LOGREG] },
    "insurance-fraud": { browser: [LOGREG] },
    "bank-fraud": { browser: [LOGREG] },
    "uplift-promo": { browser: [{ ...LOGREG, why: "The demo runs the three exported models (no e-mail, men's e-mail, women's e-mail) on the same customer; each e-mail's uplift is its probability minus the no-e-mail one." }] },
    "nyc-taxi-anomaly": {
      browser: [{ file: "src/components/demos/anomaly-demo.tsx", fn: "evaluate", title: "Re-score the alerts in the browser", why: "The same evaluation as in Python: flag every hour beyond the threshold, count known events caught and group the false alerts." }],
    },
    "manufacturing-defects": {
      browser: [{ file: "src/components/demos/machine-demo.tsx", fn: "walk", title: "Walk the tree in the browser", why: "The exported decision tree is a list of nodes; the demo follows the left/right branches for the machine you set up and reports the path." }],
    },
    "product-recommender": {
      browser: [{ file: "src/components/demos/retail-demo.tsx", fn: "rankAll", title: "Rank products in the browser", why: "Adds up each candidate's exported co-purchase score with every item in your basket (the shipped score is the one with the best hit rate in testing), with popularity breaking ties." }],
    },
    "house-price-range": {
      browser: [
        { file: "src/components/demos/house-demo.tsx", fn: "linear", title: "One quantile model in the browser", why: "Each exported quantile regression is an intercept plus coefficient × feature, on log price." },
        { file: "src/components/demos/house-demo.tsx", fn: "priceRange", title: "The calibrated price range", why: "Runs the low and high quantile models, widens them by the conformal offset learned on the calibration year, and converts back from log price." },
      ],
    },
    "complaint-router": {
      browser: [
        { file: "src/lib/text-router.ts", fn: "charWbNgrams", title: "Character n-grams, as scikit-learn makes them", why: "The same char_wb n-grams as TfidfVectorizer: each word padded with spaces and cut into overlapping pieces, so typos still share most pieces." },
        { file: "src/lib/text-router.ts", fn: "createRouter", title: "TF-IDF and logistic regression in the browser", why: "Looks up each n-gram's IDF, normalises the vector and multiplies by the int8 weights of every team." },
      ],
    },
    "feedback-themes": {
      browser: [
        { file: "src/lib/feedback.ts", fn: "createThemer", title: "NMF themes in the browser", why: "Solves for the review's theme mix with the same multiplicative updates as scikit-learn's NMF transform, against the exported theme matrix." },
        { file: "src/lib/feedback.ts", fn: "createSentiment", title: "The tone model in the browser", why: "Word TF-IDF and a logistic regression, from the exported vocabulary and weights." },
      ],
    },
    "handwritten-digits": {
      browser: [
        { file: "src/lib/cnn.ts", fn: "dequant", title: "Unpack the 8-bit weights", why: "Each weight was stored as an int8 with one scale per output channel; multiplying back gives the float the network uses." },
        { file: "src/lib/cnn.ts", fn: "createDigitNet", title: "The CNN, layer by layer, in TypeScript", why: "Convolution, ReLU, pooling, dense layers and softmax, returning every intermediate activation for the neuron view." },
      ],
    },
    "hand-gestures": {
      browser: [
        { file: "src/lib/mediapipe.ts", fn: "withGpuFallback", title: "Start MediaPipe on the GPU, fall back to the CPU", why: "Tries the GPU delegate with a timeout and quietly retries on the CPU, so the demo starts on any device." },
        { file: "src/components/demos/camera-gesture-demo.tsx", fn: "stable", title: "Smooth the gesture over the last frames", why: "A majority vote over recent frames, so one noisy frame can't flip rock into paper." },
        { file: "src/lib/cnn.ts", fn: "createGestureNet", title: "My own CNN, with a heatmap of where it looks", why: "Same-padding convolutions, global average pooling and a class activation map for the experiment below the game." },
      ],
    },
    "object-detection": {
      browser: [
        { file: "src/lib/mediapipe.ts", fn: "withGpuFallback", title: "Start MediaPipe on the GPU, fall back to the CPU", why: "Tries the GPU delegate with a timeout and quietly retries on the CPU, so the demo starts on any device." },
        { file: "src/components/demos/object-detection-demo.tsx", fn: "toFound", title: "Turn detections into labelled boxes", why: "Keeps the best category per box with its score, ready for the confidence slider and object filters." },
        { file: "src/components/demos/object-detection-demo.tsx", fn: "drawBoxes", title: "Draw boxes on a mirrored camera view", why: "Mirrors the box coordinates for the selfie view but not the labels, so the text stays readable." },
      ],
    },
    "live-forecasts": {
      browser: [
        { file: "src/lib/lstm.ts", fn: "lstmRun", title: "The LSTM in TypeScript", why: "Keras' gate order (input, forget, cell, output), step by step over the window, then the dense layer that outputs every hour or day ahead." },
        { file: "src/lib/live-forecast.ts", fn: "pmForecastFrom", title: "Forecast Jakarta's air from the live data", why: "Builds the same scaled window as in training (log PM2.5 plus hour of day) and turns the network's output back into µg/m³." },
        { file: "src/lib/live-forecast.ts", fn: "fxForecastFrom", title: "Forecast the rupiah with an 80% band", why: "Scaled daily returns in, cumulative returns out; the band is scaled by the last 20 days' volatility." },
      ],
      extra: ["ml/live_data.py"],
    },
    "bilingual-sentiment": {
      browser: [{ file: "src/lib/text-lstm.ts", fn: "createTextNet", title: "Tokenizer, BiLSTM and explanations in TypeScript", why: "Same tokens as Python, int8 embeddings, both LSTM directions, max over words, then sentiment and emotions; explain() leaves out one word at a time." }],
    },
    "head-keyboard": {
      browser: [
        { file: "src/lib/head-keyboard.ts", fn: "headPointer", title: "Head pose to pointer", why: "Yaw and pitch relative to the calibrated neutral pose, scaled by the chosen range and mirrored like a selfie." },
        { file: "src/lib/head-keyboard.ts", fn: "gazeRatios", title: "Where the eyes look", why: "Iris centre between the eye corners (left–right) and between the lids (up–down), averaged over both eyes." },
        { file: "src/lib/head-keyboard.ts", fn: "gazePointer", title: "Gaze to pointer, from a 5-dot calibration", why: "Linear interpolation between the gaze measured at the left/right and top/bottom dots; the calibration also fixes the direction." },
        { file: "src/lib/head-keyboard.ts", fn: "instantBlinkStep", title: "Instant blink click", why: "Clicks on the open-to-closed edge, at most once per 0.35 s, so a blink presses immediately." },
        { file: "src/lib/head-keyboard.ts", fn: "blinkStep", title: "A held blink, for fewer accidental clicks", why: "Both eyes closed for 0.45 to 2.5 seconds, firing when they reopen: natural blinks and resting the eyes don't type." },
        { file: "src/lib/head-keyboard.ts", fn: "dwellStep", title: "Dwell to press", why: "Staying on one key for the dwell time presses it once; moving to another key starts again." },
        { file: "src/lib/head-keyboard.ts", fn: "scanStep", title: "Row/column scanning with blinks alone", why: "Rows light up in turn, a blink picks the row, keys light up, a blink types; after the last key it returns to the rows." },
        { file: "src/lib/head-keyboard.ts", fn: "predict", title: "Word suggestions", why: "The most frequent words that start with what you are typing, from short hand-made lists in English and Bahasa Indonesia." },
      ],
    },
    "air-synth": {
      browser: [
        { file: "src/lib/air-synth.ts", fn: "splitHands", title: "Which hand is which", why: "By position on the mirrored screen, not the model's left/right label: the hand further right plays, the other controls; one hand alone takes the job of its half." },
        { file: "src/lib/air-synth.ts", fn: "heightToPos", title: "Hand height to a place on the scale", why: "The middle 80% of the frame is spread over the notes, higher hand = higher note." },
        { file: "src/lib/air-synth.ts", fn: "stickyIndex", title: "Notes that don't flicker", why: "Snap to the nearest note, but leave the current one only when the hand is clearly past the halfway line." },
        { file: "src/lib/air-synth.ts", fn: "extended", title: "Count raised fingers", why: "A finger is up when its tip is farther from the wrist than its middle joint; the thumb when its tip is away from the index knuckle. Checked on real hands." },
        { file: "src/lib/air-synth.ts", fn: "tappedFinger", title: "Thumb taps with hysteresis", why: "Gap ÷ palm length per finger; a finger stays down until it clearly opens, and a new tap must be the closest finger." },
        { file: "src/lib/air-synth.ts", fn: "settle", title: "Chords that wait for a steady hand", why: "A finger count must be seen four frames in a row before the chord changes, so lifting fingers one by one doesn't flash through chords." },
        { file: "src/lib/air-synth.ts", fn: "createSynth", title: "The synthesizer, in Web Audio", why: "A gliding lead with vibrato, four plucked voices and a bass, a low-pass tone filter, a generated reverb and a limiter, all from built-in browser nodes." },
      ],
      extra: ["scripts/check-air-synth.mjs"],
    },
    "traffic-counter": {
      browser: [
        { file: "src/lib/jamcams.ts", fn: "jamCams", title: "Server: the camera list, cached for an hour", why: "Reads TfL's Places API for JamCams and keeps only valid camera ids; 'use cache' with the hours profile, as Next.js 16 recommends." },
        { file: "src/lib/jamcams.ts", fn: "jamCamClip", title: "Server: relay one camera's newest clip", why: "Accepts only a TfL camera id, streams the MP4 from TfL's bucket and returns it from this site, so the browser may read its pixels." },
        { file: "src/lib/tracker.ts", fn: "iou", title: "How much two boxes overlap", why: "Intersection over union: the score used to decide which new box belongs to which track." },
        { file: "src/lib/tracker.ts", fn: "crosses", title: "Did a track cross the line?", why: "The step from the last centre to the new one must cross the counting segment itself; the sign gives the direction." },
      ],
    },
    "sign-language": {
      browser: [
        { file: "src/lib/sign.ts", fn: "normalise", title: "Normalise the hand like in training", why: "Wrist to the origin and every point divided by the palm's length, exactly as _asl_normalise() in Python." },
        { file: "src/lib/sign.ts", fn: "signLogits", title: "The neural network in TypeScript", why: "Three dense layers with ReLU, from the exported weights; checked against NumPy on 400 samples." },
        { file: "src/lib/sign.ts", fn: "steady", title: "Only type a letter that holds", why: "The majority letter over the last frames and its share; a letter is typed once it wins most frames for almost a second." },
      ],
    },
    "virtual-mouse": {
      browser: [
        { file: "src/lib/mediapipe.ts", fn: "loadHandTracker", title: "Track the hand", why: "Reuses the gesture recognizer bundle for its 21 hand landmarks, GPU first, CPU if the GPU stalls." },
        { file: "src/lib/virtual-mouse.ts", fn: "toArea", title: "Map the hand to the playground", why: "The comfortable middle of the camera view is stretched over the whole playground, so you never reach for the edges." },
        { file: "src/lib/virtual-mouse.ts", fn: "nextPinch", title: "Pinch with hysteresis", why: "Closes below one threshold and opens only above a higher one, so a hand near the boundary doesn't click on and off." },
        { file: "src/components/demos/virtual-mouse-demo.tsx", fn: "fire", title: "Send real pointer events", why: "Synthetic PointerEvent and MouseEvent objects, dispatched to the element under the cursor so ordinary widgets respond." },
      ],
    },
    drowsiness: {
      browser: [
        { file: "src/lib/drowsiness.ts", fn: "ear", title: "The eye aspect ratio", why: "The two vertical eyelid distances over twice the eye's width, measured in pixels so a wide video doesn't distort it." },
        { file: "src/lib/drowsiness.ts", fn: "mar", title: "The mouth aspect ratio, for yawns", why: "The mean of three inner-lip openings over the mouth's width." },
        { file: "src/lib/drowsiness.ts", fn: "step", title: "One frame of the detector", why: "Compares EAR with the calibrated threshold, times closures into blinks or alarms, counts yawns and keeps PERCLOS over the last minute." },
        { file: "src/lib/drowsiness.ts", fn: "fatigueLevel", title: "Awake, tired or drowsy", why: "Long closures and a high PERCLOS mean drowsy; a raised PERCLOS or frequent yawns mean tired." },
        { file: "src/components/demos/drowsiness-demo.tsx", fn: "useAlarm", title: "The alarm tone", why: "A short square-wave beep every 400 ms with the Web Audio API, unlocked by the Start click because browsers block sound before a click." },
      ],
    },
    "face-mood": {
      browser: [
        { file: "src/lib/mediapipe.ts", fn: "loadFaceLandmarker", title: "Load Google's face model", why: "MediaPipe's Face Landmarker in video mode, asked for blendshapes and the head's transformation matrix; GPU first, CPU if the GPU stalls." },
        { file: "src/lib/face-mood.ts", fn: "evidence", title: "Weigh the action units of each mood", why: "Subtracts the relaxed face, scales each blendshape group and takes a weighted mean per expression, keeping every unit's share for the 'Why' list." },
        { file: "src/lib/face-mood.ts", fn: "moodProbs", title: "Turn evidence into five probabilities", why: "Neutral gets the leftover when no recipe is strong; a sharpened softmax gives the bars and the top mood." },
        { file: "src/lib/face-mood.ts", fn: "headPose", title: "Read the head's turn, nod and tilt", why: "Euler angles from MediaPipe's 4×4 transformation matrix, used to rotate and shift the avatar's features." },
        { file: "src/components/demos/face-mood-demo.tsx", fn: "Avatar", title: "Draw the mirror avatar", why: "An SVG face whose eyes, brows, cheeks and mouth follow the blendshapes, mirrored like a selfie." },
      ],
    },
    "doodle-duel": {
      browser: [
        { file: "src/components/demos/doodle-demo.tsx", fn: "rasterize", title: "Frame your strokes like the training doodles", why: "Crop to the drawing, scale the longest side to 26 of 28 pixels, centre, draw with the dataset's stroke width and average down to 28×28." },
        { file: "src/lib/cnn.ts", fn: "createDigitNet", title: "The CNN, layer by layer, in TypeScript", why: "The same forward pass as the digits project, with 30 outputs; it runs many times a second while you draw." },
      ],
      extra: ["ml/quickdraw_data.py"],
    },
  },
};
