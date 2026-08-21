"use client";

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import type { FriendProfile, FriendshipRow } from "@/types";

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

export function FriendsPanel({ demo }: { demo: boolean }) {
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendshipRow[]>([]);
  const [incoming, setIncoming] = useState<FriendshipRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendshipRow[]>([]);
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (demo) {
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
      setLoading(false);
      setError("");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [demo]);

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

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (demo) {
      setNotice("Demo modunda arkadaş araması kapalı. Canlıda giriş yap.");
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setError("En az 2 karakter yaz.");
      return;
    }
    setBusyId("search");
    setError("");
    setNotice("");
    try {
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
    if (demo) return;
    setBusyId(id);
    setError("");
    setNotice("");
    try {
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
                ? "bg-mimo-card text-mimo-title shadow-sm ring-1 ring-mimo-border"
                : "text-mimo-muted hover:text-mimo-fg"
            }`}
          >
            {t.label}
            {typeof t.badge === "number" && t.badge > 0 ? (
              <span className="ml-1 tabular-nums text-[#1cb0f6]">({t.badge})</span>
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
              className="mt-4 rounded-2xl bg-[#1cb0f6] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white"
            >
              Arkadaş ekle
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-mimo-soft">
            {friends.map((row) => {
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
                      onClick={() => void removeRow(row.id, "remove")}
                      className="rounded-xl border border-mimo-soft px-2.5 py-1.5 text-[11px] font-extrabold text-[#b91c1c] disabled:opacity-50"
                    >
                      Kaldır
                    </button>
                  }
                />
              );
            })}
          </ul>
        )
      ) : tab === "requests" ? (
        <div className="space-y-5">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1cb0f6]">
              Gelen istekler
            </h3>
            {incoming.length === 0 ? (
              <p className="mt-2 text-sm font-semibold text-mimo-muted">Bekleyen gelen istek yok.</p>
            ) : (
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
            )}
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-mimo-muted">
              Giden istekler
            </h3>
            {outgoing.length === 0 ? (
              <p className="mt-2 text-sm font-semibold text-mimo-muted">Bekleyen giden istek yok.</p>
            ) : (
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
            )}
          </section>
        </div>
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
              className="shrink-0 rounded-xl bg-[#1cb0f6] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
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
    </div>
  );
}
