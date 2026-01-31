import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // 🔄 Load cart on app start
  useEffect(() => {
    AsyncStorage.getItem("CART_ITEMS").then((data) => {
      if (data) setItems(JSON.parse(data));
    });
  }, []);

  // 💾 Save cart on change
  useEffect(() => {
    AsyncStorage.setItem("CART_ITEMS", JSON.stringify(items));
  }, [items]);

  const addToCart = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, qty: p.qty + item.qty } : p,
        );
      }
      return [...prev, item];
    });
  };

  const updateQty = (id: string, qty: number) => {
    setItems((prev) =>
      prev
        .filter((p) => (p.id === id ? qty > 0 : true))
        .map((p) => (p.id === id ? { ...p, qty } : p)),
    );
  };

  const clearCart = async () => {
    setItems([]);
    await AsyncStorage.removeItem("CART_ITEMS");
  };

  return (
    <CartContext.Provider value={{ items, addToCart, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
