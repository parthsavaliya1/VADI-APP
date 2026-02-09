import { cartApi } from "@/lib/cartAPI";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";
import { useAuth } from "./AuthContext";

/* ================= TYPES ================= */

export type CartItem = {
  id: string; // UI only
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
  refreshCart: () => Promise<void>;

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

  /* ================= HELPERS ================= */

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

  /* ================= FETCH CART ================= */

  const refreshCart = async () => {
    if (!userId) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      const res = await cartApi.getCart(userId);

      if (res.data?.success) {
        const dbItems = res.data.data?.items || [];
        setItems(dbItems.map(mapDbItemToCartItem));
      } else {
        setItems([]);
      }
    } catch (error: any) {
      console.error(
        "Refresh cart error:",
        error.response?.data || error.message,
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [userId]);

  /* ================= ACTIONS ================= */

  const addToCart = async (item: CartItem) => {
    if (!userId) {
      Alert.alert("Login Required", "Please login to add items to cart");
      return;
    }

    try {
      setLoading(true);

      const res = await cartApi.addToCart({
        userId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.qty,
      });

      if (res.data?.success) {
        await refreshCart();
      } else {
        Alert.alert("Error", res.data?.message || "Failed to add to cart");
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to add item to cart",
      );
    } finally {
      setLoading(false);
    }
  };

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
        Alert.alert("Error", res.data?.message || "Failed to update quantity");
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update quantity",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = updateQty;

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
        Alert.alert("Error", res.data?.message || "Failed to remove item");
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to remove item",
      );
    } finally {
      setLoading(false);
    }
  };

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

  /* ================= DERIVED ================= */

  const getCartTotal = () =>
    items.reduce((total, item) => total + item.price * item.qty, 0);

  const getCartItemCount = () =>
    items.reduce((count, item) => count + item.qty, 0);

  /* ================= PROVIDER ================= */

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
