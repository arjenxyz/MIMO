"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { playWordAudio } from "@/lib/speak";
import { WordImage } from "@/app/components/WordImage";
import type { WordLookupResult } from "@/lib/wordLookup";
import { detectWordLevelSync } from "@/lib/wordLevel";

async function demoLookupEnglish(raw: string): Promise<WordLookupResult> {
  const word = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!word || word.length > 60 || !/^[a-z][a-z\s'-]*$/i.test(word)) {
    throw new Error("Geçerli bir İngilizce kelime gir.");
  }

  let phonetic: string | null = null;
  let audio_url: string | null = null;
  let example_sentence: string | null = null;
  let english = word;

  try {
    const dictRes = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (dictRes.ok) {
      const data = (await dictRes.json()) as Array<{
        word?: string;
        phonetic?: string;
        phonetics?: Array<{ text?: string; audio?: string }>;
        meanings?: Array<{ definitions?: Array<{ example?: string }> }>;
      }>;
      const entry = data[0];
      if (entry) {
        english = (entry.word || word).toLowerCase();
        phonetic = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || null;
        const audioRaw = entry.phonetics?.find((p) => p.audio)?.audio || null;
        audio_url = audioRaw ? (audioRaw.startsWith("//") ? `https:${audioRaw}` : audioRaw) : null;
        outer: for (const meaning of entry.meanings ?? []) {
          for (const def of meaning.definitions ?? []) {
            if (def.example) {
              example_sentence = def.example;
              break outer;
            }
          }
        }
      }
    }
  } catch {
    // ignore — translation may still work
  }

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", english);
  url.searchParams.set("langpair", "en|tr");
  const trRes = await fetch(url.toString());
  if (!trRes.ok) throw new Error("Türkçe anlam bulunamadı.");
  const trData = (await trRes.json()) as {
    responseData?: { translatedText?: string };
  };
  const turkish = trData.responseData?.translatedText?.trim();
  if (!turkish || turkish.toLowerCase() === english.toLowerCase()) {
    throw new Error("Türkçe anlam bulunamadı. Kelimeyi kontrol et.");
  }

  const level = detectWordLevelSync(english);

  return {
    english,
    turkish,
    example_sentence,
    phonetic,
    audio_url,
    image_url: null,
    cefr: level.cefr,
    difficulty: level.difficulty,
    level_source: level.source,
    source: "dictionary+mymemory",
  };
}

export function AddWordForm({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<WordLookupResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [turkish, setTurkish] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [success, setSuccess] = useState("");
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [poolNotice, setPoolNotice] = useState("");
  const [shareMode, setShareMode] = useState<"private" | "global">("private");
  const [imagePool, setImagePool] = useState<string[]>([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [triedUrls, setTriedUrls] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);

  function closeModal() {
    setModalOpen(false);
    setLookup(null);
    setModalError("");
    setAlreadyOwned(false);
    setPoolNotice("");
    setImagePool([]);
    setImageIndex(0);
    setTriedUrls([]);
  }

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  async function fetchImagePool(english: string, exclude: string[] = []) {
    const params = new URLSearchParams({ q: english, pool: "1" });
    if (exclude.length > 0) params.set("exclude", exclude.join("|"));
    const imgRes = await fetch(`/api/word-image?${params.toString()}`);
    const imgData = (await imgRes.json()) as {
      image_url?: string | null;
      candidates?: string[];
    };
    const pool = (imgData.candidates ?? []).filter(Boolean);
    if (pool.length === 0 && imgData.image_url) pool.push(imgData.image_url);
    return pool;
  }

  async function loadImagesForLookup(english: string, seedUrl?: string | null) {
    setImageLoading(true);
    try {
      const pool = await fetchImagePool(english);
      const nextPool =
        pool.length > 0 ? pool : seedUrl ? [seedUrl] : [];
      setImagePool(nextPool);
      setImageIndex(0);
      setTriedUrls(nextPool.slice(0, 1));
      setLookup((prev) =>
        prev ? { ...prev, image_url: nextPool[0] ?? prev.image_url ?? null } : prev
      );
    } catch {
      // Görsel opsiyonel — anlam geldiyse modal açık kalır.
    } finally {
      setImageLoading(false);
    }
  }

  async function onLookup(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setModalError("");
    setLookup(null);
    setModalOpen(false);
    setAlreadyOwned(false);
    setPoolNotice("");
    setImagePool([]);
    setImageIndex(0);
    setTriedUrls([]);
    setLoading(true);
    try {
      if (demo) {
        const result = await demoLookupEnglish(query);
        setLookup({ ...result, image_url: null });
        setTurkish(result.turkish);
        setModalOpen(true);
        void loadImagesForLookup(result.english);
        return;
      }

      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", english: query }),
      });
      const data = (await res.json()) as {
        lookup?: WordLookupResult;
        alreadyOwned?: boolean;
        inPool?: boolean;
        message?: string;
        poolMessage?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Bulunamadı");
      if (!data.lookup) throw new Error("Bulunamadı");

      const result = data.lookup;
      const owned = Boolean(data.alreadyOwned);
      setAlreadyOwned(owned);
      setPoolNotice(!owned && data.inPool ? data.poolMessage || "" : "");

      if (owned) {
        setLookup({ ...result, image_url: result.image_url ?? null });
        setTurkish(result.turkish);
        setModalError(data.message || `"${result.english}" zaten listende — tekrar eklenmez.`);
        setModalOpen(true);
        return;
      }

      setLookup({ ...result, image_url: result.image_url ?? null });
      setTurkish(result.turkish);
      setModalOpen(true);
      void loadImagesForLookup(result.english, result.image_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulunamadı");
    } finally {
      setLoading(false);
    }
  }

  async function swapImage() {
    if (!lookup || swapping || alreadyOwned) return;
    setSwapping(true);
    setModalError("");
    try {
      const nextIndex = imageIndex + 1;
      if (nextIndex < imagePool.length) {
        setImageIndex(nextIndex);
        const url = imagePool[nextIndex];
        setTriedUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
        setLookup({ ...lookup, image_url: url });
        return;
      }

      const exclude = triedUrls.length > 0 ? triedUrls : imagePool;
      const more = await fetchImagePool(lookup.english, exclude);
      if (more.length === 0) {
        setModalError("Başka uygun görsel bulunamadı.");
        setLookup({ ...lookup, image_url: null });
        return;
      }

      const merged = [...imagePool, ...more];
      setImagePool(merged);
      setImageIndex(imagePool.length);
      setTriedUrls((prev) => [...prev, more[0]]);
      setLookup({ ...lookup, image_url: more[0] });
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Görsel değiştirilemedi");
    } finally {
      setSwapping(false);
    }
  }

  async function onSave() {
    if (!lookup || alreadyOwned) return;
    setSaving(true);
    setModalError("");
    setSuccess("");
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 350));
        setSuccess(`"${lookup.english}" listene eklendi. (Demo — kaydedilmedi)`);
        setQuery("");
        closeModal();
        return;
      }

      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          english: lookup.english,
          turkish,
          example_sentence: lookup.example_sentence,
          phonetic: lookup.phonetic,
          audio_url: lookup.audio_url,
          difficulty: lookup.difficulty,
          is_global: shareMode === "global",
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        alreadyHad?: boolean;
        ok?: boolean;
        reusedPool?: boolean;
        message?: string;
      };
      if (!res.ok) {
        if (data.alreadyHad) {
          setAlreadyOwned(true);
          setModalError(data.error || "Bu kelime zaten listende.");
          return;
        }
        throw new Error(data.error || "Kaydedilemedi");
      }
      setSuccess(
        data.message ||
          (data.reusedPool
            ? `"${lookup.english}" havuzdaki kayıttan listene eklendi.`
            : `"${lookup.english}" listene eklendi.`)
      );
      setQuery("");
      closeModal();
      router.refresh();
      window.dispatchEvent(new Event("profile-updated"));
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-mimo-muted">
        İngilizce yaz → anlam, ses ve görsel otomatik gelir.
      </p>

      <form onSubmit={onLookup} className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="örn. serendipity"
          className="min-w-0 flex-1 rounded-xl border border-mimo-soft bg-mimo-surface px-4 py-3 text-sm font-bold text-mimo-fg outline-none placeholder:text-mimo-muted focus:border-[#1cb0f6]"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-2xl bg-[#1cb0f6] px-4 py-3 text-sm font-black text-white shadow-[0_3px_0_#1899d6] disabled:opacity-50"
        >
          {loading ? "..." : "Ara"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm font-bold text-[#b91c1c]">{error}</p>}
      {success && <p className="mt-3 text-sm font-bold text-[#15803d]">{success}</p>}

      {modalOpen && lookup && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="word-lookup-title"
            className="max-h-[min(90dvh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1cb0f6]">
                Kelime sonucu
              </p>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full px-2.5 py-1 text-sm font-bold text-mimo-muted hover:bg-mimo-surface hover:text-mimo-fg"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p id="word-lookup-title" className="text-xl font-black text-mimo-title">
                      {lookup.english}
                    </p>
                    <span className="rounded-md bg-[#e8f6fe] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#0369a1] dark:bg-[#0c4a6e] dark:text-[#7dd3fc]">
                      {lookup.cefr}
                    </span>
                  </div>
                  {lookup.phonetic && (
                    <p className="text-xs font-bold text-mimo-muted">{lookup.phonetic}</p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-mimo-muted">{lookup.turkish}</p>
                </div>
                <button
                  type="button"
                  onClick={() => playWordAudio(lookup.english, lookup.audio_url)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#58cc02] text-lg shadow-[0_3px_0_#46a302]"
                  aria-label="Sesini dinle"
                >
                  🔊
                </button>
              </div>

              {!alreadyOwned && (
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-mimo-muted">
                    Kayıt türü
                  </p>
                  <div
                    role="radiogroup"
                    aria-label="Kayıt türü"
                    className="grid grid-cols-2 gap-1 rounded-xl border border-mimo-soft bg-mimo-surface p-1"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={shareMode === "private"}
                      onClick={() => setShareMode("private")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-center text-xs font-extrabold transition ${
                        shareMode === "private"
                          ? "bg-mimo-card text-mimo-title shadow-sm ring-1 ring-mimo-border"
                          : "text-mimo-muted hover:text-mimo-fg"
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
                        <rect
                          x="5"
                          y="11"
                          width="14"
                          height="10"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        />
                        <path
                          d="M8 11V8a4 4 0 0 1 8 0v3"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                      </svg>
                      Yalnızca kendim
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={shareMode === "global"}
                      onClick={() => setShareMode("global")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-center text-xs font-extrabold transition ${
                        shareMode === "global"
                          ? "bg-[#f3e8ff] text-[#7c3aed] shadow-sm ring-1 ring-[#ce82ff]/50 dark:bg-[#2a1845]"
                          : "text-mimo-muted hover:text-mimo-fg"
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
                        <path
                          d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9s1.3-6.2 3.8-9z"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Global yükle
                    </button>
                  </div>
                </div>
              )}

              {!alreadyOwned && (
                <div className="relative overflow-hidden rounded-xl border border-mimo-soft bg-mimo-surface">
                  <WordImage
                    english={lookup.english}
                    imageUrl={lookup.image_url}
                    className="h-36 w-full object-cover"
                  />
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-xs font-bold text-white">
                      Görsel aranıyor…
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void swapImage()}
                    disabled={swapping}
                    className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-extrabold text-white backdrop-blur-sm transition hover:bg-black/65 disabled:opacity-50"
                    aria-label={swapping ? "Yeni görsel aranıyor" : "Görseli değiştir"}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                      className={swapping ? "animate-spin" : undefined}
                    >
                      <path
                        d="M21 12a9 9 0 1 1-2.6-6.3"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M21 4v5h-5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {swapping ? "Aranıyor…" : "Değiştir"}
                  </button>
                </div>
              )}

              {poolNotice && !alreadyOwned && (
                <p className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-sm font-bold text-[#1d4ed8] dark:border-[#1e3a8a] dark:bg-[#172554] dark:text-[#93c5fd]">
                  {poolNotice}
                </p>
              )}

              {modalError && (
                <p
                  className={`text-sm font-bold ${
                    alreadyOwned ? "text-[#b45309]" : "text-[#b91c1c]"
                  }`}
                >
                  {modalError}
                </p>
              )}

              {alreadyOwned ? (
                <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-center text-sm font-bold text-[#a16207]">
                  Bu kelime zaten listenizde — tekrar eklenemez.
                </p>
              ) : (
                <>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-wide text-mimo-muted">
                      Türkçe anlam (düzenleyebilirsin)
                    </span>
                    <input
                      value={turkish}
                      onChange={(e) => setTurkish(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2 text-sm font-bold text-mimo-fg outline-none focus:border-[#1cb0f6]"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={saving || !turkish.trim()}
                    onClick={() => void onSave()}
                    className="w-full rounded-2xl bg-[#58cc02] py-3 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_3px_0_#46a302] disabled:opacity-50"
                  >
                    {saving
                      ? "Kaydediliyor..."
                      : shareMode === "global"
                        ? "Globale kaydet"
                        : "Listeme ekle"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
