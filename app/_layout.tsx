import { AddressProvider } from "@/context/AddressContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CustomAlertProvider } from "@/context/CustomAlertContext";
import { OrderProvider } from "@/context/OrderContext";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  return (
    <AuthProvider>
      <CustomAlertProvider>
        <AddressProvider>
          <CartProvider>
            <OrderProvider>
              {[
                <Stack key="stack" screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                </Stack>,
                <Toast key="toast" />,
                <StatusBar key="statusbar" style="auto" />,
              ]}
            </OrderProvider>
          </CartProvider>
        </AddressProvider>
      </CustomAlertProvider>
    </AuthProvider>
  );
}
