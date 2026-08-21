"use client";

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChallengeInviteModal } from "@/app/components/ChallengeInviteModal";
import { DEMO_FRIENDS } from "@/lib/demo";
import type { ChallengeRow, FriendProfile, FriendshipRow } from "@/types";

type Tab = "friends" | "requests" | "add";

function InitialAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#fd860a] font-black text-[#2a1600] ring-2 ring-mimo-soft"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function PersonRow({
  name,
  streak,
  trailing,
}: {
  name: string;
  streak?: number;
  trailing: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <InitialAvatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-mimo-title">{name}</p>
        {typeof streak === "number" && (
          <p className="text-xs font-bold text-mimo-muted">{streak} gün seri</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{trailing}</div>
    </li>
  );
}

function moduleLabel(module: ChallengeRow["module"]) {
  return module === "match" ? "Hızlı eşleştir" : "Yazım doğru mu?";
}

export function FriendsPanel({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendshipRow[]>([]);
  const [incoming, setIncoming] = useState<FriendshipRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendshipRow[]>([]);
  const [challengeIncoming, setChallengeIncoming] = useState<ChallengeRow[]>([]);
  const [challengeOutgoing, setChallengeOutgoing] = useState<ChallengeRow[]>([]);
  const [challengeActive, setChallengeActive] = useState<ChallengeRow[]>([]);
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteFriend, setInviteFriend] = useState<FriendProfile | null>(null);

  const loadChallenges = useCallback(async () => {
    if (demo) {
      setChallengeIncoming([]);
      setChallengeOutgoing([]);
      setChallengeActive([]);
      return;
    }
    try {
      const res = await fetch("/api/challenges");
      const data = (await res.json()) as {
        incoming?: ChallengeRow[];
        outgoing?: ChallengeRow[];
        active?: ChallengeRow[];
        error?: string;
      };
      if (!res.ok) {
        // Table may not exist yet — don't block friends UI.
        if (res.status === 503) return;
        throw new Error(data.error || "Meydan okumalar alınamadı");
      }
      setChallengeIncoming(data.incoming ?? []);
      setChallengeOutgoing(data.outgoing ?? []);
      setChallengeActive(data.active ?? []);
    } catch {
      // ignore soft failures
    }
  }, [demo]);

  const load = useCallback(async () => {
    if (demo) {
      setFriends(DEMO_FRIENDS.friends.map((r) => ({ ...r })));
      setIncoming(DEMO_FRIENDS.incoming.map((r) => ({ ...r })));
      setOutgoing(DEMO_FRIENDS.outgoing.map((r) => ({ ...r })));
      setLoading(false);
      setError("");
      void loadChallenges();
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/friends");
      const data = (await res.json()) as {
        friends?: FriendshipRow[];
        incoming?: FriendshipRow[];
        outgoing?: FriendshipRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Liste alınamadı");
      setFriends(data.friends ?? []);
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
      await loadChallenges();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [demo, loadChallenges]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAction(body: Record<string, unknown>) {
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error || "İşlem başarısız");
  }

  async function challengeAction(action: "accept" | "decline" | "cancel", challengeId: number) {
    setBusyId(`c-${challengeId}`);
    setError("");
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, challengeId }),
      });
      const data = (await res.json()) as { challenge?: ChallengeRow; error?: string };
      if (!res.ok || !data.challenge) throw new Error(data.error || "İşlem başarısız");
      if (action === "accept") {
        router.push(`/challenge/${data.challenge.id}`);
        return;
      }
      await loadChallenges();
      setNotice(action === "cancel" ? "Davet iptal edildi." : "Davet reddedildi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("En az 2 karakter yaz.");
      return;
    }
    setBusyId("search");
    setError("");
    setNotice("");
    try {
      if (demo) {
        const known = new Set([
          ...friends.map((r) => r.other?.id),
          ...incoming.map((r) => r.other?.id),
          ...outgoing.map((r) => r.other?.id),
        ]);
        const hits = DEMO_FRIENDS.searchPool.filter(
          (p) =>
            !known.has(p.id) && p.username.toLowerCase().includes(q.toLowerCase())
        );
        setResults(hits);
        setNotice(hits.length === 0 ? "Eşleşen kullanıcı bulunamadı." : "");
        return;
      }
      const res = await fetch(`/api/friends?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results?: FriendProfile[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Arama başarısız");
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) {
        setNotice("Eşleşen kullanıcı bulunamadı.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Arama başarısız");
    } finally {
      setBusyId(null);
    }
  }

  async function requestFriend(id: string) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      if (demo) {
        const person =
          results.find((p) => p.id === id) ??
          DEMO_FRIENDS.searchPool.find((p) => p.id === id);
        if (person) {
          setOutgoing((prev) => [
            {
              id: Date.now(),
              requester_id: "demo-me",
              addressee_id: person.id,
              status: "pending",
              created_at: new Date().toISOString(),
              requester: null,
              addressee: person,
              other: person,
              direction: "outgoing",
            },
            ...prev,
          ]);
        }
        setResults((prev) => prev.filter((p) => p.id !== id));
        setNotice("İstek gönderildi. (Demo)");
        setTab("requests");
        return;
      }
      await postAction({ action: "request", addresseeId: id });
      setNotice("İstek gönderildi.");
      setResults((prev) => prev.filter((p) => p.id !== id));
      await load();
      setTab("requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "İstek gönderilemedi");
    } finally {
      setBusyId(null);
    }
  }

  async function respond(id: number, action: "accept" | "reject") {
    setBusyId(id);
    setError("");
    try {
      if (demo) {
        const row = incoming.find((r) => r.id === id);
        setIncoming((prev) => prev.filter((r) => r.id !== id));
        if (action === "accept" && row) {
          setFriends((prev) => [{ ...row, status: "accepted" }, ...prev]);
          setTab("friends");
        }
        return;
      }
      await postAction({ action, friendshipId: id });
      await load();
      if (action === "accept") setTab("friends");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yanıtlanamadı");
    } finally {
      setBusyId(null);
    }
  }

  async function removeRow(id: number, kind: "cancel" | "remove") {
    setBusyId(id);
    setError("");
    try {
      if (demo) {
        if (kind === "remove") setFriends((prev) => prev.filter((r) => r.id !== id));
        else setOutgoing((prev) => prev.filter((r) => r.id !== id));
        return;
      }
      await postAction({ action: kind, friendshipId: id });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi");
    } finally {
      setBusyId(null);
    }
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "friends", label: "Arkadaşlar", badge: friends.length },
    {
      id: "requests",
      label: "İstekler",
      badge: incoming.length + outgoing.length,
    },
    { id: "add", label: "Ekle" },
  ];

  return (
    <div className="space-y-4">
      {demo ? (
        <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-center text-xs font-extrabold text-[#a16207]">
          Demo — örnek arkadaş listesi (Berk / Selin ara)
        </p>
      ) : null}
      <div
        role="tablist"
        aria-label="Arkadaş sekmeleri"
        className="grid grid-cols-3 gap-1 rounded-xl border border-mimo-soft bg-mimo-surface p-1"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-2 py-2 text-center text-xs font-extrabold transition ${
              tab === t.id
                ? "bg-[#fff3e0] text-[#c2410c] shadow-sm ring-1 ring-[#fd860a]/40 dark:bg-[#3a2208] dark:text-[#fdba74]"
                : "text-mimo-muted hover:text-mimo-fg"
            }`}
          >
            {t.label}
            {typeof t.badge === "number" && t.badge > 0 ? (
              <span className="ml-1 tabular-nums text-[#fd860a]">({t.badge})</span>
            ) : null}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-[#fecaca] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#b91c1c]">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-[#bbf7d0] bg-[#ecfce5] px-3 py-2 text-sm font-bold text-[#15803d]">
          {notice}
        </p>
      )}

      {!loading &&
        (challengeIncoming.length > 0 ||
          challengeOutgoing.length > 0 ||
          challengeActive.length > 0) && (
          <section className="rounded-2xl border border-[#fd860a]/35 bg-[#fff7ed] px-3 py-3 dark:bg-[#3a2208]/40">
            <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-[#fd860a]">
              Meydan okumalar
            </h3>
            <ul className="mt-1 divide-y divide-[#fed7aa]/60">
              {challengeActive.map((c) => {
                const label = `${c.challenger?.username ?? "?"} vs ${c.opponent?.username ?? "?"}`;
                return (
                  <li key={`a-${c.id}`} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-mimo-title">{label}</p>
                      <p className="text-[11px] font-bold text-mimo-muted">
                        Aktif · {moduleLabel(c.module)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/challenge/${c.id}`)}
                      className="shrink-0 rounded-xl bg-[#fd860a] px-2.5 py-1.5 text-[11px] font-black text-[#2a1600]"
                    >
                      Arenaya git
                    </button>
                  </li>
                );
              })}
              {challengeIncoming.map((c) => (
                <li key={`i-${c.id}`} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-mimo-title">
                      {c.challenger?.username ?? "Öğrenci"}
                    </p>
                    <p className="text-[11px] font-bold text-mimo-muted">
                      Gelen · {moduleLabel(c.module)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      disabled={busyId === `c-${c.id}`}
                      onClick={() => void challengeAction("accept", c.id)}
                      className="rounded-xl bg-[#58cc02] px-2.5 py-1.5 text-[11px] font-black text-[#14260a] disabled:opacity-50"
                    >
                      Kabul
                    </button>
                    <button
                      type="button"
                      disabled={busyId === `c-${c.id}`}
                      onClick={() => void challengeAction("decline", c.id)}
                      className="rounded-xl border border-mimo-soft px-2.5 py-1.5 text-[11px] font-extrabold text-mimo-muted disabled:opacity-50"
                    >
                      Red
                    </button>
                  </div>
                </li>
              ))}
              {challengeOutgoing.map((c) => (
                <li key={`o-${c.id}`} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-mimo-title">
                      {c.opponent?.username ?? "Öğrenci"}
                    </p>
                    <p className="text-[11px] font-bold text-mimo-muted">
                      Bekliyor · {moduleLabel(c.module)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => router.push(`/challenge/${c.id}`)}
                      className="rounded-xl border border-mimo-soft px-2.5 py-1.5 text-[11px] font-extrabold text-mimo-fg"
                    >
                      Aç
                    </button>
                    <button
                      type="button"
                      disabled={busyId === `c-${c.id}`}
                      onClick={() => void challengeAction("cancel", c.id)}
                      className="rounded-xl border border-mimo-soft px-2.5 py-1.5 text-[11px] font-extrabold text-[#b91c1c] disabled:opacity-50"
                    >
                      İptal
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

      {loading ? (
        <p className="py-8 text-center text-sm font-bold text-mimo-muted">Yükleniyor…</p>
      ) : tab === "friends" ? (
        friends.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mimo-soft bg-mimo-surface px-4 py-8 text-center">
            <p className="text-sm font-extrabold text-mimo-title">Henüz arkadaş yok</p>
            <p className="mt-1 text-xs font-semibold text-mimo-muted">
              Ekle sekmesinden kullanıcı adı ile istek gönder.
            </p>
            <button
              type="button"
              onClick={() => setTab("add")}
              className="mt-4 rounded-2xl bg-[#fd860a] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[#2a1600] shadow-[0_3px_0_#c2410c]"
            >
              Arkadaş ekle
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-mimo-soft">
            {friends.map((row) => {
              const name = row.other?.username ?? "Öğrenci";
              const friend = row.other;
              return (
                <PersonRow
                  key={row.id}
                  name={name}
                  streak={row.other?.daily_streak}
                  trailing={
                    <>
                      {friend ? (
                        <button
                          type="button"
                          onClick={() => setInviteFriend(friend)}
                          className="rounded-xl bg-[#1cb0f6] px-2.5 py-1.5 text-[11px] font-black text-white shadow-[0_2px_0_#1899d6]"
                        >
                          Meydan oku
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void removeRow(row.id, "remove")}
                        className="rounded-xl border border-mimo-soft px-2.5 py-1.5 text-[11px] font-extrabold text-[#b91c1c] disabled:opacity-50"
                      >
                        Kaldır
                      </button>
                    </>
                  }
                />
              );
            })}
          </ul>
        )
      ) : tab === "requests" ? (
        incoming.length === 0 && outgoing.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
            <p className="text-base font-extrabold text-mimo-title">Burada görülecek bir şey yok</p>
            <p className="mt-1.5 max-w-xs text-sm font-semibold text-mimo-muted">
              Şu an bekleyen arkadaşlık isteğin bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {incoming.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-[#fd860a]">
                  Gelen istekler
                </h3>
                <ul className="mt-1 divide-y divide-mimo-soft">
                  {incoming.map((row) => {
                    const name = row.other?.username ?? "Öğrenci";
                    return (
                      <PersonRow
                        key={row.id}
                        name={name}
                        streak={row.other?.daily_streak}
                        trailing={
                          <>
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => void respond(row.id, "accept")}
                              className="rounded-xl bg-[#58cc02] px-2.5 py-1.5 text-[11px] font-black text-[#14260a] disabled:opacity-50"
                            >
                              Onayla
                            </button>
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => void respond(row.id, "reject")}
                              className="rounded-xl border border-mimo-soft px-2.5 py-1.5 text-[11px] font-extrabold text-mimo-muted disabled:opacity-50"
                            >
                              Reddet
                            </button>
                          </>
                        }
                      />
                    );
                  })}
                </ul>
              </section>
            )}

            {outgoing.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-mimo-muted">
                  Giden istekler
                </h3>
                <ul className="mt-1 divide-y divide-mimo-soft">
                  {outgoing.map((row) => {
                    const name = row.other?.username ?? "Öğrenci";
                    return (
                      <PersonRow
                        key={row.id}
                        name={name}
                        streak={row.other?.daily_streak}
                        trailing={
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void removeRow(row.id, "cancel")}
                            className="rounded-xl border border-mimo-soft px-2.5 py-1.5 text-[11px] font-extrabold text-mimo-muted disabled:opacity-50"
                          >
                            İptal
                          </button>
                        }
                      />
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <form onSubmit={(e) => void onSearch(e)} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kullanıcı adı ara…"
              className="min-w-0 flex-1 rounded-xl border border-mimo-soft bg-mimo-surface px-3 py-2.5 text-sm font-bold text-mimo-fg outline-none focus:border-[#1cb0f6]"
            />
            <button
              type="submit"
              disabled={busyId === "search"}
              className="shrink-0 rounded-xl bg-[#fd860a] px-4 py-2.5 text-sm font-black text-[#2a1600] disabled:opacity-50"
            >
              Ara
            </button>
          </form>
          <p className="text-xs font-semibold text-mimo-muted">
            Kullanıcı adının bir kısmını yaz; istek gönderdiğinde karşı taraf onaylar.
          </p>
          <ul className="divide-y divide-mimo-soft">
            {results.map((person) => (
              <PersonRow
                key={person.id}
                name={person.username}
                streak={person.daily_streak}
                trailing={
                  <button
                    type="button"
                    disabled={busyId === person.id}
                    onClick={() => void requestFriend(person.id)}
                    className="rounded-xl bg-[#58cc02] px-2.5 py-1.5 text-[11px] font-black text-[#14260a] disabled:opacity-50"
                  >
                    İstek gönder
                  </button>
                }
              />
            ))}
          </ul>
        </div>
      )}

      {inviteFriend ? (
        <ChallengeInviteModal
          friend={inviteFriend}
          demo={demo}
          onClose={() => setInviteFriend(null)}
        />
      ) : null}
    </div>
  );
}
