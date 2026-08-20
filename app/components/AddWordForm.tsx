"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { playWordAudio } from "@/lib/speak";
import type { WordLookupResult } from "@/lib/wordLookup";

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

  return {
    english,
    turkish,
    example_sentence,
    phonetic,
    audio_url,
    source: "dictionary+mymemory",
  };
}

export function AddWordForm({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<WordLookupResult | null>(null);
  const [turkish, setTurkish] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onLookup(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLookup(null);
    setLoading(true);
    try {
      if (demo) {
        const result = await demoLookupEnglish(query);
        setLookup(result);
        setTurkish(result.turkish);
        return;
      }

      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", english: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulunamadı");
      setLookup(data.lookup);
      setTurkish(data.lookup.turkish);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulunamadı");
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    if (!lookup) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 350));
        setSuccess(`"${lookup.english}" listene eklendi. (Demo — kaydedilmedi)`);
        setQuery("");
        setLookup(null);
        setTurkish("");
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kaydedilemedi");
      setSuccess(
        data.alreadyHad
          ? `"${lookup.english}" zaten listende.`
          : `"${lookup.english}" listene eklendi.`
      );
      setQuery("");
      setLookup(null);
      setTurkish("");
      router.refresh();
      window.dispatchEvent(new Event("profile-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border-2 border-[#1cb0f6]/35 bg-gradient-to-br from-[#1cb0f6]/10 to-transparent p-5">
      <h2 className="text-base font-black text-white">Kendi kelimeni ekle</h2>
      <p className="mt-1 text-xs font-bold text-duo-muted">
        İngilizce yaz → anlam ve ses ücretsiz otomatik gelir.
      </p>

      <form onSubmit={onLookup} className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="örn. serendipity"
          className="min-w-0 flex-1 rounded-2xl border-2 border-duo-border bg-[#0f1a1e] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-duo-muted focus:border-[#1cb0f6]"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-2xl bg-[#1cb0f6] px-4 py-3 text-sm font-black text-white shadow-[0_3px_0_#1899d6] disabled:opacity-50"
        >
          {loading ? "..." : "Ara"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm font-bold text-[#ff4b4b]">{error}</p>}
      {success && <p className="mt-3 text-sm font-bold text-[#58cc02]">{success}</p>}

      {lookup && (
        <div className="mt-4 space-y-3 rounded-2xl border-2 border-duo-border bg-[#0f1a1e]/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-black text-white">{lookup.english}</p>
              {lookup.phonetic && (
                <p className="text-xs font-bold text-duo-muted">{lookup.phonetic}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => playWordAudio(lookup.english, lookup.audio_url)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#58cc02] text-lg shadow-[0_3px_0_#46a302]"
              aria-label="Sesini dinle"
            >
              🔊
            </button>
          </div>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wide text-duo-muted">
              Türkçe anlam (düzenleyebilirsin)
            </span>
            <input
              value={turkish}
              onChange={(e) => setTurkish(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-duo-border bg-duo-card px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#fd860a]"
            />
          </label>

          {lookup.example_sentence && (
            <p className="text-sm font-semibold italic text-duo-muted">
              “{lookup.example_sentence}”
            </p>
          )}

          <button
            type="button"
            disabled={saving || !turkish.trim()}
            onClick={onSave}
            className="w-full rounded-2xl bg-[#58cc02] py-3 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_3px_0_#46a302] disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Listeme ekle"}
          </button>
        </div>
      )}
    </section>
  );
}
