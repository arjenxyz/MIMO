# MIMO Android (Expo WebView)

Next.js sitesini APK’ya çevirmez — Expo içinde **WebView** ile `https://mimo-olive.vercel.app` açar. EAS ile gerçek `.apk` üretirsin.

## APK al (bir kez)

```bash
cd mobile
npm install
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build -p android --profile preview
```

Bitince Expo sayfasındaki `.apk` linkini telefona indirip kur.

## Yerel deneme

```bash
cd mobile
npx expo start
```

Expo Go ile QR okut (tam native WebView için yine EAS build daha doğru).

## Notlar

- Site URL’si: `App.tsx` içindeki `APP_URL`
- İkonlar: `assets/` (web `public/icons` kopyası)
- Bu kabuk internet ister; çevrimdışı paketler site/PWA tarafında kalır
