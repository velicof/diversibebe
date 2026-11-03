import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { INVITE_COOKIE, inviteHashes, v2AccessAllowed } from "@/lib/security/invite";

export async function proxy(request: NextRequest) {
  // V2 keeps its own browser session (separate storage key) on the Supabase project shared with V1;
  // the V1 cookie session is not refreshed here. Disabled in production unless DIVERSIBEBE_V2_PREVIEW=1.
  if (request.nextUrl.pathname === "/v2" || request.nextUrl.pathname.startsWith("/v2/")) {
    if (process.env.NODE_ENV === "production" && process.env.DIVERSIBEBE_V2_PREVIEW !== "1") return new NextResponse(null, { status: 404 });
    const allowed = await v2AccessAllowed({
      production: process.env.NODE_ENV === "production",
      access: process.env.V2_ACCESS,
      hashes: inviteHashes(),
      code: request.cookies.get(INVITE_COOKIE)?.value,
    });
    if (!allowed) return NextResponse.redirect(new URL("/acces-beta", request.url));
    return NextResponse.next();
  }
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const protectedRoutes = [
    "/dashboard",
    "/profil",
    "/jurnal",
    "/plan",
    "/alimente",
    "/retete",
    "/alergii",
    "/ghid",
    "/notificari",
    "/ajutor",
  ];
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));

  if (pathname.startsWith("/register")) {
    return supabaseResponse; // lasă toate sub-rutele /register libere
  }

  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && pathname === "/onboarding") {
    const { data: baby } = await supabase
      .from("babies")
      .select("id, name, birthdate")
      .eq("user_id", user.id)
      .maybeSingle();

    if (baby?.name && baby?.birthdate) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (user && (pathname === "/login" || pathname === "/register" || pathname === "/")) {
    try {
      const { data: baby } = await supabase
        .from("babies")
        .select("id, name, birthdate")
        .eq("user_id", user.id)
        .maybeSingle();

      if (baby?.name && baby?.birthdate) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else {
        // Baby nu există → onboarding
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    } catch {
      // Dacă query-ul eșuează, NU redirecționa la onboarding
      // Lasă userul să continue — onboarding/page.tsx va gestiona
      return supabaseResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|auth/callback|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
