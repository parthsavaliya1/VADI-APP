import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

let notificationHandlerInitialized = false;

async function getNotificationsModule() {
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

async function ensureNotificationHandler(Notifications: any) {
  if (notificationHandlerInitialized) return;
  notificationHandlerInitialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function getPushToken() {
  if (!Device.isDevice) {
    return null;
  }

  // Expo Go (SDK 53+) does not support remote push notifications on Android.
  // Use a development build for real tokens; in Expo Go we no-op to avoid a hard crash.
  if (Platform.OS === "android" && Constants.appOwnership === "expo") {
    return null;
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;
  await ensureNotificationHandler(Notifications);

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const tokenData = await Notifications.getDevicePushTokenAsync();
  const raw = tokenData?.data != null ? String(tokenData.data).trim() : "";
  if (!raw) return null;

  // Firebase Admin multicast expects FCM registration tokens, not Expo's push service tokens.
  if (raw.startsWith("ExponentPushToken[")) {
    if (__DEV__) {
      console.warn(
        "[push] Expo push token received; use a dev build with google-services.json (Android) / GoogleService-Info.plist (iOS) so Firebase FCM device tokens are registered.",
      );
    }
    return null;
  }

  return raw;
}
