import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
