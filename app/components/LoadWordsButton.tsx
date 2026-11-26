"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadNewWordsAction } from "@/app/actions";
import { ContinueButton } from "@/app/components/ContinueButton";

export function LoadWordsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    setError("");
    setLoading(true);
    const result = await loadNewWordsAction();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <ContinueButton onClick={onClick} disabled={loading} variant="blue">
        {loading ? "Yükleniyor..." : "Yeni Kelimeler Yükle"}
      </ContinueButton>
      {error && <p className="text-sm font-bold text-red-400">{error}</p>}
    </div>
  );
}
