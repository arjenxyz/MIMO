# MIMO

Duolingo tarzı, SM-2 spaced repetition tabanlı oyunlaştırılmış İngilizce öğrenme platformu.

**Teknoloji:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth), Vercel.

## 1) Yerel kurulum

```bash
git clone https://github.com/arjenxyz/MIMO.git
cd MIMO
npm install
```

`.env.local` dosyasını oluştur (şablon: `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
DISCORD_WEBHOOK_URL=
GEMINI_API_KEY=
NEXT_PUBLIC_DEMO_MODE=
```

- `DISCORD_WEBHOOK_URL` opsiyonel; giriş/sayfa hatalarını Discord’a bildirir.
- `GEMINI_API_KEY` opsiyonel ama DET cloze üretimi, gramer generate ve foto pratiği için gerekir.
- `NEXT_PUBLIC_DEMO_MODE=true` → örnek veri + auth atlanır (yerel önizleme). Gerçek hesap testi için boş/`false` bırak.
- Vercel’e aynı env’leri ekle.

### Hızlı demo (Supabase olmadan)

```bash
cp .env.example .env.local
# .env.local içinde: NEXT_PUBLIC_DEMO_MODE=true
npm run dev
```

## 2) Veritabanı + OAuth

1. [Supabase](https://supabase.com) üzerinde bir proje aç.
2. SQL Editor'de önce `schema.sql`, sonra ihtiyaç duyulan ek şemaları sırayla çalıştır:
   - `schema-profile-setup.sql`, `schema-words-visibility.sql`, `schema-add-user-words.sql`
   - `schema-friends.sql`, `schema-challenges.sql`, `schema-det.sql`
   - `schema-grammar-topics.sql`, `schema-grammar-curriculum-seed.sql`
   - `schema-fix-community-autoassign.sql`, `schema-keepalive.sql`
3. Authentication > Providers içinde şunları aç (ücretsiz):
   - **Google** (ana giriş)
   - **Discord**, **GitHub**, **LinkedIn (OIDC)** (Diğer seçenekler modalı)
4. Apple şu an UI'da "Geçerli değil" olarak pasif; provider açmana gerek yok.
5. Her aktif provider için Redirect URL:
   - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
6. Site URL ve app redirect:
   - Local: `http://localhost:3000/auth/callback`
   - Prod: `https://senin-projen.vercel.app/auth/callback`

Giriş ekranı: Google + pasif Apple + "Diğer seçenekler" (Discord / GitHub / LinkedIn).

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

- `/onboarding` — turuncu “Merhaba!” ekranı + Mimo görseli
- `/login` — Google + pasif Apple + Diğer seçenekler modalı (Discord / GitHub / LinkedIn)
- `/` — learning path, streak, günlük görevler
- `/quiz` — kelime + dinleme (Web Speech API)
- `/quiz/grammar` — gramer SM-2
- `/quiz/match`, `/quiz/word-check` — eşleştirme / gerçek kelime kontrolü
- `/grammar`, `/grammar/[slug]` — gramer kataloğu ve drill
- `/reading` — hikaye okuma ve 3 soru
- `/det/read-complete`, `/det/listen-type` — DET tarzı cloze / dinle-yaz
- `/friends`, `/challenge/[id]` — arkadaşlar ve meydan okuma
- `/photo-practice` — foto ile pratik (Gemini)
- `/words/add`, `/settings`, `/about`, `/status`
