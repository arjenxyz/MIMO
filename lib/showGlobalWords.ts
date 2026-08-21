const KEY = "mimo-show-global-words";

/** Default on: users can see community/global words unless they turn it off. */
export function isShowGlobalWords(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function setShowGlobalWords(show: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, show ? "1" : "0");
    window.dispatchEvent(new Event("show-global-words-changed"));
  } catch {
    // ignore
  }
}
