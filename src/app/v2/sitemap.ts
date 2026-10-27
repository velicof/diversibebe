import type { MetadataRoute } from "next";
/** No unreviewed recipes, accounts, profiles or private routes are indexed. */
export default function sitemap(): MetadataRoute.Sitemap { return []; }
