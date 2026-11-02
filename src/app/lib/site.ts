/** Public site identity used by metadata, robots, sitemap and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.diversibebe.com").replace(/\/+$/, "");
export const SITE_NAME = "DiversiBebe";
export const SITE_TITLE = "DiversiBebe | Rețete pentru bebeluși și diversificare";
export const SITE_DESCRIPTION =
  "Descoperă rețete simple pentru bebeluși și copii mici, idei de mese potrivite vârstei și un plan săptămânal care îți ușurează fiecare zi.";

/** Only these routes are public and indexable. */
export const PUBLIC_ROUTES = ["/", "/termeni"] as const;

/** Account, family and auth routes: never indexed (sent as X-Robots-Tag). */
export const PRIVATE_ROUTE_PREFIXES = [
  "/dashboard", "/profil", "/jurnal", "/jurnalizeaza", "/plan", "/alimente", "/retete", "/alergii",
  "/ghid", "/notificari", "/ajutor", "/istoric", "/admin", "/onboarding", "/login", "/register",
  "/forgot-password", "/verify-email", "/auth", "/api",
] as const;
