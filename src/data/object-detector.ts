/**
 * Facts about the live object detector. Kept apart from dl.ts so the project page doesn't bundle other models' JSON.
 * Latencies: Google's MediaPipe Object Detector benchmark on a Pixel 6 (developers.google.com/edge/mediapipe/solutions/vision/object_detector).
 * Sizes: measured from the model files on Google's storage (HTTP content length).
 * Input and candidate boxes: read from efficientdet_lite0.tflite with TensorFlow Lite (input 1×320×320×3, outputs 19,206 boxes × 90 label slots).
 */
export const detector = {
  model: "EfficientDet-Lite0 (float16)",
  file: "/mediapipe/efficientdet_lite0.tflite",
  bytes: 7254339,
  input: 320,
  candidates: 19206,
  classes: 80,
  instances: "1.5 million",
  docs: "https://developers.google.com/edge/mediapipe/solutions/vision/object_detector",
  coco: "https://cocodataset.org",
};

export const detectorOptions = [
  { model: "EfficientDet-Lite0 · int8", input: 320, mb: 4.6, cpu: 29.31, gpu: null },
  { model: "EfficientDet-Lite0 · float16", input: 320, mb: 7.25, cpu: 53.97, gpu: 27.97, chosen: true },
  { model: "EfficientDet-Lite0 · float32", input: 320, mb: 13.84, cpu: 61.3, gpu: 27.83 },
  { model: "EfficientDet-Lite2 · float16", input: 448, mb: 12.14, cpu: 198.77, gpu: 47.31 },
  { model: "SSD MobileNetV2 · float16", input: 256, mb: 5.92, cpu: 37.35, gpu: 28.16 },
];
