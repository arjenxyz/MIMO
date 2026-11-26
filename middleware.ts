import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip Next internals, images, and PWA install assets (SW + manifest).
     * Auth-gating those breaks Chrome "This app can't be installed".
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*|worker-.*|manifest\\.webmanifest|icons/|~offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
