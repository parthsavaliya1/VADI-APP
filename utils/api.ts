import { expireCustomerSession, getCustomerToken } from "./customerSession";
import axios from "axios";

// Production default — overridden at startup from Firebase Remote Config (`product_api_base_url`).
// For local dev, uncomment the setBaseUrl line in app/_layout.tsx.
let BASE_URL = "https:192.168.29.55:5000";

/** Ignore a local HTTP override in release builds so Remote Config still takes effect. */
export function resolveStartupApiUrl(configuredUrl: string | undefined, remoteUrl: string) {
  const candidate = configuredUrl?.trim();
  return candidate && (__DEV__ || candidate.toLowerCase().startsWith("https://")) ? candidate : remoteUrl;
}

export const setBaseUrl = (url: string) => {
  if (url && url.trim()) {
    const candidate = url.trim().replace(/\/+$/, "");
    if (!__DEV__ && !/^https:\/\//i.test(candidate)) {
      console.warn("Ignoring insecure API URL");
      return;
    }
    BASE_URL = candidate;
    API.defaults.baseURL = BASE_URL;
    console.log("🌍 BASE_URL updated to:", BASE_URL);
  }
};

export const API = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

/** @deprecated use setBaseUrl */
export const setApiBaseURL = setBaseUrl;

export function getApiBaseURL(): string {
  return String(API.defaults.baseURL ?? BASE_URL);
}

API.interceptors.request.use(config => {
  const token = getCustomerToken();
  if (token && !config.headers.Authorization) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

API.interceptors.response.use(response => response, async error => {
  const activeToken = getCustomerToken();
  const url = String(error.config?.url || "");
  const loginRequest = url.startsWith("/api/auth/") || url.startsWith("/api/driver/") || url === "/sellers/login";
  if (error.response?.status === 401 && activeToken && !loginRequest &&
      error.config?.headers?.Authorization === "Bearer " + activeToken) {
    await expireCustomerSession(activeToken).catch(() => undefined);
  }
  return Promise.reject(error);
});
