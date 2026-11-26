"use client";

import type { ReactNode } from "react";
import { useOfflineDocumentFlag, useOnlineStatus } from "@/lib/useOnlineStatus";

/** Mount once in root layout — syncs html[data-mimo-offline]. */
export function OfflineDocumentSync() {
  useOfflineDocumentFlag();
  return null;
}

/** Renders children only while online. */
export function OnlineOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const online = useOnlineStatus();
  if (!online) return <>{fallback}</>;
  return <>{children}</>;
}

/** Renders children only while offline. */
export function OfflineOnly({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();
  if (online) return null;
  return <>{children}</>;
}
