"use client";

import { ListenTypeGame } from "@/app/components/ListenTypeGame";

/** Offline PWA listen & type — seeds come from the downloaded pack only. */
export default function OfflineListenPage() {
  return <ListenTypeGame seedWords={[]} />;
}
