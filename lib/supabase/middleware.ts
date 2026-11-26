import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/demo";
import { needsProfileSetup } from "@/lib/profileSetup";
import type { Profile } from "@/types";

/** PWA / static shell assets must never hit the login gate or Chrome refuses install. */
function isPwaOrStaticAsset(pathname: string) {
  return (
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/~offline" ||
    pathname.startsWith("/workbox-") ||
    pathname.startsWith("/worker-") ||
    pathname.startsWith("/icons/") ||
    /\.(?:webmanifest|map|ico|txt|xml)$/i.test(pathname)
  );
}

function isPublicPath(pathname: string) {
  return (
    isPwaOrStaticAsset(pathname) ||
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/nasil-kullanilir") ||
    pathname.startsWith("/offline") ||
    pathname.startsWith("/api/report-error") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/status") ||
    pathname.startsWith("/api/offline-packs") ||
    pathname.startsWith("/api/word-audio") ||
    pathname.startsWith("/api/word-image") ||
    pathname === "/status" ||
    pathname === "/quiz" ||
    pathname.startsWith("/quiz/match") ||
    pathname.startsWith("/quiz/word-check") ||
    pathname.startsWith("/det/listen-type") ||
    pathname.startsWith("/det/read-complete")
  );
}

export async function updateSession(request: NextRequest) {
  const host = request.nextUrl.hostname;
  const demo = isDemoMode(host);
  const pathname = request.nextUrl.pathname;

  // Never auth-gate the service worker or web manifest — installability depends on them.
  if (isPwaOrStaticAsset(pathname)) {
    return NextResponse.next({ request });
  }

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

  const isPublic = isPublicPath(pathname);

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
      .select("id, username, display_name, age, profile_completed_at")
      .eq("id", user.id)
      .maybeSingle();

    // Missing columns / schema not applied: never lock users out.
    const schemaMissing =
      Boolean(profileError) &&
      /display_name|profile_completed_at|age|column|schema cache|does not exist/i.test(
        profileError?.message ?? ""
      );

    const incomplete =
      !schemaMissing && needsProfileSetup((profile as Profile | null) ?? null);

    const setupExempt =
      pathname.startsWith("/setup") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api/profile/setup") ||
      pathname.startsWith("/api/report-error") ||
      isPublicPath(pathname);

    if (incomplete && !setupExempt) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/setup";
      return NextResponse.redirect(redirectUrl);
    }

    if (!schemaMissing && !incomplete && pathname.startsWith("/setup")) {
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
