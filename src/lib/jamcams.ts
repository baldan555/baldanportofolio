/**
 * TfL JamCams (London traffic cameras): official TfL open data, used under the TfL Transport Data Service terms
 * (based on the Open Government Licence v2.0). Credit: "Powered by TfL Open Data". Server only.
 */
import { cacheLife } from "next/cache";

export type JamCam = { id: string; name: string; lat: number; lon: number; available: boolean };

export const JAMCAM_ID = /^\d{5}\.\d{5}$/; // e.g. 00001.06514: the only shape the clip relay accepts
export const TFL_CREDIT = "Powered by TfL Open Data";
const UA = { "User-Agent": "portfolio-traffic-counter/1.0 (personal, non-commercial portfolio project)" };

type Place = { id: string; commonName: string; lat: number; lon: number; additionalProperties?: { key: string; value: string }[] };

/** The camera list changes rarely: cache it for an hour (Cache Components' 'hours' profile). */
export async function jamCams(): Promise<JamCam[]> {
  "use cache";
  cacheLife("hours");
  const res = await fetch("https://api.tfl.gov.uk/Place/Type/JamCam", { headers: UA });
  if (!res.ok) throw new Error(`TfL camera list: HTTP ${res.status}`);
  const places = (await res.json()) as Place[];
  return places
    .map((p) => ({
      id: p.id.replace(/^JamCams_/, ""),
      name: p.commonName,
      lat: p.lat,
      lon: p.lon,
      available: p.additionalProperties?.find((a) => a.key === "available")?.value === "true",
    }))
    .filter((c) => JAMCAM_ID.test(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The latest 10-second clip of one camera, straight from TfL's public bucket. Never cached on the server. */
export async function jamCamClip(id: string): Promise<Response> {
  if (!JAMCAM_ID.test(id)) return new Response("Unknown camera", { status: 400 });
  const res = await fetch(`https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/${id}.mp4`, { headers: UA, cache: "no-store" });
  if (!res.ok || !res.body) return new Response("Clip unavailable", { status: 502 });
  return new Response(res.body, {
    headers: {
      "Content-Type": "video/mp4",
      // TfL refreshes clips every few minutes: let browsers and the CDN reuse one for a minute
      "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
      "X-Clip-Modified": res.headers.get("last-modified") ?? "",
      "X-Data-Credit": TFL_CREDIT,
    },
  });
}
