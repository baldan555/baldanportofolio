// Copies MediaPipe's WebAssembly runtime from node_modules into public/, so the camera demo
// is fully self-hosted (no third-party CDN). Runs before `dev` and `build`; the copies are gitignored.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const src = "node_modules/@mediapipe/tasks-vision/wasm";
const dst = "public/mediapipe/wasm";
const files = ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"];

if (!existsSync(src)) {
  console.warn("copy-mediapipe: @mediapipe/tasks-vision is not installed; skipping");
} else {
  mkdirSync(dst, { recursive: true });
  for (const f of files) copyFileSync(`${src}/${f}`, `${dst}/${f}`);
  console.log(`copy-mediapipe: ${files.length} files → ${dst}`);
}
