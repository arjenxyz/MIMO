"use client";

import { playWordAudio } from "@/lib/speak";
import type { DueWordItem } from "@/types";

export function MyWordsList({ words }: { words: DueWordItem[] }) {
  const items = words.filter((row) => row.words);

  return (
    <section className="rounded-2xl border border-[#e5e7eb] bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-black text-[#1e3a5f]">Kelimelerin</h2>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
          {items.length} kelime
        </p>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-[#64748b]">
          Henüz kelime yok. Yukarıdan ilk kelimeni ekle.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[#eef2f7]">
          {items.map((row) => {
            const word = row.words!;
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-[#0f172a]">
                    {word.english}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-[#64748b]">
                    {word.turkish}
                  </p>
                  {word.phonetic && (
                    <p className="mt-0.5 truncate text-xs font-bold text-[#94a3b8]">
                      {word.phonetic}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => playWordAudio(word.english, word.audio_url)}
                  aria-label={`${word.english} sesini dinle`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e2e8f0] bg-[#f8fafc] text-[#1cb0f6] transition hover:border-[#1cb0f6] hover:bg-[#e8f6fe]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M11 5 6 9H2v6h4l5 4V5z"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
