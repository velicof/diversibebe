import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "./lib/site";

/** Public pages only. Account, family and recipe pages behind login are never listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route === "/" ? "/" : route}`,
    changeFrequency: route === "/" ? "weekly" : "yearly",
    priority: route === "/" ? 1 : 0.3,
  }));
}
