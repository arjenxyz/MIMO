"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { OfflinePracticeCta } from "@/app/components/OfflinePracticeCta";
import { OfflinePracticeLink } from "@/app/components/OfflinePracticeLink";
import {
  formatExactDataSize,
  formatMegabytes,
  groupWordsByAuthor,
  type OfflineManifestResponse,
  type OfflinePackId,
  type OfflineWordAuthorPack,
  type StoredOfflinePack,
} from "@/lib/offlinePacks";
import {
  downloadOfflinePack,
  fetchOfflineManifest,
  getAllStoredPacks,
  removeAuthorFromWordsPack,
  removeStoredPack,
  syncDownloadedPacksIfOnline,
  type DownloadProgress,
} from "@/lib/offlineStorage";

const DELETE_HOLD_MS = 3000;

type PendingDelete =
  | {
      kind: "author";
      authorId: string;
      username: string;
      avatarUrl: string | null;
      wordCount: number;
      audioUrlCount: number;
      mbLabel: string;
    }
  | {
      kind: "det";
      passageCount: number;
      mbLabel: string;
    };

function formatSyncDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function HoldToDeleteButton({
  onConfirm,
  label = "Basılı tutarak sil",
}: {
  onConfirm: () => void;
  label?: string;
}) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const clearHold = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startRef.current = null;
    doneRef.current = false;
    setHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => () => clearHold(), [clearHold]);

  const tick = useCallback(() => {
    if (startRef.current == null) return;
    const elapsed = performance.now() - startRef.current;
    const next = Math.min(1, elapsed / DELETE_HOLD_MS);
    setProgress(next);
    if (next >= 1) {
      if (!doneRef.current) {
        doneRef.current = true;
        onConfirm();
      }
      clearHold();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [clearHold, onConfirm]);

  const beginHold = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      doneRef.current = false;
      startRef.current = performance.now();
      setHolding(true);
      setProgress(0);
      rafRef.current = requestAnimationFrame(tick);
    },
    [tick]
  );

  return (
    <button
      type="button"
      onPointerDown={beginHold}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
      onLostPointerCapture={clearHold}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${label} — 3 saniye basılı tut`}
      className="relative flex-1 overflow-hidden rounded-xl bg-[#b91c1c] px-3 py-2.5 text-sm font-black text-white shadow-[0_3px_0_#7f1d1d] select-none touch-none"
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left bg-[#7f1d1d] transition-[transform] duration-75"
        style={{ transform: `scaleX(${progress})` }}
      />
      <span className="relative z-10">
        {holding ? `${Math.ceil((1 - progress) * 3)}…` : label}
      </span>
    </button>
  );
}

function progressLabel(progress: DownloadProgress | null): string | null {
  if (!progress) return null;
  if (progress.phase === "words") return "Kelimeler indiriliyor…";
  if (progress.total <= 0) return "Sesler hazırlanıyor…";
  return `Sesler ${progress.done}/${progress.total}`;
}

function AuthorAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  const initial = username.charAt(0).toUpperCase() || "?";
  return (
    <span className="relative flex h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#fd860a] ring-2 ring-[#fd860a]/25">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-black text-white">
          {initial}
        </span>
      )}
    </span>
  );
}

export function OfflinePacksManager({
  showOfflineWorkspaceLink = true,
}: {
  showOfflineWorkspaceLink?: boolean;
}) {
  const [online, setOnline] = useState(true);
  const [manifest, setManifest] = useState<OfflineManifestResponse | null>(null);
  const [stored, setStored] = useState<Partial<Record<OfflinePackId, StoredOfflinePack>>>({});
  const [loadingManifest, setLoadingManifest] = useState(true);
  const [remoteRefreshing, setRemoteRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [unlockedAuthorIds, setUnlockedAuthorIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memoriesModal, setMemoriesModal] = useState<OfflineWordAuthorPack | null>(null);
  const [modalPassScore, setModalPassScore] = useState(80);
  const [modalPassFloor, setModalPassFloor] = useState(70);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalNotice, setModalNotice] = useState<string | null>(null);
  const [localAuthorBytes, setLocalAuthorBytes] = useState<Record<string, number>>({});
  const [rememberedAuthorBytes, setRememberedAuthorBytes] = useState<
    Record<string, number>
  >({});

  const wordsPack = stored.words as StoredOfflinePack<"words"> | undefined;
  const detPack = stored.det as StoredOfflinePack<"det"> | undefined;
  const localAuthorIds = useMemo(() => {
    if (wordsPack?.authorIds?.length) return new Set(wordsPack.authorIds);
    const fromWords = (wordsPack?.data ?? [])
      .map((w) => w.created_by)
      .filter((id): id is string => Boolean(id));
    return new Set(fromWords);
  }, [wordsPack]);

  const loadLocalAndRemote = useCallback(async (autoSync = false) => {
    const localMap = await getAllStoredPacks();
    setStored(localMap);

    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    setOnline(isOnline);
    // Local IndexedDB first — never wait on network for the list shell.
    setLoadingManifest(false);

    if (!isOnline) {
      setRemoteRefreshing(false);
      return;
    }

    setRemoteRefreshing(true);
    try {
      const wordsMaxId = localMap.words?.maxId ?? 0;
      const remote = await fetchOfflineManifest(wordsMaxId, { timeoutMs: 6000 });
      setManifest(remote);

      // Soft refresh once server audio-size cache has had time to warm.
      window.setTimeout(() => {
        void fetchOfflineManifest(wordsMaxId, { timeoutMs: 6000 })
          .then((fresh) => setManifest(fresh))
          .catch(() => undefined);
      }, 2800);

      void fetch("/api/pack-unlock", { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as {
            unlocks?: Array<{ author_id: string }>;
          };
          setUnlockedAuthorIds(
            new Set((data.unlocks ?? []).map((u) => u.author_id))
          );
        })
        .catch(() => {
          /* guest / table missing */
        });

      if (autoSync && Object.keys(localMap).length > 0) {
        const synced = await syncDownloadedPacksIfOnline();
        if (synced.updatedPacks.length > 0) {
          const refreshedLocal = await getAllStoredPacks();
          setStored(refreshedLocal);
          const refreshedRemote = await fetchOfflineManifest(
            refreshedLocal.words?.maxId ?? 0,
            { timeoutMs: 6000 }
          );
          setManifest(refreshedRemote);
          if (synced.addedWords > 0) {
            setNotice(
              `Bağlantı algılandı: ${synced.addedWords} kelime/ses paketine eklendi (+${formatMegabytes(synced.addedBytes)}).`
            );
          } else {
            setNotice("Çevrimdışı paketlerin güncellendi.");
          }
        }
      }
    } catch {
      // Offline or temporary server error — local packs still stay usable
    } finally {
      setRemoteRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLocalAndRemote(true);

    const onOnline = () => {
      setOnline(true);
      void loadLocalAndRemote(true);
    };
    const onOffline = () => setOnline(false);
    const onPacksUpdated = () => {
      void getAllStoredPacks().then(setStored);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("mimo-offline-packs-updated", onPacksUpdated);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("mimo-offline-packs-updated", onPacksUpdated);
    };
  }, [loadLocalAndRemote]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) setCurrentUserId(user?.id ?? null);
      } catch {
        if (!cancelled) setCurrentUserId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mimo-author-pack-bytes");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number>;
      setRememberedAuthorBytes(parsed);
    } catch {
      /* private mode */
    }
  }, []);

  // Exact on-device size per author (JSON + cached audio blobs).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!wordsPack?.data?.length) {
        if (!cancelled) setLocalAuthorBytes({});
        return;
      }
      const { utf8ByteLength } = await import("@/lib/offlinePacks");
      const { sumCachedAudioBytes } = await import("@/lib/offlineAudio");
      const byAuthor = new Map<string, typeof wordsPack.data>();
      for (const w of wordsPack.data) {
        const id = w.created_by;
        if (!id) continue;
        const list = byAuthor.get(id) ?? [];
        list.push(w);
        byAuthor.set(id, list);
      }
      const next: Record<string, number> = {};
      for (const [authorId, list] of Array.from(byAuthor.entries())) {
        const json = utf8ByteLength(list);
        const audio = await sumCachedAudioBytes(list.map((w) => w.english));
        next[authorId] = json + audio;
      }
      if (!cancelled) {
        setLocalAuthorBytes(next);
        setRememberedAuthorBytes((prev) => ({ ...prev, ...next }));
        try {
          const stored = JSON.parse(
            localStorage.getItem("mimo-author-pack-bytes") || "{}"
          ) as Record<string, number>;
          localStorage.setItem(
            "mimo-author-pack-bytes",
            JSON.stringify({ ...stored, ...next })
          );
        } catch {
          /* private mode */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wordsPack]);

  // Remember remote measured sizes so refresh doesn't invent a wrong MB.
  useEffect(() => {
    if (!manifest?.wordAuthors?.length) return;
    try {
      const prev = JSON.parse(
        localStorage.getItem("mimo-author-pack-bytes") || "{}"
      ) as Record<string, number>;
      let changed = false;
      for (const a of manifest.wordAuthors) {
        const total = a.byteSize + (a.audioByteSize ?? 0);
        if (a.audioSizeMeasured && total > 0 && prev[a.authorId] !== total) {
          prev[a.authorId] = total;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem("mimo-author-pack-bytes", JSON.stringify(prev));
      }
    } catch {
      /* private mode */
    }
  }, [manifest]);

  async function openMemoriesModal(author: OfflineWordAuthorPack) {
    setMemoriesModal(author);
    setModalNotice(null);
    setModalBusy(true);
    try {
      const res = await fetch(
        `/api/pack-unlock?authorId=${encodeURIComponent(author.authorId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.status === 401) {
        setModalNotice("Anılara gitmek için giriş yapmalısın.");
        return;
      }
      if (!res.ok && res.status !== 400) {
        // Own pack returns 200 now; other errors
        setModalNotice(data.error || "Bilgi alınamadı");
      }
      if (typeof data.passScore === "number") setModalPassScore(data.passScore);
      if (typeof data.passScoreFloor === "number") setModalPassFloor(data.passScoreFloor);
      if (data.unlock) {
        setUnlockedAuthorIds((prev) => new Set([...Array.from(prev), author.authorId]));
      }
    } catch {
      setModalNotice("Bilgi alınamadı. İnternet bağlantını kontrol et.");
    } finally {
      setModalBusy(false);
    }
  }

  async function saveOwnPassScore() {
    if (!memoriesModal || currentUserId !== memoriesModal.authorId) return;
    setModalBusy(true);
    setModalNotice(null);
    try {
      const res = await fetch("/api/pack-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setPassScore", passScore: modalPassScore }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Skor kaydedilemedi");
      setModalPassScore(data.passScore);
      setModalNotice(`Geçme skoru %${data.passScore} olarak kaydedildi.`);
    } catch (e) {
      setModalNotice(e instanceof Error ? e.message : "Skor kaydedilemedi");
    } finally {
      setModalBusy(false);
    }
  }

  async function handleDownloadAuthor(author: OfflineWordAuthorPack) {
    setError(null);
    setNotice(null);
    setBusyKey(`author:${author.authorId}`);
    setProgress({ phase: "words", done: 0, total: 1, authorId: author.authorId });
    try {
      const result = await downloadOfflinePack("words", {
        authorId: author.authorId,
        onProgress: setProgress,
      });
      const updated = await getAllStoredPacks();
      setStored(updated);
      const refreshedManifest = await fetchOfflineManifest(updated.words?.maxId ?? 0).catch(
        () => null
      );
      if (refreshedManifest) setManifest(refreshedManifest);

      const alreadyHad = localAuthorIds.has(author.authorId);
      setNotice(
        alreadyHad
          ? `@${author.username} paketi güncellendi (${result.addedCount} kelime · ses dahil).`
          : `@${author.username} paketi indirildi (${result.addedCount} kelime · ses dahil · ${formatMegabytes(result.pack.byteSize)}).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paket indirilemedi.");
    } finally {
      setBusyKey(null);
      setProgress(null);
    }
  }

  async function handleDownloadAllAuthors() {
    const authors = manifest?.wordAuthors ?? [];
    if (authors.length === 0) {
      setError("İndirilecek kelime paketi yok.");
      return;
    }

    setError(null);
    setNotice(null);
    setBusyKey("all-authors");
    try {
      let totalAdded = 0;
      for (const author of authors) {
        setProgress({ phase: "words", done: 0, total: 1, authorId: author.authorId });
        const res = await downloadOfflinePack("words", {
          authorId: author.authorId,
          onProgress: setProgress,
        });
        totalAdded += res.addedCount;
      }
      const updated = await getAllStoredPacks();
      setStored(updated);
      const refreshedManifest = await fetchOfflineManifest(updated.words?.maxId ?? 0).catch(
        () => null
      );
      if (refreshedManifest) setManifest(refreshedManifest);
      setNotice(
        `Tüm kelime paketleri aktarıldı (${totalAdded} kelime · ses dahil · ${formatMegabytes(updated.words?.byteSize ?? 0)}).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paketler indirilemedi.");
    } finally {
      setBusyKey(null);
      setProgress(null);
    }
  }

  async function handleDownloadDet() {
    setError(null);
    setNotice(null);
    setBusyKey("det");
    setProgress({ phase: "words", done: 0, total: 1 });
    try {
      const result = await downloadOfflinePack("det", { onProgress: setProgress });
      const updated = await getAllStoredPacks();
      setStored(updated);
      setNotice(`Okuma pasajları kaydedildi (${formatMegabytes(result.pack.byteSize)}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Okuma paketi indirilemedi.");
    } finally {
      setBusyKey(null);
      setProgress(null);
    }
  }

  async function confirmPendingDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setError(null);
    setNotice(null);

    const busyId =
      target.kind === "author" ? `delete-author:${target.authorId}` : "delete-det";
    setBusyKey(busyId);

    try {
      if (target.kind === "author") {
        await removeAuthorFromWordsPack(target.authorId);
        const updated = await getAllStoredPacks();
        setStored(updated);
        const wordsData = (updated.words as StoredOfflinePack<"words"> | undefined)?.data;
        const stillThere =
          updated.words?.authorIds?.includes(target.authorId) ||
          wordsData?.some((w) => w.created_by === target.authorId);
        if (stillThere) {
          setError(`@${target.username} paketi silinemedi. Tekrar dene.`);
        } else {
          setNotice(`@${target.username} paketi ve sesleri cihazdan silindi.`);
        }
      } else {
        await removeStoredPack("det");
        const updated = await getAllStoredPacks();
        setStored(updated);
        if (updated.det) {
          setError("Okuma paketi silinemedi. Tekrar dene.");
        } else {
          setNotice("Okuma paketi cihazdan silindi.");
        }
      }
    } catch {
      setError(
        target.kind === "author"
          ? `@${target.username} paketi silinirken bir hata oluştu.`
          : "Okuma paketi silinirken bir hata oluştu."
      );
    } finally {
      setBusyKey(null);
    }
  }

  const authors = useMemo(() => {
    const remote = manifest?.wordAuthors ?? [];
    let list =
      remote.length > 0
        ? remote
        : wordsPack?.data?.length
          ? groupWordsByAuthor(wordsPack.data)
          : [];
    // Offline mode: only packs already on this device — hide catalog / download bait.
    if (!online) {
      list = list.filter((a) => localAuthorIds.has(a.authorId));
    }
    return list;
  }, [manifest, wordsPack, online, localAuthorIds]);
  const allAuthorsBytes = useMemo(
    () =>
      authors.reduce((s, a) => {
        const remoteAudio = a.audioByteSize ?? a.estimatedAudioBytes ?? 0;
        const remote = a.byteSize + remoteAudio;
        if (localAuthorIds.has(a.authorId) && localAuthorBytes[a.authorId] != null) {
          return s + localAuthorBytes[a.authorId]!;
        }
        if (a.audioSizeMeasured && remoteAudio > 0) return s + remote;
        const remembered = rememberedAuthorBytes[a.authorId];
        if (remembered && remembered > remote) return s + remembered;
        return s + remote;
      }, 0),
    [authors, localAuthorBytes, localAuthorIds, rememberedAuthorBytes]
  );
  const wordsLocalBytes = wordsPack?.byteSize ?? 0;
  const busy = busyKey !== null;
  const activeProgress = progressLabel(progress);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const detRemote = manifest?.packs.det;
  const detBytes = detRemote?.byteSize ?? detPack?.byteSize ?? 0;
  const detSize = formatExactDataSize(detBytes);
  const detHasUpdate = Boolean(
    detPack &&
      detRemote &&
      (detPack.version !== detRemote.version ||
        detPack.itemCount !== detRemote.itemCount ||
        detPack.maxId !== detRemote.maxId)
  );

  return (
    <div className="space-y-6">
      <OfflinePracticeCta />

      <section className="rounded-3xl border border-mimo-border bg-mimo-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {!online && (
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#c2410c]">
                Çevrimdışı · sadece cihazdaki paketler
              </p>
            )}
            <h3 className="text-xl font-black text-mimo-title sm:text-2xl">
              Kelime paketleri
            </h3>
            <p className="mt-1 max-w-xl text-sm font-semibold text-mimo-muted">
              Paylaşılan kelimeleri sesleriyle indir; internet olmadan da çalış.
            </p>
            <p className="mt-2 text-xs font-bold text-mimo-muted">
              {loadingManifest && allAuthorsBytes === 0
                ? "Cihaz paketleri okunuyor…"
                : allAuthorsBytes > 0
                  ? `${formatMegabytes(allAuthorsBytes)} · ses dahil`
                  : remoteRefreshing
                    ? "Sunucu boyutları güncelleniyor…"
                    : "Boyut hazır"}
              {wordsLocalBytes > 0
                ? ` · cihazda ${formatMegabytes(wordsLocalBytes)}`
                : ""}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {online ? (
              <button
                type="button"
                data-online-only
                disabled={busy || authors.length === 0}
                onClick={() => void handleDownloadAllAuthors()}
                className="inline-flex items-center justify-center rounded-2xl bg-[#fd860a] px-5 py-3 text-sm font-black text-white shadow-[0_4px_0_#c2410c] transition hover:brightness-105 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyKey === "all-authors"
                  ? activeProgress || "Aktarılıyor…"
                  : `Tümünü indir (${formatMegabytes(allAuthorsBytes)})`}
              </button>
            ) : (
              <p className="rounded-2xl border border-[#fd860a]/30 bg-[#fff8f1] px-4 py-3 text-center text-xs font-extrabold text-[#c2410c] dark:bg-[#7c2d12]/30 dark:text-[#fdba74]">
                İndirme kapalı · sadece cihazdaki paketler
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs font-extrabold">
              {online ? (
                <button
                  type="button"
                  data-online-only
                  disabled={busy}
                  onClick={() => void loadLocalAndRemote(true)}
                  className="text-mimo-muted underline-offset-2 transition hover:text-[#1cb0f6] hover:underline disabled:opacity-50"
                >
                  Yenile
                </button>
              ) : null}
              {showOfflineWorkspaceLink && (
                <Link
                  href="/offline"
                  className="text-[#0369a1] underline-offset-2 transition hover:underline dark:text-[#7dd3fc]"
                >
                  Çevrimdışı alan →
                </Link>
              )}
            </div>
          </div>
        </div>

        {activeProgress && busy && (
          <div className="mt-4 rounded-2xl border border-[#1cb0f6]/30 bg-[#e8f6fe] px-4 py-2.5 text-sm font-extrabold text-[#0369a1] dark:bg-[#0c4a6e]/30 dark:text-[#7dd3fc]">
            {activeProgress}
          </div>
        )}
        {notice && (
          <div className="mt-4 rounded-2xl border border-[#58cc02]/40 bg-[#ecfce5] px-4 py-2.5 text-sm font-extrabold text-[#15803d] dark:bg-[#14532d]/30 dark:text-[#86efac]">
            {notice}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-2xl border border-[#ff4b4b]/40 bg-[#ffe8e8] px-4 py-2.5 text-sm font-extrabold text-[#b91c1c]">
            {error}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.14em] text-[#1cb0f6]">
              {online ? "Paylaşılan paketler" : "Cihazındaki paketler"}
            </h4>
            <p className="mt-0.5 text-xs font-bold text-mimo-muted">
              {loadingManifest
                ? "Cihazdaki paketler…"
                : authors.length === 0
                  ? online
                    ? remoteRefreshing
                      ? "Paketler getiriliyor…"
                      : "Henüz paylaşılan kelime paketi yok."
                    : "Bu cihazda indirilmiş kelime paketi yok."
                  : online
                    ? `${authors.length} kişinin paylaştığı paket`
                    : `${authors.length} paket hazır`}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {authors.map((author) => {
            const installed = localAuthorIds.has(author.authorId);
            const remoteAudio = author.audioByteSize ?? author.estimatedAudioBytes ?? 0;
            const remoteBytes = author.byteSize + remoteAudio;
            const remembered = rememberedAuthorBytes[author.authorId];
            // Prefer device exact → measured remote → last known (no 24KB fiction).
            const packBytes =
              installed && localAuthorBytes[author.authorId] != null
                ? localAuthorBytes[author.authorId]!
                : author.audioSizeMeasured && remoteAudio > 0
                  ? remoteBytes
                  : remembered && remembered > remoteBytes
                    ? remembered
                    : remoteBytes;
            const size = formatExactDataSize(packBytes);
            const localCount = wordsPack?.data?.filter((w) => w.created_by === author.authorId)
              .length;
            const hasUpdate =
              installed &&
              typeof localCount === "number" &&
              (localCount !== author.itemCount ||
                (wordsPack?.data
                  ?.filter((w) => w.created_by === author.authorId)
                  .reduce((m, w) => Math.max(m, w.id), 0) ?? 0) !== author.maxId);
            const thisBusy = busyKey === `author:${author.authorId}`;
            const messagingUnlocked = unlockedAuthorIds.has(author.authorId);

            return (
              <article
                key={author.authorId}
                className="flex flex-col justify-between rounded-3xl border border-[#1cb0f6]/20 bg-mimo-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <AuthorAvatar username={author.username} avatarUrl={author.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h5 className="truncate text-base font-black text-mimo-title">
                          @{author.username}
                        </h5>
                        <p className="mt-0.5 text-xs font-bold text-mimo-muted">
                          {author.itemCount} kelime · {author.audioUrlCount} sözlük sesi · TTS
                          yedekli
                        </p>
                      </div>
                      <span className="shrink-0 rounded-xl border border-mimo-border bg-mimo-surface px-2.5 py-1 text-xs font-black tabular-nums text-mimo-title">
                        {size.mbLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-mimo-border/70 pt-3">
                  {installed ? (
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#15803d] dark:text-[#86efac]">
                        {hasUpdate ? "✓ Cihazda" : "✓ Güncel"}
                        {wordsPack?.syncedAt ? ` · ${formatSyncDate(wordsPack.syncedAt)}` : ""}
                      </span>
                    </div>
                  ) : null}

                  {hasUpdate && (
                    <div className="rounded-xl bg-[#fff3e0] px-3 py-1.5 text-xs font-extrabold text-[#c2410c] dark:bg-[#7c2d12]/40 dark:text-[#fdba74]">
                      Yeni kelimeler mevcut
                    </div>
                  )}

                  {online ? (
                    <div className="flex items-center gap-2" data-online-only>
                      <button
                        type="button"
                        disabled={busy || (installed && !hasUpdate)}
                        onClick={() => void handleDownloadAuthor(author)}
                        className={`flex-1 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wide transition disabled:cursor-not-allowed ${
                          installed && !hasUpdate && !thisBusy
                            ? "border border-mimo-border bg-mimo-surface text-[#15803d] opacity-90 dark:text-[#86efac]"
                            : "bg-[#1cb0f6] text-white shadow-[0_3px_0_#1899d6] active:translate-y-0.5 active:shadow-none disabled:opacity-55"
                        }`}
                      >
                        {thisBusy
                          ? activeProgress || "İndiriliyor…"
                          : hasUpdate
                            ? `Güncelle (${size.mbLabel})`
                            : installed
                              ? "En güncel paket yüklü"
                              : `İndir + ses (${size.mbLabel})`}
                      </button>
                      {installed && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setPendingDelete({
                              kind: "author",
                              authorId: author.authorId,
                              username: author.username,
                              avatarUrl: author.avatarUrl,
                              wordCount: author.itemCount,
                              audioUrlCount: author.audioUrlCount,
                              mbLabel: size.mbLabel,
                            })
                          }
                          className="rounded-2xl border border-mimo-border bg-mimo-surface px-3.5 py-2.5 text-xs font-extrabold text-mimo-muted transition hover:text-[#b91c1c]"
                        >
                          {busyKey === `delete-author:${author.authorId}` ? "…" : "Sil"}
                        </button>
                      )}
                    </div>
                  ) : installed ? (
                    <OfflinePracticeLink
                      href="/quiz"
                      className="flex w-full items-center justify-center rounded-2xl bg-[#58cc02] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-[0_3px_0_#46a302]"
                    >
                      Çevrimdışı pratik →
                    </OfflinePracticeLink>
                  ) : null}

                  {online && installed ? (
                    messagingUnlocked ? (
                      <Link
                        href={`/messages/${author.authorId}`}
                        data-online-only
                        className="flex w-full items-center justify-center rounded-2xl border border-mimo-border bg-mimo-surface px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[#15803d] transition hover:border-[#58cc02]/45 dark:text-[#86efac]"
                      >
                        Mesajlar &amp; anılar
                      </Link>
                    ) : (
                      <button
                        type="button"
                        data-online-only
                        onClick={() => void openMemoriesModal(author)}
                        className="flex w-full items-center justify-center rounded-2xl border border-mimo-border bg-mimo-surface px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[#0369a1] transition hover:border-[#1cb0f6]/45 dark:text-[#7dd3fc]"
                      >
                        Anılarına git
                      </button>
                    )
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {(online || detPack) && (
      <section className="rounded-3xl border border-[#fd860a]/25 bg-mimo-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="rounded-full bg-[#fff3e0] px-2.5 py-1 text-[11px] font-black text-[#c2410c] dark:bg-[#7c2d12]/40 dark:text-[#fdba74]">
              Sınav pratiği
            </span>
            <h4 className="mt-2 text-lg font-black text-mimo-title">Okuma pasaj paketi</h4>
            <p className="mt-1 text-sm font-semibold text-mimo-muted">
              Boşluk doldurma pasajları — çevrimdışı okuma pratiği için.
            </p>
            <p className="mt-2 text-xs font-bold text-mimo-muted">
              {detRemote?.itemCount ?? detPack?.itemCount ?? 0} pasaj · {detSize.mbLabel}
              {detPack ? " · cihazda" : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {online ? (
              <button
                type="button"
                data-online-only
                disabled={busy || Boolean(detPack && !detHasUpdate)}
                onClick={() => void handleDownloadDet()}
                className={`rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wide transition disabled:cursor-not-allowed ${
                  detPack && !detHasUpdate && busyKey !== "det"
                    ? "border border-mimo-border bg-mimo-surface text-[#15803d] opacity-90 dark:text-[#86efac]"
                    : "bg-[#fd860a] text-white shadow-[0_3px_0_#c2410c] active:translate-y-0.5 active:shadow-none disabled:opacity-55"
                }`}
              >
                {busyKey === "det"
                  ? "İndiriliyor…"
                  : detHasUpdate
                    ? `Güncelle (${detSize.mbLabel})`
                    : detPack
                      ? "En güncel paket yüklü"
                      : `İndir (${detSize.mbLabel})`}
              </button>
            ) : detPack ? (
              <Link
                href="/det/read-complete"
                className="rounded-2xl bg-[#fd860a] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-[0_3px_0_#c2410c]"
              >
                Pasaj çöz →
              </Link>
            ) : null}
            {online && detPack && (
              <button
                type="button"
                data-online-only
                disabled={busy}
                onClick={() =>
                  setPendingDelete({
                    kind: "det",
                    passageCount: detPack.itemCount,
                    mbLabel: detSize.mbLabel,
                  })
                }
                className="rounded-2xl border border-mimo-border bg-mimo-surface px-3.5 py-2.5 text-xs font-extrabold text-mimo-muted transition hover:text-[#b91c1c]"
              >
                {busyKey === "delete-det" ? "…" : "Sil"}
              </button>
            )}
          </div>
        </div>
      </section>
      )}

      {memoriesModal && online ? (
        <div
          className="fixed inset-0 z-[520] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
          role="presentation"
          onClick={() => setMemoriesModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="memories-modal-title"
            className="w-full max-w-sm rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7c3aed]">
              Hazırlık anıları
            </p>
            <div className="mt-3 flex items-center gap-3">
              <AuthorAvatar
                username={memoriesModal.username}
                avatarUrl={memoriesModal.avatarUrl}
              />
              <div className="min-w-0">
                <h2
                  id="memories-modal-title"
                  className="truncate text-lg font-black text-mimo-title"
                >
                  @{memoriesModal.username}&apos;in anıları
                </h2>
                <p className="text-xs font-bold text-mimo-muted">
                  {memoriesModal.itemCount} kelime · paket sınavı ile açılır
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm font-semibold leading-relaxed text-mimo-muted">
              Bu paketi indirenler, yazarın belirlediği skorla sınavı geçince mesajlaşabilir ve
              hazırlık anısını okuyabilir. Geçme skoru en az %{modalPassFloor} olabilir.
            </p>

            <div className="mt-3 rounded-2xl border border-mimo-border bg-mimo-surface px-3 py-2.5">
              <p className="text-xs font-bold text-mimo-muted">Gerekli geçme skoru</p>
              <p className="mt-0.5 text-xl font-black tabular-nums text-mimo-title">
                %{modalBusy ? "…" : modalPassScore}
              </p>
            </div>

            {currentUserId === memoriesModal.authorId ? (
              <div className="mt-3 space-y-2 rounded-2xl border border-[#7c3aed]/25 bg-[#f5f3ff] p-3 dark:bg-[#4c1d95]/20">
                <p className="text-xs font-extrabold text-[#6d28d9] dark:text-[#c4b5fd]">
                  Senin paketın — geçme skorunu seç (min %{modalPassFloor})
                </p>
                <input
                  type="range"
                  min={modalPassFloor}
                  max={100}
                  step={5}
                  value={modalPassScore}
                  onChange={(e) => setModalPassScore(Number(e.target.value))}
                  className="w-full"
                />
                <button
                  type="button"
                  disabled={modalBusy}
                  onClick={() => void saveOwnPassScore()}
                  className="w-full rounded-xl bg-[#7c3aed] px-3 py-2.5 text-sm font-black text-white disabled:opacity-50"
                >
                  {modalBusy ? "Kaydediliyor…" : `Skoru kaydet (%${modalPassScore})`}
                </button>
              </div>
            ) : null}

            {modalNotice ? (
              <p className="mt-3 text-xs font-bold text-mimo-muted">{modalNotice}</p>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              {!currentUserId ? (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-[#1cb0f6] px-3 py-2.5 text-sm font-black text-white"
                >
                  Giriş yap
                </Link>
              ) : currentUserId === memoriesModal.authorId ? (
                <button
                  type="button"
                  onClick={() => setMemoriesModal(null)}
                  className="rounded-xl border border-mimo-border bg-mimo-surface px-3 py-2.5 text-sm font-extrabold text-mimo-fg"
                >
                  Tamam
                </button>
              ) : (
                <Link
                  href={`/pack/${memoriesModal.authorId}/quiz`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#7c3aed] px-3 py-2.5 text-sm font-black text-white"
                >
                  <span aria-hidden>📖</span>
                  Sınava başla →
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMemoriesModal(null)}
                className="rounded-xl border border-mimo-border bg-mimo-surface px-3 py-2.5 text-sm font-extrabold text-mimo-muted"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[520] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
          role="presentation"
          onClick={() => setPendingDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="offline-delete-title"
            className="w-full max-w-sm rounded-2xl border border-mimo-border bg-mimo-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#b91c1c]">
              Silmeyi onayla
            </p>

            {pendingDelete.kind === "author" ? (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-mimo-border bg-mimo-surface p-3">
                <AuthorAvatar
                  username={pendingDelete.username}
                  avatarUrl={pendingDelete.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <h2
                    id="offline-delete-title"
                    className="truncate text-lg font-black text-mimo-title"
                  >
                    @{pendingDelete.username}
                  </h2>
                  <p className="mt-0.5 text-xs font-bold text-mimo-muted">
                    {pendingDelete.wordCount} kelime · {pendingDelete.audioUrlCount} sözlük
                    sesi
                  </p>
                </div>
                <span className="shrink-0 rounded-xl border border-mimo-border bg-mimo-card px-2.5 py-1 text-xs font-black tabular-nums text-mimo-title">
                  {pendingDelete.mbLabel}
                </span>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-[#fd860a]/30 bg-mimo-surface p-3">
                <h2
                  id="offline-delete-title"
                  className="text-lg font-black text-mimo-title"
                >
                  Okuma pasaj paketi
                </h2>
                <p className="mt-0.5 text-xs font-bold text-mimo-muted">
                  {pendingDelete.passageCount} pasaj · {pendingDelete.mbLabel}
                </p>
              </div>
            )}

            <p className="mt-3 text-sm font-semibold text-mimo-muted">
              Paket cihazından silinir; sonra tekrar indirebilirsin. Onaylamak için kırmızı
              butona 3 sn basılı tut.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-xl border border-mimo-border bg-mimo-surface px-3 py-2.5 text-sm font-extrabold text-mimo-muted"
              >
                Vazgeç
              </button>
              <HoldToDeleteButton onConfirm={() => void confirmPendingDelete()} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
