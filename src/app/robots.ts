import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Everything is public except the server routes behind the demos. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
