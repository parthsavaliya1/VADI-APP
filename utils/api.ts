import axios from "axios";

// Production default — overridden at startup from Firebase Remote Config (`api_base_url`).
// For local dev, uncomment the setBaseUrl line in app/_layout.tsx.
let BASE_URL = "https://vadi-backend.onrender.com";

export const setBaseUrl = (url: string) => {
  if (url && url.trim()) {
    BASE_URL = url.trim().replace(/\/+$/, "");
    API.defaults.baseURL = BASE_URL;
    console.log("🌍 BASE_URL updated to:", BASE_URL);
  }
};

export const API = axios.create({
  baseURL: BASE_URL,
});

/** @deprecated use setBaseUrl */
export const setApiBaseURL = setBaseUrl;

export function getApiBaseURL(): string {
  return String(API.defaults.baseURL ?? BASE_URL);
}
