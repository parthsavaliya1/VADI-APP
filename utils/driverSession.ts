import AsyncStorage from "@react-native-async-storage/async-storage";

const DRIVER_JWT_KEY = "vadi_driver_jwt";

export async function getDriverToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DRIVER_JWT_KEY);
  } catch {
    return null;
  }
}

export async function setDriverToken(token: string): Promise<void> {
  await AsyncStorage.setItem(DRIVER_JWT_KEY, token);
}

export async function clearDriverToken(): Promise<void> {
  await AsyncStorage.removeItem(DRIVER_JWT_KEY);
}
