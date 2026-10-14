// Same Firebase project as VADI Hisab and Property Setu (vadi-hisab).
// Each app has its own Remote Config key:
//   api_base_url           — Hisab
//   property_api_base_url  — Property Setu
//   product_api_base_url   — this app
const FALLBACK_URL = "https://vadi-backend.onrender.com";
const PROJECT_ID = "vadi-hisab";
const APP_ID = "1:40446481049:web:2e346187ffa466328dde08";
const API_KEY = "AIzaSyAEqo0dC0fO2cMHyxeI3NOZdGsc4wEsZLE";
const RC_API_KEY = "product_api_base_url";

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
    const apiUrl = readEntryValue(entries?.[RC_API_KEY]);

    if (apiUrl && apiUrl.startsWith("http")) {
      cachedApiUrl = apiUrl.replace(/\/+$/, "");
      console.log("🔥 Remote Config loaded:", cachedApiUrl);
    } else {
      console.log("ℹ️ product_api_base_url not set in Remote Config, using fallback");
    }
  } catch (e) {
    console.log("❌ Remote config fetch failed:", e);
  }
};

export const getApiUrl = (): string => {
  return cachedApiUrl ?? FALLBACK_URL;
};
