import { API } from "@/utils/api";

/** Fallback until GET /fees returns the admin rules. */
export const FREE_DELIVERY_ABOVE = 500;
export const DELIVERY_FEE = 40;

export type FeeSettings = {
  deliveryFee: number;
  freeDeliveryAbove: number;
};

export const DEFAULT_FEE_SETTINGS: FeeSettings = {
  deliveryFee: DELIVERY_FEE,
  freeDeliveryAbove: FREE_DELIVERY_ABOVE,
};

export function quoteDeliveryFee(
  subtotal: number,
  settings: FeeSettings = DEFAULT_FEE_SETTINGS,
) {
  const threshold = Number(settings.freeDeliveryAbove) || 0;
  if (threshold > 0 && subtotal > threshold) return 0;
  return Math.max(0, Number(settings.deliveryFee) || 0);
}

export async function fetchFeeSettings(): Promise<FeeSettings> {
  try {
    const res = await API.get("/fees");
    const data = res.data?.data || {};
    return {
      deliveryFee: Math.max(0, Number(data.deliveryFee ?? DELIVERY_FEE) || 0),
      freeDeliveryAbove: Math.max(
        0,
        Number(data.freeDeliveryAbove ?? FREE_DELIVERY_ABOVE) || 0,
      ),
    };
  } catch {
    return DEFAULT_FEE_SETTINGS;
  }
}
