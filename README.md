# MIMO

Duolingo tarzı, SM-2 spaced repetition tabanlı oyunlaştırılmış İngilizce öğrenme platformu.

**Teknoloji:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth), Vercel.

## 1) Yerel kurulum

```bash
git clone https://github.com/arjenxyz/MIMO.git
cd MIMO
npm install
```

`.env.local` dosyasını oluştur ve Supabase değerlerini doldur:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Değerleri Supabase Dashboard > Project Settings > API içinden alırsın.

## 2) Veritabanı

1. [Supabase](https://supabase.com) üzerinde bir proje aç.
2. Authentication > Providers içinde Email girişinin açık olduğundan emin ol.
3. SQL Editor'e `schema.sql` içeriğini yapıştırıp çalıştır.
   - Tablolar, RLS politikaları, yeni kullanıcı trigger'ı ve başlangıç kelime/gramer/hikaye verisi gelir.

## 3) Geliştirme sunucusu

```bash
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) açılır. Giriş yoksa onboarding ekranı gelir.

## 4) Vercel deploy

1. Repoyu GitHub'a bağla (`arjenxyz/MIMO`).
2. [Vercel](https://vercel.com) > New Project > bu repoyu seç.
3. Environment Variables ekle:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy et.
5. Supabase Authentication > URL Configuration içine Vercel domainini ekle:
   - Site URL: `https://senin-projen.vercel.app`
   - Redirect URLs: `https://senin-projen.vercel.app/auth/callback`

## Modüller

- `/onboarding` — Mimo maskotu + DEVAM ET (Duolingo tarzı)
- `/register` ve `/login` — e-posta / şifre
- `/` — XP, level, streak, günlük görevler
- `/quiz` — kelime + dinleme (Web Speech API)
- `/quiz/grammar` — gramer SM-2
- `/reading` — hikaye okuma ve 3 soru
