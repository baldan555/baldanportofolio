import { PYPI_CREDIT, pypiAll } from "@/lib/pypi";

/** Weekly PyPI downloads for the Python tools on the Automation tools page (fixed list, cached for a day). */
export async function GET() {
  const counts = await pypiAll();
  if (!Object.keys(counts).length) return Response.json({ credit: PYPI_CREDIT, error: "PyPI download counts are unavailable right now." }, { status: 502 });
  return Response.json({ credit: PYPI_CREDIT, period: "last 7 days", counts }, { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } });
}
