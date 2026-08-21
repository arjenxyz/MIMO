import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/demo";

export async function updateSession(request: NextRequest) {
  const host = request.nextUrl.hostname;
  const demo = isDemoMode(host);

  // Localhost / development: no login gate
  if (demo) {
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/report-error") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/status") ||
    pathname.startsWith("/api/grammar") ||
    pathname === "/status" ||
    pathname.startsWith("/grammar");

  if (!user && !isPublic && pathname !== "/setup") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (!user && pathname === "/setup") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_completed_at")
      .eq("id", user.id)
      .maybeSingle();

    const schemaReady = !profileError;
    // Missing column / table = schema not applied yet; don't lock users out.
    const incomplete =
      schemaReady && (profile == null || profile.profile_completed_at == null);

    const setupExempt =
      pathname.startsWith("/setup") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api/profile/setup") ||
      pathname.startsWith("/api/report-error");

    if (incomplete && !setupExempt) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/setup";
      return NextResponse.redirect(redirectUrl);
    }

    if (schemaReady && !incomplete && pathname.startsWith("/setup")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl, 303);
    }

    if (pathname === "/login" || pathname === "/register" || pathname === "/onboarding") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = incomplete ? "/setup" : "/";
      return NextResponse.redirect(redirectUrl, 303);
    }
  }

  if (user && pathname === "/auth/pending") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
