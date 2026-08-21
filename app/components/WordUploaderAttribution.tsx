"use client";

import { useEffect, useState } from "react";
import type { Word } from "@/types";

export type UploaderProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  sampleWord: string;
};

export function profileFromWord(word: Word): UploaderProfile | null {
  if (!word.is_global || !word.created_by) return null;
  return {
    id: word.created_by,
    name: word.uploader_username?.trim() || "Bir kullanıcı",
    avatarUrl: word.uploader_avatar_url ?? null,
    sampleWord: word.english,
  };
}

export function UploaderBadge({
  word,
  onOpen,
  className = "",
  centered = false,
  overlay = false,
}: {
  word: Word;
  onOpen: (profile: UploaderProfile) => void;
  className?: string;
  centered?: boolean;
  /** Compact pill for photo corners (e.g. quiz). */
  overlay?: boolean;
}) {
  const profile = profileFromWord(word);
  if (!profile) return null;
  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onOpen(profile)}
      className={`flex max-w-[min(100%,11rem)] items-center gap-1.5 text-left transition ${
        overlay
          ? "rounded-full bg-black/45 py-1 pl-1 pr-2.5 text-white backdrop-blur-sm hover:bg-black/55"
          : `rounded-full py-0.5 pr-1 hover:bg-mimo-surface ${centered ? "mx-auto" : ""}`
      } ${className}`}
      aria-label={`${profile.name} profilini aç`}
    >
      <span
        className={`relative flex shrink-0 overflow-hidden rounded-full bg-[#fd860a] ${
          overlay ? "h-6 w-6 ring-1 ring-white/40" : "h-5 w-5 ring-1 ring-mimo-soft"
        }`}
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center font-black text-[#2a1600] ${
              overlay ? "text-[10px]" : "text-[9px]"
            }`}
          >
            {initial}
          </span>
        )}
      </span>
      <span
        className={`truncate font-bold underline-offset-2 hover:underline ${
          overlay ? "text-[11px] text-white" : "text-[11px] text-mimo-muted"
        }`}
      >
        {profile.name}
      </span>
    </button>
  );
}

export function UploaderProfileCard({
  profile,
  onClose,
}: {
  profile: UploaderProfile;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[310] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="uploader-profile-title"
        className="w-full max-w-sm rounded-2xl border border-mimo-border bg-mimo-card p-6 text-center shadow-xl"
      >
        <div className="mx-auto flex h-20 w-20 overflow-hidden rounded-full bg-[#fd860a] ring-4 ring-[#fff3e0] dark:ring-[#3a2208]">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl font-black text-[#2a1600]">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <h3 id="uploader-profile-title" className="mt-4 text-xl font-black text-mimo-title">
          {profile.name}
        </h3>
        <p className="mt-1 text-sm font-bold text-mimo-muted">MIMO öğrencisi</p>
        <p className="mt-4 rounded-xl bg-mimo-surface px-3 py-2.5 text-sm font-semibold text-mimo-fg">
          Bu kullanıcı{" "}
          <span className="font-black text-[#7c3aed]">{profile.sampleWord}</span> kelimesini
          global sisteme yükledi.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border border-mimo-border bg-mimo-surface py-3 text-sm font-extrabold text-mimo-fg"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}

/** Badge + profile modal for a single word context (e.g. quiz). */
export function WordUploaderAttribution({
  word,
  overlay = false,
  className = "",
}: {
  word: Word;
  overlay?: boolean;
  className?: string;
}) {
  const [profile, setProfile] = useState<UploaderProfile | null>(null);
  if (!profileFromWord(word) && !profile) return null;

  return (
    <>
      <UploaderBadge
        word={word}
        onOpen={setProfile}
        overlay={overlay}
        centered={!overlay}
        className={className || (overlay ? "" : "mt-2")}
      />
      {profile && (
        <UploaderProfileCard profile={profile} onClose={() => setProfile(null)} />
      )}
    </>
  );
}
