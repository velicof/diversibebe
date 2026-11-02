import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

/**
 * Local V2 previews are never crawlable. In production, private pages stay crawlable on
 * purpose: they answer with `X-Robots-Tag: noindex` (next.config.ts), which crawlers can only
 * see if they are allowed to fetch the URL.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.DIVERSIBEBE_V2_PREVIEW === "1") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/auth/", "/v2/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
