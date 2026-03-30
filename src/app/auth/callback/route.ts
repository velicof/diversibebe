import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  console.log("[callback] URL:", request.url);
  console.log("[callback] code exists:", !!code);
  console.log("[callback] origin:", requestUrl.origin);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            console.log(
              "[callback] setting cookies:",
              cookiesToSet.map((c) => c.name)
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log(
      "[callback] exchange result - user:",
      data?.user?.email,
      "error:",
      error?.message
    );

    if (!error) {
      const redirectTo = new URL(next, requestUrl.origin);
      console.log("[callback] redirecting to:", redirectTo.toString());
      return NextResponse.redirect(redirectTo);
    }

    console.error("[callback] FAILED:", error);
  }

  return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
}
