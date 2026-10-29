import { useCallback } from "react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Linking, Modal, Platform, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { C } from "@/constants/theme";

export type RazorpayOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  name?: string;
  contact?: string;
  email?: string;
};

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type PayFn = (order: RazorpayOrder) => Promise<RazorpaySuccess>;

let currentPay: PayFn | null = null;

export function payWithRazorpayCheckout(order: RazorpayOrder) {
  if (!currentPay) {
    return Promise.reject(new Error("Payment screen is not ready. Please try again."));
  }
  return currentPay(order);
}

function checkoutHtml(order: RazorpayOrder) {
  const options = {
    key: order.keyId,
    amount: Number(order.amount),
    currency: order.currency || "INR",
    name: "VADI",
    description: order.description,
    order_id: order.orderId,
    prefill: {
      name: order.name || "",
      contact: order.contact || "",
      email: order.email || "",
    },
    theme: { color: /^#[0-9A-Fa-f]{6}$/.test(C.primary) ? C.primary : "#276438" },
  };
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var options = ${JSON.stringify(options)};
  options.handler = function (response) {
    window.ReactNativeWebView.postMessage(JSON.stringify(response));
  };
  options.modal = {
    ondismiss: function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ cancelled: true }));
    }
  };
  var checkout = new Razorpay(options);
  checkout.on("payment.failed", function (response) {
    var description = response && response.error && response.error.description;
    window.ReactNativeWebView.postMessage(JSON.stringify({ failed: true, description: description || "Payment failed" }));
  });
  checkout.open();
</script>
</body>
</html>`;
}

function openWebCheckout(order: RazorpayOrder) {
  return new Promise<RazorpaySuccess>((resolve, reject) => {
    const start = () => {
      const Razorpay = (window as unknown as {
        Razorpay?: new (options: unknown) => {
          open: () => void;
          on: (event: string, fn: (response: { error?: { description?: string } }) => void) => void;
        };
      }).Razorpay;
      if (!Razorpay) {
        reject(new Error("Could not open Razorpay"));
        return;
      }
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "VADI",
        description: order.description,
        order_id: order.orderId,
        prefill: {
          name: order.name || "",
          contact: order.contact || "",
          email: order.email || "",
        },
        theme: { color: /^#[0-9A-Fa-f]{6}$/.test(C.primary) ? C.primary : "#276438" },
        handler: (response: RazorpaySuccess) => resolve(response),
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
      });
      checkout.on("payment.failed", (response) => {
        reject(new Error(response.error?.description || "Payment failed"));
      });
      checkout.open();
    };
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      start();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => start();
    script.onerror = () => reject(new Error("Could not open Razorpay"));
    document.body.appendChild(script);
  });
}

function openExternalPayment(url: string) {
  try {
    const scheme = url.match(/scheme=([^;]+)/i)?.[1];
    const fallback = url.match(/browser_fallback_url=([^;]+)/i)?.[1];
    const target = url.startsWith("intent:")
      ? `${decodeURIComponent(scheme || "upi")}://${url.replace(/^intent:\/\//, "").split("#")[0]}`
      : url;
    Linking.openURL(target).catch(() => {
      if (!fallback) return;
      try {
        Linking.openURL(decodeURIComponent(fallback)).catch(() => undefined);
      } catch {
        /* checkout stays open if the UPI app cannot launch */
      }
    });
  } catch {
    Linking.openURL(url).catch(() => undefined);
  }
}

function isExternalPayment(url: string) {
  return /^(upi|intent|tez|phonepe|paytmmp|gpay|credpay|bhim):/i.test(url);
}

const CheckoutContext = createContext<PayFn | null>(null);

export function useRazorpay() {
  const pay = useContext(CheckoutContext);
  if (!pay) throw new Error("Payment is not ready");
  return pay;
}

export function RazorpayHost({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<RazorpayOrder | null>(null);
  const pending = useRef<{
    resolve: (value: RazorpaySuccess) => void;
    reject: (error: Error) => void;
  } | null>(null);

  function finish(error?: Error, value?: RazorpaySuccess) {
    const current = pending.current;
    pending.current = null;
    setOrder(null);
    if (!current) return;
    if (error) current.reject(error);
    else if (value) current.resolve(value);
  }

  const pay = useCallback((next: RazorpayOrder) => {
    if (Platform.OS === "web") return openWebCheckout(next);
    return new Promise<RazorpaySuccess>((resolve, reject) => {
      if (pending.current) { reject(new Error("A payment is already in progress")); return; }
      pending.current = { resolve, reject };
      setOrder(next);
    });
  }, []);

  useEffect(() => {
    currentPay = pay;
    return () => {
      currentPay = null;
      pending.current?.reject(new Error("Payment screen closed"));
      pending.current = null;
    };
  }, [pay]);

  return (
    <CheckoutContext.Provider value={pay}>
      {children}
      <Modal visible={Boolean(order)} animationType="slide" onRequestClose={() => finish(new Error("Payment cancelled"))}>
        <View style={{ flex: 1, backgroundColor: C.page }}>
          <View style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: C.ink }}>Pay with Razorpay</Text>
            <Pressable onPress={() => finish(new Error("Payment cancelled"))} hitSlop={8}>
              <Text style={{ color: C.primary, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
          </View>
          {order ? (
            <WebView
              originWhitelist={["*"]}
              source={{ html: checkoutHtml(order), baseUrl: "https://checkout.razorpay.com" }}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={(request) => {
                if (isExternalPayment(request.url)) {
                  openExternalPayment(request.url);
                  return false;
                }
                return true;
              }}
              onMessage={(event) => {
                try {
                  const payload = JSON.parse(event.nativeEvent.data) as RazorpaySuccess & {
                    cancelled?: boolean;
                    failed?: boolean;
                    description?: string;
                  };
                  if (payload.cancelled) finish(new Error("Payment cancelled"));
                  else if (payload.failed) finish(new Error(payload.description || "Payment failed"));
                  else if (payload.razorpay_payment_id && payload.razorpay_signature) finish(undefined, payload);
                } catch {
                  finish(new Error("Payment could not be read"));
                }
              }}
            />
          ) : null}
        </View>
      </Modal>
    </CheckoutContext.Provider>
  );
}
