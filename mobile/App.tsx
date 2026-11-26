import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { WebView } from "react-native-webview";

SplashScreen.preventAutoHideAsync().catch(() => {
  // already hidden
});

/** Production MIMO site — homepage is APK-aware (hides PWA install noise). */
const APP_URL = "https://mimo-olive.vercel.app/";

type NavState = { canGoBack?: boolean };

export default function App() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onReady = useCallback(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  if (error) {
    return (
      <View style={styles.centered}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>Bağlantı sorunu</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable
          style={styles.retry}
          onPress={() => {
            setError(null);
            setLoading(true);
            webRef.current?.reload();
          }}
        >
          <Text style={styles.retryText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={onReady}>
      <StatusBar style="dark" />
      {loading ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color="#1cb0f6" />
          <Text style={styles.loaderText}>MIMO açılıyor…</Text>
        </View>
      ) : null}
      {/* RN 0.88 + webview typings are incomplete in Expo 58; runtime props are valid. */}
      <WebView
        ref={webRef as never}
        source={{ uri: APP_URL } as never}
        style={styles.webview as never}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(nav: NavState) => {
          setCanGoBack(Boolean(nav.canGoBack));
        }}
        onError={(event: { nativeEvent?: { description?: string } }) => {
          setLoading(false);
          setError(event.nativeEvent?.description || "Sayfa yüklenemedi.");
        }}
        onHttpError={(event: { nativeEvent?: { statusCode?: number } }) => {
          const code = event.nativeEvent?.statusCode ?? 0;
          if (code >= 500) setError(`Sunucu hatası (${code})`);
        }}
        {...({
          allowsBackForwardNavigationGestures: true,
          domStorageEnabled: true,
          javaScriptEnabled: true,
          sharedCookiesEnabled: true,
          thirdPartyCookiesEnabled: true,
          setSupportMultipleWindows: false,
          startInLoadingState: false,
          applicationNameForUserAgent: "MIMOApp/1.0",
        } as object)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff8f1",
    paddingTop: Platform.OS === "android" ? 28 : 0,
  },
  webview: {
    flex: 1,
    backgroundColor: "#fff8f1",
  },
  loader: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff8f1",
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748b",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff8f1",
    padding: 24,
    gap: 10,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
  },
  errorBody: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },
  retry: {
    marginTop: 8,
    backgroundColor: "#1cb0f6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryText: {
    color: "#fff",
    fontWeight: "900",
  },
});
