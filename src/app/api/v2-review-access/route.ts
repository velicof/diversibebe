import { NextResponse, type NextRequest } from "next/server";
import { INVITE_MAX_AGE_SECONDS, REVIEW_COOKIE, inviteAccepted, reviewHashes } from "@/lib/security/invite";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const code = String(form?.get("code") ?? "").trim().toUpperCase();
  const hashes = reviewHashes();
  if (!hashes.length || !(await inviteAccepted(code, hashes)))
    return NextResponse.redirect(new URL("/acces-revizie?eroare=1", request.url), 303);
  const response = NextResponse.redirect(new URL("/v2/revizie", request.url), 303);
  response.cookies.set(REVIEW_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: INVITE_MAX_AGE_SECONDS,
  });
  return response;
}
