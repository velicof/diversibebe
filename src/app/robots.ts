import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

/**
 * Local and Vercel Preview builds of V2 are never crawlable. Vercel Production stays crawlable even
 * when V2 is enabled there (DIVERSIBEBE_V2_PREVIEW=1), so V1 pages keep their search traffic. Private pages stay crawlable on
 * purpose: they answer with `X-Robots-Tag: noindex` (next.config.ts), which crawlers can only
 * see if they are allowed to fetch the URL.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.DIVERSIBEBE_V2_PREVIEW === "1" && process.env.VERCEL_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/auth/", "/v2/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
