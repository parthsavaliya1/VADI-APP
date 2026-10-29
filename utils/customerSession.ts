import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "vadi_customer_session";
let token: string | null = null;
const listeners = new Set<(value: string | null) => void>();

export function getCustomerToken() { return token; }
export async function loadCustomerToken() {
  token = await AsyncStorage.getItem(KEY);
  return token;
}
export function subscribeCustomerSession(listener: (value: string | null) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export async function setCustomerToken(value: string | null) {
  if (value) await AsyncStorage.setItem(KEY, value);
  else await AsyncStorage.removeItem(KEY);
  token = value;
  listeners.forEach(listener => listener(value));
}
/** Only invalidate the session that actually failed, never a newer sign-in. */
export async function expireCustomerSession(expectedToken: string) {
  if (token !== expectedToken) return;
  token = null;
  listeners.forEach(listener => listener(null));
  await AsyncStorage.removeItem(KEY);
}
