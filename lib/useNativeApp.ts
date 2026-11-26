"use client";

import { useEffect, useState } from "react";
import { getClientUserAgent, isNativeAppUserAgent } from "@/lib/nativeApp";

/** True inside the Expo/APK WebView shell (MIMOApp UA). */
export function useNativeApp() {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeAppUserAgent(getClientUserAgent()));
  }, []);

  return native;
}
