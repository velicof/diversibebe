/** Cloud writes are restricted to loopback test stacks in this development branch. */
export function assertIsolatedSupabaseUrl(value: string): URL {
  const url = new URL(value);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  ) {
    throw new Error("Supabase V2 accepts a local isolated test stack only.");
  }
  return url;
}
