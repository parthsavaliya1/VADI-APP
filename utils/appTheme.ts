import AsyncStorage from "@react-native-async-storage/async-storage";
import { getThemeKey, isThemeKey, setTheme } from "@/constants/theme";
import { API } from "@/utils/api";

const STORAGE_KEY = "vadi-theme";
const CACHE_TIMEOUT_MS = 1500;
const FETCH_TIMEOUT_MS = 3000;

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Restore before network setup so the first app loader uses the saved palette. */
export async function loadCachedAppTheme(): Promise<void> {
  try {
    const cached = await withTimeout(AsyncStorage.getItem(STORAGE_KEY), CACHE_TIMEOUT_MS);
    if (isThemeKey(cached)) setTheme(cached);
  } catch {
    // Storage can be unavailable; keep the default palette and continue startup.
  }
}

/** Refresh from Admin after the startup API URL has been resolved. */
export async function loadAppTheme(options: { restoreCached?: boolean } = {}): Promise<void> {
  if (options.restoreCached !== false) await loadCachedAppTheme();
  try {
    const res = await withTimeout(API.get("/app-theme", { timeout: FETCH_TIMEOUT_MS }), FETCH_TIMEOUT_MS);
    const theme = res?.data?.data?.theme;
    if (isThemeKey(theme)) {
      setTheme(theme);
      await withTimeout(AsyncStorage.setItem(STORAGE_KEY, theme), CACHE_TIMEOUT_MS);
      console.log("🎨 App theme:", theme);
    } else {
      console.log("🎨 App theme: backend returned no theme, using", getThemeKey());
    }
  } catch (e) {
    console.log("🎨 App theme fetch failed, using", getThemeKey(), e);
  }
}
