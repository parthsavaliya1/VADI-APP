// firebase.ts — Firebase Remote Config REST fetch (same pattern as VADI-HISAB)

const FALLBACK_URL = "https://vadi-backend.onrender.com";
const PROJECT_ID = "vadi-9b6fb";
const APP_ID = "1:120139932928:web:b209ed796deaba53c57fe5";
const API_KEY = "AIzaSyDgvW6n-ynOgqL1K7t_GL9_PixaFN4dVoA";

let cachedApiUrl: string | null = null;

function readEntryValue(entry: unknown): string | null {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && "value" in entry) {
    const v = (entry as { value?: unknown }).value;
    return typeof v === "string" ? v : null;
  }
  return null;
}

export const loadRemoteConfig = async (): Promise<void> => {
  try {
    const url = `https://firebaseremoteconfig.googleapis.com/v1/projects/${PROJECT_ID}/namespaces/firebase:fetch?key=${API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: APP_ID,
        app_instance_id: "rn-fallback-instance",
        sdk_version: "9.0.0",
      }),
    });

    if (!res.ok) {
      console.log("⚠️ Remote Config fetch returned", res.status);
      return;
    }

    const json = await res.json();
    const entries = json?.entries ?? {};
    const apiUrl = readEntryValue(entries?.api_base_url);

    if (apiUrl && apiUrl.startsWith("http")) {
      cachedApiUrl = apiUrl.replace(/\/+$/, "");
      console.log("🔥 Remote Config loaded:", cachedApiUrl);
    } else {
      console.log("ℹ️ api_base_url not set in Remote Config, using fallback");
    }
  } catch (e) {
    console.log("❌ Remote config fetch failed:", e);
  }
};

export const getApiUrl = (): string => {
  return cachedApiUrl ?? FALLBACK_URL;
};
