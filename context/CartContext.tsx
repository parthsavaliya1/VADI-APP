import { cartApi } from "@/lib/cartAPI";
import { showAlert } from "@/context/CustomAlertContext";
import { router } from "expo-router";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

/* ================= TYPES ================= */

export type CartItem = {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  price: number;
  qty: number;
  image?: string;
};

type CartContextType = {
  items: CartItem[];
  loading: boolean;

  addToCart: (item: CartItem) => Promise<void>;
  updateQty: (
    productId: string,
    variantId: string,
    qty: number,
  ) => Promise<void>;
  updateQuantity: (
    productId: string,
    variantId: string,
    qty: number,
  ) => Promise<void>;
  removeFromCart: (productId: string, variantId: string) => Promise<void>;

  clearCart: () => Promise<void>;
  refreshCart: () => Promise<{
    ok: boolean;
    itemCount?: number;
    grandTotal?: number;
  }>;

  getCartTotal: () => number;
  getCartItemCount: () => number;
};

const CartContext = createContext<CartContextType | null>(null);

/* ================= PROVIDER ================= */

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?._id;

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  /* ─── helpers ─── */

  const mapDbItemToCartItem = (item: any): CartItem => ({
    id: `${item.product._id || item.product}_${item.variantId}`,
    productId: (item.product._id || item.product).toString(),
    variantId: item.variantId.toString(),
    name: item.productName,
    variantLabel: `${item.packSize}${item.packUnit}`,
    price: item.unitPrice,
    qty: item.quantity,
    image: item.image,
  });

  /* ─── guest guard ─── */

  const requireLogin = (): boolean => {
    if (!userId) {
      showAlert(
        "Login Required",
        "Please log in or sign up to add items to your cart.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log In",
            onPress: () => router.push("/login"),
          },
          {
            text: "Sign Up",
            onPress: () => router.push("/signup"),
          },
        ],
      );
      return true; // is guest → blocked
    }
    return false; // is logged in → allow
  };

  /* ─── fetch cart ─── */

  const refreshCart = async (): Promise<{
    ok: boolean;
    itemCount?: number;
    grandTotal?: number;
  }> => {
    if (!userId) {
      setItems([]);
      return { ok: false };
    }

    try {
      setLoading(true);
      const res = await cartApi.getCart(userId);

      if (res.data?.success) {
        const data = res.data.data;
        const dbItems = data?.items || [];
        setItems(dbItems.map(mapDbItemToCartItem));
        return {
          ok: true,
          itemCount: dbItems.length,
          grandTotal: Number(data?.grandTotal ?? 0),
        };
      }
      return { ok: false };
    } catch (error: any) {
      console.error(
        "Refresh cart error:",
        error.response?.data || error.message,
      );
      return { ok: false };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [userId]);

  /* ─── add to cart ─── */

  const addToCart = async (item: CartItem) => {
    if (requireLogin()) return; // 🔒 guest blocked here

    try {
      setLoading(true);

      console.log("Item", item);

      const res = await cartApi.addToCart({
        userId: userId!,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.qty,
      });

      if (res.data?.success) {
        await refreshCart();
      } else {
        showAlert("Error", res.data?.message || "Failed to add to cart");
      }
    } catch (error: any) {
      showAlert(
        "Error",
        error.response?.data?.message || "Failed to add item to cart",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ─── update qty ─── */

  const updateQty = async (
    productId: string,
    variantId: string,
    qty: number,
  ) => {
    if (!userId) return;

    try {
      setLoading(true);

      const res = await cartApi.updateQty({
        userId,
        productId,
        variantId,
        quantity: qty,
      });

      if (res.data?.success) {
        await refreshCart();
      } else {
        showAlert("Error", res.data?.message || "Failed to update quantity");
      }
    } catch (error: any) {
      showAlert(
        "Error",
        error.response?.data?.message || "Failed to update quantity",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = updateQty;

  /* ─── remove from cart ─── */

  const removeFromCart = async (productId: string, variantId: string) => {
    if (!userId) return;

    try {
      setLoading(true);

      const res = await cartApi.removeItem({
        userId,
        productId,
        variantId,
      });

      if (res.data?.success) {
        await refreshCart();
      } else {
        showAlert("Error", res.data?.message || "Failed to remove item");
      }
    } catch (error: any) {
      showAlert(
        "Error",
        error.response?.data?.message || "Failed to remove item",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ─── clear cart ─── */

  const clearCart = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const res = await cartApi.clearCart(userId);
      if (res.data?.success) setItems([]);
    } finally {
      setLoading(false);
    }
  };

  /* ─── derived ─── */

  const getCartTotal = () =>
    items.reduce((total, item) => total + item.price * item.qty, 0);

  const getCartItemCount = () =>
    items.reduce((count, item) => count + item.qty, 0);

  /* ─── provider ─── */

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        addToCart,
        updateQty,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
        getCartTotal,
        getCartItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
