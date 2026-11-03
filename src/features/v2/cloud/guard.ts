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
export function assertAllowedSupabaseUrl(value: string, sharedProjectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): URL {
  const url = cleanUrl(value);
  if (LOOPBACK.includes(url.hostname) && ["http:", "https:"].includes(url.protocol)) return url;
  const shared = sharedProjectUrl ? new URL(sharedProjectUrl) : null;
  if (url.protocol === "https:" && /^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) && shared?.origin === url.origin) return url;
  throw new Error("Supabase V2 accepts a local test stack or the DiversiBebe project shared with V1 only.");
}

/**
 * Real-parent wording unless V2 talks to a loopback test stack. Local scripts always configure a backend,
 * so "no backend" means an online build without accounts (Vercel Preview in guest mode): no test labels.
 */
export function usesRealAccounts(value = process.env.NEXT_PUBLIC_V2_SUPABASE_URL): boolean {
  if (!value) return true;
  try {
    return !LOOPBACK.includes(new URL(value).hostname);
  } catch {
    return false;
  }
}
