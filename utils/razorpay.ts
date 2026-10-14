import { API } from "@/utils/api";
import { payWithRazorpayCheckout } from "@/components/RazorpayCheckout";

function phoneForRazorpay(phone?: string) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

type RazorpayGatewayOrder = {
  key: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  razorpayOrderId: string;
  description?: string;
};

type OpenRazorpayOptions = {
  userId: string;
  amount: number;
  deliveryFee: number;
  paymentMethod: "upi" | "card" | "wallet";
  /**
   * Narrow Razorpay’s method picker. Card / netbanking are collected on Razorpay’s screen only
   * (not in our app) for PCI / security.
   */
  methodRestriction?: "card" | "netbanking";
  customerName?: string;
  customerPhone?: string;
  /** Optional UPI VPA (e.g. user@paytm) — forwarded to Razorpay prefill when supported */
  prefillVpa?: string;
  description?: string;
  couponCode?: string;
  onSuccess: (payload: {
    paymentId: string;
    orderId: string;
    signature: string;
  }) => void;
  onFailure: (message?: string) => void;
};

export async function openRazorpay(options: OpenRazorpayOptions) {
  try {
    const createOrderRes = await API.post("/payments/create-order", {
      userId: options.userId,
      amount: options.amount,
      deliveryFee: options.deliveryFee,
      paymentMethod: options.paymentMethod,
      couponCode: options.couponCode || undefined,
    });

    if (!createOrderRes.data?.success) {
      throw new Error(createOrderRes.data?.message || "Unable to create payment order");
    }

    const gatewayOrder: RazorpayGatewayOrder = createOrderRes.data.data;
    const paymentResult = await payWithRazorpayCheckout({
      keyId: gatewayOrder.key,
      orderId: gatewayOrder.razorpayOrderId,
      amount: gatewayOrder.amountInPaise,
      currency: gatewayOrder.currency,
      description: options.description || "Order payment",
      name: options.customerName,
      contact: phoneForRazorpay(options.customerPhone),
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

export async function openWalletTopup(options: {
  userId: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
  onSuccess: (balance: number) => void;
  onFailure: (message?: string) => void;
}) {
  try {
    const createOrderRes = await API.post("/wallet/topup/order", {
      userId: options.userId,
      amount: options.amount,
    });
    if (!createOrderRes.data?.success) {
      throw new Error(createOrderRes.data?.message || "Unable to start wallet top-up");
    }
    const gatewayOrder: RazorpayGatewayOrder = createOrderRes.data.data;
    const paymentResult = await payWithRazorpayCheckout({
      keyId: gatewayOrder.key,
      orderId: gatewayOrder.razorpayOrderId,
      amount: gatewayOrder.amountInPaise,
      currency: gatewayOrder.currency,
      description: gatewayOrder.description || `Add ₹${options.amount} to wallet`,
      name: options.customerName,
      contact: phoneForRazorpay(options.customerPhone),
    });

    const verifyRes = await API.post("/wallet/topup/verify", {
      userId: options.userId,
      razorpayOrderId: paymentResult.razorpay_order_id,
      razorpayPaymentId: paymentResult.razorpay_payment_id,
      razorpaySignature: paymentResult.razorpay_signature,
    });
    if (!verifyRes.data?.success) {
      throw new Error(verifyRes.data?.message || "Wallet top-up could not be verified");
    }
    options.onSuccess(Number(verifyRes.data?.data?.balance || 0));
  } catch (error: any) {
    options.onFailure(error?.description || error?.message || "Payment failed");
  }
}
