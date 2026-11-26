"use client";

import { useEffect, useRef } from "react";
import { clearClientCaches, hardNavigate } from "@/lib/clearClientCaches";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo";

/**
 * When the signed-in user changes, wipe cached pages and hard-reload so
 * account B never sees account A's shell/data.
 */
export function AuthSessionGuard() {
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isDemoMode(window.location.hostname)) return;

    let cancelled = false;
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      const nextId = session?.user?.id ?? null;

      if (lastUserId.current === undefined) {
        lastUserId.current = nextId;
        return;
      }

      if (lastUserId.current === nextId) return;

      const previous = lastUserId.current;
      lastUserId.current = nextId;

      await clearClientCaches();

      // Soft client cache can still hold the previous account's RSC tree.
      if (event === "SIGNED_OUT") {
        hardNavigate("/login");
        return;
      }

      if (previous && nextId && previous !== nextId) {
        hardNavigate(window.location.pathname || "/");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
