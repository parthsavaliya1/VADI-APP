import AsyncStorage from "@react-native-async-storage/async-storage";
import { getThemeKey, isThemeKey, setTheme } from "@/constants/theme";
import { API } from "@/utils/api";

const STORAGE_KEY = "vadi-theme";
const FETCH_TIMEOUT_MS = 3000;

/**
 * Applies the colour theme chosen in Admin → Theme.
 * Uses the last known theme immediately, then refreshes it from the backend.
 * Call before the first screen renders (see app/_layout.tsx).
 */
export async function loadAppTheme(): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (isThemeKey(cached)) setTheme(cached);
  } catch {
    // ignore storage errors
  }

  try {
    const res = await Promise.race([
      API.get("/app-theme", { timeout: FETCH_TIMEOUT_MS }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), FETCH_TIMEOUT_MS)),
    ]);
    const theme = res?.data?.data?.theme;
    if (isThemeKey(theme)) {
      setTheme(theme);
      await AsyncStorage.setItem(STORAGE_KEY, theme);
      console.log("🎨 App theme:", theme);
    } else {
      console.log("🎨 App theme: backend returned no theme, using", getThemeKey());
    }
  } catch (e) {
    console.log("🎨 App theme fetch failed, using", getThemeKey(), e);
  }
}
