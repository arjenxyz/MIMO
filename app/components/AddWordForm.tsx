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
  const [shareMode, setShareMode] = useState<"private" | "global">("private");
  const [imagePool, setImagePool] = useState<string[]>([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [triedUrls, setTriedUrls] = useState<string[]>([]);

  function closeModal() {
    setModalOpen(false);
    setLookup(null);
    setModalError("");
    setAlreadyOwned(false);
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

  async function onLookup(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setModalError("");
    setLookup(null);
    setModalOpen(false);
    setAlreadyOwned(false);
    setImagePool([]);
    setImageIndex(0);
    setTriedUrls([]);
    setLoading(true);
    try {
      if (demo) {
        const result = await demoLookupEnglish(query);
        const pool = await fetchImagePool(result.english);
        setImagePool(pool);
        setImageIndex(0);
        setTriedUrls(pool.slice(0, 1));
        setLookup({ ...result, image_url: pool[0] ?? null });
        setTurkish(result.turkish);
        setModalOpen(true);
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
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Bulunamadı");
      if (!data.lookup) throw new Error("Bulunamadı");

      const result = data.lookup;
      const owned = Boolean(data.alreadyOwned);
      setAlreadyOwned(owned);

      if (owned) {
        setLookup({ ...result, image_url: result.image_url ?? null });
        setTurkish(result.turkish);
        setModalError(data.message || `"${result.english}" zaten listende — tekrar eklenmez.`);
        setModalOpen(true);
        return;
      }

      const pool = await fetchImagePool(result.english);
      const nextPool = pool.length > 0 ? pool : result.image_url ? [result.image_url] : [];
      setImagePool(nextPool);
      setImageIndex(0);
      setTriedUrls(nextPool.slice(0, 1));
      setLookup({ ...result, image_url: nextPool[0] ?? null });
      setTurkish(result.turkish);
      setModalOpen(true);
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
      };
      if (!res.ok) {
        if (data.alreadyHad) {
          setAlreadyOwned(true);
          setModalError(data.error || "Bu kelime zaten listende.");
          return;
        }
        throw new Error(data.error || "Kaydedilemedi");
      }
      setSuccess(`"${lookup.english}" listene eklendi.`);
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
                <fieldset className="space-y-2 rounded-xl border border-[#ce82ff]/35 bg-[#faf5ff] p-3 dark:bg-[#1e1033]">
                  <legend className="px-1 text-[10px] font-black uppercase tracking-wide text-[#7c3aed]">
                    Kayıt türü
                  </legend>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-mimo-border bg-mimo-card px-3 py-2.5">
                    <input
                      type="radio"
                      name="shareMode"
                      checked={shareMode === "private"}
                      onChange={() => setShareMode("private")}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-extrabold text-mimo-title">
                        Yalnızca kendim için
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-mimo-muted">
                        Başka hesaplara yüklenmez.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-mimo-border bg-mimo-card px-3 py-2.5">
                    <input
                      type="radio"
                      name="shareMode"
                      checked={shareMode === "global"}
                      onChange={() => setShareMode("global")}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-extrabold text-mimo-title">
                        Global kelime sistemine yükle
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-mimo-muted">
                        Topluluk havuzuna eklenir.
                      </span>
                    </span>
                  </label>
                </fieldset>
              )}

              {!alreadyOwned && (
                <>
                  <div className="overflow-hidden rounded-xl border border-mimo-soft bg-mimo-surface">
                    <WordImage
                      english={lookup.english}
                      imageUrl={lookup.image_url}
                      className="h-36 w-full object-cover"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void swapImage()}
                    disabled={swapping}
                    className="w-full rounded-xl border border-mimo-soft bg-mimo-surface px-4 py-2.5 text-sm font-bold text-[#0369a1] transition hover:border-[#1cb0f6] hover:bg-[#e8f6fe] disabled:opacity-50"
                  >
                    {swapping ? "Yeni görsel aranıyor…" : "Görseli değiştir"}
                  </button>
                </>
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

                  {lookup.example_sentence && (
                    <p className="text-sm font-semibold italic text-mimo-muted">
                      “{lookup.example_sentence}”
                    </p>
                  )}

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
