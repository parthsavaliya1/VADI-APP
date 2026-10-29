import { expireCustomerSession, getCustomerToken } from "./customerSession";
import { getApiUrl, normalizeApiUrl } from "../firebase";
import axios from "axios";

// Release builds always use Firebase. Local testing requires an explicit development opt-in.
function normalizeClientApiUrl(value: string): string | null {
  const httpsUrl = normalizeApiUrl(value);
  if (httpsUrl) return httpsUrl;
  if (!__DEV__ || !/^http:\/\//i.test(value.trim())) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" || !url.hostname || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/+$/, "");
  } catch { return null; }
}

export function resolveStartupApiUrl(remoteUrl: string, localUrl?: string, useLocalApi?: string): string {
  if (__DEV__ && useLocalApi === "true" && localUrl) {
    return normalizeClientApiUrl(localUrl) || remoteUrl;
  }
  return remoteUrl;
}

let BASE_URL = resolveStartupApiUrl(getApiUrl(), process.env.EXPO_PUBLIC_API_URL, process.env.EXPO_PUBLIC_USE_LOCAL_API);

export const setBaseUrl = (url: string) => {
  const candidate = normalizeClientApiUrl(url);
  if (!candidate) {
    console.warn("Ignoring invalid or insecure API URL");
    return;
  }
  BASE_URL = candidate;
  API.defaults.baseURL = candidate;
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
