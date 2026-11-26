"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MESSAGE_MAX_LENGTH } from "@/lib/messages";

type Msg = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

type Legacy = {
  title: string;
  body: string;
  period_label: string | null;
} | null;

export default function MessageThreadPage() {
  const params = useParams();
  const otherId = typeof params.userId === "string" ? params.userId : "";
  const [me, setMe] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("öğrenci");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [legacy, setLegacy] = useState<Legacy>(null);
  const [legacyLocked, setLegacyLocked] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!otherId) return;
    setLoading(true);
    setError(null);
    try {
      const [msgRes, legacyRes] = await Promise.all([
        fetch(`/api/messages?with=${encodeURIComponent(otherId)}`, { cache: "no-store" }),
        fetch(`/api/legacy?authorId=${encodeURIComponent(otherId)}`, { cache: "no-store" }),
      ]);

      const msgData = await msgRes.json();
      if (!msgRes.ok) throw new Error(msgData.error || "Sohbet açılamadı");
      setMe(msgData.me ?? null);
      setMessages(msgData.messages ?? []);
      setOtherName(msgData.other?.username || "öğrenci");

      if (legacyRes.status === 403) {
        setLegacyLocked(true);
        setLegacy(null);
      } else if (legacyRes.ok) {
        const legacyData = await legacyRes.json();
        setLegacy(legacyData.legacy ?? null);
        setLegacyLocked(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sohbet açılamadı");
    } finally {
      setLoading(false);
    }
  }, [otherId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: otherId, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gönderilemedi");
      setText("");
      setMessages((prev) => [...prev, data.message]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-mimo-bg text-mimo-fg">
      <header className="sticky top-0 z-40 border-b border-mimo-border bg-mimo-nav/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-mimo-title">@{otherName}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-mimo-muted">
              Paket kilidi açık
            </p>
          </div>
          <Link
            href="/messages"
            className="rounded-xl border border-mimo-border bg-mimo-surface px-3 py-1.5 text-xs font-extrabold text-mimo-fg"
          >
            Liste
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        {legacy && !legacyLocked ? (
          <section className="mb-4 rounded-3xl border border-[#58cc02]/30 bg-mimo-card p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#58cc02]">
              Hazırlık anısı
              {legacy.period_label ? ` · ${legacy.period_label}` : ""}
            </p>
            <h2 className="mt-1 text-base font-black text-mimo-title">{legacy.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-mimo-muted">
              {legacy.body}
            </p>
          </section>
        ) : null}

        {loading ? (
          <p className="text-sm font-bold text-mimo-muted">Yükleniyor…</p>
        ) : null}
        {error ? (
          <p className="mb-3 rounded-2xl border border-[#ff4b4b]/30 bg-[#ffe8e8] px-4 py-3 text-sm font-bold text-[#b91c1c]">
            {error}
            {/sınav|kilit/i.test(error) ? (
              <>
                {" "}
                <Link
                  href={`/pack/${otherId}/quiz`}
                  className="underline"
                >
                  Sınava git
                </Link>
              </>
            ) : null}
          </p>
        ) : null}

        <div className="flex-1 space-y-2 overflow-y-auto pb-4">
          {messages.map((m) => {
            const mine = me && m.sender_id === me;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm font-semibold ${
                    mine
                      ? "bg-[#1cb0f6] text-white"
                      : "border border-mimo-border bg-mimo-card text-mimo-fg"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          className="sticky bottom-0 flex gap-2 border-t border-mimo-border bg-mimo-bg pb-3 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MESSAGE_MAX_LENGTH))}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder="Mesaj yaz…"
            className="min-w-0 flex-1 rounded-2xl border border-mimo-border bg-mimo-card px-3.5 py-3 text-sm font-semibold text-mimo-fg outline-none focus:border-[#1cb0f6]"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-2xl bg-[#58cc02] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {sending ? "…" : "Gönder"}
          </button>
        </form>
      </div>
    </main>
  );
}
