"use client";

import { RealWordGame } from "@/app/components/RealWordGame";

/** Offline PWA spelling — seeds come from the downloaded pack only. */
export default function OfflineWordCheckPage() {
  return <RealWordGame seedWords={[]} />;
}
