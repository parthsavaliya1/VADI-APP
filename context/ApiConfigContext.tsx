import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  DEFAULT_API_BASE_URL,
  getApiBaseURL,
  setApiBaseURL,
} from "@/utils/api";

/** Backend reads this Remote Config key (Firebase Console). */
export const REMOTE_CONFIG_API_BASE_URL_KEY = "api_base_url";

type ApiConfigContextValue = {
  apiConfigReady: boolean;
  refreshApiBaseUrlFromRemote: () => Promise<void>;
};

const ApiConfigContext = createContext<ApiConfigContextValue | null>(null);

function getBootstrapBaseUrl(): string {
  return DEFAULT_API_BASE_URL.replace(/\/+$/, "");
}

async function fetchApiBaseUrlFromBackend(): Promise<string | null> {
  const base = getBootstrapBaseUrl();
  const url = `${base}/app-config`;

  const ctrl = new AbortController();
  const timeoutMs = 12_000;
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn("[ApiConfig] GET /app-config failed:", res.status, url);
      return null;
    }
    const data = (await res.json()) as { success?: boolean; apiBaseUrl?: string };
    const raw =
      typeof data?.apiBaseUrl === "string" ? data.apiBaseUrl.trim() : "";
    if (raw && (raw.startsWith("http://") || raw.startsWith("https://"))) {
      return raw;
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function ApiConfigProvider({ children }: { children: ReactNode }) {
  const [apiConfigReady, setApiConfigReady] = useState(false);

  const applyRemoteConfig = useCallback(async () => {
    const fallback = DEFAULT_API_BASE_URL;
    const bootstrapUrl = `${getBootstrapBaseUrl()}/app-config`;

    if (__DEV__) {
      console.log("[ApiConfig] bootstrap:", fallback, "→ fetch:", bootstrapUrl);
    }

    try {
      const fromServer = await fetchApiBaseUrlFromBackend();
      if (fromServer) {
        setApiBaseURL(fromServer);
      } else {
        setApiBaseURL(fallback);
      }
    } catch (e) {
      console.warn(
        "[ApiConfig] Could not reach",
        bootstrapUrl,
        "— using bootstrap URL for API.",
        e,
      );
      setApiBaseURL(fallback);
    }

    if (__DEV__) {
      console.log("[ApiConfig] axios baseURL:", getApiBaseURL());
    }
  }, []);

  const refreshApiBaseUrlFromRemote = useCallback(async () => {
    await applyRemoteConfig();
  }, [applyRemoteConfig]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await applyRemoteConfig();
      if (!cancelled) setApiConfigReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyRemoteConfig]);

  const value = useMemo<ApiConfigContextValue>(
    () => ({
      apiConfigReady,
      refreshApiBaseUrlFromRemote,
    }),
    [apiConfigReady, refreshApiBaseUrlFromRemote],
  );

  if (!apiConfigReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.bootText}>Loading…</Text>
      </View>
    );
  }

  return (
    <ApiConfigContext.Provider value={value}>{children}</ApiConfigContext.Provider>
  );
}

export function useApiConfig() {
  const ctx = useContext(ApiConfigContext);
  if (!ctx) {
    throw new Error("useApiConfig must be used inside ApiConfigProvider");
  }
  return ctx;
}

export function useApiConfigOptional() {
  return useContext(ApiConfigContext);
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAF8",
  },
  bootText: { marginTop: 12, color: "#6B7280", fontSize: 14 },
});
