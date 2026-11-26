"use client";

import type { Quality } from "@/types";

const OPTIONS: { quality: Quality; label: string; hint: string; className: string }[] = [
  { quality: 0, label: "Tekrar Et", hint: "Again", className: "bg-red-500 shadow-[0_4px_0_#b91c1c]" },
  { quality: 1, label: "Zor", hint: "Hard", className: "bg-duo-orange shadow-duo-orange" },
  { quality: 2, label: "İyi", hint: "Good", className: "bg-duo-green text-duo-greenText shadow-duo-green" },
  { quality: 3, label: "Çok Kolay", hint: "Easy", className: "bg-duo-blue shadow-duo-blue" },
];

export function QualityButtons({ onSelect, disabled }: { onSelect: (quality: Quality) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {OPTIONS.map((option) => (
        <button
          key={option.quality}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option.quality)}
          className={`duo-btn px-2 text-sm ${option.className}`}
        >
          {option.label}
          <span className="mt-1 block text-[10px] font-bold opacity-80">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}
