import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

/**
 * Private pages stay crawlable on purpose: they answer with `X-Robots-Tag: noindex`
 * (next.config.ts), which crawlers can only see if they are allowed to fetch the URL.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/auth/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
