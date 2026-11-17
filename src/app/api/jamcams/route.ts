import { jamCams, TFL_CREDIT } from "@/lib/jamcams";

/** London traffic cameras for the Traffic Counter demo (cached for an hour). */
export async function GET() {
  try {
    const cameras = await jamCams();
    return Response.json({ credit: TFL_CREDIT, cameras }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return Response.json({ credit: TFL_CREDIT, error: "The TfL camera list is unavailable right now." }, { status: 502 });
  }
}
