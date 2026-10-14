import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

let notificationHandlerInitialized = false;
let channelReady = false;

async function getNotificationsModule() {
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

/**
 * High-importance, lock-screen-visible channel. Must exist before a push
 * arrives while the app is closed, otherwise Android drops or hides it.
 */
export async function ensurePushChannel() {
  if (channelReady || Platform.OS !== "android") return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "VADI updates",
    description: "Orders, offers, and messages from VADI.",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
    showBadge: true,
  });
  channelReady = true;
}

async function ensureNotificationHandler(Notifications: {
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldShowBanner: boolean;
      shouldShowList: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }) => void;
}) {
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
  const executionEnvironment = (Constants as { executionEnvironment?: string })
    .executionEnvironment;
  if (
    !Device.isDevice ||
    executionEnvironment === "storeClient" ||
    Constants.appOwnership === "expo"
  ) {
    return null;
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;

  await ensureNotificationHandler(Notifications);
  await ensurePushChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("[push] missing EAS projectId — cannot register Expo push token");
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const raw = tokenData?.data != null ? String(tokenData.data).trim() : "";
  if (!raw) return null;

  return raw;
}
