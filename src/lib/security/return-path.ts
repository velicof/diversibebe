/** Restrict post-login redirects to paths on this application. */
export function safeReturnPath(candidate: string | null): string {
  if (!candidate?.startsWith("/") || candidate.startsWith("//") || /[\\\s\u0000-\u001f]/.test(candidate)) {
    return "/dashboard";
  }
  const origin = "https://diversibebe.invalid";
  try {
    const url = new URL(candidate, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
