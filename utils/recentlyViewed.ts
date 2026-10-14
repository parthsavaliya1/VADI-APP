import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "vadi_recent_products";
const MAX = 12;

export async function rememberProduct(productId: string) {
  if (!productId) return;
  const current = await readRecentIds();
  const next = [productId, ...current.filter((id) => id !== productId)].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function readRecentIds() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}
