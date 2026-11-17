import { openRouterModels } from "@/lib/openrouter-models";

/** OpenRouter's public model list with live prices, trimmed and cached for a day. */
export async function GET() {
  try {
    const models = await openRouterModels();
    return Response.json({ source: "openrouter.ai/api/v1/models", models }, { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } });
  } catch {
    return Response.json({ error: "The model list is unavailable right now." }, { status: 502 });
  }
}
