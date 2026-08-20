"use client";

import { ContinueButton } from "@/app/components/ContinueButton";

export function LevelUpModal({
  level,
  onClose,
}: {
  level: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-3xl border-2 border-duo-gold bg-duo-card p-6 text-center">
        <p className="text-5xl">🎉</p>
        <h2 className="mt-3 text-2xl font-black">Tebrikler Level Atladın!</h2>
        <p className="mt-2 font-extrabold text-duo-gold">Artık Level {level}</p>
        <div className="mt-6">
          <ContinueButton onClick={onClose}>DEVAM ET</ContinueButton>
        </div>
      </div>
    </div>
  );
}
