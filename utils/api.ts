import axios from "axios";
import Constants from "expo-constants";

/**
 * Reads `extra.defaultApiBaseUrl` from app.config.js (set from EXPO_PUBLIC_API_URL
 * or optional `extra.defaultApiBaseUrl` in app.json).
 */
function readDefaultApiBaseUrlFromManifest(): string {
  const raw =
    Constants.expoConfig?.extra ??
    (Constants as unknown as { manifest2?: { extra?: Record<string, unknown> } })
      .manifest2?.extra;
  if (!raw || typeof raw !== "object") return "";
  const v = (raw as Record<string, unknown>).defaultApiBaseUrl;
  return typeof v === "string" ? v.trim() : "";
}

/**
 * When running in Expo Go / dev, Metro's host is your PC's LAN IP — use it so a
 * physical phone does not call `localhost` (which is the phone itself).
 */
function inferBootstrapFromExpoDev(): string | null {
  try {
    const expoGo = Constants.expoGoConfig as { debuggerHost?: string } | null;
    const dbg = expoGo?.debuggerHost;
    const hostUri = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri;
    const raw = dbg || hostUri;
    if (!raw || typeof raw !== "string") return null;
    // "192.168.1.5:8081" → host "192.168.1.5"
    const hostOnly = raw.includes(":") ? raw.slice(0, raw.indexOf(":")) : raw;
    if (!hostOnly || hostOnly === "localhost" || hostOnly === "127.0.0.1") {
      return null;
    }
    const backendPort =
      process.env.EXPO_PUBLIC_DEV_BACKEND_PORT?.trim() || "5000";
    return `http://${hostOnly}:${backendPort}`;
  } catch {
    return null;
  }
}

/**
 * First-hop API base used before `GET /app-config` may redirect you to Remote Config URL.
 * Priority: manifest extra → EXPO_PUBLIC_API_URL → Expo dev host inference → localhost.
 */
export const DEFAULT_API_BASE_URL =
  readDefaultApiBaseUrlFromManifest() ||
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  inferBootstrapFromExpoDev() ||
  "http://localhost:5000";

export const API = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
});

export function setApiBaseURL(url: string): boolean {
  const trimmed = (url ?? "").trim().replace(/\/+$/, "");
  if (!trimmed || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))) {
    return false;
  }
  API.defaults.baseURL = trimmed;
  return true;
}

export function getApiBaseURL(): string {
  return String(API.defaults.baseURL ?? DEFAULT_API_BASE_URL);
}
