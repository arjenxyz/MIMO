import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sendDiscordAlert } from "@/lib/discord";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/auth/success";

  if (oauthError) {
    const message = errorDescription || oauthError;
    await sendDiscordAlert({
      title: "OAuth callback hatası",
      message,
      path: "/auth/callback",
      source: "auth/callback",
      extra: {
        error: oauthError,
        error_code: searchParams.get("error_code") || undefined,
      },
    });
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(message)}`
    );
  }

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      const message = "Supabase ortam değişkenleri eksik.";
      await sendDiscordAlert({
        title: "Auth env eksik",
        message,
        path: "/auth/callback",
        source: "auth/callback",
      });
      return NextResponse.redirect(
        `${origin}/auth/error?message=${encodeURIComponent(message)}`
      );
    }

    let redirectResponse = NextResponse.redirect(getRedirectUrl(request, origin, next));

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          redirectResponse = NextResponse.redirect(getRedirectUrl(request, origin, next));
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectResponse;
    }

    await sendDiscordAlert({
      title: "Session exchange hatası",
      message: error.message,
      path: "/auth/callback",
      source: "auth/callback",
    });

    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`
    );
  }

  const message = "Giriş kodu alınamadı. Tekrar dene.";
  await sendDiscordAlert({
    title: "Auth code yok",
    message,
    path: "/auth/callback",
    source: "auth/callback",
  });

  return NextResponse.redirect(
    `${origin}/auth/error?message=${encodeURIComponent(message)}`
  );
}

function getRedirectUrl(request: NextRequest, origin: string, next: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";

  if (!isLocal && forwardedHost) {
    return `https://${forwardedHost}${next}`;
  }

  return `${origin}${next}`;
}
