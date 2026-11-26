"use client";

import { useMemo } from "react";
import { Mascot } from "@/app/components/Mascot";

const TIPS = [
  "Her gün kısa pratik, uzun maratondan daha etkilidir.",
  "Yanlış cevap da öğrenmedir — tekrar et, kalıcı olur.",
  "MIMO’da düzenli seri, öğrenmeyi hızlandırır.",
  "Kelimeleri yüksek sesle tekrar etmek işe yarar.",
  "Kısa oturumlar, uzun hafıza demektir.",
];

export function LoadingScreen({ tip }: { tip?: string }) {
  const chosen = useMemo(() => {
    if (tip) return tip;
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  }, [tip]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-12 text-center">
      <Mascot mood="wave" size={200} className="w-40 sm:w-48" />
      <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-[#9ca3af]">
        Yükleniyor...
      </p>
      <p className="mt-3 max-w-sm text-base font-bold text-[#1f2937]">{chosen}</p>
    </div>
  );
}
