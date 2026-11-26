"use client";

import Link from "next/link";
import {
  forwardRef,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  useCallback,
} from "react";
import {
  cleanPracticeHref,
  isBrowserOffline,
  markForceOfflinePack,
} from "@/lib/offlinePractice";

type Props = Omit<ComponentProps<typeof Link>, "href" | "prefetch"> & {
  href: string;
  children: ReactNode;
  /** When true (default), mark session to use IndexedDB pack words. */
  forcePack?: boolean;
};

/**
 * Practice links that work offline:
 * - no `?source=` (avoids SW cache miss)
 * - marks sessionStorage for pack-only mode
 * - hard-navigates when offline (Next soft/RSC nav fails without network)
 */
export const OfflinePracticeLink = forwardRef<HTMLAnchorElement, Props>(
  function OfflinePracticeLink(
    { href, children, forcePack = true, onClick, ...rest },
    ref
  ) {
    const cleanHref = cleanPracticeHref(href);

    const handleClick = useCallback(
      (e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (forcePack) markForceOfflinePack();

        if (isBrowserOffline()) {
          e.preventDefault();
          window.location.assign(cleanHref);
        }
      },
      [cleanHref, forcePack, onClick]
    );

    return (
      <Link
        ref={ref}
        href={cleanHref}
        prefetch={false}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </Link>
    );
  }
);
