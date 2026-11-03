import { NextResponse, type NextRequest } from "next/server";
import { INVITE_COOKIE, INVITE_MAX_AGE_SECONDS, inviteAccepted, inviteHashes } from "@/lib/security/invite";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const code = String(form?.get("code") ?? "").trim().toUpperCase();
  const hashes = inviteHashes();
  if (!hashes.length || !(await inviteAccepted(code, hashes)))
    return NextResponse.redirect(new URL("/acces-beta?eroare=1", request.url), 303);
  const response = NextResponse.redirect(new URL("/v2", request.url), 303);
  response.cookies.set(INVITE_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: INVITE_MAX_AGE_SECONDS,
  });
  return response;
}
