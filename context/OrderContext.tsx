import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

/* ================= TYPES ================= */
type OrderAddress = {
  _id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
};

type PlaceOrderPayload = {
  address: {
    _id: string;
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  paymentMethod: "cod" | "upi" | "card" | "wallet" | "balance";
  paymentDetails?: {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  };
  deliveryFee: number;
  notes?: string;
  couponCode?: string;
};

type OrderContextType = {
  orders: any[];
  loading: boolean;
  fetchOrders: () => Promise<void>;
  placeOrder: (payload: PlaceOrderPayload) => Promise<any>;
};

const OrderContext = createContext<OrderContextType | null>(null);

/* ================= PROVIDER ================= */

export function OrderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?._id;
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);


  /* ================= FETCH ORDERS ================= */

  const fetchOrders = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const res = await API.get("/orders", { params: { userId } });
      if (res.data?.success) {
        setOrders(res.data.data || []);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Fetch orders failed:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /* ================= PLACE ORDER ================= */

  const placeOrder = async ({
    address,
    paymentMethod,
    paymentDetails,
    deliveryFee,
    notes,
    couponCode,
  }: PlaceOrderPayload) => {
    if (!user?._id) {
      throw new Error("User not authenticated");
    }

    let res;
    try {
      res = await API.post("/orders", {
      userId: user._id,
      addressId: address._id,
      addressSnapshot: {
        name: address.name,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
      },
      paymentMethod,
      paymentDetails,
      deliveryFee,
      notes,
      couponCode,
    });

    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || "Failed to place order",
      );
    }

    if (!res.data?.success) {
      throw new Error(res.data?.message || "Failed to place order");
    }

    return res.data;
  };

  /* ================= PROVIDER ================= */

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        fetchOrders,
        placeOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error("useOrders must be used inside OrderProvider");
  }
  return ctx;
}
