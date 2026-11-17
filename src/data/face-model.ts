/** Facts about the pretrained face model used by Face Mood Mirror (kept apart from dl.ts so the page bundles no other JSON). */
export const faceModel = {
  name: "MediaPipe Face Landmarker",
  source: "https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker",
  file: "face_landmarker.task (float16)",
  bytes: 3758596,
  landmarks: 478,
  blendshapes: 52,
  license: "Apache-2.0 (Google)",
  calibrateMs: 1500,
};
