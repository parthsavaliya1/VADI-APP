const fs = require("fs");
const path = require("path");

/**
 * @param {string} plistPath
 * @returns {Record<string, string>}
 */
function readIosPlistStrings(plistPath) {
  const raw = fs.readFileSync(plistPath, "utf8");
  /** @type {Record<string, string>} */
  const out = {};
  const re = /<key>([^<]+)<\/key>\s*<string>([^<]*)<\/string>/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    out[m[1]] = m[2];
  }
  return out;
}

/**
 * Build Firebase JS SDK config for Remote Config (same project as FCM).
 * @param {string} appRoot
 */
function readFirebaseExtraFromGoogleServices(appRoot) {
  try {
    const p = path.join(appRoot, "google-services.json");
    if (!fs.existsSync(p)) return null;
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const pi = j.project_info;
    const client = j.client?.[0];
    const apiKey = client?.api_key?.[0]?.current_key;
    const appId = client?.client_info?.mobilesdk_app_id;
    if (!pi?.project_id || !apiKey) return null;
    return {
      apiKey: String(apiKey),
      authDomain: `${pi.project_id}.firebaseapp.com`,
      projectId: String(pi.project_id),
      storageBucket: String(
        pi.storage_bucket || `${pi.project_id}.appspot.com`,
      ),
      messagingSenderId: String(pi.project_number || ""),
      appId: appId ? String(appId) : "",
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} appRoot
 */
function readFirebaseExtraFromIosPlist(appRoot) {
  try {
    const p = path.join(appRoot, "GoogleService-Info.plist");
    if (!fs.existsSync(p)) return null;
    const s = readIosPlistStrings(p);
    const projectId = s.PROJECT_ID;
    const apiKey = s.API_KEY;
    if (!projectId || !apiKey) return null;
    return {
      apiKey,
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: s.STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: s.GCM_SENDER_ID || "",
      appId: s.GOOGLE_APP_ID || "",
    };
  } catch {
    return null;
  }
}

/**
 * CI / local override without committing google-services (optional).
 */
function readFirebaseExtraFromEnv() {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !projectId) return null;
  const authDomain =
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
    `${projectId}.firebaseapp.com`;
  const storageBucket =
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    `${projectId}.appspot.com`;
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() || "",
  };
}

/**
 * @param {import('expo/config').ExpoConfig} config
 * @param {string} appRoot
 */
function resolveFirebaseExtra(config, appRoot) {
  if (config.extra?.firebase && typeof config.extra.firebase === "object") {
    return config.extra.firebase;
  }
  return (
    readFirebaseExtraFromGoogleServices(appRoot) ||
    readFirebaseExtraFromIosPlist(appRoot) ||
    readFirebaseExtraFromEnv()
  );
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";

  // Native Firebase (FCM) — add these files from the Firebase console (same project as Admin SDK).
  // Android: google-services.json  |  iOS: GoogleService-Info.plist
  // Then build a dev/production client (`eas build` or `expo run:android`); Expo Go will not return FCM tokens.
  const appRoot = path.resolve(__dirname);
  const androidGoogleServices = path.join(appRoot, "google-services.json");
  const iosGoogleServices = path.join(appRoot, "GoogleService-Info.plist");
  const hasAndroidFirebase = fs.existsSync(androidGoogleServices);
  const hasIosFirebase = fs.existsSync(iosGoogleServices);

  const firebaseExtra = resolveFirebaseExtra(config, appRoot);

  return {
    ...config,
    android: {
      ...config.android,
      ...(hasAndroidFirebase
        ? { googleServicesFile: "./google-services.json" }
        : {}),
      config: {
        ...config.android?.config,
        googleMaps: {
          ...(config.android?.config?.googleMaps || {}),
          apiKey: mapsKey || config.android?.config?.googleMaps?.apiKey || "",
        },
      },
    },
    ios: {
      ...config.ios,
      ...(hasIosFirebase
        ? { googleServicesFile: "./GoogleService-Info.plist" }
        : {}),
      config: {
        ...config.ios?.config,
        googleMapsApiKey:
          mapsKey || config.ios?.config?.googleMapsApiKey || "",
      },
    },
    plugins: [
      ...(config.plugins || []),
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "VADI uses your location to show the map when you pick a delivery address.",
          locationAlwaysAndWhenInUsePermission:
            "VADI uses your location to show the map when you pick a delivery address.",
        },
      ],
    ],
    extra: {
      ...config.extra,
      ...(firebaseExtra ? { firebase: firebaseExtra } : {}),
      /** Baked at build time; Remote Config `api_base_url` overrides in the app when Firebase is configured. */
      defaultApiBaseUrl:
        process.env.EXPO_PUBLIC_API_URL?.trim() ||
        (typeof config.extra?.defaultApiBaseUrl === "string"
          ? config.extra.defaultApiBaseUrl.trim()
          : ""),
    },
  };
};
