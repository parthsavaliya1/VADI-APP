import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "@/utils/api";
import type { PlaceOrderPayload } from "@/context/OrderContext";

export type PendingCheckoutPayment = {
  userId: string;
  amount: number;
  payload: PlaceOrderPayload;
};

export class OrderPlacementError extends Error {
  constructor(message: string, public status?: number, public orderId?: string) {
    super(message);
    this.name = "OrderPlacementError";
  }
}

export function orderPlacementError(error: any): OrderPlacementError {
  const body = error?.response?.data;
  return new OrderPlacementError(
    (typeof body?.error === "string" && body.error) || body?.message || error?.message || "Failed to place order",
    error?.response?.status,
    body?.data?.orderId,
  );
}

export function isPaymentAmountMismatch(error: unknown): boolean {
  return error instanceof Error && error.message === "Payment amount does not match the order total";
}

const pendingKey = (userId: string) => `vadi-pending-checkout:${userId}`;

export async function readPendingCheckout(userId: string): Promise<PendingCheckoutPayment | null> {
  const raw = await AsyncStorage.getItem(pendingKey(userId));
  if (!raw) return null;
  const pending = JSON.parse(raw);
  if (pending?.userId !== userId || !pending.payload?.paymentDetails?.razorpayPaymentId) {
    throw new Error("Saved payment confirmation could not be read. Check your orders or contact support.");
  }
  return pending;
}

export async function savePendingCheckout(pending: PendingCheckoutPayment) {
  await AsyncStorage.setItem(pendingKey(pending.userId), JSON.stringify(pending));
}

export async function clearPendingCheckout(userId: string) {
  await AsyncStorage.removeItem(pendingKey(userId));
}

/** Reuse the original proof; confirmation never opens another payment. */
export async function confirmPendingCheckout(
  pending: PendingCheckoutPayment,
  placeOrder: (payload: PlaceOrderPayload) => Promise<unknown>,
) {
  const verified = await API.post("/payments/verify-signature", pending.payload.paymentDetails);
  if (!verified.data?.success) throw new Error(verified.data?.message || "Payment verification failed");
  try {
    return await placeOrder(pending.payload);
  } catch (error) {
    // A lost order response may mean the payment already created an order.
    if (error instanceof OrderPlacementError && error.status === 409 && error.orderId) {
      const existing = await API.get(`/orders/${error.orderId}`, { params: { userId: pending.userId } });
      if (existing.data?.success) return existing.data;
    }
    throw error;
  }
}
