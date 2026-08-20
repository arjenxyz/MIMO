"use client";

import { useEffect, useState } from "react";

/** Fetches a related image URL — shows word placeholder when none fits. */
export function WordImage({
  english,
  imageUrl,
  className = "h-36 w-full object-cover",
  alt,
}: {
  english: string;
  imageUrl?: string | null;
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState<string | null>(imageUrl ?? null);
  const [loading, setLoading] = useState(imageUrl === undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (imageUrl !== undefined) {
      setSrc(imageUrl);
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    fetch(`/api/word-image?q=${encodeURIComponent(english)}`)
      .then((res) => res.json())
      .then((data: { image_url?: string | null }) => {
        if (cancelled) return;
        setSrc(data.image_url ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSrc(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [english, imageUrl]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-[#1a2a31] text-xs font-bold text-duo-muted ${className}`}
      >
        Görsel aranıyor…
      </div>
    );
  }

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#24353d] to-[#0f1a1e] px-4 text-center ${className}`}
      >
        <span className="text-2xl font-black tracking-[0.12em] text-white sm:text-3xl">
          {english.trim().toUpperCase()}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-duo-muted">
          Uygun görsel bulunamadı
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? `${english} görseli`}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
