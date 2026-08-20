import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/auth/success";

  if (oauthError) {
    const message = encodeURIComponent(errorDescription || oauthError);
    return NextResponse.redirect(`${origin}/auth/error?message=${message}`);
  }

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.redirect(
        `${origin}/auth/error?message=${encodeURIComponent("Supabase ortam değişkenleri eksik.")}`
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

    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(
    `${origin}/auth/error?message=${encodeURIComponent("Giriş kodu alınamadı. Tekrar dene.")}`
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
