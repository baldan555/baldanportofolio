/**
 * Shared loader for MediaPipe Tasks Vision: the library is imported only when a visitor starts a demo,
 * the WebAssembly runtime is self-hosted under /mediapipe/wasm (see scripts/copy-mediapipe.mjs),
 * and every task tries the GPU first, falling back to the CPU if GPU setup fails or stalls.
 */
import type { FaceLandmarker, FilesetResolver, GestureRecognizer, ObjectDetector } from "@mediapipe/tasks-vision";

type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

let fileset: Promise<WasmFileset> | null = null;

export async function visionFileset(): Promise<WasmFileset> {
  if (!fileset) fileset = import("@mediapipe/tasks-vision").then(({ FilesetResolver }) => FilesetResolver.forVisionTasks("/mediapipe/wasm"));
  return fileset;
}

export async function withGpuFallback<T>(make: (delegate: "GPU" | "CPU") => Promise<T>, timeoutMs = 8000): Promise<T> {
  // some browsers stall on GPU setup (blocked WebGL, background tabs): give it a few seconds, then use the CPU
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("GPU setup timed out")), timeoutMs));
  try {
    return await Promise.race([make("GPU"), timeout]);
  } catch {
    return await make("CPU");
  }
}

/** Human-friendly error for getUserMedia failures. */
export function cameraError(e: unknown) {
  const n = (e as DOMException)?.name;
  if (n === "NotAllowedError") return "Camera permission was declined. Allow it in the address bar and try again, or use a photo.";
  if (n === "NotFoundError") return "No camera found on this device. Try a photo instead.";
  if (n === "NotReadableError") return "The camera is busy in another app or tab. Close it there and try again.";
  return "Couldn't start the camera or the model. Try a photo instead.";
}

/** Google's Face Landmarker in video mode, self-hosted; blendshapes and head pose only when a demo needs them. */
export async function loadFaceLandmarker(extras = true): Promise<FaceLandmarker> {
  const [{ FaceLandmarker: FL }, vision] = await Promise.all([import("@mediapipe/tasks-vision"), visionFileset()]);
  return withGpuFallback((delegate) =>
    FL.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: extras,
      outputFacialTransformationMatrixes: extras,
    }),
  );
}

/** Hand tracking for the cursor: the gesture recognizer already returns the 21 hand landmarks, so no extra model file. */
export async function loadHandTracker(numHands = 1): Promise<GestureRecognizer> {
  const [{ GestureRecognizer: GR }, vision] = await Promise.all([import("@mediapipe/tasks-vision"), visionFileset()]);
  return withGpuFallback((delegate) =>
    GR.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/mediapipe/gesture_recognizer.task", delegate },
      runningMode: "VIDEO",
      numHands,
    }),
  );
}

/** EfficientDet-Lite0 (COCO) in video mode, optionally limited to some classes, for counting road users. */
export async function loadObjectDetector(classes?: string[], scoreThreshold = 0.3): Promise<ObjectDetector> {
  const [{ ObjectDetector: OD }, vision] = await Promise.all([import("@mediapipe/tasks-vision"), visionFileset()]);
  return withGpuFallback((delegate) =>
    OD.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/mediapipe/efficientdet_lite0.tflite", delegate },
      runningMode: "VIDEO",
      scoreThreshold,
      maxResults: 40,
      categoryAllowlist: classes,
    }),
  );
}
