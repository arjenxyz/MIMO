export type AppLanguage = "tr" | "hu";

const KEY = "mimo-app-language";

export const APP_LANGUAGES: { id: AppLanguage; labelTr: string; labelHu: string }[] = [
  { id: "tr", labelTr: "Türkçe", labelHu: "Török" },
  { id: "hu", labelTr: "Macarca", labelHu: "Magyar" },
];

export function getAppLanguage(): AppLanguage {
  if (typeof window === "undefined") return "tr";
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "hu" || raw === "tr") return raw;
    return "tr";
  } catch {
    return "tr";
  }
}

export function setAppLanguage(lang: AppLanguage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, lang);
    window.dispatchEvent(new Event("app-language-changed"));
  } catch {
    // ignore
  }
}

export function languageLabel(lang: AppLanguage, ui: AppLanguage = lang) {
  const row = APP_LANGUAGES.find((l) => l.id === lang);
  if (!row) return lang;
  return ui === "hu" ? row.labelHu : row.labelTr;
}
