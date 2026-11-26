"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";

async function hasCachedPage(href: string): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  const candidates = [href, href.endsWith("/") ? href.slice(0, -1) : `${href}/`];
  try {
    for (const path of candidates) {
      const match = await caches.match(path, { ignoreSearch: true });
      if (match) return true;
      const abs = await caches.match(new URL(path, window.location.origin).href, {
        ignoreSearch: true,
      });
      if (abs) return true;
    }
  } catch {
    return false;
  }
  return false;
}

type Props = Omit<ComponentProps<typeof Link>, "prefetch" | "onClick"> & {
  children: ReactNode;
  onClick?: ComponentProps<typeof Link>["onClick"];
  /** Called when offline and the target page is not in cache. */
  onOfflineBlocked?: () => void;
};

/**
 * Landing / public CTAs: never prefetch (avoids hung requests offline),
 * and when offline only navigate if the page is already cached.
 */
export function OfflineSmartLink({
  href,
  children,
  onClick,
  onOfflineBlocked,
  ...rest
}: Props) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const handleClick = useCallback(
    async (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (online) return;

      e.preventDefault();
      const path = typeof href === "string" ? href : href.pathname || "/";
      if (path.startsWith("#")) {
        window.location.hash = path;
        return;
      }

      const cached = await hasCachedPage(path);
      if (cached) {
        window.location.assign(path);
        return;
      }
      onOfflineBlocked?.();
    },
    [href, onClick, onOfflineBlocked, online]
  );

  return (
    <Link href={href} prefetch={false} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
