// Private beta gate for /v2 without paid Vercel password protection.
// The server only knows SHA-256 hashes of the invite codes (V2_INVITE_CODE_HASHES, comma-separated hex);
// the code itself lives in an httpOnly cookie on the invited device. This limits who sees the beta;
// it is not a data boundary: family data stays protected by Supabase Auth and RLS.
export const INVITE_COOKIE = "dbv2_invite";
export const INVITE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60;

/** Specialist review console (/v2/revizie): a separate code, so beta families never see unpublished recipes. */
export const REVIEW_COOKIE = "dbv2_review";
export function reviewHashes(value = process.env.V2_REVIEW_CODE_HASHES): string[] {
  return inviteHashes(value);
}

export function inviteHashes(value = process.env.V2_INVITE_CODE_HASHES): string[] {
  return (value ?? "")
    .split(",")
    .map((hash) => hash.trim().toLowerCase())
    .filter((hash) => /^[a-f0-9]{64}$/.test(hash));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Who may open /v2. Fails CLOSED in production: without invite hashes nobody passes unless the
// founder explicitly opens V2 to everyone (V2_ACCESS=public). Local scripts set V2_ACCESS=public.
export async function v2AccessAllowed(options: {
  production: boolean;
  access: string | undefined;
  hashes: string[];
  code: string | undefined;
}): Promise<boolean> {
  if (options.access === "public") return true;
  if (!options.hashes.length) return !options.production;
  return inviteAccepted(options.code, options.hashes);
}

export async function inviteAccepted(code: string | undefined, hashes: string[]): Promise<boolean> {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{8,64}$/.test(normalized)) return false;
  return hashes.includes(await sha256Hex(normalized));
}
