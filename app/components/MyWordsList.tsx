"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { playWordAudio } from "@/lib/speak";
import { isShowGlobalWords } from "@/lib/showGlobalWords";
import type { DueWordItem, Word } from "@/types";
import {
  UploaderBadge,
  UploaderProfileCard,
  type UploaderProfile,
} from "@/app/components/WordUploaderAttribution";

type EditDraft = {
  english: string;
  turkish: string;
  phonetic: string;
};

export function MyWordsList({
  words,
  demo = false,
  currentUserId = null,
}: {
  words: DueWordItem[];
  demo?: boolean;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(words);
  const [showGlobal, setShowGlobal] = useState(true);
  const [editingRow, setEditingRow] = useState<DueWordItem | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ english: "", turkish: "", phonetic: "" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [uploaderProfile, setUploaderProfile] = useState<UploaderProfile | null>(null);

  useEffect(() => {
    setRows(words);
  }, [words]);

  useEffect(() => {
    const sync = () => setShowGlobal(isShowGlobalWords());
    sync();
    window.addEventListener("show-global-words-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("show-global-words-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!editingRow && !uploaderProfile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (uploaderProfile) setUploaderProfile(null);
      else cancelEdit();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [editingRow, uploaderProfile]);

  const items = useMemo(() => {
    return rows.filter((row) => {
      const word = row.words;
      if (!word) return false;
      const fromCommunity =
        word.is_global === true &&
        Boolean(word.created_by) &&
        (!currentUserId || word.created_by !== currentUserId);
      if (fromCommunity && !showGlobal) return false;
      return true;
    });
  }, [rows, showGlobal, currentUserId]);

  function startEdit(row: DueWordItem) {
    const word = row.words!;
    setEditingRow(row);
    setDraft({
      english: word.english,
      turkish: word.turkish,
      phonetic: word.phonetic ?? "",
    });
    setError(null);
    setModalError(null);
  }

  function cancelEdit() {
    setEditingRow(null);
    setModalError(null);
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    const row = editingRow;
    if (!row?.words) return;
    setBusyId(row.id);
    setModalError(null);

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
      setEditingRow(null);
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
      setEditingRow(null);
      router.refresh();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Güncellenemedi");
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
      if (editingRow?.id === row.id) setEditingRow(null);
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
      if (editingRow?.id === row.id) setEditingRow(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi");
    } finally {
      setBusyId(null);
    }
  }

  const editingBusy = editingRow ? busyId === editingRow.id : false;

  return (
    <section className="rounded-2xl border border-mimo-border bg-mimo-card px-5 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-black text-mimo-title">Kelimelerin</h2>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-mimo-muted">
          {items.length} kelime
        </p>
      </div>

      {!showGlobal && (
        <p className="mt-2 text-xs font-semibold text-mimo-muted">
          Global kelimeler gizli — profil menüsünden açabilirsin.
        </p>
      )}

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
            const isPrivate = word.is_global === false;

            return (
              <li key={row.id} className="py-3.5 first:pt-1 last:pb-0">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-black text-mimo-fg">{word.english}</p>
                      {isPrivate && (
                        <span className="rounded-md bg-mimo-surface px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-mimo-muted">
                          Özel
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-mimo-muted">
                      {word.turkish}
                    </p>
                    {word.phonetic && (
                      <p className="mt-0.5 truncate text-xs font-bold text-mimo-muted">
                        {word.phonetic}
                      </p>
                    )}
                    <UploaderBadge word={word} onOpen={setUploaderProfile} className="mt-1.5" />
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
              </li>
            );
          })}
        </ul>
      )}

      {uploaderProfile && (
        <UploaderProfileCard
          profile={uploaderProfile}
          onClose={() => setUploaderProfile(null)}
        />
      )}

      {editingRow?.words && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelEdit();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-word-title"
            className="w-full max-w-md rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7c3aed]">
                  Kelimeyi düzenle
                </p>
                <h3 id="edit-word-title" className="mt-1 text-lg font-black text-mimo-title">
                  {editingRow.words.english}
                </h3>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-full px-2.5 py-1 text-sm font-bold text-mimo-muted hover:bg-mimo-surface hover:text-mimo-fg"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => void saveEdit(e)} className="space-y-3">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wide text-mimo-muted">
                  İngilizce
                </span>
                <input
                  value={draft.english}
                  onChange={(e) => setDraft((d) => ({ ...d, english: e.target.value }))}
                  disabled={editingBusy}
                  autoFocus
                  className="mt-1 w-full rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2.5 text-sm font-bold text-mimo-fg outline-none focus:border-[#1cb0f6]"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wide text-mimo-muted">
                  Türkçe
                </span>
                <input
                  value={draft.turkish}
                  onChange={(e) => setDraft((d) => ({ ...d, turkish: e.target.value }))}
                  disabled={editingBusy}
                  className="mt-1 w-full rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2.5 text-sm font-semibold text-mimo-fg outline-none focus:border-[#1cb0f6]"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wide text-mimo-muted">
                  Fonetik (opsiyonel)
                </span>
                <input
                  value={draft.phonetic}
                  onChange={(e) => setDraft((d) => ({ ...d, phonetic: e.target.value }))}
                  disabled={editingBusy}
                  placeholder="/frend/"
                  className="mt-1 w-full rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2.5 text-sm font-bold text-mimo-muted outline-none focus:border-[#1cb0f6]"
                />
              </label>

              {modalError && (
                <p className="text-sm font-bold text-[#b91c1c]">{modalError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={editingBusy || !draft.english.trim() || !draft.turkish.trim()}
                  className="flex-1 rounded-2xl bg-[#58cc02] py-3 text-sm font-black text-[#14260a] shadow-[0_3px_0_#46a302] disabled:opacity-50"
                >
                  {editingBusy ? "Kaydediliyor…" : "Kaydet"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={editingBusy}
                  className="rounded-2xl border border-mimo-border bg-mimo-surface px-4 py-3 text-sm font-extrabold text-mimo-muted"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
