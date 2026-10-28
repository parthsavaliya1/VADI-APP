import { Text, View } from "react-native";
import { getInitials } from "@/utils/getInitials";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { C } from "@/constants/theme";

export default function TabLayout() {
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.tabInactive,
        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
          href: user ? "/(tabs)/orders" : null,
        }}
      />

      <Tabs.Screen
        name="order-tracking"
        options={{
          href: null,
          title: "Track Order",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            user ? (
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.soft, borderWidth: 1.5, borderColor: color, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color, fontSize: 12, fontWeight: "800" }} numberOfLines={1}>
                  {getInitials(user.name)}
                </Text>
              </View>
            ) : <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
