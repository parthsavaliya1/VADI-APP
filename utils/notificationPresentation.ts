import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

type Appearance = { icon: ComponentProps<typeof Ionicons>["name"]; label: string; color: string; background: string };
const ORDER_ICONS: { pattern: RegExp; appearance: Appearance }[] = [
  { pattern: /out for delivery|ડિલિવરી માટે|डिलीवरी के लिए/i, appearance: { icon: "bicycle-outline", label: "Delivery update", color: "#9A5B08", background: "#FFF2D9" } },
  { pattern: /delivered|ડિલિવર|डिलीवर/i, appearance: { icon: "home-outline", label: "Delivered", color: "#267344", background: "#E8F5EC" } },
  { pattern: /cancelled|canceled|ઓર્ડર રદ|ऑर्डर रद्द/i, appearance: { icon: "close-circle-outline", label: "Order update", color: "#B33F40", background: "#FCEBEC" } },
  { pattern: /return|રિટર્ન|रिटर्न/i, appearance: { icon: "return-down-back-outline", label: "Return update", color: "#7951A8", background: "#F1EBF9" } },
  { pattern: /confirmed|કન્ફર્મ|कन्फर्म/i, appearance: { icon: "checkmark-circle-outline", label: "Order confirmed", color: "#267344", background: "#E8F5EC" } },
  { pattern: /packed|પેક|पैक/i, appearance: { icon: "cube-outline", label: "Order packed", color: "#7951A8", background: "#F1EBF9" } },
  { pattern: /shipped|dispatched|શિપ|शिप/i, appearance: { icon: "car-outline", label: "On the way", color: "#326EAA", background: "#EAF2FC" } },
  { pattern: /order placed|ઓર્ડર મળ્યો|ऑर्डर मिल गया/i, appearance: { icon: "receipt-outline", label: "Order placed", color: "#326EAA", background: "#EAF2FC" } },
  { pattern: /order|ઓર્ડર|ऑर्डर/i, appearance: { icon: "bag-handle-outline", label: "Order update", color: "#326EAA", background: "#EAF2FC" } },
  { pattern: /offer|sale|discount|deal/i, appearance: { icon: "pricetag-outline", label: "Offers", color: "#9A5B08", background: "#FFF2D9" } },
];

export function notificationAppearance(title: string): Appearance {
  return ORDER_ICONS.find((item) => item.pattern.test(title))?.appearance || { icon: "notifications-outline", label: "VADI update", color: "#526B58", background: "#EDF2EC" };
}

export function notificationDay(value: string, now = new Date()): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Earlier";
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}) });
}

export function notificationTime(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";
}
