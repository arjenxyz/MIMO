"use client";

import { useEffect } from "react";
import {
  StatusPrimaryButton,
  StatusScreen,
  StatusSecondaryLink,
} from "@/app/components/StatusScreen";
import { reportClientError } from "@/lib/report-client-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      title: "Sayfa hatası",
      message: error.message || "Bilinmeyen sayfa hatası",
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      source: "app/error",
      extra: {
        digest: error.digest,
        name: error.name,
      },
    });
  }, [error]);

  return (
    <StatusScreen
      code="!"
      eyebrow="Bir aksilik oldu"
      title="Bir şeyler ters gitti"
      description="Beklenmeyen bir hata oluştu. Tekrar deneyebilir veya ana sayfaya dönebilirsin."
      primary={<StatusPrimaryButton onClick={reset}>Tekrar dene</StatusPrimaryButton>}
      secondary={<StatusSecondaryLink href="/">Ana sayfaya dön</StatusSecondaryLink>}
    />
  );
}
