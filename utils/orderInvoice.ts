import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import { getApiBaseURL } from "./api";
import { getCustomerToken } from "./customerSession";
export async function downloadOrderInvoicePdf(orderId: string, userId: string): Promise<void> {
  const token = getCustomerToken();
  if (!token) { Alert.alert("Invoice", "Please sign in again to download your invoice."); return; }
  const url = getApiBaseURL().replace(/\/+$/, "") + "/orders/" + encodeURIComponent(orderId) + "/invoice?userId=" + encodeURIComponent(userId);
  try {
    const headers = { Authorization: "Bearer " + token };
    if (Platform.OS === "web") {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error("Could not download invoice");
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = objectUrl; link.download = "VADI-Invoice.pdf"; link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      return;
    }
    if (!FileSystem.cacheDirectory) throw new Error("No download storage available");
    const result = await FileSystem.downloadAsync(url, FileSystem.cacheDirectory + "vadi-invoice-" + orderId + ".pdf", { headers });
    if (result.status !== 200) throw new Error("Could not download invoice");
    if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is unavailable on this device");
    await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", dialogTitle: "Invoice" });
  } catch { Alert.alert("Invoice", "Could not download or share the invoice. Please try again."); }
}
