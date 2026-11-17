import type { NextRequest } from "next/server";
import { jamCamClip } from "@/lib/jamcams";

/**
 * Relays one camera's latest clip from TfL so the page can read its pixels (TfL's bucket sends no CORS headers,
 * and browsers block AI from reading cross-origin video). Only TfL camera ids are accepted: not an open proxy.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/jamcams/[id]">) {
  const { id } = await ctx.params;
  return jamCamClip(id);
}
