"use client";

import { MatchPairsGame } from "@/app/components/MatchPairsGame";

/** Offline PWA match — seeds come from the downloaded pack only. */
export default function OfflineMatchPage() {
  return <MatchPairsGame words={[]} />;
}
