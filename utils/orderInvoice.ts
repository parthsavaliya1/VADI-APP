import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import { getApiBaseURL } from "./api";

/**
 * Download delivered-order invoice PDF (GET /orders/:id/invoice?userId=).
 */
export async function downloadOrderInvoicePdf(
  orderId: string,
  userId: string,
): Promise<void> {
  const base = getApiBaseURL().replace(/\/+$/, "");
  const url = `${base}/orders/${encodeURIComponent(orderId)}/invoice?userId=${encodeURIComponent(userId)}`;

  try {
    if (Platform.OS === "web") {
      await Linking.openURL(url);
      return;
    }

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      await Linking.openURL(url);
      return;
    }

    const dest = `${cacheDir}vadi-invoice-${orderId}.pdf`;
    const res = await FileSystem.downloadAsync(url, dest);
    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}`);
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(res.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Invoice",
      });
    } else {
      await Linking.openURL(url);
    }
  } catch {
    Alert.alert(
      "Invoice",
      "Could not download the invoice. You can open the link in your browser instead.",
      [
        { text: "Open link", onPress: () => void Linking.openURL(url) },
        { text: "OK", style: "cancel" },
      ],
    );
  }
}
