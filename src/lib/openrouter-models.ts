/**
 * OpenRouter's public model list (https://openrouter.ai/api/v1/models, no key needed), trimmed to what the pages use:
 * id, name, price per million input and output tokens, context length and whether the model supports tool calling.
 * The full list is ~850 KB, so the server fetches it once a day and serves a small copy. Server only.
 */
import { cacheLife } from "next/cache";

export type ModelInfo = { id: string; name: string; inM: number; outM: number; ctx: number; tools: boolean };
type Raw = { id: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string }; supported_parameters?: string[] };

export async function openRouterModels(): Promise<ModelInfo[]> {
  "use cache";
  cacheLife("days");
  const res = await fetch("https://openrouter.ai/api/v1/models", { headers: { "User-Agent": "portfolio-demo/1.0" } });
  if (!res.ok) throw new Error(`OpenRouter models: HTTP ${res.status}`);
  const j = (await res.json()) as { data?: Raw[] };
  return (j.data ?? [])
    .filter((m) => !m.id.endsWith(":batch") && m.pricing?.prompt != null && m.pricing?.completion != null && Number(m.pricing.prompt) >= 0)
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      inM: Math.round(Number(m.pricing?.prompt) * 1e6 * 1000) / 1000,
      outM: Math.round(Number(m.pricing?.completion) * 1e6 * 1000) / 1000,
      ctx: m.context_length ?? 0,
      tools: (m.supported_parameters ?? []).includes("tools"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
