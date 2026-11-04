const LOOPBACK = ["127.0.0.1", "localhost", "[::1]"];

function cleanUrl(value: string): URL {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname))
    throw new Error("Supabase V2 URL must be a bare origin.");
  return url;
}

/** Test stacks and test scripts: loopback only. */
export function assertIsolatedSupabaseUrl(value: string): URL {
  const url = cleanUrl(value);
  if (!LOOPBACK.includes(url.hostname) || !["http:", "https:"].includes(url.protocol))
    throw new Error("Supabase V2 accepts a local isolated test stack only.");
  return url;
}

/**
 * The app: a loopback test stack, or the SAME hosted Supabase project as V1 (one project for V1 and V2,
 * so every existing account works in V2). Any other hosted project is refused.
 */
export function assertAllowedSupabaseUrl(value: string, sharedProjectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, pageOrigin?: string): URL {
  const url = cleanUrl(value);
  if (LOOPBACK.includes(url.hostname) && ["http:", "https:"].includes(url.protocol)) return url;
  // Only what resolveBackendUrl produced for a same-origin build: the page's own private address.
  if (process.env.NEXT_PUBLIC_V2_SUPABASE_URL === SAME_ORIGIN_BACKEND && pageOrigin === url.origin && resolveBackendUrl(SAME_ORIGIN_BACKEND, pageOrigin) === url.origin) return url;
  const shared = sharedProjectUrl ? new URL(sharedProjectUrl) : null;
  if (url.protocol === "https:" && /^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) && shared?.origin === url.origin) return url;
  throw new Error("Supabase V2 accepts a local test stack or the DiversiBebe project shared with V1 only.");
}

/**
 * Private phone preview (scripts/phone-preview.cjs): the build says "same-origin" and the browser talks to the
 * local stack through the page's own address. Accepted only on loopback or a private Tailscale name, so a
 * build carrying this value by mistake can never reach anything on a public host.
 */
export const SAME_ORIGIN_BACKEND = "same-origin";
export function resolveBackendUrl(value: string, pageOrigin?: string): string {
  if (value !== SAME_ORIGIN_BACKEND) return value;
  if (!pageOrigin) throw new Error("The same-origin backend needs a page address.");
  const page = new URL(pageOrigin);
  const local = LOOPBACK.includes(page.hostname);
  const tailnet = page.protocol === "https:" && /^[a-z0-9-]+\.[a-z0-9-]+\.ts\.net$/.test(page.hostname);
  if (!local && !tailnet) throw new Error("The same-origin backend runs on loopback or a private Tailscale name only.");
  return page.origin;
}

/**
 * Real-parent wording unless V2 talks to a loopback test stack. Local scripts always configure a backend,
 * so "no backend" means an online build without accounts (Vercel Preview in guest mode): no test labels.
 */
export function usesRealAccounts(value = process.env.NEXT_PUBLIC_V2_SUPABASE_URL): boolean {
  if (!value) return true;
  if (value === SAME_ORIGIN_BACKEND) return false;
  try {
    return !LOOPBACK.includes(new URL(value).hostname);
  } catch {
    return false;
  }
}
