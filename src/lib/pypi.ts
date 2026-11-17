/**
 * Weekly PyPI downloads for the Python tools on the Automation tools page, from pypistats.org's public API
 * (https://pypistats.org/api/). The API sends no CORS header, so the browser can't call it; this server-side helper
 * fetches only the packages listed in auto-tools.ts and caches each answer for a day. Server only.
 */
import { cacheLife } from "next/cache";
import { PYPI_PACKAGES } from "@/data/auto-tools";

const UA = { "User-Agent": "portfolio-demo/1.0" };
export const PYPI_CREDIT = "pypistats.org";

/** Downloads in the last 7 days for one whitelisted package (cached for a day). */
async function pypiWeek(pkg: string): Promise<number | null> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://pypistats.org/api/packages/${encodeURIComponent(pkg)}/recent`, { headers: UA });
  if (!res.ok) throw new Error(`pypistats ${pkg}: HTTP ${res.status}`);
  const j = (await res.json()) as { data?: { last_week?: unknown } };
  return typeof j.data?.last_week === "number" ? j.data.last_week : null;
}

export async function pypiAll(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    PYPI_PACKAGES.map(async (p) => {
      try {
        const v = await pypiWeek(p);
        if (v != null) out[p] = v;
      } catch {
        // one missing package shouldn't hide the rest
      }
    }),
  );
  return out;
}
