import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type OrderItem = {
  id: string;
  items: any[];
  total: number;
  date: string;
  status: string;
};

type OrderContextType = {
  orders: OrderItem[];
  placeOrder: (items: any[], total: number) => void;
};

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<OrderItem[]>([]);

  // 🔄 Load orders
  useEffect(() => {
    AsyncStorage.getItem("ORDERS").then((data) => {
      if (data) setOrders(JSON.parse(data));
    });
  }, []);

  // 💾 Save orders
  useEffect(() => {
    AsyncStorage.setItem("ORDERS", JSON.stringify(orders));
  }, [orders]);

  const placeOrder = (items: any[], total: number) => {
    const newOrder: OrderItem = {
      id: Date.now().toString(),
      items,
      total,
      date: new Date().toLocaleDateString(),
      status: "Placed",
    };
    setOrders((prev) => [newOrder, ...prev]);
  };

  return (
    <OrderContext.Provider value={{ orders, placeOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used inside OrderProvider");
  return ctx;
}
