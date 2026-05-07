import { API } from "@/utils/api";
import Constants from "expo-constants";

type RazorpayGatewayOrder = {
  key: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  razorpayOrderId: string;
};

type OpenRazorpayOptions = {
  userId: string;
  amount: number;
  deliveryFee: number;
  paymentMethod: "upi" | "card" | "wallet";
  customerName?: string;
  customerPhone?: string;
  description?: string;
  onSuccess: (payload: {
    paymentId: string;
    orderId: string;
    signature: string;
  }) => void;
  onFailure: (message?: string) => void;
};

export async function openRazorpay(options: OpenRazorpayOptions) {
  try {
    const isExpoGo =
      Constants.appOwnership === "expo" ||
      Constants.executionEnvironment === "storeClient";

    if (isExpoGo) {
      throw new Error(
        "Online payment is not supported in Expo Go. Please run a development build.",
      );
    }

    let RazorpayCheckout: { open: (config: any) => Promise<any> };
    try {
      // Lazy-load to avoid crashing app startup in Expo Go.
      RazorpayCheckout = require("react-native-razorpay").default;
    } catch {
      throw new Error(
        "Razorpay requires a development build. Expo Go does not support this native module.",
      );
    }

    const createOrderRes = await API.post("/payments/create-order", {
      userId: options.userId,
      amount: options.amount,
      deliveryFee: options.deliveryFee,
      paymentMethod: options.paymentMethod,
    });

    if (!createOrderRes.data?.success) {
      throw new Error(createOrderRes.data?.message || "Unable to create payment order");
    }

    const gatewayOrder: RazorpayGatewayOrder = createOrderRes.data.data;

    const paymentResult = await RazorpayCheckout.open({
      key: gatewayOrder.key,
      amount: gatewayOrder.amountInPaise,
      currency: gatewayOrder.currency,
      name: "VADI",
      description: options.description || "Order payment",
      order_id: gatewayOrder.razorpayOrderId,
      prefill: {
        name: options.customerName || "",
        contact: options.customerPhone || "",
      },
      theme: { color: "#2E7D32" },
    });

    const verifyRes = await API.post("/payments/verify-signature", {
      razorpayOrderId: paymentResult.razorpay_order_id,
      razorpayPaymentId: paymentResult.razorpay_payment_id,
      razorpaySignature: paymentResult.razorpay_signature,
    });

    if (!verifyRes.data?.success) {
      throw new Error(verifyRes.data?.message || "Payment verification failed");
    }

    options.onSuccess({
      paymentId: paymentResult.razorpay_payment_id,
      orderId: paymentResult.razorpay_order_id,
      signature: paymentResult.razorpay_signature,
    });
  } catch (error: any) {
    options.onFailure(error?.description || error?.message || "Payment failed");
  }
}
