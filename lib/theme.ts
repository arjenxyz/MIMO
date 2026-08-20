export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "mimo-theme";

export function getStoredTheme(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    // ignore
  }
  return null;
}

export function resolveTheme(stored: ThemeMode | null): ThemeMode {
  if (stored) return stored;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("mimo-theme", { detail: mode }));
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = document.documentElement.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
  return next;
}

/** Inline boot script — prevents light flash before React hydrates. */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',dark);r.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;
