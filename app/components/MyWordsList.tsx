"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { playWordAudio } from "@/lib/speak";
import type { DueWordItem, Word } from "@/types";

type EditDraft = {
  english: string;
  turkish: string;
  phonetic: string;
};

export function MyWordsList({
  words,
  demo = false,
}: {
  words: DueWordItem[];
  demo?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(words);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ english: "", turkish: "", phonetic: "" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => rows.filter((row) => row.words), [rows]);

  function startEdit(row: DueWordItem) {
    const word = row.words!;
    setEditingId(row.id);
    setDraft({
      english: word.english,
      turkish: word.turkish,
      phonetic: word.phonetic ?? "",
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveEdit(event: FormEvent, row: DueWordItem) {
    event.preventDefault();
    if (!row.words) return;
    setBusyId(row.id);
    setError(null);

    const nextWord: Word = {
      ...row.words,
      english: draft.english.trim(),
      turkish: draft.turkish.trim(),
      phonetic: draft.phonetic.trim() || null,
    };

    if (demo) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, words: nextWord } : r))
      );
      setEditingId(null);
      setBusyId(null);
      return;
    }

    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          userWordId: row.id,
          english: nextWord.english,
          turkish: nextWord.turkish,
          phonetic: nextWord.phonetic,
          example_sentence: row.words.example_sentence,
        }),
      });
      const data = (await res.json()) as { error?: string; word?: Word };
      if (!res.ok) throw new Error(data.error || "Güncellenemedi");

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, words: data.word ?? nextWord } : r
        )
      );
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncellenemedi");
    } finally {
      setBusyId(null);
    }
  }

  async function removeWord(row: DueWordItem) {
    const word = row.words;
    if (!word) return;
    if (!window.confirm(`“${word.english}” listeden silinsin mi?`)) return;

    setBusyId(row.id);
    setError(null);

    if (demo) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setBusyId(null);
      if (editingId === row.id) setEditingId(null);
      return;
    }

    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", userWordId: row.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Silinemedi");

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (editingId === row.id) setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-mimo-border bg-mimo-card px-5 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-black text-mimo-title">Kelimelerin</h2>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-mimo-muted">
          {items.length} kelime
        </p>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#b91c1c]">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-mimo-muted">
          Henüz kelime yok. Yukarıdan ilk kelimeni ekle.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[#eef2f7] dark:divide-mimo-border">
          {items.map((row) => {
            const word = row.words!;
            const busy = busyId === row.id;
            const editing = editingId === row.id;

            return (
              <li key={row.id} className="py-3.5 first:pt-1 last:pb-0">
                {editing ? (
                  <form onSubmit={(e) => void saveEdit(e, row)} className="space-y-2.5">
                    <input
                      value={draft.english}
                      onChange={(e) => setDraft((d) => ({ ...d, english: e.target.value }))}
                      disabled={busy}
                      aria-label="İngilizce"
                      className="w-full rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2 text-sm font-bold text-mimo-fg outline-none focus:border-[#1cb0f6]"
                    />
                    <input
                      value={draft.turkish}
                      onChange={(e) => setDraft((d) => ({ ...d, turkish: e.target.value }))}
                      disabled={busy}
                      aria-label="Türkçe"
                      className="w-full rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2 text-sm font-semibold text-mimo-fg outline-none focus:border-[#1cb0f6]"
                    />
                    <input
                      value={draft.phonetic}
                      onChange={(e) => setDraft((d) => ({ ...d, phonetic: e.target.value }))}
                      disabled={busy}
                      placeholder="Fonetik (opsiyonel)"
                      aria-label="Fonetik"
                      className="w-full rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2 text-xs font-bold text-mimo-muted outline-none focus:border-[#1cb0f6]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={busy || !draft.english.trim() || !draft.turkish.trim()}
                        className="flex-1 rounded-xl bg-[#58cc02] px-3 py-2 text-sm font-extrabold text-white shadow-[0_3px_0_#46a302] disabled:opacity-50"
                      >
                        {busy ? "Kaydediliyor…" : "Kaydet"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={busy}
                        className="rounded-xl border border-mimo-border bg-mimo-surface px-3 py-2 text-sm font-extrabold text-mimo-muted"
                      >
                        Vazgeç
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black text-mimo-fg">{word.english}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-mimo-muted">
                        {word.turkish}
                      </p>
                      {word.phonetic && (
                        <p className="mt-0.5 truncate text-xs font-bold text-mimo-muted">
                          {word.phonetic}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => playWordAudio(word.english, word.audio_url)}
                      aria-label={`${word.english} sesini dinle`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mimo-soft bg-mimo-surface text-[#1cb0f6] transition hover:border-[#1cb0f6] hover:bg-[#e8f6fe]"
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
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      disabled={busy}
                      aria-label={`${word.english} düzenle`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mimo-soft bg-mimo-surface text-mimo-muted transition hover:border-[#7c3aed] hover:text-[#7c3aed]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeWord(row)}
                      disabled={busy}
                      aria-label={`${word.english} sil`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mimo-soft bg-mimo-surface text-[#e11d48] transition hover:border-[#e11d48] hover:bg-[#ffe8e8]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
