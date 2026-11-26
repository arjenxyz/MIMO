/** Expo / Capacitor WebView sets this via applicationNameForUserAgent. */
export const NATIVE_APP_UA_MARKER = "MIMOApp";

export function isNativeAppUserAgent(ua?: string | null) {
  if (!ua) return false;
  return ua.includes(NATIVE_APP_UA_MARKER);
}

export function getClientUserAgent() {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}
